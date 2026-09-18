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
        { label: 'זאת הקבוצה שלנו, תתרגלו', effect: { prestige: +4, morale: +3 }, reply: 'הצהרה בטוחה. הכותרות מחר יאהבו את זה.' },
        { label: 'צעד אחד בכל פעם, בלי לעוף', effect: { morale: +4 }, reply: 'ענווה. השחקנים שמעו ואהבו.' },
      ],
    }),
    c => ({
      id: 'big_win_raise',
      tone: 'funny',
      text: `אחרי הביצוע הזה, מתי אתה מבקש העלאה מהבעלים?`,
      answers: [
        { label: 'כבר שלחתי לו הודעה', effect: { morale: +2 }, reply: 'צחוק באולם. קטע נחמד לטיקטוק.' },
        { label: 'קודם נשמור על הרגליים על הקרקע', effect: { prestige: +2 }, reply: 'תשובה מקצועית, קצת משעממת.' },
      ],
    }),
    c => ({
      id: 'big_win_message',
      tone: 'serious',
      text: `תוצאה כזאת מול ${c.rival} שולחת מסר לכל הליגה, ללא ספק. לא?`,
      answers: [
        { label: 'אנחנו לא שולחים מסרים, אנחנו משחקים', effect: { morale: +3, prestige: +1 }, reply: 'ענווה עם שיניים. עבר מצוין.' },
        { label: 'כן. שידעו', effect: { prestige: +4, morale: -1 }, reply: 'שורה שתישאר. גם אצל היריבות הבאות.' },
      ],
    }),
  ],
  win: [
    c => ({
      id: 'win_control',
      tone: 'serious',
      text: `שלוש נקודות חשובות. הרגשת שהקבוצה בשליטה, או שזה היה יותר קרוב ממה שנראה?`,
      answers: [
        { label: 'שלטנו מהדקה הראשונה', effect: { prestige: +3, morale: +2 }, reply: 'הצגת ביטחון. היריבה תזכור.' },
        { label: 'עבדנו קשה על כל כדור', effect: { morale: +3 }, reply: 'הערכת את השחקנים. חדר ההלבשה מרוצה.' },
      ],
    }),
    c => ({
      id: 'win_quiet',
      tone: 'funny',
      text: `ניצחתם, והיציע יצא בשקט. איפה החגיגה?`,
      answers: [
        { label: 'ניצחון זה ניצחון. שיחגגו בבית', effect: { prestige: +2, morale: +1 }, reply: 'יבש. מקצועי. הכתב חייך.' },
        { label: 'גם אני רוצה יותר, ואני אגיד את זה בחדר', effect: { morale: -1, prestige: +3 }, reply: 'רעב. השחקנים קראו את זה בבוקר והבינו.' },
      ],
    }),
    c => ({
      id: 'win_habit',
      tone: 'serious',
      text: `מתחילים להתרגל לנצח אצלכם. אתה לא מפחד שזה משעמם?`,
      answers: [
        { label: 'שיתרגלו. בשביל זה באנו', effect: { prestige: +3, morale: +2 }, reply: 'ביטחון. היציע אהב.' },
        { label: 'אף אחד לא נרדם אצלי, גם לא אני', effect: { morale: +2, prestige: +1 }, reply: 'מסר לחדר, לא לעיתונות. הגיע ליעד.' },
      ],
    }),
    c => ({
      id: 'win_rival',
      tone: 'serious',
      text: `${c.rival} לא באה לפה להפסיד. מה הכריע בסוף?`,
      answers: [
        { label: 'סבלנות. חיכינו לרגע שלנו', effect: { morale: +2, prestige: +2 }, reply: 'ניתוח מדויק. מי שמבין הנהן.' },
        { label: `הראש. רצינו את זה יותר מ${c.rival}`, effect: { morale: +3 }, reply: 'רגש. היציע לוקח את זה הביתה.' },
      ],
    }),
  ],
  draw: [
    c => ({
      id: 'draw_wasting',
      tone: 'brutal',
      text: `עוד תיקו. בקצב הזה לא עולים ליגה. אתה לא מרגיש שאתה מבזבז עונה?`,
      answers: [
        { label: 'תשאל אותי בסוף העונה', effect: { prestige: +3, morale: -1 }, reply: 'עמדת מולו. חלק אהבו, חלק חשבו שהתחמקת.' },
        { label: 'צודק, חייבים יותר', effect: { morale: -3, prestige: +2 }, reply: 'הודית בבעיה. השחקנים קצת נלחצו.' },
      ],
    }),
    c => ({
      id: 'draw_point',
      tone: 'serious',
      text: `נקודה בחוץ. אתה מרוצה או מאוכזב?`,
      answers: [
        { label: 'לוקחים את הנקודה וממשיכים', effect: { morale: +2 }, reply: 'תשובה מאוזנת.' },
        { label: 'באנו לנצח, זה מאכזב', effect: { prestige: +2, morale: -1 }, reply: 'שידרת רעב. היציע אוהב את זה.' },
      ],
    }),
    c => ({
      id: 'draw_who',
      tone: 'funny',
      text: `תיקו מול ${c.rival}. מי משתי הקבוצות יצאה מפה מרוצה יותר?`,
      answers: [
        { label: 'הם. ואני לא אוהב את זה', effect: { prestige: +2, morale: -1 }, reply: 'כנות. לא נעים לשמוע, אבל מכבדים.' },
        { label: 'אף אחד. וזה בסדר', effect: { morale: +2 }, reply: 'תשובה שקטה. הכתב עבר הלאה.' },
      ],
    }),
  ],
  loss: [
    c => ({
      id: 'loss_fans',
      tone: 'brutal',
      text: `הפסד שכואב. יש אוהדים שכבר קוראים להחליף אותך. יש לך מה להגיד להם?`,
      answers: [
        { label: 'אני לא בורח מאחריות', effect: { prestige: +4, morale: +1 }, reply: 'עמדת זקוף. זה עובר טוב בעיתונות.' },
        { label: 'הם צודקים לכעוס, נתקן', effect: { morale: +3, prestige: -2 }, reply: 'הזדהית עם הכאב שלהם. היציע התרכך.' },
      ],
    }),
    c => ({
      id: 'loss_broke',
      tone: 'serious',
      text: `איפה המשחק נשבר לדעתך?`,
      answers: [
        { label: 'לקחתי אחריות, זו טעות שלי', effect: { morale: +3, prestige: -1 }, reply: 'הגנת על השחקנים. הם יזכרו את זה.' },
        { label: 'החמצנו את המצבים, זה הכל', effect: { morale: +1 }, reply: 'ניתוח יבש. עבר בשקט.' },
      ],
    }),
    c => ({
      id: 'loss_fair',
      tone: 'brutal',
      text: `אוהדי ${c.rival} יצאו מפה בטוחים שהיו הטובים יותר. הם צודקים?`,
      answers: [
        { label: 'היום כן. ואני לא מתבייש להגיד', effect: { prestige: +3, morale: -1 }, reply: 'הגינות. גם היריבה כיבדה את זה.' },
        { label: 'לא. איבדנו את זה לבד', effect: { morale: +1, prestige: +1 }, reply: 'לא נתת להם קרדיט. החדר שמע שזה בידיים שלו.' },
      ],
    }),
    c => ({
      id: 'loss_lesson',
      tone: 'serious',
      text: `מה לוקחים מהערב הזה לשבוע הבא?`,
      answers: [
        { label: 'שמשחק לא נגמר בשריקת הפתיחה', effect: { morale: +2, prestige: +1 }, reply: 'מסר לשחקנים דרך המיקרופון. הם קלטו.' },
        { label: 'כלום. שוכחים ומתקדמים', effect: { morale: +2 }, reply: 'ראש קדימה. יש מי שחשב שזה קל מדי.' },
      ],
    }),
  ],
  thrashing: [
    c => ({
      id: 'thrash_shame',
      tone: 'brutal',
      text: `ספגתם ביזיון. איך בכלל מסבירים משחק כזה לאוהדים שנסעו עד לכאן?`,
      answers: [
        // the fans did not play, so there is nothing for them to carry. A
        // manager taking the blame is taking it off his players.
        { label: 'הביזיון עליי, לא על השחקנים', effect: { prestige: +3, morale: +2 }, reply: 'לקחת את הכדור. מהלך של מנהיג.' },
        { label: 'יום כזה לא יחזור, אני מבטיח', effect: { morale: +2, prestige: -2 }, reply: 'הבטחה גדולה. עכשיו תצטרך לעמוד בה.' },
      ],
    }),
    c => ({
      id: 'thrash_home',
      tone: 'funny',
      text: `בתוצאה כזאת, בא לך בכלל לענות לי או שאתה מעדיף ללכת הביתה?`,
      answers: [
        { label: 'אני פה, תשאל מה שבא לך', effect: { prestige: +2 }, reply: 'לא ברחת. מכובד.' },
        { label: 'בוא נגמור עם זה מהר', effect: { morale: -1 }, reply: 'קצר וקצת עצבני. מובן.' },
      ],
    }),
    c => ({
      id: 'thrash_room',
      tone: 'serious',
      text: `מה נאמר בחדר ההלבשה אחרי השריקה?`,
      answers: [
        { label: 'כלום. שתיקה. לפעמים זה הכי חזק', effect: { prestige: +2, morale: +1 }, reply: 'תמונה שנשארת. הכתב לא שאל עוד.' },
        { label: 'הכל. ואני לא אחזור על זה כאן', effect: { morale: -2, prestige: +3 }, reply: 'ברור שהייתה צעקה. היציע דווקא רצה לשמוע אותה.' },
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
      { label: 'בשביל זה נכנסתי לעבודה הזאת', effect: { prestige: +4, morale: +3 }, reply: 'היציע ישתה את המילים האלה.' },
      { label: 'לחץ זה חלק מהמשחק, התרגלנו', effect: { morale: +2 }, reply: 'קור רוח. מקצועי.' },
    ],
  }),
  c => ({
    id: 'derby_week',
    tone: 'funny',
    text: `שבוע שלם העיר דיברה על המשחק. איך משאירים את הקבוצה בפוקוס למשחק הבא?`,
    answers: [
      { label: 'מחר בבוקר הדרבי כבר מאחורינו. זה החוק אצלנו', effect: { prestige: +3, morale: +1 }, reply: 'ראש של מקצוען. הכתב רשם את החוק.' },
      { label: 'נותנים להם יום ליהנות, ואז עובדים', effect: { morale: +3, prestige: +1 }, reply: 'אנושי. החדר אהב לשמוע את זה.' },
    ],
  }),
];

