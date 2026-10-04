/**
 * The phone after the whistle, Itzik's batch of 4.10.
 *   node --experimental-strip-types scripts/chats-check.mts
 *
 * Sixty new threads and eight new triggers. The rules that keep them honest:
 *   1. the picker ranks the nights: a season night beats the derby, the derby
 *      beats the boy's debut goal, and the quiet stories ring only when
 *      nothing bigger happened
 *   2. a new trigger fires only on the night its words describe: the first
 *      win of a dry opening, the win that breaks a slide, the penalty pushed
 *      away from the 80th minute on, the academy boy's goal on his debut
 *   3. the four season nights are read off the table itself, with the rounds
 *      left unable to change them, and each rings the phone once a season
 *   4. the threads are in Itzik's words, every slot filled, and the new
 *      contacts answer with their own faces
 */
import * as G from '../src/game/state.ts';
import { THREADS, pickTrigger, rollChat } from '../src/data/chats.ts';
import type { ChatTrigger } from '../src/data/chats.ts';
import type { MatchResult, MatchEvent } from '../src/engine/matchEngine.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';

const fails: string[] = [];
let checked = 0;

/* ------------------------------------------------- 1 + 2. the picker */
{
  const base = { margin: 0, isDerby: false, form: ['W', 'D'] as ('W' | 'D' | 'L')[] };
  const pick = (over: Partial<Parameters<typeof pickTrigger>[0]>) => pickTrigger({ ...base, ...over });

  checked += 3;
  if (pick({ seasonEvent: 'title_won', isDerby: true, margin: 2 })?.trigger !== 'title_won')
    fails.push('a title clinched on derby night rang for the derby, not the title');
  if (pick({ isDerby: true, margin: 2, youthGoal: 'כהן' })?.trigger !== 'derby_win')
    fails.push('a derby win lost the phone to a smaller story');
  if (pick({ margin: 2, youthGoal: 'כהן', facts: [{ kind: 'hat_trick', who: 'לוי' }] })?.trigger !== 'hat_trick')
    fails.push('a hat trick lost the phone to the debut goal');

  // the boy's debut goal, with his name on the thread
  checked += 2;
  const boy = pick({ margin: 1, youthGoal: 'אברמוב' });
  if (boy?.trigger !== 'youth_debut_goal' || boy.who !== 'אברמוב') fails.push(`a debut goal rang as ${boy?.trigger} for ${boy?.who}`);
  if (pick({ margin: -1, youthGoal: 'אברמוב' })?.trigger === 'youth_debut_goal') fails.push('wait, a loss still celebrated the boy');

  // the first win of a dry opening, from round three on
  checked += 3;
  if (pick({ margin: 1, form: ['L', 'D', 'W'] })?.trigger !== 'first_win_season') fails.push('the first win after a dry opening did not ring');
  if (pick({ margin: 1, form: ['L', 'W', 'W', 'W'] })?.trigger === 'first_win_season') fails.push('a season with a win already in it rang as a first win');
  if (pick({ margin: 1, form: ['L', 'W'] })?.trigger === 'first_win_season') fails.push('a round two win rang as the dry-opening story');

  // the win that breaks a slide of three
  checked += 2;
  if (pick({ margin: 1, form: ['W', 'L', 'L', 'L', 'W'] })?.trigger !== 'streak_broken') fails.push('the win that broke three straight losses did not ring');
  if (pick({ margin: 1, form: ['W', 'L', 'L', 'W'] })?.trigger === 'streak_broken') fails.push('two losses counted as a slide of three');

  // the late penalty save: from the 80th, with the keeper's name, and only
  // when nothing bigger happened
  checked += 4;
  const pen85 = [{ kind: 'penalty_saved' as const, who: 'שלהם', minute: 85 }];
  const save = pick({ facts: pen85, keeper: 'מילר' });
  if (save?.trigger !== 'late_penalty_save' || save.who !== 'מילר') fails.push(`the late save rang as ${save?.trigger} for ${save?.who}`);
  if (pick({ facts: [{ kind: 'penalty_saved', who: 'שלהם', minute: 70 }], keeper: 'מילר' })?.trigger === 'late_penalty_save')
    fails.push('a 70th minute save rang as a late one');
  if (pick({ facts: pen85, keeper: 'מילר', margin: 3 })?.trigger !== 'big_win') fails.push('a big win lost the phone to the save');
  if (pick({ facts: [...pen85, { kind: 'red_card', who: 'לוי', minute: 40 }], keeper: 'מילר' })?.trigger !== 'late_penalty_save')
    fails.push('the save is smaller than the sending off');
}

