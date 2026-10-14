/**
 * The youth academy v2 (Itzik, 13.10).
 *   node --experimental-strip-types scripts/academy-check.mts
 *
 * Held here: the door is shut and nothing changes while it is; boys are 16 or 17 with a range that always holds his
 * rating and never passes his hidden ceiling; potential opens only with starts, capped, and never for a man past 22;
 * free in ליגה ג׳ and ב׳ under a ceiling, a scout's trip in ליגה א׳, and a price that rises with the ceiling in the
 * Leumit and the top flight, always above what an eighteen year old sells for; the academy holds eight; a boy can be
 * registered for the round without being counted in the squad and goes back down after it; the same career draws the
 * same boys; a man from before the academy is exactly as he was; nothing here reads the clock.
 */
import { readFileSync, statSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { overall } from '../src/engine/matchEngine.ts';
import type { Player } from '../src/engine/matchEngine.ts';
import { potentialOf, potMaxOf, POT_TAU } from '../src/game/career.ts';
import {
  setYouthDoorForChecks, YOUTH_LIVE, YOUTH_V2, ACADEMY_MAX, TRIP_FEE, STARTS_CAP, UNLOCK_AGE, CALL_UPS_PER_ROUND, FREE_POT_CAP,
  youthPrice, routeOf, rangeOf, reachNow, foldMinutes, makeYouthKid, drawPool,
} from '../src/game/academy.ts';
import { sellPrice } from '../src/game/transfers.ts';
import { scoutReport, promotionText, POS_HE, bandOf, COACH } from '../src/data/academyText.ts';
import { TEMPLATES, eligible, rollDilemma } from '../src/data/dilemmas.ts';
import { createRng, simulateMatch } from '../src/engine/matchEngine.ts';
import type { MatchResult } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

function career(seed: number, tier = 1): G.GameState {
  let s = G.newGame(seed);
  s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  s = G.pickCity(s, LEGEND_TOWN);
  s = G.afterSigning(s, {});
  s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
  while (s.phase === 'preseason-market') s = G.advancePreseason(s);
  s = { ...s, phase: 'hub', week: 8, friends: [], notices: [] } as G.GameState;
  if (tier !== 1) {
    // the same career, in another division: the club's tier is what the academy reads
    s = { ...s, league: { ...s.league, clubs: s.league.clubs.map(c => c.id === s.clubId ? { ...c, tier } : c) } };
  }
  return s;
}
function playRound(gs: G.GameState, seed: number): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res: MatchResult = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  let next = G.continueFromResult(G.commitRound(gs, { ...res, events: res.events.filter(e => e.type !== 'red') }));
  while (next.phase === 'press') next = G.answerPress(next, 0);
  if ((next as { phase: string }).phase === 'chat') next = G.closeChat(next);
  return next;
}
const rich = (gs: G.GameState, money = 5_000_000): G.GameState => ({ ...gs, meters: { ...gs.meters, money } });

/* ---------------------------------------------------------------- the door is shut */
{
  ok(YOUTH_LIVE === true && YOUTH_V2 === true, 'the academy door is not open for players');
  setYouthDoorForChecks(false);   // the shut door is walked here, then the door goes back to what players have
  const gs = career(7001);
  const opened = G.openYouth(gs);
  ok(opened.youthPool.length === 0, 'a shut door still drew a list');
  ok(G.signYouthBlockedReason(gs, 'x') === 'הדלת עוד סגורה', 'a shut door does not say so');
  ok(G.callUpBlockedReason(gs, 'x') === 'הדלת עוד סגורה', 'a shut door lets a boy be registered');
  ok(G.youthTripBlockedReason(gs) === 'הדלת עוד סגורה', 'a shut door sends a scout');
}

