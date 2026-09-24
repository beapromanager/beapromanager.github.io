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
  friendBand,
} from '../src/game/friends.ts';
import type { FriendSpec, FriendTraitId } from '../src/game/friends.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { makePlayer } from '../src/data/squadGen.ts';
import { assignTraits, isFriendTrait, renderLine } from '../src/data/personalities.ts';
import { potentialBand } from '../src/game/career.ts';
import { isFriend } from '../src/game/friends.ts';
import { MATE_THREADS, MATE_GAP, mateThread, everyMateLine } from '../src/data/mateChats.ts';
import { emptyMate, pickMateTrigger, texterOf } from '../src/game/mate.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { leagueCeiling, isDerby } from '../src/data/clubs.ts';

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

/* 5. A QUALITY IS A TILT, NOT A LOOPHOLE.
      Team strength is read off overall(), so a friend rated 44 weakens the
      side by exactly what 44 says. One attribute escapes that: the goal model
      reads shooter.attrs.shooting directly, so a man whose rating is low but
      whose shooting is high finishes like somebody he is not. That is the one
      place where giving a quality its shape could quietly hand the manager a
      free striker, so it is the one place with a bar on it.

      Measured over sixty careers a side, putting both of them in the eleven
      costs about seven league points in the first season, which is the price
      the whole feature is built on. That number is not asserted here: with a
      standard deviation of sixteen points a season it needs sixty runs to see
      at all, and a check that takes ten minutes to say "probably" is worse
      than one that says nothing. What is asserted is the thing that would
      make the price disappear. */
{
  const plainAt = (pos: 'ST' | 'CM' | 'CB', target: number) => {
    const p = makePlayer(pos, 44, createRng(5));
    for (let i = 0; i < 20 && overall(p) !== target; i++) {
      const d = target - overall(p);
      for (const k of Object.keys(p.attrs) as (keyof typeof p.attrs)[]) p.attrs[k] += d;
    }
    return p;
  };
  const worst = { shooting: 0, any: 0, where: '' };
  for (const t of FRIEND_TRAITS) for (const pos of ['ST', 'CM', 'CB'] as const) {
    const him = makeFriend({ name: 'ש', position: pos, trait: t.id, texter: false }, 1, 'x', createRng(5));
    const plain = plainAt(pos, overall(him));
    checked++;
    if (overall(him) !== overall(plain)) { fails.push(`could not build a plain ${pos} at ${overall(him)}`); continue; }
    const gap = (k: keyof typeof him.attrs) => him.attrs[k] - plain.attrs[k];
    if (gap('shooting') > worst.shooting) { worst.shooting = gap('shooting'); worst.where = `${t.id} ${pos}`; }
    for (const k of Object.keys(him.attrs) as (keyof typeof him.attrs)[]) worst.any = Math.max(worst.any, gap(k));
  }
  checked += 2;
  // the engine finishes on (shooting/75)^0.55, so twelve points of shooting is
  // about a tenth on every chance he takes. Past that a raw friend is a ringer
  if (worst.shooting > 12) fails.push(`a friend's shooting runs ${worst.shooting} past his rating (${worst.where}), and the goal model reads it straight`);
  if (worst.any > 20) fails.push(`a quality bends an attribute ${worst.any} past the rating, which is no longer a tilt`);
  console.log(`  the widest a quality bends him: ${worst.any} on any attribute, ${worst.shooting} on shooting`);
}

