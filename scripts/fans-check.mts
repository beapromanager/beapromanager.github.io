/**
 * The terrace, and what moves it.
 *   node --experimental-strip-types scripts/fans-check.mts
 *
 * The fans meter used to move on words alone. Now the table has its say, the
 * season's verdict lands on it, selling the best man costs, and every round a
 * point of whatever the stand feels fades back toward the middle. What it
 * does is the gate. Every rule is walked through the real save: results
 * driven through commitRound with the score forced, so the figure the meter
 * moves by is measured, not read off the constant.
 */
import * as G from '../src/game/state.ts';
import { debtState, debtLimit, debtLine } from '../src/game/finance.ts';
import { fansAfterResult, fansDrift, fansAfterSeason, crowdMultiplier, ownerRope, FANS_MIDDLE, ROPE_SHORT, ROPE_LONG, FANS_WIN, FANS_LOSS, FANS_BIG_WIN, FANS_THRASHING, FANS_DERBY, FANS_CHAMPION, FANS_PROMOTED, FANS_RELEGATED, FANS_STAR_SOLD, FANS_DRIFT } from '../src/game/fans.ts';
import { isDerby } from '../src/data/clubs.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import type { MatchResult } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;

function career(seed = 4242, town = 'חיפה'): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, town);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return { ...gs, phase: 'hub' };
}
/** the round with the score forced, straight through commitRound */
function round(gs: G.GameState, mine: number, theirs: number): G.GameState {
  const fx = G.playerFixture(gs)!;
  const home = fx.homeId === gs.clubId;
  const score: [number, number] = home ? [mine, theirs] : [theirs, mine];
  const res = { seed: 1, home: { id: fx.homeId, name: 'a', stats: { possession: .5, chances: 6, goals: score[0], xg: 1 } }, away: { id: fx.awayId, name: 'b', stats: { possession: .5, chances: 6, goals: score[1], xg: 1 } }, score, events: [], ratings: {} } as unknown as MatchResult;
  return G.commitRound(gs, res);
}
const withFans = (gs: G.GameState, fans: number): G.GameState => ({ ...gs, meters: { ...gs.meters, fans } });
const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

