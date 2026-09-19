/**
 * Reporting a fault, and the thank you for it.
 *   node --experimental-strip-types scripts/report-check.mts
 *
 * The game has no server, so a fault report is a message the game writes and
 * the manager pastes into a chat. What is checked here is that the message
 * carries what we need to act on it (which club, week, screen and build),
 * that the thank you follows the two rules the manager is not told about
 * (enough real writing, and a cap a season), that it lands once, and that a
 * career saved before any of this loads with a clean record.
 */
import * as G from '../src/game/state.ts';
import {
  composeReport, realLength, reportEarnsGem, fileReport, deviceLine, reportsThisSeason, describeError,
  REPORT_MIN_CHARS, REPORTS_PER_SEASON, GEMS_PER_REPORT, REPORT_CHAT_URL, REPORT_KINDS,
} from '../src/game/report.ts';
import { saveCareer, loadCareer } from '../src/game/save.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

function career(): G.GameState {
  let gs = G.newGame(6101);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'חיפה');
  return G.afterSigning(gs, {});
}
const env = { build: 'abc1234', device: 'Android · Chrome' };
const words = 'המשחק נתקע אחרי הפנדל ולא זז';   // 22 letters: no spaces, and the double ז folds to one

/* 1. THE MESSAGE SAYS WHERE AND ON WHAT. */
{
  const gs = { ...career(), week: 7, phase: 'squad' } as G.GameState;
  const msg = composeReport(gs, 'broken', words, env);
  const c = G.club(gs);
  checked += 7;
  if (!msg.includes(words)) fails.push('the manager\'s own words are not in the message');
  if (!msg.includes(REPORT_KINDS[0].label)) fails.push('the kind of report is not named');
  if (!msg.includes(c.short)) fails.push('the club is missing from the context line');
  if (!msg.includes('מחזור 7')) fails.push('the week is missing from the context line');
  if (!msg.includes('מסך squad')) fails.push('the screen is missing from the context line');
  if (!msg.includes('abc1234')) fails.push('the build is missing from the context line');
  if (!msg.includes('Android')) fails.push('the phone is missing from the context line');
  console.log('  the message carries the words, the kind, the club, the week, the screen, the build and the phone');
}

/* 2. WHAT COUNTS AS WRITING. */
{
  checked += 4;
  if (realLength('א'.repeat(40)) !== 1) fails.push(`forty of the same letter count as ${realLength('א'.repeat(40))}, not 1`);
  if (realLength('   \n\t  ') !== 0) fails.push('whitespace counts as writing');
  if (realLength(words) !== 22) fails.push(`"${words}" counts as ${realLength(words)} letters, not 22`);
  if (realLength('ab ab ab') !== 6) fails.push('alternating letters are folded, they should not be');
  const gs = career();
  const just = 'אבגדהוזחטיכלמנסעפצקר';         // twenty distinct letters
  checked += 3;
  if (just.length !== REPORT_MIN_CHARS) fails.push('the sample is not twenty letters, fix the test');
  if (!reportEarnsGem(gs, just)) fails.push('twenty real letters do not earn the thank you');
  if (reportEarnsGem(gs, just.slice(1))) fails.push('nineteen real letters earn the thank you');
  if (reportEarnsGem(gs, 'א'.repeat(30))) fails.push('thirty of one letter earn the thank you');
  console.log(`  ${REPORT_MIN_CHARS} real letters earn it; repeats and spaces do not count`);
}

/* 3. ONCE PER REPORT, AND A CAP A SEASON. */
{
  let gs = career();
  const gems0 = gs.gems;
  const one = fileReport(gs, words);
  checked += 3;
  if (!one.gem || one.gs.gems !== gems0 + GEMS_PER_REPORT) fails.push('the first report did not pay its gem');
  if (reportsThisSeason(one.gs) !== 1) fails.push(`after one report the season count is ${reportsThisSeason(one.gs)}`);
  if (one.gs.reports.season !== gs.season) fails.push('the report is logged against the wrong season');
  gs = one.gs;
  for (let i = 1; i < REPORTS_PER_SEASON; i++) gs = fileReport(gs, words + i).gs;
  const over = fileReport(gs, words + 'עוד');
  checked += 3;
  if (gs.gems !== gems0 + GEMS_PER_REPORT * REPORTS_PER_SEASON) fails.push('the cap did not pay out in full first');
  if (over.gem || over.gs.gems !== gs.gems) fails.push('a report past the cap still paid');
  if (reportsThisSeason(over.gs) !== REPORTS_PER_SEASON) fails.push('a report past the cap moved the count');
  // a short one does not eat the cap, and a new season opens it again
  const short = fileReport(career(), 'קצר');
  checked += 2;
  if (short.gem || reportsThisSeason(short.gs) !== 0) fails.push('a report too short to thank was counted against the cap');
  const next = { ...over.gs, season: over.gs.season + 1 };
  if (!reportEarnsGem(next, words)) fails.push('a new season did not open the cap again');
  console.log(`  ${GEMS_PER_REPORT} gem a report, ${REPORTS_PER_SEASON} a season, a short one costs nothing and the summer resets it`);
}

