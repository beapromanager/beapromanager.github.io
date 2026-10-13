/**
 * Every conversation in the game, by league group, as JSON for the Word export (Itzik, 13.10).
 *   node --experimental-strip-types scripts/export-conversations.mts <outdir>
 * Groups: ליגה ג׳ to ליגה א׳ (tiers 1-3, one world), הליגה הלאומית (4), ליגת העל (5).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { CHAT_TIERS, DILEMMA_TIERS, FAN_TIERS, MATE_TIERS, PRESS_TIERS, inTier } from '../src/data/leagueGate.ts';
import { TEMPLATES, rollDilemma, SPEAKER_LABEL } from '../src/data/dilemmas.ts';
import { THREADS, rollChat } from '../src/data/chats.ts';
import type { ChatTrigger } from '../src/data/chats.ts';
import { MATE_THREADS, fillMate } from '../src/data/mateChats.ts';
import { everyFanLine } from '../src/data/fans.ts';
import type { FanContext } from '../src/data/fans.ts';
import { everyWideQuestion } from '../src/data/press.ts';
import type { PressContext } from '../src/data/press.ts';
import { everyFactQuestion } from '../src/data/pressFacts.ts';
import { createRng } from '../src/engine/matchEngine.ts';

const out = process.argv[2] ?? 'PIC/word';
mkdirSync(out, { recursive: true });

const GROUPS = [
  { key: 'a', title: 'ליגה ג׳, ב׳ ו־א׳', tiers: [1, 2, 3], show: 2 },
  { key: 'b', title: 'הליגה הלאומית', tiers: [4], show: 4 },
  { key: 'c', title: 'ליגת העל', tiers: [5], show: 5 },
];
const LEAGUE = ['', 'ליגה ג׳', 'ליגה ב׳', 'ליגה א׳', 'הליגה הלאומית', 'ליגת העל'];
const span = (table: Record<string, readonly [number, number]>, id: string, tiers: number[]): string => {
  const mine = tiers.filter(t => inTier(table, id, t));
  if (mine.length === tiers.length) return '';
  return `רק ב${mine.map(t => LEAGUE[t]).join(', ')}`;
};

const dctx = (tier: number): never => ({
  star: 'דני כהן', rival: 'הפועל נחל', club: 'מכבי עין סלע', money: 200_000 * (tier >= 4 ? 4 : tier >= 3 ? 3 : 1),
  benched: 'יוסי לוי', benchedApps: 1, youngster: 'עומר בן דוד', veteranName: 'אבי מזרחי', scorer: 'רועי שמש', dry: 'גיא פרץ',
  newcomer: 'אורי חן', academy: 'נועם גל', kids3: 'נועם, איתי ויונתן', squadSize: 20, room: 4, pos: 4, teams: 12, week: 8,
  isDerby: false, queued: '', sponsor: 'פיצה השכונה', sponsorWants: ['לוגו על החולצה'], city: 'עין סלע', tier, isHome: true,
  lostLast: false, league: LEAGUE[tier],
} as never);
const dsafe = (tier: number): never => new Proxy(dctx(tier) as object, {
  get: (o: Record<string, unknown>, k) => (k in o ? o[k as string] : (typeof k === 'string' ? '' : undefined)),
}) as never;

const pctx = (tier: number): PressContext => ({
  result: 'win', isDerby: false, lowMorale: false, highPrestige: false, tablePos: 3, totalTeams: 12, star: 'דני כהן', rival: 'הפועל נחל',
  city: 'עין סלע', isHome: true, fans: 50, lossRun: 0, gate: 0.7, justUp: false, week: 8, season: 1, rounds: 22, tier, firstSeasonAtTier: false,
  lead: 0, margin: 2, gf: 2, ga: 0, oppPos: 6, nextIsDerby: false, unbeatenBefore: 0, winRun: 1, scoutHired: false, scoutManPlayed: false,
  youthInSquad: false, youthDebut: false, youthStar: false, injuryTonight: false, allGoalsFirstHalf: false,
} as unknown as PressContext);

const fctx = (tier: number, timing: 'pre' | 'post'): FanContext => ({
  tier, timing, isDerby: false, isHome: true, rival: 'הפועל נחל', city: 'עין סלע', coldStriker: 'דני כהן', coldWeeks: 4, youngster: 'עומר',
  approach: 'balanced', result: 'win', scoreLine: '2:0', scorer: 'דני כהן', streak: 2, tablePos: 3, totalTeams: 12, fans: 50,
} as unknown as FanContext);

for (const g of GROUPS) {
  const T = g.show;
  const doc: Record<string, unknown> = { title: g.title, shownAs: LEAGUE[T] };

  /* the manager's desk: dilemmas, a few rolls each so the slots show */
  const dil: unknown[] = [];
  for (const t of TEMPLATES) {
    if (!g.tiers.some(x => inTier(DILEMMA_TIERS, t.id, x))) continue;
    const seen = new Set<string>();
    const rolls: unknown[] = [];
    for (let s = 1; s <= 6; s++) {
      try {
        const r = rollDilemma(t, dsafe(T), createRng(s * 7));
        if (seen.has(r.text)) continue;
        seen.add(r.text);
        rolls.push({
          speaker: r.speakerLabel, text: r.text,
          options: r.options.map(o => ({ label: o.label, outcome: o.outcome, money: o.effect.money ?? 0, morale: o.effect.morale ?? 0, fans: o.effect.fans ?? 0 })),
        });
      } catch { /* a template that needs a real save to roll */ }
    }
    if (!rolls.length) { dil.push({ id: t.id, speaker: SPEAKER_LABEL[t.speaker], where: span(DILEMMA_TIERS, t.id, g.tiers), rolls: [], unrolled: true }); continue; }
    dil.push({ id: t.id, where: span(DILEMMA_TIERS, t.id, g.tiers), rolls });
  }
  doc.dilemmas = dil;

  /* the press room */
  const q = [...everyWideQuestion(pctx(T)), ...everyFactQuestion(pctx(T))];
  const seenQ = new Set<string>();
  doc.press = q.filter(x => g.tiers.some(t => inTier(PRESS_TIERS, x.id, t)) && !seenQ.has(x.id) && seenQ.add(x.id)).map(x => ({
    id: x.id, where: span(PRESS_TIERS, x.id, g.tiers), text: x.text,
    answers: x.answers.map(a => ({ label: a.label, reply: a.reply })),
  }));

  /* the phone */
  const chats = new Map<string, unknown>();
  const triggers = [...new Set(THREADS.map(t => t.trigger))] as ChatTrigger[];
  for (const trig of triggers) for (let s = 1; s <= 120; s++) {
    const c = rollChat(trig, { tier: g.tiers[0], club: 'מכבי עין סלע', rival: 'הפועל נחל', score: '2 - 0', star: 'דני כהן', mgr: 'איציק', who: 'דני כהן' }, createRng(s * 11), []);
    if (!c || chats.has(c.id)) continue;
    // the thread must be open to the whole group for the plain mark; the partial ones say where
    chats.set(c.id, { id: c.id, where: span(CHAT_TIERS, c.id, g.tiers), contact: c.contact, subtitle: c.subtitle, lines: c.lines.map(l => `${l.from}: ${l.text}`) });
  }
  // chats open only to the upper tiers of a group are missed when the roll starts at its lowest tier
  if (g.tiers.length > 1) for (const trig of triggers) for (let s = 1; s <= 120; s++) {
    const c = rollChat(trig, { tier: g.tiers[g.tiers.length - 1], club: 'מכבי עין סלע', rival: 'הפועל נחל', score: '2 - 0', star: 'דני כהן', mgr: 'איציק', who: 'דני כהן' }, createRng(s * 13), []);
    if (!c || chats.has(c.id)) continue;
    chats.set(c.id, { id: c.id, where: span(CHAT_TIERS, c.id, g.tiers), contact: c.contact, subtitle: c.subtitle, lines: c.lines.map(l => `${l.from}: ${l.text}`) });
  }
  doc.chats = [...chats.values()];

  /* the friend */
  doc.mate = MATE_THREADS.filter(t => g.tiers.some(x => inTier(MATE_TIERS, t.id, x))).map(t => ({
    id: t.id, where: span(MATE_TIERS, t.id, g.tiers),
    lines: t.lines.map(l => fillMate(l, { league: LEAGUE[T] })),
    answers: t.answers.map(a => ({ label: fillMate(a.label, { league: LEAGUE[T] }), reply: fillMate(a.reply, { league: LEAGUE[T] }) })),
  }));

  /* the terrace */
  doc.fans = everyFanLine().filter(l => g.tiers.some(t => inTier(FAN_TIERS, l.id, t))).map(l => {
    let text = '';
    try { text = l.text(fctx(T, l.pool), createRng(3)); } catch { text = '(שורה שתלויה במצב המשחק)'; }
    return { id: l.id, when: l.pool === 'pre' ? 'לפני משחק' : 'אחרי משחק', where: span(FAN_TIERS, l.id, g.tiers), text };
  });

  writeFileSync(`${out}/${g.key}.json`, JSON.stringify(doc, null, 1));
  console.log(g.title, 'dilemmas', dil.length, 'press', (doc.press as unknown[]).length, 'chats', chats.size, 'mate', (doc.mate as unknown[]).length, 'fans', (doc.fans as unknown[]).length);
}
