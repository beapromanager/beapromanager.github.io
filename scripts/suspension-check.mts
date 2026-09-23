/**
 * A red card costs the next match.
 *   node --experimental-strip-types scripts/suspension-check.mts
 *
 * Itzik's rule, in four parts, each measured on a real career rather than on
 * the constant:
 *   1. the man sent off is banned for the round after, told to the manager the
 *      moment he is back at the hub, and the round will not start while the
 *      banned man is in the eleven (nor can he be swapped into it)
 *   2. the sheet needs sixteen eligible names. A squad of sixteen with one man
 *      banned has fifteen, so the manager is told to register a youth, of any
 *      age, who never plays: not in the eleven, not on the bench
 *   3. after that round the youth is back at the academy with a word about it,
 *      the ban is served, and the man plays again
 *   4. a save from before any of this existed still loads, and a red in the
 *      last round of a season is still owed in the first round of the next
 * Reds are forced into the result so every path is walked on every run.
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import type { MatchResult, MatchEvent } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { readFileSync } from 'node:fs';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const fails: string[] = [];
let checked = 0;

/** A fresh career, walked to the hub the way a player walks it, academy and all. */
function career(seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return { ...gs, phase: 'hub' };
}

/** Simulate the round from the live input, optionally with one of ours sent off. */
function playRound(gs: G.GameState, seed: number, redId: string | null): { gs: G.GameState; input: ReturnType<typeof G.liveMatchInput> } {
  const inp = G.liveMatchInput(gs);
  let res: MatchResult = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  // strip whatever reds the engine drew, so the test controls who is sent off
  const events: MatchEvent[] = res.events.filter(e => e.type !== 'red');
  if (redId) {
    const p = [...inp.playerStarters, ...inp.playerBench].find(x => x.id === redId)!;
    events.push({ minute: 61, type: 'red', teamId: gs.clubId, playerId: p.id, playerName: p.name, text: '' });
  }
  res = { ...res, events };
  let next = G.continueFromResult(G.commitRound(gs, res));
  while (next.phase === 'press') next = G.answerPress(next, 0);
  if ((next as { phase: string }).phase === 'chat') next = G.closeChat(next);
  return { gs: next, input: inp };
}

const ids = (xs: { id: string }[]) => new Set(xs.map(x => x.id));

/* 1 to 3. THE WHOLE ARC, ON A SQUAD OF SIXTEEN. */
{
  let gs = career();
  checked++;
  if (G.squadSize(gs) !== 16) fails.push(`the fixture squad is ${G.squadSize(gs)}, this arc needs exactly sixteen`);
  checked++;
  if (!gs.youth.players.length) fails.push('the fixture career has no academy to register from');

  // week 1: a starter is sent off
  const victim = G.mySquad(gs).starters[5];
  ({ gs } = playRound(gs, 1, victim.id));
  checked += 4;
  if (gs.phase !== 'hub') fails.push(`after the round the career is at "${gs.phase}", not the hub`);
  if (!G.isSuspended(gs, victim.id)) fails.push('the man sent off is not banned for the next round');
  const note = gs.notices[0];
  if (!note || note.kind !== 'suspended' || note.name !== victim.name) fails.push('the manager was not told about the ban on the way to the hub');
  if (note?.kind === 'suspended' && !note.needYouth) fails.push('a squad of sixteen with a banned man was not told to register a youth');
  gs = G.dismissNotice(gs);

  // the round will not start with him in the eleven, and he cannot be swapped in
  checked += 3;
  const reason1 = G.weekBlockedReason(gs);
  if (!reason1 || !reason1.includes(victim.name)) fails.push(`the round is not blocked by the banned starter (reason: ${reason1})`);
  if (G.startWeek(gs).phase !== 'hub') fails.push('startWeek went ahead with a banned man in the eleven');
  const sub = G.mySquad(gs).bench.find(p => p.position !== 'GK' && !G.isSuspended(gs, p.id))!;
  gs = G.swapPlayers(gs, victim.id, sub.id);
  if (ids(G.mySquad(gs).starters).has(victim.id)) fails.push('the banned man could not be swapped out of the eleven');
  checked++;
  const backIn = G.swapBlockedReason(sub, victim, gs);
  if (!backIn) fails.push('a banned man on the bench can be swapped straight back into the eleven');

  // sixteen names: still blocked until a youth is on the sheet
  checked += 3;
  const reason2 = G.weekBlockedReason(gs);
  if (!reason2 || !reason2.includes('16')) fails.push(`with fifteen eligible names the round is not blocked for the sheet (reason: ${reason2})`);
  if (!G.needsEmergencyYouth(gs)) fails.push('the youth screen does not offer emergency registration when the sheet is short');
  const kid = gs.youth.players.find(p => p.age < 18) ?? gs.youth.players[0];
  gs = G.registerYouthEmergency(gs, kid.id);
  if (gs.emergencyYouth !== kid.id) fails.push('registering a youth under eighteen for the round was refused');
  checked += 3;
  if (G.weekBlockedReason(gs)) fails.push(`still blocked after registering the youth: ${G.weekBlockedReason(gs)}`);
  if (G.eligibleCount(gs) !== 16) fails.push(`the sheet holds ${G.eligibleCount(gs)} eligible names after registering, not sixteen`);
  if (G.startWeek(gs).phase === 'hub') fails.push('startWeek still refuses a sheet that is in order');

  // week 2: neither the banned man nor the youth touches the grass
  const { gs: after, input } = playRound(gs, 2, null);
  checked += 4;
  const onGrass = new Set([...input.playerStarters, ...input.playerBench].map(p => p.id));
  if (onGrass.has(victim.id)) fails.push('the banned man was handed to the match engine');
  if (onGrass.has(kid.id)) fails.push('the registered youth was handed to the match engine');
  if (input.playerStarters.length !== 11) fails.push(`the eleven had ${input.playerStarters.length} men`);
  if (input.playerBench.length !== 4) fails.push(`the bench had ${input.playerBench.length} men, expected the four left after the ban and the youth`);
  gs = after;

  // and afterwards: youth back down with a word, ban served, man available
  checked += 5;
  if (gs.emergencyYouth) fails.push('the youth is still registered after the round');
  if (!gs.youth.players.some(p => p.id === kid.id)) fails.push('the youth did not go back to the academy');
  if (ids([...G.mySquad(gs).starters, ...G.mySquad(gs).bench]).has(kid.id)) fails.push('the youth is still in the senior squad');
  if (!gs.notices.some(n => n.kind === 'youth_back' && n.name === kid.name)) fails.push('the manager was not told the youth went back down');
  if (G.isSuspended(gs, victim.id)) fails.push('the ban was not served after the round');
  gs = G.dismissNotice(gs);
  checked += 2;
  if (G.weekBlockedReason(gs)) fails.push(`the week after the ban is still blocked: ${G.weekBlockedReason(gs)}`);
  gs = G.swapPlayers(gs, sub.id, victim.id);
  if (!ids(G.liveMatchInput(gs).playerStarters).has(victim.id)) fails.push('the man who served his ban cannot start the following round');
  console.log('  sixteen men, a red, a youth on the sheet, and everyone back where they belong a week later');
}

