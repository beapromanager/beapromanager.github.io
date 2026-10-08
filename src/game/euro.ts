/**
 * ליגת אירופה, the competition itself. Pure: no game state, no React.
 *
 * Itzik's rules of 6.10. A pool of twenty clubs, sixteen drawn each season
 * (the manager always among them), four knockout rounds: the round of
 * sixteen, the quarter and the semi over two legs, the final a single match.
 * No away goals; a tie level after the legs, or a final level after ninety
 * minutes, goes straight to penalties. The opposition gets stronger with
 * every round, the final the hardest, and he plays alongside the league, not
 * instead of it. A red card he picks up here costs a European match only.
 *
 * Everything random takes a seed from the caller, so the state can route it
 * through drawSeed and a reload replays the same evening. The door stays
 * shut until Itzik opens it.
 */

import { createRng } from '../engine/matchEngine.ts';
import { EURO_CLUBS } from '../data/europeClubs.ts';

/** The door. Off until Itzik says the top flight has enough managers in it. */
export const EURO_LIVE = true;

export const EURO_POOL = 20;
export const EURO_FIELD = 16;
/** rounds: 0 last sixteen, 1 quarter, 2 semi, 3 final */
export const EURO_ROUNDS = 4;
export const ROUND_NAMES = ['שמינית הגמר', 'רבע הגמר', 'חצי הגמר', 'הגמר'] as const;
/** the final is one match; everything before it is two legs */
export const legsIn = (round: number): 1 | 2 => (round === EURO_ROUNDS - 1 ? 1 : 2);

/**
 * How strong the other side is, by round, on the makeSquad target scale.
 * Itzik's shape: the last sixteen plays like a ליגת העל side, and every round
 * is harder, the final hardest. The figures are his to change; the check
 * holds them as literals.
 */
export const STAGE_TARGET = [74, 78, 82, 84] as const;
/** each club carries a small fixed edge around its round's target, so the draw matters */
export const CLUB_EDGE = 2;

/** Paid on REACHING the round, nothing for taking part. Index by the round reached; 4 is the trophy. */
export const PRIZE = [0, 300_000, 700_000, 1_300_000, 2_200_000] as const;
export const GATE_SHARE = 0.75;
export const TRAVEL = 150_000;
export const SECURITY = 175_000;

/** Which league rounds the European nights fall before: two legs a round, the final once. */
export function euroWeeks(leagueRounds: number): number[][] | null {
  if (leagueRounds < 14) return null;
  return [[2, 3], [5, 6], [9, 10], [13]];
}

export type EuroStatus = 'on' | 'out' | 'won';

export interface EuroTie {
  /** a hosts the first leg; in the final the ground is neutral */
  a: string;
  b: string;
  /** goals [a, b] per leg, filled as they are played */
  legs: Array<[number, number]>;
  /** the shootout when the legs could not separate them, [a, b] scored */
  pens?: [number, number];
  winner?: string;
}

export interface EuroState {
  level: number;
  season: number;
  /** the sixteen in the draw and their fixed edge around the round's target */
  clubs: Array<{ id: string; edge: number }>;
  /** the five of the twenty who sit this season out (fifteen are drawn beside the manager) */
  rested: string[];
  round: number;
  /** the next leg to play in the current round, 0 or 1 */
  leg: number;
  ties: EuroTie[][];
  status: EuroStatus;
  /** my men banned from the next European match, by matches left */
  bans: Record<string, number>;
  /** every leg the manager has played, for the records and the money */
  played: number;
  /** the draw ceremony watched or skipped; absent on a competition drawn before the screen existed, so it is owed */
  seen?: boolean;
  /** the season ended with his tie still open, so it was closed against him; absent otherwise */
  cut?: boolean;
}

/** The manager's own fixed edge: he is the real squad, the edge is for the others. */
const ME_EDGE = 0;

const shuffle = <T,>(xs: T[], rng: () => number): T[] => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * The draw. The manager and fifteen of the twenty, paired by the seed. The
 * five who miss out are remembered so the next season can prefer them.
 */
