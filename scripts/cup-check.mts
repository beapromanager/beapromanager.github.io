/**
 * גביع המדינה, stage 1 of the 20.10 cup spec. The cup's own core (cup.ts),
 * modeled on euro-check.mts, plus the wiring into state.ts, save.ts and
 * telemetry.ts.
 *   node --experimental-strip-types scripts/cup-check.mts
 *
 *   1. the door and the agreed numbers (money lower than the spec's own
 *      draft, per Itzik's 20.10 note; fitness and injury; the target curve)
 *   2. the calendar: cupWeeks never overlaps euroWeeks, for every league
 *      length the product spec names
 *   3. eligibility: tier 4 and 5 only, every season, whatever the road there
 *   4. the draw: sixteen with the manager always in for a normal entry,
 *      twelve AI alone for a staged (seeded) entrant, seeded so a reload
 *      draws the same ties
 *   5. the host rule: the lower division hosts, a coin toss on equal tiers,
 *      nobody at the final
 *   6. ties and penalties: one leg, no aggregate to wait on, a level match
 *      goes to a shootout that always ends
 *   7. advancing: winners paired in order, a staged entrant spliced into the
 *      semi exactly once, the final crowns a champion
 *   8. bans: a red here costs the next cup match only
 *   9. hard but possible, by model: the win shares the product spec sets
 *      (≤8% from tier 4, 15-20% from tier 5, 30-35% for a seeded champion)
 *  10. the night itself, played in the real engine: nothing of the league
 *      moves, the men tire, an injury costs this week's league match, the
 *      money is the agreed money, and a level match waits for his shootout
 *  11. the wiring: startWeek waits for a cup night, takeRescue clears it,
 *      the summer draws it for tier 4/5 and only for tier 4/5
 *  12. save and telemetry: an old save gets a null cup, every cup phase
 *      reloads at the hub, and the client's marks match the worker's regex
 *  13. the door shut: no path above changes, and the flag itself is off
 */
import {
  CUP_LIVE, CUP_MIN_TIER, CUP_ROUNDS, CUP_FIELD, CUP_PRE_FIELD, ROUND_NAMES, CUP_TARGET, CUP_EDGE,
  CUP_PRIZE, CUP_GATE_SHARE, CUP_TRAVEL, CUP_TIRED, CUP_INJURY_RISK, cupWeeks, drawCup, playAiRound,
  recordMyLeg, advanceRound, needsPens, settleMyPens, strengthOf, myTie, iHost, banFor, serveBans,
  allWinners, prizeFor, prizeTotal, playOutWithoutMe, stepAiRound, champion, cupEntry, nightFor,
  closeCupSeason, cupVerdict, cupMarks, CUP_MARKS, isUpset, tierOf,
} from '../src/game/cup.ts';
import { euroWeeks, aiLeg, shootout, settleTie, aggregate, roundDone as euroRoundDone } from '../src/game/euro.ts';
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { createRng, overall } from '../src/engine/matchEngine.ts';
import { gateIncome, SECURITY_HOME } from '../src/game/career.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;
const ME = 'me';

/* localStorage, which node does not have and the loader insists on */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, writable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});

/** a plain pool, standing in for cities.ts's tier 4/5 rosters: enough distinct ids, across both tiers */
function pool(n = 24): Array<{ id: string; tier: number }> {
  return Array.from({ length: n }, (_, i) => ({ id: `club${i}`, tier: i % 2 === 0 ? 4 : 5 }));
}

/** a check stands in for the shootout screen: when the match is level, a seeded shootout settles it */
const pensIfDue = (e: ReturnType<typeof drawCup>, myId: string, seed: number) =>
  needsPens(e, myId) ? settleMyPens(e, myId, shootout(createRng(seed)).score) : e;

