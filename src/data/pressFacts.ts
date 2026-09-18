/**
 * The question about the match itself.
 *
 * The old press room knew only the result, so it asked the same thing after
 * every defeat. These questions are built from what the reporter watched: the
 * sending off in the fortieth minute, the penalty put over the bar, the two
 * goal lead handed back. One of them opens the press conference whenever the
 * match gave him something to open with, and the wider question about the
 * table follows it.
 */

import type { PressContext, PressQuestion, Outlet } from './press.ts';
import { pickPressQuestion, fresh } from './press.ts';
import type { Rng } from '../engine/matchEngine.ts';
import type { FactKind, MatchFact } from './matchFacts.ts';

type FactQ = (c: PressContext, f: MatchFact) => PressQuestion;
type QGen = (c: PressContext) => PressQuestion;

const BY_FACT: Partial<Record<FactKind, FactQ[]>> = {
  hat_trick: [(_c, f) => ({
    id: 'hat_trick',
    tone: 'serious',
    text: `שלושה שערים ל${f.who} בערב אחד. הוא נשאר אצלך בקיץ או שכבר מצלצלים אליו?`,
    answers: [
      { label: 'אין סיכוי, הוא נשאר גם אם זה אומר שאני לא מקבל משכורת', effect: { morale: +3, prestige: +2, fans: +1 }, reply: 'נתת גב לשחקן ולאוהדים, האוהדים מעריכים אותך.' },
      { label: 'אני המאמן יש בעלים שמקבל החלטות', effect: { morale: -3, prestige: -1, fans: -3 }, reply: 'הודעה ברורה. השחקן שמע והסוכן שלו מתחיל לבדוק הצעות.' },
    ],
  })],

  brace: [(_c, f) => ({
    id: 'brace',
    tone: 'serious',
    text: `שני שערים ל${f.who}. מה הוא עשה הערב שלא עשה בשבועות האחרונים?`,
    answers: [
      { label: 'סוף סוף הקשיב לי', effect: { morale: -2, prestige: +3 }, reply: 'קרדיט למאמן. השחקן חשב שתיתן לו קרדיט גם.' },
      { label: 'עבד קשה כל השבוע באימונים, מגיע לו', effect: { morale: +5 }, reply: 'קרדיט לעבודה. השחקנים אוהבים לשמוע את זה.' },
    ],
  }), (_c, f) => ({
    id: 'brace_supply',
    tone: 'serious',
    text: `שניים ל${f.who}. מי מכין לו את השערים האלה?`,
    answers: [
      { label: 'הוא מכין לעצמו, זה מה שמיוחד בו', effect: { morale: +1, fans: +1 }, reply: 'השחקן מעריך את התשובה, שאר הקבוצה פחות.' },
      { label: 'עשרה שחקנים. הוא רק מסיים', effect: { morale: +4, prestige: +1 }, reply: 'חלוקת קרדיט. חדר ההלבשה אהב, החלוץ קצת פחות.' },
    ],
  })],

  red_card: [(_c, f) => ({
    id: 'red_card',
    tone: 'brutal',
    text: `${f.who} קיבל אדום בדקה ${f.minute} ונשארתם עשרה. אתה מגבה אותו או שזאת חוסר משמעת?`,
    answers: [
      { label: 'אם אתה מקבל אדום כזה, הקשר שלך לכדורגל מקרי בהחלט', effect: { morale: -3, prestige: +1, fans: +1 }, reply: 'קו ברור. חלק מהשחקנים לא אהבו, האוהדים דווקא כן.' },
      { label: 'הוא שלנו, נטפל בזה בפנים', effect: { morale: +4, prestige: -1 }, reply: 'הגנת עליו בפומבי. הקבוצה רשמה לעצמה.' },
    ],
  }), (_c, f) => ({
    id: 'red_card_after',
    tone: 'serious',
    text: `מדקה ${f.minute}, בלי ${f.who}, שיחקתם בעשרה. מה שינית ברגע שהוא יצא?`,
    answers: [
      { label: 'כלום. עשרה משחקים אותו כדורגל', effect: { morale: +2, prestige: +2 }, reply: 'אמון בשיטה. מי שמבין הרים גבה.' },
      { label: 'סגרנו, ושיחקנו על מה שיש', effect: { prestige: +2 }, reply: 'פרקטי. הכתב קיבל תשובה מקצועית.' },
    ],
  })],

  their_red: [(_c, f) => ({
    id: 'their_red',
    tone: 'funny',
    text: `הם שיחקו בעשרה שחקנים מדקה ${f.minute}. זה עדיין נחשב?`,
    answers: [
      { label: 'נחשב, ואפילו יותר. תבדוק בתקנון', effect: { morale: +1, prestige: -1, fans: +1 }, reply: 'עוקצני. היריבה לא צחקה.' },
      { label: 'האדום שינה את המשחק, בלי להתחמק', effect: { morale: +2, prestige: +1 }, reply: 'הגינות. באולפן העריכו את זה.' },
    ],
  }), (_c, f) => ({
    id: 'their_red_use',
    tone: 'serious',
    text: `היריבה בעשרה שחקנים מדקה ${f.minute}. ניצלתם את זה מספיק?`,
    answers: [
      { label: 'עשרה שנסגרים זה לפעמים יותר קשה, בונקר לחלוטין', effect: { morale: +2, fans: -1 }, reply: 'אמת של מאמנים. היציע שמע תירוץ.' },
      { label: 'לא. נגד עשרה שחקנים צריך לנצח', effect: { morale: -1, prestige: +2, fans: +1 }, reply: 'ביקורת עצמית בקול. השחקנים שמעו.' },
    ],
  })],

  collapse: [(_c, f) => ({
    id: 'collapse',
    tone: 'brutal',
    text: `הובלתם ב${f.n} שערים ולא לקחתם את המשחק. איך קבוצה מאבדת ככה יתרון?`,
    answers: [
      { label: 'השחקנים חשבו שהם בטוחים בניצחון, מסתבר שלא.', effect: { morale: +1, prestige: -1, fans: -1 }, reply: 'תשובה בטוחה. גם משעממת. היציע שמע תירוץ.' },
      { label: 'הפסקנו לשחק, וזה עליי', effect: { morale: +2, prestige: +3, fans: +1 }, reply: 'לקחת אחריות. זה מרגיע את חדר ההלבשה.' },
    ],
  })],

  comeback: [() => ({
    id: 'comeback',
    tone: 'serious',
    text: `הייתם בפיגור והפכתם את זה. מה אמרת להם כשהיו מאחור?`,
    answers: [
      { label: 'צעקתי עליהם. מה שנאמר שם לא מתאים לשידור', effect: { morale: +2, prestige: +1, fans: +2 }, reply: 'כנות. האוהדים אהבו את הסיפור.' },
      { label: 'שלא יפסיקו להאמין. כדורגל זה מומנטום', effect: { morale: +4, prestige: +2, fans: +1 }, reply: 'ואחר כך: תמשיכו לעבוד קשה. השחקנים קראו את זה בבוקר.' },
    ],
  })],

  late_winner: [(_c, f) => ({
    id: 'late_winner',
    tone: 'serious',
    text: `שער ניצחון בדקה ${f.minute}. זה מזל, או שהקבוצה הזאת פשוט לא מוותרת?`,
    answers: [
      { label: 'מזל זה הכל בחיים, גם בקזינו', effect: { morale: +2 }, reply: 'האולם צחק, הבעלים לא הבין את הבדיחה.' },
      { label: 'הקבוצה הזאת לא מוותרת, נקודה. תקראו לנו הפייטרים', effect: { morale: +4, prestige: +2, fans: +2 }, reply: 'משפט לכותרת. היציע אימץ אותו.' },
    ],
  })],

  late_equaliser: [(_c, f) => ({
    id: 'late_equaliser',
    tone: 'serious',
    text: `שער שוויון בדקה ${f.minute}. נקודה שלקחתם או שתיים שאיבדתם?`,
    answers: [
      { label: 'שתיים שאיבדנו, בואו לא נשקר', effect: { morale: -2, prestige: +2, fans: +1 }, reply: 'ישר וקשה. העיתונות אהבה, השחקנים פחות.' },
      { label: 'נקודה שלקחנו בשיניים', effect: { morale: +3 }, reply: 'מסגור חיובי. החדר קנה אותו.' },
    ],
  })],

  late_concede: [(_c, f) => ({
    id: 'late_concede',
    tone: 'brutal',
    text: `ספגתם בדקה ${f.minute} ואיבדתם את זה בסוף. איפה הריכוז נגמר?`,
    answers: [
      { label: 'צעקתי להם לסגור את המשחק, לא הקשיבו', effect: { morale: -3, prestige: +1 }, reply: 'אצבע מאשימה על השחקנים. זה נרשם.' },
      { label: 'הריכוז עליי, זאת העבודה שלי', effect: { morale: +2, prestige: -2 }, reply: 'לקחת את זה עליך. מקצועי.' },
    ],
  })],

  penalty_miss: [(_c, f) => ({
    id: 'penalty_miss',
    tone: 'brutal',
    text: `${f.who} החמיץ פנדל בדקה ${f.minute}. מי בועט בפעם הבאה?`,
    answers: [
      { label: 'הכלב שלי אם צריך, רק לא הוא.', effect: { morale: -3, prestige: -2, fans: +2 }, reply: 'צחוק באולם. השחקנים לא אהבו את הבדיחה.' },
      { label: 'הוא בועט, יש לו גיבוי ממני', effect: { morale: +4 }, reply: 'אמון פומבי. הוא לא ישכח את זה.' },
    ],
  })],

  own_goal: [(_c, f) => ({
    id: 'own_goal',
    tone: 'brutal',
    text: `שער עצמי של ${f.who} בדקה ${f.minute}. איך מרימים שחקן אחרי ערב כזה?`,
    answers: [
      { label: 'בדקתי איתו אם קיבל כסף על השער הזה מהיריבה, שער מוזר', effect: { morale: -1, prestige: -1 }, reply: 'כולם צחקו, השחקן נפגע.' },
      { label: 'זה קורה לכל מגן בעולם', effect: { morale: +4, fans: +1 }, reply: 'חיבוק פומבי. חדר ההלבשה שמע גם.' },
    ],
  })],

  keeper_hero: [(_c, f) => ({
    id: 'keeper_hero',
    tone: 'serious',
    text: `${f.who} החזיק אתכם בשער הערב. הוא מספר אחת שלך לשארית העונה?`,
    answers: [
      { label: 'כל אחד משחק לפי מה שהוא נותן. גם הוא', effect: { morale: -1, prestige: +2 }, reply: 'תחרות פתוחה. מסר שנשמע גם בספסל.' },
      { label: 'הוא מספר אחת, אין ויכוח', effect: { morale: +3, prestige: +1, fans: +1 }, reply: 'החלטה ברורה. השוער יצא מהאולם מחייך.' },
    ],
  })],

  star_rating: [(_c, f) => ({
    id: 'star_rating',
    tone: 'serious',
    text: `${f.who} היה הטוב במגרש הערב. איפה מצאת אותו?`,
    answers: [
      { label: 'היה קשה להביא אותו, אבל מאמן כמוני מוציא מכל אחד את המקסימום', effect: { prestige: +3 }, reply: 'לקחת חלק מהקרדיט. מקובל.' },
      { label: 'הוא עובד קשה, אין ספק שימשיך להשתפר', effect: { morale: +3, prestige: +1, fans: +1 }, reply: 'קרדיט לשחקן. יפה.' },
    ],
  }), (_c, f) => ({
    id: 'star_rating_agent',
    tone: 'funny',
    text: `${f.who} עם משחק כזה. הסוכן שלו כבר התקשר לדבר על החוזה?`,
    answers: [
      { label: 'אם יש לו אומץ שיתקשר, כל עוד יש לו חוזה לא לפנות אליי', effect: { morale: -1, prestige: +3, fans: +1 }, reply: 'קשוח. השחקנים יחשבו אם לחתום על חוזה ארוך.' },
      { label: 'יש מי שמקבל החלטות על החוזים, הבעלים.', effect: { morale: +1 }, reply: 'הבעלים אהב את התשובה, הסוכן הבין למי לפנות.' },
    ],
  })],

  toothless: [() => ({
    id: 'toothless',
    tone: 'brutal',
    text: `כמעט לא הגעתם לשער היריב. איפה ההתקפה הזאת?`,
    answers: [
      { label: 'היריבה סגרה טוב, זה כדורגל', effect: { morale: +1, prestige: -1, fans: -1 }, reply: 'תירוץ מנומס. לא כולם אהבו את זה.' },
      { label: 'לא מספיק טוב, נעבוד על זה', effect: { morale: +1, prestige: +2 }, reply: 'תשובה ברורה. הוגן.' },
    ],
  })],

  // the floor: a quiet night still had a best player in it, so there is always
  // something about THIS match to open with rather than about the table
  top_man: [(_c, f) => ({
    id: 'top_man',
    tone: 'funny',
    text: `לא בדיוק ערב לזכור. ${f.who} היה הכי טוב שלך, וגם הוא לא קרע את המגרש. מה חסר?`,
    answers: [
      { label: 'משחק חלש מאוד, הוא קיבל צעקות שאבא שלו ביציע שמע', effect: { morale: +2, prestige: +2 }, reply: 'תשובה חדה, חדר ההלבשה מבין שצריך להרים את הרמה.' },
      { label: 'קצב. אנחנו משחקים לאט מדי, נמשיך לעבוד קשה', effect: { morale: +1, prestige: +1 }, reply: 'אבחנה מקצועית. מי שמבין הנהן.' },
    ],
  }), (_c, f) => ({
    id: 'top_man_carry',
    tone: 'serious',
    text: `${f.who} סחב אתכם הערב. כמה זמן אפשר לבנות עליו?`,
    answers: [
      { label: 'כל עוד הוא סוחב, אני לא מתלונן', effect: { morale: -1 }, reply: 'כנות. השחקן חייך, השאר פחות.' },
      { label: 'לא בונים על אחד. מבחוץ זה רק נראה ככה', effect: { morale: +3, prestige: +1 }, reply: 'הגנת על עשרה אחרים. הם שמעו.' },
    ],
  }), (_c, f) => ({
    id: 'top_man_rest',
    tone: 'funny',
    text: `שוב ${f.who} הכי טוב שלכם. אתה נותן לו לנוח מתישהו?`,
    answers: [
      { label: '90 דקות כל משחק, שמעת אותי? לא מוציא אותו בחיים.', effect: { morale: -1, prestige: +2, fans: +1 }, reply: 'צחוק באולם. הוא כנראה לא ינוח בחיים.' },
      { label: 'יש שחקנים בספסל שרוצים את המקום שלו, אולי יוכיחו שאפשר להחליף', effect: { morale: +2 }, reply: 'מסר לספסל. שמעו אותו טוב.' },
    ],
  })],

  clean_sheet: [() => ({
    id: 'clean_sheet',
    tone: 'serious',
    text: `שער נקי. ההגנה הזאת סוף סוף מסודרת?`,
    answers: [
      { label: 'ההגנה מתחילה מהחלוצים', effect: { morale: +3, prestige: +3, fans: +1 }, reply: 'משפט של מאמן. כולם רשמו.' },
      { label: 'מחזור אחד לא אומר כלום', effect: { morale: -1, prestige: +2 }, reply: 'רגליים על הקרקע.' },
    ],
  }), () => ({
    id: 'clean_sheet_why',
    tone: 'serious',
    text: `לא ספגתם. זה ההגנה, השוער, או שהיריבה פשוט לא ניסתה?`,
    answers: [
      { label: 'עבדנו על זה כל השבוע, זה לא מקרה', effect: { prestige: +3 }, reply: 'לקחת את הקרדיט למגרש האימונים. מקובל.' },
      { label: 'כל האחד עשר. ככה מגינים', effect: { morale: +3 }, reply: 'קרדיט לכולם. השחקנים אהבו.' },
    ],
  })],

  /* ------------------------------------------- what only this game can ask */
  penalty_saved: [(_c, f) => ({
    id: 'penalty_saved',
    tone: 'serious',
    text: `פנדל של ${f.who} בדקה ${f.minute} לא נכנס. השוער ניחש, או שמישהו אמר לו לאן?`,
    answers: [
      { label: 'למדנו את הבועט. זו הכנה, לא ניחוש', effect: { morale: +1, prestige: +3 }, reply: 'עבודת צוות מקצועית. הבעלים מרוצה.' },
      { label: 'זה כולו שלו. שוער עם אינסטינקט', effect: { morale: +3, fans: +1 }, reply: 'הקרדיט הלך לשוער. הוא יצא מהאולם מבסוט.' },
    ],
  })],

  shape_worked: [(_c, f) => ({
    id: 'shape_worked',
    tone: 'serious',
    text: `עברת ל-${f.who} בהפסקה והמחצית השנייה נראתה אחרת לגמרי. מה ראית בחדר ההלבשה?`,
    answers: [
      { label: 'ראיתי שהם צריכים שינוי, לא צעקה', effect: { morale: +2, prestige: +3 }, reply: 'מאמן שקורא משחק. הכותרת של מחר.' },
      { label: 'השחקנים עשו את זה, לא המערך', effect: { morale: +4 }, reply: 'העברת את הקרדיט. השחקנים מעריכים אותך.' },
    ],
  })],

  shape_failed: [(_c, f) => ({
    id: 'shape_failed',
    tone: 'brutal',
    text: `שינית ל-${f.who} בהפסקה וזה לא הזיז כלום. בדיעבד, טעות?`,
    answers: [
      { label: 'לא. ניסיתי, לפעמים זה לא עובד', effect: { morale: +1, prestige: +2 }, reply: 'עמדת מאחורי ההחלטה. מכבדים.' },
      { label: 'אולי. אני אסתכל על זה שוב', effect: { morale: +2, prestige: -1 }, reply: 'כנות. הכתב הופתע לשמוע אותה.' },
    ],
  })],

  ex_scored: [(_c, f) => ({
    id: 'ex_scored',
    tone: 'brutal',
    text: `${f.who}, שמכרת בחלון, כבש נגדכם בדקה ${f.minute}. מתחרט?`,
    answers: [
      { label: 'איזה קללות הוא קיבל בחדר ההלבשה, העיקר אצלנו החטיא מול שער ריק', effect: { prestige: -2, fans: -1 }, reply: 'כולם ראו שאתה עצבני על זה, כנראה אתה מתחרט.' },
      { label: 'לא. הוא היה צריך ללכת, ואני שמח בשבילו', effect: { morale: +1, prestige: +3, fans: +1 }, reply: 'לקחת אחריות. גם הוא קרא את זה.' },
    ],
  }), (_c, f) => ({
    id: 'ex_scored_room',
    tone: 'funny',
    text: `${f.who} כבש, ולא חגג. אתה יודע מה זה אומר?`,
    answers: [
      { label: 'הוא נמכר בגלל הכסף, אנחנו עד היום בקשר', effect: { prestige: +3, fans: -1 }, reply: 'עסקים. המנכ״ל הנהן מהשורה השנייה.' },
      { label: 'הוא בן אדם לפני שהוא שחקן', effect: { morale: +3, prestige: +1, fans: +2 }, reply: 'חיוך באולם. היציע אהב את זה.' },
    ],
  })],

  legend_goal: [(_c, f) => ({
    id: 'legend_goal',
    tone: 'funny',
    text: `${f.who}, בן שלושים, ליגה ג׳, וכובש ככה. תסביר לי איך הוא עדיין פה`,
    answers: [
      { label: 'כשיש לך מאמן כמוני אי אפשר ללכת לשום מקום, אני איתו 24/7', effect: { prestige: +3 }, reply: 'לקחת קרדיט על מה העבודה איתו. נשמע שאתה איתו כל הזמן.' },
      { label: 'כי זה הבית שלו. תשאל אותו', effect: { morale: +3, prestige: +1, fans: +3 }, reply: 'תשובה של ראש העין. העיר אהבה.' },
    ],
  })],
};

