/**
 * Deterministic football match engine.
 * Pure TypeScript, zero dependencies, no DOM. Runs identically in browser and Node,
 * which is what makes replays, server validation and bug repro possible.
 *
 * Same (seed + squads + tactics) always produces the exact same match.
 *
 * Sanity run (Node 22+ strips the types natively):
 *   node -e "import('./matchEngine.ts').then(m => console.log(m.sanityCheck(A, B, 10000)))"
 */

import { formation, fillFormation, FIT_MULT, roleFit } from '../data/formations.ts';
import type { FormationId } from '../data/formations.ts';

/* ------------------------------------------------------------------ types */

export type Position =
  | 'GK' | 'CB' | 'LB' | 'RB'
  | 'CDM' | 'CM' | 'CAM'
  | 'LW' | 'RW' | 'ST';

export interface Attributes {
  pace: number;       // 40..99
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface GkAttributes {
  diving: number;
  handling: number;
  kicking: number;
  reflexes: number;
  positioning: number;
}

export interface Player {
  id: string;
  /**
   * Who he is, fixed at birth: the hidden potential and the rest of what a
   * player keeps for life hang off this. Absent on players from before it
   * existed, who keep reading those things off their id as they always did.
   */
  seed?: number;
  name: string;          // Hebrew display name
  position: Position;
  attrs: Attributes;
  gk?: GkAttributes;     // required when position === 'GK'
  age: number;
  fitness: number;       // 0..100
  morale: number;        // 0..100
}

/**
 * A number that is this player's for life, taken from what he was born with.
 * Not the id: ids are a running counter, so making twelve more men anywhere
 * in the game shifted every id after them, and with the hidden potential
 * read off the id, the growth of every player born later moved with it. Not
 * a draw from the rng either, which would shift every draw after it. His name
 * and his opening numbers are already random, and they are his.
 */
export function playerSeed(name: string, position: string, age: number, attrs: Attributes): number {
  const key = `${name}|${position}|${age}|${Object.values(attrs).join(',')}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export type Approach = 'defensive' | 'balanced' | 'attacking';
export type Press = 'low' | 'mid' | 'high';

export interface Tactic {
  formation: FormationId;
  approach: Approach;
  press: Press;
}

export interface TeamInput {
  id: string;
  name: string;
  players: Player[];   // exactly 11, first must be the GK
  tactic: Tactic;
  chemistry: number;   // 0..1, see card-system.md
  /**
   * What the manager on the touchline is worth, as multipliers on the attacking
   * and defensive ratings. Optional and neutral by default, so a team without a
   * coach behind it plays exactly as it did before this existed.
   */
  coach?: { att: number; def: number };
  isHome: boolean;
  /**
   * The eleven are already in the formation's slot order, the manager's own
   * placing, and must not be re-seated. Without it the engine seats them by
   * fit, which is what every AI side gets.
   */
  seated?: boolean;
}

export type EventType =
  | 'goal' | 'penalty_goal' | 'penalty_miss' | 'own_goal'
  | 'chance' | 'yellow' | 'red' | 'injury';

export interface MatchEvent {
  minute: number;
  type: EventType;
  teamId: string;
  playerId: string;
  playerName: string;
  /** who laid it on, when a goal came from a pass. Already picked by the
   *  engine for the commentary line, now kept so assists can be counted. */
  assistId?: string;
  assistName?: string;
  /** Hebrew commentary line, ready to render */
  text: string;
}

export interface TeamStats {
  possession: number;  // 0..1
  chances: number;
  goals: number;
  xg: number;
}

export interface MatchResult {
  seed: number;
  home: { id: string; name: string; stats: TeamStats };
  away: { id: string; name: string; stats: TeamStats };
  score: [number, number];
  events: MatchEvent[];
  ratings: Record<string, number>; // playerId -> 4.0..10.0
  /** the shape the manager switched to at half time, when he did, and the score at the whistle */
  shape?: { to: string; atHalf: [number, number] };
}

/* -------------------------------------------------------------------- rng */

/** mulberry32. Small, fast, deterministic. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

function poisson(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function pickWeighted<T>(items: T[], weights: number[], rng: Rng): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ---------------------------------------------------------------- ratings */

const POSITION_WEIGHTS: Record<Exclude<Position, 'GK'>, Attributes> = {
  ST:  { pace: 0.18, shooting: 0.34, passing: 0.10, dribbling: 0.20, defending: 0.02, physical: 0.16 },
  LW:  { pace: 0.24, shooting: 0.22, passing: 0.14, dribbling: 0.30, defending: 0.02, physical: 0.08 },
  RW:  { pace: 0.24, shooting: 0.22, passing: 0.14, dribbling: 0.30, defending: 0.02, physical: 0.08 },
  CAM: { pace: 0.12, shooting: 0.22, passing: 0.28, dribbling: 0.28, defending: 0.04, physical: 0.06 },
  CM:  { pace: 0.10, shooting: 0.14, passing: 0.30, dribbling: 0.22, defending: 0.14, physical: 0.10 },
  CDM: { pace: 0.08, shooting: 0.06, passing: 0.24, dribbling: 0.14, defending: 0.32, physical: 0.16 },
  LB:  { pace: 0.20, shooting: 0.04, passing: 0.18, dribbling: 0.16, defending: 0.30, physical: 0.12 },
  RB:  { pace: 0.20, shooting: 0.04, passing: 0.18, dribbling: 0.16, defending: 0.30, physical: 0.12 },
  CB:  { pace: 0.10, shooting: 0.02, passing: 0.10, dribbling: 0.06, defending: 0.50, physical: 0.22 },
};

export function overall(p: Player): number {
  if (p.position === 'GK') {
    const g = p.gk;
    if (!g) return 50;
    return Math.round(
      g.diving * 0.21 + g.handling * 0.21 + g.kicking * 0.05 +
      g.reflexes * 0.21 + g.positioning * 0.21 + p.attrs.physical * 0.11
    );
  }
  const w = POSITION_WEIGHTS[p.position];
  const a = p.attrs;
  return Math.round(
    a.pace * w.pace + a.shooting * w.shooting + a.passing * w.passing +
    a.dribbling * w.dribbling + a.defending * w.defending + a.physical * w.physical
  );
}

const FORWARDS: Position[] = ['ST', 'LW', 'RW'];
const MIDS: Position[] = ['CAM', 'CM', 'CDM'];

/** what the shape is worth. data/formations.ts is the single source of truth */
const APPROACH_MOD: Record<Approach, { att: number; def: number }> = {
  defensive:  { att: 0.94, def: 1.06 },
  balanced:   { att: 1.00, def: 1.00 },
  attacking:  { att: 1.06, def: 0.94 },
};

const PRESS_MOD: Record<Press, { mid: number; def: number; fatigue: number }> = {
  low:  { mid: 0.97, def: 1.03, fatigue: 0.8 },
  mid:  { mid: 1.00, def: 1.00, fatigue: 1.0 },
  high: { mid: 1.04, def: 0.97, fatigue: 1.3 },
};

export interface TeamRatings { att: number; mid: number; def: number; gk: number }

export function teamRatings(team: TeamInput): TeamRatings {
  // a man is worth what he is worth IN THE SHIRT HE WEARS: the lines are read
  // off the slots, and a man in a shirt that is not his is marked down by
  // FIT_MULT. The AI is seated by fit here; the manager's side comes seated
  const fm = formation(team.tactic.formation);
  const seats = team.seated ? team.players : fillFormation(team.players, fm);
  const eff = (i: number) => {
    const p = seats[i]; const s = fm.slots[i];
    return s ? overall(p) * FIT_MULT[roleFit(p.position, s.role)] : overall(p);
  };
  const lineMean = (line: 'DEF' | 'MID' | 'FWD') => {
    const idx = fm.slots.map((s, i) => (s.line === line && i < seats.length ? i : -1)).filter(i => i >= 0);
    return idx.length ? idx.reduce((sum, i) => sum + eff(i), 0) / idx.length : 55;
  };
  const f = lineMean('FWD');
  const m = lineMean('MID');
  const d = lineMean('DEF');
  const gkSlot = fm.slots.findIndex(s => s.line === 'GK');
  const gk = gkSlot >= 0 && seats[gkSlot] ? eff(gkSlot) : 55;

  const att = (f * 1.00 + m * 0.55 + d * 0.15) / 1.70;
  const mid = (f * 0.25 + m * 1.00 + d * 0.30) / 1.55;
  const def = (f * 0.08 + m * 0.40 + d * 1.00) / 1.48;

  const chem = 0.90 + 0.20 * clamp(team.chemistry, 0, 1);
  const fitness = 0.85 + 0.17 * (avg(team.players.map(p => p.fitness)) / 100);
  const morale = 0.96 + 0.09 * (avg(team.players.map(p => p.morale)) / 100);
  const home = team.isHome ? 1.05 : 1.0;
  const ap = APPROACH_MOD[team.tactic.approach];
  const pr = PRESS_MOD[team.tactic.press];

  const base = chem * fitness * morale * home;
  const cAtt = team.coach?.att ?? 1;
  const cDef = team.coach?.def ?? 1;
  return {
    att: att * base * ap.att * fm.att * cAtt,
    mid: mid * base * pr.mid,
    def: def * base * ap.def * fm.def * pr.def * cDef,
    gk,
  };
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

/* ------------------------------------------------------------ simulation */

const BASE_CHANCES = 4.9;
const SHOOTER_WEIGHT: Record<string, number> = { ST: 0.42, LW: 0.12, RW: 0.12, CAM: 0.12, CM: 0.08, CDM: 0.02, LB: 0.03, RB: 0.03, CB: 0.06, GK: 0 };

export function simulateMatch(home: TeamInput, away: TeamInput, seed: number): MatchResult {
  const rng = createRng(seed);
  const rh = teamRatings(home);
  const ra = teamRatings(away);

  // possession
  let pHome = Math.pow(rh.mid, 1.6) / (Math.pow(rh.mid, 1.6) + Math.pow(ra.mid, 1.6));
  pHome = clamp(pHome, 0.28, 0.72);
  const normHome = (pHome - 0.28) / 0.44;
  const normAway = 1 - normHome;

  const lambdaHome = BASE_CHANCES * Math.pow(rh.att / ra.def, 1.90) * (0.70 + 0.60 * normHome);
  const lambdaAway = BASE_CHANCES * Math.pow(ra.att / rh.def, 1.90) * (0.70 + 0.60 * normAway);

  const events: MatchEvent[] = [];
  const ratings: Record<string, number> = {};
  for (const p of [...home.players, ...away.players]) ratings[p.id] = 6.0;

  const stats = {
    home: { possession: pHome, chances: 0, goals: 0, xg: 0 } as TeamStats,
    away: { possession: 1 - pHome, chances: 0, goals: 0, xg: 0 } as TeamStats,
  };

  playChances(home, away, rh, ra, lambdaHome, rng, events, ratings, stats.home, stats.away);
  playChances(away, home, ra, rh, lambdaAway, rng, events, ratings, stats.away, stats.home);
  playDiscipline(home, rng, events, ratings);
  playDiscipline(away, rng, events, ratings);

  events.sort((a, b) => a.minute - b.minute);

  for (const id of Object.keys(ratings)) ratings[id] = clamp(round1(ratings[id]), 4.0, 10.0);

  return {
    seed,
    home: { id: home.id, name: home.name, stats: stats.home },
    away: { id: away.id, name: away.name, stats: stats.away },
    score: [stats.home.goals, stats.away.goals],
    events,
    ratings,
  };
}

function playChances(
  team: TeamInput, opponent: TeamInput,
  own: TeamRatings, opp: TeamRatings,
  lambda: number, rng: Rng,
  events: MatchEvent[], ratings: Record<string, number>,
  ownStats: TeamStats, oppStats: TeamStats,
) {
  const n = poisson(lambda, rng);
  ownStats.chances = n;
  const outfield = team.players.filter(p => p.position !== 'GK');
  const weights = outfield.map(p => SHOOTER_WEIGHT[p.position] ?? 0.05);
  const oppGk = opponent.players.find(p => p.position === 'GK');

  for (let i = 0; i < n; i++) {
    const minute = drawMinute(rng);
    const shooter = pickWeighted(outfield, weights, rng);
    const qMul = Math.min(1.35, Math.pow(own.att / opp.def, 0.80));
    const q = Math.min(0.90, (0.03 + 0.70 * Math.pow(rng(), 2.2)) * qMul);   // xG of this chance
    ownStats.xg += q;

    const finishing = Math.pow(shooter.attrs.shooting / 75, 0.55);
    const keeping = Math.pow(opp.gk / 75, 0.60);
    const pGoal = clamp(q * finishing / keeping, 0.02, 0.92);

    if (rng() < pGoal) {
      ownStats.goals++;
      ratings[shooter.id] += 1.0;
      if (oppGk) ratings[oppGk.id] -= 0.35;
      const assister = pickAssister(outfield, shooter, rng);
      if (assister) ratings[assister.id] += 0.7;
      events.push({
        minute, type: 'goal', teamId: team.id,
        playerId: shooter.id, playerName: shooter.name,
        assistId: assister?.id, assistName: assister?.name,
        text: assister
          ? `שער! ${shooter.name} קורע את הרשת אחרי מסירה של ${assister.name}`
          : `שער! ${shooter.name} לוקח את זה לבד`,
      });
    } else if (q > 0.35) {
      events.push({
        minute, type: 'chance', teamId: team.id,
        playerId: shooter.id, playerName: shooter.name,
        text: `הזדמנות ענקית ל${shooter.name}, השוער מציל`,
      });
      ratings[shooter.id] -= 0.15;
    }
  }

  // penalties, roughly 0.14 per team per match
  if (rng() < 0.14) {
    const taker = pickWeighted(outfield, weights, rng);
    const minute = drawMinute(rng);
    if (rng() < 0.76) {
      ownStats.goals++;
      ownStats.xg += 0.76;
      ratings[taker.id] += 0.8;
      events.push({
        minute, type: 'penalty_goal', teamId: team.id,
        playerId: taker.id, playerName: taker.name,
        text: `פנדל, ${taker.name} לא מפספס מ-11 מטר`,
      });
    } else {
      ratings[taker.id] -= 1.0;
      events.push({
        minute, type: 'penalty_miss', teamId: team.id,
        playerId: taker.id, playerName: taker.name,
        text: `פנדל מבוזבז, ${taker.name} יזכור את זה הרבה זמן`,
      });
    }
  }
}

function playDiscipline(team: TeamInput, rng: Rng, events: MatchEvent[], ratings: Record<string, number>) {
  const outfield = team.players.filter(p => p.position !== 'GK');
  const yellows = poisson(2.3, rng);
  for (let i = 0; i < yellows; i++) {
    const p = outfield[Math.floor(rng() * outfield.length)];
    ratings[p.id] -= 0.3;
    events.push({
      minute: drawMinute(rng), type: 'yellow', teamId: team.id,
      playerId: p.id, playerName: p.name,
      text: `כרטיס צהוב ל${p.name}`,
    });
  }
  if (rng() < 0.12) {
    const p = outfield[Math.floor(rng() * outfield.length)];
    ratings[p.id] -= 1.5;
    events.push({
      minute: drawMinute(rng), type: 'red', teamId: team.id,
      playerId: p.id, playerName: p.name,
      text: `אדום! ${p.name} משאיר את הקבוצה בעשרה`,
    });
  }
  if (rng() < 0.20) {
    const p = outfield[Math.floor(rng() * outfield.length)];
    events.push({
      minute: drawMinute(rng), type: 'injury', teamId: team.id,
      playerId: p.id, playerName: p.name,
      text: `${p.name} נשאר על הדשא, נראה שזה לא טוב`,
    });
  }
}

/** Later minutes are more likely, exactly like real football. */
function drawMinute(rng: Rng): number {
  let best = 1;
  let bestW = -1;
  for (let i = 0; i < 3; i++) {
    const m = 1 + Math.floor(rng() * 90);
    const w = (0.75 + 0.5 * (m / 90)) * rng();
    if (w > bestW) { bestW = w; best = m; }
  }
  return best;
}

function pickAssister(outfield: Player[], scorer: Player, rng: Rng): Player | null {
  if (rng() < 0.28) return null; // solo goal
  const candidates = outfield.filter(p => p.id !== scorer.id);
  const w = candidates.map(p => (MIDS.includes(p.position) ? 0.5 : FORWARDS.includes(p.position) ? 0.35 : 0.15));
  return pickWeighted(candidates, w, rng);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* -------------------------------------------------------- sanity harness */

/**
 * Run N matches between two identical squads and report the distribution.
 * Targets (see references/game-design.md):
 *   goalsPerMatch 2.5..2.9, homeWin 42..47%, draw 24..28%, nilNil 7..10%
 */
export function sanityCheck(home: TeamInput, away: TeamInput, n = 10000) {
  let goals = 0, hw = 0, d = 0, nil = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateMatch(home, away, i + 1);
    goals += r.score[0] + r.score[1];
    if (r.score[0] > r.score[1]) hw++;
    else if (r.score[0] === r.score[1]) d++;
    if (r.score[0] === 0 && r.score[1] === 0) nil++;
  }
  return {
    goalsPerMatch: round1(goals / n),
    homeWinPct: round1((hw / n) * 100),
    drawPct: round1((d / n) * 100),
    nilNilPct: round1((nil / n) * 100),
  };
}
