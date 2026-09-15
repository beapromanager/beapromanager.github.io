/**
 * Bringing a friend in.
 *
 * The rule that makes this work is not a security rule, it is an economics one:
 * nobody is paid for a signup, they are paid once the friend they brought has
 * actually played. A gem is worth about one thirty second advert in this game,
 * so if faking a gem costs five rounds of football, roughly ten minutes, faking
 * is twenty times worse than just watching the advert. The cheat stops paying
 * for itself, which is a far stronger defence than anything a client can
 * enforce on its own.
 *
 * On top of that: a friend is counted once, your own device is refused, and the
 * whole thing is capped. What a client cannot do is stop a determined person
 * with two phones. Closing that needs a server, and when one exists only
 * `verifyThanks` changes; everything else here stays as it is.
 */

/** Gems the inviter gets per friend who really played. */
export const GEMS_PER_FRIEND = 2;
/** Gems the friend starts with on top of the usual three. */
export const GEMS_FOR_JOINING = 2;
/**
 * How many friends can pay out in one season, and how many ever.
 *
 * A per season cap on its own was the wrong shape. It implies a manager finds
 * ten new friends every season, which nobody does, so the only person it really
 * served was somebody farming: measured, a maxed inviter was earning nine times
 * what an ordinary manager earned, which no pack price can be fair to both of.
 * Inviting people is naturally finite, so the real bound is the lifetime one,
 * and the season cap only stops a whole career of gems landing in one summer.
 */
export const FRIENDS_PER_SEASON = 4;
export const FRIENDS_LIFETIME = 10;
/** Rounds the friend must have played before the thank you code exists. */
export const ROUNDS_TO_COUNT = 5;

/** No 0/O or 1/I, because these get read aloud and typed by hand. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEVICE_KEY = 'beapro.device';

export interface InviteState {
  /** everyone whose thank you code has already been redeemed here */
  claimed: string[];
  /** the season each claim landed in, so the cap is per season */
  claimedSeason: number[];
  /** who brought me in, if anybody */
  invitedBy: string | null;
}

export function emptyInvite(): InviteState {
  return { claimed: [], claimedSeason: [], invitedBy: null };
}

/* ------------------------------------------------------------- identity */

/**
 * A stable id for this install. Not an account and not a person, just enough to
 * tell one copy of the game from another so a friend cannot be counted twice.
 */
export function deviceId(): string {
  try {
    const found = localStorage.getItem(DEVICE_KEY);
    if (found) return found;
    const made = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + ':' + String(performance.now());
    localStorage.setItem(DEVICE_KEY, made);
    return made;
  } catch {
    // private mode: the id lives for this session only, which is honest enough
    return 'ephemeral';
  }
}

/** A short, readable code for a device id. Six characters, stable. */
export function codeFor(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  let n = h >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) { out += ALPHABET[n % ALPHABET.length]; n = Math.floor(n / ALPHABET.length) + 7; }
  return out;
}

/** This install's own invite code. */
export function myCode(): string {
  return codeFor(deviceId());
}

/* ---------------------------------------------------------------- links */

/**
 * The link a manager sends. It carries the beta door code too, so a friend
 * walks straight in instead of having to ask for it, which is most of why an
 * invite goes cold during a closed test.
 */
