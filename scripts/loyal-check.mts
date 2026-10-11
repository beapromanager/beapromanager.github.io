/**
 * The loyalty gift (Itzik, 11.10): past ten seasons a manager is handed a
 * striker ten above his league, on loan for five league rounds.
 *   node --experimental-strip-types scripts/loyal-check.mts
 *
 * His five rules, each held here:
 *   1. the five count from the moment the man is received, played or not
 *   2. he walks in without anyone leaving and without counting against the cap
 *   3. no wage, no contract, not for sale
 *   4. everyone already past the mark gets it, once, on the hub
 *   5. only league rounds count; a European night and the season's end do
 *      not spend a round, the season's end sends him home
 */
import * as G from '../src/game/state.ts';
import { overall } from '../src/engine/matchEngine.ts';
import type { MatchResult } from '../src/engine/matchEngine.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { readFileSync } from 'node:fs';

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

const fails: string[] = [];
let checked = 0;

function career(seed: number, season: number): G.GameState {
  let s = G.newGame(seed);
  s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  s = G.pickCity(s, LEGEND_TOWN);
  s = G.afterSigning(s, {});
  s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
  while (s.phase === 'preseason-market') s = G.advancePreseason(s);
  return { ...s, phase: 'hub' as const, week: 1, season, friends: [] };
}
const all = (gs: G.GameState) => [...G.mySquad(gs).starters, ...G.mySquad(gs).bench];
const ATK = new Set(['ST', 'LW', 'RW']);
/** a fixed clock inside the offer, so the check does not age out with the calendar */
const NOW = Date.parse('2026-10-12T12:00:00+03:00');

/* 1b. THE OFFER ENDS: Thursday 15.10.2026, 20:00 Israel time. Before it every career past ten seasons is owed the gift, after it nobody is */
{
  checked += 7;
  const at11 = career(11, 11);
  const last = Date.parse('2026-10-15T19:59:59+03:00'), edge = Date.parse('2026-10-15T20:00:00+03:00'), after = Date.parse('2026-10-16T09:00:00+03:00');
  if (G.LOYAL_DEADLINE !== Date.parse('2026-10-15T17:00:00Z')) fails.push('the deadline is not Thursday 15.10.2026 at 20:00 Israel time (17:00 UTC)');
  if (!G.loyalGiftDue(at11, last)) fails.push('the gift is gone a second before the deadline');
  if (G.loyalGiftDue(at11, edge)) fails.push('the gift is still due at 20:00 exactly');
  if (G.loyalGiftDue(at11, after) || G.loyalGiftDue(career(11, 30), after)) fails.push('a career past ten seasons is owed the gift after the deadline');
  // a man who was shown the popup in time and taps a minute late still gets it
  if (G.openLoyalGift(at11) === at11) fails.push('opening the gift does not work, with no clock to stop it');
  const src = readFileSync('src/game/state.ts', 'utf8');
  if (!src.includes('return now < LOYAL_DEADLINE && loyalGiftReady(gs);')) fails.push('the due rule does not look at the deadline');
  if (!src.includes('if (!loyalGiftReady(gs)) return gs;')) fails.push('opening the gift is stopped by the clock, so a late tap loses it');
}

/* 1. WHEN IT IS DUE: past ten seasons, once, on the hub, nothing in the way */
{
  checked += 7;
  const at9 = career(11, 9), at10 = career(11, 10), at11 = career(11, 11), at20 = career(11, 20);
  if (G.loyalGiftDue(at9, NOW)) fails.push('the gift is due in the ninth season, it starts in the tenth');
  if (!G.loyalGiftDue(at10, NOW)) fails.push('the gift is not due in the tenth season, Itzik said season ten and up');
  if (!G.loyalGiftDue(at11, NOW) || !G.loyalGiftDue(at20, NOW)) fails.push('the gift is not due past ten seasons');
  if (G.loyalGiftDue({ ...at11, phase: 'squad' }, NOW)) fails.push('the gift is due off the hub');
  if (G.loyalGiftDue({ ...at11, loyalGift: { season: 11, playerId: null } }, NOW)) fails.push('the gift is due twice');
  if (G.loyalGiftDue({ ...at11, pull: G.rollLoyalPull(at11) }, NOW)) fails.push('the gift is due while another pack is open');
  const told = G.openLoyalGift(at11);
  if (!told.pull || !told.loyalGift || told.loyalGift.season !== 11 || told.loyalGift.playerId !== null) fails.push('opening the gift did not hold the card and mark it told');
  if (G.openLoyalGift(at9) !== at9) fails.push('the gift opened for a manager who has not earned it');
}

