/**
 * What happens in which league (Itzik, 13.10): "ליגת העל... דברים שלא קורים בליגת העל".
 *   node --experimental-strip-types scripts/world-by-league-check.mts
 *
 * Held here: every id in the gate table is a real thing; nothing gated out of a division is ever picked in it, by
 * dilemma, wider press question, chat, friend thread, terrace line and fan, feed post or personality trait; the
 * national sports sites never write about the lowest two divisions; and the stories Itzik named are shut where
 * they are false: the league above in the top flight, a neighbourhood story there.
 */
import {
  DILEMMA_TIERS, PRESS_TIERS, CHAT_TIERS, MATE_TIERS, FAN_TIERS, TRAIT_TIERS, inTier,
} from '../src/data/leagueGate.ts';
import { TEMPLATES, templatesForTier, rollDilemma } from '../src/data/dilemmas.ts';
import { THREADS, rollChat } from '../src/data/chats.ts';
import type { ChatTrigger } from '../src/data/chats.ts';
import { MATE_THREADS } from '../src/data/mateChats.ts';
import { everyFanLine, FANS, fanMessage } from '../src/data/fans.ts';
import type { FanContext } from '../src/data/fans.ts';
import { everyWideQuestion, pickPressQuestion } from '../src/data/press.ts';
import type { PressContext } from '../src/data/press.ts';
import { everyFactQuestion } from '../src/data/pressFacts.ts';
import { buildFeed } from '../src/data/feed.ts';
import type { FeedContext } from '../src/data/feed.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { TOP_DILEMMA_NEW, TOP_PRESS_NEW, TOP_CHAT_NEW, TOP_FAN_NEW, TOP_DILEMMA_REWRITE, TOP_PRESS_REWRITE, TOP_CHAT_REWRITE } from '../src/data/topFlightText.ts';
import { TRAITS } from '../src/data/personalities.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };
const TIERS = [1, 2, 3, 4, 5];

const bare = {
  result: 'win', isDerby: false, lowMorale: false, highPrestige: false, tablePos: 5, totalTeams: 10, star: 'כהן', rival: 'נחל',
  city: 'עיר', isHome: true, fans: 50, lossRun: 0, gate: 0.7, justUp: false, week: 5, season: 1, rounds: 14, tier: 3,
  firstSeasonAtTier: false, lead: 0, margin: 2, gf: 2, ga: 0, oppPos: 6, nextIsDerby: false, unbeatenBefore: 0, winRun: 1,
  scoutHired: false, scoutManPlayed: false, youthInSquad: false, youthDebut: false, youthStar: false, injuryTonight: false,
  allGoalsFirstHalf: false,
} as unknown as PressContext;

const HELD0 = { dilemma: Object.keys(TOP_DILEMMA_NEW), chat: Object.keys(TOP_CHAT_NEW) };
/* every id in a table is a real thing, or the table guards nothing */
const dilemmaIds = new Set(TEMPLATES.map(t => t.id));
for (const id of Object.keys(DILEMMA_TIERS).filter(i => !HELD0.dilemma.includes(i))) ok(dilemmaIds.has(id), `dilemma gate names a dilemma that does not exist: ${id}`);
const chatIds = new Set(THREADS.map(t => t.id));
for (const id of Object.keys(CHAT_TIERS).filter(i => !HELD0.chat.includes(i))) ok(chatIds.has(id), `chat gate names a chat that does not exist: ${id}`);
const mateIds = new Set(MATE_THREADS.map(t => t.id));
for (const id of Object.keys(MATE_TIERS)) ok(mateIds.has(id), `mate gate names a thread that does not exist: ${id}`);
const fanIds = new Set([...everyFanLine().map(l => l.id), ...FANS.map(f => f.id)]);
for (const id of Object.keys(FAN_TIERS)) ok(fanIds.has(id), `fan gate names a line or fan that does not exist: ${id}`);
const pressIds = new Set([...everyWideQuestion(bare), ...everyFactQuestion(bare)].map(q => q.id));
for (const id of Object.keys(PRESS_TIERS).filter(i => !(i in TOP_PRESS_NEW))) ok(pressIds.has(id), `press gate names a question that does not exist: ${id}`);
const traitIds = new Set(TRAITS.map(t => t.id));
for (const id of Object.keys(TRAIT_TIERS)) ok(traitIds.has(id), `trait gate names a trait that does not exist: ${id}`);

/* ליגת העל from the ground up: the new ones are in unless their night is one the game cannot see yet. That list is exact,
   so building a system for one of them has to take it off the list on purpose. */
