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

/* 5. A SEASON IS NOT A RERUN OF THE LAST ONE.
      Every in-season draw used to mix only the career seed and the week, and the
      career seed never changes, so round N of every season drew the same lottery:
      the same penalty in the same minute, the same red card, the same question,
      season after season. A player who stayed twenty two seasons wrote the script
      out from memory (3.10). Now every draw goes through drawSeed, which has the
      SEASON in it, and this is what keeps it there. */
{
  let gs = G.newGame(20261003);
  gs = G.setProfile(gs, { name: 'בודק', nickname: '', age: 40, type: 'mental' } as never);
  gs = G.pickCity(gs, 'חולון');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');

  // the raw seed: season and week both move it, salts keep two draws apart
  checked += 4;
  const base = { seasonSeed: 4242, season: 1, week: 6 };
  if (G.drawSeed(base, 0) === G.drawSeed({ ...base, season: 2 }, 0)) fails.push('two seasons draw from the same seed, the rerun is back');
  if (G.drawSeed(base, 0) === G.drawSeed({ ...base, week: 7 }, 0)) fails.push('two weeks draw from the same seed');
  if (G.drawSeed(base, 30_000) === G.drawSeed(base, 80_000)) fails.push('two different draws in the same week share a seed');
  if (G.drawSeed(base, 0) !== G.drawSeed({ ...base }, 0)) fails.push('the same place and salt no longer draw the same seed, replays are broken');

  // and the game actually walks through it: the match of week N and the question of
  // week N change between seasons, across every week of the season
  let matchDiff = 0, weeks = 0;
  for (let w = 1; w <= 14; w++) {
    const now = { ...gs, week: w };
    const later = { ...now, season: 7 };
    weeks++;
    if (G.liveMatchInput(now).seed !== G.liveMatchInput(later).seed) matchDiff++;
  }
  checked += 2;
  if (matchDiff !== weeks) fails.push(`only ${matchDiff} of ${weeks} weeks play a different match in a different season`);
  // the dilemma rolled for the same week in two far-apart seasons: with a pool of a
  // dozen templates two seasons can land the same id by chance in a few weeks, but
  // never in all of them, which is exactly what the old seed did
  let dilemmaDiff = 0;
  for (let w = 1; w <= 14; w++) {
    const a = G.startWeek({ ...gs, week: w }).dilemma?.id ?? '';
    const b = G.startWeek({ ...gs, week: w, season: 9 }).dilemma?.id ?? '';
    if (a !== b) dilemmaDiff++;
  }
  if (dilemmaDiff < 5) fails.push(`the question before the match repeats across seasons in ${14 - dilemmaDiff} of 14 weeks`);
  console.log(`  a different season draws a different lottery: 14/14 matches, ${dilemmaDiff}/14 questions moved`);
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 10)) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
