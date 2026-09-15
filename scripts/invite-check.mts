/**
 * Bringing a friend in, and not being able to fake it.
 *   node --experimental-strip-types scripts/invite-check.mts
 *
 * The defence here is economic before it is technical: nobody is paid for a
 * signup, only for a friend who has really played. These are the rules that
 * hold that up, and the ones a client genuinely can enforce.
 */
import {
  codeFor, makeThanks, verifyThanks, addClaim, emptyInvite, inviteLink, refFromUrl,
  GEMS_PER_FRIEND, GEMS_FOR_JOINING, FRIENDS_PER_SEASON, FRIENDS_LIFETIME, ROUNDS_TO_COUNT,
} from '../src/game/invite.ts';
import type { InviteState } from '../src/game/invite.ts';

const fails: string[] = [];
let checked = 0;

const ALICE = 'device-alice';
const BOB = 'device-bob';
const CAROL = 'device-carol';
const alice = codeFor(ALICE), bob = codeFor(BOB), carol = codeFor(CAROL);

/* 1. codes are stable, distinct, and readable */
{
  checked += 4;
  if (codeFor(ALICE) !== alice) fails.push('a code is not stable for the same device');
  if (alice === bob) fails.push('two devices produced the same code');
  if (!/^[23456789A-HJ-NP-Z]{6}$/.test(alice)) fails.push(`code ${alice} has characters people misread`);
  const many = new Set<string>();
  for (let i = 0; i < 20000; i++) many.add(codeFor('d' + i));
  // a handful of collisions in twenty thousand is fine, a flood is not
  if (many.size < 19900) fails.push(`${20000 - many.size} collisions in 20k codes`);
}

/* 2. the honest path pays */
{
  const t = makeThanks(BOB, alice, 7);
  const v = verifyThanks(t, alice, emptyInvite(), 1);
  checked += 2;
  if (!v.ok) fails.push(`a real friend was refused: ${!v.ok ? v.why : ''}`);
  else if (v.friend !== bob) fails.push('the wrong friend was credited');
}

/* 3. THE ATTACK: inviting yourself */
{
  const t = makeThanks(ALICE, alice, 9);   // same device, same code
  const v = verifyThanks(t, alice, emptyInvite(), 1);
  checked++;
  if (v.ok) fails.push('a manager was able to invite himself on his own device');
}

/* 4. the same friend cannot be counted twice */
{
  let st: InviteState = emptyInvite();
  const t = makeThanks(BOB, alice, 6);
  const first = verifyThanks(t, alice, st, 1);
  if (first.ok) st = addClaim(st, first.friend, 1);
  const again = verifyThanks(t, alice, st, 1);
  checked += 2;
  if (!first.ok) fails.push('the first claim failed');
  if (again.ok) fails.push('the same friend paid twice');
}

/* 5. a code addressed to somebody else is refused */
{
  const t = makeThanks(BOB, carol, 8);     // Bob was invited by Carol
  const v = verifyThanks(t, alice, emptyInvite(), 1);
  checked++;
  if (v.ok) fails.push('Alice was paid for a friend Carol invited');
}

/* 6. a friend who has not played is refused, and one round short is still short */
{
  checked += 3;
  for (const r of [0, 1, ROUNDS_TO_COUNT - 1]) {
    const v = verifyThanks(makeThanks(BOB, alice, r), alice, emptyInvite(), 1);
    if (v.ok) fails.push(`a friend with ${r} rounds was counted`);
  }
  const ok = verifyThanks(makeThanks(BOB, alice, ROUNDS_TO_COUNT), alice, emptyInvite(), 1);
  checked++;
  if (!ok.ok) fails.push(`exactly ${ROUNDS_TO_COUNT} rounds should count`);
}

/* 7. a tampered code is refused. Every single character edit must fail. */
{
  const good = makeThanks(BOB, alice, 7);
  const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let slipped = 0, tried = 0;
  for (let i = 0; i < good.length; i++) {
    if (good[i] === '-') continue;
    for (const ch of CHARS) {
      if (ch === good[i]) continue;
      const bad = good.slice(0, i) + ch + good.slice(i + 1);
      tried++;
      const v = verifyThanks(bad, alice, emptyInvite(), 1);
      // a one character edit may only pass if it happens to name a real friend
      // with enough rounds, which is what the checksum is there to stop
      if (v.ok) slipped++;
    }
  }
  checked++;
  if (slipped > 0) fails.push(`${slipped} of ${tried} single character edits were accepted`);
  else console.log(`  ${tried} single character edits, all refused`);
}

