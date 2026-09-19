/**
 * Reporting a fault, from inside the game, to a DM on Instagram.
 *
 * There is no server, so the game's bug tracker is a chat. The game cannot
 * post to it, but it can write the message: the kind of thing that happened,
 * the manager's own words, and the line he would never think to add and we
 * cannot work without, which build, which phone, which screen, which week.
 * The message is copied to the clipboard and the chat is opened; he pastes
 * and sends. A screenshot is asked for, not required, because a picture of
 * the moment beats any description and cannot be checked either way.
 *
 * A report is thanked with a gem, on two conditions the manager is not told
 * about: enough actual writing to be a report at all, and a cap a season, so
 * the thank you is a thank you and not a faucet. Whether the message was
 * really sent cannot be known from here; what the cap does is make farming
 * it worth less than one advert a season.
 */

import type { GameState, ReportLog } from './state.ts';
import { club, NO_REPORTS } from './state.ts';
import { LEAGUE_NAMES } from '../data/clubs.ts';

export const GEMS_PER_REPORT = 1;
export const REPORTS_PER_SEASON = 2;
/** letters that count, after whitespace and runs of the same letter are folded */
export const REPORT_MIN_CHARS = 20;
export const REPORT_MAX_CHARS = 500;

/** The chat the report goes to. The ig.me form opens the conversation itself. */
export const REPORT_HANDLE = 'be.a.pro.il';
export const REPORT_CHAT_URL = `https://ig.me/m/${REPORT_HANDLE}`;

export type ReportKind = 'broken' | 'unfair' | 'text' | 'idea' | 'other';

export const REPORT_KINDS: Array<{ id: ReportKind; label: string; prompt: string }> = [
  { id: 'broken', label: 'משהו נתקע או נשבר', prompt: 'מה עשית רגע לפני, ומה קרה?' },
  { id: 'unfair', label: 'משהו לא הגיוני במשחק', prompt: 'מה קרה, ומה היה צריך לקרות לדעתך?' },
  { id: 'text', label: 'טעות בטקסט', prompt: 'איפה ראית אותה, ומה כתוב שם?' },
  { id: 'idea', label: 'רעיון לשיפור', prompt: 'מה היית רוצה שיהיה?' },
  { id: 'other', label: 'משהו אחר', prompt: 'ספר לנו.' },
];

/**
 * How much was actually written. Whitespace is not writing, and neither is
 * holding a key down: "אאאאאאאאאא" folds to one letter, so twenty of them
 * are one, not twenty.
 */
export function realLength(text: string): number {
  return text.replace(/\s+/g, '').replace(/(.)\1+/gu, '$1').length;
}

/** Reports thanked so far this season; a new season starts the count over. */
export function reportsThisSeason(gs: GameState): number {
  const log = gs.reports ?? NO_REPORTS;
  return log.season === gs.season ? log.count : 0;
}

/** Whether this report would be thanked with a gem. Not shown to the manager. */
export function reportEarnsGem(gs: GameState, text: string): boolean {
  return realLength(text) >= REPORT_MIN_CHARS && reportsThisSeason(gs) < REPORTS_PER_SEASON;
}

/** The phone and the build, as much as a browser will say, for the context line. */
export interface ReportEnv { build: string; device: string; }

export function deviceLine(ua: string, standalone: boolean): string {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'אחר';
  const browser = /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox/.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge'
    : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '';
  return [os, browser, standalone ? 'מותקן' : ''].filter(Boolean).join(' · ');
}

/**
 * The error itself, when the game caught one: its name and message and the
 * first few frames, with the site's own address stripped so it fits a chat
 * message. This is the part of a crash report that points at a line of code.
 */
export function describeError(err: unknown): string {
  // a thrown string has no frames worth the name; only a real Error carries a stack
  const e = err instanceof Error ? err : new Error(String(err));
  const frames = (err instanceof Error ? e.stack ?? '' : '')
    .split('\n').slice(1, 4)
    .map(l => l.trim().replace(/https?:\/\/[^/]+\//g, '').replace(/\?[^:)]*/g, ''))
    .filter(Boolean);
  return [`${e.name}: ${e.message}`, ...frames].join(' · ').slice(0, 320);
}

/**
 * The message itself. The manager's words first, because that is what he
 * wrote; then the line that makes it a bug report rather than a complaint.
 * A game that crashed before a career loaded still has a build and a phone
 * to report, so the state may be missing; the error, when there is one,
 * goes in its own line.
 */
export function composeReport(gs: GameState | null, kind: ReportKind, text: string, env: ReportEnv, error?: string): string {
  const k = REPORT_KINDS.find(x => x.id === kind)!;
  const where = gs
    ? `${club(gs).short} · ${LEAGUE_NAMES[club(gs).tier] ?? ''} · עונה ${gs.season} · מחזור ${gs.week} · מסך ${gs.phase}`
    : 'לפני שקריירה נטענה';
  return [
    `BE A PRO · ${k.label}`,
    '',
    text.trim(),
    '',
    `[${where}]`,
    `[גרסה ${env.build} · ${env.device}]`,
    ...(error ? [`[שגיאה: ${error}]`] : []),
  ].join('\n');
}

/**
 * File it: the thank you lands on the gems and the season's count moves,
 * once per report. The message was already handed to the clipboard by then;
 * this is the part the state remembers.
 */
export function fileReport(gs: GameState, text: string): { gs: GameState; gem: boolean } {
  const gem = reportEarnsGem(gs, text);
  if (!gem) return { gs, gem };
  const reports: ReportLog = { season: gs.season, count: reportsThisSeason(gs) + 1 };
  return { gs: { ...gs, gems: gs.gems + GEMS_PER_REPORT, reports }, gem };
}
