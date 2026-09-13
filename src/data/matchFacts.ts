/**
 * What actually happened out there.
 *
 * The reporter used to know only whether you won and by how much, so his
 * questions read like a form letter: correct about the result, blind to the
 * game. This reads the match back out of its own events, so he can ask about
 * the sending off in the fortieth minute, the penalty your striker put over the
 * bar, or the two goal lead you gave away, and the press room stops feeling
 * like a template.
 *
 * Facts come out ranked. The most newsworthy thing that happened is the thing
 * he leads with.
 */

import type { MatchResult, MatchEvent, Player } from '../engine/matchEngine.ts';
import { isLegend } from './legends.ts';

export type FactKind =
  | 'hat_trick' | 'brace' | 'late_winner' | 'late_equaliser'
  | 'comeback' | 'collapse' | 'late_concede'
  | 'red_card' | 'their_red' | 'penalty_miss' | 'own_goal'
  | 'clean_sheet' | 'star_rating' | 'keeper_hero' | 'toothless' | 'top_man'
  | 'penalty_saved' | 'shape_worked' | 'shape_failed' | 'legend_goal' | 'ex_scored';

export interface MatchFact {
  kind: FactKind;
  /** the man it is about, family name, ready to drop into a sentence */
  who?: string;
  minute?: number;
  /** goals, or whatever the fact counts */
  n?: number;
}

/** Anything past this is late enough that the crowd was already leaving. */
const LATE = 80;

/** How much of a story each one is. The reporter leads with the biggest. */
const WEIGHT: Record<FactKind, number> = {
  hat_trick: 100, ex_scored: 96, red_card: 92, collapse: 90, comeback: 88,
  late_winner: 86, late_equaliser: 80, penalty_miss: 78, late_concede: 74,
  own_goal: 70, shape_failed: 66, legend_goal: 64, penalty_saved: 62, their_red: 60,
  shape_worked: 59, brace: 58, keeper_hero: 52,
  star_rating: 44, clean_sheet: 36, toothless: 30, top_man: 12,
};

const family = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
};

/** Goals only, in the order they went in, with who they belonged to. */
function goalTimeline(events: MatchEvent[], myId: string): { mine: boolean; minute: number }[] {
  const out: { mine: boolean; minute: number }[] = [];
  for (const e of events) {
    // an own goal counts for the OTHER side, which is the whole misery of it
    if (e.type === 'goal' || e.type === 'penalty_goal') out.push({ mine: e.teamId === myId, minute: e.minute });
    else if (e.type === 'own_goal') out.push({ mine: e.teamId !== myId, minute: e.minute });
  }
  return out;
}

/**
 * Read the match back. `myId` is the manager's club, `squad` is needed only to
 * find his keeper, whose night is a story of its own.
 */
