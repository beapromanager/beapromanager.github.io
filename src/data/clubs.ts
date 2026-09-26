/**
 * Fictional clubs, Israeli in flavour, invented names and colours so no real
 * club badge or trademark is used. Tier 1 is the bottom division we start in.
 *
 * Each club carries traits: a strength and a weakness that actually change the
 * squad you get and the money you start with, so the choice is a real decision.
 */

export type CrestShape = 'shield' | 'round' | 'diamond';
export type CrestPattern = 'solid' | 'stripes' | 'half' | 'sash' | 'chevron';

export interface ClubTraits {
  /** attribute nudge for generated squad, in OVR points */
  attack: number;
  defence: number;
  /** starting money multiplier */
  budget: number;
  /** starting prestige */
  prestige: number;
  /** chance a generated player is a young talent */
  youth: number;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  city: string;
  primary: string;
  secondary: string;
  accent: string;
  shape: CrestShape;
  pattern: CrestPattern;
  /** the manager's chosen shirt pattern, when he picked one; else the shirt
   *  follows the crest pattern. Only the player's own club carries this. */
  kitPattern?: 'solid' | 'stripes' | 'half' | 'sash' | 'hoops';
  /** this season's shirt. primary stays the identity, and the crest with it */
  kitShirt?: string;
  kitTrim?: string;
  founded: number;
  tier: number;
  /** one line personality, shown on the pick screen */
  blurb: string;
  strength: string;
  weakness: string;
  traits: ClubTraits;
  /** local rival, for a geographic league. Feeds the derby registry below. */
  rivalId?: string;
}

export const LEAGUE_C: Club[] = [
  {
    id: 'nahal-oz', name: 'הפועל נחל עוז', short: 'נחל עוז', city: 'נחל עוז',
    primary: '#c0392b', secondary: '#f4e7d8', accent: '#f1c40f',
    shape: 'shield', pattern: 'sash', founded: 1954, tier: 1,
    blurb: 'קבוצת פועלים ותיקה, יציע קטן ורועש.',
    strength: 'חלוצים רעבים, יודעים להבקיע',
    weakness: 'ההגנה דולפת בקלות',
    traits: { attack: +4, defence: -4, budget: 1.0, prestige: 30, youth: 0.18 },
  },
  {
    id: 'sdot-micha', name: 'מכבי שדות מיכה', short: 'שדות מיכה', city: 'שדות מיכה',
    primary: '#f1c40f', secondary: '#1a1a1a', accent: '#ffffff',
    shape: 'round', pattern: 'stripes', founded: 1967, tier: 1,
    blurb: 'מועדון מסודר, בלי הפתעות ובלי דרמות.',
    strength: 'סגל מאוזן בכל העמדות',
    weakness: 'אין כוכב אמיתי שיקח משחק',
    traits: { attack: 0, defence: 0, budget: 1.1, prestige: 34, youth: 0.15 },
  },
  {
    id: 'givat-oren', name: 'בני גבעת אורן', short: 'גבעת אורן', city: 'גבעת אורן',
    primary: '#27ae60', secondary: '#04331b', accent: '#eafaf1',
    shape: 'shield', pattern: 'half', founded: 1978, tier: 1,
    blurb: 'הכל מהנוער. פה מגדלים, לא קונים.',
    strength: 'מפעל כישרונות צעירים',
    weakness: 'תקציב קטן וסגל ירוק',
    traits: { attack: -1, defence: -1, budget: 0.7, prestige: 24, youth: 0.42 },
  },
  {
    id: 'kfar-yam', name: 'הפועל כפר ים', short: 'כפר ים', city: 'כפר ים',
    primary: '#2980b9', secondary: '#0b2540', accent: '#ecf6ff',
    shape: 'round', pattern: 'chevron', founded: 1949, tier: 1,
    blurb: 'קבוצת חוף עם עבר מפואר ששכחו ממנו.',
    strength: 'מוניטין גבוה, קהל גדול',
    weakness: 'שחקנים מבוגרים בסגל',
    traits: { attack: +1, defence: +1, budget: 1.0, prestige: 46, youth: 0.06 },
  },
  {
    id: 'ramat-tal', name: 'מכבי רמת טל', short: 'רמת טל', city: 'רמת טל',
    primary: '#8e44ad', secondary: '#2a123a', accent: '#f0e4f7',
    shape: 'diamond', pattern: 'half', founded: 1985, tier: 1,
    blurb: 'בעלים עשיר, סבלנות קצרה.',
    strength: 'התקציב הגדול בליגה',
    weakness: 'הבעלים מתערב בכל דבר',
    traits: { attack: +2, defence: 0, budget: 1.6, prestige: 38, youth: 0.12 },
  },
  {
    id: 'ein-sela', name: 'הפועל עין סלע', short: 'עין סלע', city: 'עין סלע',
    primary: '#e67e22', secondary: '#3a2109', accent: '#fff1e0',
    shape: 'shield', pattern: 'stripes', founded: 1961, tier: 1,
    blurb: 'קבוצה קשוחה שאף אחד לא אוהב לבקר אצלה.',
    strength: 'הגנה כמו קיר, קשה להבקיע להם',
    weakness: 'מתקשים לייצר מצבים',
    traits: { attack: -4, defence: +5, budget: 0.95, prestige: 28, youth: 0.14 },
  },
  {
    id: 'har-gefen', name: 'בית"ר הר גפן', short: 'הר גפן', city: 'הר גפן',
    primary: '#111111', secondary: '#f1c40f', accent: '#ffffff',
    shape: 'diamond', pattern: 'sash', founded: 1972, tier: 1,
    blurb: 'היציע הכי לוהט בליגה, לטוב ולרע.',
    strength: 'אווירה ביתית שמפחידה יריבות',
    weakness: 'לחץ ענק, המורל מתרסק בהפסד',
    traits: { attack: +2, defence: +2, budget: 0.9, prestige: 42, youth: 0.16 },
  },
  {
    id: 'tel-arad', name: 'מכבי תל ערד', short: 'תל ערד', city: 'תל ערד',
    primary: '#16a085', secondary: '#04302a', accent: '#e0fbf6',
    shape: 'round', pattern: 'solid', founded: 1991, tier: 1,
    blurb: 'מועדון צעיר שרק מתחיל לבנות את עצמו.',
    strength: 'שחקנים צעירים שישתפרו מהר',
    weakness: 'חסרי ניסיון, נשברים במשחקים גדולים',
    traits: { attack: 0, defence: -2, budget: 0.85, prestige: 22, youth: 0.34 },
  },
];

