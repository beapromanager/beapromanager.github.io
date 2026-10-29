/**
 * Names that left the game, carried forward in a career saved before they left.
 *
 * 29.10.2026: the ראש העין regulars were given invented names. A career saved
 * before that still has the old ones inside it, on the man in the squad, on
 * his season line and in the news that mentions him. Left alone, the game
 * would no longer know him as a regular and would bring a second one in.
 *
 * The old names are not written here. Only a hash of each one is kept, so the
 * names that were taken out of the game stay out of its code too.
 *
 * The same day the clubs of the towns got invented words in front of the
 * town (see `Prefix` in cities.ts). Those are not people, so the old club
 * names are written out below in plain text.
 *
 * Never renamed: what the manager typed himself. His own name and nickname,
 * and the friends he brought in, are his, even if one of them happens to share
 * a name with somebody who used to be in the game.
 */

import { CITIES } from '../data/cities.ts';

/* ------------------------------------------------------------- the clubs */

/**
 * 29.10.2026: the word in front of the town changed, one for one, so a town's
 * club keeps its colours, crest and id and only its name moves. A save made
 * before that carries the old names in its tables, its cup, its history and
 * its news.
 */
const OLD_PREFIX: Record<string, string> = {
  'מ.ס': 'סער', 'הפועל': 'רעם', 'מכבי': 'להב', 'בני': 'ברק', 'צעירי': 'אופק',
  'איחוד': 'נחשול', 'הכוח': 'זוהר', 'עירוני': 'גל', 'בית"ר': 'שחף',
};
/** the hand picked names that did not follow "word + town" */
const OLD_EXACT: [string, string][] = [
  ['צעירי ב"ש', 'אופק ב"ש'],
  ['מכבי שעריים', 'להב רחובות'],
  ["בני סח'נין", 'ברק סחנין'],
  ['מועדון סביליה', 'סביליה האנדלוסית'],
  ['מועדון קייב', 'קייב הדנייפרית'],
];
/** short names that changed on their own, by town */
const OLD_SHORT: Record<string, [string, string]> = {
  'רחובות': ['שעריים', 'רחובות'],
  'סחנין': ["סח'נין", 'סחנין'],
};
const OLD_EURO_SHORT: Record<string, string> = { 'מועדון סביליה': 'סביליה', 'מועדון קייב': 'קייב' };

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let clubRx: RegExp | null = null;
function clubRegex(): RegExp {
  if (clubRx) return clubRx;
  const towns = CITIES.map(c => c.name).sort((a, b) => b.length - a.length).map(esc);
  const pre = Object.keys(OLD_PREFIX).map(esc);
  // an optional one or two letter Hebrew prefix (ו, ב, ל, מ, ש, ה, כ) may sit on the word
  clubRx = new RegExp(`(?<![\\p{L}"'.])([ובלמשהכ]{0,2})(${pre.join('|')}) (${towns.join('|')})(?![\\p{L}])`, 'gu');
  return clubRx;
}
const ANY_OLD = /מ\.ס|הפועל|מכבי|בני|צעירי|איחוד|הכוח|עירוני|בית"ר|מועדון/;

function renameClubsInText(s: string): string {
  if (!ANY_OLD.test(s)) return s;
  let out = s;
  for (const [a, b] of OLD_EXACT) if (out.includes(a)) out = out.split(a).join(b);
  return out.replace(clubRegex(), (_m, lead: string, p: string, town: string) => `${lead}${OLD_PREFIX[p]} ${town}`);
}

/** the same small FNV-1a hash the club ids use */
export function nameHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** hash of an old full name, and the name that replaced it */
const LEGEND_NAMES = new Map<number, string>([
  [0xa3e34053, 'דורון שקדי'],
  [0xf37aa6d5, 'אופיר נחמני'],
  [0xa7373953, 'אלעד צוריאלי'],
  [0x677c8195, 'מתן ברגיל'],
  [0x5f36c4ab, 'יואב קרני'],
  [0x7505a252, 'שגב מדמוני'],
  [0xad559ff8, 'גיל תמרי'],
  [0x14e3cdd6, 'נוי שלוש'],
  [0x9be44dd4, 'אסף ליבוביץ'],
  [0xe6c35e70, 'צחי עזרן'],
]);

/** hash of an old key, and the key that replaced it (a trait id is `legend-<key>`) */
const LEGEND_KEYS = new Map<number, string>([
  [0x4219d1fd, 'doron-shkedi'],
  [0x3978aa54, 'ofir-nahmani'],
  [0xc389a13b, 'elad-tzurieli'],
  [0xc86ce730, 'matan-bargil'],
  [0x3b56cae6, 'yoav-karni'],
  [0xf5671bd6, 'segev-madmoni'],
  [0x6fe65375, 'gil-tamari'],
  [0xf0c5818e, 'noy-shalosh'],
  [0x6dd931ed, 'asaf-leibovitz'],
  [0x8c047824, 'tzahi-azran'],
]);

