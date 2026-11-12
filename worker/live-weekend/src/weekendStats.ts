/**
 * The weekend league's numbers for the owner's dashboard (/ops/, the "ליגת סופ"ש" area), kept by the lobby. Counts
 * only: no device, nick, league name, code or id ever leaves through summaryOf, and a league's id is kept in the
 * lobby only as long as the league itself lives (a week after its final), then folded into a cycle's plain totals.
 *
 * How the numbers get here: every league sends the lobby a small board of counts when one of them changes (boardOf,
 * from LeagueDO.save), and the lobby counts the registrations it refuses, why, and who came back from last weekend.
 * A league the lobby has no board for yet (one made before this code was deployed) is asked for one when the summary
 * is read, a few at a time, so the first weekend fills in on its own.
 */
import * as W from '../../src/game/weekendCore.ts';

/** why a registration was refused, from the text the lobby or the league answered */
export const REFUSALS = ['consent', 'closed', 'already', 'full', 'code', 'nick', 'form', 'other'] as const;
export type Refusal = typeof REFUSALS[number];
export function refusalOf(status: number, text: string): Refusal {
  if (text.includes('תנאי השימוש')) return 'consent';
  if (text.includes('כבר בליגה')) return 'already';
  if (text.includes('מלאה')) return 'full';
  if (text.includes('הקוד')) return 'code';
  if (text.includes('כינוי')) return 'nick';
  if (text.includes('ההרשמה') || text.includes('סגורה') || text.includes('נסגרה') || text.includes('נפתחת')) return 'closed';
  if (status === 400) return 'form';
  return 'other';
}

/** one league in counts; `joined` is registrations by Israeli date (yyyy-mm-dd) */
export interface Board {
  opens: number; locks: number; kickoff: number; final: number;
  kind: W.LeagueKind; status: W.LeagueStatus;
  members: number; capacity: number;
  rounds: number; roundsDone: number; matches: number; started: number; done: number;
  assistant: number; technical: number; shootouts: number;
  /** members who played and did not choose in at least half their matches themselves */
  absent: number;
  prizes: number; gems: number; wageRounds: number; claimed: number;
  /** matches the league could not create (it tries again a minute later) */
  fails: number;
  /** when the earliest round still missing a result was due, or null */
  due: number | null;
  joined: Record<string, number>;
}

export const dayKey = (at: number): string => { const p = W.ilParts(at); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };

export function boardOf(l: W.League, claimed: number, fails = 0): Board {
  const results = l.rounds.flatMap(r => r.matches.map(m => m.result)).filter((r): r is W.MatchResult => !!r);
  const played = new Map<string, number>();
  for (const r of l.rounds) for (const m of r.matches) if (m.result) { played.set(m.home, (played.get(m.home) ?? 0) + 1); played.set(m.away, (played.get(m.away) ?? 0) + 1); }
  const joined: Record<string, number> = {};
  for (const m of l.members) { const d = dayKey(m.joined); joined[d] = (joined[d] ?? 0) + 1; }
  const due = l.rounds.find(r => r.matches.some(m => !m.result));
  return {
    opens: l.cycle.opens, locks: l.cycle.locks, kickoff: l.cycle.kickoff, final: l.cycle.final,
    kind: l.kind, status: l.status, members: l.members.length, capacity: W.capacity(l),
    rounds: l.rounds.length, roundsDone: l.rounds.filter(r => r.matches.every(m => m.result)).length,
    matches: l.rounds.reduce((n, r) => n + r.matches.length, 0),
    started: l.rounds.reduce((n, r) => n + r.matches.filter(m => m.matchId).length, 0),
    done: results.length,
    assistant: results.reduce((n, r) => n + (r.homeAssistant ? 1 : 0) + (r.awayAssistant ? 1 : 0), 0),
    technical: results.filter(r => r.technical).length,
    shootouts: results.filter(r => r.shootout).length,
    absent: l.members.filter(m => (played.get(m.device) ?? 0) > 0 && !W.finishedHimself(l, m.device)).length,
    prizes: l.prizes?.length ?? 0, gems: (l.prizes ?? []).reduce((n, p) => n + p.gems, 0),
    wageRounds: (l.prizes ?? []).reduce((n, p) => n + p.wageRounds, 0), claimed, fails,
    due: due ? due.at : null, joined,
  };
}

