var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/retention.ts
var RETAIN_MS = 364 * 864e5;
var PURGE_SQL = [
  "DELETE FROM steps WHERE ts < ?",
  "DELETE FROM sessions WHERE ts < ?",
  "DELETE FROM crashes WHERE ts < ?"
];
async function purgeOld(db, now) {
  const cutoff = now - RETAIN_MS;
  await db.batch(PURGE_SQL.map((sql) => db.prepare(sql).bind(cutoff)));
}
__name(purgeOld, "purgeOld");

// src/statsExt.ts
function keyOf(req, url) {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : url.searchParams.get("key") ?? "";
}
__name(keyOf, "keyOf");
var HOUR = 36e5;
var IL = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
function ilOf(hour, memo) {
  let v = memo.get(hour);
  if (!v) {
    const p = Object.fromEntries(IL.formatToParts(new Date(hour * HOUR)).map((x) => [x.type, x.value]));
    v = { day: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour) % 24 };
    memo.set(hour, v);
  }
  return v;
}
__name(ilOf, "ilOf");
async function statsExt(DB, now, days) {
  const memo = /* @__PURE__ */ new Map();
  const nowHour = Math.floor(now / HOUR);
  const { day: today2, h: hourNow } = ilOf(nowHour, memo);
  const since = now - (days + 1) * 864e5;
  const [marks, stepHours, sessHours, firsts] = await Promise.all([
    DB.prepare("SELECT step, COUNT(*) AS n FROM steps WHERE step NOT GLOB 't[1-5]s*' AND step NOT GLOB 'w[1-5]' GROUP BY step").all(),
    DB.prepare("SELECT step, ts / 3600000 AS hr, COUNT(*) AS n FROM steps WHERE ts >= ? AND step NOT GLOB 't[1-5]s*' AND step NOT GLOB 'w[1-5]' GROUP BY step, hr").bind(since).all(),
    DB.prepare("SELECT aid, ts / 3600000 AS hr FROM sessions WHERE ts >= ?").bind(since).all(),
    DB.prepare("SELECT f / 3600000 AS hr, COUNT(*) AS n FROM (SELECT MIN(ts) AS f FROM sessions GROUP BY aid) WHERE f >= ? GROUP BY hr").bind(since).all()
  ]);
  const keep = [];
  {
    let t = now;
    for (let i = 0; i < days; i++) {
      keep.unshift(ilOf(Math.floor(t / HOUR), memo).day);
      t -= 864e5;
    }
  }
  const dayList = [...new Set(keep)];
  const yesterday = dayList.length > 1 ? dayList[dayList.length - 2] : "";
  const blank = /* @__PURE__ */ __name(() => ({ people: 0, sittings: 0, fresh: 0, steps: {} }), "blank");
  const by = new Map(dayList.map((d) => [d, blank()]));
  const ySoFar = blank();
  const seen = /* @__PURE__ */ new Map(), ySeen = /* @__PURE__ */ new Set();
  const inSoFar = /* @__PURE__ */ __name((hr) => {
    const v = ilOf(hr, memo);
    return v.day === yesterday && v.h <= hourNow;
  }, "inSoFar");
  for (const r of stepHours.results) {
    const d = by.get(ilOf(r.hr, memo).day);
    if (!d)
      continue;
    d.steps[r.step] = (d.steps[r.step] ?? 0) + r.n;
    if (inSoFar(r.hr))
      ySoFar.steps[r.step] = (ySoFar.steps[r.step] ?? 0) + r.n;
  }
  for (const r of sessHours.results) {
    const day2 = ilOf(r.hr, memo).day;
    const d = by.get(day2);
    if (!d)
      continue;
    d.sittings++;
    let s = seen.get(day2);
    if (!s)
      seen.set(day2, s = /* @__PURE__ */ new Set());
    s.add(r.aid);
    if (inSoFar(r.hr)) {
      ySoFar.sittings++;
      ySeen.add(r.aid);
    }
  }
  for (const [day2, s] of seen)
    by.get(day2).people = s.size;
  ySoFar.people = ySeen.size;
  for (const r of firsts.results) {
    const d = by.get(ilOf(r.hr, memo).day);
    if (!d)
      continue;
    d.fresh += r.n;
    if (inSoFar(r.hr))
      ySoFar.fresh += r.n;
  }
  return {
    v: 1,
    tz: "Asia/Jerusalem",
    now,
    today: today2,
    marks: marks.results,
    days: dayList.map((d) => ({ day: d, ...by.get(d) })),
    soFar: { yesterday: ySoFar },
    weekend: null
  };
}
__name(statsExt, "statsExt");

