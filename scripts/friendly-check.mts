/**
 * The works team's friendly, Itzik's item 53 of the 4.10 batch.
 *   node --experimental-strip-types scripts/friendly-check.mts
 *
 * Agreed with him: option one of the dilemma adds a match against a works team
 * with a random name, played in an instant after the sheet is sent, told in a
 * popup with a drawn scoreboard and a description, the bench playing instead of
 * the stars, the fee paid when the popup closes. These are the rules that keep
 * it honest:
 *   1. the dilemma agrees the friendly and names the works team, once a season
 *   2. the sheet goes in: no friendly means the match, a friendly means the
 *      popup, and nothing about the league moves on the way
 *   3. the bench plays, the stars rest, a keeper always goes in
 *   4. the evening is the same on a reload and told truthfully
 *   5. closing the popup pays the agreed fee once and tires the men who played
 *   6. the screen is wired in and the words obey the house rules
 */
import * as G from '../src/game/state.ts';
import { TEMPLATES } from '../src/data/dilemmas.ts';
import { FACTORIES, describeFriendly } from '../src/data/friendly.ts';
import type { FriendlyEvent } from '../src/data/friendly.ts';
import { overall } from '../src/engine/matchEngine.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { readFileSync } from 'node:fs';

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

function career(seed = 4242): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, LEGEND_TOWN);
  gs = G.afterSigning(gs, {});
  gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
  while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
  return { ...gs, phase: 'hub', week: 4 };
}
function answer(gs: G.GameState, option: number): G.GameState {
  const rolled = G.rollNamedDilemma(gs, 'midweek_friendly', 1);
  if (!rolled) throw new Error('the friendly is not on offer on this save');
  const next = G.chooseDilemma({ ...gs, phase: 'dilemma', dilemma: rolled }, option);
  return { ...next, phase: 'teamsheet', dilemma: null };
}
const sheetIds = (gs: G.GameState) => G.lineup(gs).map(p => p.id);
const all = (gs: G.GameState) => [...G.mySquad(gs).starters, ...G.mySquad(gs).bench];

/* ----------------------------------------------------- 1. the dilemma */
{
  const tpl = TEMPLATES.find(t => t.id === 'midweek_friendly');
  checked += 3;
  if (!tpl) fails.push('the midweek friendly is not among the dilemmas');
  if (tpl && !tpl.oncePerSeason) fails.push('the works team came back twice in a season, Itzik wanted it once');
  if (tpl && tpl.when) fails.push('the friendly has a gate, but the draft says it is always on offer');

  const gs0 = career(701);
  const yes = answer(gs0, 0), no = answer(gs0, 1);
  const f = yes.matchMods.friendly;
  checked += 5;
  if (!f) fails.push('agreeing to the friendly agreed nothing');
  else {
    if (!FACTORIES.includes(f.factory)) fails.push(`the works team is "${f.factory}", not from the approved list`);
    if (f.fee !== 15_000) fails.push(`the fee is ${f.fee}, the agreed figure is 15,000`);
    if (f.report) fails.push('the match was played before the sheet was sent');
  }
  if (no.matchMods.friendly) fails.push('declining the friendly still agreed one');
  if (yes.meters.money !== gs0.meters.money) fails.push('the fee was paid before a ball was kicked');

  // the same week, the same works team; other weeks draw other ones
  checked += 2;
  if (answer(gs0, 0).matchMods.friendly?.factory !== f?.factory) fails.push('a reload would play a different works team');
  const seen = new Set<string>();
  for (let w = 1; w <= 14; w++) seen.add(answer({ ...gs0, week: w }, 0).matchMods.friendly!.factory);
  if (seen.size < 4) fails.push(`only ${seen.size} different works teams across fourteen weeks`);

  // the list itself: twelve, distinct, plain
  checked += 3;
  if (FACTORIES.length !== 12 || new Set(FACTORIES).size !== 12) fails.push('the works team list is not twelve distinct names');
  if (FACTORIES.some(n => /[0-9—–]/.test(n) || /\s[,.!?]/.test(n))) fails.push('a works team name carries a digit, a long dash or a stray space');
  if (FACTORIES.some(n => n.trim() !== n || n.length < 8)) fails.push('a works team name is empty or padded');
}

