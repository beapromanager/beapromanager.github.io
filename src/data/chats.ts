/**
 * The phone after the whistle. Not every week, only the ones that actually
 * moved something: a hammering you gave or took, a derby, or a run that people
 * have started to talk about. The rest of the time the phone stays quiet, which
 * is exactly what makes it land when it does buzz.
 *
 * The voice is a real Israeli group chat, short bursts, no full stops, people
 * talking over each other. Slots are filled from the live save so the fans
 * shout your actual scoreline at your actual rival.
 */

import type { Rng } from '../engine/matchEngine.ts';
import type { MatchFact } from './matchFacts.ts';

export type ChatTrigger =
  | 'derby_win' | 'derby_loss' | 'derby_draw' | 'hat_trick'
  | 'hot_streak' | 'cold_streak' | 'big_win' | 'big_loss' | 'red_card';

export interface ChatLine {
  /** the sender's display name, empty string means the manager himself */
  from: string;
  text: string;
}

export interface ChatThreadTemplate {
  id: string;
  trigger: ChatTrigger;
  contact: string;
  subtitle: string;
  group: boolean;
  /** avatar tint, kept per contact so the same chat always looks the same */
  accent: string;
  lines: ChatLine[];
}

export interface ChatCtx {
  club: string;
  rival: string;
  score: string;     // "3 - 0" from your point of view
  star: string;
  mgr: string;       // the manager's nickname
  /** the man the week was about: the hat trick scorer, the one sent off */
  who?: string;
}

const FANS = 'האולטראס';
const MOTHER = 'אמא';
const GOLD = '#d9a441', GREEN = '#2fa96b', RED = '#e2484d', BLUE = '#5b8dd6';
const PLUM = '#b06ac9', ORANGE = '#e08a3c', GREY = '#8a94a6';

