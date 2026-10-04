/**
 * An answer does something.
 *   node --experimental-strip-types scripts/dilemma-check.mts
 *
 * Items 2 and 6 on Itzik's list. Every pre match answer used to be a sentence
 * and a nudge to the meters; the sentence was written in the past about a
 * match not yet played, and nothing it claimed happened. Now each answer
 * carries acts, and this walks every act through the real save:
 *   sit, play, fitness, injury, mud, formation, gate, guest, sign, promote,
 *   sell, follow, youthBoost, youthLeaveRisk, promiseWin
 * plus the release that was silently broken (it matched a surname against a
 * full name), and a sweep that rolls every template and every option so no
 * act ever throws, and no outcome speaks in the past about the match ahead.
 */
import * as G from '../src/game/state.ts';
import { MIN_SQUAD } from '../src/game/transfers.ts';
import * as L from '../src/game/liveMatch.ts';
import { TEMPLATES, eligible, urgencyOf } from '../src/data/dilemmas.ts';
import type { RolledDilemma } from '../src/data/dilemmas.ts';
import { simulateMatch, overall } from '../src/engine/matchEngine.ts';
import type { MatchResult } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { CITIES } from '../src/data/cities.ts';
import { isDerby } from '../src/data/clubs.ts';
import { THREADS } from '../src/data/chats.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

function career(seed = 4242, town = LEGEND_TOWN): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, town);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return { ...gs, phase: 'hub' };
}

/**
 * The squad cut to exactly what the league demands, spare outfield men off the
 * bench and never the second keeper. Used where a section is about the floor
 * refusing something, rather than about how big a new squad happens to be.
 */
function atFloor(gs: G.GameState): G.GameState {
  const sq = G.mySquad(gs);
  const bench = [...sq.bench];
  while (sq.starters.length + bench.length > MIN_SQUAD) {
    const i = bench.findIndex(p => p.position !== 'GK');
    if (i < 0) break;
    bench.splice(i, 1);
  }
  return { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { starters: sq.starters, bench } } } };
}

/** Put a named dilemma in front of the manager and answer it. */
function answer(gs: G.GameState, id: string, option: number, seed = 1): { gs: G.GameState; rolled: RolledDilemma } {
  const rolled = G.rollNamedDilemma(gs, id, seed);
  if (!rolled) throw new Error(`${id} is not eligible on this save`);
  const next = G.chooseDilemma({ ...gs, phase: 'dilemma', dilemma: rolled }, option);
  return { gs: { ...next, phase: 'hub', dilemma: null }, rolled };
}

function playRound(gs: G.GameState, seed: number, score?: [number, number]): G.GameState {
  const inp = G.liveMatchInput(gs);
  let res: MatchResult = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  res = { ...res, events: res.events.filter(e => e.type !== 'red') };
  if (score) res = { ...res, score, events: [] };
  let next = G.continueFromResult(G.commitRound(gs, res));
  while (next.phase === 'press') next = G.answerPress(next, 0);
  if ((next as { phase: string }).phase === 'chat') next = G.closeChat(next);
  return next;
}

const star = (gs: G.GameState) => [...G.mySquad(gs).starters, ...G.mySquad(gs).bench].sort((a, b) => overall(b) - overall(a))[0];
const inXI = (gs: G.GameState, id: string) => G.mySquad(gs).starters.some(p => p.id === id);

/* SIT: the physio says rest him, and he sits, with the chip that says why */
{
  let gs = career();
  const s = star(gs);
  ({ gs } = answer(gs, 'physio_risk', 1));
  checked += 5;
  if (gs.sitOut[s.id] !== 'נח') fails.push(`resting the star did not mark him ("${gs.sitOut[s.id]}")`);
  if (inXI(gs, s.id)) fails.push('the rested star is still in the eleven');
  if (G.weekBlockedReason(gs)) fails.push(`resting him left the round blocked: ${G.weekBlockedReason(gs)}`);
  const inp = G.liveMatchInput(gs);
  if ([...inp.playerStarters, ...inp.playerBench].some(p => p.id === s.id)) fails.push('the rested star was handed to the engine');
  gs = playRound(gs, 1);
  if (Object.keys(gs.sitOut).length) fails.push('the sit-out did not clear when the week ended');
  console.log('  sit: rested, out of the eleven, off the sheet, free next week');
}

/* PROMISE OF A PLACE: the forgotten man is promised the eleven, and the
   manager has to keep that word himself. The game does not put him in; the
   round settles it: start him and nothing more is said, leave him on the
   bench and the room pays and a word comes back next week. */
{
  let gs = { ...career(7), week: 3 };
  const r = G.rollNamedDilemma(gs, 'player_minutes_or_quit', 1);
  checked++;
  if (!r?.subjectName) fails.push('the forgotten man dilemma has no subject on a fresh squad');
  else {
    const him = [...G.mySquad(gs).starters, ...G.mySquad(gs).bench].find(p => p.name.endsWith(r.subjectName!))!;
    ({ gs } = answer(gs, 'player_minutes_or_quit', 0));
    checked += 3;
    if (inXI(gs, him.id)) fails.push('the promise put him in the eleven by itself; that is the manager\'s job');
    if (gs.matchMods.promised?.id !== him.id) fails.push('the promise was not written on the week');
    // left on the bench: the room pays, and next week he is reminded
    const benched = playRound(gs, 1, [1, 1]);
    const kept = playRound(G.swapPlayers(gs, G.mySquad(gs).starters.find(p => p.position !== 'GK')!.id, him.id), 1, [1, 1]);
    // the word is due next week, and by then the round has moved it from the queue to a notice
    const reminder = benched.followUps.find(f => f.title === 'לא עמדת במילה') ?? benched.notices.find(n => n.kind === 'story' && n.title === 'לא עמדת במילה');
    if (!reminder || !reminder.body.includes(him.name)) fails.push('breaking the promise sent no word back, or one without his name');
    checked += 3;
    // the coach's fractional bias rounds once per path, so a point either way is rounding, not the rule
    if (Math.abs((kept.meters.morale - benched.meters.morale) + G.BROKEN_PROMISE_MORALE) > 1) fails.push(`breaking the promise cost ${kept.meters.morale - benched.meters.morale} morale, expected ${-G.BROKEN_PROMISE_MORALE}`);
    if (kept.followUps.some(f => f.title === 'לא עמדת במילה') || kept.notices.some(n => n.title === 'לא עמדת במילה')) fails.push('a promise kept still sent the reminder');
    if (benched.matchMods.promised || kept.matchMods.promised) fails.push('the promise outlived the week');
    console.log(`  promise: kept on the sheet or paid for, ${-G.BROKEN_PROMISE_MORALE} morale and a word back`);
  }
}

