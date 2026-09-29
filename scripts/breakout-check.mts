/**
 * The boy who breaks out.
 *   node --experimental-strip-types scripts/breakout-check.mts
 *
 * A squad does not stand still, it runs on a treadmill: about five men gain
 * ground over a summer and about seven lose it, the two cancel, and the squad
 * average sits on the same number for six seasons. A manager three seasons in
 * is then being told, correctly, that nothing he does moves anybody, and one
 * wrote in to say exactly that.
 *
 * Lifting everybody would only move the treadmill and the ladder with it,
 * because the AI clubs are rebuilt to their division's level every summer and
 * his squad is not. So one man moves instead, far enough to have a name.
 *
 * What has to hold, and none of it is a matter of taste:
 *   1. it happens often enough to be a thing that happens, and not every year
 *   2. it is one man, not a pay rise for the academy
 *   3. nobody is carried past the ceiling he was born with, ever
 *   4. the same summer breaks out the same boy however often it is played
 */
import * as G from '../src/game/state.ts';
import { ageSquad, potentialOf } from '../src/game/career.ts';
import { createRng, overall } from '../src/engine/matchEngine.ts';
import { MIN_SQUAD } from '../src/game/transfers.ts';
import type { Player } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;

const SEEDS = [4242, 777, 31, 9091, 555, 12007, 88, 4004, 1234, 6060, 31337, 99];
const SUMMERS = 6;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/**
 * The most an ordinary summer can give a man.
 *
 * growth() tops out at 2 + f * 4 for the very young, f never passes 1, and the
 * room multiplier never passes 1 either, so six is the ceiling on an ordinary
 * step. Anything above it in these runs is the breakout and nothing else,
 * which is what lets the sections below count them without reaching inside.
 */
const ORDINARY_MOST = 6;

function freshSquad(seed: number) {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', age: 38, type: 'mental' } as never);
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});
  return { squad: G.mySquad(gs), tier: G.club(gs).tier };
}

/* 1 to 3. HOW OFTEN, HOW MANY, AND THE CEILING. */
let summers = 0, fired = 0, overCeiling = 0, twoAtOnce = 0;
const jumps: number[] = [];
{
  for (const seed of SEEDS) {
    let { squad, tier } = freshSquad(seed);
    for (let s = 0; s < SUMMERS; s++) {
      const before = new Map<string, Player>();
      for (const p of [...squad.starters, ...squad.bench]) before.set(p.id, p);

      const out = ageSquad(squad, createRng(seed * 31 + s), tier, MIN_SQUAD, 1, 0);
      summers++;

      const big = out.risers.filter(r => r.to - r.from > ORDINARY_MOST);
      if (big.length) { fired++; jumps.push(Math.max(...big.map(r => r.to - r.from))); }
      if (big.length > 1) twoAtOnce++;

      // nobody crosses his own ceiling. Men already above it when the summer
      // started are not the question here, so only the crossing is counted.
      for (const p of [...out.squad.starters, ...out.squad.bench]) {
        const was = before.get(p.id);
        if (!was) continue;                       // an academy boy, born this summer
        const pot = potentialOf(p);
        if (overall(was) <= pot && overall(p) > pot) {
          overCeiling++;
          if (overCeiling === 1) fails.push(`${p.name} went from ${overall(was)} to ${overall(p)} past a ceiling of ${pot}`);
        }
      }
      squad = out.squad;
    }
  }

  checked += 4;
  const rate = fired / summers;
  if (rate < 0.4) fails.push(`a boy breaks out in only ${(rate * 100).toFixed(0)}% of summers, which is not often enough to be a thing that happens`);
  if (rate > 0.95) fails.push(`a boy breaks out in ${(rate * 100).toFixed(0)}% of summers, which is not a breakout, it is a pay rise`);
  if (twoAtOnce) fails.push(`${twoAtOnce} summers broke out more than one man`);
  if (!jumps.length || mean(jumps) <= ORDINARY_MOST) {
    fails.push(`the jumps average ${mean(jumps).toFixed(1)}, which an ordinary summer already reaches`);
  }
  if (!fails.length) {
    console.log(`  ${(rate * 100).toFixed(0)}% of summers break out one boy, by ${mean(jumps).toFixed(1)} on average, the best of them ${Math.max(...jumps)}`);
    console.log(`  and in ${summers} summers nobody was carried past his own ceiling`);
  }
}

/* 4. THE SAME SUMMER BREAKS OUT THE SAME BOY. */
{
  const { squad, tier } = freshSquad(4242);
  const once = ageSquad(squad, createRng(11), tier, MIN_SQUAD, 1, 0);
  const twice = ageSquad(squad, createRng(11), tier, MIN_SQUAD, 1, 0);
  const top = (o: typeof once) => {
    const big = o.risers.filter(r => r.to - r.from > ORDINARY_MOST);
    return big.length ? `${big[0].name} +${big[0].to - big[0].from}` : 'nobody';
  };
  checked++;
  if (top(once) !== top(twice)) fails.push(`the same summer played twice broke out "${top(once)}" and then "${top(twice)}"`);
  checked++;
  if (top(once) === 'nobody') fails.push('the fixture summer has no breakout in it, so this section proves nothing');
  else console.log(`  played twice, the same summer breaks out the same boy: ${top(once)}`);
}

console.log(`\n${checked} checks`);
console.log(fails.length ? '\n  ' + fails.slice(0, 8).join('\n  ') + '\nFAIL'
  : '\nOK, one boy a summer takes two years in one, and none of them passes his ceiling');
process.exit(fails.length ? 1 : 0);
