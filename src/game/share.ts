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

export type ShareKind = 'top' | 'champion' | 'promoted' | 'euro' | 'cup' | 'summit';

/**
 * Which moment this season ended on, if it was one worth sending. Europe
 * comes first, then גביע המדינה: Europe is open only to the reigning top-tier
 * champion, so when both land the same summer it is the bigger of the two.
 */
export function shareKindFor(o: { champion: boolean; promoted: boolean; atTop: boolean; euroWon: boolean; cupWon?: boolean; summitWon?: boolean }): ShareKind | null {
  // פסגת אירופה is above ליגת אירופה: when the trophy lifted was the summit's, that is the moment
  if (o.summitWon) return 'summit';
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
    case 'summit': return `זכינו בפסגת אירופה! ${f.club} ב-BE A PRO, מליגה ג׳ ועד הפסגה. @${SHARE_HANDLE}`;
    case 'euro': return `זכינו בגביע אירופה! ${f.club} ב-BE A PRO, מליגה ג׳ ועד אירופה. בוא תראה אם אתה מצליח.`;
    case 'cup': return `זכינו בגביע המדינה! ${f.club} ב-BE A PRO. בוא תראה אם אתה מצליח.`;
    case 'top': return `אני אלוף המדינה ב-BE A PRO עם ${f.club}. מליגה ג׳ ועד הפסגה. תנסה לעשות יותר טוב ממני.`;
    case 'champion': return `אלופים! ${f.club} זכתה ב${f.league} בעונה ${f.season} ב-BE A PRO. בוא תראה אם אתה מצליח.`;
    case 'promoted': return `עלינו ל${f.nextLeague}! ${f.club} ב-BE A PRO, עונה ${f.season}. מי עוד מעז?`;
  }
}

/** the game's own account, written into the summit's words so a manager can paste the tag himself */
export const SHARE_HANDLE = 'be.a.pro.il';

/**
 * The words for a summit moment (R8), without the link. They name his own club and the game and carry the tag;
 * they name no summit club (Itzik, 10.11.2026: none until the lawyer has cleared them).
 */
export function summitShareText(kind: 'trophy' | 'final' | 'win', f: { club: string; season: number }): string {
  if (kind === 'trophy') return shareText('summit', { club: f.club, league: '', nextLeague: '', season: f.season });
  if (kind === 'final') return `שיחקנו בגמר פסגת אירופה! ${f.club} ב-BE A PRO, עונה ${f.season}. @${SHARE_HANDLE}`;
  return `ניצחון בפסגת אירופה! ${f.club} ב-BE A PRO, עונה ${f.season}. @${SHARE_HANDLE}`;
}

/** the link a manager sends: the game's address with his own invite code on it */
export function shareLink(): string {
  return inviteLink(myCode());
}