/* 8. nonsense is refused rather than crashing */
{
  const junk = ['', '   ', 'BP-', 'hello', 'BP-AAAAAA-BBBBBB-99ZZ', '<script>', 'BP-' + 'A'.repeat(200)];
  checked += junk.length;
  for (const j of junk) {
    const v = verifyThanks(j, alice, emptyInvite(), 1);
    if (v.ok) fails.push(`junk accepted: ${JSON.stringify(j.slice(0, 20))}`);
  }
}

/* 9. the season cap holds, and reopens next season */
{
  let st: InviteState = emptyInvite();
  for (let i = 0; i < FRIENDS_PER_SEASON; i++) {
    const f = codeFor('friend' + i);
    const v = verifyThanks(makeThanks('friend' + i, alice, 6), alice, st, 1);
    if (!v.ok) { fails.push(`friend ${i} refused before the cap: ${v.why}`); break; }
    st = addClaim(st, f, 1);
  }
  const overCap = verifyThanks(makeThanks('friend-extra', alice, 6), alice, st, 1);
  const nextSeason = verifyThanks(makeThanks('friend-extra', alice, 6), alice, st, 2);
  checked += 2;
  if (overCap.ok) fails.push(`the cap of ${FRIENDS_PER_SEASON} did not hold`);
  if (!nextSeason.ok) fails.push('the cap did not reopen next season');
}

/* 9b. the lifetime cap, which is the one that actually bounds the economy.
       Without it a manager farming every season out-earns an ordinary one by
       nine times, and no pack price can be fair to both. */
{
  let st: InviteState = emptyInvite();
  let season = 1, counted = 0;
  // invite as hard as the rules allow, across many seasons
  for (let i = 0; i < FRIENDS_LIFETIME + 20; i++) {
    const v = verifyThanks(makeThanks('lifer' + i, alice, 6), alice, st, season);
    if (v.ok) { st = addClaim(st, v.friend, season); counted++; }
    else if (v.why.includes('העונה')) { season++; i--; }   // season cap, roll on
    else break;                                            // lifetime cap, done
  }
  checked += 2;
  if (counted !== FRIENDS_LIFETIME) fails.push(`a career counted ${counted} friends, the cap is ${FRIENDS_LIFETIME}`);
  const past = verifyThanks(makeThanks('one-more', alice, 6), alice, st, season + 5);
  if (past.ok) fails.push('the lifetime cap did not hold, even seasons later');
  console.log(`  a whole career of inviting tops out at ${counted} friends, ${counted * GEMS_PER_FRIEND} gems`);
}

/* 9c. the sinks are priced against that ceiling, not against nothing */
{
  const { PACKS } = await import('../src/game/packs.ts');
  const pro = PACKS[PACKS.length - 1];
  const BASE_PER_SEASON = 3.7;      // measured, see scripts/gem-economy.mts
  const seasonsForOrdinary = pro.cost / BASE_PER_SEASON;
  const careerBonus = (FRIENDS_LIFETIME * GEMS_PER_FRIEND) / 8;
  const seasonsForInviter = pro.cost / (BASE_PER_SEASON + careerBonus);
  checked += 3;
  // the best pack has to be a real saving, or gems mean nothing
  if (seasonsForOrdinary < 3) fails.push(`the best pack is ${seasonsForOrdinary.toFixed(1)} seasons of saving, too cheap`);
  // and inviting must not turn into a different game
  if (seasonsForOrdinary / seasonsForInviter > 4) {
    fails.push(`an inviter gets the best pack ${(seasonsForOrdinary / seasonsForInviter).toFixed(1)}x faster, too far apart`);
  }

  /* The one that matters, and the one that was missing. A ratio can look
     healthy while the absolute number is not: at three gems a friend and a
     lifetime of fifteen the ratio read 2.6x and passed, but a whole career of
     inviting still handed over two and a half of the best pack. What a career
     of friends buys has to be counted directly. */
  const packsFromFriends = (FRIENDS_LIFETIME * GEMS_PER_FRIEND) / pro.cost;
  if (packsFromFriends > 1.5) {
    fails.push(`a career of invites buys ${packsFromFriends.toFixed(1)} of the best pack, it should be about one`);
  }
  console.log(`  the best pack: ${seasonsForOrdinary.toFixed(1)} seasons of saving, ${seasonsForInviter.toFixed(1)} for somebody who invites`);
  console.log(`  a whole career of friends buys ${packsFromFriends.toFixed(2)} of the best pack`);
}

