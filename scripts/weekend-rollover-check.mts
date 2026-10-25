/**
 * The weekend league's calendar at its seams (Itzik, 25.10), with the clock passed in, no server:
 *
 *   1. the first weekend ever: registration opens on Thursday 29.10 20:00 Israel (18:00Z) for the 5–8.11 weekend,
 *      and that cycle keeps one `opens` from the Thursday to its final, through Sunday 1.11 20:00
 *   2. before the Thursday nothing can be made or joined, from 18:00:00Z it can; no league at all in the 25.10 cycle
 *   3. it does not leak: sixty ordinary cycles from 8.11.2026, across both clock changes, are the regular calendar
 *   4. the clock change of 25.10 (summer to winter): 19:59 is the 18.10 cycle, 169 hours long
 *   5. the lobby at the seam: a device of the ending cycle keeps its league as `last` for a week, can join the new
 *      cycle without a 409, and nobody is swept on 1.11 20:00
 *   6. the league after Sunday 20:00: the final round, its results, the settle, a champion and a prize
 *   7. the title screen: the teaser until LAUNCH_AT, the entrance from it, never both, never neither
 *   8. the words: "חמישי 5.11 17:00" on the Thursday it opens
 * Run: npm run check:rollover
 */
import * as W from '../src/game/weekendCore.ts';
import { TEASER_OPENS_AT, teaserShown } from '../src/game/teaser.ts';
import { LAUNCH_AT, gateOpen, rootDecision } from '../src/game/weekend.ts';
import { ilWhen } from '../src/game/weekendGuide.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };
const Z = (y: number, m: number, d: number, hh: number, mm = 0) => Date.UTC(y, m - 1, d, hh, mm);
const il = (t: number) => W.ilParts(t);
const H = 3_600_000;

/* 1. the first weekend ever */
{
  claim(W.FIRST_REGISTRATION_OPENS_AT === Z(2026, 10, 29, 18), 'the first registration is not 29.10 18:00Z');
  claim(il(W.FIRST_REGISTRATION_OPENS_AT).dow === 4 && il(W.FIRST_REGISTRATION_OPENS_AT).hh === 20, 'the first registration is not Thursday 20:00 Israel');
  const at = (t: number) => W.cycleOf(t);
  const first = at(Z(2026, 10, 29, 18));
  claim(first.opens === Z(2026, 10, 29, 18) && first.locks === Z(2026, 11, 5, 15) && first.kickoff === Z(2026, 11, 5, 18) && first.final === Z(2026, 11, 8, 18), `the first cycle is ${JSON.stringify(first)}`);
  claim(W.cyclePhase(first, Z(2026, 10, 29, 18)) === 'open', 'the first cycle is not open on the Thursday');
  claim(W.isFirstCycle(first), 'isFirstCycle is false on the first cycle');
  // the same cycle, same opens, all the way to the final, including Sunday 1.11 20:00 and after
  for (const t of [Z(2026, 10, 29, 18), Z(2026, 10, 31, 12), Z(2026, 11, 1, 17, 59), Z(2026, 11, 1, 18), Z(2026, 11, 1, 18, 1), Z(2026, 11, 3, 9), Z(2026, 11, 5, 14, 59), Z(2026, 11, 5, 15), Z(2026, 11, 5, 18), Z(2026, 11, 7, 12), Z(2026, 11, 8, 17, 59)]) {
    const c = at(t);
    claim(c.opens === first.opens && c.final === first.final && c.locks === first.locks, `at ${new Date(t).toISOString()} the cycle is ${JSON.stringify(c)}`);
  }
  claim(W.cyclePhase(at(Z(2026, 11, 1, 18)), Z(2026, 11, 1, 18)) === 'open', 'Sunday 1.11 20:00 is not still open');
  claim(W.cyclePhase(at(Z(2026, 11, 5, 15)), Z(2026, 11, 5, 15)) === 'locked', 'Thursday 5.11 17:00 is not locked');
  claim(W.cyclePhase(at(Z(2026, 11, 5, 18)), Z(2026, 11, 5, 18)) === 'playing', 'Thursday 5.11 20:00 is not playing');
  // the slots of the first cycle fall on 6, 7 and 8.11
  claim(il(W.slotAt(first, 'fri-12')).d === 6 && il(W.slotAt(first, 'sat-20')).d === 7 && il(W.slotAt(first, 'sun-18')).d === 8, 'the first cycle\'s slots are on the wrong days');
  claim(W.weekendSpan(first) === '5–8.11', `the span reads ${W.weekendSpan(first)}`);
}

