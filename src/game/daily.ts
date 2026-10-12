/**
 * The daily gift (Itzik, 12.10): come in and play every day, and the club's president hands you something.
 *
 * Seven gifts in a row, one a day, the table running round and round, and a gold player on every thirtieth day of
 * an unbroken run. The point is one thing: a reason to open the game today. Everything here is pure and takes the
 * clock as an argument, so a check can walk a month in a millisecond.
 *
 * The rules, in the order Itzik gave them:
 *  - a day is an Israeli calendar day, and the gift of that day is the only one that can be taken;
 *  - it opens once a round has been played that day (a gift for opening the app is a gift for nothing);
 *  - miss a day and the run starts again from the first gift, and so does the count to thirty;
 *  - the seventh gift is a boost pack, the thirtieth day brings a gold player, five above his league.
 *
 * The money is scaled to the division, because wages differ about six times between them: the same sum is a
 * fortune in ליגה ג׳ and a rounding error in ליגת העל. The table is the economist's, measured on the real game
 * with a bot (PIC/sim-money/daily-gift): a week is worth between about one and a half and one round's wage bill.
 * The gems are three a week and the pack is the rest, because a whole season brings about four gems.
 *
 * The door is shut until Itzik opens it, like the scout's.
 */

/** Whether the daily gift is live for players. One line, like the other doors. */
export const DAILY_LIVE = false;

/** the table is seven long */
export const DAILY_WEEK = 7;
/** an unbroken run of this many days brings the gold player, and again on every multiple */
export const GOLD_EVERY = 30;
/** the gold player is this many points above the league he plays in */
export const GOLD_LIFT = 5;
/** a gift opens only after a round was played that day */
export const DAILY_NEEDS_ROUND = true;

export interface DailyState {
  /** days in the current unbroken run, counted when each was taken */
  streak: number;
  /** the day the last gift was taken, as YYYY-MM-DD in Israel */
  lastClaim: string | null;
  /** the last day a round was played, same form */
  played: string | null;
  /** the latest day this device has ever seen: the clock never runs backwards for the game */
  maxDay: string | null;
  /** gold players handed out so far */
  gold: number;
}

export function emptyDaily(): DailyState {
  return { streak: 0, lastClaim: null, played: null, maxDay: null, gold: 0 };
}

export interface DailyReward {
  money: number;
  gems: number;
  /** a boost pack of the club's own division */
  pack: boolean;
}

/** money for the seven days, by division, ליגה ג׳ first. Measured, see the top. */
const MONEY: Record<number, readonly number[]> = {
  1: [2_000, 2_000, 4_000, 5_000, 7_000, 8_000, 12_000],
  2: [2_000, 3_000, 5_000, 6_000, 7_000, 9_000, 14_000],
  3: [9_000, 13_000, 22_000, 26_000, 35_000, 44_000, 66_000],
  4: [10_000, 14_000, 24_000, 29_000, 38_000, 48_000, 72_000],
  5: [18_000, 28_000, 46_000, 55_000, 73_000, 92_000, 138_000],
};
/** one gem on the third, fifth and sixth days: three a week, which is most of what a whole season brings */
const GEMS: readonly number[] = [0, 0, 1, 0, 1, 1, 0];

/** the gift of a day (1 to 7) for a club in a division */
export function rewardFor(tier: number, pos: number): DailyReward {
  const t = MONEY[Math.max(1, Math.min(5, Math.round(tier)))];
  const i = Math.max(1, Math.min(DAILY_WEEK, Math.round(pos))) - 1;
  return { money: t[i], gems: GEMS[i], pack: i === DAILY_WEEK - 1 };
}

/** where a run of this length sits in the week: 1 to 7 */
export function posOfStreak(streak: number): number {
  return ((Math.max(1, streak) - 1) % DAILY_WEEK) + 1;
}

/* ------------------------------------------------------------------ the calendar */

const IL = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })
  : null;

/** the Israeli calendar day of an instant, YYYY-MM-DD */
export function dayKey(now: number): string {
  if (IL) return IL.format(new Date(now));
  return new Date(now + 3 * 3_600_000).toISOString().slice(0, 10);
}

/** the day before / after a YYYY-MM-DD, by plain calendar arithmetic */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * "Today" as the game sees it: the device's day, but never earlier than the latest day it has ever shown.
 * Winding the phone back therefore gives nothing, since yesterday is already taken. Winding it forward
 * is the one cheat left and it is bounded to one gift a day, see PIC/sim-money/daily-gift.
 */
export function today(d: DailyState, now: number): string {
  const k = dayKey(now);
  return d.maxDay && d.maxDay > k ? d.maxDay : k;
}

/* ------------------------------------------------------------------ what the screen shows */

export interface DailyView {
  /** the day the game is on */
  day: string;
  /** the run the next gift would make: 1 when the run was broken or has not begun */
  nextStreak: number;
  /** which of the seven is today's, 1 to 7 */
  todayPos: number;
  /** the days of this week already taken, 1 to (todayPos - 1), or up to todayPos once today's is taken */
  claimedUpTo: number;
  claimedToday: boolean;
  /** a round has been played today */
  playedToday: boolean;
  /** the button is live: the door is open, a round was played, and today's gift is still there */
  canClaim: boolean;
  /** the run just broke: the manager had one and missed a day */
  broken: boolean;
  /** the day of this run that would bring (or brought) the gold player, if it is within sight */
  goldIn: number;
  reward: DailyReward;
  /** the manager's streak right now, which is what he is protecting */
  streak: number;
}

export function dailyView(d: DailyState, tier: number, now: number, live: boolean = DAILY_LIVE): DailyView {
  const day = today(d, now);
  const claimedToday = d.lastClaim === day;
  const continuing = d.lastClaim === addDays(day, -1);
  const nextStreak = claimedToday ? d.streak : continuing ? d.streak + 1 : 1;
  const shown = claimedToday ? d.streak : nextStreak;
  const todayPos = posOfStreak(shown);
  const claimedUpTo = claimedToday ? todayPos : todayPos - 1;
  const playedToday = d.played === day;
  const toGold = GOLD_EVERY - (shown % GOLD_EVERY);
  return {
    day, nextStreak, todayPos, claimedUpTo, claimedToday, playedToday,
    canClaim: live && !claimedToday && (!DAILY_NEEDS_ROUND || playedToday),
    broken: !claimedToday && !continuing && d.streak > 0,
    goldIn: shown % GOLD_EVERY === 0 ? 0 : toGold,
    reward: rewardFor(tier, todayPos),
    streak: claimedToday || continuing ? d.streak : 0,
  };
}
