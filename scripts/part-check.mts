/**
 * Letting a man go from his own card.
 *   node --experimental-strip-types scripts/part-check.mts
 *
 * Item 9 on Itzik's list. Two doors, each open only when it should be:
 *   1. in the window: "find yourself another club", the club takes 85% of
 *      his fee, and this is the only door then
 *   2. out of the window, only when the books are in the red: "part as
 *      friends", 25% of his fee and his wage off the bill from the next round
 *   3. neither when the window is shut and the books are fine
 *   4. never below sixteen men, never the youth registered for the round, and
 *      a starter who leaves is replaced so the eleven stays whole with one keeper
 * Measured on real careers, money and wage bill read back from the state.
 */
import * as G from '../src/game/state.ts';
import { wageBill } from '../src/game/career.ts';
import { transferFee, WINTER_WEEKS } from '../src/game/transfers.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import type { MatchResult, Player } from '../src/engine/matchEngine.ts';
import { matchFacts } from '../src/data/matchFacts.ts';
import { askableFacts } from '../src/data/pressFacts.ts';

/** A result in which one man scored against us, in the buyer's shirt. */
function fakeGoalBy(gs: G.GameState, clubId: string, p: Player): MatchResult {
  const stats = { possession: .5, chances: 5, goals: 0, xg: 1 };
  return {
    seed: 1,
    home: { id: gs.clubId, name: 'me', stats: { ...stats } },
    away: { id: clubId, name: 'them', stats: { ...stats, goals: 1 } },
    score: [0, 1], ratings: {},
    events: [{ minute: 70, type: 'goal', teamId: clubId, playerId: p.id, playerName: p.name, text: '' }],
  };
}

const fails: string[] = [];
let checked = 0;

function career(seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return { ...gs, phase: 'hub' };
}

/** Seventeen men, so there is one to spare above the floor. */
function withSpare(gs: G.GameState): G.GameState {
  const extra = makeSquad(58, createRng(9)).bench[2];
  const sq = G.mySquad(gs);
  return { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { starters: sq.starters, bench: [...sq.bench, { ...extra, id: 'spare-1' }] } } } };
}

/* 1. IN THE WINDOW: 85%, AND ONLY THAT DOOR. */
{
  let gs = withSpare({ ...career(), week: WINTER_WEEKS[0] });
  const tier = G.club(gs).tier;
  const p = G.mySquad(gs).bench.find(x => x.position !== 'GK')!;
  const opts = G.partOptions(gs, p.id);
  checked += 3;
  if (!G.transferWindow(gs).open) fails.push('the fixture week is not inside the winter window');
  if (opts.map(o => o.kind).join() !== 'transfer') fails.push(`in the window the doors are [${opts.map(o => o.kind).join(', ')}], expected only transfer`);
  const want = Math.round(transferFee(p, tier) * 0.85);
  if (opts[0] && Math.abs(opts[0].fee - want) > 1) fails.push(`the window sale pays ${opts[0].fee}, 85% of his fee is ${want}`);
  const before = gs.meters.money;
  const size = G.squadSize(gs);
  gs = G.partWays(gs, p.id, 'transfer');
  checked += 3;
  if (G.squadSize(gs) !== size - 1) fails.push('he did not leave the squad');
  if (gs.meters.money - before !== opts[0]?.fee) fails.push(`the club received ${gs.meters.money - before}, the door promised ${opts[0]?.fee}`);
  if (G.partWays(gs, p.id, 'friends') !== gs) fails.push('a man already gone could be let go again');
  console.log('  in the window he is moved on for 85% of his fee');
}

/* 2. OUT OF THE WINDOW, IN THE RED: 25% AND THE WAGE OFF THE BILL. */
{
  let gs = withSpare({ ...career(7), week: 3 });
  gs = { ...gs, meters: { ...gs.meters, money: -120_000 } };
  const tier = G.club(gs).tier;
  const p = G.mySquad(gs).bench.find(x => x.position !== 'GK')!;
  const opts = G.partOptions(gs, p.id);
  checked += 3;
  if (G.transferWindow(gs).open) fails.push('week 3 should be outside the window');
  if (G.debt(gs).level === 'clear') fails.push('the fixture is not actually in the red');
  if (opts.map(o => o.kind).join() !== 'friends') fails.push(`in the red out of the window the doors are [${opts.map(o => o.kind).join(', ')}], expected only friends`);
  const want = Math.round(transferFee(p, tier) * 0.25 / 1000) * 1000;
  const billBefore = wageBill(G.mySquad(gs), tier);
  const before = gs.meters.money;
  gs = G.partWays(gs, p.id, 'friends');
  checked += 3;
  if (opts[0] && opts[0].fee !== want) fails.push(`parting as friends pays ${opts[0].fee}, a quarter is ${want}`);
  if (gs.meters.money - before !== opts[0]?.fee) fails.push(`the club received ${gs.meters.money - before}, the door promised ${opts[0]?.fee}`);
  const billAfter = wageBill(G.mySquad(gs), tier);
  if (billBefore - billAfter !== opts[0]?.wage) fails.push(`the wage bill fell by ${billBefore - billAfter}, his wage was ${opts[0]?.wage}`);
  console.log('  in the red, out of the window, he goes as a friend for 25% and his wage comes off');
}

