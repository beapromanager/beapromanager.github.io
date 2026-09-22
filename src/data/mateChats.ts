/**
 * The phone, from the one who never stops writing.
 *
 * Twenty six threads already buzz after a match, and every one of them is
 * about the scoreline: the ultras, the board, your mother. This one is not.
 * Each of these ten is about him, about his season, about whether he is
 * playing, and that is the whole difference. A friend who texted you about the
 * league table would be one more contact. A friend who texts you because he
 * has been on the bench for three weeks is the reason the save matters.
 *
 * Every line here is Itzik's, out of two documents: what the friend writes,
 * and the three things the manager can write back. The rule behind the three
 * is that one of them commits you to something, one costs nothing and gives
 * nothing, and one costs him. Being nice is not free and being honest is not
 * safe, so there is no answer that is simply the right one.
 *
 * What an answer may not do is make him better. Minutes on the pitch are the
 * only thing that grows a friend, and a manager who could talk his way to a
 * player would never have to pick him.
 */

import type { Position } from '../engine/matchEngine.ts';

/** What the manager's answer does, beyond the words. */
export interface MateEffect {
  /** his own morale */
  morale?: number;
  /** everybody else's, because the room hears how you talk to a young player */
  squadMorale?: number;
  fitness?: number;
  prestige?: number;
  /** a fine paid into the club, or out of it */
  money?: number;
  /**
   * promiseStart: he is in the eleven next week, and the squad knows if he is not
   * mayLeave:     a real chance he walks in the summer
   * leaves:       he walks, and it is settled
   * neverSell:    your word that he is never sold, which has no expiry date
   */
  act?: 'promiseStart' | 'mayLeave' | 'leaves' | 'neverSell';
}

export interface MateAnswer {
  label: string;
  /** what he writes back, the moment you have sent it */
  reply: string;
  effect: MateEffect;
}

export type MateTrigger =
  | 'mate_benched' | 'mate_first_start' | 'mate_first_goal' | 'mate_injured' | 'mate_red'
  | 'mate_arrived' | 'mate_season_played' | 'mate_season_benched' | 'mate_promoted' | 'mate_alone';

export interface MateThread {
  id: MateTrigger;
  lines: string[];
  answers: MateAnswer[];
}

/** How many rounds have to pass between one of these and the next. */
export const MATE_GAP = 3;

