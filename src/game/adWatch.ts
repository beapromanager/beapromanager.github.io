/**
 * One sitting in front of an ad, and whether it earned the gem.
 *
 * The gem is paid for a clip watched through, not for a tap on the button, and
 * "watched through" cannot be read off the video's `ended` event: a seek to the
 * last second fires it too. So the session keeps a FRONTIER, the furthest point
 * reached by contiguous playback from the start. It only moves when a tick
 * lands within one small step of the previous tick and that tick was standing
 * at the frontier. A jump forward is a seek and moves nothing; rewinding and
 * replaying ground already covered moves nothing either, so a clip cannot be
 * completed by watching its first half twice.
 *
 * Leaving the app mid ad (a call, another tab, the home button) voids the
 * sitting: nothing is owed, nothing is counted, and the next tap starts the
 * clip from the top. That is the rule the manager was told, and it is simpler
 * than a resume that would have to decide how long an absence is too long.
 *
 * This is pure: the React player feeds it events and reads `completed`. The
 * career state is not touched until `completed` is true, so a refresh, a crash
 * or a walk out leaves `adsWatched` exactly where it was.
 */
import type { Ad } from '../data/ads.ts';
import { ADS } from '../data/ads.ts';
import { createRng } from '../engine/matchEngine.ts';
import { ADS_PER_SEASON } from './packs.ts';

/** a tick further ahead than this is a seek, not playback */
export const MAX_STEP = 1.0;
/** the last half second is forgiven, `ended` can fire a hair before duration */
export const TOLERANCE = 0.5;

export type AdSession = {
  ad: Ad;
  /** the clip's length, from the file once known, the catalogue until then */
  seconds: number;
  status: 'playing' | 'done' | 'aborted';
  /** why an aborted sitting ended, for the line the manager reads */
  reason: 'hidden' | 'left' | 'skipped' | 'error' | null;
  /** the last playback position seen */
  pos: number;
  /** furthest point reached by contiguous playback from zero */
  frontier: number;
};

export function startAd(ad: Ad): AdSession {
  return { ad, seconds: ad.seconds, status: 'playing', reason: null, pos: 0, frontier: 0 };
}

/** the file's own duration, once its metadata has loaded */
export function withDuration(s: AdSession, seconds: number): AdSession {
  if (!Number.isFinite(seconds) || seconds <= 0) return s;
  return { ...s, seconds };
}

/** a timeupdate at `t` seconds */
export function advance(s: AdSession, t: number): AdSession {
  if (s.status !== 'playing') return s;
  const step = t - s.pos;
  const contiguous = step >= 0 && step <= MAX_STEP;
  const atFrontier = s.pos <= s.frontier + 1e-6;
  const frontier = contiguous && atFrontier && t > s.frontier ? t : s.frontier;
  return { ...s, pos: t, frontier };
}

/** the app went to the background, or the page is being torn down */
export function hidden(s: AdSession): AdSession {
  return s.status === 'playing' ? { ...s, status: 'aborted', reason: 'hidden' } : s;
}

/** the manager chose to leave, X or the phone's back button */
export function leave(s: AdSession): AdSession {
  return s.status === 'playing' ? { ...s, status: 'aborted', reason: 'left' } : s;
}

/** the file would not load or play */
export function failed(s: AdSession): AdSession {
  return s.status === 'playing' ? { ...s, status: 'aborted', reason: 'error' } : s;
}

/** the video's `ended` event: done only if the frontier really got there */
export function ended(s: AdSession): AdSession {
  if (s.status !== 'playing') return s;
  return watchedThrough(s)
    ? { ...s, status: 'done', reason: null }
    : { ...s, status: 'aborted', reason: 'skipped' };
}

export function watchedThrough(s: AdSession): boolean {
  return s.frontier >= s.seconds - TOLERANCE;
}

export function completed(s: AdSession): boolean {
  return s.status === 'done';
}

/** seconds still to sit through, for the countdown */
export function remaining(s: AdSession): number {
  return Math.max(0, Math.ceil(s.seconds - s.pos));
}

/* ------------------------------------------------------------- rotation */

/**
 * Which ad the k-th sitting of a season shows. Seeded so a career sees the
 * same order twice, and never the same clip two sittings running, including
 * across the season line, where the previous sitting is the last of the season
 * before.
 */
export function adIndex(seasonSeed: number, season: number, k: number, n = ADS.length): number {
  if (n <= 1) return 0;
  const rng = createRng(seasonSeed + season * 7919 + k * 131 + 5);
  let i = Math.floor(rng() * n);
  const prev = k > 0 ? adIndex(seasonSeed, season, k - 1, n)
    : season > 1 ? adIndex(seasonSeed, season - 1, ADS_PER_SEASON - 1, n)
    : -1;
  if (i === prev) i = (i + 1) % n;
  return i;
}

export function pickAd(gs: { seasonSeed: number; season: number; adsWatched: number }): Ad {
  return ADS[adIndex(gs.seasonSeed, gs.season, gs.adsWatched)];
}
