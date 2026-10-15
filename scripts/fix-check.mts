/**
 * The owner asks to sell a match (Itzik, 14.10).
 *   node --experimental-strip-types scripts/fix-check.mts
 *
 * Held here, one rule of his at a time: the door is shut and nothing changes while it is; only ליגה ג׳ to א׳; the owner asks
 * once in a league at most and twice at the most (the season after a refusal, then never); a yes ends the asking for good;
 * ten situations that do not repeat; sixty in a hundred caught and forty not; a caught club is closed, the manager is out and
 * the way back is ליגה ג׳ whatever season and league he was in; the match he sold is lost; the money lands only when he is not
 * caught; the words and the pictures are all there.
 */
import { readFileSync, statSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import {
  FIX_LIVE, setFixDoorForChecks, FIX_CAUGHT, FIX_TOP_TIER, FIX_ASKS_PER_LEAGUE, FIX_BASE, fixPayout, emptyFixLog,
} from '../src/game/fixing.ts';
import { FIX_SITUATIONS, FIX_MATCH_LINES, FIX_SUSPENSE, FIX_CAUGHT_TEXT, FIX_CLEAR_TEXT, FIX_SACKED_TEXT, FIX_RESCUE_TEXT } from '../src/data/fixingText.ts';
import { TEMPLATES, eligible, rollDilemma } from '../src/data/dilemmas.ts';
import { templatesForTier } from '../src/data/dilemmas.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

function career(seed: number, tier = 1, season = 1): G.GameState {
  let s = G.newGame(seed);
  s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  s = G.pickCity(s, LEGEND_TOWN);
  s = G.afterSigning(s, {});
  s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
  while (s.phase === 'preseason-market') s = G.advancePreseason(s);
  s = { ...s, phase: 'hub', week: 1, friends: [], notices: [], season } as G.GameState;
  if (tier !== 1) s = { ...s, league: { ...s.league, clubs: s.league.clubs.map(c => c.id === s.clubId ? { ...c, tier } : c) } };
  return s;
}

/** walk one season's weeks: the first week the owner asks, and the state after */
function walk(gs: G.GameState): { week: number; id: string; gs: G.GameState } | null {
  for (let w = 1; w < gs.league.rounds; w++) {
    const a = G.fixOfferDue({ ...gs, week: w });
    if (a) return { week: w, id: a.id, gs: { ...a.gs, week: 1 } };
  }
  return null;
}

/* ---------------------------------------------------------------- the door is shut */
{
  ok(FIX_LIVE === false, 'the owner\'s request is not shut by default');
  ok(walk(career(8001, 1)) === null, 'a shut door still asked');
}
setFixDoorForChecks(true);
try {
  /* ---------------------------------------- only up to ליגה א׳, never twice in a season */
  for (const tier of [4, 5]) ok(walk(career(8002 + tier, tier)) === null, `tier ${tier}: the owner asked above ליגה א׳`);
  ok(FIX_TOP_TIER === 3 && FIX_ASKS_PER_LEAGUE === 2 && FIX_CAUGHT === 0.6, 'the rules are not up to ליגה א׳, twice a league, sixty in a hundred');
  for (const tier of [1, 2, 3]) {
    const g = career(8010 + tier, tier);
    const first = walk(g);
    ok(first !== null, `tier ${tier}: the owner never asked in a whole season`);
    if (!first) continue;
    const rounds = g.league.rounds;
    ok(first.week >= 4 && first.week <= rounds - 3, `tier ${tier}: asked in round ${first.week} of ${rounds}`);
    ok(walk(first.gs) === null, `tier ${tier}: asked twice in one season`);
    ok(first.gs.fixLog.offered[tier] === 1 && first.gs.fixLog.seen.length === 1, `tier ${tier}: the ask was not counted`);
    // a refusal comes back the season after, with another situation, and then never
    const next = { ...first.gs, season: first.gs.season + 1, seasonSeed: first.gs.seasonSeed + 1 };
    const second = walk(next);
    ok(second !== null && second.id !== first.id, `tier ${tier}: a refused owner did not come back in the second season with another situation`);
    if (second) {
      const third = walk({ ...second.gs, season: second.gs.season + 1, seasonSeed: second.gs.seasonSeed + 2 });
      ok(third === null, `tier ${tier}: asked a third time in the same league`);
    }
  }
  // the next league is a new account
  {
    const g = career(8020, 1);
    const first = walk(g)!;
    const up = { ...first.gs, season: 2, seasonSeed: first.gs.seasonSeed + 5, league: { ...first.gs.league, clubs: first.gs.league.clubs.map(c => c.id === first.gs.clubId ? { ...c, tier: 2 } : c) } };
    ok(walk(up) !== null, 'the owner did not ask in the next league up');
  }

  /* ---------------------------------------------- ten situations, none the same */
  ok(FIX_SITUATIONS.length === 10 && new Set(FIX_SITUATIONS.map(s => s.id)).size === 10, 'there are not ten different situations');
  {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400 && seen.size < 10; seed++) {
      const a = walk({ ...career(8100, 1), seasonSeed: seed * 977 });
      if (a) seen.add(a.id);
    }
    ok(seen.size === 10, `only ${seen.size} of the ten situations ever came up`);
  }
  for (const t of [1, 2, 3, 4, 5]) ok(!templatesForTier(t).some(x => x.id.startsWith('fix_')), `tier ${t}: a request is in the pool of the week's questions`);
  ok(eligible({ tier: 2, pos: 3, teams: 10, week: 8, money: 100000 } as never, 'now').every(t => !t.id.startsWith('fix_')), 'a request is eligible as an ordinary question');

  /* ---------------------------------------------- sixty in a hundred, forty not */
  {
    const base = career(8200, 1);
    let caught = 0, n = 0;
    for (let i = 0; i < 4000; i++) {
      const g = { ...base, seasonSeed: 100 + i * 31, season: 1 + (i % 7), week: 5 + (i % 9) };
      const rolled = G.rollNamedDilemma(g, 'fix_03', 1, true)!;
      const after = G.chooseDilemma({ ...g, dilemma: rolled }, 0);
      n++;
      if (after.fix?.caught) caught++;
    }
    const p = caught / n;
    ok(p > 0.57 && p < 0.63, `caught ${caught} of ${n}: ${(p * 100).toFixed(1)} in a hundred, not sixty`);
  }

  /* ---------------------------------------------- the money depends on the situation */
  ok(FIX_BASE[1] < FIX_BASE[2] && FIX_BASE[2] < FIX_BASE[3], 'the sums do not grow with the league');
  ok(FIX_SITUATIONS.every(s => s.weight >= 1 && s.weight <= 2.5), 'a situation weighs outside 1 to 2.5');
  ok(fixPayout(1, 2.5) > fixPayout(1, 1) && fixPayout(3, 1) > fixPayout(2, 2.5), 'the money does not follow the situation and the league');
  ok(fixPayout(1, 1) >= 60_000 && fixPayout(3, 2.5) <= 2_000_000, 'the sums are out of the range of a club in these leagues');
  ok(FIX_BASE[3] === 300_000 && fixPayout(3, 2.5) <= 750_000, 'the economist of 15.10: ליגה א׳ pays 300K for the lightest favour and 750K at most, not 600K to 1.5M');

  /* ------------------------------ a yes: the verdict, the match, and everything after */
  const deal = (tier: number, seed: number, wantCaught: boolean) => {
    for (let k = 0; k < 400; k++) {
      const base = { ...career(seed, tier), seasonSeed: seed * 13 + k, week: 6 };
      const rolled = G.rollNamedDilemma(base, 'fix_02', 1, true)!;
      const after = G.chooseDilemma({ ...base, dilemma: rolled }, 0);
      if (after.fix && after.fix.caught === wantCaught) return after;
    }
    throw new Error('no deal drawn');
  };
  for (const tier of [1, 2, 3]) {
    const g = deal(tier, 8300 + tier, true);
    ok(g.fix!.stage === 'agreed' && g.fixLog.done, `tier ${tier}: a yes did not start the deal and end the asking`);
    // the match is lost
    let lost = 0;
    for (let k = 0; k < 12; k++) {
      const r = G.fixedMatchResult({ ...g, seasonSeed: g.seasonSeed + k });
      const fx = G.playerFixture(g)!;
      const mine = fx.homeId === g.clubId ? r.score[0] : r.score[1];
      const theirs = fx.homeId === g.clubId ? r.score[1] : r.score[0];
      if (mine < theirs) lost++;
    }
    ok(lost === 12, `tier ${tier}: the match he sold was lost ${lost} times in 12`);
    // the match goes through the round and ends on the verdict
    const r = G.fixedMatchResult(g);
    const committed = G.commitRound({ ...g, phase: 'match' }, r);
    ok(committed.fix?.stage === 'agreed', `tier ${tier}: the round dropped the deal`);
    const toVerdict = G.continueFromResult(committed);
    ok(toVerdict.phase === 'fix-verdict' && toVerdict.fix?.stage === 'played', `tier ${tier}: after the result the verdict is not next`);
    // caught: closed, out, and the way back is the bottom division
    const out = G.resolveFix(toVerdict);
    ok(out.phase === 'sacked' && out.sacking?.reason === 'fixing' && out.fix === null, `tier ${tier}: a caught manager is not out`);
    ok(G.rescueOffer(out)?.tier === 1, `tier ${tier}: the way back after a closed club is not ליגה ג׳`);
    const back = G.takeRescue({ ...out, phase: 'rescue' });
    ok(G.club(back).tier === 1 && back.fixLog.done, `tier ${tier}: the manager did not start again in ליגה ג׳, or the owner can ask again`);
    ok(G.club(back).id !== out.clubId, `tier ${tier}: the closed club is still his`);
  }
  // whatever the season
  for (const season of [1, 5, 14]) {
    const base = career(8350 + season, 3, season);
    let g: G.GameState | null = null;
    for (let k = 0; k < 400 && !g; k++) {
      const b = { ...base, seasonSeed: 77 + k * 17, week: 6 };
      const after = G.chooseDilemma({ ...b, dilemma: G.rollNamedDilemma(b, 'fix_05', 1, true)! }, 0);
      if (after.fix?.caught) g = after;
    }
    const v = G.resolveFix(G.continueFromResult(G.commitRound({ ...g!, phase: 'match' }, G.fixedMatchResult(g!))));
    ok(G.rescueOffer(v)?.tier === 1, `season ${season}: the way back is not ליגה ג׳`);
  }
  // not caught: the sum lands, and the week goes on
  for (const tier of [1, 2, 3]) {
    const g = deal(tier, 8400 + tier, false);
    const money0 = g.meters.money;
    const played = G.continueFromResult(G.commitRound({ ...g, phase: 'match' }, G.fixedMatchResult(g)));
    const cleared = G.resolveFix(played);
    ok(cleared.phase !== 'sacked' && cleared.fix === null && !cleared.sacking, `tier ${tier}: an escaped manager was sacked`);
    ok(cleared.meters.money - played.meters.money === g.fix!.payout, `tier ${tier}: the sum that landed is ${cleared.meters.money - played.meters.money}, not ${g.fix!.payout}`);
    ok(played.meters.money <= money0 + 200_000, `tier ${tier}: money came before the verdict`);
    ok(walk({ ...cleared, season: cleared.season + 1, seasonSeed: cleared.seasonSeed + 3 }) === null, `tier ${tier}: the owner asked again after a yes`);
  }
  // a refusal changes nothing in the club
  {
    const base = { ...career(8500, 2), week: 6 };
    const no = G.chooseDilemma({ ...base, dilemma: G.rollNamedDilemma(base, 'fix_01', 1, true)! }, 1);
    ok(no.fix === null && !no.fixLog.done, 'a refusal started a deal or ended the asking');
  }

  /* --------------------------------------------------------- the words and the pictures */
  const all = [
    ...FIX_SITUATIONS.flatMap(s => [s.title, s.tag, s.text, s.yes, s.no, s.yesOutcome, s.noOutcome]),
    ...FIX_MATCH_LINES, ...FIX_SUSPENSE,
    FIX_CAUGHT_TEXT.title, FIX_CAUGHT_TEXT.body, FIX_CAUGHT_TEXT.ownerLine, FIX_CLEAR_TEXT.title, FIX_CLEAR_TEXT.body, FIX_CLEAR_TEXT.ownerLine,
    FIX_SACKED_TEXT.title, FIX_SACKED_TEXT.body, FIX_SACKED_TEXT.figure, FIX_RESCUE_TEXT.title, FIX_RESCUE_TEXT.body,
  ];
  ok(all.every(t => !/[–—]/.test(t)), 'a long dash in the words');
  ok(all.every(t => !/\d/.test(t)), 'a number in the words: the sums are written by the code');
  ok(FIX_SITUATIONS.every(s => s.text.includes('{rival}')), 'a request that does not name the next match');
  ok(FIX_SITUATIONS.every(s => s.text.split('\n').length >= 2 && s.yes.length > 5 && s.no.length > 5), 'a request that is too thin');
  ok(FIX_MATCH_LINES.length >= 12 && FIX_MATCH_LINES.filter(l => l.includes('{star}')).length >= 2, 'the match lines are fewer than 12 or have no star');
  ok(FIX_SUSPENSE.length === 6, 'the wait is not six lines');
  ok(FIX_CLEAR_TEXT.body.includes('{sum}'), 'the clear text does not take the sum');
  ok(new Set(FIX_SITUATIONS.map(s => s.image)).size === 10, 'two requests share a picture');
  for (const f of [...FIX_SITUATIONS.map(s => s.image), '/fix/caught.webp', '/fix/clear.webp', '/fix/suspense.webp']) {
    let size = 0;
    try { size = statSync(`public${f}`).size; } catch { /* missing */ }
    ok(size > 20_000 && size < 120_000, `public${f} is ${size} bytes`);
  }
  // the ten are templates of their own, in no pool
  ok(TEMPLATES.filter(t => t.id.startsWith('fix_')).length === 10, 'the ten requests are not all templates');
  const r = rollDilemma(TEMPLATES.find(t => t.id === 'fix_04')!, { tier: 2, rival: 'הפועל', money: 1, star: 'א' } as never, (() => 0.5) as never);
  ok(!!r.image && r.options.length === 2 && r.options[0].act?.[0].kind === 'fixDeal' && r.options[1].act?.[0].kind === 'fixRefuse', 'a request does not roll into two answers with a picture');

  /* ------------------------------------------------- the screens and the files, as written */
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  ok(app.includes('FixOfferScreen') && app.includes("gs.fix?.stage === 'agreed'") && app.includes('FixVerdictScreen') && app.includes('G.resolveFix(gs)'), 'the app does not route the request, the match and the verdict');
  const st = readFileSync('src/game/state.ts', 'utf8');
  ok(st.includes("const tier = s.reason === 'fixing' ? 1 : Math.max(1, s.tier - 1);"), 'the way back after a closed club is not the bottom division in the code');
  ok(!/Date\.now|new Date|Math\.random/.test(readFileSync('src/game/fixing.ts', 'utf8')), 'fixing.ts reads the clock or Math.random');
  ok(emptyFixLog().done === false, 'a new career starts with the owner already refused');
} finally {
  setFixDoorForChecks(false);
}

if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 16)) console.log('  - ' + f);
  if (fails.length > 16) console.log(`  ... and ${fails.length - 16} more`);
  process.exit(1);
}
console.log(`${checked} checks`);
console.log('OK, the owner asks once in a league, up to ליגה א׳, sixty in a hundred are caught, and a caught club is closed and the manager starts again in ליגה ג׳');
