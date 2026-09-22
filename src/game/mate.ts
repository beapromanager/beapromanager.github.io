/**
 * When the friend picks up his phone.
 *
 * The other twenty six threads in the game are set off by the scoreline. These
 * are set off by him: the weeks he has not played, the night he first starts,
 * his first goal, the tackle that put him out, the season he spent watching.
 * Which means the trigger cannot be read off the match, it has to be read off
 * what has happened to one particular man since the last time anybody looked.
 *
 * So a little is remembered between rounds, and only a little: how many rounds
 * he has gone without a minute, what his appearance count was when we last
 * checked, which of the ten he has already sent, and the week he last wrote.
 * Everything else is derived from the save as it stands.
 *
 * He writes at most once every three rounds. The whole point of a message from
 * him is that it is not routine, and a friend who texts every week is not a
 * friend, he is a notification.
 */

import type { Player } from '../engine/matchEngine.ts';
import { overall } from '../engine/matchEngine.ts';
import type { MateTrigger } from '../data/mateChats.ts';
import { MATE_GAP } from '../data/mateChats.ts';
import type { Friend } from './friends.ts';

/** What has to be carried from one round to the next for any of this to work. */
export interface MateMemory {
  /** threads already sent, so none of them happens twice in a career */
  seen: MateTrigger[];
  /** the week he last wrote, so he cannot write again for three rounds */
  lastWeek: number;
  /** rounds in a row with no minutes */
  quiet: number;
  /** his appearance count when the last round was settled */
  lastApps: number;
  /** your word that he is never sold, which has no expiry date */
  neverSell?: boolean;
  /** he asked once and was not promised anything; he may go in the summer */
  mayLeave?: boolean;
  /**
   * A shirt promised on the phone, waiting for a week to start.
   *
   * The dilemmas promise a place before a match and the promise is spent on
   * that match. He asks after one, when the week is already over and the match
   * mods are about to be wiped, so a promise made here has to survive the
   * night and land on the next team sheet instead.
   */
  promiseNext?: { id: string; name: string };
}

export function emptyMate(): MateMemory {
  return { seen: [], lastWeek: -MATE_GAP, quiet: 0, lastApps: 0 };
}

/** The one of the two who writes, if he is still here. */
export function texterOf(friends: Friend[]): Friend | undefined {
  return friends.find(f => f.texter && !f.sold) ?? friends.find(f => !f.sold);
}

export interface MateLook {
  /** the man himself, out of the squad */
  him: Player;
  apps: number;
  goals: number;
  /** the average rating of everybody else in the dressing room */
  squadAvg: number;
  /** he is out injured from this round */
  injured: boolean;
  /** he was sent off in the round just played */
  sentOff: boolean;
  /** the other one has been sold */
  aloneNow: boolean;
  /** the season has just finished */
  seasonOver: boolean;
  /** rounds in the season, to judge what "played" means */
  rounds: number;
  /** the club went up last summer and he was here for it */
  justUp: boolean;
}

/**
 * Which of the ten fits, in the order they matter.
 *
 * The order is not arbitrary: a red card or an injury is the loudest thing
 * that can happen to a man in a week and has to win over the fact that he has
 * also, quietly, gone three rounds without playing. The bench is last because
 * it is the one that is always true when nothing else is.
 */
export function pickMateTrigger(mem: MateMemory, week: number, look: MateLook): MateTrigger | null {
  if (week - mem.lastWeek < MATE_GAP) return null;
  const fresh = (t: MateTrigger) => !mem.seen.includes(t);

  if (look.aloneNow && fresh('mate_alone')) return 'mate_alone';
  if (look.sentOff && fresh('mate_red')) return 'mate_red';
  if (look.injured && fresh('mate_injured')) return 'mate_injured';

  if (look.seasonOver) {
    // a season is his if he played most of it, and it is not if he did not
    if (look.apps >= look.rounds * 0.6 && fresh('mate_season_played')) return 'mate_season_played';
    if (look.apps <= look.rounds * 0.25 && fresh('mate_season_benched')) return 'mate_season_benched';
    return null;
  }

  if (look.justUp && fresh('mate_promoted')) return 'mate_promoted';
  if (look.goals >= 1 && fresh('mate_first_goal')) return 'mate_first_goal';
  if (look.apps >= 1 && fresh('mate_first_start')) return 'mate_first_start';
  // the day he is better than the room he was the worst man in
  if (overall(look.him) > look.squadAvg && fresh('mate_arrived')) return 'mate_arrived';
  if (mem.quiet >= 3 && fresh('mate_benched')) return 'mate_benched';
  return null;
}

/** Roll the silence forward after a round: did he play, or did he watch? */
export function afterRound(mem: MateMemory, apps: number): MateMemory {
  const played = apps > mem.lastApps;
  return { ...mem, lastApps: apps, quiet: played ? 0 : mem.quiet + 1 };
}
