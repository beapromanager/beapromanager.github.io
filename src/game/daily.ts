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
 * The money is scaled to the division, because wages differ about twenty times between the bottom and the top: the same
 * sum is a fortune in ליגה ג׳ and a rounding error in ליגת העל. The table is the economist's, measured on the real game
 * with a bot (PIC/sim-money/daily-gift), and since 16.10 it follows one principle Itzik chose ("תלך על 1.5"): a week of
 * gifts is worth one and a half rounds of wages in every division, so the gift grows with the club. Before that a week
 * in ליגת העל bought less than one round of wages. The gems are three a week in ליגה ג׳ and ב׳, four in א׳ and the
 * Leumit and five in ליגת העל, where the packs are the one upgrade path that scales; and the seventh day is a boost
 * pack up to ליגה א׳ and a star pack from the Leumit up, because the free boost was a bench kid two times in three at
 * the top.
 *
 * The door was opened by Itzik on 12.10 ("תפתח"). One line shuts it again.
 */

/** Whether the daily gift is live for players. One line, like the other doors. Open since 12.10. */
export const DAILY_LIVE = true;

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
  /** a pack of the club's own division on the seventh day */
  pack: boolean;
  /** which pack: a boost up to ליגה א׳, a star from the Leumit up; null on the other days */
  packId: DailyPack | null;
}

/** money for the seven days, by division, ליגה ג׳ first: a week is 1.5 rounds of wages everywhere (the economist, 16.10) */
const MONEY: Record<number, readonly number[]> = {
  1: [2_000, 2_000, 4_000, 5_000, 7_000, 8_000, 12_000],
  2: [2_000, 3_000, 5_000, 6_000, 7_000, 9_000, 14_000],
  3: [10_000, 15_000, 26_000, 30_000, 41_000, 51_000, 77_000],
  4: [15_000, 21_000, 36_000, 43_000, 57_000, 71_000, 107_000],
  5: [37_000, 57_000, 94_000, 112_000, 149_000, 188_000, 283_000],
};
/** gems by day, by division: three a week at the bottom, four in ליגה א׳ and the Leumit, five in ליגת העל */
const GEMS: Record<number, readonly number[]> = {
  1: [0, 0, 1, 0, 1, 1, 0],
  2: [0, 0, 1, 0, 1, 1, 0],
  3: [0, 1, 1, 0, 1, 1, 0],
  4: [0, 1, 1, 0, 1, 1, 0],
  5: [0, 1, 1, 1, 1, 1, 0],
};
/** the pack of the seventh day: a boost up to ליגה א׳, a star from the Leumit up */
export const STAR_FROM_TIER = 4;
export type DailyPack = 'boost' | 'star';
export function dailyPackFor(tier: number): DailyPack {
  return tier >= STAR_FROM_TIER ? 'star' : 'boost';
}
export function gemsAWeek(tier: number): number {
  return GEMS[Math.max(1, Math.min(5, Math.round(tier)))].reduce((a, b) => a + b, 0);
}
export function weekMoney(tier: number): number {
  return MONEY[Math.max(1, Math.min(5, Math.round(tier)))].reduce((a, b) => a + b, 0);
}

/** the gift of a day (1 to 7) for a club in a division */
export function rewardFor(tier: number, pos: number): DailyReward {
  const t = Math.max(1, Math.min(5, Math.round(tier)));
  const i = Math.max(1, Math.min(DAILY_WEEK, Math.round(pos))) - 1;
  const pack = i === DAILY_WEEK - 1;
  return { money: MONEY[t][i], gems: GEMS[t][i], pack, packId: pack ? dailyPackFor(t) : null };
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