/* 4. AN OLD SAVE. */
{
  const gs = career();
  const raw = JSON.parse(JSON.stringify(gs)) as Record<string, unknown>;
  delete raw.reports;
  store.clear();
  saveCareer(raw as unknown as G.GameState);
  const back = loadCareer();
  checked += 2;
  if (!back || reportsThisSeason(back) !== 0) fails.push('a save from before reporting does not load with a clean record');
  if (back && !reportEarnsGem(back, words)) fails.push('a save from before reporting cannot earn the thank you');
  console.log('  a career from before reporting loads clean and can report');
}

/* 5. THE PHONE LINE, AND THE ROOM ON SCREEN. */
{
  checked += 3;
  const iphone = deviceLine('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', true);
  const android = deviceLine('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36', false);
  if (!/iPhone · Safari · מותקן/.test(iphone)) fails.push(`an installed iPhone reads as "${iphone}"`);
  if (!/Android · Chrome/.test(android) || /מותקן/.test(android)) fails.push(`an Android browser reads as "${android}"`);
  if (!/^https:\/\/ig\.me\/m\/[a-z0-9._]+$/.test(REPORT_CHAT_URL)) fails.push(`the chat link is "${REPORT_CHAT_URL}", not an ig.me conversation link`);
  // the sheet is reachable, and it keeps the rule to itself
  const sheet = readFileSync('src/ui/components/ReportSheet.tsx', 'utf8');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  const bar = readFileSync('src/ui/components/bits.tsx', 'utf8');
  checked += 4;
  if (!/<ReportSheet/.test(app)) fails.push('the app never mounts the report sheet');
  if (!/meters-report/.test(bar) || !/setReportHandler/.test(app)) fails.push('the bar on every screen has no way to report');
  if (/REPORT_MIN_CHARS|REPORTS_PER_SEASON|reportEarnsGem/.test(sheet)) fails.push('the sheet reads the thank you rule, so it can show it');
  if (!/clipboard\.writeText/.test(sheet) || !/REPORT_CHAT_URL/.test(sheet)) fails.push('the sheet does not copy the message and open the chat');
  // the message is shown before it goes, the copy is announced, and the way back is a button
  checked += 3;
  if (!/{message}/.test(sheet)) fails.push('the sheet sends without showing what it sends');
  if (!/ההודעה הועתקה/.test(sheet)) fails.push('the sheet never says the message was copied');
  if (!/חזרה למשחק/.test(sheet)) fails.push('the sheet has no way back to the game');
  console.log('  the phone line reads right, the chat link is a conversation, and the rule stays off screen');
}

/* 6. WHEN THE GAME ITSELF BREAKS. */
{
  const err = new Error("Cannot read properties of undefined (reading 'starters')");
  err.stack = ["TypeError: Cannot read properties of undefined (reading 'starters')",
    '    at lineup (http://localhost:5180/src/game/state.ts?t=1789797000:1466:22)',
    '    at SquadScreen (http://localhost:5180/src/ui/screens/Squad.tsx:88:19)',
    '    at renderWithHooks (http://localhost:5180/node_modules/.vite/deps/react-dom_client.js:11548:26)',
    '    at deeper (http://localhost:5180/x.js:1:1)'].join('\n');
  const d = describeError(err);
  checked += 6;
  if (!d.startsWith('Error: Cannot read properties')) fails.push(`the error line does not lead with the error: "${d}"`);
  if (!/state\.ts:1466/.test(d)) fails.push('the frame that threw is not in the description');
  if (/localhost|http:/.test(d)) fails.push('the site address is still in the frames');
  if (/\?t=/.test(d)) fails.push('a cache-busting query is still in the frames');
  if (/deeper/.test(d)) fails.push('more than three frames were kept');
  if (describeError('plain string') !== 'Error: plain string') fails.push('a thrown string does not read as an error');
  // the crash report carries the error, with or without a career to name
  const gs = career();
  const withCareer = composeReport(gs, 'broken', words, env, d);
  const noCareer = composeReport(null, 'broken', words, env, d);
  checked += 3;
  if (!withCareer.includes('[שגיאה: Error: Cannot read')) fails.push('the crash report does not carry the error');
  if (!noCareer.includes('abc1234') || !noCareer.includes('[שגיאה:')) fails.push('a crash before a career loaded loses the build or the error');
  if (composeReport(gs, 'broken', words, env).includes('שגיאה')) fails.push('an ordinary report has an error line');
  // and the net is under the whole game, keeps the save, and offers both doors
  const main = readFileSync('src/main.tsx', 'utf8');
  const net = readFileSync('src/ui/components/Crashed.tsx', 'utf8');
  checked += 5;
  if (!/<ErrorBoundary>\s*<App \/>/.test(main)) fails.push('the boundary does not wrap the app');
  if (!/getDerivedStateFromError/.test(net)) fails.push('no React error boundary');
  if (!/addEventListener\('error'/.test(net) || !/unhandledrejection/.test(net)) fails.push('errors thrown outside render are not caught');
  if (/clearCareer|removeItem/.test(net)) fails.push('the crash screen touches the save');
  if (!/<ReportSheet[^>]*crash=/.test(net) || !/location\.reload/.test(net)) fails.push('the crash screen lacks the report or the way back');
  console.log('  a crash is described in three frames without the address, reported with the error, and the net keeps the save');
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a fault report says where it happened, and the thank you keeps its rules');
process.exit(fails.length ? 1 : 0);
