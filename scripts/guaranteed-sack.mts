/**
 * The crisis: hard, never impossible.
 *
 * This used to hold the opposite promise, "every manager gets sacked once, at
 * 100%", and the money collapsed to one and a half times the owner's line so
 * there was no trading out of it. Measured over 100 careers that reached
 * ליגה א׳, every one was sacked that season, selling or not, and on 3.10 Itzik
 * changed the rule: the collapse lands at NINE TENTHS of the line. What must
 * hold now, and what this proves:
 *   the crisis still finds everyone who arrives (once, round four, א׳ or לאומית)
 *   it lands as the FINAL WARNING at a neutral terrace, never the axe on the spot
 *   the warning still comes before any sack, never on the week the money went
 *   a manager can climb out: one sale puts real air under him
 *   and the one who does nothing still meets the letter most of the time
 *
 *   node --experimental-strip-types scripts/guaranteed-sack.mts
 */

import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { debtState } from '../src/game/finance.ts';
import { FANS_MIDDLE } from '../src/game/fans.ts';

const CITIES = ['חולון', 'ראש העין', 'אזור', 'נתניה', 'רחובות', 'כפר סבא', 'לוד', 'חדרה'];

interface Run {
  sacked: boolean;
  tier: number;
  season: number;
  crisisCame: boolean;
  /** the purse the moment the money went */
  holeMoney: number;
  warnedFirst: boolean;
  warnedSameWeekAsCrisis: boolean;
  rescued: boolean;
  welcomed: boolean;
  reunion: boolean;
  finalTier: number;
}