export function matchFacts(
  r: MatchResult, myId: string,
  squad?: { starters: Player[]; bench: Player[] },
  /** ids of men the manager sold into this league, so a goal by one of them is its own story */
  exIds?: Set<string>,
): MatchFact[] {
  const facts: MatchFact[] = [];
  const ev = r.events ?? [];
  const timeline = goalTimeline(ev, myId);
  const myGoals = timeline.filter(g => g.mine).length;
  const theirGoals = timeline.length - myGoals;

  /* one of yours, in their shirt */
  if (exIds?.size) {
    const ex = ev.find(e => e.teamId !== myId && (e.type === 'goal' || e.type === 'penalty_goal') && exIds.has(e.playerId));
    if (ex) facts.push({ kind: 'ex_scored', who: family(ex.playerName), minute: ex.minute });
  }

  /* scorers */
  const scored = new Map<string, number>();
  for (const e of ev) {
    if ((e.type === 'goal' || e.type === 'penalty_goal') && e.teamId === myId) {
      scored.set(e.playerName, (scored.get(e.playerName) ?? 0) + 1);
    }
  }
  for (const [name, n] of scored) {
    if (isLegend({ name })) facts.push({ kind: 'legend_goal', who: family(name), n });
    if (n >= 3) facts.push({ kind: 'hat_trick', who: family(name), n });
    else if (n === 2) facts.push({ kind: 'brace', who: family(name), n });
  }

  /* how the scoreline moved */
  let mine = 0, theirs = 0, wasBehind = false, biggestLead = 0;
  for (const g of timeline) {
    if (g.mine) mine++; else theirs++;
    if (theirs > mine) wasBehind = true;
    biggestLead = Math.max(biggestLead, mine - theirs);
  }
  const won = myGoals > theirGoals, drew = myGoals === theirGoals;

  if (wasBehind && won) facts.push({ kind: 'comeback' });
  if (biggestLead >= 2 && !won) facts.push({ kind: 'collapse', n: biggestLead });

  // the last goal of the match, if it landed late and decided something
  const last = timeline[timeline.length - 1];
  if (last && last.minute >= LATE) {
    const before = timeline.slice(0, -1);
    const bm = before.filter(g => g.mine).length;
    const bt = before.length - bm;
    if (last.mine && bm === bt && won) facts.push({ kind: 'late_winner', minute: last.minute });
    else if (last.mine && bm < bt && drew) facts.push({ kind: 'late_equaliser', minute: last.minute });
    else if (!last.mine && bm > bt && !won) facts.push({ kind: 'late_concede', minute: last.minute });
  }

  /* cards, penalties, own goals */
  for (const e of ev) {
    if (e.type === 'red' && e.teamId === myId) facts.push({ kind: 'red_card', who: family(e.playerName), minute: e.minute });
    else if (e.type === 'red') facts.push({ kind: 'their_red', who: family(e.playerName), minute: e.minute });
    else if (e.type === 'penalty_miss' && e.teamId === myId) facts.push({ kind: 'penalty_miss', who: family(e.playerName), minute: e.minute });
    // theirs that did not go in. In a live match that is always a save, the
    // manager chose the corner himself
    else if (e.type === 'penalty_miss') facts.push({ kind: 'penalty_saved', who: family(e.playerName), minute: e.minute });
    else if (e.type === 'own_goal' && e.teamId === myId) facts.push({ kind: 'own_goal', who: family(e.playerName), minute: e.minute });
  }

  /* the night individual men had */
  const all = squad ? [...squad.starters, ...squad.bench] : [];
  const rated = all
    .map(p => ({ p, r: r.ratings?.[p.id] ?? 0 }))
    .filter(x => x.r > 0)
    .sort((a, b) => b.r - a.r);
  const best = rated[0];
  if (best && best.r >= 8) facts.push({ kind: 'star_rating', who: family(best.p.name), n: Math.round(best.r * 10) / 10 });
  // the floor. Even a night when nothing happened had a best player in it, so
  // the reporter always has one thing about THIS match to open with
  else if (best) facts.push({ kind: 'top_man', who: family(best.p.name), n: Math.round(best.r * 10) / 10 });
  const gk = all.find(p => p.position === 'GK' && (r.ratings?.[p.id] ?? 0) > 0);
  if (gk && (r.ratings?.[gk.id] ?? 0) >= 7.6 && theirGoals <= 1) {
    facts.push({ kind: 'keeper_hero', who: family(gk.name), n: Math.round((r.ratings![gk.id]) * 10) / 10 });
  }

  /* the shape of the performance */
  // a shape changed in the dressing room is judged by the half that followed
  if (r.shape) {
    const iAmHome = r.home.id === myId;
    const before = r.shape.atHalf[iAmHome ? 0 : 1] - r.shape.atHalf[iAmHome ? 1 : 0];
    const after = (iAmHome ? r.score[0] - r.score[1] : r.score[1] - r.score[0]) - before;
    // a half won is a change that worked, and so is a lead held quietly. A
    // deficit that stayed a deficit is not
    const worked = after > 0 || (after === 0 && before > 0);
    facts.push({ kind: worked ? 'shape_worked' : 'shape_failed', who: r.shape.to, n: after });
  }
  if (theirGoals === 0) facts.push({ kind: 'clean_sheet' });
  const myStats = r.home.id === myId ? r.home.stats : r.away.stats;
  if (myGoals === 0 && (myStats?.chances ?? 0) <= 1) facts.push({ kind: 'toothless' });

  return facts.sort((a, b) => WEIGHT[b.kind] - WEIGHT[a.kind]);
}
