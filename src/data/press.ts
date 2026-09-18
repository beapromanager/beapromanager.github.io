/**
 * Post match press conference. A reporter from an Israeli sports outlet asks
 * one question, chosen to fit the match you just played and your standing.
 * Your answer nudges morale and prestige, so the media game is part of the loop.
 *
 * Outlets are invented so no real brand is used, but they read like the scene:
 * ספורט WOW, ספורט 555, ספורט ישראל, Yספורט, Nספורט.
 */

import type { Rng } from '../engine/matchEngine.ts';

export const OUTLETS = ['ספורט WOW', 'ספורט 555', 'ספורט ישראל', 'Yספורט', 'Nספורט'] as const;
export type Outlet = typeof OUTLETS[number];

export type PressTone = 'funny' | 'serious' | 'brutal';

/** The situation after a match, used to pick a fitting question. */
export interface PressContext {
  result: 'big_win' | 'win' | 'draw' | 'loss' | 'thrashing';   // thrashing = heavy loss
  isDerby: boolean;
  lowMorale: boolean;
  highPrestige: boolean;
  tablePos: number;      // 1 = top
  totalTeams: number;
  star: string;          // your best player's family name
  rival: string;         // opponent short name
  city: string;          // the club's home town, for the local press angle
  /* what the terrace saw, for its own questions */
  isHome: boolean;
  fans: number;          // the fans meter
  lossRun: number;       // defeats in a row, tonight's included
  gate: number;          // how full the ground was, 0..1
  justUp: boolean;       // the first rounds after a promotion, when the ticket costs more
}

export interface PressAnswer {
  label: string;
  /** what the line does to the dressing room, to his standing, and to the terrace */
  effect: { morale?: number; prestige?: number; fans?: number };
  reply: string;   // the reporter's or public reaction after you answer
}

export interface PressQuestion {
  /** stable name of the template, remembered so the same question is not asked again soon */
  id: string;
  tone: PressTone;
  text: string;
  answers: PressAnswer[];
}

export type QGen = (c: PressContext) => PressQuestion;

/* Each generator returns a question already filled with the live context. */