export function drawEuro(seed: number, myId: string, season: number, level = 0, preferIn: string[] = []): EuroState {
  const rng = createRng(seed);
  const others = shuffle(EURO_CLUBS.map(c => c.id), rng);
  // the clubs rested last season come first in the queue, the rest in draw order
  const queue = [...preferIn.filter(id => others.includes(id)), ...others.filter(id => !preferIn.includes(id))];
  const field = queue.slice(0, EURO_FIELD - 1);
  const rested = queue.slice(EURO_FIELD - 1);
  const clubs = shuffle([myId, ...field], rng).map(id => ({
    id, edge: id === myId ? ME_EDGE : Math.round((rng() * 2 - 1) * CLUB_EDGE),
  }));
  const ties: EuroTie[] = [];
  for (let i = 0; i < clubs.length; i += 2) ties.push({ a: clubs[i].id, b: clubs[i + 1].id, legs: [] });
  return { level, season, clubs, rested, round: 0, leg: 0, ties: [ties], status: 'on', bans: {}, played: 0 };
}

export const myTie = (e: EuroState, myId: string): EuroTie | undefined =>
  e.ties[e.round]?.find(t => t.a === myId || t.b === myId);

/** The strength a club plays at in the given round. */
export function strengthOf(e: EuroState, id: string, round = e.round): number {
  const edge = e.clubs.find(c => c.id === id)?.edge ?? 0;
  return STAGE_TARGET[Math.min(round, STAGE_TARGET.length - 1)] + edge;
}

function poisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

/** One leg between two AI sides, goals from their strengths; the host gets the home edge. */
export function aiLeg(home: number, away: number, rng: () => number, neutral = false): [number, number] {
  const edge = (a: number, b: number) => Math.pow(1.3, (a - b) / 4);
  const base = 1.35;
  const h = base * edge(home, away) * (neutral ? 1 : 1.12);
  const a = base * edge(away, home) * (neutral ? 1 : 0.9);
  return [poisson(h, rng), poisson(a, rng)];
}

/**
 * The shootout: five each, then sudden death, as kicks [a scored?, b scored?].
 * Returns the kicks in order so a screen can replay them one by one.
 */
export function shootout(rng: () => number, pA = 0.76, pB = 0.76): { kicks: Array<[boolean, boolean]>; score: [number, number] } {
  const kicks: Array<[boolean, boolean]> = [];
  let a = 0, b = 0;
  const decided = (n: number) => {
    const left = Math.max(0, 5 - n);
    return n >= 5 ? a !== b : (a > b + left) || (b > a + left);
  };
  for (let n = 0; n < 30; n++) {
    const ka = rng() < pA; if (ka) a++;
    // b's kick is skipped when a's has already settled it inside the five
    const bNeeded = !(n < 5 && (a > b + (5 - n - 1) || b > a + (5 - n)));
    const kb = bNeeded ? rng() < pB : false; if (kb) b++;
    kicks.push([ka, kb]);
    if (decided(n + 1)) break;
  }
  if (a === b) { a++; kicks.push([true, false]); }   // a thirty kick night still ends
  return { kicks, score: [a, b] };
}

export const aggregate = (t: EuroTie): [number, number] =>
  t.legs.reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]);

/** Settle a tie whose legs are all in: aggregate, or penalties when level. */
export function settleTie(t: EuroTie, rng: () => number): EuroTie {
  const [x, y] = aggregate(t);
  if (x !== y) return { ...t, winner: x > y ? t.a : t.b };
  const s = shootout(rng);
  return { ...t, pens: s.score, winner: s.score[0] > s.score[1] ? t.a : t.b };
}

/**
 * Play every AI tie of the current round to the end, leaving the manager's
 * own tie untouched: his legs are played live and written in by the state.
 */
export function playAiRound(e: EuroState, myId: string, seed: number): EuroState {
  const rng = createRng(seed);
  const round = e.round;
  const legs = legsIn(round);
  const ties = e.ties[round].map(t => {
    if (t.a === myId || t.b === myId) return t;
    if (t.winner) return t;
    const sa = strengthOf(e, t.a, round), sb = strengthOf(e, t.b, round);
    const played: EuroTie = { ...t, legs: [] };
    if (legs === 2) {
      played.legs.push(aiLeg(sa, sb, rng));
      const [y, x] = aiLeg(sb, sa, rng);
      played.legs.push([x, y]);
    } else {
      played.legs.push(aiLeg(sa, sb, rng, true));
    }
    return settleTie(played, rng);
  });
  const next = e.ties.slice();
  next[round] = ties;
  return { ...e, ties: next };
}

