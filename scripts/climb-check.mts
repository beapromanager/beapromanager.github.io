/**
 * The climb.
 *
 * ליגה א׳ will not have you without a ground big enough for its crowd, and you
 * start on fifty benches. That gate only means something if the money to build it is reachable
 * without the game becoming a spreadsheet, and if the club can still get into
 * trouble on the way. So this plays out careers that always build whatever they
 * can afford, and reports how long the ladder takes and how close to the edge
 * they get doing it.
 *
 *   node --experimental-strip-types scripts/climb-check.mts
 */

import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { requiredCapacity } from '../src/game/career.ts';
import { LEAGUE_NAMES } from '../src/data/clubs.ts';
import type { SponsorId } from '../src/game/sponsor.ts';

const SEASONS = 12;

/** what a careful manager keeps in the bank: a season of wages and upkeep */
function reserveFor(gs: G.GameState): number {
  const l = gs.lastLedger;
  const perRound = l ? l.total : 60_000;
  return perRound * Math.max(4, Math.round(gs.league.rounds * 0.5));
}

/**
 * Seats past what the town will turn out for earn nothing, so a manager who can
 * see the numbers stops, unless he is chasing the capacity the division above
 * demands. Without this the harness builds twenty thousand seats in ליגה ג׳ for
 * a crowd of three hundred and calls the economy broken.
 */
function worthBuilding(gs: G.GameState): boolean {
  const gate = requiredCapacity(G.club(gs).tier + 1);
  return gs.stadium.capacity < Math.max(G.crowdWanted(gs) * 1.25, gate);
}

function career(seed: number, deal: SponsorId) {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});

  let lowest = Infinity;
  let reachedGate = 0, reachedTier3 = 0;
  let s = 1;
  for (; s <= SEASONS; s++) {
    gs = G.enterSeason(gs);
    if (gs.phase === 'sponsor') {
      gs = G.takeSponsor(gs, deal);
      // a deal that is not on the table must not fall quietly to another one and be measured under its name
      if (gs.sponsor?.id !== deal) throw new Error(`asked for the ${deal} deal and signed ${gs.sponsor?.id}`);
    }
    for (let w = 1; w <= gs.league.rounds; w++) {
      // Build, but the way a manager who wants to keep his job builds: never
      // spend down past a season's worth of running costs. Spending the last
      // shekel on a stand and then failing to make wages is a real way to be
      // sacked, and measuring it as if everyone does that says nothing.
      if (!gs.stadium.project && worthBuilding(gs)) {
        const reserve = reserveFor(gs);
        for (const o of [...G.expansions(gs)].reverse()) {
          if (!G.expansionBlockedReason(gs, o) && gs.meters.money - o.cost >= reserve) {
            gs = G.startStadiumProject(gs, o.key); break;
          }
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
      lowest = Math.min(lowest, gs.meters.money);
      gs = G.continueFromResult(gs);
      while (gs.phase === 'press') gs = G.answerPress(gs, w % 3);
      if (gs.phase === 'chat') gs = G.closeChat(gs);
      if (gs.sacking) break;
      if (gs.phase === 'season-end') break;
    }
    if (gs.sacking) break;
    if (!reachedGate && gs.stadium.capacity >= requiredCapacity(3)) reachedGate = s;
    if (!reachedTier3 && G.club(gs).tier >= 3) reachedTier3 = s;
    gs = G.startNextSeason(gs);
    if (!reachedTier3 && G.club(gs).tier >= 3) reachedTier3 = s;
  }
  return {
    sacked: !!gs.sacking, sackedIn: gs.sacking ? s : 0,
    tier: G.club(gs).tier, capacity: gs.stadium.capacity,
    money: gs.meters.money, lowest, reachedGate, reachedTier3,
  };
}

const SEEDS = [4242, 777, 31, 9091, 555, 12007, 88, 4004];
const k = (v: number) => `${Math.round(v / 1000)}k`.padStart(8);
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

console.log(`${SEEDS.length} careers, ${SEASONS} seasons each, always building\n`);
// the deals the brands really put on the table, so a deal that no longer exists is never walked as if it did
const deals = [...new Set(G.BRANDS.flatMap(b => b.deals))] as SponsorId[];
for (const deal of deals) {
  const rs = SEEDS.map(s => career(s, deal));
  const gotGate = rs.filter(r => r.reachedGate > 0);
  const gotUp = rs.filter(r => r.reachedTier3 > 0);
  console.log(`${deal.padEnd(8)} sacked ${rs.filter(r => r.sacked).length}/${SEEDS.length}` +
    `   built the ${requiredCapacity(3).toLocaleString('en-US')} seats ליגה א׳ wants ${gotGate.length}/${SEEDS.length}` +
    (gotGate.length ? ` in ~${avg(gotGate.map(r => r.reachedGate)).toFixed(1)} seasons` : '') +
    `   into ליגה א׳ ${gotUp.length}/${SEEDS.length}`);
  console.log(`         end: ${LEAGUE_NAMES[Math.round(avg(rs.map(r => r.tier)))]}` +
    `  capacity ${Math.round(avg(rs.map(r => r.capacity))).toLocaleString('en-US')}` +
    `  money${k(avg(rs.map(r => r.money)))}  lowest ever${k(Math.min(...rs.map(r => r.lowest)))}`);
}
