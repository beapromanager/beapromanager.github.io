// node --experimental-strip-types scripts/cup-qf-check.mts
// The reigning champion who is also in Europe is drawn into the cup straight at the quarter-final (status 'waiting',
// joinAt 1). The pre-bracket he is waiting for is played for him in startWeek, in week 4. 24.10: the hub held the
// round button for a waiting cup ("קודם ערב הגביע"), and startWeek is the only way out, so the button waited for the
// round and the round waited for the button, in weeks 1 to 4. The sticky bar at the bottom was the only way out
// and it never asked. This pins the way out, the walk through the weeks, and the saves that were stuck.
import { cupWeeks, drawCup } from '../src/game/cup.ts';
import * as G from '../src/game/state.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, writable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});

const pool = (n = 24) => Array.from({ length: n }, (_, i) => ({ id: `club${i}`, tier: i % 2 === 0 ? 4 : 5 }));

/** the reigning champion of the top division, in Europe too: the staged entrant, at the hub in the given week */
function staged(seed: number, week: number): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  const tier = 5;
  const hub = { ...gs, phase: 'hub' as const, week, league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier })) } };
  return { ...hub, cup: drawCup(seed, hub.clubId, hub.season, tier, true, pool(24)) };
}

const weeks = cupWeeks(staged(1, 1).league.rounds)!;

/* 1. the hub: a waiting cup is information, never a lock */
{
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  const line = hub.split('\n').find(l => l.includes('const cupBlocking =')) ?? '';
  ok(line !== '' && !/cupWaiting/.test(line), 'the hub holds the league round for a waiting cup: cupBlocking still counts cupWaiting');
  ok(/cupWaiting && <CupWaitingCard/.test(hub), 'the waiting card is gone from the hub: it is information and has to stay');
  const sticky = hub.split('\n').find(l => l.includes('<StickyStart')) ?? '';
  ok(/pensDue/.test(sticky) && /night/.test(sticky) && /cupBlocking/.test(sticky), 'the sticky start bar does not ask the European night, the shootout and the cup night before it shows');
  ok(hub.includes("waiting={!!night || pensDue || cupBlocking}"), 'the hero button no longer waits for the European night, the shootout and the cup night');
}

/* 2. the staged champion through the weeks: waiting in 1 to 3, on in 4, the draw in 5, the quarter in 7 */
{
  const gs1 = staged(7, 1);
  ok(gs1.cup?.status === 'waiting' && gs1.cup.joinAt === 1, 'the staged career does not begin waiting');
  ok(G.cupNight(gs1) === null && !G.cupPensDue(gs1), 'a waiting cup claims a night or a shootout in week 1');
  for (const w of [1, 2, 3]) {
    const s = G.startWeek({ ...gs1, week: w });
    ok(s.cup?.status === 'waiting' && s.cup.round === 0, `week ${w} changed the waiting cup`);
  }
  const s4 = G.startWeek({ ...gs1, week: weeks[0] });
  ok(s4.cup?.status === 'on' && s4.cup.round === 1, `week ${weeks[0]} did not put the staged champion into the quarter (status ${s4.cup?.status}, round ${s4.cup?.round})`);
  ok(s4.notices.some(n => n.title.includes('אתם מצטרפים לרבע הגמר')), 'the quarter was not told on the hub');
  ok(s4.cup?.seen === false, 'the quarter-final draw was not left for him to watch');
  const at5 = { ...s4, week: weeks[0] + 1 };
  ok(G.cupDrawDue(at5), 'the draw is not due the week after he joins');
  ok(G.cupNight(at5) === null, 'a cup night exists before the quarter-final week');
  const at7 = { ...s4, week: weeks[1], cup: { ...s4.cup!, seen: true } };
  ok(G.cupNight(at7) !== null && G.cupNight(at7)!.round === 1, `no quarter-final night in week ${weeks[1]}`);
}

/* 3. a save left waiting after week 4 is caught up when it loads */
{
  const stuck = { ...staged(9, weeks[0] + 2), phase: 'hub' as const };
  ok(stuck.cup?.status === 'waiting', 'the stuck save is not waiting to begin with');
  store.clear();
  saveCareer(stuck);
  const back = loadCareer();
  ok(back?.cup?.status === 'on' && back.cup.round === 1, `a save waiting in week ${stuck.week} still waits after loading (status ${back?.cup?.status})`);
  ok(back?.week === stuck.week && back?.phase === 'hub', 'catching the cup up moved the week or the phase');
  ok(!!back && G.cupDrawDue(back), 'the caught-up quarter-final has no draw to watch');
  ok(!!back && back.notices.some(n => n.title.includes('אתם מצטרפים לרבע הגמר')), 'the caught-up quarter-final was not told');
  // loading it again changes nothing more
  store.clear(); saveCareer(back!);
  const again = loadCareer();
  ok(JSON.stringify(again?.cup) === JSON.stringify(back?.cup), 'loading twice changed the cup twice');
  // weeks before and at the pre-bracket week are not touched: startWeek still does that one
  for (const w of [1, 2, weeks[0]]) {
    store.clear(); saveCareer(staged(9, w));
    ok(loadCareer()?.cup?.status === 'waiting', `a save waiting in week ${w} was moved on the load`);
  }
  // other cups are left as they are
  for (const [label, cup] of [['on', staged(9, 3).cup && { ...staged(9, 3).cup!, status: 'on' as const }], ['none', null]] as const) {
    store.clear(); saveCareer({ ...staged(9, weeks[0] + 2), cup: cup as never });
    ok(JSON.stringify(loadCareer()?.cup ?? null) === JSON.stringify(cup ?? null), `a save with a cup that is ${label} was changed on the load`);
  }
}

/* 4. a cup left waiting past the season is closed without a crash */
{
  const late = staged(11, weeks[3]);
  let threw = false;
  try { G.settleCupSeason(late); } catch { threw = true; }
  ok(!threw, 'settling the season with a waiting cup threw');
}

/* 5. Europe and a real cup night still hold the round */
{
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  ok(/const cupBlocking = !!cupNight \|\| cupPensDue;/.test(hub), 'the cup night and its shootout no longer hold the round');
  const state = readFileSync('src/game/state.ts', 'utf8');
  ok(state.includes('  if (euroNight(gs)) return gs;\n') && state.includes('  if (cupNight(gs)) return gs;\n'), 'startWeek no longer holds the round for the European or the cup night');
}

if (fails.length) { console.log('\nFAIL'); for (const f of fails) console.log('  ' + f); process.exit(1); }
console.log(`${checked} checks\nOK, a waiting cup never holds the league round, the champion walks into the quarter in week ${weeks[0]}, and a stuck save is caught up on load`);
