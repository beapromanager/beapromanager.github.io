/**
 * The offer to install matches what the device can actually do.
 *   node --experimental-strip-types scripts/install-check.mts
 *
 * Every browser gets a route onto the home screen, and the route is the one
 * that works in THAT browser. Chrome has a real install API. An iPhone has none
 * and only Safari may do it at all. Firefox, Samsung Internet and Opera each
 * have it buried in a different menu. A game already installed is never asked
 * again. Getting one of these wrong sends somebody hunting for a button that is
 * not there, which is worse than saying nothing.
 */
import { installKind, isIos, isInstalled, wireInstall, promptInstall, installGuide } from '../src/ui/install.ts';

const fails: string[] = [];
let checked = 0;

/* a tiny stand in for the browser, because none of this exists in node */
type Fake = { ua: string; standalone?: boolean; displayMode?: string; touch?: number };
function pretend(d: Fake): void {
  // node defines navigator as a getter, so it has to be redefined outright
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true, writable: true,
    value: { userAgent: d.ua, maxTouchPoints: d.touch ?? 0, standalone: d.standalone },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true, writable: true,
    value: {
      matchMedia: (q: string) => ({ matches: !!d.displayMode && q.includes(d.displayMode) }),
      addEventListener: () => { /* nothing fires in here */ },
    },
  });
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0';
const FIREFOX_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/23.0 Chrome/115 Mobile Safari/537.36';
const OPERA_ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 OPR/79.0';
const EDGE_ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 EdgA/120.0';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1';

/* 1. an iPhone is recognised, and gets the instructions rather than a dead button */
{
  pretend({ ua: IPHONE });
  checked += 2;
  if (!isIos()) fails.push('an iPhone was not recognised as iOS');
  if (installKind() !== 'ios') fails.push(`an iPhone was offered ${installKind()}, it has no install API`);
}

/* 2. an iPad reporting itself as a Mac is still an iPad. Apple made recent
      iPads send a desktop Safari string, so touch points are the only tell. */
{
  pretend({ ua: IPAD_AS_MAC, touch: 5 });
  checked += 2;
  if (!isIos()) fails.push('an iPad pretending to be a Mac was not recognised');
  if (installKind() !== 'ios') fails.push('an iPad was not offered the iOS instructions');
  // and a real Mac is not an iPad
  pretend({ ua: IPAD_AS_MAC, touch: 0 });
  checked++;
  if (isIos()) fails.push('a desktop Mac was mistaken for an iPad');
}

/* 3. already on the home screen: never asked again, on either platform */
{
  for (const [what, d] of [
    ['iPhone, Safari flag', { ua: IPHONE, standalone: true }],
    ['Android, standalone', { ua: ANDROID, displayMode: 'standalone' }],
    ['fullscreen', { ua: ANDROID, displayMode: 'fullscreen' }],
  ] as [string, Fake][]) {
    pretend(d);
    checked += 2;
    if (!isInstalled()) fails.push(`${what}: not seen as installed`);
    if (installKind() !== 'installed') fails.push(`${what}: offered ${installKind()} while already installed`);
  }
}

/* 4. NOBODY IS TURNED AWAY.
      This used to assert the opposite: Android before Chrome had spoken, and
      every desktop, were offered nothing at all. That was the policy, and the
      policy was wrong — it covered Firefox, Samsung Internet, Opera and Brave,
      all of which have "add to home screen" in their own menu, and told them to
      go and open the game somewhere else. Every browser now gets a route. */
{
  for (const [what, ua] of [
    ['Android before Chrome has spoken', ANDROID],
    ['Firefox on Android', FIREFOX_ANDROID],
    ['Samsung Internet', SAMSUNG],
    ['Opera on Android', OPERA_ANDROID],
    ['a desktop', DESKTOP],
    ['Firefox on a desktop', FIREFOX_DESKTOP],
  ] as [string, string][]) {
    pretend({ ua });
    checked++;
    const k = installKind();
    if (k === 'installed') fails.push(`${what}: told it is already installed when it is not`);
    if (k !== 'prompt' && k !== 'ios' && k !== 'manual') {
      fails.push(`${what}: offered "${k}", which is not a route anywhere`);
    }
  }
}

/* 5. AND THE ROUTE IS HIS BROWSER'S, NOT SOMEBODY ELSE'S.
      "Open the menu" is a different menu in each of these. Handing a Samsung
      Internet user Chrome's steps is the same failure as handing him nothing,
      it just takes him longer to find out. */
{
  const cases: Array<[string, string, RegExp, boolean]> = [
    // what, user agent, something only that browser's route would say, blocked?
    ['Samsung Internet', SAMSUNG, /Samsung/, false],
    ['Firefox on Android', FIREFOX_ANDROID, /פיירפוקס/, false],
    ['Opera on Android', OPERA_ANDROID, /אופרה/, false],
    ['Edge on Android', EDGE_ANDROID, /אדג׳/, false],
    ['Firefox on a desktop', FIREFOX_DESKTOP, /פיירפוקס/, true],
    ['Safari on a Mac', MAC_SAFARI, /Dock/, false],
    ['Chrome on an iPhone', IPHONE_CHROME, /ספארי/, true],
  ];
  for (const [what, ua, wants, blocked] of cases) {
    pretend({ ua, touch: /iPhone/.test(ua) ? 5 : 0 });
    const g = installGuide(ua);
    const all = [g.browser, ...g.steps, g.blocked ?? ''].join(' ');
    checked += 3;
    if (!g.steps.length) fails.push(`${what}: no steps at all`);
    if (!wants.test(all)) fails.push(`${what}: the steps do not look like ${what}'s — "${all}"`);
    if (blocked && !g.blocked) fails.push(`${what} cannot install and is not told so, it will hunt for a menu that is not there`);
    if (!blocked && g.blocked) fails.push(`${what} is told it cannot install, and it can`);
    // ב swallows a definite ה in Hebrew, so the sheet strips one before it
    // prefixes the browser's name. A name that comes out as "בהדפדפן" is the
    // kind of error nobody catches in a diff and everybody catches on a phone.
    checked++;
    const label = 'ב' + g.browser.replace(/^ה/, '');
    if (label.startsWith('בה')) fails.push(`"${label}" is not Hebrew, ב and ה cannot both be there`);
  }
  console.log(`  ${cases.length} browsers, each given its own menu rather than somebody else's`);
}

