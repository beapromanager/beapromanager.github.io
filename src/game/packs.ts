/**
 * Gems and packs, the gacha layer.
 *
 * Gems are a SEPARATE currency from the club's shekels, deliberately. Nothing
 * in the calibrated economy can be converted into a gem, so no amount of
 * transfer profit buys a world class card. Gems only come in through:
 *   - a small grant when the career starts
 *   - watching an ad, capped per season so the reward stays scarce
 *   - promotion, a milestone bonus
 *
 * The hard rule that protects the difficulty ramp: no pack may ever produce a
 * player better than the BASE of the division one tier above yours. A card two
 * tiers up would break both the calibrated match engine and the whole climb.
 *
 * The three packs are separated by UPSIDE as much as by rating, because
 * leagueCeiling only grows 5.5 per division and rating alone leaves no room:
 *   boost, a young player who will grow into the side
 *   star,  young and already good
 *   pro,   good right now, at the level of the division above
 */
import { ADS_LIVE } from '../data/ads.ts';
import type { Player, Position, Rng } from '../engine/matchEngine.ts';
import { overall } from '../engine/matchEngine.ts';
import { makePlayer, NEUTRAL_TRAITS } from '../data/squadGen.ts';
import { sellPrice } from './transfers.ts';
import { leagueCeiling } from '../data/clubs.ts';
import { reachableCeiling } from './career.ts';
import { rarityForOvr, type Rarity } from './cards.ts';

/* ------------------------------------------------------------------ gems */

export const GEMS_AT_START = 3;
export const GEMS_PER_AD = 1;

/**
 * What a season's worth of ads is worth, handed over while there are no ads.
 *
 * Turning the clips off quietly makes the game meaner: three gems a season is
 * a pack every other season, and nobody measured the loop without them. So
 * while ADS_LIVE is false the allowance arrives with the season instead of
 * being watched for, and the economy is exactly the one that was balanced.
 */
export function adFreeGems(): number {
  return ADS_LIVE ? 0 : ADS_PER_SEASON * GEMS_PER_AD;
}
export const GEMS_ON_PROMOTION = 5;
/** how many ads can be watched for gems in a single season */
export const ADS_PER_SEASON = 3;

/* ----------------------------------------------------------------- packs */

export type PackId = 'boost' | 'star' | 'pro';

export interface PackSpec {
  id: PackId;
  name: string;
  cost: number;
  blurb: string;
  /** target ACTUAL overall, as an offset from this tier's league ceiling */
  offset: number;
  /** half width of the roll around the target */
  spread: number;
  /** chance the card is a young player */
  youth: number;
  /** minimum growth room demanded of a young card, 0 disables the check */
  minUpside: number;
  /**
   * Bias inside the roll's band. 1 is even, below 1 leans to the top. The
   * dearer the pack the more it should lean, otherwise paying more buys the
   * same average card and the purchase feels arbitrary.
   */
  skew: number;
  /** hard age limit, keeps a premium "ready now" card from being a veteran */
  maxAge: number;
}

/**
 * The ladder trades instant quality against upside, because the tier cap alone
 * leaves too little rating room to separate three packs. boost and star are
 * investments that grow, pro is the best player you are allowed to have today.
 * Left on raw rating the top two would collapse onto the cap together, which
 * made the dearer pack strictly worse.
 */
export const PACKS: PackSpec[] = [
  {
    id: 'boost', name: 'חבילת חיזוק', cost: 5,
    blurb: 'צעיר שעוד ישתפר, ברמת הליגה שלך',
    offset: -2, spread: 3, youth: 0.75, minUpside: 6, skew: 1, maxAge: 24,
  },
  {
    id: 'star', name: 'חבילת כוכב', cost: 12,
    blurb: 'צעיר שכבר טוב, ויגדל עוד',
    offset: +1.5, spread: 2.5, youth: 0.7, minUpside: 5, skew: 0.8, maxAge: 24,
  },
  {
    id: 'pro', name: 'חבילת פרו', cost: 18,
    blurb: 'מוכן עכשיו, ברמת הליגה שמעליך',
    offset: +8, spread: 2, youth: 0.4, minUpside: 0, skew: 0.5, maxAge: 28,
  },
];

