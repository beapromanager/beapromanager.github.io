/**
 * The coach as a career of his own. He starts an amateur with the CV he picked,
 * and the badges are gates: you cannot walk into a higher division without the
 * qualification for it, so the summer before a step up is a real decision and
 * not a formality.
 *
 * Every ability here feeds the game for real, see the helpers at the bottom:
 * training moves what happens on the pitch, mental moves the dressing room.
 */
import type { CoachAttrs, ManagerId } from '../data/managers.ts';
import { getManager, TRAINING_KEYS, MENTAL_KEYS } from '../data/managers.ts';

export type LicenceId = 'amateur' | 'certified' | 'pro' | 'international';

export interface Licence {
  id: LicenceId;
  name: string;
  /** what the badge is called on the course card */
  course: string;
  blurb: string;
  /** lowest division this badge is enough for; above it you must upgrade */
  coversToTier: number;
  /** cost of the course that grants it */
  cost: number;
  /** what the course adds, spread over the groups */
  gain: { training: number; mental: number };
}

/**
 * Four rungs. The tier each one covers is what makes the gate: reaching ליגה א׳
 * demands the certified badge, ליגת העל demands the pro one, and Europe, when it
 * comes, demands the international.
 */
export const LICENCES: Licence[] = [
  {
    id: 'amateur', name: 'מאמן חובבן', course: '',
    blurb: 'התחלת מלמטה, בלי תעודות, רק אתה והמגרש.',
    coversToTier: 2, cost: 0, gain: { training: 0, mental: 0 },
  },
  {
    id: 'certified', name: 'מאמן מקצועי', course: 'קורס אימון משודרג',
    blurb: 'הקורס הראשון שלך. מפה זה כבר מקצוע, לא תחביב.',
    coversToTier: 4, cost: 120_000, gain: { training: 5, mental: 3 },
  },
  {
    id: 'pro', name: 'מאמן פרו', course: 'תוכנית לימודי מאמן פרו',
    blurb: 'התעודה שדורשים ממך בליגת העל. בלעדיה לא פותחים עונה.',
    coversToTier: 5, cost: 900_000, gain: { training: 7, mental: 5 },
  },
  {
    id: 'international', name: 'מאמן בינלאומי פרו', course: 'הסמכה בינלאומית',
    blurb: 'השדרוג האחרון. מכאן הדרך לאירופה פתוחה.',
    coversToTier: 99, cost: 3_500_000, gain: { training: 8, mental: 6 },
  },
];

export const LICENCE_ORDER: LicenceId[] = ['amateur', 'certified', 'pro', 'international'];

export function licence(id: LicenceId): Licence {
  return LICENCES.find(l => l.id === id) ?? LICENCES[0];
}
export function licenceRank(id: LicenceId): number {
  return LICENCE_ORDER.indexOf(id);
}
export function nextLicence(id: LicenceId): Licence | null {
  const i = licenceRank(id);
  return i >= 0 && i < LICENCES.length - 1 ? LICENCES[i + 1] : null;
}

/** The badge a division demands. */
export function requiredLicence(tier: number): LicenceId {
  for (const l of LICENCES) if (tier <= l.coversToTier) return l.id;
  return 'international';
}

/** Is this coach qualified to open a season in that division? */
export function qualifiedFor(held: LicenceId, tier: number): boolean {
  return licenceRank(held) >= licenceRank(requiredLicence(tier));
}

/* ---------------------------------------------------------------- the coach */

export interface Coach {
  archetype: ManagerId;
  attrs: CoachAttrs;
  licence: LicenceId;
  /** seasons managed, for the profile screen */
  seasons: number;
  /** the highest division he has ever managed in, which is what a CV is read on */
  bestTier: number;
  /** divisions climbed, however he got up */
  promotions: number;
  /** divisions won outright */
  titles: number;
}

export function newCoach(archetype: ManagerId): Coach {
  return {
    archetype, attrs: { ...getManager(archetype).base }, licence: 'amateur',
    seasons: 0, bestTier: 1, promotions: 0, titles: 0,
  };
}

const CAP = 20;
const clamp20 = (n: number) => Math.max(1, Math.min(CAP, Math.round(n)));

/**
 * Take a course. The gain is spread over each group, weighted to what the coach
 * is already good at, so a tactician grows into a better tactician rather than
 * every coach converging on the same numbers.
 */
export function applyCourse(c: Coach, to: LicenceId, extra: { training?: number; mental?: number } = {}): Coach {
  const l = licence(to);
  const attrs = { ...c.attrs };
  const spread = (keys: readonly (keyof CoachAttrs)[], points: number) => {
    const total = keys.reduce((s, k) => s + attrs[k], 0) || 1;
    for (const k of keys) attrs[k] = clamp20(attrs[k] + points * (attrs[k] / total) * keys.length / 2 + points / (keys.length * 2));
  };
  spread(TRAINING_KEYS, l.gain.training + (extra.training ?? 0));
  spread(MENTAL_KEYS, l.gain.mental + (extra.mental ?? 0));
  return { ...c, attrs, licence: to };
}

/* -------------------------------------------------------------- the effects */

/**
 * Every archetype starts on 56 points over 7 abilities, so the average ability
 * a career opens with is 8. That, not the midpoint of the scale, is what an
 * effect has to be centred on: otherwise every manager alive starts worse than
 * the neutral baseline the engine was calibrated against, and coaching could
 * only ever hurt. Centred here, an opening coach is roughly neutral and the
 * courses are what make him genuinely better.
 */
const NEUTRAL = 8;
const swing = (v: number, perPoint: number) => 1 + (v - NEUTRAL) * perPoint;

