/**
 * The manager's chronicle. Small autobiography that writes itself: first win,
 * derby survived, comeback from 0:2, a kid's first goal. Nothing in here is
 * shown mid-play, entries pile up quietly and the manager visits them from the
 * hub. This is the reason to come back for another season.
 *
 * Pure data. Detection reads (prev, next, playerResult) and returns entries to
 * append. Never mutates. Ordering is by week ascending, then by internal order.
 */

import type { GameState, RoundResult } from './state.ts';
import { surnameOf } from '../data/names.ts';
import type { MatchResult, MatchEvent } from '../engine/matchEngine.ts';
import { sortedTable } from './league.ts';
import { isDerby } from '../data/clubs.ts';
import type { IconName } from '../ui/components/Icon.tsx';

export type ChronicleKind =
  | 'sacked'
  | 'first_win'
  | 'first_loss'
  | 'big_win'
  | 'derby_win'
  | 'derby_loss'
  | 'comeback'
  | 'top_of_table'
  | 'streak_broken'
  | 'youngster_scored'
  | 'season_end'
  | 'sold'
  | 'ex_scored';

export interface ChronicleEntry {
  id: string;              // stable, dedupe-safe
  kind: ChronicleKind;
  week: number;            // league week when it happened, 0 = pre-season
  title: string;
  body: string;
  icon: IconName;
  tint: 'gold' | 'win' | 'loss' | 'draw';
}

const tint = (kind: ChronicleKind): ChronicleEntry['tint'] => {
  switch (kind) {
    case 'first_loss':
    case 'derby_loss':
    case 'sacked': return 'loss';
    case 'streak_broken':
    case 'top_of_table':
    case 'youngster_scored': return 'gold';
    case 'season_end': return 'gold';
    case 'sold': return 'draw';
    case 'ex_scored': return 'loss';
    default: return 'win';
  }
};

const icon = (kind: ChronicleKind): IconName => {
  switch (kind) {
    case 'first_win': return 'trophy';
    case 'first_loss': return 'alert';
    case 'big_win': return 'flame';
    case 'derby_win': return 'flag';
    case 'derby_loss': return 'flag';
    case 'comeback': return 'flame';
    case 'top_of_table': return 'star';
    case 'streak_broken': return 'target';
    case 'youngster_scored': return 'boot';
    case 'season_end': return 'trophy';
    case 'sacked': return 'alert';
    case 'sold': return 'handshake';
    case 'ex_scored': return 'boot';
  }
};

interface Ctx {
  prev: GameState;
  next: GameState;
  result: MatchResult;
  playerRound: RoundResult;
  iAmHome: boolean;
  myGoals: number;
  oppGoals: number;
  outcome: 'W' | 'D' | 'L';
  rivalId: string;
  rivalName: string;
}

function makeCtx(prev: GameState, next: GameState, result: MatchResult): Ctx {
  const fx = prev.league.fixtures.find(f => f.round === prev.week && (f.homeId === prev.clubId || f.awayId === prev.clubId))!;
  const iAmHome = fx.homeId === prev.clubId;
  const myGoals = iAmHome ? result.score[0] : result.score[1];
  const oppGoals = iAmHome ? result.score[1] : result.score[0];
  const outcome: 'W' | 'D' | 'L' = myGoals > oppGoals ? 'W' : myGoals === oppGoals ? 'D' : 'L';
  const rivalId = iAmHome ? fx.awayId : fx.homeId;
  const rivalClub = prev.league.clubs.find(c => c.id === rivalId)!;
  return {
    prev, next, result,
    playerRound: { homeId: fx.homeId, awayId: fx.awayId, hg: result.score[0], ag: result.score[1] },
    iAmHome, myGoals, oppGoals, outcome,
    rivalId, rivalName: rivalClub.short,
  };
}

/** Rolling sequence of goals through the match, in order. */
function goalTimeline(events: MatchEvent[], myClubId: string) {
  const line: { minute: number; forMe: boolean }[] = [];
  for (const e of events) {
    if (e.type === 'goal' || e.type === 'penalty_goal') {
      line.push({ minute: e.minute, forMe: e.teamId === myClubId });
    } else if (e.type === 'own_goal') {
      // own goal counts for the other team
      line.push({ minute: e.minute, forMe: e.teamId !== myClubId });
    }
  }
  return line;
}

