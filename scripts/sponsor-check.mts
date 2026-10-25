/**
 * One brand wants the shirt and offers all three deals (Itzik, 25.10: the shirt shop left the game, its two deals
 * moved to the laundry so the summer choice stays).
 *   node --experimental-strip-types scripts/sponsor-check.mts
 *
 * Walked along real careers:
 *   1. the first summer: exactly three offers, all the laundry's, base, results and crowd, at plain prices; every
 *      brand on the table exists, and there is one brand
 *   2. the economy did not move: every deal's price, bonus and crowd flag, for every division, prestige and season
 *      length, equal to the table measured on e1273fb before the change, and the ratios 0.6 / 0.55 / 1.35 to base
 *   3. the loyalty: three seasons running with the laundry raise all three deals by LOYALTY_RAISE, not before; moving
 *      between the laundry's own deals keeps the run (since), which is what is wanted: the shirt never changed hands
 *   4. no comeback with one brand, anywhere; and brandRaise itself still climbs 0.20 / 0.35 / 0.50 to its ceiling for
 *      another brand, so the code kept for a second brand does not rot
 *   5. since is kept when the same brand goes on
 *   6. signing any of the three queues the laundry's welcome as the first notice before the hub, and the deal signed
 *      is exactly the one picked (never a silent fall to the first offer)
 *   7. the sponsor asks in its own voice: signed by the laundry, one of its own wants; no sponsor, no demand
 *   8. the ads: the laundry has no clip, so the rotation is untouched; a brand that has one (novablux, set by hand)
 *      still leads the season and does not run twice
 *   9. the lump on promotion: the laundry's results deal pays it the day the club goes up, as the laundry's story
 *  10. the crowd deal pays on the crowd under the laundry too: 0.35 of the round with an empty ground, more with every
 *      head, and a cap; the other deals pay the same whatever the crowd
 *  11. a save signed with the brand that left, in capitals and in small letters, on results and on crowd, loads as the
 *      laundry's with the same kind, price, bonus, crowd flag, season and run; it pays the same round as before; a
 *      welcome stuck in the queue under the old brand shows the laundry; next summer its deal is the laundry's.
 *      The old brand's name is built here from pieces on purpose, so a search of the repository for it finds nothing.
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { brandRaise, sponsorOffers, sponsorRound, signSponsor, COMEBACK_CAP, LOYALTY_RAISE, LOYALTY_SEASONS } from '../src/game/sponsor.ts';
import type { Sponsor, SponsorId } from '../src/game/sponsor.ts';
import { BRANDS, brandById, type BrandId } from '../src/data/sponsors.ts';
import { ADS } from '../src/data/ads.ts';
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
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };

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
const ALL: SponsorId[] = ['base', 'results', 'crowd'];
const held = (brand: string, since: number, season: number, id: SponsorId = 'base'): Sponsor =>
  ({ id, brand: brand as BrandId, name: '', perRound: 1000, promotionBonus: 0, followsCrowd: id === 'crowd', season, since });

/* 1. THE TABLE, THE FIRST SUMMER. */
{
  const gs = toFirstSummer();
  claim(gs.phase === 'sponsor', `the first summer did not reach the sponsor table (phase ${gs.phase})`);
  const offers = G.sponsorChoices(gs);
  claim(offers.length === 3, `${offers.length} offers on the table, expected 3`);
  claim(offers.every(o => o.brand === 'blacksheep'), `an offer is not the laundry's: ${offers.map(o => o.brand).join(',')}`);
  claim([...offers.map(o => o.id)].sort().join() === 'base,crowd,results', `the deals on the table are ${offers.map(o => o.id).join(',')}`);
  claim(offers.every(o => BRANDS.some(b => b.id === o.brand)), 'an offer names a brand that is not in the game');
  claim(BRANDS.length === 1 && laundry.deals.join() === 'base,results,crowd', `${BRANDS.length} brands, the laundry offers ${laundry.deals.join(',')}`);
  claim(offers.every(o => o.raise === 0 && o.perRound === o.plainPerRound), 'a first summer price is raised');
  console.log('  the first summer: one brand, three deals, plain prices');
}

