/**
 * The factory friendly: the words.
 *
 * A works team celebrating its seventieth anniversary pays for a midweek match.
 * It is played in an instant and told afterwards, so what the manager reads is
 * a short report built out of what really happened in the simulated ninety
 * minutes: who scored and when, whether anyone was sent off, who was best.
 *
 * DRAFT WORDING throughout, Itzik's to correct. Names are invented and carry no
 * brand. No score numerals inside a sentence, only on the board, because a
 * number inside Hebrew text reads backwards for half the people holding a phone.
 */

import type { Rng } from '../engine/matchEngine.ts';

/** Fictional works teams, a product and a place each. Itzik approves the list. */
export const FACTORIES: string[] = [
  'מפעלי הבלוקים של בית שמש',
  'מפעל הפלסטיק הצפוני',
  'מפעלי הצבע של באר שבע',
  'מפעל הקרטונים מקריית גת',
  'מפעלי הברזל של אשדוד',
  'מפעל הגרביים של נתיבות',
  'מפעלי הזכוכית של חדרה',
  'מפעל השימורים של עפולה',
  'מפעלי הנייר של חדרה והסביבה',
  'מפעל הסבון של נס ציונה',
  'מפעלי הטקסטיל של דימונה',
  'מפעל הריהוט של לוד',
];

/** What the report needs of a match: only what the engine already records. */
export interface FriendlyEvent {
  minute: number;
  type: 'goal' | 'penalty_goal' | 'own_goal' | 'red';
  /** the goal or card is on my side's account */
  mine: boolean;
  /** family name of the man it is about */
  who: string;
}

export interface FriendlyFacts {
  factory: string;
  club: string;
  /** my goals, theirs */
  score: [number, number];
  events: FriendlyEvent[];
  /** my best man on the night, family name, when one stood out */
  star?: string;
}

/** What the popup shows and the save keeps: the board, the story, the fee. */
export interface FriendlyReport {
  factory: string;
  club: string;
  /** my goals, theirs */
  score: [number, number];
  fee: number;
  /** ids of my men who played, who come back tired and with minutes on the sheet */
  played: string[];
  lines: string[];
}

const pick = <T,>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

const OPENINGS = (f: string): string[] => [
  `שריקת פתיחה על המגרש של ${f}. חצי מהמפעל יצא לראות, והמנהל הגיע עם מגפון.`,
  `המגרש של ${f} מלא בורות והיה מסוכן לשחק שם. העובדים שלהם הביאו תופים, ולא כולם יודעים לתופף.`,
  `משמרת הבוקר ויתרה על ארוחת הצהריים, וכל העובדים של ${f} ישבו על הגדר כשהמשחק התחיל.`,
  `הכדור הראשון עף מעל הגדר, וילד מהשכונה החזיר אותו תמורת חתימה.`,
];

const MY_GOAL = (who: string, m: number): string[] => [
  `בדקה ${m} ${who} מבקיע בשבילנו.`,
  `${who} מוצא את הרשת בדקה ${m}.`,
  `בדקה ${m} ${who} שולח כדור פנימה, והספסל קופץ.`,
  `${who} מסיים יפה בדקה ${m}, ואף אחד על הגדר לא מבין מה קרה.`,
];

/** `answering` is true only when we had already scored, the one case where they can answer. */
const THEIR_GOAL = (who: string, f: string, m: number, answering: boolean): string[] => [
  `בדקה ${m} ${who} מ${f} מפתיע אותנו.`,
  `${who} מבקיע בדקה ${m}, וכל העובדים על הגדר רוקדים.`,
  `בדקה ${m} ${who} מ${f} שולח כדור לרשת שלנו, והמגפון של המנהל נשמע בכל העיר.`,
  ...(answering ? [`בדקה ${m} העובדים עונים, ו${who} חוגג מול החברה.`] : []),
];

const RESULT_LINE: Record<'win' | 'draw' | 'loss', string[]> = {
  win: [
    'ניצחנו. הצעירים קיבלו ערב אמיתי והעובדים קיבלו תירוץ לחגוג.',
    'ניצחון לנו, ואף אחד מהעובדים לא נעלב. הם בטוחים שנתנו לנו לנצח.',
  ],
  draw: [
    'סיימנו בתיקו. כולם הלכו הביתה מרוצים, וזה נדיר.',
    'תיקו בין חברים. מי שרצה ניצחון יקבל אותו בשבת.',
  ],
  loss: [
    'הפסדנו לעובדים. מה שקורה במפעל נשאר במפעל.',
    'הפסד לעובדים. כדאי שזה יישאר בינינו ובין המפעל.',
  ],
};

const GOALLESS = [
  'לא נכנס כלום. כדור אחד נבעט לקנטינה, והמנהל החליט שזה מספיק לשבוע.',
  'אפס שערים משני הצדדים. הקהל על הגדר קיבל בסוף ברכת שבוע טוב.',
];

/** We only ever tell this many goals, the rest are counted in one line. */
const MAX_GOALS_TOLD = 4;

/** The report: a handful of short lines, in the order the evening went. */
export function describeFriendly(facts: FriendlyFacts, rng: Rng): string[] {
  const { factory, score, events, star } = facts;
  const lines: string[] = [pick(OPENINGS(factory), rng)];

  // the evening in the order it went: goals and a sending off together, by minute
  const firstRed = events.find(e => e.type === 'red');
  const shown = events
    .filter(e => e.type !== 'red' || e === firstRed)
    .sort((a, b) => a.minute - b.minute);
  const goals = shown.filter(e => e.type !== 'red');
  if (!goals.length) lines.push(pick(GOALLESS, rng));

  let told = 0, mineTold = 0, theirsTold = 0;
  const turn = Math.floor(rng() * 10);
  let weScored = false;
  for (const e of shown) {
    if (e.type === 'red') {
      lines.push(e.mine
        ? `${e.who} ראה אדום בדקה ${e.minute}. בידידות. מול עובדים.`
        : `${e.who} מ${factory} נשלח לקנטינה בדקה ${e.minute}, והעובדים שרקו לשופט.`);
      continue;
    }
    // an own goal is on the account of the man who put it in, so it scores for the other side
    const ours = e.type === 'own_goal' ? !e.mine : e.mine;
    if (told < MAX_GOALS_TOLD) {
      told++;
      if (e.type === 'own_goal') {
        lines.push(e.mine
          ? `בדקה ${e.minute} ${e.who} מכניס אחד לשער שלנו. זה נשאר בין חברים.`
          : `בדקה ${e.minute} ${e.who} מ${factory} מכניס אחד לשער שלו, ואנחנו לא מתלוננים.`);
      } else {
        // each side cycles through its own wordings, so two goals in a row never sound the same
        const variants = e.mine ? MY_GOAL(e.who, e.minute) : THEIR_GOAL(e.who, factory, e.minute, weScored);
        const n = e.mine ? mineTold++ : theirsTold++;
        lines.push(variants[(n + turn) % variants.length]);
      }
    }
    if (ours) weScored = true;
  }
  const extra = goals.length - MAX_GOALS_TOLD;
  if (extra === 1) lines.push('ועוד שער אחד נרשם עד השריקה, ואף אחד לא הצליח לספור אותו.');
  else if (extra > 1) lines.push(`ועוד ${extra} שערים נרשמו עד השריקה, ואף אחד לא הצליח לספור אותם.`);

  if (star) lines.push(`הכי טוב אצלנו היה ${star}.`);

  const [a, b] = score;
  lines.push(pick(RESULT_LINE[a > b ? 'win' : a === b ? 'draw' : 'loss'], rng));
  return lines;
}
