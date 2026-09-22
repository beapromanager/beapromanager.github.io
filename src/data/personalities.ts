/**
 * Who these guys actually are.
 *
 * A rating tells you nothing about a person. These traits are what make the
 * squad yours: the keeper who goes out on Thursday nights, the striker who
 * starts arguments when he gets tired, the kid whose dad shouts louder than
 * the manager. Israeli lower league, drawn from life.
 *
 * Two things keep it from repeating on you:
 *  1. Each line has SLOTS filled from a per player seed, so two "חסכן" players
 *     drive a different car from a different year.
 *  2. assignTraits() works over a whole squad, never handing the same trait to
 *     two players, and only about two thirds of the squad get a personality at
 *     all. The weakest players stay quiet, which is true to life anyway.
 *
 * Nothing is stored on the player. Everything is DERIVED deterministically from
 * the player id, so old saves, market free agents and freshly generated squads
 * all get the same personality forever, with no migration and no touch to the
 * engine's rng stream.
 */

import type { Player } from '../engine/matchEngine.ts';
import type { Legend } from './legends.ts';
import { legendByName } from './legends.ts';
import type { Friend } from '../game/friends.ts';
import { friendTrait, friendLine } from '../game/friends.ts';
import { overall } from '../engine/matchEngine.ts';
import { BRONZE_FROM } from '../game/cards.ts';
import { originOfName } from './names.ts';

export type Tone = 'fun' | 'warn' | 'heart' | 'pro' | 'friend';

/** Picks a stable element per call, advancing so several slots in one line differ. */
export type Picker = <T>(arr: readonly T[]) => T;

export interface Trait {
  id: string;
  /** group, never two traits from the same group on one player */
  group: string;
  /** short chip on the player row */
  label: string;
  /** the dressing room line, filled from a per player picker for the slots */
  line: (name: string, pick: Picker) => string;
  /** honest manager advice, shown only when it changes a decision */
  tip?: string;
  tone: Tone;
  /** eligibility, so an 18 year old is never "talks about retiring" */
  fit?: (p: Player) => boolean;
  /**
   * Defines a KIND of player (a teenager, a veteran, a keeper) rather than just
   * excluding some. Signature traits lead the personality so a keeper reads
   * like a keeper. Plain `fit` exclusions must not set this, or every outfield
   * player ends up drawn from the same tiny pool.
   */
  signature?: boolean;
}

const young = (p: Player) => p.age <= 21;
const veteran = (p: Player) => p.age >= 32;
const keeper = (p: Player) => p.position === 'GK';
const outfield = (p: Player) => p.position !== 'GK';

/* --------------------------------------------------------------- slot pools */
/* every array here is a source of variety, so the same trait reads fresh */

const CARS = ['מאזדה', 'סובארו', 'מיצובישי', 'אופל', 'סקודה', 'יונדאי', 'קיה', 'פורד פוקוס', 'רנו'];
const OLD_YEARS = ['2008', '2009', '2010', '2011', '2012', '2013'];
const DISHES = ['סיר ג\'חנון עם רסק וביצים', 'סיניית קפאיף', 'מקלובה', 'שקשוקה', 'חמין', 'מג׳דרה', 'קובה', 'פסטה'];
const FOOD_SPOTS = ['אותה שווארמה', 'אותה חומוסייה', 'אותו פלאפל', 'אותה פיצה', 'אותו גריל'];
const MINUTES = ['12', '8', '19', '24', '0', '31'];
const ACHES = ['בירך', 'בברך', 'בגב', 'בשכם', 'בשוק'];
const BAD_SCORES = ['0:3', '1:4', '0:2', '2:5'];
const SEASONS_N = ['שלוש', 'ארבע', 'חמש', 'שתי'];
const COFFEES = ['הפוך על חלב שקדים', 'אספרסו כפול קר', 'קפה עם ארבע כפות סוכר', 'מקיאטו בכוס משלו'];
const CITIES = ['בת ים', 'חדרה', 'קריית גת', 'טירה', 'נהריה', 'דימונה', 'טבריה'];
const DRINKS = ['משקאות אנרגיה', 'מים בטעמים', 'תה נענע חם', 'קפה שחור'];
const PETS = ['הכלב', 'התוכי', 'החתול'];
/* league games are Friday noon, so everything orbits erev shabbat */
const HUMMUS = ['חומוס', 'חומוס פול', 'מסבחה', 'חומוס עם ביצה'];
const JOBS = ['במוסך', 'במשרד', 'בחשמלייה', 'בקייטרינג', 'במאפייה של הדוד', 'באבטחה'];
const ORIGINS = ['אוקראינה', 'צרפת', 'אתיופיה', 'רוסיה', 'ארגנטינה'];

