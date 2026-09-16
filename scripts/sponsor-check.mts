/**
 * Two brands want the shirt, and they compete for it.
 *   node --experimental-strip-types scripts/sponsor-check.mts
 *
 * The sponsor used to be one name with three rows. Now each deal belongs to a
 * brand with a reason to want a football shirt, the brand turned down last
 * summer comes back offering more, and the one that kept the shirt three
 * seasons pays for the loyalty. Walked along real careers:
 *   1. every summer both brands are on the table, the laundry with the base
 *      deal and the shirt shop with results and crowd, at plain prices the
 *      first time
 *   2. turn a brand down and it comes back at twenty percent; again and it is
 *      thirty five, then fifty, and fifty is the ceiling. Keep a brand three
 *      seasons and its own price carries the loyalty ten
 *   3. switching brands restarts the run: the new brand's `since` is this
 *      season, and it is the OLD brand that comes back raised next summer
 *   4. signing queues the welcome as the first notice before the hub, naming
 *      the brand, and the hub follows once it is read
 *   5. the sponsor asks in its own voice: the demand names the brand and asks
 *      for one of that brand's own things, and is never asked with no sponsor
 *   6. the brand on the shirt leads the season's ads: its clip is the first
 *      sitting, the second is a different clip, and a brand with no clip
 *      leaves the rotation alone
 *   7. going up on the results deal puts the brand's lump on screen as a story
 *   8. a save from before the brands were characters loads: the old ULTRASKIT
 *      deal becomes that brand's, its run starting the season it was signed
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { brandRaise, COMEBACK_CAP, LOYALTY_RAISE, LOYALTY_SEASONS } from '../src/game/sponsor.ts';
import type { Sponsor } from '../src/game/sponsor.ts';
import { BRANDS, brandById } from '../src/data/sponsors.ts';
import { pickAd } from '../src/game/adWatch.ts';
import { requiredCapacity } from '../src/game/career.ts';

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

/** a new career walked to the first sponsor table */
function toFirstSummer(seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  return gs;
}

/** through the season to the next sponsor table, with the club kept safe from the sack */
function toNextSummer(gs: G.GameState): G.GameState {
  let guard = 0;
  while (gs.phase !== 'season-end' && !gs.sacking && guard++ < 40) gs = playRound(gs);
  if (gs.phase !== 'season-end') throw new Error(`the season did not end (phase ${gs.phase}, sacking ${!!gs.sacking})`);
  gs = G.startNextSeason(gs);
  gs = G.enterSeason(gs);
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  return gs;
}

const laundry = BRANDS.find(b => b.id === 'blacksheep')!;
const shop = BRANDS.find(b => b.id === 'ultraskit')!;

/* 1. THE TABLE, THE FIRST SUMMER. */
{
  const gs = toFirstSummer();
  checked++;
  if (gs.phase !== 'sponsor') fails.push(`the first summer did not reach the sponsor table (phase ${gs.phase})`);
  const offers = G.sponsorChoices(gs);
  checked += 4;
  if (offers.length !== 3) fails.push(`${offers.length} offers on the table, expected 3`);
  if (!offers.some(o => o.brand === 'blacksheep' && o.id === 'base')) fails.push('the laundry is not offering the base deal');
  if (!offers.some(o => o.brand === 'ultraskit' && o.id === 'results') || !offers.some(o => o.brand === 'ultraskit' && o.id === 'crowd')) fails.push('the shirt shop is not offering results and crowd');
  if (offers.some(o => o.raise !== 0 || o.perRound !== o.plainPerRound)) fails.push('a first summer price is raised');
  console.log('  the first summer: both brands, three deals, plain prices');
}

/* 2. THE COMEBACK LADDER AND THE LOYALTY, AS THE PRICE FUNCTION. */
{
  const held = (brand: 'blacksheep' | 'ultraskit', since: number, season: number): Sponsor =>
    ({ id: 'base', brand, name: '', perRound: 1000, promotionBonus: 0, followsCrowd: false, season, since });
  // the laundry has held the shirt since season 1; what does each summer look like
  const ladder = [2, 3, 4, 5, 6].map(s => brandRaise('ultraskit', held('blacksheep', 1, s - 1), s).raise);
  checked++;
  if (ladder.map(r => r.toFixed(2)).join(',') !== '0.20,0.35,0.50,0.50,0.50') fails.push(`the comeback ladder reads ${ladder.map(r => r.toFixed(2)).join(',')}, expected 0.20,0.35,0.50,0.50,0.50`);
  checked++;
  if (ladder.some(r => r > COMEBACK_CAP + 1e-9)) fails.push('the comeback passed the ceiling');
  const loyal = [2, 3, 4, 5].map(s => brandRaise('blacksheep', held('blacksheep', 1, s - 1), s));
  checked += 2;
  if (loyal[0].raise !== 0 || loyal[1].raise !== 0) fails.push('loyalty paid before three seasons');
  if (loyal[2].raise !== LOYALTY_RAISE || loyal[2].why !== 'loyalty' || loyal[3].raise !== LOYALTY_RAISE) fails.push(`loyalty did not pay from season ${LOYALTY_SEASONS + 1} on`);
  // a deal from two summers ago is not last summer's, nothing is raised
  checked++;
  if (brandRaise('ultraskit', held('blacksheep', 1, 2), 5).raise !== 0) fails.push('a stale deal raised a price');
  console.log('  turned down: twenty, thirty five, fifty, and fifty stays; kept three seasons: the loyalty ten');
}

