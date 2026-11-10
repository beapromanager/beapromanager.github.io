import { useEffect, useState } from 'react';
import { winChance } from '../game/summitOdds.ts';

type LiveInput = Parameters<typeof winChance>[0];

/**
 * His chance tonight, for the rival card (R4), counted once per lineup and kept for the session. It starts as soon as
 * the hub shows a summit night (prefetch), so by the time the card shows it is usually long done; it runs in a worker,
 * and where a browser will not give one, on the page in small slices. The number does not depend on when it is asked:
 * the same night and the same eleven read the same chance.
 */
const done = new Map<string, number>();
const asked = new Map<string, Promise<number>>();
let worker: Worker | null | undefined;
const waiting = new Map<string, (n: number) => void>();

export const chanceKey = (i: LiveInput): string =>
  [i.seed, i.playerStarters.map(p => p.id).join(','), i.playerBench.map(p => p.id).join(','),
    i.oppStarters.map(p => p.id).join(','), JSON.stringify(i.playerTactic)].join('|');

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('../game/oddsWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ key: string; chance: number }>) => {
      done.set(e.data.key, e.data.chance);
      waiting.get(e.data.key)?.(e.data.chance);
      waiting.delete(e.data.key);
    };
    worker.onerror = () => { worker = null; for (const [k, r] of waiting) asked.delete(k), r(-1); waiting.clear(); };
  } catch { worker = null; }
  return worker;
}

export function askWinChance(input: LiveInput): Promise<number> {
  const key = chanceKey(input);
  const have = done.get(key);
  if (have !== undefined) return Promise.resolve(have);
  const p = asked.get(key);
  if (p) return p;
  const w = getWorker();
  const q = (w
    ? new Promise<number>(resolve => { waiting.set(key, resolve); w.postMessage({ key, input }); })
    : Promise.resolve(-1)
  ).then(n => (n >= 0 ? n : winChance(input).then(m => { done.set(key, m); return m; })));
  asked.set(key, q);
  return q;
}

export function useWinChance(input: LiveInput | null): number | null {
  const key = input ? chanceKey(input) : '';
  const [n, setN] = useState<number | null>(() => (input ? done.get(key) ?? null : null));
  useEffect(() => {
    if (!input) return;
    let alive = true;
    askWinChance(input).then(v => { if (alive) setN(v); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return n;
}
