/**
 * The twenty clubs of ליגת אירופה.
 *
 * Itzik's rule of 6.10: a pool of twenty, sixteen drawn each season, so the
 * four left out come round in later seasons and no two seasons read alike.
 * His eight are first (his names, his countries); the twelve after them are
 * ours. Every name is invented around a real city, none is a real club's
 * name, kit or crest, which is what the game's footer promises.
 *
 * Crests are drawn by the same component as the Israeli clubs, from a shape,
 * a pattern and three colours, so no two of the twenty look alike and none
 * wears a combination a real club is known by (the check holds that).
 *
 * That last rule is for these twenty only, the ליגת אירופה pool (level 0).
 * The twenty of פסגת אירופה further down (level 1) wear colours that hint at
 * the great clubs they stand for: Itzik's decision of 31.10.2026. Their names
 * are still invented, and no crest copies a real one.
 */

import type { Club, CrestShape, CrestPattern } from './clubs.ts';
import { NEUTRAL_TRAITS } from './squadGen.ts';

export interface EuroClub {
  /** eu- for ליגת אירופה, eu2- for פסגת אירופה */
  id: string;
  name: string;
  /** the short form the boards and the draw use */
  short: string;
  city: string;
  country: string;
  primary: string;
  secondary: string;
  accent: string;
  shape: CrestShape;
  pattern: CrestPattern;
}