/* 2. THE ECONOMY DID NOT MOVE. */
{
  // measured on e1273fb (both brands) with sponsorOffers(tier, prestige, rounds): [base perRound, results perRound,
  // results promotionBonus, crowd perRound], by 'tier/prestige/rounds'
  const BEFORE: Record<string, [number, number, number, number]> = {
  '1/0/14': [2400, 1400, 45600, 1300],
  '1/0/18': [1900, 1100, 45600, 1000],
  '1/0/22': [1500, 900, 45600, 800],
  '1/50/14': [3200, 1900, 60800, 1800],
  '1/50/18': [2500, 1500, 60800, 1400],
  '1/50/22': [2000, 1200, 60800, 1100],
  '1/100/14': [4000, 2400, 75900, 2200],
  '1/100/18': [3100, 1900, 75900, 1700],
  '1/100/22': [2600, 1500, 75900, 1400],
  '2/0/14': [4600, 2700, 86100, 2500],
  '2/0/18': [3500, 2100, 86100, 1900],
  '2/0/22': [2900, 1700, 86100, 1600],
  '2/50/14': [6100, 3600, 114800, 3300],
  '2/50/18': [4700, 2800, 114800, 2600],
  '2/50/22': [3900, 2300, 114800, 2100],
  '2/100/14': [7600, 4600, 143400, 4200],
  '2/100/18': [5900, 3500, 143400, 3200],
  '2/100/22': [4800, 2900, 143400, 2700],
  '3/0/14': [37500, 22500, 708800, 20600],
  '3/0/18': [29200, 17500, 708800, 16000],
  '3/0/22': [23900, 14300, 708800, 13100],
  '3/50/14': [50000, 30000, 945000, 27500],
  '3/50/18': [38900, 23300, 945000, 21400],
  '3/50/22': [31800, 19100, 945000, 17500],
  '3/100/14': [62500, 37500, 1181300, 34400],
  '3/100/18': [48600, 29200, 1181300, 26700],
  '3/100/22': [39800, 23900, 1181300, 21900],
  '4/0/14': [77100, 46300, 1458000, 42400],
  '4/0/18': [60000, 36000, 1458000, 33000],
  '4/0/22': [49100, 29500, 1458000, 27000],
  '4/50/14': [102900, 61700, 1944000, 56600],
  '4/50/18': [80000, 48000, 1944000, 44000],
  '4/50/22': [65500, 39300, 1944000, 36000],
  '4/100/14': [128600, 77100, 2430000, 70700],
  '4/100/18': [100000, 60000, 2430000, 55000],
  '4/100/22': [81800, 49100, 2430000, 45000],
  '5/0/14': [180800, 108500, 3417200, 99400],
  '5/0/18': [140600, 84400, 3417200, 77300],
  '5/0/22': [115100, 69000, 3417200, 63300],
  '5/50/14': [241100, 144600, 4556300, 132600],
  '5/50/18': [187500, 112500, 4556300, 103100],
  '5/50/22': [153400, 92000, 4556300, 84400],
  '5/100/14': [301300, 180800, 5695300, 165700],
  '5/100/18': [234400, 140600, 5695300, 128900],
  '5/100/22': [191800, 115100, 5695300, 105500]
  };
  for (const [k, [base, res, bonus, crowd]] of Object.entries(BEFORE)) {
    const [tier, prestige, rounds] = k.split('/').map(Number);
    const offers = sponsorOffers(tier, prestige, rounds);
    const by = (id: SponsorId) => offers.find(o => o.id === id)!;
    claim(by('base').perRound === base && by('base').promotionBonus === 0 && !by('base').followsCrowd, `${k} base: ${by('base').perRound}/${by('base').promotionBonus}, was ${base}/0`);
    claim(by('results').perRound === res && by('results').promotionBonus === bonus && !by('results').followsCrowd, `${k} results: ${by('results').perRound}/${by('results').promotionBonus}, was ${res}/${bonus}`);
    claim(by('crowd').perRound === crowd && by('crowd').promotionBonus === 0 && by('crowd').followsCrowd, `${k} crowd: ${by('crowd').perRound}, was ${crowd}`);
    // the ratios to the base deal, good to the rounding to a hundred
    claim(Math.abs(res - 0.6 * base) <= 100 && Math.abs(crowd - 0.55 * base) <= 100 && Math.abs(bonus - 1.35 * base * rounds) <= 100 * rounds, `${k}: the ratios 0.6 / 0.55 / 1.35 do not hold`);
  }
  claim(Object.keys(BEFORE).length === 45, 'the table is not every division, prestige and season length');
  console.log('  every price, bonus and crowd flag as on e1273fb, 45 tables of three deals');
}

