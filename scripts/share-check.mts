/**
 * Sending the big moments to a friend, and the way into the game (Itzik, 11.10).
 *
 * The growth numbers said two things: every post gave a spike that was gone in two days, and a third of the people
 * who saw the title screen never pressed the button. So the moments a manager is proudest of carry a share button,
 * and a manager who already has a career is not made to sit through the cold open again.
 *
 * Run: node --experimental-strip-types scripts/share-check.mts
 */
import { readFileSync, existsSync } from 'node:fs';
import { shareKindFor, shareText, shareLink } from '../src/game/share.ts';
import type { ShareKind } from '../src/game/share.ts';
import { refFromUrl } from '../src/game/invite.ts';

const fails: string[] = [];
let checked = 0;

/* node has no localStorage: the invite code needs a device id */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
(globalThis as any).location = { origin: 'https://beapromanager.github.io', pathname: '/', search: '' };

/* 1. WHICH MOMENT: the cup first, then the national title, a title, a promotion, and nothing for a quiet season */
{
  checked += 9;
  const base = { champion: false, promoted: false, atTop: false, euroWon: false };
  if (shareKindFor(base) !== null) fails.push('a quiet season is worth sending');
  if (shareKindFor({ ...base, promoted: true }) !== 'promoted') fails.push('a promotion is not worth sending');
  if (shareKindFor({ ...base, champion: true, promoted: true }) !== 'champion') fails.push('a title below the top is not a title');
  if (shareKindFor({ ...base, champion: true, atTop: true }) !== 'top') fails.push('the national title is not the national title');
  if (shareKindFor({ ...base, champion: true, atTop: true, euroWon: true }) !== 'euro') fails.push('the cup does not come first');
  if (shareKindFor({ ...base, euroWon: true }) !== 'euro') fails.push('a cup on its own is not worth sending');
  if (shareKindFor({ ...base, atTop: true }) !== null) fails.push('standing in the top flight is worth sending without a title');
  if (shareKindFor({ ...base, champion: false, atTop: true, promoted: false }) !== null) fails.push('a mid table top flight season is worth sending');
  if (shareKindFor({ champion: true, promoted: false, atTop: false, euroWon: false }) !== 'champion') fails.push('a champion who is not promoted (blocked) is not a champion');
}

/* 2. THE WORDS: every kind names the club and the game, says nothing unfinished, and is short enough to send */
{
  const facts = { club: 'מ.ס ראש העין', league: 'ליגה ג׳', nextLeague: 'ליגה ב׳', season: 4 };
  const kinds: ShareKind[] = ['top', 'champion', 'promoted', 'euro'];
  checked += kinds.length * 5 + 2;
  for (const k of kinds) {
    const t = shareText(k, facts);
    if (!t.includes('BE A PRO')) fails.push(`${k}: the words do not name the game`);
    if (!t.includes(facts.club)) fails.push(`${k}: the words do not name the club`);
    if (/undefined|NaN|\{|\}/.test(t)) fails.push(`${k}: the words have something unfinished in them: ${t}`);
    if (t.length > 160) fails.push(`${k}: the words are ${t.length} characters, too long for a message`);
    if (/https?:/.test(t)) fails.push(`${k}: the link is in the words, and the share sheet adds it a second time`);
  }
  if (!shareText('champion', facts).includes('ב' + facts.league) || !shareText('champion', facts).includes('4')) fails.push('the title does not say which league and which season');
  if (!shareText('promoted', facts).includes('ל' + facts.nextLeague)) fails.push('the promotion does not say which league it is to');
}

/* 3. THE LINK carries the manager's own invite code, so a friend who plays pays him the invite gems */
{
  checked += 4;
  const link = shareLink();
  if (!/^https:\/\/beapromanager\.github\.io\/\?ref=[23456789A-HJ-NP-Z]{6}$/.test(link)) fails.push(`the link is not the game with a code on it: ${link}`);
  if (refFromUrl(new URL(link).search) === null) fails.push('the game cannot read the code back off the link it sends');
  if (shareLink() !== link) fails.push('the same device gets a different link every time');
  store.clear(); (globalThis as any).localStorage.setItem('beapro.device', 'someone-else');
  if (shareLink() === link) fails.push('two devices share one link, so the invite gems would go to the wrong manager');
}

