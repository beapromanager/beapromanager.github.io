/**
 * The youth academy.
 *
 * Players aged 16 to 18 who train at the club and are not in the senior squad.
 * Every season one of them takes a real step forward, so from the second season
 * on the manager feels the academy producing, and when a prospect turns 18 he is
 * offered a senior contract or released. It is the one part of the club that is
 * purely about the future, and building it is how a small club climbs without
 * money.
 *
 * A youth player is just a Player with an age in that band and a hidden ceiling,
 * the same devFactor the senior aging uses, so a kid who looks ordinary at 16
 * can still be the one who breaks out at 18.
 */

import type { Player, Rng, Position } from '../engine/matchEngine.ts';
import { overall } from '../engine/matchEngine.ts';
import { makePlayer } from '../data/squadGen.ts';
import { leagueCeiling } from '../data/clubs.ts';

export interface Youth {
  /** the players currently at the academy, 16 to 18 */
  players: Player[];
  /** who broke out this summer, for the pre season report */
  graduated: string[];
  /** who turned 18 and is waiting on a senior contract or release */
  ready: string[];
}

export function emptyYouth(): Youth {
  return { players: [], graduated: [], ready: [] };
}

const YOUTH_POS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

/**
 * A fresh intake, sized to the club. A stronger club draws better kids, so the
 * academy at the top has a real production line and the one at the bottom a
 * couple of hopefuls. Everything is a level or two under the senior floor,
 * because these are teenagers, not ringers.
 */
export function seedYouth(tier: number, rng: Rng, used: Set<string>, count = 5): Player[] {
  const base = leagueCeiling(tier) - 12;
  const out: Player[] = [];
  for (let i = 0; i < count; i++) {
    const pos = YOUTH_POS[Math.floor(rng() * YOUTH_POS.length)];
    // a spread, so an intake is not five identical kids
    const p = makePlayer(pos, base + Math.round((rng() - 0.4) * 6), rng, undefined, used);
    p.age = 16 + Math.floor(rng() * 2);   // 16 or 17, so most get a year at the academy
    used.add(p.name);
    out.push(p);
  }
  return out;
}

/** Stable 0..1 per player, the same hidden potential the senior aging reads. */
function devFactor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * A summer at the academy.
 *
 * Everyone ages a year. Everyone improves a little, and exactly one prospect
 * improves a lot, the graduation the manager is meant to feel. Anyone who
 * reaches 18 leaves the youth list and joins `ready`, waiting on the manager's
 * call. A thin intake is topped back up so the academy never empties.
 */
export function advanceYouth(
  youth: Youth, tier: number, rng: Rng, used: Set<string>, growth = 1,
  /** kids the manager let train with the seniors: a bigger year for them */
  boosted: Set<string> = new Set(),
): Youth {
  const players = youth.players.map(p => ({ ...p, attrs: { ...p.attrs } }));
  const graduated: string[] = [];
  const ready: string[] = [];

  // the one who breaks out: the youngest-but-promising, weighted by potential
  let starId: string | null = null;
  if (players.length) {
    const under18 = players.filter(p => p.age < 18);
    const pool = under18.length ? under18 : players;
    starId = pool.reduce((a, b) => (devFactor(b.id) > devFactor(a.id) ? b : a)).id;
  }

  for (const p of players) {
    p.age += 1;
    const pot = devFactor(p.id);
    // a normal year is a point or two, a breakout year is a real jump
    const step = (p.id === starId ? 4 + pot * 4 : 0.5 + pot * 1.5) * growth * (boosted.has(p.name) ? 1.8 : 1);
    bump(p, step, rng);
    if (p.id === starId) graduated.push(p.name);
  }

  const staying = players.filter(p => p.age < 18);
  for (const p of players) if (p.age >= 18) ready.push(p.name);

  // keep the academy stocked
  const room = Math.max(0, 5 - staying.length);
  const intake = room > 0 ? seedYouth(tier, rng, used, room) : [];

  return { players: [...staying, ...intake], graduated, ready };
}

/**
 * Raise a player's rating by roughly `pts`, spread across his key attributes.
 * Deterministic: the seeded rng is threaded in, never Math.random, so a season
 * replays identically.
 */
function bump(p: Player, pts: number, rng: Rng): void {
  const before = overall(p);
  const keys = Object.keys(p.attrs) as (keyof typeof p.attrs)[];
  for (const k of keys) {
    p.attrs[k] = Math.min(99, Math.round(p.attrs[k] + pts * (0.6 + rng() * 0.8) * 0.5));
  }
  // guard the direction, in case rounding ate the gain
  if (overall(p) < before) p.attrs[keys[0]] = Math.min(99, p.attrs[keys[0]] + 1);
}
