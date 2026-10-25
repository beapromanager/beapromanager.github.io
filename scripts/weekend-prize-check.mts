/**
 * What the neighbourhood league pays the career (Itzik, 25.10, option A), walked without a screen.
 *
 *   1. the money table: weekendMoney for every division and every factor of the token, 25 values, exactly
 *   2. no blowing it up with the squad: three stars signed the day before, the same sum
 *   3. no blowing it up with a promotion: the lower of the division now and the one first seen
 *   4. no gems with a prize, whatever the token says, at every place
 *   5. the month: the third title of a month pays the gems once; the month is Israel's, by the final, in any zone
 *   6. a nonce comes in once: the second time nothing moves
 *   7. a prize kept on the phone is dropped only once it is in or was in; with no career it waits
 *   8. the cabinet: places one to three, the counts, the triple marked on the third of its month
 *   9. the fans: +3, +2, +1, 0, never past 100
 *  10. an old save with titles and no cabinet loads and shows its titles
 *  11. the server's doors: a phone reaches only the public ones
 * Run: npm run check:weekendprize
 */
import { execFileSync } from 'node:child_process';
import * as G from '../src/game/state.ts';
import * as P from '../src/game/weekendPrize.ts';
import { isPublicLeagueTail, isPublicMatchTail, LEAGUE_PUBLIC, MATCH_PUBLIC } from '../src/game/weekendRoutes.ts';
import { wageBill } from '../src/game/career.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };
const Z = (y: number, m: number, d: number, hh: number, mm = 0) => Date.UTC(y, m - 1, d, hh, mm);

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); },
} });

/** a career at the hub with its club put in a division */
function career(seed: number, tier: number): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return { ...gs, phase: 'hub' as const, week: 5, league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier })) } };
}
let n = 0;
const token = (place: number, wageRounds: number, final: number, extra: Partial<P.WeekendPrizeInput> = {}): P.WeekendPrizeInput => ({
  nonce: `nonce-${++n}`, league: `league-${n}`, place, wageRounds, gems: place === 1 ? 3 : place === 2 ? 2 : 1, finished: true, nick: 'איציק', leagueName: `ליגת בניין ${n}`, final, ...extra,
});
const NOV = Z(2026, 11, 8, 18), NOV2 = Z(2026, 11, 15, 18), NOV3 = Z(2026, 11, 22, 18), NOV4 = Z(2026, 11, 29, 18), DEC = Z(2026, 12, 6, 18);

/* 1. the money table */
const TABLE: Record<number, number[]> = {
  1: [40_000, 27_000, 20_000, 13_000, 7_000],
  2: [46_000, 31_000, 23_000, 15_000, 8_000],
  3: [250_000, 167_000, 125_000, 83_000, 42_000],
  4: [350_000, 233_000, 175_000, 117_000, 58_000],
  5: [920_000, 613_000, 460_000, 307_000, 153_000],
};
const FACTORS = [1.5, 1.0, 0.75, 0.5, 0.25];
const NAMES: Record<number, string> = { 1: 'ג׳', 2: 'ב׳', 3: 'א׳', 4: 'לאומית', 5: 'על' };
const lines: string[] = [];
for (let t = 1; t <= 5; t++) {
  const row = FACTORS.map(f => G.weekendMoney(t, f));
  lines.push(`${NAMES[t].padEnd(7)} ${row.map(v => `₪${v.toLocaleString('en-US')}`.padStart(10)).join(' ')}`);
  FACTORS.forEach((f, i) => claim(G.weekendMoney(t, f) === TABLE[t][i], `weekendMoney(${t}, ${f}) is ${G.weekendMoney(t, f)}, the table says ${TABLE[t][i]}`));
}
claim(G.weekendMoney(9, 1.5) === TABLE[5][0] && G.weekendMoney(0, 1.5) === TABLE[1][0], 'a division off the range is not held to 1..5');

