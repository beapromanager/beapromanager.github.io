/**
 * Moving men about the pitch, in the middle of the match, for nothing.
 *   node --experimental-strip-types scripts/reshuffle-check.mts
 *
 * A player wrote in: "I got a red in defence, I want to bring a midfielder back
 * and have the hole in midfield, without spending a substitution." He was
 * right. Measured over 1680 matches: a manager is shown 1.68 reds a season, one
 * every eight matches, at a median of minute 54, and 39% of them are defenders.
 * He has three substitutions, so repairing a shape cost him a third of his
 * changes, and two thirds of those reds land while substitutions are still
 * worth having.
 *
 * The line this holds, and it is the reason it is safe: moving a man is not
 * changing the SHAPE. Only who wears which shirt inside it moves, and it is a
 * trade: the shirt he leaves stands empty. The shape itself can be changed in open
 * play too, three times a match, and that is a different thing with its own count,
 * held by shape-check: a man moved about the pitch does not use one of the three.
 */
import * as L from '../src/game/liveMatch.ts';
import type { LiveState } from '../src/game/liveMatch.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng, teamRatings } from '../src/engine/matchEngine.ts';
import { formation } from '../src/data/formations.ts';
import type { FormationId } from '../src/data/formations.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

function live(seed: number, shape: FormationId = '4-4-2'): LiveState {
  const rng = createRng(seed);
  const mine = makeSquad(56, rng), theirs = makeSquad(56, rng);
  return L.createLive({
    seed, homeId: 'me', homeName: 'שלי', awayId: 'them', awayName: 'שלהם', iAmHome: true,
    playerStarters: mine.starters, playerBench: mine.bench,
    playerTactic: { approach: 'balanced', press: 'mid', formation: shape },
    oppStarters: theirs.starters, oppBench: theirs.bench, moraleBias: 0,
  });
}

const me = (st: LiveState) => (st.iAmHome ? st.home : st.away);

/** who is standing in which slot right now, slot to player id */
function seating(st: LiveState): Map<number, string> {
  const s = me(st);
  const out = new Map<number, string>();
  s.onPitch.forEach((p, k) => out.set(L.seatOf(s, k), p.id));
  return out;
}

/* 1. TWO MEN TRADE SHIRTS, AND NOBODY ELSE MOVES. */
{
  const st = live(4242);
  const s = me(st);
  const fm = formation(s.tactic.formation ?? '4-4-2');
  const before = seating(st);

  // an outfield pair, so the keeper rule is not what is being measured here
  const a = s.onPitch.find(p => p.position !== 'GK')!;
  const b = [...s.onPitch].reverse().find(p => p.position !== 'GK' && p.id !== a.id)!;
  const slotA = [...before].find(([, id]) => id === a.id)![0];
  const slotB = [...before].find(([, id]) => id === b.id)![0];

  checked += 4;
  if (!L.swapOnPitch(st, a.id, b.id)) fails.push('two men on the pitch cannot trade shirts at all');
  const after = seating(st);
  if (after.get(slotA) !== b.id) fails.push(`${b.name} did not take the shirt ${a.name} was wearing`);
  if (after.get(slotB) !== a.id) fails.push(`${a.name} did not take the shirt ${b.name} was wearing`);

  let moved = 0;
  for (const [slot, id] of before) {
    if (slot === slotA || slot === slotB) continue;
    if (after.get(slot) !== id) moved++;
  }
  if (moved) fails.push(`${moved} other men changed shirts when two of them traded, and none should have`);
  console.log(`  two men traded shirts in slots ${slotA} and ${slotB}, ${moved} others moved`);
  void fm;
}

