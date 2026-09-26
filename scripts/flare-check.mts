/**
 * The flares before kickoff.
 *   node --experimental-strip-types scripts/flare-check.mts
 *
 * Four nights in a season get a terrace lit before the whistle: the opener, the
 * first derby, and a promotion or relegation night in the last two rounds. Only
 * the derby was a thing the game knew about, so the other three are rules
 * written here and rules drift.
 *
 * Two things are guarded, and the second is the one that would actually hurt.
 *
 * The RULE: it fires on the nights it should and stays dark otherwise, and the
 * maths of "still live" holds at both ends. A flare on every other match is not
 * an occasion, so the rate is pinned to a band measured over played out careers
 * rather than left to whoever widens a condition next.
 *
 * The CLOCK: the beat is two seconds of held breath, and the match must not play
 * football behind it. That is a source guard on the one flag the match screen
 * stops its clock with.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { isDerby } from '../src/data/clubs.ts';
import { CITIES } from '../src/data/cities.ts';
import { TOP_TIER } from '../src/game/career.ts';

const fails: string[] = [];
let checked = 0;

const read = (f: string) => readFileSync(f, 'utf8');

/** a career standing at the first round of its first season */
function career(seed: number): G.GameState {
  let gs = G.newGame(seed * 137 + 11);
  gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
  gs = G.pickCity(gs, CITIES[(seed * 7) % CITIES.length].name);
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  return gs;
}

function playMatch(gs: G.GameState): G.GameState {
  const inp = G.liveMatchInput(gs);
  const res = simulateMatch(
    { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
    { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
      tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
    inp.seed);
  gs = G.commitRound(gs, res);
  gs = G.continueFromResult(gs);
  while (gs.phase === 'press') gs = G.answerPress(gs, 0);
  if (gs.phase === 'chat') gs = G.closeChat(gs);
  return gs;
}

/**
 * A division with the points written by hand, so the maths can be asked a
 * question with a known answer. `pts` is read in finishing order, mine first.
 */
function withPoints(gs: G.GameState, week: number, mine: number, others: number[]): G.GameState {
  const table = { ...gs.league.table };
  table[gs.clubId] = { ...table[gs.clubId], pts: mine };
  const rest = gs.league.clubs.filter(c => c.id !== gs.clubId);
  rest.forEach((c, i) => { table[c.id] = { ...table[c.id], pts: others[i] ?? 0 }; });
  return { ...gs, week, league: { ...gs.league, table } };
}

/** The same division, moved to a chosen tier. A new career starts in ליגה ג׳. */
function atTier(gs: G.GameState, tier: number): G.GameState {
  return { ...gs, league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier })) } };
}

/* ---------------------------------------------------------------- the rule */

/* 1. OPENING DAY. The first round of every season is one of the four, so no
      season is ever left without a lit terrace in it. */
{
  const gs = career(1);
  checked += 2;
  if (gs.week !== 1) fails.push(`a fresh season does not start on round 1, it starts on ${gs.week}`);
  if (G.flareReason(gs) === null) fails.push('the opening round of a career is not a flare night');
}

/* 2. AN ORDINARY ROUND IS DARK. The middle of a season, with no derby in it and
      nothing at stake yet, has to give nothing back. */
{
  let dark = 0, looked = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const gs = career(seed);
    const derby = G.firstDerbyRound(gs);
    for (let w = 2; w <= gs.league.rounds - 2; w++) {
      if (w === derby) continue;
      looked++;
      if (G.flareReason({ ...gs, week: w }) === null) dark++;
    }
  }
  checked++;
  if (dark !== looked) {
    fails.push(`${looked - dark} ordinary mid season rounds of ${looked} lit flares, and they should all be dark`);
  }
}

/* 3. THE SUMMER HAS NO CROWD. The pre season plays no league match, and asking
      the terrace about a match that is not on would be a lie. */
{
  const gs = career(2);
  checked++;
  if (G.flareReason({ ...gs, preWeek: 1 }) !== null) fails.push('the pre season lights flares');
}

