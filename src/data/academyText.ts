/**
 * The words of the youth academy (the content writer's drafts of 13.10, PIC/team/youth-academy/content.json): a scout's
 * report on a boy, what the youth coach says, the promotion at 18. Where a report named a position the boy does not
 * play, the position is the boy's own and only reports that fit it are offered. A line that needs a thing the game
 * cannot see (an injury, a bad night) is not here.
 */

import type { Position } from '../engine/matchEngine.ts';

export const POS_HE: Record<Position, string> = {
  GK: 'שוער', CB: 'בלם', LB: 'מגן שמאלי', RB: 'מגן ימני', CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר יוצר',
  LW: 'כנף שמאל', RW: 'כנף ימין', ST: 'חלוץ',
} as Record<Position, string>;

export type Band = 'modest' | 'promising' | 'gem';

/** by the ceiling he truly has: under 65, up to 77, 78 and over */
export const bandOf = (potMax: number): Band => (potMax < 65 ? 'modest' : potMax < 78 ? 'promising' : 'gem');

interface Report { band: Band; positions: Position[]; min: number; max: number; rest: string }

/** what comes after the position: character, a flaw, and the youth coach's word */
const REPORTS: Report[] = [
  { band: 'modest', positions: ['CB'], min: 1, max: 3, rest: 'עובד קשה, לא מוותר על כדור. איטי קצת בסיבובים. המאמן: ״ישחק בליגה, לא יותר מזה, אבל ישחק״.' },
  { band: 'modest', positions: ['CM', 'CDM', 'CAM'], min: 1, max: 5, rest: 'מסדר, שקט, לא טועה בפשוטות. אין לו את ההבדל בכדור הראשון. המאמן: ״שחקן קבוצה, מהסוג שתמיד צריך״.' },
  { band: 'modest', positions: ['ST'], min: 2, max: 4, rest: 'רץ בלי סוף, לוחץ על הבלמים. הסיום שלו עדיין חלש. המאמן: ״מה שיש זה מה שיהיה, תתחיל לא לצפות לפלאות״.' },
  { band: 'modest', positions: ['GK'], min: 4, max: 5, rest: 'גובה טוב, ידיים בטוחות בכדורים גבוהים. נחלש ברגליים ובהוצאה. המאמן: ״ספסל מכובד, לא יותר״.' },
  { band: 'promising', positions: ['CM', 'CAM'], min: 1, max: 3, rest: 'רואה את המגרש לפני כולם, כדור ישר לרגל. פיזית עוד ילד. המאמן: ״אם יקבל דקות, תשמע עליו״.' },
  { band: 'promising', positions: ['LW', 'RW'], min: 1, max: 5, rest: 'מהיר, מוריד כתף ועובר. מתעצבן כשלא נותנים לו כדור. המאמן: ״יש שם משהו. צריך רק לחנך אותו״.' },
  { band: 'promising', positions: ['CB'], min: 3, max: 5, rest: 'קורא משחק כמו מבוגר, חזק באוויר. מאבד ריכוז בדקות האחרונות. המאמן: ״בעוד שנתיים הוא כבר לא הנער״.' },
  { band: 'promising', positions: ['CDM'], min: 2, max: 4, rest: 'נלחם על כל כדור, קול בקבוצה. שובר לפעמים את הדרך בכרטיסים. המאמן: ״המנהיג שלכם בעוד כמה שנים״.' },
  { band: 'gem', positions: ['ST'], min: 1, max: 3, rest: 'תנועה שלא לימדו אותו, סיום בשתי רגליים. קצת עצלן באימונים. המאמן: ״אני לא רוצה להגיד יותר מדי. תן לו לשחק ותראה״.' },
  { band: 'gem', positions: ['CAM', 'CM'], min: 1, max: 5, rest: 'הכדור אצלו וכולם זזים. פצוע לפעמים, עדין. המאמן: ״ראיתי כמה כאלה בחיים. הוא אחד מהם״.' },
  { band: 'gem', positions: ['CB'], min: 4, max: 5, rest: 'שקט, לא מתרגש, מוציא כדור כמו קשר. מתקשה עם אנשים. המאמן: ״אם לא נשמור עליו, יבואו לקחת אותו מאירופה בעוד שנה״.' },
  { band: 'gem', positions: ['GK'], min: 2, max: 5, rest: 'רפלקסים שלא רואים כל יום, אומץ בכדור גבוה. מוציא לפעמים מוקדם מדי. המאמן: ״הפעם אני לא צוחק״.' },
];

