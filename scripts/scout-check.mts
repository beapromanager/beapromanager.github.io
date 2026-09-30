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
 *   8. the safe one: a real man of nineteen or twenty from a club fighting the
 *      manager in the table, priced over the ordinary fee, who leaves that club
 *      the moment he is signed and not a minute before
 *   9. the old one: a proven man of 24 or 25 who belongs to nobody, the dearest of
 *      the three and still under the marquee, priced by his level
 */
import * as G from '../src/game/state.ts';
import {
  SCOUT_FEE, SCOUT_ROUNDS, SCOUT_TEXT, SCOUT_TIER, scoutWindowKey, emptyScout, findKeen, scoutBudget,
} from '../src/game/scout.ts';
import { potentialOf } from '../src/game/career.ts';
import { leagueCeiling, setDerbies } from '../src/data/clubs.ts';
import { makePlayer, NEUTRAL_TRAITS } from '../src/data/squadGen.ts';
import { transferFee } from '../src/game/transfers.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { requiredCapacity, purseBase } from '../src/game/career.ts';
import { sortedTable } from '../src/game/league.ts';
import { pickSafe, feeRange, findOld, oldFee } from '../src/game/scout.ts';
import type { RivalKid } from '../src/game/scout.ts';
import { WINTER_WEEKS } from '../src/game/transfers.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { SCOUT_LIVE } from '../src/game/scout.ts';
import { readFileSync } from 'node:fs';
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
/**
 * A career played up to its first season in ליגה א׳, by the same rules the
 * climb check plays by, so the rivals in the league are the squads the game
 * really builds for it and not a first division dressed up as a third.
 */
function climbTo3(seed: number): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' } as never);
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});
  for (let s = 1; s <= 8; s++) {
    gs = G.enterSeason(gs);
    while (gs.phase === 'kit') gs = G.closeKitReveal(gs);
    if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
    for (let w = 1; w <= gs.league.rounds; w++) {
      if (!gs.stadium.project) {
        const l = gs.lastLedger;
        const reserve = (l ? l.total : 60_000) * Math.max(4, Math.round(gs.league.rounds * 0.5));
        const want = G.crowdWanted(gs) * 1.25;
        if (gs.stadium.capacity < Math.max(want, requiredCapacity(G.club(gs).tier + 1))) {
          for (const o of [...G.expansions(gs)].reverse()) {
            if (!G.expansionBlockedReason(gs, o) && gs.meters.money - o.cost >= reserve) { gs = G.startStadiumProject(gs, o.key); break; }
          }
        }
      }
      gs = playRound(gs);
      if (gs.sacking || gs.phase === 'season-end') break;
    }
    if (gs.sacking) break;
    gs = G.startNextSeason(gs);
    if (G.club(gs).tier >= SCOUT_TIER) {
      gs = G.enterSeason(gs);
      while (gs.phase === 'kit') gs = G.closeKitReveal(gs);
      if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
      return { ...gs, week: 1, notices: [], crisisDone: true, meters: { ...gs.meters, money: 900_000 } };
    }
  }
  throw new Error('the career never reached the division the scout works in');
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
  ok(!G.scoutDot(hubAt(SCOUT_TIER, 1, SCOUT_FEE - 1)), 'the dot was on for a club that could not pay the scout');
  ok(G.scoutDot(hubAt(SCOUT_TIER, 1, SCOUT_FEE)), 'the dot was off for a club with exactly the fee');
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
    ok(scoutBudget('safe', tier) === null, 'the safe one quoted a budget from the finder, when his comes from the league');
  }
  ok(emptyScout().offer === null, 'a fresh scout had an offer');
  console.log('  the keen one: found at seventeen, arrives a year older with the window, signed once, gone when it shuts');
}

