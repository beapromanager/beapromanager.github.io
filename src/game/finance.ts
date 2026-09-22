/**
 * The books, and the owner reading them.
 *
 * Money used to be floored at zero, so a club could lose every week and the
 * debt simply evaporated. Now the purse goes negative and stays negative, and
 * there is a line past which the owner stops paying: cross it and you are out
 * of a job, mid season, career over.
 *
 * The limit is one season's participation money for the division, which is
 * roughly what an owner would cover before deciding the manager is the problem.
 * The point is pressure, not a trap, so it comes with two warnings before the
 * letter, and being in the red unlocks selling outside the transfer window,
 * because a club in trouble is always allowed to raise cash.
 */

import { TOP_TIER } from './career.ts';
import { ownerRope, FANS_MIDDLE, ROPE_SHORT, ROPE_LONG } from './fans.ts';

/** How deep into the red the owner will follow you, by division. */
// The bottom division is where a manager learns, so it is the most forgiving
// relative to what a season there costs. Above it the rope is roughly one
// season's participation money, which is about what an owner would carry
// before deciding the manager is the problem.
const DEBT_LIMIT = [0, 150_000, 300_000, 800_000, 2_000_000, 5_000_000];

export function debtLimit(tier: number): number {
  return DEBT_LIMIT[Math.max(1, Math.min(TOP_TIER, Math.round(tier)))];
}

export type DebtLevel = 'clear' | 'watched' | 'warned' | 'final' | 'sacked';

export interface DebtState {
  /** the purse, negative when in the red */
  money: number;
  /** the terrace, because it is what set the limit */
  fans: number;
  /** what is owed, 0 when in the black */
  debt: number;
  limit: number;
  /** 0 in the black, 1 at the sack line */
  ratio: number;
  level: DebtLevel;
  /** what is left before the owner acts, 0 once he has */
  headroom: number;
}

export function debtState(money: number, tier: number, fans: number = FANS_MIDDLE): DebtState {
  // the club's rope, stretched or shortened by the people in the ground
  const limit = Math.round(debtLimit(tier) * ownerRope(fans));
  const debt = Math.max(0, -money);
  const ratio = limit > 0 ? debt / limit : 0;
  const level: DebtLevel =
    debt === 0 ? 'clear'
      : ratio >= 1 ? 'sacked'
        : ratio >= 0.75 ? 'final'
          : ratio >= 0.45 ? 'warned'
            : 'watched';
  return { money, fans, debt, limit, ratio, level, headroom: Math.max(0, limit - debt) };
}

const K = (n: number) => `₪${Math.round(n).toLocaleString('en-US')}`;

/**
 * What the terrace did to his patience, when it did enough to mention. In the
 * middle it says nothing, because in the middle nothing happened.
 */
function ropeLine(fans: number): string {
  if (fans <= ROPE_SHORT) return ' האצטדיון מתרוקן, והבעלים מרגיש את זה בקופה. הסבלנות שלו קצרה מהרגיל.';
  if (fans >= ROPE_LONG) return ' היציע מלא בכל מחזור, והכסף הזה נכנס. הבעלים מוכן לספוג קצת יותר.';
  return '';
}

/** What the owner says about it, in his own words. */
export function debtLine(d: DebtState): string {
  const rope = ropeLine(d.fans);
  switch (d.level) {
    case 'watched':
      return `המועדון במינוס של ${K(d.debt)}. עוד לא נורא, אבל הבעלים רואה את זה.${rope}`;
    case 'warned':
      return `מינוס של ${K(d.debt)}. הבעלים מבקש שתמכור ותאזן, יש לך ${K(d.headroom)} עד שהוא מפסיק לכסות.${rope}`;
    case 'final':
      return `אזהרה אחרונה. המינוס ${K(d.debt)}, ועוד ${K(d.headroom)} והחוזה שלך נגמר.${rope}`;
    case 'sacked':
      return `החוב הגיע ל${K(d.debt)}. הבעלים סוגר את הברז ומסיים את ההתקשרות.`;
    default:
      return '';
  }
}
