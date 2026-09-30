/**
 * The four formations you can pick, and the shape each one draws on the pitch.
 *
 * One source of truth: the tactics screen reads the labels, the match engine
 * reads the att/def multipliers, and the 2D pitch reads the slots. Change a
 * number here and every one of them moves together.
 *
 * A slot is (d, y) inside the team's own block, never an absolute pitch spot:
 * d 0 is the deepest line, d 1 the highest, y 0 the left touchline. The pitch
 * stretches that block forward or squeezes it back depending on where play is,
 * which is what keeps the lines apart instead of collapsing into a clump.
 */

import type { Player } from '../engine/matchEngine.ts';

export type FormationId = '4-4-2' | '4-3-3' | '4-5-1' | '5-4-1' | '3-5-2' | '4-2-3-1' | '3-4-3';
export type Line = 'GK' | 'DEF' | 'MID' | 'FWD';

/** What a slot IS on the pitch, which is not always what its player is. */
export type SlotRole =
  | 'GK' | 'LB' | 'RB' | 'CB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'ST';

export interface FormationSlot {
  d: number;
  y: number;
  line: Line;
  /** the shirt this slot wears: RB, not "a defender" */
  role: SlotRole;
  /** how this slot breaks shape when his team is on top, see LivePitch */
  brk?: { d: number; y: number };
}

export interface Formation {
  id: FormationId;
  /** the numbers, for the big label */
  label: string;
  name: string;
  desc: string;
  /** defenders, midfielders, forwards */
  counts: [number, number, number];
  /** what it is worth in the rating model */
  att: number;
  def: number;
  /**
   * How much of the ball it wins, the midfield rating: possession, and the chances
   * that follow from it. Before this every shape had the same, so nothing that
   * called itself control controlled anything.
   */
  mid: number;
  /**
   * Where the block sits before play pulls it about. A back five defends ten
   * metres deeper than a front three does, and that shows up on the map.
   */
  line: number;
  slots: FormationSlot[];   // 11, index 0 is always the keeper
}

/**
 * WHY att AND def ARE NOT ROUND NUMBERS.
 *
 * Every squad in the game is generated to one fixed spread of positions
 * (squadGen.ts: GK RB CB CB LB CDM CM CAM RW ST LW), which is a natural 4-3-3.
 * So choosing any other shape costs rating before a shape's own numbers are
 * read at all: measured across fourteen careers, the effective eleven is worth
 * 0.83 less in 4-5-1, 1.39 less in 4-4-2 and 2.00 less in 5-4-1. Left alone
 * that made 4-3-3 the right answer and the other three traps, and the default
 * the game starts everybody in was the second worst of the four.
 *
 * These numbers pay that back. A back five IS harder to break down, so 5-4-1
 * carrying the biggest defensive bonus is the honest way to charge for it
 * rather than a thumb on the scale.
 *
 * Calibrated against the measurement, not by feel: formation-check plays three
 * thousand matches per pairing with identical squads and home alternated, and
 * fails if any shape has a real edge over every other or if any pairing is more
 * than fourteen points apart. Before this they were 14.8 apart at the widest;
 * after, 3.1.
 *
 * AND WHY THE SHAPES ARE NOT TWINS.
 *
 * Balanced is not the same as different. 3-5-2 and 4-2-3-1 came out within a
 * hundredth of a goal of 4-4-2 in everything a manager could see, so changing to
 * either at half time changed nothing, and possession was the same forty nine to
 * fifty one per cent in every shape because none of them had a midfield number.
 * Each now has a character: 4-5-1 and 4-2-3-1 keep the ball (52 per cent against
 * 4-4-2), 3-5-2 gives it away for more open play (48), and formation-check holds
 * every pair apart in goals or possession as well as holding them level in wins.
 */
