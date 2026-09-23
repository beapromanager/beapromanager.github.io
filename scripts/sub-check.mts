/**
 * A substitute keeps his own position.
 *   node --experimental-strip-types scripts/sub-check.mts
 *
 * makeSub used to stamp the outgoing man's shirt on whoever came on, from
 * before the shape existed. A CDM sent on for a CAM became a CAM: his rating
 * was recomputed for a role he does not play (62 read 58), and the team sheet
 * said "CAM by nature" about a man who never was. Four things now hold, all
 * read off real live matches on the path a player takes:
 *   1. after a sub the man on the pitch has the position his card has
 *   2. and the rating his card has, whatever shirt he was sent on to cover
 *   3. the man taken off sits on the bench as himself, and there is still
 *      exactly one keeper in the eleven
 *   4. the owner's boy comes on after the half time talk, the only door out
 *      of half time the screen has, as himself, and the story names him
 * And through finalize and commitRound, nobody's position in the saved squad
 * has moved.
 */
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { overall } from '../src/engine/matchEngine.ts';
import type { Player } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;
let subsMade = 0;
let strangeRoles = 0;

function career(seed: number, city: string): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, city);
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  return gs;
}

/** Play until half time, answering nothing (moments are cleared by the engine on resume). */
function toHalfTime(st: L.LiveState) {
  let guard = 0;
  while (st.phase !== 'halftime' && st.phase !== 'done' && guard++ < 400) {
    if (st.phase === 'moment') { st.pending = null; st.phase = 'play'; }
    L.step(st);
  }
}

function toFullTime(st: L.LiveState) {
  let guard = 0;
  while (st.phase !== 'done' && guard++ < 400) {
    if (st.phase === 'moment') { st.pending = null; st.phase = 'play'; }
    if (st.phase === 'halftime') L.resumeFromHalfTime(st);
    L.step(st);
  }
}

const card = (gs: G.GameState, id: string): Player =>
  [...G.mySquad(gs).starters, ...G.mySquad(gs).bench].find(p => p.id === id)!;

/* 1, 2, 3. THREE SUBS A MATCH, EACH INTO A SHIRT THAT IS NOT HIS. */
for (const [i, city] of ['אשדוד', 'חיפה', 'רמת גן', 'באר שבע'].entries()) {
  for (let seed = 1; seed <= 6; seed++) {
    const gs = career(seed * 101 + i, city);
    const inp = G.liveMatchInput(gs);
    const st = L.createLive(inp);
    toHalfTime(st);
    const side = L.mySide(st);

    // pair each outfield starter with a bench man of a different position
    const pairs: [Player, Player][] = [];
    const usedOn = new Set<string>();
    for (const off of side.onPitch) {
      if (off.position === 'GK') continue;
      const on = side.bench.find(p => p.position !== 'GK' && p.position !== off.position && !usedOn.has(p.id));
      if (!on) continue;
      usedOn.add(on.id);
      pairs.push([off, on]);
      if (pairs.length === 3) break;
    }

    for (const [off, on] of pairs) {
      const before = { pos: on.position, ovr: overall(on), offPos: off.position, offOvr: overall(off) };
      if (L.subBlockedReason(st, off.id, on.id)) continue;
      L.makeSub(st, off.id, on.id);
      subsMade++;
      const now = L.mySide(st);
      const inMan = now.onPitch.find(p => p.id === on.id);
      const outMan = now.bench.find(p => p.id === off.id);
      checked += 5;
      if (!inMan) { fails.push(`${city} #${seed}: ${on.name} did not come on`); continue; }
      if (inMan.position !== before.pos)
        fails.push(`${city} #${seed}: ${on.name} came on as ${inMan.position}, his card says ${before.pos}`);
      if (overall(inMan) !== before.ovr)
        fails.push(`${city} #${seed}: ${on.name} rates ${overall(inMan)} on the pitch, ${before.ovr} on his card`);
      if (!outMan) fails.push(`${city} #${seed}: ${off.name} is not on the bench after coming off`);
      else if (outMan.position !== before.offPos || overall(outMan) !== before.offOvr)
        fails.push(`${city} #${seed}: ${off.name} changed on the bench`);
      if (now.onPitch.filter(p => p.position === 'GK').length !== 1)
        fails.push(`${city} #${seed}: ${now.onPitch.filter(p => p.position === 'GK').length} keepers in the eleven after a sub`);
      // the shape still seats him somewhere, and usually somewhere strange
      const role = L.slotRoles(st).get(on.id);
      checked++;
      if (!role) fails.push(`${city} #${seed}: ${on.name} has no shirt in the current shape`);
      else if (role !== inMan.position) strangeRoles++;
    }

    // and the match ends, and the saved squad has not moved anybody
    toFullTime(st);
    const res = L.finalize(st);
    const after = G.commitRound(gs, res);
    for (const p of [...G.mySquad(gs).starters, ...G.mySquad(gs).bench]) {
      const later = card(after, p.id);
      checked++;
      if (!later) { fails.push(`${city} #${seed}: ${p.name} vanished from the squad after the match`); continue; }
      if (later.position !== p.position)
        fails.push(`${city} #${seed}: ${p.name} is ${later.position} in the save after the match, was ${p.position}`);
    }
  }
}
console.log(`  ${subsMade} substitutions into another man's shirt, ${strangeRoles} of them seated in a strange role, every man still himself`);