export function inviteLink(code: string, base?: string): string {
  const root = base ?? (typeof location !== 'undefined' ? location.origin + location.pathname : '/');
  const clean = root.replace(/[?#].*$/, '');
  return `${clean}?ref=${code}`;
}

/** The ref code on the current URL, if the manager arrived through an invite. */
export function refFromUrl(search: string): string | null {
  const m = /[?&]ref=([23456789A-HJ-NP-Za-hj-np-z]{6})(?:&|$)/.exec(search);
  return m ? m[1].toUpperCase() : null;
}

/* --------------------------------------------------------------- tokens */

/**
 * The thank you code the friend sends back.
 *
 * It says: this device, invited by that code, has played this many rounds. The
 * checksum is not a signature and is not pretending to be one; it is there so a
 * typo is rejected rather than silently counted, and so a code cannot be
 * guessed by changing one character.
 */
export function makeThanks(fromDevice: string, inviterCode: string, rounds: number): string {
  const friend = codeFor(fromDevice);
  const r = Math.max(0, Math.min(99, Math.round(rounds)));
  const body = `${friend}${inviterCode}${String(r).padStart(2, '0')}`;
  return `BP-${friend}-${inviterCode}-${String(r).padStart(2, '0')}${checksum(body)}`;
}

export type ThanksVerdict =
  | { ok: true; friend: string; rounds: number }
  | { ok: false; why: string };

/**
 * Read a thank you code on the inviter's device.
 *
 * Everything that can be checked without a server is checked here: the code is
 * well formed, it names ME as the inviter, it does not come from this very
 * device, the friend has not already been counted, he has actually played, and
 * the season's cap has room.
 */
export function verifyThanks(
  text: string, myOwnCode: string, state: InviteState, season: number,
): ThanksVerdict {
  const m = /^BP-([2-9A-Z]{6})-([2-9A-Z]{6})-(\d{2})([2-9A-Z]{3})$/.exec(text.trim().toUpperCase().replace(/\s+/g, ''));
  if (!m) return { ok: false, why: 'הקוד לא נראה תקין. תבקש מהחבר להעתיק אותו שוב.' };

  const [, friend, inviter, roundsStr, check] = m;
  const rounds = Number(roundsStr);
  if (checksum(`${friend}${inviter}${roundsStr}`) !== check) {
    return { ok: false, why: 'הקוד לא תקין. כנראה נפלה טעות בהעתקה.' };
  }
  if (inviter !== myOwnCode) return { ok: false, why: 'הקוד הזה שייך למישהו אחר שהזמין אותו, לא לך.' };
  if (friend === myOwnCode) return { ok: false, why: 'זה הקוד של המכשיר שלך. צריך חבר אמיתי.' };
  if (state.claimed.includes(friend)) return { ok: false, why: 'את החבר הזה כבר ספרנו.' };
  if (rounds < ROUNDS_TO_COUNT) {
    return { ok: false, why: `${rounds === 0 ? 'החבר עוד לא שיחק' : rounds === 1 ? 'החבר שיחק מחזור אחד' : `החבר שיחק ${rounds} מחזורים`}. צריך ${ROUNDS_TO_COUNT} לפני שזה נספר.` };
  }
  if (state.claimed.length >= FRIENDS_LIFETIME) {
    return { ok: false, why: `הגעת ל${FRIENDS_LIFETIME} חברים, המקסימום בקריירה. תודה שהבאת אותם.` };
  }
  if (claimsThisSeason(state, season) >= FRIENDS_PER_SEASON) {
    return { ok: false, why: `הגעת ל${FRIENDS_PER_SEASON} חברים העונה. הדלת נפתחת שוב בעונה הבאה.` };
  }
  return { ok: true, friend, rounds };
}

export function claimsThisSeason(state: InviteState, season: number): number {
  return state.claimedSeason.filter(s => s === season).length;
}

/** Record a verified friend. Returns the new state, unchanged if already there. */
export function addClaim(state: InviteState, friend: string, season: number): InviteState {
  if (state.claimed.includes(friend)) return state;
  return { ...state, claimed: [...state.claimed, friend], claimedSeason: [...state.claimedSeason, season] };
}

/* --------------------------------------------------------------- checks */

/**
 * Three characters over the body. This is not a signature and does not pretend
 * to be one; its job is that a mistyped code is refused rather than quietly
 * counted as somebody else. Two characters let three of five hundred single
 * character edits through, so it is three, with a proper avalanche step: change
 * one character of the body and every character of the checksum moves.
 */
function checksum(body: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  let out = '';
  for (let i = 0; i < 3; i++) { out += ALPHABET[h % ALPHABET.length]; h = Math.floor(h / ALPHABET.length); }
  return out;
}