export const FORMATIONS: Formation[] = [
  {
    id: '4-4-2',
    label: '4-4-2',
    name: 'מאוזן',
    desc: 'שני בלמים ומגן בכל צד, ארבעה בקישור, שני חלוצים באמצע. בלי הפתעות, בלי חורים.',
    counts: [4, 4, 2],
    // See the note on calibration under FORMATIONS.
    att: 1.02, def: 1.03, mid: 1.00, line: 0.00,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.09, y: 0.13, line: 'DEF', role: 'LB', brk: { d: 0.52, y: -0.09 } },   // מגן שמאל עולה על הקו
      { d: 0.00, y: 0.37, line: 'DEF', role: 'CB', brk: { d: 0.26, y: 0.04 } },
      { d: 0.00, y: 0.63, line: 'DEF', role: 'CB', brk: { d: 0.26, y: -0.04 } },
      { d: 0.09, y: 0.87, line: 'DEF', role: 'RB', brk: { d: 0.52, y: 0.09 } },    // מגן ימין עולה על הקו
      { d: 0.50, y: 0.11, line: 'MID', role: 'LM', brk: { d: 0.28, y: -0.05 } },   // קשר אגף
      { d: 0.40, y: 0.39, line: 'MID', role: 'CM', brk: { d: 0.40, y: 0.04 } },    // ריצה מאוחרת מהאמצע
      { d: 0.40, y: 0.61, line: 'MID', role: 'CM', brk: { d: 0.40, y: -0.04 } },
      { d: 0.50, y: 0.89, line: 'MID', role: 'RM', brk: { d: 0.28, y: 0.05 } },
      { d: 0.92, y: 0.39, line: 'FWD', role: 'ST', brk: { d: -0.30, y: 0.06 } },   // חלוץ יורד לקבל
      { d: 0.92, y: 0.61, line: 'FWD', role: 'ST', brk: { d: 0.06, y: -0.06 } },
    ],
  },
  {
    id: '4-3-3',
    label: '4-3-3',
    name: 'התקפי',
    desc: 'שני בלמים ומגן בכל צד, שלושה קשרים, שלושה קדימה. יוצרים הרבה יותר, נפתחים מאחור.',
    counts: [4, 3, 3],
    att: 1.03, def: 0.96, mid: 1.00, line: 0.055,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.10, y: 0.14, line: 'DEF', role: 'LB', brk: { d: 0.56, y: -0.10 } },
      { d: 0.00, y: 0.37, line: 'DEF', role: 'CB', brk: { d: 0.28, y: 0.05 } },
      { d: 0.00, y: 0.63, line: 'DEF', role: 'CB', brk: { d: 0.28, y: -0.05 } },
      { d: 0.10, y: 0.86, line: 'DEF', role: 'RB', brk: { d: 0.56, y: 0.10 } },
      { d: 0.52, y: 0.25, line: 'MID', role: 'CM', brk: { d: 0.36, y: 0.05 } },
      { d: 0.40, y: 0.50, line: 'MID', role: 'CDM', brk: { d: 0.32, y: 0.00 } },
      { d: 0.52, y: 0.75, line: 'MID', role: 'CM', brk: { d: 0.36, y: -0.05 } },
      { d: 0.90, y: 0.13, line: 'FWD', role: 'LW', brk: { d: 0.08, y: 0.20 } },    // כנף חותך פנימה
      { d: 1.00, y: 0.50, line: 'FWD', role: 'ST', brk: { d: -0.34, y: 0.00 } },   // חלוץ יורד
      { d: 0.90, y: 0.87, line: 'FWD', role: 'RW', brk: { d: 0.08, y: -0.20 } },
    ],
  },
  {
    id: '4-5-1',
    label: '4-5-1',
    name: 'שליטה',
    desc: 'שני בלמים ומגן בכל צד, חמישה בקישור, חלוץ בודד. שולטים בכדור ובאמצע, החלוץ עובד לבד למעלה.',
    counts: [4, 5, 1],
    att: 0.96, def: 1.06, mid: 1.06, line: -0.02,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.09, y: 0.13, line: 'DEF', role: 'LB', brk: { d: 0.46, y: -0.08 } },
      { d: 0.00, y: 0.37, line: 'DEF', role: 'CB', brk: { d: 0.24, y: 0.04 } },
      { d: 0.00, y: 0.63, line: 'DEF', role: 'CB', brk: { d: 0.24, y: -0.04 } },
      { d: 0.09, y: 0.87, line: 'DEF', role: 'RB', brk: { d: 0.46, y: 0.08 } },
      { d: 0.54, y: 0.11, line: 'MID', role: 'LM', brk: { d: 0.30, y: -0.03 } },   // קשר אגף, מצטרף לחלוץ
      { d: 0.48, y: 0.32, line: 'MID', role: 'CM', brk: { d: 0.36, y: 0.06 } },    // הקשרים הפנימיים רצים לקופסה
      { d: 0.34, y: 0.50, line: 'MID', role: 'CDM', brk: { d: 0.22, y: 0.00 } },   // העוגן נשאר
      { d: 0.48, y: 0.68, line: 'MID', role: 'CM', brk: { d: 0.36, y: -0.06 } },
      { d: 0.54, y: 0.89, line: 'MID', role: 'RM', brk: { d: 0.30, y: 0.03 } },
      { d: 0.94, y: 0.50, line: 'FWD', role: 'ST', brk: { d: -0.22, y: 0.08 } },   // החלוץ הבודד יורד ומושך בלם
    ],
  },
  {
    id: '5-4-1',
    label: '5-4-1',
    name: 'הגנתי',
    desc: 'שלושה בלמים ומגן בכל צד, ארבעה בקישור, חלוץ בודד. קשה לפרוץ, קשה גם לצאת.',
    counts: [5, 4, 1],
    att: 0.94, def: 1.13, mid: 1.00, line: -0.065,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.16, y: 0.09, line: 'DEF', role: 'LWB', brk: { d: 0.58, y: -0.05 } },   // מגן כנף רץ את כל הקו
      { d: 0.00, y: 0.28, line: 'DEF', role: 'CB', brk: { d: 0.20, y: 0.04 } },
      { d: 0.00, y: 0.50, line: 'DEF', role: 'CB', brk: { d: 0.16, y: 0.00 } },
      { d: 0.00, y: 0.72, line: 'DEF', role: 'CB', brk: { d: 0.20, y: -0.04 } },
      { d: 0.16, y: 0.91, line: 'DEF', role: 'RWB', brk: { d: 0.58, y: 0.05 } },
      { d: 0.48, y: 0.13, line: 'MID', role: 'LM', brk: { d: 0.30, y: -0.04 } },
      { d: 0.36, y: 0.40, line: 'MID', role: 'CM', brk: { d: 0.34, y: 0.04 } },
      { d: 0.36, y: 0.60, line: 'MID', role: 'CM', brk: { d: 0.34, y: -0.04 } },
      { d: 0.48, y: 0.87, line: 'MID', role: 'RM', brk: { d: 0.30, y: 0.04 } },
      { d: 0.94, y: 0.50, line: 'FWD', role: 'ST', brk: { d: -0.26, y: 0.10 } },   // החלוץ הבודד רץ לערוצים
    ],
  },
  {
    id: '3-5-2',
    label: '3-5-2',
    name: 'רוחב',
    desc: 'שלושה בלמים, מגני כנף שרצים את כל הקו, שלושה באמצע ושני חלוצים. הרוחב מגיע מאחור.',
    // The wing backs count with the defence, the same way 5-4-1's do: a shape
    // is filled line by line off these numbers, so a wing back listed in MID
    // sends the squad's full backs into centre back shirts and midfielders out
    // to the touchline. The label is the one people know, 3-5-2, and when the
    // ball is lost it is a five, which is what these numbers describe.
    counts: [5, 3, 2],
    att: 1.07, def: 1.03, mid: 0.97, line: 0.00,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.00, y: 0.30, line: 'DEF', role: 'CB', brk: { d: 0.22, y: 0.04 } },
      { d: 0.00, y: 0.50, line: 'DEF', role: 'CB', brk: { d: 0.18, y: 0.00 } },
      { d: 0.00, y: 0.70, line: 'DEF', role: 'CB', brk: { d: 0.22, y: -0.04 } },
      { d: 0.34, y: 0.07, line: 'DEF', role: 'LWB', brk: { d: 0.54, y: -0.03 } },   // כל הקו שלו
      { d: 0.34, y: 0.93, line: 'DEF', role: 'RWB', brk: { d: 0.54, y: 0.03 } },
      { d: 0.44, y: 0.31, line: 'MID', role: 'CM', brk: { d: 0.36, y: 0.05 } },
      { d: 0.32, y: 0.50, line: 'MID', role: 'CDM', brk: { d: 0.24, y: 0.00 } },
      { d: 0.44, y: 0.69, line: 'MID', role: 'CM', brk: { d: 0.36, y: -0.05 } },
      { d: 0.92, y: 0.39, line: 'FWD', role: 'ST', brk: { d: -0.28, y: 0.06 } },
      { d: 0.92, y: 0.61, line: 'FWD', role: 'ST', brk: { d: 0.06, y: -0.06 } },
    ],
  },
  {
    id: '4-2-3-1',
    label: '4-2-3-1',
    name: 'יצירתי',
    desc: 'שני בלמים ומגן בכל צד, שני עוגנים מאחור, שלושה יוצרים מלפנים וחלוץ. יוצרים מהאמצע, אבל אין רוחב טבעי.',
    counts: [4, 5, 1],
    att: 1.04, def: 1.00, mid: 1.05, line: 0.015,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.09, y: 0.13, line: 'DEF', role: 'LB', brk: { d: 0.50, y: -0.09 } },
      { d: 0.00, y: 0.37, line: 'DEF', role: 'CB', brk: { d: 0.26, y: 0.04 } },
      { d: 0.00, y: 0.63, line: 'DEF', role: 'CB', brk: { d: 0.26, y: -0.04 } },
      { d: 0.09, y: 0.87, line: 'DEF', role: 'RB', brk: { d: 0.50, y: 0.09 } },
      { d: 0.30, y: 0.38, line: 'MID', role: 'CDM', brk: { d: 0.22, y: 0.03 } },    // שני העוגנים לא עוזבים
      { d: 0.30, y: 0.62, line: 'MID', role: 'CDM', brk: { d: 0.22, y: -0.03 } },
      { d: 0.62, y: 0.14, line: 'MID', role: 'LM', brk: { d: 0.24, y: 0.12 } },     // חותך פנימה מאחורי החלוץ
      { d: 0.68, y: 0.50, line: 'MID', role: 'CAM', brk: { d: 0.26, y: 0.00 } },
      { d: 0.62, y: 0.86, line: 'MID', role: 'RM', brk: { d: 0.24, y: -0.12 } },
      { d: 0.96, y: 0.50, line: 'FWD', role: 'ST', brk: { d: -0.24, y: 0.07 } },
    ],
  },
  {
    id: '3-4-3',
    label: '3-4-3',
    name: 'לוחץ',
    desc: 'שלושה בלמים, ארבעה בקישור ושלושה קדימה. לוחצים גבוה ומחפשים את השער, ומאחור זה דק.',
    // The four is two wing backs and two centre midfielders, which is what a
    // 3-4-3 is. Written with wide midfielders instead it had no full back in it
    // anywhere, and every shape in this file has a left and a right.
    counts: [5, 2, 3],
    att: 1.095, def: 0.960, mid: 1.00, line: 0.06,
    slots: [
      { d: 0.00, y: 0.50, line: 'GK', role: 'GK' },
      { d: 0.00, y: 0.29, line: 'DEF', role: 'CB', brk: { d: 0.26, y: 0.05 } },
      { d: 0.00, y: 0.50, line: 'DEF', role: 'CB', brk: { d: 0.22, y: 0.00 } },
      { d: 0.00, y: 0.71, line: 'DEF', role: 'CB', brk: { d: 0.26, y: -0.05 } },
      { d: 0.42, y: 0.09, line: 'DEF', role: 'LWB', brk: { d: 0.46, y: -0.02 } },
      { d: 0.42, y: 0.91, line: 'DEF', role: 'RWB', brk: { d: 0.46, y: 0.02 } },
      { d: 0.40, y: 0.38, line: 'MID', role: 'CM', brk: { d: 0.34, y: 0.04 } },
      { d: 0.40, y: 0.62, line: 'MID', role: 'CM', brk: { d: 0.34, y: -0.04 } },
      { d: 0.90, y: 0.15, line: 'FWD', role: 'LW', brk: { d: 0.08, y: 0.18 } },
      { d: 1.00, y: 0.50, line: 'FWD', role: 'ST', brk: { d: -0.32, y: 0.00 } },
      { d: 0.90, y: 0.85, line: 'FWD', role: 'RW', brk: { d: 0.08, y: -0.18 } },
    ],
  },
];