/* 2. THE CARD: an attacker the squad is shortest of, the league's average plus ten, the same man on a reload */
{
  // the agreed numbers, written here and not read off the code
  checked += 3;
  if (G.LOYAL_SEASONS !== 10) fails.push(`the gift waits for ${G.LOYAL_SEASONS} seasons, Itzik said ten`);
  if (G.LOAN_MATCHES !== 5) fails.push(`the loan is ${G.LOAN_MATCHES} rounds, Itzik said five`);
  if (G.LOYAL_LIFT !== 10) fails.push(`the gift is ${G.LOYAL_LIFT} above the league, Itzik said ten`);
  let hits = 0, seeds = 0;
  for (const seed of [21, 22, 23, 24, 25, 26]) {
    const gs = career(seed, 12);
    const pull = G.rollLoyalPull(gs);
    const o = overall(pull.player);
    const want = G.leagueAvgOvr(gs) + G.LOYAL_LIFT;
    checked += 5; seeds++;
    if (!ATK.has(pull.player.position)) fails.push(`seed ${seed}: the gift is a ${pull.player.position}, it is an attacker`);
    if (Math.abs(o - want) > 1) fails.push(`seed ${seed}: the gift rates ${o}, the league averages ${want - G.LOYAL_LIFT}, wanted ${want}`);
    if (o === want) hits++;
    if (pull.cashValue !== 0) fails.push(`seed ${seed}: the gift has a cash value of ${pull.cashValue}, he is not for sale`);
    const counts = ['ST', 'LW', 'RW'].map(pos => all(gs).filter(p => p.position === pos).length);
    const fewest = Math.min(...counts);
    if (all(gs).filter(p => p.position === pull.player.position).length !== fewest) fails.push(`seed ${seed}: the gift is a ${pull.player.position}, not the attacking shirt the squad is shortest of`);
    // the same man on a reload: ids are a running counter, so he is compared by who he is, not by his number
    const who = (p: typeof pull) => JSON.stringify({ ...p, player: { ...p.player, id: '' } });
    if (who(G.rollLoyalPull(gs)) !== who(pull)) fails.push(`seed ${seed}: rolling the gift twice gave two different men`);
    if (all(gs).some(p => p.name === pull.player.name)) fails.push(`seed ${seed}: the gift shares a name with a man already in the squad`);
  }
  if (hits < seeds - 1) fails.push(`the gift landed exactly on the league's average plus ten in ${hits} of ${seeds} careers`);
  console.log(`  the card: an attacker at the league's average plus ten, exact in ${hits} of ${seeds} careers`);
}

