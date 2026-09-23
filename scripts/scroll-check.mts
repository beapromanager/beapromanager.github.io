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

/* THE TEAM SHEET FITS THE SCREEN IT IS ON.
   At 100/140 the pitch alone was taller than a phone, so the eleven and the
   bench could not be on screen together and every drag began with a scroll.
   The pitch is measured into whatever is left between what is above it and
   the bench pinned below it. Measured in a real browser at three sizes: 440
   by 920 and 393 by 852 fit with nothing to scroll at all, 360 by 780 hits
   the floor and keeps 73 pixels of scroll rather than hide the keeper. What
   a check can hold is that the measuring is still there and still honest. */
{
  const squad = read('src/ui/screens/Squad.tsx');
  const css = read('src/ui/tokens.css');
  checked += 5;
  if (!/setPitchH\(/.test(squad) || !/useLayoutEffect/.test(squad)) {
    fails.push('the pitch is no longer measured to fit, so the team sheet is taller than the phone again');
  }
  if (!/window\.innerHeight - top - bench - PITCH_GAP/.test(squad)) {
    fails.push('the pitch is measured against something other than the room between the chrome and the bench');
  }
  if (!/const MIN_PITCH = \d+/.test(squad)) fails.push('the pitch can shrink without a floor, so the men can land on each other');
  // the floor is only safe if what cannot be squeezed out becomes scrollable
  if (!/setSpill\(room < MIN_PITCH \? bench \+ PITCH_GAP : 0\)/.test(squad)) {
    fails.push('on a screen below the floor the bottom of the pitch hides behind the bench with no way to reach it');
  }
  if (!/\.squad-pitch-box \.lineup-pitch\{height:100%/.test(css)) {
    fails.push('the pitch ignores the height it was measured into, because aspect-ratio wins');
  }
  console.log('  the team sheet is measured into the screen, with a floor and a way past the bench');
}

/* THE WAY FORWARD IS NOT BEHIND THE BENCH.
   On the first visit the squad screen's button is the ONLY way on to the
   market, and it sits under the pitch. Measuring the pitch into every pixel
   down to the pinned bench put that button behind it, and Itzik sent a picture
   of it half off the bottom of his phone. So the room the pitch is allowed
   stops short of the button on the screen that has one, and the page keeps the
   padding to match. Measured in a browser afterwards at 393x852 and 360x740:
   the button ends 22 pixels clear of the bench, with no man hidden behind it. */
{
  const squad = read('src/ui/screens/Squad.tsx');
  checked += 3;
  if (!/const below = firstTime \? BUTTON_ROOM : 0;/.test(squad)) {
    fails.push('the pitch takes the room the first visit needs for its only way forward');
  }
  if (!/window\.innerHeight - top - bench - PITCH_GAP - below/.test(squad)) {
    fails.push('the measured pitch does not subtract the room under it');
  }
  if (!/paddingBottom: view === 'pitch' \? \(firstTime \? BENCH_ALLOW \+ 22 : 8\)/.test(squad)) {
    fails.push('the page leaves no room under the first visit, so the button lands behind the bench');
  }
  console.log('  the first visit keeps its only way forward clear of the bench');
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
  if (!/<Portal><div className="bench-bar"/.test(squad)) {
    fails.push('the pinned bench is drawn inside the transformed screen, so it pins to the wrong thing');
  }
  if (!/\.bench-bar\{[^}]*position:fixed/.test(css)) {
    fails.push('the bench is not pinned to the screen, so it drifts as the page scrolls');
  }
  console.log('  the dragged man and the bench are both pinned to the viewport, not to the screen');
}

console.log(`${checked} checks`);
console.log('screens reset by the App, tabs and toggles reset themselves');
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every new page opens at the top');
process.exit(fails.length ? 1 : 0);
