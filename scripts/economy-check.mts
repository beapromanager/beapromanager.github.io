/**
 * Can the club actually pay its bills?
 *
 * Money used to be floored at zero, so a structurally bankrupt economy was
 * invisible: the debt simply evaporated every round. The moment debt became
 * real, eleven of twelve brand new careers were sacked inside their first
 * season. This is the guard against that ever being true again.
 *
 * Two questions, both of them about the path a real player takes:
 *   a brand new career, untouched, must survive season one
 *   a mid table club in any division must not be bankrupted by simply existing
 *
 * The scripted crisis in ליגה א׳ and the לאומית is switched off here on purpose.
 * It is a story beat that bankrupts every club by design, and leaving it on
 * would drown out the thing this file exists to measure: whether the wages,
 * prizes, gate and sponsor add up on their own.
 *
 *   node --experimental-strip-types scripts/economy-check.mts
 */

import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { seasonPurse, playerWage, wageBill, WAGE_BAND } from '../src/game/career.ts';
import { debtLimit } from '../src/game/finance.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { LEAGUE_NAMES } from '../src/data/clubs.ts';

const SEEDS = [4242, 777, 31, 9091, 555, 12007, 88, 4004, 6161, 2222, 3131, 9];
const k = (v: number) => `${Math.round(v / 1000)}k`.padStart(8);
const bad: string[] = [];

/** One season, from wherever the purse starts it. */
function season(tier: number | null, seed: number, money: number | null, city?: string) {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 40, type: 'mental' });
  // pickCity is the road a player takes; pickClub is the old one, kept for
  // the per-division runs below, which set their own tier and purse
  gs = city ? G.pickCity(gs, city) : G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});
  if (tier !== null) {
    gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) } };
  }
  // the scripted collapse is not what is being measured here
  gs = { ...gs, crisisDone: true };
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  if (money !== null) gs = { ...gs, meters: { ...gs.meters, money } };
  let low = gs.meters.money;
  for (let w = 1; w <= gs.league.rounds; w++) {
    const inp = G.liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed);
    gs = G.commitRound(gs, res);
    low = Math.min(low, gs.meters.money);
    gs = G.continueFromResult(gs);
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    if (gs.phase === 'season-end' || gs.sacking) break;
  }
  return { end: gs.meters.money, low, sacked: !!gs.sacking };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/* ---- the wage bands the manager was promised */
console.log('weekly wages, a full squad\n');
for (const t of [1, 2, 3, 4, 5]) {
  const sq = makeSquad([0, 53, 58, 64, 69, 75][t], createRng(99));
  const all = [...sq.starters, ...sq.bench];
  const ws = all.map(p => playerWage(p, t));
  const top = Math.max(...ws), avg = mean(ws);
  const [lo, hi] = WAGE_BAND[t];
  console.log(`${LEAGUE_NAMES[t].padEnd(13)} avg ₪${Math.round(avg).toLocaleString('en-US').padStart(7)}   top ₪${top.toLocaleString('en-US').padStart(7)}   bill ₪${wageBill(sq, t).toLocaleString('en-US')}`);
  if (top > hi) bad.push(`${LEAGUE_NAMES[t]}: top wage ₪${top} is over the ₪${hi} the division was promised`);
  // The ceiling belongs to the star, not the squad, so the average has to sit in
  // the lower half of the band. Measured against the band and not against the
  // ceiling alone: the top divisions are deliberately narrow (7-12k, 12-15k),
  // where an average near the middle is right rather than wrong.
  const midish = lo + (hi - lo) * 0.6;
  if (avg > midish) bad.push(`${LEAGUE_NAMES[t]}: the average wage ₪${Math.round(avg)} sits too high in the ₪${lo}-₪${hi} band`);
}

/* ---- a brand new career, the path everyone takes: a town, and an untouched
        squad. The big towns are the hard case, their squads are the dearest
        in the division. The bar: around zero on average, and a sacking in
        season one rare enough that a new manager does not meet it by doing
        nothing. This used to run through pickClub, a squad averaging 52 on
        half the wages, and reported an economy nobody was playing in. */
console.log(`\nbrand new careers, season one, untouched (${SEEDS.length} runs a town)`);
let freshRuns = 0, freshSacked = 0;
for (const city of ['אשדוד', 'חיפה', 'באר שבע', 'רמת גן']) {
  const rs = SEEDS.map(s => season(null, s, null, city));
  const ends = rs.map(r => r.end);
  const sacked = rs.filter(r => r.sacked).length;
  freshRuns += rs.length; freshSacked += sacked;
  console.log(`  ${city.padEnd(8)} end mean${k(mean(ends))}  worst${k(Math.min(...rs.map(r => r.low)))}  in the red ${ends.filter(e => e < 0).length}/${rs.length}  sacked ${sacked}/${rs.length}`);
  if (mean(ends) < -50_000) bad.push(`${city}: an untouched first season ends ${Math.round(mean(ends) / 1000)}k in the red on average`);
}
if (freshSacked > freshRuns * 0.1) bad.push(`${freshSacked} of ${freshRuns} brand new untouched careers were sacked in season one, more than one in ten`);

/* ---- and every division, on its own participation money */
console.log('\nmid table club, one season, per division');
for (const t of [1, 2, 3, 4, 5]) {
  const rs = SEEDS.slice(0, 10).map(s => season(t, s, seasonPurse(t, 4, 8)));
  const ends = rs.map(r => r.end), lows = rs.map(r => r.low);
  const sacked = rs.filter(r => r.sacked).length;
  console.log(`  ${LEAGUE_NAMES[t].padEnd(13)} mean${k(mean(ends))}  worst${k(Math.min(...lows))}  limit${k(-debtLimit(t))}  sacked ${sacked}/10`);
  if (sacked > 0) bad.push(`${LEAGUE_NAMES[t]}: ${sacked} of 10 mid table seasons ended in the sack`);
  if (mean(ends) < 0) bad.push(`${LEAGUE_NAMES[t]}: a mid table season loses money on average (${Math.round(mean(ends))})`);
}

console.log(bad.length ? `\nFAIL\n - ${bad.join('\n - ')}` : '\nOK, the club can pay its way in every division');
process.exit(bad.length ? 1 : 0);
