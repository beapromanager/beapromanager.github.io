/**
 * What פסגת אירופה remembers (R7, R9, R10): every tie he played against a summit club, the finals for the golden
 * book, and his last win for the five-second reel. All of it pure data read off the matches as they were played;
 * the career keeps it in the save through the loader's backfill, and a save from before starts empty.
 */
import type { MatchResult } from '../engine/matchEngine.ts';

/** One leg as it went, from his side. */
export interface LegDigest {
  /** his goals, theirs */
  goals: [number, number];
  /** true at his ground, false at theirs, null on neutral ground */
  host: boolean | null;
  /** every goal in order: the minute, the scorer, whose it was, from the spot or not */
  scorers: Array<{ minute: number; name: string; mine: boolean; pen: boolean }>;
  redMine: boolean;
  redTheirs: boolean;
}

export interface MeetingFlags {
  lastMinute: boolean;   // a goal of his from the 88th on, in a tie he won
  comeback: boolean;     // behind in a leg he went on to win, or lost the first leg and took the tie
  redCard: boolean;      // one of theirs sent off
  final: boolean;
  bigWin: boolean;       // three goals or more clear over the tie, his way
  cleanSheet: boolean;   // nothing conceded over the tie
  pens: boolean;
}

/** One tie against a club: the season, the round, each leg's score his way, the shootout, who went through. */
export interface Meeting {
  season: number;
  round: number;
  legs: Array<[number, number]>;
  pens: [number, number] | null;
  won: boolean;
  flags: MeetingFlags;
}

export const MEETINGS_KEPT = 10;

export function digestLeg(r: MatchResult, myId: string, host: boolean | null): LegDigest {
  const mineIsHome = r.home.id === myId;
  const goals: [number, number] = mineIsHome ? [r.score[0], r.score[1]] : [r.score[1], r.score[0]];
  const scorers = (r.events ?? [])
    .filter(e => e.type === 'goal' || e.type === 'penalty_goal')
    .map(e => ({ minute: e.minute, name: e.playerName, mine: e.teamId === myId, pen: e.type === 'penalty_goal' }))
    .sort((a, b) => a.minute - b.minute);
  const reds = (r.events ?? []).filter(e => e.type === 'red');
  return { goals, host, scorers, redMine: reds.some(e => e.teamId === myId), redTheirs: reds.some(e => e.teamId !== myId) };
}

/** Was he behind at some point of this leg and still won it? Read off the goals in order. */
export function cameBack(leg: LegDigest): boolean {
  let me = 0, them = 0, trailed = false;
  for (const g of leg.scorers) { if (g.mine) me++; else them++; if (them > me) trailed = true; }
  return trailed && leg.goals[0] > leg.goals[1];
}

export function meetingOf(season: number, round: number, legs: LegDigest[], pens: [number, number] | null, won: boolean, lastRound: number): Meeting {
  const mine = legs.reduce((s, l) => s + l.goals[0], 0), theirs = legs.reduce((s, l) => s + l.goals[1], 0);
  return {
    season, round, legs: legs.map(l => [l.goals[0], l.goals[1]] as [number, number]), pens, won,
    flags: {
      lastMinute: won && legs.some(l => l.scorers.some(g => g.mine && g.minute >= 88)),
      comeback: legs.some(cameBack) || (won && legs.length === 2 && legs[0].goals[0] < legs[0].goals[1]),
      redCard: legs.some(l => l.redTheirs),
      final: round === lastRound,
      bigWin: won && mine - theirs >= 3,
      cleanSheet: theirs === 0,
      pens: !!pens,
    },
  };
}

export type SummitHistory = Record<string, Meeting[]>;

/** The newest meeting last; the oldest falls off after MEETINGS_KEPT. */
export function addMeeting(h: SummitHistory, oppId: string, m: Meeting): SummitHistory {
  return { ...h, [oppId]: [...(h[oppId] ?? []), m].slice(-MEETINGS_KEPT) };
}

/* ------------------------------------------------------------------ the golden book */

export interface GoldenPage {
  season: number;
  /** a final played and lost is a page; the trophy is a double page */
  kind: 'final' | 'trophy';
  oppId: string;
  score: [number, number];
  pens: [number, number] | null;
  title: string;
  line: string;
  momentId: string;
  /** which phrasing wrote it, so the next page of the career does not repeat it */
  tpl: string;
  /** the line of history between them as it stood before this final (R10), when they had met before */
  rivalry?: string;
  /** an old page kept as one line: the title and the season only */
  compact?: boolean;
}

export const BOOK_PAGES_KEPT = 60;

/** A new page at the end; beyond BOOK_PAGES_KEPT whole pages the oldest is pressed down to its one line. */
export function addPage(book: GoldenPage[], page: GoldenPage): GoldenPage[] {
  const next = [...book, page];
  const whole = next.filter(p => !p.compact).length;
  if (whole <= BOOK_PAGES_KEPT) return next;
  let over = whole - BOOK_PAGES_KEPT;
  return next.map(p => (!p.compact && over-- > 0 ? { ...p, compact: true, line: '', rivalry: undefined } : p));
}

/* ------------------------------------------------------------------ the reel */

/** His last summit win, for the five-second reel: the score his way, every goal, the shootout if there was one. */
export interface ReelData {
  season: number;
  round: number;
  score: [number, number];
  goals: Array<{ minute: number; name: string; mine: boolean }>;
  pens: [number, number] | null;
}

export const reelOf = (season: number, round: number, leg: LegDigest, pens: [number, number] | null): ReelData => ({
  season, round, score: [leg.goals[0], leg.goals[1]],
  goals: leg.scorers.map(g => ({ minute: g.minute, name: g.name, mine: g.mine })), pens,
});