const BY_RESULT: Record<PressContext['result'], QGen[]> = {
  big_win: [
    c => ({
      id: 'big_win_real',
      tone: 'serious',
      text: `ניצחון גדול. ${c.star} היה בלתי ניתן לעצירה. זו הקבוצה האמיתית או שהיריבה פשוט הייתה חלשה?`,
      answers: [
        { label: 'תתרגלו, זה רק הפרומו! באנו לשבור את הליגה', effect: { morale: +1, prestige: +1, fans: +2 }, reply: 'איזה ביטחון בקבוצה, מרגיש קצת שחצני ויהיר. נראה בסוף העונה.' },
        { label: 'היריבה הייתה חלשה, ואנחנו עוד לא טובים מספיק', effect: { morale: -1, prestige: +2 }, reply: 'כנות זה דבר חשוב, לא סיפקת לנו משהו חדש.' },
      ],
    }),
    c => ({
      id: 'big_win_raise',
      tone: 'funny',
      text: `אחרי הביצוע הזה, מתי אתה מבקש העלאה מהבעלים?`,
      answers: [
        { label: 'מחר על הבוקר, מקווה שהוא יענה לי הקמצן הזה', effect: { morale: +3, prestige: -2, fans: +1 }, reply: 'צחוק באולם. קטע ענק לטיקטוק. הבעלים לקח רציני.' },
        { label: 'קודם שנעלה ליגה, אחר כך נדבר על כסף', effect: { prestige: +2 }, reply: 'תשובה מקצועית, קצת משעממת.' },
      ],
    }),
    c => ({
      id: 'big_win_message',
      tone: 'serious',
      text: `תוצאה כזאת מול ${c.rival} שולחת מסר לכל הליגה, ללא ספק. לא?`,
      answers: [
        { label: 'כן. שיתחילו לפחד! אנחנו פה', effect: { morale: -1, prestige: +2, fans: +3 }, reply: 'שורה שתישאר. גם אצל היריבות הבאות.' },
        { label: 'המסר היחיד הוא לשחקנים שלי: ממשיכים בעבודה קשה', effect: { morale: +3 }, reply: 'מסר לחדר ההלבשה דרך המיקרופון. יגיע ליעד.' },
      ],
    }),
  ],
  win: [
    c => ({
      id: 'win_control',
      tone: 'serious',
      text: `שלוש נקודות חשובות. הרגשת שהקבוצה בשליטה, או שזה היה יותר קרוב ממה שנראה?`,
      answers: [
        { label: 'שליטה מהדקה הראשונה. יכולנו לשחק בעיניים עצומות', effect: { morale: -1, prestige: +3, fans: +1 }, reply: 'ביטחון. היריבה גזרה את הכותרת ותלתה בחדר ההלבשה שלה. מחכה למשחק הבא' },
        { label: 'היה קרוב ולקחנו. ככה מנצחים משחקים כאלה', effect: { morale: +3 }, reply: 'הערכת את השחקנים. חדר ההלבשה מרוצה מהתשובה.' },
      ],
    }),
    c => ({
      id: 'win_quiet',
      tone: 'funny',
      text: `ניצחתם, והיציע יצא בשקט. איפה החגיגה?`,
      answers: [
        { label: 'היציע צריך לחגוג? שיחגוג. אני מאמן לא ברמן', effect: { morale: +2, prestige: -1, fans: -5 }, reply: 'השחקנים צחקו בחדר ההלבשה. היציע קרא את זה בבוקר ולא צחק.' },
        { label: 'אני מבין אותם. ניצחון כזה לא מספיק לי גם', effect: { morale: -1, prestige: +1, fans: +2 }, reply: 'רעב. היציע הרגיש שמישהו מדבר בשמו.' },
      ],
    }),
    c => ({
      id: 'win_habit',
      tone: 'serious',
      text: `מתחילים להתרגל לנצח אצלכם. אתה לא מפחד שזה משעמם?`,
      answers: [
        { label: 'משעמם? תגיד את זה ליריבות שמקבלות בראש', effect: { morale: +1, prestige: +1, fans: +3 }, reply: 'ביטחון. האוהדים אהבו את הגישה.' },
        { label: 'מי שמשתעמם אצלי יושב בספסל', effect: { morale: -2, prestige: +2 }, reply: 'מסר לחדר ההלבשה, לא לעיתונות. חלק מהספסל נלחץ.' },
      ],
    }),
    c => ({
      id: 'win_rival',
      tone: 'serious',
      text: `${c.rival} קבוצה חזקה היא לא באה לפה להפסיד. מה הכריע בסוף?`,
      answers: [
        { label: 'השופט. הפעם הוא שרק לטובתנו', effect: { prestige: -3, fans: +1 }, reply: 'צחוק באולם, ותלונה של איגוד השופטים תוגש למועדון.' },
        { label: 'סבלנות. חיכינו לרגע שלנו. ידענו שהם ייצאו קדימה', effect: { morale: +2, prestige: +2 }, reply: 'ניתוח מדויק. מי שמבין הנהן.' },
      ],
    }),
  ],
  draw: [
    c => ({
      id: 'draw_wasting',
      tone: 'brutal',
      text: `עוד תיקו. בקצב הזה לא עולים ליגה. אתה לא מרגיש שאתה מבזבז עונה?`,
      answers: [
        { label: 'מבזבז? תראה מה השופט עשה לנו בדקה 80', effect: { morale: +1, prestige: -3, fans: +1 }, reply: 'האוהדים הנהנו. איגוד השופטים פחות.' },
        { label: 'צודק. עוד תיקו כזה ואני שולח שחקנים הביתה', effect: { morale: -3, prestige: +2, fans: +1 }, reply: 'איום פומבי. השחקנים קראו את זה בבוקר, פעמיים.' },
      ],
    }),
    c => ({
      id: 'draw_point',
      tone: 'serious',
      text: `נקודה בחוץ. אתה מרוצה או מאוכזב?`,
      answers: [
        { label: 'הבאתי אוטובוס, לקחתי נקודה, חוזר הביתה', effect: { morale: +2, prestige: -2, fans: -1 }, reply: 'כנות משעשעת. היציע רצה לשמוע על ניצחון.' },
        { label: 'באנו לנצח, וזה מאכזב', effect: { morale: -1, prestige: +2, fans: +1 }, reply: 'שידרת רעב. היציע אוהב את זה.' },
      ],
    }),
    c => ({
      id: 'draw_who',
      tone: 'funny',
      text: `תיקו מול ${c.rival}. מי משתי הקבוצות יצאה מפה מרוצה יותר?`,
      answers: [
        { label: 'הם. והם יזכרו את זה כשנפגוש אותם במחזור הבא', effect: { morale: -1, prestige: +3, fans: +1 }, reply: `איום מנומס. אצל ${c.rival} תלו את זה על הקיר.` },
        { label: 'אף אחד. ואני בסדר עם זה', effect: { morale: +1 }, reply: 'תשובה שקטה. הכתב עבר הלאה.' },
      ],
    }),
  ],
  loss: [
    c => ({
      id: 'loss_fans',
      tone: 'brutal',
      text: `הפסד שכואב. יש אוהדים שכבר קוראים להחליף אותך. יש לך מה להגיד להם?`,
      answers: [
        { label: 'שיבואו לאימון ביום שני ויראו מי עובד פה', effect: { morale: -2, prestige: +2, fans: -2 }, reply: 'הזמנה עם עוקץ. ביום שני האוהדים רוצים להגיע לאימון.' },
        { label: 'הם צודקים. אני כועס יותר', effect: { morale: -1, prestige: -1, fans: +2 }, reply: 'הזדהית עם הכאב שלהם. היציע התרכך.' },
      ],
    }),
    c => ({
      id: 'loss_broke',
      tone: 'serious',
      text: `איפה המשחק נגמר עבורכם לדעתך?`,
      answers: [
        { label: 'בדקה שהשופט החליט למי הוא שורק, פעם באה שישים חולצה שלהם', effect: { morale: +1, prestige: -4, fans: +1 }, reply: 'החדר אהב שמישהו אמר את זה. איגוד השופטים רוצה להגיש קנס.' },
        { label: 'ההרכב שלי, האחריות שלי', effect: { morale: +3, prestige: +2 }, reply: 'הגנת על השחקנים. הם יזכרו את זה.' },
      ],
    }),
    c => ({
      id: 'loss_fair',
      tone: 'brutal',
      text: `אוהדי ${c.rival} יצאו מפה בטוחים שהיו הטובים יותר. הם צודקים?`,
      answers: [
        { label: 'אתה רציני? הם גנבו אותנו היום. היינו טובים בפער מהם.', effect: { morale: +1, prestige: +1, fans: +1 }, reply: 'לא נתת להם קרדיט. חדר ההלבשה שמע שנתת להם גב.' },
        { label: 'היום כן. ואני לא מתבייש להגיד', effect: { morale: -1, prestige: +2, fans: -1 }, reply: 'הגינות. גם היריבה כיבדה את זה. היציע פחות.' },
      ],
    }),
    c => ({
      id: 'loss_lesson',
      tone: 'serious',
      text: `מה לוקחים מהערב הזה לשבוע הבא?`,
      answers: [
        { label: 'את הפיצה אחרי המשחק, מה אפשר לקחת מהערב הזה?', effect: { morale: +2, prestige: -2, fans: +1 }, reply: 'כולם צוחקים, הבעלים חושב שזה לא הזמן לצחוק.' },
        { label: 'שמשחק לא נגמר בשריקת הפתיחה', effect: { morale: +1, prestige: +1 }, reply: 'מסר לשחקנים דרך המיקרופון. הם קלטו.' },
      ],
    }),
  ],
  thrashing: [
    c => ({
      id: 'thrash_shame',
      tone: 'brutal',
      text: `ספגתם תבוסה היום. איך בכלל מסבירים משחק כזה לאוהדים שנסעו עד לכאן?`,
      answers: [
        { label: 'יום כזה לא יחזור, אני מבטיח להם. גם אם זה אומר שאנחנו מתאמנים פעמיים ביום', effect: { morale: +2, prestige: -2, fans: +2 }, reply: 'הבטחה גדולה. עכשיו תצטרך לעמוד בה.' },
        { label: 'הביזיון עליי, לא על השחקנים', effect: { morale: +3, prestige: -1 }, reply: 'לקחת אחריות על הביזיון. מהלך של מנהיג אבל פחות מקצועי.' },
      ],
    }),
    c => ({
      id: 'thrash_home',
      tone: 'funny',
      text: `בתוצאה כזאת, בא לך בכלל לענות לי או שאתה מעדיף ללכת הביתה?`,
      answers: [
        { label: 'אחרי המשחק כזה אני לא רוצה לדבר עם אשתי. אז איתך? שחרר אותי', effect: { morale: -2, prestige: -3 }, reply: 'קצר ועצבני. האולם לא ידע אם לצחוק.' },
        { label: 'אני פה כמו שאתה רואה, תשאל מה שבא לך', effect: { prestige: +1, fans: +1 }, reply: 'לא ברחת למרות ההפסד הקשה. מכובד.' },
      ],
    }),
    c => ({
      id: 'thrash_room',
      tone: 'serious',
      text: `מה נאמר בחדר ההלבשה אחרי השריקה?`,
      answers: [
        { label: 'הכל כולל כמה דברים שעפו על השחקנים, בושה.', effect: { morale: -3, prestige: +2, fans: +3 }, reply: 'ברור לכולם שאתה עצבני כי זה חשוב לך. היציע אוהב את האכזבה שלך.' },
        { label: 'כלום. שתיקה. לפעמים זה הכי חזק', effect: { morale: +1 }, reply: 'תשובה רגועה מדי לסיטואציה. הכתב לא שאל עוד.' },
      ],
    }),
  ],
};

