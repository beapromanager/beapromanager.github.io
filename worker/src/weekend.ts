/**
 * The weekend league's server (phases 1 and 2, 17.10; the design is WEEKEND.md).
 *
 * Three kinds of Durable Object, and one engine:
 *   LobbyDO  (one)      the codes, the open leagues of the cycle, one league per device a weekend,
 *                       who was champion how many times, and the mail opt-ins (apart from everything else)
 *   LeagueDO (per league) the league itself: src/game/weekendCore.ts kept in storage, alarms for the lock,
 *                       for every round, for collecting results and for the end
 *   MatchDO  (per match)  the match: src/game/duel.ts on the server's clock, see phase 1
 *
 * The engine is the game's own TypeScript, imported, never copied.
 *
 * Doors (all JSON, all CORS):
 *   POST /league              { device, nick, name, slots[], email? }      make a friend league
 *   POST /league/join         { device, nick, code }                       join by code
 *   POST /league/open         { device, nick }                             join the open league with room (made if none)
 *   GET  /league/:id?device=                                              the league as this manager sees it
 *   POST /league/:id/lineup   { device, ids[], tactic }
 *   POST /league/:id/pack     { device, position }
 *   POST /league/:id/ready    { device }
 *   GET  /league/:id/live?device=                                         the round in play: every match's score and minute
 *   POST /league/:id/prize    { device }                                   the signed prize, once
 *   GET  /mine?device=                                                     the league this device is in this cycle, if any
 *   POST /match ... GET /match/:id?device= ... POST /match/:id/choice     the match (phase 1), the side found by device
 *
 * WHAT IT KNOWS OF A PERSON: a nickname, a random device id, and a mail only if
 * the box was ticked. No IP is written. A league and its matches are deleted a
 * week after the final.
 *
 * DEBUG: with the DEBUG var set (wrangler dev only) the clock can be moved with
 * an x-now header and a league can be pushed through its stages by hand, so a
 * whole weekend runs in a minute for the smoke script. Never set in production.
 */

import * as D from '../../src/game/duel.ts';
import * as W from '../../src/game/weekendCore.ts';
import { isPublicMatchTail, isPublicLeagueTail, corsOrigin } from '../../src/game/weekendRoutes.ts';
import type { Position } from '../../src/engine/matchEngine.ts';

/* the slice of the platform this worker uses, declared here like the counting house does */
interface DurableObjectId { toString(): string }
interface DurableObjectStub { fetch(req: Request): Promise<Response> }
interface DurableObjectNamespace { newUniqueId(): DurableObjectId; idFromString(s: string): DurableObjectId; idFromName(s: string): DurableObjectId; get(id: DurableObjectId): DurableObjectStub }
interface DurableObjectStorage { get<T>(k: string): Promise<T | undefined>; put<T>(k: string, v: T): Promise<void>; delete(k: string): Promise<boolean>; setAlarm(t: number): Promise<void>; deleteAlarm(): Promise<void>; deleteAll(): Promise<void> }
interface DurableObjectState { storage: DurableObjectStorage; id: DurableObjectId }

export interface Env {
  MATCH: DurableObjectNamespace;
  LEAGUE: DurableObjectNamespace;
  LOBBY: DurableObjectNamespace;
  /** signs the prize tokens; set with: wrangler secret put PRIZE_SECRET */
  PRIZE_SECRET?: string;
  DEBUG?: string;
}

const READY_MS = W.READY_MS;        // the "ready?" window after a slot's hour
const COLLECT_MS = 60_000;          // how often a round's results are looked for
const KEEP_MS = W.KEEP_MS;          // a league lives a week after its final
// no access-control-allow-origin here: the one answer to a browser is made at the door (withCors), by who is asking
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-headers': 'content-type, x-now', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const bad = (error: string, status = 400) => json({ error }, status);

/** the clock: the server's, unless DEBUG and the request says otherwise */
function nowOf(req: Request, env: Env): number {
  if (env.DEBUG) { const h = req.headers.get('x-now'); if (h && /^\d+$/.test(h)) return Number(h); }
  return Date.now();
}
async function body<T>(req: Request): Promise<T | null> {
  try { return JSON.parse(await req.text()) as T; } catch { return null; }
}
const isDevice = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(s);

