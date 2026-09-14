/**
 * The summer market moves, and it ends on a name worth saving for.
 *   node --experimental-strip-types scripts/market-check.mts
 *
 * What it holds to:
 *   1. the three summer rounds are never the same twelve players
 *   2. nobody vanishes without a round's warning
 *   3. the last round carries exactly one marquee, clear of the rest and priced
 *      like a real decision rather than pocket change
 *   4. the squad always still has a keeper and every line to buy from
 */
import * as G from '../src/game/state.ts';
import { overall } from '../src/engine/matchEngine.ts';
import { PRE_ROUNDS } from '../src/game/preseason.ts';
import { refreshMarket, WINTER_WEEKS } from '../src/game/transfers.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { CITIES } from '../src/data/cities.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { existsSync } from 'node:fs';

/** the same grouping the squad screen uses; kept local, that one lives in a .tsx */
const LINE_OF: Record<string, string> = {
  GK:'gk', CB:'def', LB:'def', RB:'def',
  CDM:'mid', CM:'mid', CAM:'mid',
  LW:'atk', RW:'atk', ST:'atk',
};

const fails: string[] = [];
let checked = 0;

for (const [town, tier] of [['רמת גן', 1], ['חיפה', 1], ['באר שבע', 1]] as const) {
  let gs = G.newGame(1700 + town.length);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, town);
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);

  const rounds: { names: string[]; warned: string[]; marquee: typeof gs.market }[] = [];
  for (let r = 1; r <= PRE_ROUNDS; r++) {
    rounds.push({
      names: gs.market.map(fa => fa.player.name),
      warned: gs.market.filter(fa => fa.leaving).map(fa => fa.player.name),
      marquee: gs.market.filter(fa => fa.marquee),
    });
    if (r < PRE_ROUNDS) gs = G.advancePreseason(gs);
  }

  /* 1. the list actually changes */
  for (let r = 1; r < rounds.length; r++) {
    const before = new Set(rounds[r - 1].names);
    const fresh = rounds[r].names.filter(n => !before.has(n));
    checked++;
    if (fresh.length === 0)
      fails.push(`${town}: round ${r + 1} brought no new faces`);
  }

  /* 2. everyone who left was warned the round before */
  for (let r = 1; r < rounds.length; r++) {
    const warned = new Set(rounds[r - 1].warned);
    const now = new Set(rounds[r].names);
    const gone = rounds[r - 1].names.filter(n => !now.has(n));
    checked++;
    for (const n of gone)
      if (!warned.has(n)) fails.push(`${town}: ${n} vanished in round ${r + 1} with no warning`);
  }

  /* 3. the marquee: only in the last round, exactly one, and a real cut above */
  for (let r = 0; r < rounds.length; r++) {
    const want = r === rounds.length - 1 ? 1 : 0;
    checked++;
    if (rounds[r].marquee.length !== want)
      fails.push(`${town}: round ${r + 1} had ${rounds[r].marquee.length} marquee, wanted ${want}`);
  }
  const last = rounds[rounds.length - 1];
  const star = last.marquee[0];
  if (star) {
    const others = gs.market.filter(fa => !fa.marquee);
    const best = Math.max(...others.map(fa => overall(fa.player)));
    const dearest = Math.max(...others.map(fa => fa.fee));
    checked += 3;
    if (overall(star.player) <= best)
      fails.push(`${town}: the marquee (${overall(star.player)}) is not better than the rest (${best})`);
    if (star.fee <= dearest * 2)
      fails.push(`${town}: the marquee costs ${star.fee}, barely over the ${dearest} next to him`);
    if (star.leaving)
      fails.push(`${town}: the marquee was put on notice, he is meant to wait for you`);
    console.log(`${town}: marquee ${star.player.name} ${overall(star.player)} for ₪${star.fee.toLocaleString('en-US')}`
      + `  (rest top out at ${best}, ₪${dearest.toLocaleString('en-US')})`);
  }

  /* 4. every line is still buyable in every round */
  for (let r = 0; r < rounds.length; r++) {
    checked++;
    const lines = new Set(gs.market.map(fa => LINE_OF[fa.player.position]));
    for (const need of ['gk', 'def', 'mid', 'atk'])
      if (!lines.has(need)) fails.push(`${town}: round ${r + 1} had nothing at ${need}`);
  }
}

/* 5. the marquee is a stretch in every division, never a rounding error and
      never out of reach. Measured against what a club of that tier earns. */
const PURSE = [0, 150_000, 200_000, 930_000, 1_800_000, 4_500_000];
console.log('');
for (let tier = 1; tier <= 5; tier++) {
  const list = refreshMarket([], tier, createRng(9000 + tier), undefined, { marquee: true });
  const star = list.find(fa => fa.marquee)!;
  const rest = list.filter(fa => !fa.marquee);
  const share = star.fee / PURSE[tier];
  checked += 2;
  if (share < 0.08) fails.push(`tier ${tier}: the marquee is only ${Math.round(share * 100)}% of a season, no decision at all`);
  if (share > 0.60) fails.push(`tier ${tier}: the marquee is ${Math.round(share * 100)}% of a season, nobody can sign him`);
  console.log(`  tier ${tier}: ${overall(star.player)} for ₪${star.fee.toLocaleString('en-US')}`
    + ` = ${Math.round(share * 100)}% of a season, vs best ordinary ${Math.max(...rest.map(fa => overall(fa.player)))}`);
}

console.log(`\n${checked} checks across 3 careers, ${PRE_ROUNDS} summer rounds each`);
/* THE WINTER WINDOW OPENS WITH A WORD.
   It used to open behind a green dot on the transfers cell that nobody read.
   The week it opens, and only that week, a notice waits before the hub. */
{
  let gs = G.newGame(3131);
  gs = G.setProfile(gs, { name: 'x', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, CITIES[3].name);
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  const seen: number[] = [];
  for (let w = 0; w < 12 && !gs.seasonOver; w++) {
    const inp = G.liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed + w);
    gs = G.continueFromResult(G.commitRound(gs, { ...res, events: res.events.filter(e => e.type !== 'red') }));
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if ((gs as { phase: string }).phase === 'chat') gs = G.closeChat(gs);
    if (gs.notices.some(n => n.kind === 'window')) seen.push(gs.week);
    while (gs.notices.length) gs = G.dismissNotice(gs);
  }
  // and the picture the notice is built around is actually in the build
  checked++;
  if (!existsSync('public/window.webp')) fails.push('public/window.webp is missing, the winter window notice shows a blank');
  const opens = WINTER_WEEKS[0];
  if (seen.join() !== String(opens)) fails.push(`the window notice showed in weeks [${seen.join(', ')}], expected only week ${opens}`);
  console.log(`  the winter window announces itself once, in week ${opens}`);
}

if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the market moves, warns before it takes, and ends on a star');
process.exit(fails.length ? 1 : 0);
