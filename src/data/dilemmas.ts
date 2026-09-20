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
import type { ChatTrigger } from './chats.ts';

export type Speaker =
  | 'owner' | 'veteran' | 'reporter' | 'ultras'
  | 'player' | 'agent' | 'director' | 'physio' | 'youth' | 'sponsor'
  | 'squad';   // the whole dressing room, when he calls a meeting

export interface DilemmaEffect {
  money?: number;
  morale?: number;
  prestige?: number;
  /** the terrace: what the crowd makes of the answer */
  fans?: number;
}

/** Who an act is about, resolved against the live squad when it is applied. */
export type Who = 'subject' | 'star' | 'gk' | 'captain' | 'striker' | 'dry' | 'benched' | 'academy';

/** What an answer changes, beyond the meters. */
export type Act =
  | { kind: 'sit'; who: Who; label: string }                      // out of this round, with the chip saying why
  | { kind: 'play'; who: Who }                                     // into the eleven for this round
  | { kind: 'promiseStart'; who: Who }                             // a place promised; the manager has to pick him himself
  | { kind: 'fitness'; who: Who; delta: number }                   // condition for this match only
  | { kind: 'fitnessAll'; delta: number }                          // the whole squad's condition, this match only
  | { kind: 'chatAfter'; trigger: ChatTrigger; onlyIfWon?: boolean } // the phone buzzes about this after the match
  | { kind: 'queue'; id: string; weeks: number }                   // another talk, this one, opens a week or so on
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
  subject?: 'star' | 'benched' | 'youngster' | 'veteranName' | 'scorer' | 'dry' | 'academy' | 'newcomer';
  slots: Record<string, string[]>;
  /** slots that depend on the live save, laid over : the sponsor's own asks */
  slotsFor?: (c: Ctx) => Record<string, string[]>;
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
  /** the latest man to sign this season, empty when nobody has */
  newcomer: string;
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
  /** a talk booked by an earlier answer, due now: its template id, or empty */
  queued: string;
  /** the brand on the shirt, empty before one is signed */
  sponsor: string;
  sponsorWants: string[];
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
  squad: 'חדר ההלבשה',
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
    text: 'מאמן, {tone}, אני צריך תשובה אמיתית. {week} מחזורים ואני כמעט לא רואה דקה. יש לי {job}, ואני קם בחמש בבוקר בשביל האימונים. אם אני לא משחק, אני פורש לעבוד בשווארמה בשכונה. תגיד לי מה המצב.',
    options: () => [
      { label: 'רק את האמת, תתכונן אתה בהרכב במשחק הבא, מילה שלי', effect: { morale: +8, prestige: -3 },
        outcome: 'הוא יצא מהחדר בן אדם אחר. הוא מתכונן להיות בהרכב, וכל הסגל מסתכל אם תעמוד במילה.',
        // the promise is his to keep on the team sheet, not the game's to keep for him
        act: [{ kind: 'promiseStart', who: 'subject' }] },
      { label: 'תילחם על המקום שלך, אין מקום לאף אחד בהרכב', effect: { morale: -6, prestige: +5 },
        outcome: 'הוא הנהן ויצא בשקט. נראה אותו באימון מחר.' },
      { label: 'עזוב עדיף לך לפרוש, אני משחרר אותך לשווארמה', effect: { money: +5000, morale: -4, prestige: -2 }, release: true,
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
      { label: 'לך, בהצלחה. אל תשכח אותנו שתגיע לאירופה', effect: { money: +Math.round(c.money * 0.18) + 60000, morale: -8, prestige: -2 }, release: true,
        outcome: 'הכסף נכנס לקופה. בחדר ההלבשה ידעו שמי שרוצה ללכת, הולך.' },
      { label: 'אתה חתום, אתה נשאר', effect: { morale: -3, prestige: +4 },
        outcome: 'הוא נשאר, מבואס. נראה אם הוא ירוץ בשבת.',
        act: [{ kind: 'fitness', who: 'subject', delta: -10 }] },
      { label: 'תישאר עד סוף העונה ואז נדבר, אתה חשוב לנו להמשך העונה', effect: { morale: +5, prestige: +1 },
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
    text: 'מאמן, {body}. אני חושב שזאת העונה האחרונה שלי. אתה רוצה שאני אכריז עכשיו ונעשה מזה משהו יפה במשחק הבא? או שנעשה מסיבת פרידה בסוף העונה?',
    options: () => [
      { label: 'תכריז, נעשה לך משחק פרידה עכשיו.', effect: { money: +45000, morale: +9, prestige: +3 },
        outcome: 'הקבוצה העלתה פוסט פרידה השבוע. במשחק הבית הבא היציע יתמלא לכבודו.',
        act: [{ kind: 'gate', mult: 1.3 }] },
      { label: 'נשמור בינינו, אל תשים על עצמך לחץ עכשיו', effect: { morale: +4, prestige: 0 },
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
      { label: 'לך, הקבוצה תסתדר בלעדייך. גם ככה אתה לא בהרכב', effect: { morale: +7, prestige: -2 },
        outcome: 'הוא מעריך מאוד את התשובה. במשחק הזה הוא לא איתך.',
        act: [{ kind: 'sit', who: 'subject', label: picks.duty?.startsWith('מילואים') ? 'במילואים' : 'לא זמין' }] },
      { label: 'תנסה לדחות, אני צריך אותך בסגל', effect: { morale: -4, prestige: +3 },
        outcome: 'הוא יסתדר ויגיע. עייף למשחק.',
        act: [{ kind: 'fitness', who: 'subject', delta: -15 }] },
    ],
  },
  {
    id: 'player_new_signing_lost',
    speaker: 'player',
    subject: 'newcomer',
    when: c => !!c.newcomer && c.week >= 2,
    slots: {
      issue: ['אני לא מבין את השפה בחדר', 'אף אחד לא מדבר איתי', 'אני גר לבד ולא מכיר אף אחד בעיר'],
    },
    text: 'מאמן, אני חדש פה ו{issue}. אני משחק רע כי אני לא מרגיש בנוח. אתה יכול לעזור לי?',
    options: () => [
      { label: 'אני משבץ אותך עם ותיק שיעזור לך, אחרי זה תרגיש בבית. מילה שלי.', effect: { morale: +8, prestige: +1 },
        outcome: 'הוותיק לוקח אותו תחת חסותו. תוך שבועיים תראה שחקן אחר.',
        act: [{ kind: 'follow', weeks: 2, title: 'החדש כבר מקלל בעברית כאילו נולד בישראל', body: 'הוותיק עשה את העבודה. החדש יושב עם כולם בארוחת הצהריים, וגם צוחק. זה נראה טוב גם על הדשא.' }] },
      { label: 'תתמודד, בשביל לשחק כדורגל לא צריך משהו מיוחד', effect: { morale: -6, prestige: -2 },
        outcome: 'הוא הפסיק לבוא בטענות. בסוף העונה הוא יבקש לעזוב.',
        // a cold answer to a man who does not feel at home: he sees the season out and goes
        act: [{ kind: 'summerExit', who: 'subject' }] },
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
      { label: 'עולים עליהם בטירוף מהדקה הראשונה, סמוך עליי', effect: { morale: +3, prestige: +3 },
        outcome: 'ההנהלה אהבה את הביטחון. עכשיו הם רוצים לראות את זה על הדשא.',
        act: [{ kind: 'formation', id: '4-3-3' }] },
      { label: 'סבלני עם מתפרצות, נלך על בטוח הכי טוב', effect: { morale: -1, prestige: +1 },
        outcome: 'רשמו שאתה שקול.',
        act: [{ kind: 'formation', id: '5-4-1' }] },
      { label: 'זה התפקיד שלי, תכבד אותי ואל תשאל אותי עוד פעם', effect: { morale: +3, prestige: -3 },
        outcome: 'המנכ״ל יעביר את זה הלאה, במילים שלך. לא בטוח שיאהבו את זה' },
    ],
  },
  {
    id: 'director_budget',
    speaker: 'director',
    slots: {
      cut: ['לקצץ בכביסה ובאוטובוסים', 'לוותר על מאמן הכושר', 'לצמצם ימי אימון', 'לצמצם בדוד של המים החמים'],
    },
    text: 'המצב בקופה לא מבריק. ביקשו ממני {cut} כדי לאזן. אתה מוכן לחתום על זה?',
    options: (c) => [
      { label: 'תחתוך, נסתדר', effect: { money: +Math.round(c.money * 0.1) + 35000, morale: -9, prestige: -1 },
        outcome: 'הקופה גדלה. השחקנים אומרים שהבעלים קמצן. זה הפך להיות נושא השיחה בליגה.' },
      { label: 'לא נוגעים בתנאים של השחקנים, תחפשו מאיפה לצמצם', effect: { money: -25000, morale: +8, prestige: +3 },
        outcome: 'עמדת מול ההנהלה בשביל הסגל. הם לא ישכחו את זה.',
        // the back he gave them comes back as legs, and if they win with it the terrace says so
        act: [{ kind: 'fitnessAll', delta: +8 }, { kind: 'chatAfter', trigger: 'backed_win', onlyIfWon: true }] },
    ],
  },
  {
    id: 'owner_relegation_warning',
    speaker: 'owner',
    when: c => bottom(c) && c.week >= 4,
    slots: {
      threat: ['אני מחפש מחליף כבר עכשיו', 'יש לי שני קורות חיים על השולחן', 'אני לא ארד ליגה בגללך'],
    },
    text: 'תשמע טוב. אנחנו במקום {pos} בטבלה. {threat}. תגיד לי משהו שישכנע אותי לא לפטר אותך היום. המצב לא לטובתך.',
    options: () => [
      { label: 'תן לי שלושה מחזורים ותראה', effect: { morale: +2, prestige: +2 },
        outcome: 'הוא ייתן לך זמן אבל אמר שייבדוק אותך בכל אימון. מעכשיו יש שעון מעל הראש שלך.' },
      { label: 'תפטר אותי אם אתה לא מאמין בי', effect: { morale: +9, prestige: -4 },
        outcome: 'הימרת הכל. הוא יכבד את האומץ, והשחקנים ישמעו שהגנת על עצמך.' },
      { label: 'אני אקח אחריות מלאה על הקבוצה. אכנס שיחה עם הקבוצה', effect: { morale: -3, prestige: +5 },
        outcome: 'לקחת את זה על עצמך. הבעלים יירגע, השחקנים יבינו שיש קו.',
        // he said he would talk to them: next week, before the match, he does
        act: [{ kind: 'queue', id: 'team_meeting', weeks: 1 }] },
    ],
  },
  {
    // the meeting he promised the owner. Only ever reached through that
    // answer, so the room is the one that was told the manager is on the line.
    // What he says is the choice; what the room says back is the outcome, and
    // it goes onto the grass as legs or the lack of them, not as a scoreline
    id: 'team_meeting',
    speaker: 'squad',
    when: c => c.queued === 'team_meeting',
    slots: {},
    text: 'אסיפת קבוצה לפני המשחק מול {rival}. כולם יושבים ומחכים שתדבר.',
    options: () => [
      { label: 'תקשיבו, לקחתי עליי את הכל עד עכשיו. מפה זה עליכם', effect: { morale: +12, prestige: +2 },
        outcome: 'הקבוצה: "אנחנו איתך באש ובמים." הם יעלו לתת הכל.',
        act: [{ kind: 'fitnessAll', delta: +10 }] },
      { label: 'נתנו לי 3 משחקים לפני פיטורים. צריך אתכם איתי', effect: { morale: +4, prestige: 0 },
        outcome: 'הקבוצה: "ננסה לעשות הכל." לא בטוח שזה מספיק.' },
      { label: 'תקשיבו טוב, הרסתם לי את הקריירה. בגללכם רוצים לפטר אותי. תעלו למגרש ותנצחו', effect: { morale: -15, prestige: -3 },
        outcome: 'הקבוצה: "בגללנו? תדע לאמן וננצח." הם יעלו בלי רגליים.',
        act: [{ kind: 'fitnessAll', delta: -12 }] },
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
      { label: 'כן, זה נשמע כמו תוכנית מצוינת. אני איתך', effect: { money: -Math.round(c.money * 0.25) - 40000, morale: +11, prestige: +5 },
        outcome: picks.ask?.includes('חלוץ')
          ? 'ההשקעה נכנסת. חלוץ חדש מגיע השבוע.'
          : picks.ask?.includes('העיר')
            ? 'ההשקעה נכנסת. במשחק הבא האצטדיון יהיה מלא.'
            : 'ההשקעה נכנסת. החוזה שלך מוארך, ועכשיו אין תירוצים.',
        act: picks.ask?.includes('חלוץ') ? [{ kind: 'sign', profile: 'striker' }]
          : picks.ask?.includes('העיר') ? [{ kind: 'gate', mult: 1.5 }]
          : [] },
      { label: 'בוא נישאר עם הרגליים על הקרקע, השחקנים יתחילו לעשות שטויות אם יישמעו על זה', effect: { morale: +2, prestige: +2 },
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
    text: 'שלום מאמן. אני מייצג את {star}. {claim}. אנחנו רוצים לפתוח את החוזה. אתה בעניין או שאני מתחיל לחפש לו קבוצה?',
    options: (c) => [
      { label: 'נעלה לו, מגיע לו, נותן את הנשמה במגרש', effect: { money: -Math.round(c.money * 0.14) - 30000, morale: +9, prestige: +2 },
        outcome: 'הוא יחתום מחר ויפרסם סטורי עם הצעיף.',
        act: [{ kind: 'fitness', who: 'subject', delta: +8 }] },
      { label: 'תכבד, החוזה בתוקף, אין על מה לדבר כרגע.', effect: { morale: -6, prestige: +4 },
        outcome: 'הסוכן ניתק. {star} ישחק את המשחק הבא בפרצוף.',
        act: [{ kind: 'fitness', who: 'subject', delta: -10 }] },
      { label: 'נכניס לו בונוסים, ככה הכי טוב לכולם', effect: { money: -12000, morale: +4, prestige: +3 },
        outcome: 'הוא רץ יותר כי הוא ידוע שעכשיו הוא מקבל בונוסים.',
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
      { label: 'תביא אותו, חייב שחקן שישנה את הקבוצה', effect: { money: -Math.round(c.money * 0.12) - 25000, morale: -2, prestige: +1 },
        outcome: 'הוא מגיע מחר בבוקר. תכין את הקבוצה לשחקן ברמה מעל הליגה.',
        act: [{ kind: 'sign', profile: picks.pitch?.includes('ברזילאי') ? 'brazilian' : picks.pitch?.includes('ותיק') ? 'veteran' : 'dropped' }] },
      { label: 'מרוצה מהסגל שיש לנו, לא צריך', effect: { morale: +6, prestige: -1 },
        outcome: 'השחקנים אהבו שלא הבאת מישהו עליהם.' },
    ],
  },
  {
    id: 'sponsor_demand',
    speaker: 'sponsor',
    slots: {
      want: ['שהשחקנים יצטלמו בחנות שלי', 'שתעשה אירוע לחתימות ביום שישי', 'שהקפטן יגיע לחתונה של הבן שלי'],
    },
    // the brand on the shirt asks in its own voice, for its own things
    slotsFor: c => (c.sponsorWants.length ? { want: c.sponsorWants } : {}) as Record<string, string[]>,
    when: c => !!c.sponsor,
    text: 'אנחנו מזרימים לכם כסף כל מחזור. מבקשים דבר אחד, {want}. זה סביר בעיניך?',
    options: (c) => [
      { label: 'בכיף, אנחנו מעריכים אותך', effect: { money: +Math.round(c.money * 0.12) + 70000, morale: -7, prestige: 0 },
        outcome: 'החסות תוארך. השחקנים יוותרו על יום חופש, ולא יאהבו את זה.' },
      { label: 'השחקנים מתאמנים קשה, לא עובדים בשבילך.', effect: { money: -50000, morale: +10, prestige: +2 },
        outcome: 'הספונסר יצמצם. הסגל ישמע שאתה מגן עליהם גם מול כסף. ישתו מים מהברז במשחק הבא.' },
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
      { label: 'חייבים אותו, תן לו זריקה, הוא בהרכב', effect: { morale: +2, prestige: +1 },
        outcome: 'הוא ייכנס וישחק בכל מצב. הפיזיו רושם הערה ביומן.',
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
      { label: 'נבקש דחייה, בריאות קודמת להכל', effect: { morale: +3, prestige: -3 },
        outcome: 'הליגה מסרבת, אבל תשלח משקיף שייבדוק את המגרש ויטפל בזה. משחקים בכל מקרה.',
        act: [{ kind: 'mud' }] },
      { label: 'משחקים, גם הם באותו בוץ', effect: { morale: +3, prestige: +4 },
        outcome: 'המשחק הזה לא יהיה יפה. הכדור יעוף באוויר, למי שיש שחקנים גבוהים יש יתרון במשחק הזה.',
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
      { label: 'מעלה אותו לסגל הבוגרים, צריך דם צעיר בקבוצה', effect: { morale: +5, prestige: +3 },
        outcome: 'הוא ייכנס לחדר הלבשה בהתלהבות גדולה. הוא בסגל מעכשיו.',
        act: [{ kind: 'promote' }] },
      { label: 'עוד לא, שימשיך בנוער אין לי זמן לילדים.', effect: { morale: -2, prestige: -1 },
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
      { label: 'אני איתך, זאת ההשקעה הכי טובה, הדור הצעיר יצעיד את המועדון הזה, הבוגרים גמורים', effect: { money: -Math.round(c.money * 0.06) - 15000, morale: +6, prestige: +4 },
        outcome: '{kids3} יתחילו להגיע לאימוני הבוגרים מיום ראשון.',
        act: [
          { kind: 'youthBoost' },
          { kind: 'follow', weeks: 4, title: 'מהנוער: הם מוכנים', body: '{kids3} כבר מתאמנים עם הבוגרים כמו שביקשת. מאמן הנוער אומר שהקיץ הזה תראה קפיצה.' },
        ] },
      { label: 'תמשיך להתרכז בנוער, לא בבוגרים. יש לנו פה לחץ שהם לא יעמדו בו', effect: { morale: -3, prestige: -2 },
        outcome: 'מאמן הנוער יצא מאוכזב מהתשובה.' },
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
      { label: 'הוא החלוץ שלי, הוא עוד יביא שערים. סמוך עליי', effect: { morale: +8, prestige: -1 },
        outcome: 'מצטט אותך "הוא עוד יסיים מלך השערים". החלוץ יישמח מהתשובה.',
        act: [{ kind: 'fitness', who: 'subject', delta: +5 }] },
      { label: 'גם אני מחכה שיתעורר, חושב לשנות מערך בגללו', effect: { morale: -8, prestige: +3 },
        outcome: 'זה יצא מחר בבוקר, והוא יקרא, לא בטוח שיאהב את זה.',
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
      { label: 'אני פה, נקודה, תכחיש בשמי', effect: { morale: +9, prestige: -1 },
        outcome: 'מצטט"אני נשאר בקבוצה ולא הולך לשום מקום", הסגל ייקרא את התשובה ויסמוך עלייך יותר.' },
      { label: 'תפרסם, אני רוצה להתקדם לא רוצה להישאר פה', effect: { morale: -7, prestige: +3 },
        outcome: 'השם שלך יעלה בכותרות. בחדר ההלבשה יתלחששו שאתה כבר לא כאן.' },
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
      { label: 'סגור, אתם הכוח שלנו, דרבי מעל הכל!', effect: { morale: +11, prestige: +2, fans: +10 },
        outcome: 'האצטדיון יבער. עכשיו תעמוד בזה.',
        act: picks.want?.includes('שלושה חלוצים')
          ? [{ kind: 'formation', id: '4-3-3' }, { kind: 'gate', mult: 1.3 }]
          : picks.want?.includes('ליציע')
            ? [{ kind: 'gate', mult: 1.3 }, { kind: 'follow', weeks: 1, title: 'אחרי המשחק, ביציע', body: 'הקבוצה עלתה ליציע אחרי השריקה, כמו שהבטחת. מנהיג היציע שלח: "זה מה שביקשנו. תודה."' }]
            : [{ kind: 'gate', mult: 1.3 }, { kind: 'promiseWin' }] },
      { label: 'ההרכב שלי, היציע שלכם, תמשיכו בעידוד', effect: { morale: -5, prestige: +5, fans: -12 },
        outcome: 'הם לא אהבו, אבל יבואו. בכל זאת דרבי.' },
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
      { label: 'הוא לא ייפתח, אתם צודקים', effect: { morale: -10, prestige: +2, fans: +2 },
        outcome: 'היציע לא יישרוק בוז. חדר ההלבשה יבין שהיציע קובע הרכב.',
        act: [{ kind: 'sit', who: picks.who?.includes('השוער') ? 'gk' : picks.who?.includes('הקפטן') ? 'captain' : 'striker', label: 'יושב בחוץ' }] },
      { label: 'לא זורק שחקנים לכלבים בגלל כמה אוהדים', effect: { morale: +12, prestige: -4, fans: -3 },
        outcome: 'תקבל קריאות מהיציע להתפטר ותקבל סגל שילך אחריך באש ובמים.',
        act: [{ kind: 'gate', mult: 0.85 }] },
    ],
  },

  /* ------------------------------------------------ the originals, still good */
  {
    id: 'owner_son',
    speaker: 'owner',
    slots: { who: ['הבן של השותף שלי', 'החתן שלי', 'הבן של ראש העיר', 'בן של חבר מהמילואים'] },
    text: 'תקשיב טוב אני בא לחדר הלבשה במחצית. תכניס את {who}, חצי שעה ולא יקרה כלום.',
    // ten percent of the purse, Itzik's number. A flat hundred and twenty
    // thousand was forty percent of a ליגה ג׳ season for half an hour of a
    // 41 rated boy, the best deal in the game by a mile
    options: (c) => [
      { label: 'בסדר, הוא נכנס, אתה הבעלים', effect: { money: Math.round(c.money * 0.10), morale: -12, prestige: -3 },
        outcome: 'הוא ייכנס במחצית. תחזיק אצבעות. פס הוא לא יודע לתת. הסגל לא אוהב את הקומבינות.',
        act: [{ kind: 'guest' }] },
      { label: 'מכבד אותך, אבל ההרכב שלי עם כל הכבוד.', effect: { money: -40000, morale: +10, prestige: +1 },
        outcome: 'הבעלים מעיף כסא וטורק את דלת. השחקנים יראו שאתה מגן עליהם.',
        act: [{ kind: 'chatAfter', trigger: 'stood_up_owner' }] },
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
    text: '{star} צולם שותה אלכוהול {place} ב{hour} בלילה, לילה לפני המשחק מול {rival}. יש לי את התמונות. אתה רוצה להגיב?',
    options: () => [
      { label: 'אני מטפל בזה בחדר ההלבשה, אל תוציא. תכבד', effect: { morale: +5, prestige: -3 },
        outcome: 'התמונות לא יעלו. דיברת איתו, הוא הבין ולא יחזור על זה.',
        act: [{ kind: 'fitness', who: 'subject', delta: -10 }] },
      { label: 'הוא לא משחק, קנס כבד, תוציא את זה לעיתונות', effect: { money: +20000, morale: -10, prestige: +4 },
        outcome: 'הצבת גבול לשחקנים, חדר ההלבשה לא אהב את זה. הכסף נכנס לקופה.',
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
    slots: { demand: ['תורידו מחירי מנויים', 'תחזירו את הקפטן הוותיק', 'תתחילו לשחק התקפי'] },
    text: 'תקשיב טוב. אם לא {demand}, היציע לא בא לדרבי מול {rival}. ברור?',
    options: (ctx) => [
      { label: 'אין צורך באיומים, אני אתכם', effect: { money: -Math.round(ctx.money * 0.05) - 20000, morale: +9, prestige: +4, fans: +5 },
        outcome: 'היציע יבוא בטירוף עם זיקוקים ואבוקות.',
        act: [{ kind: 'gate', mult: 1.3 }] },
      { label: 'אני לא נכנע לאיומים, אל תבואו מבחינתי', effect: { morale: -6, prestige: -5, fans: -6 },
        outcome: 'היציע יהיה חצי ריק. קר.',
        act: [{ kind: 'gate', mult: 0.8 }] },
    ],
  },
  {
    id: 'veteran_tip',
    speaker: 'veteran',
    slots: { issue: ['הקבוצה עייפה מהנסיעות', 'יש קליקה בחדר הלבשה', 'הצעיר החדש מפחד לשחק'] },
    text: 'ביני לבינך, {issue}. אתה רוצה שאני אטפל בזה בשקט?',
    options: () => [
      { label: 'כן אחי, בשביל זה אתה פה. סומך עלייך', effect: { morale: +8, prestige: -1 },
        outcome: 'הוותיק יסדר את זה בחדר ההלבשה, בדרך שלו.' },
      { label: 'תודה על העדכון, אני מטפל בזה', effect: { morale: +3, prestige: +2 },
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
      { label: 'ברור, תביא את הכסף נביא 4 כמוהו', effect: { money: +Math.round(ctx.money * 0.6) + 250000, morale: -14, prestige: -3, fans: -4 },
        outcome: 'הכסף ייכנס. הוא עובר ל{buyerClub}.',
        act: [{ kind: 'sell', who: 'subject' }] },
      { label: 'השתגעתם? לא מוכר, הוא כוכב אצלנו', effect: { money: -30000, morale: +12, prestige: +5, fans: +5 },
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
      { label: 'לא מעניין אותי מה הסיבה. הוא בספסל, שילמד מזה', effect: { morale: -4, prestige: +4 },
        outcome: 'המסר יעבור. הוא יישב בספסל.',
        act: [{ kind: 'sit', who: 'subject', label: 'יושב' }] },
    ],
  },
  {
    id: 'player_social_media',
    speaker: 'reporter',
    slots: { post: ['ביקורת על השופטים', 'סטורי מהמסיבה של אתמול', 'לייק לפוסט של היריבה'] },
    text: 'שחקן שלך העלה {post} לפני הדרבי מול {rival}, וזה מתחיל להתפוצץ ברשת. רוצה שאני אעזור לך בזה?',
    options: () => [
      { label: 'תעשה טובה, תמחק את זה. אדאג לך לכותרת פעם אחרת', effect: { morale: +2, prestige: 0 },
        outcome: 'תסגרו את זה מהר. הסערה תירגע עד הערב.' },
      { label: 'רציני? איזה טיפש! אסור לו להתראיין חודש', effect: { morale: -5, prestige: +3 },
        outcome: 'הצבת כללים ברורים לחדר ההלבשה. יש תחושה שבודקים כל דבר עכשיו.' },
    ],
  },
  {
    id: 'reporter_prediction',
    speaker: 'reporter',
    slots: { rank: ['אחרונים', 'בתחתית', 'קבוצת סף ירידה'] },
    text: 'הוצאתי טור שאתם תסיימו {rank} העונה. רוצה לענות לי לפני הדרבי מול {rival}?',
    options: () => [
      { label: 'תכתוב מה שבא לך, לא מעניין עיתונים', effect: { morale: +4, prestige: -2 },
        outcome: 'התעלמת בגדול. השחקנים ייקחו את זה אישית, לטובה.' },
      { label: 'תזמין אותנו לחגיגות אליפות בסוף העונה', effect: { morale: +7, prestige: -2 },
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
  for (const [slot, values] of Object.entries({ ...tpl.slots, ...(tpl.slotsFor?.(ctx) ?? {}) })) {
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
    : tpl.speaker === 'sponsor' && ctx.sponsor ? `${ctx.sponsor} · ${SPEAKER_LABEL.sponsor}`
    : SPEAKER_LABEL[tpl.speaker];
  return { id: tpl.id, speaker: tpl.speaker, speakerLabel, subjectName, text, options };
}