/* 6. AN IPHONE THAT IS NOT SAFARI GETS THE TRUTH.
      Only Safari may add to the home screen on iOS. Chrome and Firefox there
      look the part and are not allowed to, so the drawn Safari steps would send
      somebody looking for a share button that does not do it. */
{
  pretend({ ua: IPHONE_CHROME, touch: 5 });
  checked += 2;
  if (!isIos()) fails.push('Chrome on an iPhone was not recognised as iOS');
  if (installKind() === 'ios') fails.push('Chrome on an iPhone was shown the Safari steps, which do not work there');
  pretend({ ua: IPHONE });
  checked++;
  if (installKind() !== 'ios') fails.push('Safari on an iPhone lost its drawn steps');
}

/* 7. asking to install with no event to work with says so rather than throwing */
{
  pretend({ ua: IPHONE });
  wireInstall();
  checked++;
  const r = await promptInstall();
  if (r !== 'unsupported') fails.push(`prompting on an iPhone returned ${r}`);
}

/* 8. the worker exists and does not cache, which is what keeps a daily build
      from serving yesterday's code forever */
{
  const fs = await import('node:fs');
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  checked += 3;
  if (!/addEventListener\(\s*['"]fetch['"]/.test(sw)) {
    fails.push('the worker has no fetch handler, so Chrome will not call the app installable');
  }
  if (/cache\.put|cache\.addAll|caches\.open/.test(sw)) {
    fails.push('the worker caches, which will serve stale builds');
  }
  if (!/caches\.delete/.test(sw)) fails.push('the worker never clears an older cache');
}

/* 9. the manifest says what a home screen icon needs */
{
  const fs = await import('node:fs');
  const m = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
  checked += 4;
  if (m.display !== 'standalone') fails.push(`display is ${m.display}, it will open in a tab`);
  if (!m.icons?.some((i: { sizes: string }) => i.sizes === '512x512')) fails.push('no 512 icon');
  if (!m.icons?.some((i: { purpose?: string }) => i.purpose === 'maskable')) {
    fails.push('no maskable icon, so Android will letterbox it');
  }
  if (!m.name || !m.short_name) fails.push('the manifest has no name to put under the icon');
}

/* 10. the offer is reachable BEFORE a career, which is the whole point.
      It first shipped only inside the meters bar, and that bar is drawn only on
      career screens, so a new arrival could not find it at all: he started in a
      browser tab and only met the option three screens in. The title screen is
      the landing page this game already has, so that is where it belongs. */
{
  const fs = await import('node:fs');
  const title = fs.readFileSync('src/ui/screens/Title.tsx', 'utf8');
  const app = fs.readFileSync('src/ui/App.tsx', 'utf8');
  checked += 4;
  if (!title.includes('title-install')) {
    fails.push('the title screen does not offer the install, so a new player cannot find it');
  }
  if (!title.includes('watchInstall')) {
    fails.push('the title screen never hears about the install event, so the offer can go stale');
  }
  if (!title.includes('isInstalled()')) {
    fails.push('the title screen would offer to install a game that already is');
  }
  // and the sheet has to actually render there, which is before the career boots.
  // Anchored on the TitleScreen tag itself: this used to slice the file at the
  // first mention of a phase, and the moment anything else in the App mentioned
  // one higher up, the slice stopped containing the title screen at all and this
  // failed with the install offer working perfectly well.
  const titleAt = app.indexOf('<TitleScreen');
  if (titleAt < 0) fails.push('the App never renders a TitleScreen at all');
  if (!/TitleScreen[\s\S]{0,400}InstallSheet/.test(app.slice(Math.max(0, titleAt)))) {
    fails.push('the sheet is not rendered alongside the title screen, so the button would do nothing there');
  }
}

/* 11. AND THE BAR OFFERS IT FROM THE FIRST PAINT.
       The button in the meters bar was keyed off a module variable the App
       sets in an effect after the first render, so the first hub after every
       load drew the bar without it, and it only appeared on the next tap.
       The offer must depend on whether the game is installed, nothing else. */
{
  const fs = await import('node:fs');
  const bits = fs.readFileSync('src/ui/components/bits.tsx', 'utf8');
  const offer = /const offerInstall = ([^;]+);/.exec(bits)?.[1] ?? '';
  checked += 2;
  if (!offer) fails.push('the meters bar no longer decides whether to offer the install at all');
  if (/installHandler/.test(offer)) fails.push('the install offer waits for the handler again, so the first hub after a load has no button');
}

console.log(`${checked} checks across iPhone, iPad, Android, and every browser we can name`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every browser gets a route onto the home screen, and it is its own');
process.exit(fails.length ? 1 : 0);
