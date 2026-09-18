/**
 * The reporter watched the match.
 *   node --experimental-strip-types scripts/press-check.mts
 *
 * Item 3 on Itzik's list. Two questions after a game, and the first has to be
 * about what actually happened rather than about the scoreline in the abstract.
 * These are the rules that keep that honest:
 *   1. facts are read out of the events truthfully, never invented
 *   2. a press conference is two questions whenever the match gave him one
 *   3. answering the first leads to the second, not out of the room
 *   4. across a whole season he is not asking the same thing every week
 *   5. the answer is the reveal: meters move in the room, once, and the
 *      verdict reports the real move
 *   6. the terrace is a meter the room can move, and the verdict reports it
 */
import * as G from '../src/game/state.ts';
import { matchFacts } from '../src/data/matchFacts.ts';
import { pickPressQuestions, askableFacts } from '../src/data/pressFacts.ts';
import type { MatchResult, MatchEvent } from '../src/engine/matchEngine.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { LEGENDS } from '../src/data/legends.ts';
import { readFileSync } from 'node:fs';

/** Play the round the way the sacking arc does, then walk to the press room. */
function play(gs: G.GameState, seed: number): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  return G.continueFromResult(G.commitRound(gs, res));
}

const fails: string[] = [];
let checked = 0;

/* ---------------------------------------------------------- 1. the facts */

const ev = (minute: number, type: MatchEvent['type'], teamId: string, playerName: string): MatchEvent =>
  ({ minute, type, teamId, playerId: 'x' + minute, playerName, text: '' });

function fake(events: MatchEvent[], score: [number, number]): MatchResult {
  return {
    seed: 1,
    home: { id: 'ME', name: 'me', stats: { possession: .5, chances: 6, goals: score[0], xg: 1 } },
    away: { id: 'YOU', name: 'you', stats: { possession: .5, chances: 6, goals: score[1], xg: 1 } },
    score, events, ratings: {},
  };
}

const kinds = (r: MatchResult) => matchFacts(r, 'ME').map(f => f.kind);

// a hat trick is a hat trick
{
  const r = fake([ev(10, 'goal', 'ME', 'דן כהן'), ev(40, 'goal', 'ME', 'דן כהן'), ev(70, 'goal', 'ME', 'דן כהן')], [3, 0]);
  const f = matchFacts(r, 'ME');
  checked += 2;
  if (!f.some(x => x.kind === 'hat_trick' && x.who === 'כהן' && x.n === 3)) fails.push('three goals did not read as a hat trick');
  if (f[0].kind !== 'hat_trick') fails.push('the hat trick was not the lead story');
}

// two goals is a brace, not a hat trick
{
  const k = kinds(fake([ev(10, 'goal', 'ME', 'דן כהן'), ev(40, 'goal', 'ME', 'דן כהן')], [2, 0]));
  checked += 2;
  if (!k.includes('brace')) fails.push('two goals did not read as a brace');
  if (k.includes('hat_trick')) fails.push('two goals read as a hat trick');
}

// behind, then won
{
  const k = kinds(fake([ev(10, 'goal', 'YOU', 'א'), ev(40, 'goal', 'ME', 'ב'), ev(70, 'goal', 'ME', 'ג')], [2, 1]));
  checked += 2;
  if (!k.includes('comeback')) fails.push('coming from behind to win did not read as a comeback');
  if (k.includes('collapse')) fails.push('a comeback also read as a collapse');
}

// two up, then drew
{
  const k = kinds(fake([ev(5, 'goal', 'ME', 'א'), ev(15, 'goal', 'ME', 'ב'), ev(60, 'goal', 'YOU', 'ג'), ev(75, 'goal', 'YOU', 'ד')], [2, 2]));
  checked += 2;
  if (!k.includes('collapse')) fails.push('throwing away a two goal lead did not read as a collapse');
  if (k.includes('comeback')) fails.push('a collapse also read as a comeback');
}

// a late winner, and the same goal early is NOT one
{
  const late = kinds(fake([ev(20, 'goal', 'YOU', 'א'), ev(30, 'goal', 'ME', 'ב'), ev(88, 'goal', 'ME', 'ג')], [2, 1]));
  const early = kinds(fake([ev(20, 'goal', 'YOU', 'א'), ev(30, 'goal', 'ME', 'ב'), ev(35, 'goal', 'ME', 'ג')], [2, 1]));
  checked += 2;
  if (!late.includes('late_winner')) fails.push('a winner in the 88th did not read as late');
  if (early.includes('late_winner')) fails.push('a winner in the 35th read as late');
}