/** Fixed local rivalries, so a derby feels like a derby. */
export const DERBIES: [string, string][] = [
  ['nahal-oz', 'ein-sela'],
  ['sdot-micha', 'har-gefen'],
  ['kfar-yam', 'tel-arad'],
  ['ramat-tal', 'givat-oren'],
];

/**
 * A geographic league sets its own derbies at runtime, so a fixed list is not
 * enough. The registry below is filled whenever a league is built or loaded,
 * from each club's rivalId, and isDerby consults it as well as the static list.
 * It is career-scoped module state, re-synced at every entry point (new game,
 * city pick, season rollover, save load), never persisted on its own.
 */
let derbyRegistry = new Set<string>();
const derbyKey = (a: string, b: string) => [a, b].sort().join('|');

export function setDerbies(pairs: Array<[string, string]>): void {
  derbyRegistry = new Set(pairs.map(([a, b]) => derbyKey(a, b)));
}

export function isDerby(a: string, b: string): boolean {
  if (derbyRegistry.has(derbyKey(a, b))) return true;
  return DERBIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export const LEAGUE_NAMES: Record<number, string> = {
  1: 'ליגה ג׳',
  2: 'ליגה ב׳',
  3: 'ליגה א׳',
  4: 'הליגה הלאומית',
  5: 'ליגת העל',
};

/**
 * Squad rating ceiling by tier. The step between divisions is deliberately
 * moderate: big enough that promotion is a crisis you have to spend your way
 * out of, small enough that a promoted club is not relegated on arrival every
 * single time. Verified by simulating full careers, not by feel.
 */
export function leagueCeiling(tier: number): number {
  return 47.5 + 5.5 * tier; // tier1 = 53 ... tier5 = 75, before facilities bonus
}
