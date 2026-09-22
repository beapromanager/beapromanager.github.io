/**
 * The two you bring with you.
 *   node --experimental-strip-types scripts/friends-check.mts
 *
 * The promise this feature makes is a big one: name two friends, and five
 * seasons later they are the reason you went up. An ordinary twenty one year
 * old out of the generator gains four rating points in that time and never
 * touches seventy, so the promise cannot be kept by the ordinary road and a
 * friend does not use it. What follows measures the road he does use, and the
 * price attached to it: they only grow on minutes, so a friend who sat on the
 * bench must still be the worst player in the dressing room five years later.
 *
 * Everything here runs through the real save, because the parts that could
 * quietly come apart are the joins: the summer, the sale, and the morning
 * after a sacking.
 */

import * as G from '../src/game/state.ts';
import {
  FRIEND_TRAITS, friendTrait, friendAfterSummer, minutesFactor,
  friendStartLevel, makeFriend, FRIEND_AGE, MINUTES_FLOOR,
} from '../src/game/friends.ts';
import type { FriendSpec, FriendTraitId } from '../src/game/friends.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { leagueCeiling } from '../src/data/clubs.ts';

const fails: string[] = [];
let checked = 0;

const SPECS = (a: FriendTraitId, b: FriendTraitId): FriendSpec[] => ([
  { name: 'אורי כהן', position: 'CM', trait: a, texter: true },
  { name: 'שגיא מלול', position: 'ST', trait: b, texter: false },
]);

function career(town = 'חיפה', seed = 4242, specs: FriendSpec[] | null = SPECS('brain', 'boot')): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'mental', age: 40 } as never);
  gs = G.pickCity(gs, town);
  gs = G.afterSigning(gs, {});
  if (specs) gs = G.addFriends(gs, specs);
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  return gs;
}

const mine = (gs: G.GameState) => {
  const sq = G.mySquad(gs);
  return [...sq.starters, ...sq.bench];
};
const friendById = (gs: G.GameState, id: string) => mine(gs).find(p => p.id === id);

/* 1. THEY ARRIVE RAW, AND THEY ARRIVE EQUAL.
      A quality says what kind of player he is, never how good he is on day
      one, or the choice at the start would be a choice of difficulty. */
{
  const gs = career();
  checked++;
  if (gs.friends.length !== 2) fails.push(`${gs.friends.length} friends came with him`);
  const squad = mine(gs);
  const them = gs.friends.map(f => friendById(gs, f.id)!);
  checked += 3;
  if (them.some(p => !p)) fails.push('a friend is not in the squad at all');
  if (them.some(p => p.age !== FRIEND_AGE)) fails.push(`a friend is not ${FRIEND_AGE}`);
  if (them.some(p => p.name !== 'אורי כהן' && p.name !== 'שגיא מלול')) fails.push('a friend lost the name he was given');

  const others = squad.filter(p => !gs.friends.some(f => f.id === p.id));
  const worst = Math.min(...others.map(overall));
  checked++;
  for (const p of them) {
    if (overall(p) > worst) fails.push(`${p.name} arrives at ${overall(p)}, above the worst man here (${worst})`);
  }
  // every quality starts a man at the same level, whatever it does to his shape
  const levels = FRIEND_TRAITS.map(t => {
    const p = makeFriend({ name: 'בדיקה', position: 'CM', trait: t.id, texter: false }, 1, 'x', createRng(5));
    return { id: t.id, ovr: overall(p), attrs: p.attrs };
  });
  checked++;
  const spread = Math.max(...levels.map(l => l.ovr)) - Math.min(...levels.map(l => l.ovr));
  if (spread > 1) fails.push(`the five qualities arrive ${spread} rating points apart, they should be level`);
  // but they are different players: the runner and the passer are not alike
  checked++;
  const fast = levels.find(l => l.id === 'wind')!.attrs, slow = levels.find(l => l.id === 'brain')!.attrs;
  if (fast.pace - slow.pace < 20) fails.push(`the flier is only ${fast.pace - slow.pace} quicker than the passer`);
  console.log(`  they arrive at ${levels[0].ovr} in ליגה ג׳ (the division's level is ${leagueCeiling(1)}, the worst man here ${worst})`);
}

