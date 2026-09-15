/**
 * The career across seasons. This is what turns a fourteen round sprint into a
 * climb from ליגה ג' to the top: the squad comes with you, it ages, kids break
 * out, veterans fade and retire, the division gets harder every promotion.
 *
 * The difficulty ramp is the whole point. leagueCeiling grows by 7 OVR per tier
 * while your squad only grows by whatever you develop or buy, so every
 * promotion is a genuine crisis that forces you into the market.
 */

import type { Club } from '../data/clubs.ts';
import { LEAGUE_C, leagueCeiling } from '../data/clubs.ts';
import { cityClubsForTier, regionClubs } from '../data/cities.ts';
import type { Squad } from '../data/squadGen.ts';
import { makePlayer, makeSquad, nextPlayerId } from '../data/squadGen.ts';
import { majoritySector, sectorForCity } from '../data/names.ts';
import { withLegend } from '../data/legends.ts';
import type { Player, Rng } from '../engine/matchEngine.ts';
import { overall, createRng } from '../engine/matchEngine.ts';

export const TOP_TIER = 5;

/** How a season ended for the manager. */
export type SeasonResult = 'champion' | 'promoted' | 'stayed' | 'relegated';

export interface AgeChange { name: string; from: number; to: number; age: number; }

export interface SeasonReport {
  season: number;
  tier: number;
  position: number;
  result: SeasonResult;
  newTier: number;
  purse: number;
  /** the wage bill charged for the coming season */
  wages: number;
  retired: { name: string; age: number }[];
  risers: AgeChange[];
  fallers: AgeChange[];
  joined: string[];
  /** true when a promotion was earned on the pitch but denied by the ground size */
  promotionBlocked: boolean;
}

/** All the clubs of a division, tier 1 being the one you can pick at the start. */
export function poolForTier(tier: number): Club[] {
  return tier <= 1 ? LEAGUE_C.map(c => ({ ...c })) : cityClubsForTier(tier);
}

/* ------------------------------------------------------------------ aging */

/**
 * Stable 0..1 per player, so the same kid always has the same ceiling.
 *
 * Read off the seed he was born with, salted for each of the things it decides.
 * It used to be read off the id, which is a running counter: generating twelve
 * more men anywhere shifted every id after them and with it the growth of
 * every player born later, and a whole simulated career moved because the
 * winter market got a fresh list. A player from a save older than the seed has
 * none, and keeps reading off his id, so nobody's ceiling moves on load.
 */
