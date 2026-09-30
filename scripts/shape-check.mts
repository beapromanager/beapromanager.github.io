/**
 * Changing the shape at half time.
 *   node --experimental-strip-types scripts/shape-check.mts
 *
 * A manager who set up 4-4-2, watched it get overrun for forty-five minutes and
 * could only give a team talk about it was commentating, not managing. He can
 * now go to three at the back or throw a third man forward in the dressing
 * room.
 *
 * The half that is easy to get wrong is not the switch, it is everything that
 * has to follow it. onPitch is an ordered array whose index IS the slot on the
 * pitch, so a formation changed without re-seating the eleven draws a striker
 * at wing back and offers substitutes off a map of the shape you just
 * abandoned. That is worse than not offering the switch at all, because it
 * looks like it worked.
 */
import * as L from '../src/game/liveMatch.ts';
import type { LiveState, Corner } from '../src/game/liveMatch.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng, teamRatings, overall } from '../src/engine/matchEngine.ts';
import { formation, fillFormation, FORMATIONS } from '../src/data/formations.ts';
import type { FormationId } from '../src/data/formations.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

const CORNERS: Corner[] = ['left', 'center', 'right'];

/** A match, driven to half time and left standing in the dressing room. */
function toHalfTime(seed: number, shape: FormationId = '4-4-2'): LiveState {
  const rng = createRng(seed);
  const mine = makeSquad(56, rng), theirs = makeSquad(56, rng);
  const st: LiveState = L.createLive({
    seed, homeId: 'me', homeName: 'שלי', awayId: 'them', awayName: 'שלהם', iAmHome: true,
    playerStarters: mine.starters, playerBench: mine.bench,
    playerTactic: { approach: 'balanced', press: 'mid', formation: shape },
    oppStarters: theirs.starters, oppBench: theirs.bench, moraleBias: 0,
  });
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  let guard = 0;
  while (st.phase !== 'halftime' && st.phase !== 'done' && guard++ < 4000) {
    if (st.phase === 'moment' && st.pending) {
      const m = st.pending;
      switch (m.kind) {
        case 'penalty': L.resolvePenalty(st, pick(CORNERS)); break;
        case 'def_penalty': L.resolveDefPenalty(st, pick(CORNERS)); break;
        case 'shot': L.resolveShot(st, pick(CORNERS)); break;
        case 'free_kick': L.resolveFreeKick(st, pick(CORNERS)); break;
        case 'one_on_one': L.resolveOneOnOne(st, pick(['dribble', 'finish'])); break;
        case 'def_keeper': L.resolveDefKeeper(st, pick(['rush', 'stay'])); break;
        case 'def_tackle': L.resolveDefTackle(st, pick(['slide', 'contain'])); break;
        case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
      }
      if (st.phase === 'moment') st.phase = 'play';
      continue;
    }
    L.step(st);
  }
  return st;
}

const mySide = (st: LiveState) => (st.iAmHome ? st.home : st.away);

/* 1. IT CAN BE CHANGED IN THE DRESSING ROOM, AND ONLY THERE.
      Reshaping mid-play would be a free tactical reset every time the opponent
      threatened; the in-match shout already covers that. */
{
  const st = toHalfTime(4242);
  checked += 3;
  if (st.phase !== 'halftime') fails.push('never reached half time at all');
  if (!L.canChangeFormation(st)) fails.push('the shape cannot be changed at half time, which is the whole feature');
  if (!L.changeFormation(st, '4-3-3')) fails.push('changing the shape at half time was refused');

  // and the result remembers it, so the reporter can ask about it afterwards
  checked += 2;
  const res = L.finalize(st);
  if (res.shape?.to !== '4-3-3') fails.push('the result does not record which shape the manager switched to');
  if (res.shape && (res.shape.atChange[0] !== st.score[0] || res.shape.atChange[1] !== st.score[1]))
    fails.push('the result records the wrong score alongside the shape change');
  checked++;
  if (res.shape?.minute !== 45) fails.push(`a change in the dressing room is recorded at minute ${res.shape?.minute}, not 45`);
  const untouched = L.finalize(toHalfTime(4242));
  checked++;
  if (untouched.shape) fails.push('a match with no shape change still reports one');

  // and in open play it is allowed too, now, see section 8 for what limits it
  const playing = toHalfTime(4242);
  L.resumeFromHalfTime(playing);
  checked++;
  if (!L.canChangeFormation(playing)) fails.push('the shape cannot be changed in open play');
}

