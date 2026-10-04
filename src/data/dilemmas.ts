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
  | 'captain' | 'mother'   // from Itzik's approved batch of 3.10
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
  | { kind: 'fitnessSome'; count: number; delta: number }          // a few of the likely eleven, drawn by the week's seed, starred in the match
  | { kind: 'loanOut'; who: Who }                                  // the text says he returns next season; in fact he leaves, and a floor squad pulls a boy up (Itzik, 3.10)
  | { kind: 'winBonus'; amount: number }                           // paid out of the purse only if this match is won
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
  subject?: 'star' | 'benched' | 'youngster' | 'veteranName' | 'scorer' | 'dry' | 'academy' | 'newcomer' | 'gk';
  slots: Record<string, string[]>;
  /** slots that depend on the live save, laid over : the sponsor's own asks */
  slotsFor?: (c: Ctx) => Record<string, string[]>;
  text: string;                 // uses {slot} and any Ctx field
  /** at most once a season, by Itzik's note on the referee's apology */
  oncePerSeason?: boolean;
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
  /** how many more men the squad can take before it is full */
  room: number;
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
  /* the facts Itzik's 3.10 batch asks about, all read off the live save */
  city: string;
  tier: number;
  /** this week's fixture is at home; false when there is no fixture */
  isHome: boolean;
  /** the previous round was lost */
  lostLast: boolean;
  /** wins in a row coming into this week */
  winStreak: number;
  /** first place only: the cushion over second, else 0 */
  lead: number;
  /** points behind the leader, 0 when leading */
  gap: number;
  /** the winter transfer window is open this week / is in its last week */
  winterOpen: boolean;
  winterLast: boolean;
  /** what the star would fetch today, for the forced-sale story */
  starFee: number;
  /** the first keeper's surname, for the dilemmas about the man in goal */
  gk: string;
  /** the best starter plays up front, for the top-scorer story */
  starIsForward: boolean;
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
  captain: 'הקפטן',
  mother: 'אמא',
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
    // asked only when there is a place for him: answering yes to "do you promote
    // him" with a full squad told the manager he was in and left him in the academy
    when: c => !!c.academy && c.room > 0,
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
  /* ------------------------------------------------ Itzik's batch, 3.10.
     Written in the drafts file, edited by him word for word in Word, and
     generated from the canonical PIC/team/content-drafts.md. Item 53, the
     midweek friendly, is held back until the real friendly match exists. */

  {
    id: 'neighbor_training_noise',
    speaker: 'director',
    slots: {},
    text: 'יש לנו בעיה. שכן מהרחוב של מגרש האימונים הגיש תלונה בעירייה. הוא אומר שהצעקות שלך בשש בבוקר מעירות לו את הילדים. מה אני עונה לו?',
    options: () => [
      { label: 'תזמין אותו לאימון, שיביא את הילדים. נעשה מהם אוהדים', effect: { morale: +3, prestige: +2, fans: +3 },
        outcome: 'הוא יבוא לאימון עם שני הילדים. תכין שתי חולצות קטנות, והתלונה כנראה תיסגר.' },
      { label: 'תגיד לו שכדורגל זה לא ספרייה. שיקנה אטמים', effect: { morale: +4, prestige: -2 },
        outcome: 'המנכ״ל העביר את התשובה השכן לא אהב אותה. זה יגיע לעיתון המקומי.' },
    ],
  },
  {
    id: 'mayor_photo',
    speaker: 'director',
    slots: {},
    text: 'ראש העיר של {city} רוצה להצטלם עם הקבוצה לפני המשחק מול {rival}. יש בחירות בעוד חודשיים. מכניסים אותו לחדר ההלבשה?',
    options: () => [
      { label: 'שיצטלם בכניסה למגרש, חדר ההלבשה שלנו', effect: { morale: +5, prestige: +1 },
        outcome: 'סגרתם מול הלשכה. הוא יצטלם ליד השער, והשחקנים יעריכו שהחדר נשאר שלהם.' },
      { label: 'תכניס אותו, העירייה נותנת לנו את המגרש', effect: { money: +25000, morale: -4 },
        outcome: 'הוא ייכנס עם צלם לפני המשחק. העירייה כבר מדברת על תקציב לתאורה. השחקנים יתלבשו מהר שלא יתפסו אותם בתחתונים.' },
    ],
  },
  {
    id: 'city_pitch_closed',
    speaker: 'director',
    slots: {},
    when: c => c.isHome,
    text: 'העירייה הודיעה שסוגרים את הדשא לשיפוץ דחוף אחרי המשחק מול {rival}. הם מציעים שנתאמן שבועיים במגרש הקטן של בית הספר. או שנשלם על מגרש פרטי.',
    options: () => [
      { label: 'מגרש בית הספר, זה איפה שרובם גדלו', effect: { morale: +4, prestige: -1 },
        outcome: 'סגרת עם בית הספר. שבועיים בין שערים קטנים, והשחקנים ייזכרו למה התחילו לשחק.' },
      { label: 'משלמים על פרטי, לא יורדים ברמה', effect: { money: -30000, prestige: +2 },
        outcome: 'המגרש הפרטי נסגר לשבועיים. תנאים מצוינים מחכים, הקופה ירדה ב30,000 ש"ח.' },
    ],
  },
  {
    id: 'player_late_work',
    speaker: 'player',
    slots: {},
    subject: 'benched',
    when: c => !!c.benched && c.tier <= 2,
    text: 'מאמן, הבוס שלי בעבודה לא משחרר אותי לפני ארבע. אני מגיע לאימונים עם הלשון בחוץ ובלי לאכול. אני לא מחפש תירוצים, אני מחפש פתרון.',
    options: () => [
      { label: 'אני אדבר עם הבוס שלך, תן לי את הטלפון', effect: { morale: +7, prestige: +1 },
        outcome: 'לקחת את המספר. תתקשר לבוס אחרי האימון, ואם הוא אוהד שלכם כמו שמספרים, השחקן ישוחרר בשלוש.' },
      { label: 'כולם פה עובדים, זאת הליגה. תסתדר', effect: { morale: -5, prestige: +2 },
        outcome: 'הוא הנהן. ימשיך להגיע אחרון ולצאת ראשון.' },
    ],
  },
  {
    id: 'youth_parent_pressure',
    speaker: 'youth',
    slots: {},
    when: c => !!c.academy,
    text: 'האבא של {academy} עומד על הקו בכל אימון וצועק עליו הוראות. הילד משחק גרוע כשאבא שלו שם. דיברתי איתו פעמיים, הוא אומר שהוא יודע מה טוב לבן שלו.',
    options: () => [
      { label: 'תזמין אותו אליי לשיחה, אני אסביר לו את הגבולות', effect: { morale: +3, prestige: +2 },
        outcome: 'הוא זומן אליך. תשב איתו שעה, תסמן את הגבול, ואם יקשיב הילד סוף סוף ינשום באימונים.' },
      { label: 'תסגור את האימונים להורים, בעיה פתורה', effect: { morale: +1, prestige: -2 },
        outcome: 'ההודעה יצאה להורים. חלק כבר רותחים בוואטסאפ, אבל המגרש יהיה שקט והילד יפרח. אבא שלו פחות.' },
    ],
  },
  {
    id: 'referee_apology',
    speaker: 'director',
    slots: {},
    when: c => c.lostLast,
    oncePerSeason: true,
    text: 'לא תאמין. השופט מהמשחק האחרון התקשר למשרד. הוא ראה את הצילומים ואומר שהוא טעה בגדול נגדנו. הוא מבקש להגיד לך את זה בעצמו. עיתונאי כבר מרחרח את הסיפור.',
    options: () => [
      { label: 'תעביר לו שאני מעריך, וזה נשאר בינינו', effect: { prestige: +4, morale: +2 },
        outcome: 'הוא לא ישכח את זה. שופטים מדברים בינם לבין עצמם.' },
      { label: 'שיגיד את זה בתקשורת, לא בטלפון', effect: { prestige: -3, fans: +5, morale: +3 },
        outcome: 'המסר הועבר. אם הוא באמת ידבר, הסיפור יתפוצץ. היציע ירגיש צדק, איגוד השופטים לא יאהב את זה.' },
    ],
  },
  {
    id: 'mascot_too_old',
    speaker: 'director',
    slots: {},
    text: 'האיש שבתוך תחפושת הקמע כבר עשרים שנה בא אליי היום. הברכיים שלו גמורות, הוא רוצה לפרוש. יש ילד בן 16 מהנוער שמוכן להיכנס לתחפושת. או שמוותרים על הקמע בכלל.',
    options: () => [
      { label: 'הילד נכנס, והוותיק מקבל סיבוב פרידה על המגרש', effect: { money: -5000, fans: +6, morale: +2 },
        outcome: 'סגרתם. בשבת הוא יקבל סיבוב פרידה והיציע כבר מכין לו שירים. בהצלחה לילד שנכנס לנעליים גדולות.' },
      { label: 'מוותרים על הקמע, אנחנו לא קרקס', effect: { fans: -4, prestige: +1 },
        outcome: 'ההחלטה נפלה. בשבת הילדים ביציע ישאלו איפה הוא, ומישהו בטח יתלה שלט קטן.' },
    ],
  },
  {
    id: 'broken_bus',
    speaker: 'director',
    slots: {},
    when: c => !c.isHome,
    text: 'האוטובוס של הקבוצה נתקע במוסך, הגיר נגמר. יש לנו שתי אפשרויות למשחק מול {rival}: אוטובוס תיירים ישן בזול, או שכל אחד מגיע עם האוטו שלו.',
    options: () => [
      { label: 'אוטובוס ישן, נוסעים ביחד. ככה קבוצה נוסעת', effect: { money: -8000, morale: +5 },
        outcome: 'הוזמן אוטובוס ישן בלי מזגן. ישירו כל הדרך ויגיעו מגובשים ומזיעים, אין מזגן באוטובוס.' },
      { label: 'כל אחד באוטו שלו, חוסכים', effect: { money: +3000, morale: -4 },
        outcome: 'ההודעה נשלחה לקבוצה. מישהו יאחר, מישהו ילך לאיבוד בדרך, ואת החימום המשותף אפשר לשכוח ממנו.' },
    ],
  },
  {
    id: 'heavy_rain_week',
    speaker: 'physio',
    slots: {},
    text: 'ירד גשם כל השבוע והמגרש אימונים ביצה אחת גדולה. אני יכול להעביר את האימונים לאולם, אבל אז לא מתאמנים על דשא לפני {rival}. מה אתה מעדיף?',
    options: () => [
      { label: 'מתאמנים בבוץ, ככה ייראה גם המשחק', effect: { morale: -2, prestige: +2 },
        outcome: 'נשארים על הדשא. הכביסה תעבוד שעות נוספות, והקבוצה תגיע מוכנה לכל מזג אוויר.' },
      { label: 'אולם. בריאות לפני הכל', effect: { morale: +3, prestige: -1 },
        outcome: 'עוברים לאולם. אימונים נקיים ומהירים, רק שהדשא בשבת יהיה הפתעה.' },
    ],
  },
  {
    id: 'player_wedding',
    speaker: 'player',
    slots: {},
    subject: 'star',
    text: 'מאמן, אני מתחתן ביום חמישי. אני יודע שזה יומיים לפני {rival}. כל הסגל מוזמן. אני מבטיח שכולם בבית עד חצות. אתה בא?',
    options: () => [
      { label: 'בא, רוקד, והולך הביתה בעשר. וכולם איתי', effect: { morale: +9, prestige: +1 },
        outcome: 'אמרת לו שאתה בא. ביום חמישי אמרת בחדר ההלבשה שתרקוד עם אמא שלו, ובעשר וחצי כל הסגל בבית. בערך.' },
      { label: 'מזל טוב, אבל הסגל ישן בבית. תחגגו אחרי העונה', effect: { morale: -7, prestige: +3 },
        outcome: 'הוא בלע את זה. הוא יתחתן בלי החברים מהקבוצה. חדר ההלבשה ייתבאס עלייך' },
    ],
  },
  {
    id: 'captain_miluim',
    speaker: 'captain',
    slots: {},
    text: 'מאמן, קיבלתי צו. שבועיים, מתחיל יום ראשון. אני יכול לבקש דחייה בגלל המשחקים, יש סיכוי שיאשרו. אבל אם כל אחד מתחמק, מי כן ילך?',
    options: () => [
      { label: 'לך, זה מעל כדורגל. נחכה לך', effect: { morale: +8, prestige: +1 },
        outcome: 'הוא לחץ לך את היד חזק. כשהסגל ישמע, הם יראו קפטן. והוא יחסר לך על הדשא.' },
      { label: 'תבקש דחייה, הקבוצה צריכה אותך עכשיו', effect: { morale: -2, prestige: +1 },
        outcome: 'הוא יגיש בקשת דחייה. אם יאשרו, הוא נשאר. אבל הראש שלו עם הצוות שלו בשטח.' },
    ],
  },
  {
    id: 'gym_chain_offer',
    speaker: 'agent',
    slots: {},
    text: 'רשת בתי הכושר שנפתחה ב{city} מציעה לכל הסגל מנוי חינם לשנה. בתמורה הם רוצים שהשחקנים יצטלמו שם פעם בחודש ויעלו סטורי. אין כסף על השולחן, רק הציוד.',
    options: () => [
      { label: 'סגור, חדר כושר אמיתי שווה יותר ממזומן', effect: { morale: +6 },
        outcome: 'סגרתם. מהשבוע הסגל יתאמן על מכשירים חדשים, ופעם בחודש יסבול יום צילומים מעצבן.',
        act: [{ kind: 'fitnessAll', delta: +3 }] },
      { label: 'השרירים שלהם לא לוח פרסומות. לא', effect: { morale: -2, prestige: +2 },
        outcome: 'נשארתם עם חדר הכושר הישן והחלוד. יש בו קסם, אין בו משקולות של 10 קילו והליכון רק הליכה מהירה.' },
    ],
  },
  {
    id: 'local_youtuber',
    speaker: 'reporter',
    slots: {},
    text: 'יש ילד מ{city} עם ערוץ יוטיוב על הקבוצה, מאה אלף צפיות לסרטון. הוא מבקש לצלם יום אימונים מבפנים. אני במקומך הייתי נזהר, אבל זה הקהל הצעיר שלך.',
    options: () => [
      { label: 'שיבוא, יקבל יום שלם. הדור הבא רואה אותו, לא אותך', effect: { fans: +7, prestige: -1 },
        outcome: 'הוא יקבל יום צילומים מלא. אם הסרטון יעבוד כמו הקודמים שלו, ילדים בבית הספר יחקו את הצעקות שלך באימונים.' },
      { label: 'אימון זה מקום עבודה, לא אולפן. שיצלם מהיציע', effect: { morale: +2, prestige: +2, fans: -3 },
        outcome: 'הוא יצלם מהיציע. תתכונן לכותרת עוקצנית, הצעירים בצד שלו.' },
    ],
  },
  {
    id: 'ultras_tifo_money',
    speaker: 'ultras',
    slots: {},
    when: c => c.isHome,
    text: 'אנחנו מכינים דגל פריסה ענק למשחק מול {rival}, כזה שלא היה פה. חסרים לנו 8,000 שקל לבדים ולצבע. המועדון ישתתף או שנעמוד ביציע עם הידיים בכיסים?',
    options: () => [
      { label: 'המועדון משלם חצי והחצי השני עליכם. שותפים', effect: { money: -4000, fans: +8 },
        outcome: 'שילמתם חצי. בשריקת הפתיחה יהיה דגל פריסה ענק שייפרש, בטוח תהיה צמרמורת. גם ליריבה.' },
      { label: 'המועדון לא מממן יציע, זה כל היופי שלכם', effect: { fans: -4, prestige: +1 },
        outcome: 'הם יסתדרו עם שלט קטן יותר. והם רושמים מתי המועדון לא היה שם לעזור להם.' },
    ],
  },
  {
    id: 'owner_cousin_catering',
    speaker: 'owner',
    slots: {},
    text: 'מהיום האוכל אחרי אימונים מגיע מהקייטרינג של בן דוד שלי. מחיר משפחתי, אוכל של בית. השחקנים יגידו תודה. יש לך בעיה עם זה?',
    options: () => [
      { label: 'שהפיזיו יאשר את התפריט, ואז בכיף', effect: { morale: +2, prestige: +2 },
        outcome: 'התפריט בדרך לפיזיו. הוא ימחק חצי, בן הדוד ייעלב, השניצל והפתיתים יישארו.' },
      { label: 'אוכל של ספורטאים זה מקצוע, לא טובה משפחתית', effect: { morale: +3, prestige: +1, money: -10000 },
        outcome: 'הבעלים נפגע בשם בן הדוד. השחקנים ימשיכו לאכול כמו מקצוענים עם חלבון.' },
    ],
  },
  {
    id: 'groundskeeper_quits',
    speaker: 'director',
    slots: {},
    when: c => c.isHome,
    text: 'שלמה, איש הדשא שלנו שלושים שנה, הודיע שהוא עוזב. מישהו מהשחקנים צעק עליו שהדשא גרוע. הוא יושב בחדר הציוד ולא מדבר עם אף אחד.',
    options: () => [
      { label: 'אני הולך אליו עכשיו. בלעדיו אין מגרש', effect: { morale: +3, fans: +3 },
        outcome: 'אתה בדרך אליו עכשיו. שעה על הדשא שלו, ויש סיכוי טוב שהוא יישאר. השחקן עוד יתנצל.' },
      { label: 'שיעזוב, נמצא צעיר עם מכונה חדשה', effect: { money: -15000, fans: -3 },
        outcome: 'המנכ״ל יחפש מחליף. יבוא צעיר עם מכסחת אוטומטית, והוותיקים ביציע יזכירו את שלמה עוד שנים.' },
    ],
  },
  {
    id: 'student_exam',
    speaker: 'player',
    slots: {},
    subject: 'benched',
    when: c => !!c.benched,
    text: 'מאמן, יש לי בוחן באוניברסיטה בדיוק ביום של המשחק מול {rival}. אם אני מפספס אותו אני מאבד סמסטר. אני גם ככה לא בהרכב, נכון?',
    options: () => [
      { label: 'לך לבוחן. כדורגל זה לא כל החיים', effect: { morale: +6, prestige: -1 },
        outcome: 'הוא יצא מהחדר מרחף. הוא ייגש לבוחן, מחר תדע אם עבר. יש סיכוי טוב לעוגה בחדר הלבשה אם כן עבר.' },
      { label: 'אתה בסגל עד שאני מחליט אחרת. תדחה', effect: { morale: -5, prestige: +2 },
        outcome: 'הוא יישב על הספסל עם פרצוף באסה ויתפלל שלא תקרא לו לחמם.' },
    ],
  },
  {
    id: 'veteran_coach_course',
    speaker: 'player',
    slots: {},
    subject: 'veteranName',
    when: c => !!c.veteranName,
    text: 'מאמן, נרשמתי לקורס מאמנים. זה פעמיים בשבוע בערב, לא פוגע באימונים. רציתי שתשמע את זה ממני. ואם בא לך, אשמח לשבת לידך לראות איך אתה עובד.',
    options: () => [
      { label: 'שב לידי בכל אימון. יום אחד תחליף אותי פה', effect: { morale: +6, prestige: +2 },
        outcome: 'מהאימון הבא הוא יושב לידך עם מחברת. עוד שבועיים השחקנים יקראו לו המאמן הבא שלנו.' },
      { label: 'קודם תסיים את הקריירה, אחר כך לוח טקטיקה', effect: { morale: -4 },
        outcome: 'הוא שמע ושתק. הוא ימשיך בקורס בשקט, ומשהו ביניכם יתקרר.' },
    ],
  },
  {
    id: 'keeper_ritual',
    speaker: 'physio',
    slots: {},
    text: 'השוער שלנו מגיע שעתיים לפני כולם ועושה טקס שלם: נוגע בשני העמודים, מסתובב שלוש פעמים, מדבר עם הקורה. השחקנים צוחקים עליו והוא נפגע. זה מתחיל להשפיע עליו.',
    options: () => [
      { label: 'מי שצוחק על הטקס שלו ירוץ סיבובים. שוער צריך שקט בראש', effect: { morale: +4 },
        outcome: 'המסר יעבור באימון הקרוב. הצחוקים ייגמרו, והשוער יעמוד בין הקורות כמו בופון.' },
      { label: 'תעבוד איתו על זה, שלא יהיה תלוי בטקסים ', effect: { morale: -2, prestige: +1 },
        outcome: 'הפיזיו יתחיל לעבוד איתו. הוא ינסה בלי הטקס, ויבדוק אותך בעיניים לפני כל כדור גובה.' },
    ],
  },
  {
    id: 'team_dog',
    speaker: 'director',
    slots: {},
    text: 'יש כלב רחוב שנכנס למתחם האימונים לפני שבועיים והשחקנים מאכילים אותו. הם קוראים לו מסי. העירייה דורשת שנפנה אותו. חצי מהסגל מאיים שאם הכלב הולך, המורל הולך איתו.',
    options: () => [
      { label: 'הכלב נשאר, רושמים אותו על שם המועדון עם חיסונים', effect: { money: -3000, morale: +7 },
        outcome: 'מסי נשאר. הוא יקבל קולר בצבעי הקבוצה, וימשיך לשבת ליד השער בכל אימון.' },
      { label: 'מוצאים לו בית אוהב מחוץ למתחם, פה מתאמנים לא מגדלים כלבים', effect: { morale: -4, prestige: +1 },
        outcome: 'ההודעה תעבור לסגל. מישהו ייקח אותו הביתה, והשאר יבקשו תמונות כל יום.' },
    ],
  },
  {
    id: 'old_coach_visit',
    speaker: 'veteran',
    slots: {},
    text: 'המאמן שהיה פה לפניך ביקש לבוא לראות אימון. חלק מהשחקנים עוד בקשר איתו. ביני לבינך, יש כאלה שחושבים שפוטר בלי צדק. אתה בסדר עם זה שהוא מגיע?',
    options: () => [
      { label: 'שיבוא, יישב לידי. מי שעבד פה שייך לפה', effect: { morale: +5, prestige: +3 },
        outcome: 'הוא יבוא וישב לידך על הספסל. אם יגיד לשחקנים שהם בידיים טובות, תגדל בעיניהם.' },
      { label: 'לא עכשיו. חדר הלבשה צריך בעלים אחד', effect: { morale: -3, prestige: +1 },
        outcome: 'הוא לא יבוא. מי שבקשר איתו יספר לו, והוא יבין. אולי.' },
    ],
  },
  {
    id: 'school_talk',
    speaker: 'director',
    slots: {},
    text: 'בית ספר ב{city} מבקש שתבוא עם שני שחקנים לדבר עם הילדים על חלומות. זה באמצע יום אימון. המורה שפנתה אומרת שחצי מהכיתה לובשת את המדים שלכם.',
    options: () => [
      { label: 'הולכים. אימון של אחר הצהריים יחכה', effect: { morale: +4, fans: +5 },
        outcome: 'נקבע תאריך. הילדים לא ישחררו אתכם שעה, ומישהו עוד יבקש חתימה על החולצה.' },
      { label: 'שולח שני שחקנים, אני נשאר לעבוד', effect: { morale: +2 },
        outcome: 'שני שחקנים יסעו. הם יחזרו עם ציורים, אתה תישאר עם הטקטיקה.' },
    ],
  },
  {
    id: 'fans_away_bus',
    speaker: 'ultras',
    slots: {},
    when: c => !c.isHome,
    text: 'המשחק מול {rival} רחוק ואין לנו כסף לאוטובוס הפעם. בלעדינו תשמעו רק את הקהל שלהם. 6,000 שקל וארבעים איש באים לצעוק בשבילכם. על המועדון?',
    options: () => [
      { label: 'המועדון מממן. אתם שחקן מספר 12', effect: { money: -6000, fans: +12 },
        outcome: 'האוטובוס הוזמן. ארבעים גרונות מול אלף מקומיים, והשחקנים ישמעו אותם כל המשחק.' },
      { label: 'אין תקציב, תתארגנו בטרמפים', effect: { fans: -4 },
        outcome: 'הם יתארגנו לבד. יגיעו שמונה במכונית אחת ובטרנזיט, ויצעקו בשביל ארבעים.' },
    ],
  },
  {
    id: 'derby_barber',
    speaker: 'player',
    slots: {},
    subject: 'star',
    when: c => c.isDerby,
    text: 'מאמן, הספר של השכונה מציע לכל הסגל תספורות חינם לפני הדרבי מול {rival}. הוא רק מבקש תמונה קבוצתית בחנות. כל הסגל בעניין, זה קטע של גיבוש.',
    options: () => [
      { label: 'כולם מסתפרים, כולל אני. דרבי מתחיל בראש', effect: { morale: +6, fans: +2 },
        outcome: 'כל הסגל אצל הספר השבוע, כולל אתה. תגיעו לדרבי מסודרים כמו חתונה, והתמונה תיתלה בחנות לשנים.' },
      { label: 'אחרי הדרבי. עכשיו הראש במשחק, לא במספרה', effect: { morale: -2, prestige: +2 },
        outcome: 'אמרת להם שהראש קודם במשחק. הספר יחכה לכם אחרי הדרבי, והתספורת תהיה או חגיגה או ניחומים.' },
    ],
  },
  {
    id: 'post_holiday_weight',
    speaker: 'physio',
    slots: {},
    text: 'עשיתי שקילה הבוקר. יש לנו שחקן שחזר מהחופש עם חמישה קילו עודף. הוא נשבע שזה שרירים. זה לא שרירים. מה עושים איתו?',
    options: () => [
      { label: 'תוכנית אישית ושקילה כל בוקר, בדיסקרטיות', effect: { morale: +2 },
        outcome: 'הפיזיו בונה לו תוכנית. תוך חודש הוא יחזור לעצמו, ואף אחד לא יידע חוץ מצוות האימון.',
        act: [{ kind: 'fitness', who: 'striker', delta: -10 }] },
      { label: 'שקילה מול כל הסגל. בושה זה לא הגיוני ', effect: { morale: -5, prestige: +1 },
        outcome: 'השקילה נקבעה מול כולם. הסגל יצחק, הוא לא. הוא ירזה מהר, ויזכור לך את ההשפלה.' },
    ],
  },
  {
    id: 'anthem_girl',
    speaker: 'director',
    slots: {},
    when: c => c.tier === 5,
    text: 'ילדה בת 12 מ{city}, זמרת מהממת, שלחה סרטון שהיא שרה את המנון המועדון. היא מבקשת לשיר אותו במערכת הכריזה לפני המשחק. זה ייקח שלוש דקות מהסדר הרגיל.',
    options: () => [
      { label: 'שתשיר מול הקהל, לא בכריזה. מיקרופון אמיתי', effect: { fans: +6, morale: +2 },
        outcome: 'היא תקבל מיקרופון אמיתי מול הקהל. אם היציע יצטרף בבית השני, אבא שלה יצלם וייבכה מהתרגשות.' },
      { label: 'הסדר לפני משחק הוא קודש. אולי בסוף העונה', effect: { fans: -2 },
        outcome: 'היא תחכה לסוף העונה. עד אז הסרטון שלה יסתובב בכל העיר, בלעדיכם.' },
    ],
  },
  {
    id: 'training_spy',
    speaker: 'veteran',
    slots: {},
    text: 'ביני לבינך, יש בחור שיושב כבר שלושה אימונים ביציע עם מחברת. בדקתי, הוא עובד אצל {rival}. אתה רוצה שאני אעיף אותו או שניתן לו הצגה?',
    options: () => [
      { label: 'תן לו הצגה. נתאמן כל השבוע על מערך שלא נשחק בו', effect: { prestige: +3, morale: +3 },
        outcome: 'כל השבוע תתאמנו על מערך למראית עין. הוא ירשום הכל, ובשבת הם יתכוננו למשהו אחר לגמרי.' },
      { label: 'תעיף אותו. אימון זה לא הצגה', effect: { prestige: +1 },
        outcome: 'הוא יתבקש לרדת מהיציע. מה שראה בשלושה אימונים כבר אצלו בדוח.' },
    ],
  },
  {
    id: 'keeper_gloves',
    speaker: 'player',
    slots: {},
    subject: 'gk',
    text: 'מאמן, הכפפות שלי גמורות, אני תופר אותן כל שבוע. יש זוג מקצועי שעולה 1,200 שקל. המועדון קונה או שאני ממשיך לעצור עם הישנות שמחליקות?',
    options: () => [
      { label: 'קונים שני זוגות. ידיים של שוער זה לא מקום לחסוך', effect: { money: -2400, morale: +5 },
        outcome: 'הוזמנו שני זוגות. מהמשחק הבא הוא יחליק פחות, ועל כל עצירה תקבל קריצה ממנו.' },
      { label: '1,200 על כפפות? תקבל ממה שיש במחסן', effect: { money: +0, morale: -4 },
        outcome: 'הוא ילך לחטט במחסן. יימצא שם זוג משנת אלפיים ומשהו, ויעצור איתם,בקושי.' },
    ],
  },
  {
    id: 'star_birthday',
    speaker: 'captain',
    slots: {},
    text: 'מאמן, ל{star} יש יום הולדת יומיים לפני {rival}. הסגל רוצה לעשות לו הפתעה אחרי האימון, עוגה ומנגל קטן במתחם. שעה, לא יותר. מאשר?',
    options: () => [
      { label: 'מאשר, אני מביא את הבשר. קבוצה זה משפחה', effect: { morale: +7, money: -2000 },
        outcome: 'אישרת, והבשר עליך. השעה תהפוך לשעתיים ותהיה שווה כל דקה. {star} יעבור אחד אחד להגיד תודה.' },
      { label: 'אחרי המשחק. נותנים לו מתנה על הדשא', effect: { morale: -1, prestige: +2 },
        outcome: 'אמרת להם לחכות. המתנה הכי טובה היא שלוש נקודות, ככה אמרת. עכשיו תקווה שיצא.' },
    ],
  },
  {
    id: 'floodlight_broken',
    speaker: 'director',
    slots: {},
    when: c => c.isHome,
    text: 'עמוד תאורה אחד מהבהב. העירייה אומרת שהתיקון ייקח חודש. אפשר לשחק ככה והליגה תאשר, או לשלם לחברה פרטית שתתקן עד שבת.',
    options: () => [
      { label: 'משלמים ומתקנים. לא משחקים בחצי חושך', effect: { money: -10000, prestige: +1 },
        outcome: 'החברה תתחיל לתקן מחר. בשבת יהיה אור מלא, והקופה מרגישה את זה כבר עכשיו.' },
      { label: 'משחקים ככה, גם היריבה באותו אור', effect: { money: +0, fans: -2 },
        outcome: 'הפינה השמאלית תהבהב כל הערב. השוער שלך יקלל את העירייה בכל כדור גובה.' },
    ],
  },
  {
    id: 'food_poisoning',
    speaker: 'physio',
    slots: {},
    text: 'שלושה שחקנים אכלו אתמול באותה מסעדה ומהבוקר הם לא מפסיקים לשלשל. הם אמורים להיות כשירים עד שבת, בקושי. אני יכול לתת להם לשחק חלשים, או שתתכונן בלעדיהם.',
    options: () => [
      { label: 'מי שלא ישן בלילה לא עולה על דשא. מתכוננים בלעדיהם', effect: { morale: +3, prestige: +1 },
        outcome: 'שלושה מהספסל יקבלו הזדמנות. המסעדה תקבל ביקורת, מהסוג שלא מוחקים.' },
      { label: 'שיעלו חלשים, אין לי מחליפים ברמה', effect: { morale: -2 },
        outcome: 'הם יעלו על אדים. תחזיק מחליף חם, מישהו מהם יבקש החלפה מוקדם.',
        act: [{ kind: 'fitnessSome', count: 3, delta: -14 }] },
    ],
  },
  {
    id: 'tiktok_trend',
    speaker: 'reporter',
    slots: {},
    text: 'השחקנים שלך העלו סרטון רוקדים בחדר ההלבשה והוא מתפוצץ ברשת. חצי מהתגובות אוהבות, חצי כותבות שבמקום לרקוד שינצחו. רוצה להגיב לפני שזה מגיע למהדורה?',
    options: () => [
      { label: 'שירקדו. קבוצה שמחה זה קבוצה שרצה ביחד על המגרש ', effect: { morale: +6, prestige: -2 },
        outcome: 'נתת גיבוי. שירקדו. ואם יבוא ניצחון בשבת, התגובות יתיישרו לבד.' },
      { label: 'חדר הלבשה זה לא במה. הסרטונים נגמרו', effect: { morale: -5, prestige: +3 },
        outcome: 'החוק נכנס מהיום. הטלפונים יישארו בתיקים, והרשת תמצא קבוצה אחרת שתרקוד להם.' },
    ],
  },
  {
    id: 'charity_tickets',
    speaker: 'director',
    slots: {},
    when: c => c.isHome,
    text: 'עמותה לילדים בסיכון מ{city} מבקשת מאתיים כרטיסים חינם למשחק מול {rival}. זה יציע שלם שלא משלם. מצד שני, מאתיים ילדים שאולי יהיו מנויים בעוד עשר שנים.',
    options: () => [
      { label: 'מאתיים כרטיסים, ושהשחקנים יקבלו אותם בכניסה', effect: { money: -8000, fans: +6, morale: +3 },
        outcome: 'הכרטיסים יצאו. בשבת מאתיים ילדים יצעקו כאילו הם אלפיים, וחלק עוד יחזרו עם ההורים. בתשלום.' },
      { label: 'חמישים כרטיסים, זה מה שאפשר', effect: { fans: +1 },
        outcome: 'חמישים כרטיסים יצאו. העמותה תגיד תודה, בנימוס.' },
    ],
  },
  {
    id: 'rival_injury_news',
    speaker: 'veteran',
    slots: {},
    text: 'ביני לבינך, שמעתי מדוד שלי הוא מכין נקניקיות במגרש שם,החלוץ של {rival} פצוע והם מסתירים את זה. אפשר לבנות את כל ההגנה מתוך הנחה שהוא לא משחק. ואם המידע שגוי?',
    options: () => [
      { label: 'מתכוננים כאילו הוא משחק. לא בונים על שמועות של דוד שלך. שימשיך להכין נקניקיות', effect: { prestige: +2 },
        outcome: 'ההכנה מלאה. אם הוא לא יעלה, רק הרווחתם.' },
      { label: 'סומך על המקור שלך נשמע אמין, משנים את ההכנה', effect: { morale: +1 },
        outcome: 'כל השבוע תתאמנו על יריבה בלעדיו. בשבת תגלו אם המקור אמין.' },
    ],
  },
  {
    id: 'mother_dinner',
    speaker: 'mother',
    slots: {},
    text: 'חמודי, שמעתי בחדשות שיש לך משחק חשוב מול {rival}. הכנתי סירים. אתה בא בשישי עם כל השחקנים או שאני צריכה להביא לכם למגרש? אל תגיד לי שאתם אוכלים בדוכן נקניקיות שם.',
    options: () => [
      { label: 'אמא אין עלייך, מביא את כל הסגל בשישי. תכיני המון', effect: { morale: +8, money: -1000 },
        outcome: 'אמרת לה להכין המון. בשישי יהיו עשרים שחקנים בסלון של אמא, והיא תזכור את השם של כל אחד. הסגל אוהב את האוכל שלה.' },
      { label: 'אמא, פעם אחרת. מבטיח', effect: { morale: +1 },
        outcome: 'היא אמרה בסדר בטון של לא בסדר. הקופסאות יגיעו למגרש בכל זאת, עם פתק. השחקנים יריבו על הקציצות.' },
    ],
  },
  {
    id: 'owner_big_lead',
    speaker: 'owner',
    slots: {},
    when: c => c.pos === 1 && c.lead >= 5 && c.week >= 8,
    text: 'מקום ראשון, פער יפה. אל תגיד לאף אחד, אבל הזמנתי הצעת מחיר לשלטי אליפות. אתה אומר לי לעצור או שאני סוגר עם בית הדפוס?',
    options: () => [
      { label: 'תעצור. שלט אחד מודפס מוקדם וראיתי ליגות מתהפכות, זה מנחוס', effect: { prestige: +3, morale: +2 },
        outcome: 'הוא גנז את ההצעה. בית הדפוס מחכה, וגם כל הליגה.' },
      { label: 'תדפיס תדפיס. קבוצה שמפחדת מהמילה לא לוקחת אותה', effect: { morale: +5, prestige: -2, fans: +4 },
        outcome: 'הוא סוגר עם בית הדפוס. מספיק שמישהו שם יצלם וידליף, וכל הליגה תדע מה אתם חושבים.' },
    ],
  },
  {
    id: 'reporter_lead_column',
    speaker: 'reporter',
    slots: {},
    when: c => c.pos === 1 && c.lead >= 5,
    text: 'אני כותב מחר טור שהליגה הזאת כבר סגורה בזכותכם. זה יחמיא לך, אבל אתה ואני יודעים מה זה עושה לקבוצה מובילה. רוצה שאני ארכך את הניסוח?',
    options: () => [
      { label: 'תרכך. תכתוב שהכל פתוח, תעשה לי טובה', effect: { prestige: +2, morale: +2 },
        outcome: 'הוא הבטיח לרכך. הטור ייצא מחר צנוע, וחדר ההלבשה יישאר רעב.' },
      { label: 'תכתוב מה שאתה רואה. אנחנו לא מתחבאים מהטבלה', effect: { morale: +3, prestige: +1 },
        outcome: 'הכותרת מחר תהיה גדולה. מעכשיו כל תיקו שלכם יהיה דרמה ארצית.' },
    ],
  },
  {
    id: 'captain_tight_race',
    speaker: 'captain',
    slots: {},
    when: c => (c.pos === 2 || c.pos === 3) && c.gap <= 3 && c.week >= 8,
    text: 'מאמן, כולם בחדר מחשבים נקודות במקום לחשוב על {rival}. אני מרגיש את זה באימונים, הראש בטבלה. אולי שווה שתגיד משהו לפני שבת. או שאני אטפל בזה לבד?',
    options: () => [
      { label: 'אני אדבר איתם. מחזור אחד בכל פעם, אין טבלה עד מאי', effect: { morale: +5 },
        outcome: 'באימון הבא יהיה על הלוח רק שם היריבה הבאה. בלי טבלה. זה בדרך כלל עובד.' },
      { label: 'תטפל אתה, מילה של קפטן שווה עשר שלי', effect: { morale: +3, prestige: -1 },
        outcome: 'הוא ידבר בחדר בלעדיך. לא תדע מה ייאמר, אבל באימון שאחרי תראה אם זה תפס.' },
    ],
  },
  {
    id: 'ultras_chase_promise',
    speaker: 'ultras',
    slots: {},
    when: c => (c.pos === 2 || c.pos === 3) && c.gap <= 3,
    text: 'אנחנו נקודות בודדות מהפסגה. היציע החליט: באים לכל משחק עד סוף העונה, גם חוץ ועד סוף העולם. בתמורה אנחנו מבקשים אחד, שתגיד לשחקנים שהולכים על אליפות. בקול.',
    options: () => [
      { label: 'אני אגיד להם שהולכים עד הסוף. והם יידעו שאתם מאחורינו לכל מקום', effect: { morale: +6, fans: +7 },
        outcome: 'נתת מילה. ההודעה שלך תוקרא ביציע בשבת, ומעכשיו כל נקודה שתלך לאיבוד תכאב כפול.',
        act: [{ kind: 'promiseWin' }] },
      { label: 'אני לא מכריז הכרזות. אתם תבואו כי אתם אוהבים את הקבוצה', effect: { fans: -2, prestige: +3 },
        outcome: 'הם יבואו בכל זאת. בלי ההכרזה, אולי עם קצת פחות אש בשירה.' },
    ],
  },
  {
    id: 'owner_grey_middle',
    speaker: 'owner',
    slots: {},
    when: c => c.pos > 3 && c.pos <= c.teams - 3 && c.week >= 9,
    text: 'לא עולים, לא יורדים, לא כלום. אני יושב ביציע וסופר כמה אנשים באו. תגיד לי בכנות, בשביל מה אני משלם את כל זה? תן לי סיבה להתלהב עד סוף העונה.',
    options: () => [
      { label: 'העונה הזאת בונים. בשנה הבאה תראה את השיפור. תסתכל על הצעירים', effect: { morale: +3, prestige: +2 },
        outcome: 'הוא אמר שיבוא לאימון לראות את הצעירים. אם הם יעשו את שלהם, הוא יצא משם עם חצי חיוך.' },
      { label: 'אתה צודק, זה לא מספיק. נסיים את העונה בסערה, מילהש לי', effect: { morale: +4 },
        outcome: 'אמרת סערה. מעכשיו כל תיקו אפור ייזרק עליך בחזרה.',
        act: [{ kind: 'promiseWin' }] },
    ],
  },
  {
    id: 'reporter_grey_season',
    speaker: 'reporter',
    slots: {},
    when: c => c.pos > 3 && c.pos <= c.teams - 3 && c.week >= 9,
    text: 'אני מכין כתבה על קבוצות שהעונה שלהן לא מעניינת אף אחד, ואתם בתמונה הראשית. מקום {pos}, לא מלמעלה ולא מלמטה. יש לך מה להגיד להגנתך?',
    options: () => [
      { label: 'אמצע טבלה עם קופה מאוזנת זה הישג, תבדוק את התקציב שלנו', effect: { prestige: +2 },
        outcome: 'הוא הבטיח לבדוק. אם המספרים כמו שאתה אומר, הכתבה תצא הוגנת, אפילו מחמיאה. ומשעממת, כמו שאמר.' },
      { label: 'שמור את התמונה. בחמישה מחזורים אחרונים נעשה לך כתבה חדשה', effect: { morale: +4, prestige: -1 },
        outcome: 'הוא שמר את התמונה בצד. מעכשיו הוא יספור כל נקודה שלכם עד סוף העונה.',
        act: [{ kind: 'promiseWin' }] },
    ],
  },
  {
    id: 'star_bored_middle',
    speaker: 'player',
    slots: {},
    subject: 'star',
    when: c => (c.pos > 3 && c.pos <= c.teams - 3 && c.week >= 9) && c.starIsForward,
    text: 'מאמן, אני אגיד לך את האמת. לא נלחמים על כלום. אני בא לאימונים ומרגיש שאני דורך במקום. תן לי מטרה, משהו, כי ככה אני נרדם בעמידה.',
    options: () => [
      { label: 'המטרה שלך: מלך השערים של הליגה. אני בונה לך את המשחקים סביב זה', effect: { morale: +6 },
        outcome: 'יש לו מספר לרדוף. מהאימון הבא הוא יישאר אחרי כולם לבעיטות.' },
      { label: 'המטרה היא המקצוע שלך. מי שמשתעמם לא יכול להיות שחקן כדורגל, קח את עצמך בידיים.', effect: { morale: -5, prestige: +3 },
        outcome: 'הוא שתק ויצא. הוא ישחק נכון, בלי ברק.' },
    ],
  },
  {
    id: 'ultras_bottom_march',
    speaker: 'ultras',
    slots: {},
    when: c => c.pos >= c.teams - 1 && c.week >= 6,
    text: 'מקום {pos}. האוהדים מארגנים צעדה ממרכז {city} עד המגרש לפני המשחק מול {rival}. זאת לא צעדה נגדך, זאת צעדה בשביל הקבוצה. אתה מצטרף אלינו או שזה מביך אותך?',
    options: () => [
      { label: 'אני צועד איתכם מהרחוב הראשון. זאת גם הקבוצה שלי', effect: { morale: +4, fans: +8, prestige: -1 },
        outcome: 'אמרת שאתה צועד. תלך בחולצת המועדון באמצע ההמון, והשחקנים יראו את זה מהחלון. משהו יידלק.' },
      { label: 'אני עם הקבוצה בחדר. אבל תדעו שאני אשמע אתכם', effect: { fans: +2, prestige: +2 },
        outcome: 'הצעדה תעבור מתחת לחלון של חדר ההלבשה. תשמעו כל מילה ויהיה טירוף.' },
    ],
  },
  {
    id: 'director_bottom_sell',
    speaker: 'director',
    slots: {},
    when: c => (c.pos >= c.teams - 1 && c.money < 0) && c.winterLast,
    text: 'המצב בטבלה רע, והקופה יותר. אם נמכור את {star} עכשיו נסגור את החובות, אבל אז אין עם מי להציל את העונה. אם נחכה לקיץ והוא יירד איתנו ליגה, המחיר שלו נחתך בחצי. תחליט.',
    options: () => [
      { label: 'לא מוכרים באמצע מלחמה. ניצלים איתו וידאג למחיר של עצמו', effect: { morale: +6, fans: +4 },
        outcome: 'הוא נשאר. עכשיו כל שבת היא גם משחק הישרדות וגם חלון ראווה.' },
      { label: 'תמכור. קבוצה חיה חשובה משחקן אחד', effect: { morale: -10, fans: -6 },
        outcome: 'המנכ״ל מרים טלפונים כבר היום. כשהמכירה תיסגר, החובות ייקטנו משמעותית. ובחדר ההלבשה ייקחו קשה את ההחלטה.',
        act: [{ kind: 'sell', who: 'star' }] },
    ],
  },
  {
    id: 'veteran_bottom_calm',
    speaker: 'veteran',
    slots: {},
    when: c => c.pos >= c.teams - 1,
    text: 'ביני לבינך, הייתי בתחתית עם שלוש קבוצות ושרדתי עם שתיים. הסוד הוא שגרה, לא נאומים. השחקנים מריחים לחץ. תרשה לי לקחת את חימום לפני המשחק, שיראו פרצוף רגוע?',
    options: () => [
      { label: 'קח את החימום עלייך מחר. אני אעשה שיחות שחקנים ברגוע מהצד', effect: { morale: +5 },
        outcome: 'הוא יעביר את החימום כמו אימון רגיל של יום שלישי. ככה עולים בלי לחץ.' },
      { label: 'תודה, אבל בתחתית הם צריכים לראות אותי מוביל', effect: { prestige: +2, morale: +1 },
        outcome: 'לקחת הכל על עצמך. בשבת הם יראו מאמן שלא מתחבא.' },
    ],
  },
  {
    id: 'owner_derby_bonus',
    speaker: 'owner',
    slots: {},
    when: c => c.isDerby,
    text: 'דרבי מול {rival} זה היום הכי חשוב שלי בשנה. אני שם על השולחן בונוס מנצח לכל שחקן. אתה בעד, או שאתה חושב שזה יוסיף להם לחץ?',
    options: () => [
      { label: 'שים את הבונוס. דרבי משחקים גם על הכיס', effect: { morale: +5 },
        outcome: 'הבונוס על השולחן. הם יעלו עם מספר בראש, נקווה שזה דלק ולא משקולת.',
        act: [{ kind: 'winBonus', amount: 40000 }] },
      { label: 'תשמור את הכסף. דרבי משחקים בשביל הסמל, לא על הארנק', effect: { morale: +3, prestige: +3 },
        outcome: 'תגיד להם שמי שצריך בונוס בשביל דרבי שלא יתלבש. יהיה שקט בחדר. בקטע טוב.' },
    ],
  },
  {
    id: 'mother_derby_wish',
    speaker: 'mother',
    slots: {},
    when: c => c.isDerby,
    text: 'חמודי, השכנים כל השבוע מדברים על המשחק הזה מול {rival}. הבן של רחל מהקומה שלישית אוהד שלהם והוא מעצבן את כולם בבניין. תנצח בשבילי, שיהיה לי שקט במעלית.',
    options: () => [
      { label: 'אמא, מנצחים. תגידי לבן של רחל שיתכונן לרדת עם הראש למטה במעלית', effect: { morale: +3 },
        outcome: 'היא כבר מחייגת לרחל. עד הערב כל הבניין יידע. אין לחץ.' },
      { label: 'אמא, זה רק משחק. שלא יעצבנו אותך, יש לך לחץ דם גבוה', effect: { morale: -1 },
        outcome: 'היא ענתה "רק משחק? חמודי, אפילו אני יודעת שזה דרבי". צדקה.' },
    ],
  },
  {
    id: 'reporter_win_streak_pre',
    speaker: 'reporter',
    slots: {},
    when: c => c.winStreak >= 3,
    text: 'שלושה ניצחונות רצופים, וכולם מחכים לראות מתי תיפול הסדרה. אני כותב טור לקראת {rival}. אתה מעדיף שאכתוב שאתם לוהטים, או שאוריד מכם את הזרקור?',
    options: () => [
      { label: 'תכתוב שאנחנו לוהטים. שיפחדו', effect: { morale: +3, prestige: +1, fans: +3 },
        outcome: 'הכותרת מחר תבער. ב{rival} כנראה יתלו אותה בחדר ההלבשה.' },
      { label: 'תוריד את הזרקור. תכתוב על היריבה, תעשה לי טובה', effect: { prestige: +2, morale: +1 },
        outcome: 'הוא יכתוב עליהם. הקבוצה שלך תתכונן ברגוע, איפה שנוח.' },
    ],
  },
  {
    id: 'physio_pileup',
    speaker: 'physio',
    slots: {},
    when: c => c.week >= 11,
    text: 'אנחנו בקטע הצפוף של העונה והרגליים של הסגל כבדות. אני ממליץ אימון אחד פחות השבוע. אני יודע שאתה שונא לוותר על אימונים, אז באתי לשאול ולא לקבוע.',
    options: () => [
      { label: 'יום חופש מלא. רגליים רעננות שוות יותר מאימון נוס,', effect: { prestige: -1 },
        outcome: 'יום חופש אושר. הם ינוחו, יתארחו אצל המשפחות, ויחזרו רעבים לדשא.',
        act: [{ kind: 'fitnessAll', delta: +5 }] },
      { label: 'מתאמנים כרגיל. בסוף העונה ננוח', effect: { prestige: +2 },
        outcome: 'אימונים מלאים. הפיזיו רשם ביומן והכין קרח.',
        act: [{ kind: 'fitnessAll', delta: -3 }] },
    ],
  },
  {
    id: 'sponsor_table_clause',
    speaker: 'sponsor',
    slots: {},
    when: c => !!c.sponsor && c.pos * 2 <= c.teams,
    text: 'יש בחוזה שלנו סעיף שאף אחד לא קרא: אם אתם מסיימים בשלושה הראשונים, אנחנו מכפילים את החסות לעונה הבאה. אנחנו רוצים לבוא עם צלם לכמה אימונים, לבנות קמפיין על הסיפור שלכם. מפריע?',
    options: () => [
      { label: 'תביאו צלם, רק לא ביום שלפני משחק', effect: { morale: -1, money: +15000 },
        outcome: 'הצלם יתחיל להגיע השבוע. לאט לאט הוא יהפוך לחלק מהנוף, והקמפיין יחכה מוכן למקרה שתעמדו בסעיף.' },
      { label: 'בלי צלמים. נדבר כשנהיה בשלושה הראשונים בסוף העונה', effect: { prestige: +2 },
        outcome: 'הם כיבדו. הסעיף מחכה בחוזה, שקט.' },
    ],
  },
  {
    id: 'agent_wants_youngster',
    speaker: 'agent',
    slots: {},
    when: c => !!c.academy,
    text: 'שמעתי על {academy} מהנוער שלכם. אני רוצה לייצג אותו. אני אדאג לו, אבל שנינו יודעים שסוכן זה גם רעש: דרישות, טלפונים. אתה יכול להגיד למשפחה שאני בסדר, או לחסום אותי.',
    options: () => [
      { label: 'תפגוש את המשפחה בנוכחותי. שקיפות מלאה', effect: { prestige: +2 },
        outcome: 'הפגישה תהיה בנוכחותך. אם הילד יחתום, אתה בתמונה בכל החלטה.' },
      { label: 'הוא ילד. עוד שנתיים תתקשר אליו', effect: { morale: +1 },
        outcome: 'הוא אמר בסדר, בטון שלא מבטיח כלום. אל תתפלא אם עוד חודש יראו אותו בבית קפה עם אבא של הילד.',
        act: [{ kind: 'youthLeaveRisk', p: 0.35 }] },
    ],
  },
  {
    id: 'agent_loan_offer',
    speaker: 'agent',
    slots: {},
    subject: 'benched',
    when: c => (!!c.benched && c.benchedApps <= 1) && c.winterOpen,
    text: 'יש לי קבוצה מליגה נמוכה שמחפשת בדיוק את {benched}. השאלה עד סוף העונה, הם משלמים את השכר, הוא חוזר אליכם עם דקות משחק. או שהוא ממשיך לחמם לך ספסל.',
    options: () => [
      { label: 'שילך לשחק. שחקן בלי דקות זה שחקן שנרקב', effect: { morale: +2 },
        outcome: 'ההשאלה תיסגר השבוע. הוא ישחק כל שבוע, ויתקשר אחרי כל משחק לספר.',
        act: [{ kind: 'loanOut', who: 'subject' }] },
      { label: 'הוא נשאר. עומק סגל זה ביטוח, ופציעה אחת והוא בהרכב', effect: { morale: -2 },
        outcome: 'הוא נשאר על הספסל. מחכה לפציעה של מישהו, וקצת מתבייש בזה.' },
    ],
  },
  {
    id: 'owner_new_kit_mid',
    speaker: 'owner',
    slots: {},
    text: 'ראיתי עיצוב חדש למדים וסגרתי עם היצרן, חולצה שלישית מיוחדת. השחקנים ילבשו אותה כבר מול {rival}. יפה, הא? עלה לי 35 אלף.',
    options: () => [
      { label: 'חולצה חדשה באמצע עונה מביאה מזל רע. תשמור לעונה הבאה', effect: { prestige: +1, morale: +2 },
        outcome: 'הוא נעלב קצת אבל שמר אותה. הקיט נשאר בקופסאות, מחכה.' },
      { label: 'שילבשו. חולצה חדשה, אנרגיה חדשה,חייבים 3 נקודות ', effect: { money: -35000, fans: +3, morale: +2 },
        outcome: 'היא תעלה על הדשא בשבת. היציע יקנה בהמוניו, ומישהו בטח יגיד שהיא מזכירה פיג׳מה. מיעוט.' },
    ],
  },
  {
    id: 'captain_room_pairs',
    speaker: 'captain',
    slots: {},
    when: c => !c.isHome,
    text: 'מאמן, בנסיעות יש בעיה עם סידור החדרים. הוותיקים רוצים לישון עם החברים שלהם, ואני חושב שכדאי לערבב צעירים עם ותיקים. זה יעשה רעש קטן אבל יחבר את החדר. מה אתה מחליט?',
    options: () => [
      { label: 'מערבבים. ותיק עם צעיר בכל חדר, החל מהנסיעה הזאת', effect: {  },
        outcome: 'מערבבים מהנסיעה הזאת. הלילה הראשון יהיה מוזר, ואחרי שבועיים הצעירים יישבו עם הוותיקים גם בארוחות.' },
      { label: 'שכל אחד יישן איפה שנוח לו. שינה טובה לפני משחק', effect: { morale: +2 },
        outcome: 'כולם יישנו מצוין. והקליקות יישארו קליקות.' },
    ],
  },
  {
    id: 'shirt_number_fight',
    speaker: 'veteran',
    slots: {},
    when: c => !!c.newcomer,
    text: 'יש לנו ריב קטן: {newcomer} ביקש את מספר 10, אבל זה המספר של {star} כבר שנים. {newcomer} אומר ששיחק עם 10 כל החיים. שטויות של מספרים, אבל חדרי הלבשה נשרפו על פחות.',
    options: () => [
      { label: 'המספר של {star} לא זז. החדש יבחר מהפנויים', effect: { morale: +1 },
        outcome: 'הוותיקים ינהנו, יש פה סדר. החדש ייקח מספר פנוי בשקט. כנראה 27.' },
      { label: 'שיסגרו את זה ביניהם, בלעדיי. אתם בוגרים לא ילדים', effect: { morale: +1 },
        outcome: 'שיסתדרו ביניהם. אל תתפלא אם זה ייגמר בעסקה, ה-10 תמורת ארוחת שף. הסגל ייסתלבט על השחקן החדש שבוע.' },
    ],
  },
  {
    id: 'keeper_wants_out',
    speaker: 'player',
    slots: {},
    subject: 'gk',
    text: 'מאמן, אני רוצה לשחק גבוה יותר, לצאת מהשער, להיות עוד בלם. ככה משחקים היום בכל העולם. אני יודע שזה סיכון, אבל זה גם יתרון. תן לי את החופש הזה?',
    options: () => [
      { label: 'קיבלת. אבל טעות אחת מצחיקה והחופש באזור ההגנה נגמר ', effect: {  },
        outcome: 'מהמשחק הבא הוא ישחק רחוק מהשער והקבוצה תעלה מהר. היציע יעצור נשימה בכל כדור ארוך.' },
      { label: 'אתה שוער. השער, הקו, הידיים. זהו', effect: { morale: -3 },
        outcome: 'הוא יישאר על הקו, יעצור ויתוסכל. ישעמם לו.' },
    ],
  },
  {
    id: 'physio_screens',
    speaker: 'physio',
    slots: {},
    text: 'חצי מהסגל ישן חמש שעות בלילה, בדקתי. הם על משחקי מחשב ומסכים עד שלוש לפנות בוקר. אני יכול להרצות להם על שינה, או שאתה שם חוק. חוקים שלך עובדים יותר טוב משלי.',
    options: () => [
      { label: 'חוק: טלפונים נסגרים מוקדם לילה לפני משחק', effect: { morale: -4 },
        outcome: 'החוק יוצא היום. יבכו יומיים, ואחרי שבועיים יודו שהם ישנים כמו תינוקות.',
        act: [{ kind: 'fitnessAll', delta: +4 }] },
      { label: 'הם מבוגרים. תעשה להם הרצאה ושיחליטו לבד', effect: { morale: +2 },
        outcome: 'ההרצאה תהיה טובה. שליש יאמצו, והשאר ימשיכו להפסיד במשחקים גם במחשב.' },
    ],
  },
  {
    id: 'youth_double_training',
    speaker: 'youth',
    slots: {},
    when: c => !!c.academy,
    text: '{academy} מבקש להתאמן גם עם הנוער וגם עם הבוגרים, כל יום אימון כפול. הלב שלו ענק אבל הגוף בן 17. אני נגד, הוא יישבר. אבל הוא לא מוותר ושואל אותך ישירות.',
    options: () => [
      { label: 'אימון כפול יומיים בשבוע בלבד, ואני עוקב אישית', effect: {  },
        outcome: 'יומיים בשבוע הוא יגיע ראשון וילך אחרון. הפיזיו יעקוב עם סטופר.',
        act: [{ kind: 'youthBoost' }] },
      { label: 'הגוף שלך זה הקריירה שלך. אימון אחד, ותודה שרצית', effect: { morale: +1 },
        outcome: 'מאמן הנוער נשם לרווחה. הילד יתאכזב, ואז יבין.' },
    ],
  },
  {
    id: 'half_season_tickets',
    speaker: 'director',
    slots: {},
    when: c => c.isHome && c.week >= 7,
    text: 'אני רוצה להוציא מבצע מנוי חצי עונה בחצי מחיר, להחזיר אנשים ליציע. זה מוריד הכנסה לכרטיס אבל ממלא את המגרש. היציע המלא שווה לך משהו על הדשא, לא?',
    options: () => [
      { label: 'תוציא. מגרש מלא שווה יותר מקופה מלאה', effect: { money: -10000, fans: +6 },
        outcome: 'המבצע יוצא השבוע. היציע יתמלא בפרצופים חדשים, וחלק יישארו גם במחיר מלא.',
        act: [{ kind: 'gate', mult: 1.3 }] },
      { label: 'אל תוזיל את הכרטיס. מה שזול לא מעריכים', effect: { money: +0, prestige: +1 },
        outcome: 'היציע נשאר כמו שהוא. מי שבא, בא באמת.' },
    ],
  },
  {
    id: 'ultras_new_song',
    speaker: 'ultras',
    slots: {},
    when: c => c.isHome,
    text: 'כתבנו שיר חדש ליציע, עליך. מילים טובות, מנגינה שנתקעת בראש. יש כאלה אצלנו שאומרים ששיר על מאמן מביא פיטורים, שרים רק על שחקנים. אתה רוצה לשמוע אותו במגרש או שנמחק?',
    options: () => [
      { label: 'שירו על השחקנים. אני עובר, המועדון נשאר', effect: { prestige: +4, fans: +3 },
        outcome: 'הם ישנו את המילים לשיר על הקבוצה. מנהיג היציע אמר שבדיוק בגלל התשובה הזאת מגיע לך שיר.' },
      { label: 'תשירו. ואני אעשה הכל כדי שתשירו אותו שנים', effect: { morale: +2, fans: +4 },
        outcome: 'השיר יהיה בשבת כל המשחק. מעכשיו תשמע אותו גם בניצחונות, וגם כשירצו להזכיר לך אותו.' },
    ],
  },
  {
    id: 'reporter_exclusive',
    speaker: 'reporter',
    slots: {},
    text: 'אני מציע לך ראיון עומק, כתבה כפולה בסוף השבוע. שעה של שאלות, בלי לחתוך. זה במה ענקית, וזה גם חבל תלייה אם תגיד משפט אחד לא נכון יום לפני {rival}. בעניין?',
    options: () => [
      { label: 'בעניין. מי שמפחד ממיקרופון שלא יישב על הקו', effect: { prestige: +4 },
        outcome: 'הראיון נקבע. הכתבה תצא חזקה, ומשפט אחד שלך יהפוך לכותרת. הם תמיד בוחרים דווקא אותו.' },
      { label: 'אחרי המשחק, שעה שלמה. לפני משחק אני של הקבוצה', effect: { prestige: +1 },
        outcome: 'הוא קיבל את זה. הראיון יחכה ליום ראשון, רגוע ובטוח.' },
    ],
  },
  {
    id: 'owner_vip_guests',
    speaker: 'owner',
    slots: {},
    when: c => c.isHome,
    text: 'מגיעים אליי לתא אנשי עסקים שאני מנסה לצרף כמשקיעים. אני צריך משחק יפה, התקפי, כזה שמוכר חלום. אל תביך אותי עם אוטובוס מול השער, בסדר?',
    options: () => [
      { label: 'אני אשחק בשביל שלוש נקודות. אם זה ייצא יפה, מתנה', effect: { prestige: +3, morale: +2 },
        outcome: 'הבעלים בלע את זה. אחרי המשחק תדע אם המשקיעים ראו מועדון רציני, או לא.' },
      { label: 'פותחים את המשחק בשבילך. שיראו הצגה', effect: { morale: +1 },
        outcome: 'תעלו לתקוף מהדקה הראשונה. התא ימחא כפיים. ההגנה שלך, לא בטוח.',
        act: [{ kind: 'formation', id: '3-4-3' }] },
    ],
  },
  {
    id: 'car_dealer_star',
    speaker: 'agent',
    slots: {},
    text: 'מגרש מכוניות ב{city} מציע ל{star} רכב צמוד לעונה, בתמורה לתמונה שלו על השלט בכניסה לעיר. זה כסף שלא יוצא מהמועדון, אבל זה גם כוכב אחד שמקבל משהו שאחרים לא. מאשר?',
    options: () => [
      { label: 'מאשר, בתנאי שהוא לוקח שני צעירים הביתה אחרי כל אימון', effect: { morale: +4 },
        outcome: 'העסקה תיסגר עם התנאי שלך. הוא יסיע צעירים ברכב החדש, השלט יעלה בכניסה לעיר, והקנאה בחדר תירגע.' },
      { label: 'לא. או שכולם מקבלים או שאף אחד', effect: { morale: +1 },
        outcome: 'הסוכן התעצבן. הסגל עוד יעריך את זה, ו{star} ימשיך להגיע עם הרכב הישן שלו.' },
    ],
  },
  {
    id: 'night_shift_player',
    speaker: 'player',
    slots: {},
    subject: 'benched',
    when: c => !!c.benched && c.tier <= 2,
    text: 'מאמן, אני עובד משמרות לילה והמשכורת מהכדורגל לא מספיקה לי לוותר עליהן. ביום של המשחק מול {rival} אני יורד ממשמרת בשש בבוקר. אני יכול לשחק, רק שתדע את האמת.',
    options: () => [
      { label: 'אתה לא עולה אחרי לילה ער. שב בספסל ותנוח, ובשבוע הבא נסדר לך משמרות', effect: { morale: +5 },
        outcome: 'הוא יישב בצד וינוח. בשבוע הבא המנכ״ל ידבר עם המעסיק שלו.',
        act: [{ kind: 'sit', who: 'subject', label: 'נח' }] },
      { label: 'תשתה קפה ותעלה אם אצטרך אותך. גברים עובדים ומשחקים', effect: {  },
        outcome: 'אם תצטרך אותו הוא ייכנס עם עיניים אדומות. ירוץ על גז של כבוד.',
        act: [{ kind: 'fitness', who: 'subject', delta: -18 }] },
    ],
  },
  {
    id: 'squad_bonus_request',
    speaker: 'captain',
    slots: {},
    when: c => c.pos * 2 <= c.teams && c.week >= 8,
    text: 'מאמן, הסגל ביקש ממני להעביר בקשה: אם אנחנו מסיימים את העונה בשלושה הראשונים, שהמועדון ייתן בונוס קבוצתי. הם לא רוצים לדבר עם הבעלים ישירות. אתה מוכן להילחם על זה?',
    options: () => [
      { label: 'אני מעביר את זה לבעלים היום, עם ההמלצה שלי', effect: { morale: +6 },
        outcome: 'אתה עולה עם זה לבעלים היום. הוא יעקם את הפרצוף, ואם יחתום, הסגל יידע מי הלך בשבילו.' },
      { label: 'קודם תסיימו בשלושה הראשונים בסוף העונה, אחר כך בונוסים', effect: { morale: -3, prestige: +2 },
        outcome: 'הקפטן יעביר את התשובה. חלק יקבלו את זה כאתגר, חלק כעלבון.' },
    ],
  },
  {
    id: 'mother_laundry',
    speaker: 'mother',
    slots: {},
    text: 'חמודי, אני שומעת שהשחקנים שלך אוכלים סלטים מקופסה אחרי אימונים. איזה סלטים, הם ילדים רזים. אני רוצה לבשל לכל הקבוצה פעם בשבוע. אל תגיד לי שיש תזונאית, אני יודעת יותר טוב ממנה.',
    options: () => [
      { label: 'פעם בשבוע, יום חמישי. והתזונאית מאשרת תפריט', effect: { morale: +6, money: -500 },
        outcome: 'סגרתם על יום חמישי. הוא עוד יהפוך לקדוש במועדון, והתזונאית ואמא ייאלצו להיות חברות. פחות או יותר.' },
      { label: 'אמא, יש תזונאית וזה המקצוע שלה. תבשלי רק לי', effect: { morale: +1 },
        outcome: 'היא אמרה בסדר, בטון שאתה מכיר. בשישי יחכו לך שלושה סירים עם פתק שזה רק לך. אין סיכוי שתאכל הכל לבד.' },
    ],
  },
  {
    id: 'cleaner_overheard',
    speaker: 'veteran',
    slots: {},
    when: c => c.isDerby,
    text: 'לא תאמין. המנקה של האצטדיון עובדת גם אצל {rival}, והיא שמעה שם את המאמן אומר לשחקנים בדיוק איך הם הולכים לשחק נגדנו. היא מוכנה לספר. אתה רוצה לשמוע או שזה לא בכבוד שלך?',
    options: () => [
      { label: 'אני לא בונה דרבי על רכילות. תגיד לה תודה ושתשמור על עצמה', effect: { prestige: +4 },
        outcome: 'לא שמעת. ניצחון, אם יבוא, יהיה נקי. והיא עוד תספר לכולם שאתה ג׳נטלמן.' },
      { label: 'ספר לי הכל. דרבי זה מלחמה. כל דבר יעזור', effect: { prestige: -2 },
        outcome: 'היא תספר לך הכל עוד היום. תדע את ההרכב שלהם לפני העיתונאים. רק אל תגיד לאף אחד מאיפה.' },
    ],
  },
  {
    id: 'owner_social_video',
    speaker: 'owner',
    slots: {},
    text: 'ראיתי שלמאמנים אחרים יש סרטונים ברשת, מאחורי הקלעים, דיבורים למצלמה. אני רוצה שתעשה כזה פעם בשבוע. זה מביא קהל צעיר וזה מביא ספונסרים. אתה לא פוטוגני, אבל תסתדר.',
    options: () => [
      { label: 'פעם בשבוע, חמש דקות, ואני בוחר מה מצלמים', effect: { fans: +4, prestige: -1 },
        outcome: 'הסרטון הראשון מצטלם השבוע. אם הוא יעשה יפה, ילדים ביציע יצטטו לך משפטים מול הפנים.' },
      { label: 'אני מאמן, לא יוצר תוכן. תביא ספונסרים עם כדורגל', effect: { prestige: +3, morale: +2 },
        outcome: 'הבעלים לא אהב את התשובה, לא ישכח מזה. השחקנים יעריכו שאתה לא מצטלם על חשבונם.' },
    ],
  },
  {
    id: 'derby_police_cut',
    speaker: 'director',
    slots: {},
    when: c => c.isDerby && c.isHome,
    text: 'המשטרה דורשת לצמצם את כמות הקהל בדרבי מול {rival} מטעמי ביטחון, אלא אם נשלם על תגבור אבטחה מהכיס שלנו. 25 אלף. יציע מלא או קופה מלאה, תבחר.',
    options: () => [
      { label: 'משלמים. דרבי בלי יציע מלא זה לא דרבי', effect: { money: -25000, fans: +6 },
        outcome: 'התגבור שולם. בשבת המגרש יתפוצץ, והאווירה תהיה שווה כל שקל.',
        act: [{ kind: 'gate', mult: 1.15 }] },
      { label: 'מצמצמים. הכסף הזה הוא משכורת של שחקן', effect: { money: +0, fans: -5 },
        outcome: 'הדרבי ישוחק מול יציע מדולל. מי שלא ייכנס יעמוד בחוץ וישמע את השאגות.',
        act: [{ kind: 'gate', mult: 0.6 }] },
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
  // Itzik's 3.10 batch: club life that can wait for the manager's own time
  'mascot_too_old', 'gym_chain_offer', 'local_youtuber', 'owner_cousin_catering',
  'groundskeeper_quits', 'veteran_coach_course', 'team_dog', 'school_talk',
  'star_birthday', 'tiktok_trend', 'charity_tickets', 'mother_dinner',
  'star_bored_middle', 'agent_wants_youngster', 'youth_double_training',
  'half_season_tickets', 'ultras_new_song', 'reporter_exclusive',
  'car_dealer_star', 'squad_bonus_request', 'mother_laundry', 'owner_social_video',
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