/* 2. THE ROAD, MEASURED SUMMER BY SUMMER.
      Played every week, a friend has to become the player the promise says he
      becomes. Left on the bench he has to stay what he was. */
{
  const rounds = 14;
  const road = (t: FriendTraitId, apps: number, seasons = 8) => {
    const trait = friendTrait(t);
    let ovr = friendStartLevel(1), age = FRIEND_AGE;
    const out = [ovr];
    for (let s = 1; s <= seasons; s++) {
      ovr = friendAfterSummer(ovr, age, trait, apps, rounds, s);
      age++;
      out.push(Math.round(ovr));
    }
    return out;
  };

  console.log('  played every week, rating by summer:');
  for (const t of FRIEND_TRAITS) {
    const r = road(t.id, rounds);
    console.log(`    ${t.label.padEnd(16)} ${r.join(' ')}   ceiling ${t.ceiling}`);
    checked += 2;
    // after five summers he is past anything his own division can produce
    if (r[5] < 68) fails.push(`${t.id} is only ${r[5]} after five summers`);
    if (r[8] < t.ceiling - 4) fails.push(`${t.id} never gets near his ceiling: ${r[8]} of ${t.ceiling}`);
  }

  const benched = road('boot', 0);
  checked += 2;
  console.log(`    on the bench the whole time: ${benched.join(' ')}`);
  if (benched[5] > friendStartLevel(1) + 8) fails.push(`a friend who never played still reached ${benched[5]}`);
  if (benched[8] >= friendTrait('boot').ceiling - 8) fails.push('the bench takes a man to his ceiling anyway');

  // the passer is the gamble: behind early, in front late
  const brain = road('brain', rounds), boot = road('boot', rounds);
  checked += 2;
  if (brain[3] >= boot[3]) fails.push(`the passer is not behind after three summers (${brain[3]} vs ${boot[3]})`);
  if (brain[8] <= boot[8]) fails.push(`the passer never overtakes: ${brain[8]} vs ${boot[8]}`);
  const overtake = brain.findIndex((v, i) => i > 0 && v > boot[i]);
  console.log(`    the passer trails until summer ${overtake}, then finishes ${brain[8]} to ${boot[8]}`);

  checked += 2;
  if (minutesFactor(0, 14) !== MINUTES_FLOOR) fails.push('no minutes is not the floor');
  if (minutesFactor(14, 14) !== 1) fails.push('a full season is not a full summer');
}

