/**
 * The season's purse comes in round by round.
 *   node --experimental-strip-types scripts/purse-check.mts
 *
 * The whole participation purse used to arrive in the summer, while wages left every week. A club could be
 * level over the year and still sit below zero for most of it: measured over 100 careers, 36 percent of ליגה א׳
 * seasons and 29 percent of ליגה ג׳ seasons crossed zero on the way to money that was coming anyway, and
 * nobody could see it coming. Now the division's guaranteed base is paid with every round, and the summer
 * pays the rest: the position money and the promotion bonus.
 *
 * What this holds: the year is worth exactly what it was (nothing paid twice, nothing lost, not even by a
 * career saved halfway through a season), no finish is ever clawed back, and the manager can read what is
 * still to come.
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { purseInstalment, seasonPurse, PURSE_SPREAD } from '../src/game/career.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;
const ok = (cond: boolean, msg: string) => { checked++; if (!cond) fails.push(msg); };

/* 1. THE SHARE ITSELF, in the numbers agreed: the guaranteed base over the rounds, in clean hundreds. */
{
  ok(PURSE_SPREAD === 1, `the whole base is paid in rounds, found a share of ${PURSE_SPREAD}`);
  ok(purseInstalment(1, 14) === 10_700, `ליגה ג׳ pays ${purseInstalment(1, 14)} a round, expected 10,700 (150,000 over 14)`);
  ok(purseInstalment(2, 14) === 14_300, `ליגה ב׳ pays ${purseInstalment(2, 14)} a round, expected 14,300 (200,000 over 14)`);
  ok(purseInstalment(3, 14) === 66_400, `ליגה א׳ pays ${purseInstalment(3, 14)} a round, expected 66,400 (930,000 over 14)`);
  ok(purseInstalment(4, 14) === 128_600, `הלאומית pays ${purseInstalment(4, 14)} a round, expected 128,600 (1,800,000 over 14)`);
  ok(purseInstalment(5, 14) === 321_400, `ליגת העל pays ${purseInstalment(5, 14)} a round, expected 321,400 (4,500,000 over 14)`);
  console.log('  the base over the rounds: 10.7K, 14.3K, 66.4K, 128.6K and 321.4K a round, by division');
}

const play = (gs: G.GameState): G.GameState => {
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed);
  return G.commitRound(gs, res);
};
const next = (gs: G.GameState): G.GameState => {
  gs = G.continueFromResult(gs);
  while (gs.phase === 'press') gs = G.answerPress(gs, 0);
  if (gs.phase === 'chat') gs = G.closeChat(gs);
  return gs;
};
const start = (tier: number, seed: number): G.GameState => {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 40, type: 'mental' } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) }, crisisDone: true };
  gs = G.enterSeason(gs);
  while (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  return gs;
};

/* 2. EVERY ROUND PAYS ITS SHARE, and the ledger, the purse and the running total all say the same thing */
{
  let gs = start(3, 4242);
  const inst = purseInstalment(3, gs.league.rounds);
  const before = gs.meters.money;
  gs = play(gs);
  const l = gs.lastLedger!;
  ok(l.purse === inst, `the round's ledger shows a share of ${l.purse}, expected ${inst}`);
  ok(l.net === l.prize + l.gate + l.sponsor + l.signage + inst - l.total, 'the weekly balance does not include the share of the purse');
  ok(gs.meters.money - before === l.net, `the purse moved by ${gs.meters.money - before}, the ledger says ${l.net}`);
  ok(gs.purseEarlier === inst, `${gs.purseEarlier} is recorded as already paid, expected ${inst}`);
  gs = next(gs);
  gs = play(gs);
  ok(gs.purseEarlier === 2 * inst, `after two rounds ${gs.purseEarlier} is recorded as paid, expected ${2 * inst}`);
  console.log(`  a round at ליגה א׳ pays ₪${inst.toLocaleString('en-US')}, ledger and purse agree, ${gs.purseEarlier.toLocaleString('en-US')} paid after two`);
}

/* 3. THE YEAR IS WORTH WHAT IT WAS. What came in during the season and what the summer pays make exactly the
      season's purse for the place he finished. Nothing is paid twice and nothing is lost. */
{
  let checkedSeasons = 0;
  for (const [tier, seed] of [[1, 4242], [2, 777], [3, 31], [3, 9091]] as [number, number][]) {
    let gs = start(tier, seed);
    for (let w = 1; w <= gs.league.rounds; w++) {
      gs = play(gs);
      if (w < gs.league.rounds) gs = next(gs); else break;
    }
    const earlier = gs.purseEarlier;
    const rounds = gs.league.rounds;
    const moneyBefore = gs.meters.money;
    const after = G.startNextSeason(gs);
    const r = after.lastReport!;
    const total = seasonPurse(r.tier, r.position, gs.league.clubs.length, r.newTier > r.tier);
    checked += 5; checkedSeasons++;
    if (earlier !== purseInstalment(tier, rounds) * rounds) fails.push(`tier ${tier}: ${earlier} paid over the season, expected ${purseInstalment(tier, rounds) * rounds}`);
    if (r.purseEarlier !== earlier) fails.push(`tier ${tier}: the report says ${r.purseEarlier} came in earlier, it was ${earlier}`);
    if (r.purse + (r.purseEarlier ?? 0) !== total) fails.push(`tier ${tier}: ${r.purse} in the summer and ${r.purseEarlier} earlier is not the ${total} the finish is worth`);
    if (r.purse < 0) fails.push(`tier ${tier}: the summer takes ${r.purse} back`);
    // the summer adds the rest and the sponsor's bonus for going up, nothing else touches the purse there
    const bonus = r.newTier > r.tier ? (gs.sponsor?.promotionBonus ?? 0) : 0;
    if (after.meters.money - moneyBefore !== r.purse + bonus) fails.push(`tier ${tier}: the summer moved the purse by ${after.meters.money - moneyBefore}, the report pays ${r.purse + bonus}`);
    if (after.purseEarlier !== 0) fails.push(`tier ${tier}: the new season starts with ${after.purseEarlier} already paid`);
  }
  console.log(`  ${checkedSeasons} full seasons: what came in during the year and the summer make exactly the purse for the place, nothing twice`);
}

