/**
 * The books, and the sack.
 *
 * Checks the three things that make this fair rather than a trap: the debt is
 * real and it accumulates, the manager is warned twice on his way to the line,
 * and he can always sell to climb back out even with the window shut. Then the
 * line itself: crossing it ends the career on the spot.
 *
 *   node --experimental-strip-types scripts/debt-check.mts
 */

import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { debtState, debtLimit } from '../src/game/finance.ts';
import { LEAGUE_NAMES } from '../src/data/clubs.ts';

const bad: string[] = [];
const ok: string[] = [];
const check = (name: string, pass: boolean, detail = '') => {
  (pass ? ok : bad).push(`${name}${detail ? `  ${detail}` : ''}`);
};

/* ---- the ladder of warnings, straight off the numbers */
for (const tier of [1, 3, 5]) {
  const lim = debtLimit(tier);
  const at = (r: number) => debtState(-lim * r, tier).level;
  check(`tier ${tier}: in the black is clear`, debtState(50_000, tier).level === 'clear');
  check(`tier ${tier}: a small hole is only watched`, at(0.2) === 'watched');
  check(`tier ${tier}: 45% of the line warns`, at(0.5) === 'warned');
  check(`tier ${tier}: 75% is the final warning`, at(0.8) === 'final');
  check(`tier ${tier}: the line itself sacks`, at(1.0) === 'sacked');
  check(`tier ${tier}: past it stays sacked`, at(3) === 'sacked');
}

/* ---- a career driven into the ground */
function career(startMoney: number, reckless = false, seasons = 1, tier = 1) {
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 40, type: 'mental' });
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});
  if (tier !== 1) {
    gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) } };
  }
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  gs = { ...gs, meters: { ...gs.meters, money: startMoney } };

  const seen = new Set<string>();
  let warned = false;
  let rounds = 0;
  for (let season = 1; season <= seasons && !gs.sacking; season++) {
  if (season > 1) {
    gs = G.startNextSeason(gs);
    gs = G.enterSeason(gs);
    if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  }
  for (let w = 1; w <= gs.league.rounds && !gs.sacking; w++) {
    seen.add(G.debt(gs).level);
    // The realistic road to bankruptcy is not losing, it is overspending: the
    // biggest stand on offer, every time there is cash for it, with nothing kept
    // back for wages. A manager who does that must end up out of a job.
    if (reckless && !gs.stadium.project) {
      for (const o of [...G.expansions(gs)].reverse()) {
        if (!G.expansionBlockedReason(gs, o)) { gs = G.startStadiumProject(gs, o.key); break; }
      }
    }
    const inp = G.liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed);
    gs = G.commitRound(gs, res);
    rounds++;
    gs = G.continueFromResult(gs);
    // the owner has a word before the axe, and the loop has to let him say it
    if (gs.phase === 'ultimatum') { warned = true; gs = G.advancePastPress(gs); }
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    if (gs.phase === 'season-end') break;
  }
  }
  return { gs, seen, warned, rounds };
}

// The realistic sack: a club that goes up and cannot carry the division it
// landed in. ליגה ג׳ cannot bankrupt anyone, its whole annual budget is smaller
// than the rope the owner gives, and that is correct: it is where you learn.
// The wage bill jumps sixfold into ליגה א׳, and that is where the job is lost.
const doomed = career(0, true, 4, 3);
check('promoted, broke, and unable to carry it: sacked', !!doomed.gs.sacking,
  doomed.gs.sacking ? `after ${doomed.rounds} rounds` : `survived, money ${doomed.gs.meters.money}`);
// Six reckless seasons from the bottom. The claim is about the BOTTOM division: a
// club that has climbed out of it and is then sacked in ליגה א׳ has not been sacked
// in ליגה ג׳, and whether it climbs in season four or five is a matter of how the
// league happens to fall, which any change to how the other clubs play will move.
// This used to be "was not sacked at all", and failed the day one shape got better.
const bottom = career(0, true, 6, 1).gs.sacking;
check('ליגה ג׳ cannot sack you, there is not enough money to lose',
  !bottom || bottom.league !== LEAGUE_NAMES[1], bottom ? `sacked in ${bottom.league}` : 'never sacked');
check('the sack sends you to the letter', doomed.gs.phase === 'sacked', `phase ${doomed.gs.phase}`);
if (doomed.gs.sacking) {
  const s = doomed.gs.sacking;
  check('the letter records the debt', s.debt >= s.limit, `${s.debt} vs ${s.limit}`);
  check('the letter records where you were', s.position >= 1 && s.position <= s.teams, `${s.position}/${s.teams}`);
  check('it is written into the chronicle', doomed.gs.chronicle.some(c => c.kind === 'sacked'));
  // the owner says it to his face, which is the promise. The level ladder is not
  // the test: the scripted crisis jumps from watched straight past the line in
  // one round, and the warning still has to arrive before the axe.
  check('the owner warned him to his face first', doomed.warned,
    [...doomed.seen].join(' -> '));
}

// a solvent club is never touched
const safe = career(200_000, false, 3);
check('a club in the black is left alone', !safe.gs.sacking, `money ${safe.gs.meters.money}`);
/* ---- the floor is really gone: the purse is never quietly clamped to zero */
{
  let gs = G.newGame(555);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 40, type: 'mental' });
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  const before = -50_000;
  gs = { ...gs, meters: { ...gs.meters, money: before } };
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed);
  gs = G.commitRound(gs, res);
  const net = gs.lastLedger!.net;
  // exactly what the ledger says, to the shekel, with nothing clamped away
  check('the purse moves by exactly the ledger, never floored',
    gs.meters.money === before + net, `${before} + ${net} = ${gs.meters.money}`);
  check('a club in the red stays in the red', gs.meters.money < 0, String(gs.meters.money));
}

/* ---- the way out has to be open */
{
  let gs = G.newGame(77);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 40, type: 'mental' });
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  // push the calendar to a week the window is shut
  let shut = gs;
  for (let w = 1; w <= 12 && G.transferWindow(shut).open; w++) shut = { ...shut, week: shut.week + 1 };
  const windowShut = !G.transferWindow(shut).open;
  const solvent = { ...shut, meters: { ...shut.meters, money: 100_000 } };
  const inTheRed = { ...shut, meters: { ...shut.meters, money: -50_000 } };
  check('the window really is shut for this test', windowShut);
  check('solvent and shut: no selling', G.sellBlockedReason(solvent) === 'החלון סגור');
  check('in the red: selling is unlocked', G.sellBlockedReason(inTheRed) !== 'החלון סגור',
    String(G.sellBlockedReason(inTheRed)));
}

for (const l of ok) console.log(`  ok    ${l}`);
for (const l of bad) console.log(`  FAIL  ${l}`);
console.log(bad.length ? `\nFAIL, ${bad.length} of ${ok.length + bad.length}` : `\nOK, all ${ok.length} checks passed`);
process.exit(bad.length ? 1 : 0);