/* 3. AND THE SAME THING THROUGH THE REAL SAVE.
      The model above is a formula. This is the game: seasons actually rolled
      over, with the friends in the eleven, and nothing else touched. */
{
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

  /** five seasons, with the friends either in the eleven or left on the bench */
  function fiveSeasons(playThem: boolean) {
    let gs = career('חיפה', 909, SPECS('brain', 'boot'));
    // the owner is not the subject here. Two raw twenty one year olds in the
    // eleven cost points and points cost prize money, and a career that ends
    // in the third summer cannot answer the question this is asking, so the
    // books are taken out of it
    gs = { ...gs, meters: { ...gs.meters, money: 4_000_000 } };
    const ids = gs.friends.map(f => f.id);
    const road: number[][] = [ids.map(id => overall(friendById(gs, id)!))];
    for (let s = 0; s < 5; s++) {
      if (playThem) {
        // both of them into the eleven, and neither of them swapped back out
        // for the other: the weakest man who is not a friend makes way
        const sq = G.mySquad(gs);
        const bench = [...sq.bench], starters = [...sq.starters];
        for (const id of ids) {
          const bi = bench.findIndex(p => p.id === id);
          if (bi < 0) continue;
          let out = -1;
          for (let i = 0; i < starters.length; i++) {
            if (starters[i].position === 'GK' || ids.includes(starters[i].id)) continue;
            if (out < 0 || overall(starters[i]) < overall(starters[out])) out = i;
          }
          if (out < 0) continue;
          const him = bench.splice(bi, 1)[0];
          bench.push(starters[out]); starters[out] = him;
        }
        gs = { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { starters, bench } } } };
      }
      for (let w = 1; w <= gs.league.rounds; w++) {
        gs = play(gs);
        if (gs.sacking) break;
      }
      if (gs.sacking) break;
      gs = { ...gs, meters: { ...gs.meters, money: 4_000_000 } };
      gs = G.startNextSeason(gs);
      gs = G.enterSeason(gs);
      if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
      road.push(ids.map(id => { const p = friendById(gs, id); return p ? overall(p) : -1; }));
    }
    return { gs, road, ids };
  }

  const played = fiveSeasons(true);
  const sat = fiveSeasons(false);
  checked++;
  const appsOf = (r: typeof played) => r.ids.map(id => r.gs.careerStats[id]?.reduce((n, x) => n + x.apps, 0) ?? 0);
  const apps = appsOf(played);
  if (apps.some(n => n < 40)) fails.push(`the harness never got them on the pitch: ${apps.join(' and ')} appearances in five seasons`);
  console.log(`  appearances over the five seasons: ${apps.join(' and ')}`);
  checked += 2;
  if (played.road.length < 6) fails.push(`only ${played.road.length - 1} seasons rolled over with the friends playing`);
  if (played.road.some(r => r.includes(-1))) fails.push('a friend vanished from the squad over the summers');

  const end = played.road[played.road.length - 1];
  const endSat = sat.road[sat.road.length - 1];
  console.log(`  through the save, five seasons in the eleven: ${played.road.map(r => r.join('/')).join('  ')}`);
  console.log(`  the same two left on the bench:               ${sat.road.map(r => r.join('/')).join('  ')}`);
  checked += 2;
  if (Math.max(...end) < 68) fails.push(`five seasons of football and the better friend is only ${Math.max(...end)}`);
  if (Math.min(...end) <= Math.max(...endSat)) fails.push(`playing them (${end.join('/')}) is no better than benching them (${endSat.join('/')})`);

  // and the squad around them did not quietly inflate to match
  const others = mine(played.gs).filter(p => !played.ids.includes(p.id));
  checked++;
  const best = Math.max(...others.map(overall));
  if (Math.max(...end) <= best) fails.push(`after five seasons the friends (${end.join('/')}) are still behind the squad's best (${best})`);
  console.log(`  the best man in the squad who is not a friend: ${best}`);
}

/* 4. THE JOINS: A SALE, AND A SACKING.
      Sold, a friend stops being one and stops growing. Sacked, both of them
      get in the car. */
{
  let gs = career('חיפה', 77, SPECS('engine', 'wind'));
  const him = gs.friends[0];
  checked += 2;
  const before = mine(gs).length;
  gs = { ...gs, friends: gs.friends.map(f => f.id === him.id ? { ...f, sold: true } : f) };
  if (G.mySquad(gs) && mine(gs).length !== before) fails.push('marking a friend sold changed the squad by itself');
  const grown = G.startNextSeason(gs);
  const sold = friendById(grown, him.id);
  if (sold && overall(sold) > friendStartLevel(1) + 3) fails.push(`a sold friend still had a friend's summer (${overall(sold)})`);

  // the sacking: a new club, a new town, and the two of them on the new bench
  let s2 = career('חיפה', 31, SPECS('bull', 'brain'));
  const ids = s2.friends.map(f => f.id);
  s2 = { ...s2, meters: { ...s2.meters, money: -3_000_000 } };
  for (let w = 1; w <= 20 && !s2.sacking; w++) {
    const inp = G.liveMatchInput(s2);
    const res = simulateMatch(
      { id: inp.homeId, name: 'h', players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: 'a', players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed);
    s2 = G.commitRound(s2, res);
  }
  checked++;
  if (!s2.sacking) fails.push('could not get the manager sacked to test the move');
  else {
    const offer = G.rescueOffer(s2);
    checked += 2;
    if (!offer) fails.push('no club called after the sacking');
    else {
      const after = G.takeRescue(s2);
      const there = mine(after).map(p => p.id);
      const missing = ids.filter(id => !there.includes(id));
      if (missing.length) fails.push(`${missing.length} of the two did not follow him to ${G.club(after).name}`);
      else console.log(`  sacked at חיפה, and both of them turn up at ${G.club(after).name}`);
    }
  }
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the two of them grow on minutes and nothing else');
process.exit(fails.length ? 1 : 0);
