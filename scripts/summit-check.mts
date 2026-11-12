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
 *   7. ר.ב אמסטרדם is טחנות הזהב (the legal review of 11.11, live since 12.11; Itzik, 12.11: it stays, not קייב הכחולה),
 *      under the same id, and an old save says so
 *   0. the door: shut for players until the lawyer clears the twenty (Itzik, 12.11.2026); every test below runs with it open
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
 *  25. Itzik's answers of 9.11 and 10.11: all twenty to the lawyer in
 *      SUMMIT-LAWYER-REVIEW.md, the golden book's scope, the short names approved for now
 *
 * Stage 4, the coach in the shootout (R6):
 *  26. which of his six reactions follows each kick and the end, how each falls back to the coach the game already
 *      has, for how long, never holding the next kick, and the summit shootout dark at the edges the whole way
 *
 * Stage 5, the memory, the book, the card, the reel, the sound (R7 to R11):
 *  27. what the summit remembers: every tie against each club with what happened in it, through the career's own
 *      functions, nothing outside the summit, kept by the save, empty on a save from before
 *  28. the rivalries: forty lines and more in fifteen kinds, none without a meeting, every kind true to the history,
 *      every kind met in a long simulation, the same night the same line
 *  29. the golden book: a page for a final and a double page for the trophy only, written from the match, 25
 *      phrasings and more over a thousand finals, never the same phrasing twice running, sixty whole pages kept
 *  30. the share card: 1080 by 1350, his own club, the score, the game's mark and beapro.co.il, and no summit club
 *      at all (Itzik, 10.11); sent as a file where a phone can, and honestly where it cannot
 *  31. the five-second reel: what it says is what happened, on a five-second clock, saved only where the browser
 *      can record, still under reduced motion, no summit club in it
 *  32. the sound: off on a clean install, nothing before a touch or in a hidden tab, no file loaded, a switch that
 *      says which way it stands
 *
 * Stage 6, the counting and the papers:
 *  33. the summit's three marks (eu2_in, eu2_final, eu2_won), reported under their own names and never with
 *      ליגת אירופה's; the source worker and the live worker as it runs today both let them in and count them, the
 *      patch on the live one is the summit and nothing else; the dashboard shows three numbers and nothing of who;
 *      DEPLOY.md and HANDOFF-NEXT.md say the order (worker first, from the live folder), the way back, and that
 *      nothing was deployed
 */
import {
  EURO_CLUBS, EURO_SUMMIT_CLUBS, SUMMIT_FINAL_STADIUMS, SUMMIT_DRAFT, summitFinalStadium, poolFor, euroClub, summitClub,
  SUMMIT_DECIDED, LAWYER_REVIEW, LAWYER_FIRST, GOLDEN_BOOK_SCOPE,
} from '../src/data/europeClubs.ts';
import { SUMMIT_ASSETS, entranceAssetId, BOOK_MOMENTS, COACH_CLIPS } from '../src/data/summitAssets.ts';
import { winChanceNow, roundTo5, ODDS_RUNS, sideRating, keyPlayer, oddsSeed, playOut } from '../src/game/summitOdds.ts';
import { summitTension, TENSE_FROM } from '../src/game/summitPath.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { coachClipForKick, coachClipForEnd, COACH_FALLBACK, COACH_MS, SHOOTOUT_TENSION } from '../src/game/summitCoach.ts';
import { digestLeg, cameBack, meetingOf, addMeeting, addPage, MEETINGS_KEPT, BOOK_PAGES_KEPT } from '../src/game/summitMemory.ts';
import { RIVALRY, RIVALRY_TEMPLATES, rivalryPick } from '../src/game/summitRivalry.ts';
import { STORIES, storyFor } from '../src/game/summitStory.ts';
import { reelScript, reelAt, REEL_MS, REEL_GOALS_SHOWN } from '../src/game/summitReel.ts';
import { summitShareText } from '../src/game/share.ts';
import { soundOn, setSound, playSummit } from '../src/ui/sound.ts';
import { EURO_NAMES, makeEuroName } from '../src/data/europeNames.ts';
import { renameLegacy, NAMES_VERSION } from '../src/game/renames.ts';
import { createRng, overall } from '../src/engine/matchEngine.ts';
import {
  SUMMIT_STAGE_TARGET, SUMMIT_CENTRE, SUMMIT_CAP, SUMMIT_PRIZE, SUMMIT_TRAVEL, SUMMIT_SECURITY, SUMMIT_FIRST_GEMS, SUMMIT_TITLE_GEMS,
  STAGE_TARGET, PRIZE, TRAVEL, SECURITY, drawEuro, strengthOf, prizeFor, prizeTotal, competitionName, summitLevel, SUMMIT_LIVE, setSummitDoorForChecks,
  travelFor, securityFor, myTie, recordMyLeg, EURO_ROUNDS, euroMarks, SUMMIT_MARKS,
} from '../src/game/euro.ts';
import * as TEL from '../src/game/telemetry.ts';
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { summitStops } from '../src/game/summitPath.ts';
import { readFileSync, existsSync } from 'node:fs';
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

/* ------------------------------------------------- 0. the door (Itzik, 12.11.2026): shut for players, opened here for the tests */
claim(SUMMIT_LIVE === false, 'the summit\'s door is open for players: it waits for the lawyer and for Itzik\'s word');
claim(summitLevel(true, 'international') === 0, 'behind a shut door a champion with the standing and the licence is still sent to the summit');
{
  const euroSrc = readFileSync('src/game/euro.ts', 'utf8');
  claim(euroSrc.includes('const SUMMIT_OPEN = false;') && euroSrc.includes('export let SUMMIT_LIVE: boolean = SUMMIT_OPEN || summitDevDoor();') && euroSrc.includes("!!import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('summit')"),
    'the door is not one shut line, or the developer\'s side door opens in a built game');
  claim(readFileSync('src/ui/screens/Chronicle.tsx', 'utf8').includes('const hasBook = SUMMIT_LIVE && ('), 'ספר הזהב is offered behind a shut door');
}
setSummitDoorForChecks(true);

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

