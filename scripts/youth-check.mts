/**
 * The academy produces, every season, from the second one on.
 *   node --experimental-strip-types scripts/youth-check.mts
 */
import * as G from '../src/game/state.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { seedYouth, advanceYouth, emptyYouth, outlook } from '../src/game/youth.ts';
import { potentialBand } from '../src/game/career.ts';

const bad: string[] = [];
const check = (n: string, ok: boolean, d = '') => { if (!ok) bad.push(`${n}  ${d}`); else console.log(`  ok    ${n}${d ? '  ' + d : ''}`); };

let gs = G.newGame(4242);
gs = G.setProfile(gs, { name: 'א', nickname: '', age: 38, type: 'mental' });
gs = G.pickCity(gs, 'חולון');
gs = G.afterSigning(gs, {});

check('the academy is stocked at signing', gs.youth.players.length >= 4, `${gs.youth.players.length} kids`);
check('every kid is 16 to 18', gs.youth.players.every(p => p.age >= 16 && p.age <= 18));
check('nobody starts already 18', gs.youth.players.every(p => p.age < 18));

// remember the best kid's rating, then run five summers
const before = Math.max(...gs.youth.players.map(overall));
let graduations = 0, everReady = 0;
let atDecision: G.GameState | null = null;
let atMixed: G.GameState | null = null;   // a summer with a kid the coach likes AND one he does not
for (let s = 1; s <= 5; s++) {
  gs = G.enterSeason(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, 'base');
  // jump the season with the table handed to us, the pitch is not the test
  const table = Object.fromEntries(Object.entries(gs.league.table).map(([id, t]) => [id, { ...t, played: 14 }]));
  gs = { ...gs, league: { ...gs.league, table }, meters: { ...gs.meters, money: 3_000_000 }, crisisDone: true, week: gs.league.rounds };
  gs = G.startNextSeason(gs);
  if (gs.youth.graduated.length) graduations++;
  everReady += gs.youth.ready.length;
  check(`season ${s}: a kid broke out`, gs.youth.graduated.length >= 1, gs.youth.graduated.join(', ') || 'none');
  check(`season ${s}: academy still stocked`, gs.youth.players.length >= 4, `${gs.youth.players.length}`);
  check(`season ${s}: kids in band`, gs.youth.players.every(p => p.age >= 16 && p.age <= 18));
  // the eighteen year olds are on the list, and the summer opens on them
  const grads = G.youthGraduates(gs);
  if (grads.length) {
    if (!atDecision) atDecision = gs;
    if (!atMixed && grads.some(k => G.graduateOutlook(gs, k).recommend) && grads.some(k => !G.graduateOutlook(gs, k).recommend)) atMixed = gs;
    check(`season ${s}: the summer opens on the decision`, gs.phase === 'youth-decision', `phase ${gs.phase}`);
    check(`season ${s}: every one who turned 18 is on the list`, grads.length === gs.youth.ready.length && grads.every(p => gs.youth.ready.includes(p.name)));
    // answer them as a manager would: sign the ones the coach likes, let the rest go
    for (const k of grads) gs = G.graduateOutlook(gs, k).recommend ? G.signGraduate(gs, k.id) : G.releaseGraduate(gs, k.id);
    gs = G.finishYouthDecision(gs);
    check(`season ${s}: after the answers the summer goes on`, gs.phase === 'preseason', `phase ${gs.phase}`);
  }
}
check('at least one prospect turned 18 and became ready', everReady >= 1, `${everReady} over five years`);

