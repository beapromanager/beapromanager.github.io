import type { SponsorId } from '../game/sponsor.ts';

/**
 * The brands that want the shirt.
 *
 * A sponsor is a character, not a number: a brand has a reason to be on a
 * football shirt, a way of talking, and the deals it puts on the table. Today
 * one brand offers all three kinds of deal (safe, results, crowd), so the
 * summer choice is how to be paid, not by whom. Adding a brand is adding an
 * entry here and a logo in public/sponsors; the deals it offers decide the
 * rest, and the sponsor code already handles more than one brand.
 *
 * `logo` is a root-relative path resolved through asset(). Until the file
 * exists the screens draw the name as a wordmark, so a brand can be signed
 * before its artwork arrives.
 */
export type BrandId = 'blacksheep';

export interface Brand {
  id: BrandId;
  /** the name as printed everywhere */
  name: string;
  /** the name as it fits on a chest, short */
  chest: string;
  /** who they are, one line under the name */
  who: string;
  /** the pitch, in their own voice, on the sponsor screen */
  pitch: string;
  /** the welcome, once the shirt is theirs */
  welcome: string;
  /** what they come asking for mid season, in their own voice */
  wants: string[];
  logo: string;
  /** the mark as printed on the chest; the same file unless a brand ships a tighter one */
  chestLogo?: string;
  /** the deals this brand puts on the table */
  deals: SponsorId[];
  /** the ad in public/ads that belongs to this brand, if it has one */
  adId?: string;
}

export const BRANDS: readonly Brand[] = [
  {
    id: 'blacksheep',
    name: 'מכבסת הכבשה השחורה',
    chest: 'הכבשה השחורה',
    who: 'מכבסה תל אביבית. שירות טוב, כביסה נקייה.',
    pitch: 'כסף נקי בכל מחזור. רוצים שקט? סכום קבוע. מהמרים על עלייה או על יציע מלא? אנחנו מהמרים איתכם.',
    welcome: 'המדים של העונה יוצאים מהמכבסה שלנו לבנים כמו חדשים. תנצחו, אנחנו נכבס.',
    wants: [
      'שהשחקנים יצטלמו במכבסה עם המדים',
      'שהקפטן יגיע לחתונה של הבן שלי',
      'שתביאו את המדים לכביסה אצלנו אחרי הדרבי, בשביל התמונה',
    ],
    logo: '/sponsors/blacksheep.webp',
    deals: ['base', 'results', 'crowd'],
  },
];

export function brandById(id: BrandId): Brand {
  return BRANDS.find(b => b.id === id) ?? BRANDS[0];
}
