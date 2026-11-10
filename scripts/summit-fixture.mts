/**
 * Saves for looking at פסגת אירופה in a browser, a development tool only (never a button in the game).
 *   node --experimental-strip-types scripts/summit-fixture.mts > fixtures.json
 * Prints one JSON object: { name: the text of beapro.career.v1 }, for a browser check to put into localStorage.
 * Every save is a real career carried to the top flight through the game's own functions, and stands where the
 * name says: the summit drawn and its draw owed, a night due, between nights on the gold road, a shootout owed, the
 * bracket, the season's end with the trophy, the chronicle; and the same places in ליגת אירופה and the cup, so the
 * lower tiers can be shown to look exactly as they did.
 */
import * as G from '../src/game/state.ts';
import { drawEuro, recordMyLeg, playAiRound, advanceRound, settleMyPens } from '../src/game/euro.ts';
import { saveCareer } from '../src/game/save.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { storyFor } from '../src/game/summitStory.ts';
import { meetingOf } from '../src/game/summitMemory.ts';
import type { LegDigest, GoldenPage } from '../src/game/summitMemory.ts';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, writable: true,
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } },
});

function top(tier = 5): G.GameState {
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return {
    ...gs, phase: 'hub', week: 2, season: 3, tutorialSeen: true, notices: [],
    league: { ...gs.league, clubs: gs.league.clubs.map(c => ({ ...c, tier })) },
    summit: { ...G.emptySummit(), unlocked: true, firstEntryGemPaid: true },
    coach: { ...gs.coach, licence: 'international' },
  };
}
const write = (gs: G.GameState): string => { store.clear(); saveCareer(gs); return store.get('beapro.career.v1')!; };

