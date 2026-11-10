/**
 * The rival card's chance, counted off the page (R4): 200 whole matches of the live engine take a phone a few
 * seconds, so they run here, where the screen never waits on them. Same function, same seeds, same number.
 */
import { winChanceNow } from './summitOdds.ts';

self.onmessage = (e: MessageEvent<{ key: string; input: Parameters<typeof winChanceNow>[0] }>) => {
  const { key, input } = e.data;
  (self as unknown as Worker).postMessage({ key, chance: winChanceNow(input) });
};