/* 2b. A ROUND WITHOUT A RED TELLS THE MANAGER NOTHING. */
{
  let gs = career(77);
  ({ gs } = playRound(gs, 3, null));
  checked += 2;
  if (gs.notices.length) fails.push(`a clean round produced a notice: ${gs.notices[0].kind}`);
  if (Object.keys(gs.suspensions).length) fails.push('a clean round left a suspension behind');
  console.log('  a clean round: no ban, no notice');
}

/* 4a. THE OLD SAVE. */
{
  const gs = career(99);
  const raw = JSON.parse(JSON.stringify(gs)) as Record<string, unknown>;
  delete raw.suspensions; delete raw.emergencyYouth; delete raw.notices;
  store.clear();
  saveCareer(raw as unknown as G.GameState);
  const old = loadCareer();
  checked += 2;
  if (!old) fails.push('a save from before bans existed does not load');
  else {
    try {
      if (G.weekBlockedReason(old)) fails.push('an old save arrives with the round blocked');
      G.liveMatchInput(old);
    } catch (e) { fails.push(`an old save throws the moment bans are looked at: ${(e as Error).message}`); }
  }
  console.log('  an old save loads with nobody banned');
}

/* 4b. A RED IN THE LAST ROUND IS OWED NEXT SEASON. */
{
  let gs = career(123);
  gs = { ...gs, week: gs.league.rounds };
  const victim = G.mySquad(gs).starters[7];
  ({ gs } = playRound(gs, 9, victim.id));
  checked += 2;
  if (gs.phase !== 'season-end') fails.push(`the last round did not end the season (phase ${gs.phase})`);
  if (!G.isSuspended(gs, victim.id)) fails.push('a red in the last round was forgotten over the summer');
  console.log('  a red in the last round is carried into the summer');
}

/* AND THE MAN IS UNMISSABLE ON THE TEAM SHEET.
   The round will not start until he is off the eleven, and the screen the
   manager is sent to is the pitch view, where until now he was drawn exactly
   like everybody else: the only word about him was the banner above. He is
   now bold and red on the sheet itself. A source guard, because the colour of
   a name is not something the engine can be asked about. */
{
  const pitch = readFileSync('src/ui/components/LineupPitch.tsx', 'utf8');
  const squad = readFileSync('src/ui/screens/Squad.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  checked += 5;
  if (!/bannedIds\?: Set<string>/.test(pitch)) fails.push('the team sheet cannot be told who is serving a red');
  if (!/data-banned=\{banned \? '1' : '0'\}/.test(pitch)) fails.push('the sheet knows who is banned and does not mark him');
  if (!/lineup-role banned">מורחק</.test(pitch)) fails.push('a banned man is not named as banned where his role goes');
  if (!/bannedIds=\{bannedIds\}/.test(squad) || !/G\.isSuspended\(gs, p\.id\)/.test(squad)) {
    fails.push('the squad room never works out who is banned, or never hands it to the sheet');
  }
  if (!/\.lineup-man\[data-banned="1"\] \.lineup-name\{[^}]*color:var\(--loss\)[^}]*font-weight:900/.test(css)) {
    fails.push('a banned man\'s name is not bold red, which is the whole point');
  }
  console.log('  a man serving a red is bold red on the team sheet, not just in the banner');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