/** Special overrides that beat the result based questions when relevant. */
const DERBY: QGen[] = [
  c => ({
    id: 'derby_pressure',
    tone: 'serious',
    text: `דרבי מול ${c.rival} זה לא עוד משחק. הרגשת את הלחץ המיוחד היום?`,
    answers: [
      { label: 'בשביל משחקים כאלה אני בתחום הזה, אין על האווירה של דרבי', effect: { morale: +3, prestige: +4, fans: +3 }, reply: 'האוהדים אומרים שיצאת גבר ומאמן עם ביצים.' },
      { label: 'לחץ זה חלק מהמשחק, אני לא ישן טוב לפני משחק כזה', effect: { fans: -3 }, reply: 'תשובה שהאוהדים לא אוהבים לשמוע, פחדן וקר מדי.' },
    ],
  }),
  c => ({
    id: 'derby_week',
    tone: 'funny',
    text: `שבוע שלם שכל העיר מדברת על המשחק הזה. איך משאירים את הקבוצה בפוקוס למשחק הבא?`,
    answers: [
      { label: 'נותנים להם ליהנות הלילה בעיר, ואז עובדים', effect: { morale: +3, prestige: -1, fans: +2 }, reply: 'אנושי. חדר ההלבשה אהב לשמוע את זה. הבעלים פחות.' },
      { label: 'מחר בבוקר הדרבי כבר מאחורינו. זה החוק אצלנו', effect: { morale: +1, prestige: +3 }, reply: 'ראש של מקצוען. הבעלים אהב את זה.' },
    ],
  }),
];