export const DEFAULT_FORMATION: FormationId = '4-4-2';

/** What each slot is called, for the manager reading his own team sheet. */
export const ROLE_LABEL: Record<SlotRole, string> = {
  GK: 'שוער', LB: 'מגן שמאל', RB: 'מגן ימין', CB: 'בלם',
  LWB: 'מגן כנף שמאל', RWB: 'מגן כנף ימין',
  CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר התקפי',
  LM: 'קשר שמאל', RM: 'קשר ימין',
  LW: 'כנף שמאל', RW: 'כנף ימין', ST: 'חלוץ',
};

/**
 * Roles a player covers without really being out of position. A centre back at
 * left back is stretched but recognisable; a striker there is not. Used to tell
 * the manager which of his eleven are playing somewhere they do not belong,
 * which is the thing a list of names can never show him.
 */
const NEAR: Record<SlotRole, string[]> = {
  GK: [],
  LB: ['LB', 'LWB', 'LM'], RB: ['RB', 'RWB', 'RM'],
  LWB: ['LWB', 'LB', 'LM'], RWB: ['RWB', 'RB', 'RM'],
  CB: ['CB'],
  CDM: ['CDM', 'CM'], CM: ['CM', 'CDM', 'CAM'], CAM: ['CAM', 'CM'],
  LM: ['LM', 'LW', 'LB', 'CM'], RM: ['RM', 'RW', 'RB', 'CM'],
  LW: ['LW', 'LM', 'ST'], RW: ['RW', 'RM', 'ST'],
  ST: ['ST', 'CF', 'LW', 'RW'],
};