/* --------------------------------------------------------------- signing */

async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export interface PrizeToken { league: string; device: string; place: number; wageRounds: number; gems: number; finished: boolean; nick: string; leagueName: string; final: number; nonce: string; sig: string }

/* ------------------------------------------------------------------ fetch */

/**
 * The browser's answer: the caller's own origin when it is the game's website (or, on a DEBUG server, a developer's
 * machine), nothing otherwise, never a wildcard. A script with no Origin gets the plain answer.
 */
function withCors(req: Request, env: Env, res: Response): Response {
  const out = new Response(res.body, { status: res.status, headers: new Headers(res.headers) });
  const allowed = corsOrigin(req.headers.get('origin'), !!env.DEBUG);
  if (allowed) out.headers.set('access-control-allow-origin', allowed);
  else out.headers.delete('access-control-allow-origin');
  out.headers.append('vary', 'Origin');
  return out;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return withCors(req, env, await route(req, env));
  },
};

async function route(req: Request, env: Env): Promise<Response> {
  {
    if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS });
    const url = new URL(req.url);
    const now = nowOf(req, env);
    const fwd = (stub: DurableObjectStub, path: string, init?: RequestInit) =>
      stub.fetch(new Request(`https://do${path}`, { ...init, headers: { 'x-now': String(now), 'content-type': 'application/json' } }));
    const lobby = () => env.LOBBY.get(env.LOBBY.idFromName('lobby'));

    // the match (phase 1)
    let m = url.pathname.match(/^\/match(?:\/([0-9a-f]{64}))?(\/[a-z]+)?$/);
    if (m) {
      const [, id, tail] = m;
      if (!id) {
        if (req.method !== 'POST') return bad('POST to make a match', 405);
        if (!env.DEBUG) return bad('matches are made by their league', 403);
        const fresh = env.MATCH.newUniqueId();
        const res = await fwd(env.MATCH.get(fresh), '/create', { method: 'POST', body: await req.text() });
        if (!res.ok) return res;
        return json({ id: fresh.toString() });
      }
      // only a phone's doors: a match's /create, /summary and /result are its league's, never a stranger's (25.10)
      if (!isPublicMatchTail(tail, !!env.DEBUG)) return bad('no such door', 404);
      // sixty-four hex characters that are not a match's id are a stranger's guess, not an error of ours
      let stub: DurableObjectStub;
      try { stub = env.MATCH.get(env.MATCH.idFromString(id)); } catch { return bad('no such match', 404); }
      return fwd(stub, `${tail ?? '/view'}${url.search}`, { method: req.method, body: req.method === 'POST' ? await req.text() : undefined });
    }

    if (url.pathname === '/mine' && req.method === 'GET') {
      const device = url.searchParams.get('device');
      if (!isDevice(device)) return bad('device');
      return fwd(lobby(), `/mine?device=${device}`);
    }

    // the lobby makes and finds leagues
    if (url.pathname === '/league' || url.pathname === '/league/join' || url.pathname === '/league/open') {
      if (req.method !== 'POST') return bad('POST', 405);
      return fwd(lobby(), url.pathname, { method: 'POST', body: await req.text() });
    }

    m = url.pathname.match(/^\/league\/([0-9a-f]{64})(\/[a-z]+)?$/);
    if (m) {
      const [, id, tail] = m;
      // only a phone's doors: a league's /join and /create are the lobby's, which checks one league a weekend first (25.10)
      if (!isPublicLeagueTail(tail)) return bad('no such door', 404);
      let stub: DurableObjectStub;
      try { stub = env.LEAGUE.get(env.LEAGUE.idFromString(id)); } catch { return bad('no such league', 404); }
      return fwd(stub, `${tail ?? '/view'}${url.search}`, { method: req.method, body: req.method === 'POST' ? await req.text() : undefined });
    }
    return bad('no such door', 404);
  }
}

/* ------------------------------------------------------------------ lobby */

interface LobbyState extends W.LobbyCore {
  /** device → how many times champion */
  champions: Record<string, number>;
  counter: number;
}