export const EURO_CLUBS: EuroClub[] = [
  /* ------------------------------------------------------ Itzik's eight */
  { id: 'eu-belgrade', name: 'רד בלגרד', short: 'רד בלגרד', city: 'בלגרד', country: 'סרביה',
    primary: '#8E1B2A', secondary: '#20262C', accent: '#F6E3A1', shape: 'shield', pattern: 'chevron' },
  // The id is historical: this was ר.ב אמסטרדם until Itzik made it קייב הכחולה on 31.10.2026. An id sits in saves, in
  // a competition half played and in the chronicle, so the id stays and only the club behind it changed (renames.ts).
  { id: 'eu-amsterdam', name: 'קייב הכחולה', short: 'קייב הכחולה', city: 'קייב', country: 'אוקראינה',
    primary: '#2559C7', secondary: '#F2C94C', accent: '#F5F7FA', shape: 'round', pattern: 'half' },
  { id: 'eu-athens', name: 'אתלטיק אתונה', short: 'אתלטיק אתונה', city: 'אתונה', country: 'יוון',
    primary: '#0F7B6C', secondary: '#F3EDE0', accent: '#F3EDE0', shape: 'diamond', pattern: 'sash' },
  { id: 'eu-glasgow', name: 'בלוז גלזגו', short: 'בלוז גלזגו', city: 'גלזגו', country: 'סקוטלנד',
    primary: '#14213D', secondary: '#C9D4E6', accent: '#FFFFFF', shape: 'shield', pattern: 'sash' },
  { id: 'eu-sevilla', name: 'סביליה האנדלוסית', short: 'סביליה', city: 'סביליה', country: 'ספרד',
    primary: '#E07B1F', secondary: '#1B2A3A', accent: '#FFF4E0', shape: 'round', pattern: 'chevron' },
  { id: 'eu-basel', name: 'בית באזל', short: 'בית באזל', city: 'באזל', country: 'שוויץ',
    primary: '#6B2D8C', secondary: '#D9D2E6', accent: '#FFFFFF', shape: 'shield', pattern: 'stripes' },
  { id: 'eu-kyiv', name: 'קייב הדנייפרית', short: 'קייב', city: 'קייב', country: 'אוקראינה',
    primary: '#00838F', secondary: '#12303A', accent: '#E0F7FA', shape: 'shield', pattern: 'half' },
  { id: 'eu-rome', name: 'רומא האיטלקית', short: 'רומא האיטלקית', city: 'רומא', country: 'איטליה',
    primary: '#5B1E3D', secondary: '#D4A017', accent: '#FFF1C9', shape: 'diamond', pattern: 'stripes' },
  /* ------------------------------------------------------------ our twelve */
  { id: 'eu-lisbon', name: 'ליסבון אטלנטיק', short: 'ליסבון אטלנטיק', city: 'ליסבון', country: 'פורטוגל',
    primary: '#2E7D32', secondary: '#E8F0D8', accent: '#FFFFFF', shape: 'diamond', pattern: 'half' },
  { id: 'eu-istanbul', name: 'בוספורוס איסטנבול', short: 'בוספורוס', city: 'איסטנבול', country: 'טורקיה',
    primary: '#8A9A1B', secondary: '#1F2A1A', accent: '#F5F1D0', shape: 'round', pattern: 'stripes' },
  { id: 'eu-prague', name: 'פראג הזהובה', short: 'פראג הזהובה', city: 'פראג', country: "צ'כיה",
    primary: '#C2185B', secondary: '#F4E4EC', accent: '#FFFFFF', shape: 'diamond', pattern: 'chevron' },
  { id: 'eu-copenhagen', name: 'קופנהגן הוויקינגית', short: 'קופנהגן', city: 'קופנהגן', country: 'דנמרק',
    primary: '#7B3F1D', secondary: '#F0D9B5', accent: '#FFF3DA', shape: 'round', pattern: 'sash' },
  { id: 'eu-hamburg', name: 'האמבורג הנמלית', short: 'האמבורג', city: 'האמבורג', country: 'גרמניה',
    primary: '#3D4A5C', secondary: '#9FB3C8', accent: '#FFFFFF', shape: 'shield', pattern: 'solid' },
  { id: 'eu-marseille', name: 'מרסיי הדרומית', short: 'מרסיי', city: 'מרסיי', country: 'צרפת',
    primary: '#B8512E', secondary: '#F2D9C4', accent: '#FFFFFF', shape: 'diamond', pattern: 'solid' },
  { id: 'eu-stockholm', name: 'שטוקהולם הצפונית', short: 'שטוקהולם', city: 'שטוקהולם', country: 'שוודיה',
    primary: '#C94B6D', secondary: '#2A1F33', accent: '#FFE8EE', shape: 'round', pattern: 'solid' },
  { id: 'eu-vienna', name: 'וינה הקיסרית', short: 'וינה', city: 'וינה', country: 'אוסטריה',
    primary: '#B08D2F', secondary: '#263238', accent: '#FFF6D5', shape: 'round', pattern: 'half' },
  { id: 'eu-bucharest', name: 'בוקרשט הכחולה', short: 'בוקרשט', city: 'בוקרשט', country: 'רומניה',
    primary: '#1F4E9C', secondary: '#F2C94C', accent: '#FFFFFF', shape: 'diamond', pattern: 'sash' },
  { id: 'eu-budapest', name: 'בודפשט הדנובית', short: 'בודפשט', city: 'בודפשט', country: 'הונגריה',
    primary: '#2F6B4F', secondary: '#C9A227', accent: '#FFF6D5', shape: 'shield', pattern: 'chevron' },
  { id: 'eu-brussels', name: 'בריסל הסגולה', short: 'בריסל', city: 'בריסל', country: 'בלגיה',
    primary: '#4A2C7A', secondary: '#F0A202', accent: '#FFFFFF', shape: 'round', pattern: 'chevron' },
  { id: 'eu-cardiff', name: 'קרדיף הדרקונית', short: 'קרדיף', city: 'קרדיף', country: 'וויילס',
    primary: '#A4161A', secondary: '#1B4332', accent: '#F8F0E3', shape: 'diamond', pattern: 'half' },
];

/**
 * פסגת אירופה, the top European tier (level 1): Itzik's twenty of 31.10.2026, the names word for word
 * (europe_tier2_names_LOCKED.md). The colours hint at the club each one stands for; shape and pattern keep every one
 * of the forty crests its own. The rating sets how strong a club plays (euro.ts), the ground is invented, and the
 * flares are the two colours its end burns, lifted to gold or white where a colour is too dark to read as fire.
 */
/**
 * The small gold drawing a summit crest carries instead of two letters (Itzik, 8.11.2026). Each one points at the
 * club's city, never at the real club's own mark: no crown, eagle, lion, dragon, serpent, zebra, bull, devil, cannon,
 * tower of Paris, lily or clover (summit-check holds the list). Drawn in code (Crest), never a picture.
 */
