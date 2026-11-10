/**
 * The history between him and a summit club, in one line (R10). Shown on the rival card and in the golden book,
 * and only after they have met at least once: no meeting, no line. Every line is built from what really happened
 * between them (who went through, when, a comeback, a late goal, a shootout, a red card), picked on a seed so the
 * same night reads the same line on every reload.
 *
 * DRAFTS: every line here is a first wording for Itzik to correct.
 */
import type { Meeting } from './summitMemory.ts';
import { ROUND_IN, EURO_ROUNDS } from './euro.ts';
import { createRng } from '../engine/matchEngine.ts';

export type RivalryCategory =
  | 'second' | 'revenge' | 'dominance' | 'finalAgain' | 'comebackMemory' | 'lastMinuteMemory' | 'pensMemory'
  | 'redMemory' | 'eternalDraw' | 'thirdDecides' | 'curse' | 'seasonsGap' | 'cleanSheetMemory' | 'bigWinMemory' | 'familiar';

interface Facts {
  n: number; wins: number; losses: number; last: Meeting;
  /** the newest meeting carrying each memory, when there is one */
  comeback?: Meeting; lastMinute?: Meeting; pens?: Meeting; red?: Meeting; big?: Meeting; final?: Meeting;
  gap: number; round: number;
}

interface Category {
  id: RivalryCategory;
  weight: number;
  when: (f: Facts) => boolean;
  /** the meeting the line talks about */
  ref: (f: Facts) => Meeting;
  lines: string[];
}

const newest = (ms: Meeting[], pick: (m: Meeting) => boolean): Meeting | undefined => [...ms].reverse().find(pick);

export const RIVALRY: Category[] = [
  { id: 'second', weight: 2, when: f => f.n === 1, ref: f => f.last, lines: [
    'מפגש שני מול {club}. {roundIn} של עונה {season} {outcome}.',
    'נפגשים שוב. {club} כבר מכירה אותך מעונה {season}.',
    'פעם שנייה מול {club}, והפעם שני הצדדים יודעים למה לצפות.',
  ] },
  { id: 'revenge', weight: 3, when: f => !f.last.won, ref: f => f.last, lines: [
    'בפעם האחרונה {club} שלחה אותך הביתה {roundIn}. הלילה אפשר להחזיר.',
    'הפסדת להם בעונה {season}. את החשבון הזה עוד לא סגרת.',
    'הם זוכרים שניצחו. אתה זוכר איך זה הרגיש.',
  ] },
  { id: 'dominance', weight: 3, when: f => f.wins >= 2, ref: f => f.last, lines: [
    '{wins} פעמים כבר עברת את {club}. הם לא אוהבים לראות אותך בהגרלה.',
    'מול {club} אתה יודע לנצח: {wins} פעמים עד היום.',
    '{club} עוד מחפשת דרך לעבור אותך. {wins} ניסיונות נכשלו.',
  ] },
  { id: 'finalAgain', weight: 5, when: f => !!f.final && f.round === EURO_ROUNDS - 1, ref: f => f.final!, lines: [
    'גמר חוזר. אתה ו{club} כבר עמדתם על הגביע בעונה {season}.',
    'שוב גמר מול {club}. מי שהיה שם בעונה {season} לא שכח.',
    'אותו גמר, עונה אחרת. הפעם הכול נפתח מחדש.',
  ] },
  { id: 'comebackMemory', weight: 3, when: f => !!f.comeback, ref: f => f.comeback!, lines: [
    'המהפך של עונה {season} מול {club} עוד מסופר ביציע.',
    'בעונה {season} חזרת מפיגור מול {club}. הם לא ירגישו בטוחים גם ביתרון.',
    'מול {club} למדת בעונה {season} שהמשחק לא נגמר עד השריקה.',
  ] },
  { id: 'lastMinuteMemory', weight: 3, when: f => !!f.lastMinute, ref: f => f.lastMinute!, lines: [
    'הגול בדקות הסיום מול {club} בעונה {season} עדיין כואב להם.',
    '{club} כבר נפלה פעם ממש בסוף, בעונה {season}. הם ישמרו על השעון.',
    'בעונה {season} הכרעת את {club} בדקות האחרונות. הקהל מחכה לעוד אחת.',
  ] },
  { id: 'pensMemory', weight: 3, when: f => !!f.pens, ref: f => f.pens!, lines: [
    'בעונה {season} זה הוכרע בפנדלים. אף אחד לא רוצה להגיע לשם שוב.',
    '11 מטר כבר הכריעו בינך לבין {club}, בעונה {season}.',
    '{club} והפנדלים של עונה {season}: זיכרון שלא נמחק.',
  ] },
  { id: 'redMemory', weight: 3, when: f => !!f.red, ref: f => f.red!, lines: [
    'בעונה {season} {club} סיימה בעשרה שחקנים. העצבים עוד שם.',
    'האדום של עונה {season} עוד לא נשכח אצל {club}.',
    'מפגש טעון: בעונה {season} השופט שלף אדום ל{club}.',
  ] },
  { id: 'eternalDraw', weight: 3, when: f => f.wins >= 2 && f.wins === f.losses, ref: f => f.last, lines: [
    '{wins} פעמים עברת אותם, {losses} פעמים הם אותך. אף אחד עוד לא הוכיח שהוא טוב יותר.',
    'מאזן שקול מול {club}. הלילה מישהו עולה ליתרון.',
    'אתה ו{club}: שוויון שנמשך עונות.',
  ] },
  { id: 'thirdDecides', weight: 4, when: f => f.n === 2 && f.wins === 1, ref: f => f.last, lines: [
    'אחת לך, אחת להם. השלישית תכריע.',
    'פעם עברת אתה, פעם {club}. המפגש השלישי שובר את השוויון.',
    'מפגש שלישי מול {club}, והמאזן שקול.',
  ] },
  { id: 'curse', weight: 4, when: f => f.n >= 2 && f.wins === 0, ref: f => f.last, lines: [
    '{losses} מפגשים, אפס הצלחות. הלילה אפשר לשבור את הקללה מול {club}.',
    'עוד לא עברת את {club}. כל קללה נשברת פעם.',
    '{club} היא הקיר שלך באירופה: {losses} פעמים נעצרת שם.',
  ] },
  { id: 'seasonsGap', weight: 2, when: f => f.gap >= 2, ref: f => f.last, lines: [
    '{gap} עברו מאז המפגש האחרון מול {club}.',
    'לא ראית את {club} מאז עונה {season}. הרבה השתנה מאז.',
    '{gap} אחרי, {club} שוב בדרך שלך.',
  ] },
  { id: 'cleanSheetMemory', weight: 2, when: f => f.last.won && f.last.flags.cleanSheet, ref: f => f.last, lines: [
    'בפעם הקודמת {club} לא כבשה לך אפילו שער אחד.',
    'שער נקי מול {club} בעונה {season}. ההגנה זוכרת איך עושים את זה.',
    'ההתקפה של {club} יצאה בלי כלום בפעם שעברה.',
  ] },
  { id: 'bigWinMemory', weight: 3, when: f => !!f.big, ref: f => f.big!, lines: [
    'בעונה {season} עברת אותם בהפרש של {margin} שערים. {club} באה לתקן.',
    'התבוסה של עונה {season} עוד רשומה אצל {club}.',
    'הפרש של {margin} שערים בעונה {season}. {club} לא שכחה.',
  ] },
  // always open from the second meeting on, so two clubs who have met are never left without a line
  { id: 'familiar', weight: 1, when: f => f.n >= 2, ref: f => f.last, lines: [
    '{n} פעמים כבר נפגשתם, אתה ו{club}. הלילה נכתב עוד פרק.',
    '{club} שוב. אחרי {n} מפגשים אין כאן הפתעות.',
    'עוד לילה מול {club}. ההיסטוריה ביניכם כבר ארוכה.',
  ] },
];

