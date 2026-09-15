/**
 * The ads that pay for a gem.
 *
 * A flat list, on purpose: an ad is a short portrait clip in public/ads with a
 * poster beside it, and adding one is adding a line here. Nothing about an ad
 * lives in the save, so the list can change under a running career freely.
 *
 * `seconds` is the length as shipped. The player reads the real duration off
 * the file once it loads and prefers that; this is the fallback for a clip
 * whose metadata never arrives, so a broken file cannot turn into a free gem.
 */
export type Ad = {
  id: string;
  /** root-relative path, resolved through asset() */
  src: string;
  poster: string;
  seconds: number;
  /** who is advertising, shown small under the clip */
  brand: string;
};

export const ADS: readonly Ad[] = [
  { id: 'sample-1', src: '/ads/sample-1.mp4', poster: '/ads/sample-1.webp', seconds: 12, brand: 'פרסומת לדוגמה' },
  { id: 'sample-2', src: '/ads/sample-2.mp4', poster: '/ads/sample-2.webp', seconds: 12, brand: 'פרסומת לדוגמה' },
];

export function adById(id: string): Ad {
  return ADS.find(a => a.id === id) ?? ADS[0];
}
