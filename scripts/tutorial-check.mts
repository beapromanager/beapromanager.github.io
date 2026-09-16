/**
 * The first-week explainer shows once, to a new manager, at the hub.
 *   node --experimental-strip-types scripts/tutorial-check.mts
 *
 * It used to hang off the click that ended the summer, on the condition that
 * the click landed on the hub. The day the sponsor screen was put between the
 * summer and the hub, that condition stopped being true, and no new manager
 * has seen the explainer since. Now the save owes it, and the hub asks. Four
 * things hold, walked along the path a real career takes:
 *   1. the step out of the summer does NOT land on the hub, which is exactly
 *      why the old trigger died; the explainer is owed anyway
 *   2. at the first hub it is due; once read it is not, and it stays read
 *      through a round, a refresh and a new season
 *   3. a save from before the flag existed is treated as already read, so
 *      nobody who has been playing for weeks gets a welcome
 *   4. it never fires on a screen that is not the hub, or under a notice
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const fails: string[] = [];
let checked = 0;

function playRound(gs: G.GameState): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed);
  gs = G.commitRound(gs, res);
  gs = G.continueFromResult(gs);
  while (gs.phase === 'press') gs = G.answerPress(gs, 0);
  if (gs.phase === 'chat') gs = G.closeChat(gs);
  return gs;
}

/* 1 and 2. A NEW CAREER, THE WHOLE WAY IN. */
{
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason(gs);
  checked++;
  if (G.tutorialDue(gs)) fails.push('the explainer is due in the summer market, before there is a hub');

  // the three summer rounds, the way the board advances them
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  checked++;
  if (gs.phase === 'hub') fails.push('the step out of the summer lands on the hub, so this check no longer proves the old trigger was dead');
  checked++;
  if (gs.tutorialSeen) fails.push('a brand new career has the explainer marked read');

  // whatever stands between the summer and the hub: the shirt, the sponsor
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  // the sponsor's welcome is read before the hub, and the explainer waits behind it
  while (gs.notices[0]?.kind === 'sponsor') gs = G.dismissNotice(gs);
  checked += 2;
  if (gs.phase !== 'hub') fails.push(`expected the hub after the sponsor, got ${gs.phase}`);
  if (!G.tutorialDue(gs)) fails.push('the explainer is not due at the first hub of a new career');

  gs = G.markTutorialSeen(gs);
  checked++;
  if (G.tutorialDue(gs)) fails.push('the explainer is still due after it was read');

  // it stays read: through a refresh, a round, and into next season
  store.clear();
  saveCareer(gs);
  const back = loadCareer();
  checked++;
  if (!back || G.tutorialDue(back) || !back.tutorialSeen) fails.push('a refresh forgot that the explainer was read');

  gs = playRound(gs);
  checked++;
  if (G.tutorialDue(gs)) fails.push('the explainer came back after the first round');
  let guard = 0;
  while (gs.phase !== 'season-end' && !gs.sacking && guard++ < 40) gs = playRound(gs);
  if (gs.phase === 'season-end') {
    gs = G.startNextSeason(gs);
    checked++;
    if (gs.tutorialSeen !== true) fails.push('a new season forgot that the explainer was read');
  }
  console.log('  a new manager is owed the explainer at the first hub, once, and it stays read');
}

/* 3. AN OLD SAVE IS NOT WELCOMED. */
{
  let gs = G.newGame(77);
  gs = G.setProfile(gs, { name: 'ותיק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'חיפה');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  // the sponsor's welcome is read before the hub, and the explainer waits behind it
  while (gs.notices[0]?.kind === 'sponsor') gs = G.dismissNotice(gs);
  store.clear();
  saveCareer(gs);
  // a save written before the flag existed has no such field at all
  const raw = JSON.parse(store.get('beapro.career.v1')!);
  delete raw.state.tutorialSeen;
  store.set('beapro.career.v1', JSON.stringify(raw));
  const back = loadCareer();
  checked += 2;
  if (!back) fails.push('the old save did not load');
  else {
    if (!back.tutorialSeen) fails.push('a save from before the flag loads with the explainer unread');
    if (G.tutorialDue(back)) fails.push('a manager who has been playing for weeks is shown the welcome');
  }
  console.log('  a save from before the flag is treated as already read');
}

/* 4. ONLY AT THE HUB, AND NOT UNDER A NOTICE. */
{
  let gs = G.newGame(9);
  gs = G.setProfile(gs, { name: 'חדש', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'רמת גן');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  // the sponsor's welcome is read before the hub, and the explainer waits behind it
  while (gs.notices[0]?.kind === 'sponsor') gs = G.dismissNotice(gs);
  checked += 3;
  if (!G.tutorialDue(gs)) fails.push('not due at a fresh hub');
  if (G.tutorialDue(G.openSquad(gs))) fails.push('due on the squad screen');
  const noticed = { ...gs, notices: [{ kind: 'story' as const, title: 'x', body: 'y' }] };
  if (G.tutorialDue(noticed)) fails.push('due while a notice is waiting, the two would stack');
  console.log('  it waits for the hub, and for the notices to clear');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
