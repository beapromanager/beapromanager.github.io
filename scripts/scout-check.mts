/**
 * The scout: hired once a season, three rounds away, back with the news.
 *   node --experimental-strip-types scripts/scout-check.mts
 *
 * What it holds to:
 *   1. below ליגה א׳ there is nobody to hire, and pressing the button does nothing
 *   2. hiring takes exactly the fee, once, and starts a job that remembers when
 *   3. only one a season, only while the window is shut, only with the money,
 *      and only if the job can finish before the last round
 *   4. he is back after three rounds played, not two and not four, with one
 *      notice, and the job is cleared
 *   5. the red dot: on after a window shuts, off once the door has been opened,
 *      on again when the next window shuts, never on while hired or while open
 *   6. a job left over from another season is dropped, never reported
 *   7. the keen one: a boy of seventeen with a ceiling, who walks in with the
 *      next window a year older and priced as he then is, can be signed once,
 *      and is gone when the window shuts
 */
import * as G from '../src/game/state.ts';
import {
  SCOUT_FEE, SCOUT_ROUNDS, SCOUT_TEXT, SCOUT_TIER, scoutWindowKey, emptyScout, findKeen, scoutBudget,
} from '../src/game/scout.ts';
import { potentialOf } from '../src/game/career.ts';
import { leagueCeiling } from '../src/data/clubs.ts';
import { transferFee } from '../src/game/transfers.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { WINTER_WEEKS } from '../src/game/transfers.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';

const fails: string[] = [];
let checked = 0;
const ok = (cond: boolean, msg: string) => { checked++; if (!cond) fails.push(msg); };

/** a hub in the first round, club forced up to the division the scout works in */
function hubAt(tier: number, week = 1, money = 900_000): G.GameState {
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'רמת גן');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  while (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  return {
    // the owner's crisis is a once in a career event at round four of ליגה א׳; these
    // claims are about the scout, so it is marked as already behind him
    ...gs, week, notices: [], crisisDone: true,
    meters: { ...gs.meters, money },
    league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) },
  };
}

/** one round, played and walked back to the hub, the way the climb check does it */
function playRound(g: G.GameState): G.GameState {
  const inp = G.liveMatchInput(g);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed);
  let gs = G.commitRound(g, res);
  gs = G.continueFromResult(gs);
  while (gs.phase === 'press') gs = G.answerPress(gs, 0);
  if (gs.phase === 'chat') gs = G.closeChat(gs);
  return gs;
}
const scoutNotices = (gs: G.GameState) => gs.notices.filter(n => n.kind === 'scout').length;

/* 1. nobody to hire below the division */
{
  const gs = hubAt(SCOUT_TIER - 1);
  ok(!G.scoutAvailable(gs), `a club in tier ${SCOUT_TIER - 1} was offered a scout`);
  ok(G.scoutBlockedReason(gs, 'safe') === SCOUT_TEXT.tooLow, 'below the division the reason was not the division one');
  const after = G.hireScout(gs, 'safe');
  ok(after.meters.money === gs.meters.money && after.scout.job === null, 'hiring below the division took money or started a job');
  ok(!G.scoutDot(gs), 'the dot was on for a club that cannot hire');
  console.log('  below the division there is no scout, and the button does nothing');
}

/* 2. hiring */
{
  const gs = hubAt(SCOUT_TIER);
  ok(G.scoutBlockedReason(gs, 'keen') === null, `a tier ${SCOUT_TIER} club with money in round one was blocked: ${G.scoutBlockedReason(gs, 'keen')}`);
  const after = G.hireScout(gs, 'keen');
  ok(gs.meters.money - after.meters.money === SCOUT_FEE, `hiring cost ${gs.meters.money - after.meters.money}, not ${SCOUT_FEE}`);
  ok(after.scout.job?.startWeek === gs.week && after.scout.job?.style === 'keen' && after.scout.job?.season === gs.season, 'the job did not record who, when and which season');
  ok(after.scout.hiredSeason === gs.season, 'the season was not marked as spent');
  ok(after.pendingOutcome === SCOUT_TEXT.signed, 'hiring did not say the signing sentence');
  console.log('  hiring takes the fee once and starts a job that remembers when');
}

