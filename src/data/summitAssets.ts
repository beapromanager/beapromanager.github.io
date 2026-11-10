/**
 * Every picture and clip פסגת אירופה asks for (R2), in one list. Itzik makes them in Higgsfield from
 * HIGGSFIELD-SUMMIT.md; until a file is there, the screen draws its own fallback, so a missing or broken file never
 * stops anything. No component names a summit file by hand: they all come through here (and useSummitAsset).
 *
 * Naming: public/summit/<group>/<name>.<ext>, the id is <group>/<name>. A clip has a poster beside it, its first
 * frame as webp. No text is ever baked into a file: names and scores are drawn by the code, in Hebrew, over it.
 * Nothing here is precached: public/sw.js caches nothing at all, and a file is asked for only on a summit screen.
 */
import { EURO_SUMMIT_CLUBS } from './europeClubs.ts';

export type SummitAssetKind = 'image' | 'video';
export type SummitAssetGroup = 'entrance' | 'crest' | 'coach' | 'trophy' | 'book' | 'share' | 'map' | 'reel';

/** What the screen draws while the file is missing: each is a component of its own, named for the check and the doc. */
export type SummitFallback =
  | 'entrance-canvas'   // a top-down ground on a canvas, the stands, the crowd, flares in the club's colours
  | 'crest-elite'       // the drawn elite crest (Crest.tsx), gold ring and emblem
  | 'coach-css'         // the existing coach (guide.webp / celebrate.mp4) moved by CSS
  | 'trophy-svg'        // a drawn cup rising, canvas fireworks, a turn
  | 'book-medallion'    // a drawn gold medallion
  | 'share-canvas'      // the share card's own drawn background
  | 'map-css'           // the gold road on the summit's own background
  | 'reel-canvas';      // the five-second reel's own drawn background

export interface SummitAsset {
  id: string;
  group: SummitAssetGroup;
  kind: SummitAssetKind;
  /** root-relative, without the base path: asset() resolves it */
  path: string;
  /** a clip's first frame, shown while it loads and under reduced motion */
  poster?: string;
  fallback: SummitFallback;
  /** the prompt's stage that first draws it, and the order Itzik should make them in (1 first) */
  stage: 3 | 4 | 5;
  priority: 1 | 2 | 3;
}

const video = (group: SummitAssetGroup, name: string, fallback: SummitFallback, stage: 3 | 4 | 5, priority: 1 | 2 | 3): SummitAsset =>
  ({ id: `${group}/${name}`, group, kind: 'video', path: `/summit/${group}/${name}.mp4`, poster: `/summit/${group}/${name}.webp`, fallback, stage, priority });
const image = (group: SummitAssetGroup, name: string, fallback: SummitFallback, stage: 3 | 4 | 5, priority: 1 | 2 | 3): SummitAsset =>
  ({ id: `${group}/${name}`, group, kind: 'image', path: `/summit/${group}/${name}.webp`, fallback, stage, priority });

/** The moments a golden-book page can wear (stage 5 picks one by what happened in the match). */
export const BOOK_MOMENTS = [
  'last-minute', 'comeback', 'pens-win', 'clean-sheet', 'long-range', 'their-red',
  'away-win', 'big-win', 'trophy-lift', 'rain-night', 'final-whistle', 'fans-night',
] as const;

/** The six reactions of the coach in a summit shootout (stage 4). */
export const COACH_CLIPS = ['pen-user-goal', 'pen-user-miss', 'pen-opp-goal', 'pen-opp-miss', 'pen-win', 'pen-loss'] as const;

export const SUMMIT_ASSETS: readonly SummitAsset[] = [
  // the entrance, top down over a full ground: one per club, one for his own ground, one for the final
  ...EURO_SUMMIT_CLUBS.map(c => video('entrance', c.id, 'entrance-canvas', 3, 2)),
  video('entrance', 'home', 'entrance-canvas', 3, 1),
  video('entrance', 'final', 'entrance-canvas', 3, 1),
  // the twenty crests as pictures, over the drawn one
  ...EURO_SUMMIT_CLUBS.map(c => image('crest', c.id, 'crest-elite', 3, 3)),
  // the coach in the shootout
  ...COACH_CLIPS.map(n => video('coach', n, 'coach-css', 4, 2)),
  // the trophy
  video('trophy', 'ceremony', 'trophy-svg', 3, 1),
  // the golden book
  ...BOOK_MOMENTS.map(n => image('book', n, 'book-medallion', 5, 3)),
  image('share', 'bg', 'share-canvas', 5, 2),
  image('map', 'path-bg', 'map-css', 5, 3),
  video('reel', 'win-base', 'reel-canvas', 5, 3),
];

export const summitAsset = (id: string): SummitAsset | undefined => SUMMIT_ASSETS.find(a => a.id === id);

/** The entrance clip for a night: the final's own, the home club's when it is a summit club, else his own ground's. */
export const entranceAssetId = (homeId: string, final: boolean): string =>
  final ? 'entrance/final' : EURO_SUMMIT_CLUBS.some(c => c.id === homeId) ? `entrance/${homeId}` : 'entrance/home';
