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
 */
import {
  EURO_LIVE, EURO_POOL, EURO_FIELD, EURO_ROUNDS, ROUND_NAMES, STAGE_TARGET, PRIZE,
  GATE_SHARE, TRAVEL, SECURITY, legsIn, euroWeeks, drawEuro, playAiRound, recordMyLeg, advanceRound,
  roundDone, shootout, settleTie, aggregate, strengthOf, myTie, iHost, banFor, serveBans, allWinners, aiLeg, prizeFor,
  playOutWithoutMe, champion, euroEntry, nightFor,
} from '../src/game/euro.ts';
import * as G from '../src/game/state.ts';
import { readFileSync } from 'node:fs';
import { EURO_CLUBS } from '../src/data/europeClubs.ts';
import { EURO_NAMES, makeEuroName } from '../src/data/europeNames.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;
const ME = 'me';

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
      for (let l = 0; l < legsIn(e.round); l++) e = recordMyLeg(e, ME, myGoals(), seed * 11 + e.round * 3 + l);
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
        e = recordMyLeg(e, ME, host ? [h, a] : [a, h], 60_000 + i * 19 + e.round * 3 + l);
      }
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
  const after1 = recordMyLeg(e, ME, [1, 0], 5);
  if (nightFor(after1, ME, 14, 2)) fails.push('a leg already played is due again');
  const n3 = nightFor(after1, ME, 14, 3);
  if (!n3 || n3.leg !== 1 || n3.host !== !(t.a === ME)) fails.push('the return leg is not due before round 3 at the other ground');
  // both legs in: nothing is due until the next round, which is before round 5
  checked += 3;
  const after2 = recordMyLeg(after1, ME, [2, 0], 6);
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
  if (!hub.includes('const night = G.euroNight(gs);') || !hub.includes('{night && <EuroHero night={night} />}')) fails.push('the Hub does not announce the night off euroNight');
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
console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 10).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, the competition draws, plays and crowns one champion, and the door is shut');
}
process.exit(fails.length ? 1 : 0);