/* 2. the gate */
{
  const mk = (t: number) => W.createLeague({ id: 'G', kind: 'friend', name: 'ליגת בניין 7', opener: 'd0', nick: 'איציק', slots: ['fri-12', 'fri-14', 'sat-20'], seed: 1, size: 6 }, t);
  claim(typeof mk(Z(2026, 10, 29, 17, 59)) === 'string', 'a league was made at 29.10 17:59Z');
  claim(typeof mk(Z(2026, 10, 29, 17, 59) + 59_999) === 'string', 'a league was made at 29.10 17:59:59Z');
  claim(mk(Z(2026, 10, 29, 17, 59)) === 'ההרשמה נפתחת בחמישי 29.10 ב-20:00', `the gate says: ${mk(Z(2026, 10, 29, 17, 59))}`);
  claim(W.registrationGate(Z(2026, 10, 26, 10)) === 'ההרשמה נפתחת בחמישי 29.10 ב-20:00' && W.registrationGate(Z(2026, 10, 29, 18)) === null, 'registrationGate is wrong');
  const made = mk(Z(2026, 10, 29, 18));
  claim(typeof made !== 'string', `no league at 29.10 18:00:00Z: ${made}`);
  if (typeof made !== 'string') {
    claim(made.cycle.final === Z(2026, 11, 8, 18) && made.planned === 6, 'the league made on the Thursday is not the 5–8.11 weekend');
    claim(W.join(made, 'd1', 'דודו', Z(2026, 10, 29, 18)) === null, 'nobody can join on the Thursday');
    claim(W.join(made, 'd2', 'רועי', Z(2026, 11, 1, 18, 30)) === null, 'nobody can join on Sunday 1.11 after 20:00');
    claim(W.join(made, 'd3', 'יוסי', Z(2026, 11, 5, 15)) !== null, 'joining after the lock of 5.11 was allowed');
    // nothing at all in the 25.10 cycle: every instant of it is gated or belongs to the first cycle
    for (const t of [Z(2026, 10, 25, 18), Z(2026, 10, 27, 12), Z(2026, 10, 29, 14), Z(2026, 10, 29, 17, 59)]) claim(typeof mk(t) === 'string', `a league could be made in the 25.10 cycle at ${new Date(t).toISOString()}`);
    const open = W.createLeague({ id: 'O', kind: 'open', name: '', opener: 'game', nick: '', slots: [], seed: 2 }, Z(2026, 10, 29, 17));
    claim(typeof open === 'string', 'the open league opened before the Thursday');
    const open2 = W.createLeague({ id: 'O', kind: 'open', name: '', opener: 'game', nick: '', slots: [], seed: 2 }, Z(2026, 10, 29, 18));
    claim(typeof open2 !== 'string' && open2.planned === W.OPEN_MEMBERS, 'the open league did not open on the Thursday');
    // a join into a league of the first cycle is refused before the Thursday (the gate sits in join too)
    const early = { ...made, members: [] } as W.League;
    claim(W.join(early, 'd9', 'אבי', Z(2026, 10, 29, 17)) !== null, 'join is not gated');
  }
}

