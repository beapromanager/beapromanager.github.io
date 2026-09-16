/**
 * The shirt sponsor.
 *
 * The club had exactly one income that mattered, prize money, which is why the
 * economy nearly bankrupted every new manager and why the ground was worth
 * building only for the promotion rules. A sponsor fixes both: it is steady
 * money a small club can plan around, and one of the deals pays on how full
 * the ground is, so a stand finally earns twice.
 *
 * It is also a decision rather than a number. Safe money, money that only
 * arrives if you go up, or money that follows the crowd: the same three
 * temperaments the rest of the game asks about. Each temperament now belongs
 * to a BRAND with a reason to want the shirt (see data/sponsors), so the
 * choice is between two companies and not three rows of the same logo.
 *
 * The brands compete. The one turned down last summer comes back offering
 * more, and keeps raising it every summer it is turned down again, up to a
 * ceiling; the one that has kept the shirt for three seasons running pays a
 * little extra for the loyalty. Switching every year is not free money and
 * staying is not a trap, which is what keeps the summer a real question.
 */

import { TOP_TIER } from './career.ts';
import { BRANDS, brandById, type BrandId } from '../data/sponsors.ts';

export type SponsorId = 'base' | 'results' | 'crowd';

export interface SponsorOffer {
  id: SponsorId;
  /** who is on the shirt */
  brand: BrandId;
  /** what the deal is called */
  name: string;
  blurb: string;
  /** paid every round, before the crowd multiplier */
  perRound: number;
  /** a lump the day you go up, 0 on the deals that do not pay for it */
  promotionBonus: number;
  /** true when the round payment scales with how full the ground is */
  followsCrowd: boolean;
  /** the raise over the plain price, as a share: 0.2 is twenty percent more */
  raise: number;
  /** why the price is raised, for the tag on the card */
  raiseWhy: 'comeback' | 'loyalty' | null;
  /** what the same deal would have cost with no raise, for the struck line */
  plainPerRound: number;
}

export interface Sponsor {
  id: SponsorId;
  brand: BrandId;
  name: string;
  perRound: number;
  promotionBonus: number;
  followsCrowd: boolean;
  /** the season it was signed for, so it is re-negotiated every summer */
  season: number;
  /** the first of the seasons this brand has held the shirt without a break */
  since: number;
}

/** What the brand will spend on a club in this division, across a season. */
const SEASON_VALUE = [0, 45_000, 85_000, 280_000, 575_000, 1_350_000];

/** The crowd a division expects, which the crowd deal is measured against. */
// kept in step with career.ts DEMAND, so the crowd deal pays 1.0 for a normal
// turnout and up to 2.0 for a ground that is genuinely packed
const EXPECTED_CROWD = [0, 250, 700, 1_500, 4_500, 16_000];

/** the brand turned down last summer raises by this much per summer turned down */
export const COMEBACK_STEP = 0.15;
export const COMEBACK_FIRST = 0.20;
export const COMEBACK_CAP = 0.50;
/** the shirt kept this many seasons running earns the loyalty raise */
export const LOYALTY_SEASONS = 3;
export const LOYALTY_RAISE = 0.10;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * How much a brand raises its offer this summer, given who held the shirt.
 *
 * `current` is last season's deal, still on the state until the new one is
 * signed. The other brand has been turned down once per season the current
 * one has held the shirt, and comes back at twenty, thirty five, fifty
 * percent. The current brand, three seasons in, adds its loyalty ten.
 */
export function brandRaise(brand: BrandId, current: Sponsor | null, season: number): { raise: number; why: SponsorOffer['raiseWhy'] } {
  if (!current || current.season !== season - 1) return { raise: 0, why: null };
  const held = season - (current.since ?? current.season);   // seasons the current brand has had it
  if (current.brand !== brand) {
    const turnedDown = Math.max(1, held);
    return { raise: Math.min(COMEBACK_CAP, COMEBACK_FIRST + COMEBACK_STEP * (turnedDown - 1)), why: 'comeback' };
  }
  if (held >= LOYALTY_SEASONS) return { raise: LOYALTY_RAISE, why: 'loyalty' };
  return { raise: 0, why: null };
}

const DEAL: Record<SponsorId, { name: string; blurb: string }> = {
  base: { name: 'חוזה בסיס', blurb: 'סכום קבוע כל מחזור. בלי הפתעות, בלי בונוסים.' },
  results: { name: 'חוזה הישגים', blurb: 'פחות כל מחזור, אבל מענק גדול אם תעלה ליגה.' },
  crowd: { name: 'חוזה יציע', blurb: 'משתלם לפי כמה שהיציע מלא. אצטדיון גדול שווה כאן כפול.' },
};

/**
 * The offers on the table, sized to the division and to how well known the
 * club is. A bigger name is worth more to a sponsor, which is most of what
 * prestige is for. Every brand puts up the deals that fit it, at its own
 * raise for this summer.
 */
export function sponsorOffers(tier: number, prestige: number, rounds: number, current: Sponsor | null = null, season = 1): SponsorOffer[] {
  const t = clamp(Math.round(tier), 1, TOP_TIER);
  const value = SEASON_VALUE[t] * (0.75 + clamp(prestige, 0, 100) / 200);
  const r = Math.max(1, rounds);
  const round100 = (n: number) => Math.round(n / 100) * 100;

  const plain = (id: SponsorId) => ({
    perRound: id === 'base' ? value / r : id === 'results' ? (value * 0.6) / r : (value * 0.55) / r,
    promotionBonus: id === 'results' ? value * 1.35 : 0,
  });

  const out: SponsorOffer[] = [];
  for (const b of BRANDS) {
    const { raise, why } = brandRaise(b.id, current, season);
    for (const id of b.deals) {
      const p = plain(id);
      out.push({
        id, brand: b.id, name: DEAL[id].name, blurb: DEAL[id].blurb,
        perRound: round100(p.perRound * (1 + raise)),
        promotionBonus: round100(p.promotionBonus * (1 + raise)),
        followsCrowd: id === 'crowd',
        raise, raiseWhy: why,
        plainPerRound: round100(p.perRound),
      });
    }
  }
  return out;
}

export function signSponsor(offer: SponsorOffer, season: number, previous: Sponsor | null = null): Sponsor {
  // the same brand straight on from last season keeps its run going
  const kept = previous && previous.brand === offer.brand && previous.season === season - 1;
  return {
    id: offer.id, brand: offer.brand, name: offer.name,
    perRound: offer.perRound, promotionBonus: offer.promotionBonus,
    followsCrowd: offer.followsCrowd, season,
    since: kept ? (previous.since ?? previous.season) : season,
  };
}

/** The name on the shirt. */
export function sponsorName(s: Sponsor | null): string {
  return s ? brandById(s.brand).name : '';
}

/**
 * What the sponsor pays for a single round.
 *
 * The crowd deal is measured against what the division expects to draw, so
 * filling a small ground is worth something and a big one is worth a lot,
 * capped at twice so a huge stadium in a low division cannot break the economy.
 */
export function sponsorRound(s: Sponsor | null, tier: number, attendance: number): number {
  if (!s) return 0;
  if (!s.followsCrowd) return s.perRound;
  const t = clamp(Math.round(tier), 1, TOP_TIER);
  const share = clamp(Math.max(0, attendance) / EXPECTED_CROWD[t], 0, 2);
  return Math.round(s.perRound * (0.35 + 0.85 * share));
}
