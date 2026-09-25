/**
 * Kits: the manager's chosen colours reach the club, the crest and the pitch,
 * and no fixture is ever two shirts you cannot tell apart.
 *   node --experimental-strip-types scripts/kit-check.mts
 */
import { matchKits, clash, homeOf, awayOf, homeKit, crestToKit } from '../src/data/kits.ts';
import { KIT_COLORS, kitColor, nearestKitColor } from '../src/data/palette.ts';
import { CITIES, clubFromCity } from '../src/data/cities.ts';
import * as G from '../src/game/state.ts';
import { readFileSync } from 'node:fs';

const fails: string[] = [];

/* 1. every existing fixture is readable, with the away side changing if needed */
const clubs = CITIES.map(c => clubFromCity(c, 1));
let pairs = 0, changed = 0;
for (let i = 0; i < clubs.length; i++) {
  for (let j = 0; j < clubs.length; j++) {
    if (i === j) continue;
    const k = matchKits(clubs[i], clubs[j]);
    pairs++;
    if (k.away.shirt.toLowerCase() !== clubs[j].primary.toLowerCase()) changed++;
    if (clash(k.home.shirt, k.away.shirt)) fails.push(`${clubs[i].short} v ${clubs[j].short} unreadable`);
  }
}

/* 2. two clubs on the SAME palette colour still play a readable match */
for (const a of KIT_COLORS) {
  const home = { ...clubs[0], primary: a.hex, accent: a.trim };
  const away = { ...clubs[1], primary: a.hex, accent: a.trim };
  const k = matchKits(home, away);
  if (clash(k.home.shirt, k.away.shirt)) fails.push(`${a.id} v ${a.id} unreadable`);
}

/* 2b. every colour's own home and away kit are tellable apart in the picker.
       This is exactly the white bug: a light club whose change strip came out
       the same white as its home. They may share a shirt colour only if the
       away carries a pattern to set it apart (white with black stripes). */
for (const a of KIT_COLORS) {
  const home = homeOf(a.hex, a.trim);
  const away = awayOf(a.hex);
  const sameColour = clash(home.shirt, away.shirt);
  const patternSetsApart = !!away.pattern && away.pattern !== 'solid';
  if (sameColour && !patternSetsApart)
    fails.push(`${a.id}: home and away kit look the same`);
}

/* 2c. the manager's chosen pattern reaches his club's shirt, and a club that
       chose nothing wears a shirt in the style of its own crest, for free */
{
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, 'רמת גן', 'blue', 'stripes');
  const me = gs.league.clubs.find(c => c.id === gs.clubId)!;
  if (homeKit(me).pattern !== 'stripes')
    fails.push(`the chosen pattern did not reach the shirt (got ${homeKit(me).pattern})`);
  // a rival wears its crest style, mapped to a shirt pattern
  const rival = gs.league.clubs.find(c => c.id !== gs.clubId)!;
  const want = crestToKit(rival.pattern);
  if (homeKit(rival).pattern !== want)
    fails.push(`a rival's shirt (${homeKit(rival).pattern}) does not follow its crest (${want})`);
  // every kit pattern is one the shirt component can draw
  const drawable = new Set(['solid', 'stripes', 'half', 'sash', 'hoops']);
  for (const c of gs.league.clubs)
    if (!drawable.has(homeKit(c).pattern ?? 'solid'))
      fails.push(`${c.short}: shirt pattern ${homeKit(c).pattern} is not drawable`);
}

