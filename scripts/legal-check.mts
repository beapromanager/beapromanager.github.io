/**
 * The weekend league asks for consent and keeps no mail (Itzik, 27.10).
 *
 *   1. no mail anywhere: no email field, no mail box, no "אפשר להסיר בכל רגע", nothing sent to the server, nothing
 *      stored by it; a lobby written by an earlier build loses its mails at the first request
 *   2. consent: all three registration screens carry the box, unticked from the start, and their button waits for
 *      it; the box names the terms and the privacy policy and says nothing of age; the server refuses a
 *      registration without the current version (all three doors), so a client cannot skip it by not drawing it
 *   3. the league's name goes through the nickname filter
 *   4. deletion: a finished match deletes itself a week later (squads, team names, device ids), the lobby sweeps
 *      itself, and the wording in the game says what is true
 *   5. the contact address is a mailto link on the title screen and in the league; the text of the two documents
 *      is in before the league's door may open
 * Run: npm run check:legal
 */
import { readFileSync } from 'node:fs';
import * as W from '../src/game/weekendCore.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { LobbyDO, MatchDO } from '../worker/src/weekend.ts';
import { LEGAL_TEXT_READY } from '../src/data/legalText.ts';
import { CONTACT_EMAIL } from '../src/game/legal.ts';

const fails: string[] = [];
let checked = 0;
const claim = (ok: boolean, msg: string) => { checked++; if (!ok) fails.push(msg); };
const read = (p: string) => readFileSync(p, 'utf8');

const screens = read('src/ui/weekend/Weekend.tsx');
const client = read('src/game/weekend.ts');
const worker = read('worker/src/weekend.ts');
const guide = read('src/game/weekendGuide.ts');
const title = read('src/ui/screens/Title.tsx');
const sheet = read('src/ui/components/LegalSheet.tsx');

function openTime(): number {
  for (let t = Date.UTC(2026, 10, 1, 18, 0); t < Date.UTC(2026, 11, 20); t += 3_600_000) {
    if (W.registrationGate(t) === null && W.cyclePhase(W.cycleOf(t), t) === 'open') return t;
  }
  throw new Error('no open registration hour found');
}
function fakeState(store: Map<string, unknown>, onAlarm: (t: number) => void = () => {}) {
  return {
    storage: {
      async get<T>(k: string) { return store.get(k) as T | undefined; },
      async put<T>(k: string, v: T) { store.set(k, structuredClone(v)); },
      async delete(k: string) { return store.delete(k); },
      async setAlarm(t: number) { onAlarm(t); },
      async deleteAlarm() {},
      async deleteAll() { store.clear(); },
    },
  } as never;
}
function fakeEnv() {
  const league = { fetch: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }) };
  return { LEAGUE: { idFromString: (s: string) => s, newUniqueId: () => ({ toString: () => 'L' + Math.random().toString(36).slice(2) }), get: () => league }, MATCH: {}, LOBBY: {} } as never;
}

