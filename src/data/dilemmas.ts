/**
 * Template driven dilemmas. Each is a shell with {slots} filled from the live
 * game state (your star, the man rotting on the bench and how many rounds he
 * has sat, this week's rival, where you actually are in the table). One
 * template yields hundreds of variants, a cooldown stops repeats, and a `when`
 * gate stops a template firing when it would make no sense, so the reserve
 * never demands minutes on the opening round.
 *
 * Every option moves at least two meters, usually in opposite directions.
 * There is no free lunch, that is what makes it a decision and not a story.
 */

import type { Rng } from '../engine/matchEngine.ts';

export type Speaker =
  | 'owner' | 'veteran' | 'reporter' | 'ultras'
  | 'player' | 'agent' | 'director' | 'physio' | 'youth' | 'sponsor';

export interface DilemmaEffect {
  money?: number;
  morale?: number;
  prestige?: number;
}

export interface DilemmaOption {
  label: string;
  effect: DilemmaEffect;
  outcome: string;   // shown after choosing
  /** this choice releases the subject from the squad, for real */
  release?: boolean;
}

export interface DilemmaTemplate {
  id: string;
  speaker: Speaker;
  /**
   * Which real player this is about, as a Ctx name field. A dilemma with a
   * subject shows his name, and a release option removes exactly him. Without
   * it "שחקן בסגל" asked for minutes, you promised or refused, and there was no
   * way to ever know whether your answer meant anything, because it did not.
   */
  subject?: 'star' | 'benched' | 'youngster' | 'veteranName' | 'scorer' | 'dry';
  slots: Record<string, string[]>;
  text: string;                 // uses {slot} and any Ctx field
  /** only offered when this holds, so the fiction never contradicts the save */
  when?: (c: Ctx) => boolean;
  options: (ctx: Ctx) => DilemmaOption[];
}

export interface Ctx {
  star: string;
  rival: string;
  club: string;
  money: number;
  /** the man with the fewest appearances, empty when the squad is fresh */
  benched: string;
  benchedApps: number;
  /** a young prospect, a long serving veteran, the top scorer, a striker in a drought */
  youngster: string;
  veteranName: string;
  scorer: string;
  dry: string;
  /** where you actually are */
  pos: number;
  teams: number;
  week: number;
  isDerby: boolean;
}

export const SPEAKER_LABEL: Record<Speaker, string> = {
  owner: 'הבעלים',
  veteran: 'המנג׳ר הוותיק',
  reporter: 'כתב הספורט',
  ultras: 'מנהיג היציע',
  player: 'שחקן בסגל',
  agent: 'סוכן שחקנים',
  director: 'מנכ״ל המועדון',
  physio: 'הפיזיותרפיסט',
  youth: 'מאמן הנוער',
  sponsor: 'הספונסר',
};

function fill(t: string, ctx: Ctx, picks: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => {
    if (picks[k] != null) return picks[k];
    const v = (ctx as unknown as Record<string, unknown>)[k];
    return v == null ? `{${k}}` : String(v);
  });
}

const bottom = (c: Ctx) => c.pos >= c.teams - 2;
const top = (c: Ctx) => c.pos <= 2;