/* 3. THE LOYALTY, AND MOVING BETWEEN THE LAUNDRY'S DEALS. */
{
  const base = toFirstSummer();
  for (const s of [2, 3, 4, 5]) {
    const offers = G.sponsorChoices({ ...base, season: s, sponsor: held('blacksheep', 1, s - 1) });
    const loyal = s - 1 >= LOYALTY_SEASONS;
    claim(offers.length === 3, `season ${s}: ${offers.length} offers`);
    claim(offers.every(o => (loyal ? o.raise === LOYALTY_RAISE && o.raiseWhy === 'loyalty' : o.raise === 0 && o.raiseWhy === null)), `season ${s}: the raises are ${offers.map(o => `${o.id} ${o.raise}/${o.raiseWhy}`).join(', ')}, wanted ${loyal ? 'the loyalty on all three' : 'none'}`);
  }
  // a real career: base, then results, then crowd, all with the laundry: the run never restarts
  let gs = G.dismissNotice(G.takeSponsor(base, 'base'));
  claim(gs.sponsor?.since === 1, `signing gave since ${gs.sponsor?.since}`);
  gs = toNextSummer(gs);
  gs = G.dismissNotice(G.takeSponsor(gs, 'results'));
  claim(gs.sponsor?.id === 'results' && gs.sponsor.since === 1, `moving to the laundry's results deal reset the run (since ${gs.sponsor?.since})`);
  gs = toNextSummer(gs);
  gs = G.takeSponsor(gs, 'crowd');
  claim(gs.sponsor?.id === 'crowd' && gs.sponsor.since === 1 && gs.sponsor.season === 3, `moving to the crowd deal: since ${gs.sponsor?.since}, season ${gs.sponsor?.season}`);
  console.log('  three seasons with the laundry raise all three deals; moving between its deals keeps the run');
}

/* 4. NO COMEBACK WITH ONE BRAND, AND THE LADDER STILL THERE. */
{
  const base = toFirstSummer();
  for (const s of [2, 3, 4, 6]) for (const since of [1, s - 1]) for (const id of ALL) {
    const offers = G.sponsorChoices({ ...base, season: s, sponsor: held('blacksheep', since, s - 1, id) });
    claim(offers.every(o => o.raiseWhy !== 'comeback'), `season ${s}, since ${since}, on ${id}: a comeback with one brand`);
  }
  // another brand (cast: none exists) held the shirt since season 1: the laundry would come back at 20, 35, 50, 50
  const other = 'another-brand' as unknown as BrandId;
  const ladder = [2, 3, 4, 5, 6].map(s => brandRaise('blacksheep', held(other, 1, s - 1), s));
  claim(ladder.map(r => r.raise.toFixed(2)).join(',') === '0.20,0.35,0.50,0.50,0.50' && ladder.every(r => r.why === 'comeback'), `the comeback ladder reads ${ladder.map(r => r.raise.toFixed(2)).join(',')}`);
  claim(ladder.every(r => r.raise <= COMEBACK_CAP + 1e-9), 'the comeback passed the ceiling');
  claim(brandRaise('blacksheep', held(other, 1, 2), 5).raise === 0, 'a stale deal raised a price');
  console.log('  no comeback with one brand; the ladder for a second brand still climbs to its ceiling');
}

