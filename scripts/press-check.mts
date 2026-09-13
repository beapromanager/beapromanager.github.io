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
 */
import * as G from '../src/game/state.ts';
import { matchFacts } from '../src/data/matchFacts.ts';
import { pickPressQuestions, askableFacts } from '../src/data/pressFacts.ts';
import type { MatchResult, MatchEvent } from '../src/engine/matchEngine.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { LEGENDS } from '../src/data/legends.ts';

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

console.log(`${checked} checks`);
console.log(`${rounds} press conferences: ${twoQ} of two questions, ${oneQ} of one`);
console.log(`${factLed} led with something that happened in the match`);
console.log(`${seen.size} distinct questions asked`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, he watched the match and asks about it, twice');
process.exit(fails.length ? 1 : 0);