/* 3. no leak: sixty regular cycles from 8.11.2026, across both clock changes */
{
  let t = Z(2026, 11, 8, 18);   // Sunday 8.11 20:00 Israel
  let seen = 0;
  for (let i = 0; i < 60; i++) {
    const c = W.cycleOf(t + 60_000);
    const r = W.regularCycleOf(t + 60_000);
    claim(JSON.stringify(c) === JSON.stringify(r), `cycle ${i} from ${new Date(t).toISOString()} differs from the regular calendar`);
    claim(!W.isFirstCycle(c), `cycle ${i} claims to be the first`);
    const o = il(c.opens), l = il(c.locks), k = il(c.kickoff), f = il(c.final);
    claim(o.dow === 0 && o.hh === 20 && o.mm === 0, `cycle ${i} opens ${JSON.stringify(o)}`);
    claim(l.dow === 4 && l.hh === 17 && k.dow === 4 && k.hh === 20 && f.dow === 0 && f.hh === 20, `cycle ${i} locks/kickoff/final wrong`);
    claim(c.opens === t, `cycle ${i} does not open where the last one ended`);
    seen++;
    t = c.final;
  }
  claim(seen === 60, 'sixty cycles were not walked');
  // the spring change of 2027 (26.3, the Friday before the last Sunday) and the autumn one (31.10.2027) are inside the walk
  const spring = W.cycleOf(Z(2027, 3, 28, 18));   // Sunday 28.3.2027 21:00 Israel, summer time since the Friday
  claim(spring.opens === Z(2027, 3, 28, 17) && spring.locks === Z(2027, 4, 1, 14), `the cycle of 28.3.2027 (summer time, UTC+3) is ${JSON.stringify(spring)}`);
  const beforeSpring = W.cycleOf(Z(2027, 3, 28, 12));   // the same Sunday at 15:00 Israel: still last week's cycle, which opened in winter time
  claim(beforeSpring.opens === Z(2027, 3, 21, 18) && beforeSpring.final === Z(2027, 3, 28, 17), `the cycle across the spring change is ${JSON.stringify(beforeSpring)}`);
  claim((beforeSpring.final - beforeSpring.opens) / H === 167, `the cycle across the spring change is ${(beforeSpring.final - beforeSpring.opens) / H} hours, wanted 167`);
  const autumn = W.cycleOf(Z(2027, 10, 31, 20));
  claim(autumn.opens === Z(2027, 10, 31, 18), `the cycle of 31.10.2027 (winter time) opens at ${new Date(autumn.opens).toISOString()}`);
  claim(t >= Z(2027, 12, 1, 0), `the walk ended at ${new Date(t).toISOString()}, before December 2027`);
}

/* 4. the clock change of 25.10.2026 */
{
  const c = W.cycleOf(Z(2026, 10, 25, 17, 59));   // Sunday 25.10 19:59 Israel (winter time already, since 02:00 that night)
  claim(c.opens === Z(2026, 10, 18, 17), `Sunday 25.10 19:59 is not in the 18.10 cycle (opens ${new Date(c.opens).toISOString()}, wanted 17:00Z, summer time)`);
  claim(c.final === Z(2026, 10, 25, 18), 'the 18.10 cycle does not end at 25.10 18:00Z');
  claim((c.final - c.opens) / H === 169, `the cycle across the change is ${(c.final - c.opens) / H} hours, wanted 169`);
  const next = W.cycleOf(Z(2026, 10, 25, 18));
  claim(next.opens === Z(2026, 10, 25, 18) && !W.isFirstCycle(next), 'Sunday 25.10 20:00 does not open the 25.10 cycle');
}

