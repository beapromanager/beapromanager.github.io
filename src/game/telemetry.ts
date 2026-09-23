/**
 * Counting, and nothing else.
 *
 * Three questions, and this file exists only to answer them: how many people
 * opened the game, how many came back, and where the ones who stopped stopped.
 * That last one is the whole point. A drop off at "picked a club" is an
 * onboarding problem; a drop off at "played round three" is a game problem;
 * and without the number they are indistinguishable from a feeling.
 *
 * WHAT NEVER LEAVES THE PHONE. The manager's name, his friends' names, his
 * club, his squad, anything he typed. Not "we strip it before sending": there
 * is no path from those values into this file at all, and telemetry-check
 * reads the source to keep it that way. What goes is a random number that
 * means nothing off this device, which step was reached, and when.
 *
 * WHEN THERE IS NOWHERE TO SEND IT. With no endpoint configured every call
 * here is a no op, so the game runs exactly as it did before any of this
 * existed. That is the state the game ships in if the worker is not up yet.
 *
 * WHEN THE NETWORK IS NOT THERE. Events queue in localStorage and go with the
 * next batch, so a career played on a bus is not a hole in the funnel. The
 * queue is capped: a phone that is offline for a month posts its cap and
 * forgets the rest, because a stale event is worth less than a working game.
 */
import { TELEMETRY_URL } from '../data/telemetry.ts';

/** the furthest a player got, in the order he would get there */
export const STEPS = [
  'open',            // the title screen drew
  'career_new',      // tapped a new career
  'manager',         // named himself
  'club',            // picked a town and colours
  'archetype',       // picked who he is
  'signing',         // signed the contract
  'friends',         // named his two, or skipped
  'squad',           // met the squad
  'market',          // saw the summer market
  'season',          // walked out into the league
  'round_1',         // played one
  'round_3',         // played three
  'round_7',         // half a season
  'season_end',      // finished one
  'season_2',        // came back for another
] as const;
export type Step = typeof STEPS[number];

/** how far along the road each step is, for a funnel that cannot go backwards */
export const STEP_ORDER: Record<Step, number> =
  Object.fromEntries(STEPS.map((s, i) => [s, i])) as Record<Step, number>;

const AID_KEY = 'beapro.aid';
const QUEUE_KEY = 'beapro.tq';
const FAR_KEY = 'beapro.far';
/** beyond this the oldest go, see the note at the top */
export const QUEUE_CAP = 60;

export type Event = {
  /** anonymous device id */
  a: string;
  /** this sitting */
  s: string;
  /** the step reached */
  k: Step;
  /** when, ms since epoch, from the device clock */
  t: number;
};

/** A random id with no meaning anywhere but in a count of distinct ids. */
function newId(): string {
  const b = new Uint8Array(9);
  (globalThis.crypto ?? { getRandomValues: (x: Uint8Array) => x.forEach((_, i) => (x[i] = Math.floor(Math.random() * 256))) })
    .getRandomValues(b);
  return Array.from(b, x => x.toString(36).padStart(2, '0')).join('').slice(0, 14);
}

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string): void {
  try { localStorage.setItem(key, v); } catch { /* private mode, and that is fine */ }
}

/** This device, remembered so returning is countable. Made on first use. */
export function deviceId(): string {
  const had = read(AID_KEY);
  if (had) return had;
  const made = newId();
  write(AID_KEY, made);
  return made;
}

/** This sitting. New every time the game is opened, never stored. */
const sessionId = newId();

/** The furthest step this device has ever reached. */
export function furthest(): Step | null {
  const v = read(FAR_KEY) as Step | null;
  return v && v in STEP_ORDER ? v : null;
}

/**
 * Whether a step is worth sending.
 *
 * A player who opens the game eleven times sends "open" eleven times, and that
 * is the point, it is how returning is counted. But the steps along the road
 * are sent once each: the funnel asks how many people reached a step, not how
 * many times a man walked past it, and a career restarted twice would
 * otherwise read as two people getting further than they did.
 */
export function shouldSend(step: Step, far: Step | null): boolean {
  if (step === 'open') return true;
  return far === null || STEP_ORDER[step] > STEP_ORDER[far];
}

export function readQueue(): Event[] {
  try {
    const raw = read(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isEvent) : [];
  } catch { return []; }
}

function isEvent(e: unknown): e is Event {
  const x = e as Event;
  return !!x && typeof x.a === 'string' && typeof x.s === 'string'
    && typeof x.t === 'number' && typeof x.k === 'string' && x.k in STEP_ORDER;
}