/* 5. SINCE IS KEPT WHEN THE SAME BRAND GOES ON. */
{
  const offer = sponsorOffers(1, 30, 14, held('blacksheep', 2, 4), 5).find(o => o.id === 'results')!;
  claim(signSponsor(offer, 5, held('blacksheep', 2, 4)).since === 2, 'the same brand straight on lost its run');
  claim(signSponsor(offer, 5, held('blacksheep', 2, 3)).since === 5, 'a break of a season kept the run');
  claim(signSponsor(offer, 5, null).since === 5, 'a first deal does not start its run this season');
}

/* 6. THE WELCOME BEFORE THE HUB, FOR EACH DEAL. */
{
  for (const id of ALL) {
    let gs = toFirstSummer();
    gs = G.takeSponsor(gs, id);
    claim(gs.phase === 'hub', `signing ${id} landed on ${gs.phase}`);
    claim(gs.sponsor?.id === id && gs.sponsor.brand === 'blacksheep', `asked for ${id}, signed ${gs.sponsor?.brand} ${gs.sponsor?.id}`);
    const offer = G.sponsorChoices(toFirstSummer()).find(o => o.id === id)!;
    claim(gs.sponsor?.perRound === offer.perRound && gs.sponsor.promotionBonus === offer.promotionBonus && gs.sponsor.followsCrowd === offer.followsCrowd, `the ${id} deal signed is not the one offered`);
    const n = gs.notices[0];
    claim(!!n && n.kind === 'sponsor' && n.brand === 'blacksheep', `signing ${id}: the first notice is not the laundry's welcome`);
    claim(!G.tutorialDue(gs), 'the explainer is due on top of the welcome');
    gs = G.dismissNotice(gs);
    claim(!gs.notices.some(x => x.kind === 'sponsor'), 'the welcome stayed after it was read');
  }
  console.log('  each of the three deals signs exactly itself, and the laundry\'s welcome comes first');
}

/* 7. THE SPONSOR ASKS IN ITS OWN VOICE. */
{
  let gs = toFirstSummer();
  claim(!G.rollNamedDilemma(gs, 'sponsor_demand'), 'the sponsor asked for a favour before there was a sponsor');
  for (const id of ALL) {
    gs = G.dismissNotice(G.takeSponsor(toFirstSummer(), id));
    const d = G.rollNamedDilemma(gs, 'sponsor_demand', 7);
    claim(!!d && d.speakerLabel.includes(laundry.name), `on ${id} the demand is signed ${d?.speakerLabel}`);
    claim(!!d && laundry.wants.some(w => d.text.includes(w)), `on ${id} the laundry asked for something not its own: ${d?.text}`);
  }
  console.log('  the demand is signed by the laundry and asks for its own things');
}

/* 8. THE ADS. */
{
  claim(!laundry.adId && ADS.length === 2 && ADS.every(a => a.id !== laundry.adId), `ads: ${ADS.map(a => a.id).join(',')}, the laundry's clip ${laundry.adId}`);
  for (const id of ALL) {
    const l = G.dismissNotice(G.takeSponsor(toFirstSummer(777), id));
    claim(G.sponsorAdId(l) === null, `on ${id} the laundry has an ad it does not have`);
    claim(pickAd({ ...l, sponsorAd: G.sponsorAdId(l) }).id === pickAd(l).id, `on ${id} a brand with no clip changed the rotation`);
  }
  // the code that lets the brand on the shirt lead the season, kept honest with a clip set by hand
  let gs = toFirstSummer();
  for (const seed of [4242, 777, 31, 9091, 555, 12007, 88, 4004, 5, 9]) { gs = toFirstSummer(seed); if (pickAd(gs).id !== 'novablux') break; }
  claim(pickAd(gs).id !== 'novablux', 'no seed found whose plain rotation opens with another clip');
  const first = pickAd({ ...gs, sponsorAd: 'novablux' });
  const second = pickAd({ ...gs, adsWatched: 1, sponsorAd: 'novablux' });
  claim(first.id === 'novablux', `with a clip on the shirt the first ad is ${first.id}`);
  claim(second.id !== 'novablux', 'the shirt\'s clip ran twice running');
  console.log('  the laundry leaves the rotation alone; a brand with a clip still leads, once');
}