/* ------------------------------------------- 2. the sheet goes in */
{
  const gs0 = career(702);
  checked += 2;
  const plain = G.sendTeamsheet({ ...gs0, phase: 'teamsheet' });
  if (plain.phase !== 'match') fails.push(`with no friendly the sheet led to "${plain.phase}", not the match`);
  if (JSON.stringify({ ...plain, phase: 'x' }) !== JSON.stringify({ ...gs0, phase: 'x' })) fails.push('sending a sheet with no friendly changed the save');

  const agreed = answer(gs0, 0);
  const sent = G.sendTeamsheet(agreed);
  checked += 7;
  if (sent.phase !== 'friendly') fails.push(`with a friendly the sheet led to "${sent.phase}", not the popup`);
  const r = sent.matchMods.friendly?.report;
  if (!r) fails.push('the popup has no report to show');
  if (sent.meters.money !== agreed.meters.money) fails.push('the money moved before the popup was closed');
  if (JSON.stringify(sent.league.table) !== JSON.stringify(agreed.league.table)) fails.push('a friendly moved the league table');
  if (JSON.stringify(sent.seasonStats) !== JSON.stringify(agreed.seasonStats)) fails.push('a friendly wrote into the season stats before the popup closed');
  if (sent.week !== agreed.week || sent.form.join() !== agreed.form.join()) fails.push('a friendly moved the calendar or the form');
  if (JSON.stringify(sent.matchMods.fitness ?? {}) !== JSON.stringify(agreed.matchMods.fitness ?? {})) fails.push('the men were tired before the popup closed');

  // asking again does not play it twice
  checked++;
  if (JSON.stringify(G.sendTeamsheet({ ...sent, phase: 'teamsheet' }).matchMods.friendly) !== JSON.stringify(sent.matchMods.friendly))
    fails.push('sending the sheet twice played the friendly twice');
}

/* ---------------------------- 3. the bench plays, the stars rest */
{
  const gs0 = career(703);
  const sent = G.sendTeamsheet(answer(gs0, 0));
  const played = sent.matchMods.friendly!.report!.played;
  const sheet = G.lineup(gs0);
  const bench = G.mySquad(gs0).bench;
  const byBest = [...sheet].sort((a, b) => overall(b) - overall(a));
  checked += 5;
  if (played.length !== 11 || new Set(played).size !== 11) fails.push(`${played.length} men played the friendly, wanted eleven distinct`);
  if (!played.every(id => all(gs0).some(p => p.id === id))) fails.push('somebody who is not in my squad played');
  if (!bench.every(p => played.includes(p.id))) fails.push('a bench man sat out the friendly the bench was meant to play');
  if (byBest.slice(0, 5).some(p => played.includes(p.id))) fails.push('one of the five best on the sheet played the friendly, the stars were to rest');
  if (!all(gs0).filter(p => played.includes(p.id)).some(p => p.position === 'GK')) fails.push('the friendly was played with no keeper');

  // the bench has no keeper to give: the sheet's keeper goes in for the weakest outfielder
  const benchGks = bench.filter(p => p.position === 'GK');
  const noBenchKeeper = { ...gs0, sitOut: { ...gs0.sitOut, ...Object.fromEntries(benchGks.map(p => [p.id, 'פצוע'])) } };
  const p2 = G.sendTeamsheet(answer(noBenchKeeper, 0)).matchMods.friendly!.report!.played;
  checked += 2;
  const sheetGk = sheet.find(p => p.position === 'GK')!;
  if (!p2.includes(sheetGk.id)) fails.push('with no keeper on the bench the sheet keeper did not play');
  if (benchGks.some(p => p2.includes(p.id))) fails.push('an injured keeper played the friendly');

  // a squad that cannot field eleven available men simply has no friendly
  const sq = G.mySquad(gs0);
  const hurt = Object.fromEntries([...sq.starters, ...sq.bench].slice(0, 9).map(p => [p.id, 'פצוע']));
  const thin = G.sendTeamsheet({ ...answer({ ...gs0, sitOut: hurt }, 0), sitOut: hurt });
  checked += 2;
  if (thin.phase !== 'match') fails.push(`a squad of too few fit men still played a friendly: "${thin.phase}"`);
  if (thin.matchMods.friendly) fails.push('the friendly stayed agreed with nobody to play it');
}

