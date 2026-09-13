import type { Player, Position, Rng } from '../engine/matchEngine.ts';
import { overall } from '../engine/matchEngine.ts';
import { makePlayer, playerValue, NEUTRAL_TRAITS } from '../data/squadGen.ts';
import { leagueCeiling } from '../data/clubs.ts';
import { playerWage, purseBase } from './career.ts';

/**
 * Transfer windows during the league. The summer's business now happens in the
 * pre season, before a ball is kicked, so mid season there is only the short
 * winter window. Outside it the market is shut, which is what makes squad
 * building matter.
 */
export const WINTER_WEEKS: [number, number] = [8, 9];

export interface WindowState {
  open: boolean;
  label: string;
  weeksLeft: number;
  nextOpensWeek: number | null;
}

export function windowState(week: number, _totalRounds: number): WindowState {
  if (week >= WINTER_WEEKS[0] && week <= WINTER_WEEKS[1]) {
    return { open: true, label: 'חלון החורף', weeksLeft: WINTER_WEEKS[1] - week + 1, nextOpensWeek: null };
  }
  const next = week < WINTER_WEEKS[0] ? WINTER_WEEKS[0] : null;
  return { open: false, label: 'החלון סגור', weeksLeft: 0, nextOpensWeek: next };
}

/** Squad size limits, keeps the market a decision and not a hoard. */
export const MIN_SQUAD = 16;
export const MAX_SQUAD = 20;

export interface FreeAgent {
  player: Player;
  fee: number;
  /** short pitch in the manager's language */
  note: string;
  /** somebody else is closing in: this is the last round he can be signed */
  leaving?: boolean;
  /** the summer's marquee name, a level above the rest and priced like it */
  marquee?: boolean;
}

const POOL_POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'CB', 'ST'];

/**
 * A spine that guarantees the market always covers every line, with two
 * keepers, so a manager who sells a goalkeeper can always buy one. Positions
 * past the spine are filled at random for variety.
 */
const MARKET_SPINE: Position[] = ['GK', 'CB', 'CM', 'ST', 'LB', 'CAM', 'RW', 'GK', 'RB', 'CDM', 'LW', 'CB', 'ST', 'CM'];

const NOTES_YOUNG = ['יצא מהנוער של קבוצה גדולה', 'סוכן דוחף אותו חזק', 'לא קיבל צ׳אנס בקבוצה הקודמת'];
const NOTES_PRIME = ['חופשי אחרי סיום חוזה', 'רוצה לשחק קרוב לבית', 'ירד ליגה ומחפש להוכיח'];
const NOTES_OLD = ['ותיק, יביא ניסיון לחדר ההלבשה', 'בשנים האחרונות שלו', 'מכיר את הליגה בעל פה'];

/**
 * Build the market for a season. Quality respects the league ceiling.
 * `taken` holds names already in use so a free agent never shares a name
 * with someone in your own squad.
 */
export function makeMarket(
  tier: number, rng: Rng, size = 12, taken?: Set<string>,
  /** put a few on notice straight away, so round one already warns you */
  opts: { notice?: boolean } = {},
): FreeAgent[] {
  const ceiling = leagueCeiling(tier);
  const used = new Set<string>(taken ?? []);
  const out: FreeAgent[] = [];
  for (let i = 0; i < size; i++) {
    const pos = i < MARKET_SPINE.length ? MARKET_SPINE[i] : POOL_POSITIONS[Math.floor(rng() * POOL_POSITIONS.length)];
    const base = ceiling - 10 + Math.round(rng() * 12);
    const traits = { ...NEUTRAL_TRAITS, youth: i < 3 ? 0.75 : 0.1 };
    const player = makePlayer(pos, base, rng, traits, used);
    const notes = player.age <= 21 ? NOTES_YOUNG : player.age >= 31 ? NOTES_OLD : NOTES_PRIME;
    out.push({
      player,
      fee: transferFee(player, tier),
      note: notes[Math.floor(rng() * notes.length)],
    });
  }
  // a market that is already moving when you walk into it: some of these men
  // will be gone next round, and you are told which
  if (opts.notice !== false) putOnNotice(out, rng);
  return out.sort((a, b) => overall(b.player) - overall(a.player));
}

/* ------------------------------------------------------- a moving market */

/** Flag a few as about to sign elsewhere. Never the marquee. */
function putOnNotice(list: FreeAgent[], rng: Rng): void {
  const pool = list.filter(fa => !fa.marquee && !fa.leaving);
  for (let i = 0; i < Math.min(LEAVING_PER_ROUND, pool.length); i++) {
    pool.splice(Math.floor(rng() * pool.length), 1)[0].leaving = true;
  }
}