/* RELEASE: the old path matched a surname against a full name and did nothing */
{
  let gs = { ...career(7), week: 3 };
  const before = G.squadSize(gs);
  ({ gs } = answer(gs, 'player_minutes_or_quit', 2));
  checked++;
  if (G.squadSize(gs) !== before - 1) fails.push('releasing the forgotten man did not remove him');
  console.log('  release: he actually leaves');
}

/* FITNESS and INJURY: playing hurt costs condition now and maybe the next round */
{
  let gs = career(11);
  const s = star(gs);
  ({ gs } = answer(gs, 'physio_risk', 0));
  checked += 3;
  if (gs.matchMods.fitness?.[s.id] !== -25) fails.push(`playing hurt did not cost 25 condition (${gs.matchMods.fitness?.[s.id]})`);
  const inp = G.liveMatchInput(gs);
  const onGrass = inp.playerStarters.find(p => p.id === s.id);
  if (!onGrass || onGrass.fitness !== Math.max(20, s.fitness - 25)) fails.push('the engine did not get him 25 condition lower');
  if (gs.matchMods.injury?.[s.id] !== 0.35) fails.push('the injury risk was not recorded');
  // over many rounds the risk lands about a third of the time
  let hurt = 0; const N = 60;
  for (let i = 0; i < N; i++) {
    const g = { ...gs, seasonSeed: gs.seasonSeed + i * 13 };
    const after = playRound(g, i);
    if (after.sitOut[s.id] === 'פצוע') hurt++;
  }
  checked++;
  if (hurt < N * 0.15 || hurt > N * 0.55) fails.push(`he sat the next round ${hurt} of ${N} times, expected about a third`);
  console.log(`  fitness and injury: 25 off his condition, and he sat the round after ${hurt} of ${N} times`);
}

/* MUD: both sides slower and sloppier */
{
  let gs = career(13);
  const clean = G.liveMatchInput(gs);
  ({ gs } = answer(gs, 'physio_pitch', 1));
  const muddy = G.liveMatchInput(gs);
  checked += 2;
  const mineDrop = clean.playerStarters[3].attrs.passing - muddy.playerStarters[3].attrs.passing;
  const theirDrop = clean.oppStarters[3].attrs.passing - muddy.oppStarters[3].attrs.passing;
  if (mineDrop !== 8 && clean.playerStarters[3].attrs.passing > 28) fails.push(`mud took ${mineDrop} passing off my men, not 8`);
  if (theirDrop !== 8 && clean.oppStarters[3].attrs.passing > 28) fails.push(`mud took ${theirDrop} passing off theirs, not 8`);
  console.log('  mud: eight off passing and pace, both sides');
}

/* FORMATION: telling the board you will go at them sets the shape */
{
  let gs = career(17);
  ({ gs } = answer(gs, 'director_next_match', 0));
  checked++;
  if (gs.tactic.formation !== '4-3-3') fails.push(`"go at them" did not set 4-3-3 (${gs.tactic.formation})`);
  ({ gs } = answer(gs, 'director_next_match', 1));
  checked++;
  if (gs.tactic.formation !== '5-4-1') fails.push(`"patient" did not set 5-4-1 (${gs.tactic.formation})`);
  console.log('  formation: the answer to the board is the shape on the pitch');
}

/* GATE: an emptied terrace pays less at the turnstile */
{
  // a HOME DERBY fixture: a gate to shrink, and a boycott that may be asked
  let gs = career(19);
  for (let w = 1; w <= gs.league.rounds; w++) {
    const fx = G.playerFixture({ ...gs, week: w })!;
    if (fx.homeId === gs.clubId && isDerby(fx.homeId, fx.awayId)) { gs = { ...gs, week: w }; break; }
  }
  const full = playRound(gs, 5).lastLedger!.gate;
  // the answer also costs prestige, which thins the crowd on its own, so the
  // act is measured with the meters put back: only the boycott itself is on trial
  const answered = answer(gs, 'ultras_boycott', 1).gs;
  const boycott = { ...answered, meters: gs.meters };
  const empty = playRound(boycott, 5).lastLedger!.gate;
  checked += 2;
  if (full <= 0) fails.push('the home fixture paid no gate at all');
  if (Math.abs(empty / full - 0.8) > 0.02) fails.push(`the boycott left ${Math.round(100 * empty / full)}% of the gate, expected 80%`);
  console.log(`  gate: the boycott left ${Math.round(100 * empty / full)}% of the gate`);
}

