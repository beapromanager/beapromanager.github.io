import { useEffect } from 'react';
import * as G from '../../game/state.ts';
import { Meters } from '../components/bits.tsx';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import type { Speaker } from '../../data/dilemmas.ts';
import { AssistantNote } from '../components/AssistantNote.tsx';

/** Shared with the inbox, so one sender always looks like the same person. */
export const SPEAKER_META: Record<Speaker, { icon: IconName; color: string }> = {
  owner: { icon: 'coins', color: 'var(--gold)' },
  veteran: { icon: 'shirt', color: 'var(--sky)' },
  reporter: { icon: 'mic', color: '#c58ce8' },
  ultras: { icon: 'crowd', color: 'var(--blood)' },
  player: { icon: 'boot', color: 'var(--win)' },
  agent: { icon: 'handshake', color: '#e8a86c' },
  director: { icon: 'clipboard', color: '#7fb2e8' },
  physio: { icon: 'injury', color: 'var(--loss)' },
  youth: { icon: 'star', color: '#8ce8b4' },
  sponsor: { icon: 'flag', color: '#d9c27a' },
  squad: { icon: 'crowd', color: 'var(--win)' },
};

/**
 * How long his answer is left on the screen before the game walks on.
 *
 * It is one line in a bubble, and the reason to have chosen at all. Long
 * enough to read it, short enough that nobody is waiting: the button is
 * still there for a thumb that is faster than the beat.
 */
const REPLY_BEAT = 2200;

export function DilemmaChat({ gs, onChoose, onContinue }: {
  gs: G.GameState; onChoose: (i: number) => void; onContinue: () => void;
}) {
  const d = gs.dilemma;
  const answered = gs.pendingOutcome != null;
  const sp = d ? SPEAKER_META[d.speaker] : null;
  /**
   * The reply reads itself and the game moves on.
   *
   * This screen used to end in a tap that did nothing but agree to
   * continue, and it sits in the middle of the longest corridor in the
   * game: a first match was six taps and five screens away from a ball
   * moving, and the second largest fall in the funnel is the people who
   * reached the hub and never played a round.
   */
  useEffect(() => {
    if (!answered) return;
    const t = window.setTimeout(onContinue, REPLY_BEAT);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);
  if (!d || !sp) return null;

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <span className="eyebrow">לפני המשחק</span>
          <span className="chip" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--ink-dim)' }}>
            מחזור <span className="num">{gs.week}</span>
          </span>
        </div>

        {/* incoming message */}
        <div className="row" style={{ alignItems: 'flex-start', gap: 11, animation: 'riseIn var(--t-mid) var(--ease-out)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', flex: 'none',
            background: 'linear-gradient(180deg,var(--surface-3),var(--surface))',
            border: `1px solid ${sp.color}44`,
          }}>
            <Icon name={sp.icon} size={22} color={sp.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: sp.color, marginBottom: 5, letterSpacing: '.02em' }}>{d.speakerLabel}</div>
            <div style={{
              background: 'linear-gradient(180deg,var(--surface-2),var(--surface))',
              border: '1px solid var(--line)', borderRadius: '5px 18px 18px 18px',
              padding: '13px 15px', fontSize: 16, lineHeight: 1.6, boxShadow: 'var(--e1)',
            }}>
              {d.text}
            </div>
          </div>
        </div>

        {!answered && (
          <div className="stack stagger" style={{ gap: 9, marginTop: 4 }}>
            {d.options.map((o, i) => (
              <button key={i} className="btn dark" style={{ ...({ '--i': i } as React.CSSProperties), justifyContent: 'space-between', textAlign: 'start' }}
                onClick={() => onChoose(i)}>
                <span style={{ fontWeight: 700 }}>{o.label}</span>
                <Icon name="chevron" size={16} color="var(--ink-faint)" />
              </button>
            ))}
          </div>
        )}

        {!answered && <AssistantNote gs={gs} options={d.options.map(o => o.label)} />}

        {answered && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'riseIn var(--t-mid) var(--ease-out)' }}>
              <div style={{
                background: 'linear-gradient(180deg,var(--grass),#1E7C4C)', color: '#04180C',
                borderRadius: '18px 5px 18px 18px', padding: '12px 15px', fontSize: 15.5,
                maxWidth: '84%', fontWeight: 700, lineHeight: 1.55, boxShadow: 'var(--e2)',
              }}>
                {gs.pendingOutcome}
              </div>
            </div>
            <div className="spacer" />
            <button className="btn" onClick={onContinue}>
              הלאה לטקטיקה <Icon name="chevron" size={17} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
