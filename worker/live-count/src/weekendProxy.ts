/**
 * beapro-count's side of the dashboard's weekend area: GET /stats asks beapro-weekend for its counts over the WEEKEND
 * service binding (never the public internet) with the shared secret, waits at most WAIT_MS, and passes on only what
 * cleanSummary rebuilds: numbers, times and a few fixed words. Anything else the other worker might ever send (a nick,
 * a league's name, an id) is dropped here, whatever that worker's version.
 */
export interface WeekendFetcher { fetch(req: Request): Promise<Response> }
export interface WeekendEnv {
  /** [[services]] binding = "WEEKEND", service = "beapro-weekend" in wrangler.toml */
  WEEKEND?: WeekendFetcher;
  /** the same value as beapro-weekend's STATS_SECRET; set with: wrangler secret put WEEKEND_STATS_SECRET */
  WEEKEND_STATS_SECRET?: string;
}
export type WeekendErr = 'unwired' | 'timeout' | 'refused' | 'bad';

const WAIT_MS = 1500;
const PHASES = ['open', 'locked', 'playing'];
const KINDS = ['friend', 'open'];
const STATUSES = ['open', 'locked', 'playing', 'done', 'cancelled'];
const REFUSALS = ['consent', 'closed', 'already', 'full', 'code', 'nick', 'form', 'other'];

type O = Record<string, unknown>;
const obj = (x: unknown): O => (x && typeof x === 'object' && !Array.isArray(x) ? x as O : {});
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0);
const word = (x: unknown, allowed: string[]): string | null => (typeof x === 'string' && allowed.includes(x) ? x : null);
const pick = (x: unknown, keys: string[]) => { const o = obj(x); return Object.fromEntries(keys.map(k => [k, num(o[k])])); };
const list = (x: unknown, max: number): unknown[] => (Array.isArray(x) ? x.slice(0, max) : []);
const day = (x: unknown): string | null => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);

/** the weekend summary, rebuilt from scratch: what is not listed here does not reach the dashboard */
export function cleanSummary(x: unknown): O | null {
  const o = obj(x);
  const phase = word(o.phase, PHASES);
  if (!phase || !num(o.opens)) return null;
  const v2 = o.v === 2;
  const out: O = {
    phase, opens: num(o.opens), locks: num(o.locks), kickoff: num(o.kickoff), final: num(o.final),
    managers: num(o.managers), friendLeagues: num(o.friendLeagues), openLeagues: num(o.openLeagues), openMembers: num(o.openMembers), champions: num(o.champions),
  };
  if (!v2) return out;
  return {
    ...out,
    v: 2, now: num(o.now), first: o.first === true, since: num(o.since), known: num(o.known), returning: num(o.returning),
    byDay: list(o.byDay, 15).map(d => ({ day: day(obj(d).day), n: num(obj(d).n) })).filter(d => d.day),
    leagues: list(o.leagues, 500).map(r => {
      const l = obj(r);
      return { kind: word(l.kind, KINDS) ?? 'open', status: word(l.status, STATUSES) ?? 'open', ...pick(l, ['members', 'capacity', 'rounds', 'roundsDone', 'matches', 'done']), stuck: l.stuck === true };
    }),
    fill: pick(o.fill, ['full', 'enough', 'short', 'seats']),
    status: pick(o.status, STATUSES),
    play: pick(o.play, ['rounds', 'roundsDone', 'matches', 'started', 'done', 'assistant', 'technical', 'shootouts', 'stuck']),
    drop: pick(o.drop, ['cancelled', 'cancelledMembers', 'absent', 'technical']),
    prizes: pick(o.prizes, ['awarded', 'gems', 'wageRounds', 'claimed']),
    refusals: pick(o.refusals, REFUSALS),
    errors: pick(o.errors, ['matchFails', 'stuck']),
    history: list(o.history, 12).map(h => {
      const e = obj(h);
      return {
        ...pick(e, ['opens', 'final', 'managers', 'leagues', 'friendLeagues', 'openLeagues', 'cancelled', 'cancelledMembers', 'done', 'matches', 'done_matches', 'assistant', 'technical', 'absent', 'prizes', 'gems', 'claimed', 'returning', 'refused']),
        byDay: list(e.byDay, 15).map(num),
      };
    }),
  };
}

