/**
 * Does the division stay the division?
 *
 * It used to be rebuilt from scratch every summer, so a manager who stayed up
 * came back to seven clubs he had never seen, and in ליגה ג׳ the real towns he
 * picked at the start were replaced by a pool of invented names. Nothing about
 * a career felt continuous because nothing was.
 *
 * Staying up, the rule is: the two who went up leave, the one at the bottom
 * leaves, everybody else is exactly who they were. Changing division really is
 * a new set of people, and they come from the same region.
 *
 *   node --experimental-strip-types scripts/league-check.mts
 */

import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { findCity } from '../src/data/cities.ts';

const bad: string[] = [];
const ok: string[] = [];
const check = (name: string, pass: boolean, detail = '') =>
  (pass ? ok : bad).push(`${name}${detail ? `  ${detail}` : ''}`);

const CITY = 'אורנית';

function season(gs: G.GameState): G.GameState {
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  if (gs.phase === 'signing') gs = G.afterSigning(gs, {});
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  for (let w = 1; w <= gs.league.rounds; w++) {
    const inp = G.liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed + w);
    gs = G.commitRound(gs, res);
    // money is not what this file is about
    gs = { ...gs, meters: { ...gs.meters, money: 3_000_000 }, crisisDone: true };
    gs = G.continueFromResult(gs);
    if (gs.phase === 'ultimatum') gs = G.advancePastPress(gs);
    while (gs.phase === 'press') gs = G.answerPress(gs, w % 3);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    if (gs.phase === 'season-end') break;
  }
  return gs;
}

let gs = G.newGame(4242);
gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
gs = G.pickCity(gs, CITY);
gs = G.afterSigning(gs, {});

const realTown = (name: string) => !!findCity(name);
check('the opening division is real towns',
  gs.league.clubs.every(c => realTown(c.city)),
  gs.league.clubs.map(c => c.city).join(', '));

let stayedSeasons = 0;
let keptTotal = 0;
for (let s = 1; s <= 6; s++) {
  const before = gs.league.clubs.map(c => c.id);
  const tierBefore = G.club(gs).tier;
  gs = season(gs);
  gs = G.startNextSeason(gs);
  const after = gs.league.clubs.map(c => c.id);
  const tierAfter = G.club(gs).tier;
  const kept = after.filter(id => before.includes(id)).length;

  if (tierAfter === tierBefore) {
    stayedSeasons++;
    keptTotal += kept;
    // Two go up. One goes down as well, unless this is the bottom division,
    // where there is nowhere below to send anyone. So five or six of eight stay.
    const leaving = tierAfter > 1 ? 3 : 2;
    check(`season ${s}: staying up keeps the division`,
      kept === before.length - leaving, `${kept} kept, expected ${before.length - leaving}`);
  } else {
    // "kept" counts this club too. Going up, the two who went up alongside
    // come along; going down, the one who fell with you. Everyone else is new.
    const along = tierAfter > tierBefore ? 2 : 1;
    check(`season ${s}: a new division is a new set`, kept <= 1 + along, `${kept} carried over, up to ${1 + along} allowed`);
  }
  check(`season ${s}: every club is a real town`,
    gs.league.clubs.every(c => realTown(c.city)),
    gs.league.clubs.filter(c => !realTown(c.city)).map(c => c.name).join(', ') || 'all real');
  check(`season ${s}: no club appears twice`,
    new Set(after).size === after.length);
  check(`season ${s}: everyone has a squad`,
    gs.league.clubs.every(c => (gs.league.squads[c.id]?.starters?.length ?? 0) >= 11));
}

console.log(`seasons where the club stayed up: ${stayedSeasons}` +
  (stayedSeasons ? `, keeping ${(keptTotal / stayedSeasons).toFixed(1)} of 8 clubs on average` : ''));
console.log(`final division: ${gs.league.clubs.map(c => c.short).join(' · ')}\n`);

for (const l of ok) console.log(`  ok    ${l}`);
for (const l of bad) console.log(`  FAIL  ${l}`);
console.log(bad.length ? `\nFAIL, ${bad.length} of ${ok.length + bad.length}` : `\nOK, all ${ok.length} checks passed`);
process.exit(bad.length ? 1 : 0);