/** Which facts we actually have a question for. */
export function askableFacts(facts: MatchFact[]): MatchFact[] {
  return facts.filter(f => BY_FACT[f.kind]?.length);
}

/**
 * The pair the manager faces. First the match, then the table, so a press
 * conference covers both the night he just had and the season he is having.
 * A match with nothing to say about it still gets its one wider question.
 *
 * The match question used to be halved on the way out, because two questions
 * at the old numbers doubled what a week could swing. The numbers are now
 * Itzik's, written per line with the pair in mind and with a cost on most of
 * the tempting ones, so a line pays exactly what its card says.
 */
export function pickPressQuestions(
  c: PressContext, rng: Rng, facts: MatchFact[] = [], recent: string[] = [],
): { outlet: Outlet; qs: PressQuestion[] } {
  const wide = pickPressQuestion(c, rng, recent);
  const usable = askableFacts(facts);
  if (!usable.length) return { outlet: wide.outlet, qs: [wide.q] };

  // the biggest story leads, but not invariably the very same one, so two
  // similar nights do not produce the identical press conference. And when
  // everything we have on the lead story was asked lately, a smaller story
  // with something fresh to ask beats hearing the big one again
  const pools = (f: MatchFact): QGen[] => BY_FACT[f.kind]!.map(g => cc => g(cc, f));
  const unheard = (f: MatchFact) => pools(f).some(g => !recent.includes(g(c).id));
  let pick = usable[rng() > 0.72 && usable.length > 1 ? 1 : 0];
  if (!unheard(pick)) pick = usable.find(unheard) ?? pick;
  return { outlet: wide.outlet, qs: [fresh(pools(pick), c, rng, recent), wide.q] };
}

const BARE: PressContext = {
  result: 'win', isDerby: false, lowMorale: false, highPrestige: false,
  tablePos: 5, totalTeams: 10, star: '', rival: '', city: '',
};

/** The ids each fact can lead with, for the checks. */
export function factPool(kind: FactKind): string[] {
  return (BY_FACT[kind] ?? []).map(g => g(BARE, { kind }).id);
}

/** Every match question there is, filled with a bare fact, for the checks. */
export function everyFactQuestion(c: PressContext = BARE): PressQuestion[] {
  return (Object.keys(BY_FACT) as FactKind[]).flatMap(kind =>
    BY_FACT[kind]!.map(g => g(c, { kind, who: 'x', minute: 1, n: 1 } as MatchFact)));
}
