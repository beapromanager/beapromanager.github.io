/**
 * A career can never be locked shut by its goalkeeper again.
 *   node --experimental-strip-types scripts/gk-check.mts
 *
 * A player wrote in from ליגה א׳, season 5, round 9: he had rested his only
 * keeper and could not start a match. Reproduced exactly. The terrace asks for
 * the keeper to be dropped, the manager agrees, and the keeper is marked as
 * sitting out; but benching him needs a SECOND keeper on the bench to come in,
 * and with only one he stays in the eleven carrying the mark. The round then
 * refuses to start until he is taken out of the eleven, and taking him out is
 * refused because a keeper has to be in goal. Nothing on any screen could fix
 * it. He escaped by opening a pack and pulling a keeper, which is luck.
 *
 * Three things hold now, and this checks all three:
 *
 *   1. a squad never has fewer than two men who can keep goal. Not by selling,
 *      not by releasing, not by parting ways, and not by age.
 *   2. when neither of them can play, an outfield man may go in goal, and only
 *      then. That is the door that unlocks a save that is already stuck.
 *   3. it costs about half again as many goals, which is what makes it an
 *      emergency rather than a free swap. At the old out-of-position rate it
 *      cost nothing at all, and in one club tested it was an improvement.
 */
import { readFileSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { TEMPLATES, rollDilemma } from '../src/data/dilemmas.ts';
import type { Ctx } from '../src/data/dilemmas.ts';
import { simulateMatch, overall, createRng } from '../src/engine/matchEngine.ts';
import type { Player } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION, FIT_MULT, roleFit } from '../src/data/formations.ts';
import { ageSquad, fillWithYouth } from '../src/game/career.ts';
import { MIN_KEEPERS, MIN_SQUAD, WINTER_WEEKS } from '../src/game/transfers.ts';
import { CITIES } from '../src/data/cities.ts';

const fails: string[] = [];
let checked = 0;

function career(seed = 4242, town = CITIES[3].name): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', age: 38, type: 'mental' });
  gs = G.pickCity(gs, town);
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  while (gs.notices.length) gs = G.dismissNotice(gs);
  return G.markTutorialSeen(gs);
}

const keepersOf = (gs: G.GameState) => {
  const sq = G.mySquad(gs);
  return [...sq.starters, ...sq.bench].filter(p => p.position === 'GK');
};

/* ------------------------------------------------- 1. never fewer than two */

/* 1a. a squad is born with two, and every town's is */
{
  let short = 0;
  for (let i = 0; i < 12; i++) {
    const gs = career(100 + i, CITIES[(i * 5) % CITIES.length].name);
    checked++;
    if (keepersOf(gs).length < MIN_KEEPERS) short++;
  }
  checked++;
  if (short) fails.push(`${short} of 12 new careers started with fewer than ${MIN_KEEPERS} keepers`);
}

