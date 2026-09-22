/**
 * The terrace, as a number.
 *
 * Until now the fans meter moved on words alone: what he said into a
 * microphone and what he said to the men who came to see him in the week.
 * Measured over sixty seasons that made it a meter of talking, not of
 * football: a manager who lost every week and answered nicely was loved.
 *
 * So the table gets its say, and the terrace gets a memory that fades.
 * Results move it, big ones more, a derby twice; a season's end lands on it;
 * selling the best man costs. And every round a point of whatever it feels
 * drifts back toward the middle, because a stand that was singing in
 * September has forgotten by March, and one that was whistling has too. The
 * numbers here are Itzik's.
 *
 * What it does, for now, is the gate: a crowd that loves him fills the
 * ground a quarter fuller than one that does not, which is one percent of a
 * ליגה ג׳ season and nearly half of a top flight one.
 */

/** Where a crowd with no opinion sits, and what the drift pulls toward. */
export const FANS_MIDDLE = 50;

export const FANS_WIN = 2;
export const FANS_LOSS = -2;
/** on top of the win, for three or more */
export const FANS_BIG_WIN = 1;
/** on top of the loss, for three or more the other way */
export const FANS_THRASHING = -3;
/** a derby is worth double, both ways */
export const FANS_DERBY = 2;

export const FANS_CHAMPION = 12;
export const FANS_PROMOTED = 8;
export const FANS_RELEGATED = -12;
export const FANS_STAR_SOLD = -4;

/** a point a round, toward the middle */
export const FANS_DRIFT = 1;

/** What tonight's scoreline does to the terrace, from the manager's side. */
export function fansAfterResult(margin: number, derby: boolean): number {
  let d = margin > 0 ? FANS_WIN : margin < 0 ? FANS_LOSS : 0;
  if (margin >= 3) d += FANS_BIG_WIN;
  if (margin <= -3) d += FANS_THRASHING;
  return derby ? d * FANS_DERBY : d;
}

/** The forgetting: a point back toward the middle, and no further than it. */
export function fansDrift(fans: number): number {
  if (fans > FANS_MIDDLE) return -Math.min(FANS_DRIFT, fans - FANS_MIDDLE);
  if (fans < FANS_MIDDLE) return Math.min(FANS_DRIFT, FANS_MIDDLE - fans);
  return 0;
}

/** What a season's verdict does to the terrace. */
export function fansAfterSeason(result: 'champion' | 'promoted' | 'relegated' | string): number {
  return result === 'champion' ? FANS_CHAMPION : result === 'promoted' ? FANS_PROMOTED : result === 'relegated' ? FANS_RELEGATED : 0;
}

/**
 * How the terrace fills the ground: three quarters of the usual crowd when
 * nobody can stand him, a quarter more when they sing his name.
 */
export function crowdMultiplier(fans: number): number {
  return 0.75 + Math.max(0, Math.min(100, fans)) / 200;
}

/**
 * And what it does to the man upstairs.
 *
 * The owner's rope is one season's participation money, and it is the same
 * length whether the ground is full or empty. It should not be: a stand that
 * turns up is money in his pocket and a reason to wait, and an empty one is
 * neither. So the terrace stretches the rope, by the same shape as the gate,
 * so that one number read one way runs the whole thing.
 *
 * Measured over sixty careers before it was written, a step at 25 and 75
 * would have been a rope shortened one round in a hundred and lengthened one
 * in three, which is not a bargain, it is a tightening with a bow on it. A
 * line through the middle is symmetrical by construction: at fifty, where a
 * crowd with no opinion sits, nothing moves at all.
 */
export function ownerRope(fans: number): number {
  return 0.8 + Math.max(0, Math.min(100, fans)) / 250;
}

/** Where the rope is short enough, or long enough, for him to say so. */
export const ROPE_SHORT = 30;
export const ROPE_LONG = 80;