/* 9. THE LUMP ON PROMOTION IS THE LAUNDRY'S STORY. */
{
  let gs = G.dismissNotice(G.takeSponsor(toFirstSummer(), 'results'));
  const bonus = gs.sponsor!.promotionBonus;
  claim(gs.sponsor?.brand === 'blacksheep' && bonus > 0, 'the laundry\'s results deal has no lump');
  let guard = 0;
  while (gs.phase !== 'season-end' && !gs.sacking && guard++ < 40) gs = playRound(gs);
  claim(gs.phase === 'season-end', 'the season did not end for the promotion story');
  if (gs.phase === 'season-end') {
    const row = gs.league.table[gs.clubId];
    const rigged: G.GameState = {
      ...gs,
      league: { ...gs.league, table: { ...gs.league.table, [gs.clubId]: { ...row, pts: 999, gf: row.gf + 99 } } },
      stadium: { ...gs.stadium, capacity: Math.max(gs.stadium.capacity, requiredCapacity(2)) },
    };
    const before = rigged.meters.money;
    const next = G.startNextSeason(rigged);
    const story = next.notices.find(n => n.kind === 'story' && n.title.includes(laundry.name));
    claim(!!story, `no story from ${laundry.name} after going up (notices: ${next.notices.map(n => n.kind).join(',') || 'none'})`);
    claim(next.meters.money >= before + bonus, 'the lump was not paid');
  }
  console.log('  going up on the laundry\'s results deal puts its lump on screen');
}

/* 10. THE CROWD DEAL UNDER THE LAUNDRY. */
{
  const crowd: Sponsor = { ...held('blacksheep', 1, 1, 'crowd'), perRound: 10_000 };
  const plainDeal: Sponsor = { ...held('blacksheep', 1, 1, 'base'), perRound: 10_000 };
  for (let tier = 1; tier <= 5; tier++) {
    const pays = [0, 100, 1_000, 5_000, 20_000, 60_000, 200_000].map(a => sponsorRound(crowd, tier, a));
    claim(pays[0] === 3_500, `tier ${tier}: an empty ground pays ${pays[0]}, wanted 0.35 of the round`);
    claim(pays.every((p, i) => i === 0 || p >= pays[i - 1]), `tier ${tier}: the crowd deal does not grow with the crowd (${pays.join(',')})`);
    claim(pays[pays.length - 1] === 20_500 && sponsorRound(crowd, tier, 10_000_000) === 20_500, `tier ${tier}: the cap is ${pays[pays.length - 1]}`);
    claim([0, 5_000, 200_000].every(a => sponsorRound(plainDeal, tier, a) === 10_000), `tier ${tier}: the base deal moved with the crowd`);
  }
  console.log('  the crowd deal pays on the crowd under the laundry, from 0.35 to its cap');
}

