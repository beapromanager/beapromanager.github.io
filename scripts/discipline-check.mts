/**
 * Cards, and whether a sending off is real.
 *   node --experimental-strip-types scripts/discipline-check.mts
 *
 * A tester reported a red card in every match of his first season. The rate was
 * high — three or four times real football — but the thing that made it feel
 * constant was worse than the rate: four out of five red cards in the game were
 * a caption over nothing. The ticker said "אדום! X מורחק" and X carried on
 * playing the other fifty minutes, because the only path that actually took a
 * man off the pitch was the sliding tackle. The side never went down to ten.
 *
 * So this measures both halves of it: how often it happens, and whether it
 * happened at all.
 */
import * as L from '../src/game/liveMatch.ts';
import type { LiveState, Corner } from '../src/game/liveMatch.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;

const CORNERS: Corner[] = ['left', 'center', 'right'];
const ROUNDS = 14;              // a ליגה ג׳ season

interface Tally {
  matches: number;
  myReds: number; myYellows: number; theirReds: number;
  /** matches where the eleven left on the pitch did not match the reds shown */
  ghosts: number;
  /** the fewest men ever left on a side */
  fewest: number;
}
const blank = (): Tally => ({ matches: 0, myReds: 0, myYellows: 0, theirReds: 0, ghosts: 0, fewest: 11 });

/**
 * One match, answered at random. `slide` forces the sliding tackle every time,
 * which is the choice that risks a red on purpose.
 */
function play(seed: number, t: Tally, press: 'low' | 'mid' | 'high' = 'mid', slide = false, lvl = 52) {
  const rng = createRng(seed);
  const mine = makeSquad(lvl, rng), theirs = makeSquad(lvl, rng);
  const st: LiveState = L.createLive({
    seed, homeId: 'me', homeName: 'שלי', awayId: 'them', awayName: 'שלהם', iAmHome: true,
    playerStarters: mine.starters, playerBench: mine.bench,
    playerTactic: { approach: 'balanced', press },
    oppStarters: theirs.starters, oppBench: theirs.bench, moraleBias: 0,
    coach: { chemistry: 0.7, att: 1, def: 1, cards: 1 },
  });
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  let guard = 0;

  while (st.phase !== 'done' && guard++ < 4000) {
    if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
    if (st.phase === 'moment' && st.pending) {
      const m = st.pending;
      switch (m.kind) {
        case 'penalty': L.resolvePenalty(st, pick(CORNERS)); break;
        case 'def_penalty': L.resolveDefPenalty(st, pick(CORNERS)); break;
        case 'shot': L.resolveShot(st, pick(CORNERS)); break;
        case 'free_kick': L.resolveFreeKick(st, pick(CORNERS)); break;
        case 'one_on_one': L.resolveOneOnOne(st, pick(['dribble', 'finish'])); break;
        case 'def_keeper': L.resolveDefKeeper(st, pick(['rush', 'stay'])); break;
        case 'def_tackle': L.resolveDefTackle(st, slide ? 'slide' : pick(['slide', 'contain'])); break;
        case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
      }
      if (st.phase === 'moment') st.phase = 'play';
      continue;
    }
    L.step(st);
    // a side must never be walked off the pitch a man at a time
    t.fewest = Math.min(t.fewest, st.home.onPitch.length, st.away.onPitch.length);
  }

  t.matches++;
  let mine_ = 0, theirs_ = 0;
  for (const e of st.events) {
    if (e.type === 'red') { if (e.teamId === 'me') mine_++; else theirs_++; }
    if (e.type === 'yellow' && e.teamId === 'me') t.myYellows++;
  }
  t.myReds += mine_; t.theirReds += theirs_;

  // THE ONE THAT MATTERED. Substitutions never change the count on the pitch,
  // so eleven minus the reds shown is exactly what should be left standing.
  if (st.home.onPitch.length !== 11 - mine_ || st.away.onPitch.length !== 11 - theirs_) t.ghosts++;
}

/* 1. A RED CARD TAKES A MAN OFF. Every match, both sides, no exceptions. */
{
  const t = blank();
  for (let i = 1; i <= 3000; i++) play(i * 7919 + 5, t, i % 3 === 0 ? 'high' : 'mid', i % 4 === 0);
  checked += 3;
  if (t.ghosts > 0) {
    fails.push(`${t.ghosts} of ${t.matches} matches ended with a red card shown and nobody actually sent off`);
  }
  if (t.myReds === 0) fails.push('not one red card in 3000 matches, discipline has stopped working');
  if (t.fewest < 9) fails.push(`a side was walked down to ${t.fewest} men, which is a bug with a whistle`);
  console.log(`  ${t.matches} matches: every red took a man off, and nobody went below ${t.fewest}`);
}