/* 2. AND THE ELEVEN ARE RE-SEATED INTO IT.
      THE one that matters. A formation set without moving anybody leaves a
      striker standing at wing back: onPitch is ordered, and its index is the
      slot. The pitch, the bench sheet and the engine all read that order. */
{
  let moved = 0, checkedShapes = 0;
  for (const to of ['4-3-3', '5-4-1'] as FormationId[]) {
    for (let seed = 0; seed < 25; seed++) {
      const st = toHalfTime(700 + seed * 31, '4-4-2');
      if (st.phase !== 'halftime') continue;
      const before = mySide(st).onPitch.map(p => p.id);
      L.changeFormation(st, to);
      const after = mySide(st).onPitch.map(p => p.id);
      checkedShapes++;
      checked += 3;

      // the same men, nobody lost, nobody cloned
      if (after.length !== before.length) fails.push(`${to}: ${before.length} men became ${after.length}`);
      if (new Set(after).size !== after.length) fails.push(`${to}: a player is on the pitch twice`);
      if ([...before].sort().join() !== [...after].sort().join()) {
        fails.push(`${to}: the eleven that came off at half time are not the eleven that went back out`);
      }
      if (before.join() !== after.join()) moved++;

      // THE CONTRACT: the switch seats them exactly as the shared filler would.
      // Not "few enough men out of position" — a squad of four defenders asked
      // to play a back five HAS to borrow somebody, and how many it borrows is
      // a property of the squad, not of this switch. What must hold is that the
      // switch used the same seating the rest of the game uses.
      const f = formation(to);
      const same = fillFormation(mySide(st).onPitch, f).map(p => p.id);
      checked++;
      if (same.join() !== after.join()) {
        fails.push(`${to}: the switch seated the eleven differently from the filler the pitch draws with`);
      }

      // How MANY men end up out of position is deliberately not asserted here.
      // A squad with four defenders asked to play a back five has to borrow
      // somebody, and the cascade that follows — a midfielder drops in, two
      // forwards fill the midfield behind him — is a property of the squad and
      // of the shared seating algorithm, not of this switch. check:lineup
      // measures that algorithm against a hundred and twenty squads. Asserting
      // a number here would only pin whatever it happens to do today.

      // the keeper is still the keeper
      checked++;
      if (mySide(st).onPitch[0]?.position !== 'GK') fails.push(`${to}: slot one is no longer a goalkeeper`);
    }
  }
  checked++;
  if (moved === 0) fails.push('not one switch actually re-ordered the eleven, so nobody moved');
  console.log(`  ${checkedShapes} switches: the same eleven, re-seated, ${moved} of them into a different order`);
}

/* 3. THE BENCH SHEET KNOWS WHERE EVERYBODY IS NOW.
      Itzik asked for this specifically: the point of changing shape is being
      able to substitute against the new one. */
{
  const st = toHalfTime(9111, '4-4-2');
  const before = L.slotRoles(st);
  L.changeFormation(st, '5-4-1');
  const after = L.slotRoles(st);
  checked += 3;
  if (before.size !== mySide(st).onPitch.length) fails.push('the bench sheet has no shirt for some of the eleven');
  if (after.size !== mySide(st).onPitch.length) fails.push('after the switch, some of the eleven have no shirt');

  const changed = [...after].filter(([id, r]) => before.get(id) !== r).length;
  if (changed === 0) fails.push('switching to a back five changed nobody\'s shirt on the bench sheet');

  // the roles named are the new shape's roles, not the old one's
  const roles = new Set(formation('5-4-1').slots.map(s => s.role));
  checked++;
  for (const r of after.values()) {
    if (!roles.has(r as never)) { fails.push(`the bench sheet says somebody is playing ${r}, which is not in a 5-4-1`); break; }
  }
  console.log(`  going to a back five moved ${changed} of ${after.size} men into a different shirt`);
}

