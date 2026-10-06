/**
 * How money is written.
 *   node --experimental-strip-types scripts/money-check.mts
 *
 * A player sent a screenshot of the winter window card telling him the club had
 * "₪3739K". Itzik's rule: nothing above 999K is ever written in thousands, it
 * becomes 1M, 3.7M and so on, and nowhere in the game may a sum read like that.
 *   1. the one formatter writes every size right, at every edge
 *   2. the money everyone sees (the bar, the cards, the sentences) goes through it
 *   3. no file may shorten money to K by itself again
 */
import { moneyShort, formatMoney, formatMoneyExact } from '../src/data/money.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fails: string[] = [];
let checked = 0;

/* ------------------------------------------------ 1. the formatter */
{
  const table: Array<[number, string]> = [
    [0, '0'], [950, '950'], [1_000, '1K'], [15_000, '15K'], [120_000, '120K'],
    [999_499, '999K'],                    // the last number that is still thousands
    [999_500, '1M'], [999_999, '1M'],     // never "1000K"
    [1_000_000, '1M'], [1_040_000, '1M'], [1_300_000, '1.3M'], [1_450_000, '1.5M'],
    [3_375_000, '3.4M'], [3_739_000, '3.7M'], [12_340_000, '12.3M'],
    [-95_000, '-95K'], [-1_400_000, '-1.4M'], [-999_600, '-1M'],
  ];
  for (const [n, want] of table) {
    checked++;
    if (moneyShort(n) !== want) fails.push(`${n} reads ${moneyShort(n)}, wanted ${want}`);
  }
  checked += 5;
  if (formatMoney(3_739_000) !== '₪3.7M') fails.push(`the winter window sum reads ${formatMoney(3_739_000)}, not ₪3.7M`);
  if (formatMoney(-2_000_000) !== '-₪2M') fails.push(`a purse of minus two million reads ${formatMoney(-2_000_000)}`);
  if (formatMoney(-95_000) !== '-₪95K') fails.push(`a small debt reads ${formatMoney(-95_000)}`);
  if (formatMoneyExact(8_450) !== '₪8,450') fails.push(`a small raise reads ${formatMoneyExact(8_450)}`);
  if (formatMoneyExact(3_739_000) !== '₪3.7M') fails.push(`the exact form of a big sum reads ${formatMoneyExact(3_739_000)}`);

  // and across the whole range nothing is ever "NNNNK" with four or more digits
  checked++;
  let bad = 0;
  for (let n = -5_000_000; n <= 12_000_000; n += 997) if (/\d{4,}K/.test(moneyShort(n))) bad++;
  if (bad) fails.push(`${bad} sums between minus five and twelve million are written as thousands above 999K`);
}

/* ------------------------------ 2 + 3. everybody uses it, nobody rolls their own */
{
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  };
  walk('src');
  // a hand-made shortening: the amount divided by a thousand and a K stuck on the end
  const offenders = files.filter(f => !f.replace(/\\/g, '/').endsWith('data/money.ts')
    && /Math\.round\([^)]*\/\s*1_?000\)\s*\}\s*K/.test(readFileSync(f, 'utf8')));
  checked++;
  if (offenders.length) fails.push(`money is shortened to K by hand in: ${offenders.join(', ')}`);

  const read = (f: string) => readFileSync(f, 'utf8');
  checked += 5;
  if (!/export \{[^}]*formatMoney[^}]*\} from '..\/..\/data\/money\.ts'/.test(read('src/ui/components/bits.tsx'))) fails.push('the money bar and cards no longer take their money from the one formatter');
  if (!/moneyShort\(n\)/.test(read('src/game/state.ts'))) fails.push('the sentences in the game no longer take their money from the one formatter');
  if (!/`\$\{moneyShort\(Math\.abs\(n\)\)\} שקל`/.test(read('src/ui/screens/Notice.tsx'))) fails.push('the winter window card no longer says the sum in words, from the one formatter');
  if (!/formatMoney\(n\)/.test(read('src/ui/screens/Squad.tsx'))) fails.push('the squad screen no longer uses the one formatter');
  if (/toFixed\(1\)\}M/.test(read('src/ui/components/bits.tsx'))) fails.push('the bar has its own million format again');
}

console.log(`${checked} checks`);
if (fails.length) {
  console.log('\n  ' + fails.slice(0, 10).join('\n  '));
  console.log('\nFAIL');
} else {
  console.log('OK, nothing above 999K is ever written in thousands');
}
process.exit(fails.length ? 1 : 0);
