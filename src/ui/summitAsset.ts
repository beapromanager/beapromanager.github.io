import { useEffect, useState } from 'react';
import { asset } from './asset.ts';
import { summitAsset } from '../data/summitAssets.ts';

/**
 * A summit file, if it is really there (R2). The screen asks once; the answer is one of three:
 *   ready   the file loaded, show it
 *   failed  it is missing, broken, or did not answer within SUMMIT_ASSET_WAIT: draw the fallback and carry on
 *   neither still asking (at most SUMMIT_ASSET_WAIT ms): show nothing new yet, never a broken frame
 * Once a screen has gone to its fallback it stays there for that showing, so nothing swaps under the eye. The answer
 * is kept for the session: a file that failed is not asked for again, a file that loaded is shown at once next time.
 */
export const SUMMIT_ASSET_WAIT = 400;

const known = new Map<string, boolean>();

function probe(url: string, kind: 'image' | 'video'): Promise<boolean> {
  const k = known.get(url);
  if (k !== undefined) return Promise.resolve(k);
  return new Promise(resolve => {
    const done = (ok: boolean) => { known.set(url, ok); resolve(ok); };
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = url;
      return;
    }
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => done(true);
    v.onerror = () => done(false);
    v.src = url;
  });
}

export interface SummitAssetState {
  src: string | null;
  poster: string | null;
  ready: boolean;
  failed: boolean;
}

export function useSummitAsset(id: string | null): SummitAssetState {
  const a = id ? summitAsset(id) : undefined;
  const url = a ? asset(a.path) : null;
  const poster = a?.poster ? asset(a.poster) : null;
  const [state, setState] = useState<{ ready: boolean; failed: boolean }>(() => {
    if (!url) return { ready: false, failed: true };
    const k = known.get(url);
    return { ready: k === true, failed: k === false };
  });
  useEffect(() => {
    if (!url || !a) { setState({ ready: false, failed: true }); return; }
    const k = known.get(url);
    if (k !== undefined) { setState({ ready: k, failed: !k }); return; }
    let alive = true, settled = false;
    const late = window.setTimeout(() => { if (alive && !settled) { settled = true; setState({ ready: false, failed: true }); } }, SUMMIT_ASSET_WAIT);
    probe(url, a.kind).then(ok => {
      if (!alive || settled) return;
      settled = true;
      window.clearTimeout(late);
      setState({ ready: ok, failed: !ok });
    });
    return () => { alive = false; window.clearTimeout(late); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return { src: state.ready ? url : null, poster, ready: state.ready, failed: state.failed };
}

/** For the check and the screens: forget what was learnt (a dev reload, or a test that swaps the folder). */
export const forgetSummitAssets = () => known.clear();
