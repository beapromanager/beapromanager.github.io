import { TopBack } from '../components/TopBack.tsx';
import { useState } from 'react';
import * as G from '../../game/state.ts';
import { Meters } from '../components/bits.tsx';
import { Icon } from '../components/Icon.tsx';
import { SPEAKER_META } from './Dilemma.tsx';
import { Face } from '../components/Face.tsx';
import { faceFor } from '../faces.ts';

/**
 * The manager's inbox. Everything that wants an answer but is not about the
 * match you are walking into waits here, so the hub carries a red badge and you
 * deal with it when you feel like it. Reading one opens the full message and
 * the same weighted choices a matchday dilemma has.
 */
export function InboxScreen({ gs, onAnswer, onDismissOutcome, onBack }: {
  gs: G.GameState;
  onAnswer: (itemIndex: number, optionIndex: number) => void;
  onDismissOutcome: () => void;
  onBack: () => void;
}) {
  const [open, setOpen] = useState<number | null>(gs.inbox.length === 1 ? 0 : null);
  const answered = gs.pendingOutcome != null;

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 13 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <span className="eyebrow">תיבת הודעות</span>
          <span className="chip" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--ink-dim)' }}>
            מחזור <span className="num">{gs.week}</span>
          </span>
        </div>

        {answered ? (
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
            <button className="btn" onClick={() => { setOpen(null); onDismissOutcome(); }}>
              {gs.inbox.length > 0 ? 'להודעות שנותרו' : 'חזרה לבית'} <Icon name="chevron" size={17} />
            </button>
          </>
        ) : gs.inbox.length === 0 ? (
          <>
            <div className="stack" style={{ alignItems: 'center', gap: 11, marginTop: 46, opacity: .75 }}>
              <Icon name="clipboard" size={32} color="var(--ink-faint)" />
              <p className="sub" style={{ textAlign: 'center' }}>אין הודעות ממתינות.<br />שקט, וזה בדרך כלל סימן טוב.</p>
            </div>
            <div className="spacer" />
            <button className="btn" onClick={onBack}>חזרה לבית <Icon name="chevron" size={17} style={{ transform: 'scaleX(-1)' }} /></button>
          </>
        ) : (
          <>
            <p className="hint" style={{ margin: 0 }}>
              דברים שממתינים לתשובה שלך. אף אחד מהם לא בוער, אבל כולם זוכרים מה ענית.
            </p>

            {gs.inbox.map((m, i) => {
              const sp = SPEAKER_META[m.speaker];
              const isOpen = open === i;
              return (
                <div key={`${m.id}-${i}`} className="tile" style={{
                  padding: 0, overflow: 'hidden',
                  borderColor: isOpen ? `${sp.color}55` : undefined,
                }}>
                  <button onClick={() => setOpen(isOpen ? null : i)}
                    style={{
                      display: 'flex', gap: 11, alignItems: 'center', width: '100%',
                      textAlign: 'start', padding: '12px 13px', minHeight: 64,
                    }}
                    aria-expanded={isOpen}>
                    <Face src={faceFor(m.speaker, G.club(gs).tier, gs.seasonSeed + i * 13)} icon={sp.icon} color={sp.color} size={44} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: sp.color, marginBottom: 3 }}>{m.speakerLabel}</span>
                      <span style={{
                        display: 'block', fontSize: 14.5, color: 'var(--ink-dim)', lineHeight: 1.4,
                        ...(isOpen ? null : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
                      }}>{m.text}</span>
                    </span>
                    <Icon name="chevron" size={16} color="var(--ink-faint)"
                      style={{ transform: isOpen ? 'rotate(-90deg)' : 'none', flex: 'none' }} />
                  </button>

                  {isOpen && (
                    <div className="stack stagger" style={{ gap: 8, padding: '0 13px 13px' }}>
                      {m.options.map((o, oi) => (
                        <button key={oi} className="btn dark"
                          style={{ ...({ '--i': oi } as React.CSSProperties), justifyContent: 'space-between', textAlign: 'start' }}
                          onClick={() => onAnswer(i, oi)}>
                          <span style={{ fontWeight: 700 }}>{o.label}</span>
                          <Icon name="chevron" size={16} color="var(--ink-faint)" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="spacer" />
            <button className="btn dark" onClick={onBack}>חזרה לבית</button>
          </>
        )}
      </div>
    </>
  );
}