export type SummitEmblem =
  | 'star8' | 'swords' | 'lighthouse' | 'spool' | 'bee' | 'anchor' | 'clocktower' | 'arrow' | 'peak' | 'pickaxes'
  | 'castle' | 'spires' | 'moonstars' | 'volcano' | 'bridge' | 'ship' | 'sun' | 'flame' | 'thistle' | 'windmill';

export interface SummitClub extends EuroClub {
  /** 85 to 89: where the club plays against the round's target */
  rating: number;
  /** an invented ground, never a real one's name or nickname */
  stadium: string;
  /** what the home end burns */
  flares: [string, string];
  /** the gold drawing on the crest */
  emblem: SummitEmblem;
}

export const EURO_SUMMIT_CLUBS: SummitClub[] = [
  { id: 'eu2-madrid-ivory', name: 'מדריד השנהבית', short: 'השנהבית', city: 'מדריד', country: 'ספרד',
    primary: '#F4F1EA', secondary: '#C9A227', accent: '#4B2E83', shape: 'round', pattern: 'solid',
    rating: 89, stadium: 'היכל השנהב', flares: ['#F4F1EA', '#C9A227'], emblem: 'star8' },
  { id: 'eu2-madrid-fighters', name: 'הפייטרים ממדריד', short: 'הפייטרים', city: 'מדריד', country: 'ספרד',
    primary: '#B5172F', secondary: '#F4F4F4', accent: '#1F3A68', shape: 'shield', pattern: 'stripes',
    rating: 86, stadium: 'זירת הנהר', flares: ['#B5172F', '#F4F4F4'], emblem: 'swords' },
  { id: 'eu2-catalonia', name: 'קטלוניה הגדולה', short: 'קטלוניה', city: 'ברצלונה', country: 'ספרד',
    primary: '#1B3F8B', secondary: '#8E1B3A', accent: '#F2C14E', shape: 'diamond', pattern: 'stripes',
    rating: 89, stadium: 'אמפיתיאטרון הים התיכון', flares: ['#1B3F8B', '#8E1B3A'], emblem: 'lighthouse' },
  { id: 'eu2-manchester-textile', name: "מנצ'סטר הטקסטילית", short: 'הטקסטילית', city: "מנצ'סטר", country: 'אנגליה',
    primary: '#C1121F', secondary: '#141414', accent: '#F7D774', shape: 'shield', pattern: 'half',
    rating: 87, stadium: 'אצטדיון הטחנות', flares: ['#C1121F', '#F7D774'], emblem: 'spool' },
  { id: 'eu2-manchester-sky', name: "מנצ'סטר התכולה", short: 'התכולה', city: "מנצ'סטר", country: 'אנגליה',
    primary: '#6CABDD', secondary: '#1C2C5B', accent: '#FFFFFF', shape: 'round', pattern: 'stripes',
    rating: 89, stadium: 'הקערה התכולה', flares: ['#6CABDD', '#FFFFFF'], emblem: 'bee' },
  { id: 'eu2-mersey', name: 'נמל המרסי', short: 'המרסי', city: 'ליברפול', country: 'אנגליה',
    primary: '#B0102A', secondary: '#0E6B5C', accent: '#F6EBD0', shape: 'diamond', pattern: 'solid',
    rating: 88, stadium: 'רציף המרסי', flares: ['#B0102A', '#0E6B5C'], emblem: 'anchor' },
  { id: 'eu2-london-blue', name: 'לונדון הכחולה', short: 'לונדון הכחולה', city: 'לונדון', country: 'אנגליה',
    primary: '#1D4E9E', secondary: '#F2F2F2', accent: '#D4AF37', shape: 'shield', pattern: 'chevron',
    rating: 86, stadium: 'חצר המערב', flares: ['#1D4E9E', '#F2F2F2'], emblem: 'clocktower' },
  { id: 'eu2-london-north', name: 'צפון לונדון האדומה', short: 'צפון לונדון', city: 'לונדון', country: 'אנגליה',
    primary: '#D0021B', secondary: '#FFFFFF', accent: '#0B2A5B', shape: 'round', pattern: 'stripes',
    rating: 87, stadium: 'ארמון הצפון', flares: ['#D0021B', '#FFFFFF'], emblem: 'arrow' },
  { id: 'eu2-munich', name: 'מינכן הבווארית', short: 'מינכן', city: 'מינכן', country: 'גרמניה',
    primary: '#C8102E', secondary: '#0A3A7A', accent: '#FFFFFF', shape: 'shield', pattern: 'solid',
    rating: 89, stadium: 'היכל האלפים', flares: ['#C8102E', '#FFFFFF'], emblem: 'peak' },
  { id: 'eu2-dortmund', name: 'דורטמונד צהובה', short: 'דורטמונד', city: 'דורטמונד', country: 'גרמניה',
    primary: '#F2C200', secondary: '#141414', accent: '#FFFFFF', shape: 'diamond', pattern: 'chevron',
    rating: 86, stadium: 'כור הפחם', flares: ['#F2C200', '#FFFFFF'], emblem: 'pickaxes' },
  { id: 'eu2-turin', name: 'טורינו בשחור לבן', short: 'שחור לבן', city: 'טורינו', country: 'איטליה',
    primary: '#1A1A1A', secondary: '#F5F5F5', accent: '#C9A227', shape: 'shield', pattern: 'sash',
    rating: 87, stadium: 'מבצר הפו', flares: ['#C9A227', '#F5F5F5'], emblem: 'castle' },
  { id: 'eu2-milan-red', name: 'מילאנו אדומה', short: 'מילאנו אדומה', city: 'מילאנו', country: 'איטליה',
    primary: '#A50021', secondary: '#141414', accent: '#FFFFFF', shape: 'round', pattern: 'chevron',
    rating: 86, stadium: 'היכל לומברדיה', flares: ['#A50021', '#FFFFFF'], emblem: 'spires' },
  { id: 'eu2-milan-blue', name: 'מילאנו הכחולה', short: 'מילאנו הכחולה', city: 'מילאנו', country: 'איטליה',
    primary: '#0B3D91', secondary: '#141414', accent: '#C9A227', shape: 'round', pattern: 'sash',
    rating: 87, stadium: 'היכל לומברדיה', flares: ['#0B3D91', '#C9A227'], emblem: 'moonstars' },
  { id: 'eu2-south-italy', name: 'אלופי דרום איטליה', short: 'דרום איטליה', city: 'נאפולי', country: 'איטליה',
    primary: '#12A0D7', secondary: '#0A2342', accent: '#FFFFFF', shape: 'diamond', pattern: 'sash',
    rating: 85, stadium: 'לוע הר הגעש', flares: ['#12A0D7', '#FFFFFF'], emblem: 'volcano' },
  { id: 'eu2-paris', name: 'פריז הענקית', short: 'פריז', city: 'פריז', country: 'צרפת',
    primary: '#0B1F4B', secondary: '#C8102E', accent: '#FFFFFF', shape: 'diamond', pattern: 'half',
    rating: 88, stadium: 'זירת הסן', flares: ['#FFFFFF', '#C8102E'], emblem: 'bridge' },
  { id: 'eu2-portugal-blue', name: 'הכחולים מפורטוגל', short: 'הכחולים', city: 'פורטו', country: 'פורטוגל',
    primary: '#1C4FA1', secondary: '#FFFFFF', accent: '#F2C14E', shape: 'shield', pattern: 'half',
    rating: 85, stadium: 'מגדלור הדורו', flares: ['#1C4FA1', '#FFFFFF'], emblem: 'ship' },
  { id: 'eu2-lisbon-red', name: 'ליסבון האדומה', short: 'ליסבון האדומה', city: 'ליסבון', country: 'פורטוגל',
    primary: '#C8102E', secondary: '#FFFFFF', accent: '#D4AF37', shape: 'round', pattern: 'half',
    rating: 85, stadium: "מצודת הטז'ו", flares: ['#C8102E', '#FFFFFF'], emblem: 'sun' },
  { id: 'eu2-istanbul-flame', name: 'הלהבה מאיסטנבול', short: 'הלהבה', city: 'איסטנבול', country: 'טורקיה',
    primary: '#A6192E', secondary: '#F2A900', accent: '#FFFFFF', shape: 'diamond', pattern: 'sash',
    rating: 85, stadium: 'כור הבוספורוס', flares: ['#A6192E', '#F2A900'], emblem: 'flame' },
  { id: 'eu2-glasgow-green', name: 'גלזגו הירוקה', short: 'גלזגו הירוקה', city: 'גלזגו', country: 'סקוטלנד',
    primary: '#138A4B', secondary: '#FFFFFF', accent: '#F2C14E', shape: 'round', pattern: 'stripes',
    rating: 85, stadium: 'היכל הקלייד', flares: ['#138A4B', '#FFFFFF'], emblem: 'thistle' },
  { id: 'eu2-amsterdam-mad', name: 'המשוגעים של אמסטרדם', short: 'המשוגעים', city: 'אמסטרדם', country: 'הולנד',
    primary: '#F5F5F5', secondary: '#D2122E', accent: '#141414', shape: 'diamond', pattern: 'stripes',
    rating: 85, stadium: 'זירת התעלות', flares: ['#F5F5F5', '#D2122E'], emblem: 'windmill' },
];

