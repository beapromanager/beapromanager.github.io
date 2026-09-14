/**
 * The timeline tells the truth about the match it is talking about.
 *   node --experimental-strip-types scripts/feed-check.mts
 *
 * The fan account said "a point away is no disaster" after every draw,
 * including the ones at home, and the press said "three points and up the
 * table" after every win, including the ones that moved nobody. Read off real
 * seasons, round by round, against what actually happened:
 *   1. a home draw is a point at home, an away draw a point away
 *   2. "up the table" only when the club's place actually improved, "top"
 *      only when it is first, and neither when it is neither
 *   3. the place-before it is judged against is the real one: it is
 *      recomputed here from the round's results and must agree
 */
import * as G from '../src/game/state.ts';
import { simulateMatch } from '../src/engine/matchEngine.ts';
import { DEFAULT_FORMATION } from '../src/data/formations.ts';
import { sortedTable } from '../src/game/league.ts';

const fails: string[] = [];
let checked = 0;
let homeDraws = 0, awayDraws = 0, climbs = 0, tops = 0, flats = 0;

for (const [city, seed] of [['אשדוד', 4242], ['חיפה', 777], ['רמת גן', 31], ['באר שבע', 9091]] as const) {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, city);
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason({ ...gs, crisisDone: true });
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');

  for (let w = 1; w <= gs.league.rounds && !gs.seasonOver; w++) {
    const posBefore = Math.max(1, sortedTable(gs.league).findIndex(t => t.clubId === gs.clubId) + 1);
    const fx = G.playerFixture(gs)!;
    const home = fx.homeId === gs.clubId;
    const inp = G.liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed + w);
    gs = G.continueFromResult(G.commitRound(gs, res));
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    if (gs.phase === 'chat') gs = G.closeChat(gs);
    while (gs.notices.length) gs = G.dismissNotice(gs);
    if (gs.sacking) break;

    const mine = home ? res.score[0] : res.score[1];
    const theirs = home ? res.score[1] : res.score[0];
    const posAfter = Math.max(1, sortedTable(gs.league).findIndex(t => t.clubId === gs.clubId) + 1);
    const posts = G.clubFeed(gs);
    const press = posts.find(p => p.kind === 'press')?.text ?? '';
    const fan = posts.find(p => p.kind === 'fan')?.text ?? '';
    const tag = `${city} week ${w} (${home ? 'home' : 'away'} ${mine}:${theirs}, ${posBefore}→${posAfter})`;

    /* 3. the recomputed place-before agrees with the one taken live */
    checked++;
    if (G.positionBeforeRound(gs) !== posBefore)
      fails.push(`${tag}: positionBeforeRound says ${G.positionBeforeRound(gs)}, the table before the round said ${posBefore}`);

    if (mine === theirs) {
      /* 1. a draw is at home or away, whichever it was */
      checked++;
      if (home) { homeDraws++; if (!fan.includes('נקודה בבית') || fan.includes('בחוץ')) fails.push(`${tag}: the fans call a home draw "${fan}"`); }
      else { awayDraws++; if (!fan.includes('נקודה בחוץ')) fails.push(`${tag}: the fans call an away draw "${fan}"`); }
    } else if (mine > theirs) {
      /* 2. the table line after a win */
      checked++;
      const climbed = posAfter < posBefore;
      if (climbed) { climbs++; if (!press.includes('עלייה בטבלה')) fails.push(`${tag}: climbed and the press says "${press}"`); }
      else if (posAfter === 1) { tops++; if (!press.includes('פסגה') || press.includes('עלייה')) fails.push(`${tag}: stayed top and the press says "${press}"`); }
      else { flats++; if (press.includes('עלייה') || press.includes('פסגה')) fails.push(`${tag}: did not move and the press says "${press}"`); }
    }
  }
}

console.log(`  draws: ${homeDraws} at home, ${awayDraws} away, each told where it was`);
console.log(`  wins: ${climbs} climbed, ${tops} stayed top, ${flats} did not move, each told the truth`);
checked += 3;
if (!homeDraws || !awayDraws) fails.push('the seasons played never produced both a home and an away draw, the check proves nothing');
if (!climbs || !flats) fails.push('the seasons played never produced both a climb and a flat win, the check proves nothing');
if (!tops) fails.push('the seasons played never had a win that stayed top, the check proves nothing');

console.log('');
if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 10)) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK (${checked} checks)`);