/* 2. no blowing it up with the squad */
{
  const a = career(11, 3);
  const sq = a.league.squads[a.clubId];
  const stars = [...sq.starters].sort((x, y) => (y.attrs ? 0 : 0) + 0).slice(0, 3).map((p, i) => ({ ...p, id: `${p.id}-star${i}` }));
  const b = { ...a, league: { ...a.league, squads: { ...a.league.squads, [a.clubId]: { ...sq, bench: [...sq.bench, ...stars] } } } };
  claim(wageBill(b.league.squads[b.clubId], 3) > wageBill(sq, 3), 'the three signings did not raise the wage bill (the check would prove nothing)');
  const ra = G.applyWeekendPrize(a, token(1, 1.5, NOV));
  const rb = G.applyWeekendPrize(b, token(1, 1.5, NOV));
  claim(ra.gs.meters.money - a.meters.money === 250_000 && rb.gs.meters.money - b.meters.money === 250_000, `a dearer squad changed the prize: ${ra.gs.meters.money - a.meters.money} against ${rb.gs.meters.money - b.meters.money}`);
}

/* 3. no blowing it up with a promotion */
{
  const c3 = career(12, 3);
  const up = G.applyWeekendPrize(c3, token(1, 1.5, NOV, { tierSeen: 1 }));
  claim(up.gs.meters.money - c3.meters.money === 40_000, `seen in ג׳ and taken in א׳ paid ${up.gs.meters.money - c3.meters.money}, wanted 40,000`);
  const c2 = career(13, 2);
  const down = G.applyWeekendPrize(c2, token(1, 1.5, NOV, { tierSeen: 3 }));
  claim(down.gs.meters.money - c2.meters.money === 46_000, `seen in א׳ and taken in ב׳ paid ${down.gs.meters.money - c2.meters.money}, wanted 46,000 (the lower)`);
  const plain = G.applyWeekendPrize(c3, token(1, 1.5, NOV));
  claim(plain.gs.meters.money - c3.meters.money === 250_000, 'without tierSeen the division now is not used');
  claim(P.prizeTier(3, 7) === 3 && P.prizeTier(3, 0) === 3 && P.prizeTier(3, null) === 3, 'a tierSeen off the range is not ignored');
}

/* 4. no gems with a prize */
{
  const c = career(14, 4);
  for (const [place, wr] of [[1, 1.5], [2, 0.75], [3, 0.5], [5, 0.25]] as const) {
    const r = G.applyWeekendPrize(c, token(place, wr, NOV, { gems: 3 }));
    claim(r.ok && r.gs.gems === c.gems, `place ${place} with token.gems 3 changed the gems by ${r.gs.gems - c.gems}`);
  }
}

/* 5. the month */
{
  let c = career(15, 2);
  const g0 = c.gems;
  for (const f of [NOV, NOV2]) c = G.applyWeekendPrize(c, token(1, 1.5, f)).gs;
  claim(c.gems === g0, 'two titles in a month paid gems');
  const third = G.applyWeekendPrize(c, token(1, 1.5, NOV3));
  claim(third.gs.gems === g0 + G.WEEKEND_TRIPLE_GEMS && G.WEEKEND_TRIPLE_GEMS === 5, `the third title of November paid ${third.gs.gems - g0} gems, wanted ${G.WEEKEND_TRIPLE_GEMS}`);
  c = third.gs;
  const fourth = G.applyWeekendPrize(c, token(1, 1.5, NOV4));
  claim(fourth.gs.gems === c.gems, 'a fourth title in November paid gems again');
  claim(c.weekend!.months!['2026-11'] === 3 && c.weekend!.bonusMonths!.join() === '2026-11', `the month record: ${JSON.stringify(c.weekend)}`);
  // two in November and one in December: nothing
  let d = career(16, 2);
  for (const f of [NOV, NOV2, DEC]) d = G.applyWeekendPrize(d, token(1, 1.5, f)).gs;
  claim(d.gems === career(16, 2).gems, 'two in November and one in December paid gems');
  // a second place does not count towards the month
  let e = career(17, 2);
  for (const [pl, f] of [[1, NOV], [1, NOV2], [2, NOV3]] as const) e = G.applyWeekendPrize(e, token(pl, pl === 1 ? 1.5 : 0.75, f)).gs;
  claim(e.weekend!.months!['2026-11'] === 2 && e.gems === career(17, 2).gems, 'a second place counted towards the triple');
  // the month is Israel's, by the final
  claim(G.weekendMonthKey(Z(2026, 11, 30, 22, 30)) === '2026-12', `30.11 22:30Z is ${G.weekendMonthKey(Z(2026, 11, 30, 22, 30))}, wanted 2026-12 (1.12 00:30 in Israel)`);
  claim(G.weekendMonthKey(Z(2026, 11, 29, 18)) === '2026-11', '29.11 18:00Z is not November');
  claim(G.weekendMonthKey(Z(2027, 3, 28, 17)) === '2027-03', '28.3.2027 17:00Z is not March');
  // taken on 2.12 for a final of 29.11: November, the token's final decides
  let f = career(18, 2);
  for (const t of [NOV, NOV2, NOV4]) f = G.applyWeekendPrize(f, token(1, 1.5, t)).gs;
  claim(f.weekend!.months!['2026-11'] === 3 && f.gems === career(18, 2).gems + 5, 'a title of 29.11 taken later did not count for November');
  // in any zone the process runs in
  for (const tz of ['UTC', 'America/New_York', 'Pacific/Kiritimati']) {
    const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', `import('./src/game/weekendPrize.ts').then(m => console.log([${Z(2026, 11, 30, 22, 30)}, ${Z(2026, 11, 29, 18)}, ${Z(2027, 3, 28, 17)}].map(m.weekendMonthKey).join(',')))`], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim();
    claim(out === '2026-12,2026-11,2027-03', `with TZ=${tz} the months read ${out}`);
  }
}

