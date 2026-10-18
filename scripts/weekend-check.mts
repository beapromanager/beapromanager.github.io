/**
 * The weekend league's rules (WEEKEND.md), walked without a server.
 *
 *   1. the calendar: Sunday 20:00 to Sunday 20:00 Israel time, Thursday 17:00 lock, Thursday 20:00 kickoff, Sunday 20:00 final, through summer and winter time
 *   2. the slots: a league of N needs exactly N-3, every key on the grid, none twice; the open league's four are fixed
 *   3. a league: created only while open, joined by code up to twelve, nick rules, a friend league of five is cancelled at the lock
 *   4. the lock: eighteen men each at an average of 85 (give or take half), ids never shared, the eleven first with a keeper
 *   5. the rounds: every pair once, N-1 rounds on the chosen slots in time order, kickoff first and final last, a bye when odd
 *   6. results: no draws, the assistant's third match is 0:3, wins count packs every three
 *   7. the table: points, goal difference, goals for, head to head
 *   8. the pack: a man of 90 at the chosen place, in for the weakest at that place, the squad stays eighteen, no second opening
 *   9. the prize: 1.5 / 0.75 / 0.5, 0.25 and a gem for finishing yourself, nothing for a man the assistant carried, less for a champion again
 *  10. penalties on a draw in the duel: both decide every kick, five each then sudden death, a winner always
 * Run: npm run check:weekend
 */
import * as W from '../src/game/weekendCore.ts';
import * as D from '../src/game/duel.ts';
import { overall } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };

/* 1. the calendar */
{
  // a Tuesday in October 2026 (winter time from 25.10; this one is still summer time, UTC+3)
  const tue = Date.UTC(2026, 9, 20, 9, 0);   // 12:00 Israel
  const c = W.cycleOf(tue);
  const p = (t: number) => W.ilParts(t);
  claim(p(c.opens).dow === 0 && p(c.opens).hh === 20 && p(c.opens).d === 18, `opens on ${JSON.stringify(p(c.opens))}, wanted Sunday 18.10 20:00`);
  claim(p(c.locks).dow === 4 && p(c.locks).hh === 17 && p(c.locks).d === 22, `locks on ${JSON.stringify(p(c.locks))}`);
  claim(p(c.kickoff).dow === 4 && p(c.kickoff).hh === 20, `kickoff on ${JSON.stringify(p(c.kickoff))}`);
  claim(p(c.final).dow === 0 && p(c.final).hh === 20 && p(c.final).d === 25, `final on ${JSON.stringify(p(c.final))}`);
  claim(c.final - c.opens === 7 * 86_400_000 + 3_600_000, `the cycle is ${(c.final - c.opens) / 3_600_000} hours; the clocks go back on 25.10 so it is 169`);
  claim(W.cyclePhase(c, tue) === 'open' && W.cyclePhase(c, c.locks) === 'locked' && W.cyclePhase(c, c.kickoff) === 'playing', 'the phases are wrong');
  // Sunday 19:59 belongs to the weekend that is ending; Sunday 20:01 opens the next
  const sun1959 = W.ilAt(2026, 10, 25, 19, 59), sun2001 = W.ilAt(2026, 10, 25, 20, 1);
  claim(W.cycleOf(sun1959).final === c.final, 'Sunday 19:59 is not in the ending weekend');
  claim(W.cycleOf(sun2001).opens === c.final, 'Sunday 20:01 does not open the next weekend');
  // the slots fall on their days at their hours, in the cycle that crosses the clock change
  for (const s of W.SLOT_GRID) {
    const t = W.slotAt(c, s.key), q = p(t);
    const dow = { fri: 5, sat: 6, sun: 0 }[s.day];
    claim(q.dow === dow && q.hh === s.hh && q.mm === 0, `slot ${s.key} falls on ${JSON.stringify(q)}`);
  }
  claim(W.slotAt(c, 'sun-18') < c.final && W.slotAt(c, 'fri-10') > c.kickoff, 'the grid is not between kickoff and final');
  // summer: a July weekend
  const jul = W.cycleOf(Date.UTC(2026, 6, 14, 9));
  claim(p(jul.kickoff).hh === 20 && p(jul.final).hh === 20 && jul.final - jul.opens === 7 * 86_400_000, 'a summer cycle is not a plain week');
}