/** ext.weekend and ext.weekendErr for GET /stats; never throws, never waits more than WAIT_MS */
export async function weekendOf(env: WeekendEnv): Promise<{ weekend: O | null; weekendErr: WeekendErr | null }> {
  if (!env.WEEKEND || !env.WEEKEND_STATS_SECRET) return { weekend: null, weekendErr: 'unwired' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<'late'>(r => { timer = setTimeout(() => r('late'), WAIT_MS); });
  try {
    const res = await Promise.race([
      env.WEEKEND.fetch(new Request('https://beapro-weekend/internal/summary', { headers: { 'x-stats-secret': env.WEEKEND_STATS_SECRET } })),
      late,
    ]);
    if (res === 'late') return { weekend: null, weekendErr: 'timeout' };
    if (!res.ok) return { weekend: null, weekendErr: 'refused' };
    const clean = cleanSummary(await res.json());
    return clean ? { weekend: clean, weekendErr: null } : { weekend: null, weekendErr: 'bad' };
  } catch {
    return { weekend: null, weekendErr: 'bad' };
  } finally {
    clearTimeout(timer);
  }
}

/* ---- draft 4.11: per-league view (ext.weekendLeagues), needs Itzik's approval before any deploy ---- */
const txt = (x: unknown, max = 40): string => (typeof x === 'string' ? x.replace(/[\u0000-\u001f<>]/g, '').slice(0, max) : '');
const pair = (x: unknown): [number, number] | null => (Array.isArray(x) && x.length === 2 ? [num(x[0]), num(x[1])] : null);
const SIDES = ['home', 'away'];
export function cleanLeagues(x: unknown): O | null {
  const o = obj(x);
  if (o.v !== 1) return null;
  return {
    v: 1, now: num(o.now), total: num(o.total),
    leagues: list(o.leagues, 60).map(v => {
      const l = obj(v);
      const kind = word(l.kind, KINDS) ?? 'open';
      return {
        kind, status: word(l.status, STATUSES) ?? 'open', name: txt(l.name), code: kind === 'friend' ? (txt(l.code, 12).match(/^[A-Z0-9-]+$/i)?.[0] ?? null) : null,
        members: num(l.members), capacity: num(l.capacity),
        table: list(l.table, 12).map(r => { const e = obj(r); return { club: txt(e.club, 24), ...pick(e, ['played', 'wins', 'losses', 'gf', 'ga', 'points', 'assistant']) }; }),
        rounds: list(l.rounds, 12).map(r => {
          const e = obj(r);
          return { index: num(e.index), at: num(e.at), bye: e.bye ? txt(e.bye, 24) : null, matches: list(e.matches, 8).map(m => {
            const g = obj(m); const res = g.result ? obj(g.result) : null;
            return { home: txt(g.home, 24), away: txt(g.away, 24), started: g.started === true, result: res ? { score: pair(res.score) ?? [0, 0], shootout: pair(res.shootout), winner: word(res.winner, SIDES), technical: word(res.technical, SIDES), homeAssistant: res.homeAssistant === true, awayAssistant: res.awayAssistant === true } : null };
          }) };
        }),
      };
    }),
  };
}
export async function weekendLeaguesOf(env: WeekendEnv): Promise<O | null> {
  if (!env.WEEKEND || !env.WEEKEND_STATS_SECRET) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<'late'>(r => { timer = setTimeout(() => r('late'), 2500); });
  try {
    const res = await Promise.race([env.WEEKEND.fetch(new Request('https://beapro-weekend/internal/leagues', { headers: { 'x-stats-secret': env.WEEKEND_STATS_SECRET } })), late]);
    if (res === 'late' || !res.ok) return null;
    return cleanLeagues(await res.json());
  } catch { return null; } finally { clearTimeout(timer); }
}
