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
import { devFactor, potentialOf, potentialBand } from './career.ts';

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

/**
 * WHO IS WORTH A SENIOR DEAL.
 *
 * At the moment they turn eighteen most of what an academy makes is not good
 * enough, and a manager who is asked to sign all of them has nothing to decide.
 * One kid in four is a prospect, the rest are not, and the youth coach only
 * recommends a kid who could become at least four points better than the
 * standard of the division: a man for the eleven, not for the bench. Measured on
 * the intake the game used to make, that bar was cleared by three in four in
 * ליגה ג׳ and by half in ליגה א׳, because a ceiling is an absolute number and the
 * divisions are not.
 */
export const PROSPECT_SHARE = 0.32;
/** A prospect's ceiling: at least this far over the division's level. */
export const PROSPECT_ABOVE = 8;
/** Everybody else's: at most this far over it. */
export const OTHERS_AT_MOST = 1;
/** The coach recommends a kid who can reach at least this far over the division's level. */
export const RECOMMEND_ABOVE = 4;

export interface Outlook {
  /** the band the game already calls "can reach", as the manager reads it */
  lo: number;
  hi: number;
  /** the youth coach's word: worth a senior deal, or not */
  recommend: boolean;
}

export function outlook(p: Player, tier: number): Outlook {
  const band = potentialBand(p);
  const now = overall(p);
  const lo = band ? band.lo : now;
  const hi = band ? band.hi : now;
  return { lo, hi, recommend: hi >= leagueCeiling(tier) + RECOMMEND_ABOVE };
}

const YOUTH_POS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

/**
 * A fresh intake, sized to the club. A stronger club draws better kids, so the
 * academy at the top has a real production line and the one at the bottom a
 * couple of hopefuls. Everything is a level or two under the senior floor,
 * because these are teenagers, not ringers.
 */
export function seedYouth(tier: number, rng: Rng, used: Set<string>, count = 5): Player[] {
  const level = leagueCeiling(tier);
  const base = level - 12;
  const out: Player[] = [];
  for (let i = 0; i < count; i++) {
    const pos = YOUTH_POS[Math.floor(rng() * YOUTH_POS.length)];
    // one kid in four is a prospect and the rest are not. A ceiling is read off the
    // seed a player is born with, so it cannot be asked for: kids are drawn until one
    // has the ceiling of the kind this one is meant to be
    const prospect = rng() < PROSPECT_SHARE;
    let p: Player | null = null;
    for (let tries = 0; tries < 400; tries++) {
      // a spread, so an intake is not five identical kids
      const c = makePlayer(pos, base + Math.round((rng() - 0.4) * 6), rng, undefined, new Set(used));
      const pot = potentialOf(c);
      p = c;
      if (prospect ? pot >= level + PROSPECT_ABOVE : pot <= level + OTHERS_AT_MOST) break;
    }
    p!.age = 16 + Math.floor(rng() * 2);   // 16 or 17, so most get a year at the academy
    used.add(p!.name);
    out.push(p!);
  }
  return out;
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
  // Anybody already eighteen when the summer starts was never decided on. The game
  // stops on them every summer, so the only way here is a save or a test that walked
  // past it, and a list that grew by a year of undecided men every summer would be
  // worse than dropping them.
  const players = youth.players.filter(p => p.age < 18).map(p => ({ ...p, attrs: { ...p.attrs } }));
  const graduated: string[] = [];
  const ready: string[] = [];

  // the one who breaks out: the youngest-but-promising, weighted by potential
  let starId: string | null = null;
  if (players.length) {
    const under18 = players.filter(p => p.age < 18);
    const pool = under18.length ? under18 : players;
    starId = pool.reduce((a, b) => (devFactor(b) > devFactor(a) ? b : a)).id;
  }

  for (const p of players) {
    p.age += 1;
    const pot = devFactor(p);
    // a normal year is a point or two, a breakout year is a real jump
    const step = (p.id === starId ? 4 + pot * 4 : 0.5 + pot * 1.5) * growth * (boosted.has(p.name) ? 1.8 : 1);
    bump(p, step, rng);
    if (p.id === starId) graduated.push(p.name);
  }

  const staying = players.filter(p => p.age < 18);
  const grown = players.filter(p => p.age >= 18);
  for (const p of grown) ready.push(p.name);

  // keep the academy stocked
  const room = Math.max(0, 5 - staying.length);
  const intake = room > 0 ? seedYouth(tier, rng, used, room) : [];

  // the eighteen year olds STAY on the list: they used to be dropped here and kept
  // only as a name in `ready` that no screen showed, so the kid who turned eighteen
  // simply vanished and nobody could be given a senior deal. They leave the list
  // when the manager signs them or lets them go.
  return { players: [...staying, ...grown, ...intake], graduated, ready };
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