/* 3. the rules of when */
{
  const base = hubAt(SCOUT_TIER);
  const hired = G.hireScout(base, 'safe');
  ok(G.scoutBlockedReason(hired, 'old') === SCOUT_TEXT.hiredThisSeason, 'a second scout in the same season was not refused');
  const twice = G.hireScout(hired, 'old');
  ok(twice.meters.money === hired.meters.money && twice.scout.job?.style === 'safe', 'a second hire changed the money or the job');

  const inWindow = hubAt(SCOUT_TIER, WINTER_WEEKS[0]);
  ok(G.scoutBlockedReason(inWindow, 'safe') === SCOUT_TEXT.windowOpen, 'the scout could be hired with the window open');

  const rounds = base.league.rounds;
  ok(G.scoutBlockedReason(hubAt(SCOUT_TIER, rounds - SCOUT_ROUNDS), 'safe') === null, `hiring in round ${rounds - SCOUT_ROUNDS}, which still leaves three rounds, was refused`);
  ok(G.scoutBlockedReason(hubAt(SCOUT_TIER, rounds - SCOUT_ROUNDS + 1), 'safe') === SCOUT_TEXT.tooLate, 'hiring one round too late was allowed');

  ok(G.scoutBlockedReason(hubAt(SCOUT_TIER, 1, SCOUT_FEE - 1), 'safe') === SCOUT_TEXT.tooPoor, 'a manager one shekel short could hire');
  ok(G.scoutBlockedReason(hubAt(SCOUT_TIER, 1, SCOUT_FEE), 'safe') === null, 'a manager with exactly the fee could not hire');

  // a new season is a new chance
  const next = { ...hired, season: hired.season + 1, week: 1, scout: { ...hired.scout, job: null } };
  ok(G.scoutBlockedReason(next, 'safe') === null, 'the next season did not allow a new scout');
  console.log('  one a season, only with the window shut, only with the money, only with time left');
}

/* 4. three rounds, and the news */
{
  let gs = G.hireScout(hubAt(SCOUT_TIER), 'old');
  const start = gs.week;
  for (let r = 1; r <= SCOUT_ROUNDS; r++) {
    gs = playRound(gs);
    if (r < SCOUT_ROUNDS) {
      ok(scoutNotices(gs) === 0, `the scout reported after ${r} round${r === 1 ? '' : 's'}, before his three`);
      ok(gs.scout.job !== null && G.scoutRoundsLeft(gs) === SCOUT_ROUNDS - r, `after ${r} rounds the counter said ${G.scoutRoundsLeft(gs)} left`);
    }
  }
  ok(gs.week === start + SCOUT_ROUNDS, `the test played to week ${gs.week}, not ${start + SCOUT_ROUNDS}`);
  ok(scoutNotices(gs) === 1, `after three rounds there were ${scoutNotices(gs)} scout notices, not 1`);
  ok(gs.scout.job === null && gs.scout.found?.style === 'old', 'the job was not cleared into a find of the same style');
  // a fourth round brings nothing new
  gs = { ...gs, notices: [] };
  gs = playRound(gs);
  ok(scoutNotices(gs) === 0, 'the scout reported a second time');
  console.log('  he is back after exactly three rounds, once, and the job clears');
}

