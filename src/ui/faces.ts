/**
 * The faces of the people who talk to the manager (Itzik, 16.10, phase 2 of the art). Every dilemma speaker has a few
 * portraits: a neighbourhood look for ליגה ג׳ to א׳ and a professional one from the Leumit up, and more than one of each so
 * the owner is not the same man in every town. A message keeps its face: the portrait is chosen off the season and the
 * round, never drawn from a stream the game plays on. A speaker with no portraits yet keeps his icon.
 */
import type { Speaker } from '../data/dilemmas.ts';
import { DAY_MAX_TIER } from './momentArt.ts';

export type FaceWorld = 'low' | 'pro';

/** How many portraits each speaker has in each world (public/faces/<speaker>-<world>-<n>.webp, n from 1). 0 keeps the icon. */
export const FACES: Record<Speaker, { low: number; pro: number }> = {
  owner: { low: 2, pro: 2 }, veteran: { low: 2, pro: 2 }, reporter: { low: 2, pro: 2 }, ultras: { low: 2, pro: 2 },
  player: { low: 2, pro: 2 }, agent: { low: 2, pro: 2 }, director: { low: 2, pro: 2 }, physio: { low: 2, pro: 2 },
  youth: { low: 2, pro: 2 }, sponsor: { low: 2, pro: 2 }, captain: { low: 2, pro: 2 }, mother: { low: 2, pro: 2 },
  squad: { low: 2, pro: 2 },
};

export function faceWorld(tier: number): FaceWorld {
  return tier <= DAY_MAX_TIER ? 'low' : 'pro';
}

/** The portrait for this message, root-relative, or null when the speaker has none in this world. */
export function faceFor(speaker: Speaker, tier: number, seed: number): string | null {
  const world = faceWorld(tier);
  const n = FACES[speaker]?.[world] ?? 0;
  if (!n) return null;
  let h = (seed >>> 0) ^ 0x2f6b1;
  for (let i = 0; i < speaker.length; i++) h = Math.imul(h ^ speaker.charCodeAt(i), 16777619) >>> 0;
  return `/faces/${speaker}-${world}-${(h >>> 4) % n + 1}.webp`;
}

/** Every portrait the table names, for the check. */
export function allFaces(): string[] {
  const out: string[] = [];
  for (const s of Object.keys(FACES) as Speaker[]) {
    for (const w of ['low', 'pro'] as const) for (let i = 1; i <= FACES[s][w]; i++) out.push(`/faces/${s}-${w}-${i}.webp`);
  }
  return out;
}
