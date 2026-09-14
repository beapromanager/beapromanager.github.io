/**
 * The timeline. A football club does not live in a menu, it lives in the noise
 * around it: what the local reporter filed, what the fan page is shouting, who
 * the rumour mill has linked with your best player, and how the rest of the
 * round went.
 *
 * Every post is generated from the live save, so nothing here is filler. If it
 * says your striker has not scored in four, he really has not.
 */
import type { Player } from '../engine/matchEngine.ts';
import { surnameOf } from './names.ts';
import { overall } from '../engine/matchEngine.ts';
import type { Rng } from '../engine/matchEngine.ts';

export type PostKind = 'club' | 'press' | 'fan' | 'rumour' | 'league';

export interface Post {
  id: string;
  author: string;
  handle: string;
  kind: PostKind;
  /** official accounts get the tick */
  verified: boolean;
  text: string;
  /** how long ago, already worded */
  when: string;
  likes: number;
}

/** The accounts that post about your club. */
const PRESS_ACCOUNTS = [
  { author: 'ספורט WOW', handle: '@sportwow' },
  { author: 'Yספורט', handle: '@ysport' },
  { author: 'ספורט 555', handle: '@sport555' },
];
const FAN_ACCOUNTS = [
  { author: 'היציע המזרחי', handle: '@mizrahi_stand' },
  { author: 'אולטראס', handle: '@ultras' },
  { author: 'חשבון האוהדים', handle: '@fanpage' },
];
const RUMOUR_ACCOUNTS = [
  { author: 'שמועות העברות', handle: '@transfers_il' },
  { author: 'מבית הסוכנים', handle: '@agentroom' },
];

const WHEN = ['הרגע', 'לפני 12 דקות', 'לפני שעה', 'לפני שעתיים', 'אתמול'];

const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)];
const surname = surnameOf;

export interface FeedContext {
  clubName: string;
  clubShort: string;
  city: string;
  league: string;
  /** table position and how many teams */
  pos: number;
  teams: number;
  /** most recent results, newest last */
  form: ('W' | 'D' | 'L')[];
  /** our last match, if one has been played */
  last: { opponent: string; mine: number; theirs: number; isDerby: boolean } | null;
  /** other results from the round just played */
  otherResults: { home: string; away: string; hg: number; ag: number }[];
  /** our leading scorer this season, if anyone has scored */
  topScorer: { name: string; goals: number } | null;
  /** a forward in a drought */
  coldStriker: { name: string; weeks: number } | null;
  /** the best young player in the squad */
  youngster: Player | null;
  /** our best player, the one bigger clubs would want */
  star: Player | null;
  /** a name from the open market worth linking us with */
  marketTarget: Player | null;
  /** the derby rival */
  rival: string | null;
}

/**
 * Build the timeline. Deterministic for a given rng, so it stays put across
 * re-renders of the same week instead of reshuffling under the reader.
 */