/** The queue with one more on the end, oldest dropped past the cap. */
export function enqueued(queue: Event[], e: Event, cap = QUEUE_CAP): Event[] {
  const next = [...queue, e];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/**
 * Note that a step was reached.
 *
 * Never throws and never waits: a game that stalls because a counter could not
 * be posted is worse than no counting at all. The call site does not get told
 * whether anything was sent.
 */
export function track(step: Step): void {
  if (!TELEMETRY_URL) return;
  const far = furthest();
  if (!shouldSend(step, far)) return;
  if (step !== 'open' && (far === null || STEP_ORDER[step] > STEP_ORDER[far])) write(FAR_KEY, step);

  const e: Event = { a: deviceId(), s: sessionId, k: step, t: Date.now() };
  const queue = enqueued(readQueue(), e);
  write(QUEUE_KEY, JSON.stringify(queue));
  void flush();
}

let sending = false;

/**
 * Post whatever is queued, and forget it only once it has landed.
 *
 * It keeps going until the queue is empty rather than sending one batch. A
 * single batch left the queue exactly one behind: anything added while a post
 * was in the air waited for the NEXT call to flush, which for most people is
 * the next time they open the game. The ones who never open it again are
 * precisely the ones this whole file exists to count, so a lag of one session
 * was a hole exactly where it hurts.
 */
export async function flush(): Promise<void> {
  if (!TELEMETRY_URL || sending) return;
  sending = true;
  try {
    // at most a few rounds: each one either empties the queue or fails
    for (let round = 0; round < 5; round++) {
      const queue = readQueue();
      if (!queue.length) return;
      const res = await fetch(TELEMETRY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ e: queue }),
        // the counting must never keep a tab alive or block a navigation
        keepalive: true,
      });
      if (!res.ok) return;   // the worker is unhappy; it waits in the queue
      // only what was sent is dropped: anything added meanwhile stays
      const now = readQueue();
      write(QUEUE_KEY, JSON.stringify(now.slice(queue.length)));
    }
  } catch {
    // offline, blocked, or the worker is down. It waits in the queue.
  } finally {
    sending = false;
  }
}

/**
 * Send what is left when the page is going away.
 *
 * A phone locked, an app switched, a tab closed: on mobile that is usually the
 * END of the visit and there is no later. visibilitychange is the only event
 * that reliably fires there, and the post is keepalive so it outlives the page.
 */
export function flushOnLeaving(): () => void {
  if (!TELEMETRY_URL || typeof document === 'undefined') return () => {};
  const go = () => { if (document.visibilityState === 'hidden') void flush(); };
  document.addEventListener('visibilitychange', go);
  window.addEventListener('pagehide', () => { void flush(); });
  return () => document.removeEventListener('visibilitychange', go);
}

/**
 * How far along the road this state is.
 *
 * Read off the game rather than announced by the screens: a track() call
 * sprinkled at each turning point is one refactor away from a silent hole in
 * the funnel, and a hole is indistinguishable from people leaving. The phase
 * a player is ON means the step before it is DONE, which is why the names are
 * one behind the cases.
 *
 * Only ever called with a state, never with anything he typed.
 */
export function stepFor(g: { phase: string; season: number; week: number }): Step | null {
  if (g.season >= 2) return 'season_2';
  if (g.phase === 'season-end') return 'season_end';
  // The week is the round he is ON, and it starts at one, so rounds PLAYED is
  // one less. Reading it as rounds played made every brand new career report
  // its first match before a ball was kicked, which would have put the whole
  // funnel at a hundred percent exactly where it is meant to fall off.
  if (g.week - 1 >= 7) return 'round_7';
  if (g.week - 1 >= 3) return 'round_3';
  if (g.week - 1 >= 1) return 'round_1';
  // The order below is the order the game walks, which is not the order the
  // screens are named in: a manager names himself, THEN picks a town, THEN
  // picks who he is, and only then signs. It was written the other way round
  // from the names alone and the funnel reported people moving backwards.
  switch (g.phase) {
    case 'onboard-manager': return null;        // the first screen; nothing done yet
    case 'onboard-club': return 'manager';
    case 'onboard-archetype': return 'club';
    case 'signing': return 'archetype';
    case 'friends': return 'signing';
    case 'squad': return 'friends';
    case 'preseason':
    case 'preseason-market': return 'squad';
    // the summer ends in the shirt and the sponsor, which is the market behind him
    case 'kit':
    case 'sponsor': return 'market';
    default: return 'season';                   // the hub, and everything the league holds
  }
}

/**
 * The widest gap between two steps in a row.
 *
 * The one number that answers "what do I fix next". Not the smallest bar,
 * which is always the last one and says only that careers are long: the
 * question is where people STOP, and that is the biggest single fall.
 */
export function biggestDrop(funnel: { step: string; n: number }[]): { from: string; to: string; lost: number } | null {
  let worst: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < funnel.length; i++) {
    const lost = funnel[i - 1].n - funnel[i].n;
    if (lost > 0 && (!worst || lost > worst.lost)) {
      worst = { from: funnel[i - 1].step, to: funnel[i].step, lost };
    }
  }
  return worst;
}