/* 5. the lobby at the seam */
{
  const first = W.cycleOf(Z(2026, 10, 29, 18));
  const s: W.LobbyCore = { codes: { ABCDEF: { id: 'L1', opens: first.opens } }, devices: { dev1: { id: 'L1', opens: first.opens, final: first.final }, dev2: { id: 'L1', opens: first.opens } }, open: [{ id: 'O1', opens: first.opens, count: 3 }], last: {} };
  // Sunday 1.11 20:00: nothing moves, the cycle is the same
  const c1 = W.cycleOf(Z(2026, 11, 1, 18));
  W.sweepLobby(s, c1, Z(2026, 11, 1, 18));
  claim(Object.keys(s.devices).length === 2 && Object.keys(s.codes).length === 1 && s.open.length === 1 && Object.keys(s.last).length === 0, 'the sweep of Sunday 1.11 20:00 forgot someone');
  claim(W.mineOf(s, 'dev1', c1, Z(2026, 11, 1, 18)).league === 'L1', 'on 1.11 20:00 dev1 lost his league');
  // Sunday 8.11 20:00: the cycle moves on, the league goes to last, the code and the open league are forgotten
  const t0 = Z(2026, 11, 8, 18);
  const c2 = W.cycleOf(t0);
  claim(c2.opens === t0 && !W.isFirstCycle(c2), 'Sunday 8.11 20:00 is not a fresh regular cycle');
  W.sweepLobby(s, c2, t0);
  claim(Object.keys(s.devices).length === 0 && Object.keys(s.codes).length === 0 && s.open.length === 0, 'the sweep of 8.11 kept the old cycle');
  claim(s.last.dev1?.id === 'L1' && s.last.dev1.final === first.final && s.last.dev2?.id === 'L1' && s.last.dev2.final === first.final, `last is ${JSON.stringify(s.last)}`);
  for (const t of [t0, t0 + 5 * 60_000, t0 + 3 * H, t0 + 6 * 86_400_000, first.final + W.KEEP_MS]) {
    const m = W.mineOf(s, 'dev1', W.cycleOf(t), t);
    claim(m.league === null && m.last === 'L1', `at final+${((t - t0) / H).toFixed(1)}h dev1 sees ${JSON.stringify(m)}`);
  }
  const gone = first.final + W.KEEP_MS + 1;
  W.sweepLobby(s, W.cycleOf(gone), gone);
  claim(W.mineOf(s, 'dev1', W.cycleOf(gone), gone).last === null && !s.last.dev1, 'last did not go away a week after the final');
  // the same device joins the new cycle: the lobby's "already in a league" test is on devices of this cycle only
  const s2: W.LobbyCore = { codes: {}, devices: {}, open: [], last: { dev1: { id: 'L1', final: first.final } } };
  claim(!s2.devices.dev1, 'a device in last is counted as in a league');
  s2.devices.dev1 = { id: 'L2', opens: c2.opens, final: c2.final };
  const m2 = W.mineOf(s2, 'dev1', c2, t0 + H);
  claim(m2.league === 'L2' && m2.last === 'L1', `after joining the new cycle dev1 sees ${JSON.stringify(m2)}`);
  // a record without final (written before 25.10) still finds its final
  const s3: W.LobbyCore = { codes: {}, devices: { old: { id: 'L0', opens: Z(2026, 10, 18, 17) } }, open: [], last: {} };
  W.sweepLobby(s3, W.cycleOf(Z(2026, 10, 25, 18)), Z(2026, 10, 25, 18));
  claim(s3.last.old?.final === Z(2026, 10, 25, 18), 'an old record without final was not given its cycle\'s final');
  // the root's decision on the phone
  claim(rootDecision({ league: 'L2', last: 'L1' }, null).kind === 'lobby' && rootDecision({ league: 'L2', last: 'L1' }, null).id === 'L2', 'a league this cycle does not open the lobby');
  const d1 = rootDecision({ league: null, last: 'L1' }, 'L1');
  claim(d1.kind === 'lobby' && d1.id === 'L1' && d1.last === true, `with last only the root decides ${JSON.stringify(d1)}`);
  const d2 = rootDecision({ league: null, last: 'L1' }, null);
  claim(d2.kind === 'lobby' && d2.id === 'L1' && d2.last === true, 'last with no local id does not show the last league');
  claim(rootDecision({ league: null, last: null }, 'L9').kind === 'probe', 'a local id with nothing on the server is dropped without asking the league');
  claim(rootDecision({ league: null, last: null }, null).kind === 'home', 'nothing anywhere does not go home');
}

/* 6. the league after Sunday 20:00: the final round still happens, with the clock in the next cycle */
{
  const T = Z(2026, 10, 29, 18);
  const l = W.createLeague({ id: 'F', kind: 'friend', name: 'ליגת הגמר', opener: 'd0', nick: 'איציק', slots: ['fri-12', 'fri-14', 'sat-20'], seed: 77, size: 6 }, T);
  if (typeof l === 'string') throw new Error(l);
  for (let i = 1; i < 6; i++) W.join(l, `d${i}`, `חבר ${i}`, T + i);
  W.lock(l, l.cycle.locks);
  claim(l.status === 'locked' && l.rounds.length === 5 && l.rounds[4].key === W.FINAL_KEY && l.rounds[4].at === l.cycle.final, 'the final round is not at Sunday 20:00');
  const finalAt = l.rounds[4].at;
  claim(W.cycleOf(finalAt).opens !== l.cycle.opens, 'the clock at the final is still this cycle (it should be the next one)');
  claim(W.dueRound(l, finalAt + W.READY_MS) === l.rounds[0], 'the first due round is not the kickoff');
  // every round is played, the final one with the clock in the next cycle
  const res = (h: number) => ({ score: [h, 0] as [number, number], shootout: null, winner: 'home' as const, chose: { home: 3, away: 3 }, decisions: 6 });
  for (const r of l.rounds) for (const m of r.matches) { m.matchId = `m-${r.index}`; W.recordResult(l, r, m, res(2)); }
  claim(l.rounds.every(r => r.matches.every(m => m.result)), 'the results did not all go in');
  const prizes = W.settle(l, {});
  claim(l.status === 'done' && prizes.length === 6 && prizes[0].place === 1 && prizes[0].wageRounds === 1.5 && prizes[0].gems === 3, 'the settle after the final did not crown a champion with the prize');
  claim(W.standings(l)[0].device === prizes[0].device, 'the champion is not the top of the table');
}