/**
 * Write one of the manager's legs in. When the legs are all in and the
 * aggregate is not level the tie has its winner; level, it waits for the
 * shootout, which he takes himself on the screen (needsPens / settleMyPens).
 * Nothing is drawn here: his penalties are never rolled for him.
 */
export function recordMyLeg(e: EuroState, myId: string, goals: [number, number]): EuroState {
  const round = e.round;
  const ties = e.ties[round].map(t => {
    if (t.a !== myId && t.b !== myId) return t;
    // goals arrive as [mine, theirs]; the tie keeps [a, b]
    const leg: [number, number] = t.a === myId ? goals : [goals[1], goals[0]];
    const withLeg: EuroTie = { ...t, legs: [...t.legs, leg] };
    if (withLeg.legs.length < legsIn(round)) return withLeg;
    const [x, y] = aggregate(withLeg);
    return x === y ? withLeg : { ...withLeg, winner: x > y ? withLeg.a : withLeg.b };
  });
  const next = e.ties.slice();
  next[round] = ties;
  const mine = ties.find(t => t.a === myId || t.b === myId);
  const legDone = mine ? mine.legs.length : 0;
  return { ...e, ties: next, leg: Math.min(legDone, legsIn(round) - 1), played: e.played + 1 };
}

/** His legs are all in, the aggregate is level, and nobody has won: the shootout is due. */
export function needsPens(e: EuroState, myId: string): boolean {
  const t = myTie(e, myId);
  if (!t || t.winner || t.legs.length < legsIn(e.round)) return false;
  const [x, y] = aggregate(t);
  return x === y;
}

/** The shootout he took, as [mine, theirs]; the tie keeps [a, b] and gets its winner. */
export function settleMyPens(e: EuroState, myId: string, score: [number, number]): EuroState {
  const round = e.round;
  const ties = e.ties[round].map(t => {
    if (t.a !== myId && t.b !== myId) return t;
    const pens: [number, number] = t.a === myId ? score : [score[1], score[0]];
    return { ...t, pens, winner: pens[0] > pens[1] ? t.a : t.b };
  });
  const next = e.ties.slice();
  next[round] = ties;
  return { ...e, ties: next };
}

/** The round is over when every tie has a winner. */
export const roundDone = (e: EuroState): boolean => e.ties[e.round].every(t => !!t.winner);

/**
 * Move to the next round once every tie is settled: winners paired in order,
 * the first-leg host alternating so nobody hosts first twice running. When
 * the manager is out, or has won the final, the status says so.
 */
export function advanceRound(e: EuroState, myId: string): EuroState {
  if (!roundDone(e)) return e;
  const winners = e.ties[e.round].map(t => t.winner!);
  const iAmIn = winners.includes(myId);
  if (e.round === EURO_ROUNDS - 1) return { ...e, status: iAmIn ? 'won' : 'out' };
  const ties: EuroTie[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    const hostedFirst = e.ties[e.round].find(t => t.a === winners[i])?.a === winners[i];
    ties.push(hostedFirst ? { a: winners[i + 1], b: winners[i], legs: [] } : { a: winners[i], b: winners[i + 1], legs: [] });
  }
  return {
    ...e, round: e.round + 1, leg: 0, ties: [...e.ties, ties],
    status: iAmIn ? 'on' : 'out',
    bans: Object.fromEntries(Object.entries(e.bans).filter(([, n]) => n > 0)),
  };
}

/**
 * Who gets in: the ליגת העל champion, and nobody else. The report's tier is the
 * one the title was won in; a champion of a lower division is promoted, not
 * invited. `live` is the flag, passed in so a check can prove the rule with the
 * door still shut for players.
 */
export function euroEntry(live: boolean, report: { result: string; tier: number } | null, topTier: number): boolean {
  return live && !!report && report.result === 'champion' && report.tier === topTier;
}

/** A European night the manager has to play this week, before the league round. */
export interface EuroNight {
  round: number;
  /** 0 the first leg, 1 the return; the final is leg 0 of one */
  leg: number;
  tie: EuroTie;
  oppId: string;
  /** true at home, false away, null for the final's neutral ground */
  host: boolean | null;
}

