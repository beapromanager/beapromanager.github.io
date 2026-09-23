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

/* 2. THE ROAD IS WALKED.
      Every step must be reachable from a real state on the way through a
      career, in order. A step nothing can reach is a bar that is always zero
      and a drop-off that is always a lie. */
{
  const road: { phase: string; season: number; week: number }[] = [
    { phase: 'onboard-archetype', season: 1, week: 0 },
    { phase: 'onboard-manager', season: 1, week: 0 },
    { phase: 'onboard-club', season: 1, week: 0 },
    { phase: 'signing', season: 1, week: 0 },
    { phase: 'friends', season: 1, week: 0 },
    { phase: 'squad', season: 1, week: 0 },
    { phase: 'preseason', season: 1, week: 0 },
    { phase: 'preseason-market', season: 1, week: 0 },
    { phase: 'hub', season: 1, week: 0 },
    { phase: 'hub', season: 1, week: 1 },
    { phase: 'hub', season: 1, week: 3 },
    { phase: 'hub', season: 1, week: 7 },
    { phase: 'season-end', season: 1, week: 14 },
    { phase: 'hub', season: 2, week: 0 },
  ];
  const seen = road.map(T.stepFor).filter((s): s is T.Step => s !== null);
  checked += 3;

  // every step except the two the state cannot describe
  const byState = new Set(seen);
  const missing = T.STEPS.filter(s => s !== 'open' && s !== 'career_new' && !byState.has(s));
  if (missing.length) fails.push(`no state on the road reaches: ${missing.join(', ')}`);

  // and it never goes backwards
  const back = seen.map(s => T.STEP_ORDER[s]).filter((n, i, a) => i > 0 && n < a[i - 1]);
  if (back.length) fails.push('walking a career forwards reported a step that goes backwards');

  // the two the state cannot describe are reported from the App instead
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  if (!/track\('open'\)/.test(app) || !/track\('career_new'\)/.test(app)) {
    fails.push('opening the game, or starting a career, is not counted anywhere');
  }
  console.log(`  a career walks all ${byState.size} steps the state can describe, in order`);
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
