import type { Player, Position, Rng } from '../engine/matchEngine.ts';
import { overall, playerSeed } from '../engine/matchEngine.ts';
import { makeName, squadOrigins, type Origin } from './names.ts';
import type { ClubTraits } from './clubs.ts';

/** Formation slots for a starting XI plus a small bench. */
const XI: Position[] = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'ST', 'LW'];
const BENCH: Position[] = ['GK', 'CB', 'CM', 'ST', 'RW'];

export const NEUTRAL_TRAITS: ClubTraits = { attack: 0, defence: 0, budget: 1, prestige: 30, youth: 0.15 };

const ATTACKING: Position[] = ['ST', 'LW', 'RW', 'CAM'];
const DEFENDING: Position[] = ['CB', 'LB', 'RB', 'CDM', 'GK'];

function attrFor(position: Position, base: number, rng: Rng): Player['attrs'] {
  const j = () => Math.round(base + (rng() * 16 - 8));
  const hi = () => Math.min(99, Math.round(base + 4 + rng() * 8));
  const lo = () => Math.max(35, Math.round(base - 6 - rng() * 8));
  switch (position) {
    case 'ST': return { pace: j(), shooting: hi(), passing: lo(), dribbling: j(), defending: lo(), physical: j() };
    case 'LW': case 'RW': return { pace: hi(), shooting: j(), passing: j(), dribbling: hi(), defending: lo(), physical: lo() };
    case 'CAM': return { pace: j(), shooting: j(), passing: hi(), dribbling: hi(), defending: lo(), physical: lo() };
    case 'CM': return { pace: j(), shooting: j(), passing: hi(), dribbling: j(), defending: j(), physical: j() };
    case 'CDM': return { pace: lo(), shooting: lo(), passing: j(), dribbling: j(), defending: hi(), physical: hi() };
    case 'LB': case 'RB': return { pace: hi(), shooting: lo(), passing: j(), dribbling: j(), defending: hi(), physical: j() };
    case 'CB': return { pace: lo(), shooting: lo(), passing: lo(), dribbling: lo(), defending: hi(), physical: hi() };
    default: return { pace: j(), shooting: j(), passing: j(), dribbling: j(), defending: j(), physical: j() };
  }
}

let counter = 0;
export function nextPlayerId(): string { return `p${counter++}`; }

/**
 * The counter above is module state, so it resets to 0 on a page reload while
 * the ids it minted are persisted in the save. Any player generated after a
 * reload, a pack pull or the next season's market, would then reuse a low id
 * and collide with someone already in the game. On load we prime the counter
 * past every id we can see, so fresh ids are always unique.
 */
export function primePlayerIds(ids: Iterable<string>): void {
  for (const id of ids) {
    const m = /^p(\d+)$/.exec(id);
    if (m) counter = Math.max(counter, Number(m[1]) + 1);
  }
}

export function makePlayer(
  position: Position, base: number, rng: Rng,
  traits: ClubTraits = NEUTRAL_TRAITS,
  usedNames?: Set<string>,
  origin?: Origin,
): Player {
  // club identity shifts the player's level by role
  let lvl = base;
  if (ATTACKING.includes(position)) lvl += traits.attack;
  if (DEFENDING.includes(position)) lvl += traits.defence;

  const isYoung = rng() < traits.youth;
  const age = isYoung ? 17 + Math.floor(rng() * 4) : 22 + Math.floor(rng() * 14);
  // young players are rawer now, that is the trade off for the upside
  if (isYoung) lvl -= 3;

  const attrs = attrFor(position, lvl, rng);
  // round like attrFor does. leagueCeiling is 47.5 + 5.5 * tier, so callers
  // hand us a fractional level on half the divisions, and an unrounded keeper
  // shows up in the UI as 56.35608717286959
  const r = Math.round;
  const gk = position === 'GK'
    ? { diving: r(lvl + 2), handling: r(lvl), kicking: r(lvl - 6), reflexes: r(lvl + 3), positioning: r(lvl) }
    : undefined;

  const name = makeName(rng, origin, usedNames);
  return {
    id: nextPlayerId(),
    seed: playerSeed(name, position, age, attrs),
    name,
    position,
    attrs,
    gk,
    age,
    fitness: 88 + Math.floor(rng() * 12),
    morale: 60 + Math.floor(rng() * 25),
  };
}

export interface Squad {
  starters: Player[];
  bench: Player[];
}

export function makeSquad(
  target: number, rng: Rng, traits: ClubTraits = NEUTRAL_TRAITS,
  sector: Origin = 'jewish',
): Squad {
  const used = new Set<string>();   // every name in a squad is unique
  // the whole squad is one sector, bar at most one player from the other side
  const origins = squadOrigins(sector, XI.length + BENCH.length, rng);
  let k = 0;
  const starters = XI.map(pos => makePlayer(pos, target, rng, traits, used, origins[k++]));
  const bench = BENCH.map(pos => makePlayer(pos, target - 4, rng, traits, used, origins[k++]));
  return { starters, bench };
}

export function squadAvgOvr(squad: Squad): number {
  const xs = squad.starters.map(overall);
  return Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
}

/** Market value in shekels, driven by rating and age. */
export function playerValue(p: Player): number {
  const o = overall(p);
  const ageFactor = p.age <= 21 ? 1.3 : p.age <= 29 ? 1.0 : 0.65;
  const raw = (Math.pow(o, 2.6) / 400) * 1000 * ageFactor;
  return Math.round(raw / 1000) * 1000;
}
