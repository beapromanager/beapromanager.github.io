/**
 * The one address a summit share card and reel carry (Itzik, 10.11.2026: "עם קישור ל-beapro.co.il").
 *
 * The game itself does not know which address it is served from, and nothing else in it may name one
 * (scripts/transfer-check.mts holds that). This file is the single exception, on purpose: a picture that leaves the
 * phone has to say where the game lives, whichever address it was made on.
 */
export const SHARE_SITE_URL = 'https://beapro.co.il';
/** the same address as it is written on the card, without the scheme */
export const SHARE_SITE = SHARE_SITE_URL.replace(/^https?:\/\//, '');