/* 4. NOBODY'S POSITION IS REWRITTEN.
      The game's model is that position is what a man IS and the slot is where
      he is asked to play. Rewriting position would change his rating at half
      time — POSITION_WEIGHTS is keyed on it — and quietly turn a midfielder
      into a wing back on his own card forever. */
{
  const st = toHalfTime(3131, '4-4-2');
  const was = new Map(mySide(st).onPitch.map(p => [p.id, { pos: p.position, ovr: overall(p) }]));
  L.changeFormation(st, '5-4-1');
  for (const p of mySide(st).onPitch) {
    checked += 2;
    const w = was.get(p.id);
    if (!w) { fails.push(`${p.name} is on the pitch and was not there before the switch`); continue; }
    if (p.position !== w.pos) fails.push(`${p.name} was rewritten from ${w.pos} to ${p.position} by a formation change`);
    // wrapped because a rewritten position is not merely cosmetic: some slot
    // roles have no entry in POSITION_WEIGHTS at all, so overall() throws
    // outright and a "harmless" relabel takes the whole match screen with it
    let now: number | null = null;
    try { now = overall(p); } catch { fails.push(`${p.name}'s rating cannot even be computed after the switch`); }
    if (now !== null && now !== w.ovr) {
      fails.push(`${p.name}'s rating moved from ${w.ovr} to ${now} because the shape changed`);
    }
  }
}

/* 5. AND IT ACTUALLY CHANGES THE FOOTBALL.
      A picker that only redraws dots is decoration. */
{
  const st = toHalfTime(5150, '4-4-2');
  const side = mySide(st);
  const rate = (f: FormationId) => teamRatings({
    id: side.id, name: side.name, players: side.onPitch,
    tactic: { formation: f, approach: side.tactic.approach, press: side.tactic.press },
    chemistry: 0.7, isHome: true,
  });
  const bal = rate('4-4-2'), att = rate('4-3-3'), def = rate('5-4-1');
  checked += 4;
  if (!(att.att > bal.att)) fails.push(`4-3-3 attacks at ${att.att.toFixed(2)} against 4-4-2's ${bal.att.toFixed(2)}`);
  if (!(att.def < bal.def)) fails.push('4-3-3 gives nothing away at the back, so it is a free upgrade');
  if (!(def.def > bal.def)) fails.push(`5-4-1 defends at ${def.def.toFixed(2)} against 4-4-2's ${bal.def.toFixed(2)}`);
  if (!(def.att < bal.att)) fails.push('5-4-1 costs nothing going forward, so it is a free upgrade');
  console.log(`  the shape bites: attack ${bal.att.toFixed(1)}→${att.att.toFixed(1)} in a 4-3-3, defence ${bal.def.toFixed(1)}→${def.def.toFixed(1)} in a 5-4-1`);
}

