/**
 * דרך הזהב (R12) as data: the four stops of the road to the summit final, read off the competition as it stands.
 * Pure, so the check can walk it without a browser; SummitPath.tsx draws it.
 */
import type { EuroState } from './euro.ts';
import { ROUND_NAMES, aggregate, EURO_ROUNDS } from './euro.ts';

/** done: went through; now: the tie he is in; out: where he went out; ahead: not reached yet; gone: past where he went out */
export type StopState = 'done' | 'now' | 'out' | 'ahead' | 'gone';

export interface Stop {
  round: number;
  name: string;
  state: StopState;
  oppId: string | null;
  /** his goals first, the tie's aggregate, and the shootout when there was one */
  score: string | null;
}

export function summitStops(e: EuroState, myId: string): Stop[] {
  const out: Stop[] = [];
  let lost = false;
  for (let r = 0; r < EURO_ROUNDS; r++) {
    const tie = e.ties[r]?.find(t => t.a === myId || t.b === myId);
    const name = ROUND_NAMES[r];
    if (!tie) { out.push({ round: r, name, state: lost || e.status === 'out' ? 'gone' : 'ahead', oppId: null, score: null }); continue; }
    const oppId = tie.a === myId ? tie.b : tie.a;
    let score: string | null = null;
    if (tie.legs.length) {
      const [x, y] = aggregate(tie);
      const mine = tie.a === myId ? x : y, theirs = tie.a === myId ? y : x;
      score = `${mine}:${theirs}`;
      if (tie.pens) {
        const pm = tie.a === myId ? tie.pens[0] : tie.pens[1], pt = tie.a === myId ? tie.pens[1] : tie.pens[0];
        score += ` (${pm}:${pt} פנ׳)`;
      }
    }
    const state: StopState = tie.winner ? (tie.winner === myId ? 'done' : 'out') : 'now';
    if (state === 'out') lost = true;
    out.push({ round: r, name, state, oppId, score });
  }
  return out;
}

/** The last minutes of a close summit night (R6): from this minute, with a goal or less between the sides. */
export const TENSE_FROM = 80;

/**
 * How dark the edges grow and whether the crowd breathes: 0 outside the summit, before the 80th minute, or with two
 * goals or more between the sides; from there it grows to 1 by the 90th.
 */
export function summitTension(level: number | undefined, minute: number, score: readonly [number, number]): number {
  if (level !== 1 || minute < TENSE_FROM || Math.abs(score[0] - score[1]) > 1) return 0;
  return Math.min(1, 0.35 + ((minute - TENSE_FROM) / 10) * 0.65);
}