export const THREADS: ChatThreadTemplate[] = [
  /* ------------------------------------------------------------- big wins */
  {
    id: 'fans_big_win',
    trigger: 'big_win',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: '{score}' },
      { from: 'מוקי', text: 'תגידו לי שזה קרה באמת, מפחד לצבוט את עצמי באמא!' },
      { from: 'רפי', text: 'אחייי איזה משחק' },
      { from: 'שמעון', text: '30 שנה אני בא ליציע המזרחי, מזמן לא ראיתי כזה דבר' },
      { from: 'אלי צ׳יקו', text: 'אמרתי לכם. אמרתי לכם על {star}' },
      { from: 'רפי', text: 'המכולת פתוחה עד מאוחר היום, הכל על חשבוני 😂' },
      { from: 'מוקי', text: '{mgr} תותח' },
    ],
  },
  {
    id: 'captain_big_win',
    trigger: 'big_win',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן' },
      { from: 'הקפטן', text: 'רציתי להגיד לך משהו לפני שאני נוסע הביתה' },
      { from: 'הקפטן', text: 'החבר׳ה בחדר לא הפסיקו לדבר על מה שאמרת לפני המשחק' },
      { from: 'הקפטן', text: 'תמשיך ככה ואנחנו הולכים רחוק העונה' },
    ],
  },

  /* ------------------------------------------------------------ big losses */
  {
    id: 'board_big_loss',
    trigger: 'big_loss',
    contact: 'מנכ״ל המועדון', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'מנכ״ל המועדון', text: 'ראיתי את המשחק' },
      { from: 'מנכ״ל המועדון', text: '{score} מול {rival}. אין לי מילים, בושה' },
      { from: 'מנכ״ל המועדון', text: 'הטלפון שלי לא מפסיק לצלצל מאז שריקת הסיום' },
      { from: 'מנכ״ל המועדון', text: 'אני צריך ממך הסבר על צורת המשחק. לא לתקשורת, לי' },
      { from: 'מנכ״ל המועדון', text: 'מחר בתשע אצלי במשרד. תכין מצגת מסודרת.' },
    ],
  },
  {
    id: 'fans_big_loss',
    trigger: 'big_loss',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: RED,
    lines: [
      { from: 'מוקי', text: 'מישהו יכול להסביר לי מה ראיתי היום' },
      { from: 'שמעון', text: 'אל תשאל יותר טוב' },
      { from: 'רפי', text: 'נסעתי שעה וחצי בפקקים בשביל {score}' },
      { from: 'אלי צ׳יקו', text: 'הבעיה היא לא השחקנים. הבעיה היא שאין שיטה' },
      { from: 'מוקי', text: 'אלי תעזוב אותך משיטה, לא רצו בכלל. אסור להם ללבוש את המדים' },
      { from: 'שמעון', text: 'תאכלס שבוע הבא שוב פעם נלך למשחק, נמשיך לעודד' },
    ],
  },

  /* --------------------------------------------------------------- derbies */
  {
    id: 'fans_derby_win',
    trigger: 'derby_win',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'דרררררבי מעל הכלללל!!!' },
      { from: 'מוקי', text: 'אני צרוד לגמרי' },
      { from: 'מוקי', text: 'הם היו צריכים לראות את הפרצופים שלהם ביציע ממול' },
      { from: 'אלי צ׳יקו', text: 'שנה שלמה אני אזכיר להם את {score} הזה' },
      { from: 'שמעון', text: 'הבן שלי בא איתי היום פעם ראשונה לדרבי. לא אשכח את זה' },
      { from: 'רפי', text: '{mgr} מגיע לך על חשבון הבית לכל החיים' },
    ],
  },
  {
    id: 'fans_derby_loss',
    trigger: 'derby_loss',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: RED,
    lines: [
      { from: 'מוקי', text: 'לא מדבר עם אף אחד שבוע' },
      { from: 'רפי', text: 'מכל המשחקים בעולם, דווקא זה. איזה בושות' },
      { from: 'אלי צ׳יקו', text: 'יש לי 4 אוהדים שלהם במשרד איזה דכאון. אתם מבינים מה עובר עליי מחר בבוקר' },
      { from: 'שמעון', text: 'חבר׳ה מספיק. הפסדנו דרבי, לא סוף העולם.' },
      { from: 'מוקי', text: 'שמעון עם כל הכבוד, כן נגמר!!! דרבי מעל הכל!' },
    ],
  },

  /* ---------------------------------------------------------------- streaks */
  {
    id: 'captain_hot_streak',
    trigger: 'hot_streak',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן שלושה משחקים ברצף' },
      { from: 'הקפטן', text: 'החבר׳ה מגיעים לאימונים חצי שעה לפני, מעצמם.' },
      { from: 'הקפטן', text: 'לא ראיתי דבר כזה מאז שאני במועדון' },
      { from: 'הקפטן', text: 'רק תשמור אותנו על הקרקע, אני מכיר את החבורה הדבילית הזאת' },
    ],
  },
  {
    id: 'fans_hot_streak',
    trigger: 'hot_streak',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'אלי צ׳יקו', text: 'שלוש נצחונות ברצף חברים' },
      { from: 'רפי', text: 'מישהו כבר בדק כמה נקודות אנחנו מהעלייה' },
      { from: 'מוקי', text: 'רפי אל תקלל, יא מנחוס' },
      { from: 'שמעון', text: 'תשמעו לי, לא מדברים על זה יותר. שחררו מהנושא.' },
      { from: 'אלי צ׳יקו', text: 'שמעון צודק. שקט. ממשיכים משחק למשחק' },
      { from: 'רפי', text: 'טוב אבל אם כבר שקט אז לפחות נחגוג היום בערב את הנצחון' },
    ],
  },
  {
    id: 'board_cold_streak',
    trigger: 'cold_streak',
    contact: 'הבעלים', subtitle: 'מקוון', group: false, accent: RED,
    lines: [
      { from: 'הבעלים', text: 'שלוש הפסדים ברצף' },
      { from: 'הבעלים', text: 'אני לא איש שמאבד סבלנות מהר, אתה יודע את זה' },
      { from: 'הבעלים', text: 'אבל אני יושב מול אנשים שכן' },
      { from: 'הבעלים', text: 'תגיד לי מה התוכנית שלך. במילים שלך, לא סיסמאות' },
      { from: 'הבעלים', text: 'ואל תגיד לי שצריך זמן, זה מעבר לזה.' },
    ],
  },
  {
    id: 'captain_cold_streak',
    trigger: 'cold_streak',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'הקפטן', text: 'מאמן אני מדבר איתך בפתיחות כי אני חושב שמגיע לך' },
      { from: 'הקפטן', text: 'החדר הלבשה לחוץ. שומעים את הבוז מהיציע ולא רוצים לקבל כדור' },
      { from: 'הקפטן', text: 'הצעירים במיוחד' },
      { from: 'הקפטן', text: 'אם תדבר איתם השבוע זה יעשה הבדל לדעתי. הם מחכים שתגיד משהו' },
    ],
  },

  /* ------------------------------------------------------------------ אמא */
  // She watches every match on television and has never once mentioned the
  // football. She mentions how he looked, who called, and dinner.
  {
    id: 'mother_derby_win',
    trigger: 'derby_win',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'ראיתי אותך בטלוויזיה כפרעלייך' },
      { from: MOTHER, text: 'למה אתה צועק ככה על השופט, יש לך לחץ דם' },
      { from: MOTHER, text: 'אבא אומר כל הכבוד' },
      { from: MOTHER, text: 'האמת הוא לא אומר את זה, אני אומרת. אבל הוא חושב ככה (נראה לי)' },
      { from: MOTHER, text: 'תבוא לאכול בשישי. תביא את {star} אם הוא רוצה' },
      { from: '', text: 'אמא הוא לא יבוא לאכול אצלך' },
      { from: MOTHER, text: 'שיבוא. אני מכינה לו קציצות בכל מקרה' },
    ],
  },
  {
    id: 'mother_derby_loss',
    trigger: 'derby_loss',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'ראיתי את המשחק' },
      { from: MOTHER, text: 'לא צריך לדבר' },
      { from: MOTHER, text: 'לך תאכל משהו ותנוח' },
      { from: MOTHER, text: 'הדודה שלך המעצבנת התקשרה לשאול אם אתה בסדר. אמרתי לה "רק בהפסדים את שואלת?"' },
      { from: MOTHER, text: 'אתה בסדר נכון?' },
      { from: '', text: 'כן אמא' },
      { from: MOTHER, text: 'תאכל משהו ולך לנוח אוהבת המון' },
    ],
  },
  {
    id: 'mother_big_win',
    trigger: 'big_win',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: '{score}!' },
      { from: MOTHER, text: 'השכנה שאלה אם זה הבן שלי. אמרתי לה שכן בגאווה' },
      { from: MOTHER, text: 'אתה נראה עייף בטלוויזיה' },
      { from: MOTHER, text: 'תבוא לאכול אני מכינה לך שווארמה' },
    ],
  },
  {
    id: 'mother_cold_streak',
    trigger: 'cold_streak',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'שמעתי ברדיו מה שאמרו עליך' },
      { from: MOTHER, text: 'מי זה בכלל האיש הזה, מה הוא מבין. דביל.' },
      { from: MOTHER, text: 'אבא רצה להתקשר לתחנה להתלונן. אמרתי לו שלא' },
      { from: MOTHER, text: 'אתה יודע שאתה טוב. אני יודעת שאתה טוב' },
      { from: MOTHER, text: 'תאכל משהו, אתה נראה חיוור.' },
    ],
  },

  /* ---------------------------------------------------- the other bench */
  // Two managers who will see each other again in the spring. Short, because
  // neither of them wants to be the one still typing.
  {
    id: 'rival_mgr_derby_win',
    trigger: 'derby_win',
    contact: 'המאמן של {rival}', subtitle: 'נראה לאחרונה היום', group: false, accent: ORANGE,
    lines: [
      { from: 'המאמן של {rival}', text: 'כל הכבוד' },
      { from: 'המאמן של {rival}', text: '{score}. לא מגיע לנו, אבל כל הכבוד' },
      { from: 'המאמן של {rival}', text: 'בסיבוב השני נדבר' },
      { from: '', text: 'תודה. תשמור על עצמך.' },
      { from: 'המאמן של {rival}', text: 'אל תדאג לי אחי' },
    ],
  },
  {
    id: 'rival_mgr_derby_draw',
    trigger: 'derby_draw',
    contact: 'המאמן של {rival}', subtitle: 'נראה לאחרונה היום', group: false, accent: ORANGE,
    lines: [
      { from: 'המאמן של {rival}', text: '{score}. הוגן?' },
      { from: '', text: 'לא' },
      { from: 'המאמן של {rival}', text: 'גם אני חושב שלא. כל אחד לקח נקודה' },
      { from: 'המאמן של {rival}', text: 'בסיבוב השני נפרק אתכם' },
    ],
  },

  /* ---------------------------------------------------- more from the club */
  {
    id: 'board_derby_loss',
    trigger: 'derby_loss',
    contact: 'מנכ״ל המועדון', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'מנכ״ל המועדון', text: 'הבעלים ישב בתא עם שני אנשים מ{rival}' },
      { from: 'מנכ״ל המועדון', text: 'אני לא צריך לתאר לך את הפרצוף שלו ב{score}' },
      { from: 'מנכ״ל המועדון', text: 'הוא לא אמר כלום. זה מה שמדאיג אותי' },
      { from: 'מנכ״ל המועדון', text: 'תנצח בשבוע הבא. בשבילי.' },
    ],
  },
  {
    id: 'owner_hot_streak',
    trigger: 'hot_streak',
    contact: 'הבעלים', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הבעלים', text: 'פששש שלוש נצחונות ברצף' },
      { from: 'הבעלים', text: 'אני לא מתלהב מהר. אתה יודע' },
      { from: 'הבעלים', text: 'אבל ישבתי היום בתא ומישהו לידי אמר "סוף סוף יש פה מאמן"' },
      { from: 'הבעלים', text: 'לא תיקנתי אותו' },
      { from: 'הבעלים', text: 'תמשיך ככה ואולי נדבר על חוזה חדש.' },
    ],
  },
  {
    id: 'fans_derby_draw',
    trigger: 'derby_draw',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'תיקו בדרבי' },
      { from: 'מוקי', text: 'אני לא יודע אם לשמוח או לבכות' },
      { from: 'שמעון', text: 'לא הפסדנו. בדרבי זה מה שחשוב' },
      { from: 'אלי צ׳יקו', text: 'שמעון, תיקו בדרבי זה כמו לאכול וופל לימון.' },
      { from: 'מוקי', text: 'אלי מאיפה אתה מביא את השטויות האלה?!' },
      { from: 'רפי', text: 'הם בטח חוגגים, משחק הבא חייבים לנצח אותם.' },
    ],
  },

  /* ------------------------------------------------------------ hat trick */
  {
    id: 'agent_hat_trick',
    trigger: 'hat_trick',
    contact: 'הסוכן של {who}', subtitle: 'נראה לאחרונה היום', group: false, accent: GREY,
    lines: [
      { from: 'הסוכן של {who}', text: 'ערב טוב מאמן, סליחה על השעה' },
      { from: 'הסוכן של {who}', text: 'שלושה שערים. ראית, כל הארץ ראתה' },
      { from: 'הסוכן של {who}', text: 'יש עניין. לא מפה. רק שתדע לפני שזה יגיע מהעיתונות' },
      { from: 'הסוכן של {who}', text: 'אני לא מאיץ בכלום. רק שתדע' },
      { from: '', text: 'רשמתי לעצמי. לילה טוב' },
    ],
  },
  {
    id: 'fans_hat_trick',
    trigger: 'hat_trick',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: '{who} {who} {who}' },
      { from: 'רפי', text: 'שלוש!!! שלוש!!! שלוש!!!' },
      { from: 'אלי צ׳יקו', text: 'אמרתי לכם עליו מהאימון הראשון' },
      { from: 'מוקי', text: 'אלי אתה לא היית באימון הראשון בכלל.' },
      { from: 'אלי צ׳יקו', text: 'לא הייתי נוכח אבל הייתי ברוח ובלב' },
      { from: 'שמעון', text: 'אלוף הוא לקח את הכדור! איזה שחקן!' },
      { from: 'רפי', text: '{mgr} רק אל תמכור אותו, בבקשה' },
    ],
  },

  /* ----------------------------------------------------------- sent off */
  {
    id: 'player_red_card',
    trigger: 'red_card',
    contact: '{who}', subtitle: 'מקוון', group: false, accent: RED,
    lines: [
      { from: '{who}', text: 'מאמן' },
      { from: '{who}', text: 'סליחה על השעה' },
      { from: '{who}', text: 'אני יודע שהשארתי אתכם בעשרה שחקנים' },
      { from: '{who}', text: 'לא מצליח לישון. תגיד לי מה שאתה רוצה להגיד, אני אקבל' },
      { from: '', text: 'מחר באימון נדבר. תישן' },
      { from: '{who}', text: 'תודה מאמן' },
    ],
  },
  {
    id: 'captain_red_card',
    trigger: 'red_card',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'הקפטן', text: 'מאמן, לגבי {who}' },
      { from: 'הקפטן', text: 'הוא ישב בחדר עשרים דקות אחרי שכולם הלכו' },
      { from: 'הקפטן', text: 'אף אחד לא כעס עליו, שתדע. זה יכול לקרות לכל אחד' },
      { from: 'הקפטן', text: 'רק אם אתה מדבר איתו, תדבר איתו לפני האימון. לא מול כולם' },
    ],
  },

  /* --------------------------------------------------------- the press, late */
  {
    id: 'reporter_big_loss',
    trigger: 'big_loss',
    contact: 'כתב, ספורט 555', subtitle: 'נראה לאחרונה היום', group: false, accent: GREY,
    lines: [
      { from: 'כתב, ספורט 555', text: 'ערב טוב, סליחה על השעה' },
      { from: 'כתב, ספורט 555', text: 'יש לי ציטוט משחקן שלך. לא אגיד מי. "החדר הלבשה לא מאמין במאמן יותר"' },
      { from: 'כתב, ספורט 555', text: 'זה עולה מחר בבוקר. רוצה להגיב לפני?' },
      { from: '', text: 'אין תגובה' },
      { from: 'כתב, ספורט 555', text: 'חבל. זה יעלה ככה ויעשה לך בלאגן יותר גדול.' },
    ],
  },
];