export function buildFeed(c: FeedContext, rng: Rng): Post[] {
  const out: Post[] = [];
  let n = 0;
  const add = (p: Omit<Post, 'id' | 'when' | 'likes'>) => {
    out.push({
      ...p,
      id: `p${n++}`,
      when: WHEN[Math.min(WHEN.length - 1, out.length)],
      likes: 8 + Math.floor(rng() * 900),
    });
  };

  /* --- our last match, the loudest thing on the timeline --- */
  if (c.last) {
    const { opponent, mine, theirs, isDerby } = c.last;
    const won = mine > theirs, drew = mine === theirs;
    const press = pick(rng, PRESS_ACCOUNTS);
    add({
      kind: 'press', author: press.author, handle: press.handle, verified: true,
      text: won
        ? `${c.clubShort} ${mine}:${theirs} ${opponent}. ${isDerby ? 'הדרבי נשאר בבית. ' : ''}שלוש נקודות ועלייה בטבלה.`
        : drew
          ? `${c.clubShort} ${mine}:${theirs} ${opponent}. נקודה, וטעם של החמצה.`
          : `${opponent} ${theirs}:${mine} ${c.clubShort}. ${isDerby ? 'הדרבי הלך. ' : ''}עוד ערב שכדאי לשכוח.`,
    });

    const fan = pick(rng, FAN_ACCOUNTS);
    add({
      kind: 'fan', author: fan.author, handle: fan.handle, verified: false,
      text: won
        ? (isDerby
          ? `לא ישנים הלילה. הדרבי שלנו!! 🔥 כל ${c.city} ברחובות`
          : `ככה זה כשמשחקים עם לב. קדימה ${c.clubShort}! 💚`)
        : drew
          ? `נקודה בחוץ זה לא אסון, אבל אנחנו רוצים יותר. עוד נהיה שם.`
          : `מספיק תירוצים. בואו נראה תגובה במחזור הבא, אנחנו באים בהמונים בכל מקרה.`,
    });
  }

  /* --- the scorer everyone is talking about --- */
  if (c.topScorer && c.topScorer.goals > 0) {
    const press = pick(rng, PRESS_ACCOUNTS);
    add({
      kind: 'press', author: press.author, handle: press.handle, verified: true,
      text: `${c.topScorer.goals} שערים העונה ל${surname(c.topScorer.name)}. בקצב הזה הוא מסיים בצמרת מלך השערים של ${c.league}.`,
    });
  }

  /* --- the striker who cannot buy one --- */
  if (c.coldStriker && c.coldStriker.weeks >= 3) {
    const fan = pick(rng, FAN_ACCOUNTS);
    add({
      kind: 'fan', author: fan.author, handle: fan.handle, verified: false,
      text: `${surname(c.coldStriker.name)} כבר ${c.coldStriker.weeks} מחזורים בלי שער. אני עדיין מאמין בו, אבל צריך לתת לו מנוחה או ביטחון.`,
    });
  }

  /* --- the rumour mill, the part everyone reads first --- */
  if (c.star) {
    const rum = pick(rng, RUMOUR_ACCOUNTS);
    const suitors = ['קבוצה מהליגה שמעל', 'מועדון מהצפון', 'קבוצה מהמרכז', 'מועדון עשיר מהדרום'];
    add({
      kind: 'rumour', author: rum.author, handle: rum.handle, verified: false,
      text: `🔴 שמועה: ${pick(rng, suitors)} שלחה צופים לראות את ${surname(c.star.name)} (${overall(c.star)}) מ${c.clubShort}. בינתיים אין הצעה רשמית.`,
    });
  }
  if (c.marketTarget) {
    const rum = pick(rng, RUMOUR_ACCOUNTS);
    add({
      kind: 'rumour', author: rum.author, handle: rum.handle, verified: false,
      text: `מדברים על ${surname(c.marketTarget.name)} (${overall(c.marketTarget)}), חופשי, ו${c.clubShort} מוזכרת בין המתעניינות. לא נסגר כלום.`,
    });
  }

  /* --- the kid --- */
  if (c.youngster) {
    add({
      kind: 'club', author: c.clubName, handle: `@${c.clubShort.replace(/\s/g, '')}`, verified: true,
      text: `הצעיר שלנו ${surname(c.youngster.name)}, בן ${c.youngster.age}, ממשיך לעבוד קשה באימונים. גאים בו ובכל מי שעולה מהנוער שלנו. 💚`,
    });
  }

  /* --- the rest of the round --- */
  if (c.otherResults.length) {
    const lines = c.otherResults.slice(0, 4).map(m => `${m.home} ${m.hg}:${m.ag} ${m.away}`).join('\n');
    add({
      kind: 'league', author: `${c.league}`, handle: '@league_il', verified: true,
      text: `תוצאות המחזור:\n${lines}`,
    });
  }

  /* --- where we stand --- */
  const streak = c.form.slice(-3);
  if (streak.length >= 3) {
    const allW = streak.every(f => f === 'W');
    const allL = streak.every(f => f === 'L');
    if (allW || allL) {
      const press = pick(rng, PRESS_ACCOUNTS);
      add({
        kind: 'press', author: press.author, handle: press.handle, verified: true,
        text: allW
          ? `שלושה ניצחונות ברצף ל${c.clubShort}. מקום ${c.pos} מתוך ${c.teams}, ופתאום מדברים עליהם אחרת.`
          : `שלושה הפסדים ברצף ל${c.clubShort}. מקום ${c.pos} מתוך ${c.teams}, והלחץ על המאמן מתחיל.`,
      });
    }
  }

  /* --- the derby is coming --- */
  if (c.rival) {
    const fan = pick(rng, FAN_ACCOUNTS);
    add({
      kind: 'fan', author: fan.author, handle: fan.handle, verified: false,
      text: `אני לא סופר את שאר המשחקים. יש רק אחד שחשוב, ו${c.rival} יודעים בדיוק על מה אני מדבר. 👀`,
    });
  }

  return out;
}
