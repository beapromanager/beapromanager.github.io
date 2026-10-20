import { inviteLink, myCode } from './invite.ts';

/**
 * The big moments, said to a friend.
 *
 * Growth in this game is word of mouth in an Israeli football crowd, and the
 * moment a manager is proudest is the moment he will send it to somebody: the
 * title, the promotion, the cup. So those moments carry a button. What it
 * sends is words and a link, not a picture: WhatsApp builds the picture from
 * the page itself, and the link carries the manager's own invite code, so a
 * friend who plays pays him the invite gems the game already has.
 *
 * The wording is a draft for Itzik to correct.
 */

export type ShareKind = 'top' | 'champion' | 'promoted' | 'euro' | 'cup';

/**
 * Which moment this season ended on, if it was one worth sending. Europe
 * comes first, then גביע המדינה: Europe is open only to the reigning top-tier
 * champion, so when both land the same summer it is the bigger of the two.
 */
export function shareKindFor(o: { champion: boolean; promoted: boolean; atTop: boolean; euroWon: boolean; cupWon?: boolean }): ShareKind | null {
  if (o.euroWon) return 'euro';
  if (o.cupWon) return 'cup';
  if (o.champion && o.atTop) return 'top';
  if (o.champion) return 'champion';
  if (o.promoted) return 'promoted';
  return null;
}

export interface ShareFacts {
  club: string;
  league: string;
  nextLeague: string;
  season: number;
}

/** the words, without the link: the share sheet takes the link on its own */
export function shareText(kind: ShareKind, f: ShareFacts): string {
  switch (kind) {
    case 'euro': return `זכינו בגביע אירופה! ${f.club} ב-BE A PRO, מליגה ג׳ ועד אירופה. בוא תראה אם אתה מצליח.`;
    case 'cup': return `זכינו בגביע המדינה! ${f.club} ב-BE A PRO. בוא תראה אם אתה מצליח.`;
    case 'top': return `אני אלוף המדינה ב-BE A PRO עם ${f.club}. מליגה ג׳ ועד הפסגה. תנסה לעשות יותר טוב ממני.`;
    case 'champion': return `אלופים! ${f.club} זכתה ב${f.league} בעונה ${f.season} ב-BE A PRO. בוא תראה אם אתה מצליח.`;
    case 'promoted': return `עלינו ל${f.nextLeague}! ${f.club} ב-BE A PRO, עונה ${f.season}. מי עוד מעז?`;
  }
}

/** the link a manager sends: the game's address with his own invite code on it */
export function shareLink(): string {
  return inviteLink(myCode());
}
