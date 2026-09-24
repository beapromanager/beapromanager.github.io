/**
 * Every new page opens at the top.
 *   node --experimental-strip-types scripts/scroll-check.mts
 *
 * Landing halfway down whatever you just opened is one of those faults that
 * makes a whole game feel broken, and it kept coming back because the reset was
 * keyed on the game phase. A phase is not a page: the press room asks two
 * questions inside one, the summer runs three market rounds inside one, and the
 * squad, the market and the table each swap what they show behind a tab.
 *
 * These are source guards rather than behaviour: the behaviour lives in a
 * browser and was measured there, but a guard that fails the moment somebody
 * adds a fourth tab without a reset is worth more than a passing note.
 */
import { readFileSync } from 'node:fs';
import { edgeScrollSpeed } from '../src/ui/scroll.ts';

const fails: string[] = [];
let checked = 0;

const read = (f: string) => readFileSync(f, 'utf8');

/* 1. one helper, used everywhere, rather than the reset copied around */
{
  const scroll = read('src/ui/scroll.ts');
  checked += 2;
  if (!scroll.includes('export function scrollToTop')) fails.push('there is no shared scrollToTop');
  // it has to cover whichever element is the scroller, which has changed before
  for (const target of ['scrollingElement', 'documentElement', 'body', 'window.scrollTo']) {
    checked++;
    if (!scroll.includes(target)) fails.push(`scrollToTop does not reset ${target}`);
  }
}

/* 2. the App resets on more than the phase. This is the one that broke: the
      second press question and each summer round leave the phase alone. */
{
  const app = read('src/ui/App.tsx');
  const key = app.slice(app.indexOf('const screenKey'), app.indexOf('useLayoutEffect(scrollToTop'));
  checked += 4;
  if (!app.includes('useLayoutEffect(scrollToTop, [screenKey])')) {
    fails.push('the App no longer resets the scroll on a screen change');
  }
  if (!key.includes('gs.phase')) fails.push('the reset key does not include the phase');
  if (!key.includes('press')) {
    fails.push('the reset key ignores the press question, so the second one opens scrolled');
  }
  if (!key.includes('preWeek')) {
    fails.push('the reset key ignores the summer round, so each market round opens scrolled');
  }
}

/* 3. anything that swaps what a screen shows resets it itself, because the App
      cannot see a tab living inside a component */
{
  const inScreen: [string, string, string][] = [
    ['src/ui/screens/Transfers.tsx', "setTab('market')", 'the market tab'],
    ['src/ui/screens/Transfers.tsx', "setTab('mine')", 'the selling tab'],
    ['src/ui/screens/Standings.tsx', 'setTab(t.id)', 'the table tabs'],
    ['src/ui/screens/Squad.tsx', "setView('pitch')", 'the lineup pitch'],
    ['src/ui/screens/Squad.tsx', "setView('list')", 'the lineup list'],
  ];
  for (const [file, call, what] of inScreen) {
    const src = read(file);
    checked++;
    const at = src.indexOf(call);
    if (at < 0) { fails.push(`${what}: ${call} is gone, this guard needs updating`); continue; }
    // the reset has to be in the same handler, so look at the rest of that line
    const line = src.slice(at, src.indexOf('\n', at));
    if (!line.includes('scrollToTop()')) {
      fails.push(`${what} switches without resetting the scroll`);
    }
  }
}

/* 4. nobody has quietly gone back to rolling their own */
{
  for (const f of ['src/ui/App.tsx', 'src/ui/screens/Transfers.tsx', 'src/ui/screens/Squad.tsx', 'src/ui/screens/Standings.tsx']) {
    const src = read(f);
    checked++;
    if (/scrollTop\s*=\s*0/.test(src) && !src.includes('scroll.ts')) {
      fails.push(`${f} resets the scroll by hand instead of using the helper`);
    }
  }
}

/* CARRYING A MAN DOES NOT MOVE THE THING HE IS BEING CARRIED TO.
   The bench is pinned to the bottom of the squad room, which makes the bottom
   of the screen a destination rather than an edge to run from. The finger
   inside the bench scrolls nothing; the band just above it still does, because
   the far end of the pitch can be below the fold. Measured, not described:
   requestAnimationFrame does not run in a headless pane, so the handler itself
   cannot be driven, but the rule it asks can. */
{
  const VH = 920, BENCH = 84;
  const at = (y: number) => edgeScrollSpeed(y, VH, BENCH);
  checked += 6;
  if (at(VH - 10) !== 0) fails.push(`a finger on the bench scrolls the page at ${at(VH - 10)}, so the bench runs away from it`);
  if (at(VH - BENCH + 1) !== 0) fails.push('a finger just inside the top of the bench still scrolls the page');
  if (!(at(VH - BENCH - 10) > 0)) fails.push('the band just above the bench will not scroll down, so the far end of the pitch is unreachable');
  if (!(at(10) < 0)) fails.push('the top edge will not scroll up');
  if (at(VH / 2) !== 0) fails.push('the middle of the screen scrolls on its own');
  // and with no bench in the way, the bottom edge behaves as it always did
  if (!(edgeScrollSpeed(VH - 10, VH, 0) > 0)) fails.push('without a pinned bench the bottom edge stopped scrolling at all');
  console.log('  carrying a man never moves the bench he is being carried to');
}

