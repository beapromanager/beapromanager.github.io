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
import { maybeForeign } from '../data/foreignNames.ts';
import { leagueCeiling } from '../data/clubs.ts';
import { potentialOf, reachableCeiling, growForYear, purseBase } from './career.ts';
import { WINTER_WEEKS, transferFee, MARQUEE_SHARE } from './transfers.ts';

/**
 * Held back until all three styles can find somebody. The hub does not show the
 * door while this is false, so a build with half of it in cannot sell a scout
 * that comes back with nothing. The rules underneath do not read it: they are
 * tested whether or not the door is open.
 */
export const SCOUT_LIVE = true;

export type ScoutStyle = 'keen' | 'safe' | 'old';
export const SCOUT_STYLES: readonly ScoutStyle[] = ['keen', 'safe', 'old'];

/**
 * The places a manager can send him for (Itzik, 15.10: "a good striker is a waste when I already have a good striker").
 * A keeper is a choice too.
 */
export const SCOUT_POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const LINE_OF_POS: Record<string, string> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD',
};

/** What the best of the eleven is at that place, or at his line when nobody plays exactly there; null when nobody does. */
export function starterAt(starters: Player[], position: Position): number | null {
  const exact = starters.filter(p => p.position === position);
  const pool = exact.length ? exact : starters.filter(p => LINE_OF_POS[p.position] === LINE_OF_POS[position]);
  return pool.length ? Math.max(...pool.map(overall)) : null;
}

/** The place of the weakest man of the eleven who is not the keeper: where a scout is most worth sending. */
export function weakestPosition(starters: Player[]): Position {
  const out = starters.filter(p => p.position !== 'GK').sort((a, b) => overall(a) - overall(b))[0];
  return (out?.position as Position) ?? 'ST';
}

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
  job: { style: ScoutStyle; startWeek: number; season: number; position?: Position } | null;
  /**
   * What he came back with, waiting for the next window to open. The player is
   * null for a style that cannot find one yet.
   */
  found: { style: ScoutStyle; season: number; player: Player | null; fromClubId?: string; position?: Position } | null;
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
  /** the men he brought who actually signed, so the press can ask about them */
  signedIds: string[];
}

/** `fromClubId` is the club he is being taken from, when he is somebody's already. */
export interface ScoutOffer {
  player: Player; fee: number; style: ScoutStyle; fromClubId?: string;
  /** the place he was sent to find a man for (15.10), absent on an offer from before it */
  position?: Position;
  /** he is for later: below the man he would replace today, and the card says so */
  prospect?: boolean;
}