/* 8. THE SAFE ONE */
{
  const t3 = climbTo3(31);
  const tier = G.club(t3).tier;
  ok(tier >= SCOUT_TIER, "the climb did not reach the scout's division");
  const rivalsOf = (gs: G.GameState) => gs.league.clubs.filter(c => c.id !== gs.clubId);
  const kidsOf = (gs: G.GameState, ids: string[]): RivalKid[] =>
    ids.flatMap(id => [...gs.league.squads[id].starters, ...gs.league.squads[id].bench].map(player => ({ clubId: id, player })));
  const all = kidsOf(t3, rivalsOf(t3).map(c => c.id));

  // the picker, against an independent count over the same men
  const eligible = all.filter(k => k.player.age >= 19 && k.player.age <= 20 && k.player.position !== 'GK');
  const inBand = eligible.filter(k => { const p = potentialOf(k.player); return p >= 70 && p <= 83; });
  const got = pickSafe(all);
  if (inBand.length) {
    const best = Math.max(...inBand.map(k => overall(k.player)));
    ok(got !== null && overall(got.player) === best && inBand.some(k => k.player.id === got.player.id), 'the safe pick was not the best man now among those with a ceiling in the band');
  }
  ok(pickSafe([]) === null, 'an empty pool produced a pick');
  ok(pickSafe(all.filter(k => k.player.age > 20 || k.player.age < 19)) === null, 'the picker took a man who was not nineteen or twenty');
  ok(pickSafe(all.filter(k => k.player.position === 'GK')) === null, 'the picker took a keeper');
  const outside = eligible.filter(k => { const p = potentialOf(k.player); return p < 70 || p > 83; });
  if (outside.length) {
    const top = Math.max(...outside.map(k => potentialOf(k.player)));
    const fb = pickSafe(outside);
    ok(fb !== null && potentialOf(fb.player) === top, 'with nobody in the band the picker did not fall back to the highest ceiling');
  }
  const fr = feeRange([61_000, 87_000, 70_000]);
  ok(fr !== null && fr[0] === 60_000 && fr[1] === 90_000, `the range for three fees was ${fr}`);
  ok(feeRange([]) === null, 'an empty list of fees had a range');

  // hired, away three rounds, and he names a man at a club near him in the table
  let gs = G.hireScout(t3, 'safe');
  for (let r = 0; r < SCOUT_ROUNDS; r++) gs = playRound(gs);
  const found = gs.scout.found;
  const kid = found?.player ?? null;
  ok(kid !== null && !!found?.fromClubId, 'the safe scout came back without a man and a club');
  if (kid && found?.fromClubId) {
    const club = gs.league.squads[found.fromClubId];
    ok(!!club && [...club.starters, ...club.bench].some(p => p.id === kid.id), 'the man he found was not in the squad he named');
    ok(found.fromClubId !== gs.clubId, "the scout took a man from the manager's own club");
    ok((kid.age === 19 || kid.age === 20) && kid.position !== 'GK', 'the man he found was not a nineteen or twenty year old outfield player');
    const table = sortedTable(gs.league);
    const mine = table.findIndex(s => s.clubId === gs.clubId);
    const near = table.map((s, i) => ({ id: s.clubId, d: Math.abs(i - mine) })).filter(x => x.id !== gs.clubId).sort((a, b) => a.d - b.d).slice(0, 3).map(x => x.id);
    ok(near.includes(found.fromClubId) || G.myLocalRival(gs)?.club.id === found.fromClubId, 'he took from a club that is neither near in the table nor the derby');
  }

  // the window opens: he is offered from the squad as it stands, and not yet taken
  const seven = { ...gs, week: 7, notices: [], meters: { ...gs.meters, money: 6_000_000 } };
  const open = playRound(seven);
  const offer = open.scout.offer;
  ok(open.week === 8 && offer !== null && offer.style === 'safe' && !!offer.fromClubId, 'the safe find did not arrive with the winter window');
  if (offer && offer.fromClubId && kid) {
    const from = offer.fromClubId;
    ok(offer.player.id === kid.id, 'the man who arrived was not the man who was found');
    ok(offer.fee === Math.round((1.5 * transferFee(offer.player, tier)) / 1000) * 1000, `the price ${offer.fee} was not one and a half times the ordinary fee`);
    const src = open.league.squads[from];
    ok([...src.starters, ...src.bench].some(p => p.id === offer.player.id), 'he had left his club before anybody signed him');
    const range = G.scoutBudgetFor(seven, 'safe');
    ok(range !== null && offer.fee >= range[0] && offer.fee <= range[1], `the price ${offer.fee} is outside the range on the card, ${range}`);

    // signed: he leaves them, joins us, the money moves once, and their eleven is still eleven
    const before = open.league.squads[from];
    const signed = G.signScoutOffer(open);
    const after = signed.league.squads[from];
    ok(open.meters.money - signed.meters.money === offer.fee, 'signing cost something other than the price');
    ok(G.mySquad(signed).bench.some(p => p.id === offer.player.id), 'he did not land on our bench');
    ok(![...after.starters, ...after.bench].some(p => p.id === offer.player.id), 'he was still in their squad after we signed him');
    ok(after.starters.length + after.bench.length === before.starters.length + before.bench.length - 1, 'their squad did not shrink by exactly one');
    ok(after.starters.length === 11, `their eleven was ${after.starters.length} after losing him`);
    ok([...after.starters, ...after.bench].filter(p => p.position === 'GK').length >= 1 && after.starters.some(p => p.position === 'GK'), 'taking him left them without a keeper in goal');
    ok(G.signScoutOffer(signed).league.squads[from] === after, 'a second signing touched their squad again');

    // and if he is not signed, they keep him to the end
    const nine = playRound({ ...open, notices: [] });
    const ten = playRound({ ...nine, notices: [] });
    const ids = (sq: { starters: { id: string }[]; bench: { id: string }[] }) => [...sq.starters, ...sq.bench].map(p => p.id).sort().join();
    ok(ten.scout.offer === null && ids(ten.league.squads[from]) === ids(open.league.squads[from]), 'an unsigned man left his club anyway');

    // if he has gone from the club, the offer cannot be signed
    const gone = { ...open, league: { ...open.league, squads: { ...open.league.squads, [from]: { starters: before.starters.filter(p => p.id !== offer.player.id), bench: before.bench.filter(p => p.id !== offer.player.id) } } } };
    ok(G.scoutSignBlockedReason(gone) === SCOUT_TEXT.gone, 'a man who had left his club could still be signed');
  }

  // a summer can move him on; the scout finds the next best rather than nobody
  if (kid && found?.fromClubId) {
    const summer = G.enterPreseason({ ...gs, scout: { ...gs.scout, found: { ...found, player: { ...kid, id: 'ghost-1' } } } });
    ok(summer.scout.offer !== null && summer.scout.offer.player.id !== 'ghost-1', 'a man who had vanished over the summer was offered anyway, or nobody was');
    const summerSame = G.enterPreseason(gs);
    ok(summerSame.scout.offer?.player.id === kid.id, 'a man still at his club in the summer was replaced');
  }
  console.log('  the safe one: a real man from a club near us, priced over the ordinary fee, taken from them only when signed');
}