// an own goal counts for the other side, and is reported against its scorer
{
  const f = matchFacts(fake([ev(30, 'own_goal', 'ME', 'רן לוי')], [0, 1]), 'ME');
  checked += 2;
  if (!f.some(x => x.kind === 'own_goal' && x.who === 'לוי')) fails.push('an own goal was not attributed');
  if (f.some(x => x.kind === 'clean_sheet')) fails.push('an own goal still counted as a clean sheet');
}

// cards are attributed to the right side
{
  const mine = kinds(fake([ev(40, 'red', 'ME', 'א ב')], [0, 0]));
  const theirs = kinds(fake([ev(40, 'red', 'YOU', 'א ב')], [0, 0]));
  checked += 2;
  if (!mine.includes('red_card') || mine.includes('their_red')) fails.push('my red card was read as theirs');
  if (!theirs.includes('their_red') || theirs.includes('red_card')) fails.push('their red card was read as mine');
}

// nothing is invented out of an empty match
{
  const k = kinds(fake([], [0, 0]));
  checked++;
  for (const bad of ['hat_trick', 'brace', 'comeback', 'collapse', 'red_card', 'late_winner', 'penalty_saved', 'shape_worked', 'shape_failed', 'legend_goal'])
    if (k.includes(bad as never)) fails.push(`a goalless, eventless match reported ${bad}`);
}

// a penalty of theirs that did not go in is a save, mine that did not is a miss
{
  const theirs = kinds(fake([ev(60, 'penalty_miss', 'YOU', 'א ב')], [0, 0]));
  const mine = kinds(fake([ev(60, 'penalty_miss', 'ME', 'א ב')], [0, 0]));
  checked += 2;
  if (!theirs.includes('penalty_saved') || theirs.includes('penalty_miss')) fails.push('their missed penalty did not read as a save');
  if (!mine.includes('penalty_miss') || mine.includes('penalty_saved')) fails.push('my missed penalty read as a save');
}

// a shape changed at half time is judged by the half that followed
{
  const withShape = (score: [number, number], atHalf: [number, number]): MatchResult =>
    ({ ...fake([], score), shape: { to: '5-4-1', atHalf } });
  checked += 4;
  if (!kinds(withShape([2, 0], [1, 0])).includes('shape_worked')) fails.push('a half won after the change did not read as worked');
  if (!kinds(withShape([1, 0], [1, 0])).includes('shape_worked')) fails.push('a lead held after the change did not read as worked');
  if (!kinds(withShape([0, 1], [0, 1])).includes('shape_failed')) fails.push('a deficit that stayed did not read as failed');
  if (!kinds(withShape([1, 2], [1, 0])).includes('shape_failed')) fails.push('a half lost after the change did not read as failed');
  const f = matchFacts(withShape([2, 0], [1, 0]), 'ME').find(x => x.kind === 'shape_worked');
  checked++;
  if (f?.who !== '5-4-1') fails.push('the shape question does not know which shape was chosen');
}

// one of the ראש העין regulars scoring is a story of its own
{
  const legend = LEGENDS[0].name;
  const k = kinds(fake([ev(30, 'goal', 'ME', legend)], [1, 0]));
  const plain = kinds(fake([ev(30, 'goal', 'ME', 'דן כהן')], [1, 0]));
  checked += 2;
  if (!k.includes('legend_goal')) fails.push(`${legend} scored and nobody noticed who he is`);
  if (plain.includes('legend_goal')) fails.push('an ordinary scorer was read as a legend');
}

// and each of the new facts has a question waiting for it
{
  checked++;
  const missing = (['penalty_saved', 'shape_worked', 'shape_failed', 'legend_goal'] as const)
    .filter(k => !askableFacts([{ kind: k, who: 'x', minute: 50, n: 1 }]).length);
  if (missing.length) fails.push(`no question written for ${missing.join(', ')}`);
}

/* ------------------------------------------- 2 to 4. a real season of them */

const seen = new Set<string>();
let twoQ = 0, oneQ = 0, factLed = 0, rounds = 0;