/* --------------------------------------- 4. the threads and the voices */
{
  checked += 3;
  if (THREADS.length !== 86) fails.push(`${THREADS.length} threads, the agreed count is 86 (26 + Itzik's 60)`);
  const perTrigger = (t: ChatTrigger) => THREADS.filter(x => x.trigger === t).length;
  for (const t of ['promotion_clinched', 'title_won', 'relegation_sealed', 'season_over_good',
    'late_penalty_save', 'first_win_season', 'streak_broken', 'youth_debut_goal'] as ChatTrigger[]) {
    if (perTrigger(t) < 3) { fails.push(`${t} has only ${perTrigger(t)} threads`); break; }
  }
  const contacts = new Set(THREADS.map(t => t.contact));
  for (const c of ['אח קטן', 'חברים מהשכונה', 'המורה לחינוך גופני', 'אבא של {who}', 'מאמן הנוער', 'סוכן שחקנים']) {
    if (!contacts.has(c)) { fails.push(`the new contact "${c}" never answers`); break; }
  }

  // Itzik's lines, pinned word for word
  const pins: Array<{ id: string; line: string }> = [
    { id: 'mother_relegated', line: 'גם כשנפלת מהאופניים בגיל שש קמת. ישר קמת' },
    { id: 'owner_title', line: 'תבוא מחר למשרד. יש שמפניה ויש חוזה חדש על השולחן' },
    { id: 'pe_teacher_hot_streak', line: 'תמיד אמרתי שאתה רואה מגרש אחרת מכולם' },
    { id: 'who_father_red_card', line: 'לא ביקשתי ממנו רשות לכתוב לך. אבא זה אבא' },
  ];
  for (const p of pins) {
    checked++;
    const th = THREADS.find(t => t.id === p.id);
    if (!th || !th.lines.some(l => l.text === p.line)) fails.push(`${p.id} lost Itzik's line "${p.line}"`);
  }

  // every slot in every new thread fills from a bare context
  checked++;
  const ctx = { club: 'רה', rival: 'יהוד', score: '2 - 1', star: 'כהן', mgr: 'איציק', who: 'מילר' };
  for (const t of THREADS) {
    const rolled = rollChat(t.trigger, ctx, createRng(1), THREADS.filter(x => x.trigger === t.trigger && x.id !== t.id).map(x => x.id))!;
    const raw = [rolled.contact, ...rolled.lines.flatMap(l => [l.from, l.text])].find(s => /\{\w+\}/.test(s));
    if (raw) { fails.push(`${rolled.id} left a slot unfilled: ${raw}`); break; }
  }
}