export const TEMPLATES: DilemmaTemplate[] = [
  /* ------------------------------------------------ the squad talks to you */
  {
    id: 'player_minutes_or_quit',
    speaker: 'player',
    subject: 'benched',
    when: c => !!c.benched && c.benchedApps <= 1 && c.week >= 3,
    slots: {
      job: ['משמרות לילה במפעל', 'עבודה מהבוקר', 'תואר שאני חייב לסיים', 'עסק קטן שאני מזניח', 'אישה שכבר אומרת לי די', 'שתי משרות ואין לי כוח'],
      tone: ['אני לא בא בטענות', 'אני מכבד אותך', 'לא באתי לריב', 'תסלח לי שאני ישיר'],
    },
    text: 'מאמן, {tone}, אבל אני צריך תשובה אמיתית. {week} מחזורים ואני כמעט לא רואה דקה. יש לי {job}, ואני קם בחמש בבוקר בשביל האימונים. אם אני לא משחק, אני תולה נעליים בסוף העונה. תגיד לי מה המצב.',
    options: () => [
      { label: 'אתה בהרכב במשחק הבא, מילה שלי', effect: { morale: +8, prestige: -3 },
        outcome: 'הוא יצא מהחדר בן אדם אחר. עכשיו כל הסגל מסתכל אם תעמוד במילה שלך.' },
      { label: 'תילחם על המקום, פה אין מתנות', effect: { morale: -6, prestige: +5 },
        outcome: 'הוא הנהן ויצא בשקט. באימון למחרת הוא רץ כמו שלא רץ כל העונה.' },
      { label: 'אני משחרר אותך, תמצא קבוצה שתשחק בה', effect: { money: +18000, morale: -4, prestige: -2 }, release: true,
        outcome: 'נפרדתם בכבוד. חסכת שכר, אבל הסגל התקצר בשחקן.' },
    ],
  },
  {
    id: 'player_transfer_request',
    speaker: 'player',
    subject: 'star',
    when: c => c.week >= 4,
    slots: {
      reason: ['קבוצה מהליגה שמעלינו פנתה אליי', 'אני רוצה להיות קרוב לבית', 'הסוכן שלי אומר שאני מבזבז שנים', 'הציעו לי כפול ממה שאני מקבל פה'],
    },
    text: 'מאמן, {reason}. אני לא רוצה לעשות רעש בתקשורת, באתי אליך קודם. תשחרר אותי?',
    options: (c) => [
      { label: 'לך, בהצלחה', effect: { money: +Math.round(c.money * 0.18) + 60000, morale: -8, prestige: -2 }, release: true,
        outcome: 'הכסף נכנס לקופה. בחדר ההלבשה מרגישים שמי שרוצה ללכת, הולך.' },
      { label: 'אתה חתום, אתה נשאר', effect: { morale: -3, prestige: +4 },
        outcome: 'עמדת על שלך. הוא נשאר, קצת חמוץ, אבל הסגל ראה שאתה לא נשבר.' },
      { label: 'תישאר עד סוף העונה ואז נדבר', effect: { morale: +5, prestige: +1 },
        outcome: 'קנית שקט ונתת לו אופק. פשרה שהחזיקה את שני הצדדים.' },
    ],
  },
  {
    id: 'veteran_retirement',
    speaker: 'player',
    subject: 'veteranName',
    when: c => !!c.veteranName,
    slots: {
      body: ['הברך שלי מתה', 'הגב לא נותן לי לישון', 'אני מתאושש שלושה ימים אחרי משחק'],
    },
    text: 'מאמן, {body}. אני חושב שזאת העונה האחרונה שלי. אתה רוצה שאני אכריז עכשיו ונעשה מזה משהו יפה, או שנשתוק ונראה איך זה הולך?',
    options: () => [
      { label: 'תכריז, נעשה לך משחק פרידה', effect: { money: +45000, morale: +9, prestige: +3 },
        outcome: 'היציע התמלא לכבודו. הכנסות מהמשחק נכנסו, וכל הסגל ראה איך מכבדים פה ותיק.' },
      { label: 'נשתוק, אל תשים על עצמך לחץ', effect: { morale: +4, prestige: 0 },
        outcome: 'הורדת ממנו את הרעש. הוא שיחק משוחרר יותר במחזורים הבאים.' },
    ],
  },
  {
    id: 'player_army',
    speaker: 'player',
    slots: {
      duty: ['מילואים שלושה שבועות', 'קורס בעבודה שאי אפשר לדחות', 'ניתוח קטן שדחיתי שנה'],
    },
    text: 'מאמן, קיבלתי {duty} בדיוק על המשחק מול {rival}. אני יכול לנסות לדחות, אבל זה יעלה לי. מה אתה אומר?',
    options: () => [
      { label: 'לך, הקבוצה תסתדר', effect: { morale: +7, prestige: -2 },
        outcome: 'הוא הודה לך בלב שלם. חסר לך שחקן, אבל קנית נאמנות.' },
      { label: 'תנסה לדחות, אני צריך אותך', effect: { morale: -4, prestige: +3 },
        outcome: 'הוא הסתדר והגיע. אשתו פחות אהבה את זה, והוא הגיע עייף.' },
    ],
  },
  {
    id: 'player_new_signing_lost',
    speaker: 'player',
    when: c => c.week >= 2,
    slots: {
      issue: ['אני לא מבין את השפה בחדר', 'אף אחד לא מדבר איתי', 'אני גר לבד ולא מכיר אף אחד בעיר'],
    },
    text: 'מאמן, אני חדש פה ו{issue}. אני משחק רע כי אני לא בראש. אתה יכול לעזור לי?',
    options: () => [
      { label: 'אני משבץ אותך עם ותיק שיאמץ אותך', effect: { morale: +8, prestige: +1 },
        outcome: 'הוותיק לקח אותו תחת חסותו. תוך שבועיים הוא נראה כמו שחקן אחר.' },
      { label: 'תתמודד, זאת הרמה', effect: { morale: -6, prestige: +2 },
        outcome: 'הוא הפסיק לבוא בטענות. הוא גם הפסיק לדבר בכלל.' },
    ],
  },

  /* --------------------------------------------------- the club talks to you */
  {
    id: 'director_next_match',
    speaker: 'director',
    slots: {
      why: ['ההנהלה שאלה אותי', 'הבעלים ביקש שאברר', 'יש ישיבת הנהלה מחר בבוקר'],
      extra: ['הם רוצים לדעת שיש תוכנית', 'הם קוראים עיתונים ומתעצבנים', 'הם לא מבינים בכדורגל אבל הם משלמים משכורות'],
    },
    text: '{why} מה המחשבה שלך למשחק מול {rival}. {extra}. מה אני אומר להם?',
    options: () => [
      { label: 'עולים עליהם מהדקה הראשונה', effect: { morale: +6, prestige: +3 },
        outcome: 'ההנהלה אהבה את הביטחון. עכשיו הם מצפים לראות את זה על הדשא.' },
      { label: 'משחק סבלני, לא לוקחים סיכונים', effect: { morale: -2, prestige: +1 },
        outcome: 'הם רשמו שאתה שקול. אחד מהם שאל אם זה לא שמרני מדי.' },
      { label: 'תגיד להם שזה התפקיד שלי, לא שלהם', effect: { morale: +5, prestige: -6 },
        outcome: 'המנכ״ל התחוור. השחקנים שמעו ואהבו, ההנהלה פחות.' },
    ],
  },
  {
    id: 'director_budget',
    speaker: 'director',
    slots: {
      cut: ['לקצץ בכביסה ובאוטובוסים', 'לוותר על מאמן הכושר', 'לצמצם ימי אימון'],
    },
    text: 'המצב בקופה לא מבריק. ביקשו ממני {cut} כדי לאזן. אתה מוכן לחתום על זה?',
    options: (c) => [
      { label: 'תחתוך, נסתדר', effect: { money: +Math.round(c.money * 0.1) + 55000, morale: -9, prestige: -1 },
        outcome: 'הקופה נשמה. השחקנים הגיעו לאימון באוטובוס בלי מזגן ודיברו על זה שבוע.' },
      { label: 'לא נוגעים בתנאים של השחקנים', effect: { money: -35000, morale: +8, prestige: +3 },
        outcome: 'עמדת מול ההנהלה בשביל הסגל. הם לא שכחו את זה.' },
    ],
  },
  {
    id: 'owner_relegation_warning',
    speaker: 'owner',
    when: c => bottom(c) && c.week >= 4,
    slots: {
      threat: ['אני מחפש מחליף כבר עכשיו', 'יש לי שני קורות חיים על השולחן', 'אני לא ארד ליגה בגללך'],
    },
    text: 'תשמע טוב. אנחנו במקום {pos} בטבלה. {threat}. תגיד לי משהו שישכנע אותי לא לפטר אותך היום.',
    options: () => [
      { label: 'תן לי חמישה מחזורים ותראה', effect: { morale: +3, prestige: +2 },
        outcome: 'הוא נתן לך זמן, אבל ספר אותו. עכשיו יש שעון מעל הראש שלך.' },
      { label: 'תפטר אותי אם אתה לא מאמין', effect: { morale: +9, prestige: -4 },
        outcome: 'הימרת הכל. הוא כיבד את האומץ, והשחקנים שמעו שהגנת על עצמך.' },
      { label: 'אני אקח אחריות מלאה', effect: { morale: -3, prestige: +5 },
        outcome: 'לקחת את זה על עצמך. הבעלים נרגע, השחקנים הבינו שיש קו.' },
    ],
  },
  {
    id: 'owner_title_push',
    speaker: 'owner',
    when: c => top(c) && c.week >= 5,
    slots: {
      ask: ['לפתוח את הארנק ולהביא חלוץ', 'להאריך לך חוזה כבר עכשיו', 'להזמין את כל העיר למשחק הבא'],
    },
    text: 'אנחנו במקום {pos}. אני מתחיל לחלום. אתה רוצה ש{ask}?',
    options: (c) => [
      { label: 'כן, זאת ההזדמנות שלנו', effect: { money: -Math.round(c.money * 0.25) - 40000, morale: +11, prestige: +5 },
        outcome: 'ההשקעה נכנסה והחדר התלהב. עכשיו אין תירוצים.' },
      { label: 'בוא נישאר עם הרגליים על הקרקע', effect: { morale: +2, prestige: +2 },
        outcome: 'שמרת על שפיות. חלק מהשחקנים קיוו לראות אותך מהמר עליהם.' },
    ],
  },

  /* ------------------------------------------------------ the trade around you */
  {
    id: 'agent_wants_raise',
    speaker: 'agent',
    slots: {
      claim: ['הוא מקבל פחות מכולם בסגל', 'יש שתי קבוצות שמחכות לשיחה שלי', 'הוא הביא לכם את הנקודות עד עכשיו'],
    },
    text: 'שלום מאמן. אני מייצג את {star}. {claim}. אנחנו רוצים לפתוח את החוזה. אתה איתי או שאני מתחיל לעבוד?',
    options: (c) => [
      { label: 'נעלה לו, הוא שווה את זה', effect: { money: -Math.round(c.money * 0.14) - 30000, morale: +9, prestige: +2 },
        outcome: 'הוא חתם ופרסם סטורי עם הצעיף. יקר, אבל הוא נשאר.' },
      { label: 'החוזה בתוקף, נדבר בסוף העונה', effect: { morale: -6, prestige: +4 },
        outcome: 'הסוכן ניתק בכעס. {star} שיחק את המשחק הבא בפרצוף חמוץ.' },
      { label: 'בונוסים לפי ביצועים, לא שכר קבוע', effect: { money: -12000, morale: +4, prestige: +3 },
        outcome: 'פשרה חכמה. הוא רץ יותר, כי עכשיו זה נספר לו.' },
    ],
  },
  {
    id: 'agent_offers_player',
    speaker: 'agent',
    slots: {
      pitch: ['שחקן שירד מהליגה הבכירה וצריך במה', 'ברזילאי שתקוע פה בלי קבוצה', 'ותיק עם שם שרוצה עוד עונה אחת'],
    },
    text: 'יש לי {pitch}. הוא מוכן לבוא אליכם מחר בבוקר. רק תגיד מילה.',
    options: (c) => [
      { label: 'תביא אותו, ננסה', effect: { money: -Math.round(c.money * 0.12) - 25000, morale: +5, prestige: +4 },
        outcome: 'הוא הגיע והחדר התעורר. עוד מוקדם לדעת אם זה כסף טוב.' },
      { label: 'אני בונה מהסגל שיש לי', effect: { morale: +6, prestige: -2 },
        outcome: 'השחקנים שמעו שלא הבאת מישהו מעליהם. זה עשה טוב.' },
    ],
  },
  {
    id: 'sponsor_demand',
    speaker: 'sponsor',
    slots: {
      want: ['שהשחקנים יצטלמו בחנות שלי', 'שתעשה אירוע לחתימות ביום שישי', 'שהקפטן יגיע לחתונה של הבן שלי'],
    },
    text: 'אני מזרים לכם כסף כל חודש. אני מבקש דבר אחד, {want}. זה סביר בעיניך?',
    options: (c) => [
      { label: 'בכיף, אנחנו מעריכים אותך', effect: { money: +Math.round(c.money * 0.12) + 40000, morale: -7, prestige: 0 },
        outcome: 'החסות הוארכה. השחקנים ויתרו על יום חופש ולא אהבו את זה.' },
      { label: 'השחקנים מתאמנים, לא עובדים בשבילך', effect: { money: -50000, morale: +10, prestige: +2 },
        outcome: 'הספונסר צמצם. הסגל שמע שאתה מגן עליהם גם מול כסף.' },
    ],
  },

  /* --------------------------------------------------- the staff around you */
  {
    id: 'physio_risk',
    speaker: 'physio',
    slots: {
      part: ['השריר האחורי', 'הקרסול', 'הברך'],
      risk: ['אם הוא משחק, יש סיכוי שנאבד אותו לחודש', 'זה יכול להיקרע', 'הוא יסחב את זה עד סוף העונה'],
    },
    text: '{star} לא ב-100 אחוז, {part} מדאיג אותי. {risk}. אתה מכניס אותו מול {rival}?',
    options: () => [
      { label: 'הוא משחק, אני צריך אותו', effect: { morale: +4, prestige: +2 },
        outcome: 'הוא נכנס וסחב על שן ועין. הפיזיו רשם הערה ביומן.' },
      { label: 'מנוחה, יש עוד עונה', effect: { morale: -3, prestige: -1 },
        outcome: 'שמרת עליו. במשחק הזה היה חסר לך בדיוק מה שהוא נותן.' },
    ],
  },
  {
    id: 'physio_pitch',
    speaker: 'physio',
    slots: {
      // no ice: it does not freeze here, and a manager read it and stopped believing the physio
      state: ['המגרש בוץ אחרי הגשם', 'יש בור באזור הרחבה'],
    },
    text: '{state}. אני ממליץ לבקש דחייה, אבל אתה יודע איך זה נראה מבחוץ.',
    options: () => [
      { label: 'מבקשים דחייה, בריאות קודמת', effect: { morale: +5, prestige: -5 },
        outcome: 'הליגה אישרה. התקשורת כתבה שאתם מפחדים מהמשחק.' },
      { label: 'משחקים, גם הם באותו בוץ', effect: { morale: +3, prestige: +4 },
        outcome: 'שיחקתם בתנאים קשים. היציע אהב שלא התחמקתם.' },
    ],
  },
  {
    id: 'youth_talent',
    speaker: 'youth',
    when: c => !!c.youngster,
    slots: {
      note: ['הוא הכי טוב שראיתי פה בעשר שנים', 'סקאוט מקבוצה גדולה בא לראות אותו בשבוע שעבר', 'הוא כובש כל שבוע בנוער ומשעמם לו'],
    },
    text: 'יש לי ילד בנוער, {note}. אם לא תיתן לו דקות אצלך, הוא ילך למקום אחר. אתה מעלה אותו?',
    options: () => [
      { label: 'מעלה אותו לסגל הבוגרים', effect: { morale: +7, prestige: +3 },
        outcome: 'הוא נכנס לחדר עם עיניים גדולות. הוותיקים קיבלו אותו יפה.' },
      { label: 'עוד לא, שיבשיל בנוער', effect: { morale: -2, prestige: +1 },
        outcome: 'החלטה שקולה. מאמן הנוער חושש שהוא יילך בקיץ.' },
    ],
  },
  {
    id: 'youth_academy',
    speaker: 'youth',
    slots: {
      ask: ['תקציב לנסיעות של הנוער', 'שתגיע לאמן אותם פעם בשבוע', 'שתיתן לשלושה מהם להתאמן עם הבוגרים'],
    },
    text: 'אני מבקש ממך {ask}. אני יודע שאתה עסוק בבוגרים, אבל משם יבואו השחקנים שלך.',
    options: (c) => [
      { label: 'אני איתך, זאת ההשקעה הכי טובה', effect: { money: -Math.round(c.money * 0.06) - 15000, morale: +6, prestige: +4 },
        outcome: 'המחלקה קמה לתחייה. בעוד שנתיים תראה מזה משהו.' },
      { label: 'אני חייב להתרכז בקבוצה הבוגרת', effect: { morale: -3, prestige: -2 },
        outcome: 'מאמן הנוער הבין, אבל יצא מאוכזב מהחדר.' },
    ],
  },

  /* ------------------------------------------------------------ the outside */
  {
    id: 'reporter_dry_spell',
    speaker: 'reporter',
    when: c => !!c.dry,
    slots: {
      angle: ['כותבים שהוא גמור', 'הקהל שורק לו', 'הוא לא כבש כבר יותר מדי זמן'],
    },
    text: 'לגבי {dry}, {angle}. רוצה להגן עליו בציטוט או שאני כותב מה שאני רואה?',
    options: () => [
      { label: 'הוא החלוץ שלי, נקודה', effect: { morale: +8, prestige: -3 },
        outcome: 'הוא קרא את הכתבה וחתך אותה. עכשיו הוא רוצה להחזיר לך.' },
      { label: 'גם אני מחכה שהוא יתעורר', effect: { morale: -8, prestige: +4 },
        outcome: 'היית כנה בפומבי. בחדר ההלבשה זה נחת קשה.' },
    ],
  },
  {
    id: 'reporter_job_rumour',
    speaker: 'reporter',
    when: c => c.week >= 5,
    slots: {
      club: ['קבוצה מהליגה שמעליכם', 'מועדון עשיר מהמרכז', 'קבוצה שמחפשת מאמן דחוף'],
    },
    text: 'יש לי מקור ש{club} התעניינה בך. אתה מכחיש או שאני מפרסם?',
    options: () => [
      { label: 'אני פה, נקודה, תכחיש בשמי', effect: { morale: +9, prestige: -2 },
        outcome: 'הסגל קרא את ההכחשה. הם הבינו שאתה לא עם רגל בחוץ.' },
      { label: 'תפרסם, שידעו שיש עליי ביקוש', effect: { morale: -7, prestige: +6 },
        outcome: 'השם שלך עלה. בחדר ההלבשה מתלחששים שאתה כבר לא כאן.' },
    ],
  },
  {
    id: 'ultras_derby_demand',
    speaker: 'ultras',
    when: c => c.isDerby,
    slots: {
      want: ['שתשחק עם שלושה חלוצים', 'שהקבוצה תבוא ליציע אחרי המשחק', 'שתבטיח לנו שלא נפסיד'],
    },
    text: 'זה דרבי מול {rival}. אנחנו מארגנים כניסה שלא ראית. אנחנו מבקשים דבר אחד, {want}.',
    options: () => [
      { label: 'סגור, אתם הכוח שלנו', effect: { morale: +11, prestige: +2 },
        outcome: 'האצטדיון בער. השחקנים אמרו שהם לא שמעו את עצמם חושבים.' },
      { label: 'אני מחליט על ההרכב, אתם על היציע', effect: { morale: -5, prestige: +5 },
        outcome: 'הם לא אהבו, אבל באו. בכל זאת דרבי.' },
    ],
  },
  {
    id: 'ultras_scapegoat',
    speaker: 'ultras',
    when: c => bottom(c) && c.week >= 3,
    slots: {
      who: ['את השוער', 'את הקפטן', 'את החלוץ'],
    },
    text: 'מקום {pos} בטבלה. היציע רוצה לראות שאתה מוריד {who} מההרכב. אחרת מתחילות קריאות.',
    options: () => [
      { label: 'הוא לא משחק, אני שומע אתכם', effect: { morale: -10, prestige: +2 },
        outcome: 'היציע שקט. חדר ההלבשה הבין שהיציע קובע הרכב.' },
      { label: 'אני לא זורק שחקנים שלי לכלבים', effect: { morale: +12, prestige: -4 },
        outcome: 'קיבלת קריאות מהיציע. קיבלת גם סגל שילך אחריך לאש.' },
    ],
  },

  /* ------------------------------------------------ the originals, still good */
  {
    id: 'owner_son',
    speaker: 'owner',
    slots: { who: ['הבן של השותף שלי', 'החתן שלי', 'הנכד של הנשיא', 'בן של חבר מהמילואים'] },
    text: 'אחי אני בא לחדר הלבשה במחצית. תכניס את {who}, חצי שעה ולא יקרה כלום.',
    options: () => [
      { label: 'בסדר, הוא נכנס', effect: { money: 120000, morale: -12, prestige: -3 },
        outcome: 'הוא איבד כדור וכמעט הביא גול. בחדר ההלבשה שקט לא נעים.' },
      { label: 'בכבוד, אבל ההרכב שלי', effect: { money: -40000, morale: +10, prestige: -2 },
        outcome: 'הבעלים יצא בטריקת דלת, אבל השחקנים ראו שאתה מגן עליהם.' },
    ],
  },
  {
    id: 'star_night_out',
    speaker: 'reporter',
    slots: {
      place: ['במועדון בתל אביב', 'בבר בעיר', 'במסיבה פרטית'],
      hour: ['שלוש', 'ארבע', 'שתיים וחצי'],
    },
    text: '{star} צולם שותה אלכוהול {place} ב{hour} בלילה, לילה לפני המשחק מול {rival}. יש לי את התמונות. מגיב?',
    options: () => [
      { label: 'אני מטפל בזה פנימית', effect: { morale: +5, prestige: -3 },
        outcome: 'שמרת על {star} בחוץ אבל דיברת איתו ברצינות. הקבוצה מעריכה.' },
      { label: 'הוא לא משחק, קנס כבד', effect: { money: +20000, morale: -10, prestige: +4 },
        outcome: 'הצבת גבול ברור. חלק מהשחקנים חוששים ממך עכשיו.' },
    ],
  },
  {
    id: 'star_speeding',
    speaker: 'veteran',
    slots: { detail: ['160 בכביש החוף', 'עם רישיון פסול', 'ונתפס על הטלפון'] },
    text: 'ביני לבינך, {star} נתפס במהירות מופרזת {detail} יום לפני המשחק. זה עוד לא בתקשורת. מה עושים?',
    options: () => [
      { label: 'שיחה שקטה, בלי רעש', effect: { morale: +4, prestige: -1 },
        outcome: 'סגרת את זה בשקט. {star} יודע שאתה מגבה אותו.' },
      { label: 'מורידים אותו מההרכב היום', effect: { morale: -7, prestige: +5 },
        outcome: 'שידרת שאין פרוטקציה. הקבוצה קצת מתוחה.' },
    ],
  },
  {
    id: 'ultras_boycott',
    speaker: 'ultras',
    slots: { demand: ['להוריד מחירי מנויים', 'להחזיר את הקפטן הוותיק', 'לשחק בהתקפה'] },
    text: 'תקשיב טוב. אם לא {demand}, היציע לא בא לדרבי מול {rival}. ברור?',
    options: (ctx) => [
      { label: 'בסדר, אני איתכם', effect: { money: -Math.round(ctx.money * 0.05) - 20000, morale: +9, prestige: +4 },
        outcome: 'היציע רעד בדרבי, אבל זה עלה לך בכסף.' },
      { label: 'אני לא נכנע לאיומים', effect: { morale: -6, prestige: -5 },
        outcome: 'היציע היה חצי ריק. האווירה במגרש הייתה קרה.' },
    ],
  },
  {
    id: 'veteran_tip',
    speaker: 'veteran',
    slots: { issue: ['הקבוצה עייפה מהנסיעות', 'יש קליקה בחדר הלבשה', 'הצעיר החדש מפחד לשחק'] },
    text: 'ביני לבינך, {issue}. אתה רוצה שאני אטפל בזה בשקט?',
    options: () => [
      { label: 'כן, סמוך עליך', effect: { morale: +8, prestige: -1 },
        outcome: 'הוותיק סידר את זה בחדר ההלבשה. האווירה השתפרה.' },
      { label: 'אני מטפל בזה בעצמי', effect: { morale: +3, prestige: +2 },
        outcome: 'לקחת אחריות. חלק אהבו, חלק חשבו שהתערבת יותר מדי.' },
    ],
  },
  {
    id: 'owner_sell_star',
    speaker: 'owner',
    slots: { buyer: ['קבוצה מהליגה שמעלינו', 'קבוצה מקפריסין', 'סוכן עשיר מהמרכז'] },
    text: '{buyer} מציעה כסף רציני על {star}. אנחנו צריכים את המזומן. מוכרים?',
    options: (ctx) => [
      { label: 'מוכרים, אנחנו צריכים אוויר', effect: { money: +Math.round(ctx.money * 0.6) + 250000, morale: -14, prestige: -3 },
        outcome: 'הקופה מלאה, אבל איבדנו את מי שסחב אותנו קדימה.' },
      { label: 'לא מוכר, הוא הפרויקט שלנו', effect: { money: -30000, morale: +12, prestige: +5 },
        outcome: 'המסר לקבוצה ברור, אנחנו בונים סביבו. הבעלים לוחץ.' },
    ],
  },
  {
    id: 'player_missed_training',
    speaker: 'veteran',
    slots: { excuse: ['אמר שהילד חולה', 'לא ענה לטלפון', 'הגיע באיחור של שעתיים'] },
    text: '{star} החמיץ את האימון האחרון לפני {rival}, {excuse}. השחקנים מסתכלים לראות מה תעשה.',
    options: () => [
      { label: 'פעם ראשונה, נותן לו צ׳אנס', effect: { morale: +3, prestige: -2 },
        outcome: 'הראית אנושיות. חלק מהוותיקים חושבים שהיית רך מדי.' },
      { label: 'ספסל, שילמד מזה', effect: { morale: -4, prestige: +4 },
        outcome: 'המסר עבר. באימון הבא כולם הגיעו עשר דקות מוקדם.' },
    ],
  },
  {
    id: 'player_social_media',
    speaker: 'reporter',
    slots: { post: ['ביקורת על השופטים', 'סטורי מהמסיבה של אתמול', 'לייק לפוסט של היריבה'] },
    text: 'שחקן שלך העלה {post} לפני הדרבי מול {rival}, וזה מתחיל להתפוצץ ברשת. רוצה שאני ארכך?',
    options: () => [
      { label: 'שימחק ונמשיך הלאה', effect: { morale: +2, prestige: 0 },
        outcome: 'סגרתם את זה מהר. הסערה נרגעה עד הערב.' },
      { label: 'אסור לו להתראיין חודש', effect: { morale: -5, prestige: +3 },
        outcome: 'הצבת כללים ברורים לחדר ההלבשה. קצת קר שם עכשיו.' },
    ],
  },
  {
    id: 'reporter_prediction',
    speaker: 'reporter',
    slots: { rank: ['אחרונים', 'בתחתית', 'קבוצת סף ירידה'] },
    text: 'הוצאתי טור שאתם תסיימו {rank} העונה. רוצה לענות לי לפני הדרבי מול {rival}?',
    options: () => [
      { label: 'תכתוב מה שבא לך', effect: { morale: +4, prestige: -2 },
        outcome: 'התעלמת בגדול. השחקנים לקחו את זה אישית, לטובה.' },
      { label: 'תזמין אותנו לאליפות', effect: { morale: +7, prestige: -6 },
        outcome: 'התראיין בביטחון. עכשיו כל הליגה מחכה לראות אותך נופל.' },
    ],
  },
];