/** a cycle's plain totals, kept after its leagues' boards are gone */
export interface Totals {
  managers: number; leagues: number; friendLeagues: number; openLeagues: number; cancelled: number; cancelledMembers: number; done: number;
  matches: number; done_matches: number; assistant: number; technical: number; absent: number;
  prizes: number; gems: number; claimed: number; returning: number; refused: number;
  /** registrations by day since registration opened (0 = that day) */
  byDay: number[];
}
export interface CycleRec {
  opens: number; locks: number; kickoff: number; final: number;
  refusals: Partial<Record<Refusal, number>>;
  returning: number;
  /** league id → its board; deleted with the league, a week after the final */
  boards: Record<string, Board>;
  frozen?: Totals;
}
export interface WkStats { since: number; cycles: CycleRec[] }

export const HISTORY = 12;
export const PULL_MAX = 25;
const DAY = 86_400_000;
const STUCK_MS = 2 * 3_600_000;

export function freshStats(now: number): WkStats { return { since: now, cycles: [] }; }

export function cycleRec(st: WkStats, c: { opens: number; locks: number; kickoff: number; final: number }): CycleRec {
  let r = st.cycles.find(x => x.opens === c.opens);
  if (!r) {
    r = { opens: c.opens, locks: c.locks, kickoff: c.kickoff, final: c.final, refusals: {}, returning: 0, boards: {} };
    st.cycles.push(r);
    st.cycles.sort((a, b) => a.opens - b.opens);
    while (st.cycles.length > HISTORY) st.cycles.shift();
  }
  return r;
}

/** a cycle's totals from its boards (or what was frozen of them) */
export function totalsOf(r: CycleRec): Totals {
  if (r.frozen) return r.frozen;
  const b = Object.values(r.boards);
  const sum = (f: (x: Board) => number) => b.reduce((n, x) => n + f(x), 0);
  const byDay: number[] = [];
  const day0 = dayKey(r.opens);
  for (const x of b) for (const [d, n] of Object.entries(x.joined)) {
    const i = Math.max(0, Math.round((Date.parse(d + 'T12:00:00Z') - Date.parse(day0 + 'T12:00:00Z')) / DAY));
    if (i > 14) continue;
    while (byDay.length <= i) byDay.push(0);
    byDay[i] += n;
  }
  const refused = Object.values(r.refusals).reduce((n, v) => n + (v ?? 0), 0);
  return {
    managers: sum(x => x.members), leagues: b.length, friendLeagues: b.filter(x => x.kind === 'friend').length, openLeagues: b.filter(x => x.kind === 'open').length,
    cancelled: b.filter(x => x.status === 'cancelled').length, cancelledMembers: sum(x => x.status === 'cancelled' ? x.members : 0), done: b.filter(x => x.status === 'done').length,
    matches: sum(x => x.matches), done_matches: sum(x => x.done), assistant: sum(x => x.assistant), technical: sum(x => x.technical), absent: sum(x => x.absent),
    prizes: sum(x => x.prizes), gems: sum(x => x.gems), claimed: sum(x => x.claimed), returning: r.returning, refused, byDay,
  };
}

/** boards of leagues that are gone (a week after their final) become plain totals; returns whether anything changed */
export function pruneStats(st: WkStats, now: number): boolean {
  let changed = false;
  for (const r of st.cycles) {
    if (!r.frozen && now >= r.final + W.KEEP_MS) { r.frozen = totalsOf(r); r.boards = {}; changed = true; }
  }
  return changed;
}