const HELD = {
  dilemma: ['national_team_callup_clash', 'ultras_flares_fine', 'foreign_player_agent_minutes', 'var_storm_reporter', 'european_qualifier_rotation', 'star_contract_bonuses', 'star_medical_key_match'],
  press: ['euro_qualifier_draw', 'euro_gap_lost', 'natl_callup_star', 'natl_snub_star', 'var_goal_disallowed', 'var_penalty_win', 'transfer_saga_star'],
  chat: ['club_doctor_star', 'owner_title_race', 'video_analyst_clips', 'press_officer_prep', 'team_manager_charter', 'childhood_friend_tickets'],
};
const notIn = (all: string[], have: Set<string>) => all.filter(id => !have.has(id)).sort().join();
ok(notIn(Object.keys(TOP_DILEMMA_NEW), dilemmaIds) === [...HELD.dilemma].sort().join(), 'the new top flight dilemmas that are in do not match the list: ' + notIn(Object.keys(TOP_DILEMMA_NEW), dilemmaIds));
ok(notIn(Object.keys(TOP_CHAT_NEW), chatIds) === [...HELD.chat].sort().join(), 'the new top flight chats that are in do not match the list: ' + notIn(Object.keys(TOP_CHAT_NEW), chatIds));
ok(Object.keys(TOP_FAN_NEW).every(id => fanIds.has(id)), 'a new top flight terrace line is not in');

/* dilemmas: the list for a division holds exactly what that division may see */
for (const tier of TIERS) {
  const ids = new Set(templatesForTier(tier).map(t => t.id));
  for (const t of TEMPLATES) ok(ids.has(t.id) === inTier(DILEMMA_TIERS, t.id, tier), `dilemma ${t.id} wrongly ${ids.has(t.id) ? 'in' : 'out of'} tier ${tier}`);
  ok(ids.size >= 25, `tier ${tier} is left with only ${ids.size} dilemmas`);
}
for (const id of ['neighbor_training_noise', 'youth_parent_pressure', 'mascot_too_old', 'broken_bus', 'midweek_friendly'])
  ok(!templatesForTier(5).some(t => t.id === id), `${id} is a neighbourhood story and must not run in the top flight`);
for (const id of ['agent_wants_raise', 'agent_loan_offer', 'star_night_out'])
  ok(!templatesForTier(1).some(t => t.id === id) && !templatesForTier(2).some(t => t.id === id), `${id} needs a real agent or press and must not run in the lowest two`);

/* chats: roll every trigger many times in every division */
const triggers = [...new Set(THREADS.map(t => t.trigger))] as ChatTrigger[];
for (const tier of TIERS) {
  let empty = 0;
  for (const trig of triggers) {
    let any = false;
    for (let s = 1; s <= 40; s++) {
      const c = rollChat(trig, { tier, club: 'א', rival: 'ב', score: '2 - 0', star: 'כהן', mgr: 'מ', who: 'כהן' }, createRng(s * 31 + tier), []);
      if (!c) continue;
      any = true;
      ok(inTier(CHAT_TIERS, c.id, tier), `chat ${c.id} came up in tier ${tier}`);
    }
    if (!any) empty++;
  }
  ok(empty <= 6, `tier ${tier}: ${empty} chat triggers are left with nothing to say`);
}
ok(!inTier(CHAT_TIERS, 'mother_derby_win', 1), 'the mother who saw it on TV must not run in the lowest division');
ok(!inTier(CHAT_TIERS, 'fans_hot_streak', 5), 'promotion talk must not run in the top flight');

/* press: the sites and the questions */
const NATIONAL = ['ספורט WOW', 'ספורט 555', 'ספורט ישראל', 'Yספורט', 'Nספורט'];
const dsafe5 = () => new Proxy({ tier: 5, money: 5_000_000, star: 'אבי כהנוב', rival: 'בית״ר', city: 'חיפה', club: 'מכבי', youngster: 'נעם', benched: 'רן', veteranName: 'יגאל', scorer: 'גל', dry: 'דור', newcomer: 'איתן', academy: 'ליאור', kids3: 'א, ב, ג', squadSize: 22, room: 3, pos: 3, teams: 14, week: 8, sponsor: 'חברת מזון', sponsorWants: [] } as Record<string, unknown>, { get: (o, k) => (k in o ? o[k as string] : '') }) as never;
const results = ['win', 'loss', 'draw', 'big_win', 'thrashing'] as const;
for (const tier of TIERS) {
  for (let s = 1; s <= 300; s++) {
    const c = { ...bare, tier, tablePos: 1 + (s % 10), result: results[s % 5], isDerby: s % 7 === 0, isHome: s % 2 === 0 } as PressContext;
    const { outlet, q } = pickPressQuestion(c, createRng(s * 17 + tier), []);
    if (tier <= 2) ok(!NATIONAL.includes(outlet), `tier ${tier}: national site ${outlet} wrote about a neighbourhood club`);
    if (tier === 5) ok(!String(outlet).startsWith('מקומון'), 'the town paper turned up in the top flight');
    ok(inTier(PRESS_TIERS, q.id, tier), `press question ${q.id} asked in tier ${tier}`);
  }
}

