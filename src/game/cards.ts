/**
 * Player card rarity, driven by rating. This is a pure display layer over the
 * calibrated engine, it never feeds anything back into a match.
 *
 * The ladder is ABSOLUTE across the whole game, not relative to the current
 * division. It is calibrated to this game's own rating economy
 * (leagueCeiling = 47.5 + 5.5 * tier), NOT to FIFA. Tier 1 (ליגה ג׳) lands
 * almost entirely on 'plain' with a few 'brown', and the ladder climbs
 * division by division, so a bright card always means real, portable quality.
 * That is what gives the gacha ("watch an ad, get a better card") its value.
 */
import type { Player } from '../engine/matchEngine.ts';
import { overall } from '../engine/matchEngine.ts';

export type Rarity = 'plain' | 'brown' | 'copper' | 'silver' | 'gold' | 'elite';

/** weakest to strongest */
export const RARITIES: Rarity[] = ['plain', 'brown', 'copper', 'silver', 'gold', 'elite'];

export const RARITY_LABEL: Record<Rarity, string> = {
  plain: 'רגיל',
  brown: 'חום כהה',
  copper: 'ארד בהיר',
  silver: 'כסף',
  gold: 'זהב חלש',
  elite: 'זהב מטאלי',
};

/** Where the bronze cards begin: the first card that gets a personality. Below it a card is plain. */
export const BRONZE_FROM = 57;

/** OVR to rarity. Thresholds calibrated against the tier ceilings above. */
export function rarityForOvr(ovr: number): Rarity {
  if (ovr >= 84) return 'elite';
  if (ovr >= 76) return 'gold';
  if (ovr >= 69) return 'silver';
  if (ovr >= 63) return 'copper';
  if (ovr >= BRONZE_FROM) return 'brown';
  return 'plain';
}

export function rarityOf(p: Player): Rarity {
  return rarityForOvr(overall(p));
}

/** The rating color per rarity, so squad rows, cards and the market all agree.
 *  Matches --uk-ovr in UltraCard. */
export const RARITY_OVR_COLOR: Record<Rarity, string> = {
  plain: '#828a93', brown: '#d79a5f', copper: '#ff9a52',
  silver: '#e6eef7', gold: '#f5cf5a', elite: '#ffe38c',
};

export function ovrColor(ovr: number): string {
  return RARITY_OVR_COLOR[rarityForOvr(ovr)];
}

/** index in the ladder, 0 (plain) .. 5 (elite). Handy for "one tier up". */
export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r);
}

const OUTFIELD: [keyof Player['attrs'], string][] = [
  ['pace', 'מהי'], ['shooting', 'בעי'], ['passing', 'מסי'],
  ['dribbling', 'כדר'], ['defending', 'הגנ'], ['physical', 'גוף'],
];

/** The six stat bars shown on the card. Keepers show keeper attributes. */
export function cardStats(p: Player): [string, number][] {
  if (p.position === 'GK' && p.gk) {
    const g = p.gk;
    return [
      ['צלי', g.diving], ['תפי', g.handling], ['רפל', g.reflexes],
      ['מיק', g.positioning], ['בעי', g.kicking], ['גוף', p.attrs.physical],
    ];
  }
  return OUTFIELD.map(([k, label]) => [label, p.attrs[k]] as [string, number]);
}
