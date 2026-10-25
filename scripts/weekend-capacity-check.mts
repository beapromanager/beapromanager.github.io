/**
 * A league holds what its opener planned for, and every size plays every pair exactly once (Itzik, 25.10).
 *
 *   1. capacity is the planned size, six to twelve; one more than planned is told 'הליגה מלאה'
 *   2. for every n from six to planned, after the lock: roundsFor(n) rounds (n-1 even, n odd), every pair once,
 *      with an odd count everyone rests exactly once, everyone plays the same number of matches, and the slots
 *      that are cut are the latest ones
 *   3. the open league: six with OPEN_SLOTS
 *   4. the server refuses a size off the range and slots that do not fit the size (the core says so, the worker asks the core)
 * Run: npm run check:capacity
 */
import * as W from '../src/game/weekendCore.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };
const T0 = Date.UTC(2026, 10, 2, 9, 0);   // Monday 2.11 11:00 Israel, inside the first cycle (registration open)
const NINE = ['fri-10', 'fri-12', 'fri-14', 'sat-10', 'sat-14', 'sat-20', 'sat-22', 'sun-10', 'sun-18'];

function league(planned: number, n: number): W.League {
  const slots = NINE.slice(0, W.slotsNeeded(planned));
  const made = W.createLeague({ id: `L${planned}-${n}`, kind: 'friend', name: 'ליגת הבדיקה', opener: 'dev-0', nick: 'איציק', slots, seed: 100 + planned, size: planned }, T0);
  if (typeof made === 'string') throw new Error(`planned ${planned}: ${made}`);
  for (let i = 1; i < n; i++) { const e = W.join(made, `dev-${i}`, `חבר ${i}`, T0 + i); if (e) throw new Error(`planned ${planned}, joining ${i}: ${e}`); }
  return made;
}

/* 1. capacity */
for (let planned = W.MIN_MEMBERS; planned <= W.MAX_MEMBERS; planned++) {
  const l = league(planned, planned);
  claim(W.capacity(l) === planned, `planned ${planned}: capacity ${W.capacity(l)}`);
  claim(l.members.length === planned, `planned ${planned}: ${l.members.length} got in`);
  const e = W.join(l, 'dev-extra', 'עוד אחד', T0 + 999);
  claim(e === 'הליגה מלאה', `planned ${planned}: the ${planned + 1}th was told "${e}"`);
  claim(l.members.length === planned, `planned ${planned}: the extra one got in anyway`);
}

/* 2. the rounds, for every n up to planned */
for (let planned = W.MIN_MEMBERS; planned <= W.MAX_MEMBERS; planned++) {
  for (let n = W.MIN_MEMBERS; n <= planned; n++) {
    const l = league(planned, n);
    const chosenBefore = [...l.slots];
    W.lock(l, l.cycle.locks);
    const want = W.roundsFor(n);
    claim(l.status === 'locked', `planned ${planned}, n ${n}: not locked`);
    claim(l.rounds.length === want, `planned ${planned}, n ${n}: ${l.rounds.length} rounds, wanted ${want}`);
    claim(l.rounds[0]?.key === W.KICKOFF_KEY && l.rounds[l.rounds.length - 1]?.key === W.FINAL_KEY, `planned ${planned}, n ${n}: kickoff and final are not first and last`);
    // every pair once, no one twice in a round
    const pairs = new Set<string>();
    const played: Record<string, number> = {};
    const byes: Record<string, number> = {};
    for (const r of l.rounds) {
      const seen = new Set<string>();
      for (const m of r.matches) {
        claim(!seen.has(m.home) && !seen.has(m.away), `planned ${planned}, n ${n}: a manager plays twice in round ${r.index}`);
        seen.add(m.home); seen.add(m.away);
        const key = [m.home, m.away].sort().join('|');
        claim(!pairs.has(key), `planned ${planned}, n ${n}: the pair ${key} meets twice`);
        pairs.add(key);
        played[m.home] = (played[m.home] ?? 0) + 1;
        played[m.away] = (played[m.away] ?? 0) + 1;
      }
      if (r.bye) byes[r.bye] = (byes[r.bye] ?? 0) + 1;
      claim(n % 2 === 0 ? r.bye === null : !!r.bye, `planned ${planned}, n ${n}: round ${r.index} bye is ${r.bye}`);
    }
    claim(pairs.size === (n * (n - 1)) / 2, `planned ${planned}, n ${n}: ${pairs.size} pairs, wanted ${(n * (n - 1)) / 2}`);
    const counts = l.members.map(m => played[m.device] ?? 0);
    claim(counts.every(c => c === n - 1), `planned ${planned}, n ${n}: matches per manager ${counts.join(',')}, wanted ${n - 1} each`);
    if (n % 2 === 1) claim(l.members.every(m => byes[m.device] === 1), `planned ${planned}, n ${n}: byes ${JSON.stringify(byes)}, wanted exactly one each`);
    else claim(Object.keys(byes).length === 0, `planned ${planned}, n ${n}: a bye with an even count`);
    // the slots cut are the latest; the ones kept are in time order between kickoff and final
    const need = W.slotsNeeded(n);
    claim(l.slots.length === need, `planned ${planned}, n ${n}: kept ${l.slots.length} slots, wanted ${need}`);
    const sortedAll = [...chosenBefore].sort((a, b) => W.slotAt(l.cycle, a) - W.slotAt(l.cycle, b));
    claim(l.slots.join() === sortedAll.slice(0, need).join(), `planned ${planned}, n ${n}: kept ${l.slots.join()} and not the earliest ${sortedAll.slice(0, need).join()}`);
    for (let i = 1; i < l.rounds.length; i++) claim(l.rounds[i].at > l.rounds[i - 1].at, `planned ${planned}, n ${n}: round ${i} is not after round ${i - 1}`);
    // no slot sits before the kickoff or after the final
    claim(l.rounds.slice(1, -1).every(r => r.at > l.cycle.kickoff && r.at < l.cycle.final), `planned ${planned}, n ${n}: a round outside the weekend`);
  }
}