/* 8b. THE SAFE ONE, ON A BOARD SET UP TO TELL THE RULES APART.
      The league the climb produces may have no boy in the band, or the best boy
      may happen to sit at a near club, and then the claims above are true of a
      broken finder too. Here the men are built to a stated ceiling, and the table
      is spread so nobody can change places in three rounds. */
{
  const t3 = climbTo3(31);
  const tier = G.club(t3).tier;
  const rng = createRng(2024);

  /** a real player, drawn until his ceiling is in the band (or out of it), then aged as asked */
  const synth = (inBand: boolean, age: number, pos: 'CM' | 'ST' | 'CB' | 'GK' = 'CM', minOvr = 0, bump = 0): ReturnType<typeof findKeen> => {
    for (let i = 0; i < 4000; i++) {
      const p = makePlayer(pos, leagueCeiling(tier) - 2 + bump, rng, { ...NEUTRAL_TRAITS, youth: 0 }, new Set());
      const pot = potentialOf(p);
      if ((pot >= 70 && pot <= 83) !== inBand) continue;
      if (overall(p) < minOvr) continue;
      p.age = age;
      return p;
    }
    throw new Error('no such man');
  };

  // the picker on men of known ceilings and known levels
  const low = synth(true, 19, 'CM', 0);
  const high = synth(true, 20, 'ST', overall(low) + 3, 5);
  const off = synth(false, 19, 'CM', overall(high) + 4, 14);   // better now, but his ceiling is out of the band
  const keeperKid = synth(true, 19, 'GK', overall(high) + 4, 14);
  const pool = (list: ReturnType<typeof findKeen>[]): RivalKid[] => list.map((player, i) => ({ clubId: `c${i}`, player }));
  ok(overall(high) > overall(low) && overall(off) > overall(high), 'the synthetic men were not built in the order the claims need');
  const pick1 = pickSafe(pool([low, off, high, keeperKid]));
  ok(pick1?.player.id === high.id, 'the picker did not take the best man now among those in the band, over a better one out of it and a keeper');
  const pick2 = pickSafe(pool([off, keeperKid]));
  ok(pick2?.player.id === off.id, 'with nobody in the band the picker did not fall back to the man with the highest ceiling');

  // the board: fourteen points between every pair worth caring about
  const ids = t3.league.clubs.filter(c => c.id !== t3.clubId).map(c => c.id);
  const pts = [90, 88, 86, /* me */ 50, 10, 8, 6];
  const order = [...ids.slice(0, 3), t3.clubId, ...ids.slice(3)];
  const table = Object.fromEntries(order.map((id, i) => [id, { ...t3.league.table[id], pts: pts[i] }]));
  const near = [order[2], order[4], order[1]];        // one either side, then the next above
  const far = order[6];                                // furthest below
  const board = (derbyIsFar: boolean): G.GameState => {
    const clubs = t3.league.clubs.map(c => c.id === t3.clubId ? { ...c, rivalId: derbyIsFar ? far : order[5] } : c);
    const squads = { ...t3.league.squads };
    for (const id of ids) {
      const sq = squads[id];
      // nobody in the band anywhere, to start with: those boys grow up
      const grown = (list: typeof sq.bench) => list.map(p => (p.age === 19 || p.age === 20) && potentialOf(p) >= 70 && potentialOf(p) <= 83 ? { ...p, age: 23 } : p);
      squads[id] = { starters: grown(sq.starters), bench: grown(sq.bench) };
    }
    // every near club has a boy, none of them in the band
    for (const id of near) squads[id] = { ...squads[id], bench: [synth(false, 19), ...squads[id].bench.slice(1)] };
    // and the club furthest from us has the only boy in the band
    squads[far] = { ...squads[far], bench: [synth(true, 19), ...squads[far].bench.slice(1)] };
    return { ...t3, league: { ...t3.league, clubs, squads, table } };
  };
  const scoutAt = (g0: G.GameState) => {
    let g = G.hireScout(g0, 'safe');
    for (let r = 0; r < SCOUT_ROUNDS; r++) g = playRound(g);
    return g.scout.found;
  };

  setDerbies([]);
  const noDerby = scoutAt(board(false));
  ok(!!noDerby?.fromClubId && near.includes(noDerby.fromClubId), 'without a derby he did not look among the clubs nearest in the table');
  ok(noDerby?.fromClubId !== far, 'he reached past the near clubs for a better boy at the far end of the table');
  const derby = scoutAt(board(true));
  ok(derby?.fromClubId === far, 'with the derby at the far end of the table he did not look there too');
  console.log('  the safe one, on a set board: near clubs and the derby, and only those');
}

