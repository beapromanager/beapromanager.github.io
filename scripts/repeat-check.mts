/**
 * Nobody repeats himself.
 *   node --experimental-strip-types scripts/repeat-check.mts
 *
 * Item 9 on Itzik's list started with a measurement: over forty seasons the
 * reporter asked the one "win" question four times a season and opened with
 * the same "top man" line five times, and every derby buzzed the phone with
 * the identical group chat. Text alone cannot fix that, a bigger pool without
 * a memory only spaces the repeats out. So the reporter and the phone now
 * remember what they said, and this holds them to it across real seasons:
 *   1. a question heard lately is asked again only when every question in its
 *      pool was heard lately too (the forced repeat is then the oldest one)
 *   2. the same for the match question, and when the lead story has nothing
 *      fresh left, a smaller story with something fresh takes the opening
 *   3. the same for the phone: a thread is never repeated while its trigger
 *      has another thread unheard
 *   4. the memory survives a save and reload, so a reloaded career does not
 *      start the season's questions over
 * The pools are read from the data, so this stays honest as texts are added.
 */
import * as G from '../src/game/state.ts';
import { matchFacts } from '../src/data/matchFacts.ts';
import { askableFacts, factPool } from '../src/data/pressFacts.ts';
import { WIDE_POOLS } from '../src/data/press.ts';
import { THREADS } from '../src/data/chats.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { CITIES } from '../src/data/cities.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

function play(gs: G.GameState, seed: number): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed + seed);
  return G.continueFromResult(G.commitRound(gs, res));
}

const fails: string[] = [];
let checked = 0;

/** Which pool a wide question came from, by its id. */
function widePoolOf(id: string): string[] | null {
  for (const ids of Object.values(WIDE_POOLS)) if (ids.includes(id)) return ids;
  return null;   // derby, relegation, top: single overrides that may repeat by design
}

const SEASONS = 40;
let rounds = 0, forcedWide = 0, forcedFact = 0, forcedChat = 0, chats = 0;
const wideSeen = new Map<string, number>();

for (let s = 0; s < SEASONS; s++) {
  let gs = G.newGame(9100 + s * 17);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, CITIES[s % CITIES.length].name);
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);

  for (let w = 0; w < 40 && !gs.seasonOver; w++) {
    const before = gs.pressHistory.slice();
    const chatBefore = gs.chatHistory.slice();
    gs = play(gs, w * 7);
    if (gs.phase !== 'press') break;
    rounds++;
    const tag = `season ${s} week ${w}`;

    const asked = [gs.press!.q, ...(gs.press!.queue ?? [])];
    const wide = asked[asked.length - 1];
    const fact = asked.length === 2 ? asked[0] : null;

    /* 1. the wide question */
    checked++;
    wideSeen.set(wide.id, (wideSeen.get(wide.id) ?? 0) + 1);
    const pool = widePoolOf(wide.id);
    if (pool && before.includes(wide.id)) {
      const unheard = pool.filter(id => !before.includes(id));
      if (unheard.length) fails.push(`${tag}: asked "${wide.id}" again while "${unheard[0]}" was unheard`);
      else forcedWide++;
    }

    /* 2. the match question */
    if (fact) {
      checked++;
      const r = gs.lastPlayerMatch!;
      const usable = askableFacts(matchFacts(r, gs.clubId, G.mySquad(gs)));
      if (before.includes(fact.id)) {
        const anyFresh = usable.flatMap(f => factPool(f.kind)).filter(id => !before.includes(id));
        if (anyFresh.length) fails.push(`${tag}: opened with "${fact.id}" again while "${anyFresh[0]}" was unheard`);
        else forcedFact++;
      }
    }

    /* and the memory grew by exactly what was asked */
    checked++;
    const tail = gs.pressHistory.slice(-asked.length);
    if (tail.join() !== asked.map(q => q.id).join()) fails.push(`${tag}: the memory did not record what was asked`);

    /* 3. the phone */
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if ((gs as { phase: string }).phase === 'chat') {
      chats++;
      checked++;
      const chat = gs.chat!;
      // every slot filled, including the ones in the contact name
      checked++;
      const raw = [chat.contact, chat.subtitle, ...chat.lines.flatMap(l => [l.from, l.text])].find(s => /\{\w+\}/.test(s));
      if (raw) fails.push(`${tag}: "${chat.id}" left a slot unfilled: ${raw}`);
      const trig = THREADS.find(t => t.id === chat.id)!.trigger;
      const siblings = THREADS.filter(t => t.trigger === trig).map(t => t.id);
      if (chatBefore.includes(chat.id)) {
        const unheard = siblings.filter(id => !chatBefore.includes(id));
        if (unheard.length) fails.push(`${tag}: the phone showed "${chat.id}" again while "${unheard[0]}" was unheard`);
        else forcedChat++;
      }
      gs = G.closeChat(gs);
    }
  }
}
console.log(`  ${rounds} press conferences over ${SEASONS} seasons, ${chats} phone buzzes`);
console.log(`  forced repeats (pool exhausted): ${forcedWide} wide, ${forcedFact} match, ${forcedChat} chat`);
console.log(`  wide questions asked, most to least: ${[...wideSeen].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);

/* 4. the memory survives a reload */
{
  let gs = G.newGame(4321);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, CITIES[0].name);
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  gs = play(gs, 3);
  while (gs.phase === 'press') gs = G.answerPress(gs, 0);
  if ((gs as { phase: string }).phase === 'chat') gs = G.closeChat(gs);
  checked += 2;
  if (!gs.pressHistory.length) fails.push('a round was played and the reporter remembers nothing');
  store.clear();
  saveCareer(gs);
  const back = loadCareer();
  if (!back || back.pressHistory.join() !== gs.pressHistory.join()) fails.push('the press memory did not survive a save and reload');

  // and a save from before the memory existed still loads, with an empty one
  checked++;
  const raw = JSON.parse(JSON.stringify(gs)) as Record<string, unknown>;
  delete raw.pressHistory;
  store.clear();
  saveCareer(raw as unknown as G.GameState);
  const old = loadCareer();
  if (!old || !Array.isArray(old.pressHistory)) fails.push('an old save came back without a press memory to write into');
  console.log('  the memory survives a reload, and an old save gets an empty one');
}

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 12)) console.log(`  - ${f}`);
  if (fails.length > 12) console.log(`  ... and ${fails.length - 12} more`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