/* 1. THE TABLE HAS ITS SAY.
      Each scoreline, from the middle so the drift is zero and the move is the
      result's alone; and from above and below, so the drift is seen too. */
{
  const base = career(1);
  // a week that is not a derby, so the plain figures are what is measured
  let plain = base;
  for (let w = 1; w <= base.league.rounds; w++) {
    const fx = G.playerFixture({ ...base, week: w })!;
    if (!isDerby(fx.homeId, fx.awayId)) { plain = { ...base, week: w }; break; }
  }
  const cases: Array<[string, number, number, number]> = [
    ['a win', 1, 0, FANS_WIN],
    ['a draw', 1, 1, 0],
    ['a loss', 0, 1, FANS_LOSS],
    ['a big win', 3, 0, FANS_WIN + FANS_BIG_WIN],
    ['a thrashing', 0, 3, FANS_LOSS + FANS_THRASHING],
  ];
  for (const [name, m, t, want] of cases) {
    const after = round(withFans(plain, 50), m, t);
    checked++;
    if (after.meters.fans !== 50 + want) fails.push(`${name} moved the terrace ${fmt(after.meters.fans - 50)}, wanted ${fmt(want)}`);
  }
  console.log(`  results: win ${fmt(FANS_WIN)}, draw 0, loss ${fmt(FANS_LOSS)}, big win ${fmt(FANS_WIN + FANS_BIG_WIN)}, thrashing ${fmt(FANS_LOSS + FANS_THRASHING)}, measured through the round`);

  // the derby doubles both ways
  let derby: G.GameState | null = null;
  for (let w = 1; w <= base.league.rounds; w++) {
    const fx = G.playerFixture({ ...base, week: w })!;
    if (isDerby(fx.homeId, fx.awayId)) { derby = { ...base, week: w }; break; }
  }
  checked++;
  if (!derby) fails.push('no derby in the fixtures to double anything');
  else {
    const dw = round(withFans(derby, 50), 1, 0).meters.fans - 50;
    const dl = round(withFans(derby, 50), 0, 3).meters.fans - 50;
    checked += 2;
    if (dw !== FANS_WIN * FANS_DERBY) fails.push(`a derby win moved the terrace ${fmt(dw)}, wanted ${fmt(FANS_WIN * FANS_DERBY)}`);
    if (dl !== (FANS_LOSS + FANS_THRASHING) * FANS_DERBY) fails.push(`a derby thrashing moved the terrace ${fmt(dl)}, wanted ${fmt((FANS_LOSS + FANS_THRASHING) * FANS_DERBY)}`);
    console.log(`  derby: ${fmt(dw)} for a win, ${fmt(dl)} for a thrashing`);
  }

  // the forgetting: a point toward the middle after the result, and not past it
  const high = round(withFans(plain, 80), 1, 1).meters.fans;
  const low = round(withFans(plain, 20), 1, 1).meters.fans;
  const edge = round(withFans(plain, 51), 1, 1).meters.fans;
  checked += 3;
  if (high !== 80 - FANS_DRIFT) fails.push(`a draw at 80 left the terrace at ${high}, wanted ${80 - FANS_DRIFT}`);
  if (low !== 20 + FANS_DRIFT) fails.push(`a draw at 20 left the terrace at ${low}, wanted ${20 + FANS_DRIFT}`);
  if (edge !== 50) fails.push(`a draw at 51 left the terrace at ${edge}, the drift went past the middle`);
  // pure: the drift never crosses, whatever the distance
  checked++;
  if ([0, 1, 49, 50, 51, 99, 100].some(f => Math.sign(f + fansDrift(f) - 50) !== Math.sign(f - 50) && f + fansDrift(f) !== 50)) fails.push('the drift crosses the middle');
  console.log(`  drift: a point a round toward 50, and it stops there`);
}

/* 2. THE SEASON'S VERDICT, AND THE SALE. */
{
  const gs = career(2);
  const verdicts: Array<['champion' | 'promoted' | 'relegated' | 'stayed', number]> = [['champion', FANS_CHAMPION], ['promoted', FANS_PROMOTED], ['relegated', FANS_RELEGATED], ['stayed', 0]];
  for (const [v, want] of verdicts) {
    // the pure sum first; the wiring is exercised below by a season won
    checked++;
    if (fansAfterSeason(v) !== want) fails.push(`${v} is worth ${fansAfterSeason(v)}, wanted ${want}`);
  }
  // wiring: play a season out from the top and see the champion's bonus land
  let s = career(3);
  for (let i = 0; i < 20 && !s.seasonOver; i++) {
    s = round(s, 3, 0);
    s = G.continueFromResult(s);
    while (s.phase === 'press') s = G.answerPress(s, 1);
    if ((s as { phase: string }).phase === 'chat') s = G.closeChat(s);
    while (s.notices.length) s = G.dismissNotice(s);
    if (s.phase !== 'hub' && s.phase !== 'season-end') break;
  }
  checked++;
  if (s.phase !== 'season-end') fails.push(`the season did not end (${s.phase})`);
  else {
    const before = s.meters.fans;
    const next = G.startNextSeason(s);
    const table = G.sortedTable(s.league);
    const top = table[0]?.clubId === s.clubId;
    checked++;
    if (top && next.meters.fans !== Math.min(100, before + FANS_CHAMPION)) fails.push(`winning the league moved the terrace ${fmt(next.meters.fans - before)}, wanted ${fmt(FANS_CHAMPION)}`);
    if (!top) fails.push('fourteen wins did not finish top, so the champion bonus was not exercised');
    console.log(`  season: the champion's terrace ${before} -> ${next.meters.fans}`);
  }
  // the sale of the best man, through the summer's own path: the offer is on
  // the board whenever there is a star to buy, and a career opens with one
  let p = G.enterPreseason({ ...career(4), phase: 'preseason-market' } as never);
  const offer = G.preseasonEvents(p).find(e => e.id === 'dep-star');
  checked++;
  if (!offer) fails.push('no offer for the star this summer, so the sale could not be measured');
  else {
    const before = p.meters.fans;
    p = G.resolveDeparture(p, 'star', 0);
    checked++;
    if (p.meters.fans !== before + FANS_STAR_SOLD) fails.push(`selling the star moved the terrace ${fmt(p.meters.fans - before)}, wanted ${fmt(FANS_STAR_SOLD)}`);
    console.log(`  sale: the best man sold, ${fmt(FANS_STAR_SOLD)}`);
  }
  void gs;
}