/* 6. THE DRESSING ROOM OFFERS ALL OF THEM, AND SAYS IT HAPPENED. */
{
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  checked += 4;
  if (!/FORMATION_CHOICES/.test(src)) fails.push('the half time screen hard-codes its shapes instead of reading them');
  if (!/onShape/.test(src)) fails.push('the half time screen cannot change the shape');
  if (!/slotRoles/.test(src)) fails.push('the bench sheet does not know the current shape');
  // computing the roles is not the same as showing them. This was passing with
  // the roles worked out and then never handed to the row that draws them.
  if (!/role=\{roles\.get\(/.test(src)) {
    fails.push('the bench sheet works out where everybody is playing and then does not show it');
  }
  if (!/role\?: string/.test(src)) fails.push('the bench row cannot display a shirt at all');
  if (L.FORMATION_CHOICES.length !== FORMATIONS.length) {
    fails.push(`the picker offers ${L.FORMATION_CHOICES.length} shapes and the game has ${FORMATIONS.length}`);
  }

  // and the ticker says so, because a change nobody can see did not happen
  const st = toHalfTime(2020, '4-4-2');
  const before = st.events.length;
  L.changeFormation(st, '4-3-3');
  checked += 2;
  if (st.events.length === before) fails.push('changing shape left no trace in the feed');
  if (!L.changeFormation(st, '4-3-3') === false) { /* re-picking the same shape is a no-op */ }
  const again = st.events.length;
  L.changeFormation(st, '4-3-3');
  if (st.events.length !== again) fails.push('re-picking the shape already being played logs it again');
}

/* 7. A CHANGE CAN BE TAKEN BACK IN THE DRESSING ROOM, AND THEN IT NEVER HAPPENED.
      The card pops in under a finger that was closing the moment before the
      whistle, and a manager who never meant to change was asked by the press
      why he had. A change now takes two taps on screen, and one that is taken
      back leaves nothing: not on the pitch, not in the feed, not in the result. */
{
  const st = toHalfTime(3030, '4-4-2');
  const seats = mySide(st).onPitch.map(p => p.id).join(',');
  checked++;
  if (L.revertFormation(st)) fails.push('a dressing room with no change let a revert through');
  L.changeFormation(st, '4-3-3');
  checked += 2;
  if (L.formationBefore(st) !== '4-4-2') fails.push(`the shape he went in with reads ${L.formationBefore(st)}`);
  if (!st.shape) fails.push('the change was not recorded');
  // a second change in the same room is still measured against the first shape
  L.changeFormation(st, '3-5-2');
  checked++;
  if (L.formationBefore(st) !== '4-4-2' || st.shape?.to !== formation('3-5-2').label) fails.push('a second change lost the original shape or the final one');
  checked++;
  if (!L.revertFormation(st)) fails.push('the revert was refused');
  checked += 4;
  if (mySide(st).tactic.formation !== '4-4-2') fails.push(`after the revert the side plays ${mySide(st).tactic.formation}`);
  if (mySide(st).onPitch.map(p => p.id).join(',') !== seats) fails.push('the eleven were not seated back where they started');
  if (st.events.some(e => e.type === 'tactic' && e.text.startsWith('שינוי מערך'))) fails.push('the feed still says the shape changed');
  if (st.shape || st.shapeFrom) fails.push('the result would still carry a change nobody left standing');
  const res = L.finalize(st);
  checked++;
  if (res.shape) fails.push('the reporter would still be handed a shape change after the revert');
  // and picking the original shape by hand is the same as taking it back
  L.changeFormation(st, '4-3-3');
  L.changeFormation(st, '4-4-2');
  checked++;
  if (st.shape || L.finalize(st).shape) fails.push('going back to the opening shape by hand still counts as a change');

  // the screen asks before it changes, and offers the way back
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  checked += 2;
  if (!/onClick=\{\(\) => setAsking\(f\.id === shape/.test(src) || /onClick=\{\(\) => onShape\(f\.id\)\}/.test(src) || !/כן, לשנות/.test(src)) {
    fails.push('the half time picker changes the shape on a single tap');
  }
  if (!/onRevert/.test(src) || !/revertFormation/.test(src)) fails.push('the dressing room offers no way back from a change');
}

/* 8. IN OPEN PLAY TOO, THREE TIMES A MATCH, THE DRESSING ROOM COUNTING AS ONE.
      Players asked for it. It was half time only on the grounds that a change in
      open play would be a free reset, and it was measured: a change to suit the
      score is worth about six hundredths of a point a match, and changing every
      quarter of an hour is worth no more than once. So it is allowed, limited for
      the feed's sake and not for the balance. */
{
  const MAX = 3;   // the number that was agreed, not read off the code

  /** play on, answering every moment the way the driver above does, until this minute */
  const advance = (st: LiveState, seed: number, minute: number) => {
    const rng = createRng(seed);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
    let guard = 0;
    // and on until the moment, if one is waiting, has been answered: the match is in open play when this returns
    while ((st.minute < minute || st.phase === 'moment') && st.phase !== 'done' && st.phase !== 'halftime' && guard++ < 4000) {
      if (st.phase === 'moment' && st.pending) {
        const m = st.pending;
        switch (m.kind) {
          case 'penalty': L.resolvePenalty(st, pick(CORNERS)); break;
          case 'def_penalty': L.resolveDefPenalty(st, pick(CORNERS)); break;
          case 'shot': L.resolveShot(st, pick(CORNERS)); break;
          case 'free_kick': L.resolveFreeKick(st, pick(CORNERS)); break;
          case 'one_on_one': L.resolveOneOnOne(st, pick(['dribble', 'finish'])); break;
          case 'def_keeper': L.resolveDefKeeper(st, pick(['rush', 'stay'])); break;
          case 'def_tackle': L.resolveDefTackle(st, pick(['slide', 'contain'])); break;
          case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
        }
        if (st.phase === 'moment') st.phase = 'play';
        continue;
      }
      L.step(st);
    }
  };
  /** a match in the second half, in open play, at about the hour */
  const hour = (seed: number, shape: FormationId = '4-4-2') => {
    const st = toHalfTime(seed, shape);
    L.resumeFromHalfTime(st);
    advance(st, seed, 60);
    return st;
  };

  // a change in open play: allowed, re-seated, recorded under the minute it was made
  {
    const st = hour(6001);
    const was = mySide(st).onPitch.map(p => p.id);
    const minute = st.minute, score: [number, number] = [st.score[0], st.score[1]];
    checked += 9;
    if (st.phase !== 'play') fails.push(`the match was not in open play at the hour, it was ${st.phase}`);
    if (!L.canChangeFormation(st)) fails.push('the shape cannot be changed in open play');
    if (!L.changeFormation(st, '3-4-3')) fails.push('a change in open play was refused');
    const now = mySide(st).onPitch.map(p => p.id);
    if ([...was].sort().join() !== [...now].sort().join()) fails.push('the eleven on the pitch changed when only the shape did');
    if (now.join() !== fillFormation(mySide(st).onPitch, formation('3-4-3')).map(p => p.id).join()) fails.push('the change in open play did not seat the eleven as the filler does');
    if (mySide(st).tactic.formation !== '3-4-3') fails.push('the side is not playing the shape it was changed to');
    if (st.shape?.minute !== minute || st.shape?.atChange.join() !== score.join()) fails.push(`the change is recorded at minute ${st.shape?.minute} and ${st.shape?.atChange}, it was made at ${minute} and ${score}`);
    if (!st.events.some(e => e.type === 'tactic' && e.minute === minute && e.text.startsWith('שינוי מערך'))) fails.push('a change in open play left no trace in the feed under its minute');
    if (L.shapeChangesUsed(st) !== 1) fails.push(`one change in open play counts as ${L.shapeChangesUsed(st)}`);
    const res = L.finalize(st);
    checked += 2;
    if (res.shape?.to !== formation('3-4-3').label || res.shape?.minute !== minute) fails.push('the result does not carry the change made in open play');
    if (st.shapeFrom || st.shapeSeats) fails.push('a change in open play left dressing room state behind');
  }

  // it bites: the new shape changes what the side can do, straight away
  {
    const st = hour(6002);
    const side = mySide(st);
    const rate = (f: FormationId) => teamRatings({
      id: side.id, name: side.name, players: side.onPitch,
      tactic: { formation: f, approach: side.tactic.approach, press: side.tactic.press }, chemistry: 0.7, isHome: true, seated: false,
    });
    const before = rate('4-4-2');
    L.changeFormation(st, '3-4-3');
    const after = rate('3-4-3');
    checked++;
    if (!(after.att > before.att && after.def < before.def)) fails.push('changing to 3-4-3 in open play did not trade defence for attack');
  }

  // not while a moment is waiting for an answer, and not when it is over
  {
    let found: LiveState | null = null;
    for (let seed = 6100; seed < 6160 && !found; seed++) {
      const st = toHalfTime(seed);
      L.resumeFromHalfTime(st);
      let guard = 0;
      while (st.phase !== 'moment' && st.phase !== 'done' && guard++ < 4000) L.step(st);
      if (st.phase === 'moment' && st.pending) found = st;
    }
    checked += 3;
    if (!found) fails.push('no match in sixty produced a moment to test against');
    else {
      if (L.canChangeFormation(found) || L.changeFormation(found, '5-4-1')) fails.push('the shape was changed while a moment was waiting for an answer');
    }
    const over = hour(6003);
    over.phase = 'done';
    if (L.canChangeFormation(over) || L.changeFormation(over, '5-4-1')) fails.push('the shape was changed after the final whistle');
  }

  // three, and each one counts, taking it back included
  {
    const st = hour(6004);
    const order: FormationId[] = ['3-4-3', '4-4-2', '5-4-1'];   // the second one is a return to the opening shape
    let ok = 0;
    for (const f of order) { advance(st, 6004 + ok, st.minute + 1); if (st.phase === 'play' && L.changeFormation(st, f)) ok++; }
    checked += 4;
    if (ok !== MAX) fails.push(`${ok} changes went through in open play, expected ${MAX}, going back to the opening shape included`);
    if (L.shapeChangesUsed(st) !== MAX) fails.push(`three changes count as ${L.shapeChangesUsed(st)}`);
    if (L.canChangeFormation(st) || L.changeFormation(st, '4-3-3')) fails.push('a fourth change went through');
    if (!L.SHAPE_LIMIT_TEXT.includes(String(MAX))) fails.push('the limit text does not say how many there are');
  }

  // the dressing room counts as one, however often it was changed in there, and not at all if it was taken back
  {
    const st = toHalfTime(6005);
    L.changeFormation(st, '4-3-3'); L.changeFormation(st, '3-5-2'); L.changeFormation(st, '5-4-1');
    L.resumeFromHalfTime(st);
    checked += 4;
    if (L.shapeChangesUsed(st) !== 1) fails.push(`three taps in the dressing room count as ${L.shapeChangesUsed(st)}, not one`);
    advance(st, 6005, 60);
    const a = L.changeFormation(st, '4-4-2');
    advance(st, 6006, st.minute + 1);
    const b = L.changeFormation(st, '3-4-3');
    advance(st, 6007, st.minute + 1);
    if (!a || !b) fails.push('the two changes left after the dressing room were not both allowed');
    if (L.canChangeFormation(st) || L.changeFormation(st, '4-3-3')) fails.push('the dressing room plus two changes in open play did not use up the three');

    const taken = toHalfTime(6008);
    L.changeFormation(taken, '4-3-3'); L.revertFormation(taken);
    L.resumeFromHalfTime(taken);
    checked++;
    if (L.shapeChangesUsed(taken) !== 0) fails.push(`a change taken back in the dressing room still counts as ${L.shapeChangesUsed(taken)}`);
  }

  // the first half can use them up, and then the dressing room has no change left to offer
  {
    const st = toHalfTime(6009);   // this is the dressing room; go again from the start of the match for the first half
    const early = L.createLive({
      seed: 6009, homeId: 'me', homeName: 'שלי', awayId: 'them', awayName: 'שלהם', iAmHome: true,
      playerStarters: makeSquad(56, createRng(6009)).starters, playerBench: makeSquad(56, createRng(6009)).bench,
      playerTactic: { approach: 'balanced', press: 'mid', formation: '4-4-2' },
      oppStarters: makeSquad(56, createRng(6010)).starters, oppBench: makeSquad(56, createRng(6010)).bench, moraleBias: 0,
    });
    let n = 0;
    for (const f of ['3-4-3', '4-4-2', '5-4-1'] as FormationId[]) { advance(early, 6009 + n, early.minute + 3); if (early.phase === 'play' && L.changeFormation(early, f)) n++; }
    advance(early, 6020, 46);
    checked += 3;
    if (n !== MAX) fails.push(`only ${n} changes went through in the first half`);
    if (early.phase !== 'halftime') fails.push(`the match did not reach half time, it is ${early.phase}`);
    if (L.canChangeFormation(early) || L.changeFormation(early, '3-5-2')) fails.push('the dressing room offered a fourth change');
    void st;
  }

  // a change in open play does not disturb taking back the dressing room's own
  {
    const st = toHalfTime(6011);
    const early = st;   // the first half is over; put an open play record in by hand, as a first half change would have left it
    early.shape = { to: formation('3-4-3').label, atChange: [0, 0], minute: 20 };
    L.changeFormation(early, '5-4-1');
    L.revertFormation(early);
    checked += 2;
    if (early.shape?.minute !== 20 || early.shape?.to !== formation('3-4-3').label) fails.push('taking back the dressing room change lost the change made earlier in open play');
    L.changeFormation(early, '5-4-1'); L.changeFormation(early, '3-5-2'); L.revertFormation(early);
    if (early.shape?.minute !== 20) fails.push('two changes and a revert in the dressing room lost the earlier record');
  }

  // the screen: a button beside the pause, a sheet that stops the match, and the same limit
  {
    const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
    checked += 5;
    if (!/function ShapeSheet\(/.test(src)) fails.push('there is no sheet to change shape in open play');
    if (!/setShapeOpen\(true\)/.test(src)) fails.push('nothing opens the change of shape sheet');
    if (!/disabled=\{!L\.canChangeFormation\(st\) \|\| shapeBusy\}/.test(src)) fails.push('the button is not shut when the limit is used or a moment is waiting');
    if (!/&& !shapeOpen &&/.test(src)) fails.push('the match runs on behind the change of shape sheet');
    // the dressing room shows its own change to take back, not the last one of the match: after a change in
    // the first half it offered to undo a change it had not made
    checked++;
    if (!/const changed = st.shapeFrom ?/.test(src)) fails.push('the dressing room offers to take back the last change of the match, not one made in it');
    if (!/L\.changeFormation\(st, id\); force\(\); setShapeOpen\(false\)/.test(src)) fails.push('choosing a shape in the sheet does not change it and close');
  }
  console.log('  open play: allowed, re-seated, dated, limited to three with the dressing room as one, shut during a moment');
}

/* 9. THE SHOTS SIT UNDER THE SAME BADGE AS THE GOALS.
   The score is drawn right to left with the home side on the right; the stat row is drawn left to right. Printed
   as home then away, the home side's shots landed under the away badge, and a manager read 3 - 1 as his when it
   was theirs. */
{
  checked += 5;
  if (L.shotsLine([3, 1]) !== '1 - 3') fails.push(`home 3 shots away 1 prints "${L.shotsLine([3, 1])}", the home figure must be last so it sits on the right like the score`);
  if (L.shotsLine([0, 7]) !== '7 - 0') fails.push(`home 0 shots away 7 prints "${L.shotsLine([0, 7])}"`);
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  const uses = src.split('L.shotsLine(st.shots)').length - 1;
  if (uses !== 2) fails.push(`the shots are printed through the helper in ${uses} places, the broadcast bar and the dressing room need both`);
  if (/\$\{st\.shots\[0\]\} - \$\{st\.shots\[1\]\}/.test(src)) fails.push('a stat row still prints the shots home first, under the wrong badge');
  // the score really is drawn home on the right, which is the premise of all of this
  const bits = readFileSync('src/ui/components/bits.tsx', 'utf8');
  if (!/direction: 'rtl'[\s\S]{0,400}<span>\{h\}<\/span>/.test(bits)) fails.push('ScorePair no longer draws home first in a right to left row, so the shots order must be rethought');
  console.log('  shots: printed home on the right, like the score');
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the shape changes in the dressing room and everything downstream knows');
process.exit(fails.length ? 1 : 0);
