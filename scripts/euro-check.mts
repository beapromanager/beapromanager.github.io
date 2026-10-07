/**
 * ליגת אירופה, the competition's core (Itzik's rules of 6.10).
 *   node --experimental-strip-types scripts/euro-check.mts
 *
 * Nothing here touches a save or a screen: this is the pure competition.
 *   1. the door is shut, and the agreed numbers are the agreed numbers
 *   2. twenty clubs: his eight by name and country, none a real club, every
 *      crest its own
 *   3. the draw: sixteen of twenty with the manager always in, four rested
 *      and preferred next season, seeded so a reload draws the same
 *   4. ties: two legs then one, no away goals, level means penalties, a
 *      shootout always ends, fifteen winners and one champion
 *   5. the manager's own tie is never played for him, and a red card here
 *      costs one European match only
 *   6. hard but possible: a champion-level side lifts the cup in a sane share
 *   7. the save and the entry, 8. the calendar, 9. the names
 *  10. the night itself, played in the real engine with the door opened by
 *      parameter: nothing of the league moves, the men tire, a red is a
 *      European ban, an injury costs this week's league match, the money is
 *      the agreed money, and a level tie waits for his own shootout
 *  11. the shootout from inside it: five each then sudden death, the live
 *      match's own odds, seeded on the round, the paid clips for his kick and
 *      the goal mouth for theirs, and the phone buzzing on a goal
 *  12. the look of the night: the frame turns blue and silver, the two crests
 *      face each other before kickoff, and the ground is named Itzik's way
 *  13. the draw from his seat, owed once and never rolled again, and the
 *      bracket room that reads and never writes
 */
import {
  EURO_LIVE, EURO_POOL, EURO_FIELD, EURO_ROUNDS, ROUND_NAMES, STAGE_TARGET, PRIZE,
  GATE_SHARE, TRAVEL, SECURITY, legsIn, euroWeeks, drawEuro, playAiRound, recordMyLeg, advanceRound, needsPens, settleMyPens,
  roundDone, shootout, settleTie, aggregate, strengthOf, myTie, iHost, banFor, serveBans, allWinners, aiLeg, prizeFor,
  playOutWithoutMe, champion, euroEntry, nightFor, shootoutStatus, hintFor, diveFor, myKickScores, theirKickSaved,
} from '../src/game/euro.ts';
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import type { MatchResult } from '../src/engine/matchEngine.ts';
import { overall } from '../src/engine/matchEngine.ts';
import { gateIncome } from '../src/game/career.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { euroClub } from '../src/data/europeClubs.ts';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { EURO_CLUBS } from '../src/data/europeClubs.ts';
import { EURO_NAMES, makeEuroName } from '../src/data/europeNames.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;
const ME = 'me';

/* localStorage, which node does not have and the loader insists on */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, writable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});
/** a check stands in for the screen: when the tie is level after his legs, a seeded shootout settles it */
const pensIfDue = (e: ReturnType<typeof drawEuro>, seed: number) => needsPens(e, ME) ? settleMyPens(e, ME, shootout(createRng(seed)).score) : e;

/* ------------------------------------------- 1. the door and the numbers */
{
  checked += 9;
  if (EURO_LIVE !== false) fails.push('the European door is open before Itzik opened it');
  if (EURO_POOL !== 20 || EURO_FIELD !== 16 || EURO_ROUNDS !== 4) fails.push('pool, field or rounds moved off 20 / 16 / 4');
  if (JSON.stringify(STAGE_TARGET) !== '[74,78,82,84]') fails.push(`stage targets are ${JSON.stringify(STAGE_TARGET)}, agreed 74 / 78 / 82 / 84`);
  if (JSON.stringify(PRIZE) !== '[0,300000,700000,1300000,2200000]') fails.push(`prizes are ${JSON.stringify(PRIZE)}, agreed 0 / 300K / 700K / 1.3M / 2.2M`);
  if (GATE_SHARE !== 0.75 || TRAVEL !== 150_000 || SECURITY !== 175_000) fails.push('gate share, travel or security moved off 75% / 150K / 175K');
  if (legsIn(0) !== 2 || legsIn(1) !== 2 || legsIn(2) !== 2 || legsIn(3) !== 1) fails.push('the legs are not two, two, two and a single final');
  if (JSON.stringify(euroWeeks(14)) !== '[[2,3],[5,6],[9,10],[13]]') fails.push(`a 14 round season puts Europe before ${JSON.stringify(euroWeeks(14))}`);
  if (euroWeeks(10) !== null || euroWeeks(13) !== null) fails.push('a short league still gets a European season');
  if (ROUND_NAMES.length !== 4 || ROUND_NAMES[3] !== 'הגמר') fails.push('the round names are not four ending in the final');
  if (prizeFor(4) !== 2_200_000 || prizeFor(1) !== 300_000 || prizeFor(0) !== 0) fails.push('the prize for a round is not the table');
}