export const RIVALRY_TEMPLATES = RIVALRY.reduce((n, c) => n + c.lines.length, 0);

const GAP_WORDS = ['', '', 'שתי עונות', 'שלוש עונות', 'ארבע עונות', 'חמש עונות', 'שש עונות', 'שבע עונות', 'שמונה עונות', 'תשע עונות', 'עשר עונות'];
const gapWords = (n: number): string => GAP_WORDS[n] ?? `${n} עונות`;

export interface RivalryPick { category: RivalryCategory; tpl: string; text: string }

/**
 * The line for tonight, or null when they have never met. `seed` should be the night's own (the season, the round
 * and the club), so a reload reads the same line.
 */
export function rivalryPick(meetings: Meeting[] | undefined, ctx: { club: string; season: number; round: number }, seed: number): RivalryPick | null {
  if (!meetings || meetings.length === 0) return null;
  const wins = meetings.filter(m => m.won).length;
  const last = meetings[meetings.length - 1];
  const f: Facts = {
    n: meetings.length, wins, losses: meetings.length - wins, last,
    comeback: newest(meetings, m => m.flags.comeback && m.won), lastMinute: newest(meetings, m => m.flags.lastMinute),
    pens: newest(meetings, m => m.flags.pens), red: newest(meetings, m => m.flags.redCard),
    big: newest(meetings, m => m.flags.bigWin), final: newest(meetings, m => m.flags.final),
    gap: ctx.season - last.season, round: ctx.round,
  };
  const open = RIVALRY.filter(c => c.when(f));
  if (!open.length) return null;
  const rng = createRng(seed);
  let roll = rng() * open.reduce((s, c) => s + c.weight, 0);
  const cat = open.find(c => (roll -= c.weight) < 0) ?? open[open.length - 1];
  const i = Math.floor(rng() * cat.lines.length);
  const ref = cat.ref(f);
  const mine = ref.legs.reduce((s, l) => s + l[0], 0), theirs = ref.legs.reduce((s, l) => s + l[1], 0);
  const text = cat.lines[i]
    .split('{club}').join(ctx.club)
    .split('{season}').join(String(ref.season))
    .split('{roundIn}').join(ROUND_IN[ref.round] ?? '')
    .split('{outcome}').join(ref.won ? 'עברת אותם' : 'הם עברו אותך')
    .split('{n}').join(String(f.n))
    .split('{wins}').join(String(f.wins))
    .split('{losses}').join(String(f.losses))
    .split('{gap}').join(gapWords(f.gap))
    .split('{margin}').join(String(mine - theirs));
  return { category: cat.id, tpl: `${cat.id}-${i}`, text };
}

export const rivalryLine = (meetings: Meeting[] | undefined, ctx: { club: string; season: number; round: number }, seed: number): string | null =>
  rivalryPick(meetings, ctx, seed)?.text ?? null;