/** How well a player suits the slot he has been put in. */
/**
 * What a man is worth in a shirt that is not his. A centre back at right back
 * loses a little; a centre back up front loses a lot. This is the price the
 * engine charges, and the number the team sheet shows next to the red name,
 * so what the manager sees is exactly what the match will use.
 */
/**
 * A fourth level, for a man in goal who is not a keeper.
 *
 * "out" is the price of a shirt that is not yours: a centre back at right back,
 * a midfielder up front. Keeping goal is not a shirt, it is a different sport,
 * and the engine says so itself by rating keepers with their own formula off
 * their own attributes. Charged at the ordinary "out" rate it was measured as
 * costing between six per cent and NOTHING: in one of three clubs tested the
 * side actually conceded fewer with its best outfield man in goal than with
 * its real keeper, because 0.88 of a 55 beats a 49.
 *
 * NOGK is calibrated and not guessed. Itzik asked for about half again as many
 * goals conceded; measured over five clubs at 900 matches each, 0.44 lands on
 * +49% on average, between +44% and +54%. gk-check.mts holds it to that.
 */
export const FIT_MULT: Record<'natural' | 'covers' | 'out' | 'nogk', number> =
  { natural: 1.0, covers: 0.96, out: 0.88, nogk: 0.44 };

export function effectiveOverall(p: Player, role: SlotRole, ovr: number): number {
  return Math.round(ovr * FIT_MULT[roleFit(p.position, role)]);
}

