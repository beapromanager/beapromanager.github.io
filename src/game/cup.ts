/**
 * גביע המדינה, the competition itself. Pure: no game state, no React.
 *
 * Modeled on euro.ts (Itzik's rules of 6.10), with the differences the
 * product spec of 20.10 asks for: a single knockout leg per round (no away
 * goals, no second leg — straight to penalties on a level match), entry from
 * the two top divisions only (tier 4, הלאומית, and tier 5, ליגת העל), a
 * "staged" entry for the reigning ליגת העל champion who is also in Europe
 * this season (he joins at the semi-final, after the quarter is played out
 * by the AI alone), and a host rule by division rather than by leg: the lower
 * tier hosts, a coin toss on equal tiers, nobody at the final.
 *
 * The door (CUP_LIVE) stays shut until Itzik opens it, exactly like Europe's.
 * Everything random takes a seed from the caller (state.ts routes it through
 * drawSeed with its own salt block, 170_000+, so a reload replays the same
 * night), and the stateless shootout/goal-scoring maths is reused straight
 * from euro.ts rather than duplicated: CupTie is shaped exactly like EuroTie,
 * so aggregate/settleTie/aiLeg take it without caring which cup it is.
 */

import { createRng } from '../engine/matchEngine.ts';
import {
  ROUND_NAMES, aggregate, settleTie, aiLeg, shootout,
  hintFor, diveFor, myKickScores, theirKickSaved, shootoutStatus, PEN_CORNERS,
} from './euro.ts';
import type { EuroTie, PenCorner } from './euro.ts';
export { ROUND_NAMES, hintFor, diveFor, myKickScores, theirKickSaved, shootoutStatus, PEN_CORNERS };
export type { PenCorner };

/** The door. Off until Itzik says the cup is ready for players. */
export const CUP_LIVE = false;

/** Only the top two divisions play the cup. Below this, cup is always null. */
export const CUP_MIN_TIER = 4;

/** rounds: 0 שמינית הגמר, 1 רבע הגמר, 2 חצי הגמר, 3 הגמר */
export const CUP_ROUNDS = 4;
/** the manager plus fifteen others, the usual way in */
export const CUP_FIELD = 16;
/** the AI-only pre-bracket a staged (seeded) entrant skips: twelve clubs, two rounds, down to three */
export const CUP_PRE_FIELD = 12;

/**
 * How strong the other side plays, by round, on the makeSquad target scale.
 * Itzik's rule (ב.1.3): the cup has to be very hard. For comparison,
 * leagueCeiling(4) = 69.5, leagueCeiling(5) = 75, and Europe's STAGE_TARGET is
 * [74, 78, 82, 84]: a cup round is roughly a game against the top of ליגת העל,
 * and the semi on is already European level. check:cup pins these as literals
 * and calibrates them against the win-rate targets in the product spec.
 */
export const CUP_TARGET = [74, 77, 80, 83] as const;
/** each club carries a small fixed edge around its round's target, so the draw matters (as in Europe) */
export const CUP_EDGE = 2;

/**
 * Money. Itzik's note of 20.10: lower than the spec's own draft, because the
 * cup has to make the economy HARDER, not easier, and because — unlike
 * Europe, which only ever pays the reigning ליגת העל champion — the cup pays
 * every tier 4/5 career, every season. A full run (reaching the final and
 * winning it) totals 460,000: about a quarter of the spec draft's 1,870,000,
 * and about a tenth of Europe's full-run total (4,500,000, euro.ts PRIZE).
 * Paid on REACHING the round, nothing for merely being drawn in. Index by the
 * round reached; 4 is the trophy.
 */