setYouthDoorForChecks(true);
try {
  /* ------------------------------------------------------------ the boy and his range */
  const rng = createRng(11);
  const used = new Set<string>();
  const boys: Player[] = [];
  for (let i = 0; i < 300; i++) boys.push(makeYouthKid(1 + (i % 5), rng, used, 3));
  ok(boys.every(p => p.age === 16 || p.age === 17), 'a boy is not 16 or 17');
  ok(boys.every(p => p.lock0 !== undefined && p.pu === 0 && p.joined === 3), 'a boy is not born locked with no starts');
  ok(boys.every(p => potentialOf(p) <= potMaxOf(p)), 'what he can reach now passes his ceiling');
  let inside = 0, narrow = 0;
  for (const p of boys) {
    const r = rangeOf(p, 0);
    if (r.lo === overall(p) && r.hi >= r.lo) inside++;
    // a boy whose ceiling sits under his rating plus the opening gap shows what he really has
    if (r.hi - r.lo >= 4 || r.hi === Math.max(r.lo, potMaxOf(p))) narrow++;
  }
  ok(inside === boys.length, 'the shown range does not start at his own rating');
  ok(narrow === boys.length, 'a fresh boy shows less than the opening gap without reaching his ceiling');
  ok(boys.some(p => potMaxOf(p) >= 85), 'no boy of 300 has a ceiling of 85 or more: the draw is too thin');

  // starts open it, and only starts
  const kid = boys.find(p => potMaxOf(p) >= 80 && p.lock0! > 6)!;
  const hi0 = rangeOf(kid, 0).hi;
  const hi5 = rangeOf(kid, 5).hi, hi10 = rangeOf(kid, 10).hi, hi14 = rangeOf(kid, STARTS_CAP).hi, hi40 = rangeOf(kid, 40).hi;
  ok(hi5 > hi0 && hi10 > hi5 && hi14 > hi10, `starts do not open his potential: ${hi0}, ${hi5}, ${hi10}, ${hi14}`);
  ok(hi40 === hi14, 'starts past the cap still count');
  ok(reachNow(kid, 0) === potentialOf(kid), 'no starts changes his potential');
  ok(hi14 <= potMaxOf(kid), 'his potential passed his ceiling');
  // forty full seasons never pass the ceiling
  let walker: Player = kid;
  for (let s = 0; s < 40; s++) walker = foldMinutes({ ...walker, age: 17 }, STARTS_CAP);
  ok(potentialOf(walker) <= potMaxOf(kid), 'forty seasons of starts pass his ceiling');
  ok(potentialOf(walker) >= potMaxOf(kid) - 1, 'forty seasons of starts do not reach his ceiling');
  // the fold
  ok(foldMinutes(kid, 0) === kid, 'a season with no start changed him');
  ok(foldMinutes(kid, 9).pu === 9 && foldMinutes(kid, 99).pu === STARTS_CAP, 'the fold does not count starts up to the cap');
  ok(foldMinutes({ ...kid, age: UNLOCK_AGE + 1 }, 14).pu === 0, 'starts after the age still open his potential');
  // the old kind of man is exactly as he was
  const old: Player = { ...kid, lock0: undefined, pu: undefined, joined: undefined };
  ok(potentialOf(old) === potMaxOf(old), 'a man from before the academy has a different potential');
  ok(foldMinutes(old, 14) === old, 'a man from before the academy was folded');
  ok(POT_TAU === 28, 'the unlock speed changed without the check');

  /* ------------------------------------------------------------------ what it costs */
  ok(routeOf(1) === 'free' && routeOf(2) === 'free' && routeOf(3) === 'trip' && routeOf(4) === 'paid' && routeOf(5) === 'paid', 'the routes by division are not free, free, trip, paid, paid');
  for (const tier of [1, 2]) {
    const pool = drawPool(tier, createRng(5 + tier), new Set(), 2, 'free');
    ok(pool.length === 4 && pool.every(o => o.fee === 0), `tier ${tier}: the free list is not four free boys`);
    ok(pool.every(o => potMaxOf(o.player) <= FREE_POT_CAP[tier]), `tier ${tier}: a free boy has a ceiling over ${FREE_POT_CAP[tier]}`);
  }
  ok(FREE_POT_CAP[1] === 78 && FREE_POT_CAP[2] === 82, 'the free ceilings are not 78 and 82');
  ok(TRIP_FEE === 70_000, 'the trip is not 70,000');
  // the price table, the economist's, by the ceiling a boy truly has
  const want: Record<number, number[]> = { 4: [90_000, 105_000, 130_000, 165_000, 200_000], 5: [160_000, 180_000, 270_000, 380_000, 480_000] };
  for (const tier of [4, 5]) {
    const got = [60, 66, 74, 80, 88].map(p => youthPrice(tier, p));
    ok(JSON.stringify(got) === JSON.stringify(want[tier]), `tier ${tier}: the price table is ${got.join(', ')}`);
  }
  ok([60, 66, 74, 80, 88].every(p => youthPrice(5, p) > youthPrice(4, p)), 'a boy is not dearer in the top flight than in the Leumit');
  // floors above what an eighteen year old sells for, so there is nothing to flip
  for (const tier of [4, 5]) {
    const sell18 = Math.max(...boys.filter(p => true).map(p => sellPrice({ ...p, age: 18 }, tier)));
    ok(youthPrice(tier, 50) > sell18 * 0.5, `tier ${tier}: the cheapest boy costs less than half of what a boy can sell for`);
  }

  /* ------------------------------------------------------------- the career: free tiers */
  let gs = rich(career(7002, 1));
  gs = G.openYouth(gs);
  ok(gs.youthPool.length === 4, `tier 1: the list at the open door is ${gs.youthPool.length}`);
  ok(G.openYouth(gs).youthPool.map(o => o.player.id).join() === gs.youthPool.map(o => o.player.id).join(), 'opening the academy twice drew another list');
  const again = G.openYouth(rich(career(7002, 1)));
  ok(JSON.stringify(again.youthPool.map(o => o.player.name)) === JSON.stringify(gs.youthPool.map(o => o.player.name)), 'the same career did not draw the same boys');
  ok(gs.youth.players.every(p => p.age >= 18 || p.lock0 !== undefined), 'a boy of the old academy was left under the old rules');
  ok(gs.youth.players.every(p => p.age >= 18 || (rangeOf(p, 0).hi - rangeOf(p, 0).lo <= 8)), 'an old academy boy shows his whole ceiling');
  const first = gs.youthPool[0];
  const money0 = gs.meters.money;
  const signed = G.signYouthKid(gs, first.player.id);
  ok(signed.youth.players.some(p => p.id === first.player.id) && !signed.youthPool.some(o => o.player.id === first.player.id), 'a signing did not move the boy from the list to the academy');
  ok(signed.meters.money === money0, 'a free signing cost money');
  ok(G.squadSize(signed) === G.squadSize(gs), 'a boy at the academy was counted in the squad');
  // the academy holds eight
  let full = gs;
  for (let i = 0; full.youth.players.length < ACADEMY_MAX && i < 40; i++) {
    const open = { ...full, youthPool: drawPool(1, createRng(900 + i), new Set(full.youth.players.map(p => p.name)), 2, 'free') };
    full = G.signYouthKid(open, open.youthPool[0].player.id);
  }
  ok(full.youth.players.length === ACADEMY_MAX, `the academy did not fill to ${ACADEMY_MAX}: ${full.youth.players.length}`);
  const one = { ...full, youthPool: drawPool(1, createRng(77), new Set(), 2, 'free') };
  ok(G.signYouthBlockedReason(one, one.youthPool[0].player.id) !== null && G.signYouthKid(one, one.youthPool[0].player.id) === one, 'a ninth boy was signed');
  // the window
  const shut = { ...gs, week: 3 };
  ok(G.signYouthBlockedReason(shut, first.player.id) === 'חלון העברות סגור. בחלון הבא תוכל להחתים שחקן נוער.', 'a boy was signed with the window shut');

  /* ---------------------------------------------------------------- a scout in ליגה א׳ */
  let t3 = rich(career(7003, 3));
  t3 = G.openYouth(t3);
  ok(t3.youthPool.length === 0, 'tier 3: the list is not empty before the scout');
  ok(G.youthTripBlockedReason(t3) === null, `tier 3: the scout cannot go: ${G.youthTripBlockedReason(t3)}`);
  const tm = t3.meters.money;
  const sent = G.youthScoutTrip(t3);
  ok(sent.youthPool.length === 2 && sent.youthPool.every(o => o.via === 'scout' && o.fee === 0), 'tier 3: the scout did not bring two free names');
  ok(sent.meters.money === tm - TRIP_FEE, 'tier 3: the trip did not cost the fee');
  ok(G.youthTripBlockedReason(sent) === 'הסקאוט כבר יצא העונה' && G.youthScoutTrip(sent) === sent, 'tier 3: the scout went twice in a season');
  const after = G.signYouthKid(sent, sent.youthPool[0].player.id);
  ok(after.youthPool.length === 0 && after.youth.players.length === sent.youth.players.length + 1, 'tier 3: one signing did not close the trip');
  const poor = { ...t3, meters: { ...t3.meters, money: TRIP_FEE - 1 } };
  ok(G.youthTripBlockedReason(poor) === 'אין מספיק כסף בקופה לנסיעה', 'tier 3: a scout went with no money');
  ok(G.youthTripBlockedReason(career(7004, 1)) === 'סקאוט לנוער רק בליגה א׳', 'tier 1: a scout can be sent');

  /* ----------------------------------------------------------- the paid divisions */
  for (const tier of [4, 5]) {
    let g = rich(career(7005 + tier, tier));
    g = G.openYouth(g);
    ok(g.youthPool.length === 6 && g.youthPool.every(o => o.fee === youthPrice(tier, potMaxOf(o.player))), `tier ${tier}: the list is not six boys at the table price`);
    const dear = g.youthPool.reduce((a, b) => (b.fee > a.fee ? b : a));
    const before = g.meters.money;
    const bought = G.signYouthKid(g, dear.player.id);
    ok(bought.meters.money === before - dear.fee && dear.fee > 0, `tier ${tier}: the price did not leave the purse`);
    const broke = { ...g, meters: { ...g.meters, money: dear.fee - 1 } };
    ok(G.signYouthBlockedReason(broke, dear.player.id) === 'אין מספיק כסף בקופה', `tier ${tier}: a boy was bought without the money`);
  }

  /* ---------------------------------------------------- registered for the round */
  let rg = G.openYouth(rich(career(7010, 1)));
  const signed3: string[] = [];
  for (let i = 0; i < 3; i++) { const id = rg.youthPool[0].player.id; signed3.push(id); rg = G.signYouthKid(rg, id); }
  ok(signed3.every(id => rg.youth.players.some(p => p.id === id)), 'could not set up three boys');
  const ids = signed3;
  const size0 = G.squadSize(rg);
  const c1 = G.callUpYouth(rg, ids[0]);
  ok([...G.mySquad(c1).bench].some(p => p.id === ids[0]) && !c1.youth.players.some(p => p.id === ids[0]), 'a registered boy is not on the bench');
  ok(G.squadSize(c1) === size0, 'a registered boy was counted in the squad');
  const c2 = G.callUpYouth(c1, ids[1]);
  ok(G.callUpBlockedReason(c2, ids[2]) === `כבר צירפת ${CALL_UPS_PER_ROUND} שחקני נוער למחזור` && G.callUpYouth(c2, ids[2]) === c2, 'a third boy was registered');
  ok(G.sellBlockedReason(c2, ids[0]) === 'הוא בסגל המחזור מהנוער, ואחריו חוזר למחלקה' && G.sellPlayer(c2, ids[0]) === c2, 'a registered boy was sold');
  const undone = G.undoCallUp(c2, ids[1]);
  ok(undone.youth.players.some(p => p.id === ids[1]) && !undone.youthUp.includes(ids[1]), 'taking a boy off the sheet did not send him down');
  /* a registered boy who is started gets his start, and goes back down after the round */
  {
    let g = c1;
    const kidId = ids[0];
    for (const st of G.mySquad(g).starters.filter(p => p.position !== 'GK')) {
      const tried = G.swapPlayers(g, st.id, kidId);
      if (G.mySquad(tried).starters.some(p => p.id === kidId)) { g = tried; break; }
    }
    ok(G.mySquad(g).starters.some(p => p.id === kidId), 'a registered boy could not be started');
    const played = playRound(g, 3);
    ok((played.seasonStats[kidId]?.apps ?? 0) === 1, `the round did not give the boy his start: ${played.seasonStats[kidId]?.apps}`);
    ok(played.youthUp.length === 0 && played.youth.players.some(p => p.id === kidId), 'the boy did not go back down after the round');
    ok(![...G.mySquad(played).starters, ...G.mySquad(played).bench].some(p => p.id === kidId), 'the boy stayed in the squad after the round');
    ok(G.squadSize(played) === size0, `the squad is ${G.squadSize(played)} after the round, was ${size0}`);
    ok(played.notices.some(n => n.kind === 'youth_back' && n.name === G.mySquad(g).starters.find(p => p.id === kidId)!.name), 'the boy going back down was not told to the manager');
  }

  /* ---------------------------------------------------------- the summer folds the starts */
  let sg = G.openYouth(rich(career(7020, 1)));
  const boyId = sg.youthPool[0].player.id;
  sg = G.signYouthKid(sg, boyId);
  const boy = sg.youth.players.find(p => p.id === boyId)!;
  const stats = { ...sg.seasonStats, [boy.id]: { ...(sg.seasonStats[boy.id] ?? { name: boy.name, clubId: sg.clubId, apps: 0, goals: 0, assists: 0 }), apps: 11 } };
  sg = { ...sg, seasonStats: stats as typeof sg.seasonStats, phase: 'hub' };
  const rounds = sg.league.rounds;
  const table = Object.fromEntries(Object.entries(sg.league.table).map(([id, t]) => [id, { ...t, played: rounds }]));
  sg = { ...sg, league: { ...sg.league, table }, meters: { ...sg.meters, money: 3_000_000 }, crisisDone: true, week: rounds };
  const next = G.startNextSeason(sg);
  const grown = next.youth.players.find(p => p.name === boy.name);
  ok(!!grown, 'the boy was gone after the summer');
  ok(grown!.pu === 11 && grown!.age === boy.age + 1, `the summer did not fold his 11 starts: pu ${grown?.pu}, age ${grown?.age}`);
  ok(potentialOf(grown!) > potentialOf(boy), 'eleven starts did not raise what he can reach');
  ok(overall(grown!) <= Math.max(overall(boy) + 12, potentialOf(grown!)), 'a boy grew past what he could reach');
  ok(next.youth.players.length >= 1 && next.youth.players.every(p => p.age <= 18), 'the academy has a man past 18 after the summer');

  /* ------------------------------------------------------------------ what it says */
  for (const pos of ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'] as const) for (const pot of [55, 70, 85]) for (const tier of [1, 3, 5]) {
    const r = scoutReport('דני כהן', pos, pot, tier);
    ok(r.startsWith(`דני כהן, ${POS_HE[pos]}. `), `a report about a ${pos} does not start with his position: ${r.slice(0, 30)}`);
    ok(!/d/.test(r), `a scout's report gives a number: ${r}`);
    ok(r === scoutReport('דני כהן', pos, pot, tier), 'a report is not the same twice');
  }
  ok(bandOf(60) === 'modest' && bandOf(70) === 'promising' && bandOf(80) === 'gem', 'the bands are not under 65, to 77, 78 up');
  ok(scoutReport('א', 'ST', 90, 5) !== scoutReport('א', 'ST', 50, 5), 'a gem and a modest striker read the same');
  ok(Object.values(COACH).every(ls => ls.length === 3), 'a coach message is not three lines');
  ok(Object.values(COACH).flat().every(l => !/[–—]/.test(l)), 'a coach message has a long dash');
  ok(promotionText('דני', 'מכבי', 1).includes('דני עולה לבוגרים') && promotionText('דני', 'מכבי', 5).includes('בסגל הבוגרים של מכבי'), 'the promotion text is not in both voices');
  ok(!promotionText('דני', 'מכבי', 1).includes('קסדה'), 'the promotion text has the helmet again');

  /* the academy's own desk: offered with the door open and a boy to talk about, never with it shut, and a boy sold really leaves */
  const yds = TEMPLATES.filter(t => t.id.startsWith('yd_'));
  ok(yds.length === 9, `the academy has ${yds.length} dilemmas, not 9`);
  {
    let g = G.openYouth(rich(career(7040, 1)));
    const kidId = g.youthPool[0].player.id;
    g = G.signYouthKid(g, kidId);
    const kid = g.youth.players.find(p => p.id === kidId)!;
    // a boy who could be a real talent and has not played: all of the others are gone, so he is the one it is about
    const gemBoy = { ...boys.find(p => potMaxOf(p) >= 88)!, lock0: 0, pu: 0 };
    g = { ...g, youth: { ...g.youth, players: [{ ...gemBoy, name: kid.name }] }, week: 9, dilemma: null };
    ok(G.rollNamedDilemma(g, 'yd_rival_offer_low') !== null, 'the rival offer is not offered when there is a boy who could be a talent');
    ok(G.rollNamedDilemma(g, 'yd_facility_low') === null, 'the pitch question is asked with one boy');
    const rolled = G.rollNamedDilemma(g, 'yd_rival_offer_low')!;
    ok(rolled.options.length === 3 && rolled.subjectName !== undefined && rolled.text.includes(rolled.subjectName), 'the rival offer does not name the boy');
    const money0 = g.meters.money;
    const sold = G.chooseDilemma({ ...g, dilemma: rolled }, 0);
    ok(sold.youth.players.length === 0, 'a boy who was sold is still at the academy');
    ok(sold.meters.money - money0 === 10_000, `a boy sold in ליגה ג׳ paid ${sold.meters.money - money0}, not the 10,000 written for it`);
    const kept = G.chooseDilemma({ ...g, dilemma: rolled }, 1);
    ok(kept.youth.players.length === 1, 'a boy who was kept left');
    // the top flight writes its own sum, and it is not multiplied again
    const top = { ...career(7042, 5), week: 9 };
    let tg = G.openYouth(rich(top));
    tg = G.signYouthKid(tg, tg.youthPool.reduce((a, b) => (b.fee < a.fee ? b : a)).player.id);
    const tkid = tg.youth.players.find(p => p.lock0 !== undefined && (p.joined ?? 0) === tg.season) ?? tg.youth.players[0];
    tg = { ...tg, youth: { ...tg.youth, players: [{ ...gemBoy, name: tkid.name }] }, dilemma: null };
    const trolled = G.rollNamedDilemma(tg, 'yd_rival_offer_pro');
    ok(trolled !== null, 'the top flight offer for a boy is not offered');
    if (trolled) {
      const m0 = tg.meters.money;
      const after = G.chooseDilemma({ ...tg, dilemma: trolled }, 0);
      ok(after.meters.money - m0 === 300_000, `a boy sold in the top flight paid ${after.meters.money - m0}, not 300,000`);
    }
    // the coach has a word when there is something true to say
    const note = G.academyCoachNote({ ...g, youth: { ...g.youth, players: [{ ...kid, lock0: 60, pu: 0, joined: g.season }] }, week: 3 });
    ok(note !== null && note.lines.length === 3 && !note.lines.some(l => l.includes('{')), 'the coach has no word, or leaves a slot open');
  }
  setYouthDoorForChecks(false);
  ok(G.academyCoachNote(career(7041, 1)) === null && G.rollNamedDilemma(rich(career(7041, 1)), 'yd_facility_low') === null, 'with the door shut the coach speaks or the desk asks');
  setYouthDoorForChecks(true);

  /* ------------------------------------------------------------------ the clock */
  for (const f of ['src/game/academy.ts']) {
    const src = readFileSync(f, 'utf8');
    ok(!/Date\.now|new Date|Math\.random/.test(src), `${f} reads the clock or draws from Math.random`);
  }
} finally {
  setYouthDoorForChecks(YOUTH_LIVE);
}