/* 4. THE OWNER'S BOY. */
{
  const gs = career(777, 'אשדוד');
  const inp = G.liveMatchInput(gs);
  const guest = inp.playerBench.find(p => p.position !== 'GK')!;
  const st = L.createLive({ ...inp, guestId: guest.id });
  toHalfTime(st);
  const pos = guest.position, ovr = overall(guest);
  // the way the screen leaves half time: a team talk, never resumeFromHalfTime
  // by hand. The talk used to set play directly and the boy never came on
  L.halfTimeTalk(st, 'calm');
  const on = L.mySide(st).onPitch.find(p => p.id === guest.id);
  checked += 4;
  if (st.phase !== 'play') fails.push(`after the talk the match is in phase ${st.phase}, not play`);
  if (!on) fails.push('the owner\'s boy did not come on after the half time talk');
  else {
    if (on.position !== pos || overall(on) !== ovr)
      fails.push(`the owner's boy came on as ${on.position} ${overall(on)}, his card says ${pos} ${ovr}`);
  }
  const story = st.events.find(e => e.type === 'tactic' && e.text.includes('נכנס במחצית'));
  if (!story) fails.push('no half time story about the owner\'s boy');
  else if (!story.text.startsWith(guest.name)) fails.push(`the half time story does not name him: "${story.text}"`);
  console.log(`  the owner's boy comes on as himself: "${story?.text ?? ''}"`);
}

/* 5. THE WHISTLE CLOSES THE BENCH. */
{
  const gs = career(1234, 'רמת גן');
  const st = L.createLive(G.liveMatchInput(gs));
  toFullTime(st);
  const side = L.mySide(st);
  const off = side.onPitch.find(p => p.position !== 'GK')!;
  const on = side.bench.find(p => p.position !== 'GK')!;
  const usedBefore = st.subsUsed;
  const eleven = side.onPitch.map(p => p.id).join(',');
  checked += 4;
  if (st.phase !== 'done') fails.push(`the match did not reach full time, phase ${st.phase}`);
  if (L.canSub(st)) fails.push('after the final whistle the bench still says a substitution can be made');
  if (!L.subBlockedReason(st, off.id, on.id)) fails.push('after the final whistle a substitution is not refused with a reason');
  L.makeSub(st, off.id, on.id);
  if (st.subsUsed !== usedBefore || L.mySide(st).onPitch.map(p => p.id).join(',') !== eleven)
    fails.push('a substitution went through after the final whistle');
  console.log('  after the final whistle the bench is closed, and a tap there changes nothing');
}