/* 2. the slots */
{
  claim(W.slotsNeeded(6) === 3 && W.slotsNeeded(10) === 7 && W.slotsNeeded(12) === 9, 'N-3 is wrong');
  claim(W.slotsProblem(10, ['fri-10', 'fri-12', 'fri-14', 'sat-20', 'sat-22', 'sun-10', 'sun-18']) === null, 'a right choice of seven was refused');
  claim(W.slotsProblem(10, ['fri-10', 'fri-12', 'fri-14', 'sat-20', 'sat-22']) !== null, 'five slots for ten were allowed');
  claim(W.slotsProblem(6, ['fri-10', 'fri-12', 'fri-14', 'sat-20']) !== null, 'four slots for six were allowed');
  claim(W.slotsProblem(6, ['fri-10', 'fri-10', 'fri-14']) !== null, 'a slot twice was allowed');
  claim(W.slotsProblem(6, ['fri-10', 'fri-18', 'fri-14']) !== null, 'a slot off the grid was allowed');
  claim(W.OPEN_SLOTS.length === W.slotsNeeded(W.OPEN_MEMBERS) && W.OPEN_SLOTS.every(k => W.slotByKey(k)), 'the open league\'s slots do not fit six');
  claim(!W.SLOT_GRID.some(s => s.key === 'fri-18'), 'Friday 18:00 is on the grid');
  claim(W.SLOT_GRID.length === 15, `the grid has ${W.SLOT_GRID.length} slots`);
}

/* 3 to 9. a league of ten, start to finish */
const T0 = Date.UTC(2026, 9, 20, 9, 0);   // Tuesday noon Israel
function tenLeague(n = 10) {
  const made = W.createLeague({ id: 'L1', kind: 'friend', name: 'ליגת בניין 7', opener: 'dev-0', nick: 'איציק', slots: ['fri-10', 'fri-12', 'fri-14', 'sat-20', 'sat-22', 'sun-10', 'sun-18'], seed: 4242 }, T0);
  if (typeof made === 'string') throw new Error(made);
  for (let i = 1; i < n; i++) { const e = W.join(made, `dev-${i}`, `חבר ${i}`, T0 + i * 60_000); if (e) throw new Error(e); }
  return made;
}
{
  const l = tenLeague();
  claim(l.code.length === 6 && /^[A-Z2-9]+$/.test(l.code), `the code is ${l.code}`);
  claim(l.members.length === 10 && l.members[0].nick === 'איציק', 'the opener is not the first member');
  claim(W.join(l, 'dev-3', 'אחר', T0) === null && l.members.length === 10, 'joining twice made two members');
  claim(W.join(l, 'dev-x', 'חבר 3', T0) !== null, 'a taken nick was allowed');
  claim(W.join(l, 'dev-y', 'א', T0) !== null && W.join(l, 'dev-y', 'שם ארוך מאוד מאוד', T0) !== null, 'a bad nick was allowed');
  claim(W.join(l, 'dev-y', 'היטלר', T0) !== null, 'a filtered nick was allowed');
  claim(W.join(l, 'dev-y', 'חבר 99', l.cycle.locks + 1) !== null, 'joining after the lock was allowed');
  const twelve = tenLeague(12);
  claim(W.join(twelve, 'dev-13', 'עוד אחד', T0) !== null, 'a thirteenth got in');
  claim(typeof W.createLeague({ id: 'L2', kind: 'friend', name: 'x', opener: 'd', nick: 'איציק', slots: [], seed: 1 }, l.cycle.locks + 1) === 'string', 'a league was created after the lock');
  claim(typeof W.createLeague({ id: 'L3', kind: 'friend', name: 'בסדר', opener: 'd', nick: 'איציק', slots: ['fri-18'], seed: 1 }, T0) === 'string', 'a league with a slot off the grid was created');
  // five at the lock: cancelled
  const five = tenLeague(5);
  W.lock(five, five.cycle.locks);
  claim(five.status === 'cancelled', 'a league of five was not cancelled at the lock');
  // the open league
  const open = W.createLeague({ id: 'O1', kind: 'open', name: '', opener: 'game', nick: '', slots: [], seed: 7 }, T0);
  claim(typeof open !== 'string' && open.members.length === 0 && open.slots.join() === W.OPEN_SLOTS.join() && open.name === 'הליגה הפתוחה', 'the open league is not made right');
  if (typeof open !== 'string') {
    for (let i = 0; i < 6; i++) W.join(open, `o-${i}`, `זר ${i}`, T0);
    claim(W.join(open, 'o-7', 'שביעי', T0) !== null, 'a seventh got into the open league');
    W.lock(open, open.cycle.locks);
    claim(open.status === 'locked' && open.rounds.length === 5, `the open league has ${open.rounds.length} rounds`);
    claim(open.rounds.map(r => r.key).join() === 'thu-20,fri-12,fri-14,sat-20,sun-20', `the open league's rounds are ${open.rounds.map(r => r.key).join()}`);
  }
}

