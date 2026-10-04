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
  | 'hot_streak' | 'cold_streak' | 'big_win' | 'big_loss' | 'red_card'
  /* set off by what the manager said in the week, not by the scoreline */
  | 'backed_win' | 'stood_up_owner'
  /* the season's own nights: clinched, crowned, over, or sealed */
  | 'promotion_clinched' | 'title_won' | 'relegation_sealed' | 'season_over_good'
  /* and the rounds with a story of their own */
  | 'late_penalty_save' | 'first_win_season' | 'streak_broken' | 'youth_debut_goal';

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

  /* ------------------------------ what he said in the week, come back to him */
  {
    id: 'fans_backed_win',
    trigger: 'backed_win',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: '{score} מול {rival}' },
      { from: 'רפי', text: 'שמעתם מה היה השבוע? המנכ״ל רצה לקצץ להם בתנאים' },
      { from: 'אלי צ׳יקו', text: 'והמאמן אמר לו לא. עמד מולו בשביל השחקנים' },
      { from: 'שמעון', text: 'וזה מה שקיבלנו בחזרה. עלו ופירקו את {rival}' },
      { from: 'מוקי', text: 'ככה נותנים גב וככה מקבלים גב' },
      { from: 'רפי', text: '{mgr} אתה גבר' },
    ],
  },
  {
    id: 'fans_stood_up',
    trigger: 'stood_up_owner',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'ראיתם מי לא נכנס במחצית?' },
      { from: 'מוקי', text: 'הבן של מי שזה לא יהיה. המאמן לא הכניס אותו' },
      { from: 'אלי צ׳יקו', text: 'הבעלים אמר לו להכניס והוא אמר לו ההרכב שלי' },
      { from: 'שמעון', text: 'מאמן שלא מפחד מהבעלים. מזמן לא היה לנו כזה' },
      { from: 'מוקי', text: 'בלי קומבינות. גבר' },
      { from: 'רפי', text: '{mgr} רק תשמור על הראש, הבעלים לא שוכח' },
    ],
  },

  /* ---------------------------------------------- Itzik's batch, 4.10 */
  {
    id: 'fans_big_win_2',
    trigger: 'big_win',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'מישהו ראה את השוער שלהם בשער השלישי' },
      { from: 'מוקי', text: 'ראה? צילמתי. שומר לימים קשים' },
      { from: 'אלי צ׳יקו', text: '{score} וזה היה יכול להיות יותר, תרשמו' },
      { from: 'שמעון', text: 'אלי תן ליהנות רגע אחד בלי הניתוחים שלך' },
      { from: 'אלי צ׳יקו', text: 'אני נהנה בדרך שלי' },
      { from: 'רפי', text: '{mgr} תעשה את זה כל שבוע ואני סוגר את המכולת בשבתות' },
    ],
  },
  {
    id: 'little_brother_big_win',
    trigger: 'big_win',
    contact: 'אח קטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'אח קטן', text: 'אחחחח' },
      { from: 'אח קטן', text: 'כל הכיתה דיברה על המשחק היום' },
      { from: 'אח קטן', text: 'אמרתי לכולם שאתה אח שלי' },
      { from: 'אח קטן', text: 'המורה למתמטיקה ביקש חתימה שלך, רציני' },
      { from: '', text: 'תגיד לו שחתימה עולה שיעורי בית פחות' },
      { from: 'אח קטן', text: 'אחי אתה גדול' },
    ],
  },
  {
    id: 'owner_big_win',
    trigger: 'big_win',
    contact: 'הבעלים', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הבעלים', text: '{score}' },
      { from: 'הבעלים', text: 'ישבתי בתא עם שני חברים שצחקו עליי כשקניתי את המועדון' },
      { from: 'הבעלים', text: 'היום הם שאלו אם אפשר לבוא גם שבוע הבא' },
      { from: 'הבעלים', text: 'אמרתי להם שכרטיסים עולים כסף' },
      { from: 'הבעלים', text: 'תמשיך ככה' },
    ],
  },
  {
    id: 'fans_big_loss_2',
    trigger: 'big_loss',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: RED,
    lines: [
      { from: 'שמעון', text: 'אני בן אדם מבוגר, ראיתי הכל בחיים' },
      { from: 'שמעון', text: 'אבל מה שראיתי היום זה חדש גם לי' },
      { from: 'מוקי', text: 'שמעון תרגיע אותנו אתה תמיד מרגיע' },
      { from: 'שמעון', text: 'לא הפעם' },
      { from: 'רפי', text: 'אוי' },
      { from: 'אלי צ׳יקו', text: 'כשגם שמעון מתעצבן, המצב רציני חברים' },
    ],
  },
  {
    id: 'mother_big_loss',
    trigger: 'big_loss',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי ראיתי את התוצאה' },
      { from: MOTHER, text: 'לא ראיתי את המשחק, אבא כיבה באמצע' },
      { from: MOTHER, text: 'הוא אמר שזה בשביל הלב שלו' },
      { from: MOTHER, text: 'אתה אכלת משהו היום בכלל' },
      { from: '', text: 'אכלתי אמא' },
      { from: MOTHER, text: 'לא נכון. אני מביאה לך מחר סיר' },
    ],
  },
  {
    id: 'captain_big_loss',
    trigger: 'big_loss',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן, אני יודע שעכשיו לא הזמן' },
      { from: 'הקפטן', text: 'אבל אני רוצה שתדע שהחדר לא התפרק' },
      { from: 'הקפטן', text: 'ישבנו אחרי המשחק בלי אף אחד מהצוות ודיברנו' },
      { from: 'הקפטן', text: 'זה לא יחזור על עצמו. זה ממני אליך' },
      { from: '', text: 'קפטן אמיתי. יום ראשון מתחילים מאפס' },
    ],
  },
  {
    id: 'neighbors_derby_win',
    trigger: 'derby_win',
    contact: 'חברים מהשכונה', subtitle: '3 משתתפים', group: true, accent: ORANGE,
    lines: [
      { from: 'איציק מהבניין', text: 'תגידו ראיתם מי מאמן את האלופה של העיר' },
      { from: 'דודו', text: 'גדלנו איתו במגרש של בית הספר נשבע לכם' },
      { from: 'איציק מהבניין', text: 'פעם שבר לי חלון עם בעיטה' },
      { from: '', text: 'זה היה גול, לא חלון' },
      { from: 'דודו', text: '25 שנה והוא עוד זוכר' },
      { from: 'איציק מהבניין', text: '{mgr} כל השכונה גאה בך אין דברים כאלה' },
    ],
  },
  {
    id: 'mother_derby_win_2',
    trigger: 'derby_win',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'הבן של רחל מהקומה שלישית לא יצא מהבית' },
      { from: MOTHER, text: 'אמרתי לה שישלח לך הודעה יפה כשהוא מתאושש' },
      { from: MOTHER, text: 'כל הבניין ראה את המשחק אצלנו בסלון' },
      { from: MOTHER, text: 'נגמרו לי הכוסות חמודי' },
      { from: '', text: 'אני קונה לך סט חדש אמא' },
      { from: MOTHER, text: 'אל תקנה כלום. רק תנצח גם בסיבוב הבא' },
    ],
  },
  {
    id: 'rival_fan_colleague_derby_win',
    trigger: 'derby_win',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'אלי צ׳יקו', text: 'חברים יש לי במשרד ארבעה אוהדים שלהם' },
      { from: 'אלי צ׳יקו', text: 'מחר אני בא עם הצעיף. לכל היום' },
      { from: 'מוקי', text: 'אלי אתה הולך לחטוף' },
      { from: 'אלי צ׳יקו', text: 'שווה את זה' },
      { from: 'שמעון', text: '{score} בדרבי. אפשר למות בשקט' },
      { from: 'רפי', text: 'שמעון די מה זה הדיבורים האלה, יש עוד דרבי בסיבוב הבא' },
    ],
  },
  {
    id: 'little_brother_derby_loss',
    trigger: 'derby_loss',
    contact: 'אח קטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'אח קטן', text: 'אחי' },
      { from: 'אח קטן', text: 'הסתלבטו עליי כל היום בכיתה' },
      { from: 'אח קטן', text: 'שלושה מהכיתה אוהדים שלהם' },
      { from: '', text: 'תגיד להם שדרבי חוזר בסיבוב הבא' },
      { from: 'אח קטן', text: 'אמרתי. הם צחקו' },
      { from: '', text: 'תזכור מי צחק. אני אזכור בשבילך' },
    ],
  },
  {
    id: 'fans_derby_loss_2',
    trigger: 'derby_loss',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: RED,
    lines: [
      { from: 'רפי', text: 'סגרתי את המכולת מוקדם, אין לי כוח לפרצופים שלהם' },
      { from: 'מוקי', text: 'בא אליך רפי, פותחים בירות בסגירה' },
      { from: 'שמעון', text: 'ילדים, הפסדנו דרבי לא קברנו אף אחד' },
      { from: 'אלי צ׳יקו', text: 'שמעון, ההגנה שיחקה גבוה מדי כל הערב, אמרתי את זה בדקה 10' },
      { from: 'מוקי', text: 'אלי לא עכשיו' },
      { from: 'אלי צ׳יקו', text: 'רק אומר. בסיבוב השני שישחקו נמוך' },
    ],
  },
  {
    id: 'gm_derby_loss_2',
    trigger: 'derby_loss',
    contact: 'מנכ״ל המועדון', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'מנכ״ל המועדון', text: 'אני לא מתקשר כי אין לי מה להגיד' },
      { from: 'מנכ״ל המועדון', text: 'קיבלתי שבעים הודעות מאז השריקה' },
      { from: 'מנכ״ל המועדון', text: 'אחת מהן מהבעלים. רק נקודה. בלי טקסט' },
      { from: 'מנכ״ל המועדון', text: 'אתה מבין לבד' },
      { from: '', text: 'מבין. יום ראשון אני איתו בטלפון' },
    ],
  },
  {
    id: 'fans_derby_draw_2',
    trigger: 'derby_draw',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: 'נו מה עושים עם תיקו כזה' },
      { from: 'רפי', text: 'שותים קפה והולכים לישון' },
      { from: 'אלי צ׳יקו', text: 'תיקו בדרבי זה כמו חתונה בלי אוכל ושתייה.שילמת ולא נהנת.' },
      { from: 'שמעון', text: 'העיקר שהכבוד נשאר אצלנו ברחוב' },
      { from: 'מוקי', text: 'איזה כבוד שמעון, הם אומרים שהכבוד אצלם' },
      { from: 'שמעון', text: 'שיגידו. אנחנו יודעים' },
    ],
  },
  {
    id: 'mother_derby_draw',
    trigger: 'derby_draw',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'נו חמודי אז מי ניצח בסוף' },
      { from: '', text: 'אף אחד אמא, תיקו' },
      { from: MOTHER, text: 'אז למה אבא עצבני' },
      { from: '', text: 'כי זה דרבי' },
      { from: MOTHER, text: 'לא מבינה את המשחק הזה שלכם' },
      { from: MOTHER, text: 'העיקר שאתה בריא. תבוא בשבת' },
    ],
  },
  {
    id: 'rival_mgr_derby_draw_2',
    trigger: 'derby_draw',
    contact: 'המאמן של {rival}', subtitle: 'נראה לאחרונה היום', group: false, accent: ORANGE,
    lines: [
      { from: 'המאמן של {rival}', text: 'ערב קשוח' },
      { from: 'המאמן של {rival}', text: 'הקהל שלך היה יותר טוב משלי היום, אני מודה' },
      { from: '', text: 'והקבוצה?' },
      { from: 'המאמן של {rival}', text: 'על זה לא מודים בכתב' },
      { from: 'המאמן של {rival}', text: 'נתראה בסיבוב הבא. תשמור על עצמך' },
    ],
  },
  {
    id: 'mother_hat_trick',
    trigger: 'hat_trick',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי מי זה {who}' },
      { from: MOTHER, text: 'כולם בטלוויזיה צועקים את השם שלו' },
      { from: '', text: 'שחקן שלי אמא, כבש שלושער' },
      { from: MOTHER, text: 'תביא גם אותו בשישי לקידוש' },
      { from: MOTHER, text: 'ילד שכובש שלושה שערים מגיע לו מרק אמיתי' },
      { from: '', text: 'אני אגיד לו. הוא יבוא, מהאוכל שלך לא בורחים' },
    ],
  },
  {
    id: 'fans_hat_trick_2',
    trigger: 'hat_trick',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'מכרתי היום בצהריים חטיף חלבון ל{who} במכולת' },
      { from: 'רפי', text: 'אם הייתי יודע הייתי נותן חינם' },
      { from: 'מוקי', text: 'רפי תתחיל לתת לו חינם קבוע, שיכבוש שלושער כל שבוע' },
      { from: 'אלי צ׳יקו', text: 'הגול השני שלו, תראו שוב בצילומים. יצירת אמנות' },
      { from: 'שמעון', text: 'מזמן לא יצא לי לקום שלוש פעמים במשחק אחד' },
      { from: 'מוקי', text: 'שמעון קמת? אתה? היה שווה לבוא רק בשביל זה' },
    ],
  },
  {
    id: 'rival_mgr_hat_trick',
    trigger: 'hat_trick',
    contact: 'המאמן של {rival}', subtitle: 'נראה לאחרונה היום', group: false, accent: ORANGE,
    lines: [
      { from: 'המאמן של {rival}', text: 'תעשה לי טובה' },
      { from: 'המאמן של {rival}', text: 'תגיד ל{who} שלך שיש עוד קבוצות בליגה' },
      { from: 'המאמן של {rival}', text: 'שלושה שערים על ההגנה שלי. אני לא ישן הלילה' },
      { from: '', text: 'לא אומר לו כלום,שימשיך ככה!' },
      { from: 'המאמן של {rival}', text: 'זה מה שחשבתי' },
    ],
  },
  {
    id: 'pe_teacher_hot_streak',
    trigger: 'hot_streak',
    contact: 'המורה לחינוך גופני', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'המורה לחינוך גופני', text: 'תגיד, אתה זוכר אותי בכלל' },
      { from: '', text: 'המורה אבי? ברור שאני זוכר' },
      { from: 'המורה לחינוך גופני', text: 'עקבתי אחריך כל השנים. שלושה ניצחונות רצוף' },
      { from: 'המורה לחינוך גופני', text: 'תמיד אמרתי שאתה רואה מגרש אחרת מכולם' },
      { from: 'המורה לחינוך גופני', text: 'גאה בך ילד. תמשיך' },
      { from: '', text: 'בזכותך התחלתי את התחום, תודה.' },
    ],
  },
  {
    id: 'fans_hot_streak_2',
    trigger: 'hot_streak',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: 'אני לא מכבס את החולצה' },
      { from: 'רפי', text: 'מוקי זה המשחק השלישי. תכבס' },
      { from: 'מוקי', text: 'אתה רוצה לשבור את הרצף? אתה תהיה אחראי' },
      { from: 'אלי צ׳יקו', text: 'סטטיסטית אין קשר בין החולצה לתוצאות' },
      { from: 'מוקי', text: 'אלי, סטטיסטית אתה חרטטן' },
      { from: 'שמעון', text: 'החולצה לא מתכבסת. סגור. מוקי צודק' },
    ],
  },
  {
    id: 'gm_hot_streak',
    trigger: 'hot_streak',
    contact: 'מנכ״ל המועדון', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'מנכ״ל המועדון', text: 'שלושה רצוף. הטלפון שלי מצלצל מסיבות טובות סוף סוף' },
      { from: 'מנכ״ל המועדון', text: 'שני ספונסרים חדשים ביקשו פגישה השבוע' },
      { from: 'מנכ״ל המועדון', text: 'אני לא אומר כלום בקול רם, אתה מבין אותי' },
      { from: '', text: 'מבין. גם אני לא אומר' },
      { from: 'מנכ״ל המועדון', text: 'בדיוק. לא אמרנו כלום. בהצלחה בשבת' },
    ],
  },
  {
    id: 'fans_cold_streak',
    trigger: 'cold_streak',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: RED,
    lines: [
      { from: 'מוקי', text: 'אני לא מאשים אף אחד' },
      { from: 'מוקי', text: 'אבל שלושה הפסדים זה לא מקרה' },
      { from: 'אלי צ׳יקו', text: 'סוף סוף מוקי מדבר כמוני' },
      { from: 'רפי', text: 'חברים בלי לריב. באים שבת?' },
      { from: 'שמעון', text: 'ברור שבאים. דווקא עכשיו באים' },
      { from: 'שמעון', text: 'בימים הטובים כולם אוהדים. עכשיו רואים מי אמיתי' },
    ],
  },
  {
    id: 'little_brother_cold_streak',
    trigger: 'cold_streak',
    contact: 'אח קטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'אח קטן', text: 'אחי אתה בסדר?' },
      { from: 'אח קטן', text: 'ראיתי מה כותבים עליך בטוקבקים' },
      { from: '', text: 'אל תקרא טוקבקים' },
      { from: 'אח קטן', text: 'עניתי לאחד מהם. מחקתי אחר כך' },
      { from: '', text: 'טוב עשית שמחקת' },
      { from: 'אח קטן', text: 'אני מאמין בך יותר מכולם שתדע' },
    ],
  },
  {
    id: 'mother_cold_streak_2',
    trigger: 'cold_streak',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי עזוב אותך מהכדורגל רגע' },
      { from: MOTHER, text: 'מתי ישנת לילה שלם בפעם האחרונה' },
      { from: '', text: 'אני ישן אמא' },
      { from: MOTHER, text: 'הפרצוף שלך בטלוויזיה אומר אחרת' },
      { from: MOTHER, text: 'שלושה הפסדים זה לא בגלל שאתה לא טוב. זה בגלל שאתה עייף' },
      { from: MOTHER, text: 'לך לישון עכשיו. אוהבת.' },
    ],
  },
  {
    id: 'mother_red_card',
    trigger: 'red_card',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי ראיתי שהשופט הוציא כרטיס אדום לילד שלכם' },
      { from: MOTHER, text: 'למה הוא עשה את זה הילד נראה כזה מתוק' },
      { from: '', text: 'הוא עשה עבירה אמא' },
      { from: MOTHER, text: 'בטח לא בכוונה' },
      { from: MOTHER, text: 'תגיד לו שלא ייקח ללב. ושיאכל טוב הערב' },
      { from: '', text: 'אני אעביר לו' },
    ],
  },
  {
    id: 'who_father_red_card',
    trigger: 'red_card',
    contact: 'אבא של {who}', subtitle: 'מקוון', group: false, accent: GREY,
    lines: [
      { from: 'אבא של {who}', text: 'ערב טוב המאמן, סליחה שאני כותב' },
      { from: 'אבא של {who}', text: 'הבן שלי לא מדבר מאז המשחק. נעול בחדר' },
      { from: 'אבא של {who}', text: 'הוא מפחד שתוריד אותו מההרכב' },
      { from: 'אבא של {who}', text: 'לא ביקשתי ממנו רשות לכתוב לך. אבא זה אבא' },
      { from: '', text: 'תגיד לו שמחר באימון מדברים. פנים מול פנים, לא בטלפון' },
      { from: 'אבא של {who}', text: 'תודה. זה כל מה שהוא צריך לשמוע' },
    ],
  },
  {
    id: 'veteran_red_card',
    trigger: 'red_card',
    contact: 'המנג׳ר הוותיק', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'המנג׳ר הוותיק', text: 'ראיתי את האדום של {who}' },
      { from: 'המנג׳ר הוותיק', text: 'ביני לבינך, אל תקבור אותו השבוע' },
      { from: 'המנג׳ר הוותיק', text: 'אני חטפתי אדום בדרבי בגיל 22. המאמן שלי לא דיבר איתי שבועיים' },
      { from: 'המנג׳ר הוותיק', text: 'עד היום אני זוכר את השבועיים האלה יותר מהאדום' },
      { from: '', text: 'מחר אני יושב איתו ראשון' },
      { from: 'המנג׳ר הוותיק', text: 'בדיוק בגלל זה אתה המאמן ואנחנו כולנו פה' },
    ],
  },
  {
    id: 'captain_backed_win',
    trigger: 'backed_win',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן, החבר׳ה יודעים מה עשית השבוע' },
      { from: 'הקפטן', text: 'דברים כאלה לא נשארים בסוד בחדר הלבשה' },
      { from: 'הקפטן', text: 'ראית איך רצו היום? זה לא היה בשביל הטבלה' },
      { from: 'הקפטן', text: 'זה היה בשבילך' },
      { from: '', text: 'זה היה בשבילם. תגיד להם' },
    ],
  },
  {
    id: 'veteran_backed_win',
    trigger: 'backed_win',
    contact: 'המנג׳ר הוותיק', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'המנג׳ר הוותיק', text: 'עשרים שנה אני במועדון הזה' },
      { from: 'המנג׳ר הוותיק', text: 'ראיתי מאמנים באים והולכים' },
      { from: 'המנג׳ר הוותיק', text: 'מה שעשית מול ההנהלה השבוע, אחד מתוך עשרה היו עושים' },
      { from: 'המנג׳ר הוותיק', text: 'ו{score} היום זה לא צירוף מקרים' },
      { from: '', text: 'נשאר בינינו' },
      { from: 'המנג׳ר הוותיק', text: 'כבר לא. כולם יודעים' },
    ],
  },
  {
    id: 'gm_backed_win',
    trigger: 'backed_win',
    contact: 'מנכ״ל המועדון', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'מנכ״ל המועדון', text: 'אני אמור לכעוס עליך על השבוע' },
      { from: 'מנכ״ל המועדון', text: 'עמדת מולי מול כולם' },
      { from: 'מנכ״ל המועדון', text: 'ואז ראיתי את המשחק היום' },
      { from: 'מנכ״ל המועדון', text: 'טוב. אולי ידעת משהו שאני לא ידעתי' },
      { from: '', text: 'מכיר את חדר ההלבשה שלי' },
      { from: 'מנכ״ל המועדון', text: 'שיהיה. נצחונות מוחקים ויכוחים' },
    ],
  },
  {
    id: 'captain_stood_up',
    trigger: 'stood_up_owner',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן, שמעתי מה קרה עם הבעלים' },
      { from: 'הקפטן', text: 'אני לא שואל אם זה נכון. אני מכיר אותך' },
      { from: 'הקפטן', text: 'רק שתדע, בחדר דיברו על זה היום' },
      { from: 'הקפטן', text: 'שחקנים זוכרים מי שומר עליהם' },
      { from: '', text: 'אני שומר על חדר ההלבשה, לא על שחקנים. יש הבדל' },
      { from: 'הקפטן', text: 'ההבדל הזה הוא בדיוק למה הולכים אחריך' },
    ],
  },
  {
    id: 'mother_stood_up',
    trigger: 'stood_up_owner',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי קראתי בעיתון שרבת עם הבעלים שלך' },
      { from: MOTHER, text: 'אתה בטוח שזה חכם? הוא נשמע עשיר' },
      { from: '', text: 'אמא, הוא ביקש משהו לא מקצועי' },
      { from: MOTHER, text: 'אז בסדר. העיקר שעמדת על שלך' },
      { from: MOTHER, text: 'אבא אומר שככה עושים בעולם שלכם' },
      { from: MOTHER, text: 'אבל אם יפטרו אותך יש לך חדר פה. סתם שתדע' },
    ],
  },
  {
    id: 'fans_stood_up_2',
    trigger: 'stood_up_owner',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'שמעון', text: 'אני שלושים שנה ביציע' },
      { from: 'שמעון', text: 'ראיתי מאמנים שהכניסו כל מיני בנים של כל מיני אנשים' },
      { from: 'שמעון', text: 'זאת הפעם הראשונה שאני רואה אחד שאומר לא' },
      { from: 'מוקי', text: 'שמעון מתרגש, חבר׳ה תצלמו את הרגע' },
      { from: 'רפי', text: '{mgr} גבר של פעם' },
      { from: 'אלי צ׳יקו', text: 'טקטית אני לא תמיד מסכים איתו. בתור בן אדם, מוריד את הכובע.' },
    ],
  },
  {
    id: 'fans_promotion',
    trigger: 'promotion_clinched',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'עוליםםםםם' },
      { from: 'רפי', text: 'עוליםםםםםםםם' },
      { from: 'מוקי', text: 'רפי תנשום' },
      { from: 'רפי', text: 'לא רוצה לנשום' },
      { from: 'שמעון', text: 'חיכיתי לזה שנים. תודה לכם שהייתם איתי בדרך' },
      { from: 'אלי צ׳יקו', text: 'גם בליגה למעלה אני אשב באותו מקום ביציע, שיהיה ברור' },
      { from: 'מוקי', text: '{mgr} אתה אגדת המועדון מהיום. מילה שלי' },
    ],
  },
  {
    id: 'mother_promotion',
    trigger: 'promotion_clinched',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי אבא בוכה' },
      { from: MOTHER, text: 'הוא אומר שזה מהבצל אבל אין בצל בבית' },
      { from: MOTHER, text: 'כל הבניין ירד לרחוב עם דגלים' },
      { from: MOTHER, text: 'הבן של רחל מהקומה שלישית סגר תריסים' },
      { from: '', text: 'אמא תגידי לאבא שאני אוהב אותו' },
      { from: MOTHER, text: 'הוא שומע אותך. עכשיו הוא בוכה יותר' },
    ],
  },
  {
    id: 'owner_promotion',
    trigger: 'promotion_clinched',
    contact: 'הבעלים', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הבעלים', text: 'עשית את זה' },
      { from: 'הבעלים', text: 'אני זוכר את היום שחתמת. היו לי ספקות, אני מודה' },
      { from: 'הבעלים', text: 'היום אין' },
      { from: 'הבעלים', text: 'תתכונן, הליגה למעלה זה עולם אחר. הכסף, הלחץ, הכל' },
      { from: '', text: 'בנינו סגל בשביל זה. מוכנים' },
      { from: 'הבעלים', text: 'אני יודע. בגלל זה אתה עוד פה' },
    ],
  },
  {
    id: 'rival_mgr_promotion',
    trigger: 'promotion_clinched',
    contact: 'המאמן של {rival}', subtitle: 'נראה לאחרונה היום', group: false, accent: ORANGE,
    lines: [
      { from: 'המאמן של {rival}', text: 'שמעתי שסגרתם את העלייה' },
      { from: 'המאמן של {rival}', text: 'מגיע לכם. עקבתי אחריכם כל העונה' },
      { from: 'המאמן של {rival}', text: 'תעשה לי טובה אחת בליגה מעלינו' },
      { from: 'המאמן של {rival}', text: 'תראה להם ששם לא יודעים הכל' },
      { from: '', text: 'סגור. ושנה הבאה תעלה גם אתה' },
      { from: 'המאמן של {rival}', text: 'אמן.מהפה שלך!' },
    ],
  },
  {
    id: 'fans_pen_save',
    trigger: 'late_penalty_save',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: 'הלב שלי עצר ביחד עם הפנדל' },
      { from: 'רפי', text: 'אני עוד רועד נשבע לכם' },
      { from: 'שמעון', text: 'עמדתי. פעם ראשונה העונה שקמתי לשוער' },
      { from: 'אלי צ׳יקו', text: 'ידעתי שהוא עוצר. הוא תמיד קופץ לפינה הזאת' },
      { from: 'מוקי', text: 'אלי לפני דקה צעקת שנגמר המשחק' },
      { from: 'אלי צ׳יקו', text: 'צעקתי בשביל האווירה' },
    ],
  },
  {
    id: 'keeper_pen_save',
    trigger: 'late_penalty_save',
    contact: '{who}', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: '{who}', text: 'מאמן ראית???' },
      { from: '{who}', text: 'כל השבוע עבדנו על הפנדלים האלה!' },
      { from: '{who}', text: 'בדיוק כמו בסרטונים שהראית לי' },
      { from: '', text: 'אתה עצרת, לא הסרטונים. תהיה גאה בעצמך' },
      { from: '{who}', text: 'הידיים שלי עוד רועדות' },
      { from: '', text: 'שירעדו. ככה מרגיש רגע גדול' },
    ],
  },
  {
    id: 'mother_pen_save',
    trigger: 'late_penalty_save',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי מה זה היה בסוף המשחק' },
      { from: MOTHER, text: 'אבא קפץ מהספה ושפך את הכוס קפה.' },
      { from: MOTHER, text: 'הילד הזה עם הכפפות, מי זה? קר לו?' },
      { from: '', text: 'השוער שלי אמא. הציל לנו את הנקודות' },
      { from: MOTHER, text: 'תגיד לו שהוא מוזמן בשישי לקידוש.' },
      { from: MOTHER, text: 'ילד עם ידיים כאלה צריך להיות במטבח.' },
    ],
  },
  {
    id: 'gm_pen_save',
    trigger: 'late_penalty_save',
    contact: 'מנכ״ל המועדון', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'מנכ״ל המועדון', text: 'אני יושב ביציע ליד הבעלים' },
      { from: 'מנכ״ל המועדון', text: 'כשהשופט שרק פנדל הוא תפס לי את היד' },
      { from: 'מנכ״ל המועדון', text: 'כשהשוער עצר הוא לא עזב אותה עוד שתי דקות' },
      { from: 'מנכ״ל המועדון', text: 'יש לי סימנים. שווה כל סימן' },
      { from: '', text: 'תשלח תמונה' },
      { from: 'מנכ״ל המועדון', text: 'הוא גומר אותי אם אני שולח' },
    ],
  },
  {
    id: 'fans_first_win',
    trigger: 'first_win_season',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'סוף סוף!!!' },
      { from: 'מוקי', text: 'כבר שכחתי איך זה מרגיש' },
      { from: 'שמעון', text: 'ניצחון ראשון זה כמו גשם ראשון. אחריו הכל צומח' },
      { from: 'אלי צ׳יקו', text: 'שמעון מאיפה אתה מביא את המשפטים האלה' },
      { from: 'שמעון', text: 'מהחיים אלי. מהחיים' },
      { from: 'רפי', text: 'העיקר שפתחנו את הברז. עכשיו שיזרום' },
    ],
  },
  {
    id: 'captain_first_win',
    trigger: 'first_win_season',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן, שמעת את חדר ההלבשה אחרי השריקה?' },
      { from: 'הקפטן', text: 'מזמן לא היה פה רעש כזה' },
      { from: 'הקפטן', text: 'החבר׳ה היו צריכים את זה כמו אוויר' },
      { from: 'הקפטן', text: 'עכשיו אפשר להתחיל את העונה באמת' },
      { from: '', text: 'עכשיו מתחילים. תגיד להם שזה רק הראשון' },
    ],
  },
  {
    id: 'little_brother_first_win',
    trigger: 'first_win_season',
    contact: 'אח קטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'אח קטן', text: 'נצחתםםםם' },
      { from: 'אח קטן', text: 'סוף סוף אני יכול ללכת לבית ספר בלי כובע' },
      { from: '', text: 'הסתרת את הפרצוף עד עכשיו?' },
      { from: 'אח קטן', text: 'אחי לא היה קל' },
      { from: 'אח קטן', text: 'מחר אני בא עם החולצה שלכם. קדימה מפה רק למעלה' },
    ],
  },
  {
    id: 'fans_streak_broken',
    trigger: 'streak_broken',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: 'נשמתי. פעם ראשונה מזה חודש אני נושם' },
      { from: 'רפי', text: 'אצלי במכולת היום כולם יקנו בחיוך' },
      { from: 'שמעון', text: 'אמרתי לכם לא לקפוץ מהגג. אמרתי או לא אמרתי' },
      { from: 'אלי צ׳יקו', text: 'אף אחד לא קפץ שמעון' },
      { from: 'שמעון', text: 'כי אמרתי' },
      { from: 'מוקי', text: 'העיקר שחזרנו. {mgr} בוא לא נחזור לשם בבקשה' },
    ],
  },
  {
    id: 'owner_streak_broken',
    trigger: 'streak_broken',
    contact: 'הבעלים', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הבעלים', text: 'סוף סוף' },
      { from: 'הבעלים', text: 'אני לא אשקר, היו לי שיחות השבוע שאתה לא רוצה לדעת עליהן' },
      { from: 'הבעלים', text: 'הניצחון הזה קנה לך שקט' },
      { from: 'הבעלים', text: 'כמה שקט? תלוי בשבת הבאה' },
      { from: '', text: 'שבת הבאה נדאג שתתקשר רק לברך' },
      { from: 'הבעלים', text: 'הלוואי. יש לי מספיק שיחות אחרות' },
    ],
  },
  {
    id: 'mother_streak_broken',
    trigger: 'streak_broken',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי ניצחתם!' },
      { from: MOTHER, text: 'אבא חזר לדבר בארוחת ערב' },
      { from: MOTHER, text: 'שבועיים הוא אכל בשקט מול הצלחת' },
      { from: '', text: 'אמא הוא יודע שאני לא אוהב שהוא שותק, נכון?' },
      { from: MOTHER, text: 'הוא אומר שהשתיקה שלו עוזרת לקבוצה' },
      { from: MOTHER, text: 'אל תיקח לו את זה. זה כל מה שיש לו' },
    ],
  },
  {
    id: 'youth_coach_debut_goal',
    trigger: 'youth_debut_goal',
    contact: 'מאמן הנוער', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'מאמן הנוער', text: 'ראית?? ראית מה הילד עשה??' },
      { from: 'מאמן הנוער', text: 'שלוש שנים אני אומר לך עליו' },
      { from: 'מאמן הנוער', text: 'ההורים שלו ביציע בכו. אני כמעט' },
      { from: 'מאמן הנוער', text: 'תודה שנתת לו את הבמה. לא כל מאמן בוגרים נותן' },
      { from: '', text: 'אתה גידלת, אני רק נתתי לו הזדמנות' },
      { from: 'מאמן הנוער', text: 'ההודעה הזאת שווה לי יותר מהמשכורת' },
    ],
  },
  {
    id: 'fans_debut_goal',
    trigger: 'youth_debut_goal',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'מוקי', text: 'ילד מהשכונה כובש בבכורה' },
      { from: 'מוקי', text: 'אין סיפור יותר יפה מזה בכדורגל' },
      { from: 'רפי', text: 'אני מכיר את סבא שלו! קונה אצלי לחם כל בוקר' },
      { from: 'שמעון', text: 'ככה זה צריך להיות. ילדים מהבית, לא קניות מבחוץ' },
      { from: 'אלי צ׳יקו', text: 'תרשמו את התאריך. פה התחילה קריירה' },
      { from: 'רפי', text: 'מחר הלחם לסבא חינם' },
    ],
  },
  {
    id: 'who_debut_goal',
    trigger: 'youth_debut_goal',
    contact: '{who}', subtitle: 'מקוון', group: false, accent: GOLD,
    lines: [
      { from: '{who}', text: 'מאמן אני לא מאמין שזה קרה' },
      { from: '{who}', text: 'שמרתי את הכדור. מותר לי לשמור אותו?' },
      { from: '', text: 'מותר. שער בכורה שומרים לכל החיים' },
      { from: '{who}', text: 'אמא שלי שמה אותו בסלון כבר' },
      { from: '{who}', text: 'תודה שהאמנת בי מאמן' },
      { from: '', text: 'עכשיו תתחיל העבודה האמיתית. תבוא מחר רגוע' },
    ],
  },
  {
    id: 'agent_debut_goal',
    trigger: 'youth_debut_goal',
    contact: 'סוכן שחקנים', subtitle: 'נראה לאחרונה היום', group: false, accent: GREY,
    lines: [
      { from: 'סוכן שחקנים', text: 'ערב טוב מאמן' },
      { from: 'סוכן שחקנים', text: 'הילד שכבש היום, יש לו סוכן?' },
      { from: '', text: 'יש לו שיעורי בית ואימון מחר בבוקר' },
      { from: 'סוכן שחקנים', text: 'אני רק שואל' },
      { from: '', text: 'אני רק עונה' },
      { from: 'סוכן שחקנים', text: 'הבנתי אותך. נדבר בעוד שנה' },
    ],
  },
  {
    id: 'fans_season_over_good',
    trigger: 'season_over_good',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'שמעון', text: 'זהו. נגמרה עונה' },
      { from: 'שמעון', text: 'רוצה להגיד משהו ברצינות רגע' },
      { from: 'שמעון', text: 'היו עונות שבאתי ליציע כי אני מכור לקבוצה. השנה באתי מהלב' },
      { from: 'מוקי', text: 'שמעון אתה תבכה לי פה' },
      { from: 'רפי', text: 'תן לו מוקי. הוא צודק' },
      { from: 'אלי צ׳יקו', text: 'גם אני מסכים. וזה נדיר שאני מסכים' },
      { from: 'מוקי', text: '{mgr} תודה על עונה. עכשיו לך תנוח, בקיץ נדאג לך' },
    ],
  },
  {
    id: 'mother_season_over',
    trigger: 'season_over_good',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי נגמרה העונה?' },
      { from: '', text: 'נגמרה אמא' },
      { from: MOTHER, text: 'יופי. עכשיו אתה בא הביתה לשבוע' },
      { from: MOTHER, text: 'לא שואלת. מודיעה' },
      { from: MOTHER, text: 'אבא כבר ניקה את החדר שלך' },
      { from: '', text: 'אמא אני בן ארבעים' },
      { from: MOTHER, text: 'בן ארבעים עם חדר נקי. תבוא' },
    ],
  },
  {
    id: 'captain_season_over',
    trigger: 'season_over_good',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן, לפני שכולם מתפזרים לחופש' },
      { from: 'הקפטן', text: 'עשיתי סבב בחדר. כולם רוצים להישאר' },
      { from: 'הקפטן', text: 'אתה יודע כמה נדיר זה בסוף עונה?' },
      { from: 'הקפטן', text: 'תשמור על הגרעין הזה בקיץ. זה הנכס שלנו' },
      { from: '', text: 'עובד על זה כבר עכשיו. לך תנוח, מגיע לך' },
    ],
  },
  {
    id: 'fans_title',
    trigger: 'title_won',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: GOLD,
    lines: [
      { from: 'רפי', text: 'אלופיםםםםםםם' },
      { from: 'מוקי', text: 'אני בוכה ולא אכפת לי' },
      { from: 'שמעון', text: '30 שנה ביציע. בשביל הרגע הזה' },
      { from: 'שמעון', text: 'אבא שלי לא זכה לראות. היום ראיתי בשבילו' },
      { from: 'אלי צ׳יקו', text: 'אין לי ניתוח. אין לי הערות. אלופים' },
      { from: 'מוקי', text: 'אלי בלי הערות?? תצלמו גם את זה' },
      { from: 'רפי', text: '{mgr} שם של אגדה. רחוב על שמך בעיר, אני מתחיל עצומה' },
    ],
  },
  {
    id: 'owner_title',
    trigger: 'title_won',
    contact: 'הבעלים', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הבעלים', text: 'אלוף' },
      { from: 'הבעלים', text: 'קניתי את המועדון הזה כשכולם אמרו לי שאני משוגע' },
      { from: 'הבעלים', text: 'היום אף אחד לא אומר כלום' },
      { from: 'הבעלים', text: 'תבוא מחר למשרד. יש שמפניה ויש חוזה חדש על השולחן' },
      { from: '', text: 'מחר. היום אני עם השחקנים' },
      { from: 'הבעלים', text: 'בדיוק התשובה של אלוף. לך תחגוג' },
    ],
  },
  {
    id: 'little_brother_title',
    trigger: 'title_won',
    contact: 'אח קטן', subtitle: 'מקוון', group: false, accent: BLUE,
    lines: [
      { from: 'אח קטן', text: 'אחי אתה אלוף' },
      { from: 'אח קטן', text: 'אלוף אמיתי. לא בפלייסטיישן. בחיים' },
      { from: 'אח קטן', text: 'אני הולך מחר לבית ספר עם המדליה שלך אם תיתן לי' },
      { from: '', text: 'היא שלך. אבל תחזיר אותה שלמה' },
      { from: 'אח קטן', text: 'נשבע לך בכל מה שיש' },
      { from: 'אח קטן', text: 'אחי הכי גאה בך בעולם' },
    ],
  },
  {
    id: 'fans_relegated',
    trigger: 'relegation_sealed',
    contact: `${FANS} 🔥`, subtitle: '4 משתתפים', group: true, accent: RED,
    lines: [
      { from: 'מוקי', text: 'זהו אה' },
      { from: 'רפי', text: 'זהו' },
      { from: 'שמעון', text: 'ירדתי עם הקבוצה הזאת פעמיים בחיים. עליתי איתה שלוש' },
      { from: 'שמעון', text: 'מי שסופר רק ירידות לא אוהד. מי שנשאר, אוהד' },
      { from: 'אלי צ׳יקו', text: 'שנה הבאה ליגה למטה. אותו יציע, אותם אנשים' },
      { from: 'מוקי', text: 'אני מחדש מנוי מחר ראשון. מי איתי' },
      { from: 'רפי', text: 'כולנו מוקי. כולנו' },
    ],
  },
  {
    id: 'mother_relegated',
    trigger: 'relegation_sealed',
    contact: MOTHER, subtitle: 'מקוון', group: false, accent: PLUM,
    lines: [
      { from: MOTHER, text: 'חמודי שמעתי' },
      { from: MOTHER, text: 'לא מבינה בליגות אבל מבינה בפרצוף שלך' },
      { from: MOTHER, text: 'תקשיב לי טוב' },
      { from: MOTHER, text: 'גם כשנפלת מהאופניים בגיל שש קמת. ישר קמת' },
      { from: MOTHER, text: 'אז תיפול ותקום. זה מה שאתה יודע לעשות הכי טוב' },
      { from: '', text: 'תודה אמא' },
      { from: MOTHER, text: 'אוהבת אותך ותזכור שאתה אלוף בשבילי תמיד.' },
    ],
  },
  {
    id: 'captain_relegated',
    trigger: 'relegation_sealed',
    contact: 'הקפטן', subtitle: 'מקוון', group: false, accent: GREEN,
    lines: [
      { from: 'הקפטן', text: 'מאמן' },
      { from: 'הקפטן', text: 'אני יודע שעכשיו כולם יברחו. סוכנים, עיתונאים, הצעות' },
      { from: 'הקפטן', text: 'אני רוצה שתשמע את זה ממני ראשון' },
      { from: 'הקפטן', text: 'אני נשאר. עולים איתך בחזרה' },
      { from: '', text: 'אתה לא חייב. יהיו לך הצעות מלמעלה' },
      { from: 'הקפטן', text: 'היו. אמרתי להם שאני באמצע פרויקט' },
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
  /** a season night the save has certified: clinched, crowned, over or sealed */
  seasonEvent?: 'promotion_clinched' | 'title_won' | 'relegation_sealed' | 'season_over_good';
  /** my keeper's surname, for the night he stopped a late penalty */
  keeper?: string;
  /** the academy boy who scored on his first appearance */
  youthGoal?: string;
}): { trigger: ChatTrigger; who?: string } | null {
  const { margin, isDerby, form, facts = [], seasonEvent, keeper, youthGoal } = input;
  const last3 = form.slice(-3);
  const streak = (r: 'W' | 'L') => last3.length === 3 && last3.every(x => x === r);
  const fact = (k: MatchFact['kind']) => facts.find(f => f.kind === k);

  // the season's own nights beat any single scoreline
  if (seasonEvent) return { trigger: seasonEvent };


  if (isDerby && margin > 0) return { trigger: 'derby_win' };
  if (isDerby && margin < 0) return { trigger: 'derby_loss' };
  if (isDerby) return { trigger: 'derby_draw' };
  const hat = fact('hat_trick');
  if (hat) return { trigger: 'hat_trick', who: hat.who };
  // the boy's night is celebrated only when the team did not pay for it
  if (youthGoal && margin >= 0) return { trigger: 'youth_debut_goal', who: youthGoal };
  // the first win of a season that opened dry, and the one that breaks a slide
  const before = form.slice(0, -1);
  if (margin > 0 && before.length >= 2 && !before.includes('W')) return { trigger: 'first_win_season' };
  const slide = (() => { let n = 0; for (let i = before.length - 1; i >= 0 && before[i] === 'L'; i--) n++; return n; })();
  if (margin > 0 && slide >= 3) return { trigger: 'streak_broken' };
  if (streak('W')) return { trigger: 'hot_streak' };
  if (streak('L')) return { trigger: 'cold_streak' };
  if (margin >= 3) return { trigger: 'big_win' };
  if (margin <= -3) return { trigger: 'big_loss' };
  const pen = facts.find(f => f.kind === 'penalty_saved' && (f.minute ?? 0) >= 80);
  if (pen && keeper) return { trigger: 'late_penalty_save', who: keeper };
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
