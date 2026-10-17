/**
 * The weekend league on the phone (Itzik, 17.10, WEEKEND.md): the door, the
 * server's doors, what this device keeps, and the words for the clock.
 *
 * The door is shut until the pilot: WEEKEND_LIVE is false, and on a developer's
 * machine ?weekend opens it against the local server. In production the door
 * also needs a server address; without one it stays shut whatever the flag.
 *
 * What this device keeps: the league it is in, the nick it chose, and a prize
 * token it has fetched but not yet put into the career (the career applies it
 * once, by its nonce). Nothing else.
 */

import type { DuelView } from './duel.ts';
import type { Row, MatchResult, Prize, Cycle, CyclePhase } from './weekendCore.ts';
import { DAY_NAME, slotByKey, KICKOFF_KEY, FINAL_KEY } from './weekendCore.ts';
import { deviceId } from './telemetry.ts';
import type { Player } from '../engine/matchEngine.ts';
import type { SimpleTactic } from './liveMatch.ts';

export const WEEKEND_LIVE = false;
/** the pilot server, set at deploy; empty keeps the door shut outside a developer's machine */
const WEEKEND_URL_PROD = '';
function devDoor(): boolean {
  try { return !!import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('weekend'); } catch { return false; }
}
export const WEEKEND_URL: string = (() => {
  try { return (import.meta.env?.VITE_WEEKEND_URL as string | undefined) || (import.meta.env?.DEV ? 'http://127.0.0.1:8788' : WEEKEND_URL_PROD); } catch { return WEEKEND_URL_PROD; }
})();
export const WEEKEND_ON: boolean = (WEEKEND_LIVE || devDoor()) && WEEKEND_URL !== '';

/* ------------------------------------------------------------------ store */

const KEY = 'beapro.weekend.v1';
export interface WeekendLocal {
  leagueId: string | null;
  nick: string;
  /** a prize fetched from the server and not yet in the career */
  pendingPrize: PrizeToken | null;
}
export interface PrizeToken { league: string; device: string; place: number; wageRounds: number; gems: number; finished: boolean; nick: string; leagueName: string; final: number; nonce: string; sig: string }

export function local(): WeekendLocal {
  try { const raw = localStorage.getItem(KEY); if (raw) return { leagueId: null, nick: '', pendingPrize: null, ...JSON.parse(raw) }; } catch { /* fine */ }
  return { leagueId: null, nick: '', pendingPrize: null };
}
export function setLocal(patch: Partial<WeekendLocal>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...local(), ...patch })); } catch { /* fine */ }
}

/* ------------------------------------------------------------------- api */

/** the server's clock against ours, learned from every answer that carries `now` */
let offset = 0;
/** a developer's clock: ?wknow=<ms> shifts this phone and is sent to a DEBUG server, which honours it; production ignores it */
const DEBUG_NOW: number | null = (() => {
  try { if (!import.meta.env?.DEV) return null; const v = new URLSearchParams(location.search).get('wknow'); return v && /^\d+$/.test(v) ? Number(v) : null; } catch { return null; }
})();
if (DEBUG_NOW !== null) offset = DEBUG_NOW - Date.now();
export const serverNow = () => Date.now() + offset;

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function api<T>(path: string, body?: unknown): Promise<T> {
  const dev = deviceId();
  const url = new URL(WEEKEND_URL + path);
  if (!url.searchParams.has('device')) url.searchParams.set('device', dev);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (DEBUG_NOW !== null) headers['x-now'] = String(serverNow());
  const res = await fetch(url.toString(), body === undefined ? { method: 'GET', headers } : { method: 'POST', body: JSON.stringify({ device: dev, ...(body as object) }), headers });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string })?.error ?? `שגיאה ${res.status}`);
  const d = data as { now?: number };
  if (typeof d?.now === 'number' && DEBUG_NOW === null) offset = d.now - Date.now();
  return data as T;
}

