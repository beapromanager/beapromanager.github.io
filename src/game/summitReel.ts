/**
 * The five-second reel after a summit win (R9), as data: what is written over the picture and when, read off the
 * match as it was played. The screen (SummitReel.tsx) only draws it. The reel can leave the phone as a file, so it
 * follows the share card's rule (Itzik, 10.11.2026): no summit club is named or shown until the lawyer has cleared
 * them. Only his club, the score, his scorers by name, and the other side's goals as minutes.
 */
import type { ReelData } from './summitMemory.ts';
import { SHARE_SITE } from '../data/site.ts';

export const REEL_MS = 5000;
/** how many goal lines fit on the card; a goal feast shows the first of them and says how many more */
export const REEL_GOALS_SHOWN = 6;

export interface ReelScript {
  headline: string;
  club: string;
  /** his goals first */
  score: string;
  /** one line a goal, in the order they fell */
  goals: string[];
  more: string | null;
  pens: string | null;
  footer: string;
}

export function reelScript(data: ReelData, club: string): ReelScript {
  const all = data.goals.map(g => (g.mine ? `${g.minute}' ${g.name}` : `${g.minute}' שער ליריבה`));
  const shown = all.slice(0, REEL_GOALS_SHOWN);
  return {
    headline: 'ניצחון בפסגה',
    club,
    score: `${data.score[0]} : ${data.score[1]}`,
    goals: shown,
    more: all.length > shown.length ? `ועוד ${all.length - shown.length} שערים` : null,
    pens: data.pens ? `${data.pens[0]}:${data.pens[1]} בפנדלים` : null,
    footer: `BE A PRO · ${SHARE_SITE}`,
  };
}

/** What is on the screen at time t (ms): the headline first, the score from 0.8s, a goal line every 0.45s from 1.5s, the footer from 4s. */
export function reelAt(script: ReelScript, t: number): { headline: boolean; score: boolean; goals: number; footer: boolean } {
  return {
    headline: t >= 0,
    score: t >= 800,
    goals: t < 1500 ? 0 : Math.min(script.goals.length, 1 + Math.floor((t - 1500) / 450)),
    footer: t >= 4000,
  };
}
