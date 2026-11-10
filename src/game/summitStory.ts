/**
 * A page of the golden book (R7): the title, the line and the picture for a summit final, written from what
 * happened in it. Never a dry headline: every page carries something real from the match, a minute, a scorer or
 * the score. Itzik's scope (9.11): a page for every final played, a double page for the trophy, nothing else.
 * Seeded, so the same final writes the same page; the phrasing that wrote the career's last page is not used
 * for the next one.
 *
 * DRAFTS: every line here is a first wording for Itzik to correct.
 */
import type { LegDigest } from './summitMemory.ts';
import { cameBack } from './summitMemory.ts';
import { createRng } from '../engine/matchEngine.ts';

interface Facts {
  won: boolean; pens: boolean; mine: number; theirs: number;
  late: boolean; comeback: boolean; clean: boolean; big: boolean; theirRed: boolean; myRed: boolean;
  scored: boolean; ledAndLost: boolean; heavy: boolean;
}

interface Tpl {
  id: string;
  moment: string;
  title: string;
  line: string;
  when: (f: Facts) => boolean;
  /** which of his goals the line names: the late one, the last, or the first */
  goal?: 'late' | 'last' | 'first';
  /** a line for any final of its kind, picked less often than one that fits what happened */
  plain?: boolean;
}

const open = (f: Facts) => f.won && !f.pens;
const lost = (f: Facts) => !f.won && !f.pens;

export const STORIES: Tpl[] = [
  // the trophy
  { id: 'w-late-1', moment: 'last-minute', goal: 'late', when: f => open(f) && f.late, title: 'דקה {min}', line: '{scorer} בדקה {min}, והגביע מגיע ל{city}. {score} מול {opp} בגמר של עונה {season}.' },
  { id: 'w-late-2', moment: 'last-minute', goal: 'late', when: f => open(f) && f.late, title: 'ממש בסוף', line: 'כולם כבר חשבו על פנדלים, ואז {scorer} בדקה {min}. {score} מול {opp}.' },
  { id: 'w-back-1', moment: 'comeback', goal: 'last', when: f => open(f) && f.comeback, title: 'מהפך בגמר', line: 'פיגור, ואז {scorer} בדקה {min} הופך את הלילה. {score} מול {opp}, והגביע שלך.' },
  { id: 'w-back-2', moment: 'comeback', when: f => open(f) && f.comeback, title: 'מאחור אל הגביע', line: '{opp} הובילה, ואתה סיימת עם {score} ועם הגביע ביד.' },
  { id: 'w-pens-1', moment: 'pens-win', when: f => f.won && f.pens, title: 'הוכרע מ-11 מטר', line: '{score} אחרי 90 דקות, {pens} בפנדלים. הגביע של עונה {season} שלך.' },
  { id: 'w-pens-2', moment: 'pens-win', when: f => f.won && f.pens, title: 'עצבים של פלדה', line: 'גמר שלם בלי הכרעה, ואז {pens} מהנקודה הלבנה מול {opp}.' },
  { id: 'w-clean-1', moment: 'clean-sheet', goal: 'first', when: f => open(f) && f.clean, title: 'שער נקי בגמר', line: '{score} מול {opp}, בלי לספוג. {scorer} כבש בדקה {min}.' },
  { id: 'w-clean-2', moment: 'clean-sheet', when: f => open(f) && f.clean, title: 'חומה', line: '{opp} לא מצאה דרך לשער שלך. {score}, והגביע נוסע ל{city}.' },
  { id: 'w-big-1', moment: 'big-win', goal: 'first', when: f => open(f) && f.big, title: 'גמר חד צדדי', line: '{score} בגמר. מהדקה {min} {opp} כבר לא הייתה במשחק.' },
  { id: 'w-big-2', moment: 'big-win', goal: 'first', when: f => open(f) && f.big, title: 'לילה של פעם בדור', line: '{score} מול {opp}. {scorer} פתח בדקה {min}, והשאר היסטוריה.' },
  { id: 'w-red-1', moment: 'their-red', when: f => open(f) && f.theirRed, title: 'אדום, ואז גביע', line: '{opp} נשארה בעשרה, ואתה ניצלת את זה עד הסוף: {score}.' },
  { id: 'w-red-2', moment: 'their-red', when: f => open(f) && f.theirRed, title: 'עשרה מול אחד עשר', line: 'האדום של {opp} שינה את הגמר. {score}, והגביע אצלך.' },
  { id: 'w-plain-1', moment: 'trophy-lift', goal: 'last', plain: true, when: open, title: 'אלופי אירופה', line: '{score} מול {opp} ב{stadium}. {scorer} בדקה {min}, ועונה {season} נכנסת לספר.' },
  { id: 'w-plain-2', moment: 'trophy-lift', goal: 'last', plain: true, when: open, title: 'הגביע אצלנו', line: 'גמר עונה {season}: {score} מול {opp}. {scorer} חתם את זה בדקה {min}.' },
  { id: 'w-plain-3', moment: 'fans-night', plain: true, when: open, title: 'לילה ב{stadium}', line: '{score}, והקפטן מניף את הגביע מול {opp}.' },
  { id: 'w-plain-4', moment: 'trophy-lift', plain: true, when: open, title: 'הפסגה שלך', line: 'מ{city} עד הגביע של אירופה: {score} מול {opp} בגמר.' },
  // a final played and lost
  { id: 'l-pens-1', moment: 'final-whistle', when: f => !f.won && f.pens, title: 'נפל מ-11 מטר', line: '{score} אחרי 90 דקות, ואז {pens} בפנדלים מול {opp}. הכי קרוב שאפשר.' },
  { id: 'l-pens-2', moment: 'final-whistle', when: f => !f.won && f.pens, title: 'בעיטה אחת', line: 'הגמר של עונה {season} הוכרע בפנדלים, {pens}, והגביע הלך ל{opp}.' },
  { id: 'l-close-1', moment: 'rain-night', goal: 'last', when: f => lost(f) && f.scored && f.theirs - f.mine === 1, title: 'גמר של סנטימטרים', line: '{score} מול {opp}. {scorer} כבש בדקה {min}, וזה לא הספיק.' },
  { id: 'l-close-2', moment: 'rain-night', goal: 'last', when: f => lost(f) && f.scored && f.theirs - f.mine === 1, title: 'כמעט', line: '{scorer} החזיר תקווה בדקה {min}, אבל {opp} לקחה את הגמר, {score}.' },
  { id: 'l-dry-1', moment: 'final-whistle', when: f => lost(f) && !f.scored, title: 'לילה שקט מדי', line: '{score} בגמר מול {opp}. השער שלהם נשאר נעול.' },
  { id: 'l-dry-2', moment: 'final-whistle', when: f => lost(f) && !f.scored, title: 'בלי גול', line: 'גמר עונה {season} נגמר {score}. {opp} לא נתנה לך לנשום.' },
  { id: 'l-heavy-1', moment: 'rain-night', when: f => lost(f) && f.heavy, title: 'שיעור בגמר', line: '{score} מול {opp}. לפעמים הפסגה עוד רחוקה.' },
  { id: 'l-heavy-2', moment: 'rain-night', when: f => lost(f) && f.heavy, title: 'לילה קשה', line: '{opp} הייתה גדולה מדי בגמר של עונה {season}: {score}.' },
  { id: 'l-led-1', moment: 'final-whistle', goal: 'first', when: f => lost(f) && f.ledAndLost, title: 'היתרון שנעלם', line: '{scorer} העלה אותך ליתרון בדקה {min}, ו{opp} הפכה. {score}.' },
  { id: 'l-led-2', moment: 'final-whistle', when: f => lost(f) && f.ledAndLost, title: 'הפכו לך', line: 'הובלת בגמר, וסיימת {score}. {opp} חגגה ב{stadium}.' },
  { id: 'l-red-1', moment: 'final-whistle', when: f => lost(f) && f.myRed, title: 'עשרה שחקנים בגמר', line: 'אדום שלך שינה הכול. {score} מול {opp}.' },
  { id: 'l-plain-1', moment: 'fans-night', plain: true, when: lost, title: 'סגן אלוף אירופה', line: '{score} מול {opp} בגמר. עונה {season} נגמרה צעד אחד מהגביע.' },
  { id: 'l-plain-2', moment: 'fans-night', plain: true, when: lost, title: 'הגמר שברח', line: 'הגעת עד {stadium}, ושם זה נגמר: {score} מול {opp}.' },
];