/* ------------------------------------------------- 2. the twenty clubs */
{
  checked += 6;
  if (EURO_CLUBS.length !== 20) fails.push(`${EURO_CLUBS.length} clubs in the pool, agreed twenty`);
  if (new Set(EURO_CLUBS.map(c => c.id)).size !== 20 || new Set(EURO_CLUBS.map(c => c.name)).size !== 20) fails.push('two clubs share an id or a name');
  // Itzik's eight, his names and countries, pinned word for word
  const his: Array<[string, string]> = [
    ['רד בלגרד', 'סרביה'], ['ר.ב אמסטרדם', 'הולנד'], ['אתלטיק אתונה', 'יוון'], ['בלוז גלזגו', 'סקוטלנד'],
    ['מועדון סביליה', 'ספרד'], ['בית באזל', 'שוויץ'], ['מועדון קייב', 'אוקראינה'], ['רומא האיטלקית', 'איטליה'],
  ];
  for (const [name, country] of his) {
    const c = EURO_CLUBS.find(x => x.name === name);
    if (!c || c.country !== country) { fails.push(`${name} (${country}) is missing or in the wrong country`); break; }
  }
  // no real club's name, and no long dash anywhere a player reads
  const real = ['אייאקס', 'ריינג', 'אולימפיאקוס', 'פ.ס.וו', 'ריאל', 'ברצלונה', 'יובנטוס', 'ליברפול', 'מילאן', 'באיירן', 'פורטו', 'בנפיקה', 'סלטיק', 'גלאטסראי', 'פנרבחצה'];
  for (const c of EURO_CLUBS) {
    const text = `${c.name} ${c.short} ${c.city} ${c.country}`;
    if (real.some(r => `${c.name} ${c.short}`.includes(r))) { fails.push(`${c.name} carries a real club's name`); break; }
    if (/[—–]/.test(text)) { fails.push(`${c.name} carries a long dash`); break; }
  }
  // every crest its own: no two share shape, pattern and a close primary hue
  const hue = (hex: string) => {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return ((h * 60) + 360) % 360;
  };
  let alike = '';
  for (let i = 0; i < EURO_CLUBS.length && !alike; i++) for (let j = i + 1; j < EURO_CLUBS.length; j++) {
    const a = EURO_CLUBS[i], b = EURO_CLUBS[j];
    if (a.shape === b.shape && a.pattern === b.pattern) {
      const gap = Math.abs(hue(a.primary) - hue(b.primary));
      if (Math.min(gap, 360 - gap) < 20) { alike = `${a.name} and ${b.name}`; break; }
    }
  }
  if (alike) fails.push(`two crests look alike: ${alike}`);
  if (EURO_CLUBS.some(c => !/^#[0-9A-Fa-f]{6}$/.test(c.primary) || !/^#[0-9A-Fa-f]{6}$/.test(c.secondary) || !/^#[0-9A-Fa-f]{6}$/.test(c.accent))) fails.push('a club colour is not a hex colour');
}

/* ----------------------------------------------------------- 3. the draw */
{
  const e1 = drawEuro(77, ME, 2), e2 = drawEuro(77, ME, 2), e3 = drawEuro(78, ME, 2);
  checked += 7;
  if (JSON.stringify(e1) !== JSON.stringify(e2)) fails.push('the same seed drew two different competitions');
  if (JSON.stringify(e1.ties) === JSON.stringify(e3.ties)) fails.push('a different seed drew the same pairings');
  if (e1.clubs.length !== 16 || !e1.clubs.some(c => c.id === ME)) fails.push('the field is not sixteen with the manager in it');
  if (e1.rested.length !== 5) fails.push(`${e1.rested.length} clubs rested; twenty European clubs beside the manager leave five out`);
  const ids = [...e1.clubs.map(c => c.id).filter(id => id !== ME), ...e1.rested];
  if (new Set(ids).size !== 20 || ids.length !== 20) fails.push('the field and the rested do not make the twenty once each');
  if (e1.ties[0].length !== 8 || new Set(e1.ties[0].flatMap(t => [t.a, t.b])).size !== 16) fails.push('the first round is not eight ties of sixteen different clubs');
  if (e1.clubs.find(c => c.id === ME)!.edge !== 0 || e1.clubs.some(c => Math.abs(c.edge) > 2)) fails.push('the edges are off: the manager has none, the others at most two');
  // the four rested come back in next season when asked to
  const e4 = drawEuro(1234, ME, 3, 0, e1.rested);
  checked++;
  if (!e1.rested.every(id => e4.clubs.some(c => c.id === id))) fails.push('the clubs rested last season were not preferred into the next draw');
  // strength rises round by round and the manager has no edge
  checked++;
  const other = e1.clubs.find(c => c.id !== ME)!.id;
  if (!(strengthOf(e1, other, 0) < strengthOf(e1, other, 1) && strengthOf(e1, other, 1) < strengthOf(e1, other, 2) && strengthOf(e1, other, 2) < strengthOf(e1, other, 3))) fails.push('the opposition does not get stronger round by round');
  if (strengthOf(e1, ME, 3) !== 84) fails.push('the manager\'s own figure is not the bare stage target');
}

/* ------------------------------------- 4. ties, penalties and a champion */
{
  // a shootout always ends, never level, and a decided five stops early
  checked += 4;
  let worst = 0, level = 0, early = 0;
  for (let i = 1; i <= 3000; i++) {
    const s = shootout(createRng(i));
    worst = Math.max(worst, s.kicks.length);
    if (s.score[0] === s.score[1]) level++;
    if (s.kicks.length < 5) early++;
  }
  if (level) fails.push(`${level} shootouts ended level`);
  if (worst > 31) fails.push(`a shootout ran to ${worst} rounds of kicks`);
  if (early < 100) fails.push(`only ${early} of 3000 shootouts were settled before the fifth kick, a side three up with two left should stop`);
  const sure = shootout(createRng(5), 1, 0);
  if (sure.score[0] < 3 || sure.score[1] !== 0 || sure.kicks.length > 5) fails.push(`a perfect side against a hopeless one finished ${sure.score.join('-')} in ${sure.kicks.length} kicks`);

  // aggregate decides when it can, penalties only when level, no away goals
  checked += 3;
  const won = settleTie({ a: 'x', b: 'y', legs: [[0, 1], [3, 1]] }, createRng(1));
  if (won.winner !== 'x' || won.pens) fails.push('an aggregate win went to penalties or to the wrong side');
  const away = settleTie({ a: 'x', b: 'y', legs: [[1, 1], [0, 0]] }, createRng(1));
  if (!away.pens) fails.push('a level tie with an away goal was settled without penalties, away goals do not count');
  if (JSON.stringify(aggregate({ a: 'x', b: 'y', legs: [[2, 1], [0, 3]] })) !== '[2,4]') fails.push('the aggregate adds up wrong');

  // a whole competition, the manager's legs fed in by hand, to one champion
  const runOne = (seed: number, myGoals: () => [number, number]) => {
    let e = drawEuro(seed, ME, 1);
    let guard = 0;
    while (e.status === 'on' && guard++ < 10) {
      e = playAiRound(e, ME, seed * 7 + e.round);
      const mine = myTie(e, ME)!;
      checked++;
      if (mine.legs.length) fails.push('the AI round played the manager\'s own tie for him');
      for (let l = 0; l < legsIn(e.round); l++) e = recordMyLeg(e, ME, myGoals());
      e = pensIfDue(e, seed * 11 + e.round * 3);
      if (!roundDone(e)) { fails.push('a round with every leg played is not done'); break; }
      e = advanceRound(e, ME);
    }
    return e;
  };
  const champ = runOne(31, () => [3, 0]);
  checked += 4;
  if (champ.status !== 'won') fails.push(`a side that wins every leg three nil ended "${champ.status}"`);
  if (allWinners(champ).length !== 15) fails.push(`${allWinners(champ).length} winners across the competition, a knockout of sixteen has fifteen`);
  if (champ.ties.length !== 4 || champ.ties[3].length !== 1 || champ.ties[3][0].legs.length !== 1) fails.push('the final is not one tie of one leg in the fourth round');
  if (champ.played !== 7) fails.push(`the champion played ${champ.played} legs, agreed seven`);
  const loser = runOne(32, () => [0, 2]);
  checked += 4;
  if (loser.status !== 'out' || loser.round !== 1) fails.push(`a side that loses every leg is "${loser.status}" in round ${loser.round}, wanted out with the quarter drawn`);
  if (allWinners(loser).length !== 8 || loser.ties[1]?.length !== 4) fails.push('the quarter was not drawn from the eight winners after the manager went out');
  const played = playOutWithoutMe(loser, ME, 4040);
  if (allWinners(played).length !== 15 || !champion(played) || champion(played) === ME) fails.push(`played out without him the competition has ${allWinners(played).length} winners and champion ${champion(played)}`);
  if (JSON.stringify(playOutWithoutMe(loser, ME, 4040)) !== JSON.stringify(played)) fails.push('playing the rest out twice on one seed gave two different champions');
  // the hosting alternates and the final has no host
  checked += 2;
  const e0 = drawEuro(9, ME, 1);
  const t0 = myTie(e0, ME)!;
  if (iHost(e0, ME) !== (t0.a === ME)) fails.push('the first leg host is not the first named side');
  if (iHost({ ...champ, round: 3, leg: 0 }, ME) !== null) fails.push('the final has a host');
}

/* -------------------------------------------- 5. bans stay in Europe */
{
  let e = drawEuro(3, ME, 1);
  e = banFor(e, 'p7');
  const served = serveBans(e);
  checked += 3;
  if (!served.banned.includes('p7')) fails.push('a man sent off in Europe is not banned from the next European match');
  if (Object.keys(served.next.bans).length) fails.push('a one match ban outlived the match it was served in');
  if (serveBans(served.next).banned.length) fails.push('a ban was served twice');
}

/* ---------------------------------------- 6. hard but possible, by model */
{
  // the manager modelled like any other side at 81 (a first-year champion's eleven) against
  // the agreed stage targets: he must neither waltz through nor be shut out
  let cups = 0, finals = 0;
  const N = 2000;
  for (let i = 1; i <= N; i++) {
    let e = drawEuro(5000 + i, ME, 1);
    let guard = 0;
    while (e.status === 'on' && guard++ < 10) {
      e = playAiRound(e, ME, 90_000 + i * 13 + e.round);
      const rng = createRng(70_000 + i * 17 + e.round);
      const t = myTie(e, ME)!;
      const opp = t.a === ME ? t.b : t.a;
      const theirs = strengthOf(e, opp, e.round);
      for (let l = 0; l < legsIn(e.round); l++) {
        const neutral = legsIn(e.round) === 1;
        const host = neutral ? true : iHost(e, ME)!;
        const [h, a] = host ? aiLeg(81, theirs, rng, neutral) : aiLeg(theirs, 81, rng, neutral);
        e = recordMyLeg(e, ME, host ? [h, a] : [a, h]);
      }
      e = pensIfDue(e, 60_000 + i * 19 + e.round * 3);
      if (e.round === 3 && roundDone(e)) finals++;
      e = advanceRound(e, ME);
    }
    if (e.status === 'won') cups++;
  }
  checked += 2;
  const cupShare = cups / N, finalShare = finals / N;
  if (cupShare < 0.02 || cupShare > 0.12) fails.push(`a champion-level side lifts the cup ${(cupShare * 100).toFixed(1)}% of the time, wanted hard but possible (2% to 12%)`);
  if (finalShare < 0.06 || finalShare > 0.30) fails.push(`a champion-level side reaches the final ${(finalShare * 100).toFixed(1)}% of the time, wanted 6% to 30%`);
  console.log(`  model: a side of 81 reaches the final ${(finalShare * 100).toFixed(1)}% and lifts the cup ${(cupShare * 100).toFixed(1)}% (1 in ${(1 / cupShare).toFixed(0)})`);
}

/* ------------------------------------ 7. the save knows, the door decides */
{
  // the rule: a ליגת העל title and nothing else, and only once the door is open
  checked += 5;
  if (!euroEntry(true, { result: 'champion', tier: 5 }, 5)) fails.push('a ליגת העל champion is not let in with the door open');
  if (euroEntry(false, { result: 'champion', tier: 5 }, 5)) fails.push('the shut door still lets a champion in');
  if (euroEntry(true, { result: 'champion', tier: 4 }, 5)) fails.push('a champion of the division below is let in');
  if (euroEntry(true, { result: 'promoted', tier: 5 }, 5) || euroEntry(true, { result: 'stayed', tier: 5 }, 5)) fails.push('a runner up or a mid table side is let in');
  if (euroEntry(true, null, 5)) fails.push('a career with no season behind it is let in');

  // a new career carries the field, empty; a sacked manager's new club starts without a European season
  checked += 3;
  if (G.newGame(1).euro !== null) fails.push('a new game does not start with euro null');
  const src = readFileSync('src/game/state.ts', 'utf8');
  const rescue = src.slice(src.indexOf('export function takeRescue'), src.indexOf('export function takeRescue') + 2500);
  if (!rescue.includes('    sacking: null,\n    euro: null,')) fails.push('a rescued manager keeps the European season of the club that sacked him');
  // the summer draws it through drawSeed with its own salt and carries the rested five forward
  const summerLine = 'euro: euroEntry(EURO_LIVE, report, TOP_TIER)\n      ? drawEuro(drawSeed({ seasonSeed: gs.seasonSeed, season: gs.season + 1, week: 0 }, 140_000), gs.clubId, gs.season + 1, 0, gs.euro?.rested ?? [])';
  if (!src.includes(summerLine)) fails.push('the summer does not draw the competition through the flag, the entry rule, drawSeed and the rested five');
  // and the save gives an old career the field
  checked++;
  if (!readFileSync('src/game/save.ts', 'utf8').includes('euro: s.euro ?? null,')) fails.push('an old save would load without the euro field');
}

/* ------------------------- 7b. his own shootout is his, never rolled for him */
{
  checked += 6;
  const e0 = drawEuro(43, ME, 1);
  const t0 = myTie(e0, ME)!;
  const opp = t0.a === ME ? t0.b : t0.a;
  // a level aggregate leaves the tie open and asks for the shootout
  const level = recordMyLeg(recordMyLeg(e0, ME, [1, 0]), ME, [0, 1]);
  const lt = myTie(level, ME)!;
  if (lt.winner || lt.pens || !needsPens(level, ME)) fails.push('a level tie after his legs settled itself without his shootout');
  if (roundDone({ ...level, ties: [level.ties[0].map(t => t === lt ? t : { ...t, winner: t.a })] })) fails.push('a round is done while his shootout is still due');
  // a decided aggregate never asks for it, and the winner is the right side
  const won = recordMyLeg(recordMyLeg(e0, ME, [2, 0]), ME, [0, 1]);
  if (needsPens(won, ME) || myTie(won, ME)!.winner !== ME) fails.push('a tie won on aggregate asks for penalties or names the wrong winner');
  const lost = recordMyLeg(recordMyLeg(e0, ME, [0, 1]), ME, [1, 1]);
  if (needsPens(lost, ME) || myTie(lost, ME)!.winner !== opp) fails.push('a tie lost on aggregate asks for penalties or names the wrong winner');
  if (needsPens(recordMyLeg(e0, ME, [1, 1]), ME)) fails.push('penalties are due after one leg of two');
  // the shootout he took is written in his order and names the winner; pens keep the tie's [a, b]
  const mineWon = settleMyPens(level, ME, [4, 3]);
  const mt = myTie(mineWon, ME)!;
  const expectPens = mt.a === ME ? '[4,3]' : '[3,4]';
  if (mt.winner !== ME || JSON.stringify(mt.pens) !== expectPens || needsPens(mineWon, ME)) fails.push('a shootout he won is not written as his win in the tie\'s order');
  const theirsWon = settleMyPens(level, ME, [2, 4]);
  if (myTie(theirsWon, ME)!.winner !== opp) fails.push('a shootout he lost does not put the other side through');
}

/* ----------------------------------- 8. the calendar: which week, which leg */
{
  // a fresh draw: the first leg is due before league round 2 and nowhere else
  const e = drawEuro(41, ME, 1);
  const t = myTie(e, ME)!;
  const opp = t.a === ME ? t.b : t.a;
  checked += 6;
  const n2 = nightFor(e, ME, 14, 2);
  if (!n2 || n2.round !== 0 || n2.leg !== 0 || n2.oppId !== opp) fails.push('the first leg is not due before league round 2');
  if (n2 && n2.host !== (t.a === ME)) fails.push('the first leg host is not the first named side');
  if (nightFor(e, ME, 14, 1) || nightFor(e, ME, 14, 3) || nightFor(e, ME, 14, 4)) fails.push('a leg is due in a week the calendar does not name');
  if (nightFor(e, ME, 10, 2)) fails.push('a ten round league still has a European night');
  // the first leg played, the return is due before round 3 and the first is never due again
  const after1 = recordMyLeg(e, ME, [1, 0]);
  if (nightFor(after1, ME, 14, 2)) fails.push('a leg already played is due again');
  const n3 = nightFor(after1, ME, 14, 3);
  if (!n3 || n3.leg !== 1 || n3.host !== !(t.a === ME)) fails.push('the return leg is not due before round 3 at the other ground');
  // both legs in: nothing is due until the next round, which is before round 5
  checked += 3;
  const after2 = recordMyLeg(after1, ME, [2, 0]);
  if (nightFor(after2, ME, 14, 3) || nightFor(after2, ME, 14, 4)) fails.push('a side with its legs played is still asked to play');
  const q = advanceRound(playAiRound(after2, ME, 7), ME);
  if (q.status !== 'on' || !nightFor(q, ME, 14, 5) || nightFor(q, ME, 14, 4)) fails.push('the quarter is not due before round 5');
  // out of it, nothing is ever due; the final is one night, neutral, before round 13
  if (nightFor({ ...q, status: 'out' }, ME, 14, 5)) fails.push('a side that is out is asked to play');
  checked += 2;
  // the quarter is drawn (two rounds exist), so the semi is an empty third and the final the fourth
  const fin = { ...q, round: 3, leg: 0, ties: [...q.ties, [], [{ a: ME, b: opp, legs: [] }]], status: 'on' as const };
  const nf = nightFor(fin, ME, 14, 13);
  if (!nf || nf.host !== null || nf.leg !== 0) fails.push('the final is not one neutral night before round 13');
  if (nightFor(fin, ME, 14, 14)) fails.push('a second final night is due');

  // through the save: the door shut means no night even with a competition drawn
  checked += 3;
  const gs = G.newGame(7);
  const drawn = { ...gs, week: 2, euro: drawEuro(9, gs.clubId, 1) };
  if (G.euroNight(drawn) !== null) fails.push('the Hub would announce a European night with the door shut');
  if (G.euroNight(gs) !== null) fails.push('a career with no competition has a night');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  if (!hub.includes('const night = G.euroNight(gs);') || !hub.includes('{night && <EuroHero night={night} onGo={onEuro} />}')) fails.push('the Hub does not announce the night off euroNight');
}
/* ----------------------------------- 9. the men have names of their country */
{
  checked += 5;
  const countries = new Set(EURO_CLUBS.map(c => c.country));
  const missing = [...countries].filter(c => !EURO_NAMES[c]);
  if (missing.length) fails.push(`no names for ${missing.join(', ')}`);
  const thin = Object.entries(EURO_NAMES).filter(([, b]) => b.first.length < 12 || b.last.length < 12).map(([c]) => c);
  if (thin.length) fails.push(`fewer than twelve names in ${thin.join(', ')}`);
  const doubled = Object.entries(EURO_NAMES).filter(([, b]) => new Set(b.first).size !== b.first.length || new Set(b.last).size !== b.last.length).map(([c]) => c);
  if (doubled.length) fails.push(`a name repeats inside ${doubled.join(', ')}`);
  const dashed = Object.values(EURO_NAMES).flatMap(b => [...b.first, ...b.last]).filter(n => /[—–]|\s[,.!?]/.test(n) || /[A-Za-z]/.test(n));
  if (dashed.length) fails.push(`a name carries a dash, a stray space or Latin letters: ${dashed.slice(0, 3).join(', ')}`);
  // eighteen men of one club are eighteen different names, and a reload names the same men
  const draw = (seed: number) => { const used = new Set<string>(); const rng = createRng(seed); return Array.from({ length: 18 }, () => makeEuroName(rng, 'הולנד', used)); };
  const a = draw(3), b = draw(3), c = draw(4);
  if (new Set(a).size !== 18 || a.join() !== b.join() || a.join() === c.join()) fails.push('a squad of eighteen is not eighteen distinct, seeded names');
  // a country the bank does not know still gets a name rather than a crash
  checked++;
  if (!makeEuroName(createRng(1), 'אטלנטיס', new Set())) fails.push('an unknown country gives no name at all');
}
/* ------------------------ 10. the European night, played in the real engine */
{
  // a career at the hub in week 2 with a competition drawn. The door is opened
  // for the check only, by parameter, the way euroEntry takes it
  const career = (seed: number): G.GameState => {
    let gs = G.newGame(seed);
    gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
    gs = G.pickCity(gs, LEGEND_TOWN);
    gs = G.afterSigning(gs, {});
    gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
    while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
    const hub = { ...gs, phase: 'hub' as const, week: 2 };
    return { ...hub, euro: drawEuro(seed, hub.clubId, hub.season) };
  };
  const playNight = (gs: G.GameState) => {
    const input = G.euroMatchInput(gs, true);
    const st = L.createLive(input);
    let guard = 0;
    while (st.phase !== 'done' && guard++ < 4000) {
      if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
      if (st.phase === 'moment' && st.pending) {
        const m = st.pending;
        switch (m.kind) {
          case 'penalty': L.resolvePenalty(st, 'left'); break;
          case 'def_penalty': L.resolveDefPenalty(st, 'left'); break;
          case 'shot': L.resolveShot(st, 'left'); break;
          case 'free_kick': L.resolveFreeKick(st, 'left'); break;
          case 'one_on_one': L.resolveOneOnOne(st, 'finish'); break;
          case 'def_keeper': L.resolveDefKeeper(st, 'stay'); break;
          case 'def_tackle': L.resolveDefTackle(st, 'contain'); break;
          case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
        }
        if (st.phase === 'moment') st.phase = 'play';
        continue;
      }
      L.step(st);
    }
    const ids = [...L.mySide(st).onPitch, ...L.mySide(st).sentOff.map(x => x.player)].map(p => p.id);
    return { input, result: L.finalize(st), ids };
  };
  const frozen = (gs: G.GameState) => JSON.stringify([gs.league.table, gs.seasonStats, gs.form, gs.lastLedger, gs.lastPlayerMatch, gs.pressHistory, gs.chatHistory, gs.suspensions, gs.sitOutNext, gs.week, gs.purseEarlier, gs.season]);
  const asMine = (gs: G.GameState, t: { a: string; legs: Array<[number, number]> }, i: number): [number, number] =>
    t.a === gs.clubId ? t.legs[i] : [t.legs[i][1], t.legs[i][0]];

  const gs = career(21);
  const night = G.euroNight(gs, true)!;
  checked += 5;
  if (!night) fails.push('a drawn competition in week 2 has no night for the check');
  // the door shut: no night, the hub button does nothing; a closed match or shootout reloads at the hub
  if (G.euroNight(gs) !== null || G.startEuroNight(gs).phase !== 'hub' || G.euroPensDue(gs)) fails.push('with the door shut the night still exists for the state');
  if (G.startEuroNight(gs, true).phase !== 'euro-match') fails.push('with the door open the hub does not start the night');
  saveCareer({ ...gs, phase: 'euro-match' });
  if (loadCareer()?.phase !== 'hub') fails.push('a career closed inside the European night does not reload at the hub');
  saveCareer({ ...gs, phase: 'euro-pens' });
  if (loadCareer()?.phase !== 'hub') fails.push('a career closed inside the shootout does not reload at the hub');

  // the input: the same men twice, the other side named from its country at the round's strength, the final neutral
  checked += 8;
  const i1 = G.euroMatchInput(gs, true), i2 = G.euroMatchInput(gs, true);
  if (JSON.stringify(i1) !== JSON.stringify(i2)) fails.push('the same week gives two different European nights');
  const country = euroClub(night.oppId)!.country;
  const bank = EURO_NAMES[country];
  const theirs = [...i1.oppStarters, ...i1.oppBench];
  if (!theirs.every(p => bank.first.includes(p.name.split(' ')[0]) && bank.last.includes(p.name.split(' ').slice(1).join(' ')))) fails.push(`the ${country} side has men not named from its bank`);
  if (new Set(theirs.map(p => p.name)).size !== theirs.length) fails.push('two men of the European side share a name');
  if (i1.seed !== G.drawSeed(gs, 150_000 + night.round * 10 + night.leg)) fails.push('the night is not seeded through drawSeed on the round and leg');
  const target = strengthOf(gs.euro!, night.oppId, night.round);
  const avg = theirs.slice(0, 11).reduce((s, p) => s + overall(p), 0) / 11;
  if (Math.abs(avg - target) > 6) fails.push(`the other side's eleven average ${avg.toFixed(1)} against a target of ${target}`);
  if ((i1.homeId === gs.clubId) !== (night.host !== false)) fails.push('the host is not the home side of the engine input');
  if (i1.neutral) fails.push('a two legged tie is played on neutral ground');
  const fin = { ...gs, week: 13, euro: { ...gs.euro!, round: 3, ties: [...gs.euro!.ties, [], [], [{ a: gs.clubId, b: night.oppId, legs: [] }]] } };
  const fi = G.euroMatchInput(fin, true);
  if (!fi.neutral || !fi.iAmHome) fails.push('the final is not neutral with him seated home for the indexes');
  const fst = L.createLive(fi);
  if (fst.home.isHome || fst.away.isHome) fails.push('the final gives a side the home edge');
  const lst = L.createLive(i1);
  if (!(lst.home.isHome && !lst.away.isHome)) fails.push('a two legged leg gives nobody the home edge');

  // the night played: nothing of the league moves, the men are tired, the leg is in, the money moves by the agreed sums
  checked += 9;
  const { result, ids } = playNight(gs);
  const before = frozen(gs);
  const after = G.commitEuroLeg(gs, result, ids, true);
  if (frozen(after) !== before) fails.push('the European night wrote into the league (table, stats, form, ledger, history, suspensions, sitOutNext, week)');
  const played = new Set([...i1.playerStarters.map(p => p.id), ...ids]);
  const tired = after.matchMods.fitness ?? {};
  if (![...played].every(id => tired[id] === G.EURO_TIRED)) fails.push(`a man who played is not ${G.EURO_TIRED} for the league match`);
  if (Object.keys(tired).some(id => !played.has(id))) fails.push('a man who did not play is tired');
  if (G.EURO_TIRED !== -12) fails.push('the European tiredness is not the agreed twelve');
  const gate = Math.round(gateIncome(G.homeAttendance(gs, false), G.club(gs).tier) * GATE_SHARE);
  const mine = G.euroMyTie(after)!;
  if (mine.legs.length !== 1) fails.push('the leg was not written into the tie');
  const myGoals = result.home.id === gs.clubId ? result.score : [result.score[1], result.score[0]];
  const legMine = asMine(gs, mine, 0);
  if (legMine[0] !== myGoals[0] || legMine[1] !== myGoals[1]) fails.push('the goals in the tie are not the goals of the night');
  const expectMoney = gs.meters.money + (night.host === true ? gate - SECURITY : -TRAVEL);
  if (after.meters.money !== expectMoney) fails.push(`the first leg moved the money by ${after.meters.money - gs.meters.money}, expected ${expectMoney - gs.meters.money}`);
  if (after.phase !== 'hub' || G.euroNight(after, true) !== null) fails.push('after the first leg the hub still asks for it');
  if (after.notices.at(-1)?.kind !== 'story') fails.push('the night leaves no word on the hub');
  if (G.euroMatchInput({ ...after, week: 3 }, true).seed === i1.seed) fails.push('the return leg replays the first leg seed');

  // a red card tonight is a European ban only: not on the league sheet, off the next European sheet, served by it
  checked += 5;
  const culprit = i1.playerStarters[3].id;
  const withRed = { ...result, events: [...result.events, { minute: 70, type: 'red' as const, teamId: gs.clubId, playerId: culprit, playerName: 'x', text: '' }] };
  const banned = G.commitEuroLeg(gs, withRed, ids, true);
  if (banned.euro!.bans[culprit] !== 1) fails.push('a European red is not a European ban');
  if (JSON.stringify(banned.suspensions) !== JSON.stringify(gs.suspensions)) fails.push('a European red reached the league suspensions');
  const ret = { ...banned, week: 3 };
  if (G.euroMatchInput(ret, true).playerStarters.some(p => p.id === culprit)) fails.push('a European banned man is on the next European sheet');
  if (!G.liveMatchInput(ret).playerStarters.some(p => p.id === culprit)) fails.push('a European ban keeps a man out of the league');
  const retPlayed = playNight(ret);
  const served = G.commitEuroLeg(ret, retPlayed.result, retPlayed.ids, true);
  if ((served.euro!.bans[culprit] ?? 0) !== 0) fails.push('a European ban is not served by the next European match');

  // an injury tonight: out of this week's league match, not next week's; the league sheet refills without him
  checked += 4;
  let hurtCase: G.GameState | null = null;
  for (let s = 1; s < 60 && !hurtCase; s++) {
    const g = career(s);
    const n = G.euroNight(g, true);
    if (!n) continue;
    if (G.euroInjuries(g, n, G.euroMatchInput(g, true).playerStarters.map(p => p.id)).length) hurtCase = g;
  }
  if (!hurtCase) fails.push('no seed in sixty hurts a man on a European night');
  else {
    const p = playNight(hurtCase);
    const a = G.commitEuroLeg(hurtCase, p.result, p.ids, true);
    const hurt = Object.keys(a.sitOut).filter(id => a.sitOut[id] === 'פצוע');
    if (!hurt.length) fails.push('the injury rolled on the night is not written into sitOut');
    if (Object.keys(a.sitOutNext).length !== Object.keys(hurtCase.sitOutNext).length) fails.push('the injury was written for next week, not this one');
    if (hurt.some(id => G.liveMatchInput(a).playerStarters.some(q => q.id === id))) fails.push('a man hurt in Europe starts the league match');
    if (hurt.some(id => G.lineup(a).some(q => q.id === id)) && !G.weekBlockedReason(a)) fails.push('a hurt man in the eleven does not block the round');
  }
  if (G.EURO_INJURY_RISK <= 0 || G.EURO_INJURY_RISK > 0.15) fails.push('the injury risk is off, or above one in seven');

  // a level tie waits for his shootout, pays nothing until it is taken, and the shootout settles it and pays the round's prize
  checked += 7;
  const second = { ...after, week: 3 };
  const fixed = (g: G.GameState, mineGoals: [number, number]): MatchResult => {
    const inp = G.euroMatchInput(g, true);
    const stats = { possession: .5, chances: 0, goals: 0, xg: 0 };
    return { seed: 1, home: { id: inp.homeId, name: '', stats }, away: { id: inp.awayId, name: '', stats }, score: inp.iAmHome ? mineGoals : [mineGoals[1], mineGoals[0]], events: [], ratings: {} };
  };
  const firstMine = asMine(gs, mine, 0);
  const lvl = G.commitEuroLeg(second, fixed(second, [firstMine[1], firstMine[0]]), [], true);
  if (lvl.phase !== 'euro-pens' || !G.euroPensDue(lvl, true)) fails.push('a level tie after the legs does not go to the shootout');
  if (G.euroPensDue(lvl)) fails.push('the shootout is due with the door shut');
  if (G.startEuroNight({ ...lvl, phase: 'hub' }, true).phase !== 'euro-pens') fails.push('the hub does not offer the shootout again after a reload');
  if (lvl.meters.money !== second.meters.money + (night.host === true ? -TRAVEL : gate - SECURITY)) fails.push('a level return leg did not charge the ground and nothing else');
  const won = G.finishEuroPens(lvl, [4, 3]);
  const settled = won.euro!.ties[0].find(t => t.a === gs.clubId || t.b === gs.clubId)!;
  if (settled.winner !== gs.clubId || !settled.pens || won.euro!.round !== 1 || won.euro!.status !== 'on' || won.phase !== 'hub') fails.push('a shootout won does not take him into the quarter');
  if (won.notices.at(-1)?.kind !== 'story' || !JSON.stringify(won.notices.at(-1)).includes('4:3')) fails.push('the shootout leaves no word with its score on the hub');
  if (won.meters.money !== lvl.meters.money + PRIZE[1]) fails.push('reaching the quarter did not pay the quarter prize, and only it');
  const lost = G.finishEuroPens(lvl, [2, 4]);
  if (lost.euro!.status !== 'out' || !champion(lost.euro!) || lost.meters.money !== lvl.meters.money) fails.push('a shootout lost does not put him out, with the competition played to its champion and no prize');
  // a win on aggregate goes straight through with the prize, no shootout
  checked += 2;
  // whatever the first leg was, two more than they have on aggregate wins it
  const thru = G.commitEuroLeg(second, fixed(second, [firstMine[1] + 2, firstMine[0]]), [], true);
  if (thru.phase !== 'hub' || thru.euro!.round !== 1 || thru.euro!.status !== 'on') fails.push('a tie won on aggregate does not move him to the quarter');
  if (thru.meters.money !== lvl.meters.money + PRIZE[1]) fails.push('the return leg and the quarter prize do not add up');
}
/* ------------------------------ 11. his shootout, from the spot and from the goal */
{
  checked += 9;
  // five each, over the moment a side cannot be caught, and he kicks first
  const s0 = shootoutStatus([], []);
  if (s0.next !== 'me' || s0.winner !== null) fails.push('the shootout does not start with his kick');
  if (shootoutStatus([true], []).next !== 'them') fails.push('after his kick it is not their turn');
  if (shootoutStatus([true, true, true], [false, false, false]).winner !== 'me') fails.push('three to nothing after three is not over');
  if (shootoutStatus([true, true, true], [false, false]).winner !== null) fails.push('three to nothing after two and a half is called early');
  if (shootoutStatus([false, false, false], [true, true, true]).winner !== 'them') fails.push('nothing to three after three is not over for them');
  if (shootoutStatus([true, true, true, true, true], [true, true, true, true, false]).winner !== 'me') fails.push('five to four after five each is not his');
  const level5 = shootoutStatus([true, true, true, true, true], [true, true, true, true, true]);
  if (level5.winner !== null || level5.next !== 'me') fails.push('five all does not go to sudden death with his kick');
  if (shootoutStatus([true, true, true, true, true, true], [true, true, true, true, true, false]).winner !== 'me') fails.push('sudden death is not decided pair by pair');
  if (shootoutStatus([true, true, true, true, true, false], [true, true, true, true, true]).winner !== null) fails.push('a miss in sudden death is called before their reply');
  checked += 3;
  if (shootoutStatus([true, true, false], [true, false, false]).winner !== null) fails.push('two to one after three each is called early');
  if (shootoutStatus([true, true, true, true, true, true], [true, true, true, true, true]).winner !== null) fails.push('a goal in sudden death is called before their reply');
  if (shootoutStatus([true, true, true, true, true, false], [true, true, true, true, true, true]).winner !== 'them') fails.push('their reply in sudden death does not win it');
  // the odds are the live match's own, and the keeper goes with the hint six times in ten
  checked += 4;
  let past = 0, into = 0, saveRight = 0, saveWrong = 0, hinted = 0;
  const N = 20_000;
  const r = createRng(99);
  for (let i = 0; i < N; i++) {
    if (myKickScores(r, 'left', 'right')) past++;
    if (myKickScores(r, 'left', 'left')) into++;
    if (theirKickSaved(r, 'left', 'left', 60)) saveRight++;
    if (theirKickSaved(r, 'left', 'right', 60)) saveWrong++;
    if (diveFor(r, 'center') === 'center') hinted++;
  }
  const near = (x: number, p: number) => Math.abs(x / N - p) < 0.02;
  if (!near(past, 0.85) || !near(into, 0.25)) fails.push(`his kick scores ${(past / N * 100).toFixed(0)}% past the keeper and ${(into / N * 100).toFixed(0)}% into him, the match says 85 and 25`);
  if (!near(saveRight, 0.55) || !near(saveWrong, 0.06)) fails.push(`his keeper saves ${(saveRight / N * 100).toFixed(0)}% on the right corner and ${(saveWrong / N * 100).toFixed(0)}% on the wrong one, the match says 55 and 6`);
  if (!near(hinted, 0.6)) fails.push(`the keeper follows the hint ${(hinted / N * 100).toFixed(0)}% of the time, the match says 60`);
  const h = createRng(5);
  const hints = new Set(Array.from({ length: 200 }, () => hintFor(h)));
  if (hints.size !== 3) fails.push('the hint never names one of the corners');
  // the screen: his kick on the two clips made for this, theirs as the keeper's three approved frames cut by the clock, every roll seeded on the round, the phone buzzes
  checked += 12;
  const scr = readFileSync('src/ui/screens/Shootout.tsx', 'utf8');
  const clips = ['goal-behind', 'save-behind'];
  const missingClip = clips.filter(c => !scr.includes(`asset('/moments/euro-penalty/${c}.mp4')`) || !existsSync(`public/moments/euro-penalty/${c}.mp4`));
  if (missingClip.length) fails.push(`his kick's clips missing or unwired: ${missingClip.join(', ')}`);
  if (clips.some(c => existsSync(`public/moments/euro-penalty/${c}.mp4`) && statSync(`public/moments/euro-penalty/${c}.mp4`).size > 900_000)) fails.push('a shootout clip is heavier than the game allows (900K)');
  if (!scr.includes('src={stage.kick.scored ? CLIP.goalBehind : CLIP.saveBehind}')) fails.push('his clip is not chosen by whether he scored');
  if (scr.includes('/moments/penalty/')) fails.push('the shootout still reaches for the league penalty clips Itzik rejected');
  if (['goal-ingoal', 'save-ingoal'].some(c => scr.includes(c) || existsSync(`public/moments/euro-penalty/${c}.mp4`))) fails.push('the in-goal clips Itzik rejected (the cut in the middle) are still wired or shipped');
  // the keeper's frames: five approved pictures, each shipped and light, and the sequence cut by the clock in the right order
  const frames = ['keeper-set', 'keeper-wrong', 'keeper-right', 'keeper-goal', 'keeper-save'];
  const missingFrame = frames.filter(f => !scr.includes(`asset('/moments/euro-penalty/${f}.webp')`) || !existsSync(`public/moments/euro-penalty/${f}.webp`));
  if (missingFrame.length) fails.push(`keeper frames missing or unwired: ${missingFrame.join(', ')}`);
  if (frames.some(f => existsSync(`public/moments/euro-penalty/${f}.webp`) && statSync(`public/moments/euro-penalty/${f}.webp`).size > 160_000)) fails.push('a keeper frame is heavier than the game allows (160K)');
  if (!scr.includes("const layers = [{ key: 'set', src: KEEPER.set }, { key: 'contact', src: scored ? KEEPER.wrong : KEEPER.right }, { key: 'end', src: scored ? KEEPER.goal : KEEPER.save }] as const;") || !scr.includes("data-on={step === l.key ? '1' : '0'}")) fails.push('the keeper sequence does not go set, then the dive the wrong way for a goal or the right way for a save, then the net or the gloves, with all three frames in the box from the first beat');
  if (!scr.includes("setTimeout(() => setStep('contact'), KEEPER_BEATS.contact)") || !scr.includes("setTimeout(() => { setStep('end'); ended.current(); }, KEEPER_BEATS.end)") || !scr.includes('return () => { clearTimeout(t1); clearTimeout(t2); };')) fails.push('the keeper sequence is not cut by the clock, or its timers outlive the kick');
  const beats = /KEEPER_BEATS = \{ contact: (\d+), end: (\d+) \}/.exec(scr);
  if (!beats || !(Number(beats[1]) > 0 && Number(beats[2]) > Number(beats[1]) && Number(beats[2]) <= 3000)) fails.push('the keeper beats are missing, out of order or too slow');
  if (!scr.includes("mirrored={stage.kick.pick === 'left'}") || !scr.includes('data-mirror={mirrored ? \'1\' : \'0\'}')) fails.push('a kick to the left does not mirror the keeper frames');
  if (!scr.includes("asset('/moments/euro/def-penalty.webp')") || !scr.includes("asset('/moments/euro/penalty.webp')")) fails.push('the pick cards do not use the European night pictures');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  if (!css.includes('.eu-seq[data-step="contact"] .eu-seq-frame[data-on="1"]{animation:eu-seq-shake') || !css.includes('@media (prefers-reduced-motion:reduce){ .eu-seq .eu-seq-frame, .eu-seq .moment-wash{animation:none;} }')) fails.push('the contact frame does not shake, or reduced motion does not still it');
  if (!scr.includes('createRng(G.drawSeed(gs, 150_020 + (gs.euro?.round ?? 0)))')) fails.push('the shootout is not seeded on the round through drawSeed');
  if (scr.includes('Math.random')) fails.push('the shootout rolls off Math.random');
  if (!scr.includes('buzz(stage.kick.scored ? BUZZ_GOAL : BUZZ_MISS)') || !scr.includes('buzz(stage.kick.scored ? BUZZ_MISS : BUZZ_SAVE)')) fails.push('a kick in the shootout does not buzz the phone when its clip or sequence ends');
  if (!scr.includes('onDone(status.score)')) fails.push('the screen does not hand the state his score as [mine, theirs]');
  // the match itself buzzes on a European goal, and only there
  checked += 2;
  const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  if (!match.includes("import { buzz, BUZZ_GOAL } from '../haptics.ts';") || !match.includes('if (euro && play?.scored) buzz(BUZZ_GOAL);')) fails.push('a European goal in the match does not buzz the phone');
  const hap = readFileSync('src/ui/haptics.ts', 'utf8');
  if (!hap.includes("typeof navigator.vibrate === 'function'") || !hap.includes('catch')) fails.push('the buzz is not guarded for a browser without it');
  // who walks up: his outfield men best first, his keeper, their names in their language
  checked += 3;
  const g = (() => {
    let s = G.newGame(31);
    s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
    s = G.pickCity(s, LEGEND_TOWN);
    s = G.afterSigning(s, {});
    s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
    while (s.phase === 'preseason-market') s = G.advancePreseason(s);
    return { ...s, phase: 'hub' as const, week: 3, euro: drawEuro(31, s.clubId, s.season) };
  })();
  const sides = G.euroPensSides(g);
  if (!sides.opp || sides.takers.length !== 10 || sides.takers.some(p => p.position === 'GK') || !sides.keeper || sides.keeper.position !== 'GK') fails.push('the takers are not his ten outfield men with his keeper in goal');
  if (sides.takers.some((p, i) => i > 0 && overall(p) > overall(sides.takers[i - 1]))) fails.push('the takers do not walk up best first');
  const bank2 = EURO_NAMES[sides.opp!.country];
  if (sides.theirNames.length !== 10 || new Set(sides.theirNames).size !== 10 || !sides.theirNames.every(n => bank2.first.includes(n.split(' ')[0]))) fails.push('their takers are not ten different men of their country');
  if (JSON.stringify(G.euroPensSides(g)) !== JSON.stringify(sides)) fails.push('a reload walks different men up');
}
/* ------------------------------- 12. the look of the night: frame, entrance, venue */
{
  checked += 6;
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  if (!app.includes("data-stage={gs.phase === 'euro-match' || gs.phase === 'euro-pens' || gs.phase === 'euro-draw' || gs.phase === 'euro-bracket' ? 'euro' : undefined}")) fails.push('the frame does not turn European for the night, the shootout, the draw and the bracket');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  if (!css.includes('.frame[data-stage="euro"]{') || !css.includes('.eu-entrance{') || !css.includes('.eu-entrance-vs{')) fails.push('the European frame or the entrance has no css');
  if (!css.includes('.eu-entrance-light,.eu-entrance-round,.eu-entrance-home,.eu-entrance-away,.eu-entrance-vs,.eu-entrance-venue{animation:none;}')) fails.push('the entrance does not honour reduced motion');
  const ent = readFileSync('src/ui/components/EuroEntrance.tsx', 'utf8');
  if (!ent.includes('onClick={onDone}') || !ent.includes('window.setTimeout(onDone, ENTRANCE_BEAT)')) fails.push('the entrance is not a beat that leaves on its own and on a tap');
  const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  if (!match.includes('{entrance && clubs && euroLines && <EuroEntrance') || !match.includes("&& !entrance && !paused")) fails.push('the match does not show the entrance before a European kickoff, or runs under it');
  if (!match.includes('<div className="eu-venue">{euroLines.venue}</div>') || !match.includes('data-euro={euro ? \'1\' : undefined}')) fails.push('the broadcast bar does not carry the ground or the European look');
  // the moments wear the night's own pictures, every one of the eight, and the files are there
  checked += 2;
  const kinds = ['penalty', 'def_penalty', 'shot', 'free_kick', 'one_on_one', 'def_keeper', 'def_tackle'];
  if (!kinds.every(k => match.includes(`kind="${k}" imgOverride={euro ? EURO_MOMENT.${k} : undefined}`)) || !match.includes('imgOverride={euro ? EURO_MOMENT.tactic : tacticImg(G.club(gs).tier)}')) fails.push('a moment on a European night still shows the league picture');
  const files = ['penalty', 'def-penalty', 'shot', 'one-on-one', 'tactic', 'free-kick', 'def-keeper', 'def-tackle'];
  const missingPic = files.filter(f => !existsSync(`public/moments/euro/${f}.webp`) || !match.includes(`asset('/moments/euro/${f}.webp')`));
  if (missingPic.length) fails.push(`European moment pictures missing or unwired: ${missingPic.join(', ')}`);
  // the words: home is his town in Israel, away is their club, city and country, the final neutral
  checked += 4;
  const g0 = (() => {
    let s = G.newGame(23);
    s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
    s = G.pickCity(s, LEGEND_TOWN);
    s = G.afterSigning(s, {});
    s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
    while (s.phase === 'preseason-market') s = G.advancePreseason(s);
    return { ...s, phase: 'hub' as const, week: 2, euro: drawEuro(23, s.clubId, s.season) };
  })();
  const n0 = G.euroNight(g0, true)!;
  const them = euroClub(n0.oppId)!;
  const l0 = G.euroEntranceLines(g0, true)!;
  const mine = `${G.club(g0).city}, ישראל`;
  const theirs0 = `${them.city}, ${them.country}`;
  if (!l0 || l0.round !== 'שמינית הגמר' || l0.leg !== 'משחק ראשון') fails.push('the entrance does not name the round and the leg');
  const groundWrong = (host: boolean | null, l: { venue: string; homePlace: string; awayPlace: string }) => host
    ? (l.venue !== `בבית, ${mine}` || l.homePlace !== mine || l.awayPlace !== theirs0)
    : (l.venue !== `בחוץ, אצל ${them.name}, ${theirs0}` || l.homePlace !== theirs0 || l.awayPlace !== mine);
  if (groundWrong(n0.host, l0)) fails.push(`the ground is wrong: ${l0.venue} / ${l0.homePlace} / ${l0.awayPlace}`);
  // the return leg is at the other ground, and the words follow it
  checked++;
  const g1 = { ...g0, week: 3, euro: recordMyLeg(g0.euro!, g0.clubId, [1, 0]) };
  const n1 = G.euroNight(g1, true)!;
  const l1 = G.euroEntranceLines(g1, true)!;
  if (!n1 || n1.host === n0.host || l1.leg !== 'המשחק החוזר' || groundWrong(n1.host, l1)) fails.push(`the return leg's ground is wrong: ${l1?.venue}`);
  const fin0 = { ...g0, week: 13, euro: { ...g0.euro!, round: 3, ties: [...g0.euro!.ties, [], [], [{ a: g0.clubId, b: n0.oppId, legs: [] }]] } };
  const lf = G.euroEntranceLines(fin0, true)!;
  if (lf.venue !== 'מגרש ניטרלי' || lf.leg !== 'הגמר, משחק אחד' || lf.round !== 'הגמר') fails.push('the final is not on neutral ground as one match');
  if (G.euroEntranceLines(g0) !== null) fails.push('the entrance has words with the door shut');
}
/* ------------------------------------ 13. the draw from his seat, and the bracket */
{
  const g0 = (() => {
    let s = G.newGame(29);
    s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
    s = G.pickCity(s, LEGEND_TOWN);
    s = G.afterSigning(s, {});
    s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
    while (s.phase === 'preseason-market') s = G.advancePreseason(s);
    return { ...s, phase: 'hub' as const, week: 1, euro: drawEuro(29, s.clubId, s.season) };
  })();
  checked += 8;
  // owed once with the door open, never with it shut, and not after it was watched or skipped
  if (G.euroDrawDue(g0) || G.openEuroDraw(g0).phase !== 'hub' || G.openEuroBracket(g0).phase !== 'hub') fails.push('the draw or the bracket opens with the door shut');
  if (!G.euroDrawDue(g0, true) || G.openEuroDraw(g0, true).phase !== 'euro-draw') fails.push('a fresh draw is not owed with the door open');
  const seen = G.finishEuroDraw(G.openEuroDraw(g0, true));
  if (seen.phase !== 'hub' || !seen.euro?.seen || G.euroDrawDue(seen, true) || G.openEuroDraw(seen, true).phase !== 'hub') fails.push('a watched draw is owed again');
  if (JSON.stringify(seen.euro!.ties) !== JSON.stringify(g0.euro!.ties)) fails.push('watching the draw changed the draw');
  if (G.euroDrawDue({ ...g0, euro: { ...g0.euro!, status: 'out' } }, true)) fails.push('a draw is owed to a side that is out');
  if (G.openEuroBracket(g0, true).phase !== 'euro-bracket' || G.openEuroBracket({ ...g0, euro: null }, true).phase !== 'hub') fails.push('the bracket does not open off the room, or opens without a competition');
  // the save: a closed draw or bracket comes back to the hub; an old competition without the field is owed the draw
  saveCareer({ ...g0, phase: 'euro-draw' });
  const b1 = loadCareer();
  saveCareer({ ...g0, phase: 'euro-bracket' });
  const b2 = loadCareer();
  if (b1?.phase !== 'hub' || b2?.phase !== 'hub') fails.push('a career closed on the draw or the bracket does not reload at the hub');
  if (!G.euroDrawDue({ ...g0, euro: { ...g0.euro!, seen: undefined } }, true)) fails.push('an older competition without the seen field is not owed its draw');
  // the screens: the draw reveals the save's ties in order and never rolls, skippable; the bracket writes nothing
  checked += 5;
  const draw = readFileSync('src/ui/screens/EuroDraw.tsx', 'utf8');
  if (!draw.includes('const ties = gs.euro?.ties[0] ?? [];') || draw.includes('Math.random') || draw.includes('drawEuro(')) fails.push('the draw screen rolls its own draw instead of revealing the save');
  if (!draw.includes('דלג על ההגרלה') || !draw.includes('onClick={onDone}')) fails.push('the draw is not skippable');
  const br = readFileSync('src/ui/screens/EuroBracket.tsx', 'utf8');
  if (br.includes('setGs') || br.includes('G.commit') || br.includes('G.finish')) fails.push('the bracket writes into the state');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  if (!hub.includes('{drawDue && <EuroDrawCard onGo={onEuroDraw} />}') || !hub.includes('const drawDue = G.euroDrawDue(gs);')) fails.push('the hub does not offer the draw off euroDrawDue');
  if (!hub.includes('label="אירופה" onClick={onEuroBracket}')) fails.push('the hub has no European room');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  if (!app.includes("{gs.phase === 'euro-draw' && <EuroDrawScreen gs={gs} onDone={() => setGs(g => G.finishEuroDraw(g))} />}") || !app.includes("{gs.phase === 'euro-bracket' && <EuroBracketScreen gs={gs} onBack={() => setGs(G.backToHub(gs))} />}")) fails.push('the app does not show the draw and the bracket');
}
console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 10).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, the competition draws, plays and crowns one champion, and the door is shut');
}
process.exit(fails.length ? 1 : 0);
