/**
 * The two-manager match (the weekend league, phase 1): the engine runs on the
 * server's clock, two managers choose, and the same inputs give the same match.
 *
 * Two simulated managers play a hundred matches through the core with a stepped
 * clock: they poll, they come late, they vanish for a while, they answer past the
 * deadline. What is proven:
 *   1. the same seed, squads and choices at the same times give the same match, byte for byte
 *   2. a manager who comes back and asks from 0 reads exactly the events a manager who never left read
 *   3. no goal without a decision: every goal sits on a minute a manager (or his assistant) chose
 *   4. a manager who never answers is played by his assistant and the match still ends
 *   5. the clock: minutes come 3 seconds apart, a moment freezes it for both, the break is 8 seconds
 *   6. both managers are asked: over the hundred, the moments split evenly between the two touchlines
 *   7. a penalty is asked of both: the taker's corner and the keeper's dive
 *   8. a choice is refused when it is not that manager's, not open, already made, or not an option
 *   9. the state survives storage: saved and reloaded mid match, it ends the same
 *  10. the career's own penalty is untouched: resolvePenalty still rolls the keeper's dive itself
 * Run: npm run check:duel
 */
import { readFileSync } from 'node:fs';
import * as D from '../src/game/duel.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };

/** the squads of a seed, made once: player ids come off a global counter, and the server's squads have fixed ids too */
const SIDES = new Map<number, ReturnType<typeof makeSides>>();
function sides(seed: number) {
  if (!SIDES.has(seed)) SIDES.set(seed, makeSides(seed));
  return structuredClone(SIDES.get(seed)!);
}
function makeSides(seed: number) {
  const rng = createRng(seed);
  const h = makeSquad(85, rng), a = makeSquad(85, rng);
  return {
    home: { id: 'h', name: 'בניין 7', starters: h.starters, bench: h.bench, tactic: { approach: 'balanced' as const, press: 'mid' as const, formation: '4-4-2' as const } },
    away: { id: 'a', name: 'הגבעה', starters: a.starters, bench: a.bench, tactic: { approach: 'attacking' as const, press: 'high' as const, formation: '4-3-3' as const } },
  };
}

interface Action { t: number; who: D.Who; choice: string }

/**
 * A manager with a temperament: how often he polls, how long he takes to answer,
 * and the stretches he is away. Everything is drawn from his own rng so a run
 * is repeatable.
 */
function manager(who: D.Who, seed: number) {
  const rng = createRng(seed);
  let awayUntil = 0;
  return {
    who,
    away(t: number): boolean {
      if (t < awayUntil) return true;
      if (rng() < 0.004) awayUntil = t + 5_000 + Math.floor(rng() * 40_000);   // vanishes for 5 to 45 seconds now and then
      return false;
    },
    /** how long he takes to answer this moment, sometimes past the 12 seconds */
    delay(): number { return Math.floor(rng() * 16_000); },
    pick(v: D.DecisionView): string {
      if (v.options) return v.options[Math.floor(rng() * v.options.length)].id;
      return v.corners![Math.floor(rng() * 3)];
    },
  };
}

/** play a match through the core with two simulated managers; returns the actions taken and what each read */
function play(seed: number, scripted?: Action[]) {
  const d = D.createDuel({ seed, ...sides(seed) }, 1_000_000);
  const mgrs = { home: manager('home', seed * 3 + 1), away: manager('away', seed * 3 + 2) };
  const actions: Action[] = [];
  const read: Record<D.Who, { events: unknown[]; next: number }> = { home: { events: [], next: 0 }, away: { events: [], next: 0 } };
  const due: Partial<Record<D.Who, { at: number; minute: number; choice: string }>> = {};
  let t = 1_000_000;
  let si = 0;
  for (let tick = 0; tick < 3_000 && !d.done; tick++) {
    t += 250;
    if (scripted) {
      while (si < scripted.length && scripted[si].t <= t) { D.choose(d, scripted[si].who, scripted[si].choice, scripted[si].t); si++; }
      D.advance(d, t);
      continue;
    }
    for (const who of ['home', 'away'] as D.Who[]) {
      const m = mgrs[who];
      if (m.away(t)) continue;
      const v = D.view(d, who, read[who].next, t);
      read[who].events.push(...v.events); read[who].next = v.next;
      if (v.decision && !due[who]) due[who] = { at: t + m.delay(), minute: v.decision.minute, choice: m.pick(v.decision) };
      const q = due[who];
      if (q && t >= q.at) {
        if (D.choose(d, who, q.choice, t)) actions.push({ t, who, choice: q.choice });
        delete due[who];
      }
      if (!v.decision && q && q.minute !== (d.decision?.minute ?? -1)) delete due[who];
    }
  }
  D.advance(d, t + 60_000);
  // the last look, after the whistle, from both touchlines
  for (const who of ['home', 'away'] as D.Who[]) {
    const v = D.view(d, who, read[who].next, t + 60_000);
    read[who].events.push(...v.events); read[who].next = v.next;
  }
  return { d, actions, read, endT: t };
}

