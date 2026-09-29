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
import { WINTER_WEEKS } from './transfers.ts';

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
   * What he came back with, waiting for the next window. Nothing but the style
   * to begin with; the player joins it as each style learns to find one.
   */
  found: { style: ScoutStyle; season: number } | null;
  /**
   * The stretch of the year the manager last opened the scout's door in, as
   * scoutWindowKey writes it. The red dot on the hub is on until it matches.
   */
  seenKey: string;
}

export function emptyScout(): ScoutState {
  return { hiredSeason: 0, job: null, found: null, seenKey: '' };
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
  hiredThisSeason: 'כבר שכרת סקאוט העונה.',
  windowOpen: 'אפשר לשכור סקאוט רק כשחלון ההעברות סגור.',
  tooLate: 'לא נשארו מספיק מחזורים עד סוף העונה.',
  tooPoor: 'אין מספיק תקציב',
  tooLow: 'סקאוט מגיע בליגה א׳.',
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