for (const town of ['רמת גן', 'חיפה', 'באר שבע']) {
  let gs = G.newGame(5100 + town.length);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, town);
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);

  for (let w = 0; w < 14 && !gs.seasonOver; w++) {
    gs = play(gs, w * 7);
    if (gs.phase !== 'press') continue;   // sacking, ultimatum, or a season that ended
    rounds++;

    const r = gs.lastPlayerMatch!;
    const facts = matchFacts(r, gs.clubId, G.mySquad(gs));
    const total = G.pressRemaining(gs);
    const askable = askableFacts(facts);

    checked++;
    if (askable.length > 0 && total !== 2)
      fails.push(`${town} week ${w}: ${askable.length} things to ask about but ${total} question(s)`);
    if (askable.length === 0 && total !== 1)
      fails.push(`${town} week ${w}: nothing to ask about but ${total} questions`);
    total === 2 ? twoQ++ : oneQ++;
    if (askable.length) factLed++;

    seen.add(gs.press!.q.text);

    // answering the first must land on the second, still in the press room
    if (total === 2) {
      const next = G.answerPress(gs, 0);
      checked += 2;
      if (next.phase !== 'press') fails.push(`${town} week ${w}: the first answer left the press room`);
      if (next.press?.q.text === gs.press!.q.text) fails.push(`${town} week ${w}: the second question repeats the first`);
      seen.add(next.press?.q.text ?? '');
      gs = next;
    }
    // and the last one must leave it
    const out = G.answerPress(gs, 0);
    checked++;
    if (out.phase === 'press') fails.push(`${town} week ${w}: the conference never ends`);
    gs = out;
  }
}

checked++;
if (seen.size < 12) fails.push(`only ${seen.size} distinct questions across ${rounds} rounds, he repeats himself`);

/* ------------------------------------------- 5. the answer is the reveal */
/* The buttons show only the words. Picking one lands it on the meters right
   there in the room, once, and the verdict says what actually moved, caps
   included; a refresh mid reveal shows the same verdict and cannot land it
   again; walking on is a separate step, and the one-shot the checks use is
   the two put together. */
{
  let gs = G.newGame(5107);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'חיפה');
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  let w = 0;
  while (gs.phase !== 'press' && w < 14) gs = play(gs, w++ * 7);
  checked++;
  if (gs.phase !== 'press') fails.push('never reached a press room for the reveal');
  else {
    // sit the morale a point under its ceiling so a big answer is capped
    const q = gs.press!.q;
    const i = q.answers.findIndex(a => (a.effect.morale ?? 0) >= 2);
    const idx = i >= 0 ? i : 0;
    const eff = q.answers[idx].effect;
    const room = { ...gs, meters: { ...gs.meters, morale: 99, prestige: 50 } };
    checked++;
    if (G.pressVerdict(room)) fails.push('a verdict exists before an answer is given');
    const picked = G.pickPressAnswer(room, idx);
    const v = G.pressVerdict(picked);
    checked += 4;
    if (picked.phase !== 'press' || picked.press?.q.text !== q.text) fails.push('picking an answer left the question');
    if (picked.press?.answered !== idx) fails.push('the answer was not remembered on the question');
    if (!v) fails.push('no verdict after the answer');
    else {
      const realMorale = picked.meters.morale - 99, realPrestige = picked.meters.prestige - 50;
      if (v.morale !== realMorale || v.prestige !== realPrestige) fails.push(`the verdict says ${v.morale}/${v.prestige}, the meters moved ${realMorale}/${realPrestige}`);
      if ((eff.morale ?? 0) >= 2 && v.morale >= (eff.morale ?? 0)) fails.push(`the verdict reports the promised ${eff.morale}, not the capped move ${v.morale}`);
    }
    // it lands once: a second pick, the same or another, does nothing
    const twice = G.pickPressAnswer(picked, idx === 0 ? 1 : 0);
    checked++;
    if (twice.meters.morale !== picked.meters.morale || twice.meters.prestige !== picked.meters.prestige || twice.press?.answered !== idx) fails.push('an answer landed twice');
    // a refresh mid reveal keeps the verdict and still cannot land it again
    const back = JSON.parse(JSON.stringify(picked)) as G.GameState;
    checked += 2;
    if (!G.pressVerdict(back) || G.pressVerdict(back)!.morale !== v!.morale) fails.push('a refresh lost the verdict');
    if (G.answerPress(back, 0).meters.morale !== picked.meters.morale) fails.push('answering again after a refresh moved the meters again');
    // walking on is its own step, and the one-shot equals the two
    const on = G.continuePress(picked);
    checked += 2;
    if (on.phase === 'press' && on.press?.q.text === q.text) fails.push('walking on stayed on the same question');
    const oneShot = G.answerPress(room, idx);
    if (oneShot.meters.morale !== on.meters.morale || oneShot.phase !== on.phase) fails.push('answerPress is not pick plus continue');
  }
  // and the buttons say nothing about what they do
  const src = readFileSync('src/ui/screens/Press.tsx', 'utf8');
  const buttons = src.slice(src.indexOf('{!answered && ('), src.indexOf('{answered && ('));
  checked += 2;
  if (!buttons.length || /effect/.test(buttons)) fails.push('the answer buttons still show what they do');
  if (!/pressVerdict/.test(src) || !/onPick/.test(src)) fails.push('the room does not show a verdict after the answer');
}