export function devFactor(p: Pick<Player, 'id' | 'seed'>, salt = ''): number {
  const key = (p.seed !== undefined ? String(p.seed) : p.id) + salt;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * The level this player can ever reach, hidden from the manager exactly like in
 * real football. Without a ceiling every young player keeps improving forever
 * and after ten seasons the whole league floats far above its own division.
 */
export function potentialOf(p: Player): number {
  return Math.round(45 + devFactor(p, '|pot') * 45);   // 45..90
}

/**
 * The rating this player can realistically still reach, bounded by BOTH his
 * hidden potential and how much road his age leaves him. A teenager can climb
 * a lot, a thirty year old barely moves. Returns the ceiling, at or above his
 * current rating.
 */
export function reachableCeiling(p: Player): number {
  const cur = overall(p);
  const a = effectiveAge(p);
  const room =
    a <= 19 ? 13 :
    a <= 21 ? 10 :
    a <= 23 ? 7 :
    a <= 25 ? 4 :
    a <= 27 ? 2 :
    a <= 29 ? 1 :
    a <= 31 ? 1 :
    0;
  return Math.min(99, Math.max(cur, Math.min(potentialOf(p), cur + room)));
}

/**
 * The soft band shown to the manager, "roughly how high he tops out". A gentle
 * spread around the ceiling so it reads as a scout's estimate, not a promise.
 * Returns null when the player is already at his peak, nothing to show.
 */
export function potentialBand(p: Player): { lo: number; hi: number } | null {
  const cur = overall(p);
  const ceil = reachableCeiling(p);
  if (ceil <= cur) return null;
  const width = 1 + Math.round(devFactor(p, '|band'));   // 1 or 2 wide
  const lo = Math.min(99, Math.max(cur + 1, ceil - width + 1));
  const hi = Math.min(99, Math.max(lo, ceil + 1));
  return { lo, hi };
}

/**
 * Rating points gained or lost this off season. Young players with a good
 * development factor jump, everyone flattens through the peak years, and the
 * over thirties start giving it back. Growth tapers to nothing at potential.
 */
function growth(age: number, f: number, current: number, potential: number): number {
  const raw =
    age <= 20 ? 2 + f * 4 :
    age <= 23 ? 1 + f * 3 :
    age <= 26 ? f * 2 - 0.3 :
    age <= 29 ? f * 1.2 - 0.9 :
    age <= 32 ? -1 - (1 - f) * 1.5 :
    -2 - (1 - f) * 2.5;
  if (raw <= 0) return raw;
  const room = Math.max(0, Math.min(1, (potential - current) / 10));
  return raw * room;
}

/** Legs go first, the brain goes last. */
const DECLINE_BIAS: Record<keyof Player['attrs'], number> = {
  pace: 1.45, physical: 1.2, dribbling: 1.1, shooting: 0.8, defending: 0.8, passing: 0.5,
};

function applyDelta(p: Player, delta: number) {
  const keys = Object.keys(p.attrs) as (keyof Player['attrs'])[];
  for (const k of keys) {
    const d = delta < 0 ? delta * DECLINE_BIAS[k] : delta;
    p.attrs[k] = Math.max(30, Math.min(99, Math.round(p.attrs[k] + d)));
  }
  if (p.gk) {
    for (const k of Object.keys(p.gk) as (keyof NonNullable<Player['gk']>)[]) {
      p.gk[k] = Math.max(30, Math.min(99, Math.round(p.gk[k] + delta)));
    }
  }
}

/** Keepers peak later and last longer, so they age on a shifted curve. */
function effectiveAge(p: Player): number {
  return p.position === 'GK' ? p.age - 3 : p.age;
}

function retires(p: Player, rng: Rng): boolean {
  const a = effectiveAge(p);
  if (a >= 37) return true;
  if (a >= 35) return rng() < 0.55;
  if (a >= 33) return rng() < 0.18 && overall(p) < 60;
  return false;
}

export interface AgeOutcome {
  squad: Squad;
  retired: { name: string; age: number }[];
  risers: AgeChange[];
  fallers: AgeChange[];
  joined: string[];
}

/**
 * Move the whole squad one year on. Returns the new squad plus a report, which
 * is what the end of season screen actually shows the manager.
 */
/** The first outfield man on the bench, or the first man at all when there is none. */
function takeOutfield(bench: Player[]): Player {
  const i = bench.findIndex(p => p.position !== 'GK');
  return bench.splice(i >= 0 ? i : 0, 1)[0];
}

export function ageSquad(
  squad: Squad, rng: Rng, tier: number, minSquad: number,
  /** how much of their potential the young reach under this manager, 1 = neutral */
  youthGrowth = 1,
  /** extra condition a fitness coach brings out of pre season, 0 = neutral */
  fitnessBonus = 0,
): AgeOutcome {
  const retired: { name: string; age: number }[] = [];
  const risers: AgeChange[] = [];
  const fallers: AgeChange[] = [];
  const joined: string[] = [];

  const carry = (list: Player[]): Player[] => {
    const out: Player[] = [];
    for (const src of list) {
      const p: Player = { ...src, attrs: { ...src.attrs }, gk: src.gk ? { ...src.gk } : undefined };
      if (retires(p, rng)) { retired.push({ name: p.name, age: p.age }); continue; }
      const before = overall(p);
      p.age += 1;
      // only improvement is coached, decline happens to everyone alike
      const raw = growth(effectiveAge(p), devFactor(p), before, potentialOf(p));
      applyDelta(p, raw > 0 ? raw * youthGrowth : raw);
      // a fresh pre season resets the body, not the years
      p.fitness = Math.max(60, Math.min(100, 88 + Math.floor(rng() * 12) + fitnessBonus));
      const after = overall(p);
      if (after > before) risers.push({ name: p.name, from: before, to: after, age: p.age });
      else if (after < before) fallers.push({ name: p.name, from: before, to: after, age: p.age });
      out.push(p);
    }
    return out;
  };

  const starters = carry(squad.starters);
  const bench = carry(squad.bench);

  // youth academy fills whatever the years took, and covers any empty role
  const used = new Set([...starters, ...bench].map(p => p.name));
  const sector = majoritySector([...starters, ...bench].map(p => p.name));
  const NEED: Player['position'][] = ['GK', 'CB', 'CM', 'ST', 'RW', 'LB'];
  let guard = 0;
  while (starters.length + bench.length < minSquad && guard++ < 12) {
    const missingGk = !starters.some(p => p.position === 'GK') && !bench.some(p => p.position === 'GK');
    const pos = missingGk ? 'GK' : NEED[guard % NEED.length];
    const kid = makePlayer(pos, leagueCeiling(tier) - 8, rng, undefined, used, sector);
    kid.age = 17 + Math.floor(rng() * 3);
    used.add(kid.name);
    joined.push(kid.name);
    bench.push(kid);
  }

  // a keeper must always be in the eleven, promote one if the old one retired
  if (!starters.some(p => p.position === 'GK')) {
    const bi = bench.findIndex(p => p.position === 'GK');
    if (bi >= 0) {
      const gk = bench[bi];
      bench[bi] = starters[0];
      starters[0] = gk;
    }
  }
  // keep exactly eleven on the field, spill the rest to the bench. The gap a
  // retired outfield man leaves is filled by an outfield man: bench.shift()
  // used to hand it to the reserve keeper, who then stood at centre forward
  // and could not be swapped out, because a keeper only swaps with a keeper
  while (starters.length > 11) bench.push(starters.pop()!);
  while (starters.length < 11 && bench.length) starters.push(takeOutfield(bench));

  return { squad: { starters, bench }, retired, risers, fallers, joined };
}

/**
 * Bring a squad up to the legal minimum with youth, without ageing anyone. Used
 * when the manager sold or let players go over the summer and walked into the
 * season a man short: rather than block the marquee sale, we blood a youngster.
 */
export function fillWithYouth(squad: Squad, rng: Rng, tier: number, minSquad: number): { squad: Squad; joined: string[] } {
  const starters = [...squad.starters];
  const bench = [...squad.bench];
  const used = new Set([...starters, ...bench].map(p => p.name));
  const sector = majoritySector([...starters, ...bench].map(p => p.name));
  const NEED: Player['position'][] = ['GK', 'CB', 'CM', 'ST', 'RW', 'LB'];
  const joined: string[] = [];
  let guard = 0;
  while (starters.length + bench.length < minSquad && guard++ < 12) {
    const missingGk = !starters.some(p => p.position === 'GK') && !bench.some(p => p.position === 'GK');
    const pos = missingGk ? 'GK' : NEED[guard % NEED.length];
    const kid = makePlayer(pos, leagueCeiling(tier) - 8, rng, undefined, used, sector);
    kid.age = 17 + Math.floor(rng() * 3);
    used.add(kid.name);
    joined.push(kid.name);
    bench.push(kid);
  }
  if (!starters.some(p => p.position === 'GK')) {
    const bi = bench.findIndex(p => p.position === 'GK');
    if (bi >= 0) { const gk = bench[bi]; bench[bi] = starters[0]; starters[0] = gk; }
  }
  while (starters.length > 11) bench.push(starters.pop()!);
  while (starters.length < 11 && bench.length) starters.push(takeOutfield(bench));
  return { squad: { starters, bench }, joined };
}

/* ---------------------------------------------------------------- rewards */

/**
 * What a season in this division is worth before placing. The one figure that
 * says how much money a club at this level sees, so anything priced against
 * "a season" reads from here rather than inventing its own scale.
 */
export function purseBase(tier: number): number {
  return [0, 150_000, 200_000, 930_000, 1_800_000, 4_500_000][Math.min(Math.max(1, Math.round(tier)), TOP_TIER)];
}

/** Season payout, it has to grow with the division or promotion bankrupts you. */
export function seasonPurse(tier: number, position: number, teams: number, promoted = false): number {
  // recalibrated down for the weekly-wage economy. Wages are now the dominant,
  // fixed cost, so income is a participation purse that a bad season cannot
  // cover on its own, forcing you to actually run the club.
  const base = purseBase(tier);
  const share = 1 + (teams - position) * 0.12;   // finishing higher pays more
  // going up brings sponsors and television money, which is what funds the
  // rebuild you now urgently need for a division that is a level above you
  const promotionBonus = promoted ? 2 : 1;
  return Math.round(base * share * promotionBonus);
}

/** Per match prize, also scaled by division. Results, not the purse, are what
 *  swing a season from black to red. */
export function matchPrize(tier: number, result: 'W' | 'D' | 'L'): number {
  const mul = [1, 1, 1.9, 3.4, 6, 11][Math.min(tier, TOP_TIER)];
  const base = result === 'W' ? 45_000 : result === 'D' ? 16_000 : 4_000;
  return Math.round(base * mul);
}

/**
 * Weekly wage, driven by the DIVISION first and the player second, because that
 * is how football actually pays: a ליגה ג׳ side is amateur money no matter how
 * good its best player is, while a ליגת העל star is on a different planet. Each
 * tier has a weekly band, and a player sits inside it by how he rates against
 * his league. Kept as clean hundreds so the numbers read like real contracts.
 *
 *   ג׳ / ב׳   up to ~5K
 *   א׳        7–12K
 *   לאומית    12–15K
 *   על        25–100K, the star tax
 */
// The ליגה ג׳ ceiling was five thousand, sized against a squad averaging 52
// from the old pickClub path. The path a player actually takes, pickCity, hands
// a big town a squad averaging 58, and that squad sat near the top of the band:
// ₪38K to ₪54K a week, an untouched first season ending in the red for most of
// them and a sacking for one in six. Four and a half thousand puts an untouched
// first season back around zero, measured in economy-check on that path.
export const WAGE_BAND: Record<number, [number, number]> = {
  1: [200, 4_500],
  2: [400, 5_000],
  3: [7_000, 12_000],
  4: [12_000, 15_000],
  5: [25_000, 100_000],
};

export function playerWage(p: Player, tier: number): number {
  const t = Math.max(1, Math.min(TOP_TIER, Math.round(tier)));
  const [lo, hi] = WAGE_BAND[t];
  const ceiling = leagueCeiling(t);
  // where he sits in the division's rating span, 0 (fringe) .. 1 (star)
  const frac = Math.max(0, Math.min(1, (overall(p) - (ceiling - 10)) / 18));
  // eased so most of a squad sits low and only the best spike, hardest at the top
  const eased = Math.pow(frac, t <= 2 ? 2.8 : t >= 4 ? 2 : 1.4);
  return Math.round((lo + (hi - lo) * eased) / 100) * 100;
}

/** Total weekly wages for a squad in a division. */
export function wageBill(squad: Squad, tier: number): number {
  return [...squad.starters, ...squad.bench].reduce((s, p) => s + playerWage(p, tier), 0);
}

/* ------------------------------------------------------- running the club */

/**
 * What it costs to open the gates every week. Before this a season was pure
 * income and the wage bill landed once, invisibly, in the summer, so money
 * piled up and no decision in the market or in a dilemma ever hurt. Now every
 * round is a financial event: a win roughly keeps you level, a draw bleeds, a
 * defeat bleeds harder. The annual wage total is unchanged, it is simply paid
 * weekly, where the manager can feel it.
 */
export const PITCH_UPKEEP = [0, 4_000, 14_000, 32_000, 62_000, 120_000];
export const SECURITY_HOME = [0, 5_000, 20_000, 46_000, 92_000, 175_000];

export interface RoundCosts {
  wages: number;
  pitch: number;
  security: number;
  total: number;
}

export function roundCosts(input: {
  squad: Squad; tier: number; isHome: boolean; isDerby: boolean; rounds: number;
}): RoundCosts {
  const t = Math.max(0, Math.min(TOP_TIER, input.tier));
  // wages are genuinely weekly now, so a round pays one week of them
  const wages = wageBill(input.squad, t);
  const pitch = PITCH_UPKEEP[t];
  // stewards are only paid when you are the host, and a derby needs more of them
  const security = input.isHome ? Math.round(SECURITY_HOME[t] * (input.isDerby ? 1.8 : 1)) : 0;
  return { wages, pitch, security, total: wages + pitch + security };
}

/* -------------------------------------------------------------- the ground */

/**
 * The stadium. It grows with the club across seasons: money up front, more
 * gate income later, and from ליגה א' up a division simply will not let you in
 * without a ground that meets its minimum. Four photos by size band, so the
 * place you look at actually changes as you climb.
 */
/** A few wooden benches by the touchline, which is exactly where a club starts. */
export const STADIUM_START = 50;

/** Minimum capacity a division demands. Below it you cannot be promoted into it. */
/**
 * The ground a division insists on before it will have you. Set just under what
 * that division actually draws, since a league does not ask for a stadium three
 * times the size of its own crowd: ליגה א׳ turns out about 1,500, so it wants a
 * ground that can hold them, not five thousand empty seats.
 */
const TIER_MIN: Record<number, number> = { 3: 1_200, 4: 3_500, 5: 12_000 };
export function requiredCapacity(tier: number): number {
  return TIER_MIN[tier] ?? 0;
}

/**
 * Which stadium photo fits this capacity. Band 0 is the opening ground you
 * start on, a few old benches you can walk onto, so the very first expansion
 * already changes the place you look at.
 */
export function stadiumImageTier(capacity: number): 0 | 1 | 2 | 3 | 4 {
  return capacity >= 15_000 ? 4 : capacity >= 5_000 ? 3 : capacity >= 1_000 ? 2 : capacity >= 150 ? 1 : 0;
}

/** Ticket price per seat, by division. */
export function ticketPrice(tier: number): number {
  return [0, 14, 22, 34, 52, 80][Math.max(0, Math.min(TOP_TIER, tier))];
}

/**
 * How many people the town will actually turn out for, before the ground is
 * even considered. A ליגה ג׳ club does not draw fourteen thousand because it
 * built fourteen thousand seats, and letting the gate scale with capacity alone
 * turned the stadium into a printing press: careers finished in the bottom
 * division with a 21,000 seat ground and four million in the bank.
 */
const DEMAND = [0, 250, 700, 1_500, 4_500, 16_000];

export function crowdDemand(tier: number, prestige: number): number {
  const t = Math.max(1, Math.min(TOP_TIER, Math.round(tier)));
  return Math.round(DEMAND[t] * (0.6 + Math.max(0, Math.min(100, prestige)) / 125));
}

/**
 * What the shirt sponsor pays for the boards around the pitch, per round.
 *
 * It is paid on SEATS rather than on the crowd, because the advertising is
 * bought for the ground it goes in, not for who turned up that week. That is
 * what gives a stand a second way of repaying itself, and the only reason to
 * build a little ahead of the town's appetite.
 */
const SIGN_RATE = [0, 2.5, 3.5, 5, 7, 10];

export function signageRound(tier: number, capacity: number): number {
  const t = Math.max(1, Math.min(TOP_TIER, Math.round(tier)));
  return Math.round(Math.max(0, capacity) * SIGN_RATE[t]);
}

/** Gate takings for a single home match, on whoever actually came through the turnstile. */
export function gateIncome(attendance: number, tier: number): number {
  return Math.round(Math.max(0, attendance) * ticketPrice(tier));
}

export interface ExpansionOption {
  key: 'expand' | 'stand';
  label: string;
  addSeats: number;
  cost: number;
  rounds: number;
}

const round100 = (n: number) => Math.round(n / 100) * 100;

/**
 * The two building projects on offer, sized and priced to the division. In
 * ליגה ג' this is genuinely small, a hundred seats bolted on or a three hundred
 * seat stand, and it scales up sharply with every promotion so the ground can
 * actually reach what the top divisions demand.
 */
/**
 * What a ground of that division is actually built in, in seats. Sized to real
 * Israeli football rather than to a formula: a ליגה ג׳ club adds a hundred
 * places, a ליגת העל club opens a thirty thousand seat stand.
 */
const EXPAND_SEATS = [0, 100, 500, 1_000, 2_500, 12_000];
const STAND_SEATS = [0, 250, 750, 1_500, 5_000, 30_000];

/**
 * Cost per seat, tuned so a stand repays in roughly four seasons out of the
 * gate and the perimeter boards together, wherever you are. It used to run the
 * other way, ₪900 a seat in ליגה ג׳ against a ₪14 ticket and ₪300 in the
 * לאומית against ₪52, so building took fourteen seasons to repay when you were
 * poor and one when you were already rich.
 */
const SEAT_COST = [0, 400, 600, 900, 1_350, 2_050];

export function expansionOptions(tier: number): ExpansionOption[] {
  const t = Math.max(1, Math.min(TOP_TIER, tier));
  const per = SEAT_COST[t];
  const small = EXPAND_SEATS[t], big = STAND_SEATS[t];
  return [
    { key: 'expand', label: 'הרחבת יציע', addSeats: small, cost: round100(small * per), rounds: 2 },
    { key: 'stand', label: 'יציע חדש', addSeats: big, cost: round100(big * per * 1.08), rounds: 4 },
  ];
}

/* ------------------------------------------------------------ the new year */

export interface NextSeason {
  clubs: Club[];
  /** every squad in the new division, mine included */
  squads: Record<string, Squad>;
  report: Omit<SeasonReport, 'season'>;
  seed: number;
}

/**
 * An AI club doing its summer business. The squad ages like everyone else, then
 * the club goes and replaces its weakest men to get back near the level the
 * division demands. Without this the whole league would rot while only the
 * manager rebuilds, and the ladder would be trivial after three seasons.
 */
function aiOffSeason(squad: Squad, rng: Rng, tier: number, minSquad: number): Squad {
  const aged = ageSquad(squad, rng, tier, minSquad).squad;
  const target = leagueCeiling(tier) - 5 + Math.round(rng() * 8);
  const all = [...aged.starters, ...aged.bench];
  const used = new Set(all.map(p => p.name));
  const sector = majoritySector(all.map(p => p.name));

  // replace the weakest handful when the squad has slipped below the level
  const weakest = [...all].sort((a, b) => overall(a) - overall(b));
  const signings = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < signings; i++) {
    const out = weakest[i];
    if (!out) break;
    if (overall(out) >= target - 2) break;
    const inn = makePlayer(out.position, target, rng, undefined, used, sector);
    used.add(inn.name);
    const si = aged.starters.findIndex(p => p.id === out.id);
    if (si >= 0) aged.starters[si] = inn;
    else {
      const bi = aged.bench.findIndex(p => p.id === out.id);
      if (bi >= 0) aged.bench[bi] = inn;
    }
  }
  return aged;
}

