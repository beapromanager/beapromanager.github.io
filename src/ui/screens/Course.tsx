import { useMemo, useState } from 'react';
import * as G from '../../game/state.ts';
import { formatMoney } from '../components/bits.tsx';
import { Icon } from '../components/Icon.tsx';
import { asset } from '../asset.ts';
import { COURSE_EXAM, COURSE_LINES as L } from '../../data/courseText.ts';

/**
 * The coaching course (Itzik, 15.10), no longer a button: a lecture with a clip, the subject you dig into, an exam of three
 * questions, and a graduation with a second clip. What he chooses and how he answers decides what the badge adds to the man.
 * Nothing is paid until the certificate is in his hand, so walking out at any point costs nothing.
 */

type Stage = 'intro' | 'exam' | 'grad';

export function CourseScreen({ gs, onCancel, onFinish }: {
  gs: G.GameState;
  onCancel: () => void;
  onFinish: (how: { focus: 'training' | 'mental'; distinction: boolean }) => void;
}) {
  const course = G.courseOnOffer(gs);
  const [stage, setStage] = useState<Stage>('intro');
  const [focus, setFocus] = useState<'training' | 'mental'>('training');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const exam = useMemo(() => (course ? COURSE_EXAM[course.id] ?? COURSE_EXAM.pro ?? [] : []), [course]);
  if (!course) return null;
  const distinction = right >= 2;
  const q = exam[qi];

  const answer = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    if (i === q.right) setRight(r => r + 1);
  };
  const next = () => {
    if (qi + 1 < exam.length) { setQi(qi + 1); setPicked(null); }
    else setStage('grad');
  };

  const clip = stage === 'grad' ? 'grad' : 'lecture';
  return (
    <div className="cr" data-stage={stage}>
      <video className="cr-vid" key={clip} src={asset(`/course/${clip}.mp4`)} poster={asset(`/course/${clip}.webp`)}
        autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
      <span className="cr-shade" aria-hidden="true" />
      <button className="cr-close" onClick={onCancel} aria-label="יציאה">{L.cancel}</button>

      <div className="cr-panel stack">
        {stage === 'intro' && (
          <>
            <span className="fx-kick">{L.introKick}</span>
            <h1 className="cr-title">{course.course}</h1>
            <p className="cr-lead">{L.introBody}</p>
            <div className="stack" style={{ gap: 9 }}>
              <button className="cr-focus" data-on={focus === 'training' ? '1' : '0'} onClick={() => setFocus('training')}>
                <b>{L.focusTraining}</b><span>{L.focusTrainingNote}</span>
              </button>
              <button className="cr-focus" data-on={focus === 'mental' ? '1' : '0'} onClick={() => setFocus('mental')}>
                <b>{L.focusMental}</b><span>{L.focusMentalNote}</span>
              </button>
            </div>
            <p className="hint" style={{ margin: 0 }}>עלות הקורס: {formatMoney(course.cost)}, משולמת רק עם קבלת התעודה.</p>
            <button className="btn" onClick={() => setStage('exam')}>למבחן <Icon name="chevron" size={17} /></button>
          </>
        )}

        {stage === 'exam' && q && (
          <>
            <span className="fx-kick">{L.examKick} · {qi + 1}/{exam.length}</span>
            <h1 className="cr-title" style={{ fontSize: 22 }}>{q.q}</h1>
            <div className="stack" style={{ gap: 9 }}>
              {q.options.map((o, i) => (
                <button key={i} className="cr-opt" disabled={picked != null}
                  data-state={picked == null ? '' : i === q.right ? 'right' : i === picked ? 'wrong' : 'dim'}
                  onClick={() => answer(i)}>{o}</button>
              ))}
            </div>
            {picked != null && (
              <>
                <p className="cr-verdict" data-ok={picked === q.right ? '1' : '0'}>{picked === q.right ? L.right : L.wrong}</p>
                <button className="btn" onClick={next}>{qi + 1 < exam.length ? 'השאלה הבאה' : 'לטקס הסיום'} <Icon name="chevron" size={17} /></button>
              </>
            )}
          </>
        )}

        {stage === 'grad' && (
          <>
            <span className="fx-kick">{L.gradKick}</span>
            <h1 className="cr-title">{course.name}</h1>
            <p className="cr-lead">{distinction ? L.gradDistinction : L.gradPass}</p>
            <div className="row" style={{ gap: 8 }}>
              <span className="chip" style={{ background: 'rgba(233,185,73,.14)', color: 'var(--gold)' }}>אימון +{course.gain.training + (focus === 'training' ? 2 : 0) + (distinction ? 1 : 0)}</span>
              <span className="chip" style={{ background: 'rgba(233,185,73,.14)', color: 'var(--gold)' }}>מנטלי +{course.gain.mental + (focus === 'mental' ? 2 : 0) + (distinction ? 1 : 0)}</span>
            </div>
            <button className="btn" onClick={() => onFinish({ focus, distinction })}>קבל את התעודה</button>
          </>
        )}
      </div>
    </div>
  );
}