/* 3. the open league */
{
  const open = W.createLeague({ id: 'O', kind: 'open', name: '', opener: 'game', nick: '', slots: [], seed: 3 }, T0);
  if (typeof open === 'string') throw new Error(open);
  claim(W.capacity(open) === W.OPEN_MEMBERS && open.planned === W.OPEN_MEMBERS, 'the open league is not for six');
  for (let i = 0; i < W.OPEN_MEMBERS; i++) claim(W.join(open, `o-${i}`, `זר ${i}`, T0 + i) === null, `stranger ${i} could not join the open league`);
  claim(W.join(open, 'o-x', 'שביעי', T0) === 'הליגה מלאה', 'a seventh got into the open league');
  W.lock(open, open.cycle.locks);
  claim(open.rounds.length === 5 && open.rounds.map(r => r.key).join() === [W.KICKOFF_KEY, ...W.OPEN_SLOTS, W.FINAL_KEY].join(), `the open league's rounds are ${open.rounds.map(r => r.key).join()}`);
  claim(W.OPEN_SLOTS.length === W.slotsNeeded(W.OPEN_MEMBERS), 'OPEN_SLOTS does not fit six');
}

/* 4. a size off the range, slots that do not fit the size */
{
  const mk = (size: number, slots: string[]) => W.createLeague({ id: 'X', kind: 'friend', name: 'ליגה', opener: 'd', nick: 'איציק', slots, seed: 5, size }, T0);
  claim(typeof mk(5, NINE.slice(0, 3)) === 'string', 'a league of five was made');
  claim(typeof mk(13, NINE) === 'string', 'a league of thirteen was made');
  claim(typeof mk(8, NINE.slice(0, 4)) === 'string', 'eight with four slots was made (needs five)');
  claim(typeof mk(8, NINE.slice(0, 6)) === 'string', 'eight with six slots was made (needs five)');
  claim(typeof mk(9, NINE.slice(0, 7)) !== 'string', 'nine with seven slots was refused');
  claim(typeof mk(7, NINE.slice(0, 5)) !== 'string', 'seven with five slots was refused');
  claim(W.slotsProblem(7, NINE.slice(0, 4)) !== null && W.slotsProblem(7, NINE.slice(0, 5)) === null, 'slotsProblem does not count N-2 for an odd league');
  // the worker: the size goes in and is checked by the core, and the lobby's own slot range follows slotsNeeded
  const worker = readFileSync('worker/src/weekend.ts', 'utf8');
  claim(/size/.test(worker) && /W\.slotsNeeded\(W\.MIN_MEMBERS\)/.test(worker) && /W\.slotsNeeded\(W\.MAX_MEMBERS\)/.test(worker), 'the worker does not pass the planned size through');
  const client = readFileSync('src/game/weekend.ts', 'utf8');
  claim(/create: \(b: \{ nick: string; name: string; slots: string\[\]; size: number;/.test(client), 'the client does not send the planned size');
  const ui = readFileSync('src/ui/weekend/Weekend.tsx', 'utf8');
  claim(/WeekendApi\.create\(\{ nick, name, slots, size,/.test(ui), 'the create screen does not send the size it shows');
}

console.log(`${checked} checks`);
if (fails.length) { console.log(`FAIL (${fails.length} of ${checked})`); for (const f of fails.slice(0, 40)) console.log('  - ' + f); process.exit(1); }
console.log('OK, a league holds what was planned, every size plays every pair exactly once, the odd ones rest once each, and the slots cut are the latest');