// src/weekendProxy.ts
var WAIT_MS = 1500;
var PHASES = ["open", "locked", "playing"];
var KINDS = ["friend", "open"];
var STATUSES = ["open", "locked", "playing", "done", "cancelled"];
var REFUSALS = ["consent", "closed", "already", "full", "code", "nick", "form", "other"];
var obj = /* @__PURE__ */ __name((x) => x && typeof x === "object" && !Array.isArray(x) ? x : {}, "obj");
var num = /* @__PURE__ */ __name((x) => typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0, "num");
var word = /* @__PURE__ */ __name((x, allowed) => typeof x === "string" && allowed.includes(x) ? x : null, "word");
var pick = /* @__PURE__ */ __name((x, keys) => {
  const o = obj(x);
  return Object.fromEntries(keys.map((k) => [k, num(o[k])]));
}, "pick");
var list = /* @__PURE__ */ __name((x, max) => Array.isArray(x) ? x.slice(0, max) : [], "list");
var day = /* @__PURE__ */ __name((x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null, "day");
function cleanSummary(x) {
  const o = obj(x);
  const phase = word(o.phase, PHASES);
  if (!phase || !num(o.opens))
    return null;
  const v2 = o.v === 2;
  const out = {
    phase,
    opens: num(o.opens),
    locks: num(o.locks),
    kickoff: num(o.kickoff),
    final: num(o.final),
    managers: num(o.managers),
    friendLeagues: num(o.friendLeagues),
    openLeagues: num(o.openLeagues),
    openMembers: num(o.openMembers),
    champions: num(o.champions)
  };
  if (!v2)
    return out;
  return {
    ...out,
    v: 2,
    now: num(o.now),
    first: o.first === true,
    since: num(o.since),
    known: num(o.known),
    returning: num(o.returning),
    byDay: list(o.byDay, 15).map((d) => ({ day: day(obj(d).day), n: num(obj(d).n) })).filter((d) => d.day),
    leagues: list(o.leagues, 500).map((r) => {
      const l = obj(r);
      return { kind: word(l.kind, KINDS) ?? "open", status: word(l.status, STATUSES) ?? "open", ...pick(l, ["members", "capacity", "rounds", "roundsDone", "matches", "done"]), stuck: l.stuck === true };
    }),
    fill: pick(o.fill, ["full", "enough", "short", "seats"]),
    status: pick(o.status, STATUSES),
    play: pick(o.play, ["rounds", "roundsDone", "matches", "started", "done", "assistant", "technical", "shootouts", "stuck"]),
    drop: pick(o.drop, ["cancelled", "cancelledMembers", "absent", "technical"]),
    prizes: pick(o.prizes, ["awarded", "gems", "wageRounds", "claimed"]),
    refusals: pick(o.refusals, REFUSALS),
    errors: pick(o.errors, ["matchFails", "stuck"]),
    history: list(o.history, 12).map((h) => {
      const e = obj(h);
      return {
        ...pick(e, ["opens", "final", "managers", "leagues", "friendLeagues", "openLeagues", "cancelled", "cancelledMembers", "done", "matches", "done_matches", "assistant", "technical", "absent", "prizes", "gems", "claimed", "returning", "refused"]),
        byDay: list(e.byDay, 15).map(num)
      };
    })
  };
}
__name(cleanSummary, "cleanSummary");
async function weekendOf(env) {
  if (!env.WEEKEND || !env.WEEKEND_STATS_SECRET)
    return { weekend: null, weekendErr: "unwired" };
  let timer;
  const late = new Promise((r) => {
    timer = setTimeout(() => r("late"), WAIT_MS);
  });
  try {
    const res = await Promise.race([
      env.WEEKEND.fetch(new Request("https://beapro-weekend/internal/summary", { headers: { "x-stats-secret": env.WEEKEND_STATS_SECRET } })),
      late
    ]);
    if (res === "late")
      return { weekend: null, weekendErr: "timeout" };
    if (!res.ok)
      return { weekend: null, weekendErr: "refused" };
    const clean2 = cleanSummary(await res.json());
    return clean2 ? { weekend: clean2, weekendErr: null } : { weekend: null, weekendErr: "bad" };
  } catch {
    return { weekend: null, weekendErr: "bad" };
  } finally {
    clearTimeout(timer);
  }
}
__name(weekendOf, "weekendOf");
var txt = /* @__PURE__ */ __name((x, max = 40) => typeof x === "string" ? x.replace(/[\u0000-\u001f<>]/g, "").slice(0, max) : "", "txt");
var pair = /* @__PURE__ */ __name((x) => Array.isArray(x) && x.length === 2 ? [num(x[0]), num(x[1])] : null, "pair");
var SIDES = ["home", "away"];
function cleanLeagues(x) {
  const o = obj(x);
  if (o.v !== 1)
    return null;
  return {
    v: 1,
    now: num(o.now),
    total: num(o.total),
    leagues: list(o.leagues, 60).map((v) => {
      const l = obj(v);
      const kind = word(l.kind, KINDS) ?? "open";
      return {
        kind,
        status: word(l.status, STATUSES) ?? "open",
        name: txt(l.name),
        code: kind === "friend" ? txt(l.code, 12).match(/^[A-Z0-9-]+$/i)?.[0] ?? null : null,
        members: num(l.members),
        capacity: num(l.capacity),
        table: list(l.table, 12).map((r) => {
          const e = obj(r);
          return { club: txt(e.club, 24), ...pick(e, ["played", "wins", "losses", "gf", "ga", "points", "assistant"]) };
        }),
        rounds: list(l.rounds, 12).map((r) => {
          const e = obj(r);
          return { index: num(e.index), at: num(e.at), bye: e.bye ? txt(e.bye, 24) : null, matches: list(e.matches, 8).map((m) => {
            const g = obj(m);
            const res = g.result ? obj(g.result) : null;
            return { home: txt(g.home, 24), away: txt(g.away, 24), started: g.started === true, result: res ? { score: pair(res.score) ?? [0, 0], shootout: pair(res.shootout), winner: word(res.winner, SIDES), technical: word(res.technical, SIDES), homeAssistant: res.homeAssistant === true, awayAssistant: res.awayAssistant === true } : null };
          }) };
        })
      };
    })
  };
}
__name(cleanLeagues, "cleanLeagues");
async function weekendLeaguesOf(env) {
  if (!env.WEEKEND || !env.WEEKEND_STATS_SECRET)
    return null;
  let timer;
  const late = new Promise((r) => {
    timer = setTimeout(() => r("late"), 2500);
  });
  try {
    const res = await Promise.race([env.WEEKEND.fetch(new Request("https://beapro-weekend/internal/leagues", { headers: { "x-stats-secret": env.WEEKEND_STATS_SECRET } })), late]);
    if (res === "late" || !res.ok)
      return null;
    return cleanLeagues(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
__name(weekendLeaguesOf, "weekendLeaguesOf");

// src/index.ts
var STEPS = [
  "open",
  "title",
  "career_new",
  "manager",
  "club",
  "archetype",
  "signing",
  "friends",
  "squad",
  "market",
  "season",
  "match1_start",
  "match1_half",
  "round_1",
  "round_3",
  "round_7",
  "season_end",
  "season_2"
];
var KNOWN = new Set(STEPS);
var MILESTONE = /^(t[1-5]s([1-9]|1[0-9]|20)|w[1-5]|money_red|money_sack|eu_in|eu_final|eu_won|eu2_in|eu2_final|eu2_won|cup_in|cup_sf|cup_final|cup_won|gift10|share_tap|ob_(prologue|goal5|choice_bench|choice_bottle|skip|stills|fired|call|city|named_self|kickoff|match1_end|names|names_skip|kit|arch|sponsor|market)|daily_1|daily_7|daily_30)$/;
var REACH_SQL = {
  /** how many people were in each division in each season */
  grid: "SELECT CAST(substr(step, 2, 1) AS INTEGER) AS tier, CAST(substr(step, 4) AS INTEGER) AS season, COUNT(*) AS n FROM steps WHERE step GLOB 't[1-5]s*' GROUP BY tier, season ORDER BY tier, season",
  /** people who have ever been in each division */
  ever: "SELECT CAST(substr(step, 2, 1) AS INTEGER) AS tier, COUNT(DISTINCT aid) AS n FROM steps WHERE step GLOB 't[1-5]s*' GROUP BY tier ORDER BY tier",
  /** the highest division each person has reached, counted by division */
  best: "SELECT t AS tier, COUNT(*) AS n FROM (SELECT aid, MAX(CAST(substr(step, 2, 1) AS INTEGER)) AS t FROM steps WHERE step GLOB 't[1-5]s*' GROUP BY aid) GROUP BY t ORDER BY t",
  /** the furthest season each person has reached, counted by season */
  seasons: "SELECT s AS season, COUNT(*) AS n FROM (SELECT aid, MAX(CAST(substr(step, 4) AS INTEGER)) AS s FROM steps WHERE step GLOB 't[1-5]s*' GROUP BY aid) GROUP BY s ORDER BY s",
  /** people who have won each division */
  titles: "SELECT CAST(substr(step, 2, 1) AS INTEGER) AS tier, COUNT(*) AS n FROM steps WHERE step GLOB 'w[1-5]' GROUP BY tier ORDER BY tier",
  /** people drawn into the European cup, people who stood in its final, people who lifted it: one row per mark */
  europe: "SELECT step, COUNT(*) AS n FROM steps WHERE step IN ('eu_in', 'eu_final', 'eu_won') GROUP BY step ORDER BY step",
  summit: "SELECT step, COUNT(*) AS n FROM steps WHERE step IN ('eu2_in', 'eu2_final', 'eu2_won') GROUP BY step ORDER BY step",
  /** people past ten seasons who signed the loyalty gift */
  gift: "SELECT COUNT(*) AS n FROM steps WHERE step = 'gift10'",
  /** devices that ever sent a big moment to a friend */
  share: "SELECT COUNT(*) AS n FROM steps WHERE step = 'share_tap'",
  /** devices that took a first daily gift, reached a full week, reached thirty days: one row per mark */
  daily: "SELECT step, COUNT(*) AS n FROM steps WHERE step IN ('daily_1', 'daily_7', 'daily_30') GROUP BY step ORDER BY step"
};
var ERROR_NAMES = /* @__PURE__ */ new Set(["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "other"]);
var MAX_BATCH = 120;
var MAX_ID = 40;
function cors(origin) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    // authorization: the owner's dashboard (/ops/) sends its key in a header, so it never sits in a URL or a log
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400"
  };
}
__name(cors, "cors");
var json = /* @__PURE__ */ __name((body, status, origin, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...cors(origin), ...extra }
}), "json");
var PRIVATE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" };
function today(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}
__name(today, "today");
function clean(e, now) {
  const aid = typeof e.a === "string" ? e.a.slice(0, MAX_ID) : "";
  const sid = typeof e.s === "string" ? e.s.slice(0, MAX_ID) : "";
  const step = typeof e.k === "string" ? e.k : "";
  if (!aid || !sid || !(KNOWN.has(step) || MILESTONE.test(step) || step === "crash"))
    return null;
  const where = typeof e.w === "string" && (KNOWN.has(e.w) || e.w === "none") ? e.w : "none";
  const err = typeof e.n === "string" && ERROR_NAMES.has(e.n) ? e.n : "other";
  const raw = typeof e.t === "number" && Number.isFinite(e.t) ? e.t : now;
  const ts = raw > now || now - raw > 1e3 * 60 * 60 * 24 * 30 ? now : Math.round(raw);
  return { aid, sid, step, ts, where, err };
}
__name(clean, "clean");
var src_default = {
  /** once a day (wrangler.toml [triggers]): rows older than RETAIN_MS are deleted */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(purgeOld(env.DB, Date.now()));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(origin) });
    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/e")) {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ ok: false }, 400, origin);
      }
      const list2 = Array.isArray(body?.e) ? body.e.slice(0, MAX_BATCH) : [];
      const now = Date.now();
      const rows = list2.map((e) => clean(e, now)).filter((x) => x !== null);
      if (!rows.length)
        return json({ ok: true, n: 0 }, 200, origin);
      const stmts = [
        // a step counts once per device, whatever the network did
        ...rows.filter((r) => r.step !== "crash").map((r) => env.DB.prepare("INSERT OR IGNORE INTO steps (aid, step, ts, day) VALUES (?, ?, ?, ?)").bind(r.aid, r.step, r.ts, today(r.ts))),
        // a crash is not deduped: three crashes matter more than one
        ...rows.filter((r) => r.step === "crash").map((r) => env.DB.prepare("INSERT INTO crashes (aid, sid, ts, day, where_step, err) VALUES (?, ?, ?, ?, ?, ?)").bind(r.aid, r.sid, r.ts, today(r.ts), r.where, r.err)),
        // a sitting counts once, and only an open starts one
        ...rows.filter((r) => r.step === "open").map((r) => env.DB.prepare("INSERT OR IGNORE INTO sessions (sid, aid, ts, day) VALUES (?, ?, ?, ?)").bind(r.sid, r.aid, r.ts, today(r.ts)))
      ];
      try {
        await env.DB.batch(stmts);
      } catch {
        return json({ ok: false }, 500, origin);
      }
      return json({ ok: true, n: rows.length }, 200, origin);
    }
    if (req.method === "GET" && url.pathname === "/stats") {
      const key = keyOf(req, url);
      if (!env.ADMIN_KEY || !safeEqual(key, env.ADMIN_KEY)) {
        return json({ ok: false }, 401, origin, PRIVATE);
      }
      const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
      const since = today(Date.now() - days * 864e5);
      const [ext, wk, wkl, funnel, totals, daily, returning, crashes, grid, ever, best, seasons, titles, europe, gift, share, dailyGift, summitRows] = await Promise.all([
        statsExt(env.DB, Date.now(), Number.isFinite(days) ? Math.round(days) : 30),
        // the weekend league's counts from beapro-weekend (weekendProxy.ts); null, with why, when it is not wired or slow
        weekendOf(env),
        weekendLeaguesOf(env),
        // draft 4.11: per-league tables and results (null when not wired)
        env.DB.prepare("SELECT step, COUNT(*) AS n FROM steps GROUP BY step").all(),
        env.DB.prepare(
          "SELECT (SELECT COUNT(DISTINCT aid) FROM sessions) AS people, (SELECT COUNT(*) FROM sessions) AS sittings"
        ).all(),
        env.DB.prepare(
          "SELECT day, COUNT(DISTINCT aid) AS people, COUNT(*) AS sittings FROM sessions WHERE day >= ? GROUP BY day ORDER BY day"
        ).bind(since).all(),
        // people who opened it on more than one day, which is the only
        // retention number worth reading this early
        env.DB.prepare(
          "SELECT COUNT(*) AS n FROM (SELECT aid FROM sessions GROUP BY aid HAVING COUNT(DISTINCT day) > 1)"
        ).all(),
        // where it broke, and on how many different phones, which is the
        // difference between one unlucky device and a real fault
        env.DB.prepare(
          "SELECT where_step AS step, err, COUNT(*) AS n, COUNT(DISTINCT aid) AS people FROM crashes GROUP BY where_step, err ORDER BY n DESC LIMIT 12"
        ).all(),
        env.DB.prepare(REACH_SQL.grid).all(),
        env.DB.prepare(REACH_SQL.ever).all(),
        env.DB.prepare(REACH_SQL.best).all(),
        env.DB.prepare(REACH_SQL.seasons).all(),
        env.DB.prepare(REACH_SQL.titles).all(),
        env.DB.prepare(REACH_SQL.europe).all(),
        env.DB.prepare(REACH_SQL.gift).all(),
        env.DB.prepare(REACH_SQL.share).all(),
        env.DB.prepare(REACH_SQL.daily).all(),
        env.DB.prepare(REACH_SQL.summit).all()
      ]);
      const counts = {};
      for (const r of funnel.results)
        counts[r.step] = r.n;
      return json({
        ok: true,
        steps: STEPS,
        funnel: STEPS.map((s) => ({ step: s, n: counts[s] ?? 0 })),
        people: totals.results[0]?.people ?? 0,
        sittings: totals.results[0]?.sittings ?? 0,
        returned: returning.results[0]?.n ?? 0,
        daily: daily.results,
        crashes: crashes.results,
        // where careers get to, from the milestones: empty until the game that reports them is out
        reach: { grid: grid.results, ever: ever.results, best: best.results, seasons: seasons.results, titles: titles.results, europe: europe.results, summit: summitRows.results, gift: gift.results, share: share.results, daily: dailyGift.results },
        // for the dashboard at /ops/ (src/ops/model.ts); an older reader ignores it
        ext: { ...ext, weekend: wk.weekend, weekendErr: wk.weekendErr, weekendLeagues: wkl }
      }, 200, origin, PRIVATE);
    }
    return json({ ok: false }, 404, origin);
  }
};
function safeEqual(a, b) {
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(safeEqual, "safeEqual");
export {
  REACH_SQL,
  src_default as default
};
//# sourceMappingURL=index.js.map
