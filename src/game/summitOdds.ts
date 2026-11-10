/**
 * The rival card's numbers (R4): how strong the side the engine made for this match really is, its best man, and
 * his chance to win it, read off the same live engine that will play the match. Pure and seeded, so the same night
 * reads the same number on every reload, and the check can hold it still.
 *
 * The chance is a Monte Carlo of the live engine itself: ODDS_RUNS whole matches from the match's own input, each on
 * its own seed, every moment answered by a manager choosing at random on the run's own seed, counted as wins, rounded
 * to 5%. Not a formula next to the
 * engine: the engine.
 */
import * as L from './liveMatch.ts';
import { overall, createRng } from '../engine/matchEngine.ts';
import type { Player } from '../engine/matchEngine.ts';

export const ODDS_RUNS = 200;

type LiveInput = Parameters<typeof L.createLive>[0];

const CORNERS: L.Corner[] = ['left', 'center', 'right'];

/**
 * One whole match from this input on this seed. Every moment is answered by a manager who picks among the moment's own
 * options at random, on a stream seeded with the run, so run i answers the same way on every reload. A fixed answer
 * would make the moments decide the same way every run and the chance would say nothing. True when his side won.
 */
export function playOut(input: LiveInput, seed: number): boolean {
  const st = L.createLive({ ...input, seed });
  const pick = createRng(seed ^ 0x2545f491);
  const any = <T,>(xs: readonly T[]): T => xs[Math.floor(pick() * xs.length)];
  let guard = 0;
  while (st.phase !== 'done' && guard++ < 4000) {
    if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
    if (st.phase === 'moment' && st.pending) {
      const m = st.pending;
      const opt = () => any(m.options?.map(o => o.id) ?? ['']);
      switch (m.kind) {
        case 'penalty': L.resolvePenalty(st, any(CORNERS)); break;
        case 'def_penalty': L.resolveDefPenalty(st, any(CORNERS)); break;
        case 'shot': L.resolveShot(st, any(CORNERS)); break;
        case 'free_kick': L.resolveFreeKick(st, any(CORNERS)); break;
        case 'one_on_one': L.resolveOneOnOne(st, opt()); break;
        case 'def_keeper': L.resolveDefKeeper(st, opt()); break;
        case 'def_tackle': L.resolveDefTackle(st, opt()); break;
        case 'tactic': L.resolveTactic(st, opt()); break;
      }
      if (st.phase === 'moment') st.phase = 'play';
      continue;
    }
    L.step(st);
  }
  const [h, a] = st.score;
  return st.iAmHome ? h > a : a > h;
}

/** The seeds of the runs: the match's own seed walked by a fixed odd step, so run i is the same run on every reload. */
export const oddsSeed = (seed: number, i: number): number => (seed + (i + 1) * 0x9e3779b1) >>> 0;

/** Rounded to the nearest 5%, never shown as 0 or 100: a match is never decided before it is played. */
export const roundTo5 = (p: number): number => Math.max(5, Math.min(95, Math.round(p * 20) * 5));

/**
 * His chance to win this match, in whole percent rounded to 5. Runs in slices so a phone never freezes: `slice` runs
 * at a time, handing back between them, and the answer arrives through the promise.
 */
export function winChance(input: LiveInput, runs = ODDS_RUNS, slice = 10): Promise<number> {
  return new Promise(resolve => {
    let i = 0, wins = 0;
    const go = () => {
      const end = Math.min(runs, i + slice);
      for (; i < end; i++) if (playOut(input, oddsSeed(input.seed, i))) wins++;
      if (i < runs) setTimeout(go, 0); else resolve(roundTo5(wins / runs));
    };
    go();
  });
}

/** The same count in one go, for the check. */
export function winChanceNow(input: LiveInput, runs = ODDS_RUNS): number {
  let wins = 0;
  for (let i = 0; i < runs; i++) if (playOut(input, oddsSeed(input.seed, i))) wins++;
  return roundTo5(wins / runs);
}

/** The strength of the eleven the engine actually made for this match: their mean overall, whole. */
export const sideRating = (starters: Player[]): number =>
  Math.round(starters.reduce((s, p) => s + overall(p), 0) / Math.max(1, starters.length));

/** Their best man on the sheet: the highest overall among the eleven who start, the first of them on a tie. */
export function keyPlayer(starters: Player[]): Player | undefined {
  let best: Player | undefined;
  for (const p of starters) if (!best || overall(p) > overall(best)) best = p;
  return best;
}
