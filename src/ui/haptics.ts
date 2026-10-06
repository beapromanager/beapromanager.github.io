/**
 * The phone in the hand. Itzik's note for the European nights: a goal is felt,
 * not only seen. A phone that cannot buzz, or a browser that will not let it,
 * is silently fine.
 */
export const BUZZ_GOAL: number[] = [40, 60, 140];
export const BUZZ_SAVE: number[] = [30];
export const BUZZ_MISS: number[] = [20, 40, 20];

export function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch { /* a browser that minds is a browser that stays still */ }
}
