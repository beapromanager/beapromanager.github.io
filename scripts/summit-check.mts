/**
 * פסגת אירופה, the top European tier (Itzik, 31.10.2026, europe_tier2_names_LOCKED.md).
 *   node --experimental-strip-types scripts/summit-check.mts
 *
 * Stage 0, the data:
 *   1. his twenty, word for word, each in its country, at its rating
 *   2. forty clubs between the two tiers: ids, names and short names all unique, every crest its own
 *   3. no real club, nickname or ground anywhere a player reads: whole words, with the two city names he
 *      approved, and the long dash nowhere
 *   4. every club has an invented ground and two flares bright enough to read as fire, and the final moves
 *      between invented grounds by season
 *   5. the pools: level 0 is the twenty of ליגת אירופה, level 1 the twenty of the summit, and an id of either
 *      tier finds its club
 *   6. every country of the summit has a bank of names, England among them
 *   7. ר.ב אמסטרדם is קייב הכחולה, under the same id, and an old save, even one renamed once before, says so
 *
 * Stage 1, the competition and the career:
 *   8. the agreed numbers: targets 82 / 85 / 87 / 89, every club at its own rating against 87, prizes summing 9.1M,
 *      travel and security 250K, gems 5 and 15, and the names of the two tiers
 *   9. the draw by level: the summit pool or the lower one, never both, fifteen and five rested, seeded
 *  10. who goes where, through a real summer: champion or not, standing or not, licence or not
 *  11. the gems: five on the first summit season and never again, fifteen on every summit trophy
 *  12. a trophy on the night: ליגת אירופה opens the summit for the career, the summit is counted and paid by level
 *  13. the chronicle names its tier, and the lower tier's line stays word for word
 *  14. a save from before: the standing read off its chronicle or its season, a cup already running stays its level
 *  15. each tier keeps its own queue of the clubs left out
 *
 * Stage 2, the black and gold (R1, R12):
 *  16. the gold road: the four stops read right off the competition at every point of a run
 *  17. the frame turns summit only for a summit competition's own screens, and the hub's cards and the season card
 *      wear it only at level 1
 *  18. the look's own rules: the sheet is loaded, body text at 7:1 or more, foil only at 22px and up, every movement
 *      stopped under reduced motion, the one that repeats is the hub's main button, the font is loaded with swap
 *  19. the elite crest: every summit club wears it, with its own emblem, and no colour is written into the new
 *      components outside the tokens
 *
 * Stage 3, the entrance, the rival card, the trophy (R2 to R5, and R6's last minutes):
 *  20. every file the summit asks for is in one list, named by the one rule, every one in HIGGSFIELD-SUMMIT.md and
 *      the other way round, no prompt without "no text", nothing real in the prompts, nothing precached
 *  21. the entrance: two to three seconds, a hard cut, the home club's ground and fires (or the final's), a clip
 *      path for every club, his own ground for a home night
 *  22. the rival card: one second, their strength and best man off the very eleven the engine fields, his chance
 *      counted by the engine itself, the same on every reload and higher for a stronger side
 *  23. the trophy: once, on the night the summit is won and only then, the summit's buzz, the foil confetti counts
 *  24. the last minutes: darker edges and a breathing crowd only at the summit, from the 80th, a goal or less apart
 *  25. Itzik's answers of 9.11: קייב הכחולה blue and yellow, the lawyer's four, the golden book's scope
 */
import {
  EURO_CLUBS, EURO_SUMMIT_CLUBS, SUMMIT_FINAL_STADIUMS, SUMMIT_DRAFT, summitFinalStadium, poolFor, euroClub, summitClub,
  SUMMIT_DECIDED, LAWYER_REVIEW, GOLDEN_BOOK_SCOPE,
} from '../src/data/europeClubs.ts';
import { SUMMIT_ASSETS, entranceAssetId, BOOK_MOMENTS, COACH_CLIPS } from '../src/data/summitAssets.ts';
import { winChanceNow, roundTo5, ODDS_RUNS, sideRating, keyPlayer, oddsSeed, playOut } from '../src/game/summitOdds.ts';
import { summitTension, TENSE_FROM } from '../src/game/summitPath.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { EURO_NAMES, makeEuroName } from '../src/data/europeNames.ts';
import { renameLegacy, NAMES_VERSION } from '../src/game/renames.ts';
import { createRng, overall } from '../src/engine/matchEngine.ts';
import {
  SUMMIT_STAGE_TARGET, SUMMIT_CENTRE, SUMMIT_CAP, SUMMIT_PRIZE, SUMMIT_TRAVEL, SUMMIT_SECURITY, SUMMIT_FIRST_GEMS, SUMMIT_TITLE_GEMS,
  STAGE_TARGET, PRIZE, TRAVEL, SECURITY, drawEuro, strengthOf, prizeFor, prizeTotal, competitionName, summitLevel,
  travelFor, securityFor, myTie, recordMyLeg, EURO_ROUNDS,
} from '../src/game/euro.ts';
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { summitStops } from '../src/game/summitPath.ts';
import { readFileSync } from 'node:fs';
import { advanceRound, playAiRound, settleMyPens } from '../src/game/euro.ts';

/* localStorage, which node does not have and the loader insists on */
const lsStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, writable: true,
  value: { getItem: (k: string) => lsStore.get(k) ?? null, setItem: (k: string, v: string) => { lsStore.set(k, v); }, removeItem: (k: string) => { lsStore.delete(k); } },
});

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };

/* ------------------------------------------------- 1. his twenty, word for word */
const LOCKED: Array<[string, string, number]> = [
  ['מדריד השנהבית', 'ספרד', 89], ['הפייטרים ממדריד', 'ספרד', 86], ['קטלוניה הגדולה', 'ספרד', 89],
  ["מנצ'סטר הטקסטילית", 'אנגליה', 87], ["מנצ'סטר התכולה", 'אנגליה', 89], ['נמל המרסי', 'אנגליה', 88],
  ['לונדון הכחולה', 'אנגליה', 86], ['צפון לונדון האדומה', 'אנגליה', 87], ['מינכן הבווארית', 'גרמניה', 89],
  ['דורטמונד צהובה', 'גרמניה', 86], ['טורינו בשחור לבן', 'איטליה', 87], ['מילאנו אדומה', 'איטליה', 86],
  ['מילאנו הכחולה', 'איטליה', 87], ['אלופי דרום איטליה', 'איטליה', 85], ['פריז הענקית', 'צרפת', 88],
  ['הכחולים מפורטוגל', 'פורטוגל', 85], ['ליסבון האדומה', 'פורטוגל', 85], ['הלהבה מאיסטנבול', 'טורקיה', 85],
  ['גלזגו הירוקה', 'סקוטלנד', 85], ['המשוגעים של אמסטרדם', 'הולנד', 85],
];
claim(EURO_SUMMIT_CLUBS.length === 20, `${EURO_SUMMIT_CLUBS.length} clubs in the summit, his twenty`);
claim(EURO_CLUBS.length === 20, `${EURO_CLUBS.length} clubs in ליגת אירופה, it stays twenty`);
claim(JSON.stringify(EURO_SUMMIT_CLUBS.map(c => c.name)) === JSON.stringify(LOCKED.map(l => l[0])), 'the summit names are not his twenty, word for word and in his order');
for (const [name, country, rating] of LOCKED) {
  const c = EURO_SUMMIT_CLUBS.find(x => x.name === name);
  claim(!!c && c.country === country, `${name} is missing or not in ${country}`);
  claim(!!c && c.rating === rating, `${name} plays at ${c?.rating}, his ${rating}`);
}
claim(EURO_SUMMIT_CLUBS.every(c => /^eu2-[a-z-]+$/.test(c.id)), 'a summit id is not eu2-');
claim(EURO_CLUBS.every(c => /^eu-[a-z-]+$/.test(c.id)), 'a ליגת אירופה id is not eu-');

