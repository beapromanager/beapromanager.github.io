/**
 * A card sold from a pack is worth what the bench would get for him. No more.
 *   node --experimental-strip-types scripts/pack-check.mts
 *
 * The pack sale used to pay ninety percent of the book value, priced for a
 * real transfer market, while every other sale in the game pays the
 * division's fraction of it. In ליגה ג׳ a 48 rated keeper from a five gem
 * pack sold for ₪68K, twenty one times what the same man fetched from the
 * bench, and a quarter of a season's purse. Gems are the currency of packs;
 * this is the guard against them turning into shekels.
 *
 * Measured, not asserted against the formula: the same card is sold both
 * ways through the real state path. Once straight from the pack, once after
 * signing him and selling him off the bench in an open window, and the two
 * purses must move by the same amount, in every division and every pack.
 */
import * as G from '../src/game/state.ts';
import { PACKS } from '../src/game/packs.ts';
import { LEAGUE_NAMES } from '../src/data/clubs.ts';

const fails: string[] = [];
let checked = 0;
let pulls = 0;
const ratio: number[] = [];

/** A career in the summer market, where the window is open, lifted to a division. */
function summer(seed: number, tier: number): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) } };
  gs = G.enterPreseason(gs);
  return { ...gs, gems: 1000 };
}

for (const tier of [1, 2, 3, 4, 5]) {
  let worst = 0;
  for (const pack of PACKS) {
    for (let seed = 1; seed <= 12; seed++) {
      const base = summer(seed * 17 + tier, tier);
      const opened = G.buyPack(base, pack.id);
      if (!opened.pull) { fails.push(`${LEAGUE_NAMES[tier]} ${pack.id} #${seed}: no card came out`); continue; }
      pulls++;
      const card = opened.pull.player;

      // sold straight from the pack
      const fromPack = G.sellPull(opened).meters.money - opened.meters.money;

      // signed, then sold off the bench in the open summer window
      const signed = G.signPull(opened);
      checked++;
      if (!G.mySquad(signed).bench.some(p => p.id === card.id)) { fails.push(`${LEAGUE_NAMES[tier]} ${pack.id} #${seed}: ${card.name} was not on the bench after signing`); continue; }
      const sold = G.sellPlayer(signed, card.id);
      const fromBench = sold.meters.money - signed.meters.money;
      checked += 2;
      if (fromBench <= 0) fails.push(`${LEAGUE_NAMES[tier]} ${pack.id} #${seed}: the bench sale of ${card.name} paid ${fromBench}, was it blocked?`);
      if (fromPack !== fromBench)
        fails.push(`${LEAGUE_NAMES[tier]} ${pack.id} #${seed}: ${card.name} sells for ₪${fromPack} from the pack and ₪${fromBench} from the bench`);
      worst = Math.max(worst, fromPack);
      if (fromBench > 0) ratio.push(fromPack / fromBench);
    }
  }
  console.log(`  ${LEAGUE_NAMES[tier].padEnd(14)} dearest pack sale ₪${worst.toLocaleString('en-US')}`);
}

const avg = ratio.reduce((a, b) => a + b, 0) / ratio.length;
console.log(`  ${pulls} cards sold both ways, pack over bench ${avg.toFixed(2)}x`);

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 10)) console.log(`  - ${f}`);
  if (fails.length > 10) console.log(`  ... and ${fails.length - 10} more`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