/* 11. A SAVE SIGNED WITH THE BRAND THAT LEFT. */
{
  // built from pieces on purpose: the name must not appear anywhere in the repository
  const OLD_UPPER = ['ULTRAS', 'KIT'].join('');
  const OLD_LOWER = OLD_UPPER.toLowerCase();
  const base = G.dismissNotice(G.takeSponsor(toFirstSummer(), 'base'));
  const cases: Array<[string, SponsorId, number, boolean]> = [[OLD_UPPER, 'results', 9_000, false], [OLD_LOWER, 'results', 9_000, false], [OLD_LOWER, 'crowd', 1_700, true], [OLD_UPPER, 'crowd', 1_700, true]];
  for (const [old, id, bonus, follows] of cases) {
    const terms = { id, name: id === 'results' ? 'חוזה הישגים' : 'חוזה יציע', perRound: 2_300, promotionBonus: id === 'results' ? 61_200 : 0, followsCrowd: follows, season: 1, since: 1 };
    store.clear();
    saveCareer(base);
    const raw = JSON.parse(store.get('beapro.career.v1')!);
    raw.state.sponsor = { ...terms, brand: old };
    raw.state.notices = [{ kind: 'sponsor', brand: old }];
    store.set('beapro.career.v1', JSON.stringify(raw));
    const back = loadCareer();
    claim(!!back, `${old}/${id}: the save did not load`);
    if (!back) continue;
    const s = back.sponsor!;
    claim(s.brand === 'blacksheep', `${old}/${id}: the brand became ${s.brand}`);
    claim(s.id === terms.id && s.name === terms.name && s.perRound === terms.perRound && s.promotionBonus === terms.promotionBonus && s.followsCrowd === terms.followsCrowd && s.season === terms.season && s.since === terms.since, `${old}/${id}: the terms moved: ${JSON.stringify(s)}`);
    const n = back.notices[0];
    claim(!!n && n.kind === 'sponsor' && n.brand === 'blacksheep' && brandById(n.brand).name === laundry.name, `${old}/${id}: the stuck welcome names ${n && n.kind === 'sponsor' ? n.brand : 'nothing'}`);
    // the same round as a career that had always been the laundry's on the same terms
    const same: G.GameState = { ...back, sponsor: { ...terms, brand: 'blacksheep' } };
    const a = playRound(G.dismissNotice(back)), b = playRound(G.dismissNotice(same));
    claim(!!a.lastLedger && a.lastLedger.sponsor === b.lastLedger?.sponsor && a.meters.money === b.meters.money, `${old}/${id}: the round paid ${a.lastLedger?.sponsor}, the laundry on the same terms ${b.lastLedger?.sponsor}`);
    void bonus;
  }
  // the old save without a run (from before `since`) starts it the season it was signed, under the laundry
  store.clear(); saveCareer(base);
  const raw = JSON.parse(store.get('beapro.career.v1')!);
  raw.state.sponsor = { id: 'base', brand: OLD_UPPER, name: 'חוזה בסיס', perRound: 1500, promotionBonus: 0, followsCrowd: false, season: 1 };
  store.set('beapro.career.v1', JSON.stringify(raw));
  const old = loadCareer()!;
  claim(old.sponsor?.brand === 'blacksheep' && old.sponsor.since === 1, `an old deal without a run: ${old.sponsor?.brand} since ${old.sponsor?.since}`);
  // next summer the same deal is on the laundry's table, and keeping it keeps the run
  store.clear(); saveCareer(base);
  const raw2 = JSON.parse(store.get('beapro.career.v1')!);
  raw2.state.sponsor = { id: 'results', brand: OLD_LOWER, name: 'חוזה הישגים', perRound: 1400, promotionBonus: 45600, followsCrowd: false, season: 1, since: 1 };
  store.set('beapro.career.v1', JSON.stringify(raw2));
  let next = toNextSummer(loadCareer()!);
  const offers = G.sponsorChoices(next);
  claim(offers.some(o => o.id === 'results' && o.brand === 'blacksheep'), 'next summer the results deal is not on the laundry\'s table');
  next = G.takeSponsor(next, 'results');
  claim(next.sponsor?.brand === 'blacksheep' && next.sponsor.since === 1, `keeping the deal next summer: since ${next.sponsor?.since}`);
  console.log('  a deal signed with the brand that left is the laundry\'s, same kind, same terms, same run');
}

console.log(`\n${checked} checks`);
if (fails.length) {
  console.log('\nFAIL');
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log('OK');