/* 4. THE DERBY, ONCE. A club in the division can point its rivalId at us while
      we point ours somewhere else, so "a derby" is up to four opponents and up
      to eight of the fourteen rounds. Only the first meeting is an occasion. */
{
  let seasons = 0, lit = 0, wrongRound = 0, twice = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const gs = career(seed);
    const first = G.firstDerbyRound(gs);
    const derbyRounds = gs.league.fixtures
      .filter(f => (f.homeId === gs.clubId || f.awayId === gs.clubId) && isDerby(f.homeId, f.awayId))
      .map(f => f.round).sort((a, b) => a - b);
    if (!derbyRounds.length) continue;
    seasons++;
    checked++;
    if (first !== derbyRounds[0]) {
      fails.push(`firstDerbyRound said ${first} and the fixture list says ${derbyRounds[0]}`);
    }
    // the first meeting is lit, and none of the later ones is
    const onFirst = G.flareReason({ ...gs, week: derbyRounds[0] });
    if (onFirst === 'derby' || onFirst === 'promotion' || onFirst === 'relegation') lit++;
    else if (derbyRounds[0] !== 1) wrongRound++;
    for (const r of derbyRounds.slice(1)) {
      if (r >= gs.league.rounds - 1) continue;         // a late one can be lit for the table instead
      if (G.flareReason({ ...gs, week: r }) === 'derby') twice++;
    }
  }
  checked += 3;
  if (!seasons) fails.push('no season in the sample had a derby at all, so this proved nothing');
  if (wrongRound) fails.push(`${wrongRound} first derbies of a season were not lit`);
  if (twice) fails.push(`${twice} second or third derby meetings were lit as well, which makes it a fixture`);
  console.log(`  the derby: ${lit} of ${seasons} sampled seasons lit their first meeting, ${twice} lit a later one`);
}

/* 5. PROMOTION, AT BOTH ENDS OF THE MATHS. Two places go up out of eight, and a
      night is only a promotion night while it is neither won nor lost. */
{
  const gs = career(3);
  const last = gs.league.rounds;                      // three points left to play for
  checked += 4;

  // already up: nobody but the one club behind can reach us
  const secured = withPoints(gs, last, 40, [38, 20, 18, 17, 16, 15, 14]);
  if (G.flareReason(secured) === 'promotion') {
    fails.push('a club that is promoted whatever happens still gets a promotion night');
  }
  // out of reach: two clubs are past anything we can finish on
  const gone = withPoints(gs, last, 10, [40, 38, 12, 11, 9, 8, 7]);
  if (G.flareReason(gone) === 'promotion') {
    fails.push('a club that cannot reach the top two still gets a promotion night');
  }
  // live: third place, a win does it, a loss does not
  const live = withPoints(gs, last, 30, [32, 31, 29, 20, 18, 16, 14]);
  if (G.flareReason(live) !== 'promotion') {
    fails.push('a final round with promotion still open is not a promotion night');
  }
  // and the top division has nowhere to climb to
  const top = withPoints(atTier(gs, TOP_TIER), last, 30, [32, 31, 29, 20, 18, 16, 14]);
  if (G.flareReason(top) === 'promotion') fails.push('ליגת העל lights a promotion night');
}

/* 6. RELEGATION, THE SAME AT BOTH ENDS. One club goes down out of eight. */
{
  // ליגה ב׳, because a career starts in ליגה ג׳ and nothing is relegated out of
  // the bottom division: asked down there, every one of these passes for the
  // wrong reason and the rule is never actually tested
  const gs = atTier(career(4), 2);
  const last = gs.league.rounds;
  checked += 4;

  // safe: at least one club can no longer catch us
  const safe = withPoints(gs, last, 30, [40, 38, 34, 33, 32, 31, 20]);
  if (G.flareReason(safe) === 'relegation') {
    fails.push('a club that cannot finish bottom still gets a relegation night');
  }
  // already down: every other club is past anything we can finish on
  const down = withPoints(gs, last, 5, [30, 28, 26, 25, 24, 23, 22]);
  if (G.flareReason(down) === 'relegation') {
    fails.push('a club that is down whatever happens still gets a relegation night');
  }
  // live: bottom, and the club above is within reach
  const live = withPoints(gs, last, 20, [40, 38, 34, 30, 28, 24, 22]);
  if (G.flareReason(live) !== 'relegation') {
    fails.push('a final round with relegation still open is not a relegation night');
  }
  // and nobody is relegated out of the bottom division
  const bottom = withPoints(atTier(gs, 1), last, 20, [40, 38, 34, 30, 28, 24, 22]);
  if (G.flareReason(bottom) === 'relegation') fails.push('ליגה ג׳ lights a relegation night');
}