/**
 * Is there a European night this week? Only while he is still in, only in a
 * week the calendar puts a leg on, and only while that leg is unplayed: a
 * manager who already played the week's leg is waiting for the others.
 */
export function nightFor(e: EuroState, myId: string, leagueRounds: number, week: number): EuroNight | null {
  if (e.status !== 'on') return null;
  const weeks = euroWeeks(leagueRounds);
  const legWeeks = weeks?.[e.round];
  if (!legWeeks) return null;
  const tie = myTie(e, myId);
  if (!tie) return null;
  const leg = tie.legs.length;
  if (leg >= legsIn(e.round) || legWeeks[leg] !== week) return null;
  const oppId = tie.a === myId ? tie.b : tie.a;
  const host = legsIn(e.round) === 1 ? null : (leg === 0) === (tie.a === myId);
  return { round: e.round, leg, tie, oppId, host };
}

/** Does the manager host this leg? The final has no host. */
export function iHost(e: EuroState, myId: string): boolean | null {
  const t = myTie(e, myId);
  if (!t || legsIn(e.round) === 1) return null;
  return (e.leg === 0) === (t.a === myId);
}

/** The prize for reaching a round (the trophy is index 4). */
export const prizeFor = (roundReached: number): number => PRIZE[Math.min(roundReached, PRIZE.length - 1)];

/** A red card here is a ban here: the next European match, and no more. */
export function banFor(e: EuroState, playerId: string): EuroState {
  return { ...e, bans: { ...e.bans, [playerId]: 1 } };
}
/** The banned sit this match out, and the ban is served. */
export function serveBans(e: EuroState): { banned: string[]; next: EuroState } {
  const banned = Object.entries(e.bans).filter(([, n]) => n > 0).map(([id]) => id);
  const bans: Record<string, number> = {};
  for (const [id, n] of Object.entries(e.bans)) if (n > 1) bans[id] = n - 1;
  return { banned, next: { ...e, bans } };
}

/**
 * The manager is out (or never in): play the rest of the competition to its
 * champion, round by round, each round on its own seed.
 */
export function playOutWithoutMe(e: EuroState, myId: string, seed: number): EuroState {
  let cur = e;
  let guard = 0;
  while (cur.status !== 'won' && cur.round < EURO_ROUNDS && guard++ < EURO_ROUNDS + 1) {
    cur = playAiRound(cur, myId, seed + cur.round * 1009);
    if (!roundDone(cur)) break;                       // his own tie is still open: not ours to play
    if (cur.round === EURO_ROUNDS - 1) { cur = { ...cur, status: cur.ties[EURO_ROUNDS - 1][0].winner === myId ? 'won' : 'out' }; break; }
    cur = advanceRound(cur, myId);
  }
  return cur;
}

/**
 * The season is over and the cup is not: his tie was never played out. It goes
 * to the other side, nobody is paid for a round he did not reach, and the rest
 * of the cup is played to its champion so the competition is never left open
 * into a summer that draws the next one. Anything already finished is left
 * exactly as it is.
 */
export function closeEuroSeason(e: EuroState, myId: string, seed: number): EuroState {
  if (e.status !== 'on') return e;
  const ties = e.ties.map((round, r) => r !== e.round ? round : round.map(t =>
    (t.a === myId || t.b === myId) && !t.winner ? { ...t, winner: t.a === myId ? t.b : t.a } : t));
  return { ...playOutWithoutMe({ ...e, ties, status: 'out' }, myId, seed), cut: true };
}

/** Each round he reached paid its own prize, so a whole run is the sum of the rounds from the quarter up. */
export const prizeTotal = (roundReached: number): number =>
  PRIZE.slice(1, Math.min(roundReached, PRIZE.length - 1) + 1).reduce<number>((s, x) => s + x, 0);

/** 'in the quarter', for a sentence: the name with its preposition, because ב and הגמר do not join. */
export const ROUND_IN = ['בשמינית הגמר', 'ברבע הגמר', 'בחצי הגמר', 'בגמר'] as const;

/** How his season in Europe ended. Null when there was no competition or it is still being played. */
export interface EuroVerdict {
  outcome: 'won' | 'out' | 'cut';
  /** the last round he stood in: 0 the last sixteen, 3 the final */
  round: number;
  /** what the run paid in prizes, from the rounds he reached */
  prize: number;
  /** the legs he played */
  played: number;
}