/* 2. AND IT COSTS NOTHING. That is the whole complaint. */
{
  const st = live(77);
  const s = me(st);
  const subsBefore = st.subsUsed;
  const a = s.onPitch.find(p => p.position !== 'GK')!;
  const b = [...s.onPitch].reverse().find(p => p.position !== 'GK' && p.id !== a.id)!;
  L.swapOnPitch(st, a.id, b.id);
  checked += 2;
  if (st.subsUsed !== subsBefore) fails.push(`trading shirts used ${st.subsUsed - subsBefore} substitutions, and it has to be free`);
  if (s.onPitch.length !== 11) fails.push(`the side has ${s.onPitch.length} men after a trade, and it should be eleven`);
}

/* 3. THE HOLE FOLLOWS THE MAN. The report, exactly. */
{
  const st = live(4242);
  const s = me(st);
  const fm = formation(s.tactic.formation ?? '4-4-2');

  // send off a defender, the commonest case at 39% of a manager's reds
  const defIdx = s.onPitch.findIndex((p, k) => fm.slots[L.seatOf(s, k)]?.line === 'DEF');
  const sent = s.onPitch[defIdx];
  const defSlot = L.seatOf(s, defIdx);
  s.sentOff.push({ player: sent, slot: defSlot, minute: 54 });
  s.onPitch.splice(defIdx, 1);

  checked += 3;
  if (s.onPitch.length !== 10) fails.push(`ten men expected after a sending off, found ${s.onPitch.length}`);
  if (!L.vacantSlots(st).includes(defSlot)) fails.push('the shirt the sent off man left is not reported empty');

  const before = seating(st);
  const midIdx = s.onPitch.findIndex((p, k) => fm.slots[L.seatOf(s, k)]?.line === 'MID');
  const mid = s.onPitch[midIdx];
  const midSlot = L.seatOf(s, midIdx);

  if (!L.fillVacancy(st, mid.id, defSlot)) fails.push('a midfielder cannot be moved into the shirt the defender left');

  const after = seating(st);
  checked += 4;
  if (after.get(defSlot) !== mid.id) fails.push(`${mid.name} is not standing in the defender's shirt`);
  if (L.vacantSlots(st).includes(defSlot)) fails.push('the defender\'s shirt is still reported empty after somebody took it');
  if (!L.vacantSlots(st).includes(midSlot)) fails.push('the hole did not move to the shirt the midfielder left');
  if (s.onPitch.length !== 10) fails.push(`the side has ${s.onPitch.length} men after moving one, and it should still be ten`);

  // and everybody else kept the shirt he had
  let moved = 0;
  for (const [slot, id] of before) {
    if (slot === midSlot) continue;
    if (after.get(slot) !== id && id !== mid.id) moved++;
  }
  checked++;
  if (moved) fails.push(`${moved} other men changed shirts when one was moved, and none should have`);
  console.log(`  a defender went off at slot ${defSlot}, a midfielder from slot ${midSlot} took it, ${moved} others moved`);
}

/* 4. IT IS REFUSED WHERE IT SHOULD BE. */
{
  const st = live(909);
  const s = me(st);
  const fm = formation(s.tactic.formation ?? '4-4-2');
  const outfield = s.onPitch.find(p => p.position !== 'GK')!;
  checked += 2;
  // a shirt nobody left empty
  if (L.fillVacancy(st, outfield.id, 5)) fails.push('a man was moved into a shirt that nobody had vacated');
  if (L.vacantSlots(st).length) fails.push('shirts are reported empty with nobody sent off');

  // and the keeper stays in goal, which is a decision with its own rule and its own price
  const gkIdx = s.onPitch.findIndex((p, k) => fm.slots[L.seatOf(s, k)]?.role === 'GK');
  const gk = s.onPitch[gkIdx];
  const gkSlot = L.seatOf(s, gkIdx);
  const outIdx = s.onPitch.findIndex((p, k) => fm.slots[L.seatOf(s, k)]?.line === 'FWD');
  const fwd = s.onPitch[outIdx];
  const fwdSlot = L.seatOf(s, outIdx);

  // send the forward off so there is a hole to try to move the keeper into
  s.sentOff.push({ player: fwd, slot: fwdSlot, minute: 60 });
  s.onPitch.splice(outIdx, 1);
  checked += 2;
  if (L.fillVacancy(st, gk.id, fwdSlot)) fails.push('the goalkeeper wandered out of goal and up the pitch');

  // and with the keeper's own shirt empty, nobody walks into it from here
  const st2 = live(910);
  const s2 = me(st2);
  const fm2 = formation(s2.tactic.formation ?? '4-4-2');
  const gk2i = s2.onPitch.findIndex((p, k) => fm2.slots[L.seatOf(s2, k)]?.role === 'GK');
  const gk2 = s2.onPitch[gk2i];
  const gk2Slot = L.seatOf(s2, gk2i);
  s2.sentOff.push({ player: gk2, slot: gk2Slot, minute: 30 });
  s2.onPitch.splice(gk2i, 1);
  const anyone = s2.onPitch.find(p => p.position !== 'GK')!;
  if (L.fillVacancy(st2, anyone.id, gk2Slot)) {
    fails.push('an outfield man walked into goal from the pitch board, and that decision belongs to the squad with its own price');
  }
  console.log('  refused: an empty shirt nobody left, the keeper leaving goal, and anybody walking into it');
}

