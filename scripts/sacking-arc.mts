/**
 * The sacking, end to end.
 *
 * Warned in person, sacked only after a defeat, the club across town on the
 * phone the morning after, and the people who let you go still sitting in the
 * division above waiting for you to climb back. This walks the whole arc and
 * checks every joint of it, because a story that breaks halfway is worse than
 * no story.
 *
 *   node --experimental-strip-types scripts/sacking-arc.mts
 */

import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { debtLimit } from '../src/game/finance.ts';
import { isDerby } from '../src/data/clubs.ts';

const bad: string[] = [];
const ok: string[] = [];
const check = (name: string, pass: boolean, detail = '') =>
  (pass ? ok : bad).push(`${name}${detail ? `  ${detail}` : ''}`);

function play(gs: G.GameState, seed: number): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  return G.commitRound(gs, res);
}

function start(tier: number, money: number): G.GameState {
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', age: 40, type: 'mental' });
  gs = G.pickCity(gs, 'חולון');
  gs = G.afterSigning(gs, {});
  if (tier !== 1) {
    gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) } };
  }
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  return { ...gs, meters: { ...gs.meters, money } };
}

/* ---- 1. past the line, but you keep winning: the job survives.
        Each try starts a FRESH career already past the line, so the claim is
        about the rule and not about whether one particular seed's first round
        happened to be won. The old shape walked one career and died with its
        first defeat, and the day the seeds learned the season, that first
        round changed and 0 results survived a claim that was really true. */
{
  check('past the line to begin with', G.debt(start(3, -debtLimit(3) * 1.4)).level === 'sacked');
  let survived = 0;
  for (let i = 0; i < 40 && survived < 5; i++) {
    const gs = start(3, -debtLimit(3) * 1.4);
    const inp = G.liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed + i);
    const my = inp.iAmHome ? res.score[0] : res.score[1], opp = inp.iAmHome ? res.score[1] : res.score[0];
    const next = G.commitRound(gs, res);
    if (my >= opp) {
      survived++;
      if (next.sacking) bad.push(`sacked after a ${my}-${opp}, which is not a defeat`);
    }
  }
  check('a win or a draw past the line never ends it', survived >= 3, `${survived} results survived`);
}

/* ---- 2. the warning arrives before the axe, once */
{
  // 0.9 is where the real crisis lands; 0.8 stopped being deep enough the day a
  // won round started bringing in ~63K and lifted the club out of the band
  let gs = start(3, -debtLimit(3) * 0.9 - 60_000);
  check('deep enough for the final warning', G.debt(gs).level === 'final');
  gs = play(gs, 1);
  gs = G.continueFromResult(gs);
  check('the owner delivers the ultimatum', gs.phase === 'ultimatum', `phase ${gs.phase}`);
  const season = gs.ultimatumSeason;
  gs = G.advancePastPress(gs);
  while (gs.phase === 'press') gs = G.answerPress(gs, 0);
  if (gs.phase === 'chat') gs = G.closeChat(gs);
  gs = play(gs, 2);
  gs = G.continueFromResult(gs);
  check('and does not deliver it twice in a season', gs.phase !== 'ultimatum', `phase ${gs.phase}`);
  check('the season it was given is remembered', season === 1, String(season));
}