const RELEGATION: QGen = c => ({
  id: 'relegation_believe',
  tone: 'brutal',
  text: `אתם מקום ${c.tablePos} מתוך ${c.totalTeams}, ממש בתחתית. אתה עדיין מאמין שאפשר להציל את העונה?`,
  answers: [
    { label: 'אם הייתי יודע כמה נקודות יש הייתי עונה ברצינות. נמשיך לשחק כדורגל', effect: { morale: +1, prestige: -3, fans: -1 }, reply: 'חוסר מקצועיות אבל כנה, האוהדים סופרים את הנקודות שיש בקופה ושולחים לך.' },
    { label: 'נילחם על כל נקודה, אין ויתור', effect: { morale: +3, prestige: +2, fans: +2 }, reply: 'קריאת קרב. השחקנים הזדקפו, היציע גם.' },
  ],
});

/**
 * The local angle. The town paper cares less about the league table and more
 * about whether its own club is going somewhere, which is exactly the belonging
 * the city pick is built on.
 */
const LOCAL: QGen[] = [
  c => ({
    id: 'local_town',
    tone: 'serious',
    text: `כתב מקומון ${c.city} כאן. כל העיר שואלת אותי מתי סוף סוף חוזרים למקום שמגיע לנו. מה אני אגיד להם?`,
    answers: [
      { label: 'תגיד להם שרק ברגע שיגיע לעיר מאמן תותח זה יקרה. הוא הגיע, אני כאן!', effect: { morale: +1, prestige: +5, fans: +3 }, reply: 'שורה לכותרת בעיתון המקומון מחר. עכשיו היא תלויה על הצוואר שלך.' },
      { label: 'תגיד להם לבוא למגרש ולראות, הם הדחיפה שלנו להצלחה', effect: { morale: +1, prestige: -1, fans: +5 }, reply: 'קריאה ליציע. פשוט ונכון.' },
    ],
  }),
  c => ({
    id: 'local_cafe',
    tone: 'funny',
    text: `ב${c.city} כבר מדברים עליך בבתי קפה יותר מאשר על ראש העיר. איך זה מרגיש?`,
    answers: [
      { label: 'ראש עיר מתחלף, מאמן טוב כמוני נשאר', effect: { prestige: +3, fans: +1 }, reply: 'שורה לכותרת. חצי חייכו, חצי הרימו גבה. ראש העיר לא חייך.' },
      { label: 'שיפסיקו, אני בסך הכל מאמן כדורגל', effect: { morale: +1 }, reply: 'צניעות זה חשוב. חיבבו את זה.' },
    ],
  }),
  c => ({
    id: 'local_kids',
    tone: 'serious',
    text: `הרבה ילדים ב${c.city} התחילו ללבוש את הצבעים בזכות מה שאתה עושה. אתה מרגיש את האחריות הזאת?`,
    answers: [
      { label: 'הילדים בעיר צריכים ללבוש את החולצות עם השם שלי, הכל בזכותי', effect: { prestige: +3, fans: -2 }, reply: 'שחצן ויהיר, ההורים יחשבו אם לקנות עוד חולצות.' },
      { label: 'זו הסיבה שאני פה, דור ההמשך חשוב', effect: { morale: +3, prestige: +2, fans: +3 }, reply: 'תשובה מהלב. המקומון מעריך אותך.' },
    ],
  }),
];

