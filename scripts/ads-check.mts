/**
 * A gem is paid for an ad watched through, never for a tap.
 *   node --experimental-strip-types scripts/ads-check.mts
 *
 * The button used to hand over the gem on the click. Now the tap opens a clip,
 * and the career only moves when the sitting is complete. Everything here is
 * fed to the pure session the way the player feeds it (a tick every quarter
 * second, then `ended`), and read back off the career:
 *   1. a clip watched straight through earns one gem and uses one sitting
 *   2. leaving the app at second six voids the sitting: no gem, the season's
 *      three are still three, and the career bytes are untouched, so a refresh
 *      mid ad changes nothing either
 *   3. a seek to the last second fires `ended` and earns nothing; nor does
 *      rewinding and replaying the first half, which adds up to the length
 *   4. the file's own duration wins over the catalogue, so a short number in
 *      the list cannot make a long clip cheap
 *   5. three sittings pay three gems, the fourth pays nothing, and a new season
 *      opens the three again
 *   6. the rotation never shows the same clip two sittings running, across the
 *      season line as well, and every clip gets its turn
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { ADS_PER_SEASON, GEMS_PER_AD } from '../src/game/packs.ts';
import { ADS } from '../src/data/ads.ts';
import * as A from '../src/game/adWatch.ts';

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

function career(seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  return gs;
}

/** ticks from `from` to `to`, a quarter second apart, the way a video reports */
function play(s: A.AdSession, from: number, to: number): A.AdSession {
  for (let t = from; t <= to + 1e-9; t += 0.25) s = A.advance(s, Math.min(t, to));
  return s;
}

/** a whole sitting, the honest way */
function sitThrough(gs: G.GameState): A.AdSession {
  let s = A.startAd(A.pickAd(gs));
  s = play(s, 0, s.seconds);
  return A.ended(s);
}

/** the thing the player does when a sitting ends */
function settle(gs: G.GameState, s: A.AdSession): G.GameState {
  return A.completed(s) ? G.watchAdForGem(gs) : gs;
}

/* 1. WATCHED THROUGH, ONE GEM, ONE SITTING. */
{
  const gs0 = career();
  const s = sitThrough(gs0);
  checked++;
  if (!A.completed(s)) fails.push(`a clip watched straight through is not complete (status ${s.status}, frontier ${s.frontier.toFixed(2)} of ${s.seconds})`);
  const gs = settle(gs0, s);
  checked += 2;
  if (gs.gems !== gs0.gems + GEMS_PER_AD) fails.push(`a full sitting paid ${gs.gems - gs0.gems} gems, not ${GEMS_PER_AD}`);
  if (G.adsLeft(gs) !== ADS_PER_SEASON - 1) fails.push(`a full sitting left ${G.adsLeft(gs)} sittings, not ${ADS_PER_SEASON - 1}`);
  console.log("  a clip watched through pays one gem and uses one of the season's sittings");
}

/* 2. LEAVING VOIDS THE SITTING, THE CAREER DOES NOT MOVE. */
{
  const gs0 = career();
  const before = JSON.stringify(gs0);
  let s = A.startAd(A.pickAd(gs0));
  s = play(s, 0, 6);
  s = A.hidden(s);
  // he comes back and the clip plays on to the end: the sitting is already void
  s = play(s, 6.25, s.seconds);
  s = A.ended(s);
  checked += 2;
  if (A.completed(s)) fails.push('a sitting left at second six and watched to the end on return counts as complete');
  if (s.status !== 'aborted' || s.reason !== 'hidden') fails.push(`leaving mid ad gave status ${s.status}/${s.reason}, expected aborted/hidden`);
  const gs = settle(gs0, s);
  checked += 3;
  if (gs.gems !== gs0.gems) fails.push('leaving mid ad paid a gem');
  if (G.adsLeft(gs) !== ADS_PER_SEASON) fails.push(`leaving mid ad used a sitting, ${G.adsLeft(gs)} left of ${ADS_PER_SEASON}`);
  if (JSON.stringify(gs) !== before) fails.push('a voided sitting changed the career');

  // a refresh mid ad: the save was written before the tap, nothing since
  store.clear();
  saveCareer(gs0);
  const back = loadCareer();
  checked++;
  if (!back || G.adsLeft(back) !== ADS_PER_SEASON || back.gems !== gs0.gems) fails.push('a refresh mid ad changed the gems or the sittings');

  // the X, and a file that will not play, are the same void
  const left = A.leave(play(A.startAd(A.pickAd(gs0)), 0, 3));
  const broke = A.failed(A.startAd(A.pickAd(gs0)));
  checked += 2;
  if (A.completed(left) || left.reason !== 'left') fails.push('the X did not void the sitting');
  if (A.completed(broke) || broke.reason !== 'error') fails.push('a broken file did not void the sitting');

  // and the next tap starts from the top
  const again = A.startAd(A.pickAd(gs));
  checked++;
  if (again.frontier !== 0 || again.pos !== 0 || again.status !== 'playing') fails.push('a new sitting did not start from zero');
  console.log('  leaving at second six voids the sitting: no gem, three still three, the career untouched');
}

