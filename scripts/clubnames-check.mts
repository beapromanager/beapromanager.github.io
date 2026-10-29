/**
 * The town clubs carry invented names, and a career saved before that still loads right.
 *   node --experimental-strip-types scripts/clubnames-check.mts
 *
 * 29.10.2026: the word in front of the town (מכבי, הפועל and the rest) was
 * swapped for invented ones, so no generated club shares its name with a real
 * one. A save from before has the old names inside it and gets the new ones on
 * load. Fixed leagues, the town itself, and what the manager typed stay put.
 */
import { CITIES, clubFromCity, siblingClub } from '../src/data/cities.ts';
import { EURO_CLUBS } from '../src/data/europeClubs.ts';
import { renameLegacy } from '../src/game/renames.ts';

const fails: string[] = [];
const OLD = /^(מ\.ס|הפועל|מכבי|בני|צעירי|איחוד|הכוח|עירוני|בית"ר|בית״ר)\s/;

// 1. no town club, first or across town, starts with an old word
let n = 0;
for (const c of CITIES) {
  const a = clubFromCity(c, 2);
  const b = siblingClub(c.name, 2, a.id);
  for (const x of [a, b]) {
    n++;
    if (OLD.test(x.name) || OLD.test(x.short)) fails.push(`${c.name}: ${x.name} / ${x.short}`);
  }
  if (a.id === b.id) fails.push(`${c.name}: the two clubs share an id`);
  if (a.name === b.name) fails.push(`${c.name}: the two clubs share a name`);
}
for (const e of EURO_CLUBS) if (/^מועדון /.test(e.name)) fails.push(`euro: ${e.name}`);

// 2. an old save comes back with the new names
const old = {
  profile: { name: 'מכבי חיפה', nickname: 'בני' },
  friends: [{ id: 'f1', name: 'הפועל חולון' }],
  league: {
    clubs: [
      { id: 'c-1', name: 'מ.ס ראש העין', short: 'ראש העין', city: 'ראש העין' },
      { id: 'c-1x', name: 'הפועל ראש העין', short: 'הפועל ראש העין', city: 'ראש העין' },
      { id: 'c-2', name: 'מכבי שעריים', short: 'שעריים', city: 'רחובות' },
      { id: 'c-3', name: "בני סח'נין", short: "סח'נין", city: 'סחנין' },
      { id: 'c-4', name: 'בני חולון', short: 'חולון', city: 'חולון' },
      { id: 'c-5', name: 'הפועל נחל עוז', short: 'נחל עוז', city: 'נחל עוז' },
    ],
  },
  euro: [{ id: 'eu-sevilla', name: 'מועדון סביליה', short: 'מועדון סביליה', city: 'סביליה' }],
  news: ['ניצחון גדול על מכבי תל אביב ועל צעירי ב"ש', 'הדרבי מול ומכבי ראש העין', 'סיור בבני ברק'],
};
const s = renameLegacy(JSON.parse(JSON.stringify(old))) as typeof old & { namesVersion?: number };
const want: [string, unknown, unknown][] = [
  ['town club', s.league.clubs[0].name, 'סער ראש העין'],
  ['across town', s.league.clubs[1].name, 'רעם ראש העין'],
  ['across town short', s.league.clubs[1].short, 'רעם ראש העין'],
  ['רחובות', s.league.clubs[2].name, 'להב רחובות'],
  ['רחובות short', s.league.clubs[2].short, 'רחובות'],
  ['סחנין', s.league.clubs[3].name, 'ברק סחנין'],
  ['סחנין short', s.league.clubs[3].short, 'סחנין'],
  ['בני', s.league.clubs[4].name, 'ברק חולון'],
  ['a plain short', s.league.clubs[4].short, 'חולון'],
  ['fixed league untouched', s.league.clubs[5].name, 'הפועל נחל עוז'],
  ['ids kept', s.league.clubs.map(c => c.id).join(','), 'c-1,c-1x,c-2,c-3,c-4,c-5'],
  ['euro', s.euro[0].name, 'סביליה האנדלוסית'],
  ['euro short', s.euro[0].short, 'סביליה'],
  ['news', s.news[0], 'ניצחון גדול על להב תל אביב ועל אופק ב"ש'],
  ['news with a prefix letter', s.news[1], 'הדרבי מול ולהב ראש העין'],
  ['the town in prose', s.news[2], 'סיור בבני ברק'],
  ['his name', s.profile.name, 'מכבי חיפה'],
  ['his nickname', s.profile.nickname, 'בני'],
  ['his friend', s.friends[0].name, 'הפועל חולון'],
  ['marked', s.namesVersion, 1],
];
for (const [what, got, exp] of want) if (got !== exp) fails.push(`${what}: got ${String(got)}, wanted ${String(exp)}`);

// 3. a save that has been through it is not walked again
const again = renameLegacy(s);
if (again !== s) fails.push('a renamed save was copied');

if (fails.length) {
  console.log(`FAIL (${fails.length})`);
  for (const f of fails.slice(0, 40)) console.log('  ' + f);
  process.exit(1);
}
console.log(`OK: ${n} town clubs on invented names, ${want.length} old save fields renamed or kept`);