const RELEGATION: QGen = c => ({
  id: 'relegation_believe',
  tone: 'brutal',
  text: `אתם מקום ${c.tablePos} מתוך ${c.totalTeams}, ממש בתחתית. אתה עדיין מאמין שאפשר להציל את העונה?`,
  answers: [
    { label: 'העונה רק מתחילה מבחינתי', effect: { prestige: +3, morale: +2 }, reply: 'ביטחון מול המצוקה. חלק ישתכנעו.' },
    { label: 'נילחם על כל נקודה, אין ויתור', effect: { morale: +3 }, reply: 'קריאת קרב. השחקנים הזדקפו.' },
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
      { label: `${c.city} תהיה גאה בקבוצה הזאת`, effect: { prestige: +3, morale: +3 }, reply: 'הבטחה ישירה לתושבים. הרחוב אהב.' },
      { label: 'תגיד להם לבוא למגרש ולראות', effect: { morale: +2 }, reply: 'קריאה ליציע. פשוט ונכון.' },
    ],
  }),
  c => ({
    id: 'local_cafe',
    tone: 'funny',
    text: `ב${c.city} כבר מדברים עליך בבתי קפה יותר מאשר על ראש העיר. איך זה מרגיש?`,
    answers: [
      { label: 'שיפסיקו, אני בסך הכל עושה עבודה', effect: { morale: +2 }, reply: 'ענווה מקומית. חיבבו את זה.' },
      { label: 'ראש עיר מתחלף, מאמן טוב נשאר', effect: { prestige: +3 }, reply: 'שורה לכותרת. חצי חייכו, חצי הרימו גבה.' },
    ],
  }),
  c => ({
    id: 'local_kids',
    tone: 'serious',
    text: `הרבה ילדים ב${c.city} התחילו ללבוש את הצבעים בזכות מה שאתה עושה. אתה מרגיש את האחריות הזאת?`,
    answers: [
      { label: 'זו הסיבה שאני פה', effect: { prestige: +2, morale: +3 }, reply: 'תשובה מהלב. המקומון יכתיר אותה.' },
      { label: 'קודם תוצאות, אחר כך רגש', effect: { prestige: +2 }, reply: 'ענייני. חלק ציפו ליותר חום.' },
    ],
  }),
];

