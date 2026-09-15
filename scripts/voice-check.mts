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
import { readFileSync } from 'node:fs';

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

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, the corrections held and the pre-match read is advice');
process.exit(fails.length ? 1 : 0);