export function emptyScout(): ScoutState {
  return { hiredSeason: 0, job: null, found: null, offer: null, seenKey: '', signedIds: [] };
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
  // the safe one's news, with the club he plays for in it
  safeNews: (name: string, clubName: string, age: number, level: number, reach: number) =>
    `מצאתי שחקן אצל ${clubName}: ${name}, בן ${age}, ברמה ${level}. הוא יכול להגיע ל־${reach}. כשהחלון ייפתח, אפשר לחתום עליו, והם יישארו בלעדיו.`,
  from: (clubName: string) => `מ${clubName}`,
  // the old one's news is Itzik's sentence, word for word
  oldNews: (name: string, age: number, level: number) =>
    `מצאתי שחקן: ${name}, בן ${age}, ברמה ${level}. הוא כבר הוכיח את עצמו בליגה בכירה. כשהחלון ייפתח, אפשר להחתים אותו.`,
  fromHigher: 'מליגה בכירה',
  // the place he is sent for (15.10). DRAFT WORDING, Itzik's to correct.
  choose: 'לאיזו עמדה הוא יחפש?',
  chooseHint: 'המספר מתחת לכל עמדה הוא הפותח הכי טוב שלך שם. אין טעם לשלוח אותו אחרי חלוץ כשיש לך חלוץ טוב.',
  yourStarter: (place: string, n: number | null) => (n == null ? `אין לך פותח ב${place}.` : `הפותח שלך ב${place}: ${n}.`),
  forPlace: (place: string, n: number | null) => (n == null ? `ל${place}` : `ל${place} · הפותח שלך ${n}`),
  prospect: 'צעיר לעתיד',
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
export function findKeen(tier: number, rng: Rng, taken: Set<string>, position?: Position): Player {
  const level = leagueCeiling(tier);
  const places = position ? [position] : KEEN_POSITIONS;
  let best: Player | null = null;
  for (let i = 0; i < 6000; i++) {
    const pos = places[Math.floor(rng() * places.length)];
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
export function scoutBudget(style: ScoutStyle, tier: number, position?: Position, anchor?: number | null): [number, number] | null {
  const key = `${style}:${tier}${position ? `:${position}:${anchor ?? ''}` : ''}`;
  if (budgetMemo.has(key)) return budgetMemo.get(key)!;
  let range: [number, number] | null = null;
  if (style === 'old') {
    const rng = createRng(9933 + tier);
    const fees: number[] = [];
    for (let i = 0; i < 40; i++) fees.push(oldFee(findOld(tier, rng, new Set(), position, anchor), tier));
    range = feeRange(fees);
  }
  if (style === 'keen') {
    const rng = createRng(9911 + tier);
    const fees: number[] = [];
    for (let i = 0; i < 40; i++) fees.push(keenFee(findKeen(tier, rng, new Set(), position), tier));
    fees.sort((a, b) => a - b);
    const round = (n: number) => Math.round(n / 5000) * 5000;
    range = [round(fees[Math.floor(fees.length * 0.1)]), round(fees[Math.floor(fees.length * 0.9)])];
  }
  budgetMemo.set(key, range);
  return range;
}

/* ------------------------------------------------------------- the safe one */

/**
 * The safe one: a man of nineteen or twenty already playing for a rival in this
 * league, with a good ceiling and less of it than the keen one's. He is taken
 * from the club that is closest to the manager in the table, or from his derby,
 * so the club that loses him is one the manager is actually fighting.
 */
export const SAFE_POTENTIAL: [number, number] = [70, 83];
/** What it costs over the ordinary fee to take a man from a club that wants him. */
export const SAFE_PREMIUM = 1.5;
/** How many clubs nearest in the table the scout looks in, on top of the derby. */
export const SAFE_NEAREST = 3;

export interface RivalKid { clubId: string; player: Player }

/**
 * Who he takes. Among the nineteen and twenty year olds on offer (never a
 * keeper, that line has its own floor), the best man now whose ceiling is in the
 * band; if nobody's is, the highest ceiling there is, so the search never comes
 * back empty-handed while a boy that age exists. Ties go to whoever was listed
 * first, which is the order the squads are kept in.
 */
export function pickSafe(pool: RivalKid[], position?: Position, anchor?: number | null): RivalKid | null {
  const bestOf = (kids: RivalKid[]): RivalKid | null => {
    if (!kids.length) return null;
    const band = kids.filter(k => {
      const p = potentialOf(k.player);
      return p >= SAFE_POTENTIAL[0] && p <= SAFE_POTENTIAL[1];
    });
    if (band.length) return band.reduce((a, b) => (overall(b.player) > overall(a.player) ? b : a));
    return kids.reduce((a, b) => (potentialOf(b.player) > potentialOf(a.player) ? b : a));
  };
  const old = pool.filter(k => k.player.age >= 19 && k.player.age <= 20 && k.player.position !== 'GK');
  if (!position) return bestOf(old);
  // sent for a place (15.10): the man at that place first, then a year or two older, then his line, and only then anybody;
  // a man who would not even be the weakest of the eleven there is passed over while a wider search can do better
  const aged = (k: RivalKid, to: number) => k.player.age >= 19 && k.player.age <= to;
  const steps: RivalKid[][] = [
    pool.filter(k => aged(k, 20) && k.player.position === position),
    pool.filter(k => aged(k, 22) && k.player.position === position),
    pool.filter(k => aged(k, 22) && LINE_OF_POS[k.player.position] === LINE_OF_POS[position]),
    old,
  ];
  let fallback: RivalKid | null = null;
  for (const kids of steps) {
    const pick = bestOf(kids);
    if (!pick) continue;
    if (anchor == null || overall(pick.player) >= anchor - 1) return pick;
    fallback = fallback ?? pick;
  }
  return fallback;
}

/** The price of taking him, on the man as he is. */
export function safeFee(p: Player, tier: number): number {
  return Math.round((SAFE_PREMIUM * transferFee(p, tier)) / 1000) * 1000;
}

/**
 * The number on the card, "he can reach". The keen one's boy is seventeen and
 * shows the ceiling he was born with; a man of nineteen shows the game's
 * ordinary one, what a season or two can realistically make of him.
 */
export function scoutReach(style: ScoutStyle, p: Player): number {
  // the boy's own ceiling is a promise no career keeps (measured: he reaches about 75 in four years, not 86), so the card
  // quotes what a season or two can realistically make of him, like every other man; nothing left to grow at 24
  return reachableCeiling(p);
}

/** A range from the fees of everybody he could take, rounded outward to five thousand. */
export function feeRange(fees: number[]): [number, number] | null {
  if (!fees.length) return null;
  const lo = Math.floor(Math.min(...fees) / 5000) * 5000;
  const hi = Math.ceil(Math.max(...fees) / 5000) * 5000;
  return [lo, Math.max(hi, lo + 5000)];
}

/* -------------------------------------------------------------- the old one */

/**
 * The old one: a man of twenty four or five who has already shown in a higher
 * league what he can do, so he is exactly as good as he looks and has nothing
 * left to grow into. He is the best player the scout brings, by a distance, and
 * the dearest, and he is kept short of the summer's marquee on both counts, so
 * the one big name of the window is still the big name.
 */
export const OLD_AGES: [number, number] = [24, 25];
/** How far over the division's level he plays, as a band. */
const OLD_ABOVE: [number, number] = [4, 10];
/** What he costs at his usual level, as a share of what the marquee costs. */
export const OLD_SHARE = 0.75;
/** The level the anchor price belongs to, over the division's. */
const OLD_REFERENCE_ABOVE = 7;

const OLD_POSITIONS: Position[] = ['CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

export function findOld(tier: number, rng: Rng, taken: Set<string>, position?: Position, anchor?: number | null): Player {
  const level = leagueCeiling(tier);
  const places = position ? [position] : OLD_POSITIONS;
  // sent for a place (15.10), he is three to seven better than the best man the club has there, never past what a man of
  // that league can be; with no place, the old band over the division
  const cap = level + OLD_ABOVE[1];
  const lo = anchor != null ? Math.min(anchor + 3, cap - 1) : level + OLD_ABOVE[0];
  const hi = anchor != null ? Math.min(Math.max(anchor + 7, lo + 1), cap) : cap;
  let last: Player | null = null;
  for (let i = 0; i < 2000; i++) {
    const pos = places[Math.floor(rng() * places.length)];
    const nominal = anchor != null ? lo - 3 + Math.floor(rng() * 4) : level + 2 + Math.floor(rng() * 6);
    const p = makePlayer(pos, nominal, rng, { ...NEUTRAL_TRAITS, youth: 0 }, new Set(taken));
    p.age = OLD_AGES[0] + Math.floor(rng() * 2);
    last = p;
    const o = overall(p);
    // from a higher league: from the Leumit up he is often a foreigner (by his name, so no draw moves)
    if (o >= lo && o <= hi) return maybeForeign(p, tier);
  }
  return maybeForeign(last!, tier);
}

/**
 * What the summer's marquee costs in this division, the floor it is never sold
 * under. The old one is priced off this rather than off his own value, because
 * a proven man from a higher league is not a bargain whatever the formula says.
 */
export function marqueePrice(tier: number): number {
  return Math.round((purseBase(tier) * MARQUEE_SHARE) / 1000) * 1000;
}

/**
 * Three quarters of the marquee at his usual level, and up or down with the
 * man by the same curve the game values everyone on, so a better one costs more
 * and the range on the card is real.
 */
export function oldFee(p: Player, tier: number): number {
  const ref = leagueCeiling(tier) + OLD_REFERENCE_ABOVE;
  return Math.round((OLD_SHARE * marqueePrice(tier) * Math.pow(overall(p) / ref, 2.6)) / 1000) * 1000;
}
