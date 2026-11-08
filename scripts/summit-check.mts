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
 */
import {
  EURO_CLUBS, EURO_SUMMIT_CLUBS, SUMMIT_FINAL_STADIUMS, summitFinalStadium, poolFor, euroClub, summitClub,
} from '../src/data/europeClubs.ts';
import { EURO_NAMES, makeEuroName } from '../src/data/europeNames.ts';
import { renameLegacy, NAMES_VERSION } from '../src/game/renames.ts';
import { createRng } from '../src/engine/matchEngine.ts';

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

console.log(`${checked} checks`);
if (fails.length) { console.log(`FAIL (${fails.length})`); for (const f of fails.slice(0, 30)) console.log('  - ' + f); process.exit(1); }
console.log('OK, his twenty word for word, forty crests each its own, nothing real, and קייב הכחולה in old saves too');
