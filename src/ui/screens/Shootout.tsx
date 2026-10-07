import { useEffect, useMemo, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import { ROUND_NAMES, PEN_CORNERS, hintFor, diveFor, myKickScores, theirKickSaved, shootoutStatus } from '../../game/euro.ts';
import type { PenCorner } from '../../game/euro.ts';
import { createRng, overall } from '../../engine/matchEngine.ts';
import { asClub } from '../../data/europeClubs.ts';
import { asset } from '../asset.ts';
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
const CLIP = {
  goalBehind: asset('/moments/euro-penalty/goal-behind.mp4'),
  saveBehind: asset('/moments/euro-penalty/save-behind.mp4'),
};
const POSTER = asset('/moments/euro-penalty/poster.jpg');
/** the keeper's three frames: set, in the air (the wrong way or the right way), and how it ended */
const KEEPER = {
  set: asset('/moments/euro-penalty/keeper-set.webp'),
  wrong: asset('/moments/euro-penalty/keeper-wrong.webp'),
  right: asset('/moments/euro-penalty/keeper-right.webp'),
  goal: asset('/moments/euro-penalty/keeper-goal.webp'),
  save: asset('/moments/euro-penalty/keeper-save.webp'),
};
const ON_THE_SPOT = asset('/moments/euro/penalty.webp');
const IN_GOAL = asset('/moments/euro/def-penalty.webp');
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

export function ShootoutScreen({ gs, onDone }: { gs: G.GameState; onDone: (score: [number, number]) => void }) {
  const sides = useMemo(() => G.euroPensSides(gs), [gs]);
  const rng = useRef(createRng(G.drawSeed(gs, 150_020 + (gs.euro?.round ?? 0))));
  const [kicks, setKicks] = useState<Kick[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const me = G.club(gs);
  const opp = sides.opp;
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
    setStage({ kind: 'my-play', kick, ended: false });
  };
  const theirPick = (dive: PenCorner, hint: PenCorner) => {
    const aim = diveFor(rng.current, hint);          // where their man really sends it
    const saved = theirKickSaved(rng.current, dive, aim, gkq);
    const kick: Kick = { side: 'them', name: takerName('them', theirs.length), scored: !saved, pick: aim, dive };
    setStage({ kind: 'their-play', kick, ended: false });
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
          <span>פנדלים · {ROUND_NAMES[gs.euro?.round ?? 0]}</span>
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
            {opp && <Crest club={asClub(opp)} size={38} />}
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
        <PovCard img={ON_THE_SPOT} kicker={`בעיטה ${mine.length + 1}`} title={`${takerName('me', mine.length)} מול השוער`}
          sub={`המודיעין: השוער ${TEND_KEEPER[stage.hint]}.`} ask="לאן בועטים?" onPick={c => myPick(c, stage.hint)} />
      )}

      {stage.kind === 'my-play' && (
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
      )}

      {stage.kind === 'their-pick' && (
        <PovCard img={IN_GOAL} kicker={`בעיטה ${theirs.length + 1}`} title={`${takerName('them', theirs.length)} על הנקודה`}
          sub={`המודיעין: ${takerName('them', theirs.length)} ${TEND_TAKER[stage.hint]}.`} ask={`לאן ${keeperName} קופץ?`} onPick={c => theirPick(c, stage.hint)} />
      )}

      {stage.kind === 'their-play' && (
        <div className="eu-pov">
          <KeeperSequence scored={stage.kick.scored} mirrored={stage.kick.pick === 'left'}
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
 * in his dive, the frame shakes), and the end (the net or the gloves). The
 * timers are cleared if the screen leaves early, so nothing fires on a gone
 * kick. Reduced motion keeps the cuts and drops the push and the shake.
 */
function KeeperSequence({ scored, mirrored, onEnded }: { scored: boolean; mirrored: boolean; onEnded: () => void }) {
  const [step, setStep] = useState<'set' | 'contact' | 'end'>('set');
  const ended = useRef(onEnded);
  ended.current = onEnded;
  useEffect(() => {
    const t1 = setTimeout(() => setStep('contact'), KEEPER_BEATS.contact);
    const t2 = setTimeout(() => { setStep('end'); ended.current(); }, KEEPER_BEATS.end);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  // all three frames are in the box from the first beat, so a cut never waits on a picture still loading
  const layers = [{ key: 'set', src: KEEPER.set }, { key: 'contact', src: scored ? KEEPER.wrong : KEEPER.right }, { key: 'end', src: scored ? KEEPER.goal : KEEPER.save }] as const;
  return (
    <div className="eu-seq" data-step={step} data-mirror={mirrored ? '1' : '0'} role="img"
      aria-label={scored ? 'הכדור ברשת, השוער על הדשא' : 'השוער עם הכדור בידיים'}>
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

/** The point of view card: the frame, the word, and the three corners. */
function PovCard({ img, kicker, title, sub, ask, onPick }: {
  img: string; kicker: string; title: string; sub: string; ask: string; onPick: (c: PenCorner) => void;
}) {
  return (
    <div className="eu-pov">
      <div className="eu-still" style={{ backgroundImage: `url('${img}')` }}>
        <div className="moment-hero-fade" />
        <div className="moment-hero-badge" style={{ background: 'rgba(111,168,255,.14)', borderColor: 'rgba(111,168,255,.35)', color: '#CFE0FF' }}>
          <span style={{ fontSize: 11.5, fontWeight: 800 }}>{kicker}</span>
        </div>
      </div>
      <div className="eu-pov-word">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.1, color: '#CFE0FF' }}>{title}</div>
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
