/**
 * A career that started on an older build.
 *   node --experimental-strip-types scripts/oldsave-check.mts
 *
 * Itzik asked the question this file exists to answer: does any of the new work
 * reach somebody who is already three seasons into a career? Every feature
 * added lately puts a new field on the save, and a save written last month has
 * none of them. The failure is silent and total — the game either throws on
 * load and the career is gone, or it loads and quietly behaves like the old
 * build forever.
 *
 * So this takes a real career, strips it back to what an old build would have
 * written, puts it through the loader, and then insists every recent feature
 * actually arrives.
 */
import * as G from '../src/game/state.ts';
import * as L from '../src/game/liveMatch.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { isLegend, LEGEND_TOWN } from '../src/data/legends.ts';
import { starTarget } from '../src/game/preseason.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const fails: string[] = [];
let checked = 0;

/* localStorage, which node does not have and the loader insists on */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, writable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});

/**
 * Everything added to the save since careers started being played. A build from
 * before any of it wrote none of these, so an old save has them all missing.
 */
const ADDED_SINCE = [
  'wardrobe', 'kitReveal',          // season kits
  'invite', 'inviteFrom',           // bringing a friend in
  'summerMark',                     // the untouched-summer warning
  'coach',                          // the manager's own standing
  'gems', 'adsWatched', 'pull',     // the premium currency
  'stadiumReveal', 'marketFocus',
  'chronicleSeen', 'fanHistory',
  'pressHistory',                   // the reporter's memory
  'suspensions', 'emergencyYouth', 'notices',   // the ban after a red
  'exits',                          // men sold into the league
  'sitOut', 'sitOutNext', 'matchMods', 'followUps', 'youthBoost', 'youthLeaveRisk', 'summerExits',   // answers that act
  'tutorialSeen',                   // the first-week explainer
  'seats',                          // the manager's own team sheet
] as const;

function career(town = LEGEND_TOWN, seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, town);
  return G.afterSigning(gs, {});
}

/** A save as an older build would have written it: the new fields simply gone. */
function asOldSave(gs: G.GameState): G.GameState {
  const raw = JSON.parse(JSON.stringify(gs)) as Record<string, unknown>;
  for (const k of ADDED_SINCE) delete raw[k];
  return raw as unknown as G.GameState;
}

function roundTrip(gs: G.GameState): G.GameState | null {
  store.clear();
  saveCareer(asOldSave(gs));
  return loadCareer();
}

/* 1. IT LOADS AT ALL.
      A missing field that something reads without a guard throws on the way in,
      and the career is simply gone. This is the one that matters most. */
{
  const gs = career();
  let loaded: G.GameState | null = null;
  checked += 2;
  try { loaded = roundTrip(gs); } catch (e) { fails.push(`an old save threw on load: ${(e as Error).message}`); }
  if (!loaded) fails.push('an old save did not come back from the loader at all');
  if (loaded) {
    checked += 3;
    if (loaded.clubId !== gs.clubId) fails.push('the club was lost on the way in');
    if (G.squadSize(loaded) !== G.squadSize(gs)) fails.push('the squad changed size on the way in');
    if (loaded.season !== gs.season) fails.push('the season was lost');
    // and every field an old build never wrote is back, with something sane
    for (const k of ADDED_SINCE) {
      checked++;
      if ((loaded as unknown as Record<string, unknown>)[k] === undefined) {
        fails.push(`"${k}" is still missing after loading, so anything reading it will throw later`);
      }
    }
  }
  console.log(`  an old save loads, with all ${ADDED_SINCE.length} of the newer fields filled in`);
}