export interface LeagueRow { kind: W.LeagueKind; status: W.LeagueStatus; members: number; capacity: number; rounds: number; roundsDone: number; matches: number; done: number; stuck: boolean }

/** what /internal/summary answers: counts and times, nothing that names anyone */
export function summaryOf(st: WkStats, lobby: { devices: number; codes: number; open: { count: number }[]; champions: number }, cycle: W.Cycle, now: number) {
  const cur = st.cycles.find(r => r.opens === cycle.opens) ?? null;
  const t = cur ? totalsOf(cur) : null;
  const boards = cur ? Object.values(cur.boards) : [];
  const rows: LeagueRow[] = boards
    .map(b => ({ kind: b.kind, status: b.status, members: b.members, capacity: b.capacity, rounds: b.rounds, roundsDone: b.roundsDone, matches: b.matches, done: b.done, stuck: b.due !== null && now > b.due + W.READY_MS + STUCK_MS && b.status === 'playing' }))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'friend' ? -1 : 1) || b.members - a.members);
  const day0 = dayKey(cycle.opens);
  const byDay = (t?.byDay ?? []).map((n, i) => ({ day: new Date(Date.parse(day0 + 'T12:00:00Z') + i * DAY).toISOString().slice(0, 10), n }));
  const sum = (f: (x: Board) => number) => boards.reduce((n, x) => n + f(x), 0);
  return {
    v: 2 as const,
    now,
    // v1's fields, so a dashboard of 3.11 still reads this
    phase: W.cyclePhase(cycle, now), opens: cycle.opens, locks: cycle.locks, kickoff: cycle.kickoff, final: cycle.final,
    managers: lobby.devices, friendLeagues: lobby.codes, openLeagues: lobby.open.length,
    openMembers: lobby.open.reduce((n, o) => n + o.count, 0), champions: lobby.champions,
    first: W.isFirstCycle(cycle),
    since: st.since,
    known: boards.length,
    returning: cur?.returning ?? 0,
    byDay,
    leagues: rows,
    fill: {
      full: rows.filter(r => r.members >= r.capacity).length,
      enough: rows.filter(r => r.members >= W.MIN_MEMBERS && r.members < r.capacity).length,
      short: rows.filter(r => r.members < W.MIN_MEMBERS && r.status === 'open').length,
      seats: sum(b => b.status === 'open' ? Math.max(0, b.capacity - b.members) : 0),
    },
    status: { open: rows.filter(r => r.status === 'open').length, locked: rows.filter(r => r.status === 'locked').length, playing: rows.filter(r => r.status === 'playing').length, done: rows.filter(r => r.status === 'done').length, cancelled: rows.filter(r => r.status === 'cancelled').length },
    play: { rounds: sum(b => b.rounds), roundsDone: sum(b => b.roundsDone), matches: sum(b => b.matches), started: sum(b => b.started), done: sum(b => b.done), assistant: sum(b => b.assistant), technical: sum(b => b.technical), shootouts: sum(b => b.shootouts), stuck: rows.filter(r => r.stuck).length },
    drop: { cancelled: t?.cancelled ?? 0, cancelledMembers: t?.cancelledMembers ?? 0, absent: t?.absent ?? 0, technical: t?.technical ?? 0 },
    prizes: { awarded: sum(b => b.prizes), gems: sum(b => b.gems), wageRounds: sum(b => b.wageRounds), claimed: sum(b => b.claimed) },
    refusals: Object.fromEntries(REFUSALS.map(k => [k, cur?.refusals[k] ?? 0])) as Record<Refusal, number>,
    errors: { matchFails: sum(b => b.fails), stuck: rows.filter(r => r.stuck).length },
    history: st.cycles.filter(r => r.opens !== cycle.opens).slice(-8).map(r => { const x = totalsOf(r); return { opens: r.opens, final: r.final, ...x }; }),
  };
}
export type WeekendSummary = ReturnType<typeof summaryOf>;