/* 1b. the last two cannot be sold, released or let go.

      The window is forced OPEN for this block. Left shut, every sell is
      refused for being shut and the keeper rule is never reached: the first
      version of this passed with the rule deleted, which is a check that
      cannot fail, and the sabotage caught it. The MESSAGE is asserted, not
      merely that there was one. */
{
  // and one spare outfield man, so the squad is over the minimum. At exactly
  // sixteen the size rule fires first and the keeper rule is never reached,
  // which is the same wrong-reason trap one layer down
  const seed0 = { ...career(), week: WINTER_WEEKS[0] };
  const sq0 = G.mySquad(seed0);
  const spareMan: Player = { ...sq0.bench.find(p => p.position !== 'GK')!, id: 'spare-outfield', name: 'עודף אחד' };
  const gs: G.GameState = {
    ...seed0,
    league: { ...seed0.league, squads: { ...seed0.league.squads,
      [seed0.clubId]: { starters: sq0.starters, bench: [...sq0.bench, spareMan] } } },
  };
  const gks = keepersOf(gs);
  checked += 3;
  if (gks.length !== MIN_KEEPERS) {
    fails.push(`this career has ${gks.length} keepers, the rest of this block assumes exactly ${MIN_KEEPERS}`);
  }
  checked += 2;
  if (!G.transferWindow(gs).open) fails.push('the window did not open for this block, so selling is refused for the wrong reason');
  if (G.squadSize(gs) <= MIN_SQUAD) fails.push('the squad is at the minimum, so the size rule answers before the keeper rule');

  const saysKeeper = (why: string | null) => !!why && why.includes('שוערים');
  for (const gk of gks) {
    checked += 3;
    const sell = G.sellBlockedReason(gs, gk.id);
    if (!saysKeeper(sell)) {
      fails.push(`${gk.name} can be sold while he is one of the last ${MIN_KEEPERS}: "${sell ?? 'nothing stopped it'}"`);
    }
    const part = G.partBlockedReason(gs, gk.id);
    if (!saysKeeper(part)) {
      fails.push(`${gk.name} can be let go while he is one of the last ${MIN_KEEPERS}: "${part ?? 'nothing stopped it'}"`);
    }
    const after = G.releasePlayer(gs, gk.id);
    if (G.squadSize(after) < G.squadSize(gs)) fails.push(`${gk.name} was released while he is one of the last ${MIN_KEEPERS}`);
  }
  // and an outfield man is not caught by the rule
  const outfield = G.mySquad(gs).bench.find(p => p.position !== 'GK');
  checked++;
  if (outfield && G.lastKeeperReason(gs, outfield.id)) {
    fails.push('an outfield player is being refused by the keeper rule');
  }
  // a THIRD keeper may leave, the rule is a floor and not a freeze
  const sq = G.mySquad(gs);
  const third = { ...sq.bench[0], id: 'gk-extra', position: 'GK' as Player['position'], name: 'שוער שלישי' };
  const withThree = {
    ...gs,
    league: { ...gs.league, squads: { ...gs.league.squads,
      [gs.clubId]: { starters: sq.starters, bench: [...sq.bench, third] } } },
  };
  checked++;
  if (G.lastKeeperReason(withThree, gks[0].id)) {
    fails.push('a keeper cannot leave even when there are three, so the rule is a freeze and not a floor');
  }
}

/* 1c. and age cannot take the second one either */
{
  const gs = career();
  const sq = G.mySquad(gs);
  // one keeper left, the way a retirement leaves it
  const gks = keepersOf(gs);
  const trimmed = {
    starters: sq.starters.filter(p => p.id !== gks[1]?.id),
    bench: sq.bench.filter(p => p.id !== gks[1]?.id),
  };
  const before = [...trimmed.starters, ...trimmed.bench].filter(p => p.position === 'GK').length;
  const filled = fillWithYouth(trimmed, createRng(7), G.club(gs).tier, MIN_SQUAD);
  const after = [...filled.squad.starters, ...filled.squad.bench].filter(p => p.position === 'GK').length;
  checked += 2;
  if (before !== 1) fails.push(`the setup meant to leave one keeper left ${before}`);
  if (after < MIN_KEEPERS) fails.push(`the summer left the squad with ${after} keeper(s), and it must top up to ${MIN_KEEPERS}`);
  console.log(`  a squad that came out of the summer with ${before} keeper now leaves it with ${after}`);
}

