/**
 * The team sheet says what each man is playing, and puts him somewhere sane.
 *   node --experimental-strip-types scripts/lineup-check.mts
 *
 * Item 5 on Itzik's list: a list of names cannot show you that your right back
 * slot is filled by a third centre back. These are the rules that make the
 * pitch view honest.
 */
import { FORMATIONS, formation, fillFormation, roleFit, ROLE_LABEL } from '../src/data/formations.ts';
import type { SlotRole } from '../src/data/formations.ts';
import type { Player } from '../src/engine/matchEngine.ts';
const gkSlotOf = (f: { slots: { line: string }[] }) => f.slots.findIndex(s => s.line === 'GK');
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng, teamRatings, overall } from '../src/engine/matchEngine.ts';
import { FIT_MULT, effectiveOverall } from '../src/data/formations.ts';
import { readFileSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
/** a save as an older build wrote it, loaded through the real loader */
function loadOld(raw: Record<string, unknown>): G.GameState {
  store.clear();
  saveCareer(raw as unknown as G.GameState);
  const s = JSON.parse(store.get('beapro.career.v1')!);
  delete s.state.seats;
  store.set('beapro.career.v1', JSON.stringify(s));
  return loadCareer()!;
}

const fails: string[] = [];
let checked = 0;

/* 1. every slot in every formation has a role, and a name for it */
for (const f of FORMATIONS) {
  checked++;
  if (f.slots.length !== 11) fails.push(`${f.id}: ${f.slots.length} slots`);
  for (const s of f.slots) {
    checked++;
    if (!s.role) fails.push(`${f.id}: a ${s.line} slot has no role`);
    else if (!ROLE_LABEL[s.role]) fails.push(`${f.id}: role ${s.role} has no Hebrew label`);
  }
  // the roles must match the shape the formation advertises
  const defs = f.slots.filter(s => s.line === 'DEF').length;
  const mids = f.slots.filter(s => s.line === 'MID').length;
  const fwds = f.slots.filter(s => s.line === 'FWD').length;
  checked++;
  if (defs !== f.counts[0] || mids !== f.counts[1] || fwds !== f.counts[2])
    fails.push(`${f.id}: slots are ${defs}-${mids}-${fwds}, label says ${f.counts.join('-')}`);
  // a back four has a left and a right, and only one keeper
  checked++;
  if (f.slots.filter(s => s.line === 'GK').length !== 1) fails.push(`${f.id}: not exactly one keeper`);
  const wide = f.slots.filter(s => ['LB', 'RB', 'LWB', 'RWB'].includes(s.role));
  checked++;
  if (wide.length !== 2) fails.push(`${f.id}: ${wide.length} full backs, wanted 2`);
}

/* 2. a squad that HOLDS the right men is lined up with them in the right shirts.
      This is the bug the pitch view exposed: grabbing by line alone could put a
      right back at left back purely from list order. */
for (const f of FORMATIONS) {
  for (let seed = 0; seed < 60; seed++) {
    const sq = makeSquad(58, createRng(3300 + seed * 17));
    const eleven = fillFormation(sq.starters, f);
    checked++;
    if (eleven.length !== 11) { fails.push(`${f.id} seed ${seed}: ${eleven.length} men`); continue; }
    // nobody plays twice
    if (new Set(eleven.map(p => p.id)).size !== 11) fails.push(`${f.id} seed ${seed}: a man is in two shirts`);

    // if the squad has a natural for a wide slot, he must be in it
    for (let i = 0; i < 11; i++) {
      const role = f.slots[i].role as SlotRole;
      if (!['LB', 'RB'].includes(role)) continue;
      const natural = eleven.some(p => p.position === role);
      checked++;
      if (natural && eleven[i].position !== role)
        fails.push(`${f.id} seed ${seed}: a ${role} is in the squad but ${eleven[i].position} wears the shirt`);
    }
    // the keeper is the keeper
    checked++;
    if (sq.starters.some(p => p.position === 'GK') && eleven[0].position !== 'GK')
      fails.push(`${f.id} seed ${seed}: ${eleven[0].position} in goal with a keeper available`);
  }
}

/* 3. seating never makes the fit worse than the order it was handed */
let improved = 0, sameOrWorse = 0;
for (const f of FORMATIONS) {
  for (let seed = 0; seed < 40; seed++) {
    const sq = makeSquad(58, createRng(8800 + seed * 13));
    const eleven = fillFormation(sq.starters, f);
    const score = (list: typeof eleven) => list.reduce((s, p, i) => {
      const fit = roleFit(p.position, f.slots[i].role);
      return s + (fit === 'natural' ? 2 : fit === 'covers' ? 1 : 0);
    }, 0);
    const mine = score(eleven);
    const raw = score(sq.starters.slice(0, 11));
    checked++;
    if (mine < raw) fails.push(`${f.id} seed ${seed}: seating made the fit worse, ${mine} vs ${raw}`);
    else if (mine > raw) improved++;
    else sameOrWorse++;
  }
}

/* 4. roleFit is not simply calling everything a fit */
checked += 3;
if (roleFit('ST', 'CB') !== 'out') fails.push('a striker at centre back reads as fine');
if (roleFit('CB', 'CB') !== 'natural') fails.push('a centre back at centre back does not read as natural');
if (roleFit('GK', 'ST') !== 'out') fails.push('a keeper up front reads as fine');

/* 5. THE MANAGER'S OWN SHEET. He can put any outfield man in any outfield
      shirt, the goal is the one shirt that does not move, and what he arranged
      is what the match plays: the engine prices a man in a strange shirt down,
      and the price on the sheet is the price in the engine. */
{
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'אשדוד');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.dismissNotice(G.takeSponsor(gs, 'base'));
  const f = formation(gs.tactic.formation);

  // untouched, the sheet is the automatic seating
  checked++;
  if (G.lineup(gs).map(p => p.id).join() !== fillFormation(G.mySquad(gs).starters, f).map(p => p.id).join()) fails.push('an unarranged sheet is not the automatic seating');

  // a centre back into the striker's shirt, and the striker into his
  const men = G.lineup(gs);
  const stSlot = f.slots.findIndex(s => s.role === 'ST');
  const cbSlot = f.slots.findIndex(s => s.role === 'CB');
  const st = men[stSlot], cb = men[cbSlot];
  checked++;
  if (G.moveBlockedReason(gs, cb.id, st.id)) fails.push(`a centre back cannot take the striker's shirt: ${G.moveBlockedReason(gs, cb.id, st.id)}`);
  const moved = G.movePlayers(gs, cb.id, st.id);
  const after = G.lineup(moved);
  checked += 2;
  if (after[stSlot].id !== cb.id || after[cbSlot].id !== st.id) fails.push('the two men did not change shirts');
  if (roleFit(cb.position, f.slots[stSlot].role) !== 'out') fails.push('the test squad has no centre back to put up front');

  // the price, isolated from the men: eleven clones of one outfield player with
  // every attribute at 60, so each is a 60 in any shirt, each labelled with the
  // natural position of his slot. Swap two labels and the only thing that
  // changed is the fit
  const f433 = formation('4-3-3');
  const flat = { ...men.find(p => p.position !== 'GK')!, attrs: { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 } };
  const clones = f433.slots.map((s, i) => (s.line === 'GK' ? men[gkSlotOf(f)] : { ...flat, id: `c${i}`, position: s.role as Player['position'] }));
  // the striker and a centre back change labels, the manager's move in clone form;
  // a fit seating would put each back in his own shirt, the manager's sheet does not
  const stIdx = f433.slots.findIndex(s => s.role === 'ST');
  const cbIdx = f433.slots.findIndex(s => s.role === 'CB');
  const strangeClones = clones.map((p, i) => (i === stIdx ? { ...p, position: 'CB' as const } : i === cbIdx ? { ...p, position: 'ST' as const } : p));
  const tac = { ...gs.tactic, formation: '4-3-3' as const };
  const rate = (players: Player[], seated: boolean) => teamRatings({ id: 'x', name: 'x', players, tactic: tac, chemistry: 0.7, isHome: true, seated });
  const natural = rate(clones, true), strange = rate(strangeClones, true);
  checked += 3;
  if (overall(strangeClones[stIdx]) !== overall(clones[stIdx])) fails.push('the relabelled clone is not the same number, the price test is not isolated');
  if (!(strange.att < natural.att - 0.05)) fails.push(`a centre back up front did not cost the attack (${strange.att.toFixed(3)} vs ${natural.att.toFixed(3)})`);
  // the engine must take the manager's placing as it is: re-seated by fit the
  // same list rates differently, because a fit seating would move the man
  if (Math.abs(rate(strangeClones, false).att - strange.att) < 1e-9) fails.push('the engine re-seated the manager\'s eleven instead of taking his shirts');
  checked++;
  if (effectiveOverall(cb, f.slots[stSlot].role, overall(cb)) !== Math.round(overall(cb) * FIT_MULT.out)) fails.push('the number on the sheet is not the engine\'s price');
  checked += 3;
  if (FIT_MULT.natural !== 1) fails.push('a natural fit is not free');
  if (FIT_MULT.covers !== 0.96 || FIT_MULT.out !== 0.88) fails.push(`the fit prices moved: covers ${FIT_MULT.covers}, out ${FIT_MULT.out}`);
  if (effectiveOverall({ ...cb, position: 'CB' }, 'ST', 62) !== 55) fails.push(`a 62 centre back up front reads ${effectiveOverall({ ...cb, position: 'CB' }, 'ST', 62)}, not 55`);

  // the goal does not move
  const gkSlot = f.slots.findIndex(s => s.line === 'GK');
  const gk = men[gkSlot];
  checked += 2;
  if (!G.moveBlockedReason(gs, gk.id, st.id)) fails.push('the keeper was allowed out of goal');
  if (G.movePlayers(gs, st.id, gk.id).seats) fails.push('a striker was let into goal');

  // what he arranged is what the match plays, and the live match keeps it
  const inp = G.liveMatchInput(moved);
  checked++;
  if (inp.playerStarters.map(p => p.id).join() !== after.map(p => p.id).join()) fails.push('the match input is not the sheet he arranged');
  const st0 = L.createLive(inp);
  checked++;
  if (L.slotRoles(st0).get(cb.id) !== 'ST') fails.push(`in the live match the centre back wears ${L.slotRoles(st0).get(cb.id)}, not ST`);
  // a caller handing over a plain list still gets a seated eleven
  const plain = L.createLive({ ...inp, seated: false, playerStarters: [...inp.playerStarters].reverse() });
  checked++;
  if (L.slotRoles(plain).get(gk.id) !== 'GK') fails.push('an unseated eleven was not seated by fit on the way in');

  // the pins survive a substitution and a sale, and a new shape clears them
  const bench = G.mySquad(moved).bench.find(p => p.position !== 'GK' && !G.swapBlockedReason(st, p, moved))!;
  const subbed = G.swapPlayers(moved, st.id, bench.id);
  checked += 2;
  if (G.lineup(subbed)[cbSlot].id !== bench.id) fails.push('the man coming on did not take the shirt of the man going off');
  if (G.lineup(subbed)[stSlot].id !== cb.id) fails.push('a substitution reshuffled the sheet');
  const opt = G.partOptions(subbed, bench.id)[0];
  if (opt) {
    const sold = G.partPlayer(subbed, bench.id, opt.kind);
    checked += 2;
    if (G.lineup(sold).length !== 11) fails.push('a sale left the sheet short');
    if (G.lineup(sold)[stSlot].id !== cb.id) fails.push('a sale undid the manager\'s placing of a man who stayed');
  }
  const reshaped = G.setTactic(moved, { ...moved.tactic, formation: moved.tactic.formation === '4-4-2' ? '4-3-3' : '4-4-2' });
  checked++;
  if (reshaped.seats !== null) fails.push('a new formation kept the old pins');

  // a save from before the sheet existed loads as the automatic seating
  const raw = JSON.parse(JSON.stringify(moved)) as Record<string, unknown>;
  delete raw.seats;
  const old = loadOld(raw);
  checked++;
  if (old.seats !== null || G.lineup(old)[stSlot].id === cb.id) fails.push('an old save came back with a sheet it never had');

  // the AI is seated by fit, exactly as before: rating a plain list equals rating its seating
  const opp = G.mySquad(gs); // any eleven will do as a stand in
  const a = teamRatings({ id: 'y', name: 'y', players: opp.starters, tactic: { formation: '4-4-2', approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false });
  const b = teamRatings({ id: 'y', name: 'y', players: fillFormation(opp.starters, formation('4-4-2')), tactic: { formation: '4-4-2', approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false, seated: true });
  checked++;
  if (Math.abs(a.att - b.att) > 1e-9 || Math.abs(a.def - b.def) > 1e-9) fails.push('an unseated side is not rated as its fit seating');
  console.log('  the manager\'s sheet: any shirt but the goal, priced in the engine, kept through subs and sales');
}

/* THE SHEET IS HANDED OVER BEFORE THE WHISTLE.
   The chalkboard in the dressing room is the last thing between the tunnel and
   the pitch, and it must carry the real eleven in the real shape. A source
   guard: the tunnel routes to it, it routes to the match, and it draws
   lineup(gs) seated in the formation being played, name by name. */
{
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  const sheet = readFileSync('src/ui/screens/Teamsheet.tsx', 'utf8');
  checked += 4;
  if (!/phase === 'vs'[^]{0,200}phase: 'teamsheet'/.test(app)) fails.push('the tunnel no longer leads to the dressing room board');
  if (!/phase === 'teamsheet'[^]{0,200}phase: 'match'/.test(app)) fails.push('the dressing room board does not lead to the match');
  if (!/G\.lineup\(gs\)/.test(sheet)) fails.push('the chalkboard does not draw the real eleven');
  if (!/formation\(gs\.tactic\?\.formation\)/.test(sheet)) fails.push('the chalkboard is not drawn in the shape being played');
  console.log('  the chalkboard hangs between the tunnel and the pitch, with the real eleven on it');
}

console.log(`${checked} checks across ${FORMATIONS.length} formations`);
console.log(`seating improved the fit in ${improved} of ${improved + sameOrWorse} squads, made it worse in 0`);
console.log(`4-4-2 reads: ${formation('4-4-2').slots.map(s => s.role).join(' ')}`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every shirt has a name and the right man is in it');
process.exit(fails.length ? 1 : 0);
