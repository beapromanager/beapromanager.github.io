/**
 * The coaching course (Itzik, 15.10): "a user with 45M still cannot buy the 3.5M badge".
 *   node --experimental-strip-types scripts/course-check.mts
 *
 * Held here: the badge the division demands comes first; after it a manager may take the next one early, and at the top the
 * international one is on offer to a manager who holds the pro badge (it was never offered to anyone before); a head start is
 * paid in cash only, a required badge the purse cannot pay may go on the club's account up to the owner's rope; taking the
 * course charges the fee once and gives what the way through earned (the subject chosen, the distinction); and the screen,
 * its words and its two clips are all there.
 */
import { existsSync, readFileSync } from 'node:fs';
import * as G from '../src/game/state.ts';
import { LEGEND_TOWN } from '../src/data/legends.ts';
import { LICENCES } from '../src/game/coach.ts';
import { COURSE_EXAM } from '../src/data/courseText.ts';

const fails: string[] = [];
let checked = 0;
const ok = (c: boolean, m: string) => { checked++; if (!c) fails.push(m); };

function career(licence: 'amateur' | 'certified' | 'pro' | 'international', tier: number, money: number): G.GameState {
  let s = G.newGame(808);
  s = G.setProfile(s, { name: 'בדיקה', nickname: '', type: 'hunter', age: 40 } as never);
  s = G.pickCity(s, LEGEND_TOWN);
  s = G.afterSigning(s, {});
  s = G.enterPreseason({ ...s, phase: 'preseason-market' } as never);
  while (s.phase === 'preseason-market') s = G.advancePreseason(s);
  s = { ...s, phase: 'preseason-market', preWeek: 1, friends: [], notices: [], pendingOutcome: null } as G.GameState;
  s = { ...s, coach: { ...s.coach, licence }, meters: { ...s.meters, money } };
  return { ...s, league: { ...s.league, clubs: s.league.clubs.map(c => c.id === s.clubId ? { ...c, tier } : c) } };
}

/* the one the division demands comes first, whatever else is on offer */
{
  const a = career('amateur', 3, 5_000_000);
  ok(G.courseRequired(a) && G.courseOnOffer(a)?.id === 'certified' && !G.courseIsOptional(a), 'ליגה א׳ with no badge does not demand the certified one');
  const b = career('certified', 5, 5_000_000);
  ok(G.courseRequired(b) && G.courseOnOffer(b)?.id === 'pro' && !G.courseIsOptional(b), 'ליגת העל with the certified badge does not demand the pro one');
}

/* the international badge: on offer to a pro manager in ליגת העל, to nobody else (the 45M user, 15.10) */
{
  const pro = career('pro', 5, 45_000_000);
  ok(!G.courseRequired(pro), 'the pro badge no longer opens ליגת העל');
  ok(G.courseOnOffer(pro)?.id === 'international' && G.courseIsOptional(pro), 'a pro manager in ליגת העל is not offered the international badge');
  ok(G.courseBlockedReason(pro) === null, 'a manager with 45M is told he cannot pay 3.5M');
  const done = career('international', 5, 45_000_000);
  ok(G.courseOnOffer(done) === null, 'there is a course above the last badge');
  const lower = career('pro', 4, 45_000_000);
  ok(G.courseOnOffer(lower) === null, 'a manager in the Leumit is offered a badge he does not need yet');
  ok(G.courseOnOffer(career('amateur', 1, 5_000_000))?.id !== 'international', 'the lowest division is offered the international badge');
}

/* a head start is paid in cash only; a required one may go on the club's account */
{
  const poor = career('pro', 5, 1_000_000);
  ok(G.courseBlockedReason(poor) !== null && !G.courseFunding(poor).ok, 'a head start was funded with money the club does not have');
  const req = career('certified', 5, 100_000);   // needs pro: 900K, has 100K
  const f = G.courseFunding(req);
  ok(f.fee === 900_000 && f.cash === 100_000 && f.onAccount === 800_000, `the shortfall is not put on the account: ${JSON.stringify(f)}`);
  ok(f.ok === (G.courseBlockedReason(req) === null), 'the funding and the blocked reason disagree');
  const ruined = career('certified', 5, -50_000_000);
  ok(!G.courseFunding(ruined).ok && G.courseBlockedReason(ruined) !== null, 'a club far in the red was allowed to take a course on credit');
}

/* taking it: the fee once, the badge, and what the way through earned */
{
  const base = career('pro', 5, 45_000_000);
  const plain = G.takeCourse(base, {});
  ok(plain.meters.money === 45_000_000 - 3_500_000, 'the fee is not charged once');
  ok(plain.coach.licence === 'international', 'the badge is not given');
  const cap = (c: G.GameState['coach']) => Object.values(c.attrs).reduce((s, v) => s + v, 0);
  const focus = G.takeCourse(base, { focus: 'mental' });
  const best = G.takeCourse(base, { focus: 'mental', distinction: true });
  ok(cap(best.coach) >= cap(focus.coach) && cap(focus.coach) >= cap(plain.coach), 'the way through the course adds nothing');
  const again = G.takeCourse(plain, {});
  ok(again.meters.money === plain.meters.money, 'the same badge was charged twice');
  const poor = career('pro', 5, 1_000);
  ok(G.takeCourse(poor, {}).coach.licence === 'pro', 'a club with no money was given the badge');
}

/* the screen, its words and its clips */
{
  const screen = readFileSync('src/ui/screens/Course.tsx', 'utf8');
  const pre = readFileSync('src/ui/screens/PreSeason.tsx', 'utf8');
  ok(/CourseScreen/.test(pre) && /setInCourse\(true\)/.test(pre), 'the summer board does not open the course screen');
  ok(/onFinish/.test(screen) && /distinction/.test(screen), 'the course screen does not hand back how he did');
  for (const id of ['certified', 'pro', 'international'] as const) {
    const qs = COURSE_EXAM[id] ?? [];
    ok(qs.length === 3 && qs.every(q => q.options.length === 3 && q.right >= 0 && q.right < 3), `${id}: the exam is not three questions of three answers`);
  }
  ok(new Set(Object.values(COURSE_EXAM).flatMap(qs => qs!.map(q => q.right))).size >= 2, 'the right answer is always in the same place');
  for (const f of ['lecture.mp4', 'lecture.webp', 'grad.mp4', 'grad.webp']) ok(existsSync(`public/course/${f}`), `public/course/${f} is missing`);
  ok(LICENCES.length === 4, 'the ladder of badges changed');
}

console.log(`${checked} checks`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, every badge can be taken, with a lecture, an exam and a graduation');
process.exit(fails.length ? 1 : 0);