export const CUP_PRIZE = [0, 30_000, 60_000, 120_000, 250_000] as const;
/** lower than Europe's 0.75: a smaller stage, economically, even before security */
export const CUP_GATE_SHARE = 0.65;
/** a domestic trip, far cheaper than Europe's 150,000 */
export const CUP_TRAVEL = 40_000;
/**
 * Fitness taken out of the legs of every man who played, for the week's
 * league match — same mechanism as Europe's EURO_TIRED. Strengthened from the
 * product spec's draft (-10) to Europe's own -12, per Itzik's 20.10 note that
 * a squad that is not rotated has to feel it: the cup adds a second midweek
 * fixture on top of an already busy week, and a lighter penalty than Europe's
 * would have told managers the domestic cup is the easy one to skip rotating
 * for. See HANDOFF for why a persistent, multi-week fatigue model is not
 * attempted here: fitness is reset to a fresh matchMods dict every week by
 * endOfWeek, for league and Europe alike, and widening that is a separate,
 * engine-wide change this stage does not take on.
 */
export const CUP_TIRED = -12;
/** slightly below Europe's 0.06: a domestic trip, not a flight */
export const CUP_INJURY_RISK = 0.05;

/** Which league round the cup night falls before, one entry per round. Null below 14 rounds, like Europe's euroWeeks. */
export function cupWeeks(leagueRounds: number): number[] | null {
  if (leagueRounds === 14) return [4, 7, 11, 14];
  if (leagueRounds === 18) return [4, 8, 13, 17];
  if (leagueRounds === 22) return [6, 11, 17, 21];
  return null;
}

export type CupStatus = 'on' | 'out' | 'won' | 'waiting';

/** Shaped exactly like EuroTie, so euro.ts's stateless tie helpers take it as-is. */
export interface CupTie {
  /** the host, by the tier rule below; neutral in the final regardless of a/b */
  a: string;
  b: string;
  /** always at most one entry: the cup is a single leg a round */
  legs: Array<[number, number]>;
  pens?: [number, number];
  winner?: string;
}

export interface CupClub { id: string; tier: number; edge: number; }

export interface CupState {
  season: number;
  /** every club in the draw, the manager included, whatever round he joins in */
  clubs: CupClub[];
  /** 0: in from the first round, like everyone else. 2: joins at the semi (the reigning champion also in Europe) */
  joinAt: 0 | 2;
  round: number;
  ties: CupTie[][];
  status: CupStatus;
  /** my men banned from the next cup match, by matches left */
  bans: Record<string, number>;
  /** every match the manager has personally played */
  played: number;
  /** the draw ceremony watched or skipped; flipped back to false when a staged entrant is paired in at the semi */
  seen?: boolean;
  /** the season ended with his tie still open, so it was closed against him */
  cut?: boolean;
}

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
 * Pair two clubs with the cup's host rule (ב.2): the lower tier hosts —
 * domestic cup tradition, the smaller club gets the big night at home — equal
 * tiers toss a coin. Applied to every round including the one that produces
 * the final's pairing; the final itself is read as neutral regardless of
 * which side ends up `.a`, by round index alone (see nightFor/iHost).
 */
function pairWithHost(x: CupClub, y: CupClub, rng: () => number): CupTie {
  const lower = x.tier !== y.tier ? (x.tier < y.tier ? x : y) : (rng() < 0.5 ? x : y);
  const other = lower.id === x.id ? y : x;
  return { a: lower.id, b: other.id, legs: [] };
}

/**
 * The draw. `pool` is every eligible club outside the manager's own, built by
 * the caller from the two divisions' city rosters (state.ts, cities.ts) so
 * this module stays free of city data. `seeded` is the staged entry: the
 * reigning ליגת העל champion who is also in Europe this season plays only the
 * semi and the final, while twelve others fight it out without him.
 */