/* the terrace */
const fctx = (tier: number, timing: 'pre' | 'post', s: number): FanContext => ({
  tier, timing, isDerby: false, isHome: true, rival: 'נחל', city: 'עיר', coldStriker: null, coldWeeks: 0, youngster: null,
  approach: 'balanced', result: 'win', scoreLine: '2:0', scorer: 'כהן', streak: 0, tablePos: 1 + (s % 8), totalTeams: 12, fans: 50,
} as unknown as FanContext);
for (const tier of TIERS) for (let s = 1; s <= 200; s++) for (const timing of ['pre', 'post'] as const) {
  const m = fanMessage(fctx(tier, timing, s), createRng(s * 13 + tier), []);
  ok(inTier(FAN_TIERS, m.id, tier), `terrace line ${m.id} came up in tier ${tier}`);
  ok(inTier(FAN_TIERS, m.fan.id, tier), `terrace fan ${m.fan.id} came up in tier ${tier}`);
}

/* the feed */
const star = { id: 's', name: 'אבי כהן', position: 'ST', age: 24, attrs: {}, ovr: 70 } as never;
const feedOf = (tier: number, s: number) => buildFeed({
  clubName: 'מכבי עיר', clubShort: 'עיר', city: 'עיר', league: 'x', tier, pos: 2, teams: 12, form: ['W', 'W', 'W'],
  last: { opponent: 'נחל', mine: 2, theirs: 0, isDerby: false, home: true, climbed: true }, otherResults: [],
  topScorer: { name: 'אבי כהן', goals: 6 }, coldStriker: null, youngster: null, star, marketTarget: star,
} as unknown as FeedContext, createRng(s));
const feedOfTier = (tier: number) => {
  const handles = new Set<string>();
  const texts: string[] = [];
  for (let s = 1; s <= 300; s++) for (const p of feedOf(tier, s)) { handles.add(p.handle); texts.push(p.text); }
  return { handles, texts };
};
for (const tier of [1, 2, 3]) {
  const { handles } = feedOfTier(tier);
  for (const h of ['@sportwow', '@ysport', '@sport555']) ok(!handles.has(h), `tier ${tier}: national account ${h} posts about a local club`);
}
for (const tier of [1, 2]) ok(!feedOfTier(tier).handles.has('@agentroom'), `tier ${tier}: an agents account exists`);
ok(!feedOfTier(5).texts.some(x => x.includes('מהליגה שמעל')), 'the top flight has a league above in the rumour mill');
ok(feedOfTier(4).texts.some(x => x.includes('מהליגה שמעל')), 'the league above no longer wants players from the Leumit');

/* the sums: the same flag for the terrace costs a neighbourhood club little and a top club a lot, in the words and in the purse */
{
  const tifo = TEMPLATES.find(t => t.id === 'ultras_tifo_money')!;
  const roll = (tier: number) => rollDilemma(tifo, { tier, money: 500_000, rival: 'נחל', city: 'עיר', star: 'כהן' } as never, createRng(5));
  const said = TIERS.map(t => Number((roll(t).text.match(/\d{1,3}(?:,\d{3})+|\d+/) ?? ['0'])[0].replace(/,/g, '')));
  const paid = TIERS.map(t => Math.abs(roll(t).options[0].effect.money ?? 0));
  ok(said.every((v, i) => i === 0 || v > said[i - 1]), `the sum in the words does not grow with the league: ${said.join(', ')}`);
  ok(paid.every((v, i) => i === 0 || v > paid[i - 1]), `the sum from the purse does not grow with the league: ${paid.join(', ')}`);
  ok(said[0] <= 4_000 && said[4] >= 20_000, `the flag asks ${said[0]} at the bottom and ${said[4]} at the top`);
  ok(paid.every((v, i) => Math.abs(v * 2 - said[i]) <= 1_500), `the words and the purse disagree: ${said.join(', ')} against ${paid.join(', ')}`);
  const sell = TEMPLATES.find(t => t.id === 'owner_sell_star')!;
  const gain = (tier: number) => rollDilemma(sell, { tier, money: 100_000 * tier, star: 'כהן', city: 'עיר', rival: 'נחל' } as never, createRng(2)).options[0].effect.money ?? 0;
  ok(gain(5) - 0.6 * 500_000 > gain(1) - 0.6 * 100_000, 'the fixed part of selling the star is no bigger at the top than at the bottom');
}