/* 9. THE OLD ONE */
{
  const t3 = climbTo3(31);
  const tier = G.club(t3).tier;
  const level = leagueCeiling(tier);
  // the anchor, from the numbers that were agreed and not from the code under test
  const marquee = Math.round((purseBase(tier) * 0.25) / 1000) * 1000;
  const anchor = Math.round((0.75 * marquee) / 1000) * 1000;

  // the finder
  let bad = 0;
  for (let i = 0; i < 60; i++) {
    const p = findOld(tier, createRng(2000 + i), new Set());
    const o = overall(p);
    if ((p.age !== 24 && p.age !== 25) || o < level + 4 || o > level + 10 || p.position === 'GK') bad++;
  }
  ok(bad === 0, `${bad} of 60 old finds were not an outfield player of 24 or 25, four to ten over the division's level`);
  const a = findOld(tier, createRng(31), new Set());
  const same = JSON.stringify({ ...a, id: 0 }) === JSON.stringify({ ...findOld(tier, createRng(31), new Set()), id: 0 });
  ok(same, 'the same stream found two different old men');
  ok(findOld(tier, createRng(31), new Set([a.name])).name !== a.name, 'the finder handed out a name that was already taken');

  // the price: three quarters of the marquee at level plus seven, by the game's own curve either side
  let atRef: ReturnType<typeof findOld> | null = null;
  const fees: { o: number; fee: number }[] = [];
  for (let i = 0; i < 400; i++) {
    const p = findOld(tier, createRng(7000 + i), new Set());
    fees.push({ o: overall(p), fee: oldFee(p, tier) });
    if (!atRef && overall(p) === level + 7) atRef = p;
  }
  ok(atRef !== null && oldFee(atRef, tier) === anchor, `a man at level plus seven cost ${atRef ? oldFee(atRef, tier) : 'nobody'}, not three quarters of the marquee, ${anchor}`);
  // and the curve either side of it is the game's own, the value of a man rising with his rating to the power of two point six
  let atTop: ReturnType<typeof findOld> | null = null;
  for (let i = 0; i < 2000 && !atTop; i++) { const p = findOld(tier, createRng(9000 + i), new Set()); if (overall(p) === level + 10) atTop = p; }
  const topExpected = Math.round((0.75 * marquee * Math.pow((level + 10) / (level + 7), 2.6)) / 1000) * 1000;
  ok(atTop !== null && oldFee(atTop, tier) === topExpected, `a man at level plus ten cost ${atTop ? oldFee(atTop, tier) : 'nobody'}, not ${topExpected}`);
  fees.sort((x, y) => x.o - y.o);
  let monotone = true;
  for (let i = 1; i < fees.length; i++) if (fees[i].fee < fees[i - 1].fee) monotone = false;
  ok(monotone, 'a better old man cost less than a worse one');
  ok(fees[fees.length - 1].fee < marquee, `the dearest old man cost ${fees[fees.length - 1].fee}, which is not under the marquee, ${marquee}`);

  // dearest of the three, and still under the marquee
  const oldRange = scoutBudget('old', tier);
  const safeRange = G.scoutBudgetFor(t3, 'safe');
  const keenRange = scoutBudget('keen', tier);
  ok(oldRange !== null && safeRange !== null && keenRange !== null, 'a style had no range on its card');
  if (oldRange && safeRange && keenRange) {
    ok(oldRange[0] > safeRange[1] && safeRange[0] > keenRange[0] && oldRange[0] > keenRange[1], `the old one is not the dearest: keen ${keenRange}, safe ${safeRange}, old ${oldRange}`);
    ok(oldRange[1] < marquee, `the old one's range ${oldRange} reaches the marquee, ${marquee}`);
    ok(G.scoutBudgetFor(t3, 'old')?.join() === oldRange.join(), 'the card and the scout quoted different ranges for the old one');
  }

  // hired, away three rounds, and he names a man who is nobody's
  let gs = G.hireScout(t3, 'old');
  for (let r = 0; r < SCOUT_ROUNDS; r++) gs = playRound(gs);
  const found = gs.scout.found;
  const man = found?.player ?? null;
  ok(man !== null && (man.age === 24 || man.age === 25) && !found?.fromClubId, 'the old scout did not come back with a man of 24 or 25 who belongs to nobody');

  // the window opens: he walks in exactly as he was, at the price of the man he is
  const kid = findOld(tier, createRng(99), new Set());
  const rich = { ...gs.meters, money: 6_000_000 };
  const seven = { ...gs, week: 7, notices: [], meters: rich, scout: { ...emptyScout(), hiredSeason: 1, found: { style: 'old' as const, season: 1, player: kid } } };
  const open = playRound(seven);
  const offer = open.scout.offer;
  ok(open.week === 8 && offer !== null && offer.style === 'old' && !offer.fromClubId, 'the old find did not arrive with the winter window');
  if (offer) {
    ok(JSON.stringify(offer.player) === JSON.stringify(kid), 'the old man changed on the way to the window');
    ok(offer.fee === oldFee(kid, tier), 'the price was not the old one price of the man who arrived');
    const signed = G.signScoutOffer(open);
    ok(open.meters.money - signed.meters.money === offer.fee, 'signing cost something other than the price');
    ok(G.squadSize(signed) === G.squadSize(open) + 1 && G.mySquad(signed).bench.some(p => p.id === kid.id), 'he did not join our squad');
    const others = (g: G.GameState) => Object.entries(g.league.squads).filter(([id]) => id !== g.clubId).map(([, sq]) => [...sq.starters, ...sq.bench].map(p => p.id).sort().join()).join('|');
    ok(others(signed) === others(open), 'signing the old one took a man out of another club');
    const ten = playRound(playRound({ ...open, notices: [] }));
    ok(ten.scout.offer === null, 'the old one was still on offer after the window shut');
  }

  // the summer carries him too, and the card quotes what the counter charges
  const summer = G.enterPreseason({ ...gs, scout: { ...gs.scout, found: { style: 'old', season: 1, player: kid } } });
  ok(summer.scout.offer?.player.id === kid.id && summer.scout.offer.fee === oldFee(kid, tier), 'the old one did not arrive with the summer market');
  if (oldRange) {
    const paid: number[] = [];
    for (let i = 0; i < 12; i++) {
      const p = findOld(tier, createRng(5500 + i), new Set());
      const at = playRound({ ...seven, notices: [], scout: { ...emptyScout(), hiredSeason: 1, found: { style: 'old' as const, season: 1, player: p } } });
      if (at.scout.offer) paid.push(at.scout.offer.fee);
    }
    ok(paid.length === 12, `only ${paid.length} of 12 old men arrived through the window`);
    paid.sort((x, y) => x - y);
    const median = paid[Math.floor(paid.length / 2)];
    ok(median >= oldRange[0] && median <= oldRange[1], `the median price ${median} is outside the range on the card, ${oldRange}`);
  }
  console.log('  the old one: a proven man of 24 or 25, three quarters of the marquee by his level, signed from nobody');
}

/* 10. THE DOOR IS OPEN.
      All three men can find somebody, so the hub shows the way in, and shows it only
      to a club that has a scout to hire. It was held shut while two of them could not. */
{
  ok(SCOUT_LIVE === true, 'the scout door is still shut');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  ok(/SCOUT_LIVE\s*&&\s*G\.scoutAvailable\(gs\)/.test(hub), 'the hub does not gate the scout door on the flag and on the division');
  console.log('  the door is open, and only for a club with a scout to hire');
}

if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? `\nFAIL (${fails.length} of ${checked})` : `\nOK, ${checked} claims: the scout is hired once, works three rounds, and reports once`);
process.exit(fails.length ? 1 : 0);