/* GUEST: the owner's boy is on the bench, and comes on at half time */
{
  let gs = career(23);
  const purse = gs.meters.money;
  ({ gs } = answer(gs, 'owner_son', 0));
  checked += 4;
  // the owner pays a tenth of the purse, Itzik's number, not a flat hundred
  // and twenty thousand that was forty percent of a ליגה ג׳ season
  const paid = gs.meters.money - purse;
  if (paid !== Math.round(purse * 0.10)) fails.push(`the owner paid ₪${paid} for his boy's half, expected a tenth of ₪${purse}`);
  if (!gs.matchMods.guest) fails.push('saying yes to the owner did not put his boy anywhere');
  const inp = G.liveMatchInput(gs);
  const guest = gs.matchMods.guest!;
  if (!inp.playerBench.some(p => p.id === guest.id)) fails.push('the boy is not on the bench for the match');
  const st = L.createLive(inp);
  L.resumeFromHalfTime(st);
  const side = st.iAmHome ? st.home : st.away;
  if (!side.onPitch.some(p => p.id === guest.id)) fails.push('the boy did not come on at half time');
  console.log('  guest: the owner\'s boy comes on at the break');
}

/* SIGN: the agent's man arrives, for real */
{
  let gs = career(29);
  const before = G.squadSize(gs);
  const { gs: after } = answer(gs, 'agent_offers_player', 0, 3);
  checked += 2;
  if (G.squadSize(after) !== before + 1) fails.push('the agent\'s man did not join the squad');
  if (!/הצטרף לסגל/.test(after.pendingOutcome ?? '')) fails.push('the outcome does not say who joined');
  console.log('  sign: the agent\'s man is in the squad');
}

/* PROMOTE and YOUTH LEAVE RISK */
{
  let gs = career(31);
  const kid = [...gs.youth.players].sort((a, b) => overall(b) - overall(a))[0];
  const up = answer(gs, 'youth_talent', 0).gs;
  checked += 2;
  if (!G.mySquad(up).bench.some(p => p.id === kid.id)) fails.push('promoting the academy kid did not put him in the squad');
  if (up.youth.players.some(p => p.id === kid.id)) fails.push('the promoted kid is still at the academy');
  const kept = answer(gs, 'youth_talent', 1).gs;
  checked++;
  if (kept.youthLeaveRisk?.name !== kid.name || kept.youthLeaveRisk.p !== 0.4) fails.push('refusing him did not record the risk that he walks');
  console.log('  promote: the kid comes up; refuse him and he may walk in the summer');
}

/* SELL: the owner's buyer is a club in this league, and the outcome names it */
{
  let gs = career(37);
  // The owner only asks when there is a man to spare. Both sides of that are
  // worth holding, and until squads opened above the floor only one of them
  // could be: a new squad was built to exactly the floor, so this line read as
  // "the owner never asks" and would have passed just as happily if he never
  // asked at all.
  checked += 2;
  if (G.rollNamedDilemma(atFloor(gs), 'owner_sell_star', 1)) fails.push('the owner asks to sell with the squad already on the floor');
  if (!G.rollNamedDilemma(gs, 'owner_sell_star', 1)) fails.push('the owner never asks to sell, even with men to spare');
  const spare = { ...G.mySquad(gs).bench[2], id: 'spare-x', name: 'ספייר ספייר' };
  gs = { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { starters: G.mySquad(gs).starters, bench: [...G.mySquad(gs).bench, spare] } } } };
  const s = star(gs);
  ({ gs } = answer(gs, 'owner_sell_star', 0));
  checked += 3;
  if ([...G.mySquad(gs).starters, ...G.mySquad(gs).bench].some(p => p.id === s.id)) fails.push('the sold star is still in the squad');
  const exit = gs.exits.find(e => e.id === s.id);
  if (!exit) fails.push('the sale left no record of where he went');
  const buyer = exit ? gs.league.clubs.find(c => c.id === exit.clubId)!.short : '';
  if (!gs.pendingOutcome?.includes(buyer) || gs.pendingOutcome.includes('{buyerClub}')) fails.push(`the outcome does not name the buyer: "${gs.pendingOutcome}"`);
  console.log('  sell: to a club in the league, named in the outcome');
}

/* FOLLOW and YOUTH BOOST: the youth coach's three, named, and the word that comes back */
{
  let gs = career(41);
  const rolled = G.rollNamedDilemma(gs, 'youth_academy', 2);
  checked += 2;
  const names = gs.youth.players.slice(0, 3).map(p => p.name.split(' ').slice(-1)[0]);
  if (!rolled) fails.push('the youth coach dilemma is not eligible with an academy');
  else if (rolled.text.includes('שלושה מהם') || (rolled.text.includes('להתאמן עם הבוגרים') && !names.every(n => rolled.text.includes(n))))
    fails.push(`the youth coach still says "three of them" instead of naming them: ${rolled.text}`);
  ({ gs } = answer(gs, 'youth_academy', 0, 2));
  checked += 2;
  if (gs.youthBoost.length !== 3) fails.push(`the boost lists ${gs.youthBoost.length} kids, not three`);
  if (!gs.followUps.some(f => f.week === gs.week + 4)) fails.push('no word is owed four weeks later');
  // walk four rounds: the word arrives as a story at the hub, once
  let seen = 0;
  for (let i = 0; i < 5; i++) {
    gs = playRound(gs, i);
    seen += gs.notices.filter(n => n.kind === 'story').length;
    while (gs.notices.length) gs = G.dismissNotice(gs);
  }
  checked++;
  if (seen !== 1) fails.push(`the follow-up arrived ${seen} times over five rounds, expected once`);
  console.log('  follow: the three are named, and the word comes back once, four weeks on');
}