export function roleFit(playerPos: string, role: SlotRole): 'natural' | 'covers' | 'out' | 'nogk' {
  if (playerPos === role) return 'natural';
  // an outfield man asked to keep goal. Not a shirt out of place, a different job
  if (role === 'GK') return 'nogk';
  if (NEAR[role].includes(playerPos)) return 'covers';
  // and a keeper anywhere but in goal is simply out of position
  return 'out';
}

const BY_ID = new Map(FORMATIONS.map(f => [f.id, f]));

export function formation(id: FormationId | undefined | null): Formation {
  return BY_ID.get(id as FormationId) ?? BY_ID.get(DEFAULT_FORMATION)!;
}

/** The AI teams do not all line up the same way, but each club is consistent. */
export function formationForClub(clubId: string): FormationId {
  let h = 2166136261;
  for (let i = 0; i < clubId.length; i++) { h ^= clubId.charCodeAt(i); h = Math.imul(h, 16777619); }
  return FORMATIONS[(h >>> 0) % FORMATIONS.length].id;
}

/* ------------------------------------------------------------ filling it */

const LINE_OF: Record<string, Line> = {
  GK: 'GK',
  LB: 'DEF', RB: 'DEF', CB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', DM: 'MID', AM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD', SS: 'FWD',
};

/**
 * Put eleven men into eleven slots, keeping the shape the manager picked.
 *
 * The squad does not always hold the exact line counts a formation wants, so a
 * short line borrows from the one next to it: a five at the back takes the
 * spare midfielder as a wing back rather than leaving the slot empty and the
 * formation broken. The returned array lines up index for index with slots.
 */
