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
  if (!/phase === 'tactic'[^]{0,260}phase: 'teamsheet'/.test(app)) fails.push('the tunnel no longer leads to the dressing room board');
  if (/<VsScreen/.test(app)) fails.push('the crest card is back in the tunnel');
  if (!/patched\.phase === 'vs'/.test(readFileSync('src/game/save.ts', 'utf8'))) {
    fails.push('a save left standing on the old crest card would open on nothing');
  }
  // the board leads to the match, through the door that plays the works friendly first when one was agreed
  if (!/phase === 'teamsheet'[^]{0,200}G\.sendTeamsheet/.test(app)) fails.push('the dressing room board does not lead to the match');
  if (!/G\.lineup\(gs\)/.test(sheet)) fails.push('the chalkboard does not draw the real eleven');
  if (!/formation\(gs\.tactic\?\.formation\)/.test(sheet)) fails.push('the chalkboard is not drawn in the shape being played');
  // and it is where the sheet is last changed. A manager who sees his side and
  // wants one change should not have to walk back out of the tunnel for it, but
  // the board must not invent its own rules either: every swap goes through the
  // one the squad room uses, and a refusal says why.
  checked += 3;
  if (!sheet.includes('G.swapBlockedReason(')) {
    fails.push('the chalkboard changes the eleven without asking whether it is allowed');
  }
  if (!sheet.includes('onSwap(') || !sheet.includes('onMove(')) {
    fails.push('the chalkboard cannot change the sheet it is showing');
  }
  if (!app.includes('G.swapPlayers(g, a, b)') || !app.includes('G.movePlayers(g, a, b)')) {
    fails.push('the chalkboard is not wired to the same engine the squad room uses');
  }
  console.log('  the chalkboard hangs between the tunnel and the pitch, with the real eleven on it');
}

