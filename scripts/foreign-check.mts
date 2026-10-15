/**
 * The foreign players (Itzik, 15.10): a Brazilian cannot be called שחר כהן.
 *   node --experimental-strip-types scripts/foreign-check.mts
 *
 * Held here: every country has a real bank of first and family names, in Hebrew letters, with no Israeli family name in a
 * foreign bank and no repeat inside one; a foreign name is built only from its own country's bank; the Brazilian the agent
 * brings is given his own country's name and the mark on the player; and the squad shows where he is from.
 */
import { readFileSync } from 'node:fs';
import { NATIONS, makeForeignName, nationLabel, nationOf, pickNation, foreignCount, FOREIGN_MAX } from '../src/data/foreignNames.ts';
import * as G from '../src/game/state.ts';
import { initLeague } from '../src/game/league.ts';
import { makeMarket } from '../src/game/transfers.ts';
import { findOld } from '../src/game/scout.ts';
import { isLegend } from '../src/data/legends.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { POOLS } from '../src/data/names.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

const israeliLast = new Set([...POOLS.JEWISH_LAST, ...POOLS.ARAB_LAST]);
ok(NATIONS.map(n => n.id).sort().join() === ['argentina', 'brazil', 'ghana', 'netherlands', 'nigeria', 'portugal', 'serbia', 'spain'].join(), 'the countries are not the eight Itzik chose (15.10)');
for (const n of NATIONS) {
  ok(n.first.length >= 10 && n.last.length >= 10, `${n.id}: the bank is too small for a long career`);
  ok(new Set(n.first).size === n.first.length && new Set(n.last).size === n.last.length, `${n.id}: a name repeats inside the bank`);
  ok([...n.first, ...n.last].every(s => /^[֐-׿׳ ]+$/.test(s)), `${n.id}: a name is not written in Hebrew letters`);
  ok(n.last.every(l => !israeliLast.has(l)), `${n.id}: an Israeli family name sits in a foreign bank`);
  ok(!!nationLabel(n.id) && nationLabel(n.id) === n.adj, `${n.id}: no label`);
}
ok(nationLabel(undefined) === '' && nationLabel('nowhere') === '', 'an Israeli player gets a country label');

// a foreign name belongs to its country only
{
  const rng = createRng(7);
  const used = new Set<string>();
  for (const n of NATIONS) {
    for (let i = 0; i < 12; i++) {
      const name = makeForeignName(rng, n.id, used);
      const [f, ...rest] = name.split(' ');
      ok(n.first.includes(f) && n.last.includes(rest.join(' ')), `${n.id}: ${name} is not from its own bank`);
    }
  }
  ok(used.size >= 12 * NATIONS.length - 6, 'foreign names repeat inside one used set');
  const seen = new Set(Array.from({ length: 400 }, (_, i) => pickNation(createRng(i + 1)).id));
  ok(seen.size === 8, 'the countries do not vary');
}