function wasBehindAtAnyPoint(line: { forMe: boolean }[]): boolean {
  let my = 0, opp = 0;
  for (const g of line) {
    if (g.forMe) my++; else opp++;
    if (opp > my) return true;
  }
  return false;
}

/**
 * Ordering matters. We compute detectors as an array to guarantee a stable
 * append order (comeback before big_win, derby before first_win, etc). No
 * side effects, each detector returns an entry or null.
 */
function detectors(c: Ctx): (ChronicleEntry | null)[] {
  const wk = c.prev.week;
  const seenKinds = new Set(c.prev.chronicle.map(e => e.kind));
  const derbyGame = isDerby(c.playerRound.homeId, c.playerRound.awayId);
  const line = goalTimeline(c.result.events, c.prev.clubId);
  const comeback = c.outcome === 'W' && wasBehindAtAnyPoint(line);

  // top of table after this round?
  const tableAfter = sortedTable(c.next.league);
  const posAfter = tableAfter.findIndex(s => s.clubId === c.prev.clubId) + 1;

  // losing streak broken? previous form had 3+ L in a row and this game was W or D
  let prevLossStreak = 0;
  for (let i = c.prev.form.length - 1; i >= 0 && c.prev.form[i] === 'L'; i--) prevLossStreak++;
  const streakBroken = prevLossStreak >= 3 && c.outcome !== 'L';

  // youngster who scored their first career goal
  const mineStarters = c.prev.league.squads[c.prev.clubId].starters;
  const mineBench = c.prev.league.squads[c.prev.clubId].bench;
  const roster = [...mineStarters, ...mineBench];
  let youngScorer: { name: string; age: number; minute: number } | null = null;
  for (const e of c.result.events) {
    if (e.teamId !== c.prev.clubId) continue;
    if (e.type !== 'goal' && e.type !== 'penalty_goal') continue;
    const p = roster.find(x => x.id === e.playerId);
    if (!p || p.age > 20) continue;
    const prevGoals = c.prev.seasonStats[p.id]?.goals ?? 0;
    if (prevGoals !== 0) continue;
    youngScorer = { name: p.name, age: p.age, minute: e.minute };
    break;
  }

  // a man you sold, scoring against you in his new shirt
  const exIds = new Set(c.prev.exits.map(e => e.id));
  const exGoal = c.result.events.find(e => e.teamId !== c.prev.clubId && (e.type === 'goal' || e.type === 'penalty_goal') && exIds.has(e.playerId));

  return [
    exGoal ? {
      id: `ex-scored-w-`, kind: 'ex_scored', week: wk, icon: icon('ex_scored'), tint: tint('ex_scored'),
      title: ` כבש נגדנו`,
      body: `מכרת אותו ל, והוא חזר להזכיר לך בדקה . ככה זה עם שחקנים שעוזבים.`,
    } : null,

    // Comeback beats "big win" as the headline moment when both are true
    comeback ? {
      id: `comeback-w${wk}`, kind: 'comeback', week: wk, icon: icon('comeback'), tint: tint('comeback'),
      title: 'קאמבק שלא נשכח',
      body: `היינו מאחור, סגרנו ${c.myGoals}:${c.oppGoals} מול ${c.rivalName}. יש דברים שנשארים בקבוצה גם לעונה הבאה.`,
    } : null,

    derbyGame && c.outcome === 'W' ? {
      id: `derby-win-w${wk}`, kind: 'derby_win', week: wk, icon: icon('derby_win'), tint: tint('derby_win'),
      title: `שרפנו את ${c.rivalName} בדרבי`,
      body: `${c.myGoals}:${c.oppGoals}. מהערבים כאלה מזכירים אותך.`,
    } : null,

    derbyGame && c.outcome === 'L' ? {
      id: `derby-loss-w${wk}`, kind: 'derby_loss', week: wk, icon: icon('derby_loss'), tint: tint('derby_loss'),
      title: `הפסד דרבי מול ${c.rivalName}`,
      body: `${c.oppGoals}:${c.myGoals}. השבוע הבא מרגיש ארוך.`,
    } : null,

    c.outcome === 'W' && (c.myGoals - c.oppGoals) >= 3 && !comeback ? {
      id: `big-win-w${wk}`, kind: 'big_win', week: wk, icon: icon('big_win'), tint: tint('big_win'),
      title: `הצגה של ${c.myGoals}:${c.oppGoals}`,
      body: `${c.rivalName} לא ידעה מאיפה זה בא. יום כזה זוכרים.`,
    } : null,

    c.outcome === 'W' && !seenKinds.has('first_win') ? {
      id: 'first-win', kind: 'first_win', week: wk, icon: icon('first_win'), tint: tint('first_win'),
      title: 'הניצחון הראשון בקריירה',
      body: `${c.myGoals}:${c.oppGoals} מול ${c.rivalName}. הרגע שבו הבנת שאתה שייך לפה.`,
    } : null,

    c.outcome === 'L' && !seenKinds.has('first_loss') ? {
      id: 'first-loss', kind: 'first_loss', week: wk, icon: icon('first_loss'), tint: tint('first_loss'),
      title: 'ההפסד הראשון',
      body: `${c.oppGoals}:${c.myGoals} מול ${c.rivalName}. עכשיו יודעים איך זה מרגיש. הפעם הבאה לא תרגיש אותו דבר.`,
    } : null,

    posAfter === 1 && !seenKinds.has('top_of_table') ? {
      id: `top-w${wk}`, kind: 'top_of_table', week: wk, icon: icon('top_of_table'), tint: tint('top_of_table'),
      title: 'ראש הטבלה',
      body: 'התיישבנו בראש. עכשיו כולם יכינו אותנו אחרת. תיהנה מהיום.',
    } : null,

    streakBroken ? {
      id: `streak-w${wk}`, kind: 'streak_broken', week: wk, icon: icon('streak_broken'), tint: tint('streak_broken'),
      title: 'עצרנו את הרצף',
      body: `${prevLossStreak} הפסדים ברצף, השבוע ${c.outcome === 'W' ? 'ניצחון' : 'נקודה יקרה'} מול ${c.rivalName}. חדר ההלבשה נושם שוב.`,
    } : null,

    youngScorer ? {
      id: `youngster-${youngScorer.name}-w${wk}`, kind: 'youngster_scored', week: wk, icon: icon('youngster_scored'), tint: tint('youngster_scored'),
      title: `${surnameOf(youngScorer.name)}, ${youngScorer.age}`,
      body: `הכישרון הצעיר שגילית פתח חשבון בדקה ${youngScorer.minute}. יום מסמן.`,
    } : null,
  ];
}

