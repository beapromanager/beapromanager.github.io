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
 */

import type { Club, CrestShape, CrestPattern } from './clubs.ts';
import { NEUTRAL_TRAITS } from './squadGen.ts';

export interface EuroClub {
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
  { id: 'eu-amsterdam', name: 'ר.ב אמסטרדם', short: 'ר.ב אמסטרדם', city: 'אמסטרדם', country: 'הולנד',
    primary: '#1E5AA6', secondary: '#EFE6D2', accent: '#FFFFFF', shape: 'round', pattern: 'half' },
  { id: 'eu-athens', name: 'אתלטיק אתונה', short: 'אתלטיק אתונה', city: 'אתונה', country: 'יוון',
    primary: '#0F7B6C', secondary: '#F3EDE0', accent: '#F3EDE0', shape: 'diamond', pattern: 'sash' },
  { id: 'eu-glasgow', name: 'בלוז גלזגו', short: 'בלוז גלזגו', city: 'גלזגו', country: 'סקוטלנד',
    primary: '#14213D', secondary: '#C9D4E6', accent: '#FFFFFF', shape: 'shield', pattern: 'sash' },
  { id: 'eu-sevilla', name: 'מועדון סביליה', short: 'מועדון סביליה', city: 'סביליה', country: 'ספרד',
    primary: '#E07B1F', secondary: '#1B2A3A', accent: '#FFF4E0', shape: 'round', pattern: 'chevron' },
  { id: 'eu-basel', name: 'בית באזל', short: 'בית באזל', city: 'באזל', country: 'שוויץ',
    primary: '#6B2D8C', secondary: '#D9D2E6', accent: '#FFFFFF', shape: 'shield', pattern: 'stripes' },
  { id: 'eu-kyiv', name: 'מועדון קייב', short: 'מועדון קייב', city: 'קייב', country: 'אוקראינה',
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

export const euroClub = (id: string): EuroClub | undefined => EURO_CLUBS.find(c => c.id === id);

/** The crest component takes a Club; a European club wears the same coat. */
export function asClub(c: EuroClub): Club {
  return {
    id: c.id, name: c.name, short: c.short, city: c.city,
    primary: c.primary, secondary: c.secondary, accent: c.accent,
    shape: c.shape, pattern: c.pattern, founded: 1900, tier: 0,
    blurb: '', strength: '', weakness: '', traits: NEUTRAL_TRAITS,
  };
}