const out: Record<string, string> = {};
/** the week the next night falls on */
const finalWeek = (gs: G.GameState): number => {
  for (let wk = 1; wk <= gs.league.rounds + 2; wk++) if (G.euroNight({ ...gs, week: wk }, true)) return wk;
  return gs.week;
};
for (const level of [1, 0] as const) {
  const tag = level === 1 ? 'summit' : 'euro';
  const base = top();
  const drawn = drawEuro(4321, base.clubId, base.season, level);
  // the draw owed, on the hub, and the ceremony itself
  out[`${tag}-hub-draw`] = write({ ...base, euro: drawn });
  out[`${tag}-draw`] = write({ ...base, euro: drawn, phase: 'euro-draw' });
  // the first night due before round 2
  const seen = { ...drawn, seen: true };
  out[`${tag}-hub-night`] = write({ ...base, euro: seen });
  // the same night with the match itself open: the entrance, the rival card (stage 3), the kickoff
  out[`${tag}-match`] = write({ ...base, week: finalWeek({ ...base, euro: seen }), euro: seen, phase: 'euro-match' });
  // the same night with the two sides swapped: an away night at their ground
  const swapped = { ...seen, ties: seen.ties.map((r, i) => i === seen.round ? r.map(t => t.a === base.clubId || t.b === base.clubId ? { ...t, a: t.b, b: t.a } : t) : r) };
  out[`${tag}-match-away`] = write({ ...base, week: finalWeek({ ...base, euro: swapped }), euro: swapped, phase: 'euro-match' });
  // the last sixteen won and the quarter drawn: between nights, on the gold road
  let e = recordMyLeg(recordMyLeg(seen, base.clubId, [2, 1]), base.clubId, [1, 1]);
  e = advanceRound(playAiRound(e, base.clubId, 77), base.clubId);
  out[`${tag}-hub-road`] = write({ ...base, week: 4, euro: e });
  if (level === 1) {
    // stage 5: the same road with a book (a trophy and a final lost), a win for the reel, and a history with the next club
    const leg = (goals: [number, number], scorers: LegDigest['scorers']): LegDigest => ({ goals, host: null, scorers, redMine: false, redTheirs: false });
    const g = (minute: number, name: string, mine: boolean) => ({ minute, name, mine, pen: false });
    const finals: Array<[number, string, LegDigest, boolean]> = [
      [1, 'eu2-munich', leg([1, 2], [g(20, 'יוסי כהן', true), g(55, 'א', false), g(81, 'ב', false)]), false],
      [2, 'eu2-catalonia', leg([2, 1], [g(15, 'א', false), g(60, 'דוד לוי', true), g(90, 'יוסי כהן', true)]), true],
    ];
    let book: GoldenPage[] = [];
    for (const [season, oppId, l, won] of finals) {
      const st = storyFor(l, { opp: oppId === 'eu2-munich' ? 'מינכן הבווארית' : 'קטלוניה הגדולה', city: 'ראש העין', stadium: 'היכל הכתרים', season, won, pens: null, lastTpl: book[book.length - 1]?.tpl }, 500 + season);
      book = [...book, { season, kind: won ? 'trophy' : 'final', oppId, score: l.goals, pens: null, title: st.title, line: st.line, momentId: st.momentId, tpl: st.tpl }];
    }
    const nextOpp = (() => { const t = e.ties[e.round].find(t => t.a === base.clubId || t.b === base.clubId)!; return t.a === base.clubId ? t.b : t.a; })();
    const history = { [nextOpp]: [meetingOf(1, 1, [leg([0, 1], [g(30, 'א', false)]), leg([0, 0], [])], null, false, 3)] };
    const reel = { season: base.season, round: 0, score: [2, 1] as [number, number], pens: null, goals: [g(12, 'א', false), g(48, 'דוד לוי', true), g(89, 'יוסי כהן', true)].map(({ minute, name, mine }) => ({ minute, name, mine })) };
    out[`${tag}-hub-book`] = write({ ...base, week: 4, euro: e, goldenBook: book, summitLast: reel, summitHistory: history });
    out[`${tag}-night-rival`] = write({ ...base, week: finalWeek({ ...base, euro: e }), euro: e, summitHistory: history });
  }
  out[`${tag}-bracket`] = write({ ...base, week: 4, euro: e, phase: 'euro-bracket' });
  // the quarter level after both legs: the shootout owed
  const lvl = recordMyLeg(recordMyLeg(e, base.clubId, [1, 0]), base.clubId, [0, 1]);
  out[`${tag}-hub-pens`] = write({ ...base, week: 6, euro: lvl });
  // the same shootout on other seeds: the kicks fall differently, so a browser walk can meet every outcome without forcing one
  for (const k of [1, 2, 3, 4, 5, 6]) out[`${tag}-hub-pens-${k}`] = write({ ...base, seasonSeed: base.seasonSeed + k * 7919, week: 6, euro: lvl });
  // all the way: the quarter on penalties, the semi, the final, and the trophy
  let w = advanceRound(playAiRound(settleMyPens(lvl, base.clubId, [5, 4]), base.clubId, 78), base.clubId);
  w = advanceRound(playAiRound(recordMyLeg(recordMyLeg(w, base.clubId, [2, 0]), base.clubId, [1, 1]), base.clubId, 79), base.clubId);
  out[`${tag}-final-match`] = write({ ...base, week: G.euroNight({ ...base, euro: w }, true) ? base.week : finalWeek({ ...base, euro: w }), euro: w, phase: 'euro-match' });
  w = advanceRound(playAiRound(recordMyLeg(w, base.clubId, [2, 1]), base.clubId, 80), base.clubId);
  const settled = G.settleEuroSeason({ ...base, week: 14, euro: w });
  out[`${tag}-season-end`] = write({ ...settled, phase: 'season-end', seasonOver: true });
  out[`${tag}-chronicle`] = write({ ...settled, phase: 'chronicle', week: 14 });
  out[`${tag}-bracket-won`] = write({ ...settled, phase: 'euro-bracket', week: 14 });
}
// the cup, at a club of tier 4: a real summer draws it
{
  const c = top(4);
  const table = { ...c.league.table };
  const other = c.league.clubs.find(x => x.id !== c.clubId)!.id;
  table[other] = { ...table[other], pts: 99, won: 14, played: 14 };
  const summer = G.startNextSeason({ ...c, phase: 'season-end', league: { ...c.league, table } });
  if (summer.cup) {
    const hub = { ...summer, phase: 'hub' as const, week: 1, notices: [], tutorialSeen: true };
    out['cup-hub'] = write(hub);
    out['cup-bracket'] = write({ ...hub, phase: 'cup-bracket' });
  }
}
console.log(JSON.stringify(out));
