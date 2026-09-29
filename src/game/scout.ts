/**
 * The scout.
 *
 * A man hired for one job. The manager picks a style, pays once, and after
 * three rounds he comes back with a name, who then arrives at the next transfer
 * window. One a season: a second scout in the same year would turn a rare
 * decision into a shopping habit, and the price only means something while it
 * is a choice.
 *
 * The three styles buy three different things, see the notes on each. Nothing
 * here touches the squad. The state is a plain record on the save, and the
 * rules that need the rest of the game (the window, the purse, the round
 * counter) live beside the rest of the game in state.ts.
 */
import type { Player, Position, Rng } from '../engine/matchEngine.ts';
import { overall, createRng } from '../engine/matchEngine.ts';
import { makePlayer, NEUTRAL_TRAITS } from '../data/squadGen.ts';
import { leagueCeiling } from '../data/clubs.ts';
import { potentialOf, growForYear } from './career.ts';
import { WINTER_WEEKS, transferFee } from './transfers.ts';

/**
 * Held back until all three styles can find somebody. The hub does not show the
 * door while this is false, so a build with half of it in cannot sell a scout
 * that comes back with nothing. The rules underneath do not read it: they are
 * tested whether or not the door is open.
 */
export const SCOUT_LIVE = false;

export type ScoutStyle = 'keen' | 'safe' | 'old';
export const SCOUT_STYLES: readonly ScoutStyle[] = ['keen', 'safe', 'old'];

/** ליגה א׳, where the amateur assistant leaves and the professional arrives. */
export const SCOUT_TIER = 3;
/** Paid once, on signing. The player he finds is paid for on top. */
export const SCOUT_FEE = 150_000;
/** Rounds he is away before he reports. */
export const SCOUT_ROUNDS = 3;

export interface ScoutState {
  /** the season a scout was last hired in, 0 for never. One a season. */
  hiredSeason: number;
  /** the one at work, or null. Pinned to its season so it can never leak into the next. */
  job: { style: ScoutStyle; startWeek: number; season: number } | null;
  /**
   * What he came back with, waiting for the next window to open. The player is
   * null for a style that cannot find one yet.
   */
  found: { style: ScoutStyle; season: number; player: Player | null } | null;
  /**
   * The find, arrived, for as long as the window that brought him stays open.
   * The price is fixed on arrival, from the man as he is then, a year older.
   * When the window shuts and he is not signed, he is gone.
   */
  offer: ScoutOffer | null;
  /**
   * The stretch of the year the manager last opened the scout's door in, as
   * scoutWindowKey writes it. The red dot on the hub is on until it matches.
   */
  seenKey: string;
}

export interface ScoutOffer { player: Player; fee: number; style: ScoutStyle }

export function emptyScout(): ScoutState {
  return { hiredSeason: 0, job: null, found: null, offer: null, seenKey: '' };
}

/**
 * Which closed stretch of the season this is: the run of rounds before the
 * winter window, or the one after it. Empty while a window is open. The dot on
 * the hub is answered against this rather than switched off by hand, so nothing
 * has to remember to turn it back on when the next window shuts.
 */
export function scoutWindowKey(season: number, week: number): string {
  if (week >= WINTER_WEEKS[0] && week <= WINTER_WEEKS[1]) return '';
  return `${season}:${week < WINTER_WEEKS[0] ? 'a' : 'b'}`;
}

/**
 * DRAFT WORDING, Itzik's to correct. Every line here was written by the
 * assistant except the two that are quoted from him: the signing sentence and
 * the headline of the news.
 */
export const SCOUT_TEXT = {
  door: 'סקאוט',
  hire: 'לשכור',
  // his words
  signed: 'הסקאוט חתם לעבודה חד פעמית ומתחיל לעבוד',
  newsTitle: 'ידיעה חמה',
  // the assistant's
  newsBody: 'הסקאוט חזר. הוא מצא שחקן, והוא יגיע בחלון ההעברות הבא.',
  waiting: 'הסקאוט מצא שחקן. הוא יגיע בחלון ההעברות הבא.',
  // the keen one's news, with the boy in it. "signIn" is Itzik's wording as he
  // wrote it, including the spelling, which is his to confirm.
  keenNews: (name: string, age: number, level: number, reach: number) =>
    `מצאתי נער בן ${age}, ${name}. עכשיו הוא ברמה ${level}, והוא יכול להגיע ל־${reach}. כשהוא יגיע בחלון, תצרף אותו לסגל.`,
  offerTitle: 'הביא הסקאוט',
  signIn: 'לצרף לסגל הבוגרת',
  budget: 'תקציב השחקן נע בין',
  budgetTail: 'צריך שיהיה לך כסף גם בשביל השחקן עצמו, לא רק בשביל הסקאוט.',
  hiredThisSeason: 'כבר שכרת סקאוט העונה.',
  windowOpen: 'אפשר לשכור סקאוט רק כשחלון ההעברות סגור.',
  tooLate: 'לא נשארו מספיק מחזורים עד סוף העונה.',
  tooPoor: 'אין מספיק תקציב',
  tooLow: 'סקאוט מגיע בליגה א׳.',
  gone: 'אין שחקן שהסקאוט הביא.',
} as const;

