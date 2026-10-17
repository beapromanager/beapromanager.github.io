/**
 * The weekend league's match server (phase 1, 17.10).
 *
 * One Durable Object per match holds the whole truth of it: the engine's
 * state, the server's clock, the moment that is open and who has answered.
 * The engine is the game's own TypeScript (src/game/duel.ts over
 * src/game/liveMatch.ts), imported here, never copied: there is one engine.
 *
 * Doors:
 *   POST /match                      body: DuelInput → { id }
 *   GET  /match/:id?side=home&since=0 → DuelView for that side
 *   POST /match/:id/choice           body: { side, choice } → { ok, view }
 *   GET  /match/:id/result           → the result once done
 *
 * The side is a query parameter in this phase. The league (phase 2) replaces
 * it with a signed token per manager; until then this worker is not deployed,
 * it runs locally under wrangler dev for the smoke run.
 *
 * WHAT IT KNOWS. Two squads of invented players, two club names, a seed, the
 * choices. No person: no name, no mail, no IP, no device. The league's
 * nickname never reaches a match object.
 *
 * The clock never waits for a client. Every request first brings the match up
 * to now; an alarm is set for the next deadline (a moment's twelve seconds or
 * the break) so a manager who is not polling is still played by his assistant
 * on time, and the state is written after every change so an evicted object
 * picks the match up where it was.
 */

import * as D from '../../src/game/duel.ts';

/* the slice of the platform this worker uses, declared here like the counting house does */
interface DurableObjectId { toString(): string }
interface DurableObjectStub { fetch(req: Request): Promise<Response> }
interface DurableObjectNamespace { newUniqueId(): DurableObjectId; idFromString(s: string): DurableObjectId; get(id: DurableObjectId): DurableObjectStub }
interface DurableObjectStorage { get<T>(k: string): Promise<T | undefined>; put<T>(k: string, v: T): Promise<void>; setAlarm(t: number): Promise<void>; deleteAlarm(): Promise<void> }
interface DurableObjectState { storage: DurableObjectStorage; id: DurableObjectId }

export interface Env { MATCH: DurableObjectNamespace }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
});

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' } });
    const m = url.pathname.match(/^\/match(?:\/([0-9a-f]{64}))?(\/[a-z]+)?$/);
    if (!m) return json({ error: 'no such door' }, 404);
    const [, id, tail] = m;
    if (!id) {
      if (req.method !== 'POST') return json({ error: 'POST to make a match' }, 405);
      const fresh = env.MATCH.newUniqueId();
      const res = await env.MATCH.get(fresh).fetch(new Request(`https://do/create`, { method: 'POST', body: await req.text() }));
      if (!res.ok) return res;
      return json({ id: fresh.toString() });
    }
    const stub = env.MATCH.get(env.MATCH.idFromString(id));
    return stub.fetch(new Request(`https://do${tail ?? '/view'}${url.search}`, { method: req.method, body: req.method === 'POST' ? await req.text() : undefined }));
  },
};

export class MatchDO {
  private duel: D.Duel | null = null;
  private loaded = false;

  constructor(private state: DurableObjectState) {}

  private async load() {
    if (this.loaded) return;
    const raw = await this.state.storage.get<string>('duel');
    this.duel = raw ? D.deserialize(raw) : null;
    this.loaded = true;
  }

  /** write the match down and wake up at its next deadline */
  private async settle() {
    const d = this.duel!;
    await this.state.storage.put('duel', D.serialize(d));
    const next = d.decision ? d.decision.deadlineAt : d.halfUntil !== null ? d.halfUntil : null;
    if (next !== null && !d.done) await this.state.storage.setAlarm(next);
  }

  async alarm() {
    await this.load();
    if (!this.duel || this.duel.done) return;
    D.advance(this.duel, Date.now());
    await this.settle();
  }

  async fetch(req: Request): Promise<Response> {
    await this.load();
    const url = new URL(req.url);
    const now = Date.now();
    if (url.pathname === '/create') {
      if (this.duel) return json({ error: 'this match exists' }, 409);
      let input: D.DuelInput;
      try { input = JSON.parse(await req.text()) as D.DuelInput; } catch { return json({ error: 'bad body' }, 400); }
      if (!input || typeof input.seed !== 'number' || !input.home?.starters?.length || !input.away?.starters?.length) return json({ error: 'a seed and two squads' }, 400);
      this.duel = D.createDuel(input, now);
      await this.settle();
      return json({ ok: true, engine: D.DUEL_ENGINE });
    }
    if (!this.duel) return json({ error: 'no such match' }, 404);
    const side = url.searchParams.get('side');
    if (url.pathname === '/view') {
      if (side !== 'home' && side !== 'away') return json({ error: 'side=home or side=away' }, 400);
      const since = Number(url.searchParams.get('since') ?? '0') || 0;
      const v = D.view(this.duel, side, since, now);
      await this.settle();
      return json(v);
    }
    if (url.pathname === '/choice') {
      let body: { side?: string; choice?: string };
      try { body = JSON.parse(await req.text()); } catch { return json({ error: 'bad body' }, 400); }
      if ((body.side !== 'home' && body.side !== 'away') || typeof body.choice !== 'string') return json({ error: 'side and choice' }, 400);
      const ok = D.choose(this.duel, body.side, body.choice, now);
      const v = D.view(this.duel, body.side, Number(url.searchParams.get('since') ?? '0') || 0, now);
      await this.settle();
      return json({ ok, view: v });
    }
    if (url.pathname === '/result') {
      D.advance(this.duel, now);
      await this.settle();
      if (!this.duel.done) return json({ done: false, minute: this.duel.st.minute });
      return json({ done: true, ...D.result(this.duel) });
    }
    return json({ error: 'no such door' }, 404);
  }
}