/* PROMISE: promise the terrace a derby, lose it, and they remember */
{
  let gs = career(43);
  let derbyWeek = 0;
  for (let w = 1; w <= gs.league.rounds; w++) {
    const fx = G.playerFixture({ ...gs, week: w })!;
    if (G.rollNamedDilemma({ ...gs, week: w }, 'ultras_derby_demand', 1)) { derbyWeek = w; break; }
    void fx;
  }
  checked++;
  if (!derbyWeek) fails.push('no derby in the fixtures to promise anything about');
  else {
    gs = { ...gs, week: derbyWeek };
    // find a seed whose slot is the promise
    let seed = 1, rolled = G.rollNamedDilemma(gs, 'ultras_derby_demand', seed);
    while (rolled && !rolled.text.includes('שתבטיח') && seed < 40) rolled = G.rollNamedDilemma(gs, 'ultras_derby_demand', ++seed);
    checked++;
    if (!rolled?.text.includes('שתבטיח')) fails.push('could not roll the promise slot');
    else {
      ({ gs } = answer(gs, 'ultras_derby_demand', 0, seed));
      const home = G.playerFixture(gs)!.homeId === gs.clubId;
      const lost = playRound(gs, 9, home ? [0, 2] : [2, 0]);
      checked++;
      if (!lost.notices.some(n => n.kind === 'story' && n.title.includes('זוכר')) && !lost.followUps.some(f => f.title.includes('זוכר')))
        fails.push('the terrace did not remember a broken promise');
    }
  }
  console.log('  promise: lose the derby you promised and the terrace remembers');
}

/* SUMMER EXIT: "until the end of the season" means he goes in the summer, to a club in the league */
{
  let gs = { ...career(47), week: 4 };
  const s = star(gs);
  ({ gs } = answer(gs, 'player_transfer_request', 2));
  checked += 2;
  if (!gs.summerExits.includes(s.id)) fails.push('"until the summer" did not book his exit');
  if (!inXI(gs, s.id) && !G.mySquad(gs).bench.some(p => p.id === s.id)) fails.push('he left before the summer');
  // play the season out
  for (let i = 0; i < 20 && !gs.seasonOver; i++) {
    gs = playRound(gs, 100 + i);
    while (gs.notices.length) gs = G.dismissNotice(gs);
    if (gs.phase !== 'hub') break;
  }
  checked++;
  if (gs.phase !== 'season-end') fails.push(`the season did not end (phase ${gs.phase})`);
  else {
    const next = G.startNextSeason(gs);
    const mineNow = [...G.mySquad(next).starters, ...G.mySquad(next).bench];
    const exit = next.exits.find(e => e.id === s.id);
    checked += 4;
    if (mineNow.some(p => p.id === s.id)) fails.push('he is still in the squad after the summer');
    if (!exit) fails.push('the summer exit left no record of where he went');
    else if (!next.league.squads[exit.clubId] || ![...next.league.squads[exit.clubId].starters, ...next.league.squads[exit.clubId].bench].some(p => p.id === s.id))
      fails.push('his new club, in the new league, does not have him');
    if (!next.notices.some(n => n.kind === 'story' && n.title.includes(s.name))) fails.push('no word about his summer move waits at the hub');
    if (next.summerExits.length) fails.push('the summer exit list was not cleared');
  }
  console.log('  summer exit: he plays the season, then goes to a club in the league, with a word');
}

/* THE NEW MAN: "I'm new here" is said by a man who actually is. Nobody signed,
   nobody asks; sign one and it is him, by name, and a cold answer books his
   summer exit while a warm one keeps him. */
{
  const opened = career(53);
  checked++;
  if (G.rollNamedDilemma({ ...opened, week: 3 }, 'player_new_signing_lost', 1)) fails.push('the new signing spoke up on a squad nobody has joined');
  // the summer market is over on a career(); reopen the window the way the game does and sign a man
  let gs = G.enterPreseason({ ...opened, phase: 'preseason-market' } as never);
  const fa = gs.market.find(f => !G.signBlockedReason(gs, f));
  checked++;
  if (!fa) fails.push('no free agent to sign for the newcomer test');
  else {
    gs = G.signPlayer(gs, fa.player.id);
    while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
    gs = { ...gs, phase: 'hub', week: 3 };
    const rolled = G.rollNamedDilemma(gs, 'player_new_signing_lost', 1);
    checked += 2;
    if (!rolled || !rolled.subjectName || !fa.player.name.endsWith(rolled.subjectName)) fails.push(`the new signing dilemma is about "${rolled?.subjectName}", not the man who just signed (${fa.player.name})`);
    if (rolled) {
      const cold = answer(gs, 'player_new_signing_lost', 1).gs;
      const warm = answer(gs, 'player_new_signing_lost', 0).gs;
      if (!cold.summerExits.includes(fa.player.id) || warm.summerExits.includes(fa.player.id)) fails.push('the cold answer did not book the newcomer\'s summer exit, or the warm one did');
    }
    // a new summer forgets the arrivals
    checked++;
    if (G.enterPreseason({ ...gs, phase: 'preseason-market' } as never).arrivals.length) fails.push('last season\'s arrivals are still new in the summer');
    console.log('  the new man: the dilemma names the latest signing, and a cold answer sends him off in the summer');
  }
}

/* THE SWEEP: every template, every option, on several saves, never throws; no past tense about the match ahead */
{
  const PAST = ['שיחקתם', 'ניצחתם', 'הפסדתם', 'היציע היה', 'האצטדיון בער', 'הוא נכנס וסחב', 'הוא איבד כדור', 'הוא הגיע ו'];
  let rolls = 0;
  for (const [i, town] of [LEGEND_TOWN, CITIES[4].name, CITIES[9].name].entries()) {
    const base = { ...career(50 + i, town), week: 6 };
    for (const t of TEMPLATES) {
      const rolled = G.rollNamedDilemma(base, t.id, 3 + i);
      if (!rolled) continue;
      rolled.options.forEach((o, k) => {
        rolls++;
        checked++;
        try { answer(base, t.id, k, 3 + i); } catch (e) { fails.push(`${t.id} option ${k} threw: ${(e as Error).message}`); }
        for (const bad of PAST) if (o.outcome.includes(bad)) fails.push(`${t.id} option ${k} speaks in the past about the match ahead: "${o.outcome}"`);
        if (o.outcome.includes('—')) fails.push(`${t.id} option ${k} has a long dash`);
      });
    }
  }
  console.log(`  the sweep: ${rolls} answers applied without a throw, none in the past tense`);
}