export interface StoryContext {
  opp: string;
  city: string;
  stadium: string;
  season: number;
  won: boolean;
  /** the shootout, his kicks first, when the final went to one */
  pens: [number, number] | null;
  /** the phrasing of the career's last page, not to be used again right after it */
  lastTpl?: string;
}

export interface Story { title: string; line: string; momentId: string; tpl: string }

export function storyFor(leg: LegDigest, ctx: StoryContext, seed: number): Story {
  const [mine, theirs] = leg.goals;
  const my = leg.scorers.filter(g => g.mine);
  let me = 0, them = 0, led = false;
  for (const g of leg.scorers) { if (g.mine) me++; else them++; if (me > them) led = true; }
  const f: Facts = {
    won: ctx.won, pens: !!ctx.pens, mine, theirs,
    late: my.some(g => g.minute >= 88), comeback: cameBack(leg), clean: theirs === 0, big: mine - theirs >= 3,
    theirRed: leg.redTheirs, myRed: leg.redMine, scored: my.length > 0, ledAndLost: led && theirs > mine, heavy: theirs - mine >= 3,
  };
  const goalFor = (t: Tpl) => (t.goal === 'late' ? my.find(g => g.minute >= 88) : t.goal === 'first' ? my[0] : t.goal === 'last' ? my[my.length - 1] : undefined);
  // a line that names a goal needs that goal
  const fits = STORIES.filter(t => t.when(f) && (!t.goal || !!goalFor(t)));
  const fresh = fits.filter(t => t.id !== ctx.lastTpl);
  const pool = fresh.length ? fresh : fits;
  const rng = createRng(seed);
  let roll = rng() * pool.reduce((s, t) => s + (t.plain ? 1 : 3), 0);
  const t = pool.find(x => (roll -= x.plain ? 1 : 3) < 0) ?? pool[pool.length - 1];
  const g = goalFor(t);
  const fill = (s: string) => s
    .split('{opp}').join(ctx.opp).split('{city}').join(ctx.city).split('{stadium}').join(ctx.stadium)
    .split('{season}').join(String(ctx.season)).split('{score}').join(`${mine}:${theirs}`)
    .split('{pens}').join(ctx.pens ? `${ctx.pens[0]}:${ctx.pens[1]}` : '')
    .split('{scorer}').join(g?.name ?? '').split('{min}').join(g ? String(g.minute) : '');
  return { title: fill(t.title), line: fill(t.line), momentId: t.moment, tpl: t.id };
}