/* ------------------------------------------------- 2. forty clubs, each its own */
const ALL = [...EURO_CLUBS, ...EURO_SUMMIT_CLUBS];
claim(new Set(ALL.map(c => c.id)).size === 40, 'two of the forty share an id');
claim(new Set(ALL.map(c => c.name)).size === 40, 'two of the forty share a name');
claim(new Set(ALL.map(c => c.short)).size === 40, 'two of the forty share a short name');
claim(ALL.every(c => c.short.length >= 2 && c.short.length <= 14), 'a short name is empty or too long for a board');
const hue = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
};
const alike: string[] = [];
for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) {
  const a = ALL[i], b = ALL[j];
  if (a.shape !== b.shape || a.pattern !== b.pattern) continue;
  const gap = Math.abs(hue(a.primary) - hue(b.primary));
  if (Math.min(gap, 360 - gap) < 20) alike.push(`${a.name} / ${b.name}`);
}
claim(alike.length === 0, `crests alike among the forty: ${alike.join(', ')}`);
const HEX = /^#[0-9A-Fa-f]{6}$/;
claim(EURO_SUMMIT_CLUBS.every(c => HEX.test(c.primary) && HEX.test(c.secondary) && HEX.test(c.accent)), 'a summit colour is not a hex colour');

/* ------------------------------------------------- 3. nothing real */
// whole words: a token of the name is the real word, or the real word behind one or two Hebrew prefix letters
const REAL_CLUBS = [
  'ריאל', 'אתלטיקו', 'ברצלונה', 'בארסה', 'ארסנל', "צ'לסי", 'סיטי', 'יונייטד', 'ליברפול', 'טוטנהאם', 'באיירן', 'בורוסיה',
  'יובנטוס', 'יובה', 'מילאן', 'אינטר', 'נאפולי', 'רומא', 'לאציו', 'פ.ס.ז', 'פריז סן ז׳רמן', 'פורטו', 'בנפיקה', 'ספורטינג',
  'גלאטסראי', 'פנרבחצ׳ה', 'בשיקטאש', 'סלטיק', "ריינג'רס", 'אייאקס', 'פיינורד', 'פ.ס.וו', 'טורינו', 'אסטון', 'ניוקאסל',
  'ולנסיה', 'סביליה', 'דורטמונד בורוסיה', 'לברקוזן', 'לייפציג',
];
// Itzik, 31.10.2026: the name of a city, not of the club. טורינו is also Torino FC's name; מילאנו only contains מילאן
// as a string, and a whole-word test does not see it at all. Both are kept on his word.
const APPROVED = new Set(['טורינו', 'מילאנו']);
const NICKNAMES = [
  'הבלאנקוס', 'בלאנקוס', 'מלכותית', 'המלכותית', 'רויאל', 'הקיר הצהוב', 'הגברת הזקנה', 'השדים האדומים', 'התותחנים',
  'הנשרים', 'הדרקונים', 'גן עדן', 'תיאטרון החלומות', 'הזברה', 'הזברות', 'רוסונרי', 'נראצורי', 'בלאוגרנה',
  "הקולצ'ונרוס", 'הספרס', 'הגונרס', 'הסיטיזנס', 'הבוואריים', 'הפרטנופיי', 'הלוס', 'מרנגס',
];
const REAL_GROUNDS = [
  'ברנבאו', 'מטרופוליטנו', 'קאמפ נואו', 'אולד טראפורד', 'אתיחאד', 'אנפילד', "סטמפורד ברידג'", 'אמירייטס', 'הייבורי',
  'אליאנץ', 'וסטפאלן', 'סיגנל אידונה', 'סן סירו', 'מאצה', 'מראדונה', 'פארק דה פרינס', 'דראגאו', 'דה לוש', 'סלטיק פארק',
  'יוהאן קרויף', 'ומבלי', 'אולימפיקו', 'סלהרסט', 'גודיסון', 'ולודרום',
];
const PREFIX = 'ובלמשהכ';
const tokens = (s: string) => s.split(/[\s,.()]+/).filter(Boolean);
function realWordIn(text: string): string | null {
  for (const t of tokens(text)) {
    if (APPROVED.has(t)) continue;
    for (const r of REAL_CLUBS) {
      if (r.includes(' ')) { if (text.includes(r)) return r; continue; }
      let w = t;
      for (let k = 0; k <= 2; k++) {
        if (w === r) return r;
        if (w.length > 2 && PREFIX.includes(w[0])) w = w.slice(1); else break;
      }
    }
  }
  return null;
}
for (const c of EURO_SUMMIT_CLUBS) {
  const read = `${c.name} ${c.short} ${c.stadium}`;
  const hit = realWordIn(read);
  claim(!hit, `${c.name} carries a real club's name: ${hit}`);
  const nick = NICKNAMES.find(n => read.includes(n));
  claim(!nick, `${c.name} carries a real club's nickname: ${nick}`);
  const ground = REAL_GROUNDS.find(g => c.stadium.includes(g) || c.name.includes(g));
  claim(!ground, `${c.name} plays at a real ground: ${ground}`);
  claim(!/[—–]/.test(`${read} ${c.city} ${c.country}`), `${c.name} carries a long dash`);
}
for (const s of SUMMIT_FINAL_STADIUMS) {
  claim(!REAL_GROUNDS.some(g => s.includes(g)) && !realWordIn(s) && !NICKNAMES.some(n => s.includes(n)), `the final ground ${s} is a real one`);
}
// and the whole-word test does see what it is there to see (a fixed probe, so a weakened test fails here)
claim(realWordIn('ארסנל הצפונית') === 'ארסנל' && realWordIn('הארסנל') === 'ארסנל' && realWordIn('ומילאן') === 'מילאן', 'the real-name test misses a real name');
claim(realWordIn('מילאנו אדומה') === null && realWordIn('טורינו בשחור לבן') === null, 'the real-name test refuses a city he approved');

/* ------------------------------------------------- 4. grounds and flares */
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
for (const c of EURO_SUMMIT_CLUBS) {
  claim(c.stadium.trim().length >= 4, `${c.name} has no ground`);
  claim(Array.isArray(c.flares) && c.flares.length === 2 && c.flares.every(f => HEX.test(f)), `${c.name} has no pair of flares`);
  claim(c.flares.every(f => lum(f) >= 0.035), `${c.name} burns a flare too dark to read as fire: ${c.flares.join(' ')}`);
  claim(c.flares[0] !== c.flares[1], `${c.name} burns one colour twice`);
}
// two clubs of one city may share a ground (the Milan two); anyone else has one of their own
const grounds = new Map<string, string[]>();
for (const c of EURO_SUMMIT_CLUBS) grounds.set(c.stadium, [...(grounds.get(c.stadium) ?? []), c.city]);
claim([...grounds.values()].every(cities => new Set(cities).size === 1), 'two clubs of different cities share a ground');
claim(SUMMIT_FINAL_STADIUMS.length >= 6 && new Set(SUMMIT_FINAL_STADIUMS).size === SUMMIT_FINAL_STADIUMS.length, 'fewer than six final grounds, or one twice');
claim(SUMMIT_FINAL_STADIUMS.every(s => !grounds.has(s)), 'a final ground is a club\'s home');
const finals = Array.from({ length: 6 }, (_, i) => summitFinalStadium(i + 1));
claim(new Set(finals).size === 6 && summitFinalStadium(3) === summitFinalStadium(3) && summitFinalStadium(1) !== summitFinalStadium(2), 'the final does not move between grounds by season');

/* ------------------------------------------------- 4b. the emblems (Itzik, 8.11.2026) */
// his table, club by club, and none of them the mark a real club is known by
const EMBLEMS: Record<string, string> = {
  'מדריד השנהבית': 'star8', 'הפייטרים ממדריד': 'swords', 'קטלוניה הגדולה': 'lighthouse', "מנצ'סטר הטקסטילית": 'spool',
  "מנצ'סטר התכולה": 'bee', 'נמל המרסי': 'anchor', 'לונדון הכחולה': 'clocktower', 'צפון לונדון האדומה': 'arrow',
  'מינכן הבווארית': 'peak', 'דורטמונד צהובה': 'pickaxes', 'טורינו בשחור לבן': 'castle', 'מילאנו אדומה': 'spires',
  'מילאנו הכחולה': 'moonstars', 'אלופי דרום איטליה': 'volcano', 'פריז הענקית': 'bridge', 'הכחולים מפורטוגל': 'ship',
  'ליסבון האדומה': 'sun', 'הלהבה מאיסטנבול': 'flame', 'גלזגו הירוקה': 'thistle', 'המשוגעים של אמסטרדם': 'windmill',
};
const REAL_MARKS = ['crown', 'eagle', 'lion', 'dragon', 'serpent', 'snake', 'zebra', 'bull', 'devil', 'cannon', 'liverbird',
  'eiffel', 'fleur', 'lily', 'clover', 'shamrock', 'cross', 'bear', 'tree', 'cockerel', 'wolf', 'griffin'];
