/**
 * The neighbourhood league's teaser on the title screen (Itzik, 23.10): a card that counts down to the day
 * registration opens, and takes itself off the screen when the count ends, so a launch that slips never
 * shows a promise nothing keeps. It knows nothing of the league itself: no server, no door, no rules.
 */

/**
 * Monday 26.10.2026, 12:00 on the clock of Israel (Itzik, 24.10: the launch moved from Sunday 20:00 to Monday noon).
 * The clocks go back in the night of Sunday 25.10 (the last Sunday of October), so on Monday Israel is on winter
 * time, UTC+2, and 12:00 there is 10:00 UTC. Pinned in teaser-check against the Asia/Jerusalem zone, not against a
 * sum done by hand.
 */
export const TEASER_OPENS_AT = Date.UTC(2026, 9, 26, 10, 0, 0);

/** Whole seconds left, never below zero. */
export const teaserSeconds = (now: number, to: number = TEASER_OPENS_AT): number =>
  Math.max(0, Math.floor((to - now) / 1000));

/** The card is shown only while the count has not ended. */
export const teaserShown = (now: number, to: number = TEASER_OPENS_AT): boolean => now < to;

/** days, hours, minutes, seconds of a count, for the card. */
export function teaserParts(s: number): { d: number; h: number; m: number; s: number } {
  return { d: Math.floor(s / 86_400), h: Math.floor((s % 86_400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
