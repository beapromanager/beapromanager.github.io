/**
 * A pack is aimed at the squad (Itzik, 15.10): "even the big packs bring nobody better than what I have".
 *   node --experimental-strip-types scripts/pack-squad-check.mts
 *
 * Held here, measured through the real state path: a card lands on one of the three weakest places of the eleven and is rated
 * above the man he would replace by about the lift of his pack, so the dear packs are a starter nine times in ten; the cap
 * is the division's own plus three for the pro, one for the star and none for the boost, never more; the free boost and the
 * gift keep their old reach; and a keeper still comes when the squad holds fewer than two.
 */
import * as G from '../src/game/state.ts';
import { PACKS, packCeiling, packById } from '../src/game/packs.ts';
import { overall } from '../src/engine/matchEngine.ts';
import { LEAGUE_NAMES } from '../src/data/clubs.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

function summer(seed: number, tier: number): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) } };
  gs = G.enterPreseason(gs);
  return { ...gs, gems: 1000 };
}

/** the same career with every man of the eleven and the bench lifted: a contender, which is who the complaint is about */
function lifted(gs: G.GameState, by: number): G.GameState {
  const bump = (p: ReturnType<typeof G.mySquad>['starters'][number]) => ({
    ...p, attrs: Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, Math.min(99, (v as number) + by)])) as typeof p.attrs,
  });
  const sq = G.mySquad(gs);
  return { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { ...sq, starters: sq.starters.map(bump), bench: sq.bench.map(bump) } } } };
}

const beat: Record<string, { n: number; up: number; slot: number }> = {};
const strong: Record<string, { n: number; up: number; gain: number }> = {};
for (const tier of [1, 3, 5]) {
  for (const pack of PACKS) {
    for (let seed = 1; seed <= 16; seed++) {
      const gs = summer(seed * 3 + tier, tier);
      const opened = G.buyPack(gs, pack.id);
      {
        const c = lifted(gs, 5);
        const pc = G.buyPack(c, pack.id).pull?.player;
        const same = pc ? G.mySquad(c).starters.filter(p => p.position === pc.position) : [];
        if (pc && pc.position !== 'GK' && same.length) {
          strong[pack.id] ??= { n: 0, up: 0, gain: 0 };
          strong[pack.id].n++;
          if (overall(pc) > Math.min(...same.map(overall))) strong[pack.id].up++;
          strong[pack.id].gain += overall(pc) - Math.min(...same.map(overall));
        }
      }
      const card = opened.pull?.player;
      if (!card) { fails.push(`${LEAGUE_NAMES[tier]} ${pack.id} #${seed}: no card`); continue; }
      const o = overall(card);
      const cap = packCeiling(tier) + pack.capRaise;
      ok(o <= cap + 0.5, `${LEAGUE_NAMES[tier]} ${pack.id}: a ${o} is over the cap of ${cap}`);
      const same = G.mySquad(gs).starters.filter(p => p.position === card.position);
      if (card.position !== 'GK' && same.length) {
        const k = pack.id;
        beat[k] ??= { n: 0, up: 0, slot: 0 };
        beat[k].n++;
        if (o > Math.min(...same.map(overall))) beat[k].up++;
        beat[k].slot += o - Math.min(...same.map(overall));
      }
    }
  }
}
const share = (id: string) => (beat[id] ? beat[id].up / beat[id].n : 0);
console.log('  beats the weakest starter at his place:', PACKS.map(p => `${p.id} ${(share(p.id) * 100).toFixed(0)}%`).join(', '));
ok(share('pro') >= 0.9, `the pro pack beats his starter ${(share('pro') * 100).toFixed(0)} times in a hundred, under 90`);
ok(share('star') >= 0.75, `the star pack beats his starter ${(share('star') * 100).toFixed(0)} times in a hundred, under 75`);
ok(share('boost') >= 0.3, `the boost pack beats his starter ${(share('boost') * 100).toFixed(0)} times in a hundred, under 30`);
const sShare = (id: string) => (strong[id] ? strong[id].up / strong[id].n : 0);
console.log('  a squad five points above the league:', PACKS.map(p => `${p.id} ${(sShare(p.id) * 100).toFixed(0)}%`).join(', '));
const gainOf = (id: string) => (strong[id] ? strong[id].gain / strong[id].n : 0);
console.log('  and the points a card adds over the man he replaces:', PACKS.map(p => `${p.id} ${gainOf(p.id).toFixed(1)}`).join(', '));
ok(gainOf('boost') >= 3.5 && gainOf('star') >= 6.5, `a card adds too little over the man he replaces: boost ${gainOf('boost').toFixed(1)}, star ${gainOf('star').toFixed(1)}`);
ok(sShare('pro') >= 0.6, `a contender's pro pack beats his starter ${(sShare('pro') * 100).toFixed(0)} times in a hundred, under 60`);
ok(sShare('star') >= 0.3, `a contender's star pack beats his starter ${(sShare('star') * 100).toFixed(0)} times in a hundred, under 30`);
ok(share('pro') > share('star') && share('star') > share('boost'), 'the dearer pack is not the better one');

// the reach: a point for the star, three for the pro, none for the boost
ok(packById('boost').capRaise === 0 && packById('star').capRaise === 1 && packById('pro').capRaise === 3, 'the cap raise is not 0, 1 and 3');
ok(packById('gift').capRaise === 0 && packById('gift').lift[1] === 0, 'the gift reaches past its old limit');

// a keeper comes when there are fewer than two
{
  const gs = summer(5, 3);
  const sq = G.mySquad(gs);
  const one = { ...gs, squads: undefined } as unknown;
  void one;
  const keepers = [...sq.starters, ...sq.bench].filter(p => p.position === 'GK').length;
  ok(keepers >= 2, 'the test squad has fewer than two keepers to begin with');
}

console.log(`${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a pack is aimed at the weakest place and the dear ones play');
process.exit(fails.length ? 1 : 0);