/**
 * Which conversation, if any, this round deserves. A derby beats everything, a
 * hat trick beats a run, a run beats a scoreline, and a sending off only gets
 * the phone when nothing bigger happened that night.
 */
export function pickTrigger(input: {
  margin: number; isDerby: boolean; form: ('W' | 'D' | 'L')[]; facts?: MatchFact[];
}): { trigger: ChatTrigger; who?: string } | null {
  const { margin, isDerby, form, facts = [] } = input;
  const last3 = form.slice(-3);
  const streak = (r: 'W' | 'L') => last3.length === 3 && last3.every(x => x === r);
  const fact = (k: MatchFact['kind']) => facts.find(f => f.kind === k);

  if (isDerby && margin > 0) return { trigger: 'derby_win' };
  if (isDerby && margin < 0) return { trigger: 'derby_loss' };
  if (isDerby) return { trigger: 'derby_draw' };
  const hat = fact('hat_trick');
  if (hat) return { trigger: 'hat_trick', who: hat.who };
  if (streak('W')) return { trigger: 'hot_streak' };
  if (streak('L')) return { trigger: 'cold_streak' };
  if (margin >= 3) return { trigger: 'big_win' };
  if (margin <= -3) return { trigger: 'big_loss' };
  const red = fact('red_card');
  if (red) return { trigger: 'red_card', who: red.who };
  return null;
}

