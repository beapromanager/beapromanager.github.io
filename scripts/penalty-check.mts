/**
 * Penalties, at both ends.
 *   node --experimental-strip-types scripts/penalty-check.mts
 *
 * Itzik asked for a penalty roughly every three matches, split between winning
 * one and giving one away. A rate is the kind of thing that is very easy to
 * believe you have set and very easy to have not: the two rolls sit inside
 * functions that return early for other reasons, so the number that matters is
 * the one that comes out of playing thousands of matches, not the constant.
 *
 * It also holds the things that make a penalty a moment rather than a dice
 * roll: it is always the manager's call, guessing right actually matters, a
 * better keeper saves more, and the whistle does not care how good the
 * opponent is.
 */
import * as L from '../src/game/liveMatch.ts';
import type { LiveState, Corner } from '../src/game/liveMatch.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng, overall } from '../src/engine/matchEngine.ts';
import { readFileSync, existsSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

const CORNERS: Corner[] = ['left', 'center', 'right'];
const TARGET = 1 / 3;            // one penalty every three matches
const N = 2000;

interface Tally {
  matches: number;
  forUs: number;
  against: number;
  /** goals that arrived without the manager being asked anything */
  silent: number;
  concededPens: number;
  savedPens: number;
  scoredPens: number;
  missedPens: number;
}
const blank = (): Tally => ({
  matches: 0, forUs: 0, against: 0, silent: 0,
  concededPens: 0, savedPens: 0, scoredPens: 0, missedPens: 0,
});

/** Play one match through, answering every moment at random. */
function play(seed: number, t: Tally, myLvl = 58, oppLvl = 58, dive?: 'always-right' | 'always-wrong') {
  const rng = createRng(seed);
  const mine = makeSquad(myLvl, rng), theirs = makeSquad(oppLvl, rng);
  const st: LiveState = L.createLive({
    seed, homeId: 'me', homeName: 'שלי', awayId: 'them', awayName: 'שלהם', iAmHome: true,
    playerStarters: mine.starters, playerBench: mine.bench,
    playerTactic: { approach: 'balanced', press: 'mid' },
    oppStarters: theirs.starters, oppBench: theirs.bench, moraleBias: 0,
  });
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  let guard = 0;

  while (st.phase !== 'done' && guard++ < 4000) {
    if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
    if (st.phase === 'moment' && st.pending) {
      const m = st.pending;
      const before = st.score[0] + st.score[1];
      switch (m.kind) {
        case 'penalty': {
          t.forUs++;
          const scored = L.resolvePenalty(st, pick(CORNERS));
          if (scored) t.scoredPens++; else t.missedPens++;
          break;
        }
        case 'def_penalty': {
          t.against++;
          // to measure whether the guess matters, the fixture can force the
          // keeper onto the taker's corner or deliberately off it
          let choice: Corner;
          if (dive) {
            const aim = m.keeperDir!;   // the hint, right 60% of the time
            choice = dive === 'always-right' ? aim : CORNERS.filter(c => c !== aim)[0];
          } else choice = pick(CORNERS);
          const { saved } = L.resolveDefPenalty(st, choice);
          if (saved) t.savedPens++; else { t.concededPens++; }
          break;
        }
        case 'shot': L.resolveShot(st, pick(CORNERS)); break;
        case 'free_kick': L.resolveFreeKick(st, pick(CORNERS)); break;
        case 'one_on_one': L.resolveOneOnOne(st, pick(['dribble', 'finish'])); break;
        case 'def_keeper': L.resolveDefKeeper(st, pick(['rush', 'stay'])); break;
        case 'def_tackle': L.resolveDefTackle(st, pick(['slide', 'contain'])); break;
        case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
        default: fails.push(`a ${(m as { kind: string }).kind} moment nobody knows how to answer`);
      }
      void before;
      if (st.phase === 'moment') st.phase = 'play';
      continue;
    }
    const was = st.score[0] + st.score[1];
    L.step(st);
    if (st.score[0] + st.score[1] > was) t.silent += st.score[0] + st.score[1] - was;
  }
  t.matches++;
}

/* 1. THE RATE ITSELF. The number Itzik asked for, measured not assumed. */
const t = blank();
for (let i = 1; i <= N; i++) play(i * 7919 + 5, t);

const perMatch = (t.forUs + t.against) / t.matches;
const everyN = 1 / perMatch;
{
  checked += 3;
  if (Math.abs(perMatch - TARGET) > 0.045) {
    fails.push(`${perMatch.toFixed(3)} penalties a match, one every ${everyN.toFixed(1)}. Itzik asked for one every 3`);
  }
  const share = t.forUs / (t.forUs + t.against);
  if (share < 0.5 || share > 0.72) {
    fails.push(`${(share * 100).toFixed(0)}% of penalties go your way, which is not the roughly 60/40 split intended`);
  }
  // and both ends must actually exist. A defensive penalty that never fires is
  // exactly the bug this whole feature is: the code is there and unreachable
  if (t.against === 0) fails.push('not one penalty against you in 2000 matches, the defensive branch never fires');
  if (t.forUs === 0) fails.push('not one penalty for you in 2000 matches');
  console.log(`  ${N} matches: ${perMatch.toFixed(3)} penalties a match, one every ${everyN.toFixed(1)} matches`);
  console.log(`     ${(t.forUs / t.matches).toFixed(3)} for you, ${(t.against / t.matches).toFixed(3)} against you`);
}

/* 2. A PENALTY IS ALWAYS THE MANAGER'S. Nothing at either end may settle
      itself while he watches, which is the rule the whole match engine is
      built on and the easiest one to break by adding a branch. */
{
  checked++;
  if (t.silent > 0) fails.push(`${t.silent} goals arrived with nobody asked anything`);
}

/* 3. THE GUESS HAS TO MATTER.
      If sending the keeper the right way pays about the same as sending him the
      wrong way, the screen is a slot machine wearing a decision's clothes. */
{
  const right = blank(), wrong = blank();
  for (let i = 1; i <= N; i++) play(i * 3313 + 11, right, 58, 58, 'always-right');
  for (let i = 1; i <= N; i++) play(i * 3313 + 11, wrong, 58, 58, 'always-wrong');
  const rSave = right.savedPens / Math.max(1, right.against);
  const wSave = wrong.savedPens / Math.max(1, wrong.against);
  checked += 2;
  // The hint is right 60% of the time and there are three corners, so the
  // most a keeper who trusts it can gain over one who defies it is about 34%
  // saved against 15%, a gap of 0.19 before sampling noise (roughly 280
  // penalties an arm, so plus or minus 0.04). The bar sits two deviations
  // under that: low enough to be reachable, high enough that a slot machine
  // (a gap near zero) still fails.
  if (rSave - wSave < 0.12) {
    fails.push(`reading it right saves ${(rSave * 100).toFixed(0)}% and reading it wrong ${(wSave * 100).toFixed(0)}%: the call barely matters`);
  }
  if (wSave > 0.25) fails.push(`${(wSave * 100).toFixed(0)}% saved going the wrong way, which is not a wrong way`);
  console.log(`  the call: ${(rSave * 100).toFixed(0)}% saved reading it right, ${(wSave * 100).toFixed(0)}% reading it wrong`);
}

/* 4. AND THE OVERALL SAVE RATE IS STILL A PENALTY.
      Roughly a fifth to a quarter kept out, the way penalties actually go. Too
      generous and conceding stops hurting; too harsh and the choice is a
      formality. */
{
  const save = t.savedPens / Math.max(1, t.against);
  checked++;
  if (save < 0.14 || save > 0.34) {
    fails.push(`${(save * 100).toFixed(0)}% of penalties against you are saved, which is not what a penalty is worth`);
  }
  const scored = t.scoredPens / Math.max(1, t.forUs);
  checked++;
  if (scored < 0.5 || scored > 0.85) {
    fails.push(`you score ${(scored * 100).toFixed(0)}% of your own penalties, outside the band a penalty should sit in`);
  }
  console.log(`  ${(save * 100).toFixed(0)}% of theirs saved, ${(scored * 100).toFixed(0)}% of yours scored`);
}

/* 5. A BETTER KEEPER SAVES MORE.
      Otherwise buying a keeper does nothing on the one night it should matter
      most, and the squad screen is lying about what a goalkeeper is for. */
{
  const good = blank(), poor = blank();
  for (let i = 1; i <= 1500; i++) play(i * 6151 + 7, good, 74, 58);
  for (let i = 1; i <= 1500; i++) play(i * 6151 + 7, poor, 44, 58);
  const g = good.savedPens / Math.max(1, good.against);
  const p = poor.savedPens / Math.max(1, poor.against);
  checked++;
  if (g <= p) {
    fails.push(`a 74 squad saves ${(g * 100).toFixed(0)}% and a 44 squad ${(p * 100).toFixed(0)}%: the keeper does not matter`);
  }
  console.log(`  the keeper: ${(g * 100).toFixed(0)}% saved by a strong side, ${(p * 100).toFixed(0)}% by a weak one`);
}

/* 6. THE WHISTLE DOES NOT CARE HOW GOOD THEY ARE.
      The obvious way to write this is to hang the penalty off the opponent's
      chance gate, and then a weak side never wins one and a strong side gets
      showered in them. It is rolled independently, so the rate holds across a
      mismatch in both directions. */
{
  const strong = blank(), weak = blank();
  for (let i = 1; i <= 1200; i++) play(i * 4159 + 13, strong, 70, 46);
  for (let i = 1; i <= 1200; i++) play(i * 4159 + 13, weak, 46, 70);
  const sRate = (strong.forUs + strong.against) / strong.matches;
  const wRate = (weak.forUs + weak.against) / weak.matches;
  checked += 2;
  for (const [name, rate] of [['a strong side', sRate], ['a weak side', wRate]] as const) {
    if (Math.abs(rate - TARGET) > 0.07) {
      fails.push(`${name} gets ${rate.toFixed(3)} penalties a match, so the rate rides on how good you are`);
    }
  }
  console.log(`  across a mismatch: ${sRate.toFixed(3)} a match when far better, ${wRate.toFixed(3)} when far worse`);
}

/* 7. THE SCREEN SHIPS WHAT IT ASKS FOR.
      Seven files per penalty end. A missing one is a broken image in the middle
      of the tensest ten seconds in the game, and nothing else would catch it. */
{
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');

  // our own end holds on one frame and colours it, so one file is the whole
  // requirement there; their end has a picture per corner
  const need: Array<[string, string[]]> = [
    ['penalty', ['buildup', 'goal-left', 'goal-center', 'goal-right', 'save-left', 'save-center', 'save-right']],
    ['def-penalty', ['buildup']],
  ];
  for (const [dir, files] of need) {
    for (const f of files) {
      checked++;
      if (!existsSync(`public/moments/${dir}/${f}.webp`)) {
        fails.push(`public/moments/${dir}/${f}.webp is missing, and the moment shows a hole`);
      }
    }
  }

  // and the screen must not ask for artwork that was never drawn: every
  // /moments/ path it builds has to resolve to a file that exists
  for (const m of src.matchAll(/\/moments\/([a-z-]+)\/\$\{[^}]+\}\.webp/g)) {
    checked++;
    if (m[1] === 'def-penalty') {
      fails.push('Match.tsx builds a def-penalty path from a variable again, but only buildup.webp was ever drawn');
    }
  }
  // and the screen has to actually know about the new end
  checked += 3;
  if (!src.includes('def_penalty')) fails.push('Match.tsx never renders a def_penalty, so the moment would hang the match');
  if (!src.includes('resolveDefPenalty')) fails.push('Match.tsx never resolves a def_penalty');
  if (!/def-penalty/.test(src)) fails.push('Match.tsx has no def-penalty artwork wired up');
  if (!/moment-wash/.test(src)) fails.push('the def-penalty outcome has no colour wash, so a save and a goal look identical');
}

