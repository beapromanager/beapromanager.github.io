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
 *
 * And a decision does something. The outcome under an answer is written in
 * the future, because the match has not been played yet, and the `act` list
 * is what the answer changes in the save: a man sits this round, a man plays,
 * the shape is set, the pitch is mud, a signing arrives, a youth is boosted
 * for the summer, a word comes back in a few weeks. Itzik read "you played in
 * hard conditions, the terrace loved it" before kick off and asked, fairly,
 * what exactly had happened. Now: nothing that has not happened is claimed,
 * and everything claimed happens.
 */

import type { Rng } from '../engine/matchEngine.ts';
import type { FormationId } from './formations.ts';

export type Speaker =
  | 'owner' | 'veteran' | 'reporter' | 'ultras'
  | 'player' | 'agent' | 'director' | 'physio' | 'youth' | 'sponsor';

export interface DilemmaEffect {
  money?: number;
  morale?: number;
  prestige?: number;
}

/** Who an act is about, resolved against the live squad when it is applied. */
export type Who = 'subject' | 'star' | 'gk' | 'captain' | 'striker' | 'dry' | 'benched' | 'academy';

/** What an answer changes, beyond the meters. */
export type Act =
  | { kind: 'sit'; who: Who; label: string }                      // out of this round, with the chip saying why
  | { kind: 'play'; who: Who }                                     // into the eleven for this round
  | { kind: 'fitness'; who: Who; delta: number }                   // condition for this match only
  | { kind: 'injury'; who: Who; risk: number }                     // may sit the round after, "פצוע"
  | { kind: 'mud' }                                                // both sides slower and sloppier this match
  | { kind: 'formation'; id: FormationId }                         // the shape for this round
  | { kind: 'gate'; mult: number }                                 // gate money this match
  | { kind: 'guest' }                                              // the owner's boy, on at half time
  | { kind: 'sign'; profile: 'dropped' | 'brazilian' | 'veteran' | 'striker' }
  | { kind: 'promote' }                                            // the academy kid joins the squad
  | { kind: 'sell'; who: Who }                                     // to a club in the league, story and all
  | { kind: 'follow'; weeks: number; title: string; body: string } // a word back at the hub, later
  | { kind: 'youthBoost' }                                         // three kids grow faster in the summer
  | { kind: 'youthLeaveRisk'; p: number }                          // the kid may be gone by summer
  | { kind: 'promiseWin' }                                         // the terrace remembers if you lose
  | { kind: 'summerExit'; who: Who };                              // he stays till the summer, then goes, for real