// A few lines belong to one sector's life and not the other's: kiddush,
// reserve duty, aliyah. A man from the Arab pool does not get them, or a
// player in הפועל נצרת reads that his centre back runs home for kiddush.
const jewish = (p: Player) => originOfName(p.name) === 'jewish';
const HALLS = ['גן אירועים', 'אולם בפריפריה', 'מסעדה על המים'];

/**
 * Deterministic picker for a given seed. Same player + trait always lands on
 * the same slots, so the mazda year does not flicker between renders.
 */
function makePicker(seed: number): Picker {
  let s = (seed >>> 0) || 1;
  return <T,>(arr: readonly T[]): T => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return arr[s % arr.length];
  };
}

export const TRAITS: Trait[] = [
  /* --------------------------------------------------------------- nights */
  {
    id: 'thursday', group: 'night', label: 'חיית לילה', tone: 'warn',
    line: n => `${n} היה מצטיין בנוער. היום הכי אוהב את חמישי בלילה, וחבל, כי המשחק בשישי.`,
    tip: 'אחרי ליל חמישי כבד, בשישי הרגליים שלו לא שם.',
  },
  {
    id: 'late', group: 'night', label: 'תמיד מאחר', tone: 'fun',
    line: n => `${n} מגיע לאימון על הדקה, כל פעם מחדש. תמיד בגלל הפקקים והוא גר 5 דק' מהמגרש.`,
  },
  {
    id: 'bus-sleep', group: 'night', label: 'ישן באוטובוס', tone: 'fun',
    line: n => `${n} נרדם באוטובוס בדרך לכל משחק חוץ. גם בדרך חזרה, השארנו אותו בחניון.`,
  },
  {
    id: 'beach', group: 'night', label: 'איש הים', tone: 'fun',
    line: (n, p) => `אחרי כל אימון ${n} נעלם לחוף ב${p(CITIES)}. אומר שזה מה שמנקה לו את הראש.`,
  },

  /* ---------------------------------------------------------------- temper */
  {
    id: 'hothead', group: 'temper', label: 'חם מזג', tone: 'warn',
    line: n => `${n} אוהב לריב באמצע המשחק. כשהוא מתעייף, האדום קרוב יותר מתמיד.`,
    tip: 'כשהכושר שלו יורד, תחליף אותו לפני הכרטיס השני.',
  },
  {
    id: 'ref-talker', group: 'temper', label: 'מדבר עם השופט', tone: 'fun',
    line: n => `${n} מנהל שיחה עם השופט מהדקה הראשונה. השופטים בליגה כבר מכירים אותו בשם פרטי.`,
  },
  {
    id: 'grudge', group: 'temper', label: 'זוכר טוב', tone: 'warn',
    line: n => `מי שנכנס ב${n} בסיבוב הראשון, יפגוש אותו שוב בסיבוב השני. הוא זוכר הכל.`,
  },
  {
    id: 'diver', group: 'temper', label: 'נופל בקלות', tone: 'fun',
    line: n => `${n} נופל אם מסתכלים עליו חזק. השופטים בליגה כבר הפסיקו לשרוק לו.`,
  },

  /* ----------------------------------------------------------------- media */
  {
    id: 'instagram', group: 'media', label: 'כוכב רשת', tone: 'fun',
    line: (n, p) => `${n} מעלה סטורי מחדר הכושר בשש בבוקר. בעונה שעברה שיחק סך הכל ${p(MINUTES)} דקות.`,
  },
  {
    id: 'interviews', group: 'media', label: 'אוהב מיקרופון', tone: 'warn',
    line: n => `${n} עונה לכל עיתונאי שמתקשר. גם לאלה שלא שאלו עליו.`,
    tip: 'שבוע של דרבי, עדיף שלא ידבר.',
  },
  {
    id: 'celebration', group: 'media', label: 'חוגג בגדול', tone: 'fun',
    line: n => `${n} חוגג כל שער כאילו זה גמר גביע המדינה. גם כשמובילים 0:4 בבית.`,
  },
  {
    id: 'podcast', group: 'media', label: 'מנחה פודקאסט', tone: 'fun',
    line: n => `${n} פתח פודקאסט על כדורגל. שלוש פרקים, ארבעה מאזינים, כולם מהמשפחה.`,
  },

  /* ------------------------------------------------------------------ food */
  {
    id: 'mom-food', group: 'food', label: 'אמא מבשלת', tone: 'heart',
    line: (n, p) => `אמא של ${n} מביאה ${p(DISHES)} לחדר ההלבשה אחרי כל ניצחון בית. כל הקבוצה מתפללת לניצחונות בית.`,
  },
  {
    id: 'family-shop', group: 'food', label: 'עובד בבוקר', tone: 'heart',
    line: n => `${n} בבוקר מרים מקררים לבתים, בערב באימון. הכי חזק בקבוצה, לא במקרה.`,
  },
  {
    id: 'shawarma', group: 'food', label: 'שגרה קבועה', tone: 'fun',
    line: (n, p) => `אחרי כל משחק חוץ ${n} עוצר ב${p(FOOD_SPOTS)} בדיוק. אומר שזה חלק חשוב בתוכנית אימונים.`,
  },
  {
    id: 'energy', group: 'food', label: 'ממכר לקפאין', tone: 'warn',
    line: (n, p) => `${n} חי על ${p(DRINKS)}. המאמן כושר כבר ויתר על להסביר לו.`,
  },

  /* ------------------------------------------------------------ superstition */
  {
    id: 'socks', group: 'luck', label: 'אמונות טפלות', tone: 'fun',
    line: (n, p) => `${n} נועל את אותם גרביים כבר ${p(SEASONS_N)} עונות. אף אחד בחדר לא מעז לכבס אותם.`,
  },
  {
    id: 'right-foot', group: 'luck', label: 'רגל ימין ראשונה', tone: 'fun',
    line: (n, p) => `${n} נכנס למגרש רגל ימין ראשונה. פעם אחת שכח, הפסידו ${p(BAD_SCORES)}, ומאז הוא לא שוכח.`,
  },
  {
    id: 'same-spot', group: 'luck', label: 'החניה שלו', tone: 'fun',
    line: n => `${n} חונה באותו מקום בחניון כבר שנים. פעם רבו על זה, המקום נשאר שלו.`,
  },

  /* --------------------------------------------------------------- comedy */
  {
    id: 'clown', group: 'comedy', label: 'ליצן החדר', tone: 'heart',
    line: n => `${n} הוא הליצן של חדר ההלבשה. גם כשהוא לא משחק, המורל בסגל עולה כשהוא שם.`,
  },
  {
    id: 'karaoke', group: 'comedy', label: 'מוביל קריוקי', tone: 'fun',
    line: n => `${n} מוביל את הקריוקי בכל נסיעה ארוכה. הקול מזעזע, הביטחון בשמיים.`,
  },
  {
    id: 'almost', group: 'comedy', label: 'כמעט חתם בגדולה', tone: 'fun',
    line: n => `${n} מספר שהוא כמעט חתם בליגת העל. הסיפור משתנה כל עונה.`,
  },
  {
    id: 'nicknames', group: 'comedy', label: 'מחלק כינויים', tone: 'fun',
    line: n => `${n} נתן כינוי לכל שחקן בסגל. חצי מהם כבר לא זוכרים את השם האמיתי אחד של השני.`,
  },

  /* ----------------------------------------------------------------- heart */
  {
    id: 'local', group: 'heart', label: 'בן המקום', tone: 'heart',
    line: n => `${n} נולד ברחוב מאחורי האצטדיון. לא יעבור לקבוצה אחרת גם בכפול כסף.`,
  },
  {
    id: 'captain', group: 'heart', label: 'מנהיג', tone: 'pro',
    line: n => `${n} מדבר אחרון לפני היציאה למגרש. כשהוא מדבר, בחדר ההלבשה יש שקט.`,
  },
  {
    id: 'kiss-crest', group: 'heart', label: 'אוהד הקבוצה', tone: 'heart',
    line: n => `${n} מנשק את הסמל אחרי כל שער. היציע סולח לו הרבה בזכות זה.`,
  },
  {
    id: 'youth-coach', group: 'heart', label: 'מאמן ילדים', tone: 'heart',
    line: n => `${n} מאמן קבוצת ילדים בבקרים. חצי מהם באים לראות אותו במשחקי בית.`,
  },
  {
    id: 'iron', group: 'heart', label: 'ברזל', tone: 'pro',
    line: (n, p) => `${n} לא החמיץ משחק כבר ${p(SEASONS_N)} עונות. משחק גם עם חום, גם על רגל אחת.`,
  },

  /* ------------------------------------------------------------------ young */
  {
    id: 'wonderkid', group: 'age', label: 'לא מפחד', tone: 'pro',
    line: n => `${n} לא מפחד מאף מגן בליגה. הסוכן שלו כבר מתקשר למועדון כל שבוע.`,
    fit: young, signature: true,
  },
  {
    id: 'dad-stands', group: 'age', label: 'אבא ביציע', tone: 'fun',
    line: n => `אבא של ${n} ביציע בכל משחק, וצועק הוראות חזק יותר מהמאמן.`,
    fit: young, signature: true,
  },
  {
    id: 'school', group: 'age', label: 'עוד בבגרויות', tone: 'heart',
    line: n => `${n} עדיין מסיים בגרויות. מגיע לאימון עם תיק גב ויוצא ראשון.`,
    fit: young, signature: true,
  },

  /* --------------------------------------------------------------- veteran */
  {
    id: 'old-glory', group: 'age', label: 'ותיק', tone: 'pro',
    line: n => `${n} מזכיר לכולם שהוא שיחק פעם מול קבוצה מליגת העל. מסתבר שזה נכון.`,
    fit: veteran, signature: true,
  },
  {
    id: 'retirement', group: 'age', label: 'פורש כל שנה', tone: 'fun',
    line: n => `${n} מדבר על פרישה בסוף כל עונה. וחוזר בהכנה לעונה הבאה.`,
    fit: veteran, signature: true,
  },
  {
    id: 'mentor', group: 'age', label: 'דוד של החדר', tone: 'heart',
    line: n => `הצעירים בסגל הולכים ל${n} בכל בעיה. הוא כבר עבר את הכל בליגה הזאת.`,
    fit: veteran, signature: true,
  },

  /* -------------------------------------------------------------- keepers */
  {
    id: 'shouter', group: 'gk', label: 'צועק על ההגנה', tone: 'fun',
    line: n => `${n} צועק על ההגנה כל המשחק. ההגנה כבר מזמן לא שומעת.`,
    fit: keeper, signature: true,
  },
  {
    id: 'corner-rush', group: 'gk', label: 'יוצא לכל קרן', tone: 'warn',
    line: n => `${n} יוצא לכל קרן בטוח שיאגרף. בערך בחצי מהמקרים הוא מאגרף את הכדור וחצי מהמקרים זה בראש של החלוץ.`,
    fit: keeper, signature: true,
  },
  {
    id: 'penalty-guru', group: 'gk', label: 'מומחה פנדלים', tone: 'pro',
    line: n => `${n} שומר פתקים על הבועט בכל קבוצה. לפעמים זה אפילו עוזר.`,
    fit: keeper, signature: true,
  },

  /* --------------------------------------------------------------- running */
  {
    id: 'no-running', group: 'engine', label: 'לא אוהב לרוץ', tone: 'warn',
    line: n => `${n} עם כדור ברגל זה קסם. בלי כדור, עצלן גמור.`,
    tip: 'בלחץ גבוה הוא נגמר בערך בדקה 60.',
    fit: outfield,
  },
  {
    id: 'engine', group: 'engine', label: 'מנוע', tone: 'pro',
    line: n => `${n} רץ 90 דקות בלי להתלונן. גם כשכל השאר כבר מסתכלים על הספסל.`,
    fit: outfield,
  },

  /* ----------------------------------------------------------------- money */
  {
    id: 'negotiator', group: 'money', label: 'מתמקח', tone: 'warn',
    line: n => `שיחת חוזה עם ${n} לוקחת שעתיים. הוא מגיע עם אקסל.`,
  },
  {
    id: 'frugal', group: 'money', label: 'חסכן', tone: 'fun',
    line: (n, p) => `${n} עדיין נוסע באותה ${p(CARS)} משנת ${p(OLD_YEARS)}. יש לו שלוש דירות.`,
  },
  {
    id: 'crypto', group: 'money', label: 'איש קריפטו', tone: 'warn',
    line: n => `${n} הפסיד על מנייה בטוחה בקיץ. עדיין ממליץ עלייה לכל הסגל.`,
  },

  /* ----------------------------------------------------------------- quirk */
  {
    id: 'vegan', group: 'quirk', label: 'צמחוני חדש', tone: 'fun',
    line: n => `${n} הפך לצמחוני בקיץ. מסביר את זה לכל הסגל כמה זה חשוב, למרות שאף אחד לא שאל.`,
  },
  {
    id: 'chess', group: 'quirk', label: 'שחקן שחמט', tone: 'pro',
    line: n => `${n} משחק שחמט באוטובוס ומנצח את כולם. ודואג שכולם יידעו.`,
  },
  {
    id: 'weather', group: 'quirk', label: 'בודק תחזית', tone: 'fun',
    line: (n, p) => `${n} בודק את התחזית לפני כל משחק. בגשם הוא פתאום מרגיש משהו ${p(ACHES)}.`,
  },
  {
    id: 'coffee', group: 'quirk', label: 'קפה מסובך', tone: 'fun',
    line: (n, p) => `${n} מזמין ${p(COFFEES)}. הברמן בבית קפה ליד המגרש כבר יודע בעל פה.`,
  },
  {
    id: 'pet', group: 'quirk', label: 'מביא חיה', tone: 'fun',
    line: (n, p) => `${n} מביא את ${p(PETS)} לאימונים. המאמן ויתר על הקרב הזה מזמן.`,
  },

  /* --------------------------------------------------- ישראל, יום שישי */
  /* the whole league plays Friday noon, so matchday lives inside erev shabbat */
  {
    id: 'hummus-friday', group: 'food', label: 'חומוס של שישי', tone: 'fun',
    line: (n, p) => `${n} מתעקש על ${p(HUMMUS)} בבוקר שישי לפני המשחק. אומר שהגרעפסים עוזרים לו מול היריב.`,
    tip: 'כשהוא מדלג על החומוס, גם הוא מרגיש את זה במגרש.',
  },
  {
    id: 'friday-meal', group: 'family', label: 'ארוחת שישי', tone: 'heart',
    line: n => `${n} רץ הביתה ישר אחרי המשחק. אמא לא מתחילה את ארוחת שישי בלעדיו.`,
  },
  {
    id: 'shabbat', group: 'family', label: 'שומר מסורת', tone: 'heart',
    line: n => `${n} משחק בשישי בצהריים ורץ הביתה לקידוש. אף פעם לא איחר.`,
    fit: jewish,
  },
  {
    id: 'reserves', group: 'life', label: 'מילואים', tone: 'warn',
    line: n => `${n} נעלם שבועיים למילואים בדיוק באמצע העונה. חוזר בכושר של מחנה בסיס.`,
    tip: 'תבדוק מתי הצו שלו, אתה עלול להישאר בלעדיו לדרבי.',
    fit: jewish,
  },
  {
    id: 'new-baby', group: 'life', label: 'נהיה אבא', tone: 'heart',
    line: n => `ל${n} נולד ילד החודש. מגיע למשחקים עייף מת, ומחייך כל התשעים הדקות.`,
  },
  {
    id: 'wedding', group: 'life', label: 'מתחתן בקיץ', tone: 'fun',
    line: (n, p) => `${n} מתחתן בקיץ ב${p(HALLS)}. חצי מהסגל מוזמן, החצי השני מתחמק.`,
  },
  {
    id: 'day-job', group: 'work', label: 'עבודה ביום', tone: 'heart',
    line: (n, p) => `${n} עובד ${p(JOBS)} כל השבוע ומתאמן בערב. בליגה ג׳ הכדורגל לא מפרנס, הוא עושה את זה מאהבה.`,
  },
  {
    id: 'commute', group: 'work', label: 'נוסע רחוק', tone: 'warn',
    line: (n, p) => `${n} עושה שעה וחצי כביש לכל אימון מ${p(CITIES)}. מגיע, לא מתלונן, נוסע חזרה בלילה.`,
  },
  {
    id: 'aliyah', group: 'roots', label: 'עולה חדש', tone: 'fun',
    line: (n, p) => `${n} עלה מ${p(ORIGINS)}. לומד עברית מחדר ההלבשה, וזה נשמע בקללות שהוא צועק על השופט.`,
    fit: jewish,
  },
  {
    id: 'street-ball', group: 'street', label: 'כדורגל שכונה', tone: 'fun',
    line: n => `${n} עדיין משחק בטורניר השכונתי בקיץ על אספלט. פעם נקע שם את הקרסול, לא למד.`,
  },
  {
    id: 'minimarket', group: 'street', label: 'קבוצה בשכונה', tone: 'heart',
    line: n => `במכולת ליד הבית של ${n} תולים את שער השבוע שלו על הדלת. הוא מעמיד פנים שלא שם לב.`,
  },
];

