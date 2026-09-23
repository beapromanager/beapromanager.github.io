/**
 * The counting house.
 *
 * Two doors. POST / takes a batch of events from a game and writes them down.
 * GET /stats, with the key, gives back the numbers: how many people, how many
 * sittings, and where the ones who stopped stopped.
 *
 * WHAT IT REFUSES TO KNOW. It stores no IP, no user agent, no country, no
 * name. The game never sends them, and an event that arrives with extra
 * fields is not written with them: every row is built from the four values
 * below and nothing else, so a future change to the game cannot start
 * collecting something by accident.
 *
 * WHY THE WRITES ARE IDEMPOTENT. A phone that loses its connection mid post
 * keeps the batch and sends it again, so the same event can arrive twice.
 * INSERT OR IGNORE against (aid, step) means the second one changes nothing,
 * and a funnel that counts people cannot be inflated by a bad network.
 *
 * WHY THE DASHBOARD KEY IS CHECKED HERE. Anything the browser holds is public,
 * so a key checked in the page is a lock with the key taped to the door. The
 * numbers only leave this worker when the key sent with the request matches
 * the secret, which lives in the worker and never in the game.
 */

/**
 * The slice of D1 this worker uses, declared here rather than pulled from a
 * types package. Wrangler strips the types on the way up, so the deploy does
 * not depend on an install succeeding, and what the worker expects of the
 * database is readable in the same file that uses it.
 */
interface D1Result<T = Record<string, unknown>> { results: T[] }
interface D1Stmt { bind(...v: unknown[]): D1Stmt; all<T = Record<string, unknown>>(): Promise<D1Result<T>> }
interface D1Database { prepare(sql: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown> }

export interface Env {
  DB: D1Database;
  /** the secret behind ?admin=, set with: wrangler secret put ADMIN_KEY */
  ADMIN_KEY: string;
}

/** the steps the game can report, in order; anything else is dropped */
const STEPS = [
  'open', 'career_new', 'archetype', 'manager', 'club', 'signing', 'friends',
  'squad', 'market', 'season', 'round_1', 'round_3', 'round_7', 'season_end', 'season_2',
] as const;
type Step = typeof STEPS[number];
const KNOWN = new Set<string>(STEPS);

/** the most a single post may carry, so one caller cannot fill the table */
const MAX_BATCH = 120;
/** ids are made by the game and are short; anything longer is not one of ours */
const MAX_ID = 40;

function cors(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });

/** YYYY-MM-DD, worked out here rather than trusted from a device clock */
function today(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

type Incoming = { a?: unknown; s?: unknown; k?: unknown; t?: unknown };

/** An event, or nothing. The only shape that reaches the database. */
function clean(e: Incoming, now: number): { aid: string; sid: string; step: Step; ts: number } | null {
  const aid = typeof e.a === 'string' ? e.a.slice(0, MAX_ID) : '';
  const sid = typeof e.s === 'string' ? e.s.slice(0, MAX_ID) : '';
  const step = typeof e.k === 'string' ? e.k : '';
  if (!aid || !sid || !KNOWN.has(step)) return null;
  // a device clock can be anything at all, so it is only trusted to be a
  // number and never to be right: far future or far past lands on arrival
  const raw = typeof e.t === 'number' && Number.isFinite(e.t) ? e.t : now;
  const ts = Math.abs(raw - now) > 1000 * 60 * 60 * 24 * 30 ? now : Math.round(raw);
  return { aid, sid, step: step as Step, ts };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('origin');

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    if (req.method === 'POST' && (url.pathname === '/' || url.pathname === '/e')) {
      let body: { e?: Incoming[] };
      try { body = await req.json(); } catch { return json({ ok: false }, 400, origin); }
      const list = Array.isArray(body?.e) ? body.e.slice(0, MAX_BATCH) : [];
      const now = Date.now();
      const rows = list.map(e => clean(e, now)).filter((x): x is NonNullable<typeof x> => x !== null);
      if (!rows.length) return json({ ok: true, n: 0 }, 200, origin);

      const stmts = [
        // a step counts once per device, whatever the network did
        ...rows.map(r => env.DB
          .prepare('INSERT OR IGNORE INTO steps (aid, step, ts, day) VALUES (?, ?, ?, ?)')
          .bind(r.aid, r.step, r.ts, today(r.ts))),
        // a sitting counts once, and only an open starts one
        ...rows.filter(r => r.step === 'open').map(r => env.DB
          .prepare('INSERT OR IGNORE INTO sessions (sid, aid, ts, day) VALUES (?, ?, ?, ?)')
          .bind(r.sid, r.aid, r.ts, today(r.ts))),
      ];
      try { await env.DB.batch(stmts); } catch { return json({ ok: false }, 500, origin); }
      return json({ ok: true, n: rows.length }, 200, origin);
    }

    if (req.method === 'GET' && url.pathname === '/stats') {
      const key = url.searchParams.get('key') ?? '';
      // constant work whatever the key, so a wrong one cannot be narrowed down
      // by how long the answer took
      if (!env.ADMIN_KEY || !safeEqual(key, env.ADMIN_KEY)) {
        return json({ ok: false }, 401, origin);
      }
      const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? 30)));
      const since = today(Date.now() - days * 86400000);

      const [funnel, totals, daily, returning] = await Promise.all([
        env.DB.prepare('SELECT step, COUNT(*) AS n FROM steps GROUP BY step').all(),
        env.DB.prepare(
          'SELECT (SELECT COUNT(DISTINCT aid) FROM sessions) AS people,' +
          ' (SELECT COUNT(*) FROM sessions) AS sittings'
        ).all(),
        env.DB.prepare(
          'SELECT day, COUNT(DISTINCT aid) AS people, COUNT(*) AS sittings' +
          ' FROM sessions WHERE day >= ? GROUP BY day ORDER BY day'
        ).bind(since).all(),
        // people who opened it on more than one day, which is the only
        // retention number worth reading this early
        env.DB.prepare(
          'SELECT COUNT(*) AS n FROM (SELECT aid FROM sessions GROUP BY aid HAVING COUNT(DISTINCT day) > 1)'
        ).all(),
      ]);

      const counts: Record<string, number> = {};
      for (const r of funnel.results as { step: string; n: number }[]) counts[r.step] = r.n;

      return json({
        ok: true,
        steps: STEPS,
        funnel: STEPS.map(s => ({ step: s, n: counts[s] ?? 0 })),
        people: (totals.results[0] as { people: number })?.people ?? 0,
        sittings: (totals.results[0] as { sittings: number })?.sittings ?? 0,
        returned: (returning.results[0] as { n: number })?.n ?? 0,
        daily: daily.results,
      }, 200, origin);
    }

    return json({ ok: false }, 404, origin);
  },
};

/** Compare without giving away where two keys first differ. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