for (const c of EURO_SUMMIT_CLUBS) {
  claim(c.emblem === EMBLEMS[c.name], `${c.name} carries ${c.emblem}, his table says ${EMBLEMS[c.name]}`);
  claim(!REAL_MARKS.some(m => String(c.emblem).includes(m)), `${c.name} carries a real club's mark: ${c.emblem}`);
}
claim(new Set(EURO_SUMMIT_CLUBS.map(c => c.emblem)).size === 20, 'two summit crests carry the same emblem');

/* ------------------------------------------------- 5. the pools */
claim(poolFor(0) === EURO_CLUBS && poolFor(1) === EURO_SUMMIT_CLUBS, 'the pools are not ליגת אירופה at 0 and the summit at 1');
claim(ALL.every(c => euroClub(c.id) === c), 'an id of one of the tiers does not find its club');
claim(summitClub('eu2-munich')?.rating === 89 && summitClub('eu-belgrade') === undefined, 'summitClub answers for the wrong tier');

/* ------------------------------------------------- 6. names for every summit country */
for (const country of new Set(EURO_SUMMIT_CLUBS.map(c => c.country))) {
  const bank = EURO_NAMES[country];
  claim(!!bank && bank.first.length >= 12 && bank.last.length >= 12, `${country} has no bank of twelve and twelve`);
  const used = new Set<string>();
  const rng = createRng(31);
  const made = Array.from({ length: 18 }, () => makeEuroName(rng, country, used));
  claim(made.every(n => !/^שחקן /.test(n) && !/\d/.test(n)), `${country} falls back to numbered players`);
}

/* ------------------------------------------------- 7. קייב הכחולה */
{
  const k = euroClub('eu-amsterdam');
  claim(!!k && k.name === 'קייב הכחולה' && k.city === 'קייב' && k.country === 'אוקראינה', 'eu-amsterdam is not קייב הכחולה of Kyiv, Ukraine');
  claim(!!k && k.short !== 'קייב' && k.short !== euroClub('eu-kyiv')?.short, 'the two Kyiv clubs share a short name');
  claim(!ALL.some(c => c.name === 'ר.ב אמסטרדם'), 'ר.ב אמסטרדם is still a club');
  const old = {
    namesVersion: 1,
    chronicle: [{ id: 'euro-s3', title: 'ההדחה', body: 'ר.ב אמסטרדם הדיחה אותנו ברבע הגמר, ובאמסטרדם חגגו.' }],
    news: ['מול ר.ב אמסטרדם בשמינית'],
    euroSeen: [{ id: 'eu-amsterdam', name: 'ר.ב אמסטרדם', short: 'ר.ב אמסטרדם', city: 'אמסטרדם' }],
  };
  const s = renameLegacy(JSON.parse(JSON.stringify(old))) as typeof old;
  claim(NAMES_VERSION === 2, `the renames are at set ${NAMES_VERSION}, the Kyiv set is 2`);
  claim(s.chronicle[0].body === 'קייב הכחולה הדיחה אותנו ברבע הגמר, ובאמסטרדם חגגו.', `the chronicle: ${s.chronicle[0].body}`);
  claim(s.news[0] === 'מול קייב הכחולה בשמינית', `the news: ${s.news[0]}`);
  claim(s.euroSeen[0].name === 'קייב הכחולה' && s.euroSeen[0].short === 'קייב הכחולה' && s.euroSeen[0].id === 'eu-amsterdam', 'a stored club kept its old name or lost its id');
  claim(s.namesVersion === 2, 'the save is not marked with the new set');
  const twice = renameLegacy(JSON.parse(JSON.stringify(s)));
  claim(JSON.stringify(twice) === JSON.stringify(s), 'a second walk changed a renamed save');
}

/* ------------------------------------------------- 8. the agreed numbers */
claim(JSON.stringify(SUMMIT_STAGE_TARGET) === '[82,85,87,89]', `summit targets ${JSON.stringify(SUMMIT_STAGE_TARGET)}, agreed 82 / 85 / 87 / 89`);
claim(SUMMIT_STAGE_TARGET[3] <= 89, 'the summit final is past 89 without Itzik');
claim(SUMMIT_CENTRE === 87, 'a summit club does not play at its rating against 87');
claim(JSON.stringify(SUMMIT_PRIZE) === '[0,600000,1400000,2600000,4500000]', `summit prizes ${JSON.stringify(SUMMIT_PRIZE)}`);
claim(prizeTotal(4, 1) === 9_100_000, `the whole summit road pays ${prizeTotal(4, 1)}, agreed 9.1M`);
claim(prizeFor(4, 1) === 4_500_000 && prizeFor(1, 1) === 600_000 && prizeFor(0, 1) === 0, 'a summit round does not pay its prize');
claim(prizeFor(4) === PRIZE[4] && prizeFor(4, 0) === 2_200_000 && prizeTotal(4, 0) === 4_500_000, 'the lower tier\'s prizes moved');
claim(SUMMIT_TRAVEL === 250_000 && SUMMIT_SECURITY === 250_000 && travelFor(1) === 250_000 && securityFor(1) === 250_000, 'summit travel or security is not 250K');
claim(travelFor(0) === TRAVEL && securityFor(0) === SECURITY && TRAVEL === 150_000 && SECURITY === 175_000, 'the lower tier\'s travel or security moved');
claim(JSON.stringify(STAGE_TARGET) === '[74,78,82,84]', 'the lower tier\'s targets moved');
claim(SUMMIT_FIRST_GEMS === 5 && SUMMIT_TITLE_GEMS === 15, 'the gems are not 5 on the first summit season and 15 a summit trophy');
claim(competitionName(1) === 'פסגת אירופה' && competitionName(0) === 'ליגת אירופה', 'the tiers are not named פסגת אירופה and ליגת אירופה');

// a new career carries no standing: newGame stays byte for byte as it was (onboardv2-flag-check), read with ?? emptySummit()
claim(G.newGame(5).summit === undefined && JSON.stringify(G.emptySummit()) === '{"unlocked":false,"firstEntryGemPaid":false,"titles":0,"rested":{}}', 'a new career starts with a standing, or the empty standing is not empty');

/* ------------------------------------------------- 9. the draw by level */
{
  const ME = 'me';
  const up = drawEuro(77, ME, 4, 1), up2 = drawEuro(77, ME, 4, 1), low = drawEuro(77, ME, 4, 0);
  const field = up.clubs.map(c => c.id).filter(id => id !== ME);
  claim(up.level === 1 && low.level === 0, 'a draw does not carry its level');
  claim(JSON.stringify(up) === JSON.stringify(up2), 'the same seed drew two different summits');
  claim(field.length === 15 && field.every(id => id.startsWith('eu2-')) && up.rested.length === 5 && up.rested.every(id => id.startsWith('eu2-')), 'the summit draw is not fifteen of the summit and five rested');
  claim(new Set([...field, ...up.rested]).size === 20, 'the summit field and its rested are not the twenty once each');
  claim(low.clubs.every(c => c.id === ME || c.id.startsWith('eu-')) && low.rested.every(id => id.startsWith('eu-')), 'the lower tier draws a summit club');
  claim(up.clubs.every(c => c.id === ME ? c.edge === 0 : c.edge === (summitClub(c.id)!.rating - 87)), 'a summit club does not play at its own rating');
  const munich = drawEuro(1, ME, 4, 1, ['eu2-munich']);
  // Itzik, 9.11.2026: nobody past 89, the final included
  claim(strengthOf(munich, 'eu2-munich', 0) === 84 && strengthOf(munich, 'eu2-munich', 2) === 89 && strengthOf(munich, 'eu2-munich', 3) === 89, `מינכן plays at ${strengthOf(munich, 'eu2-munich', 0)}, ${strengthOf(munich, 'eu2-munich', 2)} and ${strengthOf(munich, 'eu2-munich', 3)}, wanted 84, 89 and 89`);
  claim(SUMMIT_CAP === 89 && EURO_SUMMIT_CLUBS.every(c => [0, 1, 2, 3].every(r => strengthOf(drawEuro(2, ME, 4, 1, [c.id]), c.id, r) <= 89)), 'a summit club plays past 89');
  // the lower tier never reaches 89 with its own edges, so a club is given an edge of ten to prove the cap is not there
  const big = { ...low, clubs: low.clubs.map(c => c.id === ME ? c : { ...c, edge: 10 }) };
  const other = big.clubs.find(c => c.id !== ME)!.id;
  claim(strengthOf(big, other, 3) === 94, `the cap reached the lower tier: ${strengthOf(big, other, 3)}, wanted 94`);
  const weak = drawEuro(1, ME, 4, 1, ['eu2-amsterdam-mad']);
  claim(strengthOf(weak, 'eu2-amsterdam-mad', 3) === 87, 'an 85 club does not play the final at 87');
}