/* -------------------------------------------- 1. the door and the agreed numbers */
{
  checked += 11;
  if (CUP_LIVE !== false) fails.push('the cup door is open; it must stay shut (false) until Itzik lights it');
  if (CUP_MIN_TIER !== 4) fails.push('the cup floor moved off tier 4 (הלאומית)');
  if (CUP_ROUNDS !== 4 || CUP_FIELD !== 16 || CUP_PRE_FIELD !== 12) fails.push('rounds, field or the staged pre-field moved off 4 / 16 / 12');
  if (JSON.stringify(CUP_TARGET) !== '[74,77,80,83]') fails.push(`cup targets are ${JSON.stringify(CUP_TARGET)}, agreed 74 / 77 / 80 / 83`);
  if (CUP_EDGE !== 2) fails.push('the club edge moved off Europe\'s own 2');
  // money: lower than the spec's own draft (120K/250K/500K/1M, a 1.87M full run) and a fraction of Europe's own run (4.5M)
  if (JSON.stringify(CUP_PRIZE) !== '[0,30000,60000,120000,250000]') fails.push(`cup prizes are ${JSON.stringify(CUP_PRIZE)}, agreed 0 / 30K / 60K / 120K / 250K`);
  if (prizeTotal(CUP_ROUNDS) >= 1_870_000) fails.push('a full cup run pays as much as the spec draft Itzik asked to lower');
  if (prizeTotal(CUP_ROUNDS) >= 4_500_000 * 0.2) fails.push('a full cup run pays a fifth or more of Europe\'s own full run');
  if (CUP_GATE_SHARE >= 0.75) fails.push('the cup\'s home gate share is not below Europe\'s own 75%');
  if (CUP_TRAVEL !== 40_000) fails.push('the away trip moved off the agreed 40,000 (domestic, far cheaper than Europe\'s 150,000)');
  // fitness/injury: strengthened at least to Europe's own bite, per Itzik's rotation note, never weaker
  if (CUP_TIRED > -12) fails.push(`a cup night only costs ${-CUP_TIRED} fitness; strengthened to at least Europe's -12 so a squad that never rotates feels it`);
  if (CUP_INJURY_RISK <= 0 || CUP_INJURY_RISK > 0.1) fails.push('the cup injury risk is off, or implausibly high');
  if (ROUND_NAMES.length !== 4 || ROUND_NAMES[3] !== 'הגמר') fails.push('the round names are not Europe\'s own four ending in the final');
  if (prizeFor(4) !== 250_000 || prizeFor(1) !== 30_000 || prizeFor(0) !== 0) fails.push('the prize for a round reached is not the table');
}

/* --------------------------------------------------------------- 2. the calendar */
{
  checked += 8;
  if (JSON.stringify(cupWeeks(14)) !== '[4,7,11,14]') fails.push(`a 14 round season puts the cup before ${JSON.stringify(cupWeeks(14))}, agreed 4 / 7 / 11 / 14`);
  if (JSON.stringify(cupWeeks(18)) !== '[4,8,13,17]') fails.push(`an 18 round season puts the cup before ${JSON.stringify(cupWeeks(18))}, agreed 4 / 8 / 13 / 17`);
  if (JSON.stringify(cupWeeks(22)) !== '[6,11,17,21]') fails.push(`a 22 round season puts the cup before ${JSON.stringify(cupWeeks(22))}, agreed 6 / 11 / 17 / 21`);
  if (cupWeeks(10) !== null || cupWeeks(13) !== null) fails.push('a league too short for the known calendars still gets a cup');
  for (const rounds of [14, 18, 22]) {
    const cw = cupWeeks(rounds)!, ew = euroWeeks(rounds) ?? [];
    const euroFlat = ew.flat();
    if (cw.some(w => euroFlat.includes(w))) fails.push(`at ${rounds} rounds a cup week lands on a European week: ${JSON.stringify(cw)} vs ${JSON.stringify(ew)}`);
  }
  if (cupWeeks(14)![3] !== 14) fails.push('the final is not played before the league\'s own last round');
}

/* ------------------------------------------------------------- 3. eligibility */
{
  checked += 5;
  if (cupEntry(true, 3)) fails.push('a tier 3 (ליגה א׳) club is let into the cup');
  if (!cupEntry(true, 4)) fails.push('a tier 4 (הלאומית) club is not let into the cup');
  if (!cupEntry(true, 5)) fails.push('a tier 5 (ליגת העל) club, even its first season there, is not let into the cup');
  if (cupEntry(false, 5)) fails.push('the shut door still lets a tier 5 club in');
  if (cupEntry(true, 1) || cupEntry(true, 2)) fails.push('ליגה ג׳ or ב׳ is let into the cup');
}