/* ליגת העל from the ground up: everything the top flight can say, rolled many times, is scanned for the words of a world it is not in */
{
  const FORBIDDEN = /ליגה (שמעל|מעל)|הליגה (שמעל|מעל)|מהליגה שמעל|שמעלינו|מילואים|בוחן|משמרת|פיצרי|מקומון|הפועל נחל|עין סלע|דני כהן|\{\w+\}/;
  const seen: string[] = [];
  let rewrittenAsked = 0, wrongWording = 0;
  for (const t of templatesForTier(5)) for (let s = 1; s <= 8; s++) {
    const r = rollDilemma(t, dsafe5(), createRng(s * 19 + t.id.length));
    seen.push(r.text, ...r.options.flatMap(o => [o.label, o.outcome]));
  }
  for (let s = 1; s <= 400; s++) {
    const c = { ...bare, tier: 5, tablePos: 1 + (s % 10), result: results[s % 5], isDerby: s % 7 === 0, lossRun: s % 4, fans: 20 + (s % 70), week: 4 + (s % 18), rounds: 26, lowMorale: s % 5 === 0 } as PressContext;
    const { q } = pickPressQuestion(c, createRng(s * 23), []);
    seen.push(q.text, ...q.answers.flatMap(a => [a.label, a.reply]));
    const mine = TOP_PRESS_REWRITE[q.id];
    if (mine) { rewrittenAsked++; if (q.text.slice(0, 10) !== mine.text.slice(0, 10)) wrongWording++; }
    const m = fanMessage(fctx(5, s % 2 ? 'pre' : 'post', s), createRng(s * 29), []);
    seen.push(m.text, m.fan.bio);
  }
  for (const trig of triggers) for (let s = 1; s <= 60; s++) {
    const c = rollChat(trig, { tier: 5, club: 'מכבי', rival: 'בית״ר', score: '2 - 0', star: 'אבי', mgr: 'מאמן', who: 'אבי' }, createRng(s * 37), []);
    if (c) seen.push(c.contact, c.subtitle, ...c.lines.map(l => l.text));
  }
  const bad = [...new Set(seen.filter(x => FORBIDDEN.test(x)))];
  ok(bad.length === 0, `${bad.length} lines in the top flight speak of a world it is not in, for example: ${bad.slice(0, 2).join(' / ')}`);
  ok(rewrittenAsked > 5 && wrongWording === 0, `a rewritten top flight press question was asked ${rewrittenAsked} times, ${wrongWording} in the old words`);
  ok(seen.length > 3000, 'the top flight scan saw too little');
  // the rewritten and the new are what the top flight rolls, in its own sums
  const callup = TOP_DILEMMA_REWRITE.player_transfer_request;
  const sell = rollDilemma(TEMPLATES.find(t => t.id === 'player_transfer_request')!, dsafe5(), createRng(1));
  ok(sell.options[0].effect.money === callup.options[0].money, 'the top flight sale is not the sum written for it');
  ok(!sell.text.includes('הליגה'), 'the top flight transfer request still names a league above');
  ok(templatesForTier(5).some(t => t.id === 'owner_ceo_budget_war'), 'a new top flight dilemma is not offered');
  ok(!templatesForTier(4).some(t => t.id === 'owner_ceo_budget_war'), 'a top flight dilemma leaked into the Leumit');
  ok(Object.keys(TOP_PRESS_REWRITE).length > 10 && Object.keys(TOP_CHAT_REWRITE).length >= 5, 'the top flight rewrites are missing');
}

/* personalities */
for (const id of ['almost', 'old-glory', 'dad-stands']) ok(!inTier(TRAIT_TIERS, id, 5), `trait ${id} is false in the top flight`);

if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails.slice(0, 14)) console.log('  - ' + f);
  if (fails.length > 14) console.log(`  ... and ${fails.length - 14} more`);
  process.exit(1);
}
console.log(`${checked} checks`);
console.log('OK, each league sees only its own world: no league above in the top flight, no neighbourhood stories there, no national sites in the lowest two');