/* ------------------------------------------------- 7. טחנות הזהב */
{
  const k = euroClub('eu-amsterdam');
  claim(!!k && k.name === 'טחנות הזהב' && k.short === 'הטחנות' && k.country === 'הולנד', 'eu-amsterdam is not טחנות הזהב (Itzik, 12.11.2026)');
  claim(!ALL.some(c => c.name === 'ר.ב אמסטרדם' || c.name === 'קייב הכחולה'), 'ר.ב אמסטרדם or קייב הכחולה is still a club');
  const old = {
    namesVersion: 1,
    chronicle: [{ id: 'euro-s3', title: 'ההדחה', body: 'ר.ב אמסטרדם הדיחה אותנו ברבע הגמר.' }],
    news: ['מול ר.ב אמסטרדם בשמינית'],
    euroSeen: [{ id: 'eu-amsterdam', name: 'ר.ב אמסטרדם', short: 'ר.ב אמסטרדם', city: 'אמסטרדם' }],
  };
  const s = renameLegacy(JSON.parse(JSON.stringify(old))) as typeof old;
  claim(NAMES_VERSION === 2, `the renames are at set ${NAMES_VERSION}, the live set is 2`);
  claim(s.chronicle[0].body === 'טחנות הזהב הדיחה אותנו ברבע הגמר.', `the chronicle: ${s.chronicle[0].body}`);
  claim(s.news[0] === 'מול טחנות הזהב בשמינית', `the news: ${s.news[0]}`);
  claim(s.euroSeen[0].name === 'טחנות הזהב' && s.euroSeen[0].short === 'הטחנות' && s.euroSeen[0].id === 'eu-amsterdam', 'a stored club kept its old name or lost its id');
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
  // the door shut (as players have it): the same six summers, and nobody is drawn into the summit or told of it
  setSummitDoorForChecks(false);
  for (const champ of [true, false]) for (const unlocked of [true, false]) for (const lic of ['international', 'pro']) {
    const n = G.startNextSeason(seasonEnd(base, champ, unlocked, lic));
    claim((n.euro ? n.euro.level : null) === (champ ? 0 : null), `door shut, champion ${champ}, standing ${unlocked}, licence ${lic}: tier ${n.euro ? n.euro.level : null}`);
    claim(!titleOf(n).some(t => t.includes('פסגת אירופה')) && !JSON.stringify(n.notices).includes('הפסגה'), `door shut, champion ${champ}, standing ${unlocked}, licence ${lic}: a word about the summit`);
    claim(!n.summit?.firstEntryGemPaid && n.gems === G.startNextSeason(seasonEnd(base, champ, false, 'pro')).gems, `door shut, champion ${champ}, standing ${unlocked}, licence ${lic}: the summit's gems were paid`);
  }
  setSummitDoorForChecks(true);
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
    'src/ui/components/SummitEntrance.tsx', 'src/ui/components/RivalCard.tsx', 'src/ui/components/TrophyCeremony.tsx', 'src/ui/components/GoldenBook.tsx'].map(p => readFileSync(p, 'utf8')).join('\n');
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
  const stage3 = ['SummitEntrance', 'RivalCard', 'TrophyCeremony', 'CoachReaction', 'GoldenBook', 'SummitShare', 'SummitReel'].map(n => [`${n}.tsx`, readFileSync(`src/ui/components/${n}.tsx`, 'utf8')] as const);
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
  // 10.11: all twenty go to the lawyer, his first four among them, and the file he reads has every one in full
  claim(LAWYER_REVIEW.length === 20 && EURO_SUMMIT_CLUBS.every(c => LAWYER_REVIEW.includes(c.name)) && LAWYER_FIRST.every(n => LAWYER_REVIEW.includes(n)), `the lawyer's list holds ${LAWYER_REVIEW.length}, agreed all twenty`);
  const review = readFileSync('SUMMIT-LAWYER-REVIEW.md', 'utf8');
  const rows = review.split('\n').filter(l => /^\| \d+ \| /.test(l));
  claim(rows.length === 20, `SUMMIT-LAWYER-REVIEW.md has ${rows.length} rows, agreed twenty`);
  for (const c of EURO_SUMMIT_CLUBS) {
    const row = rows.find(r => r.split('|')[2]?.trim() === c.name) ?? '';
    claim(!!row && row.split('|')[3]?.trim() === c.short && row.includes(c.primary) && row.includes(c.secondary) && row.includes(c.stadium) && (row.split('|')[9]?.trim().length ?? 0) > 1,
      `SUMMIT-LAWYER-REVIEW.md does not give ${c.name} with its short name, colours, ground and the real club it may recall`);
  }
  claim(/שום חלק מפסגת אירופה לא עולה לאוויר לפני אישור עורך הדין/.test(review), 'the review file does not say nothing goes live before the lawyer');
  claim(GOLDEN_BOOK_SCOPE === 'finals', `the golden book takes ${GOLDEN_BOOK_SCOPE}, agreed finals and trophies`);
  claim(SUMMIT_DECIDED.length === 5 && /short names/.test(SUMMIT_DECIDED[4]) && SUMMIT_DRAFT.length === 0, 'what is decided and what is still open are not his answers of 9.11 and 10.11');
}