/* 3. THE SAME LADDER ON A REAL CAREER, THEN A SWITCH. */
{
  let gs = toFirstSummer();
  gs = G.takeSponsor(gs, 'base', 'blacksheep');
  checked += 2;
  if (gs.sponsor?.brand !== 'blacksheep' || gs.sponsor.since !== 1) fails.push(`signing the laundry gave brand ${gs.sponsor?.brand}, since ${gs.sponsor?.since}`);
  if (gs.notices[0]?.kind !== 'sponsor') fails.push('no welcome queued after signing');
  gs = G.dismissNotice(gs);

  gs = toNextSummer(gs);
  let offers = G.sponsorChoices(gs);
  const shopBack = offers.find(o => o.brand === 'ultraskit' && o.id === 'results')!;
  const laundryAgain = offers.find(o => o.brand === 'blacksheep')!;
  checked += 3;
  if (Math.abs(shopBack.raise - 0.2) > 1e-9 || shopBack.raiseWhy !== 'comeback') fails.push(`in season 2 the shop's raise is ${shopBack.raise}/${shopBack.raiseWhy}, expected 0.2/comeback`);
  if (Math.abs(shopBack.perRound / shopBack.plainPerRound - 1.2) > 0.03) fails.push(`the shop's price ${shopBack.perRound} is not twenty percent over ${shopBack.plainPerRound}`);
  if (laundryAgain.raise !== 0) fails.push('the laundry raised its own price after one season');

  // switch to the shop: the run restarts, and next summer the laundry comes back
  gs = G.takeSponsor(gs, 'results', 'ultraskit');
  checked += 2;
  if (gs.sponsor?.brand !== 'ultraskit' || gs.sponsor.since !== 2) fails.push(`switching gave brand ${gs.sponsor?.brand}, since ${gs.sponsor?.since}`);
  if (gs.sponsor?.perRound !== shopBack.perRound) fails.push('the signed deal is not the raised offer');
  gs = G.dismissNotice(gs);
  gs = toNextSummer(gs);
  offers = G.sponsorChoices(gs);
  const laundryBack = offers.find(o => o.brand === 'blacksheep')!;
  const shopKept = offers.find(o => o.brand === 'ultraskit' && o.id === 'results')!;
  checked += 2;
  if (Math.abs(laundryBack.raise - 0.2) > 1e-9 || laundryBack.raiseWhy !== 'comeback') fails.push(`in season 3 the laundry's raise is ${laundryBack.raise}, expected 0.2 after being dropped once`);
  if (shopKept.raise !== 0) fails.push('the shop raised its own price after one season');

  // keep the shop: same brand straight on keeps the run
  gs = G.takeSponsor(gs, 'crowd', 'ultraskit');
  checked++;
  if (gs.sponsor?.since !== 2) fails.push(`keeping the shop on a different deal reset since to ${gs.sponsor?.since}`);
  console.log('  on a real career: the dropped brand comes back raised, a switch restarts the run');
}

/* 4. THE WELCOME BEFORE THE HUB. */
{
  let gs = toFirstSummer();
  gs = G.takeSponsor(gs, 'crowd', 'ultraskit');
  checked += 3;
  if (gs.phase !== 'hub') fails.push(`signing landed on ${gs.phase}, not the hub`);
  const n = gs.notices[0];
  if (!n || n.kind !== 'sponsor' || n.brand !== 'ultraskit') fails.push('the first notice after signing is not the shop\'s welcome');
  if (G.tutorialDue(gs)) fails.push('the explainer is due on top of the welcome');
  gs = G.dismissNotice(gs);
  checked++;
  if (gs.notices.some(x => x.kind === 'sponsor')) fails.push('the welcome stayed after it was read');
  console.log('  the welcome is the first word before the hub, and it is read once');
}

/* 5. THE SPONSOR ASKS IN ITS OWN VOICE. */
{
  let gs = toFirstSummer();
  const none = G.rollNamedDilemma(gs, 'sponsor_demand');
  checked++;
  if (none) fails.push('the sponsor asked for a favour before there was a sponsor');
  gs = G.dismissNotice(G.takeSponsor(gs, 'base', 'blacksheep'));
  const d = G.rollNamedDilemma(gs, 'sponsor_demand', 7);
  checked += 2;
  if (!d || !d.speakerLabel.includes(laundry.name)) fails.push(`the laundry's demand is signed ${d?.speakerLabel}`);
  if (!d || !laundry.wants.some(w => d.text.includes(w))) fails.push(`the laundry asked for something not its own: ${d?.text}`);
  if (d && shop.wants.some(w => d.text.includes(w))) fails.push('the laundry asked for the shop\'s thing');
  console.log('  the demand is signed by the brand on the shirt and asks for its own things');
}