/* 10. the link carries the ref, and reads back */
{
  const link = inviteLink(alice, 'https://x.dev/BE-A-PRO/');
  checked += 2;
  if (!link.includes(`ref=${alice}`)) fails.push('the link lost the ref code');
  if (refFromUrl(`?ref=${alice}`) !== alice) fails.push('the ref code did not read back off the url');
  checked += 2;
  if (refFromUrl('?x=1') !== null) fails.push('a ref was invented from a url without one');
  if (refFromUrl('?ref=BAD!!') !== null) fails.push('a malformed ref was accepted');
}

/* 11. the economics, which is the actual defence */
{
  // a gem is worth about one advert. Faking one has to cost far more than that.
  const SECONDS_PER_AD = 30;
  const SECONDS_PER_ROUND = 120;          // a round with its decisions and press
  const fakeCost = ROUNDS_TO_COUNT * SECONDS_PER_ROUND / GEMS_PER_FRIEND;
  checked++;
  if (fakeCost < SECONDS_PER_AD * 3) {
    fails.push(`faking a gem costs ${Math.round(fakeCost)}s against ${SECONDS_PER_AD}s for an advert, too close`);
  }
  console.log(`  faking one gem costs about ${Math.round(fakeCost)}s of real play, an advert costs ${SECONDS_PER_AD}s`);
}


/* ------------------------------------------------------- 12. the whole loop */
/* Alice invites Bob. Bob joins, plays, sends the code back, Alice is paid.
   Run against the real game state rather than the pieces, so the wiring counts
   too and not just the maths. */
{
  const G = await import('../src/game/state.ts');
  const invite = await import('../src/game/invite.ts');

  // Bob's install, arriving on Alice's link
  let bob = G.newGame(777);
  const gemsBefore = bob.gems;
  bob = G.acceptInvite(bob, alice);
  checked += 2;
  if (bob.gems !== gemsBefore + GEMS_FOR_JOINING) fails.push('the friend did not get his welcome gems');
  if (bob.invite.invitedBy !== alice) fails.push('the game forgot who invited him');

  // and it cannot be taken twice
  const twice = G.acceptInvite(bob, alice);
  checked++;
  if (twice.gems !== bob.gems) fails.push('the welcome bonus was paid twice');

  // nor can he claim to have invited himself
  let solo = G.newGame(778);
  const soloBefore = solo.gems;
  solo = G.acceptInvite(solo, invite.myCode());
  checked++;
  if (solo.gems !== soloBefore) fails.push('a manager paid himself a welcome bonus');

  // before he has played there is nothing to send
  checked++;
  if (G.thanksCode({ ...bob, season: 1, week: 2 } as never) !== null) {
    fails.push('a thank you code existed before the friend had played');
  }

  // after five rounds there is
  const played = { ...bob, season: 1, week: ROUNDS_TO_COUNT + 1 } as never;
  const token = G.thanksCode(played);
  checked += 2;
  if (!token) fails.push('no thank you code after enough rounds');
  else {
    // Alice reads it. Her device code is whatever this machine's is, so the
    // token is built for her rather than assumed
    const forAlice = makeThanks('device-bob', invite.myCode(), ROUNDS_TO_COUNT);
    let aliceGs = G.newGame(779);
    const r = G.redeemThanks(aliceGs, forAlice);
    if (!r.ok) fails.push(`Alice could not redeem a real friend: ${r.message}`);
    else if (r.gs.gems !== aliceGs.gems + GEMS_PER_FRIEND) fails.push('Alice was not paid the right gems');
    // and not a second time
    const again = G.redeemThanks(r.gs, forAlice);
    checked++;
    if (again.ok) fails.push('the same friend paid Alice twice through the real state');
  }
}

console.log(`\n${checked} checks`);
console.log(`a friend pays ${GEMS_PER_FRIEND} gems, joining pays ${GEMS_FOR_JOINING}, cap ${FRIENDS_PER_SEASON} a season`);
if (fails.length) console.log('\n  ' + fails.slice(0, 8).join('\n  '));
console.log(fails.length ? '\nFAIL' : '\nOK, a friend counts once, faking one costs more than it pays');
process.exit(fails.length ? 1 : 0);
