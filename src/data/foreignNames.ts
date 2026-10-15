/**
 * The foreign players (Itzik, 15.10): "a Brazilian cannot be called שחר כהן". A foreigner has the name of his own country,
 * first name and family name together from one bank (as the Israeli pools are never mixed), and the squad screen says where
 * he is from. Names are written in the Hebrew the sports pages use. Each bank holds enough of both for a long career.
 */
import type { Player, Rng } from '../engine/matchEngine.ts';
import { createRng, playerSeed } from '../engine/matchEngine.ts';

export interface Nation {
  id: string;
  /** "ברזילאי": how the card says it */
  adj: string;
  /** the country, in the sentence "בא מ..." */
  country: string;
  /** how often a foreigner in an Israeli club comes from there */
  weight: number;
  first: string[];
  last: string[];
}

export const NATIONS: Nation[] = [
  { id: 'brazil', adj: 'ברזילאי', country: 'ברזיל', weight: 10,
    first: ['לוקאס', 'גבריאל', 'רפאל', 'מתאוס', 'ברונו', 'פליפה', 'תיאגו', 'רודריגו', 'דייגו', 'גוסטבו', 'אנדרה', 'קאיו', 'וויטור', 'הנריקה', 'ז׳ואאו', 'פדרו', 'לאונרדו', 'דאניאל', 'מרסלו', 'אדריאנו', 'קליטון', 'ריקרדו', 'פבלו', 'לוקה'],
    last: ['סילבה', 'סנטוס', 'אוליביירה', 'סוזה', 'פריירה', 'קוסטה', 'רודריגז', 'אלמיידה', 'נסימנטו', 'ליימה', 'גומס', 'מרטינס', 'קרבאליו', 'ריביירו', 'בארוס', 'מונטיירו', 'קרדוזו', 'טיישיירה', 'מורייה', 'פרנסה', 'דה סוזה', 'דוס סנטוס', 'מנדס', 'קמפוס'] },
  { id: 'argentina', adj: 'ארגנטינאי', country: 'ארגנטינה', weight: 6,
    first: ['חואן', 'מרטין', 'ניקולאס', 'פדריקו', 'לוציאנו', 'פרנסיסקו', 'סבסטיאן', 'מתיאס', 'אגוסטין', 'גונסלו', 'פבלו', 'סרחיו', 'לאוטארו', 'אמיליאנו', 'קלאודיו', 'רמירו', 'ארנאן', 'ליאנדרו', 'תומאס', 'גרמן'],
    last: ['גונסלס', 'רודריגז', 'פרננדס', 'לופז', 'מרטינס', 'גרסיה', 'פרס', 'סאנצ׳ס', 'רומרו', 'דיאס', 'אלווארס', 'טורס', 'רמירס', 'פלורס', 'אקוסטה', 'בנטז', 'מדינה', 'הררה', 'סוארס', 'מולינה'] },
  { id: 'nigeria', adj: 'ניגרי', country: 'ניגריה', weight: 7,
    first: ['אמקה', 'צ׳ידי', 'אוסימן', 'קלצ׳י', 'ויקטור', 'סמואל', 'איסאק', 'אמנואל', 'דניאל', 'מיכאל', 'אולה', 'טוניה', 'צ׳ינדו', 'סאני', 'אדמולה', 'קינגסלי'],
    last: ['אוקפור', 'אוגבו', 'אוסימהן', 'איהאנאצ׳ו', 'אדמולה', 'אוקונקוו', 'נוונקו', 'אייווה', 'אבודו', 'אובי', 'אוסייפי', 'אולאיינקה', 'אזובואיקה', 'אוקוצ׳ה', 'אדיאו', 'אקפופו'] },
  { id: 'ghana', adj: 'גאני', country: 'גאנה', weight: 4,
    first: ['קוואסי', 'קופי', 'קוואדו', 'אברהם', 'אנדרה', 'תומאס', 'מוחמד', 'דניאל', 'בנג׳מין', 'ג׳ורדן', 'סמואל', 'אמנואל', 'אלפרד', 'קווסי'],
    last: ['אסנטה', 'אמואה', 'בואטנג', 'מנסה', 'אפיאה', 'אכוסה', 'דאפור', 'אסמואה', 'אטסו', 'פרמפונג', 'קורנגי', 'אפונג', 'אדומה', 'אמרטיי'] },
  { id: 'serbia', adj: 'סרבי', country: 'סרביה', weight: 5,
    first: ['מילוש', 'נמניה', 'סרגיי', 'דושאן', 'ניקולה', 'מרקו', 'לזר', 'אלכסנדר', 'ולדימיר', 'סטפן', 'דרגן', 'ליובה', 'אוגניין', 'פיליפ'],
    last: ['יובאנוביץ׳', 'פטרוביץ׳', 'מיטרוביץ׳', 'מילינקוביץ׳', 'ווצ׳יץ׳', 'נוביץ׳', 'סטנקוביץ׳', 'איליץ׳', 'מרקוביץ׳', 'טדיץ׳', 'קוסטיץ׳', 'ראדוביץ׳', 'סימיץ׳', 'ג׳ורג׳ביץ׳'] },
  { id: 'spain', adj: 'ספרדי', country: 'ספרד', weight: 3,
    first: ['חאבייר', 'אלברטו', 'פרננדו', 'אלווארו', 'דניאל', 'ראול', 'ויקטור', 'סרחיו', 'איקר', 'מיגל', 'אדריאן', 'חורחה'],
    last: ['גרסיה', 'מרטינס', 'לופז', 'סאנצ׳ס', 'רודריגס', 'פרננדס', 'גומס', 'דיאס', 'רואיס', 'חימנס', 'מורנו', 'אלונסו'] },
  { id: 'portugal', adj: 'פורטוגלי', country: 'פורטוגל', weight: 3,
    first: ['טיאגו', 'ז׳ואאו', 'ברונו', 'רוי', 'נונו', 'דיוגו', 'פדרו', 'ריקרדו', 'אנדרה', 'מיגל', 'פלביו', 'רובן'],
    last: ['סילבה', 'פרננדס', 'סנטוס', 'פריירה', 'קוסטה', 'אוליביירה', 'רודריגס', 'מרטינס', 'גומס', 'קרבאליו', 'אלבס', 'מנדס'] },
  { id: 'netherlands', adj: 'הולנדי', country: 'הולנד', weight: 3,
    first: ['ארן', 'יאפ', 'בס', 'ריק', 'ניק', 'לוק', 'טים', 'דאן', 'סם', 'מאטס', 'ג׳ורדי', 'רולף', 'יורן', 'טום'],
    last: ['דה ביק', 'מולדר', 'ווינקל', 'יאנסן', 'ברוינס', 'הנדריקס', 'קויפרס', 'ויסר', 'סמיט', 'בוס', 'פיטרס', 'קלאסן', 'ואן ליינדן', 'דה גראף'] },
];

