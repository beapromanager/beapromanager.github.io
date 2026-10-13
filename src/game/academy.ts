/**
 * Youth academy v2 (Itzik, 13.10): a place to walk into, boys of 16 and 17 from outside, and a potential that opens only
 * with the starts they play.
 *
 * What a boy is. He has a hidden ceiling for life (potMaxOf, read off his seed like every player's). When he arrives
 * part of it is locked: what the manager sees is a range, his rating up to what he can reach NOW (potentialOf), and
 * every start he plays unlocks some of the rest, never past the ceiling. A boy who does not play stays where he is.
 * That is the only way he grows, so the question every round is whether to play him.
 *
 * What it costs (the economist, PIC/sim-money/youth-price.mts): free in ליגה ג׳ and ב׳, a scout's trip in ליגה א׳,
 * and in הליגה הלאומית and ליגת העל a price that rises with the ceiling he really has. The shown range does not give
 * the ceiling away: the price does.
 *
 * The door is shut (YOUTH_V2 false) until it has been measured. One line opens it.
 */

import type { Player, Rng, Position } from '../engine/matchEngine.ts';
import { overall } from '../engine/matchEngine.ts';
import { makePlayer } from '../data/squadGen.ts';
import { leagueCeiling } from '../data/clubs.ts';
import { potMaxOf, potentialOf, devFactor } from './career.ts';
import { scoutReport } from '../data/academyText.ts';

/** On a developer's machine only, ?youth in the address opens the door to look at it. A built game never does. */
function devDoor(): boolean {
  try { return !!import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('youth'); } catch { return false; }
}

/** Whether the new academy is live for players. Shut until Itzik opens it. */
export let YOUTH_V2 = devDoor();

/** For the checks only, which walk the door open and shut: the game never calls it. */
export function setYouthDoorForChecks(open: boolean): void { YOUTH_V2 = open; }

/** Most boys the academy holds, the free and the bought together. */
export const ACADEMY_MAX = 8;
/** The boys on the list at a time, by route: free, a scout's finds, bought. */
export const POOL_SIZE = { free: 4, trip: 2, paid: 6 } as const;
/** The ceiling of the free list, which would otherwise hold a star one draw in eight. */
export const FREE_POT_CAP: Record<number, number> = { 1: 78, 2: 82 };
/** A scout's trip for a boy in ליגה א׳, once a season. */
export const TRIP_FEE = 70_000;
/** The most starts of a season that count toward his potential, and the age past which they stop counting. */
export const STARTS_CAP = 14;
export const UNLOCK_AGE = 22;
/** Boys who can be registered to the match day squad in one round. */
export const CALL_UPS_PER_ROUND = 2;
/** How far above his rating his reachable ceiling begins, a few points, drawn per boy. */
export const OPENING_GAP: [number, number] = [4, 8];
/** The club's own intake each summer when the new academy is on. */
export const OWN_INTAKE = 3;

export type YouthRoute = 'free' | 'trip' | 'paid';

/** How a boy comes to the club in a division. */
export function routeOf(tier: number): YouthRoute {
  return tier <= 2 ? 'free' : tier === 3 ? 'trip' : 'paid';
}

export interface YouthOffer {
  player: Player;
  fee: number;
  /** who found him: the open list, the scout, or the market */
  via: 'free' | 'scout' | 'paid';
}

/**
 * The price of a boy in the paid divisions, by the ceiling he truly has. Floors sit above what an eighteen year old
 * sells for, so nobody can buy and flip.
 */
const PRICE: Record<number, [number, number][]> = {
  4: [[63, 90_000], [71, 105_000], [78, 130_000], [85, 165_000], [99, 200_000]],
  5: [[63, 160_000], [71, 180_000], [78, 270_000], [85, 380_000], [99, 480_000]],
};
export function youthPrice(tier: number, potMax: number): number {
  const table = PRICE[Math.max(4, Math.min(5, Math.round(tier)))];
  // bands: below 63, 63 to 70, 71 to 77, 78 to 84, 85 and up
  const i = potMax < 63 ? 0 : potMax < 71 ? 1 : potMax < 78 ? 2 : potMax < 85 ? 3 : 4;
  return table[i][1];
}

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