/** for a position with no report of its band: a plain line, so a report is never about another man */
const PLAIN: Record<Band, string> = {
  modest: 'עושה את הבסיס, בלי הברקות. המאמן: ״מה שרואים זה מה שיש״.',
  promising: 'מהיר וחכם, עוד ילד בגוף. המאמן: ״אם יקבל דקות, תשמע עליו״.',
  gem: 'יש בו משהו שלא לימדו. המאמן: ״אני לא רוצה להגיד יותר מדי״.',
};

const hashOf = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** One line about a boy for a scout's list, by what he truly has: it hints and gives no number. Deterministic. */
export function scoutReport(name: string, pos: Position, potMax: number, tier: number): string {
  const band = bandOf(potMax);
  const fits = REPORTS.filter(r => r.band === band && r.positions.includes(pos) && tier >= r.min && tier <= r.max);
  const rest = fits.length ? fits[hashOf(name) % fits.length].rest : PLAIN[band];
  return `${name}, ${POS_HE[pos]}. ${rest}`;
}

export interface CoachNote { id: string; lines: string[] }

/** the youth coach's messages, {boy} the boy's name */
export const COACH: Record<string, string[]> = {
  yc_first_minutes: ['ראית את {boy} היום?', 'הדקות הראשונות, ראשון בחיים. הוא לא ישן כל הלילה', 'תמשיך לתת, ככה זה נבנה'],
  yc_bench_stuck: ['מנהל, {boy} יושב כבר חודש', 'בלי דקות הוא לא יגדל. זה הכלל היחיד פה', 'אני לא מבקש הרכב. עשר דקות בסוף משחק, משהו'],
  yc_potential_jump: ['מנהל, תסתכל על {boy}', 'הדקות עשו לו משהו. התקרה שלו עלתה', 'אמרתי לך שיש בו עוד'],
  yc_asks_seniors: ['{boy} שאל אותי מתי עולים לבוגרים', 'אמרתי לו שזה אצלך. הוא לא מבקש, רק שואל', 'עוד כמה חודשים הוא בן 18. תחליט אם אתה עושה לו מקום'],
  yc_sniffing_low: ['שמעתי שהיה סקאוט מקבוצה גדולה ביציע', 'ישב ליד השער, רשם משהו על {boy}', 'אני אומר לך לפני שהוא מגיע אליך עם הצעה'],
  yc_sniffing_pro: ['התקשר אליי מישהו מקבוצה באירופה', 'שאל על {boy}. הסוכן שלו כבר דיבר עם האבא', 'תדבר איתם לפני שהם מדברים איתו'],
  yc_stagnant: ['{boy} משחק, אבל לא זז', 'דקות בלי תחרות לא מלמדות. אולי משחק יותר גבוה', 'או שזה התקרה שלו. אני לא יודע'],
  yc_new_arrival: ['{boy} הגיע לאימון הראשון', 'ילד עם תיק גדול מדי וכדור ביד. כבר אוהב אותו', 'נעשה ממנו משהו, אתה תראה'],
  yc_turning_18: ['{boy} בן 18 בקרוב', 'אחרי זה הוא או בוגר או בחוץ. אין באמצע', 'תבדוק את המספרים שלו, לא רק את הלב'],
};

/** the day he goes up, in the two voices of the neighbourhood and the professionals */
export function promotionText(boy: string, club: string, tier: number): string {
  const lines = tier <= 3
    ? ['הוא בן 18 היום. התיק על הכתף והדלת פתוחה.', `מהיום הוא לא נער. הוא שחקן של ${club}.`, 'תן לו משחק ותראה אם הוא עומד בזה.']
    : ['18 היום. החוזה הראשון מחכה, והחדר ממתין.', `מהיום הוא בסגל הבוגרים של ${club}.`, 'הדקות שקיבל פה הביאו אותו עד כאן. עכשיו זה אחרת.'];
  return `${boy} עולה לבוגרים. ${lines.join(' ')}`;
}
