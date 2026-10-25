/**
 * What the neighbourhood league pays the career (Itzik, 25.10, option A): a fixed sum by the division the manager is
 * in, the fans, a cabinet of cups, and gems only for a third title in one month. Plain data and plain functions, so
 * the check walks every case without a screen and the champion's card can show the same numbers before the tap.
 *
 * The token from the server is not changed for any of this: its `wageRounds` is read as a factor of the table below
 * (1.5 a first title, 1.0 a second, 0.75 a third and on and second place, 0.5 third, 0.25 finishing yourself), and
 * its `gems` are ignored. The server's numbers stay as they were, so the worker needs no new deploy for the prize.
 *
 * Everything here lives in the career's save, like the rest of its money. A career on another phone counts its
 * own titles: a title won on one device does not add to a month counted on another. That is the known limit.
 */
import { weekMoney } from './daily.ts';

/** gems for the third title in one calendar month (Israel's), once a month: the same as going up a division */
export const WEEKEND_TRIPLE_GEMS = 5;
/** how many titles in one month make the triple */
export const WEEKEND_TRIPLE_AT = 3;
/** the fans' meter after a weekend, by place; a quarter of a league title for the champion (FANS_CHAMPION is 12) */
export const WEEKEND_FANS: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

/**
 * The money, by the division the manager is in, never by the wage bill of the squad he holds: a week of daily
 * gifts is worth 1.5 wage rounds in every division (daily.ts), so 1.5 here is one such week, and the token's
 * factor scales it. Rounded to the thousand.
 */
export function weekendMoney(tier: number, wageRounds: number): number {
  return Math.round(weekMoney(tier) * wageRounds / 1.5 / 1000) * 1000;
}

/** the division the money is counted in: the lower of where the career is now and where it was when the prize was first seen, so going up in between does not inflate it */
export function prizeTier(careerTier: number, tierSeen?: number | null): number {
  const now = Math.max(1, Math.min(5, Math.round(careerTier)));
  const seen = typeof tierSeen === 'number' && tierSeen >= 1 && tierSeen <= 5 ? Math.round(tierSeen) : now;
  return Math.min(now, seen);
}

