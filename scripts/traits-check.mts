/**
 * A day job belongs to the lower leagues, and says which one.
 *   node --experimental-strip-types scripts/traits-check.mts
 *
 * "עבודה ביום" used to say "בליגה ג׳ הכדורגל לא מפרנס" in every division: a man
 * in ליגה א׳ was described as being in ליגה ג׳, and in ליגת העל, where a footballer
 * is paid to be one, the line was simply untrue. Agreed with Itzik: the line names the
 * division the man plays in, and in הליגה הלאומית and ליגת העל nobody gets it.
 */
import { assignTraits, renderLine, getTrait } from '../src/data/personalities.ts';
import { makeSquad } from '../src/data/squadGen.ts';
import { CITIES, clubFromCity } from '../src/data/cities.ts';
import { createRng } from '../src/engine/matchEngine.ts';
import { readFileSync, readdirSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

const squads = CITIES.slice(0, 60).map(city => {
  const club = clubFromCity(city, 1);
  const sq = makeSquad(60, createRng(city.name.length * 131 + 7), club.traits, undefined);
  return [...sq.starters, ...sq.bench];
});
const dayJobIn = (tier: number | undefined) => {
  let n = 0;
  for (const all of squads) {
    const m = assignTraits(all, [], tier);
    for (const p of all) if ((m.get(p.id) ?? []).some(t => t.id === 'day-job')) n++;
  }
  return n;
};

/* 1. THE LINE NAMES THE DIVISION, in the words of the league, not a fixed one */
{
  const t = getTrait('day-job')!;
  const p = squads[0][0];
  const say = (tier?: number) => renderLine(t, p, tier);
  checked += 7;
  if (!say(3).includes('בליגה א׳ הכדורגל לא מפרנס')) fails.push(`in ליגה א׳ the line reads: ${say(3)}`);
  if (!say(2).includes('בליגה ב׳ הכדורגל לא מפרנס')) fails.push(`in ליגה ב׳ the line reads: ${say(2)}`);
  if (!say(1).includes('בליגה ג׳ הכדורגל לא מפרנס')) fails.push(`in ליגה ג׳ the line reads: ${say(1)}`);
  if (say(3).includes('ליגה ג׳')) fails.push('the ליגה א׳ line still talks about ליגה ג׳');
  if (say(2).includes('ליגה ג׳') || say(2).includes('ליגה א׳')) fails.push('the ליגה ב׳ line talks about another division');
  // a caller that does not know the division must not be made to lie about it
  if (say(undefined).includes('ליגה ג׳')) fails.push('with no division given the line names ליגה ג׳ anyway');
  if (!/עובד .+ כל השבוע ומתאמן בערב\. ב.+ הכדורגל לא מפרנס, הוא עושה את זה מאהבה\.$/.test(say(1))) fails.push(`the sentence changed: ${say(1)}`);
  console.log('  the line names ליגה ג׳, ב׳ and א׳ for the man who plays there, and not the others');
}

/* 2. NOBODY IN הלאומית OR ליגת העל HAS ONE, and everywhere else somebody does */
{
  const below = [1, 2, 3].map(tier => dayJobIn(tier));
  const above = [4, 5].map(tier => dayJobIn(tier));
  checked += 4;
  if (below.some(n => n < 6)) fails.push(`in the lower divisions only ${below.join(', ')} of ${squads.length * 20} men have a day job, the trait is switched off there too`);
  if (above[0] !== 0) fails.push(`${above[0]} men in הליגה הלאומית have a day job`);
  if (above[1] !== 0) fails.push(`${above[1]} men in ליגת העל have a day job`);
  if (dayJobIn(undefined) < 6) fails.push('with no division given the trait is held back');
  console.log(`  a day job: ${below.join(', ')} men in tiers 1 to 3, ${above.join(' and ')} in tiers 4 and 5`);
}

/* 3. NOTHING MOVES IN THE DIVISIONS THAT KEEP IT. The pool is the same for every division, so below הלאומית
      every man has exactly the personality he had before. Above, the man who would have had a day job takes the
      next trait, and because no trait is handed out twice in a squad that can ripple to a few others there. */
{
  let movedBelow = 0, taken = 0;
  for (const all of squads) {
    const base = assignTraits(all, [], undefined);
    const low = assignTraits(all, [], 2);
    for (const p of all) {
      const a = (base.get(p.id) ?? []).map(t => t.id).join();
      if (a !== (low.get(p.id) ?? []).map(t => t.id).join()) movedBelow++;
      if (a.split(',').includes('day-job')) taken++;
    }
  }
  checked += 2;
  if (movedBelow) fails.push(`${movedBelow} men in a lower division changed personality`);
  if (taken < 6) fails.push(`only ${taken} men had a day job to lose, the comparison proves nothing`);
  console.log(`  ${taken} men had a day job to lose above, and not one man below הלאומית changed`);
}

/* 4. EVERY PLACE THAT PICKS OR PRINTS A PERSONALITY IS TOLD THE DIVISION.
      The fix is worthless if one screen forgets: a card read in ליגה א׳ still saying ליגה ג׳. */
{
  const files: string[] = [];
  const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p); } };
  walk('src/ui');
  files.push('src/game/liveMatch.ts');
  let calls = 0;
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\*|\/\/)/.test(line)) return;
      if (/\b(renderLine|assignTraits)\(/.test(line) && !/function |import /.test(line)) {
        calls++;
        if (!/tier/.test(line)) fails.push(`${f}:${i + 1} picks or prints a personality without the division: ${line.trim().slice(0, 90)}`);
      }
    });
  }
  checked += 3;
  if (calls < 8) fails.push(`found only ${calls} places that pick or print a personality, the scan is not looking where it should`);
  const st = readFileSync('src/game/state.ts', 'utf8');
  if (!/friends: gs\.friends, tier: club\(gs\)\.tier/.test(st)) fails.push('the match is started without the division');
  const lm = readFileSync('src/game/liveMatch.ts', 'utf8');
  if (!/applySquadTraits\(oStarters, oBench, mods, \[\], input\.tier\)/.test(lm)) fails.push('the other side of the match is given its personalities without the division');
  console.log(`  ${calls} places pick or print a personality, each told the division`);
}

console.log(`\n${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a day job is said in the division he plays in, and never above ליגה א׳');
process.exit(fails.length ? 1 : 0);
