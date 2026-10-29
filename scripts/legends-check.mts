/**
 * The ראש העין regulars.
 *   node --experimental-strip-types scripts/legends-check.mts
 *
 * Ten written characters who belong to one club and nowhere else. The rules
 * that make them work, and every one of them is easy to break by accident:
 * only ראש העין, exactly one at a time, never the manager himself, top of a
 * ליגה ג׳ dressing room, and he never asks to leave.
 */
import * as G from '../src/game/state.ts';
import {
  LEGENDS, LEGEND_TOWN, LEGEND_AGE, isLegend, legendByName, pickLegend,
  makeLegendPlayer, withLegend,
} from '../src/data/legends.ts';
import { overall, createRng } from '../src/engine/matchEngine.ts';
import { assignTraits } from '../src/data/personalities.ts';
import { readFileSync } from 'node:fs';
import { starTarget, youngTarget } from '../src/game/preseason.ts';
import { renameWith, renameLegacy, nameHash, NAMES_VERSION } from '../src/game/renames.ts';

const fails: string[] = [];
let checked = 0;

const career = (manager: string, town = LEGEND_TOWN, seed = 4242) => {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: manager, nickname: '', type: 'hunter', age: 40 } as never);
  return G.pickCity(gs, town);
};
const squadOf = (gs: G.GameState, clubId = gs.clubId) => {
  const sq = gs.league.squads[clubId];
  return [...sq.starters, ...sq.bench];
};

/* 1. the ten themselves: all thirty, all distinct, all top of a ליגה ג׳ squad */
{
  checked += 3;
  if (LEGENDS.length !== 10) fails.push(`there are ${LEGENDS.length} of them, not 10`);
  if (new Set(LEGENDS.map(l => l.name)).size !== LEGENDS.length) fails.push('two of them share a name');
  if (new Set(LEGENDS.map(l => l.key)).size !== LEGENDS.length) fails.push('two of them share a key');
  for (const l of LEGENDS) {
    const p = makeLegendPlayer(l, 'x');
    checked += 3;
    if (p.age !== LEGEND_AGE) fails.push(`${l.name} is ${p.age}, they are all ${LEGEND_AGE}`);
    if (!l.says.trim()) fails.push(`${l.name} has no reputation written`);
    const o = overall(p);
    if (o < 55 || o > 66) fails.push(`${l.name} rates ${o}, outside the band a ליגה ג׳ star sits in`);
  }
}

/* 2. ONLY the ראש העין club, whoever is managing it.
      They belong to the club, not to the player, so if ראש העין turns up in
      your division as an opponent it still fields one. What must never happen
      is one of them appearing in any OTHER club's dressing room. */
{
  let asOpponent = 0;
  for (const town of ['תל אביב', 'חיפה', 'באר שבע', 'פתח תקווה', 'נתניה', 'רמת גן']) {
    const gs = career('בדיקה', town);
    for (const c of gs.league.clubs) {
      const mine = squadOf(gs, c.id).filter(isLegend);
      checked++;
      if (c.city === LEGEND_TOWN) {
        if (mine.length !== 1) fails.push(`${town}: ${c.short} is a ${LEGEND_TOWN} club with ${mine.length} regulars`);
        else asOpponent++;
      } else if (mine.length) {
        fails.push(`${town}: ${c.short} (${c.city}) has ${mine[0].name}, who only plays for ${LEGEND_TOWN}`);
      }
    }
  }
  console.log(`  seen ${asOpponent} times as an opponent's club, and in no other town's squad`);
}

/* 3. ראש העין always has exactly one, never two */
{
  let found = 0;
  for (let seed = 0; seed < 25; seed++) {
    const gs = career('בדיקה', LEGEND_TOWN, 1000 + seed * 7);
    const mine = squadOf(gs).filter(isLegend);
    checked++;
    if (mine.length !== 1) fails.push(`seed ${seed}: ${mine.length} regulars in the squad, wanted exactly 1`);
    else found++;
  }
  console.log(`  ${found} of 25 careers in ${LEGEND_TOWN} opened with exactly one of them`);
}

/* 4. THE RULE: a manager is never handed himself */
{
  for (const l of LEGENDS) {
    let sawHimself = 0, careers = 0;
    for (let seed = 0; seed < 30; seed++) {
      const gs = career(l.name, LEGEND_TOWN, 2000 + seed * 13);
      careers++;
      if (squadOf(gs).some(p => p.name === l.name)) sawHimself++;
    }
    checked++;
    if (sawHimself > 0) fails.push(`${l.name} managed and was handed himself in ${sawHimself} of ${careers} careers`);
  }
  // and he can still be given any of the other nine
  const seen = new Set<string>();
  for (let seed = 0; seed < 60; seed++) {
    const gs = career('צחי עזרן', LEGEND_TOWN, 3000 + seed * 11);
    for (const p of squadOf(gs)) if (isLegend(p)) seen.add(p.name);
  }
  checked++;
  if (seen.size < 5) fails.push(`managing as himself, only ${seen.size} different team mates ever turned up`);
  if (seen.has('צחי עזרן')) fails.push('he was handed himself after all');
  console.log(`  managing as צחי עזרן: ${seen.size} of the other 9 seen, himself never`);
}

