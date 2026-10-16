/**
 * The pictures of a match moment (Itzik, 16.10: "that there are several of everything, variety").
 *
 * Two worlds. ליגה ג׳, ב׳ and א׳ play on a Friday noon at a neighbourhood ground (a fence, eucalyptus trees, blocks with
 * solar heaters, a few hundred people): the DAY set. The Leumit and ליגת העל play at night in a floodlit stadium: the NIGHT
 * set, which is the one the game always had. Europe keeps its own pictures and is not touched here.
 *
 * Paths are root-relative ("/moments/..."); the screen wraps them with asset(). Every moment has two build-up angles in each world, chosen by the match's seed so two penalties in a row do not look the
 * same, and every outcome has its own frame in each world, shot from the build-up of its world so the ground, the kits and
 * the light never jump between the question and the answer.
 */
import type { MomentKind } from '../game/liveMatch.ts';

export type MomentWorld = 'day' | 'night';

/** The highest division that plays by day: ליגה א׳. From the Leumit up it is night. */
export const DAY_MAX_TIER = 3;

export function momentWorld(tier: number): MomentWorld {
  return tier <= DAY_MAX_TIER ? 'day' : 'night';
}

/** The folder under public/moments for each decision moment. The touchline (tactic) has its own pictures by tier. */
export const MOMENT_FOLDER: Record<Exclude<MomentKind, 'tactic'>, string> = {
  penalty: 'penalty', def_penalty: 'def-penalty', shot: 'shot', free_kick: 'free-kick',
  one_on_one: 'one-on-one', def_keeper: 'def-keeper', def_tackle: 'def-tackle',
};

/** Which of the two angles this match shows for this moment: a cheap hash of the match seed and the kind. */
export function momentVariant(seed: number, kind: string): 'a' | 'b' {
  let h = (seed >>> 0) ^ 0x51ed27;
  for (let i = 0; i < kind.length; i++) h = Math.imul(h ^ kind.charCodeAt(i), 16777619) >>> 0;
  return (h >>> 3) % 2 === 0 ? 'a' : 'b';
}

/** The picture a moment opens on. */
export function buildupImg(kind: Exclude<MomentKind, 'tactic'>, world: MomentWorld, seed: number): string {
  const f = MOMENT_FOLDER[kind];
  const v = momentVariant(seed, kind);
  if (world === 'day') return `/moments/${f}/day-${v}.webp`;
  return v === 'a' ? `/moments/${f}/buildup.webp` : `/moments/${f}/night-b.webp`;
}

/** The picture of what happened, by the outcome's file name (goal-left, save-center, wall, rush-save, slide-red...). */
export function outcomeImg(kind: Exclude<MomentKind, 'tactic'>, world: MomentWorld, name: string): string {
  const f = MOMENT_FOLDER[kind];
  return world === 'day' ? `/moments/${f}/day-${name}.webp` : `/moments/${f}/${name}.webp`;
}

/** Every outcome name a moment can end on, for the preload and the check. */
export const OUTCOME_NAMES: Record<Exclude<MomentKind, 'tactic'>, string[]> = {
  penalty: ['goal-left', 'goal-center', 'goal-right', 'save-left', 'save-center', 'save-right'],
  def_penalty: ['goal-left', 'goal-center', 'goal-right', 'save-left', 'save-center', 'save-right'],
  free_kick: ['goal-left', 'goal-center', 'goal-right', 'save-left', 'save-center', 'save-right', 'wall'],
  shot: ['goal-left', 'goal-center', 'goal-right', 'save-left', 'save-center', 'save-right', 'wide-left', 'wide-right'],
  one_on_one: ['dribble-goal', 'dribble-save', 'finish-goal', 'finish-miss'],
  def_keeper: ['rush-save', 'rush-goal', 'stay-save', 'stay-goal'],
  def_tackle: ['slide-clear', 'slide-yellow', 'slide-red', 'slide-beaten', 'hold-contain', 'hold-2v1'],
};

/** The build-ups of one world, both angles: what a match warms first. */
export function buildupsOf(world: MomentWorld): string[] {
  const out: string[] = [];
  for (const kind of Object.keys(MOMENT_FOLDER) as Array<keyof typeof MOMENT_FOLDER>) {
    for (const v of ['a', 'b'] as const) {
      const f = MOMENT_FOLDER[kind];
      out.push(world === 'day' ? `/moments/${f}/day-${v}.webp` : v === 'a' ? `/moments/${f}/buildup.webp` : `/moments/${f}/night-b.webp`);
    }
  }
  return out;
}

/** Every outcome frame of one world. */
export function outcomesOf(world: MomentWorld): string[] {
  const out: string[] = [];
  for (const kind of Object.keys(OUTCOME_NAMES) as Array<keyof typeof OUTCOME_NAMES>) {
    for (const name of OUTCOME_NAMES[kind]) out.push(outcomeImg(kind, world, name));
  }
  return out;
}