/* 5. the dot */
{
  const s = hubAt(SCOUT_TIER);
  ok(G.scoutDot(s), 'the dot was off in a closed window with a scout to hire');
  const seen = G.openScout(s);
  ok(seen.phase === 'scout' && !G.scoutDot(G.backToHub(seen)), 'the dot stayed on after the door was opened');
  const laterSameStretch = { ...G.backToHub(seen), week: 5 };
  ok(!G.scoutDot(laterSameStretch), 'the dot came back within the same stretch of rounds');
  ok(!G.scoutDot({ ...s, week: WINTER_WEEKS[0] }) && !G.scoutDot({ ...s, week: WINTER_WEEKS[1] }), 'the dot was on with the window open');
  const afterWindow = { ...G.backToHub(seen), week: WINTER_WEEKS[1] + 1 };
  ok(scoutWindowKey(afterWindow.season, afterWindow.week) !== scoutWindowKey(seen.season, 1), 'the two closed stretches of a season share a key');
  ok(G.scoutDot(afterWindow), 'the dot did not come back when the winter window shut');
  ok(!G.scoutDot(G.hireScout(s, 'safe')), 'the dot was on with a scout already hired this season');
  ok(!G.scoutDot({ ...s, week: s.league.rounds - SCOUT_ROUNDS + 1 }), 'the dot was on when there was no time left for a job');
  console.log('  the dot: on when a window shuts, off once the door is opened, back for the next window');
}

/* 6. a job from another season */
{
  const gs = G.hireScout(hubAt(SCOUT_TIER), 'safe');
  const stale = { ...gs, season: gs.season + 1 };
  ok(G.scoutRoundsLeft(stale) === null, 'a job from last season still showed a counter');
  console.log('  a job from another season is not counted');
}

