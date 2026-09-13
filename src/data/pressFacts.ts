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
      { label: 'הוא לא הולך לשום מקום', effect: { morale: +4, prestige: +2 }, reply: 'הודעה ברורה. השחקן שמע, והסוכן שלו גם.' },
      { label: 'לכל שחקן יש מחיר, גם לו', effect: { prestige: +2, morale: -3 }, reply: 'כנות שעולה. בחדר ההלבשה זה נשמע אחרת.' },
    ],
  })],

  brace: [(_c, f) => ({
    id: 'brace',
    tone: 'serious',
    text: `שני שערים ל${f.who}. מה הוא עשה הערב שלא עשה בשבועות האחרונים?`,
    answers: [
      { label: 'עבד על זה כל השבוע באימונים', effect: { morale: +3 }, reply: 'קרדיט לעבודה. השחקנים אוהבים לשמוע את זה.' },
      { label: 'כישרון. פשוט כישרון', effect: { prestige: +2, morale: +1 }, reply: 'קצר וקולע. הכותרת כותבת את עצמה.' },
    ],
  }), (_c, f) => ({
    id: 'brace_supply',
    tone: 'serious',
    text: `שניים ל${f.who}. מי מכין לו את השערים האלה?`,
    answers: [
      { label: 'עשרה אנשים. הוא רק מסיים', effect: { morale: +4 }, reply: 'חלוקת קרדיט. החדר אהב, החלוץ קצת פחות.' },
      { label: 'הוא מכין לעצמו, זה מה שמיוחד בו', effect: { prestige: +2, morale: +1 }, reply: 'כותרת מוכנה. הוא ישמור אותה.' },
    ],
  })],

  red_card: [(_c, f) => ({
    id: 'red_card',
    tone: 'brutal',
    text: `${f.who} קיבל אדום בדקה ${f.minute} והשארתם עשרה. אתה מגבה אותו או שזאת חוסר משמעת?`,
    answers: [
      { label: 'הוא שלנו, נטפל בזה בפנים', effect: { morale: +4, prestige: -1 }, reply: 'הגנת עליו בפומבי. הקבוצה רשמה לעצמה.' },
      { label: 'אין לזה מקום, והוא ישלם על זה', effect: { prestige: +3, morale: -3 }, reply: 'קו ברור. חלק מהחדר לא אהב.' },
    ],
  }), (_c, f) => ({
    id: 'red_card_after',
    tone: 'serious',
    text: `מדקה ${f.minute}, בלי ${f.who}, שיחקתם בעשרה. מה שינית ברגע שהוא יצא?`,
    answers: [
      { label: 'כלום. עשרה משחקים אותו כדורגל', effect: { prestige: +2, morale: +2 }, reply: 'אמון בשיטה. מי שמבין הרים גבה.' },
      { label: 'סגרנו, ושיחקנו על מה שיש', effect: { prestige: +2 }, reply: 'פרקטי. הכתב קיבל תשובה מקצועית.' },
    ],
  })],

  their_red: [(_c, f) => ({
    id: 'their_red',
    tone: 'funny',
    text: `הם שיחקו בעשרה מדקה ${f.minute}. זה עדיין נחשב?`,
    answers: [
      { label: 'שיחקנו נגד מי שהיה על הדשא', effect: { prestige: +2 }, reply: 'תשובה שקטה. אף אחד לא מצא במה לתפוס אותך.' },
      { label: 'האדום שינה את המשחק, בלי להתחמק', effect: { morale: +2, prestige: +1 }, reply: 'הגינות. באולפן העריכו את זה.' },
    ],
  }), (_c, f) => ({
    id: 'their_red_use',
    tone: 'serious',
    text: `היריבה בעשרה מדקה ${f.minute}. ניצלתם את זה מספיק?`,
    answers: [
      { label: 'לא. נגד עשרה צריך לסגור מהר יותר', effect: { prestige: +2, morale: -1 }, reply: 'ביקורת עצמית בקול. השחקנים שמעו.' },
      { label: 'עשרה שנסגרים זה לפעמים יותר קשה', effect: { morale: +2 }, reply: 'אמת של מאמנים. הכתב הנהן.' },
    ],
  })],

  collapse: [(_c, f) => ({
    id: 'collapse',
    tone: 'brutal',
    text: `הובלתם ב${f.n} שערים ולא לקחתם את המשחק. איך קבוצה מאבדת ככה יתרון?`,
    answers: [
      { label: 'הפסקנו לשחק, וזה עליי', effect: { prestige: +3, morale: +2 }, reply: 'לקחת אחריות. זה מרגיע את החדר.' },
      { label: 'חוסר ניסיון, נלמד מזה', effect: { morale: +1 }, reply: 'תשובה בטוחה. גם משעממת.' },
    ],
  })],

  comeback: [() => ({
    id: 'comeback',
    tone: 'serious',
    text: `הייתם בפיגור והפכתם את זה. מה אמרת להם כשהיו מאחור?`,
    answers: [
      { label: 'שלא יפסיקו לשחק את מה שאימנו', effect: { morale: +4, prestige: +2 }, reply: 'תשובה של מאמן. השחקנים קראו את זה בבוקר.' },
      { label: 'צעקתי. לפעמים צריך', effect: { morale: +2, prestige: +1 }, reply: 'כנות. האוהדים אהבו את הסיפור.' },
    ],
  })],

  late_winner: [(_c, f) => ({
    id: 'late_winner',
    tone: 'serious',
    text: `שער ניצחון בדקה ${f.minute}. זה מזל, או שהקבוצה הזאת פשוט לא מוותרת?`,
    answers: [
      { label: 'הקבוצה הזאת לא מוותרת, נקודה', effect: { morale: +4, prestige: +2 }, reply: 'משפט לכותרת. היציע אימץ אותו.' },
      { label: 'גם מזל צריך, והפעם הוא היה שלנו', effect: { morale: +2 }, reply: 'ענווה מחויכת. עבר טוב.' },
    ],
  })],

  late_equaliser: [(_c, f) => ({
    id: 'late_equaliser',
    tone: 'serious',
    text: `שער שוויון בדקה ${f.minute}. נקודה שלקחתם או שתיים שאיבדתם?`,
    answers: [
      { label: 'נקודה שלקחנו בשיניים', effect: { morale: +3 }, reply: 'מסגור חיובי. החדר קנה אותו.' },
      { label: 'שתיים שאיבדנו, בואו לא נשקר', effect: { prestige: +2, morale: -2 }, reply: 'ישר וקשה. העיתונות אהבה, השחקנים פחות.' },
    ],
  })],

  late_concede: [(_c, f) => ({
    id: 'late_concede',
    tone: 'brutal',
    text: `ספגתם בדקה ${f.minute} ואיבדתם את זה בסוף. איפה הריכוז נגמר?`,
    answers: [
      { label: 'הריכוז עליי, זאת העבודה שלי', effect: { prestige: +3, morale: +2 }, reply: 'לקחת את זה עליך. מקצועי.' },
      { label: 'שחקנים צריכים לסגור משחק לבד', effect: { prestige: +1, morale: -3 }, reply: 'האצבע הופנתה פנימה. זה נרשם.' },
    ],
  })],

  penalty_miss: [(_c, f) => ({
    id: 'penalty_miss',
    tone: 'brutal',
    text: `${f.who} החמיץ פנדל בדקה ${f.minute}. מי בועט בפעם הבאה?`,
    answers: [
      { label: 'הוא בועט. גם בפעם הבאה', effect: { morale: +4, prestige: -1 }, reply: 'אמון פומבי. הוא לא ישכח את זה.' },
      { label: 'נחשוב על זה במהלך השבוע', effect: { prestige: +1, morale: -2 }, reply: 'התחמקות מנומסת. הבועט הבין.' },
    ],
  })],

  own_goal: [(_c, f) => ({
    id: 'own_goal',
    tone: 'brutal',
    text: `שער עצמי של ${f.who} בדקה ${f.minute}. איך מרימים שחקן אחרי ערב כזה?`,
    answers: [
      { label: 'זה קורה לכל מגן בעולם', effect: { morale: +4 }, reply: 'חיבוק פומבי. החדר ראה.' },
      { label: 'הוא מקצוען, הוא יסתדר עם זה', effect: { prestige: +1, morale: -1 }, reply: 'קר. נכון, אבל קר.' },
    ],
  })],

  keeper_hero: [(_c, f) => ({
    id: 'keeper_hero',
    tone: 'serious',
    text: `${f.who} החזיק אתכם בשער הערב. הוא מספר אחת שלך לשארית העונה?`,
    answers: [
      { label: 'הוא מספר אחת, אין ויכוח', effect: { morale: +3, prestige: +1 }, reply: 'החלטה ברורה. השוער יצא מהאולם מחייך.' },
      { label: 'כל אחד משחק לפי מה שהוא נותן', effect: { prestige: +2, morale: -1 }, reply: 'תחרות פתוחה. מסר שנשמע גם בספסל.' },
    ],
  })],

  star_rating: [(_c, f) => ({
    id: 'star_rating',
    tone: 'serious',
    text: `${f.who} היה הטוב במגרש הערב. איפה מצאת אותו?`,
    answers: [
      { label: 'הוא היה פה כל הזמן, רק חיכה', effect: { morale: +3, prestige: +1 }, reply: 'קרדיט לשחקן. יפה.' },
      { label: 'עבדנו עליו יחד, זה לא במקרה', effect: { prestige: +3 }, reply: 'לקחת חלק מהקרדיט. מקובל.' },
    ],
  }), (_c, f) => ({
    id: 'star_rating_agent',
    tone: 'funny',
    text: `${f.who} עם משחק כזה. הסוכן שלו כבר התקשר לדבר על החוזה?`,
    answers: [
      { label: 'שיתקשר. יש לי מה להגיד לו', effect: { prestige: +3, morale: -1 }, reply: 'קשוח. השחקן קרא בין השורות.' },
      { label: 'הוא יודע מה יש לו פה', effect: { morale: +3, prestige: +1 }, reply: 'חיבוק פומבי. השחקן ענה בלב בסטורי.' },
    ],
  })],

  toothless: [() => ({
    id: 'toothless',
    tone: 'brutal',
    text: `כמעט לא הגעתם לשער היריב. איפה ההתקפה הזאת?`,
    answers: [
      { label: 'לא מספיק טוב, נעבוד על זה', effect: { prestige: +2, morale: +1 }, reply: 'הודאה מדודה. הוגן.' },
      { label: 'היריבה סגרה טוב, זה כדורגל', effect: { morale: +1, prestige: -1 }, reply: 'תירוץ מנומס. לא כולם קנו.' },
    ],
  })],

  // the floor: a quiet night still had a best player in it, so there is always
  // something about THIS match to open with rather than about the table
  top_man: [(_c, f) => ({
    id: 'top_man',
    tone: 'funny',
    text: `לא בדיוק ערב לזכור. ${f.who} היה הכי טוב שלך, וגם הוא לא קרע את המגרש. מה חסר?`,
    answers: [
      { label: 'קצב. אנחנו משחקים לאט מדי', effect: { prestige: +2, morale: +1 }, reply: 'אבחנה מקצועית. מי שמבין הנהן.' },
      { label: 'כלום. ניקח את מה שיש ונמשיך', effect: { morale: +2, prestige: -1 }, reply: 'תשובה מגוננת. באולפן צחקו קצת.' },
    ],
  }), (_c, f) => ({
    id: 'top_man_carry',
    tone: 'serious',
    text: `${f.who} סחב אתכם הערב. כמה זמן אפשר לבנות עליו?`,
    answers: [
      { label: 'לא בונים על אחד. מבחוץ זה רק נראה ככה', effect: { morale: +3, prestige: +1 }, reply: 'הגנת על עשרה אחרים. הם שמעו.' },
      { label: 'כל עוד הוא סוחב, אני לא מתלונן', effect: { prestige: +2, morale: -1 }, reply: 'כנות. השחקן חייך, השאר פחות.' },
    ],
  }), (_c, f) => ({
    id: 'top_man_rest',
    tone: 'funny',
    text: `שוב ${f.who} הכי טוב שלכם. אתה נותן לו לנוח מתישהו?`,
    answers: [
      { label: 'הוא ינוח בקיץ', effect: { prestige: +2, morale: +1 }, reply: 'צחוק באולם. הוא כנראה לא ינוח בקיץ.' },
      { label: 'יש ספסל שרוצה את המקום שלו', effect: { morale: +2 }, reply: 'מסר לספסל. שמעו אותו טוב.' },
    ],
  })],

  clean_sheet: [() => ({
    id: 'clean_sheet',
    tone: 'serious',
    text: `שער נקי. ההגנה הזאת סוף סוף מסודרת?`,
    answers: [
      { label: 'ההגנה מתחילה מהחלוצים', effect: { morale: +3, prestige: +1 }, reply: 'משפט של מאמן. כולם רשמו.' },
      { label: 'מחזור אחד לא אומר כלום', effect: { prestige: +2 }, reply: 'רגליים על הקרקע.' },
    ],
  }), () => ({
    id: 'clean_sheet_why',
    tone: 'serious',
    text: `לא ספגתם. זה ההגנה, השוער, או שהיריבה פשוט לא ניסתה?`,
    answers: [
      { label: 'כל האחד עשר. ככה מגינים', effect: { morale: +3 }, reply: 'קרדיט לכולם. החדר אהב.' },
      { label: 'עבדנו על זה כל השבוע, זה לא מקרה', effect: { prestige: +3 }, reply: 'לקחת את הקרדיט למגרש האימונים. מקובל.' },
    ],
  })],

  /* ------------------------------------------- what only this game can ask */
  penalty_saved: [(_c, f) => ({
    id: 'penalty_saved',
    tone: 'serious',
    text: `פנדל של ${f.who} בדקה ${f.minute} לא נכנס. השוער ניחש, או שמישהו אמר לו לאן?`,
    answers: [
      { label: 'למדנו את הבועט. זו הכנה, לא ניחוש', effect: { prestige: +3, morale: +1 }, reply: 'עבודת צוות מקצועית. הכתב רשם.' },
      { label: 'זה כולו שלו. שוער עם אינסטינקט', effect: { morale: +3 }, reply: 'הקרדיט הלך לשוער. הוא יצא מהאולם גבוה.' },
    ],
  })],

  shape_worked: [(_c, f) => ({
    id: 'shape_worked',
    tone: 'serious',
    text: `עברת ל-${f.who} בהפסקה והמחצית השנייה נראתה אחרת לגמרי. מה ראית בחדר ההלבשה?`,
    answers: [
      { label: 'ראיתי שהם צריכים שינוי, לא צעקה', effect: { prestige: +3, morale: +2 }, reply: 'מאמן שקורא משחק. הכותרת של מחר.' },
      { label: 'השחקנים עשו את זה, לא המערך', effect: { morale: +4 }, reply: 'העברת את הקרדיט. החדר לא שכח.' },
    ],
  })],

  shape_failed: [(_c, f) => ({
    id: 'shape_failed',
    tone: 'brutal',
    text: `שינית ל-${f.who} בהפסקה וזה לא הזיז כלום. בדיעבד, טעות?`,
    answers: [
      { label: 'לא. ניסיתי, לפעמים זה לא עובד', effect: { prestige: +2, morale: +1 }, reply: 'עמדת מאחורי ההחלטה. מכבדים.' },
      { label: 'אולי. אני אסתכל על זה שוב', effect: { morale: +2, prestige: -1 }, reply: 'כנות. הכתב הופתע לשמוע אותה.' },
    ],
  })],

  legend_goal: [(_c, f) => ({
    id: 'legend_goal',
    tone: 'funny',
    text: `${f.who}, בן שלושים, ליגה ג׳, וכובש ככה. תסביר לי איך הוא עדיין פה`,
    answers: [
      { label: 'כי זה הבית שלו. תשאל אותו', effect: { morale: +3, prestige: +1 }, reply: 'תשובה של ראש העין. העיר אהבה.' },
      { label: 'כי אף אחד לא הסתכל מספיק טוב. אני הסתכלתי', effect: { prestige: +3 }, reply: 'לקחת קרדיט על מה שכולם פספסו. מגיע.' },
    ],
  })],
};