/* 1 to 7: a hundred matches */
{
  let homeDec = 0, awayDec = 0, goals = 0, pens = 0, pensTwo = 0, autos = 0, matchesWithBoth = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const { d, actions, read } = play(seed);
    claim(d.done && d.st.minute >= 90, `seed ${seed}: the match did not end (minute ${d.st.minute}, done ${d.done})`);
    // 1. replay the same actions on a fresh duel
    const r = play(seed, actions);
    claim(D.serialize(r.d) === D.serialize(d), `seed ${seed}: the same choices at the same times gave a different match`);
    // 2. the full read equals the continuous read, from either touchline
    const full = D.view(d, 'home', 0, 10_000_000).events;
    for (const who of ['home', 'away'] as D.Who[]) {
      claim(JSON.stringify(read[who].events) === JSON.stringify(full), `seed ${seed}: ${who} read ${read[who].events.length} events in pieces, ${full.length} from 0`);
    }
    // 3. every goal sits on a decided minute
    for (const e of d.st.events) if (e.type === 'goal') {
      claim(d.log.some(l => l.minute === e.minute), `seed ${seed}: a goal in minute ${e.minute} with nobody asked`);
    }
    goals += d.st.score[0] + d.st.score[1];
    for (const l of d.log) { if (l.who === 'home') homeDec++; else awayDec++; if (l.auto) autos++; }
    const penMinutes = new Set(d.log.filter(l => l.kind === 'penalty' || l.kind === 'def_penalty').map(l => l.minute));
    for (const m of penMinutes) {
      pens++;
      const both = new Set(d.log.filter(l => l.minute === m && (l.kind === 'penalty' || l.kind === 'def_penalty')).map(l => l.who));
      if (both.size === 2) pensTwo++;
    }
    if (d.log.some(l => l.who === 'home') && d.log.some(l => l.who === 'away')) matchesWithBoth++;
  }
  const ratio = homeDec / Math.max(1, awayDec);
  claim(ratio > 0.8 && ratio < 1.25, `the moments split ${homeDec} home to ${awayDec} away over a hundred matches`);
  claim(pens > 10 && pensTwo === pens, `${pensTwo} of ${pens} penalties were asked of both managers`);
  claim(matchesWithBoth >= 95, `only ${matchesWithBoth} of 100 matches asked both managers something`);
  claim(autos > 0, 'no manager was ever late, the assistant was never needed');
  const avg = goals / 100;
  claim(avg > 1.5 && avg < 4.5, `${avg.toFixed(2)} goals a match`);
  console.log(`a hundred matches: ${avg.toFixed(2)} goals a match, ${homeDec} home and ${awayDec} away decisions, ${pens} penalties, ${autos} answered by the assistant`);
}

/* 4. nobody answers: the assistant plays both, the match ends, and ends when the clock says */
{
  const d = D.createDuel({ seed: 7, ...sides(7) }, 0);
  let t = 0;
  while (!d.done && t < 3_600_000) { t += 500; D.advance(d, t); }
  claim(d.done, 'with nobody answering the match never ended');
  claim(d.log.length > 0 && d.log.every(l => l.auto), 'with nobody answering a choice was not the assistant\'s');
  // 5. the clock: 90 + added minutes at 3 seconds, every moment a full 12, the break 8
  const moments = new Set(d.log.map(l => l.minute)).size;
  const expectEnd = (90 + d.st.addedTime) * D.MINUTE_MS + moments * D.DECISION_MS + D.HALF_MS;
  claim(Math.abs(t - expectEnd) <= 500, `the match ended at ${t}ms, the clock says ${expectEnd}ms (${moments} moments, +${d.st.addedTime})`);
}

