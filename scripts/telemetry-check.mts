/**
 * The counting counts, and tells nobody anything it should not.
 *   node --experimental-strip-types scripts/telemetry-check.mts
 *
 * This is the first thing in the game that sends anything anywhere, and the
 * promise made on the title screen is that what a player types stays on his
 * phone. A promise in a comment is a wish; this measures it.
 *
 * Four things hold here:
 *   1. the funnel is a funnel: every step is known, ordered, and never sent
 *      twice, so a restarted career cannot invent people
 *   2. the road is walked: a whole career, phase by phase, reaches every step
 *      in order and skips none
 *   3. nothing personal can reach the wire, by reading the source rather than
 *      trusting it
 *   4. with no endpoint the game sends nothing at all, which is how it ships
 */
import { readFileSync } from 'node:fs';
import * as T from '../src/game/telemetry.ts';
import { TELEMETRY_URL } from '../src/data/telemetry.ts';
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import type { MatchResult } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { MANAGERS } from '../src/data/managers.ts';


const fails: string[] = [];
let checked = 0;

/* 1. THE FUNNEL IS A FUNNEL. */
{
  checked += 4;
  if (new Set(T.STEPS).size !== T.STEPS.length) fails.push('a step is listed twice, so its bar counts double');
  const orders = T.STEPS.map(s => T.STEP_ORDER[s]);
  if (orders.some((n, i) => n !== i)) fails.push('the step order does not match the step list');

  // a step already passed is never sent again: the funnel counts people who
  // reached a step, not times a man walked past it
  if (T.shouldSend('club', 'squad')) fails.push('walking back through a step would report it again');
  if (!T.shouldSend('open', 'season_2')) fails.push('opening the game stopped being counted once a career got going');
  console.log(`  ${T.STEPS.length} steps, in order, each counted once per device`);
}

/* 2. THE ROAD IS WALKED, BY A REAL CAREER.
      Every step must be reached by a state the GAME produces, in order, and a
      step nothing reaches is a bar that is always zero and a drop-off that is
      always a lie.

      This used to walk a road of hand-written states, and it passed while
      stepFor was badly wrong: the week is the round a manager is ON and starts
      at one, so reading it as rounds played reported the first match before a
      ball was kicked. The made-up road agreed with the made-up mapping,
      because the same hand wrote both. Now every state comes out of the game
      itself, so only the game can say what a step means. */
{
  const seen: { step: T.Step | null; where: string }[] = [];
  const note = (gs: { phase: string; season: number; week: number }, where: string) =>
    seen.push({ step: T.stepFor(gs), where });

  let gs = G.newGame(20260923);
  note(gs, 'a career that has done nothing');
  const blank = T.stepFor(gs);
  checked++;
  if (blank !== null) fails.push(`a brand new career already reports "${blank}" before anything was done`);

  // in the order the GAME walks, which is not the order the screens are named
  gs = G.setProfile(gs, { name: 'בודק', face: 0 }); note(gs, 'named');
  gs = G.pickCity(gs, 'חיפה'); note(gs, 'club picked');
  gs = G.setArchetype(gs, MANAGERS[0].id); note(gs, 'archetype picked');
  gs = G.afterSigning(gs, {}); note(gs, 'signed');
  gs = G.addFriends(gs, []); note(gs, 'friends done');
  gs = G.enterPreseason(gs); note(gs, 'the summer market');
  gs = G.enterSeason({ ...gs, crisisDone: true }); note(gs, 'the shirt and the sponsor');
  gs = G.closeKitReveal(gs); gs = G.takeSponsor(gs, 'base'); gs = G.dismissNotice(gs);
  note(gs, 'out into the league');

  // and the first whistle has not blown yet
  checked++;
  if (T.stepFor(gs) !== 'season') {
    fails.push(`a manager who has not played a match reports "${T.stepFor(gs)}", not "season"`);
  }

  const played: Record<number, T.Step | null> = {};
  for (let n = 1; n <= 8; n++) {
    gs = playRound(gs, n);
    played[n] = T.stepFor(gs);
    note(gs, `${n} rounds played`);
  }
  checked += 3;
  if (played[1] !== 'round_1') fails.push(`after one round the step is "${played[1]}", not round_1`);
  if (played[3] !== 'round_3') fails.push(`after three rounds the step is "${played[3]}", not round_3`);
  if (played[7] !== 'round_7') fails.push(`after seven rounds the step is "${played[7]}", not round_7`);

  const reached = new Set(seen.map(s => s.step).filter((s): s is T.Step => s !== null));
  checked += 2;
  // season_end and season_2 are the far end of a whole season, checked by the
  // phase and the season count the game itself uses for them
  const far = ['season_end', 'season_2'] as const;
  if (T.stepFor({ phase: 'season-end', season: 1, week: 14 }) !== 'season_end') fails.push('finishing a season reports something else');
  if (T.stepFor({ phase: 'hub', season: 2, week: 1 }) !== 'season_2') fails.push('a second season reports something else');
  const missing = T.STEPS.filter(s => s !== 'open' && s !== 'career_new' && !far.includes(s as never) && !reached.has(s));
  if (missing.length) fails.push(`a real career never reaches: ${missing.join(', ')}`);

  // and it never goes backwards
  const order = seen.map(s => (s.step ? T.STEP_ORDER[s.step] : -1));
  for (let i = 1; i < order.length; i++) {
    if (order[i] < order[i - 1]) {
      fails.push(`the step went backwards at "${seen[i].where}": ${seen[i - 1].step} then ${seen[i].step}`);
      break;
    }
  }

  // the two the state cannot describe are reported from the App instead
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  checked++;
  if (!/track\('open'\)/.test(app) || !/track\('career_new'\)/.test(app)) {
    fails.push('opening the game, or starting a career, is not counted anywhere');
  }
  console.log(`  a real career walks ${reached.size} steps in order, and plays its first match before saying so`);
}