/* the decision itself, on the first summer that had somebody to decide on */
if (!atDecision) { bad.push('no summer in five years had an eighteen year old to decide on'); }
else {
  const kids = G.youthGraduates(atDecision);
  const one = kids[0];
  const squadNow = G.squadSize(atDecision);
  const chron = atDecision.chronicle.length, exits = atDecision.exits.length, notices = atDecision.notices.length;

  // a senior deal: in the squad, on a three year deal, off the list
  const signed = G.signGraduate(atDecision, one.id);
  check('signing him adds one man to the squad', G.squadSize(signed) === squadNow + 1, `${squadNow} -> ${G.squadSize(signed)}`);
  check('signing him gives a three year deal', signed.contracts[one.id] === 3);
  check('signing him takes him off the academy list', !signed.youth.players.some(p => p.id === one.id) && !signed.youth.ready.includes(one.name));

  // let go for good: nothing of him kept anywhere
  const gone = G.releaseGraduate(atDecision, one.id);
  const inSquad = [...G.mySquad(gone).starters, ...G.mySquad(gone).bench].some(p => p.id === one.id);
  check('releasing him takes him off the academy list', !gone.youth.players.some(p => p.id === one.id) && !gone.youth.ready.includes(one.name));
  check('releasing him does not put him in the squad', !inSquad && G.squadSize(gone) === squadNow);
  check('releasing him leaves no record of him', gone.chronicle.length === chron && gone.exits.length === exits && gone.notices.length === notices && !JSON.stringify(gone.youth).includes(one.id));

  // signing past the maximum is allowed, and then the summer will not start
  let full = atDecision;
  for (let i = 0; G.squadSize(full) < 20 && i < 12; i++) {
    const sq = G.mySquad(full);
    const extra = { ...sq.bench.find(p => p.position !== 'GK')!, id: `fill-${i}`, name: `נוסף ${i}` };
    full = { ...full, league: { ...full.league, squads: { ...full.league.squads, [full.clubId]: { starters: sq.starters, bench: [...sq.bench, extra] } } } };
  }
  const over = G.signGraduate(full, one.id);
  check('a squad of 20 can still sign him, to 21', G.squadSize(full) === 20 && G.squadSize(over) === 21, `${G.squadSize(full)} -> ${G.squadSize(over)}`);
  check('and it is one over, to the man', G.overSquadBy(over) === 1);
  const lastRound = { ...over, phase: 'preseason-market' as const, preWeek: 3 };
  check('the summer will not start with 21', !!G.preseasonBlockedReason(lastRound), String(G.preseasonBlockedReason(lastRound)));
  const trimmed = { ...lastRound, league: { ...lastRound.league, squads: { ...lastRound.league.squads, [lastRound.clubId]: { starters: G.mySquad(lastRound).starters, bench: G.mySquad(lastRound).bench.slice(0, -1) } } } };
  check('and it will with 20', G.squadSize(trimmed) === 20 && !/מותר/.test(G.preseasonBlockedReason(trimmed) ?? ''), String(G.preseasonBlockedReason(trimmed)));

  // the phase does not move on while anybody is unanswered, and does when nobody is
  const mid = G.finishYouthDecision(atDecision);
  check('the summer does not go on with a kid unanswered', mid.phase === 'youth-decision' && G.youthGraduates(mid).length === kids.length);
  const noneLeft = G.finishYouthDecision(kids.reduce((g, k) => G.releaseGraduate(g, k.id), atDecision));
  check('the summer goes on once every one is answered', noneLeft.phase === 'preseason');

  // "release everybody the coach does not recommend"
  check('some summer had a kid the coach likes and one he does not, so the next claim is not empty', atMixed !== null);
  if (atMixed) {
    const grads = G.youthGraduates(atMixed);
    const rest = G.releaseUnrecommended(atMixed);
    const keptIds = G.youthGraduates(rest).map(p => p.id).sort().join();
    const wantedIds = grads.filter(k => G.graduateOutlook(atMixed!, k).recommend).map(p => p.id).sort().join();
    check('releasing the rest keeps exactly the ones the coach recommends', keptIds === wantedIds && keptIds !== '' && keptIds !== grads.map(p => p.id).sort().join(), `${keptIds.split(',').filter(Boolean).length} of ${grads.length} kept`);
  }
}

/* who the coach recommends: the rule, and how many */
{
  const LEVEL: Record<number, number> = { 1: 53, 2: 58.5, 3: 64, 4: 69.5, 5: 75 };
  let disagreements = 0, seen = 0;
  for (const tier of [1, 2, 3, 4, 5]) {
    let n = 0, rec = 0;
    for (let s = 0; s < 400; s++) {
      const rng = createRng(3000 + s);
      let y = { ...emptyYouth(), players: seedYouth(tier, rng, new Set(), 5) };
      for (let year = 0; year < 3; year++) {
        y = advanceYouth(y, tier, rng, new Set());
        for (const k of y.players.filter(p => p.age >= 18)) {
          const o = outlook(k, tier);
          const band = potentialBand(k);
          const hi = band ? band.hi : overall(k);
          // the agreed rule: he can reach at least four over the division's level
          if (o.recommend !== (hi >= LEVEL[tier] + 4)) disagreements++;
          seen++; n++; if (o.recommend) rec++;
        }
        y = { ...y, players: y.players.filter(p => p.age < 18) };
      }
    }
    const share = rec / n;
    check(`tier ${tier}: about one kid in four is recommended`, share >= 0.20 && share <= 0.30, `${(100 * share).toFixed(1)}% of ${n}`);
  }
  check('the coach recommends by the rule: can reach four over the level', disagreements === 0, `${disagreements} of ${seen} disagree`);
}

/* the eighteen year olds are kept on the list until they are answered, and an unanswered one is not kept twice */
{
  const rng = createRng(77);
  const y17 = { ...emptyYouth(), players: seedYouth(3, rng, new Set(), 5).map(p => ({ ...p, age: 17 })) };
  const y18 = advanceYouth(y17, 3, rng, new Set());
  check('a kid who turns 18 stays on the list', y18.players.filter(p => p.age === 18).length === 5, `${y18.players.filter(p => p.age === 18).length} of 5`);
  const again = advanceYouth(y18, 3, rng, new Set());
  const undecided = new Set(y18.players.filter(p => p.age === 18).map(p => p.id));
  check('one nobody decided on is not carried into a nineteenth year', again.players.every(p => !undecided.has(p.id) && p.age <= 18));
}

console.log(bad.length ? `\nFAIL\n - ${bad.join('\n - ')}` : '\nOK, the academy develops, graduates, and asks about every eighteen year old');
process.exit(bad.length ? 1 : 0);