/* 5. the clock when a manager answers early: only his thinking time is frozen */
{
  const d = D.createDuel({ seed: 11, ...sides(11) }, 0);
  let t = 0, firstDeadline = 0;
  while (!d.decision && t < 600_000) { t += 250; D.advance(d, t); }
  claim(!!d.decision, 'seed 11 raised no moment in the first ten minutes of clock');
  if (d.decision) {
    firstDeadline = d.decision.deadlineAt;
    const frozenAt = d.decision.frozenAt;
    claim(frozenAt === d.startedAt + d.st.minute * D.MINUTE_MS, `the first moment froze at ${frozenAt}, minute ${d.st.minute} is at ${d.st.minute * D.MINUTE_MS}`);
    const who = d.decision.deciders[0];
    const v = D.view(d, who, 0, frozenAt + 4_000);
    claim(!!v.decision && v.decision.deadlineAt === firstDeadline, 'the decider does not see his moment with the deadline');
    const vo = D.view(d, D.other(who), 0, frozenAt + 4_000);
    claim(d.decision.deciders.length === 2 ? !!vo.decision : (!vo.decision && vo.waiting?.who === who), 'the other manager sees neither his own moment nor who he waits for');
    const ok = D.choose(d, who, v.decision!.corners ? 'left' : v.decision!.options![0].id, frozenAt + 4_000);
    claim(ok, 'a valid early choice was refused');
    if (d.decision && d.decision.deciders.length === 2) {
      const w2 = d.decision.deciders.find(w => d.decision!.choices[w] === undefined)!;
      D.choose(d, w2, 'right', frozenAt + 5_000);
      claim(d.frozenMs === 5_000, `a penalty answered at 4 and 5 seconds froze ${d.frozenMs}ms, wanted 5000`);
    } else {
      claim(d.frozenMs === 4_000, `a moment answered after 4 seconds froze ${d.frozenMs}ms, wanted 4000`);
    }
  }
}

/* 8. refusals */
{
  const d = D.createDuel({ seed: 23, ...sides(23) }, 0);
  let t = 0;
  claim(!D.choose(d, 'home', 'left', 0), 'a choice with no moment open was taken');
  while (!d.decision && t < 600_000) { t += 250; D.advance(d, t); }
  if (d.decision) {
    const who = d.decision.deciders[0];
    const wrong = d.decision.deciders.length === 2 ? null : D.other(who);
    if (wrong) claim(!D.choose(d, wrong, 'left', t), 'the other manager\'s choice was taken on a moment that is not his');
    claim(!D.choose(d, who, 'sideways', t), 'a choice that is not a corner or an option was taken');
    const v = D.view(d, who, 0, t);
    const good = v.decision!.corners ? 'center' : v.decision!.options![0].id;
    claim(D.choose(d, who, good, t), 'a valid choice was refused');
    claim(!D.choose(d, who, good, t), 'a second choice on the same moment was taken');
  }
}

/* 9. storage: saved and reloaded mid match, the rest plays the same */
{
  const a = D.createDuel({ seed: 31, ...sides(31) }, 0);
  let t = 0;
  while (a.st.minute < 40) { t += 250; D.advance(a, t); }
  const b = D.deserialize(D.serialize(a));
  claim(D.serialize(b) === D.serialize(a), 'the state changed through storage');
  while (!a.done) { t += 250; D.advance(a, t); D.advance(b, t); }
  claim(D.serialize(b) === D.serialize(a), 'the reloaded match ended differently');
  claim(b.st.events.length === a.st.events.length && b.st.score.join() === a.st.score.join(), 'the reloaded match has another score');
}

/* 10. the career's own penalty is untouched, and the duel's two are in */
{
  const src = readFileSync('src/game/liveMatch.ts', 'utf8');
  const pen = src.slice(src.indexOf('export function resolvePenalty('), src.indexOf('export type OneOnOneChoice'));
  claim(pen.includes('actualDive(st, m.keeperDir!)'), 'resolvePenalty no longer rolls the keeper\'s dive itself');
  claim(src.includes('export function resolvePenaltyDuel(') && src.includes('export function resolveDefPenaltyDuel('), 'the two-manager penalties are missing from the engine');
  const duel = readFileSync('src/game/duel.ts', 'utf8');
  claim(duel.includes("return minute % 2 === 1 ? 'home' : 'away'"), 'the perspective no longer alternates by minute');
  claim(!/Math\.random/.test(duel), 'the server rolls Math.random');
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('OK, two managers on one clock: the same choices give the same match, nobody waits for anyone, and every goal was decided by someone');