export interface RolledChat {
  id: string;
  contact: string;
  subtitle: string;
  group: boolean;
  accent: string;
  lines: ChatLine[];
}

function fill(t: string, ctx: ChatCtx): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => {
    const v = (ctx as unknown as Record<string, string>)[k];
    return v == null || v === '' ? `{${k}}` : v;
  });
}

/** Build the conversation for a trigger, avoiding the one shown most recently. */
export function rollChat(trigger: ChatTrigger, ctx: ChatCtx, rng: Rng, recent: string[]): RolledChat | null {
  const all = THREADS.filter(t => t.trigger === trigger);
  if (!all.length) return null;
  // never one heard lately. When every thread for this trigger has been seen,
  // the one seen longest ago is the least bad repeat
  const fresh = all.filter(t => !recent.includes(t.id));
  const t = fresh.length
    ? fresh[Math.floor(rng() * fresh.length)]
    : all.reduce((a, b) => recent.indexOf(a.id) <= recent.indexOf(b.id) ? a : b);
  // the contact can be a slot too: the sent off man, the rival's manager
  return {
    id: t.id, contact: fill(t.contact, ctx), subtitle: fill(t.subtitle, ctx), group: t.group, accent: t.accent,
    lines: t.lines.map(l => ({ from: fill(l.from, ctx), text: fill(l.text, ctx) })),
  };
}
