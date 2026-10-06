import { useMemo, useRef, useState } from 'react';
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
 * His kick is the paid penalty clips (the run-up, then the goal or the save),
 * mirrored when he sends it to the other side. Their kick holds on the frame
 * from inside the goal and the outcome is the wash and the word over it, until
 * the keeper's own clips land. Every roll is seeded on the round, so a reload
 * mid-shootout replays the same kicks for the same choices.
 */
const CORNER_LABEL: Record<PenCorner, string> = { left: 'שמאל', center: 'מרכז', right: 'ימין' };
const TEND_KEEPER: Record<PenCorner, string> = { left: 'נוטה לצלול שמאלה', center: 'בדרך כלל נשאר במרכז', right: 'נוטה לצלול ימינה' };
const TEND_TAKER: Record<PenCorner, string> = { left: 'נוטה לבעוט שמאלה', center: 'בדרך כלל בועט למרכז', right: 'נוטה לבעוט ימינה' };
const RUNUP = asset('/moments/penalty/buildup.mp4');
const GOAL = asset('/moments/penalty/goal.mp4');
const SAVE = asset('/moments/penalty/save.mp4');
const POSTER = asset('/moments/penalty/poster.jpg');
const IN_GOAL = asset('/moments/def-penalty/buildup.webp');

type Kick = { side: 'me' | 'them'; name: string; scored: boolean; pick: PenCorner; dive: PenCorner };
type Stage =
  | { kind: 'intro' }
  | { kind: 'my-pick'; hint: PenCorner }
  | { kind: 'my-play'; kick: Kick; clip: 'runup' | 'result' }
  | { kind: 'their-pick'; hint: PenCorner }
  | { kind: 'their-play'; kick: Kick }
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
    setStage({ kind: 'my-play', kick, clip: 'runup' });
  };
  const theirPick = (dive: PenCorner, hint: PenCorner) => {
    const aim = diveFor(rng.current, hint);          // where their man really sends it
    const saved = theirKickSaved(rng.current, dive, aim, gkq);
    const kick: Kick = { side: 'them', name: takerName('them', theirs.length), scored: !saved, pick: aim, dive };
    buzz(saved ? BUZZ_SAVE : BUZZ_MISS);
    setStage({ kind: 'their-play', kick });
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
        <PovCard img={POSTER} kicker={`בעיטה ${mine.length + 1}`} title={`${takerName('me', mine.length)} מול השוער`}
          sub={`המודיעין: השוער ${TEND_KEEPER[stage.hint]}.`} ask="לאן בועטים?" onPick={c => myPick(c, stage.hint)} />
      )}

      {stage.kind === 'my-play' && (
        <div className="eu-pov">
          <video key={stage.clip} className="eu-clip" src={stage.clip === 'runup' ? RUNUP : stage.kick.scored ? GOAL : SAVE}
            poster={POSTER} autoPlay muted playsInline preload="auto"
            style={{ transform: stage.kick.pick === 'left' ? 'scaleX(-1)' : undefined }}
            onEnded={() => {
              if (stage.clip === 'runup') setStage({ ...stage, clip: 'result' });
            }}
            onPlay={() => { if (stage.clip === 'result') buzz(stage.kick.scored ? BUZZ_GOAL : BUZZ_MISS); }} />
          {stage.clip === 'result' && (
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
          sub={`המודיעין: ${takerName('them', theirs.length)} ${TEND_TAKER[stage.hint]}.`} ask={`לאן ${sides.keeper?.name ?? 'השוער'} קופץ?`} onPick={c => theirPick(c, stage.hint)} />
      )}

      {stage.kind === 'their-play' && (
        <div className="eu-pov">
          <div className="eu-still" style={{ backgroundImage: `url('${IN_GOAL}')` }}>
            <div className="moment-wash" style={{ background: stage.kick.scored
              ? 'linear-gradient(180deg, rgba(226,72,77,.12) 0%, rgba(226,72,77,.55) 100%)'
              : 'linear-gradient(180deg, rgba(46,160,90,.10) 0%, rgba(46,160,90,.48) 100%)' }} />
          </div>
          <div className="eu-pov-word" style={{ color: stage.kick.scored ? 'var(--loss)' : 'var(--win)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: stage.kick.scored ? 32 : 42, lineHeight: 1 }}>{stage.kick.scored ? 'ספגנו.' : 'עצר!'}</div>
            <div className="sub" style={{ marginTop: 6 }}>
              {stage.kick.scored
                ? `${stage.kick.name} שלח ${CORNER_LABEL[stage.kick.pick] === 'מרכז' ? 'למרכז' : 'ל' + CORNER_LABEL[stage.kick.pick]}, ${sides.keeper?.name ?? 'השוער'} ${stage.kick.dive === stage.kick.pick ? 'הגיע ולא הספיק' : 'הלך לצד השני'}`
                : `${sides.keeper?.name ?? 'השוער'} ${stage.kick.dive === stage.kick.pick ? 'הלך לפינה הנכונה' : 'הלך לצד השני והספיק להחזיר יד'}. איזו הצלה`}
            </div>
            <button className="btn" style={{ marginTop: 14 }} onClick={() => settle(stage.kick)}>המשך <Icon name="chevron" size={17} /></button>
          </div>
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