/* 1d. played out careers, every season, never fewer than two */
{
  let seasons = 0, worst = 99;
  for (let seed = 1; seed <= 8; seed++) {
    let gs = career(seed * 31 + 5, CITIES[(seed * 9) % CITIES.length].name);
    for (let s = 1; s <= 6; s++) {
      seasons++;
      worst = Math.min(worst, keepersOf(gs).length);
      for (let w = 1; w <= gs.league.rounds; w++) {
        if (gs.phase === 'season-end' || gs.phase === 'sacked') break;
        if (!G.playerFixture(gs)) break;
        const inp = G.liveMatchInput(gs);
        const res = simulateMatch(
          { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
            tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
          { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
            tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
          inp.seed);
        gs = G.commitRound(gs, res);
        gs = G.continueFromResult(gs);
        while (gs.phase === 'press') gs = G.answerPress(gs, 0);
        if (gs.phase === 'chat') gs = G.closeChat(gs);
        worst = Math.min(worst, keepersOf(gs).length);
      }
      if (gs.phase === 'sacked' || gs.phase !== 'season-end') break;
      gs = G.startNextSeason(gs);
      if (gs.phase === 'sacked') break;
      gs = G.enterSeason(gs);
      if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
      if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
    }
  }
  checked += 2;
  if (worst < MIN_KEEPERS) fails.push(`a played out career got down to ${worst} keeper(s)`);
  console.log(`  ${seasons} seasons played out, the fewest keepers ever held was ${worst}`);
}

/* ----------------------------------- 2. the lock itself, and the way out */

/* 2a. the report, reproduced, and then survived */
{
  // one man who can keep goal, and a legal squad: the spares become defenders
  const base = career();
  const sq0 = G.mySquad(base);
  const spare = new Set([...sq0.starters, ...sq0.bench].filter(p => p.position === 'GK').slice(1).map(p => p.id));
  const asCb = (p: Player): Player => (spare.has(p.id) ? { ...p, position: 'CB' as Player['position'] } : p);
  let gs: G.GameState = {
    ...base,
    league: { ...base.league, squads: { ...base.league.squads,
      [base.clubId]: { starters: sq0.starters.map(asCb), bench: sq0.bench.map(asCb) } } },
  };

  const tpl = TEMPLATES.find(t => (t.slots?.who ?? []).some(s => s.includes('השוער')));
  checked++;
  if (!tpl) fails.push('the dilemma that drops the keeper is gone, so the report cannot be reproduced');

  let rolled = null;
  for (let seed = 1; seed < 400 && tpl && !rolled; seed++) {
    const ctx = { star: 'כהן', rival: 'השכנה', pos: 8, week: 9, benched: 'לוי' } as unknown as Ctx;
    const r = rollDilemma(tpl, ctx, createRng(seed));
    if (r.options.some(o => (o.act ?? []).some(a => a.kind === 'sit' && a.who === 'gk'))) rolled = r;
  }
  checked++;
  if (!rolled) fails.push('could not roll the variant that drops the keeper');

  if (rolled) {
    const idx = rolled.options.findIndex(o => (o.act ?? []).some(a => a.kind === 'sit' && a.who === 'gk'));
    gs = G.chooseDilemma({ ...gs, dilemma: rolled }, idx);
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);

    const sq = G.mySquad(gs);
    const gk = [...sq.starters, ...sq.bench].find(p => p.position === 'GK')!;
    checked += 3;
    // the state the report is made of: he is sat out, and he is still in the eleven
    if (!gs.sitOut[gk.id]) fails.push('the keeper was not actually sat out, so this is not the reported state');
    if (!G.weekBlockedReason(gs)) fails.push('the round is not blocked, so this is not the reported state');
    if (!G.noKeeperAvailable(gs)) fails.push('the game does not agree that no keeper can play');

    // THE FIX: somebody can now be put in goal, and the round can start
    const ways = sq.bench.filter(b => !G.swapBlockedReason(gk, b, gs));
    checked += 2;
    if (!ways.length) {
      fails.push('DEADLOCK: the keeper is sat out, is stuck in the eleven, and nobody on the bench may replace him');
    } else {
      const fixed = G.swapPlayers(gs, gk.id, ways[0].id);
      if (G.weekBlockedReason(fixed)) {
        fails.push(`after putting ${ways[0].name} in goal the round is still blocked: ${G.weekBlockedReason(fixed)}`);
      }
      const started = G.startWeek(fixed);
      checked++;
      if (started.phase === fixed.phase) fails.push('the round still will not start after the eleven was put right');
      console.log(`  the reported lock: ${ways.length} men on the bench can now take the shirt, and the round starts`);
    }
  }
}

/* 2b. and the door stays SHUT while a keeper can play */
{
  const gs = career();
  const sq = G.mySquad(gs);
  const gkIn = sq.starters.find(p => p.position === 'GK')!;
  const outfieldOnBench = sq.bench.filter(p => p.position !== 'GK');
  checked += 2;
  if (G.noKeeperAvailable(gs)) fails.push('the game thinks no keeper can play in an ordinary week');
  const opened = outfieldOnBench.filter(b => !G.swapBlockedReason(gkIn, b, gs));
  if (opened.length) {
    fails.push(`${opened.length} outfield men may take the goalkeeper's shirt on an ordinary week, and none should`);
  }
  console.log(`  on an ordinary week, ${outfieldOnBench.length} outfield men on the bench and none may go in goal`);
}

/* ------------------------------------------------- 3. and it has to hurt */

/* 3a. the engine charges a man in goal who is not a keeper its own rate */
{
  checked += 3;
  if (roleFit('ST', 'GK') !== 'nogk') fails.push('a striker in goal is not charged the goalkeeping rate');
  if (roleFit('GK', 'GK') !== 'natural') fails.push('a keeper in goal is not natural');
  if (roleFit('CB', 'RB') !== 'covers' && roleFit('CB', 'RB') !== 'out') {
    fails.push('an ordinary out of position man is being charged the goalkeeping rate');
  }
  checked++;
  if (FIT_MULT.nogk >= FIT_MULT.out) {
    fails.push(`nogk is ${FIT_MULT.nogk} and out is ${FIT_MULT.out}: keeping goal must cost more than a strange shirt`);
  }
}

/* 3b. measured on the pitch, not asserted: about half again as many conceded */
{
  const MATCHES = 400;
  const deltas: number[] = [];
  for (const seed of [11, 77, 404]) {
    let gs = G.newGame(seed);
    gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
    gs = G.pickCity(gs, CITIES[seed % CITIES.length].name);
    gs = G.afterSigning(gs, {});
    gs = G.enterSeason({ ...gs, crisisDone: true });
    if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
    if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
    while (gs.notices.length) gs = G.dismissNotice(gs);

    const inp = G.liveMatchInput(gs);
    const sq = G.mySquad(gs);
    const stand = [...sq.bench, ...sq.starters]
      .filter(p => p.position !== 'GK' && !inp.playerStarters.some(s => s.id === p.id))
      .sort((a, b) => overall(b) - overall(a))[0];
    if (!stand) continue;

    const play = (swapIn: Player | null) => {
      let mine = [...inp.playerStarters];
      if (swapIn) {
        const gi = mine.findIndex(p => p.position === 'GK');
        if (gi >= 0) mine = mine.map((p, i) => (i === gi ? swapIn : p));
      }
      let conceded = 0;
      for (let n = 0; n < MATCHES; n++) {
        const res = simulateMatch(
          { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? mine : inp.oppStarters,
            tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true, seated: inp.iAmHome },
          { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : mine,
            tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false, seated: !inp.iAmHome },
          inp.seed + n * 7919);
        conceded += inp.iAmHome ? res.score[1] : res.score[0];
      }
      return conceded / MATCHES;
    };

    const withKeeper = play(null);
    const without = play(stand);
    deltas.push((without / withKeeper - 1) * 100);
  }

  checked += 2;
  if (!deltas.length) fails.push('no club could be measured, so the cost was never checked on the pitch');
  const avg = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
  console.log(`  an outfield man in goal concedes ${avg >= 0 ? '+' : ''}${avg.toFixed(0)}% more, per club ${deltas.map(d => `${d.toFixed(0)}%`).join(', ')}`);
  if (avg < 30) fails.push(`an outfield man in goal costs only ${avg.toFixed(0)}% more goals, which is not an emergency`);
  if (avg > 75) fails.push(`an outfield man in goal costs ${avg.toFixed(0)}% more goals, which is a punishment and not a match`);
}

/* the rule is written down where a reader will find it */
{
  const t = readFileSync('src/game/transfers.ts', 'utf8');
  checked++;
  if (!t.includes('export const MIN_KEEPERS')) fails.push('MIN_KEEPERS is gone from transfers.ts');
}

console.log(`${checked} checks`);
console.log('two keepers always, a defender in goal only when neither can play, and it costs half a goal again');
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the keeper can never lock a career shut again');
process.exit(fails.length ? 1 : 0);
