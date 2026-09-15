/**
 * A player's hidden potential is his, not his place in a queue.
 *   node --experimental-strip-types scripts/seed-check.mts
 *
 * Potential used to be read off the player id, and ids are a running counter.
 * Generating twelve more men anywhere in the game shifted every id after them,
 * and with it the growth of every player born later: a whole simulated career
 * moved because the winter market got a fresh list, and a check that had passed
 * for a year failed for a change that had nothing to do with it. Four things:
 *   1. the same career, born after the id counter has been run forward, has
 *      the same players with the same ceilings
 *   2. ceilings still vary from man to man, the seed is not a constant
 *   3. a player from before the seed existed reads his ceiling off his id,
 *      exactly as before, so no saved career's kids change on load
 *   4. a whole save with every seed stripped loads and plays
 */
import * as G from '../src/game/state.ts';
import { simulateMatch, playerSeed } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { nextPlayerId } from '../src/data/squadGen.ts';
import { potentialOf, devFactor } from '../src/game/career.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const fails: string[] = [];
let checked = 0;

function career(seed: number, city: string): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, city);
  return G.afterSigning(gs, {});
}
const cast = (gs: G.GameState) => [...G.mySquad(gs).starters, ...G.mySquad(gs).bench, ...gs.youth.players, ...gs.market.map(fa => fa.player)];

/* 1 and 2. THE SAME CAREER, WITH THE ID COUNTER RUN FORWARD. */
{
  const a = career(4242, 'אשדוד');
  for (let i = 0; i < 24; i++) nextPlayerId();
  const b = career(4242, 'אשדוד');
  const ca = cast(a), cb = cast(b);
  checked += 3;
  if (ca.length !== cb.length) fails.push(`the two careers have ${ca.length} and ${cb.length} men`);
  let idsMoved = 0, ceilingsMoved = 0;
  for (let i = 0; i < Math.min(ca.length, cb.length); i++) {
    if (ca[i].id !== cb[i].id) idsMoved++;
    if (ca[i].name !== cb[i].name) fails.push(`man ${i} is ${ca[i].name} in one career and ${cb[i].name} in the other`);
    if (potentialOf(ca[i]) !== potentialOf(cb[i])) ceilingsMoved++;
  }
  if (idsMoved === 0) fails.push('the id counter did not actually move, so this proves nothing');
  if (ceilingsMoved) fails.push(`${ceilingsMoved} of ${ca.length} men have a different ceiling because their id moved`);
  const distinct = new Set(ca.map(potentialOf)).size;
  checked++;
  if (distinct < 6) fails.push(`only ${distinct} distinct ceilings across ${ca.length} men, the seed is nearly a constant`);
  console.log(`  ${ca.length} men, ids moved for ${idsMoved} of them, ceilings moved for ${ceilingsMoved}, ${distinct} distinct ceilings`);
}

/* 3. A PLAYER FROM BEFORE THE SEED READS HIS ID, AS HE ALWAYS DID. */
{
  const legacy = (key: string) => {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
  };
  checked += 3;
  for (const id of ['p5', 'p516', 'p9999']) {
    if (devFactor({ id }) !== legacy(id)) fails.push(`an old player ${id} no longer reads his growth off his id`);
    if (devFactor({ id }, '|pot') !== legacy(id + '|pot')) fails.push(`an old player ${id} no longer reads his ceiling off his id`);
  }
  // and a seeded man ignores his id entirely
  const s = playerSeed('דור פרץ', 'ST', 22, { pace: 60, shooting: 60, passing: 50, dribbling: 55, defending: 40, physical: 58 });
  if (devFactor({ id: 'p1', seed: s }) !== devFactor({ id: 'p2', seed: s })) fails.push('a seeded man still reads something off his id');
  console.log('  a man without a seed reads his id as before, a man with one ignores it');
}

/* 4. A SAVE WITH EVERY SEED STRIPPED LOADS AND PLAYS. */
{
  let gs = career(777, 'חיפה');
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  store.clear();
  saveCareer(gs);
  const raw = JSON.parse(store.get('beapro.career.v1')!);
  let stripped = 0;
  const strip = (p: { seed?: number }) => { if (p && 'seed' in p) { delete p.seed; stripped++; } };
  for (const sq of Object.values(raw.state.league.squads) as { starters: { seed?: number }[]; bench: { seed?: number }[] }[]) { sq.starters.forEach(strip); sq.bench.forEach(strip); }
  raw.state.youth.players.forEach(strip);
  raw.state.market.forEach((fa: { player: { seed?: number } }) => strip(fa.player));
  store.set('beapro.career.v1', JSON.stringify(raw));
  const back = loadCareer();
  checked += 3;
  if (stripped < 100) fails.push(`only ${stripped} seeds were stripped, the save does not look right`);
  if (!back) { fails.push('the stripped save did not load'); }
  else {
    const inp = G.liveMatchInput(back);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed);
    const after = G.commitRound(back, res);
    if (after.phase !== 'result') fails.push(`the stripped save played a round and landed on ${after.phase}`);
    if (cast(back).some(p => potentialOf(p) < 45 || potentialOf(p) > 90)) fails.push('a seedless man has a ceiling outside 45..90');
  }
  console.log(`  a save with ${stripped} seeds stripped loads and plays a round`);
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 10)) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