/* 3. HE WALKS IN: onto the bench, nobody leaves, the cap does not see him, no contract, not for sale */
{
  const gs = career(31, 13);
  // fill the squad to the cap first, so the gift is proven to pass it
  const before = all(gs).length;
  const told = G.openLoyalGift(gs);
  const signed = G.signLoyalGift(told);
  const him = told.pull!.player;
  checked += 11;
  if (all(signed).length !== before + 1) fails.push(`the squad went from ${before} to ${all(signed).length} men, wanted one more and nobody out`);
  if (!G.mySquad(signed).bench.some(p => p.id === him.id)) fails.push('the gift is not on the bench');
  if (G.squadSize(signed) !== G.squadSize(gs)) fails.push(`the gift counts against the cap: squadSize ${G.squadSize(gs)} became ${G.squadSize(signed)}`);
  if (signed.pull !== null || signed.loyalGift?.playerId !== him.id) fails.push('signing did not clear the card or write the man into the gift');
  if (G.loanLeft(signed, him.id) !== G.LOAN_MATCHES || !G.isOnLoan(signed, him.id)) fails.push(`the loan is ${G.loanLeft(signed, him.id)} rounds, wanted ${G.LOAN_MATCHES}`);
  if (him.id in signed.contracts) fails.push('the gift was given a contract');
  if (!signed.arrivals.includes(him.id)) fails.push('the gift is not among the arrivals');
  const why = G.sellBlockedReason({ ...signed, meters: { ...signed.meters, money: -1 } }, him.id);
  if (!why || !why.includes('מושאל')) fails.push(`the gift can be sold (${why})`);
  if (G.sellPlayer(signed, him.id) !== signed) fails.push('selling the gift changed the state');
  if (G.signLoyalGift(signed) !== signed) fails.push('signing the gift twice changed the state');
  if (G.loyalGiftDue(signed, NOW)) fails.push('the gift is due again after it was taken');
  // no wage: the weekly wage bill is the squad's, and he is not of the squad
  const wages = (g: G.GameState) => all(g).filter(p => !G.isOnLoan(g, p.id)).length;
  if (wages(signed) !== wages(gs)) fails.push('the gift is counted among the men on the wage bill');
}

/* 4. THE COUNT: one league round at a time, played or not, and home after the fifth */
{
  const gs = career(41, 14);
  let g = G.signLoyalGift(G.openLoyalGift(gs));
  const him = g.loyalGift!.playerId!;
  const result = (s: G.GameState): MatchResult => {
    const fx = G.playerFixture(s)!;
    const stats = { possession: .5, chances: 0, goals: 0, xg: 0 };
    return { seed: 1, home: { id: fx.homeId, name: '', stats }, away: { id: fx.awayId, name: '', stats }, score: [0, 0], events: [], ratings: {} };
  };
  // he sits on the bench throughout: the rounds count all the same
  for (let r = 1; r <= G.LOAN_MATCHES; r++) {
    const after = G.commitRound(g, result(g));
    checked += 2;
    const left = G.loanLeft(after, him);
    const here = all(after).some(p => p.id === him);
    if (r < G.LOAN_MATCHES) {
      if (left !== G.LOAN_MATCHES - r || !here) fails.push(`after round ${r} the loan has ${left} left and the man is ${here ? 'here' : 'gone'}`);
    } else {
      if (left !== 0 || here) fails.push(`after the fifth round the loan has ${left} left and the man is ${here ? 'still here' : 'gone'}`);
      const note = after.notices.find(n => n.kind === 'story' && n.title.includes('חזר מההשאלה'));
      if (!note) fails.push('the hub was not told the man went home');
      if (Object.keys(after.loans).length) fails.push('a loan is still on the books after the fifth round');
    }
    g = { ...after, week: g.week + 1, phase: 'hub', notices: [] };
  }
  // the squad is whole after he left: eleven starters still, nobody promoted from nothing
  checked++;
  if (G.mySquad(g).starters.length !== 11) fails.push(`${G.mySquad(g).starters.length} starters after the loan ended`);
}

/* 5. ONLY THE LEAGUE: the season's end sends him home, a European night spends nothing */
{
  const gs = career(51, 15);
  const g = G.signLoyalGift(G.openLoyalGift(gs));
  const him = g.loyalGift!.playerId!;
  checked += 4;
  const ended = G.settleLoans(g, 'season');
  if (all(ended).some(p => p.id === him) || Object.keys(ended.loans).length) fails.push('the season\'s end did not send the man home');
  if (!ended.notices.some(n => n.kind === 'story' && n.body.includes('העונה נגמרה'))) fails.push('the season\'s end did not say he went home');
  const src = readFileSync('src/game/state.ts', 'utf8');
  if (!src.includes("settleLoans(settleEuroSeason(") || !src.includes("settleLoans({ ...withChron, mate: mateNow }, 'round')")) fails.push('the loans are not settled where the round and the season end');
  const euroBody = src.slice(src.indexOf('export function commitEuroLeg'), src.indexOf('export function euroInjuries'));
  if (euroBody.includes('settleLoans') || euroBody.includes('loans')) fails.push('a European night spends a round of the loan');
  if (G.settleLoans(gs, 'round') !== gs) fails.push('a round with no loans changed the state');
}