const TOP: QGen = c => ({
  id: 'top_say_it',
  tone: 'serious',
  text: `אתם בפסגת הטבלה. המילה אליפות כבר לא מוגזמת. אתה מוכן להגיד אותה בקול?`,
  answers: [
    { label: 'אנחנו הולכים על האליפות', effect: { prestige: +5, morale: +2 }, reply: 'הכרזה נועזת. עכשיו כולם רודפים אותך.' },
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

  // priority overrides. A derby and the top of the table are worth repeating
  // ourselves for. The relegation question is not: once it has been asked the
  // ordinary questions come back until enough weeks have passed
  if (c.isDerby && roll > 0.4) return { outlet, q: fresh(DERBY, c, rng, recent) };
  if (c.tablePos >= c.totalTeams - 1 && (c.result === 'loss' || c.result === 'draw') && !recent.includes(RELEGATION(c).id))
    return { outlet, q: RELEGATION(c) };
  if (c.tablePos === 1 && (c.result === 'win' || c.result === 'big_win')) return { outlet, q: TOP(c) };

  // roughly a quarter of the time the town paper gets in first, with its own byline
  if (roll < 0.25) return { outlet: `מקומון ${c.city}` as Outlet, q: fresh(LOCAL, c, rng, recent) };

  return { outlet, q: fresh(BY_RESULT[c.result], c, rng, recent) };
}

/**
 * The ids each pool can produce, for the checks. Ids are fixed strings, so a
 * bare context is enough to read them out.
 */
const BARE: PressContext = {
  result: 'win', isDerby: false, lowMorale: false, highPrestige: false,
  tablePos: 5, totalTeams: 10, star: '', rival: '', city: '',
};
export const WIDE_POOLS: Record<PressContext['result'] | 'local' | 'derby', string[]> = {
  big_win: BY_RESULT.big_win.map(g => g(BARE).id),
  win: BY_RESULT.win.map(g => g(BARE).id),
  draw: BY_RESULT.draw.map(g => g(BARE).id),
  loss: BY_RESULT.loss.map(g => g(BARE).id),
  thrashing: BY_RESULT.thrashing.map(g => g(BARE).id),
  local: LOCAL.map(g => g(BARE).id),
  derby: DERBY.map(g => g(BARE).id),
};