export function fillFormation(players: Player[], f: Formation): Player[] {
  const pool = players.slice();
  const grab = (want: Line[], n: number): Player[] => {
    const out: Player[] = [];
    for (const w of want) {
      for (let i = 0; i < pool.length && out.length < n; i++) {
        if (LINE_OF[pool[i].position] === w) out.push(...pool.splice(i--, 1));
      }
      if (out.length >= n) break;
    }
    while (out.length < n && pool.length) out.push(pool.shift()!);
    return out;
  };
  const [nd, nm, nf] = f.counts;
  const chosen = [
    ...grab(['GK'], 1),
    ...grab(['DEF', 'MID'], nd),
    ...grab(['MID', 'FWD', 'DEF'], nm),
    ...grab(['FWD', 'MID'], nf),
  ].slice(0, 11);
  return seatByFit(chosen, f);
}

/** natural 2, covers 1, out 0. What a pairing of man and shirt is worth. */
function fitScore(playerPos: string, role: SlotRole): number {
  const f = roleFit(playerPos, role);
  return f === 'natural' ? 2 : f === 'covers' ? 1 : 0;
}

/**
 * Sort each line so the right back is at right back.
 *
 * Picking WHO plays is one question, and which shirt each of them wears is
 * another. Grabbing by line answered only the first, so a squad holding a left
 * and a right back could line them up on the wrong sides, purely by the order
 * they happened to sit in the list. Within a line the men are now seated by how
 * well they fit the slot, which is cheap: a line is at most five, so every
 * arrangement can simply be tried.
 */
function seatByFit(chosen: Player[], f: Formation): Player[] {
  const out = chosen.slice();
  const byLine = new Map<Line, number[]>();
  f.slots.forEach((s, i) => {
    if (i >= chosen.length) return;
    const list = byLine.get(s.line) ?? [];
    list.push(i);
    byLine.set(s.line, list);
  });

  for (const idx of byLine.values()) {
    if (idx.length < 2) continue;
    const men = idx.map(i => chosen[i]);
    let best: Player[] | null = null;
    let bestScore = -1;
    for (const order of permutations(men)) {
      let score = 0;
      for (let k = 0; k < idx.length; k++) score += fitScore(order[k].position, f.slots[idx[k]].role);
      if (score > bestScore) { bestScore = score; best = order; }
    }
    if (best) idx.forEach((i, k) => { out[i] = best![k]; });
  }
  return out;
}

/** Every arrangement of a short list. A line is never more than five men. */
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i++) {
    const rest = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutations(rest)) out.push([xs[i], ...p]);
  }
  return out;
}