/* 4. THE SCREENS: the button is where the moment is, and the way in no longer repeats the film */
{
  checked += 12;
  const end = readFileSync('src/ui/screens/SeasonEnd.tsx', 'utf8');
  const btn = readFileSync('src/ui/components/ShareMoment.tsx', 'utf8');
  const app = readFileSync('src/ui/App.tsx', 'utf8');
  const title = readFileSync('src/ui/screens/Title.tsx', 'utf8');
  const css = readFileSync('src/ui/tokens.css', 'utf8');
  const icon = readFileSync('src/ui/components/Icon.tsx', 'utf8');

  if (!end.includes("shareKindFor({ champion, promoted, atTop: champion && c.tier >= TOP_TIER, euroWon: euroVerdict?.outcome === 'won', cupWon: cupVerdict?.outcome === 'won' })")) fails.push('the season end does not ask which moment this was');
  if (!end.includes('const shareKind = blocked ? null :')) fails.push('a promotion the ground blocked is sent to a friend as a promotion');
  if (!end.includes('<ShareMoment text={share.text} link={share.link} onShared={() => shareMark(\'share_tap\')} />')) fails.push('the season end card has no share button that reports');
  if (!end.includes('<ShareMoment glass text={share.text} link={share.link} onShared={() => shareMark(\'share_tap\')} />')) fails.push('the celebration has no share button that reports');
  if (!end.includes('share={share}')) fails.push('the celebration is not handed the words to send');
  if (!/<Portal><div onClick=\{finish\}/.test(end) || !end.includes('</div></Portal>')) fails.push('the celebration is not on the viewport, so its title and the way on fall below the fold');
  if (!btn.includes('e.stopPropagation()')) fails.push('tapping share inside the celebration also dismisses it');
  if (!btn.includes('navigator.share({ title:')) fails.push('the button does not open the phone share sheet');
  if (!btn.includes('https://wa.me/?text=')) fails.push('without a share sheet the button does nothing');
  if (!app.includes('useState(() => savedSummary() !== null)')) fails.push('a manager with a career still sits through the cold open every launch (Itzik, 12.10: the film is for the first visit)');
  if (!css.includes('.frame:has(.title-tunnel){height:100dvh; overflow:hidden;')) fails.push('the title screen is not pinned to the viewport, so an iPhone can scroll it');
  if (!css.includes('html.title-locked, html.title-locked body{position:fixed;') || !title.includes("root.classList.add('title-locked')") || !title.includes("el?.addEventListener('touchmove', stop, { passive: false })")) fails.push('the page is not nailed down while the title is up, so iOS Safari still bounces it');
  if (!title.includes("root.classList.remove('title-locked')")) fails.push('the page stays nailed down after the title screen is gone, so the game cannot scroll');
  if (!title.includes('הקהל מחכה.') || !title.includes('צא למגרש עכשיו.')) fails.push('the title screen lost Itzik\'s line (12.10)');
  if (!title.includes('ITZIK UZIEL') || !title.includes('ISRU-E') || !title.includes('כל הזכויות שמורות')) fails.push('the title screen lost the credit and the rights line');
  if (title.includes('חינם, בלי הרשמה')) fails.push('the "free" line Itzik asked to drop is back');
  if (!title.includes("asset('/title/tunnel.webp')") || !existsSync('public/title/tunnel.webp')) fails.push('the tunnel photograph is missing');
  if (!title.includes("asset('/title/tunnel.mp4')") || !existsSync('public/title/tunnel.mp4')) fails.push('the living picture is missing');
  if (!/autoPlay muted loop playsInline/.test(title)) fails.push('the living picture would not autoplay on a phone (it must be muted, looping and inline)');
  if (!title.includes('prefers-reduced-motion: reduce')) fails.push('a person who asked for less motion still gets the loop');
  if (!title.includes("poster={asset('/title/tunnel.webp')}")) fails.push('the loop has no poster, so the first frame is black until it arrives');
  if (!css.includes('.share-glass{') || !icon.includes("case 'share':")) fails.push('the share pill or its icon is missing');
}

if (fails.length) {
  console.log(`FAIL (${fails.length} of ${checked})`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${checked} checks`);
console.log('OK, the moments a manager is proud of can be sent to a friend with his own invite link, and a returning manager goes straight to his career');
