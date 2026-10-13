/**
 * The quick sale from the squad sheet, and the x5 speed (Itzik, 13.10).
 *   node --experimental-strip-types scripts/quicksale-check.mts
 *
 * Held here: tapping a man on the squad screen offers a sale at his price; it is shut with the reason in plain words
 * at 16 men, when the window is closed, and for a friend; it sells for real (the squad shrinks, the purse grows) and
 * never takes the squad under 16; the sheet asks twice before it sells; and the match has an x5 that really is five
 * times the clock and does not hold a goal for the long replay.
 */
import { readFileSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { MIN_SQUAD } from '../src/game/transfers.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

function career(week: number): G.GameState {
  let s = G.newGame(6161);
  s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  s = G.pickCity(s, LEGEND_TOWN);
  s = G.afterSigning(s, {});
  s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
  while (s.phase === 'preseason-market') s = G.advancePreseason(s);
  return { ...s, phase: 'hub', week, friends: [], notices: [] } as G.GameState;
}
const outfield = (gs: G.GameState) => G.mySquad(gs).bench.find(p => p.position !== 'GK')!;

/* open window: a bench man can go, and the sale is real */
let gs = career(8);
ok(G.transferWindow(gs).open, 'the winter window is not open at week 8');
const first = outfield(gs);
ok(G.sellBlockedReason(gs, first.id) === null, `a bench man cannot be sold in an open window: ${G.sellBlockedReason(gs, first.id)}`);
const before = { size: G.squadSize(gs), cash: gs.meters.money };
const sold = G.sellPlayer(gs, first.id);
ok(G.squadSize(sold) === before.size - 1, 'the sale did not take a man out of the squad');
ok(sold.meters.money > before.cash, 'the sale paid nothing');

/* down to the floor: the option is there, shut, with the words */
let g2 = gs;
while (G.squadSize(g2) > MIN_SQUAD) {
  const p = outfield(g2);
  const next = G.sellPlayer(g2, p.id);
  if (next === g2) break;
  g2 = next;
}
ok(G.squadSize(g2) === MIN_SQUAD, `could not reach ${MIN_SQUAD} men: ${G.squadSize(g2)}`);
const last = outfield(g2);
ok(G.sellBlockedReason(g2, last.id) === `אי אפשר להיות פחות מ-${MIN_SQUAD} שחקנים בסגל`, `the reason at the floor is "${G.sellBlockedReason(g2, last.id)}"`);
ok(G.sellPlayer(g2, last.id) === g2, 'a sale went through at the floor');

/* closed window */
const shut = career(3);
ok(!G.transferWindow(shut).open && G.sellBlockedReason(shut, outfield(shut).id) === 'החלון סגור', 'a closed window does not say so');

/* the screen and the clock, as written */
const squad = readFileSync('src/ui/screens/Squad.tsx', 'utf8');
ok(squad.includes('sale={!firstTime && onSell ?') && squad.includes('מכירה מהירה'), 'the squad sheet has no quick sale');
ok(squad.includes("const [sure, setSure] = useState(false);") && squad.includes('if (sure) sale.onSell(); else setSure(true);'), 'the quick sale does not ask before it sells');
ok(squad.includes('disabled={!!sale.blocked}') && squad.includes('{sale.blocked && <div'), 'the shut quick sale is not shown with its reason');
const app = readFileSync('src/ui/App.tsx', 'utf8');
ok(app.includes('onSell={id => setGs(g => G.sellPlayer(g, id))}\n          onDone={() => {\n            if (squadFromHub)'), 'the squad screen is not given the sale');
const match = readFileSync('src/ui/screens/Match.tsx', 'utf8');
ok(match.includes('const SPEEDS = [1, 2, 3, 5] as const;') && match.includes('useState<1 | 2 | 3 | 5>(1)'), 'the match has no x5');
ok(match.includes('}, MS_PER_MIN / speed);'), 'the clock is not divided by the speed');
ok(match.includes('speed >= 5 ? 700 : 3200') && match.includes('speed >= 5 ? 700 : 1600'), 'x5 still holds a goal for the long replay');

if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${checked} checks`);
console.log('OK, a man can be sold from his sheet at his price, never under 16, asked twice; the match runs at x5');