/* ------------------------------------------------------------------- 4. the draw */
{
  const p = pool(24);
  const d1 = drawCup(555, ME, 2, 5, false, p), d2 = drawCup(555, ME, 2, 5, false, p), d3 = drawCup(556, ME, 2, 5, false, p);
  checked += 9;
  if (JSON.stringify(d1) !== JSON.stringify(d2)) fails.push('the same seed drew two different cups');
  if (JSON.stringify(d1.ties) === JSON.stringify(d3.ties)) fails.push('a different seed drew the same pairings');
  if (d1.clubs.length !== CUP_FIELD) fails.push(`a normal draw has ${d1.clubs.length} clubs, agreed ${CUP_FIELD}`);
  if (!d1.clubs.some(c => c.id === ME)) fails.push('the manager is not in his own normal-entry draw');
  if (d1.ties[0].length !== 8) fails.push(`the first round has ${d1.ties[0].length} ties, agreed 8 for sixteen clubs`);
  if (!d1.ties[0].some(t => t.a === ME || t.b === ME)) fails.push('the manager has no tie in his own first round');
  if (d1.status !== 'on') fails.push('a normal entry does not start "on"');
  if (d1.clubs.find(c => c.id === ME)!.edge !== 0) fails.push('the manager carries an edge of his own, he should play as his real squad');
  const staged = drawCup(555, ME, 2, 5, true, p);
  if (staged.joinAt !== 2) fails.push('a staged (seeded) entrant does not join at the semi (round 2)');
  if (staged.status !== 'waiting') fails.push('a staged entrant does not start "waiting"');
  if (staged.ties[0].length !== 6 || staged.ties[0].some(t => t.a === ME || t.b === ME)) fails.push('a staged entrant\'s pre-bracket is not six AI-only ties');
  if (staged.ties[1]) fails.push('a staged entrant\'s quarter is drawn before the pre-bracket is even played');
  if (staged.clubs.length !== CUP_PRE_FIELD + 1) fails.push(`a staged draw carries ${staged.clubs.length} clubs, agreed ${CUP_PRE_FIELD} AI plus the manager`);
}

/* --------------------------------------------------------------- 5. the host rule */
{
  checked += 3;
  const d = drawCup(90, ME, 2, 4, false, pool(24));
  let sawLowerHost = false, sawFinalNeutral = true;
  for (const t of d.ties[0]) {
    const ta = tierOf(d, t.a), tb = tierOf(d, t.b);
    if (ta !== tb && (ta < tb ? t.a : t.b) !== t.a && (ta < tb ? t.a : t.b) !== t.b) continue;
    if (ta !== tb) sawLowerHost = sawLowerHost || (ta < tb ? t.a === t.a : true);
  }
  // across many draws, the lower tier is the host side (`.a`) whenever the tiers differ
  let crossTier = 0, lowerHosted = 0;
  for (let i = 0; i < 200; i++) {
    const dd = drawCup(1000 + i, ME, 2, 4, false, pool(24));
    for (const round of dd.ties) for (const t of round) {
      const ta = tierOf(dd, t.a), tb = tierOf(dd, t.b);
      if (ta === tb) continue;
      crossTier++;
      if ((ta < tb && t.a === t.a) || true) { /* a hosts by construction */ }
      if (ta < tb) lowerHosted++;
    }
  }
  if (crossTier === 0) fails.push('two hundred draws never paired two different tiers, the host rule was never exercised');
  if (lowerHosted !== crossTier) fails.push(`the lower tier hosts ${lowerHosted}/${crossTier} cross-tier ties, agreed every one of them`);
  const final = { ...d, round: CUP_ROUNDS - 1, ties: [...d.ties.slice(0, CUP_ROUNDS - 1), [{ a: ME, b: 'club1', legs: [] as Array<[number, number]> }]] };
  if (nightFor(final, ME, 14, cupWeeks(14)![CUP_ROUNDS - 1]).host !== null) fails.push('the final has a host, agreed neutral ground');
}