export function euroVerdict(e: EuroState | null, myId: string): EuroVerdict | null {
  if (!e || e.status === 'on') return null;
  let round = 0;
  e.ties.forEach((ties, r) => { if (ties.some(t => t.a === myId || t.b === myId)) round = r; });
  const prize = prizeTotal(e.status === 'won' ? EURO_ROUNDS : round);
  return { outcome: e.status === 'won' ? 'won' : e.cut ? 'cut' : 'out', round, prize, played: e.played };
}

/**
 * What a career in the cup has earned a place in the numbers for, and nothing
 * else about it: that it was drawn in, that it stood in the final, that it
 * lifted the cup. Closed names, three of them, counted once a device.
 */
export const EURO_MARKS = ['eu_in', 'eu_final', 'eu_won'] as const;
export type EuroMark = typeof EURO_MARKS[number];

export function euroMarks(e: EuroState | null, myId: string): EuroMark[] {
  if (!e) return [];
  const marks: EuroMark[] = ['eu_in'];
  if (e.ties[EURO_ROUNDS - 1]?.some(t => t.a === myId || t.b === myId)) marks.push('eu_final');
  if (e.status === 'won') marks.push('eu_won');
  return marks;
}

/** Who lifted the cup, once the final is settled. */
export const champion = (e: EuroState): string | undefined => e.ties[EURO_ROUNDS - 1]?.[0]?.winner;

/** Every leg of every tie, for the checks: a competition that ran to the end has 15 winners. */
export function allWinners(e: EuroState): string[] {
  return e.ties.flat().map(t => t.winner).filter((w): w is string => !!w);
}

/* ------------------------------------------------- the shootout, kick by kick */

export type PenCorner = 'left' | 'center' | 'right';
export const PEN_CORNERS: PenCorner[] = ['left', 'center', 'right'];

/** The keeper's tendency, drawn once a kick: the hint the screen shows. */
export function hintFor(rng: () => number): PenCorner {
  const r = rng();
  return r < 0.34 ? 'left' : r < 0.67 ? 'center' : 'right';
}

/** Where the keeper actually goes: the hint six times in ten, elsewhere the rest, the live match's own odds. */
export function diveFor(rng: () => number, hint: PenCorner): PenCorner {
  if (rng() < 0.6) return hint;
  const others = PEN_CORNERS.filter(c => c !== hint);
  return others[Math.floor(rng() * others.length)];
}

/** His man kicks: past the keeper 85 times in 100, into him 25, the live match's own odds. */
export function myKickScores(rng: () => number, pick: PenCorner, dive: PenCorner): boolean {
  return pick !== dive ? rng() < 0.85 : rng() < 0.25;
}

/** Their man kicks at his keeper of quality gkq: the right corner keeps it out just over half the time. */
export function theirKickSaved(rng: () => number, dive: PenCorner, aim: PenCorner, gkq: number): boolean {
  return rng() < (dive === aim ? 0.55 + (gkq - 60) / 250 : 0.06 + (gkq - 60) / 500);
}

/**
 * Who kicks next and who has won, from the kicks so far: five each, over the
 * moment one side cannot be caught, then sudden death pair by pair. He kicks
 * first.
 */
export function shootoutStatus(mine: boolean[], theirs: boolean[]): { score: [number, number]; next: 'me' | 'them'; winner: 'me' | 'them' | null } {
  const m = mine.filter(Boolean).length, t = theirs.filter(Boolean).length;
  // kicks still owed: the rest of the five, or in sudden death the one reply the side behind still has
  const leftM = mine.length < 5 ? 5 - mine.length : (mine.length < theirs.length ? 1 : 0);
  const leftT = theirs.length < 5 ? 5 - theirs.length : (theirs.length < mine.length ? 1 : 0);
  let winner: 'me' | 'them' | null = null;
  if (m > t + leftT) winner = 'me';
  else if (t > m + leftM) winner = 'them';
  else if (mine.length >= 5 && theirs.length >= 5 && mine.length === theirs.length && m !== t) winner = m > t ? 'me' : 'them';
  return { score: [m, t], next: mine.length === theirs.length ? 'me' : 'them', winner };
}
