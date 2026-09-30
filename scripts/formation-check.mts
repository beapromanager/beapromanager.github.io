/**
 * Are the formations actually different, and is any of them simply the best?
 *   node --experimental-strip-types scripts/formation-check.mts
 *
 * Identical squads, only the shape changes, thousands of matches per pairing,
 * home alternated so the home edge cancels out.
 *
 * This used to print a table and stop. It returned zero whatever the numbers
 * said, which made it a green light that could not turn red: a shape could have
 * been added that beat all the others and the suite would have nodded it
 * through. It asserts now.
 *
 * What it holds:
 *   1. nobody is strictly better. A shape may beat some and lose to others,
 *      which is the whole point of choosing one, but no shape may have the
 *      edge over EVERY other.
 *   2. no pairing is lopsided. A shape that beats another by more than the
 *      band is not a choice, it is the right answer.
 *   3. they are not the same thing painted differently: at least one pairing
 *      has to be meaningfully apart.
 */
import { simulateMatch, createRng } from '../src/engine/matchEngine.ts';
import type { TeamInput } from '../src/engine/matchEngine.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { FORMATIONS } from '../src/data/formations.ts';
import type { FormationId } from '../src/data/formations.ts';

const MATCHES = 3000;
/**
 * How far apart a pairing may sit, in points of (win% minus loss%).
 *
 * At three thousand matches the standard error on a win rate is about 0.9
 * points, so three sigma is under 3. Fourteen is comfortably outside the noise
 * and still allows a shape to be a real counter to another.
 */
const BAND = 14;
/**
 * How far apart the shapes have to be in CHARACTER.
 *
 * Not in win rate: the point of calibration is that no shape wins more, so
 * measuring difference there would demand the very imbalance this check exists
 * to forbid. What has to differ is the football. A pairing of open shapes
 * produces a match of about 2.8 goals and a pairing of closed ones about 1.9,
 * and if every pairing produced the same number the four shapes would be one
 * shape with four labels.
 */
const APART = 0.5;
/**
 * How big an edge has to be before it counts as beating somebody at all.
 *
 * At three thousand matches the standard error on the difference is about 1.2
 * points, so three sigma is under four. Without this floor a shape that came
 * out 0.8 ahead of another was recorded as beating it, and four shapes that
 * are level within the noise produced one that "has the edge over every other
 * shape" purely by the sign of the last digit.
 */
const REAL = 4;

const fails: string[] = [];
let checked = 0;

const rng = createRng(4242);
const sq = makeSquad(60, rng);

const team = (id: string, f: FormationId, isHome: boolean): TeamInput => ({
  id, name: id, players: sq.starters.map(p => ({ ...p })),
  tactic: { formation: f, approach: 'balanced', press: 'mid' },
  chemistry: 0.7, isHome,
});

console.log(`=== formations, identical squads, ${MATCHES} matches per pairing ===\n`);

const edge = new Map<FormationId, number[]>();
for (const f of FORMATIONS) edge.set(f.id, []);
let widest = 0;
let mostGoals = 0, fewestGoals = 99;

for (const a of FORMATIONS) {
  for (const b of FORMATIONS) {
    if (a.id >= b.id) continue;
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (let i = 0; i < MATCHES; i++) {
      // alternate home so the home edge cancels out
      const swap = i % 2 === 1;
      const r = simulateMatch(team('A', swap ? b.id : a.id, true), team('B', swap ? a.id : b.id, false), i * 7919 + 13);
      const [ag, bg] = swap ? [r.score[1], r.score[0]] : [r.score[0], r.score[1]];
      gf += ag; ga += bg;
      if (ag > bg) w++; else if (ag === bg) d++; else l++;
    }
    const pct = (v: number) => (100 * v) / MATCHES;
    const diff = pct(w) - pct(l);
    const goals = (gf + ga) / MATCHES;
    mostGoals = Math.max(mostGoals, goals);
    fewestGoals = Math.min(fewestGoals, goals);
    edge.get(a.id)!.push(diff);
    edge.get(b.id)!.push(-diff);
    widest = Math.max(widest, Math.abs(diff));

    checked++;
    const flag = Math.abs(diff) > BAND ? '   <= TOO WIDE' : '';
    console.log(`${a.id.padEnd(7)} vs ${b.id.padEnd(7)}  ${pct(w).toFixed(1)}% / ${pct(d).toFixed(1)}% / ${pct(l).toFixed(1)}%   goals ${(gf / MATCHES).toFixed(2)} - ${(ga / MATCHES).toFixed(2)}   edge ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${flag}`);
    if (Math.abs(diff) > BAND) {
      const better = diff > 0 ? a.id : b.id;
      const worse = diff > 0 ? b.id : a.id;
      fails.push(`${better} beats ${worse} by ${Math.abs(diff).toFixed(1)} points, over the ${BAND} the band allows`);
    }
  }
}