/* 7. THE KEEN ONE */
{
  const tier = SCOUT_TIER;
  const level = leagueCeiling(tier);

  // the finder: who he is, and that it is always the same man off the same stream
  const a = findKeen(tier, createRng(31), new Set());
  const b = findKeen(tier, createRng(31), new Set());
  // the id is a running counter shared by the whole game, so it is the one thing that differs
  const same = (x: typeof a, y: typeof a) => JSON.stringify({ ...x, id: 0 }) === JSON.stringify({ ...y, id: 0 });
  ok(same(a, b), 'the same stream found two different boys');
  let bad = 0;
  for (let i = 0; i < 60; i++) {
    const p = findKeen(tier, createRng(1000 + i), new Set());
    const o = overall(p);
    if (p.age !== 17 || o < level - 9 || o > level - 3 || potentialOf(p) < 84) bad++;
  }
  ok(bad === 0, `${bad} of 60 keen finds were not a seventeen year old ${level - 9} to ${level - 3} with a ceiling of 84`);
  const taken = new Set([a.name]);
  ok(findKeen(tier, createRng(31), taken).name !== a.name, 'the finder handed out a name that was already taken');

  // hired in round one, back after three, and he carries a boy
  let gs = G.hireScout(hubAt(tier), 'keen');
  for (let r = 0; r < SCOUT_ROUNDS; r++) gs = playRound(gs);
  const boy = gs.scout.found?.player ?? null;
  ok(boy !== null && boy.age === 17, 'the keen scout came back without a boy of seventeen');
  ok(G.hireScout(hubAt(tier), 'safe').scout.job?.style === 'safe' && G.hireScout(hubAt(tier), 'old').scout.job?.style === 'old', 'the other styles could not be hired');

  // he waits for the window: the round before it opens nothing has arrived
  const rich = { ...gs.meters, money: 6_000_000 };
  const waiting = { ...gs, week: 6, notices: [], meters: rich };
  const before = playRound(waiting);
  ok(before.week === 7 && before.scout.offer === null && before.scout.found !== null, 'the boy arrived before the window');

  // the window opens: he walks in, a year older, priced as he now is
  const seven = { ...gs, week: 7, notices: [], meters: rich };
  const open = playRound(seven);
  const offer = open.scout.offer;
  ok(open.week === 8 && offer !== null && open.scout.found === null, 'the boy did not arrive when the winter window opened');
  if (offer && boy) {
    ok(offer.player.age === 18, `he arrived at ${offer.player.age}, not 18`);
    ok(overall(offer.player) > overall(boy), 'he did not grow in the year he was away');
    ok(potentialOf(offer.player) === potentialOf(boy), 'his ceiling moved on the way');
    ok(offer.fee === transferFee(offer.player, tier), 'the price was not the price of the man who arrived');
    ok(G.scoutSignBlockedReason(open) === null, `the offer could not be signed with money and room: ${G.scoutSignBlockedReason(open)}`);

    // signing: the price, once, into the senior squad, through the ordinary door
    const signed = G.signScoutOffer(open);
    ok(open.meters.money - signed.meters.money === offer.fee, 'signing cost something other than the price');
    ok(G.squadSize(signed) === G.squadSize(open) + 1, 'signing did not add exactly one man');
    ok(G.mySquad(signed).bench.some(p => p.id === offer.player.id), 'he did not land on the senior bench');
    ok(signed.scout.offer === null, 'the offer stayed on the table after signing');
    ok(G.signScoutOffer(signed).meters.money === signed.meters.money, 'a second signing took money');

    // the rules of signing are the market's own
    const poor = { ...open, meters: { ...open.meters, money: offer.fee - 1 } };
    ok(G.scoutSignBlockedReason(poor) === SCOUT_TEXT.tooPoor && G.signScoutOffer(poor).scout.offer !== null, 'a manager short by a shekel could sign him');
    let full = open;
    for (const fa of open.market.slice(0, 2)) full = G.signPlayer(full, fa.player.id);
    ok(G.squadSize(full) >= G.MAX_SQUAD && G.scoutSignBlockedReason(full) !== null, 'he could be signed into a full squad');

    // the window shuts on him: still here in the second round of it, gone after
    const nine = playRound({ ...open, notices: [] });
    ok(nine.week === 9 && nine.scout.offer !== null, 'he left before the window shut');
    const ten = playRound({ ...nine, notices: [] });
    ok(ten.week === 10 && ten.scout.offer === null, 'he was still on offer after the window shut');
    ok(![...G.mySquad(ten).starters, ...G.mySquad(ten).bench].some(p => p.id === offer.player.id), 'an unsigned boy ended up in the squad');
  }

  // the summer window carries him too, and the season kicks him out
  const summer = G.enterPreseason({ ...gs, scout: { ...gs.scout } });
  ok(summer.phase === 'preseason-market' && summer.scout.offer !== null && summer.scout.found === null, 'the boy did not arrive with the summer market');
  const season = G.enterSeason(summer);
  ok(season.scout.offer === null, 'the offer survived the end of the summer');

  // the card quotes what the counter charges: 30 real arrivals against the range on the card
  const range = scoutBudget('keen', tier);
  ok(range !== null && range[0] < range[1], 'the keen card had no budget range');
  if (range) {
    // real arrivals, through the game's own window, not the function the card is drawn from
    const fees: number[] = [];
    for (let i = 0; i < 12; i++) {
      const kid = findKeen(tier, createRng(5000 + i), new Set());
      const at = playRound({ ...seven, notices: [], scout: { ...emptyScout(), hiredSeason: 1, found: { style: 'keen', season: 1, player: kid } } });
      if (at.scout.offer) fees.push(at.scout.offer.fee);
    }
    ok(fees.length === 12, `only ${fees.length} of 12 boys arrived through the window`);
    fees.sort((x, y) => x - y);
    const median = fees[Math.floor(fees.length / 2)];
    ok(median >= range[0] && median <= range[1], `the median arrival price ${median} is outside the range on the card, ${range[0]} to ${range[1]}`);
    ok(scoutBudget('safe', tier) === null && scoutBudget('old', tier) === null, 'a style that finds nobody yet quoted a budget');
  }
  ok(emptyScout().offer === null, 'a fresh scout had an offer');
  console.log('  the keen one: found at seventeen, arrives a year older with the window, signed once, gone when it shuts');
}

if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? `\nFAIL (${fails.length} of ${checked})` : `\nOK, ${checked} claims: the scout is hired once, works three rounds, and reports once`);
process.exit(fails.length ? 1 : 0);