/* 4 and 5. the lock */
{
  const l = tenLeague();
  W.lock(l, l.cycle.locks);
  claim(l.status === 'locked', 'ten did not lock');
  const ids = new Set<string>();
  for (const m of l.members) {
    claim(!!m.squad && m.squad.length === W.SQUAD_SIZE, `${m.nick} has ${m.squad?.length} men`);
    const avg = W.squadAvg(m.squad!);
    claim(Math.abs(avg - W.SQUAD_AVG) <= 0.5, `${m.nick}'s squad averages ${avg.toFixed(2)}`);
    claim(W.starters(m).length === 11 && W.starters(m).some(p => p.position === 'GK'), `${m.nick}'s eleven has no keeper`);
    for (const p of m.squad!) { claim(!ids.has(p.id), `player id ${p.id} is shared`); ids.add(p.id); }
  }
  claim(l.rounds.length === 9, `ten managers got ${l.rounds.length} rounds`);
  claim(l.rounds[0].key === W.KICKOFF_KEY && l.rounds[8].key === W.FINAL_KEY, 'kickoff and final are not first and last');
  for (let i = 1; i < l.rounds.length; i++) claim(l.rounds[i].at > l.rounds[i - 1].at, `round ${i} is not after round ${i - 1}`);
  const pairs = new Set<string>();
  for (const r of l.rounds) {
    claim(r.matches.length === 5 && r.bye === null, `round ${r.index} has ${r.matches.length} matches`);
    const seen = new Set<string>();
    for (const m of r.matches) {
      claim(!seen.has(m.home) && !seen.has(m.away), `round ${r.index}: a manager plays twice`);
      seen.add(m.home); seen.add(m.away);
      const key = [m.home, m.away].sort().join('|');
      claim(!pairs.has(key), `the pair ${key} meets twice`);
      pairs.add(key);
    }
  }
  claim(pairs.size === 45, `${pairs.size} pairs for ten, wanted 45`);
  // odd: seven managers, six rounds, a bye each round
  const seven = tenLeague(7);
  W.lock(seven, seven.cycle.locks);
  claim(seven.rounds.length === 6 && seven.rounds.every(r => r.bye && r.matches.length === 3), 'seven managers do not get six rounds of three with a bye');
  claim(new Set(seven.rounds.map(r => r.bye)).size === 6, 'the same man sits out twice with seven');
  // eight planned for twelve slots, trimmed: the opener chose seven, eight came, need five
  const eight = tenLeague(8);
  W.lock(eight, eight.cycle.locks);
  claim(eight.slots.length === 5 && eight.rounds.length === 7, `eight managers kept ${eight.slots.length} slots and ${eight.rounds.length} rounds`);
  claim(!eight.slots.includes('sun-18') && !eight.slots.includes('sun-10'), 'the trim did not drop the latest slots');
}