/**
 * The terrace's own questions. Each one belongs to a night the crowd actually
 * had, so it is gated on what happened rather than rolled from a pool: the
 * away end that travelled for a defeat, the banner after a home win, the
 * ticket that costs more since the promotion. Two of them are the story of
 * the night and beat everything else, once: three defeats running, and a
 * derby lost.
 */
const lost = (c: PressContext) => c.result === 'loss' || c.result === 'thrashing';
const won = (c: PressContext) => c.result === 'win' || c.result === 'big_win';
const FANS: Array<{ when: (c: PressContext) => boolean; urgent?: boolean; gen: QGen }> = [
  { when: c => c.lossRun >= 3, urgent: true, gen: c => ({
    id: 'fans_boo',
    tone: 'brutal',
    text: `האוהדים שורקים לך בוז ורוצים שתתפטר. מה אתה אומר על זה?`,
    answers: [
      { label: 'אף פעם לא הקשבתי להם, וגם עכשיו לא', effect: { morale: +1, prestige: +1, fans: -5 }, reply: 'החדר הזדקף. היציע רשם. שלט מוכן למחר.' },
      { label: 'אשב עם הבעלים ונקבל החלטה ביחד', effect: { morale: -1, prestige: +1, fans: +1 }, reply: 'תשובה שקולה. הבעלים ראה שהוא לא לבד.' },
    ],
  }) },
  { when: c => c.isDerby && lost(c), urgent: true, gen: c => ({
    id: 'fans_ultras',
    tone: 'brutal',
    text: `האולטראס היה עצבני וחיכו לכם בחניה אחרי הדרבי. דיברת איתם?`,
    answers: [
      { label: 'דיברנו? אוהד כמעט קיבל סטירה. אף אחד לא יקלל את השחקנים שלי', effect: { morale: +4, prestige: -1, fans: -7 }, reply: 'קו אדום. האולטראס קבעו לך פגישה למחר.' },
      { label: 'כן. הקשבתי, והם צודקים בחלק מהדברים', effect: { morale: -1, prestige: +2, fans: +3 }, reply: 'יצאת אליהם. זה נזכר יותר מהתוצאה.' },
    ],
  }) },
  { when: c => !c.isHome && lost(c), gen: c => ({
    id: 'fans_away',
    tone: 'serious',
    text: `ארבעים אוהדים נסעו שלוש שעות בשביל זה. מה אתה אומר להם?`,
    answers: [
      { label: 'הדלק עליי. תביאו קבלות', effect: { prestige: -1, fans: +3 }, reply: 'צחוק ביציע, וקבלות בבוקר.' },
      { label: 'סליחה. הם היו טובים מאיתנו היום', effect: { morale: -1, prestige: +2, fans: +2 }, reply: 'כנות. הם נסעו הביתה פחות כועסים.' },
    ],
  }) },
  { when: c => c.isHome && lost(c) && c.fans >= 60, gen: c => ({
    id: 'fans_sing',
    tone: 'serious',
    text: `הפסדתם, והיציע שר עד הדקה התשעים. מה זה אומר עליהם, ומה עליכם?`,
    answers: [
      { label: 'לפעמים אני רוצה לעלות לשיר איתם, איזה תצוגה הם נתנו', effect: { morale: -3, prestige: +2, fans: +3 }, reply: 'היציע אהב. החדר שמע מי בא לפני מי.' },
      { label: 'שאנחנו חייבים להם משחק. וזה חוב שנשלם', effect: { morale: +2, prestige: +1, fans: +2 }, reply: 'הבטחה קטנה ונכונה. כולם קיבלו.' },
    ],
  }) },
  { when: c => c.isHome && c.gate < 0.5, gen: c => ({
    id: 'fans_empty',
    tone: 'funny',
    text: `היציע היה חצי ריק היום. איפה כולם?`,
    answers: [
      { label: 'מה אתה שואל אותי? תשאל אותם. אנחנו על הדשא', effect: { morale: +1, prestige: -1, fans: -3 }, reply: 'קצת מתנשא. מי שנשאר בבית הרגיש צודק.' },
      { label: 'זו העבודה שלי להחזיר אותם. נגביר את הקצב של המשחק', effect: { prestige: +2, fans: +3 }, reply: 'קיבלת את זה על עצמך. הם שמעו.' },
    ],
  }) },
  { when: c => c.isHome && won(c), gen: c => ({
    id: 'fans_kid',
    tone: 'funny',
    text: `ילד בן שמונה עם החולצה חיכה לך שעה אחרי המשחק. יצאת אליו?`,
    answers: [
      { label: 'אתה יודע כמה ילדים מחכים לי? מלא! אין לי זמן לזה', effect: { prestige: -2, fans: -3 }, reply: 'האמא שלו כתבה פוסט עליך. הוא הגיע לאלף לייקים.' },
      { label: 'יצאתי. הוא קיבל חתימה', effect: { morale: +1, prestige: +1, fans: +4 }, reply: 'התמונה של השבוע. המקומון שם אותה בעמוד הראשון.' },
    ],
  }) },
  { when: c => c.isHome && won(c) && c.fans >= 70, gen: c => ({
    id: 'fans_banner',
    tone: 'funny',
    text: `היציע תלה שלט עם השם שלך. אתה מסתכל על זה?`,
    answers: [
      { label: 'ראיתי. שיתלו גם בבית של הבעלים', effect: { morale: +1, prestige: -1, fans: +2 }, reply: 'צחוק באולם. הבעלים שמע.' },
      { label: 'השלט הזה שייך לשחקנים, לא לי', effect: { morale: +4, prestige: +1, fans: +1 }, reply: 'העברת את הקרדיט. גם היציע הנהן.' },
    ],
  }) },
  { when: c => c.justUp, gen: c => ({
    id: 'fans_prices',
    tone: 'serious',
    text: `המועדון העלה את מחירי הכרטיסים והיציע כועס. אתה תומך בהחלטה?`,
    answers: [
      { label: 'אני מאמן. מחירים זה לא האזור שלי', effect: { prestige: +1, fans: -2 }, reply: 'התחמקות מנומסת. היציע רצה שמישהו יעמוד לצידו.' },
      { label: 'לא. ואמרתי את זה לבעלים, האוהדים לפני הכל', effect: { prestige: -4, fans: +7 }, reply: 'עמדת עם היציע נגד הבעלים. הבעלים לא שכח ושוקל לדבר איתך.' },
    ],
  }) },
];

