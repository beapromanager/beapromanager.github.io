import { useEffect, useMemo, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import { ROUND_NAMES, PEN_CORNERS, hintFor, diveFor, myKickScores, theirKickSaved, shootoutStatus } from '../../game/euro.ts';
import type { PenCorner } from '../../game/euro.ts';
import { createRng, overall } from '../../engine/matchEngine.ts';
import { asClub } from '../../data/europeClubs.ts';
import type { Club } from '../../data/clubs.ts';
import { asset } from '../asset.ts';
import { outcomeImg } from '../momentArt.ts';
import { useAssetsReady } from '../assetReady.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { buzz, BUZZ_GOAL, BUZZ_SAVE, BUZZ_MISS } from '../haptics.ts';

/**
 * The shootout after a level tie, from inside it. Itzik's rule: when his man
 * kicks you stand behind the ball, when theirs kicks you stand in the goal.
 *
 * His kick is a clip made for this and approved frame by frame (7.10): from
 * behind the spot, scored or saved, the word and the buzz when it ends.
 * Their kick is three approved frames from inside the goal behind his keeper,
 * cut by the code, not by a model: the keeper set, the ball in the air with
 * the keeper in his dive (the frame shakes on the contact), then the ball in
 * the net or in his gloves. The frames show the ball going to the right, so
 * a kick to the left plays them mirrored. Every roll is seeded on the round,
 * so a reload mid-shootout replays the same kicks for the same choices.
 */
const CORNER_LABEL: Record<PenCorner, string> = { left: 'שמאל', center: 'מרכז', right: 'ימין' };
const TEND_KEEPER: Record<PenCorner, string> = { left: 'נוטה לצלול שמאלה', center: 'בדרך כלל נשאר במרכז', right: 'נוטה לצלול ימינה' };
const TEND_TAKER: Record<PenCorner, string> = { left: 'נוטה לבעוט שמאלה', center: 'בדרך כלל בועט למרכז', right: 'נוטה לבעוט ימינה' };
const EURO_CLIP = {
  goalBehind: asset('/moments/euro-penalty/goal-behind.mp4'),
  saveBehind: asset('/moments/euro-penalty/save-behind.mp4'),
};
const EURO_POSTER = asset('/moments/euro-penalty/poster.jpg');
/**
 * The keeper's frames: he is set, then he is in the air, then it is over.
 * Three ways it goes, and each has its own pair, so the picture never argues
 * with the words: he went the wrong way and it is in, he went the right way
 * and still could not reach it, he went the right way and held it.
 */
const EURO_KEEPER = {
  set: asset('/moments/euro-penalty/keeper-set.webp'),
  wrong: asset('/moments/euro-penalty/keeper-wrong.webp'),
  near: asset('/moments/euro-penalty/keeper-near.webp'),
  right: asset('/moments/euro-penalty/keeper-right.webp'),
  goal: asset('/moments/euro-penalty/keeper-goal.webp'),
  nearEnd: asset('/moments/euro-penalty/keeper-near-end.webp'),
  save: asset('/moments/euro-penalty/keeper-save.webp'),
};
const EURO_ON_THE_SPOT = asset('/moments/euro/penalty.webp');
/**
 * The card for their kick is the keeper's own set frame, not the night's
 * penalty-against picture: that one has a post and a crossbar right behind
 * him, so he reads as standing at the side of the goal instead of its middle,
 * and it has a referee in it against Itzik's rule of only the two men.
 */
const EURO_IN_GOAL = EURO_KEEPER.set;

/**
 * גביע המדינה's own penalty art (21.10): the cup must never show a single frame
 * of Europe's, so it gets its own full set of paths rather than reusing Europe's
 * with a colour swap. These do not exist yet (see cup_images_spec_2026-10-21.md);
 * `useAssetsReady` below only trusts them once a probe confirms the file is real.
 */
export const CUP_PENALTY_ART = {
  clip: {
    goalBehind: asset('/moments/cup-penalty/goal-behind.mp4'),
    saveBehind: asset('/moments/cup-penalty/save-behind.mp4'),
  },
  poster: asset('/moments/cup-penalty/poster.jpg'),
  keeper: {
    set: asset('/moments/cup-penalty/keeper-set.webp'),
    wrong: asset('/moments/cup-penalty/keeper-wrong.webp'),
    near: asset('/moments/cup-penalty/keeper-near.webp'),
    right: asset('/moments/cup-penalty/keeper-right.webp'),
    goal: asset('/moments/cup-penalty/keeper-goal.webp'),
    nearEnd: asset('/moments/cup-penalty/keeper-near-end.webp'),
    save: asset('/moments/cup-penalty/keeper-save.webp'),
  },
  onTheSpot: asset('/moments/cup/penalty.webp'),
};

/**
 * Until the cup's own penalty art is real, the shootout borrows the LEAGUE's own
 * penalty frames (never Europe's): the striker's own build-up for the on-the-spot
 * card, the keeper's own defensive build-up for the in-goal card, and the league's
 * own outcome stills in place of a clip or a keeper sequence it does not have the
 * frames for. No video plays in this mode (ה.1 of the 21.10 spec).
 */
export const CUP_PENALTY_FALLBACK = {
  onTheSpot: asset('/moments/penalty/buildup.webp'),
  inGoal: asset('/moments/def-penalty/buildup.webp'),
};

/** the keeper sequence on the clock: the set frame holds, the contact comes, the end frame lands (ms) */
export const KEEPER_BEATS = { contact: 1100, end: 2000 } as const;

type Kick = { side: 'me' | 'them'; name: string; scored: boolean; pick: PenCorner; dive: PenCorner };
type Stage =
  | { kind: 'intro' }
  | { kind: 'my-pick'; hint: PenCorner }
  | { kind: 'my-play'; kick: Kick; ended: boolean }
  | { kind: 'their-pick'; hint: PenCorner }
  | { kind: 'their-play'; kick: Kick; ended: boolean }
  | { kind: 'done' };

export function ShootoutScreen({ gs, onDone, comp = 'euro' }: { gs: G.GameState; onDone: (score: [number, number]) => void; /** which cup this shootout belongs to */ comp?: 'euro' | 'cup' }) {
  const cup = comp === 'cup';
  const sides = useMemo(() => cup ? G.cupPensSides(gs) : G.euroPensSides(gs), [gs, cup]);
  const round = cup ? (gs.cup?.round ?? 0) : (gs.euro?.round ?? 0);
  const rng = useRef(cup ? createRng(G.drawSeed(gs, 173_000 + (gs.cup?.round ?? 0))) : createRng(G.drawSeed(gs, 152_000 + (gs.euro?.round ?? 0))));
  const [kicks, setKicks] = useState<Kick[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  // the cup's own penalty art, probed once and only trusted once confirmed real; euro's is already there, no probe needed
  const cupArtReady = useAssetsReady(cup ? [CUP_PENALTY_ART.onTheSpot, CUP_PENALTY_ART.keeper.set] : []);
  const ready = !cup || (cupArtReady[CUP_PENALTY_ART.onTheSpot] && cupArtReady[CUP_PENALTY_ART.keeper.set]);
  // falling back for the cup means no clip and no keeper sequence either, just the league's own still frames (ה.1)
  const cupFallback = cup && !ready;
  const CLIP = cup ? CUP_PENALTY_ART.clip : EURO_CLIP;
  const POSTER = cup ? CUP_PENALTY_ART.poster : EURO_POSTER;
  const KEEPER = cup ? CUP_PENALTY_ART.keeper : EURO_KEEPER;
  const ON_THE_SPOT = cup ? (ready ? CUP_PENALTY_ART.onTheSpot : CUP_PENALTY_FALLBACK.onTheSpot) : EURO_ON_THE_SPOT;
  const IN_GOAL = cup ? (ready ? CUP_PENALTY_ART.keeper.set : CUP_PENALTY_FALLBACK.inGoal) : EURO_IN_GOAL;
  const me = G.club(gs);
  const opp = sides.opp;
  // cupPensSides already hands back a full Club; euroPensSides hands back a EuroClub, which needs asClub for the crest
  const oppClub: Club | undefined = opp ? (cup ? (opp as Club) : asClub(opp as never)) : undefined;
  const compLabel = cup ? 'גביע' : 'אירופה';
  const mine = kicks.filter(k => k.side === 'me').map(k => k.scored);
  const theirs = kicks.filter(k => k.side === 'them').map(k => k.scored);
  const status = shootoutStatus(mine, theirs);
  const gkq = sides.keeper ? overall(sides.keeper) : 55;
  const keeperName = sides.keeper?.name ?? 'השוער';
  const takerName = (side: 'me' | 'them', n: number) => side === 'me'
    ? (sides.takers[n % Math.max(1, sides.takers.length)]?.name ?? 'הבועט')
    : (sides.theirNames[n % Math.max(1, sides.theirNames.length)] ?? 'הבועט');

  /** the next kick, whoever's it is: the hint is drawn now, the keeper's step later */
  const nextKick = (after: Kick[]) => {
    const s = shootoutStatus(after.filter(k => k.side === 'me').map(k => k.scored), after.filter(k => k.side === 'them').map(k => k.scored));
    if (s.winner) { setStage({ kind: 'done' }); return; }
    const hint = hintFor(rng.current);
    setStage(s.next === 'me' ? { kind: 'my-pick', hint } : { kind: 'their-pick', hint });
  };

  const myPick = (pick: PenCorner, hint: PenCorner) => {
    const dive = diveFor(rng.current, hint);
    const scored = myKickScores(rng.current, pick, dive);
    const kick: Kick = { side: 'me', name: takerName('me', mine.length), scored, pick, dive };
    // no clip to end on in the fallback, so the result lands the moment the kick is decided
    if (cupFallback) buzz(scored ? BUZZ_GOAL : BUZZ_MISS);
    setStage({ kind: 'my-play', kick, ended: cupFallback });
  };
  const theirPick = (dive: PenCorner, hint: PenCorner) => {
    const aim = diveFor(rng.current, hint);          // where their man really sends it
    const saved = theirKickSaved(rng.current, dive, aim, gkq);
    const kick: Kick = { side: 'them', name: takerName('them', theirs.length), scored: !saved, pick: aim, dive };
    if (cupFallback) buzz(kick.scored ? BUZZ_MISS : BUZZ_SAVE);
    setStage({ kind: 'their-play', kick, ended: cupFallback });
  };
  const settle = (kick: Kick) => {
    const after = [...kicks, kick];
    setKicks(after);
    nextKick(after);
  };

  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      <div className="eu-board" data-lit="1" role="img" aria-label={`${me.short} ${status.score[0]}, ${opp?.short ?? ''} ${status.score[1]}`}>
        <div className="eu-board-top">
          <span>פנדלים · {compLabel} · {ROUND_NAMES[round]}</span>
          <span className="eu-ft">{status.winner ? 'הוכרע' : stage.kind === 'intro' ? '' : status.next === 'me' ? 'אנחנו בועטים' : 'הם בועטים'}</span>
        </div>
        <div className="eu-board-row">
          <div className="eu-team">
            <Crest club={me} size={38} />
            <span className="eu-name">{me.short}</span>
            <KickDots kicks={mine} />
          </div>
          <div className="eu-digits" aria-hidden="true">
            <i>{status.score[1]}</i>
            <b>:</b>
            <i>{status.score[0]}</i>
          </div>
          <div className="eu-team">
            {oppClub && <Crest club={oppClub} size={38} />}
            <span className="eu-name">{opp?.short ?? ''}</span>
            <KickDots kicks={theirs} />
          </div>
        </div>
      </div>

      {stage.kind === 'intro' && (
        <div className="tile stack" style={{ gap: 10, textAlign: 'center' }}>
          <b style={{ fontSize: 17 }}>שוויון אחרי המשחקים. הפנדלים יכריעו.</b>
          <p className="sub" style={{ margin: 0 }}>חמש בעיטות לכל צד, ואז בעיטה מול בעיטה עד שמישהו נופל. אנחנו בועטים ראשונים.</p>
          <button className="btn" onClick={() => nextKick([])}>לנקודה הלבנה <Icon name="chevron" size={17} /></button>
        </div>
      )}

      {stage.kind === 'my-pick' && (
        <PovCard img={ON_THE_SPOT} tone={cup ? 'cup' : 'euro'} kicker={`בעיטה ${mine.length + 1}`} title={`${takerName('me', mine.length)} מול השוער`}
          sub={`המודיעין: השוער ${TEND_KEEPER[stage.hint]}.`} ask="לאן בועטים?" onPick={c => myPick(c, stage.hint)} />
      )}

      {stage.kind === 'my-play' && (
        cupFallback ? (
          <FallbackOutcome
            img={asset(outcomeImg('penalty', 'night', `${stage.kick.scored ? 'goal' : 'save'}-${stage.kick.pick}`))}
            accent={stage.kick.scored ? 'var(--win)' : 'var(--loss)'}
            headline={stage.kick.scored ? 'גוווול!' : 'נעצר.'}
            sub={stage.kick.scored ? `${stage.kick.name} לא מפספס מ-11 מטר` : `השוער קרא את ${stage.kick.name}`}
            onContinue={() => settle(stage.kick)} />
        ) : (
          <div className="eu-pov">
            <video className="eu-clip" src={stage.kick.scored ? CLIP.goalBehind : CLIP.saveBehind}
              poster={POSTER} autoPlay muted playsInline preload="auto"
              onEnded={() => { buzz(stage.kick.scored ? BUZZ_GOAL : BUZZ_MISS); setStage({ ...stage, ended: true }); }} />
            {stage.ended && (
              <div className="eu-pov-word" style={{ color: stage.kick.scored ? 'var(--win)' : 'var(--loss)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: stage.kick.scored ? 42 : 32, lineHeight: 1 }}>{stage.kick.scored ? 'גוווול!' : 'נעצר.'}</div>
                <div className="sub" style={{ marginTop: 6 }}>{stage.kick.scored ? `${stage.kick.name} לא מפספס מ-11 מטר` : `השוער קרא את ${stage.kick.name}`}</div>
                <button className="btn" style={{ marginTop: 14 }} onClick={() => settle(stage.kick)}>המשך <Icon name="chevron" size={17} /></button>
              </div>
            )}
          </div>
        )
      )}

      {stage.kind === 'their-pick' && (
        <PovCard img={IN_GOAL} tone={cup ? 'cup' : 'euro'} kicker={`בעיטה ${theirs.length + 1}`} title={`${takerName('them', theirs.length)} על הנקודה`}
          sub={`המודיעין: ${takerName('them', theirs.length)} ${TEND_TAKER[stage.hint]}.`} ask={`לאן ${keeperName} קופץ?`} onPick={c => theirPick(c, stage.hint)} />
      )}

      {stage.kind === 'their-play' && (
        cupFallback ? (
          <FallbackOutcome
            img={asset(outcomeImg('def_penalty', 'night', `${stage.kick.scored ? 'goal' : 'save'}-${stage.kick.pick}`))}
            accent={stage.kick.scored ? 'var(--loss)' : 'var(--win)'}
            headline={stage.kick.scored ? 'ספגנו.' : 'עצר!'}
            sub={stage.kick.scored
              ? `${stage.kick.name} שלח ${stage.kick.pick === 'center' ? 'למרכז' : 'ל' + CORNER_LABEL[stage.kick.pick]}, ${keeperName} ${stage.kick.dive === stage.kick.pick ? 'הגיע ולא הספיק' : 'הלך לצד השני'}`
              : `${keeperName} ${stage.kick.dive === stage.kick.pick ? 'הלך לפינה הנכונה' : 'הלך לצד השני והספיק להחזיר יד'}. איזו הצלה`}
            onContinue={() => settle(stage.kick)} />
        ) : (
          <div className="eu-pov">
            <KeeperSequence keeper={KEEPER} scored={stage.kick.scored} reached={stage.kick.dive === stage.kick.pick} mirrored={stage.kick.pick === 'left'}
              onEnded={() => { buzz(stage.kick.scored ? BUZZ_MISS : BUZZ_SAVE); setStage({ ...stage, ended: true }); }} />
            {stage.ended && (
              <div className="eu-pov-word" style={{ color: stage.kick.scored ? 'var(--loss)' : 'var(--win)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: stage.kick.scored ? 32 : 42, lineHeight: 1 }}>{stage.kick.scored ? 'ספגנו.' : 'עצר!'}</div>
                <div className="sub" style={{ marginTop: 6 }}>
                  {stage.kick.scored
                    ? `${stage.kick.name} שלח ${stage.kick.pick === 'center' ? 'למרכז' : 'ל' + CORNER_LABEL[stage.kick.pick]}, ${keeperName} ${stage.kick.dive === stage.kick.pick ? 'הגיע ולא הספיק' : 'הלך לצד השני'}`
                    : `${keeperName} ${stage.kick.dive === stage.kick.pick ? 'הלך לפינה הנכונה' : 'הלך לצד השני והספיק להחזיר יד'}. איזו הצלה`}
                </div>
                <button className="btn" style={{ marginTop: 14 }} onClick={() => settle(stage.kick)}>המשך <Icon name="chevron" size={17} /></button>
              </div>
            )}
          </div>
        )
      )}

      {stage.kind === 'done' && (
        <div className="tile stack" style={{ gap: 10, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, color: status.winner === 'me' ? 'var(--win)' : 'var(--loss)' }}>
            {status.winner === 'me' ? 'עברנו!' : 'הודחנו.'}
          </div>
          <p className="sub" style={{ margin: 0 }}>
            {status.score[0]}:{status.score[1]} בפנדלים מול {opp?.name ?? ''}.
          </p>
          <button className="btn" onClick={() => onDone(status.score)}>
            המשך <Icon name="chevron" size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Their kick from inside the goal, three frames cut by the clock: the keeper
 * set (a slow push in), the contact (the ball in the air, the keeper already
 * in his dive, the frame shakes), and the end (the net or the gloves). Which
 * pair plays follows what the words say: a goal where he guessed the corner
 * right shows him stretched and just short, and then beaten on his own side,
 * never diving away from a ball he is said to have reached. The timers are
 * cleared if the screen leaves early, so nothing fires on a gone kick.
 * Reduced motion keeps the cuts and drops the push and the shake.
 */
function KeeperSequence({ keeper, scored, reached, mirrored, onEnded }: { keeper: typeof EURO_KEEPER; scored: boolean; reached: boolean; mirrored: boolean; onEnded: () => void }) {
  const [step, setStep] = useState<'set' | 'contact' | 'end'>('set');
  const ended = useRef(onEnded);
  ended.current = onEnded;
  useEffect(() => {
    const t1 = setTimeout(() => setStep('contact'), KEEPER_BEATS.contact);
    const t2 = setTimeout(() => { setStep('end'); ended.current(); }, KEEPER_BEATS.end);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  // all three frames are in the box from the first beat, so a cut never waits on a picture still loading
  const layers = [{ key: 'set', src: keeper.set }, { key: 'contact', src: !scored ? keeper.right : reached ? keeper.near : keeper.wrong }, { key: 'end', src: !scored ? keeper.save : reached ? keeper.nearEnd : keeper.goal }] as const;
  return (
    <div className="eu-seq" data-step={step} data-mirror={mirrored ? '1' : '0'} role="img"
      aria-label={!scored ? 'השוער עם הכדור בידיים' : reached ? 'השוער הגיע לפינה ולא הספיק, הכדור ברשת' : 'השוער הלך לצד השני, הכדור ברשת'}>
      {layers.map(l => <img key={l.key} className="eu-seq-frame" data-on={step === l.key ? '1' : '0'} src={l.src} alt="" draggable={false} />)}
      {step === 'end' && (
        <div className="moment-wash" style={{ background: scored
          ? 'linear-gradient(180deg, rgba(226,72,77,.10) 0%, rgba(226,72,77,.5) 100%)'
          : 'linear-gradient(180deg, rgba(46,160,90,.08) 0%, rgba(46,160,90,.44) 100%)' }} />
      )}
    </div>
  );
}

/** The five lamps under each crest: lit green for a goal, red for a miss, dark for a kick still to come. */
function KickDots({ kicks }: { kicks: boolean[] }) {
  const n = Math.max(5, kicks.length);
  return (
    <div className="eu-dots" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="eu-dot" data-k={i < kicks.length ? (kicks[i] ? 'goal' : 'miss') : 'wait'} />
      ))}
    </div>
  );
}

/**
 * The cup's fallback kick: when its own clip or keeper sequence is not ready yet, the
 * result lands as one still frame off the league's own art (never a video, never a
 * multi-frame sequence it has no pictures for), same as the outcome cards already used
 * elsewhere in a live match.
 */
function FallbackOutcome({ img, accent, headline, sub, onContinue }: { img: string; accent: string; headline: string; sub: string; onContinue: () => void }) {
  return (
    <div className="eu-pov">
      <div className="eu-still" style={{ backgroundImage: `url('${img}')` }}>
        <div className="moment-hero-fade" />
      </div>
      <div className="eu-pov-word" style={{ color: accent }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1 }}>{headline}</div>
        <div className="sub" style={{ marginTop: 6 }}>{sub}</div>
        <button className="btn" style={{ marginTop: 14 }} onClick={onContinue}>המשך <Icon name="chevron" size={17} /></button>
      </div>
    </div>
  );
}

/** The point of view card: the frame, the word, and the three corners. */
function PovCard({ img, kicker, title, sub, ask, onPick, tone = 'euro' }: {
  img: string; kicker: string; title: string; sub: string; ask: string; onPick: (c: PenCorner) => void;
  /** Europe's blue, or גביע המדינה's amber */
  tone?: 'euro' | 'cup';
}) {
  const badge = tone === 'cup'
    ? { background: 'rgba(217,138,61,.14)', borderColor: 'rgba(217,138,61,.38)', color: '#F6D3A1' }
    : { background: 'rgba(111,168,255,.14)', borderColor: 'rgba(111,168,255,.35)', color: '#CFE0FF' };
  return (
    <div className="eu-pov">
      <div className="eu-still" style={{ backgroundImage: `url('${img}')` }}>
        <div className="moment-hero-fade" />
        <div className="moment-hero-badge" style={{ background: badge.background, borderColor: badge.borderColor, color: badge.color }}>
          <span style={{ fontSize: 11.5, fontWeight: 800 }}>{kicker}</span>
        </div>
      </div>
      <div className="eu-pov-word">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.1, color: badge.color }}>{title}</div>
        <div className="sub" style={{ marginTop: 6 }}>{sub}</div>
        <div className="label-cap" style={{ marginTop: 14 }}>{ask}</div>
        {/* ltr on purpose: 'שמאל' must sit on screen left, matching the frame */}
        <div className="row" style={{ gap: 8, marginTop: 8, direction: 'ltr' }}>
          {PEN_CORNERS.map(c => (
            <button key={c} className="btn btn-sm" style={{ flex: 1 }} onClick={() => onPick(c)}>{CORNER_LABEL[c]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