/* ------------------------------------------------- 10 to 13: a real summer */
function topCareer(seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  // the same men, carried to the top flight: every club of the division at tier 5
  return { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier: 5 })) }, phase: 'season-end' as const };
}
function seasonEnd(gs: G.GameState, champion: boolean, unlocked: boolean, licence: string, extra: Partial<G.GameState> = {}): G.GameState {
  const pts = champion ? 99 : 0;
  // a title, or another club ninety nine points clear of him
  const other = gs.league.clubs.find(c => c.id !== gs.clubId)!.id;
  const table = { ...gs.league.table, [gs.clubId]: { ...gs.league.table[gs.clubId], pts, won: champion ? 14 : 0, played: 14 },
    ...(champion ? {} : { [other]: { ...gs.league.table[other], pts: 99, won: 14, played: 14 } }) };
  return { ...gs, league: { ...gs.league, table }, summit: { ...G.emptySummit(), ...(gs.summit ?? {}), unlocked }, coach: { ...gs.coach, licence: licence as never }, ...extra };
}
const base = topCareer();
const titleOf = (n: G.GameState) => n.notices.map(x => (x as { title?: string }).title ?? '');
{
  // the six: champion or not, standing or not, licence or not
  for (const champ of [true, false]) for (const unlocked of [true, false]) for (const lic of ['international', 'pro']) {
    const n = G.startNextSeason(seasonEnd(base, champ, unlocked, lic));
    const want = !champ ? null : unlocked && lic === 'international' ? 1 : 0;
    const got = n.euro ? n.euro.level : null;
    claim(got === want, `champion ${champ}, standing ${unlocked}, licence ${lic}: tier ${got}, wanted ${want}`);
    const waiting = titleOf(n).includes('פסגת אירופה מחכה לרישיון');
    claim(waiting === (champ && unlocked && lic !== 'international'), `champion ${champ}, standing ${unlocked}, licence ${lic}: the licence word ${waiting ? 'shown' : 'missing'}`);
  }
  claim(summitLevel(true, 'international') === 1 && summitLevel(true, 'pro') === 0 && summitLevel(false, 'international') === 0, 'summitLevel is not standing and the international licence');
}
/* 11. the gems */
{
  const plain = G.startNextSeason(seasonEnd(base, true, false, 'international'));
  const first = G.startNextSeason(seasonEnd(base, true, true, 'international'));
  claim(first.gems - plain.gems === SUMMIT_FIRST_GEMS, `the first summit season pays ${first.gems - plain.gems} gems over a plain one, agreed 5`);
  claim(first.summit.firstEntryGemPaid === true, 'the first summit gems are not marked as paid');
  const again = G.startNextSeason(seasonEnd({ ...base, summit: first.summit }, true, true, 'international'));
  claim(again.euro?.level === 1 && again.gems - plain.gems === 0, 'the summit pays its first-season gems a second time');
  claim(titleOf(first).includes('פסגת אירופה') && titleOf(again).includes('פסגת אירופה'), 'the hub does not say the summit is on');
}
/* 12. a trophy on the night, by level */
function finalLevel(gs: G.GameState, level: 0 | 1): G.GameState {
  const e = drawEuro(9, gs.clubId, gs.season, level);
  const opp = e.clubs.find(c => c.id !== gs.clubId)!.id;
  const fin = { ...e, round: EURO_ROUNDS - 1, leg: 0, ties: [...e.ties, [], [], [{ a: gs.clubId, b: opp, legs: [] }]] };
  return { ...gs, phase: 'hub', week: 13, euro: recordMyLeg(fin, gs.clubId, [1, 1]) };
}
{
  const hub = { ...topCareer(), phase: 'hub' as const };
  const s1 = finalLevel(hub, 1), s0 = finalLevel(hub, 0);
  const won1 = G.finishEuroPens(s1, [5, 4]), won0 = G.finishEuroPens(s0, [5, 4]), lost1 = G.finishEuroPens(s1, [2, 4]);
  claim(won1.euro?.status === 'won' && won1.summit.titles === 1 && won1.gems - s1.gems === SUMMIT_TITLE_GEMS, `a summit trophy: titles ${won1.summit.titles}, gems +${won1.gems - s1.gems}`);
  claim(won1.meters.money - s1.meters.money === 4_500_000, `a summit trophy pays ${won1.meters.money - s1.meters.money}`);
  claim(won0.euro?.status === 'won' && won0.summit.unlocked === true && won0.summit.titles === 0 && won0.gems === s0.gems, 'a ליגת אירופה trophy does not open the summit, or pays summit gems');
  claim(won0.meters.money - s0.meters.money === 2_200_000, `a ליגת אירופה trophy pays ${won0.meters.money - s0.meters.money}`);
  claim((lost1.summit?.titles ?? 0) === 0 && lost1.gems === s1.gems && !lost1.summit?.unlocked, 'a lost summit final counts or pays');
  // 13. the chronicle names its tier
  const c1 = G.settleEuroSeason({ ...won1, season: won1.euro!.season }), c0 = G.settleEuroSeason({ ...won0, season: won0.euro!.season });
  const line = (g: G.GameState) => g.chronicle.find(c => /^euro-s\d+$/.test(c.id))?.title ?? '';
  claim(line(c1) === 'פסגת אירופה: הגביע אצלנו', `the summit chronicle reads ${line(c1)}`);
  claim(line(c0) === 'ליגת אירופה: הגביע אצלנו', `the lower tier's chronicle reads ${line(c0)}`);
  /* 14. a save from before */
  const strip = (g: G.GameState) => { const raw = JSON.parse(JSON.stringify(g)); delete raw.summit; return raw as G.GameState; };
  lsStore.clear(); saveCareer(strip(c0)); const back0 = loadCareer();
  claim(!!back0 && back0.summit.unlocked === true && back0.summit.firstEntryGemPaid === false, 'an old save with a ליגת אירופה won does not get the standing');
  lsStore.clear(); saveCareer(strip(hub)); const backNone = loadCareer();
  claim(!!backNone && backNone.summit.unlocked === false && backNone.summit.titles === 0, 'an old save that never won gets the standing');
  lsStore.clear(); saveCareer(strip(won0)); const backLive = loadCareer();
  claim(!!backLive && backLive.summit.unlocked === true, 'an old save with this season\'s ליגת אירופה won does not get the standing');
  const running = finalLevel({ ...hub, summit: { ...G.emptySummit(), unlocked: true }, coach: { ...hub.coach, licence: 'international' } }, 0);
  lsStore.clear(); saveCareer(running); const backRun = loadCareer();
  claim(backRun?.euro?.level === 0, 'a ליגת אירופה already running moved to the summit on load');
}
/* 12b. a summit night away costs the summit's travel, played in the real engine */
{
  const hub = { ...topCareer(), phase: 'hub' as const, week: 2 };
  let gs: G.GameState = { ...hub, euro: drawEuro(31, hub.clubId, hub.season, 1) };
  let night = G.euroNight(gs, true)!;
  // the away leg: when the first is at home, it is written in and the return is the one played
  if (night.host === true) { gs = { ...gs, week: 3, euro: recordMyLeg(gs.euro!, gs.clubId, [1, 0]) }; night = G.euroNight(gs, true)!; }
  claim(!!night && night.host === false, 'no away summit night to play');
  const st = L.createLive(G.euroMatchInput(gs, true));
  let guard = 0;
  while (st.phase !== 'done' && guard++ < 4000) {
    if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
    if (st.phase === 'moment') { st.pending = null as never; st.phase = 'play'; continue; }
    L.step(st);
  }
  const after = G.commitEuroLeg(gs, L.finalize(st), L.mySide(st).onPitch.map(p => p.id), true);
  const paidOut = gs.meters.money - after.meters.money - (after.euro!.status === 'on' && after.euro!.round > gs.euro!.round ? -SUMMIT_PRIZE[after.euro!.round] : 0);
  claim(paidOut === SUMMIT_TRAVEL, `an away summit night cost ${paidOut}, the summit's travel is ${SUMMIT_TRAVEL}`);
}