export const MATE_THREADS: MateThread[] = [
  {
    id: 'mate_benched',
    lines: [
      'אח יקר מה איתך?',
      'ראיתי את ההרכב',
      'הכל טוב, מבין שאין קומבינות',
      'אני רוצה לקבל יותר דקות',
      'תגיד לי על מה לשים דגש באימונים ואני אעשה את זה אחי',
    ],
    answers: [
      { label: 'אין דבר כזה! מילה שלי אתה בהרכב משחק הבא.', reply: 'יאח מילה שלי שלא תתחרט',
        effect: { morale: 10, act: 'promiseStart' } },
      { label: 'אין פה קומבינות. תעבוד על הכושר, כשתהיה מוכן תשחק', reply: 'סבבה אחי, מחר אני מגיע חצי שעה לפני האימון לעבוד על הכושר.',
        effect: { fitness: 6, morale: -2 } },
      { label: 'לא בקטע רע אבל אתה עדיין לא ברמה, תחכה בסבלנות', reply: 'הבנתי. לא אשאל אותך יותר כלום.',
        effect: { morale: -12 } },
    ],
  },
  {
    id: 'mate_first_start',
    lines: [
      'אחשלייייי זה אמיתיייי?',
      'ראיתי את השם שלי על הלוח',
      'באמא צילמתי והעלתי פוסט',
      'מילה שלי נותן את הנשמה מחר על המגרש',
      'שמע אני מתרגש שולח בקבוצה של החברים',
    ],
    answers: [
      { label: 'ביקשת? קיבלת! אני סומך עליך, תשחק חופשי היום', reply: 'וואו מרגש אותי, לא תצטער על זה אחי',
        effect: { morale: 8, squadMorale: 2 } },
      { label: 'חשוב לי שתשחק רגוע, זה עוד משחק', reply: 'אתה צודק, אני אשחק רגוע יותר',
        effect: { morale: 2 } },
      { label: 'אל תתרגש יותר מדי, יש לך 45 דקות מקסימום. אתה לא בכושר', reply: 'רק מחצית? אולי אני אהיה טוב? טוב אם זאת ההחלטה שלך אקח מה שיש.',
        effect: { morale: -6 } },
    ],
  },
  {
    id: 'mate_first_goal',
    lines: [
      'תראה תראה אחי',
      'הטלפון שלי לא מפסיק לצלצל',
      'בחייאת איזה גול שמתי אההה?!',
      'תודה שהאמנת בי אחי, מעריך',
      'יום שני באימון אני מגיע לפני לסיומות.',
    ],
    answers: [
      { label: 'איזה גול אחי, אתה הבאנקר שלי מעכשיו', reply: 'וואלה?? אני לא אאכזב אותך',
        effect: { morale: 12, act: 'promiseStart' } },
      { label: 'כל הכבוד, עכשיו תמשיך לעבוד קשה', reply: 'סגור, אני על זה.',
        effect: { morale: 5 } },
      { label: 'שער אחד זה עוד לא קריירה אחי', reply: 'צודק. למרות שהיה גול יפה לדעתי. מחר אמשיך לעבוד קשה',
        effect: { morale: -8 } },
    ],
  },
  {
    id: 'mate_injured',
    lines: [
      'אח יצאתי עכשיו מהבדיקה',
      'אמרו לי שהמינימום זה כמה שבועות בחוץ',
      'אני בא לאימונים בכל זאת אבל אשב בצד',
      'תנסה לשמור לי על המקום בסגל אחי, סבבה?',
    ],
    answers: [
      { label: 'המקום שלך שמור, תחזור חזק', reply: 'אחי תודה. זה מה שהייתי צריך לשמוע',
        effect: { morale: 10, act: 'promiseStart' } },
      { label: 'תתאושש ואז נדבר על סגל', reply: 'סבבה',
        effect: {} },
      { label: 'אין פה קומבינות, תחזור ונראה איך תהיה. לא שומר לאף אחד.', reply: 'הבנתי. אחזור מהר יותר',
        effect: { morale: -10, fitness: 4 } },
    ],
  },
  {
    id: 'mate_red',
    lines: [
      'אחי אני יודע',
      'אל תגיד כלום, ראיתי את הפרצוף שלך',
      'לא הייתי צריך להיכנס בו ככה בדקה ה89',
      'אני לוקח אחריות, מילה שלי אחי',
      'יום שני אחרי האימון ארוחה עליי תגיד לכולם',
    ],
    answers: [
      { label: 'אחי אני מגבה אותך בתקשורת, אל תדאג.', reply: 'תודה אחי, לא אשכח לך את זה',
        effect: { prestige: -3, morale: 10, squadMorale: 3 } },
      { label: 'היה נגמר, שלא ייקרה יותר.', reply: 'צודק לומד מזה.',
        effect: { morale: -2 } },
      { label: 'זה יורד לך מהמשכורת ובנוסף תעביר באימון על הטעות שעשית', reply: 'טוב. זה מגיע לי',
        effect: { money: 4000, morale: -12 } },
    ],
  },
  {
    id: 'mate_arrived',
    lines: [
      'גיבור שמעת מה אומרים עליי בעיר??',
      'היה דיבור שאני השחקן הכי טוב בקבוצה',
      'לפני שנה שהתחלתי להתאמן פה לא ידעו מי אני בכלל',
      'תמשיך לצעוק עליי ולהריץ אותי. אני לא רוצה להפסיק',
      'תודה אחי בזכותך.',
    ],
    answers: [
      { label: 'אתה הקפטן הבא פה', reply: 'וואו. לא יודע מה להגיד לך. מרגש.',
        effect: { morale: 12, squadMorale: -3 } },
      { label: 'תמשיך ככה ואל תקרא עיתונים יותר', reply: 'סגור',
        effect: { morale: 4 } },
      { label: 'אל תתבלבל, עוד לא עשית כלום', reply: 'קיבלתי (אימוג\'י עצוב)',
        effect: { morale: -8 } },
    ],
  },
  {
    id: 'mate_season_played',
    lines: [
      'נגמרה העונה',
      'עשית ממני שחקן כדורגל',
      'אני לא שוכח מי שם אותי בהרכב גם שלא הייתי טוב',
      'עוד שנה כזאת ואנחנו עולים ליגה בדוק.',
      'אעבוד קשה בפגרה להשתפר לקראת העונה הבאה אחי.',
    ],
    answers: [
      { label: 'בשנה הבאה אתה בהרכב מהמחזור הראשון', reply: 'מקווה שתשמור על המילה הזאת גם בתחילת העונה',
        effect: { morale: 10, act: 'promiseStart' } },
      { label: 'עונה טובה. תנוח', reply: 'תודה אחי',
        effect: { morale: 4 } },
      { label: 'שיחקת בסדר העונה. יש עוד הרבה עבודה', reply: 'אני מסוגל ליותר. נתראה בהכנה',
        effect: { morale: -5 } },
    ],
  },
  {
    id: 'mate_season_benched',
    lines: [
      'אחי חיכיתי שתגמר העונה',
      'עונה שלמה ישבתי בצד',
      'אני לא בא לריב איתך, בסופו של דבר אתה חבר כמו אח',
      'רק תגיד לי תאכלס אם יש לי מה לחפש בקבוצה לקראת העונה הבאה',
      'לא רוצה לבזבז את הזמן שלי, מבין אותי אחי?',
    ],
    answers: [
      { label: 'שנה הבאה אתה משחק. אני מבטיח', reply: 'אם ככה. אני נשאר בשבילך',
        effect: { morale: 14, act: 'promiseStart' } },
      { label: 'אני לא יכול להבטיח לך כלום', reply: 'תודה שאתה אומר את האמת, חשוב לי הכנות. אחשוב מה אעשה',
        effect: { morale: -6, act: 'mayLeave' } },
      { label: 'אומר לך את האמת. תחפש קבוצה. זה לטובתך', reply: 'אוקיי. תודה על הכל. אני מחפש קבוצה חדשה.',
        effect: { act: 'leaves', squadMorale: -6 } },
    ],
  },
  {
    id: 'mate_promoted',
    lines: [
      'אנחנו בליגה {ליגה}',
      'אתה זוכר את המגרש שבו שיחקנו בתיכון המעפן הזה',
      'עברתי שם היום בדרך לאצטדיון',
      'מי היה מאמין שנגיע לפה.',
    ],
    answers: [
      { label: 'אנחנו לא עוצרים פה, אנחנו מתחילים עונה טירוף', reply: 'גם העונה אנחנו ניתן בראש! בהצלחה',
        effect: { squadMorale: 8 } },
      { label: 'תיהנה מהערב, מגיע לך', reply: 'אני כבר בדרך לחוף עם הבירות',
        effect: { morale: 4 } },
      { label: 'עכשיו מתחיל הקושי האמיתי', reply: 'אתה לא יודע להיות מאושר אה, תשחרר כבר אחי. נתראה בעונה הבאה',
        effect: { morale: -4, prestige: 2 } },
    ],
  },
  {
    id: 'mate_alone',
    lines: [
      'אז זהו, נגמר אחי',
      'דיברתי איתו הבוקר',
      'הוא אומר שהוא מבין, ככה זה בכדורגל.',
      'אני לא ממש מבין האמת',
      'מקווה שאיתי זה אחרת.',
    ],
    answers: [
      { label: 'אותך אני לא מוכר. לעולם. מילה.', reply: 'תזכור מה אמרת עכשיו אחי. נתראה.',
        effect: { morale: 12, act: 'neverSell' } },
      { label: 'זה כדורגל. גם אני לא בחרתי', reply: 'כן. כדורגל',
        effect: { morale: -4 } },
      { label: 'תגיע הצעה טובה, גם אותך אמכור', reply: 'לפחות אתה אמיתי איתי.',
        effect: { morale: -14, squadMorale: -3 } },
    ],
  },];

export function mateThread(id: MateTrigger): MateThread | undefined {
  return MATE_THREADS.find(t => t.id === id);
}

/** The league's name goes into the promotion thread; nothing else has a slot. */
export function fillMate(text: string, ctx: { league: string }): string {
  return text.replace('{ליגה}', ctx.league);
}

/** Every line the friend and the manager can say, for the checks. */
export function everyMateLine(): Array<{ id: MateTrigger; text: string }> {
  return MATE_THREADS.flatMap(t => [
    ...t.lines.map(text => ({ id: t.id, text })),
    ...t.answers.flatMap(a => [{ id: t.id, text: a.label }, { id: t.id, text: a.reply }]),
  ]);
}
