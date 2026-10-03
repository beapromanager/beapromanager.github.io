/**
 * Season kits.
 *   node --experimental-strip-types scripts/season-kit-check.mts
 *
 * A new shirt every summer is only worth having if four things hold, and every
 * one of them is easy to break without noticing:
 *
 *   the colour is the identity and NEVER moves, so the crest still matches;
 *   the shirt he was given actually reaches the pitch, not just the reveal;
 *   the first shirt is the one HE chose, not one generated over the top of it;
 *   every shirt is readable, against its own trim and against everyone else's.
 *
 * So this walks whole careers, one per palette colour, through wins, promotions
 * and relegations, and measures the wardrobe that comes out.
 */
import * as G from '../src/game/state.ts';
import { seasonKit, firstKit, reasonFor, seasonLabel } from '../src/data/seasonKit.ts';
import type { SeasonKit } from '../src/data/seasonKit.ts';
import { homeKit, matchKits, clash, lightness } from '../src/data/kits.ts';
import { KIT_COLORS, kitColor } from '../src/data/palette.ts';
import type { KitColorId } from '../src/data/palette.ts';
import type { KitPattern } from '../src/data/kits.ts';
import type { SeasonResult } from '../src/game/career.ts';
import { readFileSync, existsSync } from 'node:fs';

const fails: string[] = [];
let checked = 0;

const GOLD = '#e9b949';
const PATTERNS: KitPattern[] = ['solid', 'stripes', 'hoops', 'sash', 'half'];