export class LobbyDO {
  private s: LobbyState | null = null;
  constructor(private state: DurableObjectState, private env: Env) {}

  private async load(): Promise<LobbyState> {
    if (this.s) return this.s;
    this.s = (await this.state.storage.get<LobbyState>('lobby')) ?? { codes: {}, devices: {}, open: [], last: {}, champions: {}, counter: 0 };
    this.s.last ??= {};   // a lobby written before 25.10 has no `last` yet
    if (W.stripLegacyMails(this.s)) await this.save();   // no mail is kept any more (27.10): what an earlier build stored goes at the first request
    return this.s;
  }
  private async save() {
    await this.state.storage.put('lobby', this.s!);
    // the lobby sweeps itself a week after the final, even if nobody calls (27.10)
    await this.state.storage.setAlarm(W.cycleOf(Date.now()).final + KEEP_MS + 60_000);
  }
  async alarm() {
    const s = await this.load();
    const now = Date.now();
    W.sweepLobby(s, W.cycleOf(now), now);
    await this.save();
  }

  async fetch(req: Request): Promise<Response> {
    const s = await this.load();
    const url = new URL(req.url);
    const now = Number(req.headers.get('x-now')) || Date.now();
    const cycle = W.cycleOf(now);
    // codes and open leagues of an earlier cycle are forgotten; a device's league of an earlier cycle moves to
    // `last` for a week, so Sunday 20:00 does not take the final away from the people playing it (25.10)
    W.sweepLobby(s, cycle, now);
    const league = (id: string) => this.env.LEAGUE.get(this.env.LEAGUE.idFromString(id));
    const call = (id: string, path: string, b: unknown) => league(id).fetch(new Request(`https://do${path}`, { method: 'POST', body: JSON.stringify(b), headers: { 'x-now': String(now) } }));

    if (url.pathname === '/mine') {
      const device = url.searchParams.get('device')!;
      const mine = W.mineOf(s, device, cycle, now);
      return json({ league: mine.league, last: mine.last, cycle, phase: W.cyclePhase(cycle, now), now });
    }

    if (url.pathname === '/champion') {   // a league reporting its champion
      const b = await body<{ device: string }>(req);
      if (b && isDevice(b.device)) { s.champions[b.device] = (s.champions[b.device] ?? 0) + 1; await this.save(); }
      return json({ ok: true });
    }
    if (url.pathname === '/champions') {
      const b = await body<{ devices: string[] }>(req);
      const out: Record<string, number> = {};
      for (const d of b?.devices ?? []) out[d] = s.champions[d] ?? 0;
      return json(out);
    }
    if (url.pathname === '/count') {   // an open league reporting how many are in
      const b = await body<{ id: string; count: number }>(req);
      const o = s.open.find(x => x.id === b?.id); if (o && b) { o.count = b.count; await this.save(); }
      return json({ ok: true });
    }

    const b = await body<{ device: string; nick: string; name?: string; slots?: string[]; code?: string; consent?: string }>(req);
    if (!b || !isDevice(b.device)) return bad('device');
    if (b.consent !== W.LEGAL_VERSION) return bad('צריך לאשר את תנאי השימוש ואת מדיניות הפרטיות');
    // the first registration ever opens on a Thursday (the core knows when); before it, this door says so too
    const gate = W.registrationGate(now); if (gate) return bad(gate);
    if (W.cyclePhase(cycle, now) !== 'open') return bad('ההרשמה פתוחה מראשון 20:00 עד חמישי 17:00');
    if (s.devices[b.device]) return bad('אתה כבר בליגה הסופשבוע הזה', 409);
    const nick = String(b.nick ?? '').trim();
    const np = W.nickProblem(nick); if (np) return bad(np);

    if (url.pathname === '/league') {
      const name = String(b.name ?? '').trim();
      const nmp = W.nameProblem(name); if (nmp) return bad(nmp);
      const slots = Array.isArray(b.slots) ? b.slots.map(String) : [];
      // how many the opener planned for: the league's capacity, and what the slots have to fit (25.10)
      const size = Number(b.size);
      if (!Number.isInteger(size) || size < W.MIN_MEMBERS || size > W.MAX_MEMBERS) return bad(`ליגה של ${W.MIN_MEMBERS} עד ${W.MAX_MEMBERS} חברים`);
      if (slots.some(k => !W.slotByKey(k)) || new Set(slots).size !== slots.length) return bad('משבצת שלא בלוח');
      if (slots.length < W.slotsNeeded(W.MIN_MEMBERS)) return bad(`צריך לפחות ${W.slotsNeeded(W.MIN_MEMBERS)} משבצות`);
      if (slots.length > W.slotsNeeded(W.MAX_MEMBERS)) return bad(`עד ${W.slotsNeeded(W.MAX_MEMBERS)} משבצות`);
      const sp = W.slotsProblem(size, slots); if (sp) return bad(sp);
      const fresh = this.env.LEAGUE.newUniqueId();
      s.counter++;
      const seed = (Math.floor(now / 1000) ^ (s.counter * 2654435761)) >>> 0;
      let code = '';
      for (let k = 0; k < 20; k++) { code = W.makeCode(() => Math.random()); if (!s.codes[code]) break; }
      const res = await call(fresh.toString(), '/create', { id: fresh.toString(), kind: 'friend', name, opener: b.device, nick, slots, size, seed, code });
      if (!res.ok) return res;
      s.codes[code] = { id: fresh.toString(), opens: cycle.opens };
      s.devices[b.device] = { id: fresh.toString(), opens: cycle.opens, final: cycle.final };
      await this.save();
      return json({ id: fresh.toString(), code });
    }

    if (url.pathname === '/league/join') {
      const code = String(b.code ?? '').toUpperCase().trim();
      const hit = s.codes[code];
      if (!hit) return bad('אין ליגה עם הקוד הזה', 404);
      const res = await call(hit.id, '/join', { device: b.device, nick });
      if (!res.ok) return res;
      s.devices[b.device] = { id: hit.id, opens: cycle.opens, final: cycle.final };
      await this.save();
      return json({ id: hit.id, code });
    }

    if (url.pathname === '/league/open') {
      let target = s.open.find(o => o.count < W.OPEN_MEMBERS);
      if (!target) {
        const fresh = this.env.LEAGUE.newUniqueId();
        s.counter++;
        const seed = (Math.floor(now / 1000) ^ (s.counter * 40503)) >>> 0;
        const res = await call(fresh.toString(), '/create', { id: fresh.toString(), kind: 'open', name: '', opener: 'game', nick: '', slots: [], seed, code: `OPEN${s.counter}` });
        if (!res.ok) return res;
        target = { id: fresh.toString(), opens: cycle.opens, count: 0 };
        s.open.push(target);
      }
      const res = await call(target.id, '/join', { device: b.device, nick });
      if (!res.ok) return res;
      target.count++;
      s.devices[b.device] = { id: target.id, opens: cycle.opens, final: cycle.final };
      await this.save();
      return json({ id: target.id, code: null });
    }
    return bad('no such door', 404);
  }
}