const BY_ID = new Map(TRAITS.map(t => [t.id, t]));
export function getTrait(id: string): Trait | undefined { return BY_ID.get(id); }

/** Stable 32 bit hash, so the same player always gets the same personality. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The player's full preference order over the trait pool, signature traits
 * first. Deterministic, no repeats. assignTraits walks this and skips whatever
 * the rest of the squad already took.
 */
function orderedTraits(p: Player): Trait[] {
  const eligible = TRAITS.filter(t => !t.fit || t.fit(p));
  if (!eligible.length) return [];
  const seed = hash(p.id + '|' + p.name);
  const out: Trait[] = [];

  // a keeper reads like a keeper, a teenager like a teenager, most of the time
  const sig = eligible.filter(t => t.signature);
  if (sig.length && seed % 3 !== 0) out.push(sig[seed % sig.length]);

  const stride = 1 + (seed % 7) * 2;   // coprime-ish walk for spread
  let i = seed % eligible.length;
  for (let n = 0; n < eligible.length; n++) {
    const t = eligible[i % eligible.length];
    if (!out.includes(t)) out.push(t);
    i += stride;
  }
  return out;
}

/** How many traits a player carries when they carry any. One in five is simpler. */
function wantCount(p: Player): number {
  return hash(p.id + '|' + p.name) % 5 === 0 ? 1 : 2;
}