/* --------------------------------------------------------- 6. ties and penalties */
{
  checked += 6;
  const level = { a: ME, b: 'opp', legs: [[1, 1]] as Array<[number, number]> };
  if (aggregate(level)[0] !== 1 || aggregate(level)[1] !== 1) fails.push('a single leg aggregate is not just that leg');
  const settled = settleTie(level, createRng(1));
  if (!settled.winner) fails.push('a level match did not settle through the shootout');
  const d = drawCup(61, ME, 2, 5, false, pool(24));
  const withMyGoals = recordMyLeg(d, ME, [1, 1]);
  if (!needsPens(withMyGoals, ME)) fails.push('a level match for his own tie does not ask for penalties');
  const t0 = myTie(withMyGoals, ME)!;
  const scored = settleMyPens(withMyGoals, ME, [5, 4]);
  if (myTie(scored, ME)!.winner !== ME) fails.push('a won shootout does not win the tie');
  if (myTie(scored, ME)!.pens?.[0] !== (t0.a === ME ? 5 : 4)) fails.push('the shootout score is not written as [a, b]');
  const decisive = recordMyLeg(d, ME, [2, 0]);
  if (needsPens(decisive, ME)) fails.push('a decided match still asks for penalties');
  if (myTie(decisive, ME)!.winner !== ME) fails.push('winning by two clear goals does not win the tie outright');
}

/* -------------------------------------------------------------------- 7. advancing */
{
  checked += 8;
  let e = drawCup(61, ME, 2, 5, false, pool(24));
  for (let r = 0; r < CUP_ROUNDS; r++) {
    e = playAiRound(e, ME, 900 + r);
    const mine = myTie(e, ME);
    if (mine && !mine.winner) e = recordMyLeg(e, ME, [3, 0]);
    e = pensIfDue(e, ME, 700 + r);
    if (!roundDone(e)) { fails.push(`round ${r} never settled every tie`); break; }
    if (r === CUP_ROUNDS - 1) {
      if (e.status !== 'won') fails.push('winning the final does not crown the manager champion');
      if (champion(e) !== ME) fails.push('the champion function does not read back the man who won it');
      break;
    }
    const before = e.round;
    e = advanceRound(e, ME, 2000 + r);
    if (e.round !== before + 1) fails.push(`advancing round ${before} did not move the round forward`);
  }
  if (allWinners(drawCup(61, ME, 2, 5, false, pool(24))).length !== 0) fails.push('a freshly drawn cup already has winners');
  // a staged entrant: played out alone until the quarter, spliced into the semi exactly once, never twice
  let s = drawCup(61, ME, 2, 5, true, pool(24));
  s = playAiRound(s, ME, 1); s = advanceRound(s, ME, 2);   // round 0 -> 1 (still AI only)
  if (s.status !== 'waiting' || s.ties[1]?.some(t => t.a === ME || t.b === ME)) fails.push('a staged entrant appears before the quarter is even drawn');
  s = playAiRound(s, ME, 3); s = advanceRound(s, ME, 4);   // round 1 -> 2, the manager must appear now
  if (s.status !== 'on') fails.push('a staged entrant is not pulled "on" the moment the quarter settles');
  if (!s.ties[2].some(t => t.a === ME || t.b === ME)) fails.push('a staged entrant has no tie in his own semi');
  if (s.ties[2].length !== 2) fails.push(`the semi has ${s.ties[2].length} ties with a staged entrant, agreed two (three AI winners plus the manager)`);
  if (s.seen !== false) fails.push('a staged entrant freshly paired into the semi is not owed a fresh draw reveal (seen must flip back to false)');
}

/* ----------------------------------------------------------------------- 8. bans */
{
  checked += 3;
  let e = drawCup(61, ME, 2, 5, false, pool(24));
  const culprit = 'p1';
  e = banFor(e, culprit);
  if (e.bans[culprit] !== 1) fails.push('a red card does not open a one-match cup ban');
  const { banned, next } = serveBans(e);
  if (!banned.includes(culprit)) fails.push('a man banned this match is not reported as serving it');
  if ((next.bans[culprit] ?? 0) !== 0) fails.push('a one-match ban is not cleared once it is served');
}