function career(seed: number, city: string): Run {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
  gs = G.pickCity(gs, city);
  gs = G.afterSigning(gs, {});
  // start them where the crisis lives, which is where a real career arrives
  gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier: 3 } : c) } };

  const out: Run = {
    sacked: false, tier: 0, season: 0, crisisCame: false, holeMoney: 0,
    warnedFirst: false, warnedSameWeekAsCrisis: false,
    rescued: false, welcomed: false, reunion: false, finalTier: 0,
  };
  let sawUltimatum = false;
  // season AND week: comparing week numbers alone counted a crisis in week 4 of
  // one season and a sacking in week 4 of another as the same moment
  let crisisAt = '';

  for (let season = 1; season <= 6; season++) {
    gs = G.enterSeason(gs);
    if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
    if (gs.phase === 'signing') { gs = G.afterSigning(gs, {}); out.welcomed = true; }
    if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');

    for (let w = 1; w <= gs.league.rounds; w++) {
      const hadCrisis = gs.crisisDone;
      const inp = G.liveMatchInput(gs);
      const res = simulateMatch(
        { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
          tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
        { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
          tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
        inp.seed + w);
      gs = G.commitRound(gs, res);
      if (!hadCrisis && gs.crisisDone) { crisisAt = `${season}:${w}`; out.crisisCame = true; out.holeMoney = gs.meters.money; }

      if (gs.sacking && !out.sacked) {
        out.sacked = true;
        out.tier = gs.sacking.tier;
        out.season = gs.sacking.season;
        out.warnedFirst = sawUltimatum;
        out.warnedSameWeekAsCrisis = crisisAt === `${season}:${w}`;
      }
      gs = G.continueFromResult(gs);
      if (gs.phase === 'ultimatum') { sawUltimatum = true; gs = G.advancePastPress(gs); }
      while (gs.phase === 'press') gs = G.answerPress(gs, w % 3);
      if (gs.phase === 'chat') gs = G.closeChat(gs);
      if (gs.phase === 'sacked') break;
      if (gs.phase === 'season-end') break;
    }

    if (gs.phase === 'sacked') {
      const nemId = gs.sacking!.clubId;
      gs = G.takeRescue(gs);
      out.rescued = gs.clubId !== nemId && !gs.sacking;
      // the new club signs him properly, welcome and all
      if (gs.phase === 'signing') { gs = G.afterSigning(gs, {}); out.welcomed = true; }
      if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
      // and he can carry on: give him the ground and the money to climb back
      gs = { ...gs, stadium: { capacity: 20_000, project: null }, meters: { ...gs.meters, money: 5_000_000 } };
      const table = Object.fromEntries(Object.entries(gs.league.table).map(([id, t]) => [
        id, id === gs.clubId ? { ...t, played: 14, won: 14, pts: 300, gf: 200, ga: 0 } : { ...t, played: 14, pts: 1 },
      ]));
      gs = { ...gs, league: { ...gs.league, table } };
      gs = G.startNextSeason(gs);
      out.reunion = !!gs.league.clubs.find(c => c.id === nemId);
      out.finalTier = G.club(gs).tier;
      break;
    }
    if (gs.phase === 'season-end') { gs = G.startNextSeason(gs); continue; }
  }
  return out;
}

/**
 * And it must NOT fire below that. ליגה ג׳ and ב׳ are where a manager learns;
 * dropping a million shekel hole on him there would end careers before they
 * started, which is the opposite of the point.
 */
function lowerDivisionsStaySafe(): string[] {
  const out: string[] = [];
  for (const tier of [1, 2]) {
    for (const seed of [4242, 777, 31]) {
      let gs = G.newGame(seed);
      gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
      gs = G.pickCity(gs, 'חולון');
      gs = G.afterSigning(gs, {});
      if (tier !== 1) {
        gs = { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => c.id === gs.clubId ? { ...c, tier } : c) } };
      }
      gs = G.enterSeason(gs);
      if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
      for (let w = 1; w <= gs.league.rounds; w++) {
        const inp = G.liveMatchInput(gs);
        const res = simulateMatch(
          { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
            tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
          { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
            tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
          inp.seed + w);
        gs = G.commitRound(gs, res);
        gs = G.continueFromResult(gs);
        if (gs.phase === 'ultimatum') gs = G.advancePastPress(gs);
        while (gs.phase === 'press') gs = G.answerPress(gs, 0);
        if (gs.phase === 'chat') gs = G.closeChat(gs);
        if (gs.phase === 'season-end' || gs.sacking) break;
      }
      if (gs.crisisDone) out.push(`tier ${tier} seed ${seed}: the money collapsed where it should not`);
      if (gs.sacking) out.push(`tier ${tier} seed ${seed}: sacked in a division that should not sack anyone`);
    }
  }
  return out;
}

const runs: Run[] = [];
for (let i = 0; i < CITIES.length; i++) {
  for (const seed of [4242, 777, 31, 9091, 555, 12007]) runs.push(career(seed + i * 13, CITIES[i]));
}

const n = runs.length;
const pct = (k: number) => `${Math.round((k / n) * 100)}%`;
const sacked = runs.filter(r => r.sacked);
const bad: string[] = [];

console.log(`${n} careers started in ליגה א׳\n`);
console.log(`sacked                        ${sacked.length}/${n}  ${pct(sacked.length)}`);
console.log(`  in ליגה א׳ or the לאומית    ${sacked.filter(r => r.tier === 3 || r.tier === 4).length}/${sacked.length}`);
console.log(`  warned before it            ${sacked.filter(r => r.warnedFirst).length}/${sacked.length}`);
console.log(`  never on the crisis week    ${sacked.filter(r => !r.warnedSameWeekAsCrisis).length}/${sacked.length}`);
console.log(`  season it happened          ${sacked.length ? (sacked.reduce((s, r) => s + r.season, 0) / sacked.length).toFixed(1) : '-'}`);
console.log(`rescued by the club in town   ${runs.filter(r => r.rescued).length}/${n}`);
console.log(`welcomed at the new club      ${runs.filter(r => r.welcomed).length}/${n}`);
console.log(`met them again on the way up  ${runs.filter(r => r.reunion).length}/${n}`);

/* The crisis finds everyone who arrives, and lands exactly where agreed: 720,000 below zero
   in ליגה א׳ (nine tenths of the 800,000 line, the agreed figures, not read from src), which
   at a neutral terrace is the FINAL warning with 80,000 of air left, never the axe itself. */
if (runs.some(r => !r.crisisCame)) bad.push(`the money never went for ${runs.filter(r => !r.crisisCame).length} careers, the chapter has to find everyone`);
if (runs.some(r => r.crisisCame && r.holeMoney !== -720_000)) {
  const w = runs.find(r => r.crisisCame && r.holeMoney !== -720_000)!;
  bad.push(`the collapse put the purse at ${w.holeMoney}, the agreed landing is -720,000 (nine tenths of the 800,000 line)`);
}
{
  const atNeutral = debtState(-720_000, 3, FANS_MIDDLE);
  if (atNeutral.level !== 'final') bad.push(`the crisis at a neutral terrace is ${atNeutral.level}, it has to be the final warning`);
  if (atNeutral.headroom !== 80_000) bad.push(`the air under the manager is ${atNeutral.headroom}, the agreed 80,000 is what makes it survivable`);
  // and the way out is real: one decent sale puts him a whole band lower
  const afterSale = debtState(-720_000 + 150_000, 3, FANS_MIDDLE);
  if (afterSale.level === 'final' || afterSale.level === 'sacked') bad.push('a 150K sale changes nothing, the way out is shut');
}

/* The axe still exists: a manager who never sells and never reacts is still sacked in the
   vast majority of careers (measured 47 of 48 on 3.10), warned first, never on the crisis
   week, and only where the money story lives, or one division below it when he is relegated
   carrying the debt. A sack in ליגה ג׳ would mean the floor broke. */
if (sacked.length < Math.round(n * 0.75)) bad.push(`only ${sacked.length} of ${n} passive careers were sacked, the axe has gone blunt`);
if (sacked.length === n) bad.push('every single passive career was still sacked, so the escape the 0.9 landing promises does not exist');
if (sacked.some(r => r.tier < 2)) bad.push('somebody was sacked in ליגה ג׳, where there is not enough money to lose');
if (sacked.some(r => !r.warnedFirst)) bad.push('somebody was sacked without the owner warning him first');
if (sacked.some(r => r.warnedSameWeekAsCrisis)) bad.push('somebody was sacked the same week the money went, with no chance to react');
if (sacked.some(r => !r.rescued)) bad.push('somebody sacked was left with no club to go to');
if (sacked.some(r => !r.welcomed)) bad.push('somebody sacked joined a new club with no welcome');
if (sacked.some(r => !r.reunion)) bad.push('somebody sacked climbed back and the club that sacked him was not there');

const low = lowerDivisionsStaySafe();
console.log(`
ליגה ג׳ and ב׳ untouched         ${low.length === 0 ? 'yes' : 'NO'}`);
bad.push(...low);

console.log(bad.length ? `\nFAIL\n - ${bad.join('\n - ')}` : '\nOK, the crisis finds everyone, warns first, and leaves a real way out');
process.exit(bad.length ? 1 : 0);
