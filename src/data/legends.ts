/**
 * The ראש העין regulars.
 *
 * Ten real characters, written by Itzik, who only ever turn out for one club.
 * A squad that opens a season in ראש העין has exactly one of them in it, and
 * because he lives up the road and the club is his home he never asks to leave,
 * never listens to an offer, and is still there the season after.
 *
 * They are the best players in a ליגה ג׳ dressing room, which is the joke: each
 * one is good enough to have gone further and each one has a reason he did not.
 *
 * A manager never signs himself. If the name on the contract matches one of
 * these, that man is quietly left out of the draw for that career.
 */

import type { Attributes, Player, Position, Rng } from '../engine/matchEngine.ts';
import { playerSeed } from '../engine/matchEngine.ts';
import type { Tone } from './personalities.ts';

/** The one town this happens in. */
export const LEGEND_TOWN = 'ראש העין';

/** They are all thirty. Old enough to know better, young enough to still turn up. */
export const LEGEND_AGE = 30;

export interface Legend {
  /** stable key, so a save can find him again after a reload */
  key: string;
  name: string;
  position: Position;
  attrs: Attributes;
  /** the chip on his row */
  label: string;
  /** what the dressing room says about him, which is the whole character */
  says: string;
  tone: Tone;
}

export const LEGENDS: Legend[] = [
  {
    key: 'shahaf-minoi', name: 'שחף מינואי', position: 'ST',
    attrs: { pace: 42, shooting: 58, passing: 48, dribbling: 52, defending: 30, physical: 88 },
    label: 'גב רחב', tone: 'pro',
    says: 'חלוץ גבוה אבל איטי. אומרים עליו שהוא לא החלטי, אבל אם הוא שם את התחת על השחקן אי אפשר לקחת לו את הכדור.',
  },
  {
    key: 'shahar-hilali', name: 'שחר הילאלי', position: 'ST',
    attrs: { pace: 58, shooting: 62, passing: 62, dribbling: 82, defending: 25, physical: 40 },
    label: 'רגל מדויקת', tone: 'heart',
    says: 'חלוץ נמוך עם טכניקה גבוהה. אומרים עליו שהיה יכול להיות החלוץ הבא של צעירי רמת השרון, אבל קרע ברצועות שלח אותו לעשן נרגילה.',
  },
  {
    key: 'niv-parhi', name: 'ניב פרחי', position: 'CB',
    attrs: { pace: 55, shooting: 25, passing: 45, dribbling: 40, defending: 66, physical: 74 },
    label: 'קיר', tone: 'fun',
    says: 'בלם נמוך אבל חזק מאוד. אומרים עליו שאם היה לו רצון להצליח בכדורגל היה יכול להיות קנאברו הבא, נשאר בליגה ג׳ רק כי הוא מעדיף לעשן במחצית.',
  },
  {
    key: 'tamir-maimon', name: 'תמיר מימון', position: 'RW',
    attrs: { pace: 92, shooting: 44, passing: 38, dribbling: 50, defending: 28, physical: 55 },
    label: 'רגליים בלבד', tone: 'warn',
    says: 'קשר אגף, מהיר מאוד בלי טכניקה. אומרים עליו שהוא אוהב לקבל החלטות פוליטיות בלבד, הראש שלו כבר מזמן לא בכדורגל.',
  },
  {
    key: 'shahar-green', name: 'שחר גרין', position: 'CB',
    attrs: { pace: 44, shooting: 30, passing: 72, dribbling: 58, defending: 60, physical: 62 },
    label: 'דם חם', tone: 'warn',
    says: 'בלם, טוב עם הכדור והגנתית לא משהו, קצת איטי. אומרים עליו שאם לא היה עצבני ומקלל שופטים כל משחק היה מגיע לליגה לאומית.',
  },
  {
    key: 'adi-yeini', name: 'עדי ייני', position: 'CM',
    attrs: { pace: 38, shooting: 50, passing: 66, dribbling: 40, defending: 66, physical: 90 },
    label: 'אהוב על כולם', tone: 'heart',
    says: 'קשר גבוה בלי טכניקה ובלי מהירות, אבל מאוד חביב על השחקנים ועל השופטים. עדי רץ בלי ידיים, אבל שהוא מקבל את הכדור ליד הרחבה כולם קמים.',
  },
  {
    key: 'barak-yogev', name: 'ברק יוגב', position: 'ST',
    attrs: { pace: 48, shooting: 66, passing: 32, dribbling: 35, defending: 25, physical: 92 },
    label: 'כוח', tone: 'fun',
    says: 'חלוץ גבוה וחזק מאוד, אבל בלי טכניקה ובלי הבנה בכדורגל. אומרים עליו שמה שמעניין אותו זה סטלות וישיבות, שאם היה משקיע מגיל קטן עדיין היה מגיע לליגה ג׳.',
  },
  {
    key: 'ravid-vahav', name: 'רביד והב', position: 'ST',
    attrs: { pace: 36, shooting: 68, passing: 66, dribbling: 72, defending: 28, physical: 52 },
    label: 'קפטן', tone: 'heart',
    says: 'חלוץ לא מהיר, טכני ושמן. קפטן אמיתי, אבל חייב להבין שלא כל מספרת שלו זה גול. פעם אחת זה קרה, ומאז הוא מנסה כל הזמן.',
  },
  {
    key: 'omri-peled', name: 'עומרי פלד', position: 'RB',
    attrs: { pace: 72, shooting: 35, passing: 52, dribbling: 48, defending: 60, physical: 74 },
    label: 'ריאות', tone: 'pro',
    says: 'מגן ימני עם כושר, אבל לא הכי מבריק עם הכדור. אהוב בחדר ההלבשה ועם מוטיבציה להצליח, למרות שהראש שלו בעיקר בקריירה שלו כמהנדס.',
  },
  {
    key: 'itzik-uziel', name: 'איציק עוזיאל', position: 'CM',
    attrs: { pace: 28, shooting: 55, passing: 84, dribbling: 64, defending: 45, physical: 48 },
    label: 'מסירה של זידאן', tone: 'fun',
    says: 'קשר אמצע, איטי מאוד, מסירות מדויקות ומדהימות וטכניקה סבבה. אומרים עליו שכל כדור שלו נראה כמו של דה לה פנייה, אבל התנועה שלו על המגרש היא של משאית.',
  },
];