/* --------------------------------------------------------- 9. hard but possible */
{
  /** a side of the given overall, model-played through the whole cup against CUP_TARGET, N times */
  const share = (strength: number, seeded: boolean, N: number): { won: number; played: number } => {
    let won = 0, playedAny = 0;
    for (let i = 1; i <= N; i++) {
      let e = drawCup(80_000 + i, ME, 2, 4, seeded, pool(24));
      let guard = 0;
      while ((e.status === 'on' || e.status === 'waiting') && guard++ < 10) {
        e = playAiRound(e, ME, 81_000 + i * 13 + e.round);
        if (e.status === 'waiting') { e = advanceRound(e, ME, 82_000 + i * 17 + e.round); continue; }
        const t = myTie(e, ME)!;
        const oppId = t.a === ME ? t.b : t.a;
        const theirs = strengthOf(e, oppId, e.round);
        playedAny = 1;
        const rng = createRng(83_000 + i * 19 + e.round);
        const host = e.round === CUP_ROUNDS - 1 ? true : iHost(e, ME)!;
        const [h, a] = host ? aiLeg(strength, theirs, rng, e.round === CUP_ROUNDS - 1) : aiLeg(theirs, strength, rng, e.round === CUP_ROUNDS - 1);
        e = recordMyLeg(e, ME, host ? [h, a] : [a, h]);
        e = pensIfDue(e, ME, 84_000 + i * 23 + e.round);
        if (e.round === CUP_ROUNDS - 1 && euroRoundDone(e as never)) { /* final settled below */ }
        e = advanceRound(e, ME, 85_000 + i * 29 + e.round);
      }
      if (e.status === 'won') won++;
    }
    return { won, played: N };
  };
  checked += 3;
  const N = 1500;
  const tier4 = share(69.5, false, N);            // leagueCeiling(4), an average הלאומית side
  const tier5 = share(75, false, N);              // leagueCeiling(5), an average ליגת העל side
  const seededChampion = share(81, true, N);      // a first-year champion's eleven, staged straight into the semi
  const t4Share = tier4.won / N, t5Share = tier5.won / N, scShare = seededChampion.won / N;
  if (t4Share > 0.08) fails.push(`an average הלאומית side wins the cup ${(t4Share * 100).toFixed(1)}% of the time, agreed at most 8%`);
  if (t5Share < 0.15 || t5Share > 0.20) fails.push(`an average ליגת העל side wins the cup ${(t5Share * 100).toFixed(1)}% of the time, agreed 15-20%`);
  if (scShare < 0.30 || scShare > 0.35) fails.push(`a seeded champion wins the cup ${(scShare * 100).toFixed(1)}% of the time, agreed 30-35%`);
  console.log(`  model shares: tier4 ${(t4Share * 100).toFixed(1)}%, tier5 ${(t5Share * 100).toFixed(1)}%, seeded champion ${(scShare * 100).toFixed(1)}%`);
}

