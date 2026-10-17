/**
 * A match between two managers (the weekend league, Itzik, 17.10).
 *
 * The live engine of the career is written for one manager against the
 * computer: his attacks become his attacking moments, their attacks become his
 * defensive moments. Here both touchlines are people, so the engine is run from
 * alternating perspectives, one minute as the home manager and the next as the
 * away manager. Each side's chances then fall half to its own attacking moments
 * (penalty, shot, one on one, free kick) and half to the other side's defensive
 * moments (keeper, tackle, penalty against), which is the same count of
 * decisions and the same goal rate the career is tuned on, only shared between
 * two people. A penalty is the one moment both decide: the taker's manager
 * picks the corner and the keeper's manager picks the dive.
 *
 * This file is the whole of the server's truth. It knows nothing of HTTP,
 * storage or screens: a Duel is advanced with a clock in milliseconds, asked
 * for a view from one side, and handed choices. The Durable Object in
 * worker/src/weekend.ts wraps it; scripts/duel-check.mts walks it with two
 * simulated managers and proves the same inputs give the same match.
 *
 * The clock is the server's. A minute of football is MINUTE_MS; a moment
 * freezes the clock for both sides until the decider chose or DECISION_MS ran
 * out, when the assistant chooses for him; half time is a fixed HALF_MS.
 * Nothing waits for a client: a manager who is not there is played by his
 * assistant, and one who comes back sees exactly what happened.
 */

import * as L from './liveMatch.ts';
import type { Corner, LiveState, LiveEvent, Moment, MomentKind, SimpleTactic } from './liveMatch.ts';
import type { Player } from '../engine/matchEngine.ts';
import { createRng } from '../engine/matchEngine.ts';
import { fillFormation, formation } from '../data/formations.ts';

export const MINUTE_MS = 3_000;
export const DECISION_MS = 12_000;
export const HALF_MS = 8_000;
/** the engine this duel was played with; a league pins it, a client that differs is told */
export const DUEL_ENGINE = 1;

export type Who = 'home' | 'away';
export const other = (w: Who): Who => (w === 'home' ? 'away' : 'home');

export interface DuelSideInput {
  id: string;
  name: string;
  starters: Player[];
  bench: Player[];
  tactic: SimpleTactic;
}

export interface DuelInput {
  seed: number;
  home: DuelSideInput;
  away: DuelSideInput;
  /** the division the traits are read at; the weekend plays at the top */
  tier?: number;
  /** a faster clock, for a smoke run only; the league never sets it */
  clock?: Partial<Clock>;
}

export interface Clock { minuteMs: number; decisionMs: number; halfMs: number }
export const DEFAULT_CLOCK: Clock = { minuteMs: MINUTE_MS, decisionMs: DECISION_MS, halfMs: HALF_MS };

/** who decides what in the moment that is open now */
export interface Decision {
  kind: MomentKind;
  minute: number;
  /** the engine's perspective when the moment was raised: whose attack or defence it is */
  perspective: Who;
  /** the managers asked, in order: the first is the perspective's manager */
  deciders: Who[];
  /** the clock when it froze, ms */
  frozenAt: number;
  deadlineAt: number;
  choices: Partial<Record<Who, string>>;
}

export interface LogEntry {
  minute: number;
  who: Who;
  kind: MomentKind;
  choice: string;
  /** the assistant chose, because the manager did not in time */
  auto: boolean;
}

export interface Duel {
  st: LiveState;
  /** ms when minute 0 was, on the server's clock */
  startedAt: number;
  /** ms the clock has spent frozen so far (moments and the break), not counting an open freeze */
  frozenMs: number;
  decision: Decision | null;
  /** the break: the clock is frozen until this ms */
  halfUntil: number | null;
  /** the ms the break began, so its length is added to frozenMs when it ends */
  halfFrom: number | null;
  log: LogEntry[];
  done: boolean;
  clock: Clock;
}

/* ------------------------------------------------------------------ build */

/** both sides seated by their own shape, both managers people */
export function createDuel(input: DuelInput, nowMs: number): Duel {
  const st = L.createLive({
    seed: input.seed,
    homeId: input.home.id, homeName: input.home.name,
    awayId: input.away.id, awayName: input.away.name,
    iAmHome: true,
    playerStarters: fillFormation(input.home.starters, formation(input.home.tactic.formation)),
    playerBench: input.home.bench,
    playerTactic: { ...input.home.tactic },
    seated: true,
    oppStarters: input.away.starters, oppBench: input.away.bench,
    moraleBias: 0,
    tier: input.tier ?? 5,
  } as Parameters<typeof L.createLive>[0]);
  // the away side is a manager too: his shape, his seating, his shout
  st.away.isPlayer = true;
  st.away.tactic = { ...input.away.tactic };
  st.away.onPitch = fillFormation(st.away.onPitch, formation(input.away.tactic.formation));
  return { st, startedAt: nowMs, frozenMs: 0, decision: null, halfUntil: null, halfFrom: null, log: [], done: false, clock: { ...DEFAULT_CLOCK, ...(input.clock ?? {}) } };
}

/* ------------------------------------------------------------------ clock */

