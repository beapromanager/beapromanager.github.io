/**
 * The coach in a summit shootout (R6): which of his six reactions follows each kick and the end, as data, so the
 * check can hold every case still. Only the coach the game already has (public/coach/guide.webp, celebrate.mp4);
 * the six clips are Itzik's to make in Higgsfield from those two (HIGGSFIELD-SUMMIT.md), and until a clip is there
 * the same two files play it with a movement of their own and a line under them.
 */
export type CoachClip = 'pen-user-goal' | 'pen-user-miss' | 'pen-opp-goal' | 'pen-opp-miss' | 'pen-win' | 'pen-loss';

/** How the fallback moves: a leap, the head down, a small tight shake, a fist pump, away towards the fans, into the dark. */
export type CoachMove = 'leap' | 'head-down' | 'tight-clap' | 'fist' | 'run-off' | 'tunnel';

/**
 * A kick, from his bench: his man scored or missed, theirs scored or missed. Their goal is a tight clap to lift his
 * own side, not joy; their miss is a fist, as if his own man had scored.
 */
export function coachClipForKick(side: 'me' | 'them', scored: boolean): CoachClip {
  if (side === 'me') return scored ? 'pen-user-goal' : 'pen-user-miss';
  return scored ? 'pen-opp-goal' : 'pen-opp-miss';
}

/** The shootout decided: he runs to the fans, or walks into the tunnel and the lights go out. */
export const coachClipForEnd = (winner: 'me' | 'them'): CoachClip => (winner === 'me' ? 'pen-win' : 'pen-loss');

export interface CoachFallback {
  /** the existing coach file it plays: the cheering clip, or the still portrait */
  media: 'celebrate' | 'guide';
  move: CoachMove;
  /** the line under him, so nothing is told by movement alone */
  label: string;
}

export const COACH_FALLBACK: Record<CoachClip, CoachFallback> = {
  'pen-user-goal': { media: 'celebrate', move: 'leap', label: 'המאמן מריע' },
  'pen-user-miss': { media: 'guide', move: 'head-down', label: 'המאמן מוריד את הראש' },
  'pen-opp-goal': { media: 'guide', move: 'tight-clap', label: 'המאמן מוחא כפיים, הפנים מתוחות' },
  'pen-opp-miss': { media: 'celebrate', move: 'fist', label: 'אגרוף באוויר' },
  'pen-win': { media: 'celebrate', move: 'run-off', label: 'המאמן רץ אל האוהדים' },
  'pen-loss': { media: 'guide', move: 'tunnel', label: 'המאמן נכנס למנהרה' },
};

/** How long each reaction plays: a kick's 1.5s, the end's 3.5s. It never holds the next kick: the button is there at once. */
export const COACH_MS: Record<CoachClip, number> = {
  'pen-user-goal': 1500, 'pen-user-miss': 1500, 'pen-opp-goal': 1500, 'pen-opp-miss': 1500, 'pen-win': 3500, 'pen-loss': 3500,
};

/** How dark the edges and how strong the crowd's breath in a summit shootout: the whole way, from the first kick. */
export const SHOOTOUT_TENSION = 0.85;