/* THE WEEK COMES BACK ON THE PHONE: standing up for the squad's terms gives
   every man legs for the match, and if they win with them the fans say why;
   refusing the owner's boy gets talked about whatever the score. */
{
  const drive = (g: G.GameState, score: [number, number]): G.GameState => {
    const inp = G.liveMatchInput(g);
    const res: MatchResult = { seed: 1, home: { id: inp.homeId, name: 'a', stats: { possession: .5, chances: 6, goals: score[0], xg: 1 } }, away: { id: inp.awayId, name: 'b', stats: { possession: .5, chances: 6, goals: score[1], xg: 1 } }, score, events: [], ratings: {} } as unknown as MatchResult;
    let next = G.continueFromResult(G.commitRound(g, res));
    while (next.phase === 'press') next = G.answerPress(next, 0);
    return next;
  };
  let gs = career(61);
  ({ gs } = answer(gs, 'director_budget', 1));
  const all = [...G.mySquad(gs).starters, ...G.mySquad(gs).bench];
  checked += 4;
  if (!all.every(p => gs.matchMods.fitness?.[p.id] === 8)) fails.push('standing up for the squad did not give every man +8 for the match');
  const home = G.playerFixture(gs)!.homeId === gs.clubId;
  const win = drive(gs, home ? [3, 0] : [0, 3]);
  const loss = drive(gs, home ? [0, 3] : [3, 0]);
  // since 4.10 each of these triggers owns several threads, so the claim is on
  // the trigger the phone rang for, not on one favourite conversation
  const trigOf = (g: G.GameState) => g.phase === 'chat' ? THREADS.find(t => t.id === g.chat?.id)?.trigger : null;
  if (trigOf(win) !== 'backed_win') fails.push(`a win after backing the squad brought ${win.phase === 'chat' ? win.chat?.id : 'no chat'}, not the back you gave`);
  if (trigOf(loss) === 'backed_win') fails.push('the fans thanked the manager for a defeat');
  if (win.phase === 'chat' && G.closeChat(win).matchMods.chatAfter) fails.push('the buzz outlived the week');
  let g2 = career(62);
  ({ gs: g2 } = answer(g2, 'owner_son', 1));
  const home2 = G.playerFixture(g2)!.homeId === g2.clubId;
  const talked = drive(g2, home2 ? [0, 1] : [1, 0]);
  checked++;
  if (trigOf(talked) !== 'stood_up_owner') fails.push(`refusing the owner's boy brought ${talked.phase === 'chat' ? talked.chat?.id : 'no chat'}, not the word on standing up to him`);
  console.log('  the phone: legs for the squad and a word from the terrace when it pays, and one for standing up to the owner');
}

/* THE MEETING HE PROMISED: "I'll talk to the team" books a team meeting for
   the next week, which opens as that week's talk, once, and never on its own.
   What he says there lands as morale and as legs, in his own three lines. */
{
  checked++;
  if (G.rollNamedDilemma({ ...career(71), week: 5 }, 'team_meeting', 1)) fails.push('a team meeting was offered without anyone promising one');
  // the owner's warning needs the bottom of the table: lose until we are there
  let gs = { ...career(71), week: 1 };
  for (let i = 0; i < 6 && !G.rollNamedDilemma({ ...gs, week: Math.max(gs.week, 4) }, 'owner_relegation_warning', 1); i++) {
    const home = G.playerFixture(gs)!.homeId === gs.clubId;
    gs = playRound(gs, 300 + i, home ? [0, 3] : [3, 0]);
    while (gs.notices.length) gs = G.dismissNotice(gs);
    gs = { ...gs, phase: 'hub' };
  }
  gs = { ...gs, week: Math.max(gs.week, 4) };
  checked++;
  if (!G.rollNamedDilemma(gs, 'owner_relegation_warning', 1)) fails.push('could not reach the owner\'s warning by losing');
  else {
    ({ gs } = answer(gs, 'owner_relegation_warning', 2));
    checked++;
    if (gs.queued?.id !== 'team_meeting' || gs.queued.week !== gs.week + 1) fails.push('promising to talk to the team booked nothing for next week');
    // the week turns, and the meeting is the talk that opens it
    const home = G.playerFixture(gs)!.homeId === gs.clubId;
    let next = playRound(gs, 310, home ? [1, 1] : [1, 1]);
    while (next.notices.length) next = G.dismissNotice(next);
    next = G.startWeek({ ...next, phase: 'hub' });
    checked += 2;
    if (next.phase !== 'dilemma' || next.dilemma?.id !== 'team_meeting') fails.push(`the week after the promise opened with ${next.dilemma?.id ?? next.phase}, not the team meeting`);
    if (next.queued) fails.push('the meeting is still booked after it opened');
    if (next.dilemma?.id === 'team_meeting') {
      const all = [...G.mySquad(next).starters, ...G.mySquad(next).bench];
      const fire = G.chooseDilemma(next, 0), blame = G.chooseDilemma(next, 2);
      checked += 3;
      if (!all.every(p => fire.matchMods.fitness?.[p.id] === 10)) fails.push('"from here it is on you" did not give the squad legs');
      if (!all.every(p => blame.matchMods.fitness?.[p.id] === -12)) fails.push('blaming the squad did not take their legs');
      if (fire.meters.morale <= blame.meters.morale) fails.push('the room did not read the difference between the two speeches');
      // and it does not come round again by itself
      let again = G.chooseDilemma(next, 1);
      again = playRound({ ...again, phase: 'hub', dilemma: null }, 320);
      while (again.notices.length) again = G.dismissNotice(again);
      checked++;
      if (G.startWeek({ ...again, phase: 'hub' }).dilemma?.id === 'team_meeting') fails.push('the meeting came round a second time on its own');
    }
    console.log('  the meeting: booked by the promise, opens the next week once, and the speech lands as legs');
  }
}

