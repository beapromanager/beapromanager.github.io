/**
 * "The owner asks to sell a match" (Itzik, 14.10): in ליגה ג׳, ב׳ and א׳ the owner takes the manager aside and asks him to
 * lose the next match. The manager says yes or no. No: the owner shrugs. Yes: the game plays the match for him and a
 * verdict decides, 60 in a hundred caught (the club is closed and he starts again in ליגה ג׳, whatever season and league
 * he was in) and 40 in a hundred not (a sum lands in the club). A cautionary, darkly funny choice, never a reward.
 *
 * The rules, his:
 *  - only up to ליגה א׳ inclusive;
 *  - ten situations, so it does not repeat, and at most once in a league;
 *  - said no in the first season in a league, the owner comes back in the second, and not a third time;
 *  - said yes (caught or not), the owner never asks again;
 *  - the money depends on the situation, never on the odds: the odds are always 60 to 40.
 *
 * The door is shut (FIX_LIVE false) until it has been looked at. One line opens it.
 */

/** On a developer's machine only, ?fix in the address opens the door. A built game never does. */
function devDoor(): boolean {
  try { return !!import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('fix'); } catch { return false; }
}

/** Whether the owner's request is live for players. Shut until Itzik opens it. */
export let FIX_LIVE = devDoor();

/** For the checks only, which walk the door open and shut: the game never calls it. */
export function setFixDoorForChecks(open: boolean): void { FIX_LIVE = open; }

/** The chance of being caught. Itzik: 60 against 40. */
export const FIX_CAUGHT = 0.6;
/** The highest division where the owner asks: ליגה א׳. */
export const FIX_TOP_TIER = 3;
/** How many times the owner asks in one league: the first season in it, and once more if he was refused. */
export const FIX_ASKS_PER_LEAGUE = 2;
/** The earliest round of a season he asks, and how many rounds before the end the window closes. */
export const FIX_FIRST_WEEK = 4;
export const FIX_LAST_MARGIN = 3;
/** The sum for a situation of weight 1, by division, in shekels: a few rounds of wages and a bit more. */
export const FIX_BASE: Record<number, number> = { 1: 90_000, 2: 110_000, 3: 600_000 };

/** How much a situation pays, by the weight it is given (the bigger the favour the bigger the envelope). */
export function fixPayout(tier: number, weight: number): number {
  const base = FIX_BASE[Math.max(1, Math.min(FIX_TOP_TIER, Math.round(tier)))];
  return Math.round((base * weight) / 5_000) * 5_000;
}

export interface FixDeal {
  /** the situation it was agreed in */
  id: string;
  tier: number;
  season: number;
  week: number;
  /** what lands in the club if he is not caught */
  payout: number;
  /** decided the moment he said yes, so quitting and coming back changes nothing */
  caught: boolean;
  /** agreed: the match is still to be played. played: the whistle has gone and the verdict is waiting */
  stage: 'agreed' | 'played';
}

export interface FixLog {
  /** he said yes once: the owner never asks again */
  done: boolean;
  /** the situations he has been shown */
  seen: string[];
  /** how many times the owner has asked, by division */
  offered: Record<number, number>;
  /** the season of the last ask, so a second ask comes the season after */
  lastOfferSeason: number;
}

export function emptyFixLog(): FixLog {
  return { done: false, seen: [], offered: {}, lastOfferSeason: 0 };
}