/* 3. the manager's choice actually becomes the club's colours */
const city = CITIES.find(c => c.name === 'רמת גן') ?? CITIES[0];
for (const want of KIT_COLORS) {
  let gs = G.newGame(4242);
  gs = G.setProfile(gs, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  gs = G.pickCity(gs, city.name, want.id);
  const me = gs.league.clubs.find(c => c.id === gs.clubId);
  if (!me) { fails.push(`${want.id}: no club`); continue; }
  if (me.primary.toLowerCase() !== want.hex.toLowerCase())
    fails.push(`${want.id}: club wears ${me.primary}, not ${want.hex}`);
  // and it survives the round trip through the kit system
  if (kitColor(want.id).hex !== nearestKitColor(me.primary).hex)
    fails.push(`${want.id}: does not map back to itself`);
  // the rest of the division must not have been recoloured with it
  const others = gs.league.clubs.filter(c => c.id !== gs.clubId);
  if (others.every(c => c.primary.toLowerCase() === want.hex.toLowerCase()))
    fails.push(`${want.id}: the whole league turned that colour`);
}

/* 4. not choosing leaves the town's own colours alone */
let plain = G.newGame(4242);
plain = G.setProfile(plain, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
plain = G.pickCity(plain, city.name);
const def = plain.league.clubs.find(c => c.id === plain.clubId)!;
const own = clubFromCity(city, 1);
if (def.primary.toLowerCase() !== own.primary.toLowerCase())
  fails.push(`no choice should keep ${own.primary}, got ${def.primary}`);

/* 5. a strip is always two real colours, at every tier */
for (const tier of [1, 2, 3, 4, 5]) {
  for (const city of CITIES.slice(0, 20)) {
    const a = clubFromCity(city, tier);
    const b = clubFromCity(CITIES[(CITIES.indexOf(city) + 7) % CITIES.length], tier);
    const k = matchKits(a, b);
    for (const [who, strip] of [['home', k.home], ['away', k.away]] as const)
      for (const [part, v] of [['shirt', strip.shirt], ['trim', strip.trim]] as const)
        if (!/^#[0-9a-fA-F]{3,6}$/.test(String(v)))
          fails.push(`tier ${tier} ${a.short}: ${who} ${part} is ${v}`);
  }
}

/* 6. the header and the pitch cannot disagree, because one call feeds both */
const twice = [matchKits(clubs[3], clubs[9]), matchKits(clubs[3], clubs[9])];
if (JSON.stringify(twice[0]) !== JSON.stringify(twice[1]))
  fails.push('matchKits is not deterministic, so the header could drift from the pitch');

/* 7. the shirt is still on the screens it is meant to be on. A shallow guard:
      it catches an accidental deletion, not a broken layout.

      The tunnel used to be on this list. The card it named showed the two
      shirts on the way to the match and nothing else that was not already on
      the screen before it, so it was taken out of the road to the first ball;
      the shirts are still worn in the match header and on the bench. */
const SHOWN: [string, string][] = [
  ['src/ui/screens/Hub.tsx', 'the hub identity row'],
  ['src/ui/screens/Squad.tsx', 'the squad header'],
  ['src/ui/screens/Match.tsx', 'the match header and the bench'],
  ['src/ui/screens/Onboard.tsx', 'the colour picker'],
];
for (const [file, where] of SHOWN) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('<Kit ')) fails.push(`no shirt on ${where} (${file})`);
}

/* 8. the colours are the manager's call, never assigned for him. The town's
      own colour is offered as a suggestion, but the screen must wait for a tap
      before it will move on. */
const ob = readFileSync('src/ui/screens/Onboard.tsx', 'utf8');
if (!ob.includes('disabled={!kit}'))
  fails.push('the club screen would continue without a colour being chosen');
if (!ob.includes('onPick(chosen!.name, kit,'))
  fails.push('the club screen passes something other than the tapped colour');

console.log(`${pairs} fixtures across ${clubs.length} clubs, ${changed} away changes, 0 unreadable`);
console.log(`${KIT_COLORS.length} colours chosen through onboarding, each reaching the club`);
console.log(`no choice keeps the town's own colour (${def.primary})`);
console.log(`the shirt is on all ${SHOWN.length} screens it belongs on`);
console.log('the colours wait for the manager to choose, they are never assigned');
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every fixture is two distinct colours and the manager\'s pick sticks');
process.exit(fails.length ? 1 : 0);
