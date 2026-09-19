import { useState } from 'react';
import { Portal } from './Portal.tsx';
import { Icon } from './Icon.tsx';
import { Gem } from './Gem.tsx';
import type { GameState } from '../../game/state.ts';
import {
  REPORT_KINDS, REPORT_CHAT_URL, REPORT_MAX_CHARS, composeReport, deviceLine, fileReport,
} from '../../game/report.ts';
import type { ReportKind } from '../../game/report.ts';

/**
 * Report a fault, to the game's Instagram chat.
 *
 * Four steps in one sheet: what kind of thing happened, what happened in his
 * words, the message as it will go, and the send. The send cannot put words
 * into Instagram's mouth, so the message is shown first with what is about
 * to happen said in plain words: one tap copies it and opens the chat, and
 * there he pastes and sends. The tap says "copied" before the chat opens, so
 * nobody arrives in an empty chat wondering what the button did. A
 * screenshot is asked for on the way, not required.
 *
 * On a phone that can share files (Android, in practice) a chosen screenshot
 * goes with the text in one share; elsewhere he attaches it in the chat.
 *
 * Coming back is a button, not the back gesture: the game tab stayed exactly
 * where it was, and the sheet says so.
 *
 * The thank you: a gem, when the report earned one. The rule for earning it
 * is not on screen on purpose. See report.ts.
 */