/* 15. each tier keeps its own queue */
{
  // a career that comes into the summit from ליגת אירופה with a summit queue already kept (not a road the game has
  // today, the standing and the licence never go; kept so each queue stays honest if one ever can): the summit queue
  const kept = drawEuro(5, base.clubId, 1, 1).rested;
  const low = drawEuro(6, base.clubId, 1, 0);
  const back = G.startNextSeason(seasonEnd({ ...base, euro: low, summit: { ...G.emptySummit(), unlocked: true, rested: { '1': kept } } }, true, true, 'international'));
  claim(back.euro?.level === 1 && kept.every(id => back.euro!.clubs.some(c => c.id === id)), 'the summit queue was not read when the summit came round again');
  const after0 = G.startNextSeason(seasonEnd(base, true, false, 'international'));        // ליגת אירופה drawn
  const lowRested = after0.euro!.rested;
  const toSummit = G.startNextSeason(seasonEnd({ ...base, euro: after0.euro, summit: after0.summit }, true, true, 'international'));
  claim(toSummit.euro?.level === 1 && JSON.stringify(toSummit.summit.rested['0']) === JSON.stringify(lowRested), 'the lower tier\'s rested were lost on the way up');
  const sumRested = toSummit.euro!.rested;
  const nextSummit = G.startNextSeason(seasonEnd({ ...base, euro: toSummit.euro, summit: toSummit.summit }, true, true, 'international'));
  claim(sumRested.every(id => nextSummit.euro!.clubs.some(c => c.id === id)), 'the summit clubs rested last season were not preferred into the next summit draw');
  claim(JSON.stringify(nextSummit.summit.rested['0']) === JSON.stringify(lowRested), 'the lower tier\'s queue moved during the summit seasons');
}

/* ------------------------------------------------- 16. the gold road */
{
  const ME = 'me';
  const st = (e: ReturnType<typeof drawEuro>) => summitStops(e, ME).map(x => x.state).join(' ');
  const fresh = drawEuro(11, ME, 2, 1);
  claim(st(fresh) === 'now ahead ahead ahead', `a fresh summit reads ${st(fresh)}`);
  claim(summitStops(fresh, ME)[0].oppId !== null && summitStops(fresh, ME)[1].oppId === null, 'the last sixteen has no opponent, or the quarter has one before its draw');
  claim(summitStops(fresh, ME).map(x => x.name).join(',') === 'שמינית הגמר,רבע הגמר,חצי הגמר,הגמר', 'the stops are not the four rounds');
  const r16 = advanceRound(playAiRound(recordMyLeg(recordMyLeg(fresh, ME, [2, 1]), ME, [1, 1]), ME, 5), ME);
  claim(st(r16) === 'done now ahead ahead', `after the last sixteen it reads ${st(r16)}`);
  claim(summitStops(r16, ME)[0].score === '3:2', `the last sixteen's score reads ${summitStops(r16, ME)[0].score}, his goals first`);
  const lostQ = advanceRound(playAiRound(recordMyLeg(recordMyLeg(r16, ME, [0, 1]), ME, [0, 2]), ME, 6), ME);
  claim(st(lostQ) === 'done out gone gone', `out in the quarter it reads ${st(lostQ)}`);
  const pens = settleMyPens(recordMyLeg(recordMyLeg(r16, ME, [1, 0]), ME, [0, 1]), ME, [5, 4]);
  claim(summitStops(pens, ME)[1].score === '1:1 (5:4 פנ׳)' && summitStops(pens, ME)[1].state === 'done', `a shootout won reads ${summitStops(pens, ME)[1].score}`);
  let w = advanceRound(playAiRound(pens, ME, 7), ME);
  w = advanceRound(playAiRound(recordMyLeg(recordMyLeg(w, ME, [2, 0]), ME, [1, 1]), ME, 8), ME);
  w = advanceRound(playAiRound(recordMyLeg(w, ME, [2, 1]), ME, 9), ME);
  claim(w.status === 'won' && st(w) === 'done done done done', `a summit won reads ${st(w)}`);
}

/* ------------------------------------------------- 17. where the gold is worn */
const appSrc = readFileSync('src/ui/App.tsx', 'utf8');
const hubSrc = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
const seasonSrc = readFileSync('src/ui/screens/SeasonEnd.tsx', 'utf8');
const bracketSrc = readFileSync('src/ui/screens/EuroBracket.tsx', 'utf8');
claim(appSrc.includes("gs.phase === 'euro-match' || gs.phase === 'euro-pens' || gs.phase === 'euro-draw' || gs.phase === 'euro-bracket' ? (gs.euro?.level === 1 ? 'summit' : 'euro') :"), 'the frame is not summit for a summit competition\'s screens, euro for the lower tier');
claim(appSrc.includes('<EliteDefs />'), 'the gold gradients are not on the page');
claim((hubSrc.match(/data-summit=\{level === 1 \? '1' : undefined\}/g) ?? []).length === 2 && hubSrc.includes("data-summit={top ? '1' : undefined}"), 'a hub card wears the summit at the lower tier, or not at the summit');
claim(/gs\.euro\?\.level === 1 && gs\.euro\.status !== 'out' && <SummitHubCard/.test(hubSrc), 'the gold road is shown on the hub outside the summit, or after he is out');
claim(seasonSrc.includes('if (v.level === 1) return (') && seasonSrc.includes("className=\"tile-flat el-season\""), 'the season card is not black and gold at the summit');
claim(bracketSrc.includes('{e?.level === 1 && <><EliteRule /><SummitPath euro={e} myId={gs.clubId} /></>}'), 'the bracket does not show the gold road at the summit only');
{
  const hubSummit = (h: string) => /{night && <EuroHero night={night} level={gs\.euro\?\.level \?\? 0} onGo={onEuro} \/>}/.test(h);
  claim(hubSummit(hubSrc), 'the night card is not told its level');
}