/* ----------------------- 4. the evening: same on a reload, and true */
{
  const gs0 = career(704);
  const agreed = answer(gs0, 0);
  const a = G.sendTeamsheet(agreed).matchMods.friendly!.report!;
  const b = G.sendTeamsheet(agreed).matchMods.friendly!.report!;
  checked += 4;
  if (JSON.stringify(a) !== JSON.stringify(b)) fails.push('the same evening was told two ways');
  if (!a.lines[0].includes(a.factory)) fails.push('the opening does not name the works team');
  if (!Number.isInteger(a.score[0]) || !Number.isInteger(a.score[1]) || a.score[0] < 0 || a.score[1] < 0) fails.push('the score is not two whole numbers');
  if (a.lines.length < 3 || a.lines.length > 9) fails.push(`the report is ${a.lines.length} lines, wanted a short one`);

  // across many Wednesdays: the closing line fits the score, no score numerals
  // inside a Hebrew sentence, no slots left open, no long dash, no stray space
  let wins = 0, losses = 0, n = 0, badFit = 0, bad: string[] = [];
  for (let seed = 1; seed <= 80; seed++) {
    const g = G.sendTeamsheet(answer({ ...career(710 + (seed % 7)), week: 2 + (seed % 12), season: 1 + Math.floor(seed / 12) }, 0));
    const r = g.matchMods.friendly?.report;
    if (!r) continue;
    n++;
    const [m, t] = r.score;
    if (m > t) wins++; else if (m < t) losses++;
    const last = r.lines[r.lines.length - 1];
    const fit = m > t ? /ניצח/.test(last) : m === t ? /תיקו/.test(last) : /הפס/.test(last);
    if (!fit) badFit++;
    for (const l of r.lines) {
      if (/\{[^}]*\}/.test(l)) bad.push(`an open slot in "${l}"`);
      if (/[—–]/.test(l)) bad.push(`a long dash in "${l}"`);
      if (/\s[,.!?]/.test(l)) bad.push(`a space before punctuation in "${l}"`);
      if (/\d\s*[-:]\s*\d/.test(l)) bad.push(`a score inside the sentence "${l}"`);
      if (/undefined|NaN/.test(l)) bad.push(`"${l}"`);
    }
  }
  checked += 4;
  if (badFit) fails.push(`${badFit} of ${n} closing lines do not fit the score`);
  if (bad.length) fails.push(...bad.slice(0, 3));
  if (wins < n * 0.25 || wins > n * 0.65) fails.push(`${wins} wins in ${n} friendlies, the works team is a gift or a wall`);
  if (losses < n * 0.15) fails.push(`the bench lost ${losses} of ${n}, the works team is no test at all`);

  // a reload on the popup keeps it, and the fee is still paid exactly once
  const popup = G.sendTeamsheet(agreed);
  saveCareer(popup);
  const back = loadCareer()!;
  checked += 3;
  if (back.phase !== 'friendly') fails.push(`a reload on the popup opened "${back.phase}"`);
  if (JSON.stringify(back.matchMods.friendly?.report) !== JSON.stringify(popup.matchMods.friendly?.report)) fails.push('a reload changed the report');
  const paid = G.finishFriendly(back);
  if (paid.meters.money - back.meters.money !== 15_000) fails.push(`closing the popup after a reload paid ${paid.meters.money - back.meters.money}`);
}

/* ------------------------------- 5. closing the popup: fee and legs */
{
  const gs0 = career(705);
  const popup = G.sendTeamsheet(answer(gs0, 0));
  const played = popup.matchMods.friendly!.report!.played;
  const done = G.finishFriendly(popup);
  checked += 8;
  if (done.phase !== 'match') fails.push(`closing the popup led to "${done.phase}", not the match`);
  if (done.meters.money - popup.meters.money !== 15_000) fails.push(`the fee is ${done.meters.money - popup.meters.money}, the agreed figure is 15,000`);
  if (done.matchMods.friendly) fails.push('the friendly stayed on the week after it was played');
  const tired = Object.entries(done.matchMods.fitness ?? {}).filter(([, d]) => (d as number) < 0).map(([id]) => id);
  if (tired.length !== 11 || !played.every(id => tired.includes(id))) fails.push(`${tired.length} men are tired, the eleven who played should be`);
  if (!played.every(id => done.matchMods.fitness?.[id] === -6)) fails.push('the men who played are not six points down, a light tiredness');
  const sq = all(done);
  if (!played.every(id => (done.seasonStats[id]?.friendlyApps ?? 0) === 1)) fails.push('the men who played have no minute on the sheet');
  if (sq.some(p => (done.seasonStats[p.id]?.apps ?? 0) !== (popup.seasonStats[p.id]?.apps ?? 0))) fails.push('a friendly counted as a league appearance');
  if (sq.some(p => (done.seasonStats[p.id]?.goals ?? 0) !== (popup.seasonStats[p.id]?.goals ?? 0))) fails.push('a friendly goal reached the scorers table');

  // closing it twice pays once
  checked++;
  const twice = G.finishFriendly(done);
  if (twice.meters.money !== done.meters.money) fails.push('closing the popup twice paid twice');

  // a friendly minute quiets the man nobody played, and only him: one with no
  // games is the forgotten man, and with the minutes he is not
  const forgotten = G.mySquad(gs0).bench[0];
  const stats = Object.fromEntries(all(gs0).map(p => [p.id, { name: p.name, clubId: gs0.clubId, apps: 3, goals: 0, assists: 0, lastGoalWeek: 0 }]));
  stats[forgotten.id] = { ...stats[forgotten.id], apps: 0 };
  const base = { ...gs0, week: 6, seasonStats: stats };
  const minutes = { ...base, seasonStats: { ...stats, [forgotten.id]: { ...stats[forgotten.id], friendlyApps: 3 } } };
  checked += 2;
  if (!G.rollNamedDilemma(base, 'player_minutes_or_quit')) fails.push('a man with no games at all is not the forgotten man');
  if (G.rollNamedDilemma(minutes, 'player_minutes_or_quit')) fails.push('a man with three friendly games still counts as forgotten');
}