export function drawCup(
  seed: number, myId: string, season: number, myTier: number, seeded: boolean,
  pool: Array<{ id: string; tier: number }>,
): CupState {
  const rng = createRng(seed);
  const others = shuffle(pool.filter(c => c.id !== myId), rng);
  const joinAt: 0 | 2 = seeded ? 2 : 0;
  const fieldSize = seeded ? CUP_PRE_FIELD : CUP_FIELD - 1;
  const field: CupClub[] = others.slice(0, fieldSize).map(c => ({
    id: c.id, tier: c.tier, edge: Math.round((rng() * 2 - 1) * CUP_EDGE),
  }));
  const clubs: CupClub[] = [{ id: myId, tier: myTier, edge: ME_EDGE }, ...field];
  const participants = joinAt === 0 ? shuffle(clubs, rng) : shuffle(field, rng);
  const ties: CupTie[] = [];
  for (let i = 0; i < participants.length; i += 2) ties.push(pairWithHost(participants[i], participants[i + 1], rng));
  return {
    season, clubs, joinAt, round: 0, ties: [ties],
    status: joinAt === 0 ? 'on' : 'waiting',
    bans: {}, played: 0,
  };
}

export const myTie = (e: CupState, myId: string): CupTie | undefined =>
  e.ties[e.round]?.find(t => t.a === myId || t.b === myId);

/** The strength a club plays at in the given round. */
export function strengthOf(e: CupState, id: string, round = e.round): number {
  const edge = e.clubs.find(c => c.id === id)?.edge ?? 0;
  return CUP_TARGET[Math.min(round, CUP_TARGET.length - 1)] + edge;
}

/** Every tie in the round has a winner. */
export const roundDone = (e: CupState): boolean => e.ties[e.round].every(t => !!t.winner);

/** Play every AI tie of the round to the end, leaving the manager's own tie (if he has one) untouched. */
export function playAiRound(e: CupState, myId: string, seed: number): CupState {
  const rng = createRng(seed);
  const round = e.round;
  const neutral = round === CUP_ROUNDS - 1;
  const ties = e.ties[round].map(t => {
    if (t.a === myId || t.b === myId) return t;
    if (t.winner) return t;
    const sa = strengthOf(e, t.a, round), sb = strengthOf(e, t.b, round);
    const played: CupTie = { ...t, legs: [aiLeg(sa, sb, rng, neutral)] };
    return settleTie(played as EuroTie, rng) as CupTie;
  });
  const next = e.ties.slice();
  next[round] = ties;
  return { ...e, ties: next };
}

/**
 * Write the manager's one leg in. A single match, so the winner (or the need
 * for penalties) is known the moment it is written — there is no multi-leg
 * aggregate to wait on, unlike Europe.
 */
export function recordMyLeg(e: CupState, myId: string, goals: [number, number]): CupState {
  const round = e.round;
  const ties = e.ties[round].map(t => {
    if (t.a !== myId && t.b !== myId) return t;
    const leg: [number, number] = t.a === myId ? goals : [goals[1], goals[0]];
    const withLeg: CupTie = { ...t, legs: [leg] };
    const [x, y] = aggregate(withLeg as EuroTie);
    return x === y ? withLeg : { ...withLeg, winner: x > y ? withLeg.a : withLeg.b };
  });
  const next = e.ties.slice();
  next[round] = ties;
  return { ...e, ties: next, played: e.played + 1 };
}

/** His leg is in, level, and nobody has won: the shootout is due. */
export function needsPens(e: CupState, myId: string): boolean {
  const t = myTie(e, myId);
  if (!t || t.winner || t.legs.length < 1) return false;
  const [x, y] = aggregate(t as EuroTie);
  return x === y;
}