/* ------------------------------------------------- 18. the look's own rules */
// read without its comments, so a comment above a rule is not taken for its selector
const cssSrc = readFileSync('src/ui/summit.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
claim(readFileSync('src/main.tsx', 'utf8').includes("import './ui/summit.css';"), 'the summit sheet is not loaded');
claim(/family=Frank\+Ruhl\+Libre:wght@700;900/.test(readFileSync('index.html', 'utf8')) && /display=swap/.test(readFileSync('index.html', 'utf8')), 'Frank Ruhl Libre is not loaded, or not with swap');
{
  const tok = (name: string) => cssSrc.match(new RegExp(`--${name}:(#[0-9A-Fa-f]{6})`))?.[1] ?? '#000000';
  const L = (hex: string) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a: string, b: string) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const bg of ['el-bg1', 'el-bg2', 'el-bg3']) for (const ink of ['el-ink', 'el-ink-dim']) {
    claim(ratio(tok(ink), tok(bg)) >= 7, `${ink} on ${bg} is ${ratio(tok(ink), tok(bg)).toFixed(1)}:1, under 7:1`);
  }
  const frames = [...cssSrc.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1]);
  const used = [...cssSrc.matchAll(/animation:([\w-]+)/g)].map(m => m[1]).filter(u => u !== 'none');
  const reduced = cssSrc.slice(cssSrc.indexOf('@media (prefers-reduced-motion:reduce)'));
  claim(frames.length >= 4 && used.every(u => frames.includes(u)), 'an animation names no keyframes');
  // every selector that moves is stopped by name in the reduced-motion block (animation:none)
  const stoppedRules = [...reduced.matchAll(/([^{}]+){[^{}]*animation:none[^{}]*}/g)].flatMap(m => m[1].split(',').map(x => x.trim()));
  const moving = [...cssSrc.slice(0, cssSrc.indexOf('@media (prefers-reduced-motion:reduce)')).matchAll(/([^{}]+){[^{}]*animation:[\w-]+/g)]
    .flatMap(m => m[1].split(',').map(x => x.trim())).filter(sel => !sel.startsWith('@') && !sel.includes('@media'));
  claim(moving.length >= 5, `only ${moving.length} moving selectors found, the reader of the sheet is broken`);
  for (const sel of moving) claim(stoppedRules.includes(sel), `${sel} keeps moving under reduced motion`);
  const infinite = [...cssSrc.matchAll(/([^{}]+)\{[^{}]*infinite[^{}]*\}/g)].map(m => m[1].trim());
  // two things may repeat for as long as they are on: the hub's main button, and the crowd of a close summit finish (R6)
  claim(JSON.stringify(infinite.slice().sort()) === JSON.stringify(['.el-breathe', '.el-tense-crowd']), `what repeats forever: ${infinite.join(' | ') || 'nothing'}, only the hub's main button and the tense crowd may`);
  claim(/el-breathe/.test(hubSrc) && !/el-breathe/.test(bracketSrc + seasonSrc), 'the breath is not on the hub\'s main summit button, or is somewhere else');
  // foil: every element that wears it is set at 22px or more
  const tsx = ['src/ui/screens/SeasonEnd.tsx', 'src/ui/screens/Hub.tsx', 'src/ui/screens/EuroBracket.tsx', 'src/ui/screens/EuroDraw.tsx', 'src/ui/components/SummitPath.tsx', 'src/ui/components/Elite.tsx',
    'src/ui/components/SummitEntrance.tsx', 'src/ui/components/RivalCard.tsx', 'src/ui/components/TrophyCeremony.tsx'].map(p => readFileSync(p, 'utf8')).join('\n');
  const foils = [...tsx.matchAll(/el-foil-text[^>]*fontSize: (\d+)/g)].map(m => Number(m[1]));
  const foilUses = (tsx.match(/el-foil-text/g) ?? []).length;
  claim(foilUses >= 1 && foils.length === foilUses && foils.every(n => n >= 22), `foil below 22px or without a size: ${foils.join(', ')} of ${foilUses}`);
  claim(/\.el-foil-text\{color:var\(--el-g3\);\}/.test(cssSrc), 'foil has no plain gold underneath');
  claim(/:focus-visible\{outline:2px solid var\(--el-g4\)/.test(cssSrc), 'a gold button has no focus ring of its own');
}

/* ------------------------------------------------- 19. the elite crest */
{
  const crest = readFileSync('src/ui/components/Crest.tsx', 'utf8');
  const elite = readFileSync('src/ui/components/Elite.tsx', 'utf8');
  const path = readFileSync('src/ui/components/SummitPath.tsx', 'utf8');
  claim(crest.includes('const top = summitClub(club.id);') && crest.includes('if (top && elite !== false) return <EliteCrest'), 'a summit club does not wear the elite crest');
  claim(crest.includes('const stars = Math.max(1, Math.min(5, rating - 84));'), 'the stars are not the rating, one at 85 to five at 89');
  const names = [...elite.matchAll(/^  ([a-z0-9]+): /gm)].map(m => m[1]);
  const wanted = Object.values(EMBLEMS).sort();
  claim(JSON.stringify(names.slice().sort()) === JSON.stringify(wanted), `the drawn emblems are not his twenty: ${names.join(', ')}`);
  const eliteCrest = crest.slice(crest.indexOf('function EliteCrest'));
  const stage3 = ['SummitEntrance', 'RivalCard', 'TrophyCeremony'].map(n => [`${n}.tsx`, readFileSync(`src/ui/components/${n}.tsx`, 'utf8')] as const);
  for (const [what, src] of [['Elite.tsx', elite], ['SummitPath.tsx', path], ['the elite crest', eliteCrest], ...stage3] as const) {
    claim(!/#[0-9A-Fa-f]{3,6}\b|rgba?\(/.test(src), `${what} writes a colour outside the tokens`);
  }
  // the plain crest is drawn exactly as it was for every club that is not of the summit
  claim(crest.includes("fontFamily=\"Heebo, Rubik, sans-serif\" fontWeight=\"900\" fontSize=\"38\""), 'the plain crest changed');
}

/* ------------------------------------------------- 20. the files, in one list and in the doc */
{
  const ids = SUMMIT_ASSETS.map(a => a.id);
  claim(new Set(ids).size === ids.length, 'two summit files share an id');
  for (const a of SUMMIT_ASSETS) {
    const ext = a.kind === 'video' ? 'mp4' : 'webp';
    claim(a.path === `/summit/${a.id}.${ext}` && /^[a-z]+\/[a-z0-9-]+$/.test(a.id) && a.id.startsWith(a.group + '/'), `${a.id} is not named public/summit/<group>/<name>.${ext}: ${a.path}`);
    claim(a.kind === 'image' ? a.poster === undefined : a.poster === `/summit/${a.id}.webp`, `${a.id} has no poster beside it, or an image has one`);
  }
  for (const c of EURO_SUMMIT_CLUBS) {
    claim(ids.includes(`entrance/${c.id}`) && ids.includes(`crest/${c.id}`), `${c.name} has no entrance clip or crest picture in the list`);
  }
  for (const want of ['entrance/home', 'entrance/final', 'trophy/ceremony', 'share/bg', 'map/path-bg', 'reel/win-base', ...COACH_CLIPS.map(n => `coach/${n}`), ...BOOK_MOMENTS.map(n => `book/${n}`)]) {
    claim(ids.includes(want), `the list has no ${want}`);
  }
  claim(SUMMIT_ASSETS.length === 64 && COACH_CLIPS.length === 6 && BOOK_MOMENTS.length >= 10 && BOOK_MOMENTS.length <= 14, `the list holds ${SUMMIT_ASSETS.length} files, 64 agreed`);
  const doc = readFileSync('HIGGSFIELD-SUMMIT.md', 'utf8');
  const headed = [...doc.matchAll(/^### `([a-z]+\/[a-z0-9-]+)`/gm)].map(m => m[1]);
  for (const id of ids) claim(headed.includes(id), `HIGGSFIELD-SUMMIT.md has no prompt for ${id}`);
  for (const id of headed) claim(ids.includes(id), `HIGGSFIELD-SUMMIT.md asks for ${id}, which the code never loads`);
  const negs = [...doc.matchAll(/negative: ([^\n]+)/g)].map(m => m[1]);
  claim(negs.length >= 6 && negs.every(n => /\btext\b/.test(n) && /\bletters\b/.test(n) && /\blogos\b/.test(n)), 'a negative prompt does not forbid text, letters and logos');
  const blocks = [...doc.matchAll(/```\n([\s\S]*?)```/g)].map(m => m[1]).filter(b => !b.startsWith('ffmpeg'));
  claim(blocks.length >= 7, `only ${blocks.length} prompt skeletons`);
  const realHit = [doc].map(d => REAL_GROUNDS.find(g => d.includes(g)) ?? NICKNAMES.find(n => d.includes(n)) ?? null)[0];
  claim(!realHit, `HIGGSFIELD-SUMMIT.md names a real ground or nickname: ${realHit}`);
  const englishReal = ['Real Madrid', 'Barcelona', 'Atletico', 'Manchester', 'Liverpool', 'Chelsea', 'Arsenal', 'Bayern', 'Dortmund', 'Juventus', 'Milan', 'Inter', 'Napoli', 'Paris Saint', 'Porto', 'Benfica', 'Galatasaray', 'Celtic', 'Ajax', 'Champions League', 'Bernabeu', 'Anfield', 'Old Trafford', 'San Siro'];
  const inPrompt = englishReal.filter(w => blocks.some(b => b.includes(w)) || [...doc.matchAll(/\{[A-Z]+\} = ([^\n]+)/g)].some(m => m[1].includes(w)));
  claim(inPrompt.length === 0, `a prompt names a real club, competition or ground: ${inPrompt.join(', ')}`);
  claim(/guide\.webp/.test(doc) && /celebrate\.mp4/.test(doc) && /flat vector illustration/i.test(doc), 'the coach clips do not take the existing coach as their reference');
  // no screen names a summit file by hand, and nothing is kept on the phone
  const ui = ['src/ui/App.tsx', 'src/ui/screens/Hub.tsx', 'src/ui/screens/Match.tsx', 'src/ui/screens/SeasonEnd.tsx', 'src/ui/screens/EuroBracket.tsx',
    'src/ui/components/SummitEntrance.tsx', 'src/ui/components/RivalCard.tsx', 'src/ui/components/TrophyCeremony.tsx', 'src/ui/components/SummitPath.tsx']
    .map(p => [p, readFileSync(p, 'utf8')] as const);
  for (const [p, src] of ui) claim(!/['"`]\/?summit\//.test(src), `${p} names a summit file by hand instead of through the list`);
  const sw = readFileSync('public/sw.js', 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  claim(!/caches\.open|addAll|respondWith/.test(sw), 'the service worker keeps files: the summit files would be precached');
  const hook = readFileSync('src/ui/summitAsset.ts', 'utf8');
  claim(/export const SUMMIT_ASSET_WAIT = (\d+);/.test(hook) && Number(hook.match(/SUMMIT_ASSET_WAIT = (\d+)/)![1]) <= 400, 'a summit file is waited on for more than 400ms');
  claim(hook.includes('v.onerror = () => done(false);') && hook.includes('img.onerror = () => done(false);'), 'a missing summit file is not caught');
  for (const n of ['SummitEntrance', 'TrophyCeremony']) {
    const src = readFileSync(`src/ui/components/${n}.tsx`, 'utf8');
    claim(src.includes('onError={() => setBroken(true)}'), `${n}: a clip that breaks while playing does not fall back`);
  }
}

/* ------------------------------------------------- 21. the entrance */
{
  const ent = readFileSync('src/ui/components/SummitEntrance.tsx', 'utf8');
  const ms = Number(ent.match(/export const SUMMIT_ENTRANCE_MS = (\d+);/)?.[1]);
  const still = Number(ent.match(/export const SUMMIT_ENTRANCE_STILL_MS = (\d+);/)?.[1]);
  claim(ms >= 2000 && ms <= 3000, `the entrance runs ${ms}ms, agreed 2000 to 3000`);
  claim(still === 1500 && ent.includes('still ? SUMMIT_ENTRANCE_STILL_MS : SUMMIT_ENTRANCE_MS'), 'under reduced motion the entrance is not one still frame for 1.5 seconds');
  claim(ent.includes('onClick={end}'), 'a tap does not cut the entrance');
  // his own ground's clip is white fire: his colours, which change from career to career, are laid over it, and only there
  claim(ent.includes("const homeClip = clipId === 'entrance/home';") && ent.includes('{useClip && homeClip && (')
    && ent.includes('${data.flares[0]} 0%') && /\.el-entrance-tint\{[^}]*mix-blend-mode:color/.test(cssSrc), 'his own ground\'s clip is not tinted in his colours, or another ground\'s is');
  const rule = (sel: string) => cssSrc.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}'))?.[1] ?? '';
  claim(rule('.el-entrance').length > 0 && !/transition|animation|opacity/.test(rule('.el-entrance')), 'the entrance fades instead of cutting');
  claim(!/opacity|transition/.test(rule('.el-entrance-media')), 'the entrance picture fades');
  claim(/className="el-entrance-title el-foil-text"/.test(ent) && /\{data\.title\}/.test(ent) && /\{data\.stadium\}/.test(ent), 'the name and the ground are not drawn by the code');
  // a night of each kind
  const hub = { ...topCareer(), phase: 'hub' as const, season: 3 };
  const summitOn = (gs: G.GameState) => {
    for (let w = 1; w <= gs.league.rounds + 2; w++) { const g = { ...gs, week: w }; if (G.euroNight(g, true)) return g; }
    return null;
  };
  const s = summitOn({ ...hub, euro: drawEuro(31, hub.clubId, hub.season, 1) })!;
  claim(!!s, 'no summit night found');
  const night = G.euroNight(s, true)!;
  const homeNight = night.host ? s : null;
  const e1 = G.summitEntrance(s, true)!;
  const them = summitClub(night.oppId)!;
  if (homeNight) {
    claim(e1.title === G.club(s).name && e1.homeId === s.clubId && e1.flares.length === 2 && !e1.final, `a home night reads ${e1.title}`);
    claim(entranceAssetId(e1.homeId, e1.final) === 'entrance/home', 'his own ground does not take the home clip');
  }
  // the same night turned round: their ground
  const away = { ...s, euro: { ...s.euro!, ties: s.euro!.ties.map((r, i) => i === night.round ? r.map(t => t.a === s.clubId ? { ...t, a: t.b, b: t.a } : t) : r) } };
  const eAway = G.summitEntrance(away, true);
  const nAway = G.euroNight(away, true);
  if (eAway && nAway && nAway.host === false) {
    claim(eAway.title === them.name && eAway.stadium === them.stadium && JSON.stringify(eAway.flares) === JSON.stringify(them.flares) && eAway.homeId === them.id,
      `an away night reads ${eAway.title} at ${eAway.stadium}`);
    claim(entranceAssetId(eAway.homeId, false) === `entrance/${them.id}`, 'their ground does not take their clip');
  } else claim(false, 'the away night could not be built');
  const fin = finalLevel(hub, 1);
  const finNight = summitOn({ ...fin, euro: { ...fin.euro!, ties: fin.euro!.ties.map((r, i) => i === EURO_ROUNDS - 1 ? r.map(t => ({ ...t, legs: [] })) : r) } });
  const eFin = finNight ? G.summitEntrance(finNight, true) : null;
  claim(!!eFin && eFin.final && eFin.title === 'גמר פסגת אירופה' && (SUMMIT_FINAL_STADIUMS as readonly string[]).includes(eFin.stadium) && eFin.flares.length === 2,
    `the final reads ${eFin?.title} at ${eFin?.stadium}`);
  claim(entranceAssetId('final', true) === 'entrance/final', 'the final does not take its own clip');
  const lower = summitOn({ ...hub, euro: drawEuro(31, hub.clubId, hub.season, 0) });
  claim(!!lower && G.summitEntrance(lower, true) === null && G.summitRival(lower, true) === null, 'a night of ליגת אירופה gets the summit entrance');
  for (const c of EURO_SUMMIT_CLUBS) claim(c.flares.length === 2 && c.flares.every(f => HEX.test(f)) && c.stadium.length > 2 && !!SUMMIT_ASSETS.find(a => a.id === entranceAssetId(c.id, false)), `${c.name} lacks flares, a ground or a clip`);
  claim(G.flareOf('#141414') === '#C9A227' && G.flareOf('#C8102E') === '#C8102E', 'a black flare is not lifted to gold, or a red one is');
  const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  claim(match.includes('{entrance && !summit && clubs && euroLines && <EuroEntrance'), 'the summit night still shows ליגת אירופה\'s entrance');
  claim(match.includes("onDone={() => setSummitStep('rival')}") && match.includes('onDone={() => { setSummitStep(null); setEntrance(false); }}'), 'the entrance does not lead to the rival card and then the match');
  claim(appSrc.includes('summit={summitNightOf(gs)}'), 'the summit night is not handed to the match');
}

/* ------------------------------------------------- 22. the rival card */
{
  const card = readFileSync('src/ui/components/RivalCard.tsx', 'utf8');
  claim(/export const RIVAL_CARD_MS = 1000;/.test(card), 'the rival card does not stand for one second');
  claim(card.includes('onClick={end}') && !/animation|transition/.test(card), 'a tap does not cut the card, or it moves on its own');
  claim(/\.el-rival\{[^}]*animation:el-rival-in \.22s/.test(cssSrc), 'the card does not arrive');
  claim(card.includes("chance === null ? 'נספר'"), 'a chance not yet counted is invented instead of said');
  claim(ODDS_RUNS >= 200, `the chance counts ${ODDS_RUNS} matches, agreed at least 200`);
  claim([0, 0.024, 0.026, 0.5, 0.51, 0.99, 1].map(roundTo5).join(',') === '5,5,5,50,50,95,95', 'the chance is not rounded to 5, between 5 and 95');
  const hub = { ...topCareer(), phase: 'hub' as const, season: 3 };
  let s: G.GameState | null = null;
  for (let w = 1; w <= hub.league.rounds + 2 && !s; w++) { const g = { ...hub, week: w, euro: drawEuro(57, hub.clubId, hub.season, 1) }; if (G.euroNight(g, true)) s = g; }
  claim(!!s, 'no summit night for the card');
  if (s) {
    const input = G.euroMatchInput(s, true);
    const r = G.summitRival(s, true)!;
    claim(r.rating === sideRating(input.oppStarters), `the card says ${r.rating}, the eleven on the pitch are ${sideRating(input.oppStarters)}`);
    // the best of the eleven found here by hand, not through the function under test
    const top = Math.max(...input.oppStarters.map(p => overall(p)));
    const best = input.oppStarters.find(p => overall(p) === top)!;
    claim(keyPlayer(input.oppStarters)?.id === best.id, 'keyPlayer does not pick the best of the eleven who start');
    claim(!!r.key && r.key.name === best.name && r.key.ovr === top, `the key man is ${r.key?.name} (${r.key?.ovr}), the best of the eleven is ${best.name} (${top})`);
    const a = winChanceNow(input), b = winChanceNow(input);
    claim(a === b && a % 5 === 0, `the same night counted twice: ${a} and ${b}`);
    // every run on its own fixed seed, the same on every reload: the seeds and the run-by-run results, on a side
    // close enough to the other for the result to swing
    claim(oddsSeed(input.seed, 0) === oddsSeed(input.seed, 0) && oddsSeed(input.seed, 7) === (input.seed + 8 * 0x9e3779b1) >>> 0
      && new Set(Array.from({ length: ODDS_RUNS }, (_, i) => oddsSeed(input.seed, i))).size === ODDS_RUNS, 'the runs are not on fixed, distinct seeds');
    const even = makeSquad(90, createRng(5));
    const evenIn = { ...input, playerStarters: even.starters, playerBench: even.bench, seated: false };
    const runsA = Array.from({ length: 40 }, (_, i) => playOut(evenIn, oddsSeed(evenIn.seed, i))).join(',');
    const runsB = Array.from({ length: 40 }, (_, i) => playOut(evenIn, oddsSeed(evenIn.seed, i))).join(',');
    claim(runsA === runsB && runsA.includes('true') && runsA.includes('false'), 'the same runs did not play the same way twice, or never swing');
    const weak = makeSquad(70, createRng(9)), strong = makeSquad(96, createRng(9));
    const pWeak = winChanceNow({ ...input, playerStarters: weak.starters, playerBench: weak.bench, seated: false });
    const pStrong = winChanceNow({ ...input, playerStarters: strong.starters, playerBench: strong.bench, seated: false });
    claim(pStrong > pWeak, `a far stronger side reads ${pStrong}%, a far weaker one ${pWeak}%`);
  }
  const hubSrc2 = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  claim(hubSrc2.includes('askWinChance(G.euroMatchInput(gs))') && /const summitNight = !!night && gs\.euro\?\.level === 1;/.test(hubSrc2), 'the chance does not start counting on the hub of a summit night');
  const wc = readFileSync('src/ui/winChance.ts', 'utf8');
  claim(wc.includes("new Worker(new URL('../game/oddsWorker.ts', import.meta.url)") && wc.includes('winChance(input)'), 'the chance is not counted off the page, or has no way round a missing worker');
}

/* ------------------------------------------------- 23. the trophy */
{
  const cer = readFileSync('src/ui/components/TrophyCeremony.tsx', 'utf8');
  const ms = Number(cer.match(/export const CEREMONY_MS = (\d+);/)?.[1]);
  claim(ms >= 5000 && ms <= 6000, `the ceremony runs ${ms}ms, agreed five to six seconds`);
  claim(cer.includes('export const BUZZ_TROPHY = [60, 80, 60, 80, 200];') && cer.includes('buzz(BUZZ_TROPHY)') && cer.includes('if (!buzzed.current)'), 'the trophy does not buzz its own pattern once');
  claim(/export const CONFETTI_FULL = 150;/.test(cer) && /export const CONFETTI_LIGHT = 90;/.test(cer) && cer.includes('(isWeak ? CONFETTI_LIGHT : CONFETTI_FULL)'), 'the confetti is not 150, and 90 on a weak phone');
  claim(cer.includes('useState(still)') && cer.includes("onClick={() => (atEnd ? onDone() : setAtEnd(true))}"), 'under reduced motion the title is not there at once, or a tap does not jump to the end');
  claim(cer.includes('אלופי אירופה') && cer.includes('פסגת אירופה · עונה'), 'the ceremony does not say אלופי אירופה and the season');
  claim(appSrc.includes("before.euro?.level === 1 && before.euro.status !== 'won' && after.euro?.level === 1 && after.euro.status === 'won'"), 'the ceremony is not tied to the night the summit is won');
  claim(appSrc.includes('setGs(liftIfWon(gs, G.commitEuroLeg(gs, result, ids)))') && appSrc.includes('setGs(g => liftIfWon(g, G.finishEuroPens(g, score)))'), 'a final won in the match or in the shootout does not lift the trophy');
  claim(/\.el-ceremony-cup\[data-rise="1"\] svg\{animation:el-cup-rise 5\.6s[^}]*1 both;\}/.test(cssSrc), 'the drawn cup does not rise once');
}

/* ------------------------------------------------- 24. the last minutes */
{
  claim(TENSE_FROM === 80, `the last minutes start at ${TENSE_FROM}`);
  claim(summitTension(0, 88, [1, 1]) === 0 && summitTension(undefined, 88, [1, 1]) === 0, 'ליגת אירופה darkens its last minutes');
  claim(summitTension(1, 79, [1, 1]) === 0 && summitTension(1, 80, [1, 1]) > 0, 'the summit darkens before the 80th, or not at it');
  claim(summitTension(1, 85, [2, 1]) > 0 && summitTension(1, 85, [3, 1]) === 0 && summitTension(1, 85, [0, 2]) === 0, 'two goals apart still darkens, or one apart does not');
  claim(summitTension(1, 90, [0, 0]) === 1 && summitTension(1, 95, [0, 0]) === 1 && summitTension(1, 84, [0, 0]) < summitTension(1, 88, [0, 0]), 'the dark does not grow to the 90th');
  const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  claim(match.includes('{summit && <TenseEdges level={gs.euro?.level} minute={st.minute} score={st.score} />}'), 'the edges are not tied to the summit night');
}

/* ------------------------------------------------- 25. Itzik's answers of 9.11 */
{
  const k = euroClub('eu-amsterdam')!;
  const h = (x: string) => hue(x);
  claim(h(k.primary) >= 200 && h(k.primary) <= 240 && h(k.secondary) >= 40 && h(k.secondary) <= 60, `קייב הכחולה is ${k.primary} / ${k.secondary}, agreed blue and yellow`);
  claim(JSON.stringify(LAWYER_REVIEW) === JSON.stringify(['טורינו בשחור לבן', 'מילאנו אדומה', 'מילאנו הכחולה', 'גלזגו הירוקה']) && LAWYER_REVIEW.every(n => EURO_SUMMIT_CLUBS.some(c => c.name === n)), 'the lawyer\'s list is not the four');
  claim(GOLDEN_BOOK_SCOPE === 'finals', `the golden book takes ${GOLDEN_BOOK_SCOPE}, agreed finals and trophies`);
  claim(SUMMIT_DECIDED.length === 4 && SUMMIT_DRAFT.length === 1 && /short/.test(SUMMIT_DRAFT[0]), 'what is decided and what is still open are not his answers of 9.11');
}

console.log(`${checked} checks`);
if (fails.length) { console.log(`FAIL (${fails.length})`); for (const f of fails.slice(0, 30)) console.log('  - ' + f); process.exit(1); }
console.log('  still temporary, waiting for Itzik:\n    - ' + SUMMIT_DRAFT.join('\n    - '));
console.log('  decided by Itzik:\n    - ' + SUMMIT_DECIDED.join('\n    - '));
console.log('  for the lawyer before going live: ' + LAWYER_REVIEW.join(', '));
console.log('OK, his twenty and קייב הכחולה, the summit drawn, entered, paid and chronicled by its own rules, and ליגת אירופה as it was');