/**
 * Standalone traits for a single player, used when there is no squad context
 * (a fallback). Prefer assignTraits for anything that shows a group of players,
 * because only that path dedups and thins the weak ones.
 */
export function traitsFor(p: Player): Trait[] {
  // the same floor as the squad pass: below bronze there is no character line
  if (overall(p) < OVR_FLOOR && !legendByName(p.name)) return [];
  const ordered = orderedTraits(p);
  const want = wantCount(p);
  const picked: Trait[] = [];
  const groups = new Set<string>();
  for (const t of ordered) {
    if (picked.length >= want) break;
    if (groups.has(t.group)) continue;
    groups.add(t.group);
    picked.push(t);
  }
  return picked;
}

/**
 * A personality is earned. Plain cards stay anonymous; from
 * light bronze (copper) up every man has one. "The simple ones are simple",
 * as Itzik put it: a line of character on a 55 rated reserve made the
 * squad read as noise, and made the real characters harder to spot.
 */
const OVR_FLOOR = BRONZE_FROM;
/** Everyone above the floor. */
const COVERAGE = 1;

/**
 * Assign traits across a whole group of players at once. No trait repeats, a
 * group appears at most twice, and only the stronger ~65% get anything. Fully
 * deterministic from the player ids, so it is stable across sessions with no
 * storage. This is the path every squad, bench and market list should use.
 */