/* ----------------------------------------------------------------- league */

interface LeagueExtra {
  /** devices that pressed "ready" for the round in play */
  ready: Record<string, number>;
  /**
   * prize tokens handed out, by device: the token itself is kept, so a device whose answer was lost on the way gets
   * the same token (the same nonce) again instead of nothing (25.10); a bare number is a claim from before that
   */
  claimed: Record<string, number | { at: number; token: PrizeToken }>;
  /** the fast clock for a debug run */
  clock?: Partial<D.Clock>;
}

export class LeagueDO {
  private l: W.League | null = null;
  private x: LeagueExtra = { ready: {}, claimed: {} };
  private loaded = false;
  constructor(private state: DurableObjectState, private env: Env) {}

  private async load() {
    if (this.loaded) return;
    this.l = (await this.state.storage.get<W.League>('league')) ?? null;
    this.x = (await this.state.storage.get<LeagueExtra>('extra')) ?? { ready: {}, claimed: {} };
    this.loaded = true;
  }
  private async save() {
    await this.state.storage.put('league', this.l!);
    await this.state.storage.put('extra', this.x);
    const next = this.nextAlarm();
    if (next !== null) await this.state.storage.setAlarm(next);
  }

  /** the next moment something has to happen on its own */
  private nextAlarm(): number | null {
    const l = this.l!;
    if (l.status === 'open') return l.cycle.locks;
    if (l.status === 'cancelled') return l.cycle.final + KEEP_MS;
    if (l.status === 'done') return l.cycle.final + KEEP_MS;
    const due = l.rounds.find(r => r.matches.some(m => !m.matchId));
    if (due) return due.at + READY_MS;
    const collecting = l.rounds.find(r => r.matches.some(m => m.matchId && !m.result));
    if (collecting) return Date.now() + COLLECT_MS;
    return l.cycle.final + KEEP_MS;
  }