/* 1. no mail */
{
  claim(!/MailOpt/.test(screens), 'the mail box component is still in the weekend screens');
  claim(!/type="email"|inputMode="email"|setEmail|\bemail\b/i.test(screens), 'a mail input or state is still in the weekend screens');
  claim(!/אפשר להסיר בכל רגע|רוצה לקבל עדכונים|מייל רק אם סימנת/.test(screens + guide + sheet), 'the mail wording is still in the game');
  claim(!/\bemail\b/i.test(client), 'the client API still has an email field');
  claim(!/\bemail\b/i.test(worker.replace(/\/\*[\s\S]*?\*\//g, '')), 'the server code still reads an email');
  claim(!/s\.mails\b|mails:/.test(worker), 'the server still stores mails');
  const store = new Map<string, unknown>([['lobby', { codes: {}, devices: {}, open: [], last: {}, champions: {}, mails: { dev1: { mail: 'a@b.co', at: 1 } }, counter: 0 }]]);
  const lobby = new LobbyDO(fakeState(store), fakeEnv());
  await lobby.fetch(new Request('https://do/mine?device=dev1xxxxxxxx'));
  claim(!('mails' in (store.get('lobby') as object)), 'a lobby written with mails kept them after the first request');
}

/* 2. consent */
{
  const boxes = (screens.match(/<ConsentBox /g) ?? []).length;
  claim(boxes === 3, `${boxes} registration screens carry the consent box, not 3`);
  claim((screens.match(/const \[ok, setOk\] = useState\(false\)/g) ?? []).length === 3, 'the consent is not false from the start on all three screens');
  claim((screens.match(/disabled=\{busy \|\| !ok \|\|/g) ?? []).length === 3, 'a registration button does not wait for the consent');
  claim((screens.match(/consent: LEGAL_VERSION/g) ?? []).length === 3, 'a registration does not send the consent version');
  claim(/קראתי ואני מסכים\/ה ל/.test(sheet) && /תנאי השימוש/.test(sheet) && /מדיניות הפרטיות/.test(sheet), 'the consent sentence is not the agreed one');
  const regs = screens.slice(screens.indexOf('function CreateLeague'), screens.indexOf('function Lobby'));
  claim(!/גיל|בן 18|מעל 18|ילד|קטין|הורה/.test(sheet + regs), 'the registration screens or the consent box talk about age');
  claim(!/defaultChecked|useState\(true\)/.test(sheet), 'the consent box is ticked by default');

  const t0 = openTime();
  const store = new Map<string, unknown>();
  const lobby = new LobbyDO(fakeState(store), fakeEnv());
  const post = async (path: string, b: object, at = t0) => {
    const res = await lobby.fetch(new Request(`https://do${path}`, { method: 'POST', body: JSON.stringify(b), headers: { 'x-now': String(at) } }));
    return { ok: res.ok, status: res.status, data: await res.json() as { error?: string } };
  };
  const slots = ['fri-12', 'fri-14', 'sat-20'];
  const base = (i: number) => ({ device: `consent-dev-${i}-xxxxxxxx`, nick: `שחקן${i}` });
  const doors: [string, object][] = [['/league', { name: 'ליגה טובה', slots, size: 6 }], ['/league/join', { code: 'ABCDEF' }], ['/league/open', {}]];
  for (const [path, extra] of doors) {
    const none = await post(path, { ...base(1), ...extra });
    claim(!none.ok && /לאשר/.test(none.data.error ?? ''), `${path}: a registration without consent was not refused for consent (${none.status} ${none.data.error})`);
    const old = await post(path, { ...base(1), ...extra, consent: '2020-01-01' });
    claim(!old.ok && /לאשר/.test(old.data.error ?? ''), `${path}: an old consent version was accepted`);
    const yes = await post(path, { ...base(1), ...extra, consent: W.LEGAL_VERSION });
    claim(!/לאשר/.test(yes.data.error ?? ''), `${path}: the right consent was refused for consent`);
  }
  claim(!JSON.stringify([...store.values()]).includes('@'), 'a mail-looking value ended up in storage');
}

/* 3. the name filter */
{
  claim(W.nameProblem('ליגת היטלר') !== null && W.nameProblem('FUCK league') !== null, 'a league name with a bad word passed nameProblem');
  claim(W.nameProblem('ליגת בניין 7') === null, 'a clean league name was refused');
  claim(W.nameProblem('א') !== null && W.nameProblem('א'.repeat(25)) !== null, 'the length rule of the name is gone');
  const store = new Map<string, unknown>();
  const lobby = new LobbyDO(fakeState(store), fakeEnv());
  const res = await lobby.fetch(new Request('https://do/league', { method: 'POST', headers: { 'x-now': String(openTime()) }, body: JSON.stringify({ device: 'name-dev-xxxxxxxxxx', nick: 'דודו', name: 'ליגת היטלר', slots: ['fri-12', 'fri-14', 'sat-20'], size: 6, consent: W.LEGAL_VERSION }) }));
  claim(res.status === 400 && /לא נכנס/.test((await res.json() as { error: string }).error), 'the server let a league with a bad name open');
}

/* 4. deletion */
{
  const rng = createRng(5);
  const h = makeSquad(85, rng), a = makeSquad(85, rng);
  const side = (id: string, name: string, s: ReturnType<typeof makeSquad>) => ({ id, name, starters: s.starters, bench: s.bench, tactic: { approach: 'balanced' as const, press: 'mid' as const, formation: '4-4-2' as const } });
  const store = new Map<string, unknown>();
  let alarmAt: number | null = null;
  const m = new MatchDO(fakeState(store, t => { alarmAt = t; }), fakeEnv());
  const real = Date.now;
  const t0 = real();
  await m.fetch(new Request('https://do/create', { method: 'POST', headers: { 'x-now': String(t0) }, body: JSON.stringify({ seed: 9, home: side('h', 'בניין 7', h), away: side('a', 'הגבעה', a), homeDevice: 'matchdev-home-xx', awayDevice: 'matchdev-away-xx' }) }));
  let done = false;
  for (let t = t0; !done && t < t0 + 3 * 3_600_000; t += 20_000) {
    const r = await m.fetch(new Request('https://do/result', { headers: { 'x-now': String(t) } }));
    done = (await r.json() as { done: boolean }).done;
  }
  claim(done, 'the match did not finish');
  const purgeAt = store.get('purgeAt') as number | undefined;
  claim(typeof purgeAt === 'number' && Math.abs(purgeAt - (real() + W.KEEP_MS)) < 60_000, 'a finished match does not set a purge a week ahead');
  claim(alarmAt === purgeAt, 'the purge is not set as the alarm');
  claim(store.has('duel') && store.has('devices'), 'the match has nothing to delete');
  Date.now = () => real() + W.KEEP_MS - 5 * 60_000;
  await m.alarm();
  claim(store.has('duel'), 'a match was deleted before its week was out');
  Date.now = () => real() + W.KEEP_MS + 5 * 60_000;
  await m.alarm();
  Date.now = real;
  claim(store.size === 0, `a match a week after its end still holds ${[...store.keys()].join(',')}`);

  claim(/async alarm\(\)[\s\S]{0,200}sweepLobby/.test(worker), 'the lobby does not sweep itself on an alarm');
  const faq = guide.slice(guide.indexOf("q: 'מה נשמר עליי?'"));
  claim(/הסגל/.test(faq) && /הבחירות/.test(faq) && /נמחקים/.test(faq) && /מספר האליפויות/.test(faq) && /לא נאסף טלפון, מיקום או מייל/.test(faq), 'the FAQ answer on what is kept is not the true one');
  claim(!/הכול נמחק/.test(guide + screens), 'a "everything is deleted" claim is back');
}

/* 5. contact and the text */
{
  claim(CONTACT_EMAIL === 'beapromanager@gmail.com', 'the contact address is not the agreed one');
  claim(/href=\{`mailto:\$\{CONTACT_EMAIL\}`\}/.test(sheet), 'the contact address is not a mailto link');
  claim(/LegalLinks open=\{setLegal\}/.test(title), 'the title screen has no legal links and contact line');
  claim((screens.match(/<WkFooter \/>/g) ?? []).length === 2, 'the league home and lobby do not both carry the footer');
  const live = /export const WEEKEND_LIVE\s*=\s*(\w+)/.exec(client);
  claim(!!live, 'WEEKEND_LIVE not found');
  claim(!live || live[1] !== 'true' || LEGAL_TEXT_READY, 'the league is open but the text of the terms and privacy policy is not in');
  claim(!/טיוטה|draft|עו״ד|עורך דין/i.test(read('src/data/legalText.ts')), 'the legal text carries a note meant for the lawyer or the word draft');
  // a decision still open is marked [[להשלים: ...]] in the text (29.10); the league's door stays shut while one is left
  const open = (read('src/data/legalText.ts').match(/\[\[להשלים/g) ?? []).length;
  claim(!live || live[1] !== 'true' || open === 0, `the league is open but the legal text still has ${open} open [[להשלים]] marker(s)`);
  // the review of 29.10: the operator line, the jurisdiction sentence, no "at any time", nothing called anonymous
  const legal = read('src/data/legalText.ts');
  claim(legal.includes('איציק עוזיאל, הפועל בשם העסקי ISRU-E') && !legal.includes('עוסק פטור'), 'the operator line is not the agreed one');
  claim(legal.includes('על תנאי השימוש יחול הדין הישראלי. סמכות השיפוט תהיה לבתי המשפט המוסמכים בהתאם להוראות הדין'), 'the jurisdiction sentence is not the agreed one');
  claim(!/בכל זמן|30 יום|חסימ/.test(legal), 'the legal text promises a time or a block it cannot keep, or says "at any time"');
  claim(!/אנונימי נספר/.test(title) && /לא בהכרח אנונימיים/.test(legal), 'the game still calls the counting anonymous');
}

if (fails.length) { console.log(`FAIL (${fails.length} of ${checked}):`); for (const f of fails) console.log(' - ' + f); process.exit(1); }
console.log(`ok: ${checked} claims. no mail; consent on all three doors, in the screen and on the server; names filtered; a finished match deletes itself.`);