/**
 * One boy of 16 or 17 for a division. His ceiling is read off the seed he is born with, so it cannot be asked for: boys
 * are drawn until one fits under the cap, and the locked part is set so he opens a few points above his rating.
 */
export function makeYouthKid(tier: number, rng: Rng, used: Set<string>, season: number, cap = 99): Player {
  const level = leagueCeiling(tier);
  const pos = POSITIONS[Math.floor(rng() * POSITIONS.length)];
  let kid: Player | null = null;
  for (let tries = 0; tries < 400; tries++) {
    const c = makePlayer(pos, level - 12 + Math.round((rng() - 0.4) * 6), rng, undefined, new Set(used));
    kid = c;
    if (potMaxOf(c) <= cap) break;
  }
  const p = kid!;
  p.age = 16 + Math.floor(rng() * 2);
  used.add(p.name);
  const gap = OPENING_GAP[0] + Math.floor(rng() * (OPENING_GAP[1] - OPENING_GAP[0] + 1));
  p.lock0 = Math.max(0, potMaxOf(p) - (overall(p) + gap));
  p.pu = 0;
  p.joined = season;
  return p;
}

/** The list for a division: how many, at what price, found by whom. */
export function drawPool(tier: number, rng: Rng, used: Set<string>, season: number, via: YouthOffer['via']): YouthOffer[] {
  const route = routeOf(tier);
  const n = via === 'scout' ? POOL_SIZE.trip : route === 'paid' ? POOL_SIZE.paid : POOL_SIZE.free;
  const cap = route === 'free' ? FREE_POT_CAP[tier] ?? 99 : 99;
  const out: YouthOffer[] = [];
  for (let i = 0; i < n; i++) {
    const player = makeYouthKid(tier, rng, used, season, cap);
    out.push({ player, via, fee: route === 'paid' ? youthPrice(tier, potMaxOf(player)) : 0 });
  }
  return out;
}

/** This season's starts that count: capped, and not for a man past the age. */
export function startsThatCount(p: Player, apps: number): number {
  if (p.lock0 === undefined || p.age > UNLOCK_AGE) return 0;
  return Math.min(STARTS_CAP, Math.max(0, apps));
}

/** What he can reach right now, with this season's starts already counted. Equal to potentialOf for a man of the old kind. */
export function reachNow(p: Player, apps: number): number {
  if (p.lock0 === undefined) return potentialOf(p);
  return potentialOf({ ...p, pu: (p.pu ?? 0) + startsThatCount(p, apps) });
}

/** The range the manager reads: where he is, and where he can get to now. Never narrower than his own rating. */
export function rangeOf(p: Player, apps: number): { lo: number; hi: number } {
  const lo = overall(p);
  return { lo, hi: Math.max(lo, reachNow(p, apps)) };
}

/** The summer: this season's starts are folded into the potential he carries. Returns a copy. */
export function foldMinutes(p: Player, apps: number): Player {
  const n = startsThatCount(p, apps);
  return n ? { ...p, pu: (p.pu ?? 0) + n } : p;
}

/**
 * A boy from the old academy joins the new rules when the door opens: his ceiling is the one he always had, but it is
 * locked a few points above his rating like every other boy's, and starts open it. Deterministic, off his own seed.
 * Players already in the senior squad are not touched.
 */
export function toNewRules(p: Player): Player {
  if (p.lock0 !== undefined || p.age >= 18) return p;
  const gap = OPENING_GAP[0] + Math.floor(devFactor(p, '|gap') * (OPENING_GAP[1] - OPENING_GAP[0] + 1));
  return { ...p, lock0: Math.max(0, potMaxOf(p) - (overall(p) + gap)), pu: 0 };
}

/** The scout's line about a boy for the list: it hints at what he truly has and gives no number. */
export function reportOf(p: Player, tier: number): string {
  return scoutReport(p.name, p.position, potMaxOf(p), tier);
}