export const SCOUT_STYLE_TEXT: Record<ScoutStyle, { name: string; blurb: string }> = {
  keen: {
    name: 'הנלהב',
    blurb: 'עובד הכי קשה. מביא נער בן 17 עם הסיכוי הכי גבוה להצליח, אבל לוקח סיכונים.',
  },
  safe: {
    name: 'הבטוח',
    blurb: 'הולך על שחקן בן 19 או 20 מקבוצה יריבה, שכבר הוכיח פוטנציאל גבוה. פחות מהנלהב.',
  },
  old: {
    name: 'הזקן',
    blurb: 'מביא שחקן בן 24 או 25 מליגה בכירה, שכבר הוכיח את עצמו. הכי יקר.',
  },
};

/* ---------------------------------------------------------------- the keen one */

/**
 * The keen one: a boy of seventeen with the most road in front of him, and no
 * promises. Below the division's level today, because seventeen is what it is,
 * with a ceiling far above anything in the squad. The step to eighteen is taken
 * when he arrives, by the same growth the summer gives everybody else.
 */
export const KEEN_AGE = 17;
export const KEEN_ARRIVES_AT = 18;
/** The ceiling he is drawn from, the top of what potentialOf can give. */
export const KEEN_MIN_POTENTIAL = 84;
/** How far under the division's level he starts, as a band. */
const KEEN_BELOW: [number, number] = [3, 9];

const KEEN_POSITIONS: Position[] = ['CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

/**
 * Draw him. Potential is read off the seed a player is born with, so it cannot
 * be asked for: candidates are drawn until one has it, which is fast enough
 * (a couple of dozen draws) and, off a seeded stream, always the same man.
 */
export function findKeen(tier: number, rng: Rng, taken: Set<string>): Player {
  const level = leagueCeiling(tier);
  let best: Player | null = null;
  for (let i = 0; i < 6000; i++) {
    const pos = KEEN_POSITIONS[Math.floor(rng() * KEEN_POSITIONS.length)];
    const p = makePlayer(pos, level - 6, rng, { ...NEUTRAL_TRAITS, youth: 1 }, new Set(taken));
    p.age = KEEN_AGE;
    const o = overall(p);
    if (o < level - KEEN_BELOW[1] || o > level - KEEN_BELOW[0]) continue;
    if (potentialOf(p) >= KEEN_MIN_POTENTIAL) return p;
    if (!best || potentialOf(p) > potentialOf(best)) best = p;
  }
  return best!;   // never reached in practice, and still a legal boy if it is
}

/** The boy as he walks in, a year older. */
export function arrivedKeen(p: Player, youthGrowth = 1): Player {
  return growForYear(p, KEEN_ARRIVES_AT, youthGrowth);
}

/** What he costs, from the man he is on arrival. */
export function keenFee(p: Player, tier: number): number {
  return transferFee(arrivedKeen(p), tier);
}

const budgetMemo = new Map<string, [number, number] | null>();

/**
 * What the player will cost, as a range, for the card that asks the manager to
 * hire. Drawn from the same finder and the same price the arrival uses, over a
 * fixed stream, so the card and the counter can never quote different figures.
 * Null for a style that does not find anybody yet.
 */
export function scoutBudget(style: ScoutStyle, tier: number): [number, number] | null {
  const key = `${style}:${tier}`;
  if (budgetMemo.has(key)) return budgetMemo.get(key)!;
  let range: [number, number] | null = null;
  if (style === 'keen') {
    const rng = createRng(9911 + tier);
    const fees: number[] = [];
    for (let i = 0; i < 40; i++) fees.push(keenFee(findKeen(tier, rng, new Set()), tier));
    fees.sort((a, b) => a - b);
    const round = (n: number) => Math.round(n / 5000) * 5000;
    range = [round(fees[Math.floor(fees.length * 0.1)]), round(fees[Math.floor(fees.length * 0.9)])];
  }
  budgetMemo.set(key, range);
  return range;
}