/* ------------------------------------------------ 6. the terrace listens */
/* What he says into the microphone is the one thing that moves the crowd's
   opinion of him, so an answer that carries a fans figure lands on the fans
   meter exactly like the other two: once, capped at the ends, reported by the
   verdict as it actually moved, and remembered across a refresh. A room saved
   before the terrace existed has nothing to report about it, not NaN. */
{
  let gs = G.newGame(5108);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  let w = 0;
  while (gs.phase !== 'press' && w < 14) gs = play(gs, w++ * 7);
  checked++;
  if (gs.phase !== 'press') fails.push('never reached a press room for the terrace');
  else {
    checked++;
    if (gs.meters.fans !== 50) fails.push(`a first season opens with the terrace at ${gs.meters.fans}, not 50`);
    // a question whose lines move only the crowd, put in the reporter's mouth
    const q = { ...gs.press!.q, answers: [
      { label: 'a', effect: { fans: +3 }, reply: '' },
      { label: 'b', effect: { fans: -4 }, reply: '' },
    ] };
    const room = { ...gs, press: { ...gs.press!, q }, meters: { ...gs.meters, fans: 50, morale: 60, prestige: 40 } };
    const up = G.pickPressAnswer(room, 0);
    const v = G.pressVerdict(up);
    checked += 4;
    if (up.meters.fans !== 53) fails.push(`+3 on the terrace left it at ${up.meters.fans}`);
    if (up.meters.morale !== 60 || up.meters.prestige !== 40) fails.push('a fans-only line moved the other meters');
    if (!v || v.fans !== 3) fails.push(`the verdict reports fans ${v?.fans}, the meter moved +3`);
    if (!v || v.morale !== 0 || v.prestige !== 0) fails.push('the verdict invented a morale or prestige move');
    // capped at the ends, and the verdict says the capped figure
    const full = G.pickPressAnswer({ ...room, meters: { ...room.meters, fans: 99 } }, 0);
    const empty = G.pickPressAnswer({ ...room, meters: { ...room.meters, fans: 2 } }, 1);
    checked += 3;
    if (full.meters.fans !== 100) fails.push(`+3 from 99 should stop at 100, the terrace reads ${full.meters.fans}`);
    if (G.pressVerdict(full)?.fans !== 1) fails.push(`capped at 100 the verdict says ${G.pressVerdict(full)?.fans}, not +1`);
    if (empty.meters.fans !== 0) fails.push(`the terrace went below 0, to ${empty.meters.fans}`);
    // once, and once across a refresh
    const twice = G.pickPressAnswer(up, 1);
    const back = JSON.parse(JSON.stringify(up)) as G.GameState;
    checked += 3;
    if (twice.meters.fans !== 53) fails.push('a fans line landed twice');
    if (G.pressVerdict(back)?.fans !== 3) fails.push('a refresh lost the terrace verdict');
    if (G.answerPress(back, 1).meters.fans !== 53) fails.push('answering again after a refresh moved the terrace again');
    // a room saved before the terrace: the verdict has nothing to say, not NaN
    const old = { ...up, press: { ...up.press!, before: { morale: 60, prestige: 40 } } };
    checked++;
    if (G.pressVerdict(old)?.fans !== 0) fails.push(`a pre-terrace room reports fans ${G.pressVerdict(old)?.fans}`);
  }
  // and the verdict card has a row for it
  const src = readFileSync('src/ui/screens/Press.tsx', 'utf8');
  checked++;
  if (!/v\.fans/.test(src)) fails.push('the verdict card does not show what the answer did to the terrace');
}

console.log(`${checked} checks`);
console.log(`${rounds} press conferences: ${twoQ} of two questions, ${oneQ} of one`);
console.log(`${factLed} led with something that happened in the match`);
console.log(`${seen.size} distinct questions asked`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, he watched the match and asks about it, twice');
process.exit(fails.length ? 1 : 0);
