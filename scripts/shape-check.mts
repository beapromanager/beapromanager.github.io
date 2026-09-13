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
  if (res.shape && (res.shape.atHalf[0] !== st.score[0] || res.shape.atHalf[1] !== st.score[1]))
    fails.push('the result records the wrong half-time score alongside the shape change');
  const untouched = L.finalize(toHalfTime(4242));
  checked++;
  if (untouched.shape) fails.push('a match with no shape change still reports one');

  const playing = toHalfTime(4242);
  L.resumeFromHalfTime(playing);
  checked += 2;
  if (L.canChangeFormation(playing)) fails.push('the shape can be reshuffled in open play, which is a free reset');
  if (L.changeFormation(playing, '5-4-1')) fails.push('a mid-play reshape went through anyway');
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

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the shape changes in the dressing room and everything downstream knows');
process.exit(fails.length ? 1 : 0);