export function packById(id: PackId): PackSpec {
  return PACKS.find(p => p.id === id) ?? PACKS[0];
}

/** The safety ceiling: never better than the base of one division up. */
export function packCeiling(tier: number): number {
  return Math.round(leagueCeiling(tier + 1) - 2);
}

/**
 * makePlayer takes a nominal level, not a rating. attrFor hands out hi() on a
 * position's key attributes (worth about +5), while a young roll is docked 3
 * first, and both vary by position. Rather than model that, the roll below
 * starts from this estimate and corrects itself against the rating it actually
 * gets, which keeps a pack honest for keepers and kids alike.
 */
const NOMINAL_LIFT = 5;

const PACK_POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];

export interface PackPull {
  player: Player;
  rarity: Rarity;
  /** shekels offered if the card is sold instead of signed */
  cashValue: number;
  /** how much rating he can still add, 0 for a finished player */
  upside: number;
}

/**
 * Open a pack. `position` biases toward a gap in the squad so a reward never
 * lands as an eleventh striker, `taken` keeps names unique.
 *
 * Rolls are re-drawn a bounded number of times until the card clears the tier
 * cap and, for the young packs, has real growth room. Deterministic for a
 * given rng, so a save that replays lands on the same card.
 */
export function openPack(
  spec: PackSpec,
  tier: number,
  rng: Rng,
  opts: { position?: Position; taken?: Set<string> } = {},
): PackPull {
  const cap = packCeiling(tier);
  const target = Math.min(leagueCeiling(tier) + spec.offset, cap);
  const lo = target - spec.spread;
  const hi = Math.min(target + spec.spread, cap);
  const pos = opts.position ?? PACK_POSITIONS[Math.floor(rng() * PACK_POSITIONS.length)];
  const traits = { ...NEUTRAL_TRAITS, youth: spec.youth };

  let best: Player | null = null;
  let bestMiss = Infinity;
  let bias = -NOMINAL_LIFT;   // corrected against the rating each roll returns

  for (let attempt = 0; attempt < 14; attempt++) {
    const want = lo + Math.pow(rng(), spec.skew) * (hi - lo);
    const p = makePlayer(pos, want + bias, rng, traits, opts.taken);
    const o = overall(p);

    const inBand = o >= lo && o <= hi;
    const ageOk = p.age <= spec.maxAge;
    const upsideOk = spec.minUpside === 0 || reachableCeiling(p) - o >= spec.minUpside;
    if (inBand && ageOk && upsideOk) return finish(p, o);

    // remember the closest legal card in case the preferences never all land
    const miss = (o > cap ? 100 : 0) + Math.abs(o - target)
      + (upsideOk ? 0 : 2) + (ageOk ? 0 : 3);
    if (miss < bestMiss) { bestMiss = miss; best = p; }

    // steer the next roll by however far this one landed off
    if (o < lo) bias += lo - o;
    else if (o > hi) bias -= o - hi;
  }

  const player = best!;
  return finish(player, overall(player));

  function finish(player: Player, o: number): PackPull {
    return {
      player,
      rarity: rarityForOvr(o),
      // What the bench would get for him, no more. This was ninety percent of
      // the book value, priced for a real market, while every other sale in
      // the game pays the division's fraction of it: in ליגה ג׳ a 48 rated
      // keeper from a five gem pack sold for ₪68K, twenty one times what the
      // same man fetched from the bench, and a quarter of a season's purse.
      // Gems are the currency of packs. They do not get to become shekels.
      cashValue: sellPrice(player, tier),
      upside: Math.max(0, reachableCeiling(player) - o),
    };
  }
}

/** Contract length handed to a pulled card when he is added to the squad. */
export const PACK_CONTRACT_YEARS = 2;