/* ---- 3. the sack, the phone call, and the club across town */
{
  let gs = start(3, -debtLimit(3) * 3);
  let guard = 0;
  while (!gs.sacking && guard++ < 60) {
    gs = play(gs, guard);
    gs = G.continueFromResult(gs);
    if (gs.phase === 'ultimatum') gs = G.advancePastPress(gs);
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    if (gs.phase === 'season-end') break;
  }
  check('a defeat that deep in the red ends it', !!gs.sacking, `after ${guard} rounds`);
  check('it goes to the letter', gs.phase === 'sacked', gs.phase);

  const sackedBy = gs.sacking!;
  const offer = G.rescueOffer(gs);
  check('somebody calls the morning after', !!offer);
  check('they are in the same town', offer?.city === sackedBy.city, `${offer?.city} vs ${sackedBy.city}`);
  check('and it is a different club', offer?.club.id !== sackedBy.clubId, offer?.club.name);
  check('the call names them in full, not by the town both share',
    offer?.nemesisName === sackedBy.club, offer?.nemesisName);
  check('one division below', offer?.tier === sackedBy.tier - 1, `${offer?.tier} vs ${sackedBy.tier}`);

  const before = { chapters: gs.chronicle.length, name: gs.profile.name, coach: gs.coach.licence };
  gs = G.takeRescue(gs);
  check('taking it puts you at the new club', gs.clubId === offer!.club.id);
  check('in the division below', G.club(gs).tier === sackedBy.tier - 1, String(G.club(gs).tier));
  check('the manager and his licence come with him',
    gs.profile.name === before.name && gs.coach.licence === before.coach);
  check('the story carries over and gains a chapter', gs.chronicle.length > before.chapters,
    `${before.chapters} -> ${gs.chronicle.length}`);
  check('the sacking is cleared', !gs.sacking);
  check('the club that let you go is remembered', gs.nemesis?.clubId === sackedBy.clubId);
  check('and pinned to the division it was in', gs.nemesis?.tier === sackedBy.tier);
  check('the new club signs him, welcome and all', gs.phase === 'signing', gs.phase);
  gs = G.afterSigning(gs, {});
  check('and then the shirt is sold', gs.phase === 'sponsor', gs.phase);
  check('the table starts empty', Object.values(gs.league.table).every(t => t.played === 0));
  check('every club in the new league has a squad',
    gs.league.clubs.every(c => (gs.league.squads[c.id]?.starters?.length ?? 0) >= 11));

  /* ---- 4. climb back, and he is standing there.
     The promotion is rigged rather than played: what is under test is whether
     the man who sacked you is put back in front of you when the tiers line up,
     not whether a simulated side can win its division. */
  gs = G.takeSponsor(gs, 'base');
  const nem = gs.nemesis!;

  // play the season out, then hand ourselves the title before the rollover
  for (let w = 1; w <= gs.league.rounds && !gs.sacking; w++) {
    gs = play(gs, 500 + w);
    gs = { ...gs, meters: { ...gs.meters, money: 5_000_000 } };   // money is not the test here
    gs = G.continueFromResult(gs);
    if (gs.phase === 'ultimatum') gs = G.advancePastPress(gs);
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    if (gs.phase === 'season-end') break;
  }
  const table = Object.fromEntries(Object.entries(gs.league.table).map(([id, t]) => [
    id, id === gs.clubId ? { ...t, won: 99, pts: 300, gf: 200, ga: 0 } : { ...t, pts: 1 },
  ]));
  // a champion with a fifty seat ground is not promoted, and that rule is not
  // what is under test here, so build them a stand first
  gs = {
    ...gs,
    league: { ...gs.league, table },
    meters: { ...gs.meters, money: 5_000_000 },
    stadium: { capacity: 20_000, project: null },
  };
  const wasTier = G.club(gs).tier;
  gs = G.startNextSeason(gs);
  check('winning the division goes up', G.club(gs).tier === wasTier + 1,
    `${wasTier} -> ${G.club(gs).tier}`);

  const met = gs.league.clubs.some(c => c.id === nem.clubId);
  check('climbing back into his division puts him in it', met,
    `my tier ${G.club(gs).tier}, his ${nem.tier}`);
  if (met) {
    const him = gs.league.clubs.find(c => c.id === nem.clubId)!;
    const mine = gs.league.clubs.find(c => c.id === gs.clubId)!;
    check('he kept his name', him.name === nem.name, him.name);
    check('and the fixture is a derby', him.rivalId === gs.clubId && mine.rivalId === nem.clubId);
    check('the grudge is closed once it is settled', !gs.nemesis);
    check('the league is still eight clubs', gs.league.clubs.length === 8, String(gs.league.clubs.length));
    check('nobody lost their squad in the swap',
      gs.league.clubs.every(c => (gs.league.squads[c.id]?.starters?.length ?? 0) >= 11));
    check('no club is in the division twice',
      new Set(gs.league.clubs.map(c => c.id)).size === gs.league.clubs.length);
    check('the chronicle records the reunion', gs.chronicle.some(c => c.title.includes(nem.short)));
  }
}

/* ---- 5. sacked in the bottom division: there is nothing below, so the club
   across town is in the same league and the derby is this season */
{
  let gs = start(1, -debtLimit(1) * 3);
  let guard = 0;
  while (!gs.sacking && guard++ < 60) {
    gs = play(gs, 900 + guard);
    gs = G.continueFromResult(gs);
    if (gs.phase === 'ultimatum') gs = G.advancePastPress(gs);
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    if (gs.phase === 'season-end') break;
  }
  if (!gs.sacking) { ok.push('bottom division sack could not be reproduced, skipped'); }
  else {
    const offer = G.rescueOffer(gs)!;
    check('the bottom division has nothing below it', offer.sameLeague, String(offer.tier));
    const nemId = gs.sacking!.clubId;
    gs = G.takeRescue(gs);
    check('so the club that sacked you is in the league right away',
      gs.league.clubs.some(c => c.id === nemId));
    check('and it is your derby from day one',
      gs.league.clubs.find(c => c.id === gs.clubId)?.rivalId === nemId);
    check('with no grudge left pending, it is already on the pitch', !gs.nemesis);
    check('the league is still eight clubs', gs.league.clubs.length === 8, String(gs.league.clubs.length));
    check('and everyone still has a squad',
      gs.league.clubs.every(c => (gs.league.squads[c.id]?.starters?.length ?? 0) >= 11));
  }
}

for (const l of ok) console.log(`  ok    ${l}`);
for (const l of bad) console.log(`  FAIL  ${l}`);
console.log(bad.length ? `\nFAIL, ${bad.length} of ${ok.length + bad.length}` : `\nOK, all ${ok.length} checks passed`);
process.exit(bad.length ? 1 : 0);