/**
 * Everything that happens between the final whistle of one season and the first
 * whistle of the next: promotion or relegation, the squad a year older, the
 * new division assembled around you.
 */
/**
 * Who you line up against next season.
 *
 * Staying up, a division does NOT get rebuilt: it is the same clubs you spent a
 * year learning, minus the two who went up and the one who went down, plus
 * whoever takes their places. The whole league being replaced every summer was
 * the single thing that stopped a career feeling like a career, and it also
 * dropped ליגה ג׳ back to a pool of invented names, so the real towns you chose
 * at the start simply vanished after one season.
 *
 * Moving division is different: that really is a new set of people, and they
 * come from the same region so the map still means something.
 */
function nextDivision(
  standings: Club[], myClub: Club, newTier: number, oldTier: number,
  teams: number, homeCity: string | undefined, rng: Rng,
): Club[] {
  const want = Math.max(1, teams - 1);
  const pool = (regionPool(newTier, homeCity)).filter(c => c.id !== myClub.id);
  const fresh = (taken: Set<string>) => pool.filter(c => !taken.has(c.id));

  if (newTier !== oldTier) {
    // A different division, so a different set of people, drawn from the
    // region. Said in order rather than left to a shuffle: in the two lowest
    // divisions the region is the same fourteen towns either way, so a plain
    // shuffle of the pool handed back three, four, five of the clubs you had
    // just left, depending on nothing but the draw. The clubs that moved with
    // you come along, and after them every place goes to a stranger before it
    // goes to anyone you already played twice.
    const others = standings.filter(c => c.id !== myClub.id);
    const moved = new Set((newTier > oldTier ? others.slice(0, 2) : others.slice(-1)).map(c => c.id));
    const known = new Set(others.map(c => c.id));
    const companions = pool.filter(c => moved.has(c.id));
    const strangers = shuffled(pool.filter(c => !known.has(c.id)), rng);
    const familiar = shuffled(pool.filter(c => known.has(c.id) && !moved.has(c.id)), rng);
    return [...companions, ...strangers, ...familiar].slice(0, want).map(c => ({ ...c, tier: newTier }));
  }

  // Same division, so it is the same league, and who leaves is decided by where
  // they finished. Two promotion places and one relegation place, counted among
  // the clubs that are not you: if you finished top two and the ground kept you
  // down, that place passes to the next club, which is what actually happens.
  // Nobody is relegated out of the bottom division, there is nowhere to send them.
  const others = standings.filter(c => c.id !== myClub.id);
  const gone = new Set<string>(others.slice(0, 2).map(c => c.id));
  if (newTier > 1 && others.length) gone.add(others[others.length - 1].id);

  const stayed = others
    .filter(c => !gone.has(c.id))
    .map(c => ({ ...c, tier: newTier }));

  // the clubs that just went up or down are not eligible to walk straight back
  // in as their own replacements, which is how a division could "change" by one
  const taken = new Set([myClub.id, ...stayed.map(c => c.id), ...gone]);
  const incoming = shuffled(fresh(taken), rng).slice(0, Math.max(0, want - stayed.length));
  return [...stayed, ...incoming.map(c => ({ ...c, tier: newTier }))].slice(0, want);
}