/* 6 and 7. results, the assistant rule, the table, 8. packs, 9. prizes */
{
  const l = tenLeague();
  W.lock(l, l.cycle.locks);
  const res = (h: number, a: number, choseH: number, choseA: number) => ({ score: [h, a] as [number, number], shootout: null, winner: (h > a ? 'home' : 'away') as 'home' | 'away', chose: { home: choseH, away: choseA }, decisions: 6 });
  // dev-9 never answers: his first two are the assistant's, his third is 0:3 whatever the score
  let third: W.MatchResult | null = null, count = 0;
  for (const r of l.rounds) for (const m of r.matches) {
    const nine = m.home === 'dev-9' ? 'home' : m.away === 'dev-9' ? 'away' : null;
    if (!nine) { W.recordResult(l, r, m, res(2, 1, 3, 2)); continue; }
    count++;
    const raw = nine === 'home' ? res(4, 0, 0, 3) : res(0, 4, 3, 0);   // he "wins" 4:0 with the assistant
    const out = W.recordResult(l, r, m, raw);
    if (count === 3) third = out;
  }
  const nine = W.member(l, 'dev-9')!;
  claim(nine.assistant === 9, `the assistant played ${nine.assistant} for the absent man`);
  claim(!!third && third.technical === (l.rounds.flatMap(r => r.matches).filter(m => m.home === 'dev-9' || m.away === 'dev-9')[2].home === 'dev-9' ? 'home' : 'away'), 'the third assistant match was not a technical loss');
  claim(nine.wins === 2 && nine.losses === 7, `the absent man has ${nine.wins} wins and ${nine.losses} losses, wanted 2 and 7`);
  const table = W.standings(l);
  claim(table.every(r => r.played === 9), 'not everyone played nine');
  claim(table[0].points >= table[1].points && table[8].points >= table[9].points, 'the table is not sorted by points');
  claim(table.find(r => r.device === 'dev-9')!.points === 6, 'the absent man\'s points are wrong');
  // no draws ever reach the table
  claim(table.every(r => r.wins + r.losses === r.played), 'a draw crept into the table');
  // packs: a man with 7 wins has two packs
  const best = l.members.reduce((a, b) => (b.wins > a.wins ? b : a));
  claim(best.packs === Math.floor(best.wins / 3), `${best.nick} has ${best.packs} packs for ${best.wins} wins`);
  if (best.packs > 0) {
    const before = [...best.squad!];
    const man = W.openWeekendPack(l, best, 'ST');
    claim(typeof man !== 'string', `the pack refused: ${man}`);
    if (typeof man !== 'string') {
      claim(Math.abs(overall(man) - W.PACK_OVR) <= 1 && man.position === 'ST', `the pack gave a ${man.position} of ${overall(man)}`);
      claim(best.squad!.length === W.SQUAD_SIZE, 'the squad is not eighteen after a pack');
      const gone = before.filter(p => !best.squad!.some(q => q.id === p.id));
      claim(gone.length === 1 && gone[0].position === 'ST' && overall(gone[0]) === Math.min(...before.filter(p => p.position === 'ST').map(overall)), 'the pack did not replace the weakest striker');
      claim(best.opened === 1);
      if (best.packs === 1) claim(typeof W.openWeekendPack(l, best, 'CB') === 'string', 'a second opening on one pack was allowed');
    }
  }
  const none = l.members.find(m => m.packs === 0)!;
  claim(typeof W.openWeekendPack(l, none, 'ST') === 'string', 'a pack was opened with no wins');
  // the prize
  const prizes = W.settle(l, { [table[0].device]: 1 });
  claim(l.status === 'done' && prizes.length === 10, 'settle did not finish the league');
  const champ = prizes[0], second = prizes[1], thirdP = prizes[2];
  claim(champ.place === 1 && champ.wageRounds === 1.0 && champ.gems === 3, `a champion again got ${champ.wageRounds} rounds and ${champ.gems} gems`);
  claim(second.wageRounds === 0.75 && second.gems === 2 && thirdP.wageRounds === 0.5 && thirdP.gems === 1, 'second and third are wrong');
  const absent = prizes.find(p => p.device === 'dev-9')!;
  claim(absent.place > 3 && absent.wageRounds === 0 && absent.gems === 0 && !absent.finished, `the absent man got ${absent.wageRounds} rounds`);
  const fourth = prizes[3];
  claim(fourth.wageRounds === W.PRIZE_FINISHED && fourth.gems === W.GEMS_FINISHED && fourth.finished, `fourth got ${fourth.wageRounds}`);
  const fresh = W.settle(tenLeague(), {});
  claim(fresh.length === 10, 'a fresh league did not settle');   // (no results: everyone level, still ten prizes)
  // a first champion gets 1.5
  const l2 = tenLeague(); W.lock(l2, l2.cycle.locks);
  for (const r of l2.rounds) for (const m of r.matches) W.recordResult(l2, r, m, m.home === 'dev-0' || m.away === 'dev-0' ? (m.home === 'dev-0' ? res(3, 0, 2, 2) : res(0, 3, 2, 2)) : res(1, 0, 2, 2));
  const p2 = W.settle(l2, {});
  claim(p2[0].device === 'dev-0' && p2[0].wageRounds === 1.5 && p2[0].gems === 3, 'a first champion did not get 1.5 and 3');
  // lineup
  const m0 = W.member(l2, 'dev-0')!;
  const ids = m0.squad!.map(p => p.id);
  claim(W.setLineup(m0, ids.slice(0, 11), { approach: 'attacking', press: 'high', formation: '4-3-3' }) === null && m0.tactic.formation === '4-3-3', 'a valid lineup was refused');
  claim(W.setLineup(m0, ids.slice(0, 10), m0.tactic) !== null, 'ten men were allowed');
  claim(W.setLineup(m0, [...ids.slice(1, 11), ids[1]], m0.tactic) !== null, 'a man twice was allowed');
  claim(W.setLineup(m0, ids.filter(id => m0.squad!.find(p => p.id === id)!.position !== 'GK').slice(0, 11), m0.tactic) !== null, 'eleven without a keeper was allowed');
}

