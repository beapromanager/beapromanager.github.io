/**
 * The neighbourhood league's teaser on the title screen (Itzik, 23.10): a card that counts down to the day
 * registration opens, and takes itself off the screen when the count ends, so a launch that slips never
 * shows a promise nothing keeps. It knows nothing of the league itself: no server, no door, no rules.
 */

/**
 * Thursday 29.10.2026, 20:00 on the clock of Israel (Itzik, 25.10: the launch moved a week, and the first
 * registration opens on a Thursday, once). The clocks went back in the night of Sunday 25.10, so Israel is
 * already on winter time, UTC+2, and 20:00 there is 18:00 UTC. Pinned in teaser-check against the
 * Asia/Jerusalem zone, not against a sum done by hand.
 */
export const TEASER_OPENS_AT = Date.UTC(2026, 9, 29, 18, 0, 0);

const HE_DAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const EN_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The date under the count, "חמישי 29.10 · 20:00", read off TEASER_OPENS_AT in Israel's own zone so the
 * one constant above is the only place the date lives.
 */
export function teaserDateLabel(at: number = TEASER_OPENS_AT): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = HE_DAY[EN_DAY.indexOf(get('weekday'))] ?? '';
  // Intl pads the day and the month to two digits once the hour is asked for too; the card writes 5.11, not 05.11
  return `${day} ${Number(get('day'))}.${Number(get('month'))} · ${get('hour')}:${get('minute')}`;
}

/**
 * The clock the card reads. On a developer's machine ?wknow=<ms> moves it, the same parameter the league's own
 * screens honour, so the second the teaser hands over to the entrance can be watched before the day. Read once at
 * load, because the address bar is tidied straight after. Production is the phone's clock.
 */
const DEV_OFFSET: number = (() => {
  try {
    if (!import.meta.env?.DEV || typeof location === 'undefined') return 0;
    const v = new URLSearchParams(location.search).get('wknow');
    return v && /^\d+$/.test(v) ? Number(v) - Date.now() : 0;
  } catch { return 0; }
})();
export const teaserNow = (): number => Date.now() + DEV_OFFSET;

/** Whole seconds left, never below zero. */
export const teaserSeconds = (now: number, to: number = TEASER_OPENS_AT): number =>
  Math.max(0, Math.floor((to - now) / 1000));

/** The card is shown only while the count has not ended. */
export const teaserShown = (now: number, to: number = TEASER_OPENS_AT): boolean => now < to;

/** days, hours, minutes, seconds of a count, for the card. */
export function teaserParts(s: number): { d: number; h: number; m: number; s: number } {
  return { d: Math.floor(s / 86_400), h: Math.floor((s % 86_400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
