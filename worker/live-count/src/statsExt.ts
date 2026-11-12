/**
 * GET /stats helpers for the owner's dashboard (/ops/), kept out of index.ts because the Workers runtime refuses
 * non-handler exports of the entry module (scripts/legal-check.mts holds that). Counts only: no id leaves here.
 */
import type { Env } from './index.ts';

/**
 * The key, from `Authorization: Bearer …` (the dashboard) or `?key=` (the in-game screen of builds before 2.11, kept so
 * an old build still works; it can be dropped once nobody opens one).
 */
export function keyOf(req: Request, url: URL): string {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : (url.searchParams.get('key') ?? '');
}

const HOUR = 3_600_000;
const IL = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
/** an hour since the epoch -> its day and hour on Israel's clock. Israel is always a whole number of hours from UTC. */
function ilOf(hour: number, memo: Map<number, { day: string; h: number }>): { day: string; h: number } {
  let v = memo.get(hour);
  if (!v) {
    const p = Object.fromEntries(IL.formatToParts(new Date(hour * HOUR)).map(x => [x.type, x.value]));
    v = { day: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour) % 24 };
    memo.set(hour, v);
  }
  return v;
}

type ExtDay = { day: string; people: number; sittings: number; fresh: number; steps: Record<string, number> };

/**
 * What the dashboard (/ops/) needs beyond the numbers above, all additive (an old dashboard ignores `ext`):
 *  - marks: every closed name all time (the ob_* opening, the cup, money, ...), divisions and titles excepted
 *    (they are in reach already)
 *  - days: the last `days` days on ISRAEL's clock: people, sittings, people seen for the first time ever, and how many
 *    devices reached each step or mark for the first time that day
 *  - soFar.yesterday: the same for yesterday, up to the hour it is now, so "today against yesterday" is fair at 10:00
 * Counts only: no id leaves this function. Exported so a check can run it on a real SQLite.
 */
export async function statsExt(DB: Env['DB'], now: number, days: number): Promise<Record<string, unknown>> {
  const memo = new Map<number, { day: string; h: number }>();
  const nowHour = Math.floor(now / HOUR);
  const { day: today, h: hourNow } = ilOf(nowHour, memo);
  // a window a day wider than asked, trimmed below to whole Israeli days
  const since = now - (days + 1) * 86_400_000;
  const [marks, stepHours, sessHours, firsts] = await Promise.all([
    DB.prepare("SELECT step, COUNT(*) AS n FROM steps WHERE step NOT GLOB 't[1-5]s*' AND step NOT GLOB 'w[1-5]' GROUP BY step").all(),
    DB.prepare("SELECT step, ts / 3600000 AS hr, COUNT(*) AS n FROM steps WHERE ts >= ? AND step NOT GLOB 't[1-5]s*' AND step NOT GLOB 'w[1-5]' GROUP BY step, hr").bind(since).all(),
    DB.prepare('SELECT aid, ts / 3600000 AS hr FROM sessions WHERE ts >= ?').bind(since).all(),
    DB.prepare('SELECT f / 3600000 AS hr, COUNT(*) AS n FROM (SELECT MIN(ts) AS f FROM sessions GROUP BY aid) WHERE f >= ? GROUP BY hr').bind(since).all(),
  ]);
  const keep: string[] = [];
  { let t = now; for (let i = 0; i < days; i++) { keep.unshift(ilOf(Math.floor(t / HOUR), memo).day); t -= 86_400_000; } }
  // walking back 24h at a time can land twice on one day across a clock change; keep each day once
  const dayList = [...new Set(keep)];
  const yesterday = dayList.length > 1 ? dayList[dayList.length - 2] : '';
  const blank = (): Omit<ExtDay, 'day'> => ({ people: 0, sittings: 0, fresh: 0, steps: {} });
  const by = new Map<string, Omit<ExtDay, 'day'>>(dayList.map(d => [d, blank()]));
  const ySoFar = blank();
  const seen = new Map<string, Set<string>>(), ySeen = new Set<string>();
  const inSoFar = (hr: number) => { const v = ilOf(hr, memo); return v.day === yesterday && v.h <= hourNow; };
  for (const r of stepHours.results as { step: string; hr: number; n: number }[]) {
    const d = by.get(ilOf(r.hr, memo).day); if (!d) continue;
    d.steps[r.step] = (d.steps[r.step] ?? 0) + r.n;
    if (inSoFar(r.hr)) ySoFar.steps[r.step] = (ySoFar.steps[r.step] ?? 0) + r.n;
  }
  for (const r of sessHours.results as { aid: string; hr: number }[]) {
    const day = ilOf(r.hr, memo).day; const d = by.get(day); if (!d) continue;
    d.sittings++;
    let s = seen.get(day); if (!s) seen.set(day, s = new Set()); s.add(r.aid);
    if (inSoFar(r.hr)) { ySoFar.sittings++; ySeen.add(r.aid); }
  }
  for (const [day, s] of seen) by.get(day)!.people = s.size;
  ySoFar.people = ySeen.size;
  for (const r of firsts.results as { hr: number; n: number }[]) {
    const d = by.get(ilOf(r.hr, memo).day); if (!d) continue;
    d.fresh += r.n;
    if (inSoFar(r.hr)) ySoFar.fresh += r.n;
  }
  return {
    v: 1, tz: 'Asia/Jerusalem', now, today,
    marks: marks.results,
    days: dayList.map(d => ({ day: d, ...by.get(d)! })),
    soFar: { yesterday: ySoFar },
    weekend: null,
  };
}
