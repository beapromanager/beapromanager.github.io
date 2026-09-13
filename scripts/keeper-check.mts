/**
 * One keeper, in goal, and no keeper stranded up front.
 *   node --experimental-strip-types scripts/keeper-check.mts
 *
 * A player wrote in with his reserve keeper standing at centre forward and no
 * way to take him off, because "a keeper only swaps with a keeper". The chain
 * was: a starter retired over the summer, the gap was filled with the first
 * man on the bench, the first man on the bench is always the reserve keeper,
 * and the swap rule then sealed him in. Four things now hold:
 *   1. the summer fills an outfield gap with an outfield man
 *   2. the swap rule is "exactly one keeper in the eleven afterwards": a keeper
 *      out of goal can be swapped for an outfield man, the keeper in goal
 *      cannot be swapped for one, and a second keeper cannot come in
 *   3. the same rule on the live bench
 *   4. a save that already has a keeper stranded up front is put right on load
 */
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { ageSquad, fillWithYouth } from '../src/game/career.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import type { Player } from '../src/engine/matchEngine.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const fails: string[] = [];
let checked = 0;
const isGk = (p: Player) => p.position === 'GK';
const gks = (xs: Player[]) => xs.filter(isGk).length;

/* 1. THE SUMMER FILLS AN OUTFIELD GAP WITH AN OUTFIELD MAN. */
{
  const rng = createRng(77);
  const sq = makeSquad(60, rng);
  checked++;
  if (!isGk(sq.bench[0])) fails.push('the fixture bench does not start with the reserve keeper, which is the whole trap');
  // ten in the eleven, an outfield starter gone, reserve keeper first on the bench
  const short = { starters: sq.starters.slice(0, 10), bench: sq.bench };
  const aged = ageSquad(short, createRng(5), 1, 16).squad;
  const filled = fillWithYouth(short, createRng(6), 1, 16).squad;
  checked += 4;
  if (aged.starters.length !== 11) fails.push(`ageSquad left ${aged.starters.length} in the eleven`);
  if (gks(aged.starters) !== 1) fails.push(`ageSquad put ${gks(aged.starters)} keepers in the eleven`);
  if (filled.starters.length !== 11) fails.push(`fillWithYouth left ${filled.starters.length} in the eleven`);
  if (gks(filled.starters) !== 1) fails.push(`fillWithYouth put ${gks(filled.starters)} keepers in the eleven`);
  console.log('  a retired outfield man is replaced by an outfield man, not the reserve keeper');
}

/* 2 and 3. THE RULE IS ONE KEEPER IN GOAL, ON THE SQUAD SCREEN AND ON THE LIVE BENCH. */
{
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  const sq = G.mySquad(gs);
  const reserve = sq.bench.find(isGk)!;
  const outBench = sq.bench.find(p => !isGk(p))!;
  const keeper = sq.starters.find(isGk)!;
  const forward = sq.starters[9];

  // the trap itself: reserve keeper standing in an outfield slot
  const starters = sq.starters.map(p => (p.id === forward.id ? reserve : p));
  const bench = sq.bench.map(p => (p.id === reserve.id ? forward : p));
  const trapped: G.GameState = { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { starters, bench } } } };

  checked += 3;
  if (G.swapBlockedReason(reserve, outBench, trapped)) fails.push(`the stranded keeper cannot be swapped for an outfield man: ${G.swapBlockedReason(reserve, outBench, trapped)}`);
  if (!G.swapBlockedReason(keeper, outBench, gs)) fails.push('the keeper in goal could be swapped for an outfield man, leaving no keeper');
  const fixed = G.swapPlayers(trapped, reserve.id, outBench.id);
  if (gks(G.mySquad(fixed).starters) !== 1) fails.push('after swapping the stranded keeper out, the eleven does not hold exactly one keeper');
  checked++;
  // and once he is back on the bench he cannot come in for an outfield man
  if (!G.swapBlockedReason(forward, reserve, gs)) fails.push('a second keeper could be swapped into an eleven that already has one');

  // the live bench, same trap
  const st = L.createLive({
    seed: 1, homeId: gs.clubId, homeName: 'a', awayId: 'x', awayName: 'b', iAmHome: true,
    playerStarters: starters, playerBench: bench, playerTactic: { approach: 'balanced', press: 'mid' },
    oppStarters: sq.starters, oppBench: sq.bench, moraleBias: 0,
  });
  checked += 2;
  if (L.subBlockedReason(st, reserve.id, outBench.id)) fails.push(`live: the stranded keeper cannot be subbed for an outfield man: ${L.subBlockedReason(st, reserve.id, outBench.id)}`);
  const normal = L.createLive({
    seed: 1, homeId: gs.clubId, homeName: 'a', awayId: 'x', awayName: 'b', iAmHome: true,
    playerStarters: sq.starters, playerBench: sq.bench, playerTactic: { approach: 'balanced', press: 'mid' },
    oppStarters: sq.starters, oppBench: sq.bench, moraleBias: 0,
  });
  if (!L.subBlockedReason(normal, keeper.id, outBench.id)) fails.push('live: the keeper in goal could be subbed for an outfield man');
  console.log('  a keeper out of goal can be taken off, the one in goal cannot, a second cannot come in');

  /* 4. A SAVE WITH THE TRAP IN IT IS PUT RIGHT ON LOAD. */
  store.clear();
  saveCareer(trapped);
  const back = loadCareer();
  checked += 3;
  if (!back) fails.push('the trapped save did not load');
  else {
    const s = G.mySquad(back);
    if (gks(s.starters) !== 1) fails.push(`the trapped save loaded with ${gks(s.starters)} keepers in the eleven`);
    if (s.starters.some(p => p.id === reserve.id)) fails.push('the stranded keeper is still in the eleven after loading');
    if (s.starters.length !== 11 || s.bench.length !== bench.length) fails.push('the repair changed the squad size');
  }
  console.log('  a save with a keeper stranded up front comes back with him on the bench');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