/* ------------------------------------------------- 26. the coach in a summit shootout */
{
  // every case, by hand: their goal is the tight clap, their miss the fist
  const kicks: Array<[('me' | 'them'), boolean, string]> = [['me', true, 'pen-user-goal'], ['me', false, 'pen-user-miss'], ['them', true, 'pen-opp-goal'], ['them', false, 'pen-opp-miss']];
  for (const [side, scored, want] of kicks) claim(coachClipForKick(side, scored) === want, `${side} ${scored ? 'scored' : 'missed'}: the coach plays ${coachClipForKick(side, scored)}, agreed ${want}`);
  claim(coachClipForEnd('me') === 'pen-win' && coachClipForEnd('them') === 'pen-loss', 'the end of the shootout plays the wrong clip');
  const moves: Record<string, [string, string]> = {
    'pen-user-goal': ['celebrate', 'leap'], 'pen-user-miss': ['guide', 'head-down'], 'pen-opp-goal': ['guide', 'tight-clap'],
    'pen-opp-miss': ['celebrate', 'fist'], 'pen-win': ['celebrate', 'run-off'], 'pen-loss': ['guide', 'tunnel'],
  };
  for (const [clip, [media, move]] of Object.entries(moves)) {
    const fb = COACH_FALLBACK[clip as keyof typeof COACH_FALLBACK];
    claim(fb.media === media && fb.move === move && fb.label.length > 4, `${clip} falls back to ${fb.media} ${fb.move}, agreed ${media} ${move} with a line under him`);
  }
  claim(new Set(Object.values(COACH_FALLBACK).map(f => f.label)).size === 6, 'two reactions share a line');
  claim(COACH_FALLBACK['pen-opp-goal'].media !== 'celebrate' && /מתוחות/.test(COACH_FALLBACK['pen-opp-goal'].label), 'their goal plays the cheering clip, or the line is not tense');
  for (const c of COACH_CLIPS) claim(COACH_MS[c] >= (c === 'pen-win' || c === 'pen-loss' ? 3000 : 1200) && COACH_MS[c] <= (c === 'pen-win' || c === 'pen-loss' ? 4000 : 2000), `${c} runs ${COACH_MS[c]}ms`);
  claim(JSON.stringify([...COACH_CLIPS].sort()) === JSON.stringify(Object.keys(COACH_FALLBACK).sort()), 'the six clips in the list are not the six reactions');
  claim(SHOOTOUT_TENSION >= 0.5 && SHOOTOUT_TENSION <= 1, `the shootout's dark is ${SHOOTOUT_TENSION}`);
  const sh = readFileSync('src/ui/screens/Shootout.tsx', 'utf8');
  claim(sh.includes("const summit = comp === 'summit';"), 'the shootout does not know a summit night');
  claim(sh.includes("{summit && <CoachReaction key={`me-${mine.length}`} clip={coachClipForKick('me', stage.kick.scored)} />}")
    && sh.includes("{summit && <CoachReaction key={`them-${theirs.length}`} clip={coachClipForKick('them', stage.kick.scored)} />}"), 'the coach does not answer every kick, or answers outside the summit');
  claim(sh.includes('{summit && status.winner && <CoachReaction big clip={coachClipForEnd(status.winner)} />}'), 'the coach does not answer the end of the shootout');
  claim(/\{summit && \(\s*<Portal>\s*<div className="el-tense" aria-hidden="true" style=\{\{ opacity: SHOOTOUT_TENSION \}\}><div className="el-tense-crowd" \/><\/div>/.test(sh), 'the summit shootout is not dark at the edges with the crowd breathing, or another is');
  claim(appSrc.includes("<ShootoutScreen gs={gs} comp={gs.euro?.level === 1 ? 'summit' : 'euro'}") && appSrc.includes('<ShootoutScreen gs={gs} comp="cup"'), 'the summit shootout is not handed its level, or the cup\'s changed');
  // the settle never waits on the coach: the continue buttons do not depend on him
  claim(!/CoachReaction[^\n]*onEnded|CoachReaction[^\n]*onDone/.test(sh), 'the next kick waits on the coach');
  const cr = readFileSync('src/ui/components/CoachReaction.tsx', 'utf8');
  claim(cr.includes('useSummitAsset(`coach/${clip}`)') && cr.includes('onError={() => setBroken(true)}'), 'the coach clip is not loaded through the list, or a broken one does not fall back');
  claim(cr.includes("asset('/coach/celebrate.mp4')") && cr.includes("asset('/coach/guide.webp')") && !/asset\('\/(?!coach\/(celebrate\.mp4|guide\.webp))/.test(cr), 'the fallback is not the coach the game already has');
  claim(cr.includes('{fb.label}') && !/onEnded|setTimeout/.test(cr), 'the reaction has no line, or holds the screen');
  for (const f of ['public/coach/guide.webp', 'public/coach/celebrate.mp4']) claim(existsSync(f), `${f} is missing`);
  claim(/\.eu-pov \.el-coach\{position:absolute;/.test(cssSrc), 'after a kick the coach pushes the word and the button down instead of sitting on the picture');
  for (const m of ['leap', 'head-down', 'tight-clap', 'fist', 'run-off', 'tunnel']) {
    claim(new RegExp(`\\.el-coach-frame\\[data-move="${m}"\\]\\{animation:el-coach-[a-z]+ var\\(--coach-ms\\) [a-z-]+ 1 both;\\}`).test(cssSrc), `the ${m} movement does not play once for its own time`);
  }
}

/* ------------------------------------------------- 27. what the summit remembers */
// a result written by hand, his club at home: goals as [minute, mine?, name], reds as [minute, mine?]
function resultOf(gs: G.GameState, oppId: string, goals: Array<[number, boolean, string]>, reds: Array<[number, boolean]> = []) {
  const me = gs.clubId;
  const events = [
    ...goals.map(([minute, mine, name]) => ({ minute, type: 'goal', teamId: mine ? me : oppId, playerId: `p${minute}`, playerName: name, text: '' })),
    ...reds.map(([minute, mine]) => ({ minute, type: 'red', teamId: mine ? me : oppId, playerId: `r${minute}`, playerName: 'אדום', text: '' })),
  ];
  const mine = goals.filter(g => g[1]).length, theirs = goals.length - mine;
  return { seed: 1, home: { id: me, name: '', stats: {} }, away: { id: oppId, name: '', stats: {} }, score: [mine, theirs], events, ratings: {} } as never;
}
const nightOf = (gs: G.GameState): G.GameState | null => {
  for (let w = 1; w <= gs.league.rounds + 2; w++) { const g = { ...gs, week: w }; if (G.euroNight(g, true)) return g; }
  return null;
};
{
  const hub = { ...topCareer(), phase: 'hub' as const, season: 3 };
  // the digest of one leg
  const d = digestLeg(resultOf(hub, 'x', [[70, true, 'ב'], [12, false, 'א'], [90, true, 'ג']], [[55, false]]), hub.clubId, true);
  claim(d.goals[0] === 2 && d.goals[1] === 1 && d.scorers.map(s => s.minute).join(',') === '12,70,90' && d.scorers[0].mine === false && d.redTheirs && !d.redMine && d.host === true, 'a leg is not read off its result');
  claim(cameBack(d) === true, 'a leg won from behind is not a comeback');
  const leg = (mine: number, theirs: number, at: number[] = [], redTheirs = false): typeof d => ({
    goals: [mine, theirs], host: true, redMine: false, redTheirs,
    scorers: [...Array.from({ length: theirs }, (_, i) => ({ minute: 5 + i, name: 'הם', mine: false, pen: false })), ...Array.from({ length: mine }, (_, i) => ({ minute: at[i] ?? 20 + i, name: `שלי${i}`, mine: true, pen: false }))].sort((a, b) => a.minute - b.minute),
  });
  const m1 = meetingOf(3, 1, [leg(0, 1), leg(3, 0, [50, 60, 89])], null, true, 3);
  claim(m1.flags.lastMinute && m1.flags.comeback && !m1.flags.final && !m1.flags.pens && !m1.flags.cleanSheet && !m1.flags.bigWin && JSON.stringify(m1.legs) === '[[0,1],[3,0]]', `a tie lost then won late reads ${JSON.stringify(m1.flags)}`);
  // the late goal starts at the 88th minute, not before, and only in a tie he won
  claim(!meetingOf(3, 1, [leg(1, 0, [87])], null, true, 3).flags.lastMinute && meetingOf(3, 1, [leg(1, 0, [88])], null, true, 3).flags.lastMinute && !meetingOf(3, 1, [leg(1, 2, [90])], null, false, 3).flags.lastMinute, 'a late goal is not a goal of his from the 88th on in a tie he won');
  const m2 = meetingOf(4, 3, [leg(4, 0)], null, true, 3);
  claim(m2.flags.final && m2.flags.bigWin && m2.flags.cleanSheet && !m2.flags.comeback && !m2.flags.lastMinute, `a final won 4:0 reads ${JSON.stringify(m2.flags)}`);
  const m3 = meetingOf(4, 2, [leg(1, 1, [], true), leg(0, 0)], [3, 4], false, 3);
  claim(m3.flags.pens && m3.flags.redCard && !m3.won && !m3.flags.lastMinute && !m3.flags.bigWin, `a tie lost on penalties reads ${JSON.stringify(m3.flags)}`);
  let h: Record<string, typeof m1[]> = {};
  for (let i = 0; i < 13; i++) h = addMeeting(h, 'c', { ...m1, season: i });
  claim(h.c.length === MEETINGS_KEPT && h.c[h.c.length - 1].season === 12 && h.c[0].season === 3, 'the meetings kept are not the newest ten, oldest first');

  // through the career itself: a two-legged summit tie, then a final
  const s0 = nightOf({ ...hub, euro: drawEuro(31, hub.clubId, hub.season, 1) })!;
  const opp = G.euroNight(s0, true)!.oppId;
  const a1 = G.commitEuroLeg(s0, resultOf(s0, opp, [[10, false, 'א'], [30, true, 'כהן'], [80, true, 'לוי']]), [], true);
  claim(a1.summitTie?.length === 1 && !a1.summitHistory?.[opp] && a1.summitLast?.score.join(':') === '2:1' && (a1.goldenBook ?? []).length === 0, 'the first leg of a tie is not kept as a leg only, with his win for the reel');
  const s1 = nightOf({ ...a1, phase: 'hub' })!;
  const a2 = G.commitEuroLeg(s1, resultOf(s1, opp, [[20, true, 'כהן']]), [], true);
  const met = a2.summitHistory?.[opp] ?? [];
  claim(met.length === 1 && met[0].won && JSON.stringify(met[0].legs) === '[[2,1],[1,0]]' && met[0].season === 3 && met[0].round === 0 && met[0].flags.comeback && (a2.summitTie ?? []).length === 0, `the tie is not remembered as it was: ${JSON.stringify(met)}`);
  claim((a2.goldenBook ?? []).length === 0, 'a tie that is not a final wrote a page in the golden book');
  // a leg lost clears the reel
  const lostLeg = G.commitEuroLeg(s0, resultOf(s0, opp, [[10, false, 'א']]), [], true);
  claim(lostLeg.summitLast === null, 'a night he lost is kept for the reel');
  // ליגת אירופה remembers nothing of this
  const low0 = nightOf({ ...hub, euro: drawEuro(31, hub.clubId, hub.season, 0) })!;
  const low = G.commitEuroLeg(low0, resultOf(low0, G.euroNight(low0, true)!.oppId, [[30, true, 'כהן']]), [], true);
  claim(low.summitHistory === undefined && low.goldenBook === undefined && low.summitTie === undefined && low.summitLast === undefined, 'a night of ליגת אירופה is written into the summit\'s memory');

  // the final: a page of the golden book, the trophy on its own kind
  const fin0 = finalLevel(hub, 1);
  const finNight = nightOf({ ...fin0, euro: { ...fin0.euro!, ties: fin0.euro!.ties.map((r, i) => i === EURO_ROUNDS - 1 ? r.map(t => ({ ...t, legs: [] })) : r) } })!;
  const fOpp = G.euroNight(finNight, true)!.oppId;
  const won = G.commitEuroLeg({ ...finNight, summitHistory: { [fOpp]: [m3] } }, resultOf(finNight, fOpp, [[15, false, 'א'], [60, true, 'כהן'], [90, true, 'לוי']]), [], true);
  const page = (won.goldenBook ?? [])[0];
  claim((won.goldenBook ?? []).length === 1 && page.kind === 'trophy' && page.score.join(':') === '2:1' && page.season === 3 && page.oppId === fOpp && page.pens === null, `the final won is not a trophy page: ${JSON.stringify(page)}`);
  claim(!!page && (BOOK_MOMENTS as readonly string[]).includes(page.momentId) && page.tpl.startsWith('w-') && /2:1|90|60|לוי|כהן/.test(page.title + page.line) && !/[{}]|undefined/.test(page.title + page.line), `the page says nothing real of its final: ${page?.title} / ${page?.line}`);
  claim(typeof page?.rivalry === 'string' && page.rivalry.length > 5, 'the page forgot the history that stood before this final');
  claim(won.summitHistory?.[fOpp]?.length === 2 && won.summitHistory[fOpp][1].flags.final && won.summitHistory[fOpp][1].flags.lastMinute, 'the final is not remembered as a final');
  const lostFin = G.commitEuroLeg(finNight, resultOf(finNight, fOpp, [[15, false, 'א']]), [], true);
  claim(lostFin.goldenBook?.[0]?.kind === 'final' && lostFin.goldenBook[0].tpl.startsWith('l-') && lostFin.goldenBook[0].rivalry === undefined, 'a final lost is not a page of its own kind, or invents a history');
  // level, then penalties
  const lvl = G.commitEuroLeg(finNight, resultOf(finNight, fOpp, [[15, false, 'א'], [60, true, 'כהן']]), [], true);
  claim(lvl.phase === 'euro-pens' && (lvl.goldenBook ?? []).length === 0 && lvl.summitTie?.length === 1, 'a final gone to penalties wrote its page before the shootout');
  const pensWon = G.finishEuroPens(lvl, [5, 4]);
  const pp = pensWon.goldenBook?.[0];
  claim(!!pp && pp.kind === 'trophy' && pp.pens?.join(':') === '5:4' && /^w-pens/.test(pp.tpl) && pp.line.includes('5:4') && pensWon.summitLast?.pens?.join(':') === '5:4', `a final won on penalties: ${JSON.stringify(pp)}`);
  // the save: kept as it is, and a save from before starts empty
  saveCareer(won);
  const back = loadCareer()!;
  claim(JSON.stringify(back.summitHistory) === JSON.stringify(won.summitHistory) && JSON.stringify(back.goldenBook) === JSON.stringify(won.goldenBook), 'the summit\'s memory does not survive the save');
  const { summitHistory: _h, goldenBook: _b, summitTie: _t, summitLast: _l, ...old } = won;
  saveCareer(old as G.GameState);
  const fresh = loadCareer()!;
  claim(JSON.stringify(fresh.summitHistory) === '{}' && JSON.stringify(fresh.goldenBook) === '[]', 'a save from before does not start with no meetings and an empty book');
  // the book keeps sixty whole pages, older ones one line each
  let book: typeof won.goldenBook = [];
  for (let i = 0; i < BOOK_PAGES_KEPT + 3; i++) book = addPage(book!, { ...page, season: i });
  claim(book!.length === BOOK_PAGES_KEPT + 3 && book!.filter(p => !p.compact).length === BOOK_PAGES_KEPT && book!.slice(0, 3).every(p => p.compact && p.line === '' && p.title.length > 0) && !book![3].compact, 'the book does not keep sixty whole pages and press the older ones to a line');
  // tonight's line on the rival card
  const again = nightOf({ ...hub, euro: drawEuro(31, hub.clubId, hub.season + 2, 1), season: hub.season + 2, summitHistory: a2.summitHistory })!;
  const againOpp = G.euroNight(again, true)!.oppId;
  claim(typeof G.summitRivalry({ ...again, summitHistory: { [againOpp]: met } }, true) === 'string', 'a club he met before has no line of history');
  claim(G.summitRivalry({ ...again, summitHistory: {} }, true) === null && G.summitRivalry(low0, true) === null, 'a line of history without a meeting, or outside the summit');
}

/* ------------------------------------------------- 28. the rivalries */
{
  claim(RIVALRY_TEMPLATES >= 40 && RIVALRY.length === 15 && RIVALRY.every(c => c.lines.length >= 3), `${RIVALRY_TEMPLATES} lines in ${RIVALRY.length} kinds, agreed at least forty`);
  const all = RIVALRY.flatMap(c => c.lines);
  claim(new Set(all).size === all.length && all.every(l => !/[—–]/.test(l) && l.trim().length > 8), 'a rivalry line is repeated, empty, or has a long dash');
  claim(rivalryPick(undefined, { club: 'X', season: 3, round: 0 }, 1) === null && rivalryPick([], { club: 'X', season: 3, round: 0 }, 1) === null, 'a line of history with no meeting behind it');
  const mk = (season: number, round: number, won: boolean, f: Partial<Record<string, boolean>> = {}) => ({
    season, round, legs: (won ? [[2, 0]] : [[0, 1]]) as Array<[number, number]>, pens: f.pens ? ([4, 3] as [number, number]) : null, won,
    flags: { lastMinute: false, comeback: false, redCard: false, final: round === 3, bigWin: false, cleanSheet: false, pens: false, ...f } as never,
  });
  // one meeting: the second meeting, or what that meeting left
  const seen1 = new Set<string>();
  for (let s = 0; s < 200; s++) { seen1.add(rivalryPick([mk(2, 1, true)], { club: 'X', season: 3, round: 1 }, s)!.category); }
  claim([...seen1].every(c => c === 'second'), `one plain meeting won reads ${[...seen1].join(', ')}`);
  const seenLost = new Set<string>();
  for (let s = 0; s < 200; s++) seenLost.add(rivalryPick([mk(2, 1, false)], { club: 'X', season: 3, round: 1 }, s)!.category);
  claim(seenLost.has('revenge') && seenLost.has('second') && [...seenLost].every(c => c === 'revenge' || c === 'second'), `one meeting lost reads ${[...seenLost].join(', ')}`);
  // a long simulation: every kind comes up, every line is whole, every kind is true to the history
  const rng = createRng(77);
  const kinds = new Set<string>(), tpls = new Set<string>();
  let broken = '', untrue = '';
  for (let i = 0; i < 6000; i++) {
    const n = 1 + Math.floor(rng() * 5);
    let season = 1;
    const ms = Array.from({ length: n }, () => {
      season += 1 + Math.floor(rng() * 3);
      const won = rng() < 0.5, round = Math.floor(rng() * 4);
      return mk(season, round, won, { lastMinute: won && rng() < 0.2, comeback: won && rng() < 0.2, redCard: rng() < 0.2, bigWin: won && rng() < 0.2, cleanSheet: won && rng() < 0.3, pens: rng() < 0.2 });
    });
    const ctx = { club: 'מועדון הבדיקה', season: season + Math.floor(rng() * 4), round: Math.floor(rng() * 4) };
    const seed = Math.floor(rng() * 1e9);
    const p = rivalryPick(ms, ctx, seed)!;
    if (!p) { broken = 'no line for a history'; break; }
    kinds.add(p.category); tpls.add(p.tpl);
    if (/[{}]|undefined|NaN/.test(p.text) || p.text.length < 8) broken = p.text;
    if (rivalryPick(ms, ctx, seed)!.text !== p.text) broken = 'the same night read two lines';
    const wins = ms.filter(m => m.won).length, last = ms[ms.length - 1];
    if ((p.category === 'revenge' && last.won) || (p.category === 'curse' && wins > 0) || (p.category === 'dominance' && wins < 2) || (p.category === 'thirdDecides' && (n !== 2 || wins !== 1))
      || (p.category === 'second' && n !== 1) || (p.category === 'familiar' && n < 2) || (p.category === 'finalAgain' && (ctx.round !== 3 || !ms.some(m => m.flags.final))) || (p.category === 'seasonsGap' && ctx.season - last.season < 2)
      || (p.category === 'pensMemory' && !ms.some(m => m.flags.pens)) || (p.category === 'redMemory' && !ms.some(m => m.flags.redCard)) || (p.category === 'eternalDraw' && wins !== n - wins)) untrue = `${p.category}: ${p.text}`;
  }
  claim(!broken, `a rivalry line came out unfinished: ${broken}`);
  claim(!untrue, `a rivalry line is not true to the history: ${untrue}`);
  claim(kinds.size === 15, `only ${kinds.size} of the 15 kinds ever came up: missing ${RIVALRY.map(c => c.id).filter(c => !kinds.has(c)).join(', ')}`);
  claim(tpls.size >= 40, `only ${tpls.size} lines ever came up`);
}

/* ------------------------------------------------- 29. the golden book's stories */
{
  claim(STORIES.length >= 25 && new Set(STORIES.map(s => s.id)).size === STORIES.length, `${STORIES.length} phrasings, agreed at least 25`);
  claim(STORIES.every(s => !/[—–]/.test(s.title + s.line) && /\{score\}|\{pens\}|\{min\}|\{scorer\}/.test(s.title + s.line) && (BOOK_MOMENTS as readonly string[]).includes(s.moment)), 'a phrasing carries nothing real of the match, a long dash, or a picture the list does not have');
  const rng = createRng(2026);
  const used = new Set<string>();
  let bad = '', repeat = '';
  for (let career = 0; career < 100; career++) {
    let lastTpl: string | undefined;
    for (let k = 0; k < 10; k++) {
      const mine = Math.floor(rng() * 5), theirs = Math.floor(rng() * 5);
      const pens = mine === theirs ? ((rng() < 0.5 ? [5, 4] : [3, 4]) as [number, number]) : null;
      const wonIt = pens ? pens[0] > pens[1] : mine > theirs;
      const scorers = [
        ...Array.from({ length: mine }, (_, i) => ({ minute: 1 + Math.floor(rng() * 93), name: `כובש${i}`, mine: true, pen: false })),
        ...Array.from({ length: theirs }, () => ({ minute: 1 + Math.floor(rng() * 93), name: 'יריב', mine: false, pen: false })),
      ].sort((a, b) => a.minute - b.minute);
      const leg = { goals: [mine, theirs] as [number, number], host: null, scorers, redMine: rng() < 0.1, redTheirs: rng() < 0.1 };
      const ctx = { opp: 'היריבה', city: 'ראש העין', stadium: 'היכל הכתרים', season: 3 + k, won: wonIt, pens, lastTpl };
      const seed = Math.floor(rng() * 1e9);
      const st = storyFor(leg, ctx, seed);
      used.add(st.tpl);
      if (st.tpl === lastTpl) repeat = st.tpl;
      if (/[{}]|undefined|NaN/.test(st.title + st.line) || st.title.length < 3 || st.line.length < 12) bad = `${st.tpl}: ${st.title} / ${st.line}`;
      const real = [`${mine}:${theirs}`, ...(pens ? [`${pens[0]}:${pens[1]}`] : []), ...scorers.filter(s => s.mine).flatMap(s => [s.name, String(s.minute)])];
      if (!real.some(r => (st.title + ' ' + st.line).includes(r))) bad = `nothing real in ${st.tpl}: ${st.line}`;
      if (st.tpl.startsWith('w-') !== wonIt) bad = `${st.tpl} for a final ${wonIt ? 'won' : 'lost'}`;
      if (/^[wl]-pens/.test(st.tpl) !== !!pens) bad = `${st.tpl} with${pens ? '' : 'out'} a shootout`;
      if (storyFor(leg, ctx, seed).line !== st.line) bad = 'the same final wrote two pages';
      lastTpl = st.tpl;
    }
  }
  claim(!bad, `a page of the golden book is wrong: ${bad}`);
  claim(!repeat, `the same phrasing wrote two pages in a row: ${repeat}`);
  claim(used.size >= 25, `only ${used.size} phrasings in 1,000 finals, agreed at least 25`);
  const gb = readFileSync('src/ui/components/GoldenBook.tsx', 'utf8');
  claim(gb.includes('const pages = [...(gs.goldenBook ?? [])].reverse();') && gb.includes("useSummitAsset(`book/${momentId}`)") && gb.includes('<Medallion />') && gb.includes('הספר מחכה לגמר הראשון שלך'), 'the golden book does not show the newest page first, the picture or the medallion, or says nothing when empty');
  claim(readFileSync('src/ui/screens/Chronicle.tsx', 'utf8').includes('{hasBook && <button className="btn dark" data-summit-book="1" onClick={() => setBook(true)}>ספר הזהב</button>}') && hubSrc.includes("<button className=\"btn dark btn-sm\" onClick={() => setOpen('book')}>ספר הזהב</button>"), 'the golden book cannot be reached from the chronicle and from the summit card');
}

/* ------------------------------------------------- 30. the share card */
{
  const sc = readFileSync('src/ui/shareCard.ts', 'utf8');
  claim(/export const CARD_W = 1080;/.test(sc) && /export const CARD_H = 1350;/.test(sc) && sc.includes('export const CARD_SITE = SHARE_SITE;') && readFileSync('src/data/site.ts', 'utf8').includes("export const SHARE_SITE_URL = 'https://beapro.co.il';") && sc.includes('c.fillText(CARD_SITE,'), 'the card is not 1080 by 1350 with the game\'s address on it');
  // Itzik, 10.11: no summit club on the card until the lawyer has cleared them
  const code = sc.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  claim(!/europeClubs|euroClub|summitClub|oppId|opponent|\bopp\b/.test(code), 'the share card can be handed a summit club');
  const fields = sc.match(/export interface ShareCardData \{([\s\S]*?)\n\}/)?.[1] ?? '';
  claim(['headline', 'club', 'season', 'score', 'pens'].every(k => new RegExp(`\\b${k}:`).test(fields)) && (fields.match(/^\s+\w+:/gm) ?? []).length === 5, 'the card carries something other than the headline, his club, the season and the score');
  claim(sc.includes("c.drawImage(art.logo,") && sc.includes("const name = 'BE A PRO'") && sc.includes("c.fillText(data.club,") && sc.includes("c.drawImage(art.crest,"), 'the card lost his club, his crest, the mark of the game or its name');
  const sh = readFileSync('src/ui/components/SummitShare.tsx', 'utf8');
  claim(sh.includes('await document.fonts?.ready') && sh.includes("navigator.canShare?.({ files: [pic.file] })") && sh.includes('navigator.share({ files: [pic.file], text, url: link })'), 'the card is drawn before the fonts are in, or is not sent as a file where a phone can');
  claim(sh.includes('https://wa.me/?text=') && sh.includes("a.download = 'be-a-pro.png'") && sh.includes('navigator.clipboard?.writeText(`${text}\\n${link}`)'), 'no WhatsApp, no saving the picture, or no copying the words');
  claim(sh.includes('אי אפשר לתייג אוטומטית באינסטגרם') && sh.includes('@be.a.pro.il') && sh.includes('בוואטסאפ דרך קישור עובר רק הטקסט'), 'the screen promises a tag it cannot make, or hides that WhatsApp by link carries words only');
  claim(!/useEffect/.test(sh) && (sh.match(/await picture\(\)/g) ?? []).length === 2, 'the picture is made before he asks for it');
  const gb = readFileSync('src/ui/components/GoldenBook.tsx', 'utf8');
  const reel = readFileSync('src/ui/components/SummitReel.tsx', 'utf8');
  claim(gb.includes("card={{ headline: trophy ? 'אלופי אירופה' : 'גמר פסגת אירופה', club: me.name, season: page.season, score: page.score, pens: page.pens }}")
    && reel.includes("card={{ headline: 'ניצחון בפסגה', club: me.name, season: data.season, score: data.score, pens: data.pens }}")
    && appSrc.includes("card: { headline: 'אלופי אירופה', club: G.club(gs).name, season: ceremony, score: gs.summitLast?.score ?? null, pens: gs.summitLast?.pens ?? null },"), 'a card is handed something other than his own club and the score');
  claim(appSrc.includes("text: summitShareText('trophy', { club: G.club(gs).name, season: ceremony })"), 'the ceremony does not send the summit\'s own words');
  for (const k of ['trophy', 'final', 'win'] as const) {
    const t = summitShareText(k, { club: 'סער ראש העין', season: 4 });
    claim(t.includes('@be.a.pro.il') && t.includes('סער ראש העין') && !EURO_SUMMIT_CLUBS.some(c => t.includes(c.name) || t.includes(c.short)), `the ${k} words name a summit club, or lack the tag: ${t}`);
  }
}

/* ------------------------------------------------- 31. the five-second reel */
{
  claim(REEL_MS === 5000, `the reel runs ${REEL_MS}ms`);
  const data = { season: 4, round: 1, score: [3, 1] as [number, number], pens: null, goals: [{ minute: 12, name: 'כהן', mine: true }, { minute: 40, name: 'סמית', mine: false }, { minute: 71, name: 'לוי', mine: true }, { minute: 90, name: 'כהן', mine: true }] };
  const sc = reelScript(data, 'סער ראש העין');
  claim(sc.score === '3 : 1' && sc.club === 'סער ראש העין' && JSON.stringify(sc.goals) === JSON.stringify(["12' כהן", "40' שער ליריבה", "71' לוי", "90' כהן"]) && sc.pens === null && sc.more === null, `the reel does not say what happened: ${JSON.stringify(sc)}`);
  claim(!JSON.stringify(sc).includes('סמית'), 'the reel names the other side\'s scorer');
  claim(sc.footer === 'BE A PRO · beapro.co.il', `the reel's footer reads ${sc.footer}`);
  const many = reelScript({ ...data, goals: Array.from({ length: 9 }, (_, i) => ({ minute: 10 + i, name: 'כהן', mine: true })), pens: [5, 4] }, 'א');
  claim(many.goals.length === REEL_GOALS_SHOWN && many.more === 'ועוד 3 שערים' && many.pens === '5:4 בפנדלים', 'nine goals do not fit as six and three more, or the shootout is missing');
  const at = (t: number) => reelAt(sc, t);
  claim(at(0).headline && !at(0).score && at(799).score === false && at(800).score && at(1499).goals === 0 && at(1500).goals === 1 && at(1950).goals === 2 && at(3999).footer === false && at(4000).footer && at(5000).goals === 4, 'the reel\'s clock is not the headline, the score, a goal at a time, the footer');
  claim(reelAt(many, 4000).goals === REEL_GOALS_SHOWN, 'six goals are not all on by the fourth second');
  const reel = readFileSync('src/ui/components/SummitReel.tsx', 'utf8');
  claim(reel.includes("if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !('captureStream' in HTMLCanvasElement.prototype)) return null;") && reel.includes('{!still && mime && <button'), 'the save button shows where the browser cannot record');
  claim(reel.includes('if (still) { drawFrame(c, T, script, REEL_MS, null, null);') && reel.includes('const t = Math.min(REEL_MS, now - t0);') && reel.includes('}, REEL_MS + 150);'), 'under reduced motion the reel moves, or it does not stop at five seconds');
  claim(reel.includes("useSummitAsset('reel/win-base')") && reel.includes('reelScript(data, me.name)') && !/euroClub|oppId/.test(reel), 'the reel does not take its background from the list, or is handed a summit club');
  claim(hubSrc.includes("{gs.summitLast && <button className=\"btn dark btn-sm\" onClick={() => setOpen('reel')}>תקציר 5 שניות</button>}"), 'the reel is offered without a win behind it');
}

/* ------------------------------------------------- 32. the sound, off until asked for */
{
  lsStore.clear();
  claim(soundOn() === false, 'a clean install has the sounds on');
  claim(playSummit('entrance') === false && playSummit('trophy') === false, 'a clean install made a sound');
  setSound(true);
  claim(soundOn() === true && lsStore.get('beapro.sound') === '1', 'turning the sounds on is not kept');
  claim(playSummit('entrance') === false, 'a sound played before he touched the screen');
  setSound(false);
  claim(soundOn() === false && !lsStore.has('beapro.sound'), 'turning the sounds off leaves them on');
  const snd = readFileSync('src/ui/sound.ts', 'utf8');
  claim(snd.includes("if (!soundOn() || !touched || typeof document === 'undefined' || document.hidden) return null;"), 'a sound can play with the sounds off, before a touch, or in a hidden tab');
  claim(!/new Audio\(|\.mp3|\.ogg|\.wav|fetch\(|import\(/.test(snd), 'the sounds load a file');
  claim(snd.includes("window.addEventListener('pointerdown', mark, { once: true, capture: true });") && /ctx = ctx \?\? new AC\(\);/.test(snd), 'the audio engine is made before he touched the screen');
  claim(readFileSync('src/ui/components/SummitEntrance.tsx', 'utf8').includes("playSummit('entrance');") && readFileSync('src/ui/components/TrophyCeremony.tsx', 'utf8').includes("playSummit('trophy');"), 'the entrance and the trophy have no sound to turn on');
  claim(hubSrc.includes('const [sounds, setSounds] = useState(soundOn);') && hubSrc.includes("aria-pressed={sounds} onClick={() => { setSound(!sounds); setSounds(!sounds); }}>צלילים: {sounds ? 'דולקים' : 'כבויים'}</button>"), 'there is no switch for the sounds, or it does not say which way it stands');
  claim(hubSrc.includes("{level === 1 && <div className=\"row\" style={{ marginTop: 10 }}><SoundSwitch /></div>}") && (hubSrc.match(/<SoundSwitch \/>/g) ?? []).length === 2, 'the switch is not on the summit night card and on the summit road card, or is on a card of ליגת אירופה');
  // the rival card is handed tonight's line of history
  const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  claim(appSrc.includes('rivalry: G.summitRivalry(gs)') && match.includes('rivalry={summit.rivalry}'), 'the rival card is not handed the line of history');
}

/* ------------------------------------------------- 33. the counting: the summit's three marks, the worker, the dashboard */
{
  // the game: a competition reports under its own tier's names, never both
  const hub = { ...topCareer(), phase: 'hub' as const, season: 3 };
  const drawn1 = drawEuro(31, hub.clubId, 3, 1), drawn0 = drawEuro(31, hub.clubId, 3, 0);
  claim(euroMarks(drawn1, hub.clubId).join() === 'eu2_in' && euroMarks(drawn0, hub.clubId).join() === 'eu_in', `drawn in reports ${euroMarks(drawn1, hub.clubId)} at the summit and ${euroMarks(drawn0, hub.clubId)} below`);
  const fin1 = finalLevel(hub, 1).euro!, fin0 = finalLevel(hub, 0).euro!;
  claim(euroMarks(fin1, hub.clubId).join() === 'eu2_in,eu2_final' && euroMarks(fin0, hub.clubId).join() === 'eu_in,eu_final', 'a final is not reported under its own tier');
  claim(euroMarks({ ...fin1, status: 'won' }, hub.clubId).join() === 'eu2_in,eu2_final,eu2_won' && euroMarks({ ...fin0, status: 'won' }, hub.clubId).join() === 'eu_in,eu_final,eu_won', 'a trophy is not reported under its own tier');
  claim(euroMarks(null, hub.clubId).length === 0, 'a career with no competition reports one');
  claim(JSON.stringify(SUMMIT_MARKS) === '["eu2_in","eu2_final","eu2_won"]' && JSON.stringify(TEL.SUMMIT_MARKS) === JSON.stringify(SUMMIT_MARKS), 'the summit\'s marks are not the agreed three, or the game and the counting disagree');
  for (const ok of SUMMIT_MARKS) claim(TEL.isMilestone(ok) && TEL.isSummitMark(ok), `${ok} is not let through`);
  for (const bad of ['eu2_', 'eu2_lost', 'eu2_in2', 'EU2_IN', 'eu2_in ', 'eu3_in', 'eu2_finals', 'eu22_in']) claim(!TEL.isMilestone(bad), `"${bad}" passes as a mark`);
  claim(!TEL.isSummitMark('eu_in') && (TEL.STEP_ORDER as Record<string, unknown>)['eu2_in'] === undefined, 'a ליגת אירופה mark reads as the summit\'s, or a summit mark is a step');
  claim(appSrc.includes('{ if (isSummitMark(k)) summitMark(k); else euroMark(k); }'), 'the App does not report the summit under its own names');

  // the two workers: the older source in the branch, and the live one's own source (worker/live-count/src, the code that
  // runs on the air, in main since 12.11) with the summit added
  const wsrc = readFileSync('worker/src/index.ts', 'utf8');
  const lsrc = readFileSync('worker/live-count/src/index.ts', 'utf8');
  const pat = (s: string) => /MILESTONE = (\/.+\/);/.exec(s)?.[1] ?? '';
  claim(pat(wsrc) === String(TEL.MILESTONE), 'the source worker\'s pattern is not the game\'s');
  claim(/eu_in\|eu_final\|eu_won\|eu2_in\|eu2_final\|eu2_won\|cup_in/.test(pat(lsrc)), 'the live worker refuses the summit\'s marks');
  // the live pattern is the game's, less the career-move marks the live worker never had: the summit is its only addition
  claim(pat(lsrc).replace('eu2_in|eu2_final|eu2_won|', '') === String(TEL.MILESTONE).replace('eu2_in|eu2_final|eu2_won|', '').replace('xfer_offer|xfer_sent|xfer_in|xfer_code|site_new|', ''), 'the live worker\'s pattern differs from the game\'s by more than the career-move marks');
  const SUMMIT_Q = "SELECT step, COUNT(*) AS n FROM steps WHERE step IN ('eu2_in', 'eu2_final', 'eu2_won') GROUP BY step ORDER BY step";
  claim(wsrc.includes(`summit: "${SUMMIT_Q}"`) && lsrc.includes(`summit: "${SUMMIT_Q}"`), 'the question the dashboard asks about the summit is not the agreed one in both workers');
  // counts only: the question names no device, and the answer carries none
  claim(!/aid|sid/.test(SUMMIT_Q) && wsrc.includes('summit: summitRows.results') && lsrc.includes('summit: summitRows.results') && lsrc.includes('env.DB.prepare(REACH_SQL.summit).all(),'), 'the summit\'s answer could carry a device id, or is not sent');
  const cfg = readFileSync('worker/live-count/wrangler.toml', 'utf8');
  claim(/^name = "beapro-count"$/m.test(cfg) && /^main = "src\/index\.ts"$/m.test(cfg) && /binding = "WEEKEND"\nservice = "beapro-weekend"/.test(cfg) && /binding = "DB"/.test(cfg) && /17 3 \* \* \*/.test(cfg) && !/account_id|secret|token/i.test(cfg.split('\n').filter(l => !l.startsWith('#')).join('\n')),
    'the live worker\'s settings lost the weekend binding, the database or the cron, or carry something private');
  // one way to deploy it: the patched bundle of 11.11 and its settings are gone, so wrangler cannot pick the wrong file
  claim(!existsSync('worker/live-count/index.js') && !existsSync('worker/live-count/index.live.js') && !existsSync('worker/live-count/wrangler.jsonc'), 'the old bundle of the live worker is still beside its source');
  // the live worker itself, run here: it keeps the three marks and drops what only looks like one; it counts them
  const liveWorker = await import('../worker/live-count/src/index.ts');
  const written: unknown[][] = [];
  const env = { ADMIN_KEY: 'k', DB: { prepare: (sql: string) => ({ bind: (...v: unknown[]) => ({ sql, v }) }), batch: async (st: { sql: string; v: unknown[] }[]) => { for (const x of st) if (/INTO steps/.test(x.sql)) written.push(x.v); } } };
  await liveWorker.default.fetch(new Request('https://w.example/', { method: 'POST', body: JSON.stringify({ e: ['eu2_in', 'eu2_final', 'eu2_won', 'eu2_lost', 'eu3_in', 'EU2_IN', 'eu_in', 'bogus'].map(k => ({ a: 'dev1', s: 'sit1', k, t: Date.now() })) }) }), env as never);
  claim(written.map(v => v[1]).join(',') === 'eu2_in,eu2_final,eu2_won,eu_in', `the live worker kept [${written.map(v => v[1]).join(',')}]`);
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE steps (aid TEXT, step TEXT, ts INTEGER, day TEXT, PRIMARY KEY (aid, step))');
  const put = (aid: string, ...steps: string[]) => { for (const s of steps) db.prepare('INSERT OR IGNORE INTO steps VALUES (?, ?, 0, ?)').run(aid, s, '2026-11-11'); };
  put('A', 'eu2_in', 'eu2_final', 'eu2_won'); put('B', 'eu2_in', 'eu2_final'); put('C', 'eu2_in', 'eu_in', 'eu_won'); put('A', 'eu2_in');
  for (const [who, q] of [['the live worker', liveWorker.REACH_SQL.summit], ['the source worker', SUMMIT_Q]] as const) {
    const rows = db.prepare(q).all() as Array<Record<string, unknown>>;
    claim(rows.map(r => `${r.step}:${r.n}`).join(' ') === 'eu2_final:2 eu2_in:3 eu2_won:1' && rows.every(r => Object.keys(r).sort().join() === 'n,step'), `${who} counts the summit as ${JSON.stringify(rows)}`);
  }
  claim((db.prepare(liveWorker.REACH_SQL.europe).all() as Array<{ step: string; n: number }>).map(r => `${r.step}:${r.n}`).join(' ') === 'eu_in:1 eu_won:1', 'a summit mark leaked into ליגת אירופה\'s count');

  // the dashboard: a section of its own, three numbers, nothing of who
  const dash = readFileSync('src/ops/Dashboard.tsx', 'utf8'), model = readFileSync('src/ops/model.ts', 'utf8'), labels = readFileSync('src/ops/labels.ts', 'utf8');
  claim(dash.includes('<Sec title="פסגת אירופה">') && dash.includes('ספירת הפסגה מחכה לפריסת ה-Worker של הספירה (DEPLOY.md, פסגת אירופה)') && dash.includes('<Sec title="ליגת אירופה">'), 'the dashboard has no place of its own for the summit');
  claim(model.includes("const summit = ['eu2_in', 'eu2_final', 'eu2_won'].map(k => ({ key: k, label: labelOf(k), n: raw.reach?.summit ? pick(raw.reach.summit, k) : null }));"), 'the dashboard\'s summit row is more than a name and a number, or shows zeros before the worker answers');
  claim(labels.includes("eu2_in: 'נכנסו לפסגת אירופה'") && labels.includes("eu2_final: 'הגיעו לגמר הפסגה'") && labels.includes("eu2_won: 'זכו בפסגת אירופה'"), 'the three counts have no Hebrew names');

  // the papers: how to deploy, in which order, how to go back, and that none of it was run
  const dep = readFileSync('DEPLOY.md', 'utf8'), hand = readFileSync('HANDOFF-NEXT.md', 'utf8');
  const ROLLBACK = 'e91c8cb6-577f-4bed-8407-dfaa84548252';
  claim(dep.includes('## פסגת אירופה: סדר הפריסה (מוכן, לא בוצע)') && dep.includes('שום דבר מהסעיף הזה לא הורץ'), 'DEPLOY.md does not say the summit is ready and not deployed');
  claim(!/קייב הכחולה/.test(dep + hand + readFileSync('SUMMIT-LAWYER-REVIEW.md', 'utf8')), 'the papers still name קייב הכחולה, which Itzik dropped on 12.11');
  claim(dep.includes(`npx wrangler@4.158.0 rollback ${ROLLBACK} --name beapro-count`) && dep.includes('cd worker/live-count\nnpx wrangler@4.158.0 deploy --config wrangler.toml') && !dep.includes('deploy --no-bundle\n```\n\nהסודות (`ADMIN_KEY`'), 'DEPLOY.md lacks the deploy from the live folder or the way back');
  claim(dep.indexOf('### צעד 1: ה-Worker של הספירה') > 0 && dep.indexOf('### צעד 1: ה-Worker של הספירה') < dep.indexOf('### צעד 2: הלקוח') && dep.includes('ולא מ-`worker/src/`'), 'DEPLOY.md does not put the worker before the game, or allows a deploy from the source');
  claim(dep.includes('SUMMIT-LAWYER-REVIEW.md') && dep.includes('**הדלת סגורה.**') && dep.includes('`SUMMIT_OPEN`') && !dep.includes('אין דלת') && !hand.includes('אין דלת') && dep.includes(`npx wrangler@4.158.0 deployments list --name beapro-count`), 'DEPLOY.md forgot the lawyer, that the door is shut, or the check that the live version has not moved');
  claim(hand.includes('## פסגת אירופה (11.11.2026): נבנתה, לא נדחפה') && hand.includes(ROLLBACK) && hand.includes('HIGGSFIELD-SUMMIT.md') && hand.includes('SUMMIT-LAWYER-REVIEW.md') && ['c7df28b', '6012f8a', '410fd62', '320be15', '2bf47d7', 'cb3dc3f'].every(h => hand.includes(h)), 'HANDOFF-NEXT.md does not hand the summit over: what was built, what waits, the order');
  claim(!/[—–]/.test(dep.slice(dep.indexOf('## פסגת אירופה: סדר הפריסה'))) && !/[—–]/.test(hand.slice(0, hand.indexOf('## מצב הגיט'))), 'a long dash in the summit\'s papers');
}

console.log(`${checked} checks`);
if (fails.length) { console.log(`FAIL (${fails.length})`); for (const f of fails.slice(0, 30)) console.log('  - ' + f); process.exit(1); }
if (SUMMIT_DRAFT.length) console.log('  still temporary, waiting for Itzik:\n    - ' + SUMMIT_DRAFT.join('\n    - '));
console.log('  decided by Itzik:\n    - ' + SUMMIT_DECIDED.join('\n    - '));
console.log(`  for the lawyer before going live: all ${LAWYER_REVIEW.length} (SUMMIT-LAWYER-REVIEW.md), nothing goes live before he clears them`);
console.log('OK, the door shut for players, his twenty, the summit drawn, entered, paid and chronicled by its own rules, and ליגת אירופה as it was');