/** Which facts we actually have a question for. */
export function askableFacts(facts: MatchFact[]): MatchFact[] {
  return facts.filter(f => BY_FACT[f.kind]?.length);
}

/**
 * Halve what an answer moves.
 *
 * The meters were tuned when a press conference was one question. Asking two
 * without touching the numbers quietly doubled how far a week could swing the
 * mood and the standing, which showed up straight away as careers being sacked
 * that should not have been. Two questions should be two decisions, not twice
 * the consequence, so the match question carries half a question's weight and
 * the pair lands about where one used to. The scaled figures are the ones the
 * manager is shown, so the chips never promise more than they pay.
 */
function soften(q: PressQuestion): PressQuestion {
  const half = (v: number | undefined): number | undefined => {
    if (!v) return v;
    // never round a real effect away to nothing
    return Math.sign(v) * Math.max(1, Math.round(Math.abs(v) / 2));
  };
  return {
    ...q,
    answers: q.answers.map(a => ({
      ...a,
      effect: { morale: half(a.effect.morale), prestige: half(a.effect.prestige) },
    })),
  };
}

/**
 * The pair the manager faces. First the match, then the table, so a press
 * conference covers both the night he just had and the season he is having.
 * A match with nothing to say about it still gets its one wider question.
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
  return { outlet: wide.outlet, qs: [soften(fresh(pools(pick), c, rng, recent)), soften(wide.q)] };
}

/** The ids each fact can lead with, for the checks. */
export function factPool(kind: FactKind): string[] {
  const bare: PressContext = {
    result: 'win', isDerby: false, lowMorale: false, highPrestige: false,
    tablePos: 5, totalTeams: 10, star: '', rival: '', city: '',
  };
  return (BY_FACT[kind] ?? []).map(g => g(bare, { kind }).id);
}