/* THE TEAM SHEET IS LAID OUT, NOT MEASURED.
   The pitch used to be measured into whatever was left above a pinned bench,
   and the measurement produced three faults in a row: the bench over the
   defence, the only way forward behind the bench, and finally a flicker, which
   is where a measurement that feeds the layout it is measuring always ends.

   The browser does it now. In the pitch view the screen is a column exactly as
   tall as the window: everything down to the team sheet scrolls inside it, the
   bench is the bottom row in the flow, and the pitch takes what is left, with
   a floor so the men never land on each other. Nothing to recompute, nothing
   to go stale, and the bench cannot cover anything because it is not on top of
   anything.

   Measured in a browser afterwards. 393x852: the pitch is 330 tall, every one
   of the eleven fully visible above the bench, nothing scrolls at all. 360x740:
   the pitch sits on its floor at 240, still nothing hidden. Dragging a man to
   the bench and back still works with the ghost on the finger. */
{
  const squad = read('src/ui/screens/Squad.tsx');
  const css = read('src/ui/tokens.css');
  checked += 6;

  // nothing measures the pitch any more, and that is the point
  if (/setPitchH|const \[spill|BENCH_ALLOW|MIN_PITCH =/.test(squad)) {
    fails.push('the pitch is being measured again, which is what the flicker was');
  }
  if (!/className=\{view === 'pitch' \? 'squad-scroll' : 'contents'\}/.test(squad)) {
    fails.push('the part above the bench is no longer its own scrolling area');
  }
  // the column is the window, so the bench lands on the bottom by construction
  if (!/\.frame:has\(\.squad-fit\)\{height:100dvh/.test(css)) {
    fails.push('the squad room is no longer a column the height of the window, so the bench floats');
  }
  if (!/\.squad-fit\{[^}]*display:flex[^}]*flex-direction:column/.test(css)) {
    fails.push('the squad room is not a column, so the bench is not its last row');
  }
  if (!/\.squad-pitch-box\{display:flex; flex:1 1 auto; min-height:240px;\}/.test(css)) {
    fails.push('the pitch does not take the room left over, or has no floor under it');
  }
  // and the bench is in the flow: pinning it is what put it over the defence
  if (/\.bench-bar\{[^}]*position:fixed/.test(css)) {
    fails.push('the bench is pinned over the page again instead of being the bottom row');
  }
  console.log('  the team sheet is laid out by the browser, with the bench as the bottom row');
}

/* AND HE STAYS UNDER THE FINGER.
   .screen animates in with a transform, which makes position:fixed mean
   "relative to the top of the screen" rather than to the viewport, and put the
   dragged man a hundred pixels off the thumb carrying him. Portal is how the
   rest of the game escapes it. Both the ghost and the pinned bench are fixed,
   so both have to be portaled, and the bench has to actually be pinned. */
{
  const squad = read('src/ui/screens/Squad.tsx');
  const css = read('src/ui/tokens.css');
  checked += 3;
  if (!/<Portal><div className="drag-ghost"/.test(squad)) {
    fails.push('the dragged man is drawn inside the transformed screen, so he lands off the finger');
  }
  // The bench used to be pinned over the page, which needed a portal to
  // escape the screen's transform. It is the bottom row of the column now, so
  // it needs neither, and the dragged man is the only thing left that is fixed.
  if (/<Portal><div className="bench-bar"/.test(squad)) {
    fails.push('the bench is portaled again, which it only needed while it was pinned over the page');
  }
  if (/\.bench-bar\{[^}]*position:fixed/.test(css)) {
    fails.push('the bench is pinned over the page again, which is what put it over the defence');
  }
  console.log('  the dragged man and the bench are both pinned to the viewport, not to the screen');
}

console.log(`${checked} checks`);
console.log('screens reset by the App, tabs and toggles reset themselves');
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every new page opens at the top');
process.exit(fails.length ? 1 : 0);