/* 5. the draw is not stuck on one name */
{
  const seen = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const l = pickLegend(createRng(9000 + i * 3));
    if (l) seen.add(l.name);
  }
  checked++;
  if (seen.size !== LEGENDS.length) fails.push(`only ${seen.size} of the ${LEGENDS.length} are ever drawn`);
}

/* 6. he stays. A squad that already has one is handed straight back. */
{
  const gs = career('בדיקה');
  const before = squadOf(gs).filter(isLegend)[0];
  const again = withLegend(gs.league.squads[gs.clubId], LEGEND_TOWN, 'בדיקה', createRng(77), () => 'p-new');
  const after = [...again.starters, ...again.bench].filter(isLegend);
  checked += 2;
  if (after.length !== 1) fails.push(`re-applying gave ${after.length} regulars`);
  if (after[0]?.name !== before?.name) fails.push('the regular was swapped for a different one instead of staying');
}

/* 7. the squad stays a legal size, and he is not conjured out of thin air */
{
  const plain = career('בדיקה', 'תל אביב');
  const roshHaayin = career('בדיקה', LEGEND_TOWN);
  checked++;
  if (squadOf(roshHaayin).length !== squadOf(plain).length) {
    fails.push(`the squad is ${squadOf(roshHaayin).length} men against ${squadOf(plain).length} elsewhere`);
  }
}

/* 8. he never asks to leave, and his own reputation is what the squad repeats */
{
  const gs = career('בדיקה');
  const him = squadOf(gs).find(isLegend)!;
  const traits = assignTraits(squadOf(gs));
  const his = traits.get(him.id) ?? [];
  checked += 3;
  if (his.length !== 1) fails.push(`${him.name} has ${his.length} traits, he should have exactly his own`);
  const said = his[0]?.line(him.name, (a) => a[0]);
  if (said !== legendByName(him.name)?.says) fails.push(`${him.name} is described by the general pool, not his own line`);
  if (his[0]?.label !== legendByName(him.name)?.label) fails.push(`${him.name} wears the wrong chip`);

  // the dilemma system must never pick him as the man making demands
  const src = readFileSync('src/game/state.ts', 'utf8');
  const ctx = src.slice(src.indexOf('function dilemmaCtx'), src.indexOf('function dilemmaCtx') + 1200);
  checked += 2;
  if (!ctx.includes('.filter(p => !isLegend(p))')) {
    fails.push('a regular can be picked as the player demanding a move or sulking');
  }
  if (!ctx.includes('const forgotten') || !/forgotten[\s\S]{0,120}isLegend/.test(ctx)) {
    fails.push('a regular can be picked as the forgotten man');
  }
}

/* 9. A CAREER ALREADY UNDER WAY gets one at the next season opening.
      This is the one that was missed and the one Itzik hit: he opened a season
      in ראש העין and nobody turned up, because his squad was built before any
      of this existed and a legend was only ever put in when a career BEGINS or
      when a season rolls over. The season opening is the boundary every career
      crosses, so that is where it has to happen too. */
{
  const strip = (gs: G.GameState): G.GameState => {
    const sq = G.mySquad(gs);
    return {
      ...gs,
      league: {
        ...gs.league,
        squads: {
          ...gs.league.squads,
          [gs.clubId]: {
            starters: sq.starters.filter(p => !isLegend(p)),
            bench: sq.bench.filter(p => !isLegend(p)),
          },
        },
      },
    };
  };

  let gs = career('בדיקה');
  gs = G.afterSigning(gs, {});
  gs = strip(gs);                       // a save from before the feature
  const sizeBefore = G.squadSize(gs);
  checked++;
  if (squadOf(gs).some(isLegend)) fails.push('the fixture failed to strip him');

  gs = G.enterSeason(gs);
  const now = squadOf(gs).filter(isLegend);
  checked += 2;
  if (now.length !== 1) {
    fails.push(`a career already under way opened a season with ${now.length} regulars, it has to be 1`);
  }
  // and he joins rather than displacing somebody the manager chose and paid for
  if (G.squadSize(gs) !== sizeBefore + 1) {
    fails.push(`he arrived by deleting a player: squad went ${sizeBefore} to ${G.squadSize(gs)}`);
  }
  console.log(`  a career already under way: ${now[0]?.name} joined at the season opening, squad ${sizeBefore} to ${G.squadSize(gs)}`);
}