/* 3. WINDOW SHUT, BOOKS FINE: NO DOOR. */
{
  const gs = withSpare({ ...career(11), week: 3 });
  const p = G.mySquad(gs).bench.find(x => x.position !== 'GK')!;
  checked += 3;
  if (G.debt(gs).level !== 'clear') fails.push('the fixture books are not clear');
  if (G.partOptions(gs, p.id).length) fails.push('a door is open with the window shut and the books fine');
  if (G.partWays(gs, p.id, 'transfer') !== gs || G.partWays(gs, p.id, 'friends') !== gs) fails.push('a door that is not on offer still let him go');
  console.log('  window shut and books fine: nobody leaves');
}

/* 4. THE FLOOR, THE REGISTERED YOUTH, AND THE ELEVEN. */
{
  let gs = { ...career(13), week: WINTER_WEEKS[0] };
  const p = G.mySquad(gs).bench.find(x => x.position !== 'GK')!;
  checked += 2;
  if (G.squadSize(gs) !== 16) fails.push('the fixture squad is not sixteen');
  if (!G.partBlockedReason(gs, p.id) || G.partOptions(gs, p.id).length) fails.push('a sixteen-man squad could let a man go');

  // a starter leaving from seventeen: the eleven refills, with one keeper
  gs = withSpare(gs);
  const starter = G.mySquad(gs).starters[7];
  const after = G.partWays(gs, starter.id, 'transfer');
  const sq = G.mySquad(after);
  checked += 3;
  if (sq.starters.length !== 11) fails.push(`after a starter left the eleven has ${sq.starters.length}`);
  if (sq.starters.filter(x => x.position === 'GK').length !== 1) fails.push('after a starter left the eleven does not hold exactly one keeper');
  if (sq.starters.some(x => x.id === starter.id)) fails.push('the starter who left is still in the eleven');

  // the youth on the sheet for one round is not for sale
  const kid = gs.youth.players[0];
  const banned = { ...gs, suspensions: { [G.mySquad(gs).bench[1].id]: 1 } };
  const reg = G.registerYouthEmergency(banned, kid.id);
  checked++;
  if (reg.emergencyYouth === kid.id && !G.partBlockedReason(reg, kid.id)) fails.push('the youth registered for the round could be let go');
  console.log('  never below sixteen, never the registered youth, and the eleven stays whole');
}

/* 5. HE WENT SOMEWHERE, AND THE STORY FOLLOWS HIM. */
{
  let gs = withSpare({ ...career(21), week: WINTER_WEEKS[0] });
  const p = G.mySquad(gs).starters[8];
  gs = G.partWays(gs, p.id, 'transfer');
  const exit = gs.exits.find(e => e.id === p.id);
  checked += 4;
  if (!exit) fails.push('the sale left no record of where he went');
  const buyer = exit ? gs.league.squads[exit.clubId] : null;
  if (!buyer) fails.push('he was sold to a club that is not in the league');
  else {
    const there = [...buyer.starters, ...buyer.bench].some(x => x.id === p.id);
    if (!there) fails.push('the buying club does not actually have him');
    if (buyer.starters.length !== 11) fails.push(`the buying club now fields ${buyer.starters.length}`);
    if (buyer.starters.length + buyer.bench.length > 20) fails.push('the buying club grew past twenty');
  }
  if (exit && !gs.pendingOutcome?.includes(gs.league.clubs.find(c => c.id === exit.clubId)!.short)) fails.push('the outcome does not name the club he went to');
  if (!gs.chronicle.some(e => e.kind === 'sold' && e.title.includes(p.name))) fails.push('the chronicle did not record the sale');

  // walk the fixtures until we meet his new club: the VS screen names him
  let met = false;
  for (let w = gs.week; w <= gs.league.rounds && !met; w++) {
    const probe = { ...gs, week: w };
    const fx = G.playerFixture(probe);
    if (!fx) continue;
    const opp = fx.homeId === gs.clubId ? fx.awayId : fx.homeId;
    if (opp !== exit?.clubId) continue;
    met = true;
    checked += 2;
    if (!G.exesAtNextOpponent(probe).some(e => e.id === p.id)) fails.push('facing his new club, he is not listed as a man you sold them');
    if (!G.matchPreview(probe)?.exes.includes(p.name)) fails.push('the VS screen does not name him');
  }
  checked++;
  if (!met) fails.push('never met his new club in the remaining fixtures, so the story could not be checked');

  // and if he scores against you it is a story of its own, with a question
  const r = fakeGoalBy(gs, exit?.clubId ?? gs.league.clubs.find(c => c.id !== gs.clubId)!.id, p);
  const facts = matchFacts(r, gs.clubId, G.mySquad(gs), new Set(gs.exits.map(e => e.id)));
  checked += 3;
  if (facts[0]?.kind !== 'ex_scored') fails.push(`his goal against you reads as "${facts[0]?.kind}", not as the ex scoring`);
  if (!askableFacts(facts).some(f => f.kind === 'ex_scored')) fails.push('there is no press question for the ex scoring');
  const plain = matchFacts(r, gs.clubId, G.mySquad(gs), new Set());
  if (plain.some(f => f.kind === 'ex_scored')) fails.push('a goal by a stranger reads as the ex scoring');
  console.log('  he joins a club in the league, the VS screen names him, and his goal against you is the story');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