/* 8. AND IT IS THEIR GOAL, NOT YOURS.
      A conceded penalty that lands on your own tally would quietly rewrite
      every league table in the game. */
{
  const rng = createRng(99);
  const mine = makeSquad(58, rng), theirs = makeSquad(58, rng);
  let checkedOne = false;
  for (let seed = 1; seed < 4000 && !checkedOne; seed++) {
    const st: LiveState = L.createLive({
      seed, homeId: 'me', homeName: 'שלי', awayId: 'them', awayName: 'שלהם', iAmHome: true,
      playerStarters: mine.starters, playerBench: mine.bench,
      playerTactic: { approach: 'balanced', press: 'mid' },
      oppStarters: theirs.starters, oppBench: theirs.bench, moraleBias: 0,
    });
    let guard = 0;
    while (st.phase !== 'done' && guard++ < 4000) {
      if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
      if (st.phase === 'moment' && st.pending) {
        const m = st.pending;
        if (m.kind === 'def_penalty') {
          const mineBefore = st.score[0], theirsBefore = st.score[1];
          const gk = L.playerKeeperName(st);
          const { saved, aim } = L.resolveDefPenalty(st, 'left');
          checked += 4;
          if (!CORNERS.includes(aim)) fails.push(`the ball went to "${aim}", which is not a corner the artwork has`);
          if (st.score[0] !== mineBefore) fails.push('a penalty against you moved YOUR score');
          if (saved && st.score[1] !== theirsBefore) fails.push('a saved penalty was scored anyway');
          if (!saved && st.score[1] !== theirsBefore + 1) fails.push('a conceded penalty did not go on their tally');
          if (!gk) fails.push('the screen cannot name the keeper it is about to send');
          checkedOne = true;
          break;
        }
        // answer anything else and carry on hunting
        switch (m.kind) {
          case 'penalty': L.resolvePenalty(st, 'left'); break;
          case 'shot': L.resolveShot(st, 'left'); break;
          case 'free_kick': L.resolveFreeKick(st, 'left'); break;
          case 'one_on_one': L.resolveOneOnOne(st, 'finish'); break;
          case 'def_keeper': L.resolveDefKeeper(st, 'stay'); break;
          case 'def_tackle': L.resolveDefTackle(st, 'contain'); break;
          case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
        }
        if (st.phase === 'moment') st.phase = 'play';
        continue;
      }
      L.step(st);
    }
  }
  checked++;
  if (!checkedOne) fails.push('never found a single penalty against you to inspect');
}

void overall;

console.log(`\n${checked} checks`);
console.log(`one penalty every ${everyN.toFixed(1)} matches, ${((t.forUs / (t.forUs + t.against)) * 100).toFixed(0)}% of them yours`);
/* THE CLOCK STOPS BEHIND EVERY OUTCOME CARD.
   The conceded-penalty card was the one the clock kept running behind, so the
   match played on under "ספגנו." and the manager came back to a pile of
   minutes he never saw. Every outcome state the screen declares has to gate
   the clock, so the next card added cannot quietly repeat this. */
{
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  const states = [...src.matchAll(/const \[(\w+Outcome), set\w+\] = useState/g)].map(m => m[1]);
  const running = src.match(/const running = [^\n]+/)?.[0] ?? '';
  const missing = states.filter(s => !running.includes(`!${s}`));
  checked++;
  if (!states.length || !running) fails.push('could not read the outcome states or the clock gate out of Match.tsx');
  else if (missing.length) fails.push(`the clock keeps running behind: ${missing.join(', ')}`);
  console.log(`  the clock stops behind all ${states.length} outcome cards`);
}

if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a penalty every three games, and every one of them your call');
process.exit(fails.length ? 1 : 0);