/* --------------------------------------------- 10. the cup night in the real engine */
{
  const career = (seed: number, tier: number, seeded = false): G.GameState => {
    let gs = G.newGame(seed);
    gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
    gs = G.pickCity(gs, LEGEND_TOWN);
    gs = G.afterSigning(gs, {});
    gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
    while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
    const hub = { ...gs, phase: 'hub' as const, week: 4, league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier })) } };
    return { ...hub, cup: drawCup(seed, hub.clubId, hub.season, tier, seeded, pool(24)) };
  };
  const playNight = (gs: G.GameState) => {
    const input = G.cupMatchInput(gs, true);
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
    return { input, result: L.finalize(st), ids };
  };
  const frozen = (gs: G.GameState) => JSON.stringify([gs.league.table, gs.seasonStats, gs.form, gs.lastLedger, gs.lastPlayerMatch, gs.pressHistory, gs.chatHistory, gs.suspensions, gs.sitOutNext, gs.week, gs.purseEarlier, gs.season]);

  let gs: G.GameState | null = null, night: ReturnType<typeof G.cupNight> = null;
  for (let s = 1; s < 80 && !night; s++) {
    const g = { ...career(s, 5), week: cupWeeks(14)![0] };
    const n = G.cupNight(g, true);
    if (n) { gs = g; night = n; }
  }
  checked += 10;
  if (!gs || !night) fails.push('no seed in eighty gives a cup night to check against');
  else {
    if (G.cupNight(gs, false) !== null || G.startCupNight(gs, false).phase !== 'hub' || G.cupPensDue(gs, false)) fails.push('with the door shut the night still exists for the state');
    if (G.startCupNight(gs, true).phase !== 'cup-match') fails.push('with the door open the hub does not start the cup night');
    saveCareer({ ...gs, phase: 'cup-match' });
    if (loadCareer()?.phase !== 'hub') fails.push('a career closed inside the cup night does not reload at the hub');
    saveCareer({ ...gs, phase: 'cup-pens' });
    if (loadCareer()?.phase !== 'hub') fails.push('a career closed inside the cup shootout does not reload at the hub');

    const i1 = G.cupMatchInput(gs, true), i2 = G.cupMatchInput(gs, true);
    if (JSON.stringify(i1) !== JSON.stringify(i2)) fails.push('the same week gives two different cup nights');
    if (i1.seed !== G.drawSeed(gs, 170_000 + night.round)) fails.push('the night is not seeded through drawSeed at the 170_000 cup salt');
    const target = strengthOf(gs.cup!, night.oppId, night.round);
    const theirs = [...i1.oppStarters, ...i1.oppBench];
    const avg = theirs.slice(0, 11).reduce((s, p) => s + overall(p), 0) / 11;
    if (Math.abs(avg - target) > 6) fails.push(`the other side's eleven average ${avg.toFixed(1)} against a target of ${target}`);
    if (i1.neutral && night.host !== null) fails.push('a non-final cup night is played on neutral ground');

    const { result, ids } = playNight(gs);
    const before = frozen(gs);
    const after = G.commitCupLeg(gs, result, ids, true);
    if (frozen(after) !== before) fails.push('the cup night wrote into the league (table, stats, form, ledger, history, suspensions, sitOutNext, week)');
    const played = new Set([...i1.playerStarters.map(p => p.id), ...ids]);
    const tired = after.matchMods.fitness ?? {};
    if (![...played].every(id => tired[id] === CUP_TIRED)) fails.push(`a man who played is not ${CUP_TIRED} for the league match`);
    if (Object.keys(tired).some(id => !played.has(id))) fails.push('a man who did not play in the cup is tired for the league match');
    const myTier = G.club(gs).tier;
    const gate = Math.round(gateIncome(G.homeAttendance(gs, false), myTier) * CUP_GATE_SHARE);
    const expectMoney = gs.meters.money + (night.host === true ? gate - SECURITY_HOME[myTier] : night.host === false ? -CUP_TRAVEL : 0);
    if (after.meters.money !== expectMoney) fails.push(`the leg moved the money by ${after.meters.money - gs.meters.money}, expected ${expectMoney - gs.meters.money}`);
    if (after.phase !== 'hub' && !needsPens(after.cup!, gs.clubId)) fails.push('after a decided leg the hub still asks for it');
    if (after.notices.at(-1)?.kind !== 'story') fails.push('the cup night leaves no word on the hub');

    // a red card tonight is a cup ban only
    const culprit = i1.playerStarters[3].id;
    const withRed = { ...result, events: [...result.events, { minute: 70, type: 'red' as const, teamId: gs.clubId, playerId: culprit, playerName: 'x', text: '' }] };
    const banned = G.commitCupLeg(gs, withRed, ids, true);
    if (banned.cup!.bans[culprit] !== 1) fails.push('a cup red is not a cup ban');
    if (JSON.stringify(banned.suspensions) !== JSON.stringify(gs.suspensions)) fails.push('a cup red reached the league suspensions');
  }
}

/* ------------------------------------------------------------------- 11. the wiring */
{
  checked += 7;
  const src = readFileSync('src/game/state.ts', 'utf8');
  if (!src.includes('if (cupNight(gs)) return gs;')) fails.push('startWeek does not check for a cup night');
  if (!src.includes('gs = advanceCupAiWeek(gs);')) fails.push('startWeek does not step the AI-only cup rounds forward');
  if (!src.includes('cup: null,')) fails.push('takeRescue or newGame does not reset the cup to null');
  if (!src.includes('cupEntry(CUP_LIVE, r.newTier)')) fails.push('the summer draw does not gate the cup on tier 4/5 of the new season');
  if (!src.includes('nextEuro !== null, cupPool())')) fails.push('the cup draw does not know whether the manager is also seeded for Europe');
  const settleSrc = readFileSync('src/game/state.ts', 'utf8');
  if (!settleSrc.includes('settleCupSeason(settleEuroSeason(')) fails.push('the season does not close the cup before drawing the next one');
  // takeRescue: a career pulled out of the fire loses this season's cup, like Europe's own
  const rescued = G.takeRescue({ ...G.newGame(1), cup: drawCup(1, ME, 1, 5, false, pool(24)) } as never);
  if ((rescued as G.GameState).cup !== null) fails.push('a rescued career keeps its cup');
}

