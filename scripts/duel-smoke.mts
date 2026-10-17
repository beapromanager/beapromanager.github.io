/**
 * The two-manager match over HTTP, against the local match server.
 *
 * Start the server first, from the worker folder:
 *   npx wrangler dev -c wrangler.weekend.toml --port 8788
 * then: node --experimental-strip-types scripts/duel-smoke.mts [matches]
 *
 * Two managers poll a real Durable Object with a fast clock (a tenth of a
 * second a minute), choose with some delay, and one of them vanishes now and
 * then. Proven: the match ends, both read the same events and score, a manager
 * who asks from 0 reads what the other read in pieces, and the server's result
 * agrees with both. This is the proof the engine runs on the server; the core's
 * own claims are in duel-check.
 */
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import type { DuelView, Who } from '../src/game/duel.ts';

const BASE = process.env.DUEL_URL ?? 'http://127.0.0.1:8788';
const MATCHES = Number(process.argv[2] ?? '2');
const CLOCK = { minuteMs: 100, decisionMs: 400, halfMs: 200 };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const fails: string[] = [];

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function playOne(seed: number) {
  const rng = createRng(seed);
  const h = makeSquad(85, rng), a = makeSquad(85, rng);
  const { id } = await api<{ id: string }>('/match', {
    seed, clock: CLOCK,
    home: { id: 'h', name: 'בניין 7', starters: h.starters, bench: h.bench, tactic: { approach: 'balanced', press: 'mid', formation: '4-4-2' } },
    away: { id: 'a', name: 'הגבעה', starters: a.starters, bench: a.bench, tactic: { approach: 'attacking', press: 'high', formation: '4-3-3' } },
  });
  const read: Record<Who, { events: unknown[]; next: number; chose: number; last: DuelView | null }> = {
    home: { events: [], next: 0, chose: 0, last: null }, away: { events: [], next: 0, chose: 0, last: null },
  };
  const mrng = createRng(seed + 99);
  let awayUntil = 0;
  for (let i = 0; i < 3_000; i++) {
    let done = true;
    for (const who of ['home', 'away'] as Who[]) {
      if (who === 'away' && Date.now() < awayUntil) { done = false; continue; }
      if (who === 'away' && mrng() < 0.02) awayUntil = Date.now() + 500 + mrng() * 1500;   // the away manager vanishes for up to two seconds
      const r = read[who];
      const v = await api<DuelView>(`/match/${id}?side=${who}&since=${r.next}`);
      r.events.push(...v.events); r.next = v.next; r.last = v;
      if (v.decision) {
        await wait(mrng() * 500);   // thinks, sometimes past the 400ms deadline
        const choice = v.decision.options ? v.decision.options[Math.floor(mrng() * v.decision.options.length)].id : v.decision.corners![Math.floor(mrng() * 3)];
        const c = await api<{ ok: boolean; view: DuelView }>(`/match/${id}/choice?since=${r.next}`, { side: who, choice });
        if (c.ok) r.chose++;
        r.events.push(...c.view.events); r.next = c.view.next; r.last = c.view;
      }
      if (!v.done) done = false;
    }
    if (done) break;
    await wait(40);
  }
  // the whistle: both ask once more, and one asks from 0
  for (const who of ['home', 'away'] as Who[]) { const v = await api<DuelView>(`/match/${id}?side=${who}&since=${read[who].next}`); read[who].events.push(...v.events); read[who].next = v.next; read[who].last = v; }
  const full = await api<DuelView>(`/match/${id}?side=away&since=0`);
  const result = await api<{ done: boolean; score: [number, number]; decisions: number; auto: number }>(`/match/${id}/result`);
  const ev = (x: unknown[]) => JSON.stringify(x);
  if (!result.done) fails.push(`seed ${seed}: the server says the match is not done`);
  if (!read.home.last?.done || !read.away.last?.done) fails.push(`seed ${seed}: a manager never saw the end`);
  if (ev(read.home.events) !== ev(full.events)) fails.push(`seed ${seed}: home read ${read.home.events.length} events in pieces, ${full.events.length} from 0`);
  if (ev(read.away.events) !== ev(full.events)) fails.push(`seed ${seed}: away read ${read.away.events.length} events in pieces, ${full.events.length} from 0`);
  if (read.home.last!.score.join() !== result.score.join() || read.away.last!.score.join() !== result.score.join()) fails.push(`seed ${seed}: the scores disagree`);
  if (read.home.chose + read.away.chose === 0) fails.push(`seed ${seed}: nobody got to choose anything`);
  console.log(`seed ${seed}: ${full.home} ${result.score[0]}-${result.score[1]} ${full.away}, ${result.decisions} decisions (${result.auto} by the assistant), home chose ${read.home.chose}, away chose ${read.away.chose}, ${full.events.length} events`);
}

for (let s = 1; s <= MATCHES; s++) await playOne(200 + s);
if (fails.length) { console.log('FAIL'); for (const f of fails) console.log('  - ' + f); process.exit(1); }
console.log('OK, the engine runs on the server: two managers over HTTP read one match, and a manager who comes back reads all of it');