/* 2. AND IT KEEPS PLAYING.
      Loading is not the same as working. A full match, driven from the loaded
      state, exercises the engine paths every one of these features touches. */
{
  const loaded = roundTrip(career())!;
  checked++;
  let st: L.LiveState | null = null;
  try {
    st = L.createLive(G.liveMatchInput(loaded));
  } catch (e) { fails.push(`an old save cannot start a match: ${(e as Error).message}`); }

  if (st) {
    const rng = createRng(11);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
    let guard = 0, moments = 0;
    const kinds = new Set<string>();
    try {
      while (st.phase !== 'done' && guard++ < 4000) {
        if (st.phase === 'halftime') {
          // the newest feature of all, on the oldest possible save
          L.changeFormation(st, '4-3-3');
          L.resumeFromHalfTime(st);
          continue;
        }
        if (st.phase === 'moment' && st.pending) {
          const m = st.pending; moments++; kinds.add(m.kind);
          switch (m.kind) {
            case 'penalty': L.resolvePenalty(st, pick(['left', 'center', 'right'] as const)); break;
            case 'def_penalty': L.resolveDefPenalty(st, pick(['left', 'center', 'right'] as const)); break;
            case 'shot': L.resolveShot(st, pick(['left', 'center', 'right'] as const)); break;
            case 'free_kick': L.resolveFreeKick(st, pick(['left', 'center', 'right'] as const)); break;
            case 'one_on_one': L.resolveOneOnOne(st, pick(['dribble', 'finish'])); break;
            case 'def_keeper': L.resolveDefKeeper(st, pick(['rush', 'stay'])); break;
            case 'def_tackle': L.resolveDefTackle(st, pick(['slide', 'contain'])); break;
            case 'tactic': L.resolveTactic(st, m.options?.[0]?.id ?? ''); break;
          }
          if (st.phase === 'moment') st.phase = 'play';
          continue;
        }
        L.step(st);
      }
    } catch (e) { fails.push(`an old save broke mid match: ${(e as Error).message}`); }
    checked += 3;
    if (st.phase !== 'done') fails.push('a match from an old save never finished');
    if (moments === 0) fails.push('a match from an old save offered no decisions at all');
    if ((st.iAmHome ? st.home : st.away).tactic.formation !== '4-3-3') {
      fails.push('the half time shape change did not take on an old save');
    }
    console.log(`  and plays a full match from it: ${moments} decisions, and the shape changed at half time`);
  }
}

/* 3. THE SEASON KIT CATCHES UP RATHER THAN RESTYLING HIM MID CAREER.
      An old save has no wardrobe. The next summer records what he is already
      wearing, and the summer after that is the first real new shirt. */
{
  const gs = career('תל אביב');
  const loaded = roundTrip({ ...gs, season: 3, lastReport: { season: 2, result: 'promoted' } as never })!;
  const was = G.club(loaded);

  const opened = G.enterSeason(loaded);
  checked += 3;
  if (opened.kitReveal) fails.push('an old save was shown a kit reveal with no previous shirt to compare');
  if (G.club(opened).primary !== was.primary) fails.push('an old save had its club colour changed on load');
  if ((opened.wardrobe ?? []).length !== 1) fails.push('the wardrobe did not open with the shirt he is already in');

  const next = G.enterSeason({ ...opened, season: 4, lastReport: { season: 3, result: 'champion' } as never });
  checked++;
  if (!next.kitReveal) fails.push('the summer after catching up, an old save still got no new kit');
  console.log(`  season kits: catches up in one summer, then unveils a ${next.kitReveal?.reason} kit`);
}

/* 4. THE ראש העין REGULAR ARRIVES, AND IS NOT PUT UP FOR SALE.
      Both halves of what Itzik reported, on a save that predates either fix. */
{
  const gs = career(LEGEND_TOWN);
  const stripped: G.GameState = {
    ...gs,
    league: {
      ...gs.league,
      squads: {
        ...gs.league.squads,
        [gs.clubId]: {
          starters: G.mySquad(gs).starters.filter(p => !isLegend(p)),
          bench: G.mySquad(gs).bench.filter(p => !isLegend(p)),
        },
      },
    },
  };
  const loaded = roundTrip(stripped)!;
  checked++;
  if (G.mySquad(loaded).starters.concat(G.mySquad(loaded).bench).some(isLegend)) {
    fails.push('the fixture failed to strip him');
  }

  const opened = G.enterSeason(loaded);
  const here = [...G.mySquad(opened).starters, ...G.mySquad(opened).bench].filter(isLegend);
  checked += 2;
  if (here.length !== 1) fails.push(`an old ${LEGEND_TOWN} career opened a season with ${here.length} regulars`);

  const star = starTarget(G.mySquad(opened));
  if (star && isLegend(star)) fails.push(`${star.name} was put up for transfer on an old save`);
  console.log(`  ${LEGEND_TOWN}: ${here[0]?.name} joined an old career, and is not for sale`);
}

/* 5. THE PRE MATCH READ IS THE NEW ONE.
      Nothing about it is stored, which is exactly why it is worth confirming:
      it proves the "computed live" half of the answer, not just the patched half. */
{
  const loaded = roundTrip(career('תל אביב'))!;
  const scout = G.matchupScout(loaded);
  checked += 2;
  if (!scout) fails.push('an old save has no pre-match read at all');
  if (scout && /מטומטם/.test(scout.line)) fails.push('an old save still gets the old insult before a match');
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a career started on an older build gets all of it');
process.exit(fails.length ? 1 : 0);