/* 6. AND THE SQUAD KNOWS WHO THEY ARE.
      A friend is an ordinary player everywhere else, which is exactly why he
      needs marking: eighteen names in a list and two of them are the reason
      the save exists. His quality is his personality, the way a ראש העין
      regular's reputation is his, so the pool never hands him a second
      character that contradicts the one the manager chose for him. */
{
  const gs = career('חיפה', 4242, SPECS('wind', 'engine'));
  const squad = mine(gs);
  const map = assignTraits(squad, gs.friends);
  checked += 2;
  for (const fr of gs.friends) {
    const got = map.get(fr.id) ?? [];
    if (got.length !== 1) fails.push(`${fr.name} has ${got.length} personalities, he should have exactly his own`);
    else if (!isFriendTrait(got[0])) fails.push(`${fr.name} was handed "${got[0].label}" out of the general pool`);
    else if (got[0].label !== friendTrait(fr.trait).label)
      fails.push(`${fr.name} shows "${got[0].label}" and was given "${friendTrait(fr.trait).label}"`);
  }
  // his line is his, with his own name in it, not a stranger's
  checked += 2;
  for (const fr of gs.friends) {
    const t = (map.get(fr.id) ?? [])[0];
    const him = squad.find(p => p.id === fr.id)!;
    if (!t) continue;
    const said = renderLine(t, him);
    if (!said.includes(him.name.split(' ')[0]) && !said.includes(him.name))
      fails.push(`${fr.name}'s line does not say his name: "${said}"`);
    if (/\$\{|\{שם\}/.test(said)) fails.push(`${fr.name}'s line kept its blank: "${said}"`);
  }
  // nobody else in the dressing room is mistaken for one of them
  checked++;
  const strangers = squad.filter(p => !gs.friends.some(x => x.id === p.id));
  const wrong = strangers.filter(p => (map.get(p.id) ?? []).some(isFriendTrait));
  if (wrong.length) fails.push(`${wrong.length} players who are not friends carry a friend's mark`);

  // and a man who was sold stops being one
  checked++;
  const sold = { ...gs, friends: gs.friends.map((x, i) => (i === 0 ? { ...x, sold: true } : x)) };
  const after = assignTraits(mine(sold), sold.friends);
  if ((after.get(gs.friends[0].id) ?? []).some(isFriendTrait))
    fails.push('a friend who was sold still reads as one of yours');

  // and the scout does not tell him his friend is finished at twenty one.
  // The card reads a ceiling off the generator, which a friend never uses, so
  // before this it promised the middle fifties for a man on his way to eighty
  checked += 2;
  for (const fr of gs.friends) {
    const him = squad.find(p => p.id === fr.id)!;
    const t = friendTrait(fr.trait);
    const band = friendBand(t, overall(him));
    const scout = potentialBand(him);
    if (!band) { fails.push(`no ceiling is shown for ${fr.name} at all`); continue; }
    if (band.hi < t.ceiling) fails.push(`${fr.name} is shown topping out at ${band.hi}, under his own ${t.ceiling}`);
    if (scout && scout.hi >= band.lo) fails.push(`the generator would have shown ${fr.name} ${scout.lo}-${scout.hi}, which is not far enough out to be worth overriding`);
  }
  const labels = gs.friends.map(fr => (map.get(fr.id) ?? [])[0]?.label).join(' and ');
  console.log(`  the two of them read as ${labels}, and nobody else in the eighteen does`);
}

/* 7. THE PHONE, FROM THE ONE WHO WRITES.
      Ten threads, thirty answers, all of them Itzik's. Everything here is the
      joinery rather than the prose: that the right thread fires for the right
      reason, that none of them fires twice, that he cannot write two weeks
      running, and that an answer moves what it says it moves and never moves
      the one thing no answer may touch, which is how fast he improves. */
{
  const look = (over: Partial<Parameters<typeof pickMateTrigger>[2]> = {}) => ({
    him: { id: 'x', morale: 70, fitness: 90, position: 'CM', age: 21, name: 'א',
      attrs: { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 } } as never,
    apps: 0, goals: 0, squadAvg: 99, injured: false, sentOff: false,
    aloneNow: false, seasonOver: false, rounds: 14, justUp: false, ...over,
  });

  checked++;
  if (MATE_THREADS.length !== 10) fails.push(`${MATE_THREADS.length} threads on his phone, the document had 10`);
  checked++;
  for (const t of MATE_THREADS) {
    if (t.answers.length !== 3) fails.push(`${t.id} has ${t.answers.length} answers, every one of them has three`);
    if (!t.lines.length) fails.push(`${t.id} has nothing to say`);
  }

  // the loudest thing that happened to him wins, and nothing fires twice
  const fresh = emptyMate();
  checked += 4;
  if (pickMateTrigger(fresh, 9, look({ sentOff: true, apps: 3, goals: 1 })) !== 'mate_red')
    fails.push('a red card lost to something quieter');
  if (pickMateTrigger(fresh, 9, look({ injured: true, apps: 3 })) !== 'mate_injured')
    fails.push('an injury lost to something quieter');
  if (pickMateTrigger(fresh, 9, look({ goals: 1, apps: 2 })) !== 'mate_first_goal')
    fails.push('his first goal did not fire');
  if (pickMateTrigger({ ...fresh, quiet: 3 }, 9, look()) !== 'mate_benched')
    fails.push('three rounds on the bench and he said nothing');

  checked += 2;
  const seen = { ...fresh, seen: ['mate_first_goal'] as never };
  if (pickMateTrigger(seen, 9, look({ goals: 3, apps: 3 })) === 'mate_first_goal')
    fails.push('he sent his first goal twice');
  // and he cannot write two weeks running
  if (pickMateTrigger({ ...fresh, lastWeek: 8 }, 9, look({ sentOff: true })) !== null)
    fails.push(`he wrote again after one round, the gap is ${MATE_GAP}`);
  checked++;
  if (pickMateTrigger({ ...fresh, lastWeek: 6 }, 9, look({ sentOff: true })) !== 'mate_red')
    fails.push('he stayed silent past the gap');

  // a season he played and a season he watched are different letters
  checked += 2;
  if (pickMateTrigger(fresh, 14, look({ seasonOver: true, apps: 12 })) !== 'mate_season_played')
    fails.push('a full season went unmentioned');
  if (pickMateTrigger(fresh, 14, look({ seasonOver: true, apps: 1 })) !== 'mate_season_benched')
    fails.push('a season on the bench went unmentioned');

  /* ---- and the answers, through the real save */
  let gs = career('חיפה', 4242, SPECS('engine', 'boot'));
  const texter = texterOf(gs.friends)!;
  checked++;
  if (!texter || !texter.texter) fails.push('nobody was marked as the one who writes');

  const him0 = mine(gs).find(p => p.id === texter.id)!;
  const t = mateThread('mate_benched')!;
  const openThread = (id: 'mate_benched' | 'mate_season_benched' | 'mate_alone') => ({
    ...gs, phase: 'chat' as const,
    chat: { id, contact: 'א', subtitle: '', group: false, accent: '#000',
      lines: mateThread(id)!.lines.map(text => ({ from: 'א', text })) },
    chatAnswers: { answers: mateThread(id)!.answers, mateId: texter.id, trigger: id },
  });

  // the promise: his morale up, and the squad now knows he was promised a shirt
  const promised = G.answerMateChat(openThread('mate_benched'), 0);
  checked += 3;
  const after = mine(promised).find(p => p.id === texter.id)!;
  if (after.morale <= him0.morale) fails.push(`the promise did not lift him: ${him0.morale} -> ${after.morale}`);
  if (promised.mate.promiseNext?.id !== texter.id) fails.push('the promise was not written down anywhere');
  // and it has to survive the end of the week, which wipes the match mods.
  // He asks after a match, so a promise landed straight onto this week's sheet
  // would be swept away before the week he was actually promised
  checked++;
  const nextWeek = G.startWeek(G.closeChat(promised));
  if (nextWeek.matchMods.promised?.id !== texter.id)
    fails.push('the shirt promised on the phone never reached the next team sheet');
  if (promised.chatAnswers) fails.push('the three answers are still on offer after one was sent');
  checked++;
  if (promised.chat!.lines.length !== t.lines.length + 2)
    fails.push('what you wrote and what he wrote back are not both in the thread');

  // the cold one costs him and nothing else
  const cold = G.answerMateChat(openThread('mate_benched'), 2);
  checked += 2;
  if (mine(cold).find(p => p.id === texter.id)!.morale >= him0.morale) fails.push('the cold answer cost him nothing');
  if (cold.meters.morale !== gs.meters.morale) fails.push('the cold answer moved the whole dressing room');

  // the hard one: he actually goes
  const gone = G.answerMateChat(openThread('mate_season_benched'), 2);
  checked += 2;
  if (!gone.summerExits.includes(texter.id)) fails.push('he was told to find a club and stayed');
  if (gone.meters.morale >= gs.meters.morale) fails.push('telling a friend to leave cost the room nothing');

  // and your word, which has no expiry date
  const word = G.answerMateChat(openThread('mate_alone'), 0);
  checked++;
  if (!word.mate.neverSell) fails.push('the promise never to sell him was not written down');

  // no answer anywhere may touch how fast he improves
  checked++;
  const touching = MATE_THREADS.flatMap(x => x.answers)
    .filter(ans => 'growth' in ans.effect || 'ceiling' in ans.effect);
  if (touching.length) fails.push(`${touching.length} answers try to move his growth, which only minutes may do`);

  // the typography rules hold on his phone as well
  const said = everyMateLine();
  checked += 2;
  const bad = said.filter(l => /[—–]/.test(l.text) || /\s[,.!?]/.test(l.text) || /\{[א-ת]+\}/.test(l.text) && !/\{ליגה\}/.test(l.text));
  if (bad.length) fails.push(`${bad[0].id}: "${bad[0].text}"`);
  if (said.length < 100) fails.push(`only ${said.length} lines on his phone`);

  console.log(`  ${MATE_THREADS.length} threads, ${MATE_THREADS.flatMap(x => x.answers).length} answers, ${said.length} lines, one every ${MATE_GAP} rounds at most`);
}

/* 8. THEY ARE NOT STOCK, AND LETTING ONE GO IS A REAL EVENT.
      A friend is an ordinary player in every squad function, which is what
      makes him work, and was also the hole: one of them sitting on the bench
      turned up in the transfer market with a price and a Sell button, one tap
      from gone. Worse, nothing anywhere marked a friend as having left, so a
      man who was sold stayed a friend: he kept the badge, friendsFollow would
      have carried him to the next club after a sacking, and mate_alone, the
      call where the word "I will never sell you" is given, could never fire at
      all, because it asks whether one of them has been sold. The whole promise
      was unreachable code. */
{
  const base = () => ({ ...career('חיפה', 31, SPECS('bull', 'boot')), week: 8 });
  const gs = base();
  const friend = gs.friends[0];
  checked += 3;

  // the window is what makes a transfer possible at all, so the test is honest
  if (!G.transferWindow(gs).open) fails.push('the window is shut in week 8, so this section measures nothing');

  // the market cannot take him, wherever a screen might ask from
  const afterSell = G.sellPlayer(gs, friend.id);
  if (!mine(afterSell).some(p => p.id === friend.id)) {
    fails.push('a friend can be sold from the market with one tap');
  }
  // and an ordinary man still sells, so the guard is not a wall around everyone
  const ordinary = G.mySquad(gs).bench.find(p => !gs.friends.some(f => f.id === p.id));
  if (ordinary) {
    const sold = G.sellPlayer(gs, ordinary.id);
    if (mine(sold).some(p => p.id === ordinary.id)) fails.push('nobody can be sold any more, which is not the point');
  }

  // letting him go from his own card marks him gone, which is the keystone
  const gone = G.partWays(gs, friend.id, 'transfer');
  checked += 3;
  if (mine(gone).some(p => p.id === friend.id)) fails.push('letting a friend go left him in the squad');
  if (isFriend(gone.friends, friend)) fails.push('a friend who was let go is still counted as one of the two here');
  if (!gone.friends.some(f => f.sold)) {
    fails.push('nothing records that a friend left, so the phone call about being the last one can never fire');
  }

  // he does not drift off to whoever needs a midfielder. He signs for the
  // derby, and the news comes back as a card that names the club he is in.
  type Story = { kind: 'story'; title: string; body: string };
  const isStory = (n: { kind: string }): n is Story => n.kind === 'story';
  const exit = gone.exits[gone.exits.length - 1];
  const short = (id: string | undefined) => gs.league.clubs.find(c => c.id === id)?.short ?? '?';
  checked += 4;
  if (!exit || exit.id !== friend.id) {
    fails.push('nothing recorded which club the friend went to');
  } else if (!isDerby(gs.clubId, exit.clubId)) {
    fails.push(`the friend signed for ${short(exit.clubId)}, which is not the derby`);
  }
  const story = gone.notices.filter(isStory).find(n => n.title.includes('חתם ביריבה'));
  if (!story) fails.push('no card says the friend signed for the rival');
  else if (!story.body.includes(short(exit?.clubId))) {
    fails.push(`the card does not name the club he is actually in (${short(exit?.clubId)}): ${story.body}`);
  }
  // and an ordinary man leaving is still an ordinary man leaving
  if (ordinary) {
    const sold = G.partWays(gs, ordinary.id, 'transfer');
    if (sold.notices.filter(isStory).some(n => n.title.includes('חתם ביריבה'))) {
      fails.push('an ordinary sale announces itself as a friend signing for the rival');
    }
  }
  // and the word, when it was given, costs something to break
  const promised = { ...gs, mate: { ...gs.mate, neverSell: true } };
  const broke = G.partWays(promised, friend.id, 'transfer');
  const kept = G.partWays(gs, friend.id, 'transfer');
  checked += 3;
  if (!(broke.meters.morale < gs.meters.morale)) {
    fails.push('selling the man you swore never to sell costs the dressing room nothing');
  }
  if (!broke.followUps.some(f => f.title.includes('הבטחת'))) {
    fails.push('breaking the word never comes back at him, so it is not a consequence');
  }
  if (kept.meters.morale !== gs.meters.morale || kept.followUps.length !== gs.followUps.length) {
    fails.push('letting a friend go costs the word penalty even when no word was given');
  }
  // and the card that comes back a week later says what the screen said. With
  // the window shut and the cash in the red the only way out is a release, and
  // there the screen tells him the man is freed for a quarter of his value, so
  // the card cannot come back calling it a sale.
  const soldCard = broke.followUps.find(f => f.title.includes('הבטחת'));
  const shut = { ...promised, week: 1, meters: { ...promised.meters, money: -50_000 } };
  checked += 3;
  if (!soldCard || !soldCard.body.includes('מכרת')) {
    fails.push('the card about a man who was sold no longer says he was sold');
  }
  if (!G.partOptions(shut, friend.id).some(o => o.kind === 'friends')) {
    fails.push('no release is on offer with the window shut and the cash in the red, so nothing here is measured');
  } else {
    const freed = G.partWays(shut, friend.id, 'friends');
    const card = freed.followUps.find(f => f.title.includes('הבטחת'));
    if (!card) fails.push('breaking the word by releasing him never comes back at him');
    else if (card.title.includes('מכרת') || card.body.includes('מכרת')) {
      fails.push(`the card says sold about a man who was released: ${card.title} / ${card.body}`);
    }
  }
  console.log(`  a friend cannot be sold from the market; letting one go marks him gone, and breaking the word costs ${gs.meters.morale - broke.meters.morale} morale`);
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the two of them grow on minutes and nothing else');
process.exit(fails.length ? 1 : 0);