/* THE TERRACE: an answer the crowd heard about moves the fans meter, by the card's figure */
{
  let gs = career(23);
  for (let w = 1; w <= gs.league.rounds; w++) {
    const fx = G.playerFixture({ ...gs, week: w })!;
    if (isDerby(fx.homeId, fx.awayId)) { gs = { ...gs, week: w }; break; }
  }
  const before = gs.meters.fans;
  const gave = answer(gs, 'ultras_boycott', 0).gs;    // "אין צורך באיומים, אני אתכם": +5
  const stood = answer(gs, 'ultras_boycott', 1).gs;   // "אני לא נכנע לאיומים": -6
  checked += 2;
  if (gave.meters.fans !== before + 5) fails.push(`giving the terrace what it asked moved fans ${before} -> ${gave.meters.fans}, expected +5`);
  if (stood.meters.fans !== before - 6) fails.push(`refusing the terrace moved fans ${before} -> ${stood.meters.fans}, expected -6`);
  console.log(`  terrace: the boycott answers move the fans meter ${before} -> ${gave.meters.fans} / ${stood.meters.fans}`);
}

/* PROMOTE: "do you promote him?" and the answer that says he is in the squad.
   With the squad at its maximum the answer said "he is in the squad from now on"
   and left him in the academy, which a manager found by looking. It is not asked
   when there is no place for him; and if the squad fills while the question sits
   in the inbox, the answer says what happened instead of what was hoped. */
{
  const MAX = 20;   // the most men a squad may hold: the number the rule was agreed at, not read off the code
  const grow = (gs: G.GameState, to: number) => {
    let g = gs;
    for (let i = 0; g && G.squadSize(g) < to && i < 12; i++) {
      const sq = G.mySquad(g);
      const extra = { ...sq.bench.find(p => p.position !== 'GK')!, id: `fill-${i}`, name: `נוסף ${i}` };
      g = { ...g, league: { ...g.league, squads: { ...g.league.squads, [g.clubId]: { starters: sq.starters, bench: [...sq.bench, extra] } } } };
    }
    return g;
  };
  const inSquad = (gs: G.GameState, name: string) => [...G.mySquad(gs).starters, ...G.mySquad(gs).bench].some(p => p.name === name);

  const roomy = grow(career(41), MAX - 1);
  checked += 2;
  if (G.squadSize(roomy) !== MAX - 1) fails.push(`the fixture squad has ${G.squadSize(roomy)}, not ${MAX - 1}`);
  const rolled = G.rollNamedDilemma(roomy, 'youth_talent', 1);
  if (!rolled) fails.push('the youth talent question is not asked with room for one more');
  else {
    const name = roomy.youth.players.slice().sort((a, b) => overall(b) - overall(a))[0].name;
    checked += 5;
    if (!rolled.text.includes(name)) fails.push(`the question does not name the best kid at the academy, ${name}: ${rolled.text}`);
    const yes = G.chooseDilemma({ ...roomy, phase: 'dilemma', dilemma: rolled }, 0);
    if (!inSquad(yes, name)) fails.push('answering yes did not put the kid in the squad');
    if (yes.youth.players.some(p => p.name === name)) fails.push('answering yes left the kid in the academy as well');
    if (G.squadSize(yes) !== MAX) fails.push(`the squad is ${G.squadSize(yes)} after the promotion, not ${MAX}`);
    const kid = [...G.mySquad(yes).starters, ...G.mySquad(yes).bench].find(p => p.name === name);
    if (!kid || yes.contracts[kid.id] !== 3) fails.push('the promoted kid has no three year deal');

    // the message sat in the inbox and the squad filled up before it was answered
    const filled = grow(roomy, MAX);
    checked += 4;
    const late = G.chooseDilemma({ ...filled, phase: 'dilemma', dilemma: rolled }, 0);
    if (inSquad(late, name)) fails.push('a full squad took the kid anyway');
    if (!late.youth.players.some(p => p.name === name)) fails.push('a full squad lost the kid from the academy');
    if (G.squadSize(late) !== MAX) fails.push(`a full squad changed size to ${G.squadSize(late)}`);
    if (late.pendingOutcome?.includes('בסגל מעכשיו')) fails.push(`the answer still says he is in the squad: "${late.pendingOutcome}"`);
    if (!late.pendingOutcome?.includes('הסגל')) fails.push(`the answer did not say why: "${late.pendingOutcome}"`);
  }

  // and with the squad already full it is simply not asked
  const full = grow(career(41), MAX);
  checked += 2;
  if (G.squadSize(full) !== MAX) fails.push(`the full fixture squad has ${G.squadSize(full)}, not ${MAX}`);
  if (G.rollNamedDilemma(full, 'youth_talent', 1)) fails.push('the youth talent question is asked with a full squad, so the answer can only be a lie');
  console.log('  promote: the kid comes up when there is room, is not offered when there is none, and the answer never claims what did not happen');
}