export function ReportSheet({ gs, onClose, onFiled, crash }: {
  gs: GameState | null;
  onClose: () => void;
  /** the state after the thank you landed, if it did */
  onFiled: (next: GameState) => void;
  /** the game caught an error: the kind is known and the error rides along */
  crash?: string;
}) {
  const [kind, setKind] = useState<ReportKind | null>(crash ? 'broken' : null);
  const [text, setText] = useState('');
  const [shot, setShot] = useState<File | null>(null);
  const [step, setStep] = useState<'write' | 'preview' | 'sent'>('write');
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const [gem, setGem] = useState(false);

  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator
    && (() => { try { return navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }); } catch { return false; } })();

  const env = {
    build: __BUILD__,
    device: deviceLine(navigator.userAgent, matchMedia('(display-mode: standalone)').matches),
  };
  const message = kind ? composeReport(gs, kind, text, env, crash) : '';

  async function copy(): Promise<boolean> {
    try { await navigator.clipboard.writeText(message); setCopied('yes'); return true; }
    catch { setCopied('failed'); return false; }
  }

  /** Copy, say so, then open the chat. The thank you lands the moment the chat is opened. */
  async function send() {
    if (!kind) return;
    await copy();
    // a screenshot chosen on a phone that can share it goes with the words
    let shared = false;
    if (shot && canShareFiles) {
      try { await navigator.share({ files: [shot], text: message }); shared = true; } catch { /* he backed out of the share sheet */ }
    }
    // no career, no thank you to put anywhere; the report still goes
    const filed = gs ? fileReport(gs, text) : { gs: null, gem: false };
    setGem(filed.gem);
    if (filed.gs) onFiled(filed.gs);
    setStep('sent');
    // the "copied" line gets a beat on screen before the chat takes over
    if (!shared) window.setTimeout(() => window.open(REPORT_CHAT_URL, '_blank', 'noopener'), 700);
  }

  const prompt = REPORT_KINDS.find(k => k.id === kind)?.prompt;

  return (
    <Portal>
      <div className="sheet-scrim" onClick={onClose}>
        <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="דיווח על תקלה">
          <div className="sheet-grip" />

          {step === 'write' && (
            <>
              <div className="stack" style={{ alignItems: 'center', gap: 6, padding: '2px 0 6px' }}>
                <Icon name="alert" size={26} color="var(--gold)" />
                <div className="h2" style={{ fontSize: 21 }}>דווח על תקלה</div>
                <p className="hint" style={{ margin: 0, textAlign: 'center', maxWidth: 300 }}>
                  {crash ? 'המשחק צילם את השגיאה בשבילך. ספר לנו מה עשית רגע לפני.' : 'מה קרה?'}
                </p>
              </div>

              {/* the kind: one row of choices, the picked one lit */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {REPORT_KINDS.map(k => (
                  <button key={k.id} type="button" className="chip" onClick={() => setKind(k.id)}
                    style={{
                      cursor: 'pointer', fontSize: 14, padding: '9px 13px',
                      background: kind === k.id ? 'var(--gold)' : 'rgba(255,255,255,.06)',
                      color: kind === k.id ? '#1e1608' : 'var(--ink)',
                      border: `1px solid ${kind === k.id ? 'var(--gold)' : 'var(--line-2)'}`,
                    }}>
                    {k.label}
                  </button>
                ))}
              </div>

              {kind && (
                <div className="stack" style={{ gap: 10, marginTop: 14, animation: 'riseIn .2s ease' }}>
                  <textarea
                    className="field" rows={4} value={text} maxLength={REPORT_MAX_CHARS}
                    placeholder={prompt} onChange={e => setText(e.target.value)}
                    style={{ resize: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
                    autoFocus
                  />
                  <label className="hint" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => setShot(e.target.files?.[0] ?? null)} />
                    <Icon name="clipboard" size={15} color="var(--gold)" />
                    <span>
                      {shot ? `צורף: ${shot.name}` : 'צילום מסך של הרגע עוזר יותר מכל תיאור.'}
                      {!shot && !canShareFiles && ' תוכל לצרף אותו בצ\'אט.'}
                      {!shot && canShareFiles && ' בחר אותו כאן.'}
                    </span>
                  </label>
                  <button className="btn" disabled={!text.trim()} onClick={() => setStep('preview')}>המשך ›</button>
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <div className="stack" style={{ gap: 12, animation: 'riseIn .2s ease' }}>
              <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
                <div className="h2" style={{ fontSize: 21 }}>זה מה שיישלח</div>
                <p className="hint" style={{ margin: 0, textAlign: 'center', maxWidth: 320 }}>
                  בלחיצה ההודעה מועתקת ואינסטגרם נפתח. שם: לחיצה ארוכה בשדה ההודעה, הדבק, ושלח.
                </p>
              </div>
              <pre className="tile" style={{
                margin: 0, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto', color: 'var(--ink)',
              }}>{message}</pre>
              <button className="btn" onClick={send}>העתק ופתח את הצ'אט</button>
              <button className="btn dark btn-sm" onClick={() => setStep('write')}>‹ לתקן משהו</button>
            </div>
          )}

          {step === 'sent' && (
            <div className="stack" style={{ alignItems: 'center', gap: 10, padding: '6px 0 4px', textAlign: 'center', animation: 'riseIn .25s ease' }}>
              {/* what just happened, said plainly, before anything else */}
              <div className="chip" style={{ background: copied === 'yes' ? 'rgba(46,204,113,.16)' : 'rgba(255,90,95,.14)', color: copied === 'yes' ? 'var(--win)' : 'var(--loss)', fontSize: 14 }}>
                {copied === 'yes' ? 'ההודעה הועתקה ✓' : 'ההעתקה לא הצליחה'}
              </div>
              {gem
                ? <span style={{ animation: 'pop .5s var(--ease-out)' }}><Gem size={44} /></span>
                : <Icon name="handshake" size={30} color="var(--gold)" />}
              <div className="h2" style={{ fontSize: 21 }}>
                {gem ? 'תודה. זה עוזר לנו יותר ממה שאתה חושב.' : 'תודה.'}
              </div>
              <p className="hint" style={{ margin: 0, maxWidth: 320 }}>
                {copied === 'yes'
                  ? 'אינסטגרם נפתח בחלון נפרד. הדבק שם את ההודעה ושלח. המשחק מחכה לך כאן בדיוק איפה שעצרת.'
                  : 'העתק את ההודעה מהכפתור למטה, ואז הדבק אותה בצ\'אט. המשחק מחכה לך כאן.'}
                {!canShareFiles && ' צילום מסך של הרגע עוזר יותר מכל תיאור.'}
              </p>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button className="btn dark btn-sm" style={{ flex: 1 }} onClick={copy}>
                  {copied === 'yes' ? 'העתק שוב' : 'העתק את ההודעה'}
                </button>
                <a className="btn dark btn-sm" style={{ flex: 1 }} href={REPORT_CHAT_URL} target="_blank" rel="noopener noreferrer">
                  פתח את הצ'אט
                </a>
              </div>
              <button className="btn" style={{ marginTop: 2 }} onClick={onClose}>חזרה למשחק ›</button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