/** bump when a new set of renames is added, so a save is walked once per set */
export const NAMES_VERSION = 1;

interface Ctx {
  /** names the manager typed, never touched */
  keep: Set<string>;
  /** player ids of his friends, never renamed */
  friendIds: Set<string>;
  names: Map<number, string>;
  keys: Map<number, string>;
}

const WORD = /[\p{L}\p{M}]+/gu;

/** every "first last" pair in a line of text that used to be one of them */
function renameInText(s: string, ctx: Ctx): string {
  if (s.length > 4000 || s.indexOf(' ') < 0) return s;
  const words = [...s.matchAll(WORD)];
  if (words.length < 2) return s;
  let out = '', at = 0;
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i], b = words[i + 1];
    const ai = a.index!, bi = b.index!;
    if (ai < at || bi !== ai + a[0].length + 1 || s[ai + a[0].length] !== ' ') continue;
    // a Hebrew word can carry a prefix of one or two letters: ו, ב, ל, מ, ש, ה, כ (ול, וב, שב...)
    let lead = '', first = a[0];
    let next = ctx.names.get(nameHash(`${first} ${b[0]}`));
    while (!next && lead.length < 2 && first.length > 2 && 'ובלמשהכ'.includes(first[0])) {
      lead += first[0]; first = first.slice(1);
      next = ctx.names.get(nameHash(`${first} ${b[0]}`));
    }
    if (!next || ctx.keep.has(`${first} ${b[0]}`)) continue;
    out += s.slice(at, ai) + lead + next;
    at = bi + b[0].length;
    i++;
  }
  return at ? out + s.slice(at) : s;
}

function renameKey(s: string, ctx: Ctx): string {
  if (s.startsWith('legend-')) {
    const k = ctx.keys.get(nameHash(s.slice(7)));
    return k ? `legend-${k}` : s;
  }
  return ctx.keys.get(nameHash(s)) ?? s;
}

function renameString(s: string, ctx: Ctx): string {
  if (!s) return s;
  if (/^[a-z-]+$/.test(s)) return renameKey(s, ctx);
  return renameClubsInText(renameInText(s, ctx));
}

/** walk the save in place: it is a fresh JSON parse, nobody else holds it */
function walk(v: unknown, ctx: Ctx, depth: number): unknown {
  if (typeof v === 'string') return renameString(v, ctx);
  if (!v || typeof v !== 'object' || depth > 40) return v;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = walk(v[i], ctx, depth + 1);
    return v;
  }
  const o = v as Record<string, unknown>;
  // a friend of his keeps the name he was given, whatever it is
  if (typeof o.id === 'string' && ctx.friendIds.has(o.id)) return v;
  // a club whose short name changed on its own
  if (typeof o.short === 'string' && typeof o.city === 'string') {
    const sh = OLD_SHORT[o.city];
    if (sh && o.short === sh[0]) o.short = sh[1];
    const eu = OLD_EURO_SHORT[o.short as string];
    if (eu) o.short = eu;
  }
  for (const k of Object.keys(o)) {
    const nk = renameString(k, ctx);
    const nv = walk(o[k], ctx, depth + 1);
    if (nk !== k) { delete o[k]; o[nk] = nv; } else o[k] = nv;
  }
  return v;
}

/**
 * Bring an old save's names up to date. Cheap to call: a save that has been
 * through it once carries `namesVersion` and is handed straight back.
 */
export function renameLegacy<T extends object>(state: T): T {
  return renameWith(state, LEGEND_NAMES, LEGEND_KEYS);
}

/** the same walk with any table of hashed names, which is how the check tests it without the old names */
export function renameWith<T extends object>(state: T, names: Map<number, string>, keys: Map<number, string>): T {
  const s = state as T & {
    namesVersion?: number;
    profile?: { name?: string; nickname?: string };
    friends?: { id?: string; name?: string }[];
  };
  if ((s.namesVersion ?? 0) >= NAMES_VERSION) return state;
  const keep = new Set<string>();
  for (const n of [s.profile?.name, s.profile?.nickname]) if (n) keep.add(n.trim().replace(/\s+/g, ' '));
  const friendIds = new Set<string>();
  for (const f of s.friends ?? []) {
    if (f?.id) friendIds.add(f.id);
    if (f?.name) keep.add(f.name.trim());
  }
  const ctx: Ctx = { keep, friendIds, names, keys };
  for (const k of Object.keys(s)) {
    if (k === 'profile' || k === 'friends') continue;
    (s as Record<string, unknown>)[k] = walk((s as Record<string, unknown>)[k], ctx, 0);
  }
  s.namesVersion = NAMES_VERSION;
  return state;
}