/* 7. THE WINDOW IS THE LAST TWO ROUNDS. The same live table three rounds out is
      not a decider, it is a Tuesday, and widening this is how 2.4 nights a
      season quietly becomes 4. */
{
  const gs = career(5);
  const rounds = gs.league.rounds;
  const pts: [number, number[]] = [30, [32, 31, 29, 20, 18, 16, 14]];
  checked += 3;
  if (G.flareReason(withPoints(gs, rounds, ...pts)) !== 'promotion') {
    fails.push('the final round is not inside the window');
  }
  if (G.flareReason(withPoints(gs, rounds - 1, ...pts)) !== 'promotion') {
    fails.push('the second to last round is not inside the window');
  }
  const early = G.flareReason(withPoints(gs, rounds - 2, ...pts));
  if (early === 'promotion' || early === 'relegation') {
    fails.push(`the window reaches ${rounds - 2}, three rounds from the end, and it should stop at two`);
  }
}

/* 8. THE RATE, OVER CAREERS ACTUALLY PLAYED OUT. This is the measurement the
      rule was chosen on: 2.4 nights in a fourteen round season, and never a
      season without one. A band, because the football is simulated, but a
      narrow one, because the reasons are not. */
{
  const CAREERS = 14, SEASONS = 5;
  let seasons = 0, flares = 0, emptySeasons = 0;
  const seen = new Map<string, number>();

  for (let seed = 1; seed <= CAREERS; seed++) {
    let gs = career(seed);
    for (let s = 1; s <= SEASONS; s++) {
      if (s > 1) {
        gs = G.enterSeason(gs);
        if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
        if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
      }
      let inSeason = 0;
      seasons++;
      for (let w = 1; w <= gs.league.rounds; w++) {
        if (gs.phase === 'season-end' || gs.phase === 'sacked') break;
        if (!G.playerFixture(gs)) break;
        const r = G.flareReason(gs);
        if (r) { flares++; inSeason++; seen.set(r, (seen.get(r) ?? 0) + 1); }
        gs = playMatch(gs);
      }
      if (!inSeason) emptySeasons++;
      if (gs.phase === 'sacked' || gs.phase !== 'season-end') break;
      gs = G.startNextSeason(gs);
      if (gs.phase === 'sacked') break;
    }
  }

  const per = flares / seasons;
  checked += 3;
  console.log(`  ${seasons} seasons played out, ${flares} flare nights, ${per.toFixed(2)} a season`);
  console.log(`  by reason: ${[...seen].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (per < 1.9) fails.push(`only ${per.toFixed(2)} flare nights a season, the four occasions are barely happening`);
  if (per > 3.0) fails.push(`${per.toFixed(2)} flare nights a season, which is one match in four and no longer an occasion`);
  if (emptySeasons) fails.push(`${emptySeasons} seasons of ${seasons} had no flare night at all, and the opener should have given every one of them one`);
  // every one of the four has to actually be reachable
  for (const r of ['opener', 'derby', 'promotion', 'relegation']) {
    checked++;
    if (!seen.get(r)) fails.push(`"${r}" never fired in ${seasons} seasons, so that occasion does not exist in practice`);
  }
}

/* --------------------------------------------------------------- the clock */

/* 9. THE MATCH DOES NOT PLAY BEHIND THE BEAT. The screen stops its clock with
      one flag, and the flares have to be in it. Plain string matching, because
      a regular expression written through a template string is how this guard
      has caught its own tail before. */
{
  const m = read('src/ui/screens/Match.tsx');
  const i = m.indexOf('const running =');
  const line = i < 0 ? '' : m.slice(i, m.indexOf('\n', i));
  checked += 4;
  if (!line) fails.push('the match screen has no "const running =" flag any more, so this guard is blind');
  if (line && !line.includes('!flares')) {
    fails.push('the clock is not stopped while the flares are up, so the match plays football behind the beat');
  }
  if (!m.includes('FlareBeat')) fails.push('the match screen no longer shows the flare beat at all');
  if (!m.includes('G.flareReason(gs)')) fails.push('the match screen no longer asks why the flares would be up');
}

/* 10. IT PASSES BY ITSELF. A beat with a button on it is a screen, and the way
       from the hub to a first ball was cut from six taps to three on purpose. */
{
  const f = read('src/ui/components/FlareBeat.tsx');
  checked += 4;
  if (!f.includes('setTimeout(onDone')) fails.push('the flare beat does not end on its own timer');
  if (f.includes('<button')) fails.push('the flare beat has a button on it, which makes it a screen and adds a tap');
  if (!f.includes('onClick={onDone}')) fails.push('a tap does not skip the flare beat');
  // no long dashes in anything a player reads, here as everywhere
  if (f.includes('—')) fails.push('the flare beat contains a long dash');
}

/* 11. REDUCED MOTION KEEPS THE WORDS. The title screen was nearly shipped blank
       to anyone with the setting on, so the flicker is turned off in css and the
       frame and the type are not. */
{
  const css = read('src/ui/tokens.css');
  const i = css.indexOf('.flare-beat');
  checked += 2;
  if (i < 0) fails.push('there is no .flare-beat rule in tokens.css');
  const tail = i < 0 ? '' : css.slice(i);
  if (tail && !tail.includes('prefers-reduced-motion')) {
    fails.push('the flare beat does not answer prefers-reduced-motion');
  }
}

/* --------------------------------------------------------------- the weight */

/* 12. THE PICTURES STAY LIGHT. The largest single fall in the whole funnel was
       a slow first screen, and it was fixed by re-encoding four photographs at
       the width they are actually drawn at. These are drawn at 941 across and
       they are mostly smoke, which compresses well, so there is no honest
       reason for one of them to arrive as half a megabyte. This is not a guard
       against the picture we have, it is a guard against the one somebody drops
       in over it later without looking at the size. */
{
  const DIR = 'public/flares';
  const CAP = 130 * 1024;              // a comfortable ceiling over the 72KB we ship
  let files: string[] = [];
  try { files = readdirSync(DIR); } catch { /* no pictures yet, see below */ }
  checked += 2;

  const photos = files.filter(f => /\.(webp|jpg|jpeg|png|avif)$/i.test(f));
  if (!photos.length) fails.push(`there are no pictures in ${DIR} at all`);
  // the opening night's picture is referenced by name in the component
  if (!photos.includes('opener.webp')) fails.push('the opening night has no picture in public/flares');

  for (const f of photos) {
    checked++;
    const bytes = statSync(`${DIR}/${f}`).size;
    if (bytes > CAP) {
      fails.push(`${DIR}/${f} is ${Math.round(bytes / 1024)}KB, over the ${CAP / 1024}KB the terrace allows`);
    }
    // and a png here means somebody skipped the conversion
    if (/\.png$/i.test(f)) fails.push(`${DIR}/${f} is a png, it should be re-encoded to webp`);
  }

  // every picture the component names has to actually be on disk, or the beat
  // opens on black for the length of a failed request
  const comp = read('src/ui/components/FlareBeat.tsx');
  for (const m of comp.matchAll(/asset\('\/flares\/([^']+)'\)/g)) {
    checked++;
    if (!photos.includes(m[1])) fails.push(`FlareBeat asks for /flares/${m[1]} and it is not in ${DIR}`);
  }

  const total = photos.reduce((n, f) => n + statSync(`${DIR}/${f}`).size, 0);
  console.log(`  ${photos.length} picture(s), ${Math.round(total / 1024)}KB in total`);
}

/* 13. AND IT IS ASKED FOR BEFORE IT IS NEEDED. The beat lasts 2.2 seconds; a
       photograph that starts downloading when it opens is one nobody sees. */
{
  const ts = read('src/ui/screens/Teamsheet.tsx');
  checked += 2;
  // the CALL, not the name: looking for "preloadFlare" alone matched the import
  // line and kept passing with the call deleted, which a sabotage caught
  if (!ts.includes('preloadFlare(G.flareReason(')) {
    fails.push('the dressing room no longer asks for the night\'s picture, so the beat waits on it');
  }
  const comp = read('src/ui/components/FlareBeat.tsx');
  if (!comp.includes('export function preloadFlare')) fails.push('preloadFlare is gone from FlareBeat');
}

console.log(`${checked} checks`);
console.log('four nights a season are lit, the rest are dark, and the clock waits for the beat');
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the flares fire on the four occasions and nowhere else');
process.exit(fails.length ? 1 : 0);