/* 3. ENDED IS NOT ENOUGH: SEEKS AND REPLAYS. */
{
  const gs0 = career();
  // watch three seconds, jump to the last half second, let it end
  let s = A.startAd(A.pickAd(gs0));
  s = play(s, 0, 3);
  s = A.advance(s, s.seconds - 0.4);
  s = play(s, s.seconds - 0.25, s.seconds);
  s = A.ended(s);
  checked += 2;
  if (A.completed(s)) fails.push('a seek to the last second earned the gem');
  if (s.reason !== 'skipped') fails.push(`a seek to the end gave reason ${s.reason}, expected skipped`);

  // watch the first seven seconds twice: fourteen seconds of watching, half a clip seen
  let r = A.startAd(A.pickAd(gs0));
  r = play(r, 0, 7);
  r = A.advance(r, 0);
  r = play(r, 0.25, 7);
  checked++;
  if (r.frontier > 7 + 1e-6) fails.push(`replaying the first half pushed the frontier to ${r.frontier.toFixed(2)}`);
  r = A.advance(r, r.seconds);
  r = A.ended(r);
  checked++;
  if (A.completed(r)) fails.push('replaying the first half twice earned the gem');

  // but rewinding and then honestly playing on through does complete
  let h = A.startAd(A.pickAd(gs0));
  h = play(h, 0, 5);
  h = A.advance(h, 2);
  h = play(h, 2.25, h.seconds);
  h = A.ended(h);
  checked++;
  if (!A.completed(h)) fails.push('a rewind followed by playing on to the end was not complete');
  console.log('  ended alone earns nothing: a seek to the end, or the first half twice, is not a clip watched');
}

/* 4. THE FILE'S DURATION WINS OVER THE CATALOGUE. */
{
  const gs0 = career();
  const ad = A.pickAd(gs0);
  let s = A.withDuration(A.startAd(ad), ad.seconds + 4);
  s = play(s, 0, ad.seconds);
  checked++;
  if (A.watchedThrough(s)) fails.push('a clip four seconds longer than its catalogue entry counted as watched at the catalogue length');
  s = play(s, ad.seconds + 0.25, ad.seconds + 4);
  s = A.ended(s);
  checked++;
  if (!A.completed(s)) fails.push('the longer clip did not complete at its real length');
  const nan = A.withDuration(A.startAd(ad), NaN);
  checked++;
  if (nan.seconds !== ad.seconds) fails.push('an unknown duration replaced the catalogue length');
  console.log("  the file's own length is what has to be sat through");
}

/* 5. THREE A SEASON, NOT FOUR, AND THE NEW SEASON REOPENS THEM. */
{
  let gs = career();
  const start = gs.gems;
  for (let k = 0; k < ADS_PER_SEASON; k++) gs = settle(gs, sitThrough(gs));
  checked += 2;
  if (gs.gems !== start + ADS_PER_SEASON * GEMS_PER_AD) fails.push(`three sittings paid ${gs.gems - start} gems`);
  if (G.adsLeft(gs) !== 0) fails.push(`after three sittings ${G.adsLeft(gs)} are left`);
  const fourth = sitThrough(gs);
  gs = settle(gs, fourth);
  checked++;
  if (gs.gems !== start + ADS_PER_SEASON * GEMS_PER_AD) fails.push('a fourth sitting paid a gem');

  let guard = 0;
  while (gs.phase !== 'season-end' && !gs.sacking && guard++ < 40) gs = playRound(gs);
  checked++;
  if (gs.phase !== 'season-end') fails.push(`the season did not end (phase ${gs.phase}, sacking ${!!gs.sacking})`);
  else {
    gs = G.startNextSeason(gs);
    checked++;
    if (G.adsLeft(gs) !== ADS_PER_SEASON) fails.push(`the new season opened with ${G.adsLeft(gs)} sittings`);
  }
  console.log('  three sittings a season pay three gems, the fourth pays nothing, the new season reopens them');
}

/* 6. THE ROTATION. */
{
  checked++;
  if (ADS.length < 2) fails.push('fewer than two ads in the catalogue, the rotation has nothing to rotate');
  const seen = new Set<number>();
  let repeats = 0, pairs = 0;
  for (const seed of [1, 4242, 777, 31, 9091, 555, 12007, 88]) {
    let prev = -1;
    for (let season = 1; season <= 6; season++) {
      for (let k = 0; k < ADS_PER_SEASON; k++) {
        const i = A.adIndex(seed, season, k, 5);
        seen.add(i);
        if (prev >= 0) { pairs++; if (i === prev) repeats++; }
        prev = i;
      }
    }
  }
  checked += 2;
  if (repeats) fails.push(`the same clip came up two sittings running ${repeats} times in ${pairs}`);
  if (seen.size < 5) fails.push(`only ${seen.size} of 5 clips ever came up`);
  // deterministic, and the real catalogue goes through pickAd
  const gs = career();
  checked += 2;
  if (A.pickAd(gs).id !== A.pickAd(gs).id) fails.push('pickAd is not deterministic');
  if (!ADS.some(a => a.id === A.pickAd(gs).id)) fails.push('pickAd returned a clip not in the catalogue');
  console.log('  the rotation never repeats a clip back to back and every clip gets its turn');
}

console.log(`\n${checked} checks`);
if (fails.length) {
  console.log('\nFAIL');
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log('OK');