/**
 * TEMPORARY until Itzik approves (9.11.2026: "החלטות שלב 0 כזמניות ומסומנות"). The game runs on them as they are;
 * each is one line to change. summit-check prints this list on every run so it is not forgotten.
 */
export const SUMMIT_DRAFT: readonly string[] = [];

/** Itzik's answers of 9.11.2026 to stage 0's open questions. */
export const SUMMIT_DECIDED: readonly string[] = [
  'grounds: invented only, the twenty and the six finals as they are',
  'קייב הכחולה: blue and yellow (blue body, yellow half), no real crest copied',
  '+5 gems: once per career, the first entry only',
  'the golden book: trophy wins and finals only',
  'the short names: the table of 10.11, approved as it is, for now (until the lawyer)',
];

/**
 * What the lawyer reads before פסגת אירופה goes live: all twenty, names, short names, colours and emblems
 * (Itzik, 10.11.2026: "כל 20 הקבוצות עוברות לבדיקת עורך הדין, לא רק 4"). SUMMIT-LAWYER-REVIEW.md is the table he
 * reads. Nothing ships before he clears it: check:summit prints it on every run, DEPLOY.md and HANDOFF-NEXT.md carry
 * it (stage 6).
 */
export const LAWYER_REVIEW: readonly string[] = EURO_SUMMIT_CLUBS.map(c => c.name);
/** Itzik's first four, the ones he named on 9.11 before widening the review to all twenty. */
export const LAWYER_FIRST: readonly string[] = ['טורינו בשחור לבן', 'מילאנו אדומה', 'מילאנו הכחולה', 'גלזגו הירוקה'];