  private match(id: string) { return this.env.MATCH.get(this.env.MATCH.idFromString(id)); }
  private lobby() { return this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby')); }
  private async lobbyCall(path: string, b: unknown, now: number) {
    return this.lobby().fetch(new Request(`https://do${path}`, { method: 'POST', body: JSON.stringify(b), headers: { 'x-now': String(now) } }));
  }

  /** everything that is due by now, in order: the lock, the rounds, the results, the end */
  private async tick(now: number) {
    const l = this.l!;
    if (l.status === 'open' && now >= l.cycle.locks) W.lock(l, now);
    if (l.status === 'locked' || l.status === 'playing') {
      for (const r of l.rounds) {
        if (now < r.at + READY_MS) break;
        for (const slot of r.matches) {
          if (slot.matchId) continue;
          const h = W.member(l, slot.home)!, a = W.member(l, slot.away)!;
          const fresh = this.env.MATCH.newUniqueId();
          const input: D.DuelInput & { homeDevice: string; awayDevice: string } = {
            seed: (l.seed ^ (r.index * 7919 + l.rounds.indexOf(r) * 31 + slot.home.length * 17 + slot.away.length)) >>> 0,
            home: { id: `h-${h.device}`, name: h.nick, starters: W.starters(h), bench: W.bench(h), tactic: h.tactic },
            away: { id: `a-${a.device}`, name: a.nick, starters: W.starters(a), bench: W.bench(a), tactic: a.tactic },
            tier: 5, shootoutOnDraw: true, clock: this.x.clock, homeDevice: h.device, awayDevice: a.device,
          };
          const res = await this.match(fresh.toString()).fetch(new Request('https://do/create', { method: 'POST', body: JSON.stringify(input), headers: { 'x-now': String(now) } }));
          if (res.ok) slot.matchId = fresh.toString();
        }
        l.status = 'playing';
      }
      // results
      for (const r of l.rounds) {
        for (const slot of r.matches) {
          if (!slot.matchId || slot.result) continue;
          const res = await this.match(slot.matchId).fetch(new Request('https://do/result', { headers: { 'x-now': String(now) } }));
          if (!res.ok) continue;
          const raw = await res.json() as { done: boolean; score: [number, number]; winner: D.Who | 'draw'; shootout: [number, number] | null; chose: { home: number; away: number }; decisions: number };
          if (!raw.done || raw.winner === 'draw') continue;
          W.recordResult(l, r, slot, { score: raw.score, shootout: raw.shootout, winner: raw.winner, chose: raw.chose, decisions: raw.decisions });
        }
      }
      const allIn = l.rounds.every(r => r.matches.every(m => m.result));
      if (allIn && l.rounds.length > 0) {
        const res = await this.lobbyCall('/champions', { devices: l.members.map(m => m.device) }, now);
        const before = res.ok ? await res.json() as Record<string, number> : {};
        const prizes = W.settle(l, before);
        if (prizes[0]) await this.lobbyCall('/champion', { device: prizes[0].device }, now);
      }
    }
    if ((l.status === 'done' || l.status === 'cancelled') && now >= l.cycle.final + KEEP_MS) {
      await this.state.storage.deleteAll();
      this.l = null; this.loaded = false;
    }
  }

  async alarm() {
    await this.load();
    if (!this.l) return;
    await this.tick(Date.now());
    if (this.l) await this.save();
  }

  /** the league as one manager sees it */
  private view(device: string, now: number) {
    const l = this.l!;
    const me = W.member(l, device);
    const table = W.standings(l);
    const current = l.rounds.find(r => r.matches.some(m => !m.result)) ?? null;
    const mine = current && me ? W.myMatch(l, current, device) : null;
    const opp = mine ? W.member(l, mine.home === device ? mine.away : mine.home) : null;
    const prize = l.prizes?.find(p => p.device === device) ?? null;
    return {
      id: l.id, code: l.kind === 'friend' ? l.code : null, kind: l.kind, name: l.name, status: l.status, opener: l.opener === device,
      cycle: l.cycle, phase: W.cyclePhase(l.cycle, now), now,
      slots: l.slots, roundKeys: l.status === 'open' ? W.roundKeys(l.cycle, l.slots).map(k => ({ key: k, at: W.slotAt(l.cycle, k) })) : l.rounds.map(r => ({ key: r.key, at: r.at })),
      members: l.members.map(m => ({ nick: m.nick, me: m.device === device, opener: m.device === l.opener, ready: !!this.x.ready[m.device] && current !== null && this.x.ready[m.device] >= current.at - 3_600_000 })),
      capacity: W.capacity(l), min: W.MIN_MEMBERS,
      rounds: l.rounds.map(r => ({
        index: r.index, key: r.key, at: r.at, bye: r.bye ? W.member(l, r.bye)?.nick ?? null : null,
        matches: r.matches.map(m => ({
          home: W.member(l, m.home)!.nick, away: W.member(l, m.away)!.nick, mine: m.home === device || m.away === device,
          matchId: (m.home === device || m.away === device) ? m.matchId : null, started: !!m.matchId,
          result: m.result,
        })),
      })),
      current: current ? { index: current.index, key: current.key, at: current.at, readyAt: current.at, startsAt: current.at + READY_MS } : null,
      mine: mine ? { matchId: mine.matchId, side: mine.home === device ? 'home' : 'away', opponent: opp?.nick ?? '', result: mine.result } : null,
      me: me ? { nick: me.nick, squad: me.squad, tactic: me.tactic, wins: me.wins, losses: me.losses, assistant: me.assistant, packs: me.packs, opened: me.opened, fromPacks: me.fromPacks, finished: W.finishedHimself(l, device) } : null,
      table,
      prize, claimed: !!this.x.claimed[device],
      assistantMax: W.ASSISTANT_MAX, packEvery: W.PACK_EVERY,
    };
  }

  async fetch(req: Request): Promise<Response> {
    await this.load();
    const url = new URL(req.url);
    const now = Number(req.headers.get('x-now')) || Date.now();
    const debug = !!this.env.DEBUG;

    if (url.pathname === '/create') {
      if (this.l) return bad('this league exists', 409);
      const b = await body<{ id: string; kind: W.LeagueKind; name: string; opener: string; nick: string; slots: string[]; seed: number; code: string; size?: number }>(req);
      if (!b) return bad('bad body');
      const made = W.createLeague({ id: b.id, kind: b.kind, name: b.name, opener: b.opener, nick: b.nick, slots: b.slots, seed: b.seed, size: b.size }, now);
      if (typeof made === 'string') return bad(made);
      made.code = b.code;
      this.l = made;
      await this.save();
      return json({ ok: true });
    }
    if (!this.l) return bad('no such league', 404);
    const l = this.l;
    await this.tick(now);
    if (!this.l) return bad('this league is gone', 410);

    if (url.pathname === '/join') {
      const b = await body<{ device: string; nick: string }>(req);
      if (!b || !isDevice(b.device)) return bad('device');
      const e = W.join(l, b.device, String(b.nick ?? ''), now);
      if (e) return bad(e);
      if (l.kind === 'open') await this.lobbyCall('/count', { id: l.id, count: l.members.length }, now);
      await this.save();
      return json({ ok: true, members: l.members.length });
    }

    const device = url.searchParams.get('device') ?? '';
    if (url.pathname === '/view') {
      if (!isDevice(device)) return bad('device');
      if (!W.member(l, device)) return bad('אתה לא בליגה הזאת', 403);
      await this.save();
      return json(this.view(device, now));
    }
    if (url.pathname === '/live') {
      if (!isDevice(device) || !W.member(l, device)) return bad('אתה לא בליגה הזאת', 403);
      const r = l.rounds.find(x => x.matches.some(m => !m.result)) ?? l.rounds[l.rounds.length - 1];
      if (!r) return json({ round: null });
      const matches = [];
      for (const slot of r.matches) {
        let live: unknown = null;
        if (slot.matchId && !slot.result) {
          const res = await this.match(slot.matchId).fetch(new Request('https://do/summary', { headers: { 'x-now': String(now) } }));
          if (res.ok) live = await res.json();
        }
        matches.push({ home: W.member(l, slot.home)!.nick, away: W.member(l, slot.away)!.nick, mine: slot.home === device || slot.away === device, result: slot.result, live });
      }
      return json({ round: { index: r.index, key: r.key, at: r.at }, matches, table: W.standings(l), now });
    }

    const b = await body<Record<string, unknown>>(req) ?? {};
    const dev = String(b.device ?? device);
    if (!isDevice(dev)) return bad('device');
    const me = W.member(l, dev);

    if (url.pathname === '/debug') {
      if (!debug) return bad('no', 403);
      const action = String(b.action ?? '');
      if (action === 'clock') this.x.clock = b.clock as Partial<D.Clock>;
      if (action === 'lock') { l.cycle.locks = Math.min(l.cycle.locks, now); W.lock(l, now); }
      if (action === 'round') { const r = l.rounds.find(x => x.matches.some(m => !m.matchId)); if (r) r.at = now - READY_MS; await this.tick(now); }
      if (action === 'collect') await this.tick(now);
      await this.save();
      return json({ ok: true, status: l.status });
    }
    if (!me) return bad('אתה לא בליגה הזאת', 403);

    if (url.pathname === '/lineup') {
      const e = W.setLineup(me, (b.ids as string[]) ?? [], (b.tactic as W.Member['tactic']) ?? me.tactic);
      if (e) return bad(e);
      await this.save();
      return json({ ok: true, squad: me.squad, tactic: me.tactic });
    }
    if (url.pathname === '/pack') {
      const man = W.openWeekendPack(l, me, String(b.position ?? '') as Position);
      if (typeof man === 'string') return bad(man);
      await this.save();
      return json({ ok: true, player: man, squad: me.squad, packs: me.packs, opened: me.opened });
    }
    if (url.pathname === '/ready') {
      this.x.ready[dev] = now;
      await this.save();
      return json({ ok: true });
    }
    if (url.pathname === '/prize') {
      if (l.status !== 'done' || !l.prizes) return bad('הליגה עוד לא נגמרה');
      const p = l.prizes.find(x => x.device === dev);
      if (!p) return bad('אין פרס');
      const had = this.x.claimed[dev];
      if (had && typeof had === 'object') return json({ token: had.token, again: true });   // the same token again: the career applies a nonce once
      if (had) return bad('הפרס כבר נלקח', 409);
      const secret = this.env.PRIZE_SECRET ?? (debug ? 'debug-secret' : '');
      if (!secret) return bad('no secret', 500);
      const nonce = crypto.randomUUID();
      const tok: Omit<PrizeToken, 'sig'> = { league: l.id, device: dev, place: p.place, wageRounds: p.wageRounds, gems: p.gems, finished: p.finished, nick: me.nick, leagueName: l.name, final: l.cycle.final, nonce };
      const sig = await hmac(secret, JSON.stringify(tok));
      const token: PrizeToken = { ...tok, sig };
      this.x.claimed[dev] = { at: now, token };
      await this.save();
      return json({ token });
    }
    return bad('no such door', 404);
  }
}

/* ------------------------------------------------------------------ match */

export class MatchDO {
  private duel: D.Duel | null = null;
  private devices: { home: string; away: string } | null = null;
  private loaded = false;
  constructor(private state: DurableObjectState, private env: Env) {}