/* 6. THE BENCH SHEET IS A BOARD, NOT A LIST.
      The manager points at a shirt on a pitch, in the shape being played right
      now, and the board must carry the two things the decision runs on: the
      role each man is wearing and his fitness. A source guard, like shape-check
      section 6: it catches the board being deleted or unhooked, not a broken
      layout. */
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  checked += 4;
  if (!/function SubBoard/.test(src)) fails.push('the substitution sheet has no board');
  if (!/<SubBoard /.test(src)) fails.push('the board exists but the sheet never shows it');
  if (!/formation\(side\.tactic\.formation\)/.test(src)) fails.push('the board is not seated in the shape being played right now');
  if (!/lineup-fit/.test(src)) fails.push('the board says nothing about fitness, which is what a substitution is decided on');
  console.log('  the bench sheet points at a board in the current shape, with fitness on every shirt');
}

/* 7. A SENDING OFF VACATES ONE SLOT AND MOVES NOBODY ELSE.
      The dismissed man is recorded with the slot he was thrown out of, the
      survivors keep the shirts they had, and the screen stops the match for
      it. Real reds are hunted across seeds, the engine is deterministic, so
      the same seeds carry a red forever. */
{
  let redsSeen = 0;
  const redGs = career(9001, 'חיפה');
  for (let seed = 1; seed <= 160 && redsSeen < 3; seed++) {
    const st = L.createLive({ ...G.liveMatchInput(redGs), seed: 9000 + seed });
    const rolesBefore = L.slotRoles(st);
    toFullTime(st);
    const side = L.mySide(st);
    if (!side.sentOff.length) continue;
    redsSeen++;
    checked += 5;

    const redEvents = st.events.filter(e => e.type === 'red' && e.teamId === side.id);
    if (redEvents.length !== side.sentOff.length) {
      fails.push(`seed ${seed}: ${redEvents.length} red events but ${side.sentOff.length} sentOff records`);
    }
    const x = side.sentOff[0];
    if (!redEvents.some(e => e.playerId === x.player.id && e.minute === x.minute)) {
      fails.push(`seed ${seed}: the sentOff record does not match the red event`);
    }
    if (side.onPitch.length !== 11 - side.sentOff.length) {
      fails.push(`seed ${seed}: ${side.onPitch.length} men on the pitch with ${side.sentOff.length} sent off`);
    }
    // the survivors' slots: all distinct, none of them a vacated slot
    const vacated = new Set(side.sentOff.map(v => v.slot));
    const seats = side.onPitch.map((_, k) => L.seatOf(side, k));
    if (new Set(seats).size !== seats.length || seats.some(s => vacated.has(s)) || seats.some(s => s < 0 || s > 10)) {
      fails.push(`seed ${seed}: the survivors' seats collide with the vacated slot (${seats.join(',')} vs ${[...vacated].join(',')})`);
    }
    // and unless the shape moved at half time, every survivor still wears the
    // shirt he wore at kickoff: the red did not slide anyone over
    if (!st.shape) {
      const after = L.slotRoles(st);
      const moved = side.onPitch.filter(p => rolesBefore.get(p.id) !== undefined && rolesBefore.get(p.id) !== after.get(p.id));
      if (moved.length) fails.push(`seed ${seed}: a red card moved ${moved.length} other men into different shirts`);
    }
  }
  if (redsSeen < 3) fails.push(`only ${redsSeen} player-side reds found in 160 seeds, the hunt needs widening`);
  console.log(`  ${redsSeen} sendings off found: each vacates its own slot, the record matches the event, nobody else moves`);
}

/* 8. AND THE SCREEN STOPS THE MATCH FOR IT. A source guard: the red must open
      the sheet with the dismissed man named, and the board must show him. */
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('src/ui/screens/Match.tsx', 'utf8');
  checked += 3;
  if (!/setRedStop\(\{ name: ev\.playerName[^]{0,80}setSubOpen\(true\)/.test(src)) {
    fails.push('a red card for the player side does not stop the match and open the bench sheet');
  }
  if (!/אדום! \$\{red\.name\} מורחק/.test(src)) fails.push('the sheet opened by a red does not say who was sent off');
  if (!/side\.sentOff\.map/.test(src)) fails.push('the board does not show the dismissed man');
  console.log('  a red of ours stops the match, names the man, and leaves him on the board');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 12)) console.log(`  - ${f}`);
  if (fails.length > 12) console.log(`  ... and ${fails.length - 12} more`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
