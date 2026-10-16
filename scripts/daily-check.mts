/**
 * The daily gift (Itzik, 12.10): come in and play every day, and the president hands you something.
 *   node --experimental-strip-types scripts/daily-check.mts
 *
 * What is held here is the set of rules he gave, walked on a real game with the clock handed in:
 *  - only today's gift can be taken, once, and only after a round was played today;
 *  - miss a day and the run starts from the first gift, and so does the count to thirty;
 *  - the seventh gift is a boost pack, the thirtieth day of an unbroken run a gold player five above his league;
 *  - the money is the economist's table per division, the gems are three a week;
 *  - winding the phone back gives nothing;
 *  - the door is shut: with DAILY_LIVE false nothing changes in any career and nothing can be taken.
 */
import { readFileSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { openPack, packById } from '../src/game/packs.ts';
import {
  DAILY_WEEK, GOLD_EVERY, GOLD_LIFT, rewardFor, posOfStreak, dayKey, addDays, emptyDaily, dailyView, today, gemsAWeek, dailyPackFor, STAR_FROM_TIER,
} from '../src/game/daily.ts';

const fails: string[] = [];
let checked = 0;

/* a Tuesday noon in Israel, and the same clock a number of days on */
const T0 = Date.parse('2026-10-13T12:00:00+03:00');
const DAY = 86_400_000;
const at = (d: number, hour = 12) => T0 + d * DAY + (hour - 12) * 3_600_000;

function career(seed: number, tier = 1): G.GameState {
  let s = G.newGame(seed);
  s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  s = G.pickCity(s, LEGEND_TOWN);
  s = G.afterSigning(s, {});
  s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
  while (s.phase === 'preseason-market') s = G.advancePreseason(s);
  const id = s.clubId;
  s = { ...s, phase: 'hub', week: 2, friends: [], notices: [], league: { ...s.league, clubs: s.league.clubs.map(c => c.id === id ? { ...c, tier } : c) } } as G.GameState;
  return s;
}
/** a day lived: a round played, then today's gift taken */
function live(gs: G.GameState, d: number): G.GameState {
  const played = G.markPlayed(gs, at(d), true);
  return G.claimDaily(played, at(d), true);
}
/** gift taken and the card it brought (if any) dealt with, so the next day is free to take its own */
function liveAndClear(gs: G.GameState, d: number): G.GameState {
  const taken = live(gs, d);
  return taken.pull ? { ...taken, pull: null } : taken;
}

/* 1. THE TABLE: the economist's money per division, three gems a week, the pack on the seventh */
{
  checked += 5 * 3 + 3;
  // 16.10, Itzik: "תלך על 1.5": a week is one and a half rounds of wages in every division
  const WEEK = { 1: 40_000, 2: 46_000, 3: 250_000, 4: 350_000, 5: 920_000 } as Record<number, number>;
  for (let tier = 1; tier <= 5; tier++) {
    const days = Array.from({ length: DAILY_WEEK }, (_, i) => rewardFor(tier, i + 1));
    const total = days.reduce((a, r) => a + r.money, 0);
    if (total !== WEEK[tier]) fails.push(`tier ${tier}: a week of money is ${total}, the measured table says ${WEEK[tier]}`);
    for (let i = 1; i < DAILY_WEEK; i++) if (days[i].money < days[i - 1].money) fails.push(`tier ${tier}: day ${i + 1} gives less money than day ${i}`);
    if (days.some((r, i) => r.pack !== (i === DAILY_WEEK - 1))) fails.push(`tier ${tier}: the pack is not on the seventh day alone`);
  }
  const gemRow = (t: number) => Array.from({ length: DAILY_WEEK }, (_, i) => rewardFor(t, i + 1).gems).join(',');
  for (const [t, want] of [[1, '0,0,1,0,1,1,0'], [2, '0,0,1,0,1,1,0'], [3, '0,1,1,0,1,1,0'], [4, '0,1,1,0,1,1,0'], [5, '0,1,1,1,1,1,0']] as const) {
    if (gemRow(t) !== want) fails.push(`tier ${t}: the gems of the week are ${gemRow(t)}, wanted ${want}`);
  }
  for (const [t, want] of [[1, 3], [2, 3], [3, 4], [4, 4], [5, 5]] as const) if (gemsAWeek(t) !== want) fails.push(`tier ${t}: ${gemsAWeek(t)} gems a week, wanted ${want}`);
  // the seventh day is a boost up to ליגה א׳ and a star from the Leumit up, never a star below it
  for (const t of [1, 2, 3]) if (rewardFor(t, 7).packId !== 'boost' || dailyPackFor(t) !== 'boost') fails.push(`tier ${t}: the seventh day is not a boost pack`);
  for (const t of [4, 5]) if (rewardFor(t, 7).packId !== 'star' || dailyPackFor(t) !== 'star') fails.push(`tier ${t}: the seventh day is not a star pack`);
  if (STAR_FROM_TIER !== 4) fails.push('the star pack does not start at the Leumit');
  for (let t = 1; t <= 5; t++) for (let p = 1; p < 7; p++) if (rewardFor(t, p).packId !== null) fails.push(`tier ${t} day ${p}: a pack on a day that is not the seventh`);
  const st = readFileSync('src/game/state.ts', 'utf8');
  if (!st.includes("openPack(packById(dailyPackFor(club(gs).tier))")) fails.push('the seventh day opens the same pack in every division');
  if (rewardFor(1, 7).money >= rewardFor(5, 1).money * 10) fails.push('the top flight gift is nothing next to the bottom one');
  if (rewardFor(2, 1).money < 1000 || rewardFor(1, 1).money < 1000) fails.push('the first gift is under a thousand, which nobody would feel');
}

/* 2. THE CALENDAR: an Israeli day, not a UTC one */
{
  checked += 6;
  if (dayKey(Date.parse('2026-10-12T21:30:00Z')) !== '2026-10-13') fails.push('half past midnight in Israel is still the day before');
  if (dayKey(Date.parse('2026-10-12T20:30:00Z')) !== '2026-10-12') fails.push('half past eleven at night in Israel is already tomorrow');
  if (addDays('2026-10-31', 1) !== '2026-11-01' || addDays('2026-12-31', 1) !== '2027-01-01') fails.push('a day after the end of a month is wrong');
  if (addDays('2026-03-01', -1) !== '2026-02-28') fails.push('a day before the first of March is wrong');
  if (posOfStreak(1) !== 1 || posOfStreak(7) !== 7 || posOfStreak(8) !== 1 || posOfStreak(30) !== 2) fails.push('the place in the week is wrong');
  if (today({ ...emptyDaily(), maxDay: '2026-10-20' }, at(0)) !== '2026-10-20') fails.push('a phone wound back is believed');
}

/* 3. THE RULES, walked on real careers */
for (const seed of [6161, 77, 4040]) {
  const tag = `#${seed}`;
  const start = career(seed);
  const tier = G.club(start).tier;
  checked += 22;

  // not played, not given
  if (G.claimDaily(start, at(0), true) !== start) fails.push(`${tag}: a gift was taken before any round was played`);
  if (G.dailyViewOf(start, at(0), true).canClaim) fails.push(`${tag}: the button is live before a round was played`);

  // day 1
  const d1 = live(start, 0);
  if (d1.daily.streak !== 1) fails.push(`${tag}: the first gift did not start a run (${d1.daily.streak})`);
  if (d1.meters.money !== start.meters.money + rewardFor(tier, 1).money) fails.push(`${tag}: day 1 paid ${d1.meters.money - start.meters.money}, the table says ${rewardFor(tier, 1).money}`);
  if (d1.gems !== start.gems) fails.push(`${tag}: day 1 gave gems`);
  if (G.claimDaily(d1, at(0, 20), true) !== d1) fails.push(`${tag}: today's gift can be taken twice`);

  // day 2 needs its own round
  if (G.claimDaily(d1, at(1), true) !== d1) fails.push(`${tag}: tomorrow's gift was taken without a round played tomorrow`);
  const d2 = live(d1, 1);
  if (d2.daily.streak !== 2) fails.push(`${tag}: the second day did not make a run of two`);

  // a missed day starts again from the first
  const gap = live(d2, 3);
  if (gap.daily.streak !== 1) fails.push(`${tag}: a missed day did not send the run back to the first gift (${gap.daily.streak})`);
  if (gap.meters.money !== d2.meters.money + rewardFor(tier, 1).money) fails.push(`${tag}: after a break the gift was not the first one`);
  if (!G.dailyViewOf(G.markPlayed(d2, at(3), true), at(3), true).broken) fails.push(`${tag}: the screen does not say the run broke`);

  // a week: the table's seven, three gems, a pack on the seventh and a card on no other day
  const six = (() => { let x = start; for (let d = 0; d < 6; d++) x = liveAndClear(x, d); return x; })();
  let w = six;
  const money0 = start.meters.money, gems0 = start.gems;
  for (let d = 0; d < 6; d++) if (live(d === 0 ? start : (() => { let x = start; for (let k = 0; k < d; k++) x = liveAndClear(x, k); return x; })(), d).pull) fails.push(`${tag}: day ${d + 1} brought a card`);
  const seventh = live(six, 6);
  if (!seventh.pull) fails.push(`${tag}: the seventh day brought no pack`);
  else {
    if (G.sellPull(seventh).pull) fails.push(`${tag}: the pack did not leave the reveal when sold`);
    const signed = G.signPull(seventh);
    if (signed.pull || G.squadSize(signed) !== G.squadSize(seventh) + 1) fails.push(`${tag}: the pack of the seventh day cannot be signed`);
  }
  w = liveAndClear(six, 6);
  const sum = [1, 2, 3, 4, 5, 6, 7].reduce((a, p) => a + rewardFor(tier, p).money, 0);
  if (w.gems - gems0 !== gemsAWeek(tier)) fails.push(`${tag}: a week gave ${w.gems - gems0} gems, wanted ${gemsAWeek(tier)}`);
  if (w.meters.money - money0 !== sum) fails.push(`${tag}: a week paid ${w.meters.money - money0}, the table's seven are ${sum}`);
  // the eighth day is the first again
  const w8 = liveAndClear(w, 7);
  if (w8.daily.streak !== 8 || posOfStreak(w8.daily.streak) !== 1) fails.push(`${tag}: the eighth day is not the first gift of a new week`);
  if (w8.meters.money - w.meters.money !== rewardFor(tier, 1).money) fails.push(`${tag}: the new week did not start with the first gift`);

  // winding the phone back gives nothing
  const wound = G.claimDaily(G.markPlayed(d1, at(-3), true), at(-3), true);
  if (wound.daily.streak !== d1.daily.streak || wound.meters.money !== d1.meters.money) fails.push(`${tag}: a phone wound back took another gift`);
  if (G.dailyViewOf(d1, at(-3), true).canClaim) fails.push(`${tag}: a phone wound back opens the button`);

  // a card already waiting holds the gift
  const waiting = { ...G.markPlayed(d1, at(1), true), pull: G.rollFreeBoost(d1) } as G.GameState;
  if (G.claimDaily(waiting, at(1), true) !== waiting) fails.push(`${tag}: a gift was taken over a card waiting in the reveal`);

  // the door
  if (G.markPlayed(start, at(0), false) !== start) fails.push(`${tag}: with the door shut a round changes the state`);
  const played = G.markPlayed(start, at(0), true);
  if (G.claimDaily(played, at(0), false) !== played) fails.push(`${tag}: a gift was taken with the door shut`);
}

/* 4. THIRTY DAYS: the gold player, exactly five above the league, and only for an unbroken run */
for (const seed of [6161, 5151, 31, 9091, 555, 12007]) {
  checked += 5;
  const start = career(seed);
  let gs = start;
  for (let d = 0; d < 29; d++) gs = liveAndClear(gs, d);
  if (gs.daily.streak !== 29) fails.push(`#${seed}: twenty nine days did not make a run of twenty nine`);
  const thirty = live(gs, 29);
  const avg = G.leagueAvgOvr(thirty);
  if (!thirty.pull) { fails.push(`#${seed}: the thirtieth day brought no player`); continue; }
  const o = overall(thirty.pull.player);
  if (GOLD_LIFT !== 5 || GOLD_EVERY !== 30) fails.push(`the gold player is ${GOLD_LIFT} above every ${GOLD_EVERY} days, Itzik said 5 above and thirty days`);
  if (o !== avg + 5) fails.push(`#${seed}: the gold player is ${o}, the league is ${avg}, wanted exactly ${avg + 5}`);
  if (thirty.daily.gold !== 1) fails.push(`#${seed}: the gold player was not counted`);
  // a break on the way and the thirtieth day is only a first
  let broken = start;
  for (let d = 0; d < 29; d++) if (d !== 14) broken = liveAndClear(broken, d);
  const late = live(broken, 29);
  if (late.pull && late.daily.streak !== 15) fails.push(`#${seed}: a broken run still got the gold player`);
}

/* 4b. THE SEVENTH DAY: from the Leumit up the free card is a star pack, and it shows in the player it brings (16.10) */
{
  const gap = (tier: number, free: boolean) => {
    let sum = 0;
    for (let s = 1; s <= 40; s++) {
      const c = career(900 + s, tier);
      const p = free ? G.rollFreeBoost(c) : openPack(packById('boost'), tier, createRng(900 + s), {});
      sum += overall(p.player) - G.leagueAvgOvr(c);
    }
    return sum / 40;
  };
  checked += 2;
  const topFree = gap(5, true), topBoost = gap(5, false);
  if (topFree - topBoost < 1.5) fails.push(`in ליגת העל the seventh day brings a card ${topFree.toFixed(1)} over the league, a boost pack ${topBoost.toFixed(1)}: the star pack does not show`);
  const lowFree = gap(3, true), lowBoost = gap(3, false);
  if (Math.abs(lowFree - lowBoost) > 1.5) fails.push(`in ליגה א׳ the seventh day brings a card ${lowFree.toFixed(1)} over the league, a boost pack ${lowBoost.toFixed(1)}: it is not a boost`);
}

/* 5. THE SCREENS: only today's gift is a button, and nothing else can be pressed */
{
  checked += 13;
  const sheet = readFileSync('src/ui/screens/DailyGift.tsx', 'utf8');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  const state = readFileSync('src/game/state.ts', 'utf8');
  const daily = readFileSync('src/game/daily.ts', 'utf8');

  if (!/export const DAILY_LIVE = true;/.test(daily)) fails.push('the door is shut: DAILY_LIVE is not true (Itzik opened it on 12.10)');
  if (!state.includes('return markPlayed(maybeCrisis(checkTheBooks(')) fails.push('a league round does not count as a round played');
  if (!state.includes('return markPlayed({\n    ...gs,\n    euro: after.euro,') && !state.includes('return markPlayed({\r\n    ...gs,\r\n    euro: after.euro,')) fails.push('a European night does not count as a round played');
  if (!sheet.includes("return st === 'today' ? (") || !sheet.includes('<button key={pos} className="daily-tile" data-state="today"')) fails.push("today's gift is not the one button");
  if (!/<div key=\{pos\} className="daily-tile" data-state=\{st\}[^>]*aria-disabled="true">/.test(sheet)) fails.push('the other days are not dead divs');
  if (!sheet.includes('onClick={v.canClaim ? onClaim : undefined}')) fails.push("today's tile takes a press when the gift cannot be taken");
  if (!css.includes('.daily-tile[data-state="later"]{') || !/data-state="later"\][^}]*pointer-events:none/.test(css)) fails.push('the days to come take a press');
  if (!css.includes('filter:grayscale(1)')) fails.push('the days to come are not grey');
  if (!hub.includes('{DAILY_LIVE && onDaily && <DailyHubCard gs={gs} onOpen={onDaily} />}')) fails.push('the hub card shows with the door shut');
  if (!app.includes('{DAILY_LIVE && gs.phase === \'hub\' && gs.notices.length === 0 && dailyOpen && !dailyWow && (')) fails.push('the table opens with the door shut');
  if (!app.includes('const next = G.claimDaily(gs);') || !app.includes('<DailyClaim reward={dailyWow.reward}')) fails.push('taking the gift does not run the celebration');
  if (!app.includes('squadFull={G.squadSize(gs) >= G.MAX_SQUAD}')) fails.push('the pack of the seventh day cannot meet a full squad');
  if (!css.includes('.dwow-ring{') || !css.includes('@keyframes dwowPop')) fails.push('the celebration has no ring and no pop');
}

if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 14)) console.log('  - ' + f);
  if (fails.length > 14) console.log(`  ... and ${fails.length - 14} more`);
  process.exit(1);
}
console.log(`${checked} checks`);
console.log('OK, one gift a day, only today\'s, only after a round, a break starts again, and the thirtieth day brings a gold player five above the league');