/* ITZIK'S BATCH OF 3.10: sixty nine new dilemmas, his wording, with the gates
   and the three mechanisms his notes asked for. The numbers are the agreed ones,
   never read back from the code under test. */
{
  // the batch landed whole: 30 originals plus 69 of the 70 drafts, with the
  // midweek friendly held back until the real friendly exists
  checked += 3;
  if (TEMPLATES.length !== 102) fails.push(`${TEMPLATES.length} templates, the agreed count is 102 (30 + 69 + the reporter's three columns)`);
  if (TEMPLATES.some(t => t.id === 'midweek_friendly')) fails.push('the midweek friendly is in before the real friendly match exists');
  if (!TEMPLATES.some(t => t.id === 'team_dog') || !TEMPLATES.some(t => t.id === 'derby_police_cut')) fails.push('the batch is missing members');

  // what blocks the week and what can wait
  checked += 3;
  if (urgencyOf('team_dog') !== 'inbox') fails.push('the camp dog blocks a match week');
  if (urgencyOf('agent_loan_offer') !== 'now') fails.push('the loan offer can rot in the inbox past the window');
  if (urgencyOf('director_bottom_sell') !== 'now') fails.push('the forced sale can rot in the inbox past the window');

  // the gates, on a hand-built context where only one fact moves at a time
  const base: Parameters<typeof eligible>[0] = {
    star: 'כהן', rival: 'יהוד', club: 'בדיקה', money: 100_000,
    benched: 'לוי', benchedApps: 1, youngster: '', veteranName: 'אזולאי', scorer: '', dry: '',
    newcomer: 'מזרחי', academy: 'בניון', kids3: '', squadSize: 18, room: 2,
    pos: 4, teams: 8, week: 5, isDerby: false, queued: '', sponsor: 'מותג', sponsorWants: [],
    city: 'חולון', tier: 3, isHome: true, lostLast: false, winStreak: 0,
    lead: 0, gap: 6, winterOpen: false, winterLast: false, starFee: 150_000, gk: 'בן שימול',
    starIsForward: true,
  };
  const inPool = (ctx: typeof base, id: string) => eligible(ctx, urgencyOf(id)).some(t => t.id === id);
  const gate = (id: string, yes: Partial<typeof base>, no: Partial<typeof base>, what: string) => {
    checked += 2;
    if (!inPool({ ...base, ...yes }, id)) fails.push(`${id}: not offered when ${what}`);
    if (inPool({ ...base, ...no }, id)) fails.push(`${id}: offered although ${what} does not hold`);
  };
  gate('anthem_girl', { tier: 5 }, { tier: 4 }, 'the club is in ליגת העל');
  gate('director_bottom_sell', { pos: 7, money: -50_000, winterOpen: true, winterLast: true },
       { pos: 7, money: -50_000, winterOpen: true, winterLast: false }, 'the winter window is in its last week');
  gate('agent_loan_offer', { winterOpen: true }, { winterOpen: false }, 'the winter window is open');
  gate('owner_big_lead', { pos: 1, lead: 5, week: 8 }, { pos: 1, lead: 4, week: 8 }, 'first with a cushion of five');
  gate('city_pitch_closed', { isHome: true }, { isHome: false }, 'the fixture is at home');
  gate('broken_bus', { isHome: false }, { isHome: true }, 'the fixture is away');
  gate('owner_derby_bonus', { isDerby: true }, { isDerby: false }, 'it is the derby');
  gate('derby_police_cut', { isDerby: true, isHome: true }, { isDerby: true, isHome: false }, 'the derby is at home');
  gate('referee_apology', { lostLast: true }, { lostLast: false }, 'the previous round was lost');
  gate('reporter_win_streak_pre', { winStreak: 3 }, { winStreak: 2 }, 'three straight wins');
  gate('ultras_bottom_march', { pos: 7, week: 6 }, { pos: 5, week: 6 }, 'the club is in the bottom two');
  gate('star_bored_middle', { pos: 4, week: 9, starIsForward: true }, { pos: 4, week: 9, starIsForward: false },
       'the star plays up front (Itzik: רק שחקן התקפה)');

  // the reporter's column fits the table it writes about, instead of promising
  // relegation to the leader (items 85-87 plus the approved fix to the old one)
  gate('reporter_prediction_top', { pos: 1 }, { pos: 2 }, 'the column calls a walkover for the leader');
  gate('reporter_prediction_chase', { pos: 2 }, { pos: 4 }, 'the column names the one chaser');
  gate('reporter_prediction_mid', { pos: 4 }, { pos: 2 }, 'the column mocks the middle');
  gate('reporter_prediction', { pos: 7 }, { pos: 4 }, 'the relegation column waits for the bottom');
  // and the two derby stories wait for a derby (the approved when fix)
  gate('ultras_boycott', { isDerby: true }, { isDerby: false }, 'the boycott threatens the derby');
  gate('player_social_media', { isDerby: true }, { isDerby: false }, 'the post blew up before the derby');

  // the poisoning: exactly three of the likely eleven, marked for the match, the
  // same three on a replay (the star in the match reads these entries)
  {
    const gs0 = career(31);
    const a1 = answer(gs0, 'food_poisoning', 1).gs;
    const a2 = answer(gs0, 'food_poisoning', 1).gs;
    const tired = Object.entries(a1.matchMods.fitness ?? {}).filter(([, d]) => (d as number) < 0).map(([id]) => id);
    const xi = new Set(G.lineup(gs0).map(p => p.id));
    checked += 3;
    if (tired.length !== 3) fails.push(`the poisoning marked ${tired.length} men, the note says three`);
    if (!tired.every(id => xi.has(id))) fails.push('a poisoned man is not from the likely eleven');
    if (JSON.stringify(tired) !== JSON.stringify(Object.entries(a2.matchMods.fitness ?? {}).filter(([, d]) => (d as number) < 0).map(([id]) => id))) {
      fails.push('a reload would name different poisoned men');
    }
  }

  // the loan: he leaves for real, and a floor squad pulls a boy up so sixteen
  // never becomes fifteen (Itzik's note, word for word)
  {
    let gs0 = career(777);
    for (let w = 1; w <= 7; w++) gs0 = playRound(gs0, w);
    gs0 = { ...gs0, week: 8, phase: 'hub' as const };
    const floor = atFloor(gs0);
    const who = G.mySquad(floor); const all0 = [...who.starters, ...who.bench].map(p => p.id);
    const done = answer(floor, 'agent_loan_offer', 0);
    const sq1 = G.mySquad(done.gs); const all1 = [...sq1.starters, ...sq1.bench];
    const goneId = all0.find(id => !all1.some(p => p.id === id));
    checked += 3;
    if (all1.length !== MIN_SQUAD) fails.push(`the loan left ${all1.length} men on a floor squad, sixteen must stay sixteen`);
    if (!goneId) fails.push('nobody actually left on the loan, although the note says he does');
    const newKid = all1.find(p => !all0.includes(p.id));
    if (!newKid || done.gs.contracts[newKid.id] !== 3) fails.push('the boy pulled up did not arrive on a three year deal');
    // and above the floor the squad simply shrinks by one
    const roomy = answer(gs0, 'agent_loan_offer', 0);
    checked++;
    const n0 = G.squadSize(gs0), n1 = G.squadSize(roomy.gs);
    if (n1 !== n0 - 1) fails.push(`above the floor the loan moved the squad ${n0} -> ${n1}`);
  }

  // the derby bonus: forty thousand leaves the purse on a win and only on a win
  {
    let gs0 = career(555);
    let derbyWeek = 0;
    for (let w = 1; w <= gs0.league.rounds; w++) {
      if (G.rollNamedDilemma({ ...gs0, week: w }, 'owner_derby_bonus')) { derbyWeek = w; break; }
    }
    checked++;
    if (!derbyWeek) fails.push('no derby week found to test the bonus on');
    if (derbyWeek) {
      const at = { ...gs0, week: derbyWeek, phase: 'hub' as const };
      const promised = answer(at, 'owner_derby_bonus', 0).gs;
      const declined = answer(at, 'owner_derby_bonus', 1).gs;
      checked += 3;
      if (promised.matchMods.winBonus !== 40_000) fails.push(`the promised bonus is ${promised.matchMods.winBonus}, the agreed figure is 40,000`);
      if (declined.matchMods.winBonus) fails.push('the declined bonus still sits on the match');
      // the SAME save with and without the bonus entry, so the only difference
      // the purse can show is the bonus itself
      const bare = { ...promised, matchMods: { ...promised.matchMods, winBonus: undefined } };
      const win = (g: G.GameState) => playRound(g, 9, [3, 0]).meters.money;
      const loss = (g: G.GameState) => playRound(g, 9, [0, 2]).meters.money;
      if (win(bare) - win(promised) !== 40_000) fails.push(`a won derby moved the purses ${win(bare) - win(promised)} apart, the bonus is 40,000`);
      if (loss(promised) - loss(bare) !== 0) fails.push('a lost derby still paid the bonus');
    }
  }

  // the referee's apology at most once a season (Itzik's note): the answer is
  // remembered, the weekly pick filters on that memory, a new season forgets it
  {
    let gs0 = career(31);
    for (let w = 1; w <= 2; w++) {
      const lossFor = G.liveMatchInput(gs0).iAmHome ? [0, 1] : [1, 0];
      gs0 = playRound(gs0, w, lossFor as [number, number]);
    }
    gs0 = { ...gs0, week: 3, phase: 'hub' as const };
    const done = answer(gs0, 'referee_apology', 0).gs;
    const stateSrc = readFileSync('src/game/state.ts', 'utf8');
    checked += 3;
    if (!done.seasonDilemmas.includes('referee_apology')) fails.push('the answered apology is not remembered for the season');
    if (!stateSrc.includes('.filter(t => !t.oncePerSeason || !asked.has(t.id))')) fails.push('the weekly pick no longer filters the once-a-season questions');
    const tpl = TEMPLATES.find(t => t.id === 'referee_apology');
    if (!tpl?.oncePerSeason) fails.push('the apology template forgot it is once a season');
  }

  // the match shows the mark, and the new voices have faces
  {
    const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
    const dScreen = readFileSync('src/ui/screens/Dilemma.tsx', 'utf8');
    checked += 4;
    if (!match.includes("Object.entries(gs.matchMods.fitness ?? {}).filter(([, d]) => d < 0)")) fails.push('the match no longer collects the tired men');
    if (!match.includes("{tired ? '✶ ' : ''}")) fails.push('a tired man on the board carries no mark');
    if (!match.includes("{tired?.has(p.id) ? '✶ ' : ''}")) fails.push('a tired man on the bench carries no mark');
    if (!dScreen.includes('captain:') || !dScreen.includes('mother:')) fails.push('the captain or mother speaks with no face');
  }

  // and none of the batch carries a long dash anywhere a player reads
  {
    checked++;
    const dash = TEMPLATES.filter(t => {
      const o = t.options({ ...base } as never, {});
      return [t.text, ...o.flatMap(x => [x.label, x.outcome])].some(x => x.includes('—') || x.includes('–'));
    });
    if (dash.length) fails.push(`long dashes in: ${dash.map(t => t.id).join(', ')}`);
  }
  console.log("  Itzik's batch: 69 in, the friendly held back, eleven gates hold, the loan, the bonus and the poisoning behave");
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 12)) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