const MONTH_FMT = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit' }) : null;
/** 'YYYY-MM' of an instant on Israel's calendar, whatever zone the phone is in: a final on 30.11 at 22:30Z is 1.12 in Israel, December */
export function weekendMonthKey(at: number): string {
  if (!MONTH_FMT) { const d = new Date(at + 2 * 3_600_000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
  const parts = MONTH_FMT.formatToParts(new Date(at));
  const y = parts.find(p => p.type === 'year')?.value ?? '0000';
  const m = parts.find(p => p.type === 'month')?.value ?? '00';
  return `${y}-${m}`;
}

const DATE_FMT = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: '2-digit' }) : null;
/** "08.11.26" on Israel's calendar */
export function weekendDate(at: number): string {
  if (!DATE_FMT) return new Date(at).toISOString().slice(0, 10);
  return DATE_FMT.format(new Date(at)).replace(/\//g, '.');
}

/** one cup on the shelf: places one to three; finishing yourself does not go in the cabinet */
export interface CabinetEntry {
  nonce: string;
  /** the league's id from the token, when the token carries it */
  league: string;
  leagueName: string;
  place: number;
  final: number;
  nick: string;
  money: number;
  /** this was the third title of its month, and paid the gems */
  tripleBonus: boolean;
}

/** what a career keeps of its weekends */
export interface WeekendRecord {
  /** prize nonces already in this career: a token comes in once */
  applied: string[];
  /** first places */
  titles: number;
  /** 'YYYY-MM' (Israel) to first places that month */
  months?: Record<string, number>;
  /** months whose triple has been paid */
  bonusMonths?: string[];
  cabinet?: CabinetEntry[];
  /** league ids whose prize is in this career, every place (the cabinet holds only one to three) */
  appliedLeagues?: string[];
}

export const emptyWeekend = (): WeekendRecord => ({ applied: [], titles: 0 });

/** the token's fields this needs; the signed token from the server carries them all, and `tierSeen` is the phone's own */
export interface WeekendPrizeInput {
  nonce: string;
  league?: string;
  place: number;
  wageRounds: number;
  gems?: number;
  finished: boolean;
  nick: string;
  leagueName: string;
  final: number;
  /** the career's division when this phone first saw the prize; local only, never signed */
  tierSeen?: number;
}

export interface WeekendOutcome {
  money: number;
  fans: number;
  gems: number;
  monthKey: string;
  /** first places this month once this one is counted */
  monthCount: number;
  triple: boolean;
  /** the title number once this one is counted (only for a first place) */
  titleNo: number;
  record: WeekendRecord;
}

/**
 * What a prize does to a career's weekend record, and what it pays, without touching the career. Only a new nonce
 * gets here (the caller checks); the triple is paid on the third first place of a month, once a month.
 */
export function weekendOutcome(had: WeekendRecord | undefined, token: WeekendPrizeInput, careerTier: number): WeekendOutcome {
  const base: WeekendRecord = had ?? emptyWeekend();
  const tier = prizeTier(careerTier, token.tierSeen);
  const money = weekendMoney(tier, token.wageRounds);
  const fans = WEEKEND_FANS[token.place] ?? 0;
  const monthKey = weekendMonthKey(token.final);
  const months = { ...(base.months ?? {}) };
  const bonusMonths = [...(base.bonusMonths ?? [])];
  let gems = 0, triple = false;
  const first = token.place === 1;
  if (first) {
    months[monthKey] = (months[monthKey] ?? 0) + 1;
    if (months[monthKey] === WEEKEND_TRIPLE_AT && !bonusMonths.includes(monthKey)) { gems = WEEKEND_TRIPLE_GEMS; triple = true; bonusMonths.push(monthKey); }
  }
  const titles = base.titles + (first ? 1 : 0);
  const cabinet = [...(base.cabinet ?? [])];
  if (token.place >= 1 && token.place <= 3) {
    cabinet.push({ nonce: token.nonce, league: token.league ?? '', leagueName: token.leagueName, place: token.place, final: token.final, nick: token.nick, money, tripleBonus: triple });
  }
  const appliedLeagues = [...(base.appliedLeagues ?? [])];
  if (token.league && !appliedLeagues.includes(token.league)) appliedLeagues.push(token.league);
  return {
    money, fans, gems, monthKey, monthCount: months[monthKey] ?? 0, triple, titleNo: titles,
    record: { ...base, applied: [...base.applied, token.nonce], titles, months, bonusMonths, cabinet, appliedLeagues },
  };
}

/** how the cabinet counts: from the shelf, or for an old save with titles and no shelf, that many golds without a date */
export function cabinetCounts(rec: WeekendRecord | undefined): { first: number; second: number; third: number; shelf: CabinetEntry[]; legacy: number } {
  const shelf = rec?.cabinet ?? [];
  const first = shelf.filter(c => c.place === 1).length;
  const legacy = Math.max(0, (rec?.titles ?? 0) - first);
  return { first: first + legacy, second: shelf.filter(c => c.place === 2).length, third: shelf.filter(c => c.place === 3).length, shelf, legacy };
}

/** the month in progress, for the bar: first places so far and whether the triple is paid */
export function monthProgress(rec: WeekendRecord | undefined, now: number): { key: string; count: number; paid: boolean } {
  const key = weekendMonthKey(now);
  return { key, count: rec?.months?.[key] ?? 0, paid: (rec?.bonusMonths ?? []).includes(key) };
}

/** the league ids whose prize already sits in a career: the cabinet's and every other place's */
export function leaguesIn(rec: WeekendRecord | undefined): string[] {
  const ids = new Set<string>(rec?.appliedLeagues ?? []);
  for (const c of rec?.cabinet ?? []) if (c.league) ids.add(c.league);
  return [...ids];
}

/** "●●○": the dots of a month, filled up to the triple */
export function monthDots(count: number): string {
  const n = Math.min(count, WEEKEND_TRIPLE_AT);
  return '●'.repeat(n) + '○'.repeat(WEEKEND_TRIPLE_AT - n);
}

/** the career as the weekend screens see it, read once by the app: its division, that division's name, its weekend record */
export interface CareerPrizeView { tier: number; leagueName: string; weekend: WeekendRecord | null }

/**
 * What the champion's card shows before and after the tap, from the same functions the career uses: the money by the
 * division, the title number, the month's count and whether this one is the triple. Once the league is in the career
 * the numbers are read off the record instead of predicted.
 */
export function prizePreview(career: CareerPrizeView | null, input: WeekendPrizeInput): { money: number; tier: number; fans: number; titleNo: number; monthCount: number; triple: boolean; inCareer: boolean } {
  if (!career) return { money: weekendMoney(1, input.wageRounds), tier: 1, fans: WEEKEND_FANS[input.place] ?? 0, titleNo: input.place === 1 ? 1 : 0, monthCount: input.place === 1 ? 1 : 0, triple: false, inCareer: false };
  const rec = career.weekend ?? undefined;
  const inCareer = !!input.league && leaguesIn(rec).includes(input.league);
  const tier = prizeTier(career.tier, input.tierSeen);
  if (inCareer) {
    const entry = (rec?.cabinet ?? []).find(c => c.league === input.league);
    const key = weekendMonthKey(input.final);
    return { money: entry?.money ?? weekendMoney(tier, input.wageRounds), tier, fans: WEEKEND_FANS[input.place] ?? 0, titleNo: rec?.titles ?? 0, monthCount: rec?.months?.[key] ?? 0, triple: !!entry?.tripleBonus, inCareer };
  }
  const o = weekendOutcome(rec, { ...input, nonce: input.nonce || 'preview' }, career.tier);
  return { money: o.money, tier, fans: o.fans, titleNo: o.titleNo, monthCount: o.monthCount, triple: o.triple, inCareer };
}