/** One round, played for real, so the week moves the way the game moves it. */
function playRound(gs: G.GameState, seed: number): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res: MatchResult = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  let next = G.continueFromResult(G.commitRound(gs, res));
  while (next.phase === 'press') next = G.answerPress(next, 0);
  if ((next as { phase: string }).phase === 'chat') next = G.closeChat(next);
  if (next.phase === 'dilemma') next = G.chooseDilemma(next, 0);
  return next;
}

/* 3. NOTHING PERSONAL CAN REACH THE WIRE.
      Read rather than trusted. The event has four fields and they are built in
      one place; if a name could get in, it would have to get in there. */
{
  const tele = readFileSync('src/game/telemetry.ts', 'utf8');
  checked += 4;

  // the only thing that is posted is the queue of events, and an event is
  // built from these four and nothing else
  if (!/const e: Event = \{ a: deviceId\(\), s: sessionId, k: step, t: Date\.now\(\) \};/.test(tele)) {
    fails.push('the event is no longer built from exactly the device, the sitting, the step and the time');
  }
  // The real boundary is the import list. Every name a player types lives on
  // the career state, so a file that cannot reach state.ts or the save cannot
  // leak one, whatever anybody writes in it later. Checking for the WORDS
  // instead was worse than useless: two of the funnel's own steps are called
  // friends and squad, so the guard fired on its own step names.
  const imports = [...tele.matchAll(/from '([^']+)'/g)].map(m => m[1]);
  const forbidden = imports.filter(i => /state\.ts|save\.ts|squadGen|personalities|clubs\.ts|names\.ts/.test(i));
  if (forbidden.length) {
    fails.push(`telemetry.ts imports ${forbidden.join(', ')}, and the career state is where every typed name lives`);
  }
  if (/GameState/.test(tele)) fails.push('telemetry.ts handles a whole career state');
  // stepFor is handed three plain numbers and a phase, never a career
  if (!/export function stepFor\(g: \{ phase: string; season: number; week: number \}\)/.test(tele)) {
    fails.push('stepFor takes something wider than a phase, a season and a week');
  }
  // and only one place in the whole game posts anything
  const posts = ['src/game/telemetry.ts', 'src/ui/screens/Admin.tsx'];
  const all = (readFileSync('src/ui/App.tsx', 'utf8') + readFileSync('src/game/state.ts', 'utf8'));
  if (/fetch\(/.test(all)) fails.push('something outside telemetry.ts posts to the network');
  console.log(`  the wire carries four values, built in one place, out of ${posts.length} files that can reach it`);
}

/* 4. AND WITH NOWHERE TO SEND IT, IT SENDS NOTHING.
      The state the game ships in until the worker is up. */
{
  checked += 2;
  const tele = readFileSync('src/game/telemetry.ts', 'utf8');
  if (!/export function track\(step: Step\): void \{\s*\n\s*if \(!TELEMETRY_URL\) return;/.test(tele)) {
    fails.push('with no endpoint the game still tries to count');
  }
  if (!/export async function flush\(\)[^]{0,120}if \(!TELEMETRY_URL[^]{0,30}\) return;/.test(tele)) {
    fails.push('with no endpoint the queue is still posted');
  }
  console.log(`  the endpoint is ${TELEMETRY_URL ? 'set, so the game counts' : 'empty, so the game counts nothing at all'}`);
}

/* 5. THE QUEUE SURVIVES A BAD NETWORK WITHOUT GROWING FOREVER. */
{
  const e = (k: T.Step): T.Event => ({ a: 'x', s: 'y', k, t: 1 });
  let q: T.Event[] = [];
  for (let i = 0; i < T.QUEUE_CAP + 25; i++) q = T.enqueued(q, e('open'), T.QUEUE_CAP);
  checked += 2;
  if (q.length !== T.QUEUE_CAP) fails.push(`a phone offline for a month queues ${q.length} events, not ${T.QUEUE_CAP}`);
  // and it keeps the NEWEST, because a month old event is worth less
  const mixed = T.enqueued([e('open'), e('club')], e('season_2'), 2);
  if (mixed[mixed.length - 1].k !== 'season_2') fails.push('the queue drops the newest event instead of the oldest');
  console.log(`  an offline phone holds ${T.QUEUE_CAP} events and keeps the newest`);
}

/* 6. THE DASHBOARD POINTS AT THE CLIFF.
      The smallest bar is always the last one and says nothing; the number
      worth reading is the biggest single fall. */
{
  const drop = T.biggestDrop([
    { step: 'open', n: 100 }, { step: 'career_new', n: 90 },
    { step: 'archetype', n: 40 }, { step: 'manager', n: 38 },
  ]);
  checked += 2;
  if (drop?.from !== 'career_new' || drop?.to !== 'archetype') {
    fails.push(`the dashboard points at ${drop?.from} to ${drop?.to}, not at the cliff`);
  }
  if (T.biggestDrop([{ step: 'open', n: 0 }]) !== null) fails.push('an empty funnel invents a drop-off');
  console.log('  the dashboard names the biggest fall, not the smallest bar');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks), and nothing a player types can reach the wire`);