/** The terrace questions that fit tonight. */
export function fittingFans(c: PressContext): { urgent: QGen[]; rest: QGen[] } {
  const fit = FANS.filter(f => f.when(c));
  return { urgent: fit.filter(f => f.urgent).map(f => f.gen), rest: fit.filter(f => !f.urgent).map(f => f.gen) };
}

const TOP: QGen = c => ({
  id: 'top_say_it',
  tone: 'serious',
  text: `אתם בפסגת הטבלה. המילה אליפות כבר לא מוגזמת. אתה מוכן להגיד אותה בקול?`,
  answers: [
    { label: 'תגיד אתה רציני? פחות מ-10 הפרש זה בושה מבחינתי', effect: { morale: +2, prestige: +5, fans: +3 }, reply: 'הכרזה נועזת. עכשיו כולם יחכו לך בפינה בסוף העונה.' },
    { label: 'מחזור מחזור, בלי להתרברב', effect: { morale: +3, prestige: +1 }, reply: 'ראש שקט. השחקנים אוהבים את היציבות.' },
  ],
});

/**
 * One of a pool, skipping whatever was asked recently. When the whole pool has
 * been heard lately the one heard longest ago is the least bad repeat, so a
 * pool of one still yields a question rather than nothing.
 */
export function fresh(pool: QGen[], c: PressContext, rng: Rng, recent: string[]): PressQuestion {
  const all = pool.map(g => g(c));
  const unheard = all.filter(q => !recent.includes(q.id));
  if (unheard.length) return unheard[Math.floor(rng() * unheard.length)];
  return all.reduce((a, b) => recent.indexOf(a.id) <= recent.indexOf(b.id) ? a : b);
}

