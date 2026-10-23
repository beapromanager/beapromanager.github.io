// node --experimental-strip-types scripts/teaser-check.mts
// The neighbourhood league's teaser on the title screen (Itzik, 23.10): the date it counts to, that it
// goes away by itself, that it is not a button, and that it carries nothing of the league's code.
import { readFileSync, existsSync } from 'node:fs';
import { TEASER_OPENS_AT, teaserSeconds, teaserShown, teaserParts } from '../src/game/teaser.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

/* 1. the date: Sunday 25.10.2026, 20:00 on the clock of Israel, read from the zone and not from a sum */
{
  const f = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
  ok(f(TEASER_OPENS_AT) === '25/10/2026, 20:00', `the count ends at ${f(TEASER_OPENS_AT)} in Israel, wanted 25/10/2026, 20:00`);
  ok(new Date(TEASER_OPENS_AT).toISOString() === '2026-10-25T18:00:00.000Z', 'the instant is 18:00 UTC (winter time, UTC+2), not 17:00');
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', weekday: 'long' }).format(new Date(TEASER_OPENS_AT));
  ok(wd === 'Sunday', `the day is ${wd}, wanted Sunday`);
}

/* 2. the count and its end */
{
  const to = TEASER_OPENS_AT;
  ok(teaserSeconds(to - 90_000) === 90, 'ninety seconds before the end reads 90');
  ok(teaserSeconds(to - 1) === 0 && teaserSeconds(to) === 0 && teaserSeconds(to + 5_000_000) === 0, 'the count never goes below zero');
  ok(teaserShown(to - 1) && !teaserShown(to) && !teaserShown(to + 1), 'the card is shown up to the last millisecond and gone from the end on');
  const p = teaserParts(2 * 86_400 + 3 * 3600 + 4 * 60 + 5);
  ok(p.d === 2 && p.h === 3 && p.m === 4 && p.s === 5, 'days, hours, minutes and seconds split right');
}

/* 3. the card: not pressable, removes itself, nothing of the league */
{
  const card = readFileSync('src/ui/components/LeagueTeaser.tsx', 'utf8');
  const css = readFileSync('src/ui/teaser.css', 'utf8');
  const title = readFileSync('src/ui/screens/Title.tsx', 'utf8');
  ok(!/<button|onClick|onPointer|role="button"|tabIndex/.test(card), 'the teaser has something to press');
  ok(/if \(!teaserShown\(now\)\) return null;/.test(card), 'the teaser does not take itself off the screen when the count ends');
  ok(/setInterval\(\(\) => setNow\(Date\.now\(\)\), 1000\)/.test(card), 'the count is not live (a tick a second)');
  ok(card.includes('ליגת השכונה מגיעה') && card.includes("פותחים ליגה עם החבר'ה, מחמישי 20:00 עד ראשון 20:00") && card.includes('ההרשמה נפתחת בעוד'), 'the three lines of the card are not as asked');
  ok(card.includes("asset('/weekend/entrance.webp')"), 'the picture is not weekend/entrance.webp');
  ok(/\.lt-h\{[^}]*Secular One/.test(css), 'the headline is not set in Secular One');
  ok(title.includes('<LeagueTeaser />'), 'the title screen does not show the teaser');
  ok(existsSync('public/weekend/entrance.webp'), 'the picture file is missing');
  const code = [card, readFileSync('src/game/teaser.ts', 'utf8')].join('\n');
  ok(!/WEEKEND_LIVE|weekendCore|worker|fetch\(|WeekendApi/.test(code), 'the teaser reaches for the league: its door, its rules or the server');
  ok(!existsSync('src/game/weekendCore.ts') && !existsSync('worker/src/weekend.ts'), 'the league\'s own code is in this branch');
}

if (fails.length) { console.log('\nFAIL'); for (const f of fails) console.log('  ' + f); process.exit(1); }
console.log(`${checked} checks\nOK, the teaser counts to Sunday 25.10 20:00 Israel (18:00 UTC), can not be pressed, and takes itself off when the count ends`);