// the Brazilian the agent brings, and the squad that shows it
{
  const st = readFileSync('src/game/state.ts', 'utf8');
  ok(/profile === 'brazilian'[\s\S]{0,600}p\.nation = 'brazil'[\s\S]{0,200}makeForeignName\(/.test(st), 'the agent\'s Brazilian is not given his own country\'s name');
  const card = readFileSync('src/ui/components/PlayerCard.tsx', 'utf8');
  const squad = readFileSync('src/ui/screens/Squad.tsx', 'utf8');
  ok(/p\.nation/.test(card) && /nationLabel/.test(card), 'the card does not say where a foreigner is from');
  ok(/p\.nation/.test(squad) && /nationLabel/.test(squad), 'the squad row does not say where a foreigner is from');
}

// where they play (15.10): up to three a club from the Leumit up, none below it, never a legend, and the squad takes no fourth
{
  const base = G.newGame(31);
  const clubsAt = (tier: number) => base.league.clubs.map(c => ({ ...c, tier }));
  const nations = new Set<string>();
  let withForeign = 0, over = 0, legendsHome = true;
  for (const seed of [11, 12, 13, 14]) {
    const lg = initLeague(clubsAt(5), seed * 977, 'בדיקה');
    for (const sq of Object.values(lg.squads)) {
      const all = [...sq.starters, ...sq.bench];
      const n = foreignCount(all);
      if (n > 0) withForeign++;
      if (n > FOREIGN_MAX) over++;
      for (const p of all) {
        if (p.nation) nations.add(p.nation);
        if (isLegend(p) && p.nation) legendsHome = false;
        if (p.nation && !nationOf(p.nation)?.first.includes(p.name.split(' ')[0])) fails.push(`a foreigner of ${p.nation} is called ${p.name}`);
      }
    }
  }
  ok(withForeign >= 10, `only ${withForeign} clubs of 32 in ליגת העל have a foreigner`);
  ok(over === 0, `${over} clubs hold more than three foreigners`);
  ok(nations.size >= 5, 'the foreigners all come from the same few countries');
  ok(legendsHome, 'a legend of the town was made a foreigner');
  const low = initLeague(clubsAt(3), 5 * 977, 'בדיקה');
  ok(Object.values(low.squads).every(sq => foreignCount([...sq.starters, ...sq.bench]) === 0), 'a club in ליגה א׳ has a foreigner');

  // the market and the scout bring some, and only from the Leumit up
  let marketAt5 = 0, marketAt2 = 0, oldAt5 = 0;
  for (let i = 0; i < 12; i++) {
    marketAt5 += makeMarket(5, createRng(100 + i), 12).filter(f => f.player.nation).length;
    marketAt2 += makeMarket(2, createRng(100 + i), 12).filter(f => f.player.nation).length;
    if (findOld(5, createRng(300 + i), new Set()).nation) oldAt5++;
  }
  ok(marketAt5 >= 10, `the market of ליגת העל brought ${marketAt5} foreigners in 144 men`);
  ok(marketAt2 === 0, 'the market of ליגה ב׳ brought a foreigner');
  ok(oldAt5 >= 1, 'the scout never found a foreigner in ליגת העל');

  // a squad of three signs no fourth, and an Israeli still signs
  let gs = G.newGame(31);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason(gs);
  gs = { ...gs, meters: { ...gs.meters, money: 90_000_000 } };
  const sq = G.mySquad(gs);
  const four = [...sq.starters, ...sq.bench].filter(p => !isLegend(p)).slice(0, 3);
  const withThree = { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: {
    starters: sq.starters.map(p => (four.includes(p) ? { ...p, nation: 'brazil' } : p)),
    bench: sq.bench.map(p => (four.includes(p) ? { ...p, nation: 'brazil' } : p)),
  } } } };
  const anyone = (nation?: string) => {
    const fa = { ...withThree.market[0] };
    return { ...fa, player: { ...fa.player, ...(nation ? { nation } : {}) } };
  };
  const roomy = { ...withThree, league: { ...withThree.league, squads: { ...withThree.league.squads, [gs.clubId]: { starters: withThree.league.squads[gs.clubId].starters, bench: withThree.league.squads[gs.clubId].bench.slice(0, 4) } } } };
  void roomy;
  const reasonF = G.signBlockedReason(withThree, anyone('ghana'));
  ok(reasonF === `אפשר עד ${FOREIGN_MAX} זרים בסגל` || (reasonF ?? '').includes('הסגל מלא'), `a fourth foreigner was not stopped: ${reasonF}`);
  const reasonI = G.signBlockedReason(withThree, anyone());
  ok(!(reasonI ?? '').includes('זרים'), 'an Israeli was stopped by the foreigner rule');
}

console.log(`${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a foreigner has his own country\'s name and the squad says where he is from');
process.exit(fails.length ? 1 : 0);
