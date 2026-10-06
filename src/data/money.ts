/**
 * How money is written in the game, in one place.
 *
 * Money is shortened to thousands and millions, and the rule is Itzik's: nothing
 * above 999K is ever written in thousands. A purse of 3,739,000 is ₪3.7M, never
 * ₪3739K, and 999,500 and up is a million, never "1000K". Before this lived in
 * six places, five of which stopped at K, which is how a winter window card
 * told a manager he had "₪3739K".
 *
 * Every screen and every sentence that shortens an amount goes through here.
 */

/**
 * Millions to a tenth, in whole numbers so 1,450,000 is 1.5 and not 1.4 by the
 * grace of floating point. A round million reads "1M", not "1.0M".
 */
const millions = (v: number): string => {
  const tenths = Math.round(v / 100_000);
  const whole = Math.floor(tenths / 10), tenth = tenths % 10;
  return tenth ? `${whole}.${tenth}` : `${whole}`;
};

/** 950, 15K, 999K, 1M, 3.7M. No currency sign, and the sign of the amount in front. */
export function moneyShort(n: number): string {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  // 999,500 rounds to a thousand thousands, which is a million, so it is written as one
  if (v >= 999_500) return `${sign}${millions(v)}M`;
  if (v >= 1000) return `${sign}${Math.round(v / 1000)}K`;
  return `${sign}${Math.round(v)}`;
}

/**
 * The sign belongs in front of the currency, not between it and the digits: a
 * purse in the red read as "₪-95K", which is not how anyone writes money.
 */
export function formatMoney(n: number): string {
  const short = moneyShort(Math.abs(n));
  return `${n < 0 ? '-' : ''}₪${short}`;
}

/** Money to the shekel below ten thousand, so a raise of a few hundred a round can be seen. */
export function formatMoneyExact(n: number): string {
  const v = Math.abs(n);
  if (v >= 10_000) return formatMoney(n);
  return `${n < 0 ? '-' : ''}₪${v.toLocaleString('en-US')}`;
}