/** the ms at which the engine's minute m is reached, given what has been frozen so far */
function minuteAt(d: Duel, m: number): number {
  return d.startedAt + d.frozenMs + m * d.clock.minuteMs;
}

/** the minute the clock has reached, when nothing is frozen */
function targetMinute(d: Duel, nowMs: number): number {
  return Math.floor((nowMs - d.startedAt - d.frozenMs) / d.clock.minuteMs);
}

function setPerspective(st: LiveState, who: Who) {
  st.iAmHome = who === 'home';
}

/** the perspective for the minute about to be played: home on odd minutes, away on even */
function perspectiveFor(minute: number): Who {
  return minute % 2 === 1 ? 'home' : 'away';
}

/* ---------------------------------------------------------------- moments */

const CORNERS: Corner[] = ['left', 'center', 'right'];

/** what the moment asks of each manager */
function decidersOf(kind: MomentKind, perspective: Who): Who[] {
  // a penalty, at either end, is both managers' moment
  if (kind === 'penalty' || kind === 'def_penalty') return [perspective, other(perspective)];
  return [perspective];
}

function openDecision(d: Duel, m: Moment, perspective: Who) {
  const frozenAt = minuteAt(d, d.st.minute);
  d.decision = {
    kind: m.kind, minute: m.minute, perspective,
    deciders: decidersOf(m.kind, perspective),
    frozenAt, deadlineAt: frozenAt + d.clock.decisionMs, choices: {},
  };
}

/** the assistant's choice when a manager did not make one: deterministic off the match, never random on the server */
export function assistantChoice(d: Duel, who: Who): string {
  const dec = d.decision!;
  const r = createRng(d.st.seed + dec.minute * 7919 + (who === 'home' ? 11 : 13))();
  const m = d.st.pending!;
  if (dec.kind === 'tactic') return 'balanced';
  if (m.options && dec.deciders[0] === who) return m.options[Math.floor(r * m.options.length)].id;
  return CORNERS[Math.floor(r * 3)];
}

function resolveDecision(d: Duel) {
  const dec = d.decision!;
  const st = d.st;
  setPerspective(st, dec.perspective);
  const mine = dec.choices[dec.deciders[0]]!;
  const theirs = dec.deciders[1] ? dec.choices[dec.deciders[1]]! : undefined;
  switch (dec.kind) {
    case 'penalty': L.resolvePenaltyDuel(st, mine as Corner, theirs as Corner); break;
    case 'def_penalty': L.resolveDefPenaltyDuel(st, mine as Corner, theirs as Corner); break;
    case 'shot': L.resolveShot(st, mine as Corner); break;
    case 'free_kick': L.resolveFreeKick(st, mine as Corner); break;
    case 'one_on_one': L.resolveOneOnOne(st, mine); break;
    case 'def_keeper': L.resolveDefKeeper(st, mine); break;
    case 'def_tackle': L.resolveDefTackle(st, mine); break;
    case 'tactic': L.resolveTactic(st, mine); break;
  }
  d.decision = null;
}

/** a choice is a corner for a corner moment and an option id for the rest; anything else is refused */
export function validChoice(d: Duel, who: Who, choice: string): boolean {
  const dec = d.decision;
  if (!dec || !dec.deciders.includes(who) || dec.choices[who] !== undefined) return false;
  const m = d.st.pending!;
  const cornerKinds: MomentKind[] = ['penalty', 'def_penalty', 'shot', 'free_kick'];
  if (cornerKinds.includes(dec.kind)) return CORNERS.includes(choice as Corner);
  return !!m.options?.some(o => o.id === choice);
}

/* ------------------------------------------------------------------ drive */

/**
 * Bring the match up to the server's clock. Minutes are played until the clock
 * is reached or a moment or the break freezes it; a freeze that has run out is
 * resolved (the assistant for whoever did not choose) and the clock runs on.
 */
export function advance(d: Duel, nowMs: number) {
  const st = d.st;
  for (let guard = 0; guard < 400 && !d.done; guard++) {
    if (d.decision) {
      if (nowMs < d.decision.deadlineAt) return;
      const dec = d.decision;
      for (const w of dec.deciders) if (dec.choices[w] === undefined) {
        dec.choices[w] = assistantChoice(d, w);
        d.log.push({ minute: dec.minute, who: w, kind: dec.kind, choice: dec.choices[w]!, auto: true });
      }
      d.frozenMs += dec.deadlineAt - dec.frozenAt;
      resolveDecision(d);
      continue;
    }
    if (d.halfUntil !== null) {
      if (nowMs < d.halfUntil) return;
      d.frozenMs += d.halfUntil - d.halfFrom!;
      d.halfUntil = null; d.halfFrom = null;
      L.resumeFromHalfTime(st);
      continue;
    }
    if (st.phase === 'done') { d.done = true; return; }
    if (st.minute >= targetMinute(d, nowMs)) return;
    const perspective = perspectiveFor(st.minute + 1);
    setPerspective(st, perspective);
    L.step(st);
    const phase = (st as { phase: LiveState['phase'] }).phase;   // step() may have moved it; read it afresh
    if (phase === 'moment' && st.pending) openDecision(d, st.pending, perspective);
    else if (phase === 'halftime') { d.halfFrom = minuteAt(d, st.minute); d.halfUntil = d.halfFrom + d.clock.halfMs; }
    else if (phase === 'done') d.done = true;
  }
}