/* -------------------------- 3. the season nights, read off the table */
{
  const career = (seed: number): G.GameState => {
    let gs = G.newGame(seed);
    gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
    gs = G.pickCity(gs, LEGEND_TOWN);
    gs = G.afterSigning(gs, {});
    gs = G.enterPreseason({ ...gs, phase: 'preseason-market' } as never);
    while (gs.phase === 'preseason-market') gs = G.advancePreseason(gs);
    // no friend on the phone tonight: the season's own night is on trial
    return { ...gs, phase: 'hub', friends: [] };
  };
  const ev = (minute: number, type: MatchEvent['type'], teamId: string, playerId: string, playerName: string): MatchEvent =>
    ({ minute, type, teamId, playerId, playerName, text: '' });
  const fake = (home: string, away: string, score: [number, number], events: MatchEvent[] = []): MatchResult => ({
    seed: 1,
    home: { id: home, name: 'h', stats: { possession: .5, chances: 6, goals: score[0], xg: 1 } },
    away: { id: away, name: 'a', stats: { possession: .5, chances: 6, goals: score[1], xg: 1 } },
    score, events, ratings: {},
  } as MatchResult);

  /** my next fixture, the table bent to the story, the round played and walked past the press */
  const night = (gs0: G.GameState, bend: (pts: Record<string, { pts: number; played: number }>) => void,
                 playedSoFar: number, score: [number, number] = [1, 1], events: MatchEvent[] = []) => {
    const fx = gs0.league.fixtures.find(f => f.round >= gs0.week && (f.homeId === gs0.clubId || f.awayId === gs0.clubId))!;
    const table = JSON.parse(JSON.stringify(gs0.league.table)) as Record<string, { pts: number; played: number }>;
    for (const k of Object.keys(table)) { table[k].played = playedSoFar; table[k].pts = 10; }
    bend(table);
    let gs = { ...gs0, week: fx.round, league: { ...gs0.league, table: table as never } };
    gs = G.continueFromResult(G.commitRound(gs, fake(fx.homeId, fx.awayId, score, events)));
    while (gs.phase === 'press') gs = G.answerPress(gs, 0);
    return gs;
  };
  const chatOf = (gs: G.GameState) => (gs as { phase: string }).phase === 'chat' ? gs.chat!.id : null;
  const trigOf = (id: string | null) => id ? THREADS.find(t => t.id === id)?.trigger ?? null : null;

  const gs0 = career(606);
  const me = gs0.clubId;

  // the title, locked with four rounds that cannot change it
  checked += 3;
  const title = night(gs0, t => { t[me].pts = 40; }, 9);
  if (trigOf(chatOf(title)) !== 'title_won') fails.push(`a locked title rang as ${chatOf(title)}`);
  if (!title.seasonChatEvents?.includes('title_won')) fails.push('the title night was not remembered');
  // and it rings once: the next round, still champions, the phone moves on
  if ((() => { const again = night({ ...title, phase: 'hub' as const }, t => { t[me].pts = 43; }, 10);
    return trigOf(chatOf(again)) === 'title_won'; })()) fails.push('the title rang two weeks running');

  // second place locked is the promotion, not the title
  checked += 2;
  const promo = night(gs0, t => { const other = Object.keys(t).find(k => k !== me)!; t[other].pts = 45; t[me].pts = 40; }, 9);
  if (trigOf(chatOf(promo)) !== 'promotion_clinched') fails.push(`a locked second place rang as ${chatOf(promo)}`);
  const open = night(gs0, t => { t[me].pts = 20; }, 9);
  if (trigOf(chatOf(open)) === 'promotion_clinched' || trigOf(chatOf(open)) === 'title_won')
    fails.push('a lead the rounds left can still erase rang as locked');

  // the drop sealed: bottom, with the safe shore out of reach. ראש העין
  // starts in ליגה ג׳, where there is nowhere to fall, so the claim climbs
  // one tier up a hacked save
  checked++;
  {
    const upTier = { ...gs0, league: { ...gs0.league, clubs: gs0.league.clubs.map(c => ({ ...c, tier: 2 })) } };
    const sealed = night(upTier, t => { for (const k of Object.keys(t)) t[k].pts = 30; t[me].pts = 2; }, 9);
    if (trigOf(chatOf(sealed)) !== 'relegation_sealed') fails.push(`a sealed drop rang as ${chatOf(sealed)}`);
  }

  // a season over in the top half, with no trophy, still gets its thank-you
  checked += 2;
  const rounds = gs0.league.rounds;
  const good = night(gs0, t => { const ids = Object.keys(t).filter(k => k !== me); t[ids[0]].pts = 40; t[ids[1]].pts = 38; t[me].pts = 30; }, rounds - 1);
  if (trigOf(chatOf(good)) !== 'season_over_good') fails.push(`a good season's end rang as ${chatOf(good)}`);
  const mid = night(gs0, t => { for (const k of Object.keys(t)) t[k].pts = 30; t[me].pts = 2; }, rounds - 1);
  if (trigOf(chatOf(mid)) === 'season_over_good') fails.push('a season ended at the bottom still said thank you');

  // a fresh season forgets the nights
  checked++;
  if (G.enterSeason({ ...title, phase: 'hub' as const }).seasonChatEvents.length !== 0)
    fails.push('a new season still remembers last season\'s nights');

  // the keeper's late save and the boy's debut goal, wired through the save
  checked += 2;
  {
    const fx = gs0.league.fixtures.find(f => f.round >= gs0.week && (f.homeId === gs0.clubId || f.awayId === gs0.clubId))!;
    const oppId = fx.homeId === me ? fx.awayId : fx.homeId;
    const save = night(gs0, () => {}, 2, [0, 0], [ev(86, 'penalty_miss', oppId, 'px', 'בועט שלהם')]);
    const saveTrig = trigOf(chatOf(save));
    if (saveTrig !== 'late_penalty_save') fails.push(`a penalty pushed away in the 86th rang as ${chatOf(save)}`);
    else if (save.chat!.lines.some(l => /\{\w+\}/.test(l.from) || /\{\w+\}/.test(l.text))) fails.push('the save thread left a slot unfilled');

    const sq = G.mySquad(gs0);
    const kid = { ...sq.starters[3], id: 'kid-chat', name: 'דן אברמוב', age: 17 };
    const kidGs = { ...gs0, league: { ...gs0.league, squads: { ...gs0.league.squads, [me]: { starters: sq.starters.map((p, i) => i === 3 ? kid : p), bench: sq.bench } } } };
    const myScore: [number, number] = fx.homeId === me ? [1, 0] : [0, 1];
    const debut = night(kidGs, () => {}, 2, myScore, [ev(30, 'goal', me, kid.id, kid.name)]);
    if (trigOf(chatOf(debut)) !== 'youth_debut_goal') fails.push(`the boy's debut goal rang as ${chatOf(debut)}`);
    // and a grown man's first goal of the season is no academy story
    checked++;
    const adult = sq.starters.find(p => p.age >= 23)!;
    const grown = night(gs0, () => {}, 2, myScore, [ev(30, 'goal', me, adult.id, adult.name)]);
    if (trigOf(chatOf(grown)) === 'youth_debut_goal') fails.push(`${adult.name}'s goal rang as the academy boy's debut`);
  }
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 10).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, the phone knows the season\'s big nights and rings each once');
}
process.exit(fails.length ? 1 : 0);