console.log('');
console.log(`shape     beats        loses to     average edge   (an edge counts from ${REAL} points)`);
for (const f of FORMATIONS) {
  const es = edge.get(f.id)!;
  const beats = es.filter(x => x > REAL).length;
  const loses = es.filter(x => x < -REAL).length;
  const avg = es.reduce((x, y) => x + y, 0) / es.length;
  console.log(`${f.id.padEnd(9)} ${String(beats).padEnd(12)} ${String(loses).padEnd(12)} ${avg >= 0 ? '+' : ''}${avg.toFixed(1)}`);
  checked++;
  if (beats === es.length && es.length > 1) {
    fails.push(`${f.id} has the edge over every other shape, so there is nothing to choose`);
  }
  if (loses === es.length && es.length > 1) {
    fails.push(`${f.id} loses to every other shape, so nobody would ever pick it`);
  }
}

/* NOT TWINS.
   Level in wins is not the same as different. 3-5-2 and 4-2-3-1 were within a
   hundredth of a goal of 4-4-2 in everything a manager can see, so choosing
   either at half time changed nothing, and possession was the same forty nine
   to fifty one per cent in every shape because none of them had a midfield
   number. Every shape is played against the same neutral opponent, 4-4-2, and
   any two of them have to differ by at least eight hundredths of a goal, for
   or against, or two points of the ball. These are the agreed numbers, not
   ones read out of the code under test. */
const APART_SHAPES = 0.08;
const character = new Map<FormationId, { gf: number; ga: number; poss: number }>();
for (const f of FORMATIONS) {
  let gf = 0, ga = 0, poss = 0;
  for (let i = 0; i < MATCHES; i++) {
    const swap = i % 2 === 1;
    const r = simulateMatch(team('A', swap ? '4-4-2' : f.id, true), team('B', swap ? f.id : '4-4-2', false), i * 7919 + 13);
    gf += swap ? r.score[1] : r.score[0];
    ga += swap ? r.score[0] : r.score[1];
    poss += swap ? 1 - r.home.stats.possession : r.home.stats.possession;
  }
  character.set(f.id, { gf: gf / MATCHES, ga: ga / MATCHES, poss: (100 * poss) / MATCHES });
}
let closest = 99, closestPair = '';
for (const a of FORMATIONS) {
  for (const b of FORMATIONS) {
    if (a.id >= b.id) continue;
    const x = character.get(a.id)!, y = character.get(b.id)!;
    const gap = Math.max(Math.abs(x.gf - y.gf), Math.abs(x.ga - y.ga), Math.abs(x.poss - y.poss) / 25);
    checked++;
    if (gap < closest) { closest = gap; closestPair = `${a.id} and ${b.id}`; }
    if (gap < APART_SHAPES) fails.push(`${a.id} and ${b.id} play the same football: within ${gap.toFixed(3)} in goals for, goals against and the ball, so changing from one to the other changes nothing`);
  }
}
console.log('');
console.log('shape     goals for  against   the ball (against 4-4-2)');
for (const f of FORMATIONS) {
  const c = character.get(f.id)!;
  console.log(`${f.id.padEnd(9)} ${c.gf.toFixed(2).padStart(8)} ${c.ga.toFixed(2).padStart(8)} ${c.poss.toFixed(1).padStart(9)}%`);
}
console.log(`closest pair: ${closestPair}, ${closest.toFixed(3)} apart`);
// and the ones that say they keep the ball, do; and the one that gives it away, does
const ball = (id: FormationId) => character.get(id)!.poss;
checked += 3;
if (ball('4-5-1') < 51.5) fails.push(`4-5-1 is called control and has ${ball('4-5-1').toFixed(1)} per cent of the ball, under 51.5`);
if (ball('4-2-3-1') < 51.5) fails.push(`4-2-3-1 is called creative and has ${ball('4-2-3-1').toFixed(1)} per cent of the ball, under 51.5`);
if (ball('3-5-2') > 49.5) fails.push(`3-5-2 is the open shape and has ${ball('3-5-2').toFixed(1)} per cent of the ball, over 49.5`);

checked++;
const spread = mostGoals - fewestGoals;
if (spread < APART) {
  fails.push(`the busiest pairing makes ${mostGoals.toFixed(2)} goals and the quietest ${fewestGoals.toFixed(2)}, only ${spread.toFixed(2)} apart, so the shapes are one shape with several labels`);
}

console.log('');
console.log(`${checked} checks, ${FORMATIONS.length} shapes, widest pairing ${widest.toFixed(1)} points, goals per match from ${fewestGoals.toFixed(2)} to ${mostGoals.toFixed(2)}`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, no shape is the right answer, and they still play differently');
process.exit(fails.length ? 1 : 0);