/** What earns a golden-book page (R7, Itzik 9.11): a final played, and a double page for the trophy. Not every win. */
export const GOLDEN_BOOK_SCOPE = 'finals' as const;


/** The final of פסגת אירופה is played on neutral ground, a different invented one each season. */
export const SUMMIT_FINAL_STADIUMS = [
  'היכל הכתרים', 'זירת הזהב', 'אצטדיון האגמים', 'היכל הפסגה', 'זירת הכוכבים', 'אמפיתיאטרון הלילה',
] as const;
export const summitFinalStadium = (season: number): string =>
  SUMMIT_FINAL_STADIUMS[((season % SUMMIT_FINAL_STADIUMS.length) + SUMMIT_FINAL_STADIUMS.length) % SUMMIT_FINAL_STADIUMS.length];

/** The pool a competition draws from: 0 ליגת אירופה, 1 פסגת אירופה. */
export const poolFor = (level: number): EuroClub[] => (level === 1 ? EURO_SUMMIT_CLUBS : EURO_CLUBS);

/** Any European club, of either tier, by id. */
export const euroClub = (id: string): EuroClub | undefined =>
  EURO_CLUBS.find(c => c.id === id) ?? EURO_SUMMIT_CLUBS.find(c => c.id === id);
/** A club of פסגת אירופה, with its rating, ground and flares. */
export const summitClub = (id: string): SummitClub | undefined => EURO_SUMMIT_CLUBS.find(c => c.id === id);

/** The crest component takes a Club; a European club wears the same coat. */
export function asClub(c: EuroClub): Club {
  return {
    id: c.id, name: c.name, short: c.short, city: c.city,
    primary: c.primary, secondary: c.secondary, accent: c.accent,
    shape: c.shape, pattern: c.pattern, founded: 1900, tier: 0,
    blurb: '', strength: '', weakness: '', traits: NEUTRAL_TRAITS,
  };
}