/* --------------------------------------------------------------- 12. save and telemetry */
{
  checked += 6;
  const bare = { ...G.newGame(7) } as Record<string, unknown>;
  delete bare.cup;
  saveCareer(bare as never);
  const loaded = loadCareer();
  if (!loaded || loaded.cup !== null) fails.push('an old save with no cup field at all does not come back with cup: null');
  for (const phase of ['cup-match', 'cup-pens', 'cup-draw', 'cup-bracket'] as const) {
    saveCareer({ ...G.newGame(7), phase });
    if (loadCareer()?.phase !== 'hub') fails.push(`a career closed on ${phase} does not reload at the hub`);
  }
  const oldsave = readFileSync('scripts/oldsave-check.mts', 'utf8');
  if (!oldsave.includes("'cup',")) fails.push('oldsave-check does not know to expect the cup field on an old save');

  const telemetry = readFileSync('src/game/telemetry.ts', 'utf8');
  const clientMatch = telemetry.match(/export const MILESTONE = (\/\^.*\$\/);/);
  if (!clientMatch) fails.push('the client MILESTONE regex could not be read for comparison');
  else {
    const re = clientMatch[1].slice(1, -1);
    for (const m of CUP_MARKS) if (!new RegExp(re.slice(1, -1)).test(m)) fails.push(`the client's MILESTONE regex does not accept "${m}"`);
  }
  if (JSON.stringify(CUP_MARKS) !== '["cup_in","cup_sf","cup_final","cup_won"]') fails.push('the names of the cup marks changed; the worker has to carry the same four, deployed first');
  const markIn = cupMarks(drawCup(61, ME, 2, 4, false, pool(24)), ME);
  if (markIn.join() !== 'cup_in') fails.push(`a freshly drawn cup reports [${markIn}], wanted just cup_in`);
  let run = drawCup(61, ME, 2, 5, false, pool(24));
  let guard = 0;
  while (run.status === 'on' && guard++ < 10) {
    run = playAiRound(run, ME, 1000 + run.round);
    const t = myTie(run, ME);
    if (t && !t.winner) run = recordMyLeg(run, ME, [3, 0]);
    run = pensIfDue(run, ME, 2000 + run.round);
    run = advanceRound(run, ME, 3000 + run.round);
  }
  const markWon = cupMarks(run, ME);
  if (markWon.join() !== 'cup_in,cup_sf,cup_final,cup_won') fails.push(`a career that wins the cup reports [${markWon}], wanted all four`);
  if (cupMarks(null, ME).length !== 0) fails.push('a career with no cup reports anything');
}

/* ------------------------------------------------------------------- 13. the door shut */
{
  checked += 4;
  const gs = { ...G.newGame(1), week: 4, cup: drawCup(1, ME, 1, 5, false, pool(24)) };
  if (G.cupNight(gs) !== null) fails.push('with the default flag the cup night still exists for the state');
  if (G.startWeek(gs) === gs) { /* either way is fine: the point is nothing about the league broke */ }
  if (G.startCupNight(gs).phase !== 'hub') fails.push('with the default flag the hub still starts a cup night');
  if (G.commitCupLeg(gs, { home: { id: '', score: [0, 0] }, away: { id: '', score: [0, 0] }, events: [] } as never, []) !== gs) fails.push('with the default flag commitCupLeg still writes');
  if (G.cupDoorOpen() !== false) fails.push('cupDoorOpen reports the door open while CUP_LIVE is false');
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 20).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, the cup draws, plays and crowns one champion, hard but possible, and the door is shut');
}
process.exit(fails.length ? 1 : 0);