  private async load() {
    if (this.loaded) return;
    const raw = await this.state.storage.get<string>('duel');
    this.duel = raw ? D.deserialize(raw) : null;
    this.devices = (await this.state.storage.get<{ home: string; away: string }>('devices')) ?? null;
    this.loaded = true;
  }
  private async settle() {
    const d = this.duel!;
    await this.state.storage.put('duel', D.serialize(d));
    const next = d.decision ? d.decision.deadlineAt : d.halfUntil !== null ? d.halfUntil : null;
    if (next !== null && !d.done) await this.state.storage.setAlarm(next);
    // a finished match keeps its squads, team names and device ids for a week and then goes (27.10)
    if (d.done && (await this.state.storage.get<number>('purgeAt')) === undefined) {
      const at = Date.now() + KEEP_MS;
      await this.state.storage.put('purgeAt', at);
      await this.state.storage.setAlarm(at);
    }
  }
  async alarm() {
    await this.load();
    const purgeAt = await this.state.storage.get<number>('purgeAt');
    if (purgeAt !== undefined && Date.now() >= purgeAt) { await this.state.storage.deleteAll(); this.duel = null; this.devices = null; this.loaded = false; return; }
    if (!this.duel || this.duel.done) return;
    D.advance(this.duel, Date.now());
    await this.settle();
  }