/* 10. HE IS NEVER THE ONE A BIGGER CLUB COMES FOR.
       The one Itzik hit. Check 8 below guards the dilemma system, and that felt
       like it covered "he never asks to leave" — it did not. The summer transfer
       saga picks its man somewhere else entirely: the highest rated outfielder
       aged thirty or under. These men are aged exactly thirty and rated at the
       top of a ליגה ג׳ squad, so that rule chose one of them EVERY summer, and
       the man written as the one who will not leave was handing in a transfer
       request in his first one. */
{
  let picked = 0, careers = 0;
  for (let seed = 0; seed < 40; seed++) {
    const gs = career('בדיקה', LEGEND_TOWN, 5000 + seed * 17);
    const star = starTarget(G.mySquad(gs));
    careers++;
    checked++;
    if (star && isLegend(star)) {
      picked++;
      fails.push(`${star.name} was put up for transfer, and he does not leave ${LEGEND_TOWN}`);
    }
  }
  // and somebody else IS still offered, or the saga quietly stops existing
  checked++;
  const gs = career('בדיקה', LEGEND_TOWN, 4711);
  const star = starTarget(G.mySquad(gs));
  if (!star) fails.push('nobody at all is a transfer target now, the summer saga is gone');
  console.log(`  the summer transfer saga: ${careers - picked} of ${careers} careers came for somebody else`);

  // the kid asking for a raise is age capped, so he can never be one of them
  checked++;
  const kid = youngTarget(G.mySquad(gs));
  if (kid && isLegend(kid)) fails.push(`${kid.name} was picked as the underpaid kid, at ${LEGEND_AGE}`);
}

/* 11. a fresh career is still the same size as everybody else's */
{
  const mine = career('בדיקה', LEGEND_TOWN);
  const other = career('בדיקה', 'תל אביב');
  checked++;
  if (squadOf(mine).length !== squadOf(other).length) {
    fails.push(`a new ${LEGEND_TOWN} career starts with ${squadOf(mine).length} men against ${squadOf(other).length}`);
  }
}

/* 12. a career saved under the old names comes back with the new ones (29.10).
 *     The old names are not in the code, so a made up name stands in for one. */
{
  const OLD = 'פלוני אלמוני', OLD_KEY = 'ploni-almoni', MINE = 'אלמוני פלוני';
  const l = LEGENDS[0];
  const gs = career('בדיקה', LEGEND_TOWN, 5150);
  const sq = gs.league.squads[gs.clubId];
  const him = [...sq.starters, ...sq.bench].find(isLegend)!;
  const raw = JSON.parse(JSON.stringify(gs)) as G.GameState & Record<string, unknown>;
  const rawSq = raw.league.squads[raw.clubId];
  const rawHim = [...rawSq.starters, ...rawSq.bench].find(p => p.id === him.id)!;
  rawHim.name = OLD;
  (raw as Record<string, unknown>).probe = { news: `${OLD} כבש, ו${OLD}, שוב.`, trait: `legend-${OLD_KEY}`, kept: 'פלוני אחר', mine: `המאמן ${MINE} חתם` };
  raw.profile = { ...raw.profile, name: MINE };
  const names = new Map([[nameHash(OLD), l.name], [nameHash(MINE), LEGENDS[1].name]]);
  const keys = new Map([[nameHash(OLD_KEY), l.key]]);
  const out = renameWith(raw, names, keys) as typeof raw;
  const outSq = out.league.squads[out.clubId];
  const probe = (out as Record<string, unknown>).probe as Record<string, string>;
  checked += 6;
  if (![...outSq.starters, ...outSq.bench].some(p => p.id === him.id && p.name === l.name)) fails.push('the old name on the regular was not brought up to date');
  if ([...outSq.starters, ...outSq.bench].filter(isLegend).length !== 1) fails.push('after the rename the squad does not have exactly one regular');
  if (probe.news !== `${l.name} כבש, ו${l.name}, שוב.`) fails.push(`the news line read "${probe.news}"`);
  if (probe.trait !== `legend-${l.key}`) fails.push(`the trait id read "${probe.trait}"`);
  if (probe.kept !== 'פלוני אחר') fails.push('a name that only shares a first name was changed');
  if (out.profile.name !== MINE || probe.mine !== `המאמן ${MINE} חתם`) fails.push('the manager\'s own typed name was renamed');
  checked += 2;
  if (out.namesVersion !== NAMES_VERSION) fails.push('the save was not marked as renamed');
  const fresh = JSON.parse(JSON.stringify(gs));
  if (JSON.stringify({ ...renameLegacy(fresh), namesVersion: undefined }) !== JSON.stringify({ ...gs, namesVersion: undefined })) fails.push('a save with no old names in it came out changed');
  console.log('  an old save: the regular, his news and his trait take the new name, the manager keeps his own');
}

console.log(`\n${checked} checks`);
console.log(`${LEGENDS.length} regulars, ${Math.min(...LEGENDS.map(l => overall(makeLegendPlayer(l, 'x'))))} to ${Math.max(...LEGENDS.map(l => overall(makeLegendPlayer(l, 'x'))))} OVR, all aged ${LEGEND_AGE}`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : `\nOK, one of them at ${LEGEND_TOWN} and nowhere else, and never yourself`);
process.exit(fails.length ? 1 : 0);