/* 6. a nonce comes in once */
{
  const c = career(19, 3);
  const t = token(1, 1.5, NOV);
  const one = G.applyWeekendPrize(c, t);
  const two = G.applyWeekendPrize(one.gs, t);
  claim(one.ok && one.reason === 'applied', 'the first time is not applied');
  claim(!two.ok && two.reason === 'duplicate' && two.message === 'הפרס הזה כבר בקופה', `the second time: ${two.reason} ${two.message}`);
  claim(JSON.stringify(two.gs) === JSON.stringify(one.gs), 'the second time changed the career (money, fans, titles, months or cabinet)');
}

/* 7. a prize kept on the phone */
{
  const c = career(20, 3);
  const t = token(2, 0.75, NOV);
  const noCareer = { ...c, clubId: '' } as G.GameState;
  const a = G.resolvePending(noCareer, t);
  claim(a.keep === true && a.gs === noCareer, 'with no career the prize was not kept');
  const b = G.resolvePending(c, t);
  claim(b.keep === false && b.gs.meters.money === c.meters.money + 125_000, `applied: keep ${b.keep}, money +${b.gs.meters.money - c.meters.money}`);
  const d = G.resolvePending(b.gs, t);
  claim(d.keep === false && d.gs === b.gs, 'a duplicate was kept or changed the career');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  claim(/G\.resolvePending\(loaded, pending\)/.test(app) && /if \(!r\.keep\) setWeekendLocal\(\{ pendingPrize: null \}\)/.test(app), 'continueCareer does not keep the pending prize on a failure');
  const ui = readFileSync('src/ui/weekend/Weekend.tsx', 'utf8');
  claim(/if \(r && !r\.keep\) \{ setPrizeWords\(r\.message\); setLocal\(\{ pendingPrize: null \}\); \}/.test(ui), 'the champion\'s card drops the token whatever happened');
  claim(/const prizeTaken = gone \|\| leaguesIn\(career\?\.weekend \?\? undefined\)\.includes\(id\) \|\| pend\?\.league === id;/.test(ui) && !/L\.claimed \?/.test(ui), 'the card still trusts the server\'s claimed flag instead of the career');
  claim(/e\.status === 409\) \{ setGone\(true\)/.test(ui), 'a 409 does not say the prize was taken');
}