/* 7. the title screen: the teaser until LAUNCH_AT, the entrance from it */
{
  claim(TEASER_OPENS_AT === W.FIRST_REGISTRATION_OPENS_AT && LAUNCH_AT === W.FIRST_REGISTRATION_OPENS_AT, 'the teaser, the first registration and the launch are not one instant');
  const url = 'https://example.workers.dev';
  for (const t of [LAUNCH_AT - 86_400_000, LAUNCH_AT - 1]) {
    claim(teaserShown(t) && !gateOpen(t, true, url), `before the launch at ${new Date(t).toISOString()}: teaser ${teaserShown(t)}, entrance ${gateOpen(t, true, url)}`);
  }
  for (const t of [LAUNCH_AT, LAUNCH_AT + 1, LAUNCH_AT + 86_400_000]) {
    claim(!teaserShown(t) && gateOpen(t, true, url), `from the launch at ${new Date(t).toISOString()}: teaser ${teaserShown(t)}, entrance ${gateOpen(t, true, url)}`);
  }
  claim(!gateOpen(LAUNCH_AT + 1, false, url), 'with WEEKEND_LIVE false the entrance opened');
  claim(!gateOpen(LAUNCH_AT + 1, true, ''), 'with no server address the entrance opened');
  // the title shows the entrance when it is given one, else the teaser: never both
  const title = readFileSync('src/ui/screens/Title.tsx', 'utf8');
  claim(/\{extra \?\? <LeagueTeaser \/>\}/.test(title), 'the title screen does not show either the entrance or the teaser (one of them, never both)');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  claim(/weekendOn\(wkNow\)/.test(app) && !/WEEKEND_ON\b/.test(app), 'App.tsx still reads the module-level WEEKEND_ON instead of weekendOn(wkNow)');
  const wk = readFileSync('src/game/weekend.ts', 'utf8');
  claim(/export const LAUNCH_AT = FIRST_REGISTRATION_OPENS_AT;/.test(wk), 'LAUNCH_AT is not the first registration');
  // the worker asks the same gate as the core
  const worker = readFileSync('worker/src/weekend.ts', 'utf8');
  claim(/W\.registrationGate\(now\)/.test(worker), 'the worker does not ask the core\'s registration gate');
  claim(/W\.sweepLobby\(/.test(worker) && /W\.mineOf\(/.test(worker), 'the worker does not use the core\'s sweepLobby and mineOf');
  // the prize: the token is kept and handed back again to the same device, and without a secret there is a 500
  claim(/claimed\[dev\]\s*=\s*\{\s*at:\s*now,\s*token/.test(worker) || /claimed\[dev\] = \{ at: now, token/.test(worker), 'the prize token is not kept with the claim');
  claim(/if \(!secret\) return bad\('no secret', 500\);/.test(worker), 'a missing PRIZE_SECRET does not answer 500');
  claim(/\(debug \? 'debug-secret' : ''\)/.test(worker), 'the debug secret is not confined to DEBUG');
}

/* 8. the words */
{
  const thu = Z(2026, 10, 29, 18);
  const c = W.cycleOf(thu);
  claim(ilWhen(c.locks, thu) === 'חמישי 5.11 17:00', `on the Thursday the lock reads "${ilWhen(c.locks, thu)}"`);
  claim(ilWhen(c.kickoff, thu) === 'חמישי 5.11 20:00', `on the Thursday the kickoff reads "${ilWhen(c.kickoff, thu)}"`);
  claim(W.ilDayDate(W.FIRST_REGISTRATION_OPENS_AT) === 'חמישי 29.10' && W.ilTime(W.FIRST_REGISTRATION_OPENS_AT) === '20:00', 'the first registration\'s own words are wrong');
}

console.log(`${checked} checks`);
if (fails.length) { console.log(`FAIL (${fails.length} of ${checked})`); for (const f of fails.slice(0, 40)) console.log('  - ' + f); process.exit(1); }
console.log('OK, the first registration opens on Thursday 29.10 20:00 for 5–8.11 and nothing leaks past 8.11, a league survives Sunday 20:00 as last, and the teaser hands over to the entrance at one instant');