export interface DilemmaOption {
  label: string;
  effect: DilemmaEffect;
  outcome: string;   // shown after choosing, before the match, so it is written in the future
  /** this choice releases the subject from the squad, for real */
  release?: boolean;
  act?: Act[];
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
  subject?: 'star' | 'benched' | 'youngster' | 'veteranName' | 'scorer' | 'dry' | 'academy';
  slots: Record<string, string[]>;
  text: string;                 // uses {slot} and any Ctx field
  /** only offered when this holds, so the fiction never contradicts the save */
  when?: (c: Ctx) => boolean;
  /** the slot values already picked are passed in, so an answer can act on them */
  options: (ctx: Ctx, picks: Record<string, string>) => DilemmaOption[];
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
  /** the best kid at the academy, and the first three of them, for the youth coach */
  academy: string;
  kids3: string;
  /** how many men the squad holds, so a sale is only asked for when one can be spared */
  squadSize: number;
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
    text: 'מאמן, {tone}, אבל אני צריך תשובה אמיתית. {week} מחזורים ואני כמעט לא רואה דקה. יש לי {job}, ואני קם בחמש בבוקר בשביל האימונים. אם אני לא משחק, אני פורש לעבוד בשווארמה בשכונה. תגיד לי מה המצב.',
    options: () => [
      { label: 'אתה בהרכב במשחק הבא, מילה שלי', effect: { morale: +8, prestige: -3 },
        outcome: 'הוא יצא מהחדר בן אדם אחר. עכשיו הוא בהרכב, וכל הסגל מסתכל אם תעמוד במילה.',
        act: [{ kind: 'play', who: 'subject' }] },
      { label: 'תילחם על המקום שלך', effect: { morale: -6, prestige: +5 },
        outcome: 'הוא הנהן ויצא בשקט. נראה אותו באימון מחר.' },
      { label: 'אני משחרר אותך לשווארמה', effect: { money: +18000, morale: -4, prestige: -2 }, release: true,
        outcome: 'נפרדתם בכבוד. הסגל התקצר בשחקן.' },
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
        outcome: 'הכסף נכנס לקופה. בחדר ההלבשה ידעו שמי שרוצה ללכת, הולך.' },
      { label: 'אתה חתום, אתה נשאר', effect: { morale: -3, prestige: +4 },
        outcome: 'הוא נשאר, חמוץ. נראה אם הוא רץ בשבת.',
        act: [{ kind: 'fitness', who: 'subject', delta: -10 }] },
      { label: 'תישאר עד סוף העונה ואז נדבר', effect: { morale: +5, prestige: +1 },
        outcome: 'קנית שקט. הוא ישחק עד הקיץ, ואז הוא עובר לקבוצה בליגה, כמו שסיכמתם.',
        act: [
          { kind: 'summerExit', who: 'subject' },
          { kind: 'follow', weeks: 6, title: '{subject} מזכיר לך', body: 'הסוכן שלו התקשר. "אמרתם בסוף העונה. סוף העונה מתקרב." הוא עדיין אצלך, עד הקיץ.' },
        ] },
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
        outcome: 'יכריזו השבוע. במשחק הבית הבא היציע יתמלא לכבודו.',
        act: [{ kind: 'gate', mult: 1.3 }] },
      { label: 'נשתוק, אל תשים על עצמך לחץ', effect: { morale: +4, prestige: 0 },
        outcome: 'הורדת ממנו את הרעש. הוא ישחק משוחרר.',
        act: [{ kind: 'fitness', who: 'subject', delta: +6 }] },
    ],
  },
  {
    id: 'player_army',
    speaker: 'player',
    subject: 'benched',
    when: c => !!c.benched,
    slots: {
      duty: ['מילואים שלושה שבועות', 'קורס בעבודה שאי אפשר לדחות', 'ניתוח קטן שדחיתי שנה'],
    },
    text: 'מאמן, קיבלתי {duty} בדיוק על המשחק מול {rival}. אני יכול לנסות לדחות, אבל זה יעלה לי. מה אתה אומר?',
    options: (_c, picks) => [
      { label: 'לך, הקבוצה תסתדר', effect: { morale: +7, prestige: -2 },
        outcome: 'הוא הודה לך בלב. במשחק הזה הוא לא איתך.',
        act: [{ kind: 'sit', who: 'subject', label: picks.duty?.startsWith('מילואים') ? 'במילואים' : 'לא זמין' }] },
      { label: 'תנסה לדחות, אני צריך אותך', effect: { morale: -4, prestige: +3 },
        outcome: 'הוא יסתדר ויגיע. עייף.',
        act: [{ kind: 'fitness', who: 'subject', delta: -15 }] },
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
        outcome: 'הוותיק לוקח אותו תחת חסותו. תוך שבועיים תראה שחקן אחר.',
        act: [{ kind: 'follow', weeks: 2, title: 'החדש כבר מדבר בחדר', body: 'הוותיק עשה את העבודה. החדש יושב עם כולם בארוחת הצהריים, וגם צוחק. זה נראה על הדשא.' }] },
      { label: 'תתמודד, זאת הרמה', effect: { morale: -6, prestige: +2 },
        outcome: 'הוא הפסיק לבוא בטענות.' },
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
    text: '{why} איך אתה מתכוון לנצח במשחק מול {rival}. {extra}. מה אני אומר להם?',
    options: () => [
      { label: 'עולים עליהם בטירוף מהדקה הראשונה', effect: { morale: +6, prestige: +3 },
        outcome: 'ההנהלה אהבה את הביטחון. עכשיו הם רוצים לראות את זה על הדשא.',
        act: [{ kind: 'formation', id: '4-3-3' }] },
      { label: 'סבלני עם מתפרצות', effect: { morale: -2, prestige: +1 },
        outcome: 'רשמו שאתה שקול.',
        act: [{ kind: 'formation', id: '5-4-1' }] },
      { label: 'זה התפקיד שלי, תכבד אותי', effect: { morale: +5, prestige: -6 },
        outcome: 'המנכ״ל יעביר את זה הלאה, במילים שלך.' },
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
        outcome: 'הקופה תנשום. השחקנים יגיעו לאימון באוטובוס בלי מזגן, וידברו על זה שבוע.' },
      { label: 'לא נוגעים בתנאים של השחקנים', effect: { money: -35000, morale: +8, prestige: +3 },
        outcome: 'תעמוד מול ההנהלה בשביל הסגל. הם לא ישכחו את זה.' },
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
        outcome: 'הוא ייתן לך זמן, ויספור אותו. מעכשיו יש שעון מעל הראש שלך.' },
      { label: 'תפטר אותי אם אתה לא מאמין', effect: { morale: +9, prestige: -4 },
        outcome: 'הימרת הכל. הוא יכבד את האומץ, והשחקנים ישמעו שהגנת על עצמך.' },
      { label: 'אני אקח אחריות מלאה', effect: { morale: -3, prestige: +5 },
        outcome: 'לקחת את זה על עצמך. הבעלים יירגע, השחקנים יבינו שיש קו.' },
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
    options: (c, picks) => [
      { label: 'כן, זאת ההזדמנות שלנו', effect: { money: -Math.round(c.money * 0.25) - 40000, morale: +11, prestige: +5 },
        outcome: picks.ask?.includes('חלוץ')
          ? 'ההשקעה נכנסת. חלוץ חדש מגיע השבוע.'
          : picks.ask?.includes('העיר')
            ? 'ההשקעה נכנסת. במשחק הבא האצטדיון יהיה מלא.'
            : 'ההשקעה נכנסת. החוזה שלך מוארך, ועכשיו אין תירוצים.',
        act: picks.ask?.includes('חלוץ') ? [{ kind: 'sign', profile: 'striker' }]
          : picks.ask?.includes('העיר') ? [{ kind: 'gate', mult: 1.5 }]
          : [] },
      { label: 'בוא נישאר עם הרגליים על הקרקע', effect: { morale: +2, prestige: +2 },
        outcome: 'שמרת על שפיות. חלק מהשחקנים קיוו לראות אותך מהמר עליהם.' },
    ],
  },

  /* ------------------------------------------------------ the trade around you */
  {
    id: 'agent_wants_raise',
    speaker: 'agent',
    subject: 'star',
    slots: {
      claim: ['הוא מקבל פחות מכולם בסגל', 'יש שתי קבוצות שמחכות לשיחה שלי', 'הוא הביא לכם את הנקודות עד עכשיו'],
    },
    text: 'שלום מאמן. אני מייצג את {star}. {claim}. אנחנו רוצים לפתוח את החוזה. אתה איתי או שאני מתחיל לעבוד?',
    options: (c) => [
      { label: 'נעלה לו, מגיע לו, נותן את הנשמה במגרש', effect: { money: -Math.round(c.money * 0.14) - 30000, morale: +9, prestige: +2 },
        outcome: 'הוא יחתום מחר ויפרסם סטורי עם הצעיף.',
        act: [{ kind: 'fitness', who: 'subject', delta: +8 }] },
      { label: 'החוזה בתוקף, אין על מה לדבר כרגע', effect: { morale: -6, prestige: +4 },
        outcome: 'הסוכן ניתק. {star} ישחק את המשחק הבא בפרצוף חמוץ.',
        act: [{ kind: 'fitness', who: 'subject', delta: -10 }] },
      { label: 'נכניס לו בונוסים', effect: { money: -12000, morale: +4, prestige: +3 },
        outcome: 'הוא רץ יותר, כי עכשיו זה נספר לו.',
        act: [{ kind: 'fitness', who: 'subject', delta: +5 }] },
    ],
  },
  {
    id: 'agent_offers_player',
    speaker: 'agent',
    slots: {
      pitch: ['שחקן שירד מהליגה הבכירה וצריך במה', 'ברזילאי שתקוע פה בלי קבוצה', 'ותיק עם שם שרוצה עוד עונה אחת'],
    },
    text: 'יש לי {pitch}. הוא מוכן לבוא אליכם מחר בבוקר. רק תגיד מילה.',
    options: (c, picks) => [
      { label: 'תביא אותו', effect: { money: -Math.round(c.money * 0.12) - 25000, morale: +5, prestige: +4 },
        outcome: 'הוא מגיע מחר בבוקר. נראה אם זה כסף טוב.',
        act: [{ kind: 'sign', profile: picks.pitch?.includes('ברזילאי') ? 'brazilian' : picks.pitch?.includes('ותיק') ? 'veteran' : 'dropped' }] },
      { label: 'מרוצה מהסגל שיש לנו, לא צריך', effect: { morale: +6, prestige: -2 },
        outcome: 'השחקנים ישמעו שלא הבאת מישהו מעליהם.' },
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
        outcome: 'החסות תוארך. השחקנים יוותרו על יום חופש, ולא יאהבו את זה.' },
      { label: 'השחקנים מתאמנים, לא עובדים בשבילך', effect: { money: -50000, morale: +10, prestige: +2 },
        outcome: 'הספונסר יצמצם. הסגל ישמע שאתה מגן עליהם גם מול כסף.' },
    ],
  },

  /* --------------------------------------------------- the staff around you */
  {
    id: 'physio_risk',
    speaker: 'physio',
    subject: 'star',
    slots: {
      part: ['השריר האחורי', 'הקרסול', 'הברך'],
      risk: ['אם הוא משחק, יש סיכוי שנאבד אותו לחודש', 'זה יכול להיקרע', 'הוא יסחב את זה עד סוף העונה'],
    },
    text: '{star} לא ב-100 אחוז, {part} מדאיג אותי. {risk}. אתה מכניס אותו מול {rival}?',
    options: () => [
      { label: 'חייבים אותו, הוא משחק', effect: { morale: +4, prestige: +2 },
        outcome: 'הוא ייכנס וישחק על שן ועין. הפיזיו רושם הערה ביומן.',
        act: [{ kind: 'fitness', who: 'subject', delta: -25 }, { kind: 'injury', who: 'subject', risk: 0.35 }] },
      { label: 'ניתן לו מנוחה', effect: { morale: -3, prestige: -1 },
        outcome: 'שמרת עליו. במשחק הזה יחסר לך מה שהוא נותן.',
        act: [{ kind: 'sit', who: 'subject', label: 'נח' }] },
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
        outcome: 'הליגה תסרב, אבל תשלח סמן. משחקים בכל מקרה.',
        act: [{ kind: 'mud' }] },
      { label: 'משחקים, גם הם באותו בוץ', effect: { morale: +3, prestige: +4 },
        outcome: 'המשחק הזה לא יהיה יפה. למי שיש רגליים, יש יתרון.',
        act: [{ kind: 'mud' }] },
    ],
  },
  {
    id: 'youth_talent',
    speaker: 'youth',
    subject: 'academy',
    when: c => !!c.academy,
    slots: {
      note: ['הוא הכי טוב שראיתי פה בעשר שנים', 'סקאוט מקבוצה גדולה בא לראות אותו בשבוע שעבר', 'הוא כובש כל שבוע בנוער ומשעמם לו'],
    },
    text: 'יש לי ילד בנוער, {academy}, {note}. אם לא תיתן לו דקות אצלך, הוא ילך למקום אחר. אתה מעלה אותו?',
    options: () => [
      { label: 'מעלה אותו לסגל הבוגרים', effect: { morale: +7, prestige: +3 },
        outcome: 'הוא נכנס לחדר עם עיניים גדולות. הוא בסגל מעכשיו.',
        act: [{ kind: 'promote' }] },
      { label: 'עוד לא, שיבשיל בנוער', effect: { morale: -2, prestige: +1 },
        outcome: 'מאמן הנוער חושש שהוא יילך בקיץ.',
        act: [{ kind: 'youthLeaveRisk', p: 0.4 }] },
    ],
  },
  {
    id: 'youth_academy',
    speaker: 'youth',
    when: c => !!c.kids3,
    slots: {
      ask: ['תקציב לנסיעות של הנוער', 'שתגיע לאמן אותם פעם בשבוע', 'שתיתן ל{kids3} להתאמן עם הבוגרים'],
    },
    text: 'אני מבקש ממך {ask}. אני יודע שאתה עסוק בבוגרים, אבל משם יבואו השחקנים שלך.',
    options: (c) => [
      { label: 'אני איתך, זאת ההשקעה הכי טובה', effect: { money: -Math.round(c.money * 0.06) - 15000, morale: +6, prestige: +4 },
        outcome: '{kids3} יתחילו להגיע לאימוני הבוגרים מיום ראשון.',
        act: [
          { kind: 'youthBoost' },
          { kind: 'follow', weeks: 4, title: 'מהנוער: הם מוכנים', body: '{kids3} כבר מתאמנים עם הבוגרים כמו שביקשת. מאמן הנוער אומר שהקיץ הזה תראה קפיצה.' },
        ] },
      { label: 'תמשיך להתרכז בנוער, לא בבוגרים', effect: { morale: -3, prestige: -2 },
        outcome: 'מאמן הנוער יצא מאוכזב.' },
    ],
  },

  /* ------------------------------------------------------------ the outside */
  {
    id: 'reporter_dry_spell',
    speaker: 'reporter',
    subject: 'dry',
    when: c => !!c.dry,
    slots: {
      angle: ['כותבים שהוא גמור', 'הקהל שורק לו', 'הוא לא כבש כבר יותר מדי זמן'],
    },
    text: 'לגבי {dry}, {angle}. החלוץ נראה לא בעניינים כל כך. רוצה להגן עליו בציטוט או שאני כותב מה שאני רואה?',
    options: () => [
      { label: 'הוא החלוץ שלי, הוא עוד יביא שערים', effect: { morale: +8, prestige: -3 },
        outcome: 'הכתבה תצא רכה. הוא יקרא אותה.',
        act: [{ kind: 'fitness', who: 'subject', delta: +5 }] },
      { label: 'גם אני מחכה שיתעורר, חושב לשנות מערך בגללו', effect: { morale: -8, prestige: +4 },
        outcome: 'זה יצא מחר בבוקר, והוא יקרא.',
        act: [{ kind: 'fitness', who: 'subject', delta: -8 }] },
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
        outcome: 'ההכחשה תצא בשמך. הסגל יבין שאתה לא עם רגל בחוץ.' },
      { label: 'תפרסם, שידעו שיש עליי ביקוש', effect: { morale: -7, prestige: +6 },
        outcome: 'השם שלך יעלה. בחדר ההלבשה יתלחששו שאתה כבר לא כאן.' },
    ],
  },
  {
    id: 'ultras_derby_demand',
    speaker: 'ultras',
    when: c => c.isDerby,
    slots: {
      want: ['שתשחק עם שלושה חלוצים, רוצים לפרק אותם', 'שהקבוצה תבוא ליציע אחרי המשחק', 'שתבטיח לנו שלא נפסיד'],
    },
    text: 'זה דרבי מול {rival}. אנחנו מארגנים כניסה שלא ראית. אנחנו מבקשים דבר אחד, {want}.',
    options: (_c, picks) => [
      { label: 'סגור, אתם הכוח שלנו', effect: { morale: +11, prestige: +2 },
        outcome: 'האצטדיון יבער. עכשיו תעמוד בזה.',
        act: picks.want?.includes('שלושה חלוצים')
          ? [{ kind: 'formation', id: '4-3-3' }, { kind: 'gate', mult: 1.3 }]
          : picks.want?.includes('ליציע')
            ? [{ kind: 'gate', mult: 1.3 }, { kind: 'follow', weeks: 1, title: 'אחרי המשחק, ביציע', body: 'הקבוצה עלתה ליציע אחרי השריקה, כמו שהבטחת. מנהיג היציע שלח: "זה מה שביקשנו. תודה."' }]
            : [{ kind: 'gate', mult: 1.3 }, { kind: 'promiseWin' }] },
      { label: 'ההרכב שלי, היציע שלכם, תמשיכו בעידוד', effect: { morale: -5, prestige: +5 },
        outcome: 'הם לא אהבו, אבל יבואו. דרבי.' },
    ],
  },
  {
    id: 'ultras_scapegoat',
    speaker: 'ultras',
    when: c => bottom(c) && c.week >= 3,
    slots: {
      who: ['את השוער', 'את הקפטן', 'את החלוץ'],
    },
    text: 'מקום {pos} בטבלה. היציע רוצה לראות שאתה מוציא {who} מההרכב. אחרת מתחילות קריאות.',
    options: (_c, picks) => [
      { label: 'הוא לא ייפתח, אתם צודקים', effect: { morale: -10, prestige: +2 },
        outcome: 'היציע ישקוט. חדר ההלבשה יבין שהיציע קובע הרכב.',
        act: [{ kind: 'sit', who: picks.who?.includes('השוער') ? 'gk' : picks.who?.includes('הקפטן') ? 'captain' : 'striker', label: 'יושב' }] },
      { label: 'לא זורק שחקנים לכלבים בגלל כמה אוהדים', effect: { morale: +12, prestige: -4 },
        outcome: 'תקבל קריאות מהיציע. ותקבל סגל שילך אחריך לאש.',
        act: [{ kind: 'gate', mult: 0.85 }] },
    ],
  },

  /* ------------------------------------------------ the originals, still good */
  {
    id: 'owner_son',
    speaker: 'owner',
    slots: { who: ['הבן של השותף שלי', 'החתן שלי', 'הנכד של הנשיא', 'בן של חבר מהמילואים'] },
    text: 'אחי אני בא לחדר הלבשה במחצית. תכניס את {who}, חצי שעה ולא יקרה כלום.',
    // ten percent of the purse, Itzik's number. A flat hundred and twenty
    // thousand was forty percent of a ליגה ג׳ season for half an hour of a
    // 41 rated boy, the best deal in the game by a mile
    options: (c) => [
      { label: 'בסדר, הוא נכנס', effect: { money: Math.round(c.money * 0.10), morale: -12, prestige: -3 },
        outcome: 'הוא ייכנס במחצית. תחזיק אצבעות.',
        act: [{ kind: 'guest' }] },
      { label: 'בכבוד, אבל ההרכב שלי', effect: { money: -40000, morale: +10, prestige: -2 },
        outcome: 'הבעלים יטרוק דלת. השחקנים יראו שאתה מגן עליהם.' },
    ],
  },
  {
    id: 'star_night_out',
    speaker: 'reporter',
    subject: 'star',
    slots: {
      place: ['במועדון בתל אביב', 'בבר בעיר', 'במסיבה פרטית'],
      hour: ['שלוש', 'ארבע', 'שתיים וחצי'],
    },
    text: '{star} צולם שותה אלכוהול {place} ב{hour} בלילה, לילה לפני המשחק מול {rival}. יש לי את התמונות. מגיב?',
    options: () => [
      { label: 'אני מטפל בזה פנימית', effect: { morale: +5, prestige: -3 },
        outcome: 'התמונות לא יעלו. דיברת איתו, הוא הבין.',
        act: [{ kind: 'fitness', who: 'subject', delta: -10 }] },
      { label: 'הוא לא משחק, קנס כבד', effect: { money: +20000, morale: -10, prestige: +4 },
        outcome: 'הצבת גבול. הוא יושב, והקנס בקופה.',
        act: [{ kind: 'sit', who: 'subject', label: 'בקנס' }] },
    ],
  },
  {
    id: 'star_speeding',
    speaker: 'veteran',
    subject: 'star',
    slots: { detail: ['160 בכביש החוף', 'עם רישיון פסול', 'ונתפס על הטלפון'] },
    text: 'ביני לבינך, {star} נתפס במהירות מופרזת {detail} יום לפני המשחק. זה עוד לא בתקשורת. מה עושים?',
    options: () => [
      { label: 'שקט, זה נשאר בינינו', effect: { morale: +4, prestige: -2 },
        outcome: 'זה יישאר בחדר. הוא ישחק, עם הראש קצת במקום אחר.',
        act: [{ kind: 'fitness', who: 'subject', delta: -5 }] },
      { label: 'קנס ומחוץ להרכב, שילמד', effect: { money: +15000, morale: -6, prestige: +5 },
        outcome: 'הקנס בקופה והוא יושב. הסגל יראה שיש כללים.',
        act: [{ kind: 'sit', who: 'subject', label: 'בקנס' }] },
    ],
  },
  {
    id: 'ultras_boycott',
    speaker: 'ultras',
    slots: { demand: ['להוריד מחירי מנויים', 'להחזיר את הקפטן הוותיק', 'לשחק בהתקפה'] },
    text: 'תקשיב טוב. אם לא {demand}, היציע לא בא לדרבי מול {rival}. ברור?',
    options: (ctx) => [
      { label: 'בסדר, אני איתכם', effect: { money: -Math.round(ctx.money * 0.05) - 20000, morale: +9, prestige: +4 },
        outcome: 'היציע יבוא. ויירעד.',
        act: [{ kind: 'gate', mult: 1.3 }] },
      { label: 'אני לא נכנע לאיומים', effect: { morale: -6, prestige: -5 },
        outcome: 'היציע יהיה חצי ריק. קר.',
        act: [{ kind: 'gate', mult: 0.6 }] },
    ],
  },
  {
    id: 'veteran_tip',
    speaker: 'veteran',
    slots: { issue: ['הקבוצה עייפה מהנסיעות', 'יש קליקה בחדר הלבשה', 'הצעיר החדש מפחד לשחק'] },
    text: 'ביני לבינך, {issue}. אתה רוצה שאני אטפל בזה בשקט?',
    options: () => [
      { label: 'כן, סמוך עליך', effect: { morale: +8, prestige: -1 },
        outcome: 'הוותיק יסדר את זה בחדר ההלבשה, בדרך שלו.' },
      { label: 'אני מטפל בזה בעצמי', effect: { morale: +3, prestige: +2 },
        outcome: 'לקחת אחריות. חלק יאהבו, חלק יחשבו שהתערבת יותר מדי.' },
    ],
  },
  {
    id: 'owner_sell_star',
    speaker: 'owner',
    subject: 'star',
    when: c => c.squadSize > 16,
    slots: { buyer: ['קבוצה מהליגה שמעלינו', 'קבוצה מקפריסין', 'סוכן עשיר מהמרכז'] },
    text: '{buyer} מציעה כסף רציני על {star}. אנחנו צריכים את המזומן. מוכרים?',
    options: (ctx) => [
      { label: 'מוכרים, אין ברירה', effect: { money: +Math.round(ctx.money * 0.6) + 250000, morale: -14, prestige: -3 },
        outcome: 'הכסף ייכנס. הוא עובר ל{buyerClub}.',
        act: [{ kind: 'sell', who: 'subject' }] },
      { label: 'לא מוכר, הוא כוכב אצלנו', effect: { money: -30000, morale: +12, prestige: +5 },
        outcome: 'המסר ברור, בונים סביבו. הבעלים לוחץ.' },
    ],
  },
  {
    id: 'player_missed_training',
    speaker: 'veteran',
    subject: 'star',
    slots: { excuse: ['אמר שהילד חולה', 'לא ענה לטלפון', 'הגיע באיחור של שעתיים'] },
    text: '{star} החמיץ את האימון האחרון לפני {rival}, {excuse}. השחקנים מסתכלים לראות מה תעשה.',
    options: () => [
      { label: 'פעם ראשונה, נותן לו צ׳אנס', effect: { morale: +3, prestige: -2 },
        outcome: 'הראית אנושיות. חלק מהוותיקים יחשבו שהיית רך מדי.' },
      { label: 'ספסל, שילמד מזה', effect: { morale: -4, prestige: +4 },
        outcome: 'המסר יעבור. הוא יושב.',
        act: [{ kind: 'sit', who: 'subject', label: 'יושב' }] },
    ],
  },
  {
    id: 'player_social_media',
    speaker: 'reporter',
    slots: { post: ['ביקורת על השופטים', 'סטורי מהמסיבה של אתמול', 'לייק לפוסט של היריבה'] },
    text: 'שחקן שלך העלה {post} לפני הדרבי מול {rival}, וזה מתחיל להתפוצץ ברשת. רוצה שאני ארכך?',
    options: () => [
      { label: 'שימחק ונמשיך הלאה', effect: { morale: +2, prestige: 0 },
        outcome: 'תסגרו את זה מהר. הסערה תירגע עד הערב.' },
      { label: 'אסור לו להתראיין חודש', effect: { morale: -5, prestige: +3 },
        outcome: 'הצבת כללים ברורים לחדר ההלבשה. יהיה שם קצת קר.' },
    ],
  },
  {
    id: 'reporter_prediction',
    speaker: 'reporter',
    slots: { rank: ['אחרונים', 'בתחתית', 'קבוצת סף ירידה'] },
    text: 'הוצאתי טור שאתם תסיימו {rank} העונה. רוצה לענות לי לפני הדרבי מול {rival}?',
    options: () => [
      { label: 'תכתוב מה שבא לך', effect: { morale: +4, prestige: -2 },
        outcome: 'התעלמת בגדול. השחקנים ייקחו את זה אישית, לטובה.' },
      { label: 'תזמין אותנו לאליפות', effect: { morale: +7, prestige: -6 },
        outcome: 'עכשיו כל הליגה תחכה לראות אותך נופל.' },
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
    picks[slot] = fill(values[Math.floor(rng() * values.length)], ctx, {});
  }
  const text = fill(tpl.text, ctx, picks);
  const subjectName = tpl.subject ? (ctx[tpl.subject] || undefined) : undefined;
  const filled = { ...picks, subject: subjectName ?? '' };
  const options = tpl.options(ctx, picks).map(o => ({
    ...o,
    outcome: fill(o.outcome, ctx, filled),
    act: o.act?.map(a => a.kind === 'follow' ? { ...a, title: fill(a.title, ctx, filled), body: fill(a.body, ctx, filled) } : a),
  }));
  // a player with a name is a person, "שחקן בסגל" is scenery
  const speakerLabel = subjectName && tpl.speaker === 'player'
    ? `${subjectName} · ${SPEAKER_LABEL.player}`
    : SPEAKER_LABEL[tpl.speaker];
  return { id: tpl.id, speaker: tpl.speaker, speakerLabel, subjectName, text, options };
}