/** The shootout he took, as [mine, theirs]. */
export function settleMyPens(e: CupState, myId: string, score: [number, number]): CupState {
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

/**
 * Move to the next round once every tie in the current one is settled.
 * Winners are paired in order with the host rule above; when the next round
 * is the manager's staged joinAt and he is not already in it, he is spliced
 * into the winners at a seeded random position first, and the draw ceremony
 * is owed again (`seen: false`) so the screen reveals this one new pairing.
 */
export function advanceRound(e: CupState, myId: string, seed: number): CupState {
  const round = e.round;
  if (!roundDone(e)) return e;
  const winners = e.ties[round].map(t => t.winner!);
  if (round === CUP_ROUNDS - 1) {
    return { ...e, status: winners[0] === myId ? 'won' : 'out' };
  }
  const rng = createRng(seed);
  const nextRound = round + 1;
  let participants = winners.map(id => e.clubs.find(c => c.id === id)!);
  let status = e.status;
  let justJoined = false;
  if (nextRound === e.joinAt && !participants.some(c => c.id === myId)) {
    const me = e.clubs.find(c => c.id === myId)!;
    const at = Math.floor(rng() * (participants.length + 1));
    participants = [...participants.slice(0, at), me, ...participants.slice(at)];
    status = 'on';
    justJoined = true;
  }
  const ties: CupTie[] = [];
  for (let i = 0; i < participants.length; i += 2) ties.push(pairWithHost(participants[i], participants[i + 1], rng));
  const nextTies = e.ties.slice();
  nextTies[nextRound] = ties;
  return {
    ...e, round: nextRound, ties: nextTies, status,
    bans: Object.fromEntries(Object.entries(e.bans).filter(([, n]) => n > 0)),
    seen: justJoined ? false : e.seen,
  };
}

/** A red card here is a ban here: the next cup match, and no more. */
export function banFor(e: CupState, playerId: string): CupState {
  return { ...e, bans: { ...e.bans, [playerId]: 1 } };
}
/** The banned sit this match out, and the ban is served. */
export function serveBans(e: CupState): { banned: string[]; next: CupState } {
  const banned = Object.entries(e.bans).filter(([, n]) => n > 0).map(([id]) => id);
  const bans: Record<string, number> = {};
  for (const [id, n] of Object.entries(e.bans)) if (n > 1) bans[id] = n - 1;
  return { banned, next: { ...e, bans } };
}

/** The manager is out, or still waiting to join: play the rest of the cup to its champion. */
export function playOutWithoutMe(e: CupState, myId: string, seed: number): CupState {
  let cur = e;
  let guard = 0;
  while (cur.status !== 'won' && cur.round < CUP_ROUNDS && guard++ < CUP_ROUNDS + 1) {
    cur = playAiRound(cur, myId, seed + cur.round * 1009);
    if (!roundDone(cur)) break;
    if (cur.round === CUP_ROUNDS - 1) { cur = { ...cur, status: cur.ties[CUP_ROUNDS - 1][0].winner === myId ? 'won' : 'out' }; break; }
    cur = advanceRound(cur, myId, seed + cur.round * 2003 + 7);
  }
  return cur;
}

/** Play exactly one AI-only round forward: the week's cup night when the manager has none of his own this week. */
export function stepAiRound(e: CupState, myId: string, seed: number): CupState {
  let cur = playAiRound(e, myId, seed);
  if (roundDone(cur)) cur = advanceRound(cur, myId, seed + 5003);
  return cur;
}

/** The season is over and his tie (if he had one open) never played out: it goes to the other side, and the rest plays to a champion. */
export function closeCupSeason(e: CupState, myId: string, seed: number): CupState {
  if (e.status !== 'on') return e;
  const ties = e.ties.map((round, r) => r !== e.round ? round : round.map(t =>
    (t.a === myId || t.b === myId) && !t.winner ? { ...t, winner: t.a === myId ? t.b : t.a } : t));
  return { ...playOutWithoutMe({ ...e, ties, status: 'out' }, myId, seed), cut: true };
}

/** Who gets the cup drawn for them next season: tier 4 or 5, whatever the road that got them there. */
export function cupEntry(live: boolean, newTier: number): boolean {
  return live && newTier >= CUP_MIN_TIER;
}

/** A cup night this week, or null. */
export interface CupNight {
  round: number;
  tie: CupTie;
  oppId: string;
  /** true at home, false away, null for the final's neutral ground */
  host: boolean | null;
}

export function nightFor(e: CupState, myId: string, leagueRounds: number, week: number): CupNight | null {
  if (e.status !== 'on') return null;
  const weeks = cupWeeks(leagueRounds);
  if (!weeks || weeks[e.round] !== week) return null;
  const tie = myTie(e, myId);
  if (!tie || tie.legs.length >= 1) return null;
  const oppId = tie.a === myId ? tie.b : tie.a;
  const host = e.round === CUP_ROUNDS - 1 ? null : tie.a === myId;
  return { round: e.round, tie, oppId, host };
}

/** Does the manager host this round? The final has no host. */
export function iHost(e: CupState, myId: string): boolean | null {
  if (e.round === CUP_ROUNDS - 1) return null;
  const t = myTie(e, myId);
  return t ? t.a === myId : null;
}

/** The prize for reaching a round (the trophy is index 4). */
export const prizeFor = (roundReached: number): number => CUP_PRIZE[Math.min(roundReached, CUP_PRIZE.length - 1)];
/** A whole run from the round reached: the sum of every round's prize up to it. */
export const prizeTotal = (roundReached: number): number =>
  CUP_PRIZE.slice(1, Math.min(roundReached, CUP_PRIZE.length - 1) + 1).reduce<number>((s, x) => s + x, 0);

/** 'in the quarter', for a sentence, reusing Europe's prepositions: the rounds are named the same way. */
export { ROUND_IN } from './euro.ts';

export interface CupVerdict {
  outcome: 'won' | 'out' | 'cut';
  round: number;
  prize: number;
  played: number;
}

export function cupVerdict(e: CupState | null, myId: string): CupVerdict | null {
  if (!e || e.status === 'on' || e.status === 'waiting') return null;
  let round = 0;
  e.ties.forEach((ties, r) => { if (ties.some(t => t.a === myId || t.b === myId)) round = r; });
  const prize = prizeTotal(e.status === 'won' ? CUP_ROUNDS : round);
  return { outcome: e.status === 'won' ? 'won' : e.cut ? 'cut' : 'out', round, prize, played: e.played };
}

/**
 * What a career in the cup reports for the numbers: drawn in (fires even for
 * a staged entrant still waiting, since he was drawn into it), stood in the
 * semi (ben.7's 'cup_sf', the one milestone Europe has no equivalent for,
 * because every cup entrant who reaches it is worth counting, staged or not),
 * stood in the final, lifted it.
 */
export const CUP_MARKS = ['cup_in', 'cup_sf', 'cup_final', 'cup_won'] as const;
export type CupMark = typeof CUP_MARKS[number];

export function cupMarks(e: CupState | null, myId: string): CupMark[] {
  if (!e) return [];
  const marks: CupMark[] = ['cup_in'];
  if (e.ties[2]?.some(t => t.a === myId || t.b === myId)) marks.push('cup_sf');
  if (e.ties[CUP_ROUNDS - 1]?.some(t => t.a === myId || t.b === myId)) marks.push('cup_final');
  if (e.status === 'won') marks.push('cup_won');
  return marks;
}

/** Who lifted the cup, once the final is settled. */
export const champion = (e: CupState): string | undefined => e.ties[CUP_ROUNDS - 1]?.[0]?.winner;

/** Every leg of every tie, for the checks: a cup that ran to the end has fifteen winners. */
export function allWinners(e: CupState): string[] {
  return e.ties.flat().map(t => t.winner).filter((w): w is string => !!w);
}

/** The division a club plays its cup matches from, for the host rule and the upset mark. */
export function tierOf(e: CupState, id: string): number {
  return e.clubs.find(c => c.id === id)?.tier ?? 0;
}

/** "קשה מאוד" cuts both ways: a tier 4 club beating a tier 5 one is the headline, ב.7's recommended cup_upset. */
export function isUpset(e: CupState, t: CupTie): boolean {
  if (!t.winner) return false;
  const loserId = t.winner === t.a ? t.b : t.a;
  return tierOf(e, t.winner) < tierOf(e, loserId);
}