/* 5. AND IT ACTUALLY DOES SOMETHING. A reorganisation that changes no rating
      is a button that lies. */
{
  const st = live(555);
  const s = me(st);
  const fm = formation(s.tactic.formation ?? '4-4-2');
  const input = () => ({
    id: s.id, name: s.name, players: s.onPitch, tactic: s.tactic,
    chemistry: 0.7, isHome: true, seated: true,
  });
  const before = teamRatings(input());

  // the best forward goes to the back, the worst defender goes up
  const fwdIdx = s.onPitch.findIndex((p, k) => fm.slots[L.seatOf(s, k)]?.line === 'FWD');
  const defIdx = s.onPitch.findIndex((p, k) => fm.slots[L.seatOf(s, k)]?.line === 'DEF');
  L.swapOnPitch(st, s.onPitch[fwdIdx].id, s.onPitch[defIdx].id);
  const after = teamRatings(input());

  checked += 2;
  const moved = Math.abs(after.def - before.def) + Math.abs(after.att - before.att);
  if (moved < 0.01) fails.push('putting a forward in defence changed nothing in the ratings, so the board is a lie');
  console.log(`  a forward swapped into defence moved the ratings by ${moved.toFixed(2)} across attack and defence`);
}

/* 6. MOVING A MAN IS NOT CHANGING THE SHAPE, AND USES NONE OF THE THREE. */
{
  const st = live(31);
  const shape = me(st).tactic.formation;
  const a = me(st).onPitch[1].id, b = me(st).onPitch[10].id;
  L.swapOnPitch(st, a, b);
  checked += 4;
  if (me(st).tactic.formation !== shape) fails.push(`trading two shirts changed the shape from ${shape} to ${me(st).tactic.formation}`);
  if (L.shapeChangesUsed(st) !== 0) fails.push(`trading two shirts used ${L.shapeChangesUsed(st)} of the three changes of shape`);
  if (st.shape) fails.push('trading two shirts left a change of shape on the record for the reporter');
  // and the three are all still there afterwards
  if (!L.canChangeFormation(st)) fails.push('after trading two shirts the shape can no longer be changed');
}

/* 7. AND THE MATCH CARRIES ON AFTERWARDS. */
{
  const st = live(1234);
  const s = me(st);
  const a = s.onPitch.find(p => p.position !== 'GK')!;
  const b = [...s.onPitch].reverse().find(p => p.position !== 'GK' && p.id !== a.id)!;
  L.swapOnPitch(st, a.id, b.id);
  let guard = 0;
  while (st.phase !== 'done' && guard++ < 6000) {
    if (st.phase === 'moment' && st.pending) { st.phase = 'play'; st.pending = undefined; continue; }
    // the dressing room is not a stall, it is a door, and step() will not open
    // it: without this the match sat at half time and the loop called it a hang
    if (st.phase === 'halftime') { L.resumeFromHalfTime(st); continue; }
    L.step(st);
  }
  checked += 2;
  if (st.phase !== 'done') fails.push('the match never finished after the eleven were reorganised');
  if (s.onPitch.length !== 11) fails.push(`the side ended with ${s.onPitch.length} men`);
  console.log(`  a match played to the whistle after a reorganisation, final score ${st.score[0]}:${st.score[1]}`);
}