/** New chronicle entries produced by the round we just committed. */
export function chronicleAfterRound(prev: GameState, next: GameState, result: MatchResult): ChronicleEntry[] {
  const c = makeCtx(prev, next, result);
  const seenIds = new Set(prev.chronicle.map(e => e.id));
  return detectors(c).filter((e): e is ChronicleEntry => !!e && !seenIds.has(e.id));
}

/** One summary card at the end of a season. */
export function chronicleAtSeasonEnd(gs: GameState): ChronicleEntry | null {
  const table = sortedTable(gs.league);
  const pos = table.findIndex(s => s.clubId === gs.clubId) + 1;
  const total = table.length;
  const wk = gs.league.rounds;

  let title: string, body: string;
  if (pos === 1) {
    title = 'סיימנו ראשונים';
    body = `אליפות. מהעונה הזאת נזכרים לאורך הרבה שנים.`;
  } else if (pos <= 3) {
    title = `סיום עונה במקום ${pos}`;
    body = 'עונה חזקה. הבעלים מרוצה, האוהדים דורשים עוד.';
  } else if (pos >= total - 1) {
    title = `סיום עונה במקום ${pos} מתוך ${total}`;
    body = 'קרב הישרדות עד הסוף. יש על מה לחשוב בחופש.';
  } else {
    title = `סיום עונה במקום ${pos} מתוך ${total}`;
    body = 'עונה יציבה. עכשיו זה הזמן לחשוב איך מזיזים את הקבוצה קדימה.';
  }

  const id = `season-end-y${wk}-p${pos}`;
  if (gs.chronicle.some(e => e.id === id)) return null;
  return { id, kind: 'season_end', week: wk, icon: icon('season_end'), tint: tint('season_end'), title, body };
}