/* 10. penalties on a draw */
{
  let draws = 0, seed = 1;
  while (draws < 5 && seed < 400) {
    const l = tenLeague(); W.lock(l, l.cycle.locks);
    const h = l.members[0], a = l.members[1];
    const d = D.createDuel({ seed: 5000 + seed, shootoutOnDraw: true,
      home: { id: 'h', name: h.nick, starters: W.starters(h), bench: W.bench(h), tactic: h.tactic },
      away: { id: 'a', name: a.nick, starters: W.starters(a), bench: W.bench(a), tactic: a.tactic } }, 0);
    let t = 0;
    while (!d.done && !d.shootout && t < 3_600_000) { t += 500; D.advance(d, t); }
    if (d.done) { seed++; continue; }
    draws++;
    claim(d.st.score[0] === d.st.score[1] && !!d.shootout, `seed ${seed}: a shootout without a draw`);
    // both decide every kick: home kicks first, away dives; then the other way
    let kicks = 0;
    while (!d.done && kicks < 40) {
      claim(!!d.decision && !!d.decision.kick && d.decision.deciders.length === 2, `seed ${seed}: a kick without two deciders`);
      const dec = d.decision!;
      claim(dec.kick!.taker === (dec.kick!.n % 2 === 1 ? 'home' : 'away'), `seed ${seed}: kick ${dec.kick!.n} taken by ${dec.kick!.taker}`);
      const vt = D.view(d, dec.kick!.taker, 0, t), vk = D.view(d, D.other(dec.kick!.taker), 0, t);
      claim(!!vt.decision && vt.decision.role === 'own' && !!vk.decision && vk.decision.role === 'dive', `seed ${seed}: the kick is not asked of both`);
      t += 1000;
      claim(D.choose(d, dec.kick!.taker, 'left', t), 'the taker\'s corner was refused');
      t += 1000;
      claim(D.choose(d, D.other(dec.kick!.taker), kicks % 3 === 0 ? 'left' : 'right', t), 'the keeper\'s dive was refused');
      kicks++;
    }
    claim(d.done && !!d.shootout!.winner, `seed ${seed}: the shootout did not end (${kicks} kicks)`);
    const so = d.shootout!;
    claim(so.kicks.length === kicks && so.kicks.length >= 6, `seed ${seed}: ${so.kicks.length} kicks`);
    const r = D.result(d);
    claim(r.winner === so.winner && r.shootout?.join() === `${so.home},${so.away}`, `seed ${seed}: the result does not carry the shootout`);
    claim(d.st.score[0] === d.st.score[1], `seed ${seed}: the shootout changed the match score`);
    // the kicks are in the log, and a kick nobody answers is the assistant's
    claim(d.log.filter(x => x.kind === 'penalty').length >= kicks * 2, 'the kicks are not in the log');
    // storage keeps the shootout
    claim(D.serialize(D.deserialize(D.serialize(d))) === D.serialize(d), 'the shootout does not survive storage');
    seed++;
  }
  claim(draws === 5, `only ${draws} draws found in ${seed} seeds`);
  // a shootout nobody answers still ends
  {
    const l = tenLeague(); W.lock(l, l.cycle.locks);
    let ended = false;
    for (let s = 1; s < 300 && !ended; s++) {
      const d = D.createDuel({ seed: 9000 + s, shootoutOnDraw: true,
        home: { id: 'h', name: 'א', starters: W.starters(l.members[2]), bench: W.bench(l.members[2]), tactic: l.members[2].tactic },
        away: { id: 'a', name: 'ב', starters: W.starters(l.members[3]), bench: W.bench(l.members[3]), tactic: l.members[3].tactic } }, 0);
      let t = 0;
      while (!d.done && t < 3_600_000) { t += 500; D.advance(d, t); }
      if (d.shootout) { ended = d.done && !!d.shootout.winner && d.log.filter(x => x.kind === 'penalty').every(x => x.auto); }
    }
    claim(ended, 'a shootout with nobody answering did not end on the assistant');
  }
  // a match with a winner never goes to penalties
  {
    const l = tenLeague(); W.lock(l, l.cycle.locks);
    let seen = 0;
    for (let s = 1; s < 40; s++) {
      const d = D.createDuel({ seed: 100 + s, shootoutOnDraw: true,
        home: { id: 'h', name: 'א', starters: W.starters(l.members[4]), bench: W.bench(l.members[4]), tactic: l.members[4].tactic },
        away: { id: 'a', name: 'ב', starters: W.starters(l.members[5]), bench: W.bench(l.members[5]), tactic: l.members[5].tactic } }, 0);
      let t = 0;
      while (!d.done && t < 3_600_000) { t += 500; D.advance(d, t); }
      if (d.st.score[0] !== d.st.score[1]) { seen++; claim(!d.shootout, `seed ${100 + s}: a winner went to penalties`); }
    }
    claim(seen > 10, 'no decided matches found');
  }
}