export interface RolledDilemma {
  id: string;
  speaker: Speaker;
  speakerLabel: string;
  /** the actual player this is about, when the template names one */
  subjectName?: string;
  text: string;
  options: DilemmaOption[];
}

/**
 * Not everything needs an answer before kick off. These can sit in the manager's
 * inbox until you feel like dealing with them, the rest block the week because
 * they are about the match you are walking into.
 */
const INBOX_IDS = new Set([
  'player_minutes_or_quit', 'player_transfer_request', 'veteran_retirement',
  'player_new_signing_lost', 'director_budget', 'agent_wants_raise',
  'agent_offers_player', 'sponsor_demand', 'youth_talent', 'youth_academy',
  'reporter_dry_spell', 'reporter_job_rumour', 'owner_title_push',
  'owner_sell_star', 'ultras_boycott', 'veteran_tip',
]);

export type Urgency = 'now' | 'inbox';
export const urgencyOf = (id: string): Urgency => (INBOX_IDS.has(id) ? 'inbox' : 'now');

/** Templates that make sense right now, given the live squad and table. */
export function eligible(ctx: Ctx, kind: Urgency): DilemmaTemplate[] {
  return TEMPLATES.filter(t => urgencyOf(t.id) === kind && (!t.when || t.when(ctx)));
}

/** Fill a template from context and a seeded rng. */
export function rollDilemma(tpl: DilemmaTemplate, ctx: Ctx, rng: Rng): RolledDilemma {
  const picks: Record<string, string> = {};
  for (const [slot, values] of Object.entries(tpl.slots)) {
    picks[slot] = values[Math.floor(rng() * values.length)];
  }
  const text = fill(tpl.text, ctx, picks);
  const options = tpl.options(ctx).map(o => ({ ...o, outcome: fill(o.outcome, ctx, picks) }));
  const subjectName = tpl.subject ? (ctx[tpl.subject] || undefined) : undefined;
  // a player with a name is a person, "שחקן בסגל" is scenery
  const speakerLabel = subjectName && tpl.speaker === 'player'
    ? `${subjectName} · ${SPEAKER_LABEL.player}`
    : SPEAKER_LABEL[tpl.speaker];
  return { id: tpl.id, speaker: tpl.speaker, speakerLabel, subjectName, text, options };
}