/** Pick a fitting question. `recent` is what was asked lately, oldest first, and is avoided. */
export function pickPressQuestion(c: PressContext, rng: Rng, recent: string[] = []): { outlet: Outlet; q: PressQuestion } {
  const outlet = OUTLETS[Math.floor(rng() * OUTLETS.length)];
  const roll = rng();
  const terrace = fittingFans(c);

  // the terrace's two big nights come before anything else, and are asked
  // once: the whistling is one question, not one a week until a win
  const shout = terrace.urgent.map(g => g(c)).find(q => !recent.includes(q.id));
  if (shout) return { outlet, q: shout };

  // priority overrides. A derby and the top of the table are worth repeating
  // ourselves for. The relegation question is not: once it has been asked the
  // ordinary questions come back until enough weeks have passed
  if (c.isDerby && roll > 0.4) return { outlet, q: fresh(DERBY, c, rng, recent) };
  if (c.tablePos >= c.totalTeams - 1 && (c.result === 'loss' || c.result === 'draw') && !recent.includes(RELEGATION(c).id))
    return { outlet, q: RELEGATION(c) };
  if (c.tablePos === 1 && (c.result === 'win' || c.result === 'big_win')) return { outlet, q: TOP(c) };

  // roughly a quarter of the time the town paper gets in first, with its own byline
  if (roll < 0.25) return { outlet: `מקומון ${c.city}` as Outlet, q: fresh(LOCAL, c, rng, recent) };

  // and about a third of the nights the crowd gave him something to answer
  // for, that is the question, provided it has not been asked lately
  if (terrace.rest.length && rng() < 0.35) {
    const unheard = terrace.rest.filter(g => !recent.includes(g(c).id));
    if (unheard.length) return { outlet, q: fresh(unheard, c, rng, recent) };
  }

  return { outlet, q: fresh(BY_RESULT[c.result], c, rng, recent) };
}

/**
 * The ids each pool can produce, for the checks. Ids are fixed strings, so a
 * bare context is enough to read them out.
 */
const BARE: PressContext = {
  result: 'win', isDerby: false, lowMorale: false, highPrestige: false,
  tablePos: 5, totalTeams: 10, star: '', rival: '', city: '',
  isHome: true, fans: 50, lossRun: 0, gate: 0.7, justUp: false,
};
/** Every wider question there is, filled with the given context, for the checks. */
export function everyWideQuestion(c: PressContext = BARE): PressQuestion[] {
  return [...Object.values(BY_RESULT).flat(), ...DERBY, RELEGATION, ...LOCAL, TOP, ...FANS.map(f => f.gen)].map(g => g(c));
}
export const WIDE_POOLS: Record<PressContext['result'] | 'local' | 'derby' | 'fans', string[]> = {
  big_win: BY_RESULT.big_win.map(g => g(BARE).id),
  win: BY_RESULT.win.map(g => g(BARE).id),
  draw: BY_RESULT.draw.map(g => g(BARE).id),
  loss: BY_RESULT.loss.map(g => g(BARE).id),
  thrashing: BY_RESULT.thrashing.map(g => g(BARE).id),
  local: LOCAL.map(g => g(BARE).id),
  derby: DERBY.map(g => g(BARE).id),
  fans: FANS.map(f => f.gen(BARE).id),
};