/* 6. THE SHIRT LEADS THE ADS. */
{
  // a summer whose plain rotation would NOT have opened with the shop, so the
  // shirt is the only thing that can put it first
  let gs = toFirstSummer();
  for (const seed of [4242, 777, 31, 9091, 555, 12007, 88, 4004, 5, 9]) {
    gs = toFirstSummer(seed);
    if (pickAd(gs).id !== 'ultraskit') break;
  }
  checked++;
  if (pickAd(gs).id === 'ultraskit') fails.push('no seed found whose plain rotation opens with another clip');
  gs = G.dismissNotice(G.takeSponsor(gs, 'results', 'ultraskit'));
  const first = pickAd({ ...gs, sponsorAd: G.sponsorAdId(gs) });
  const second = pickAd({ ...gs, adsWatched: 1, sponsorAd: G.sponsorAdId(gs) });
  checked += 3;
  if (G.sponsorAdId(gs) !== 'ultraskit') fails.push(`the shop's ad id reads ${G.sponsorAdId(gs)}`);
  if (first.id !== 'ultraskit') fails.push(`with the shop on the shirt the first ad is ${first.id}`);
  if (second.id === 'ultraskit') fails.push('the shop\'s ad ran twice running');
  let l = toFirstSummer(777);
  l = G.dismissNotice(G.takeSponsor(l, 'base', 'blacksheep'));
  checked += 2;
  if (G.sponsorAdId(l) !== null) fails.push('the laundry has an ad it does not have');
  if (pickAd({ ...l, sponsorAd: G.sponsorAdId(l) }).id !== pickAd(l).id) fails.push('a brand with no clip changed the rotation');
  console.log('  the brand on the shirt gets the first sitting, not the second, and a brand with no clip changes nothing');
}

/* 7. THE LUMP ON PROMOTION IS A STORY. */
{
  let gs = toFirstSummer();
  gs = G.dismissNotice(G.takeSponsor(gs, 'results', 'ultraskit'));
  const bonus = gs.sponsor!.promotionBonus;
  let guard = 0;
  while (gs.phase !== 'season-end' && !gs.sacking && guard++ < 40) gs = playRound(gs);
  checked++;
  if (gs.phase !== 'season-end') fails.push('the season did not end for the promotion story');
  else {
    // hand the club the title and a ground big enough to go up
    const row = gs.league.table[gs.clubId];
    const rigged: G.GameState = {
      ...gs,
      league: { ...gs.league, table: { ...gs.league.table, [gs.clubId]: { ...row, pts: 999, gf: row.gf + 99 } } },
      stadium: { ...gs.stadium, capacity: Math.max(gs.stadium.capacity, requiredCapacity(2)) },
    };
    const before = rigged.meters.money;
    const next = G.startNextSeason(rigged);
    const story = next.notices.find(n => n.kind === 'story' && n.title.includes(shop.name));
    checked += 2;
    if (!story) fails.push(`no story from ${shop.name} after going up (notices: ${next.notices.map(n => n.kind).join(',') || 'none'})`);
    if (next.meters.money < before + bonus) fails.push('the lump was not paid');
  }
  console.log('  going up on the results deal puts the brand\'s lump on screen');
}

/* 8. A SAVE FROM BEFORE THE BRANDS. */
{
  let gs = toFirstSummer();
  gs = G.dismissNotice(G.takeSponsor(gs, 'base', 'blacksheep'));
  store.clear();
  saveCareer(gs);
  const raw = JSON.parse(store.get('beapro.career.v1')!);
  raw.state.sponsor = { id: 'base', brand: 'ULTRASKIT', name: 'חוזה בסיס', perRound: 1500, promotionBonus: 0, followsCrowd: false, season: 1 };
  store.set('beapro.career.v1', JSON.stringify(raw));
  const back = loadCareer();
  checked += 3;
  if (!back) fails.push('the old save did not load');
  else {
    if (back.sponsor?.brand !== 'ultraskit') fails.push(`the old ULTRASKIT deal became brand ${back.sponsor?.brand}`);
    if (back.sponsor?.since !== 1) fails.push(`the old deal's run starts in ${back.sponsor?.since}, not the season it was signed`);
    const played = playRound(back);
    if (played.week === back.week) fails.push('the old save did not play a round');
    if (!brandById(back.sponsor!.brand)) fails.push('the old brand has no entry');
  }
  console.log('  an old save keeps its deal, under the brand it belonged to');
}

console.log(`\n${checked} checks`);
if (fails.length) {
  console.log('\nFAIL');
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log('OK');