/** a manager's choice, if it is his to make right now; the clock runs on when every decider has chosen */
export function choose(d: Duel, who: Who, choice: string, nowMs: number): boolean {
  advance(d, nowMs);
  if (!validChoice(d, who, choice)) return false;
  const dec = d.decision!;
  dec.choices[who] = choice;
  d.log.push({ minute: dec.minute, who, kind: dec.kind, choice, auto: false });
  if (dec.deciders.every(w => dec.choices[w] !== undefined)) {
    d.frozenMs += Math.max(0, Math.min(nowMs, dec.deadlineAt) - dec.frozenAt);
    resolveDecision(d);
    advance(d, nowMs);
  }
  return true;
}

/* ------------------------------------------------------------------- view */

export interface DecisionView {
  kind: MomentKind;
  minute: number;
  title: string;
  subtitle: string;
  shooterName?: string;
  options?: { id: string; label: string; hint?: string }[];
  /** corner moments ask for one of these */
  corners?: Corner[];
  deadlineAt: number;
  /** what this side is asked: the attack (its own moment) or the dive against a penalty */
  role: 'own' | 'dive' | 'aim';
}

export interface DuelView {
  engine: number;
  minute: number;
  phase: LiveState['phase'];
  score: [number, number];
  home: string;
  away: string;
  /** events from index `since` on, and the index to ask from next time */
  events: LiveEvent[];
  next: number;
  /** my decision, when it is mine to make now */
  decision: DecisionView | null;
  /** the other manager is deciding: who and until when */
  waiting: { who: Who; deadlineAt: number } | null;
  halfUntil: number | null;
  done: boolean;
  /** the clock as the server sees it, so a client can place the countdowns */
  now: number;
}

export function view(d: Duel, who: Who, since: number, nowMs: number): DuelView {
  advance(d, nowMs);
  const st = d.st;
  const dec = d.decision;
  let decision: DecisionView | null = null;
  let waiting: DuelView['waiting'] = null;
  if (dec) {
    const m = st.pending!;
    const asked = dec.deciders.includes(who) && dec.choices[who] === undefined;
    if (asked) {
      const own = dec.deciders[0] === who;
      const role: DecisionView['role'] = own ? 'own' : dec.kind === 'penalty' ? 'dive' : 'aim';
      const cornerKinds: MomentKind[] = ['penalty', 'def_penalty', 'shot', 'free_kick'];
      decision = {
        kind: dec.kind, minute: dec.minute,
        title: own ? m.title : dec.kind === 'penalty' ? 'פנדל נגדנו!' : 'פנדל לנו!',
        subtitle: own ? m.subtitle : dec.kind === 'penalty' ? `${m.shooterName} על הכדור. לאן השוער שלך קופץ?` : `${m.shooterName} מניח את הכדור. לאן הוא בועט?`,
        shooterName: m.shooterName,
        options: own ? m.options : undefined,
        corners: cornerKinds.includes(dec.kind) ? CORNERS : undefined,
        deadlineAt: dec.deadlineAt, role,
      };
    } else {
      const pendingWho = dec.deciders.find(w => dec.choices[w] === undefined) ?? dec.deciders[0];
      waiting = { who: pendingWho, deadlineAt: dec.deadlineAt };
    }
  }
  const from = Math.max(0, Math.min(since, st.events.length));
  return {
    engine: DUEL_ENGINE,
    minute: st.minute, phase: st.phase, score: [st.score[0], st.score[1]],
    home: st.home.name, away: st.away.name,
    events: st.events.slice(from), next: st.events.length,
    decision, waiting, halfUntil: d.halfUntil, done: d.done, now: nowMs,
  };
}

/* ---------------------------------------------------------------- storage */

/** JSON that survives a Durable Object's eviction: the state's Map goes to pairs and back */
export function serialize(d: Duel): string {
  const st = d.st as unknown as Record<string, unknown>;
  const { mods, ...rest } = st;
  return JSON.stringify({ ...d, st: { ...rest, mods: [...(mods as Map<string, unknown>).entries()] } });
}

export function deserialize(raw: string): Duel {
  const o = JSON.parse(raw) as Duel & { st: LiveState & { mods: [string, unknown][] } };
  const mods = new Map(o.st.mods as [string, L.LiveState['mods'] extends Map<string, infer V> ? V : never][]);
  const st = { ...o.st, mods } as LiveState;
  // the sides' identity is by reference inside the engine (sideIndex compares to st.home): keep them the same objects
  return { ...o, st };
}

/** the match as a result: who won, on goals, and the log that made it */
export function result(d: Duel): { score: [number, number]; winner: Who | 'draw'; decisions: number; auto: number } {
  const [h, a] = d.st.score;
  return {
    score: [h, a], winner: h > a ? 'home' : a > h ? 'away' : 'draw',
    decisions: d.log.length, auto: d.log.filter(l => l.auto).length,
  };
}