/* ------------------------- 5b. the telling, on hand-built evenings */
{
  const rng = () => 0.3;
  const facts = (events: FriendlyEvent[], score: [number, number]) =>
    ({ factory: 'מפעל הסבון של נס ציונה', club: 'רה', score, events, star: undefined });
  const ev = (minute: number, type: FriendlyEvent['type'], mine: boolean, who: string): FriendlyEvent => ({ minute, type, mine, who });

  // the sending off in the 8th minute is told before the goal in the 68th
  const redFirst = describeFriendly(facts([ev(68, 'goal', false, 'אמסלם'), ev(8, 'red', true, 'שחר')], [0, 1]), rng);
  checked += 4;
  const iRed = redFirst.findIndex(l => l.includes('שחר')), iGoal = redFirst.findIndex(l => l.includes('אמסלם'));
  if (iRed < 0 || iGoal < 0 || iRed > iGoal) fails.push('the sending off in the 8th minute is told after the goal in the 68th');

  // "the works team answers" is only said when we had scored before
  // across every wording rotation, because the one that answers is picked by it
  const firstAll = Array.from({ length: 10 }, (_, k) =>
    describeFriendly(facts([ev(11, 'goal', false, 'אלבז')], [0, 1]), () => (k + 0.5) / 10));
  if (firstAll.some(r => r.some(l => l.includes('עונים')))) fails.push('the works team "answered" a goal of ours that never happened');
  const second = Array.from({ length: 12 }, (_, k) =>
    describeFriendly(facts([ev(10, 'goal', true, 'חן'), ev(40, 'goal', false, 'אלבז')], [1, 1]), () => (k + 0.5) / 12));
  if (!second.some(r => r.some(l => l.includes('עונים')))) fails.push('the works team can never answer, even after a goal of ours');

  // goals told in minute order with the extras counted, and an own goal scores for the other side
  const many = describeFriendly(facts([
    ev(5, 'goal', true, 'א'), ev(15, 'goal', false, 'ב'), ev(25, 'goal', true, 'ג'), ev(35, 'goal', false, 'ד'),
    ev(45, 'goal', true, 'ה'), ev(55, 'goal', true, 'ו'),
  ], [4, 2]), rng);
  const minutesTold = many.map(l => /בדקה (\d+)|בדקה\s*(\d+)|(\d+)/.exec(l)?.[0]).filter(Boolean).length;
  if (!many.some(l => l.includes('עוד 2 שערים'))) fails.push('six goals were told one by one instead of four and the rest counted');
  if (minutesTold < 4) fails.push('the first four goals of six were not told');

  // two goals of ours in a row never read the same
  checked += 2;
  const twoMine = describeFriendly(facts([ev(10, 'goal', true, 'חן'), ev(20, 'goal', true, 'לוי')], [2, 0]), rng);
  const goalLines = twoMine.filter(l => l.includes('חן') || l.includes('לוי'));
  if (goalLines.length !== 2 || goalLines[0].replace('חן', '').replace('10', '') === goalLines[1].replace('לוי', '').replace('20', ''))
    fails.push('two goals in a row were told with the same words');
  const ownGoal = describeFriendly(facts([ev(30, 'own_goal', false, 'רוזן')], [1, 0]), rng);
  if (!ownGoal.some(l => l.includes('רוזן') && l.includes('לשער שלו'))) fails.push('an own goal by the works team is not told as theirs');
}

/* ------------------------------------------------ 6. wired in, and drawn */
{
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  const screen = readFileSync('src/ui/screens/Friendly.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  checked += 6;
  if (!/<TeamsheetScreen[\s\S]*?G\.sendTeamsheet/.test(app)) fails.push('the team sheet does not go through the friendly');
  if (!/gs\.phase === 'friendly'[^\n]*FriendlyScreen[^\n]*G\.finishFriendly/.test(app)) fails.push('the friendly popup is not routed, or does not close through finishFriendly');
  if (!screen.includes('fr-board') || !screen.includes('report.score')) fails.push('the popup has no scoreboard of the real score');
  if (!screen.includes('report.lines') || !screen.includes('formatMoney(report.fee)')) fails.push('the popup does not tell the evening and the fee');
  if (!css.includes('.fr-board') || !css.includes('.fr-digits')) fails.push('the scoreboard has no styling');
  if (!screen.includes('disabled={!done}')) fails.push('the way on is open before the story is read');
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 10).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, the works team plays on a Wednesday and is told on the board');
}
process.exit(fails.length ? 1 : 0);
