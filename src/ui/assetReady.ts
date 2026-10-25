import { useEffect, useState } from 'react';

/**
 * Whether an image at this path is actually there to serve. Itzik's 21.10 rule for
 * גביע המדינה is absolute (never Europe's art), and the cup's own pictures are not
 * generated yet, so every cup screen has to find this out itself rather than assume.
 * Checked once per path for the whole session and cached; a path that fails stays
 * failed (no retry storms against a 404 that will not go away this session).
 */
const cache = new Map<string, boolean>();

function probe(url: string): Promise<boolean> {
  const cached = cache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { cache.set(url, true); resolve(true); };
    img.onerror = () => { cache.set(url, false); resolve(false); };
    img.src = url;
  });
}

/**
 * True once a path is confirmed loadable, keyed by the path itself. A path not yet
 * confirmed (or empty list) reads as not-ready, so a caller never shows a broken
 * image while the probe is in flight — it only lights up once the file is proven
 * to be there, and never flashes a 404 on the way.
 */
export function useAssetsReady(urls: string[]): Record<string, boolean> {
  const key = urls.join('|');
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const u of urls) out[u] = cache.get(u) === true;
    return out;
  });
  useEffect(() => {
    let alive = true;
    Promise.all(urls.map(async u => [u, await probe(u)] as const)).then(pairs => {
      if (!alive) return;
      const out: Record<string, boolean> = {};
      for (const [u, ok] of pairs) out[u] = ok;
      setState(out);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