/* THE BOARD SAYS WHAT EACH MAN IS, NOT JUST WHAT HE IS CALLED.
   Players asked for it: the board before the match showed a surname and nothing
   else, so a manager could not tell from it that a left back was standing in at
   right back, or which of two centre halves was the better one. Every man on
   the pitch carries the shirt he is in and what he is worth IN it, the number
   the match will use and the same one the squad screen's pitch prints; every
   man on the bench carries his own position and rating. Source guards, like the
   ones above: the board is type and CSS, not something this suite can draw. */
{
  const sheet = readFileSync('src/ui/screens/Teamsheet.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  checked += 5;
  if (!/effectiveOverall\(p, slot\.role, overall\(p\)\)/.test(sheet)) fails.push('the chalkboard does not work out what each man is worth in the shirt he stands in');
  if (!/chalk-meta num" data-fit=\{fit\}>\{slot\.role\} \{shown\}/.test(sheet)) fails.push('the chalkboard does not print the shirt and the rating under each man on the pitch');
  if (!/chalk-meta num">\{p\.position\} \{overall\(p\)\}/.test(sheet)) fails.push('the chalkboard bench does not print each man\'s position and rating');
  if (!/aria-label=\{`\$\{p\.name\}, \$\{slot\.role\}, דירוג \$\{shown\}/.test(sheet)) fails.push('a man on the chalkboard does not read out his rating to a screen reader');
  if (!/^\.chalk-meta\{[^}]*font-size:/m.test(css)) fails.push('the small print on the chalkboard has no style');
  // and the small print has somewhere to go: the line of centre backs stands far enough
  // in front of the keeper that the second line of type under a man does not land on his ring
  // (at 79 against 90 the middle of three centre backs touched the keeper)
  checked++;
  const geo = /slot\.line === 'GK' \? (\d+) : (\d+) - slot\.d \* (\d+)/.exec(sheet);
  if (!geo || Number(geo[1]) - Number(geo[2]) < 15) fails.push(`the chalkboard puts the back line ${geo ? Number(geo[1]) - Number(geo[2]) : '?'} per cent of the pitch from the keeper, under 15, so the small print lands on his ring`);
  console.log('  the chalkboard: every man carries his shirt and his rating, the bench its positions and ratings');
}

/* THE BENCH RIDES THE BOTTOM OF THE SCREEN.
   In the pitch view the bench is a sticky strip at the thumb, every tile a
   drop target, so moving a man between pitch and bench is never a journey
   through an auto-scroll. A source guard on the three things that make it
   work: the strip exists, its tiles are drop targets that lift on a press,
   and the CSS actually pins it. */
{
  const squad = readFileSync('src/ui/screens/Squad.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  checked += 3;
  if (!/className="bench-bar"/.test(squad)) fails.push('the squad room lost its bottom bench strip');
  if (!/bench-tile" data-drop-id=\{p\.id\}[^]{0,700}onPointerDown=\{e => drag\.start\(p\.id, e\)\}/.test(squad)) {
    fails.push('the bench tiles are no longer draggable drop targets');
  }
  // sticky was the first attempt and it came unstuck at the bottom of the
  // page, drifting up above the last button, so the target of a drag moved
  // depending on how far you had scrolled. Only fixed holds it still.
  // it is the bottom row of a column the height of the window now, which puts
  // it in the same place for the same reason, without being on top of anything
  if (!/\.squad-fit \.bench-bar\{flex:none/.test(css)) fails.push('the bench is not the bottom row, so the drag is a journey again');
  console.log('  the bench rides the bottom of the pitch view, every tile a drop target');
}

/* THE BENCH MAN WORTH A SHIRT, AND THE OFFER TO GIVE HIM ONE.
   A squad improves from underneath: the boys on the bench grow over a summer
   and the men in the eleven age. By the fourth season the worst man in the
   eleven averages 43 against 57 for the best on the bench, and the screen never
   said a word, so a manager watching the same eleven every week concluded his
   players never develop. One wrote in to say so.

   The suggestion has to be worth taking and legal to take, so this plays it:
   the eleven is turned upside down on purpose, and then every offer the game
   makes is accepted until it stops making them. */
{
  const worth = (g: G.GameState) => {
    const f = formation(g.tactic?.formation);
    return G.lineup(g).reduce((s, p, i) => s + effectiveOverall(p, f.slots[i].role, overall(p)), 0);
  };

  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', age: 38, type: 'mental' } as never);
  gs = G.pickClub(gs, gs.league.clubs[0].id);
  gs = G.afterSigning(gs, {});

  // the worst men in the eleven and the best on the bench, which is the shape a
  // squad drifts into on its own over a few seasons, reached here on purpose
  const sq = G.mySquad(gs);
  const all = [...sq.starters, ...sq.bench].slice().sort((a, b) => overall(a) - overall(b));
  const gk = all.filter(p => p.position === 'GK');
  const out = all.filter(p => p.position !== 'GK');
  const starters = [gk[0], ...out.slice(0, 10)];
  const bench = [gk[1], ...out.slice(10)].filter(Boolean);
  gs = { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: { starters, bench } } } } as G.GameState;

  checked++;
  const first = G.bestUpgrade(gs);
  if (!first) fails.push('the worst eleven in the squad was offered no upgrade at all');

  let before = worth(gs), steps = 0, seen: G.Upgrade | null = first;
  while (seen && steps < 40) {
    checked += 3;
    if (seen.gain < 3) fails.push(`an upgrade worth only ${seen.gain} was offered, under the three it takes to be worth saying`);
    const why = G.swapBlockedReason(seen.out, seen.in, gs);
    if (why) fails.push(`the game offered a swap it will not allow: ${why}`);

    const after = G.swapPlayers(gs, seen.out.id, seen.in.id);
    const gained = worth(after) - before;
    if (gained !== seen.gain) fails.push(`it promised ${seen.gain} and the eleven gained ${gained}`);

    gs = after; before = worth(gs); steps++;
    seen = G.bestUpgrade(gs);
  }

  checked += 3;
  if (steps === 0) fails.push('no upgrade was ever taken, so nothing here was measured');
  if (steps >= 40) fails.push('the offers never ran out, so taking them does not settle');
  if (G.mySquad(gs).starters.filter(p => p.position === 'GK').length !== 1) {
    fails.push('taking every upgrade left the eleven without exactly one keeper');
  }
  console.log(`  the worst eleven in the squad took ${steps} offered upgrades and then ran out, every one legal and worth what it said`);
}

console.log(`${checked} checks across ${FORMATIONS.length} formations`);
console.log(`seating improved the fit in ${improved} of ${improved + sameOrWorse} squads, made it worse in 0`);
console.log(`4-4-2 reads: ${formation('4-4-2').slots.map(s => s.role).join(' ')}`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every shirt has a name and the right man is in it');
process.exit(fails.length ? 1 : 0);