const BY_ID = new Map(NATIONS.map(n => [n.id, n]));

export function nationOf(id: string | undefined): Nation | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** "ברזילאי", or nothing for a player born in Israel (every player from before this existed). */
export function nationLabel(id: string | undefined): string {
  return nationOf(id)?.adj ?? '';
}

/** A country for a foreigner, by how common it is in an Israeli club. */
export function pickNation(rng: Rng): Nation {
  const total = NATIONS.reduce((s, n) => s + n.weight, 0);
  let r = rng() * total;
  for (const n of NATIONS) { r -= n.weight; if (r <= 0) return n; }
  return NATIONS[0];
}

/** A first name and a family name, both from this country's bank. */
export function makeForeignName(rng: Rng, nationId: string, used?: Set<string>): string {
  const n = nationOf(nationId) ?? NATIONS[0];
  let name = '';
  for (let i = 0; i < 40; i++) {
    name = `${n.first[Math.floor(rng() * n.first.length)]} ${n.last[Math.floor(rng() * n.last.length)]}`;
    if (!used || !used.has(name)) break;
  }
  used?.add(name);
  return name;
}

/* ---------------------------------------------------------------- who is foreign, and how many */

/** Foreigners play from the Leumit up (Itzik, 15.10); below it a club is its town's own. */
export const FOREIGN_FROM_TIER = 4;
/** No club holds more than three. */
export const FOREIGN_MAX = 3;

export const isForeign = (p: { nation?: string }): boolean => !!p.nation;
export const foreignCount = (players: { nation?: string }[]): number => players.filter(isForeign).length;

/** Make a man a foreigner of that country: his name changes to his own country's, the rest of him stays. */
export function toForeign(p: Player, nationId: string, rng: Rng, used?: Set<string>): Player {
  used?.delete(p.name);
  p.nation = nationId;
  p.name = makeForeignName(rng, nationId, used);
  p.seed = playerSeed(p.name, p.position, p.age, p.attrs);
  return p;
}

/** A number that is the same for the same name, so a foreigner is a fact of the man and costs no draw from any stream. */
function nameHash(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Some of the men the market, the packs and the scout bring are foreigners, in the divisions where clubs have them. It is
 * decided by the man's own name, so nothing the game rolls moves with it.
 */
export function maybeForeign(p: Player, tier: number, used?: Set<string>, percent = 25): Player {
  if (tier < FOREIGN_FROM_TIER || p.nation || nameHash(p.name) % 100 >= percent) return p;
  const rng = createRng(nameHash(p.name) ^ 0x9e3779b9);
  return toForeign(p, pickNation(rng).id, rng, used);
}

/**
 * A club's own foreigners: none to three, never a man the caller marks as staying home (a legend). Drawn from a stream of
 * its own, so the league's squads and fixtures come out as they did.
 */
export function foreignizeSquad(sq: { starters: Player[]; bench: Player[] }, rng: Rng, stays: (p: Player) => boolean): void {
  const all = [...sq.starters, ...sq.bench];
  const used = new Set(all.map(p => p.name));
  const r = rng();
  const n = r < 0.2 ? 0 : r < 0.5 ? 1 : r < 0.8 ? 2 : FOREIGN_MAX;
  const pool = all.filter(p => !p.nation && !stays(p));
  for (let i = 0; i < n && pool.length; i++) {
    const j = Math.floor(rng() * pool.length);
    const [p] = pool.splice(j, 1);
    toForeign(p, pickNation(rng).id, rng, used);
  }
}