/* 8. A DEFENDER IS SENT OFF: DEFENDERS ARE OFFERED, IN PLACE OF A FORWARD, STRAIGHT INTO THE EMPTY SHIRT.
   Asked for by a player: a centre back gets a red and the substitutions offered should be for THAT position,
   and since nobody can be put into a sent off man's shirt, the offer is a defender for a forward. A forward
   sent off offers nothing, a side that loses a striker plays on as it is. */
{
  const DEF = new Set(['CB', 'LB', 'RB']), ATK = new Set(['LW', 'RW', 'ST']), MID = new Set(['CDM', 'CM', 'CAM']);
  /** a side with one man of this kind of shirt sent off, and a bench that holds what the test needs */
  const reded = (seed: number, kind: Set<string>) => {
    const st = live(seed);
    const s = me(st);
    const fm = formation(s.tactic.formation ?? '4-4-2');
    const k = s.onPitch.findIndex((p, i) => p.position !== 'GK' && kind.has(fm.slots[L.seatOf(s, i)]?.role));
    const sent = s.onPitch[k], slot = L.seatOf(s, k);
    s.sentOff.push({ player: sent, slot, minute: 54 });
    s.onPitch.splice(k, 1);
    return { st, s, slot, sent };
  };
  const benchDefs = (s: ReturnType<typeof me>) => s.bench.filter(p => DEF.has(p.position));

  let tested = 0, exactOk = 0;
  for (let seed = 500; seed < 540; seed++) {
    const { st, s, slot } = reded(seed, DEF);
    if (!benchDefs(s).length) continue;
    tested++;
    const c = L.redCover(st);
    checked += 10;
    if (!c) { fails.push(`seed ${seed}: a defender was sent off, a defender is on the bench and nothing is offered`); continue; }
    if (c.slot !== slot) fails.push(`seed ${seed}: the offer is for shirt ${c.slot}, the empty one is ${slot}`);
    if (c.defenders.some(o => !DEF.has(o.player.position))) fails.push(`seed ${seed}: a man who is not a defender is offered for a defender's shirt`);
    if (c.defenders.some(o => !s.bench.includes(o.player))) fails.push(`seed ${seed}: somebody who is not on the bench is offered`);
    if (c.forwards.some(p => !ATK.has(p.position))) fails.push(`seed ${seed}: a man who is not a forward is offered to come off`);
    if (c.defenders.some(o => o.exact !== (o.player.position === c.role))) fails.push(`seed ${seed}: a defender is labelled natural for a shirt that is not his`); else exactOk++;

    const fwd = c.forwards[0], def = c.defenders[0].player;
    const before = seating(st), subs = st.subsUsed, fwdSlot = [...before].find(([, id]) => id === fwd.id)![0];
    if (!L.coverRed(st, fwd.id, def.id)) { fails.push(`seed ${seed}: the offer could not be taken`); continue; }
    const after = seating(st);
    if (st.subsUsed !== subs + 1) fails.push(`seed ${seed}: taking the offer used ${st.subsUsed - subs} changes, it is one`);
    if (s.onPitch.length !== 10) fails.push(`seed ${seed}: ${s.onPitch.length} men on the pitch after the change, the side is still down to ten`);
    if (after.get(slot) !== def.id) fails.push(`seed ${seed}: the defender is not standing in the shirt that was left empty`);
    if (after.has(fwdSlot)) fails.push(`seed ${seed}: the forward's shirt is not the one that stands empty now`);
    if (!L.vacantSlots(st).includes(fwdSlot) || L.vacantSlots(st).includes(slot)) fails.push(`seed ${seed}: the empty shirt did not move from the defender's to the forward's`);
    let moved = 0;
    for (const [sl, id] of before) if (sl !== fwdSlot && sl !== slot && after.get(sl) !== id) moved++;
    if (moved) fails.push(`seed ${seed}: ${moved} other men changed shirts`);
    // the defender left the bench, and the forward LEFT THE MATCH: not back on the bench, Itzik's rule of 9.10
    if (s.bench.some(p => p.id === def.id) || s.bench.some(p => p.id === fwd.id) || !s.replaced.some(x => x.player.id === fwd.id)) fails.push(`seed ${seed}: the defender is still on the bench, or the forward did not leave the match`);
  }
  checked += 2;
  if (tested < 25) fails.push(`only ${tested} of 40 matches had a defender on the bench, the section proves too little`);
  if (exactOk !== tested) fails.push('the natural label was wrong somewhere');
  console.log(`  a defender sent off: ${tested} matches, defenders only, for a forward, into the empty shirt, one change`);

  // nothing is offered for a forward or a midfielder who is sent off
  checked += 2;
  for (const [name, kind] of [['forward', ATK], ['midfielder', MID]] as const) {
    const { st } = reded(510, kind);
    if (L.redCover(st)) fails.push(`a ${name} was sent off and a defender is offered`);
  }

  // no change left, nothing offered and nothing done
  {
    const { st, s } = reded(510, DEF);
    st.subsUsed = L.MAX_SUBS;
    const fwd = s.onPitch.find(p => ATK.has(p.position))!, def = benchDefs(s)[0];
    checked += 3;
    if (L.redCover(st)) fails.push('all changes are used and a change is still offered');
    if (def && L.coverRed(st, fwd.id, def.id)) fails.push('all changes are used and the cover went through');
    if (s.onPitch.length !== 10) fails.push('the refused cover still changed the side');
  }

  // only a defender may come on, only a forward may go off
  {
    const { st, s } = reded(510, DEF);
    const fwd = s.onPitch.find(p => ATK.has(p.position))!;
    const midOff = s.onPitch.find(p => MID.has(p.position))!;
    const nonDef = s.bench.find(p => !DEF.has(p.position) && p.position !== 'GK')!;
    const def = benchDefs(s)[0];
    checked += 3;
    if (nonDef && L.coverRed(st, fwd.id, nonDef.id)) fails.push('a man who is not a defender was put in for a forward as cover');
    if (def && L.coverRed(st, midOff.id, def.id)) fails.push('a midfielder was taken off as cover, only a forward can be');
    if (st.subsUsed !== 0) fails.push(`refused covers used ${st.subsUsed} changes`);
  }

  // a bench with no defender on it offers nothing
  {
    const { st, s } = reded(510, DEF);
    s.bench = s.bench.filter(p => !DEF.has(p.position));
    checked++;
    if (L.redCover(st)) fails.push('a bench with no defender on it still offers one');
  }
}

/* the screen has to offer it, or none of the above is reachable */
{
  const m = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  checked += 2;
  if (!m.includes('L.swapOnPitch')) fails.push('the match screen never lets two men trade shirts');
  if (!m.includes('L.fillVacancy')) fails.push('the match screen never lets a man take an empty shirt');
  checked += 2;
  if (!m.includes('L.coverRed(st, forwardId, defenderId)')) fails.push('the match screen never takes the cover offered after a defender is sent off');
  if (!m.includes('<RedCoverCard st={st} onCover={onCover} />')) fails.push('the sheet opened by a red card does not show the cover');
}

console.log(`${checked} checks`);
console.log('men move about the pitch for nothing, the shape does not, and the hole goes where the manager puts it');
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the eleven can be reorganised without spending a substitution');
process.exit(fails.length ? 1 : 0);