/* 3. WHAT IT DOES: THE GATE. */
{
  const gs = { ...career(5), week: 1 };
  let home = gs;
  for (let w = 1; w <= gs.league.rounds; w++) { const fx = G.playerFixture({ ...gs, week: w })!; if (fx.homeId === gs.clubId && !isDerby(fx.homeId, fx.awayId)) { home = { ...gs, week: w }; break; } }
  const at = (f: number) => G.attendanceFill(withFans(home, f), false);
  checked += 4;
  if (Math.abs(crowdMultiplier(0) - 0.75) > 1e-9 || Math.abs(crowdMultiplier(50) - 1) > 1e-9 || Math.abs(crowdMultiplier(100) - 1.25) > 1e-9) fails.push('the crowd multiplier is not 0.75 / 1.0 / 1.25 at 0 / 50 / 100');
  if (Math.abs(at(0) / at(50) - 0.75) > 0.02) fails.push(`a hated manager fills ${Math.round(100 * at(0) / at(50))}% of a liked one's ground, wanted 75%`);
  if (at(100) <= at(50)) fails.push('a loved manager does not fill the ground fuller');
  if (at(100) > 0.99) fails.push('the fill went past the ground');
  // and it is money: the same home round, twice
  const g0 = round(withFans(home, 0), 1, 1).lastLedger!.gate;
  const g100 = round(withFans(home, 100), 1, 1).lastLedger!.gate;
  checked++;
  if (!(g100 > g0)) fails.push(`the gate does not rise with the terrace (${g0} vs ${g100})`);
  console.log(`  gate: fill ${Math.round(100 * at(0))}% / ${Math.round(100 * at(50))}% / ${Math.round(100 * at(100))}% at 0 / 50 / 100, gate ₪${g0} -> ₪${g100}`);
}

/* 4. A SEASON, END TO END: the table beats the microphone. */
{
  // the same club, the same weeks, the same answers: one wins them all, one loses them all
  const run = (mine: number, theirs: number): number => {
    let s = career(6);
    for (let i = 0; i < 14 && !s.seasonOver; i++) {
      s = G.continueFromResult(round(s, mine, theirs));
      while (s.phase === 'press') s = G.answerPress(s, 0);   // the tempting line every time
      if ((s as { phase: string }).phase === 'chat') s = G.closeChat(s);
      while (s.notices.length) s = G.dismissNotice(s);
      if (s.phase !== 'hub' && s.phase !== 'season-end') break;
    }
    return s.meters.fans;
  };
  const winner = run(2, 0), loser = run(0, 2);
  checked += 2;
  if (winner - loser < 30) fails.push(`a season of wins and a season of losses end ${winner} and ${loser} on the terrace; the table barely counts`);
  if (loser > 50) fails.push(`a season of losses with a silver tongue still ends above the middle (${loser})`);
  console.log(`  a season: win them all ${winner}, lose them all ${loser}, both with the boldest press answers`);
}