export interface MineView { league: string | null; cycle: Cycle; phase: CyclePhase; now: number }
export interface MemberView { nick: string; me: boolean; opener: boolean; ready: boolean }
export interface RoundView { index: number; key: string; at: number; bye: string | null; matches: { home: string; away: string; mine: boolean; matchId: string | null; started: boolean; result: MatchResult | null }[] }
export interface LeagueView {
  id: string; code: string | null; kind: 'friend' | 'open'; name: string; status: 'open' | 'locked' | 'playing' | 'done' | 'cancelled'; opener: boolean;
  cycle: Cycle; phase: CyclePhase; now: number;
  slots: string[]; roundKeys: { key: string; at: number }[];
  members: MemberView[]; capacity: number; min: number;
  rounds: RoundView[];
  current: { index: number; key: string; at: number; readyAt: number; startsAt: number } | null;
  mine: { matchId: string | null; side: 'home' | 'away'; opponent: string; result: MatchResult | null } | null;
  me: { nick: string; squad: Player[] | null; tactic: SimpleTactic; wins: number; losses: number; assistant: number; packs: number; opened: number; fromPacks: string[]; finished: boolean } | null;
  table: Row[];
  prize: Prize | null; claimed: boolean;
  assistantMax: number; packEvery: number;
}
export interface LiveView {
  round: { index: number; key: string; at: number } | null;
  matches: { home: string; away: string; mine: boolean; result: MatchResult | null; live: { minute: number; phase: string; score: [number, number]; shootout: [number, number] | null; done: boolean; deciding: ('home' | 'away')[]; last: { minute: number; text: string; type: string } | null } | null }[];
  table: Row[];
  now: number;
}

export const WeekendApi = {
  mine: () => api<MineView>('/mine'),
  create: (b: { nick: string; name: string; slots: string[]; email?: string }) => api<{ id: string; code: string }>('/league', b),
  join: (b: { nick: string; code: string; email?: string }) => api<{ id: string; code: string }>('/league/join', b),
  open: (b: { nick: string; email?: string }) => api<{ id: string; code: null }>('/league/open', b),
  view: (id: string) => api<LeagueView>(`/league/${id}`),
  live: (id: string) => api<LiveView>(`/league/${id}/live`),
  lineup: (id: string, ids: string[], tactic: SimpleTactic) => api<{ ok: true; squad: Player[]; tactic: SimpleTactic }>(`/league/${id}/lineup`, { ids, tactic }),
  pack: (id: string, position: string) => api<{ ok: true; player: Player; squad: Player[]; packs: number; opened: number }>(`/league/${id}/pack`, { position }),
  ready: (id: string) => api<{ ok: true }>(`/league/${id}/ready`, {}),
  prize: (id: string) => api<{ token: PrizeToken }>(`/league/${id}/prize`, {}),
  match: (matchId: string, since: number) => api<DuelView & { side: 'home' | 'away' }>(`/match/${matchId}?since=${since}`),
  choose: (matchId: string, since: number, choice: string) => api<{ ok: boolean; view: DuelView & { side: 'home' | 'away' } }>(`/match/${matchId}/choice?since=${since}`, { choice }),
};

/* ----------------------------------------------------------------- words */

const IL = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }) : null;
const IL_DATE = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: '2-digit' }) : null;

/** "שישי 12:00" for a slot key; the two fixed rounds by their names */
export function slotLabel(key: string): { day: string; time: string } {
  if (key === KICKOFF_KEY) return { day: 'חמישי', time: '20:00' };
  if (key === FINAL_KEY) return { day: 'ראשון', time: '20:00' };
  const s = slotByKey(key);
  return s ? { day: DAY_NAME[s.day], time: `${String(s.hh).padStart(2, '0')}:00` } : { day: key, time: '' };
}
export function whenLabel(at: number): string { return IL ? IL.format(new Date(at)) : new Date(at).toLocaleString('he-IL'); }
export function dateLabel(at: number): string { return IL_DATE ? IL_DATE.format(new Date(at)) : new Date(at).toLocaleDateString('he-IL'); }

/** hh:mm:ss down to a moment, never below zero; a day or more says the days */
export function countdown(to: number, now = serverNow()): string {
  const s = Math.max(0, Math.floor((to - now) / 1000));
  const d = Math.floor(s / 86_400), h = Math.floor((s % 86_400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d} ${d === 1 ? 'יום' : 'ימים'} ו-${two(h)}:${two(m)}`;
  return `${two(h)}:${two(m)}:${two(sec)}`;
}

export const CORNER_WORDS: Record<string, string> = { left: 'שמאל', center: 'אמצע', right: 'ימין' };
export const POSITION_WORDS: Record<string, string> = { GK: 'שוער', RB: 'מגן ימני', CB: 'בלם', LB: 'מגן שמאלי', CDM: 'קשר אחורי', CM: 'קשר', CAM: 'קשר התקפי', RW: 'קיצוני ימני', LW: 'קיצוני שמאלי', ST: 'חלוץ' };
