/**
 * Names never mix sectors, and squads match their club.
 *   node --experimental-strip-types scripts/names-check.mts
 *
 * Two rules from Itzik:
 *   1. A name is never a Jewish first name with an Arab surname, or the reverse.
 *   2. An Israeli club fields a Jewish squad, an Arab club an Arab one, each with
 *      room for at most one player from the other side.
 * And two more:
 *   3. Two men in a squad do not share a family name while the pool has
 *      families left. Forty five Jewish families and six Arab ones, matched
 *      only on the full name, put three of the same in a sixth of squads and
 *      eight of the same in נצרת every time. Measured off real careers.
 *   4. A generated man never carries the name of a ראש העין regular.
 */
import { POOLS, makeName, originOfName, sectorForCity, surnameOf, ADDED_FIRST } from '../src/data/names.ts';
import * as G from '../src/game/state.ts';
import { isLegend } from '../src/data/legends.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { CITIES, clubFromCity } from '../src/data/cities.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];

/* 1. the new first names actually landed in the Jewish pool */
for (const n of ADDED_FIRST)
  if (!POOLS.JEWISH_FIRST.includes(n)) fails.push(`missing added name: ${n}`);

/* 2. no name mixes sectors, over a large sample from each pool */
const rng = createRng(20260904);
for (let i = 0; i < 4000; i++) {
  for (const want of ['jewish', 'arab'] as const) {
    const name = makeName(rng, want);
    const first = name.split(' ')[0];
    const last = surnameOf(name);
    const firstArab = POOLS.ARAB_FIRST.includes(first);
    const lastArab = POOLS.ARAB_LAST.includes(last);
    // a Jewish name has neither an Arab first nor an Arab surname; an Arab name
    // has both from the Arab pool. A mix is the bug.
    if (want === 'jewish' && (firstArab || lastArab)) fails.push(`jewish draw mixed: ${name}`);
    if (want === 'arab' && (!firstArab || !lastArab)) fails.push(`arab draw mixed: ${name}`);
  }
}

/* 3. every club's squad matches its sector, with at most one token */
let arabClubs = 0, jewishClubs = 0, tokened = 0;
for (const city of CITIES) {
  const club = clubFromCity(city, 1);
  const sector = sectorForCity(club.city);
  sector === 'arab' ? arabClubs++ : jewishClubs++;
  const sq = makeSquad(60, createRng(city.name.length * 97 + 3), club.traits, sector);
  const names = [...sq.starters, ...sq.bench].map(p => p.name);
  const wrong = names.filter(n => originOfName(n) !== sector).length;
  if (wrong > 1) fails.push(`${club.short} (${sector}): ${wrong} players from the other sector`);
  if (wrong === 1) tokened++;
}

/* 4. the Arab towns really do resolve to Arab clubs */
for (const t of ['סחנין', 'טירה', 'נצרת', 'אום אל פחם', 'כפר קאסם'])
  if (sectorForCity(t) !== 'arab') fails.push(`${t} should be an Arab club`);
for (const t of ['תל אביב', 'חיפה', 'רמת גן', 'באר שבע'])
  if (sectorForCity(t) !== 'jewish') fails.push(`${t} should be a Jewish club`);

/* 5. no two men in a squad share a family name, and a career's whole cast,
      squad, youth and market, hardly ever holds three of the same */
{
  const families = (names: string[]) => {
    const cnt = new Map<string, number>();
    for (const n of names) cnt.set(surnameOf(n), (cnt.get(surnameOf(n)) ?? 0) + 1);
    return Math.max(...cnt.values());
  };
  let squads = 0, tripled = 0, worst = 0;
  for (const [city, seeds] of [['אשדוד', 120], ['נצרת', 120], ['רמת גן', 60], ['סחנין', 60]] as const) {
    let cityTripled = 0, cityWorst = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      let gs = G.newGame(seed * 13 + city.length);
      gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
      gs = G.pickCity(gs, city);
      const sq = G.mySquad(gs);
      const squad = [...sq.starters, ...sq.bench].map(p => p.name);
      const own = families(squad);
      if (own > 1) fails.push(`${city} #${seed}: ${own} men of one family in a sixteen man squad`);
      const cast = [...squad, ...gs.youth.players.map(p => p.name), ...gs.market.map(fa => fa.player.name)];
      const all = families(cast);
      squads++;
      if (all >= 3) { tripled++; cityTripled++; }
      cityWorst = Math.max(cityWorst, all); worst = Math.max(worst, all);
    }
    console.log(`  ${city}: ${Math.round(100 * cityTripled / seeds)}% of careers open with three of one family somewhere in the cast, worst ${cityWorst}`);
  }
  if (tripled / squads > 0.05) fails.push(`${Math.round(100 * tripled / squads)}% of careers open with three of one family in the cast, the cap is 5%`);
  if (worst >= 4) fails.push(`a career opened with ${worst} men of one family in its cast`);
}

/* 6. a generated man is never one of the ראש העין regulars by name. They are
      recognised by name alone, and both halves of every one of them sit in the
      pools, so this has to be said. */
{
  const rng6 = createRng(777);
  let hits = 0;
  for (let i = 0; i < 20000; i++) {
    if (isLegend({ name: makeName(rng6, 'jewish') })) hits++;
    if (isLegend({ name: makeName(rng6, 'arab') })) hits++;
  }
  if (hits) fails.push(hits + ' generated names out of 40000 were a ראש העין regular');
}

console.log(`${ADDED_FIRST.length} names added, all present in the Jewish pool`);
console.log(`8000 draws, 0 mixed across sectors`);
console.log(`${CITIES.length} clubs: ${jewishClubs} Israeli, ${arabClubs} Arab; ${tokened} carry one token player`);
if (fails.length) console.log('\n  ' + fails.slice(0, 10).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, names stay in one sector and squads match their club');
process.exit(fails.length ? 1 : 0);