/* 6. THE SAVE: an older career reads as never told and no loans; a rescue starts clean */
{
  checked += 4;
  const gs = career(61, 12);
  const raw = JSON.parse(JSON.stringify(gs));
  delete raw.loyalGift; delete raw.loans;
  saveCareer(raw);
  const back = loadCareer();
  if (!back || back.loyalGift !== null || JSON.stringify(back.loans) !== '{}') fails.push('an older save does not read as never told with no loans');
  if (!G.loyalGiftDue(back!, NOW)) fails.push('an older career past ten seasons is not owed the gift');
  const signed = G.signLoyalGift(G.openLoyalGift(gs));
  saveCareer(signed);
  const again = loadCareer();
  if (!again || G.loanLeft(again, signed.loyalGift!.playerId!) !== G.LOAN_MATCHES) fails.push('the loan does not survive a save');
  const rescue = readFileSync('src/game/state.ts', 'utf8').slice(readFileSync('src/game/state.ts', 'utf8').indexOf('export function takeRescue'));
  if (!rescue.slice(0, 2500).includes('    loans: {},')) fails.push('a rescued manager carries the loan to his new club');
}

/* 7. THE SCREENS: told on the hub in his words, the pack's ceremony in loan mode with no sale, the mark on the squad */
{
  checked += 9;
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  const gift = readFileSync('src/ui/screens/LoyalGift.tsx', 'utf8');
  const packs = readFileSync('src/ui/screens/Packs.tsx', 'utf8');
  const squad = readFileSync('src/ui/screens/Squad.tsx', 'utf8');
  if (!app.includes("gs.phase === 'hub' && gs.notices.length === 0 && G.loyalGiftDue(gs) && (") || !app.includes('<LoyalGift gs={gs} onOpen={() => setGs(g => G.openLoyalGift(g))} />')) fails.push('the hub does not show the gift when it is due');
  if (!app.includes("gs.phase === 'hub' && gs.pull && gs.loyalGift && gs.loyalGift.playerId === null && (") || !app.includes('onSign={() => setGs(g => G.signLoyalGift(g))} onSell={() => undefined} />')) fails.push('the reveal of the gift is not wired to signing him');
  if (!/<PackReveal [^>]*\bloan\b/.test(app)) fails.push('the gift is revealed without loan mode');
  for (const w of ['אלוף, אתה משחק מעל', 'עונות במשחק', 'WOW', 'רצינו לפרגן לך בחבילה של שחקן', "פתח ת'חבילה", 'ההצעה בתוקף עד יום חמישי 15.10 בשעה 20:00']) if (!gift.includes(w)) fails.push(`the popup is missing Itzik's words: ${w}`);
  if (!packs.includes('export function PackReveal(') || !packs.includes('loan?: boolean;')) fails.push('the reveal has no loan mode');
  if (!packs.includes("{loan ? (") || !/loan \? \([\s\S]*?<button className="btn" onClick=\{onSign\}>צרף לסגל/.test(packs)) fails.push('in loan mode the only way out of the reveal is to take him');
  if (!/\{loan \? \([\s\S]*?\) : \([\s\S]*?onClick=\{onSell\}/.test(packs)) fails.push('a sale is offered in loan mode');
  if (!packs.includes('מושאל · <span className="num">{G.LOAN_MATCHES}</span> משחקים')) fails.push('the card does not say he is on loan and for how long');
  if (!squad.includes('G.isOnLoan(gs, p.id) ? `מושאל · ${G.loanLeft(gs, p.id)}` : G.isSuspended')) fails.push('the squad does not mark the man on loan with his rounds left, first, so no other mark hides it');
  const hub = readFileSync('src/ui/screens/Hub.tsx', 'utf8');
  if (!hub.includes('G.isOnLoan(gs, p.id)') || !hub.includes('נשארו <span className="num">{G.loanLeft(gs, p.id)}</span> משחקי ליגה')) fails.push('the hub does not say how many league rounds the man on loan has left');
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 12).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, past ten seasons the gift comes once, the man walks in past the cap, and five league rounds later he goes home');
}
process.exit(fails.length ? 1 : 0);