/* ---------------------------------------------------- the screen and the files, as written */
{
  // a boy of 16 is a שחקן נוער, never a נער or a ילד (Itzik, 13.10 and 14.10): none of the academy's words says otherwise
  for (const f of ['src/ui/screens/Academy.tsx', 'src/data/academyText.ts']) for (const bad of ['ילד', 'נער']) ok(!readFileSync(f, 'utf8').includes(bad), `${f} says ${bad} about a player of the academy`);
  {
    const d = readFileSync('src/data/dilemmas.ts', 'utf8');
    const desk = d.slice(d.indexOf("the academy's own desk"));
    const lines = desk.split('\n').filter(l => (l.includes('ילד') || l.includes('נער')) && !l.includes('הבן שלי'));
    ok(lines.length === 0, `the academy desk calls a boy a ילד: ${lines[0]?.slice(0, 60)}`);
  }
  const scr = readFileSync('src/ui/screens/Academy.tsx', 'utf8');
  ok(scr.includes('rangeOf(') && !/potMaxOf|potentialOf\(/.test(scr), 'the academy screen reads the hidden ceiling instead of the range');
  ok(scr.includes('AcademyHubCard') && scr.includes('<Dusk />') && scr.includes('/youth/dusk-loop.mp4'), 'the academy has no door or no loop behind it');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  ok(hub.includes('YOUTH_V2 && <AcademyHubCard') && hub.includes('!YOUTH_V2 && <Cell'), 'the hub does not swap the cell for the door');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  ok(app.includes("gs.phase === 'youth' && YOUTH_V2") && app.includes("gs.phase === 'youth' && !YOUTH_V2"), 'the app does not choose the academy by the door');
  const sizes: [string, number][] = [['dusk-loop.mp4', 700_000], ['dusk-poster.webp', 120_000], ['tier-1.webp', 120_000], ['tier-3.webp', 120_000], ['tier-5.webp', 120_000]];
  for (const [f, max] of sizes) {
    let size = 0;
    try { size = statSync(`public/youth/${f}`).size; } catch { /* missing */ }
    ok(size > 10_000 && size <= max, `public/youth/${f} is ${size} bytes, not between 10K and ${max}`);
  }
}

if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 16)) console.log('  - ' + f);
  if (fails.length > 16) console.log(`  ... and ${fails.length - 16} more`);
  process.exit(1);
}
console.log(`${checked} checks`);
console.log('OK, a boy of 16 or 17 shows a range that opens only with his starts; free, a scout, or a price by the ceiling; eight at most; the door is open');