/**
  * One of the two he brought with him, as a personality.
  *
  * A friend is not handed a line from the pool for the same reason a ראש העין
  * regular is not: the line he has is the one the manager chose for him on the
  * screen where he named him, and a man cannot be both the friend who never
  * stops running and, by a roll of his id, a man who sleeps on the bus.
  */
export function isFriendTrait(t: Trait | null | undefined): boolean {
  return !!t && t.id.startsWith('friend-');
}

export function friendAsTrait(f: Friend): Trait {
  const t = friendTrait(f.trait);
  return {
    id: `friend-${f.id}`,
    group: `friend-${f.id}`,
    label: t.label,
    line: (name: string) => friendLine(t, name),
    tone: 'friend',
  };
}

export function assignTraits(players: Player[], friends: Friend[] = []): Map<string, Trait[]> {
  const map = new Map<string, Trait[]>();
  if (!players.length) return map;

  const rated = players.map(p => ({ p, o: overall(p), j: (hash(p.id) % 1000) / 1000 }));

  // who gets a personality: strong enough, then the top slice by rating
  const eligible = rated.filter(r => r.o >= OVR_FLOOR);
  const target = Math.min(eligible.length, Math.round(players.length * COVERAGE));
  const chosen = new Set(
    [...eligible].sort((a, b) => (b.o + b.j * 6) - (a.o + a.j * 6))
      .slice(0, target).map(r => r.p.id),
  );

  const usedIds = new Set<string>();
  const groupUse = new Map<string, number>();
  const bump = (g: string) => groupUse.set(g, (groupUse.get(g) ?? 0) + 1);

  // stars pick first so the marquee personalities land on players you watch
  for (const { p } of [...rated].sort((a, b) => b.o - a.o)) {
    // A ראש העין regular came with his own reputation written down. Handing him
    // a personality from the general pool would contradict the one line the
    // whole character exists for, so he keeps his.
    const own = legendByName(p.name);
    if (own) { map.set(p.id, [legendTrait(own)]); continue; }
    // and the two he brought with him keep the quality he gave them
    const mate = friends.find(f => f.id === p.id && !f.sold);
    if (mate) { map.set(p.id, [friendAsTrait(mate)]); continue; }
    if (!chosen.has(p.id)) { map.set(p.id, []); continue; }

    const ordered = orderedTraits(p);
    const want = wantCount(p);
    const picked: Trait[] = [];
    const localGroups = new Set<string>();

    // pass 1, keep groups spread across the squad
    for (const t of ordered) {
      if (picked.length >= want) break;
      if (usedIds.has(t.id) || localGroups.has(t.group)) continue;
      if ((groupUse.get(t.group) ?? 0) >= 2) continue;
      picked.push(t); localGroups.add(t.group);
    }
    // pass 2, relax the group cap but still never repeat a trait
    if (picked.length < want) {
      for (const t of ordered) {
        if (picked.length >= want) break;
        if (usedIds.has(t.id) || localGroups.has(t.group)) continue;
        picked.push(t); localGroups.add(t.group);
      }
    }

    for (const t of picked) { usedIds.add(t.id); bump(t.group); }
    map.set(p.id, picked);
  }
  return map;
}

/** The finished dressing room line for a player, with their slots filled in. */
export function renderLine(t: Trait, p: Player): string {
  return t.line(p.name, makePicker(hash(p.id + '|' + t.id)));
}

/** The single trait that best introduces this player, or null. */
export function headlineTrait(p: Player): Trait | null {
  return traitsFor(p)[0] ?? null;
}

export const TONE_COLOR: Record<Tone, string> = {
  fun: 'var(--gold)',
  warn: 'var(--loss)',
  heart: 'var(--win)',
  pro: 'var(--sky)',
  // the club's own colour, because he is not a type of player, he is yours
  friend: 'var(--club)',
};

/* --------------------------------------------------------- the regulars */

/**
 * A ראש העין regular's own reputation, as a trait.
 *
 * Everybody else's personality is drawn from the shared pool and shuffled so
 * two squads never read alike. These ten arrived with theirs already written,
 * and it is the reason each of them is in the game, so it is pinned rather than
 * rolled.
 */
export function legendTrait(l: Legend): Trait {
  return {
    id: `legend-${l.key}`,
    group: `legend-${l.key}`,
    label: l.label,
    line: () => l.says,
    tone: l.tone,
  };
}