/**
 * Tactics drive team chemistry, which the engine turns into a 0.90..1.10
 * multiplier on every rating. A clueless coach really does field a team that
 * looks disjointed. Centred on the old hardcoded 0.7.
 */
export function coachChemistry(c: Coach): number {
  return Math.max(0, Math.min(1, 0.70 + (c.attrs.tactics - NEUTRAL) * 0.016));
}

/** Attacking and defensive coaching, kept small so the ramp survives. */
export function coachAttBias(c: Coach): number { return swing(c.attrs.attack, 0.006); }
export function coachDefBias(c: Coach): number { return swing(c.attrs.defence, 0.006); }

/** Extra fitness recovered between rounds, on top of the normal rest. */
export function coachFitnessBonus(c: Coach): number {
  return (c.attrs.fitness - NEUTRAL) * 0.55;
}

/** Weekly morale drift, from how much he lifts and drives the room. */
export function coachMoraleBias(c: Coach): number {
  return (c.attrs.motivation - NEUTRAL) * 0.3 + (c.attrs.determination - NEUTRAL) * 0.12;
}

/** How much of their potential the young actually reach under him. */
export function coachYouthGrowth(c: Coach): number {
  return swing(c.attrs.motivation, 0.035);
}

/** A hard coach keeps his players on the right side of the referee. */
export function coachCardBias(c: Coach): number { return swing(c.attrs.discipline, -0.03); }

/* ------------------------------------------------------- the standing 1..100 */

/**
 * What the football world thinks of this manager, one to a hundred.
 *
 * Deliberately not an average of his attributes. Those only move when he pays
 * for a course, three or four times in a whole career, so a rating built on
 * them would sit still for seasons at a time and mean nothing. A manager's
 * standing is what he has DONE: how high he has managed, what he has won, how
 * long he has lasted, what he is qualified for, and only then how much craft he
 * has added since he started.
 *
 * A brand new manager is exactly 1. A hundred is a man who has won the top
 * division, holds the international badge, and has the seasons behind him to
 * prove it was not luck.
 */
export const RATING_WEIGHTS = {
  /** how high he has managed. The single loudest signal in football */
  level: 0.25,
  /** promotions and titles */
  honours: 0.22,
  /** craft added since he began, which is what courses buy */
  craft: 0.22,
  /** seasons survived. A slow floor that rewards simply lasting */
  experience: 0.18,
  /** the badge on the wall */
  badge: 0.13,
} as const;

/** Seasons at which the experience term is full. */
const EXPERIENCE_FULL = 20;
/** Promotions and titles at which the honours term is full. */
const HONOURS_FULL = 12;
/** The top division, for scaling the level term. */
const TOP_TIER = 5;

export interface RatingBreakdown {
  rating: number;
  parts: { key: keyof typeof RATING_WEIGHTS; label: string; got: number; of: number }[];
}

const LABEL: Record<keyof typeof RATING_WEIGHTS, string> = {
  level: 'הליגה הגבוהה שאימנת בה',
  honours: 'עליות ואליפויות',
  craft: 'היכולת שהוספת בקורסים',
  experience: 'עונות על הקווים',
  badge: 'התעודה שבידך',
};

/** 0..1 for each term, so the breakdown and the number can never disagree. */
function terms(c: Coach): Record<keyof typeof RATING_WEIGHTS, number> {
  const base = getManager(c.archetype).base;
  const keys = [...TRAINING_KEYS, ...MENTAL_KEYS] as (keyof CoachAttrs)[];
  const avg = (o: CoachAttrs) => keys.reduce((s, k) => s + o[k], 0) / keys.length;
  const from = avg(base);
  // only growth counts, so the CV he picked does not hand him a head start
  const craft = CAP > from ? (avg(c.attrs) - from) / (CAP - from) : 0;

  const honours = (c.promotions ?? 0) + (c.titles ?? 0) * 2;
  return {
    level: clamp01(((c.bestTier ?? 1) - 1) / (TOP_TIER - 1)),
    honours: clamp01(honours / HONOURS_FULL),
    craft: clamp01(craft),
    experience: clamp01((c.seasons ?? 0) / EXPERIENCE_FULL),
    badge: clamp01(licenceRank(c.licence) / (LICENCE_ORDER.length - 1)),
  };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** The number on his badge. Whole, always, like every meter in the game. */
export function coachRating(c: Coach): number {
  const t = terms(c);
  let progress = 0;
  for (const k of Object.keys(RATING_WEIGHTS) as (keyof typeof RATING_WEIGHTS)[]) {
    progress += RATING_WEIGHTS[k] * t[k];
  }
  return Math.round(1 + 99 * clamp01(progress));
}

/** The same number, with what is holding it back, for the profile screen. */
export function ratingBreakdown(c: Coach): RatingBreakdown {
  const t = terms(c);
  return {
    rating: coachRating(c),
    parts: (Object.keys(RATING_WEIGHTS) as (keyof typeof RATING_WEIGHTS)[])
      .map(k => ({
        key: k, label: LABEL[k],
        got: Math.round(RATING_WEIGHTS[k] * t[k] * 99),
        of: Math.round(RATING_WEIGHTS[k] * 99),
      }))
      .sort((a, b) => b.of - a.of),
  };
}

/** What to call a manager of this standing, the way a card names a rarity. */
export function standingName(rating: number): string {
  if (rating >= 90) return 'שם עולמי';
  if (rating >= 75) return 'מאמן צמרת';
  if (rating >= 58) return 'מאמן מבוסס';
  if (rating >= 40) return 'שם מוכר בליגה';
  if (rating >= 24) return 'מאמן מן השורה';
  if (rating >= 12) return 'מאמן צעיר';
  return 'אלמוני';
}