/**
 * The clubs a division can draw on.
 *
 * Real towns only, whenever a town is known. The invented LEAGUE_C names are a
 * last resort for a career with no city at all, because mixing them in put
 * "הפועל עין סלע" in a division of real places and quietly threw away the whole
 * point of picking where you are from.
 */
function regionPool(tier: number, homeCity?: string): Club[] {
  if (!homeCity) return poolForTier(tier);
  const region = regionClubs(homeCity, tier);
  if (region.length >= 8) return region;
  const seen = new Set(region.map(c => c.id));
  return [...region, ...poolForTier(tier).filter(c => !seen.has(c.id))];
}

function shuffled<T>(xs: T[], rng: Rng): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildNextSeason(input: {
  seasonSeed: number;
  season: number;
  tier: number;
  myClub: Club;
  myClubId: string;
  /** every squad currently in the division, so the world persists */
  squads: Record<string, Squad>;
  /** the clubs that just played the season, in finishing order */
  standings: Club[];
  /** the town the career is rooted in, so a rebuilt division stays regional */
  homeCity?: string;
  /** the manager's own name, so he is never handed himself as a player */
  managerName?: string;
  position: number;
  teams: number;
  minSquad: number;
  /** does the ground meet the division above's minimum, gating promotion */
  stadiumOk: boolean;
  /** manager effect on how much the young improve, 1 = neutral */
  youthGrowth?: number;
  /** extra fitness his conditioning work is worth out of pre season, 0 = neutral */
  fitnessBonus?: number;
}): NextSeason {
  const { tier, position, teams, myClubId } = input;
  const wantsUp = position <= 2 && tier < TOP_TIER;
  // a promotion earned on the pitch is denied if the ground is too small for
  // the division above, whenever that division actually demands one
  const blocked = wantsUp && requiredCapacity(tier + 1) > 0 && !input.stadiumOk;
  const promoted = wantsUp && !blocked;
  const champion = position === 1;
  const relegated = position >= teams && tier > 1;

  const result: SeasonResult = champion ? 'champion' : promoted ? 'promoted' : relegated ? 'relegated' : 'stayed';
  const newTier = Math.max(1, Math.min(TOP_TIER, tier + (promoted ? 1 : 0) - (relegated ? 1 : 0)));

  const seed = input.seasonSeed + input.season * 7919 + 13;
  const rng = createRng(seed);

  const aged = ageSquad(input.squads[myClubId], rng, newTier, input.minSquad,
    input.youthGrowth ?? 1, input.fitnessBonus ?? 0);

  const myClub: Club = { ...input.myClub, tier: newTier };
  const others = nextDivision(input.standings, myClub, newTier, tier, teams, input.homeCity, rng);
  const clubs = [myClub, ...others];

  // Everyone ages, nobody resets. A rival you already know keeps its squad and
  // does its own business, a club you have never met gets a fresh one.
  const squads: Record<string, Squad> = {
    // his own club too: if the man who lived here has finally retired, the next
    // one along comes in, because there is always one of them at ראש העין
    [myClubId]: withLegend(aged.squad, myClub.city, input.managerName, rng, nextPlayerId),
  };
  for (const c of others) {
    const existing = input.squads[c.id];
    squads[c.id] = existing && newTier === tier
      ? aiOffSeason(existing, rng, newTier, input.minSquad)
      : withLegend(
          makeSquad(leagueCeiling(newTier) - 5 + Math.round(rng() * 8), rng, c.traits, sectorForCity(c.city)),
          c.city, input.managerName, rng, nextPlayerId);
  }

  return {
    clubs,
    squads,
    seed,
    report: {
      tier, position, result, newTier,
      purse: seasonPurse(tier, position, teams, promoted),
      wages: wageBill(aged.squad, newTier),
      retired: aged.retired,
      risers: aged.risers.sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 4),
      fallers: aged.fallers.sort((a, b) => (a.to - a.from) - (b.to - b.from)).slice(0, 3),
      joined: aged.joined,
      promotionBlocked: blocked,
    },
  };
}

export { nextPlayerId };