/** A career, already signed, wearing the colours the manager picked himself. */
function career(colour: KitColorId, pattern: KitPattern, seed = 606, town = 'תל אביב'): G.GameState {
  let gs = G.newGame(seed);
  gs = G.setProfile(gs, { name: 'איציק', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, town, colour, pattern);
  return G.afterSigning(gs, {});
}

/** Roll a career on to the next summer with a given result behind it. */
function nextSummer(gs: G.GameState, result: SeasonResult): G.GameState {
  const next: G.GameState = {
    ...gs,
    season: gs.season + 1,
    lastReport: { ...(gs.lastReport ?? ({} as never)), season: gs.season, result } as never,
  };
  const opened = G.enterSeason(next);
  return opened.phase === 'kit' ? G.closeKitReveal(opened) : opened;
}

const mine = (gs: G.GameState) => gs.wardrobe.filter(k => k.clubId === gs.clubId);

/* 1. A CAREER'S WARDROBE. Every colour, seven seasons, the lot measured. */
{
  const ARC: SeasonResult[] = ['stayed', 'promoted', 'stayed', 'champion', 'relegated', 'stayed'];
  let wardrobes = 0, shirts = 0;

  for (const col of KIT_COLORS) {
    let gs = career(col.id, 'stripes');
    const identity = { primary: G.club(gs).primary, accent: G.club(gs).accent };

    for (const r of ARC) gs = nextSummer(gs, r);

    const worn = mine(gs);
    wardrobes++;
    shirts += worn.length;

    checked += 3;
    if (worn.length !== ARC.length + 1) {
      fails.push(`${col.name}: ${worn.length} shirts over ${ARC.length + 1} seasons`);
    }
    // THE identity rule. A season kit that moves primary changes the crest, the
    // pitch dots and the club's whole colour, which is not a new kit, it is a
    // different club.
    const now = G.club(gs);
    if (now.primary !== identity.primary || now.accent !== identity.accent) {
      fails.push(`${col.name}: the club's colour moved, ${identity.primary} to ${now.primary}`);
    }
    // and it must reach the pitch, not just the reveal screen
    const last = worn[worn.length - 1];
    const worn_ = homeKit(now);
    if (worn_.shirt !== last.shirt || worn_.trim !== last.trim || worn_.pattern !== last.pattern) {
      fails.push(`${col.name}: unveiled ${last.shirt}/${last.pattern} but takes the pitch in ${worn_.shirt}/${worn_.pattern}`);
    }

    for (let i = 0; i < worn.length; i++) {
      const k = worn[i];
      checked += 2;
      // readable against its own trim, or the shirt has no pattern to see
      if (clash(k.shirt, k.trim)) {
        fails.push(`${col.name} ${seasonLabel(k.season)}: ${k.pattern} in ${k.trim} on ${k.shirt} cannot be seen`);
      }
      // a "new kit" identical to last year's is the thing that makes these cheap
      const prev = worn[i - 1];
      if (prev && prev.shirt === k.shirt && prev.pattern === k.pattern) {
        fails.push(`${col.name} ${seasonLabel(k.season)}: identical to last season's shirt`);
      }
      // and it is still recognisably this club: never a different hue
      if (k.reason !== 'first' && hueGap(k.shirt, identity.primary) > 26) {
        fails.push(`${col.name} ${seasonLabel(k.season)}: ${k.shirt} is a different colour from ${identity.primary}`);
      }
    }
  }
  console.log(`  ${wardrobes} careers dressed, ${shirts} shirts, colour never moved once`);
}

/* 2. THE FIRST SHIRT IS HIS.
      He picks a colour and a pattern on the way in. If the season kit generates
      over the top of that, his choice is quietly thrown away two screens after
      he made it — and he would never know it had been, because a plausible
      shirt is still on the pitch. */
{
  let kept = 0;
  for (const col of KIT_COLORS) {
    for (const pat of PATTERNS) {
      const gs = career(col.id, pat);
      const c = G.club(gs);
      const k = homeKit(c);
      checked += 3;
      if (k.shirt !== kitColor(col.id).hex) fails.push(`picked ${col.name}, opened in ${k.shirt}`);
      if (k.trim !== kitColor(col.id).trim) fails.push(`picked ${col.name}, trimmed in ${k.trim}`);
      if (k.pattern !== pat) fails.push(`picked ${pat}, opened in ${k.pattern}`);
      else kept++;
      // and nothing is unveiled at the first one; there is no shirt to hold it against
      checked++;
      if (gs.kitReveal) fails.push(`${col.name}/${pat}: a reveal at the very first season, with nothing to compare`);
      const first = mine(gs)[0];
      checked++;
      if (!first || first.reason !== 'first') fails.push(`${col.name}/${pat}: the first shirt was not recorded as his own`);
    }
  }
  console.log(`  ${kept} of ${KIT_COLORS.length * PATTERNS.length} chosen kits reached the pitch exactly as picked`);
}

/* 3. THE CHAMPION WEARS GOLD.
      The note under the shirt says gold on the chest. It said that once while
      the trim had silently fallen back to black because gold could not be seen
      on the shirt — the screen promising one thing and the pitch showing
      another. So this asserts the metal, not merely "a trim was set". */
{
  let golden = 0;
  for (const col of KIT_COLORS) {
    let gs = career(col.id, 'solid');
    gs = nextSummer(gs, 'champion');
    const k = mine(gs).at(-1)!;
    checked += 3;
    if (k.reason !== 'champion') fails.push(`${col.name}: a title season produced a ${k.reason} kit`);
    if (k.trim.toLowerCase() !== GOLD) {
      fails.push(`${col.name}: champion trim is ${k.trim}, and the line under it promises gold`);
    } else golden++;
    if (clash(k.shirt, k.trim)) fails.push(`${col.name}: the gold cannot be seen on ${k.shirt}`);
  }
  console.log(`  ${golden} of ${KIT_COLORS.length} champions in real gold, readable on every shirt`);
}

/* 4. NOTHING IS UNREADABLE ON A PITCH.
      The home shirt now moves every summer while every opponent's does not, so
      a shade that was fine last year can collide with a rival this year. Every
      fixture of every season of every career, measured. */
{
  let fixtures = 0;
  for (const col of KIT_COLORS) {
    let gs = career(col.id, 'hoops');
    for (const r of ['stayed', 'champion', 'promoted', 'stayed'] as SeasonResult[]) {
      gs = nextSummer(gs, r);
      const clubs = gs.league.clubs;
      for (const h of clubs) for (const a of clubs) {
        if (h.id === a.id) continue;
        const { home, away } = matchKits(h, a);
        fixtures++;
        if (clash(home.shirt, away.shirt)) {
          fails.push(`${col.name} s${gs.season}: ${h.short} and ${a.short} take the pitch in ${home.shirt} and ${away.shirt}`);
        }
      }
    }
  }
  checked += fixtures;
  console.log(`  ${fixtures} fixtures across every colour and season, none of them unreadable`);
}

/* 5. OPENING THE SAME SUMMER TWICE CHANGES NOTHING.
      enterSeason is reached from the season roll, from a load, and from the
      sponsor screen behind it. Dressing twice would hand him a second shirt for
      one season and unveil it again on top of the first. */
{
  let gs = career('blue', 'sash');
  gs = nextSummer(gs, 'promoted');
  const before = mine(gs).length;
  const shirt = homeKit(G.club(gs)).shirt;

  let again = G.enterSeason(gs);
  checked += 3;
  if (again.kitReveal) fails.push('opening the same summer again unveiled the shirt a second time');
  if (mine(again).length !== before) fails.push(`opening twice gave ${mine(again).length} shirts for ${before} seasons`);
  if (homeKit(G.club(again)).shirt !== shirt) fails.push('opening twice restyled the shirt he was already wearing');
}

/* 6. A SACKED MANAGER DOES NOT GET HELD UP AGAINST HIS OLD CLUB'S SHIRT.
      The wardrobe follows the manager, so it spans more than one club. Last
      season's shirt on the reveal has to be THIS club's last shirt, or it is
      the colours of the people who let him go. */
{
  const gs = career('green', 'stripes');
  const stitched: G.GameState = {
    ...gs,
    season: 4,
    wardrobe: [
      { season: 1, clubId: 'somewhere-else', shirt: '#c0392b', trim: '#fff', pattern: 'solid',
        name: 'x', note: 'x', reason: 'first' },
      { season: 2, clubId: 'somewhere-else', shirt: '#a03024', trim: '#fff', pattern: 'sash',
        name: 'x', note: 'x', reason: 'stayed' },
    ] as SeasonKit[],
  };
  checked += 2;
  if (G.previousKit(stitched) !== null) {
    fails.push('a new club held its first shirt up against the shirt of the club that sacked him');
  }
  // and arriving somewhere new opens in that club's own colours, untouched
  const was = homeKit(G.club(stitched));
  const arrived = G.enterSeason(stitched);
  const first = mine(arrived).at(-1);
  checked += 2;
  if (!first || first.reason !== 'first') {
    fails.push('a manager arriving at a new club was handed a season kit before wearing the club\'s own');
  }
  if (first && (first.shirt !== was.shirt || first.trim !== was.trim || first.pattern !== was.pattern)) {
    fails.push(`arriving at a new club restyled its shirt on day one: ${was.shirt}/${was.pattern} became ${first.shirt}/${first.pattern}`);
  }
}

/* 6b. EVERY SAVE THAT ALREADY EXISTS.
       Careers are already being played, and none of them has a wardrobe. The
       next season opening must not treat that as a licence to restyle a club
       mid career: it records the shirt he is already in, unveils nothing, and
       the summer after that is the first real new kit. */
{
  const played = career('white', 'stripes');
  const old: G.GameState = {          // a save written before any of this existed
    ...played, season: 3,
    wardrobe: [],
    lastReport: { season: 2, result: 'promoted' } as never,
  };
  const was = homeKit(G.club(old));

  const opened = G.enterSeason(old);
  const kit = mine(opened).at(-1);
  checked += 4;
  if (opened.kitReveal) fails.push('an old save was shown a kit reveal with no previous shirt to compare');
  if (opened.phase === 'kit') fails.push('an old save opened on the reveal screen with nothing to reveal');
  if (!kit || kit.season !== 3) fails.push('an old save did not record the shirt it was already wearing');
  const now = homeKit(G.club(opened));
  if (now.shirt !== was.shirt || now.trim !== was.trim || now.pattern !== was.pattern) {
    fails.push(`an old save was restyled mid career: ${was.shirt}/${was.pattern} became ${now.shirt}/${now.pattern}`);
  }

  // and the very next summer he does get a real one, unveiled
  const after = { ...opened, season: 4, lastReport: { season: 3, result: 'champion' } as never };
  const unveiled = G.enterSeason(after);
  checked += 2;
  if (unveiled.phase !== 'kit' || !unveiled.kitReveal) {
    fails.push('the summer after an old save caught up, no kit was unveiled');
  }
  if (unveiled.kitReveal && unveiled.kitReveal.reason !== 'champion') {
    fails.push(`an old save's first real kit read as ${unveiled.kitReveal.reason}, not the title it just won`);
  }
  console.log(`  an existing save catches up in one summer, then is unveiled a ${unveiled.kitReveal?.reason} kit`);
}

/* 7. THE GENERATOR ITSELF: a long wardrobe never runs out of ideas. */
{
  const club = { ...G.club(career('purple', 'solid')) };
  let prev: SeasonKit | null = firstKit(club, 1);
  const seen = new Set<string>();
  for (let s = 2; s <= 30; s++) {
    const k = seasonKit(club, s, (['stayed', 'promoted', 'relegated', 'champion'] as const)[s % 4], prev);
    checked += 2;
    if (k.pattern === prev?.pattern) fails.push(`season ${s} repeated the ${k.pattern} of the year before`);
    if (!k.name.includes(seasonLabel(s))) fails.push(`season ${s} is named "${k.name}", without its own year`);
    seen.add(`${k.shirt}|${k.pattern}`);
    prev = k;
  }
  checked++;
  if (seen.size < 10) fails.push(`30 seasons produced only ${seen.size} distinct shirts`);
  console.log(`  a 30 season wardrobe: ${seen.size} distinct shirts, never two the same year on year`);
}

/* 8. THE REVEAL SCREEN SHIPS WHAT IT ASKS FOR.
      Two things that break silently and only in a browser: an image referenced
      but never put in public/, and a shirt-sizing rule written loosely enough to
      catch the icons as well. The second one really happened — a bare `svg`
      selector blew the 12px trophy on the champion badge up to 113px and pushed
      the button clean off a short phone. */
{
  const screen = readFileSync('src/ui/screens/KitReveal.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');

  for (const m of screen.matchAll(/asset\('\/([^']+)'\)/g)) {
    checked++;
    if (!existsSync(`public/${m[1]}`)) {
      fails.push(`the reveal shows /${m[1]}, which is not in public/ and will 404 for every player`);
    }
  }

  // the shirts are sized from the viewport height; that rule must reach the
  // shirt and nothing else in the figure
  for (const slot of ['kit-new', 'kit-old']) {
    checked += 2;
    const rule = new RegExp(`\\.${slot}\\s*>\\s*svg\\s*\\{[^}]*width:`).test(css);
    if (!rule) fails.push(`.${slot} has no "> svg" sizing rule, so the shirt does not scale with the screen`);
    if (new RegExp(`\\.${slot}\\s+svg\\s*\\{`).test(css)) {
      fails.push(`.${slot} sizes every descendant svg, which resizes the badge icons too`);
    }
  }

  // and the whole screen has to fit a short phone, so nothing in it may be a
  // fixed height that a 667px screen cannot afford
  checked++;
  if (!/\.kit-launch img\{[^}]*clamp\(/.test(css.replace(/\s*\n\s*/g, ''))) {
    fails.push('the launch band is a fixed height, so a short phone loses the button below the fold');
  }
}

/* 9. reasonFor reads the season honestly */
{
  const cases: [string | undefined, number, string][] = [
    [undefined, 1, 'first'], ['champion', 1, 'first'],
    ['champion', 2, 'champion'], ['promoted', 3, 'promoted'],
    ['relegated', 4, 'relegated'], ['stayed', 5, 'stayed'],
  ];
  for (const [result, season, want] of cases) {
    checked++;
    const got = reasonFor(result, season);
    if (got !== want) fails.push(`result ${result} in season ${season} read as ${got}, wanted ${want}`);
  }
}

/* ------------------------------------------------------------------ hue */

function rgb(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Degrees between two colours on the wheel; shade moves lightness, not hue. */
function hueGap(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b));
  // a near grey or near black shirt has no meaningful hue to compare
  if (chroma(a) < 24 || chroma(b) < 24) return 0;
  return Math.min(d, 360 - d);
}
function hue(h: string): number {
  const [r, g, b] = rgb(h).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (x * 60 + 360) % 360;
}
function chroma(h: string): number {
  const c = rgb(h);
  return Math.max(...c) - Math.min(...c);
}

/* THE CHAMPION'S PICTURE EXISTS, FOR EVERY STAGE THE SCREEN CAN ASK FOR.
   The biggest moment in the game, the ליגת העל title, celebrated against a black
   screen for a week: championImg asked for champion-tier2.webp, the file was never
   made, and onerror quietly hid the picture. Found by the player-voice audit on
   2.10, the file (Itzik chose the squad-hug frame) landed on 3.10. The screen's
   own mapping is read here, so a new band in the code demands its file. */
{
  const screenSrc = readFileSync('src/ui/screens/SeasonEnd.tsx', 'utf8');
  const bands = [...screenSrc.matchAll(/'(tier\d)'/g)].map(m => m[1]);
  checked += 2;
  if (new Set(bands).size < 2) fails.push(`championImg maps ${new Set(bands).size} bands, the top flight no longer has its own picture`);
  for (const band of new Set(bands)) {
    checked++;
    const p = `public/celebration/champion-${band}.webp`;
    if (band !== 'tier3' && !existsSync(p)) fails.push(`the screen can ask for ${p} and it does not exist, the title celebrates a black screen`);
  }
  // tier3 is Europe's slot, allowed to be missing until Europe exists; say so out loud
  if (!existsSync('public/celebration/champion-tier3.webp')) console.log('  champion art: tier1 and tier2 exist; tier3 (Europe) is still to come');
}

console.log(`\n${checked} checks`);
console.log(`${KIT_COLORS.length} colours dressed for a career each, ${PATTERNS.length} patterns in rotation`);
if (fails.length) console.log('\n  ' + fails.slice(0, 10).join('\n  '));
console.log(fails.length
  ? '\nFAIL'
  : '\nOK, a new shirt every summer that tells you what he did, and never a new club');
process.exit(fails.length ? 1 : 0);

void lightness;