  /** which touchline a request is: by device when the league made the match, by ?side= only in DEBUG */
  private sideOf(url: URL, b?: { side?: string; device?: string }): D.Who | null {
    const device = url.searchParams.get('device') ?? b?.device ?? null;
    if (this.devices && device) return this.devices.home === device ? 'home' : this.devices.away === device ? 'away' : null;
    if (!this.devices && this.env.DEBUG) { const s = url.searchParams.get('side') ?? b?.side; return s === 'home' || s === 'away' ? s : null; }
    return null;
  }

  async fetch(req: Request): Promise<Response> {
    await this.load();
    const url = new URL(req.url);
    const now = Number(req.headers.get('x-now')) || Date.now();
    if (url.pathname === '/create') {
      if (this.duel) return bad('this match exists', 409);
      const input = await body<D.DuelInput & { homeDevice?: string; awayDevice?: string }>(req);
      if (!input || typeof input.seed !== 'number' || !input.home?.starters?.length || !input.away?.starters?.length) return bad('a seed and two squads');
      this.duel = D.createDuel(input, now);
      if (input.homeDevice && input.awayDevice) { this.devices = { home: input.homeDevice, away: input.awayDevice }; await this.state.storage.put('devices', this.devices); }
      await this.settle();
      return json({ ok: true, engine: D.DUEL_ENGINE });
    }
    if (!this.duel) return bad('no such match', 404);
    if (url.pathname === '/summary') {
      D.advance(this.duel, now);
      await this.settle();
      const d = this.duel;
      const last = [...d.st.events].reverse().find(e => e.big) ?? null;
      return json({ minute: d.st.minute, phase: d.st.phase, score: d.st.score, shootout: d.shootout ? [d.shootout.home, d.shootout.away] : null, done: d.done, deciding: d.decision ? d.decision.deciders.filter(w => d.decision!.choices[w] === undefined) : [], last: last ? { minute: last.minute, text: last.text, type: last.type } : null });
    }
    if (url.pathname === '/result') {
      D.advance(this.duel, now);
      await this.settle();
      if (!this.duel.done) return json({ done: false, minute: this.duel.st.minute });
      return json({ done: true, ...D.result(this.duel) });
    }
    if (url.pathname === '/view') {
      const side = this.sideOf(url);
      if (!side) return bad('not your match', 403);
      const since = Number(url.searchParams.get('since') ?? '0') || 0;
      const v = D.view(this.duel, side, since, now);
      await this.settle();
      return json({ ...v, side });
    }
    if (url.pathname === '/choice') {
      const b = await body<{ side?: string; device?: string; choice?: string }>(req);
      const side = this.sideOf(url, b ?? undefined);
      if (!side) return bad('not your match', 403);
      if (!b || typeof b.choice !== 'string') return bad('choice');
      const ok = D.choose(this.duel, side, b.choice, now);
      const v = D.view(this.duel, side, Number(url.searchParams.get('since') ?? '0') || 0, now);
      await this.settle();
      return json({ ok, view: { ...v, side } });
    }
    return bad('no such door', 404);
  }
}