/* 5. WHAT IT ALSO DOES: THE OWNER'S ROPE.
      The limit the owner will carry is one season's participation money, bent
      by the terrace the same way the gate is: 0.8 at an empty ground, 1.0 in
      the middle, 1.2 at a full one. Everything here is read through the real
      save, because the point is not the formula, it is that the same debt
      ends one career and not another. */
{
  checked += 3;
  if (ownerRope(FANS_MIDDLE) !== 1) fails.push(`a terrace with no opinion moves the rope to ${ownerRope(FANS_MIDDLE)}`);
  if (Math.abs(ownerRope(0) - 0.8) > 1e-9) fails.push(`an empty ground leaves the rope at ${ownerRope(0)}`);
  if (Math.abs(ownerRope(100) - 1.2) > 1e-9) fails.push(`a full one stretches it to ${ownerRope(100)}`);
  // and it only ever goes one way, so there is no pocket of the scale where
  // being better liked costs you
  checked++;
  for (let f = 1; f <= 100; f++) if (ownerRope(f) <= ownerRope(f - 1)) fails.push(`the rope does not grow from ${f - 1} to ${f}`);

  // the ladder is untouched: the warnings still land at the same fractions of
  // whatever the limit turned out to be
  checked++;
  for (const tier of [1, 3, 5]) for (const f of [0, 30, 50, 80, 100]) {
    const lim = debtState(0, tier, f).limit;
    const at = (r: number) => debtState(-lim * r, tier, f).level;
    if (at(0.2) !== 'watched' || at(0.5) !== 'warned' || at(0.8) !== 'final' || at(1.0) !== 'sacked')
      fails.push(`tier ${tier} at fans ${f}: the ladder of warnings moved`);
  }

  // an old call, with no terrace passed, is the club on its own
  checked++;
  for (const tier of [1, 2, 3, 4, 5])
    if (debtState(-100, tier).limit !== debtLimit(tier)) fails.push(`tier ${tier}: the bare limit is no longer the club's own`);

  // through the save: one purse, two terraces, two different men
  const gs = career();
  const purse = -Math.round(debtLimit(G.club(gs).tier) * 0.9);
  const hostile = G.debt(withFans({ ...gs, meters: { ...gs.meters, money: purse } }, 10));
  const loving = G.debt(withFans({ ...gs, meters: { ...gs.meters, money: purse } }, 95));
  checked += 2;
  if (hostile.level !== 'sacked') fails.push(`nine tenths of the rope with an empty ground is only ${hostile.level}`);
  if (loving.level === 'sacked') fails.push('nine tenths of the rope with a full ground still ends the career');
  const gap = loving.headroom - hostile.headroom;
  checked++;
  if (gap <= 0) fails.push(`a full ground buys ${gap} of headroom`);

  // the scripted collapse is still past the line at the most loving terrace
  // there is, or the story beat would land on a manager who is fine
  checked++;
  const hole = -Math.round(debtLimit(3) * 1.5);
  if (debtState(hole, 3, 100).level !== 'sacked') fails.push('the crisis no longer lands past the line when the terrace adores him');

  // and the owner says which it is, but only when it is worth saying
  checked += 3;
  const said = (f: number) => debtLine(debtState(-debtLimit(3) * 0.5, 3, f));
  if (!said(ROPE_SHORT).includes('קצרה מהרגיל')) fails.push('an empty ground goes unmentioned');
  if (!said(ROPE_LONG).includes('לספוג קצת יותר')) fails.push('a full ground goes unmentioned');
  if (said(FANS_MIDDLE) !== debtLine({ ...debtState(-debtLimit(3) * 0.5, 3, FANS_MIDDLE), fans: FANS_MIDDLE }) || /הסבלנות|לספוג/.test(said(FANS_MIDDLE)))
    fails.push(`a terrace with no opinion still gets a sentence: "${said(FANS_MIDDLE)}"`);

  console.log(`  the rope: ${(ownerRope(0) * 100).toFixed(0)}% empty, 100% in the middle, ${(ownerRope(100) * 100).toFixed(0)}% full; a full ground buys ₪${gap.toLocaleString('en-US')} at tier ${G.club(gs).tier}`);
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 10).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the terrace answers to the table, and forgets');
process.exit(fails.length ? 1 : 0);