/* 11. the screens: every number sits by its own name. The rows read right to left (home, us, on the right) and the
   digits run left to right, so the far side's number is written first (Itzik, 18.10: "איציק ניצח וכתוב גל 3:0") */
{
  const { readFileSync } = await import('node:fs');
  const m = readFileSync('src/ui/weekend/WeekendMatch.tsx', 'utf8');
  const w = readFileSync('src/ui/weekend/Weekend.tsx', 'utf8');
  claim(m.includes('<span className="club">{us}</span>') && m.indexOf('<span className="club">{us}</span>') < m.indexOf('<span className="club">{them}</span>'), 'the match board no longer puts us first, on the right');
  claim(m.includes('<span className="sc">{score[1]} : {score[0]}</span>'), 'the match board writes our score first, beside their name');
  claim(m.includes('{soMine[1]} - {soMine[0]}'), 'the shootout tally writes our kicks first, beside their name');
  claim(w.includes('<span className="r">{m.home}</span>') && w.includes('<span className="s">{sc[1]}-{sc[0]}</span>'), 'a live row writes the home score first, beside the away name');
  claim(w.includes('shootout[1]}-${m.result.shootout[0]}') && w.includes('shootout[1]}-${m.live.shootout[0]}'), 'a live row shootout writes the home kicks first');
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 40)) console.log('  - ' + f);
  process.exit(1);
}
console.log('OK, the weekend league: Sunday to Sunday on Israel time, N-3 slots, squads of 85, every pair once, no draws, the assistant\'s third is 0:3, a pack every three wins, and the prize by place');