/* 8. the cabinet */
{
  let c = career(21, 2);
  for (const [pl, f] of [[1, NOV], [2, NOV2], [1, NOV3], [3, NOV4], [5, DEC]] as const) c = G.applyWeekendPrize(c, token(pl, pl === 1 ? 1.5 : pl === 2 ? 0.75 : pl === 3 ? 0.5 : 0.25, f)).gs;
  const k = P.cabinetCounts(c.weekend);
  claim(c.weekend!.titles === 2 && k.first === 2 && k.second === 1 && k.third === 1 && k.shelf.length === 4, `the cabinet counts ${JSON.stringify({ titles: c.weekend!.titles, ...k, shelf: k.shelf.length })}`);
  claim(c.weekend!.appliedLeagues!.length === 5 && P.leaguesIn(c.weekend).length === 5, 'every place\'s league is not remembered as in the career');
  let t3 = career(22, 2);
  for (const f of [NOV, NOV2, NOV3]) t3 = G.applyWeekendPrize(t3, token(1, 1.5, f)).gs;
  const marks = t3.weekend!.cabinet!.map(x => x.tripleBonus);
  claim(marks.join() === 'false,false,true', `the triple is marked on ${marks.join()}`);
  claim(t3.weekend!.cabinet!.every(x => x.money === 46_000), 'the cabinet does not keep the money paid');
  const chron = t3.chronicle.filter(x => x.id.startsWith('weekend-'));
  claim(chron.length === 3 && chron[2].title.startsWith('🏆 אלוף ליגת השכונה ') && chron[2].body.includes('שלוש אליפויות בחודש, 5 יהלומים.') && chron[2].body.includes('התואר ה-3.'), `the chronicle of the triple: ${chron[2]?.title} / ${chron[2]?.body}`);
  const second = G.applyWeekendPrize(career(23, 2), token(2, 0.75, NOV)).gs.chronicle.at(-1)!;
  claim(second.title.startsWith('סגן אלוף הסופשבוע') && !/יהלום/.test(second.body), `second place's chronicle: ${second.title} / ${second.body}`);
}

/* 9. the fans */
{
  const c = career(24, 3);
  for (const [pl, want] of [[1, 3], [2, 2], [3, 1], [4, 0]] as const) {
    const r = G.applyWeekendPrize(c, token(pl, pl === 4 ? 0.25 : 0.5, NOV));
    claim(r.gs.meters.fans - c.meters.fans === want, `place ${pl}: fans +${r.gs.meters.fans - c.meters.fans}, wanted +${want}`);
  }
  const full = { ...c, meters: { ...c.meters, fans: 99 } };
  claim(G.applyWeekendPrize(full, token(1, 1.5, NOV)).gs.meters.fans === 100, 'the fans went past 100');
  claim(G.WEEKEND_FANS[1] === 3 && G.WEEKEND_FANS[2] === 2 && G.WEEKEND_FANS[3] === 1, 'WEEKEND_FANS');
}

/* 10. an old save */
{
  const c = { ...career(25, 2), weekend: { applied: ['old-1', 'old-2'], titles: 2 } };
  store.clear(); saveCareer(c);
  const back = loadCareer();
  claim(!!back && back.weekend?.titles === 2 && !back.weekend.cabinet, 'an old weekend record did not load as it was');
  const k = P.cabinetCounts(back?.weekend);
  claim(k.first === 2 && k.legacy === 2 && k.shelf.length === 0, `an old save's cabinet shows ${JSON.stringify(k)}`);
  const r = G.applyWeekendPrize(back!, token(1, 1.5, NOV));
  claim(r.ok && r.gs.weekend!.titles === 3 && P.cabinetCounts(r.gs.weekend).first === 3 && r.gs.weekend!.months!['2026-11'] === 1, 'a new title on an old save does not add up');
  const none = { ...career(26, 2) }; delete (none as { weekend?: unknown }).weekend;
  claim(P.cabinetCounts(none.weekend).first === 0 && P.monthProgress(none.weekend, NOV).count === 0, 'a career with no weekend at all breaks the cabinet');
}