/** How many of the twelve are put on notice each round. */
const LEAVING_PER_ROUND = 3;

/**
 * What the marquee costs, as a share of what a season in this division pays.
 * Priced against the purse rather than as a multiple of an ordinary fee,
 * because fees and purses climb at different rates: a flat multiplier came out
 * at a third of a season down at the bottom and most of one in ליגה ב׳.
 * A quarter of a season is a real decision in every division.
 */
const MARQUEE_SHARE = 0.25;

const MARQUEE_NOTES = [
  'ירד מליגה גבוהה, והסוכן שלו מחפש לו בית מהר',
  'חזר מחו״ל ומוכן לחתום רק אם זה נסגר השבוע',
  'הקבוצה שלו התפרקה, והוא פנוי עכשיו',
  'שם גדול מדי לליגה הזאת, וזה בדיוק העניין',
];

/**
 * The name that makes a summer. A level clear of everyone else in the list and
 * priced like it, so signing him is a decision about the whole season and not
 * a shopping trip. He turns up in the last round of the window, when the
 * manager already knows what his squad is missing.
 */
function marqueeAgent(tier: number, rng: Rng, used: Set<string>): FreeAgent {
  const ceiling = leagueCeiling(tier);
  const pos = MARKET_SPINE[Math.floor(rng() * 7)];   // a spine role, never a spare
  const player = makePlayer(pos, ceiling + 6 + Math.round(rng() * 4), rng, NEUTRAL_TRAITS, used);
  player.age = 24 + Math.floor(rng() * 6);           // in his prime, not a project
  return {
    player,
    // never under what he would fetch ordinarily, so a star is never a bargain
    fee: Math.max(transferFee(player, tier), Math.round(purseBase(tier) * MARQUEE_SHARE / 1000) * 1000),
    note: MARQUEE_NOTES[Math.floor(rng() * MARQUEE_NOTES.length)],
    marquee: true,
  };
}

/**
 * Move the market on a round. Whoever was on notice has signed elsewhere, new
 * names come in to replace them, and a fresh few are put on notice for next
 * round, so the list is never the same twice and a player you want is a player
 * you can lose. The marquee arrives in the final round and is never on notice:
 * he is the one name that waits for you.
 */
export function refreshMarket(
  market: FreeAgent[], tier: number, rng: Rng, taken?: Set<string>,
  opts: { size?: number; marquee?: boolean } = {},
): FreeAgent[] {
  const size = opts.size ?? 12;
  const used = new Set<string>(taken ?? []);
  // the ones already here keep their names off the new draws
  const stayed = market.filter(fa => !fa.leaving).map(fa => ({ ...fa, leaving: false }));
  for (const fa of stayed) used.add(fa.player.name);

  const want = size - stayed.length - (opts.marquee ? 1 : 0);
  // the arrivals are not put on notice today, so a warning always lasts a
  // full round and is never a surprise
  const incoming = want > 0 ? makeMarket(tier, rng, want, used, { notice: false }) : [];
  if (opts.marquee) incoming.push(marqueeAgent(tier, rng, used));

  putOnNotice(stayed, rng);
  return [...stayed, ...incoming].sort((a, b) => overall(b.player) - overall(a.player));
}

/**
 * Transfer fees scale hard with the division. ליגה ג׳ is amateur, players move
 * for next to nothing, and only near the top does a real market exist. This is
 * what keeps the lower leagues feeling like free, no-contract football, and
 * makes signing a genuine cost only once you are climbing.
 */
const FEE_SCALE: Record<number, number> = { 1: 0.05, 2: 0.16, 3: 0.4, 4: 0.7, 5: 1.0 };

export function transferFee(p: Player, tier: number): number {
  const scale = FEE_SCALE[Math.max(1, Math.min(5, Math.round(tier)))] ?? 1;
  return Math.round((playerValue(p) * scale) / 1000) * 1000;
}

/** What you get back when you let a player go in the window: 85% of his fee, Itzik's number. */
export function sellPrice(p: Player, tier: number): number {
  return Math.round(transferFee(p, tier) * 0.85);
}

/** Proposed contract terms for a signing, derived from rating and age. */
export interface ContractTerms {
  wagePerWeek: number;   // shekels
  years: number;
  signOn: number;        // one time signing fee, the transfer fee
}

export function contractTerms(fa: FreeAgent, tier: number): ContractTerms {
  const age = fa.player.age;
  const years = age <= 23 ? 3 : age >= 31 ? 1 : 2;
  // the weekly wage is the division's wage, not a slice of the fee
  const wage = playerWage(fa.player, tier);
  return { wagePerWeek: wage, years, signOn: fa.fee };
}
