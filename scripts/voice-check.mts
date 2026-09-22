/**
 * The game's Hebrew.
 *   node --experimental-strip-types scripts/voice-check.mts
 *
 * Text is the part of this game with no compiler. A wrong preposition, a line
 * that is not a thing a coach would say, an option hint that describes the
 * opposite of what the option does — none of it breaks a build, none of it
 * fails a simulation, and all of it is read by every player every week.
 *
 * So the lines Itzik has corrected by hand are pinned here. Not the whole
 * language, just the specific things that were wrong once: they are exactly the
 * things a later edit is most likely to undo.
 */
import * as G from '../src/game/state.ts';
import { everyWideQuestion } from '../src/data/press.ts';
import { everyFactQuestion, pickPressQuestions } from '../src/data/pressFacts.ts';
import type { PressContext } from '../src/data/press.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { TEMPLATES } from '../src/data/dilemmas.ts';
import { THREADS } from '../src/data/chats.ts';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const fails: string[] = [];
let checked = 0;

const live = readFileSync('src/game/liveMatch.ts', 'utf8');
const state = readFileSync('src/game/state.ts', 'utf8');

/* 1. THE CORRECTIONS, PINNED.
      Each of these was wrong in a shipped build and Itzik read it on his phone.
      The wrong form is banned outright, because "fixed once" is not a property
      that survives a refactor on its own. */
{
  const pinned: Array<{ wrong: RegExp; right: string; where: string; why: string }> = [
    { wrong: /בורח אל \$\{/, right: 'בורח מ', where: 'the one-on-one', why: 'you do not flee TO the man you are running away from' },
    { wrong: /מנצח סיומת/, right: 'סוגר אפשרות לסיומת', where: 'the rush-out hint', why: 'a keeper closes the finish down, he does not win it' },
    { wrong: /חשוף לעיגול/, right: 'חשוף להקפצה מעל השוער', why: 'עיגול is not what a striker does over a keeper', where: 'the rush-out hint' },
    { wrong: /אל תיפתחו מטומטם/, right: '', where: 'the pre-match read', why: 'not a thing a coach says, and not advice either' },
  ];

  for (const p of pinned) {
    checked += 2;
    // the comments explaining the fixes quote the old wording, so only real
    // strings count: a line of Hebrew inside quotes or a template
    const inCode = [...live.matchAll(/['`][^'`\n]*[א-ת][^'`\n]*['`]/g), ...state.matchAll(/['`][^'`\n]*[א-ת][^'`\n]*['`]/g)]
      .map(m => m[0]).join('\n');
    if (p.wrong.test(inCode)) {
      fails.push(`${p.where} is back to the wrong wording — ${p.why}`);
    }
    if (p.right && !inCode.includes(p.right)) {
      fails.push(`${p.where} no longer says "${p.right}", which is the wording Itzik asked for`);
    }
  }
  console.log(`  ${pinned.length} corrections Itzik made by hand are still in place`);
}

/* 2. THE PRE MATCH READ IS ADVICE, AND IT VARIES.
      One fixed line per verdict meant a manager saw the same sentence fourteen
      weeks running, and one of the three was the insult above. Every line has
      to name something he can go and do on the tactic screen he is about to
      open, or it is a mood rather than a read. */
{
  const pools = /const SCOUT_LINES[\s\S]*?\n\};/.exec(state)?.[0] ?? '';
  checked++;
  if (!pools) fails.push('the pre-match advice pools are gone');

  for (const bucket of ['favourite', 'underdog', 'even', 'derby']) {
    const seg = new RegExp(`${bucket}: \\[([\\s\\S]*?)\\]`).exec(pools)?.[1] ?? '';
    const lines = [...seg.matchAll(/'([^']+)'/g)].map(m => m[1]);
    checked += 3;
    if (lines.length < 3) fails.push(`"${bucket}" has ${lines.length} lines, which is not enough to stop it repeating`);
    if (new Set(lines).size !== lines.length) fails.push(`"${bucket}" repeats itself inside its own pool`);
    // something to actually do: a shape, a line, a way of playing
    const actionable = lines.filter(l => /קו הגנה|אמצע|מתפרצ|סגור|פתוח|כדור|כדורים עומדים|ספסל|כרטיס|רציני|סבלני|מהדקה/.test(l));
    if (actionable.length < Math.ceil(lines.length / 2)) {
      fails.push(`only ${actionable.length} of ${lines.length} "${bucket}" lines tell him anything he can act on`);
    }
  }
}

/* 3. AND IT ACTUALLY CHANGES WEEK TO WEEK.
      The pools existing is not the same as them being reached. */
{
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'תל אביב');
  gs = G.afterSigning(gs, {});
  gs = G.enterSeason(gs);
  if (gs.phase === 'kit') gs = G.closeKitReveal(gs);
  if (gs.phase === 'sponsor') gs = G.takeSponsor(gs, G.sponsorChoices(gs)[0].id);

  const seen = new Set<string>();
  let derby = 0;
  for (let w = 1; w <= 14; w++) {
    const s = G.matchupScout({ ...gs, week: w });
    if (!s) continue;
    seen.add(s.line);
    if (s.line.startsWith('דרבי') || s.line.includes('זה דרבי')) derby++;
    checked++;
    if (!s.line.trim()) fails.push(`week ${w} had no line at all`);
  }
  checked += 2;
  if (seen.size < 4) fails.push(`a whole season produced only ${seen.size} different reads`);
  if (derby === 0) fails.push('the derby never gets its own line, so it reads like any other fixture');
  console.log(`  a season of reads: ${seen.size} different lines, ${derby} of them a derby`);

  // and the same fixture always says the same thing, or it is noise not a read
  checked++;
  const a = G.matchupScout({ ...gs, week: 3 })?.line;
  const b = G.matchupScout({ ...gs, week: 3 })?.line;
  if (a !== b) fails.push('the same fixture gives a different read each time it is looked at');
}

/* 4. THE SQUAD ROW SAYS WHO HE IS, NOT TWO OF HIS SIX NUMBERS. */
{
  const squad = readFileSync('src/ui/screens/Squad.tsx', 'utf8');
  checked += 2;
  if (/מהי <span/.test(squad)) fails.push('the squad row is back to printing pace, which the player card already carries');
  if (/בעי <span/.test(squad)) fails.push('the squad row is back to printing shooting, which the player card already carries');
}

/* 5. ONE IS NOT A PLURAL.
      "נשארו 1 מחזורי קיץ", "נשארו 1 העונה", "ותק 1 שנים", "עוד 1 עדכונים":
      every count that can reach one has a singular sentence, and the summer
      board no longer calls the second of three rounds the last one. Pinned by
      the same rule as section 1: the right sentence has to be there, and the
      old shape must not come back. */
{
  const files = {
    preseason: readFileSync('src/ui/screens/PreSeason.tsx', 'utf8'),
    packs: readFileSync('src/ui/screens/Packs.tsx', 'utf8'),
    ad: readFileSync('src/ui/components/AdPlayer.tsx', 'utf8'),
    feed: readFileSync('src/ui/components/Feed.tsx', 'utf8'),
    captain: readFileSync('src/ui/screens/Captain.tsx', 'utf8'),
    invite: readFileSync('src/game/invite.ts', 'utf8'),
  };
  const pins: Array<{ file: keyof typeof files; right: string; wrong?: RegExp; why: string }> = [
    { file: 'preseason', right: 'נשאר מחזור קיץ אחד לפני שהליגה מתחילה', why: 'one summer round is singular' },
    { file: 'preseason', right: 'נשאר לך עוד מחזור אחד, ואז הליגה מתחילה', wrong: /זה המחזור האחרון לפני שהליגה מתחילה/,
      why: 'the question is asked in round two of three, which is not the last round' },
    { file: 'ad', right: 'נשארה צפייה אחת העונה', why: 'one advert left is singular, on the reward card' },
    { file: 'packs', right: 'נשארה אחת העונה', why: 'the button with one advert left is singular' },
    { file: 'feed', right: 'עוד עדכון אחד', wrong: /'הצג פחות' : `עוד /, why: 'one more post is singular' },
    { file: 'captain', right: 'ותק שנה', wrong: /ותק <span className="num">\{Math\.max\(0, p\.age - 18\)\}<\/span> שנים/, why: 'one year of service is singular, and zero is a first year' },
    { file: 'captain', right: 'שנה ראשונה', why: 'an eighteen year old has no years of service to count' },
    { file: 'invite', right: 'החבר שיחק מחזור אחד', why: 'one round played is singular' },
  ];
  for (const p of pins) {
    checked += p.wrong ? 2 : 1;
    if (!files[p.file].includes(p.right)) fails.push(`${p.file} no longer says "${p.right}" — ${p.why}`);
    if (p.wrong && p.wrong.test(files[p.file])) fails.push(`${p.file} is back to the plural-only wording — ${p.why}`);
  }
  console.log(`  ${pins.length} counts that reach one have a singular sentence`);
}

/* 6. THE PRESS ROOM IS IN ITZIK'S WORDS.
      Every question, every line and every reply was rewritten by hand from the
      document, with the tempting answer first and a cost on most of them. The
      questions are read out of the generators, filled in, so this measures
      what the reporter actually says, not the file. A few lines are pinned
      outright: they are the ones a later "improvement" is most likely to undo. */
{
  // filled in, so a placeholder that lands next to a full stop is not an empty word
  const BARE_CTX: PressContext = { result: 'win', isDerby: false, lowMorale: false, highPrestige: false, tablePos: 5, totalTeams: 10, star: 'כהן', rival: 'הפועל', city: 'חיפה', isHome: true, fans: 50, lossRun: 0, gate: 0.7, justUp: false };
  const qs = [...everyWideQuestion(BARE_CTX), ...everyFactQuestion(BARE_CTX)];
  checked++;
  if (qs.length !== 61) fails.push(`${qs.length} questions read out of the press room, the document has 61`);
  // the typography rules hold on every line the manager reads
  const bad = [];
  for (const q of qs) for (const s of [q.text, ...q.answers.flatMap(a => [a.label, a.reply])]) {
    if (/\s[,.!?]/.test(s)) bad.push(`${q.id}: a space before punctuation in "${s}"`);
    if (/[—–]/.test(s)) bad.push(`${q.id}: a long dash in "${s}"`);
    if (/\{[א-ת]+\}/.test(s)) bad.push(`${q.id}: a document placeholder left in "${s}"`);
  }
  checked++;
  if (bad.length) fails.push(...bad.slice(0, 3));
  // two answers each, and the pair is never a free lunch: somewhere in every
  // question at least one line costs something, or there is nothing to weigh
  checked++;
  const free = qs.filter(q => q.answers.every(a => Object.values(a.effect).every(v => (v ?? 0) >= 0)));
  if (free.length > 16) fails.push(`${free.length} questions have no line that costs anything: ${free.slice(0, 4).map(q => q.id).join(', ')}`);
  // the terrace is in the room: most lines say something to it
  checked++;
  const withFans = qs.flatMap(q => q.answers).filter(a => a.effect.fans);
  if (withFans.length < 50) fails.push(`only ${withFans.length} of ${qs.length * 2} lines move the terrace`);
  // pinned, first answer first: the tempting one leads
  const pins: Array<{ id: string; first: string; reply?: string; gone: string }> = [
    { id: 'big_win_real', first: 'תתרגלו, זה רק הפרומו! באנו לשבור את הליגה', gone: 'זאת הקבוצה שלנו, תתרגלו' },
    { id: 'big_win_raise', first: 'מחר על הבוקר, מקווה שהוא יענה לי הקמצן הזה', gone: 'כבר שלחתי לו הודעה' },
    { id: 'win_quiet', first: 'היציע צריך לחגוג? שיחגוג. אני מאמן לא ברמן', gone: 'ניצחון זה ניצחון. שיחגגו בבית' },
    { id: 'loss_broke', first: 'בדקה שהשופט החליט למי הוא שורק, פעם באה שישים חולצה שלהם', gone: 'לקחתי אחריות, זו טעות שלי' },
    { id: 'penalty_miss', first: 'הכלב שלי אם צריך, רק לא הוא.', reply: 'צחוק באולם. השחקנים לא אהבו את הבדיחה.', gone: 'הוא בועט. גם בפעם הבאה' },
    { id: 'red_card', first: 'אם אתה מקבל אדום כזה, הקשר שלך לכדורגל מקרי בהחלט', gone: 'אין לזה מקום, והוא ישלם על זה' },
    { id: 'top_man_rest', first: '90 דקות כל משחק, שמעת אותי? לא מוציא אותו בחיים.', gone: 'הוא ינוח בקיץ' },
    { id: 'thrash_home', first: 'אחרי המשחק כזה אני לא רוצה לדבר עם אשתי. אז איתך? שחרר אותי', gone: 'אני פה, תשאל מה שבא לך' },
  ];
  for (const p of pins) {
    const q = qs.find(x => x.id === p.id);
    checked += 3;
    if (!q) { fails.push(`${p.id} is gone from the press room`); continue; }
    if (q.answers[0].label !== p.first) fails.push(`${p.id} no longer opens with "${p.first}" but with "${q.answers[0].label}"`);
    if (p.reply && q.answers[0].reply !== p.reply) fails.push(`${p.id}'s reply is not Itzik's: "${q.answers[0].reply}"`);
    if (q.answers.some(a => a.label === p.gone)) fails.push(`${p.id} is back to "${p.gone}", which the document replaced`);
  }
  // and nothing is halved on the way to the manager: the match question the
  // room hands out pays exactly what its card says
  const hat = everyFactQuestion().find(q => q.id === 'hat_trick')!;
  const handed = pickPressQuestions(BARE_CTX, createRng(3), [{ kind: 'hat_trick', who: 'x', minute: 1, n: 3 }], []).qs[0];
  checked += 2;
  if (handed.id !== 'hat_trick') fails.push(`a hat trick led with ${handed.id}`);
  else if (JSON.stringify(handed.answers.map(x => x.effect)) !== JSON.stringify(hat.answers.map(x => x.effect)))
    fails.push(`the room hands out ${JSON.stringify(handed.answers[1].effect)} for a line whose card says ${JSON.stringify(hat.answers[1].effect)}`);
  console.log(`  ${qs.length} questions in Itzik's words, ${pins.length} lines pinned, ${withFans.length} lines reach the terrace`);
}

/* 7. THE TALKS BEFORE AND AFTER THE MATCH ARE IN ITZIK'S WORDS TOO.
      The pre-match dilemmas and the post-match chats came back from his
      document rewritten line by line. The typography rules hold across all of
      them, read out of the data, and a handful of lines are pinned: the ones
      he singled out, starting with the reservist's thank you. */
{
  const bare = {
    star: 'כהן', rival: 'הפועל', club: 'חיפה', money: 180000, benched: 'לוי', benchedApps: 1, youngster: 'בר', veteranName: 'דהן', scorer: 'מור', dry: 'סבג', newcomer: 'רוסו',
    academy: 'גל', kids3: 'א, ב, ג', squadSize: 18, pos: 4, teams: 8, week: 6, isDerby: true, sponsor: 'ULTRAS KIT', sponsorWants: ['x'],
  };
  const lines: Array<[string, string]> = [];
  for (const t of TEMPLATES) {
    const slots = { ...t.slots, ...(t.slotsFor ? t.slotsFor(bare) : {}) };
    const picks: Record<string, string> = {}; for (const [k, v] of Object.entries(slots)) picks[k] = v[0];
    lines.push([t.id, t.text]);
    for (const v of Object.values(slots).flat()) lines.push([t.id, v]);
    for (const o of t.options(bare, picks)) { lines.push([t.id, o.label], [t.id, o.outcome]); }
  }
  for (const th of THREADS) for (const l of th.lines) lines.push([th.id, l.text]);
  const bad: string[] = [];
  for (const [id, s] of lines) {
    if (/\s[,.!?]/.test(s)) bad.push(`${id}: a space before punctuation in "${s}"`);
    if (/[—–]/.test(s)) bad.push(`${id}: a long dash in "${s}"`);
  }
  checked += 2;
  if (bad.length) fails.push(...bad.slice(0, 3));
  if (lines.length < 350) fails.push(`only ${lines.length} lines read out of the talks`);
  const pins: Array<{ id: string; right: string; gone: string }> = [
    { id: 'player_army', right: 'הוא מעריך מאוד את התשובה. במשחק הזה הוא לא איתך.', gone: 'הוא הודה לך בלב' },
    { id: 'player_minutes_or_quit', right: 'עזוב עדיף לך לפרוש, אני משחרר אותך לשווארמה', gone: 'אני משחרר אותך לשווארמה\'' },
    { id: 'owner_son', right: 'הבן של ראש העיר', gone: 'הנכד של הנשיא' },
    { id: 'reporter_dry_spell', right: 'מצטט אותך "הוא עוד יסיים מלך השערים". החלוץ יישמח מהתשובה.', gone: 'הכתבה תצא רכה' },
    { id: 'mother_derby_loss', right: 'אמרתי לה "רק בהפסדים את שואלת?"', gone: 'אמרתי לה שאתה גדול' },
    { id: 'fans_derby_draw', right: 'תיקו בדרבי זה כמו לאכול וופל לימון.', gone: 'לנשק את אחותך' },
  ];
  for (const p of pins) {
    const mine = lines.filter(([id]) => id === p.id).map(([, s]) => s).join('\n');
    checked += 2;
    if (!mine.includes(p.right)) fails.push(`${p.id} no longer says "${p.right}"`);
    if (mine.includes(p.gone)) fails.push(`${p.id} is back to "${p.gone}", which the document replaced`);
  }
  console.log(`  ${lines.length} lines of talk in Itzik's words, ${pins.length} pinned`);
}

/* 8. NO LONG DASH ANYWHERE THE PLAYER READS.
      Sections 6 and 7 read the press room and the talks out of their data, and
      four long dashes still shipped: three in the assistant's pre-match read
      and one on the kit reveal, none of them in a file those sections look at.
      So this one reads every source file under src instead. Comments are
      stripped first, because the English that explains a fix is allowed to
      punctuate however it likes; what is left is code, and the only Hebrew in
      code is a line the player will see. */
{
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
  const files = walk('src');
  const bad: string[] = [];
  for (const f of files) {
    const code = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    for (const line of code.split('\n')) {
      if (/[—–]/.test(line)) bad.push(`${f}: a long dash in "${line.trim()}"`);
    }
  }
  checked++;
  if (files.length < 40) fails.push(`only ${files.length} source files walked under src`);
  checked++;
  if (bad.length) fails.push(...bad.slice(0, 4));
  console.log(`  ${files.length} source files, no long dash outside a comment`);
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the corrections held and the pre-match read is advice');
process.exit(fails.length ? 1 : 0);
