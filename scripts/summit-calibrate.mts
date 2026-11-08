/**
 * פסגת אירופה against the real engine (stage 1 of the prompt of 31.10.2026). Not a check and not part of the build:
 * it reports, Itzik decides. Nothing here changes a number.
 *   node --experimental-strip-types scripts/summit-calibrate.mts [careers per row, default 2000] [levels, default 0,1]
 *
 * Every career is a real one carried to the top flight, its eleven made at the given strength (makeSquad's scale,
 * the same scale the rounds' targets are on), and its competition drawn at the given level. Every leg goes through
 * the path the game itself takes: euroNight, euroMatchInput, the live engine minute by minute (createLive, step), the
 * moments answered by one fixed policy (the same one euro-check plays: the left corner, finish the one on one, stay
 * in the box, contain), commitEuroLeg with the money and the bans and the tired legs, and when the tie is level the
 * shootout kick by kick on the shootout screen's own odds (hintFor, diveFor, myKickScores, theirKickSaved) through
 * finishEuroPens. Between the nights the legs recover and the hurt come back, as the league weeks would do.
 *
 * The table: of the careers drawn in, how many reached the quarter, the semi, the final, and lifted the trophy.
 */
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { drawEuro, euroWeeks, hintFor, diveFor, myKickScores, theirKickSaved, shootoutStatus, PEN_CORNERS, competitionName } from '../src/game/euro.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng, overall } from '../src/engine/matchEngine.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';

const N = Number(process.argv[2] ?? 2000);
const LEVELS = (process.argv[3] ?? '0,1').split(',').map(Number);
const SIDES = [81, 84, 86, 88];

const template = (() => {
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  return { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier: 5 })) } };
})();

function career(i: number, side: number, level: number): G.GameState {
  const seed = 1_000 + i * 7919 + side * 31 + level * 100_003;
  const squad = makeSquad(side, createRng(seed));
  const gs: G.GameState = {
    ...template,
    seasonSeed: seed,
    season: 2,
    phase: 'hub',
    week: 2,
    league: { ...template.league, squads: { ...template.league.squads, [template.clubId]: squad } },
    seats: null as never,
    sitOut: {}, suspensions: {}, matchMods: { ...template.matchMods, fitness: {} },
  };
  return { ...gs, euro: drawEuro(seed ^ 0x5bd1e995, gs.clubId, gs.season, level) };
}

function playNight(gs: G.GameState) {
  const input = G.euroMatchInput(gs, true);
  const st = L.createLive(input);
  let guard = 0;
  while (st.phase !== 'done' && guard++ < 4000) {
    if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
    if (st.phase === 'moment' && st.pending) {
      const m = st.pending;
      switch (m.kind) {
        case 'penalty': L.resolvePenalty(st, 'left'); break;
        case 'def_penalty': L.resolveDefPenalty(st, 'left'); break;
        case 'shot': L.resolveShot(st, 'left'); break;
        case 'free_kick': L.resolveFreeKick(st, 'left'); break;
        case 'one_on_one': L.resolveOneOnOne(st, 'finish'); break;
        case 'def_keeper': L.resolveDefKeeper(st, 'stay'); break;
        case 'def_tackle': L.resolveDefTackle(st, 'contain'); break;
        case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
      }
      if (st.phase === 'moment') st.phase = 'play';
      continue;
    }
    L.step(st);
  }
  const ids = [...L.mySide(st).onPitch, ...L.mySide(st).sentOff.map(x => x.player), ...L.mySide(st).replaced.map(x => x.player)].map(p => p.id);
  return { result: L.finalize(st), ids };
}

/** The shootout, kick by kick, on the screen's own odds: he picks a corner at random, the keeper reads the hint. */
function takeShootout(gs: G.GameState, seed: number): [number, number] {
  const rng = createRng(seed);
  const keeper = G.mySquad(gs).starters.find(p => p.position === 'GK');
  const gkq = keeper ? overall(keeper) : 70;
  const mine: boolean[] = [], theirs: boolean[] = [];
  for (let n = 0; n < 40; n++) {
    const s = shootoutStatus(mine, theirs);
    if (s.winner) return s.score;
    const pick = PEN_CORNERS[Math.floor(rng() * 3)];
    const dive = diveFor(rng, hintFor(rng));
    if (s.next === 'me') mine.push(myKickScores(rng, pick, dive));
    else theirs.push(!theirKickSaved(rng, dive, pick, gkq));
  }
  return shootoutStatus(mine, theirs).score;
}

function run(side: number, level: number) {
  const reached = [0, 0, 0, 0];
  let won = 0, legs = 0;
  const weeks = euroWeeks(template.league.rounds)!;
  for (let i = 0; i < N; i++) {
    let gs = career(i, side, level);
    let guard = 0;
    while (gs.euro && gs.euro.status === 'on' && guard++ < 12) {
      const round = gs.euro.round;
      const tie = gs.euro.ties[round].find(t => t.a === gs.clubId || t.b === gs.clubId);
      if (!tie) break;
      const leg = tie.legs.length;
      // the week this leg falls in, the legs rested and the hurt back since the last night
      gs = { ...gs, week: weeks[round][leg], phase: 'hub', sitOut: {}, matchMods: { ...gs.matchMods, fitness: {} } };
      if (!G.euroNight(gs, true)) break;
      const { result, ids } = playNight(gs);
      gs = G.commitEuroLeg(gs, result, ids, true);
      legs++;
      if (gs.phase === 'euro-pens') gs = G.finishEuroPens(gs, takeShootout(gs, gs.seasonSeed + round * 13 + 7));
    }
    const e = gs.euro!;
    let deepest = 0;
    e.ties.forEach((ties, r) => { if (ties.some(t => t.a === gs.clubId || t.b === gs.clubId)) deepest = r; });
    for (let r = 1; r <= deepest; r++) reached[r]++;
    if (e.status === 'won') won++;
  }
  const pct = (n: number) => `${(100 * n / N).toFixed(1)}%`.padStart(6);
  console.log(`${competitionName(level).padEnd(12)} side ${side}   quarter ${pct(reached[1])}   semi ${pct(reached[2])}   final ${pct(reached[3])}   trophy ${pct(won)}   (1 in ${won ? (N / won).toFixed(0) : '-'}, ${(legs / N).toFixed(1)} legs a run)`);
}

console.log(`${N} careers a row, the real engine, ${new Date().toISOString()}`);
for (const level of LEVELS) for (const side of SIDES) {
  const t0 = Date.now();
  run(side, level);
  console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