/* 11. the server's doors */
{
  for (const t of ['/join', '/create', '/summary', '/result', '/settle', '/anything']) claim(!isPublicLeagueTail(t) || t === '/anything' && false, `the league door ${t} is public`);
  for (const t of ['/create', '/summary', '/result', '/join']) claim(!isPublicMatchTail(t), `the match door ${t} is public`);
  for (const t of LEAGUE_PUBLIC) claim(isPublicLeagueTail(t), `the league door ${t} is refused`);
  for (const t of MATCH_PUBLIC) claim(isPublicMatchTail(t), `the match door ${t} is refused`);
  claim(isPublicLeagueTail(undefined) && isPublicMatchTail(undefined), 'no tail is not the view');
  claim([...LEAGUE_PUBLIC].sort().join() === '/debug,/lineup,/live,/pack,/prize,/ready,/view' && [...MATCH_PUBLIC].sort().join() === '/choice,/view', 'the lists moved');
  const worker = readFileSync('worker/src/weekend.ts', 'utf8');
  claim(/if \(!isPublicMatchTail\(tail, !!env\.DEBUG\)\) return bad\('no such door', 404\);/.test(worker) && /if \(!isPublicLeagueTail\(tail\)\) return bad\('no such door', 404\);/.test(worker), 'the worker\'s router does not ask the lists');
  claim(!isPublicMatchTail('/result') && isPublicMatchTail('/result', true) && !isPublicMatchTail('/summary', true) && !isPublicMatchTail('/create', true), 'the debug door for /result is wrong (only /result, only under DEBUG)');
  // the phone uses only public doors
  const client = readFileSync('src/game/weekend.ts', 'utf8');
  const tails = [...client.matchAll(/`\/(league|match)\/\$\{[a-zA-Z]+\}(\/[a-z]+)?/g)].map(m => [m[1], m[2] ?? '/view'] as const);
  claim(tails.length >= 8, `found ${tails.length} doors in the client`);
  for (const [kind, tail] of tails) claim(kind === 'league' ? isPublicLeagueTail(tail) : isPublicMatchTail(tail), `the client calls the ${kind} door ${tail}, which the server would refuse`);
}

/* the shapes the screens rely on */
{
  const core = readFileSync('src/game/weekendCore.ts', 'utf8');
  claim(/export const PRIZE_BY_PLACE: Record<number, number> = \{ 1: 1\.5, 2: 0\.75, 3: 0\.5 \};/.test(core) && /export const GEMS_BY_PLACE: Record<number, number> = \{ 1: 3, 2: 2, 3: 1 \};/.test(core), 'the server\'s prize constants moved (they need a deploy; this change must not touch them)');
  const state = readFileSync('src/game/state.ts', 'utf8');
  const fn = state.slice(state.indexOf('export function applyWeekendPrize'), state.indexOf('export function resolvePending'));
  claim(!/wageBill/.test(fn), 'applyWeekendPrize still reads the wage bill');
  const coach = readFileSync('src/ui/screens/Coach.tsx', 'utf8');
  claim(/<WeekendCabinet gs=\{gs\} \/>/.test(coach) && /🏆 ליגת השכונה <span className="num">\{gs\.weekend!\.titles\}<\/span>/.test(coach), 'the coach\'s screen has no cabinet or no chip');
  const cab = readFileSync('src/ui/screens/Cabinet.tsx', 'utf8');
  claim(cab.includes('הארון עוד ריק. ליגת השכונה נפתחת כל חמישי ב-20:00. הגביע הראשון מחכה לך.') && cab.includes('אליפות סופשבוע') && cab.includes('החודש: משולש! ✓'), 'the cabinet\'s words');
  const css = readFileSync('src/ui/weekend/weekend.css', 'utf8');
  claim(/@keyframes wkStamp\{/.test(css) && /@keyframes wkConfetti\{/.test(css) && /prefers-reduced-motion: reduce\)\{\.wk-champ \.wk-stamp\.land/.test(css), 'the champion\'s card has no stamp, no confetti or ignores reduced motion');
}

console.log('the money table in the code (champion 1.5 · again 1.0 · third time and second place 0.75 · third 0.5 · finished 0.25):');
for (const l of lines) console.log('  ' + l);
console.log(`${checked} checks`);
if (fails.length) { console.log(`FAIL (${fails.length} of ${checked})`); for (const f of fails.slice(0, 40)) console.log('  - ' + f); process.exit(1); }
console.log('OK, the prize is the division\'s fixed sum, never the squad\'s or a promotion\'s, gems only for a month\'s third title, the fans and the cabinet count right, and a phone reaches only the public doors');
