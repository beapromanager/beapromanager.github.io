/**
 * The pictures of the match moments, two worlds (Itzik, 16.10).
 *   node --experimental-strip-types scripts/moment-art-check.mts
 *
 * Held here, in his words: "ליגות ג׳ עד א׳, ולא לעלות לליגה הלאומית, ליגת העל וליגת אירופה". ליגה ג׳, ב׳ and א׳ see the day
 * set and nothing else; the Leumit and ליגת העל see the night set and nothing of the day; Europe's own pictures are not
 * touched. Every file both worlds name exists on disk, each moment has two angles in each world and the angle really moves
 * with the match, every outcome has its own frame in both worlds, and the match screen asks for the world by the club's
 * division.
 */
import { existsSync, readFileSync } from 'node:fs';
import { momentWorld, momentVariant, buildupImg, outcomeImg, buildupsOf, outcomesOf, OUTCOME_NAMES, MOMENT_FOLDER, DAY_MAX_TIER } from '../src/ui/momentArt.ts';
import { TOP_TIER } from '../src/game/career.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };
const onDisk = (url: string) => existsSync('public' + url);

/* the worlds by division: day up to ליגה א׳, night from the Leumit up, nothing else */
ok(DAY_MAX_TIER === 3, 'the day world does not stop at ליגה א׳');
for (const tier of [1, 2, 3]) ok(momentWorld(tier) === 'day', `tier ${tier} does not play by day`);
for (const tier of [4, 5]) ok(momentWorld(tier) === 'night', `tier ${tier} does not play at night`);
ok(momentWorld(TOP_TIER) === 'night', 'the top flight plays by day');
ok(momentWorld(TOP_TIER + 1) === 'night', 'a division above the top flight plays by day');

/* every picture both worlds can ask for exists */
const kinds = Object.keys(MOMENT_FOLDER) as Array<keyof typeof MOMENT_FOLDER>;
for (const world of ['day', 'night'] as const) {
  for (const url of [...buildupsOf(world), ...outcomesOf(world)]) ok(onDisk(url), `${world}: missing ${url}`);
  ok(buildupsOf(world).length === kinds.length * 2, `${world}: not two angles for every moment`);
  ok(outcomesOf(world).length === Object.values(OUTCOME_NAMES).reduce((s, l) => s + l.length, 0), `${world}: an outcome frame is not listed`);
}
ok(outcomesOf('day').length === 41, `the day world has ${outcomesOf('day').length} outcome frames, not 41`);

/* the day world's files are day files and the night world's are the night ones, never crossed */
for (const kind of kinds) {
  for (const name of OUTCOME_NAMES[kind]) {
    ok(outcomeImg(kind, 'day', name).includes('/day-'), `${kind} ${name}: the day frame is not a day file`);
    ok(!outcomeImg(kind, 'night', name).includes('/day-'), `${kind} ${name}: the night frame is a day file`);
  }
  ok(buildupImg(kind, 'day', 1).includes('/day-'), `${kind}: the day build-up is not a day file`);
  ok(!buildupImg(kind, 'night', 1).includes('/day-') && !buildupImg(kind, 'night', 2).includes('/day-'), `${kind}: a night build-up is a day file`);
}

/* the angle moves with the match, and is the same for the same match */
{
  let a = 0, b = 0;
  for (let seed = 1; seed <= 200; seed++) { if (momentVariant(seed, 'penalty') === 'a') a++; else b++; }
  ok(a >= 60 && b >= 60, `over 200 matches the penalty angle split ${a} to ${b}`);
  ok(momentVariant(77, 'shot') === momentVariant(77, 'shot'), 'the same match picks a different angle twice');
  ok(buildupImg('penalty', 'day', 5) !== buildupImg('penalty', 'day', 6) || momentVariant(5, 'penalty') === momentVariant(6, 'penalty'), 'the build-up ignores the angle');
}

/* the match screen asks for the world by the club's division, and Europe keeps its own pictures */
{
  const m = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  ok(/const world = momentWorld\(G\.club\(gs\)\.tier\)/.test(m), 'the match screen does not read the world off the division');
  ok(/euro \? EURO_MOMENT\.penalty : asset\(buildupImg\('penalty', world, st\.seed\)\)/.test(m), 'the penalty popup does not keep Europe\'s picture or use the world');
  for (const kind of ['def_penalty', 'shot', 'free_kick', 'one_on_one', 'def_keeper', 'def_tackle']) {
    ok(new RegExp(`euro \\? EURO_MOMENT\\.${kind} : asset\\(buildupImg\\('${kind}', world, st\\.seed\\)\\)`).test(m), `${kind}: the popup does not use the world`);
  }
  ok((m.match(/world=\{euro \? 'night' : world\}/g) ?? []).length === 7, 'not every outcome card gets the world, with Europe on the night set');
  ok(!/buildupImg\([^)]*'tactic'/.test(m), 'the touchline moment was moved onto the two worlds (it has its own pictures by tier)');
}

console.log(`${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 10).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, ליגה ג׳ to א׳ see the day, the Leumit and ליגת העל the night, Europe its own');
process.exit(fails.length ? 1 : 0);