/* 4. A CAREER SAVED HALFWAY THROUGH A SEASON loses nothing and is paid nothing twice. Only the rounds that actually
      paid a share are taken off in the summer, so a save from before this change, with none paid, gets the whole
      purse at the whistle as it always did. */
{
  let gs = start(3, 555);
  for (let w = 1; w <= 5; w++) { gs = play(gs); gs = next(gs); }
  const paid = gs.purseEarlier;
  ok(paid === 5 * purseInstalment(3, gs.league.rounds), `${paid} after five rounds`);
  // the old save: the five rounds were played before shares existed
  gs = { ...gs, purseEarlier: 0 };
  for (let w = 6; w <= gs.league.rounds; w++) { gs = play(gs); if (w < gs.league.rounds) gs = next(gs); }
  const moneyBefore = gs.meters.money;
  const earlier = gs.purseEarlier;
  const after = G.startNextSeason(gs);
  const r = after.lastReport!;
  const total = seasonPurse(r.tier, r.position, gs.league.clubs.length, r.newTier > r.tier);
  checked += 2;
  if (earlier !== (gs.league.rounds - 5) * purseInstalment(3, gs.league.rounds)) fails.push(`only the rounds played after the change are counted, found ${earlier}`);
  if (r.purse !== total - earlier) fails.push(`the old save is paid ${r.purse} in the summer, expected the whole ${total} less the ${earlier} that came in`);
  void moneyBefore;
  console.log('  a save from halfway through a season: only the rounds that paid a share are taken off in the summer');
}

/* 5. NEVER A CLAW BACK. The base is the least any finish pays, so a share cannot exceed the purse, and if a save
      ever held more than that the summer pays nothing rather than taking money away. */
{
  let gs = start(2, 88);
  for (let w = 1; w <= gs.league.rounds; w++) { gs = play(gs); if (w < gs.league.rounds) gs = next(gs); }
  gs = { ...gs, purseEarlier: 10_000_000 };
  const before = gs.meters.money;
  const after = G.startNextSeason(gs);
  checked += 2;
  if (after.lastReport!.purse !== 0) fails.push(`more was recorded as paid than the purse holds and the summer pays ${after.lastReport!.purse}`);
  if (after.meters.money < before) fails.push('the summer took money out of the purse');
  console.log('  more paid than the purse holds: the summer pays nothing, never takes any back');
}

/* 6. THE MANAGER CAN READ WHAT IS STILL TO COME. */
{
  let gs = start(3, 4242);
  const o0 = G.purseOutlook(gs)!;
  const teams = gs.league.clubs.length;
  checked += 5;
  if (o0.expected !== seasonPurse(3, o0.position, teams)) fails.push(`before a ball is kicked the outlook is ${o0.expected}, the purse for place ${o0.position} is ${seasonPurse(3, o0.position, teams)}`);
  gs = play(gs);
  const o1 = G.purseOutlook(gs)!;
  if (o1.expected !== Math.max(0, seasonPurse(3, o1.position, teams) - gs.purseEarlier)) fails.push(`after a round the outlook is ${o1.expected}, expected the purse for place ${o1.position} less ${gs.purseEarlier}`);
  if (o1.expected <= 0) fails.push('the outlook is empty in the first round of a season');
  // it falls as shares are paid, in the same place
  const same = { ...gs, purseEarlier: 0 };
  if (G.purseOutlook(same)!.expected - G.purseOutlook(gs)!.expected !== Math.min(gs.purseEarlier, seasonPurse(3, o1.position, teams))) fails.push('the outlook does not fall by what has been paid');
  // and it says nothing at the end of the season, when the summer screen has the real figure
  if (G.purseOutlook({ ...gs, phase: 'season-end' }) !== null) fails.push('the outlook is still shown at the end of the season');
  console.log(`  the outlook: ₪${o0.expected.toLocaleString('en-US')} at the start, ₪${o1.expected.toLocaleString('en-US')} after a round`);
}

/* 7. THE SCREENS SAY IT: the weekly balance, the books when in the red, and the summer. */
{
  const result = readFileSync('src/ui/screens/Result.tsx', 'utf8');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  const end = readFileSync('src/ui/screens/SeasonEnd.tsx', 'utf8');
  checked += 5;
  if (!result.includes('outlook={G.purseOutlook(gs)}')) fails.push('the result screen is not given the outlook');
  if (!result.includes("label: 'מקדמה מפרס העונה'")) fails.push('the weekly balance does not show the share of the purse');
  if (!result.includes('בסוף העונה ייכנסו עוד')) fails.push('the result screen does not say what the summer will still pay');
  if (!hub.includes('outlook={G.purseOutlook(gs)}') || !hub.includes('בסוף העונה ייכנסו עוד')) fails.push('the books strip in the red does not say what is still to come');
  if (!end.includes('r.purseEarlier') || !end.includes('נכנסו כבר במהלך העונה')) fails.push('the summer does not say what already came in during the season');
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the purse comes in round by round and the year is worth what it was');
process.exit(fails.length ? 1 : 0);