/* 2. AND IT IS RARE.
      Roughly one a season, not one a week. Real football sends off about one man
      in twenty matches per side; a game can sit a little above that, because a
      sending off should be a night you remember, but nowhere near where this
      was — one every five matches, which is three a season and stops being an
      event at all. */
{
  const t = blank();
  for (let i = 1; i <= 3000; i++) play(i * 3313 + 11, t, 'mid', false);
  const per = t.myReds / t.matches;
  const perSeason = per * ROUNDS;
  checked += 2;
  if (per > 0.10) fails.push(`${per.toFixed(3)} reds a match, ${perSeason.toFixed(1)} a season. That is not a sending off, that is a routine`);
  if (per < 0.015) fails.push(`${per.toFixed(3)} reds a match: a sending off has become so rare it may as well not exist`);
  const yel = t.myYellows / t.matches;
  checked++;
  if (yel < 1.4 || yel > 2.9) fails.push(`${yel.toFixed(2)} yellows a match, which is not what a match of football books`);
  console.log(`  ${per.toFixed(3)} reds a match — ${perSeason.toFixed(1)} across a ${ROUNDS} round season — and ${yel.toFixed(2)} yellows`);
}

/* 3. GOING LOOKING FOR IT COSTS MORE.
      A high press and a sliding tackle every time should book you more often
      than sitting off, or neither choice means anything. */
{
  const safe = blank(), reckless = blank();
  for (let i = 1; i <= 2500; i++) play(i * 6151 + 7, safe, 'low', false);
  for (let i = 1; i <= 2500; i++) play(i * 6151 + 7, reckless, 'high', true);
  const s = safe.myReds / safe.matches, r = reckless.myReds / reckless.matches;
  checked += 2;
  if (r <= s) fails.push(`pressing high and sliding in gets ${r.toFixed(3)} reds against ${s.toFixed(3)} sitting off: the choice does not bite`);
  if (r > 0.14) fails.push(`even at its most reckless, ${r.toFixed(3)} reds a match is too many`);
  console.log(`  the choice bites: ${s.toFixed(3)} sitting off, ${r.toFixed(3)} pressing high and sliding in`);
}

/* 4. IT HAPPENS TO THEM TOO.
      A game where only your men walk is not a referee, it is a grudge. */
{
  const t = blank();
  for (let i = 1; i <= 2500; i++) play(i * 4159 + 13, t, 'mid', false);
  const mine = t.myReds / t.matches, theirs = t.theirReds / t.matches;
  checked++;
  if (theirs < mine * 0.5) {
    fails.push(`you get ${mine.toFixed(3)} reds a match and they get ${theirs.toFixed(3)}: the whistle only goes one way`);
  }
  console.log(`  both ways: ${mine.toFixed(3)} yours, ${theirs.toFixed(3)} theirs`);
}

console.log(`\n${checked} checks`);
/* THE BANNER SAYS WHAT HAPPENED.
   A red card at 0-0 used to flash גוווול, because the banner fired on every
   big event and only ever knew one word. */
{
  const red = L.flashWords({ type: 'red' }, true);
  const theirRed = L.flashWords({ type: 'red' }, false);
  const saved = L.flashWords({ type: 'penalty_miss' }, false);
  const missed = L.flashWords({ type: 'penalty_miss' }, true);
  const goal = L.flashWords({ type: 'goal' }, true);
  if (red.word.includes('גו') || red.good) fails.push(`our red card flashes "${red.word}" as good news`);
  if (!theirRed.good) fails.push('their red card reads as bad news for us');
  if (saved.word.includes('גו') || !saved.good) fails.push(`a penalty our keeper saved flashes "${saved.word}"`);
  if (missed.good) fails.push('our own missed penalty reads as good news');
  if (!goal.word.includes('גו') || !goal.good) fails.push('a goal of ours no longer flashes as a goal');
  console.log('  the banner: a red is אדום, a save is הצלה, only a goal is a goal');
}

if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a sending off is rare, it is earned, and the man actually goes');
process.exit(fails.length ? 1 : 0);