const BY_KEY = new Map(LEGENDS.map(l => [l.key, l]));
const BY_NAME = new Map(LEGENDS.map(l => [l.name, l]));

export function legendByKey(key: string): Legend | null {
  return BY_KEY.get(key) ?? null;
}

/** Is this player one of them? Names are unique in the game, so the name is the key. */
export function legendByName(name: string): Legend | null {
  return BY_NAME.get(name.trim()) ?? null;
}

export function isLegend(p: { name: string }): boolean {
  return BY_NAME.has(p.name.trim());
}

/** Only ראש העין. Every other club in the country plays without them. */
export function isLegendClub(city: string | undefined): boolean {
  return (city ?? '').trim() === LEGEND_TOWN;
}

/**
 * Draw one, never the manager himself.
 *
 * A manager who puts his own name on the contract can be handed any of the
 * other nine, but not the version of himself who stayed a player. `exclude`
 * takes the manager's name and is matched loosely, because a manager types his
 * name the way he feels like typing it.
 */
export function pickLegend(rng: Rng, exclude?: string, alreadyHere: string[] = []): Legend | null {
  const me = (exclude ?? '').trim().replace(/\s+/g, ' ');
  const taken = new Set(alreadyHere.map(n => n.trim()));
  const pool = LEGENDS.filter(l => l.name !== me && !taken.has(l.name));
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Build him as a real player, ready to drop into a squad. */
export function makeLegendPlayer(l: Legend, id: string): Player {
  return {
    id,
    seed: playerSeed(l.name, l.position, LEGEND_AGE, l.attrs),
    name: l.name,
    position: l.position,
    attrs: { ...l.attrs },
    age: LEGEND_AGE,
    fitness: 92,
    morale: 80,          // he is home, he is happy
  };
}

/* ------------------------------------------------------------- the squad */

/**
 * Make sure a ראש העין squad has one of them, and only one.
 *
 * Any other club is handed straight back untouched. If one of the ten is
 * already in the dressing room he stays where he is: he lives here, this is his
 * club, and he is not part of a yearly reshuffle. Otherwise one is drawn and
 * takes the place of the weakest man on the bench, so the squad size and the
 * legal minimum are both left alone.
 */
export function withLegend(
  squad: { starters: Player[]; bench: Player[] },
  city: string | undefined,
  managerName: string | undefined,
  rng: Rng,
  nextId: () => string,
  /**
   * How he arrives. A squad being built from nothing replaces its weakest man,
   * so ראש העין lines up the same size as everybody else and no career starts
   * with a spare. A squad already in use lets him join instead, up to the legal
   * ceiling, because deleting a player the manager chose and paid for to make
   * room for a surprise would be a rotten way to introduce him.
   */
  arrive: { mode: 'replace' } | { mode: 'join'; maxSquad: number } = { mode: 'replace' },
): { starters: Player[]; bench: Player[] } {
  if (!isLegendClub(city)) return squad;
  const here = [...squad.starters, ...squad.bench];
  if (here.some(isLegend)) return squad;          // he is already home

  const l = pickLegend(rng, managerName, here.map(p => p.name));
  if (!l || !squad.bench.length) return squad;
  const him = makeLegendPlayer(l, nextId());

  // Room in the squad means he simply signs on, and nobody is lost. This
  // matters most for a career already under way: quietly deleting a player the
  // manager chose and paid for, to make space for a surprise, would be a rotten
  // way to introduce him.
  if (arrive.mode === 'join' && here.length < arrive.maxSquad) {
    return { starters: squad.starters, bench: [...squad.bench, him] };
  }

  // a full squad has to give somebody up, and it is the weakest man on the bench
  const bench = [...squad.bench];
  let worst = 0;
  for (let i = 1; i < bench.length; i++) {
    if (rate(bench[i]) < rate(bench[worst])) worst = i;
  }
  bench[worst] = him;
  return { starters: squad.starters, bench };
}

/** A cheap rating, good enough to find the weakest man on a bench. */
function rate(p: Player): number {
  const a = p.attrs;
  return (a.pace + a.shooting + a.passing + a.dribbling + a.defending + a.physical) / 6;
}
