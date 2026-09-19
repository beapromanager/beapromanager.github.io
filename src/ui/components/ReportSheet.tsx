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
 * Three steps in one sheet: what kind of thing happened, what happened in his
 * words, and the send. The send cannot put words into Instagram's mouth, so
 * it copies the whole message to the clipboard and opens the chat; the sheet
 * then says so, plainly, because a button that opens a blank chat with no
 * explanation reads as broken. A screenshot is asked for on the way out.
 *
 * On a phone that can share files (Android, in practice) the screenshot goes
 * with the text in one share; elsewhere he attaches it in the chat himself.
 *
 * The thank you: a gem, when the report earned one. The rule for earning it
 * is not on screen on purpose. See report.ts.
 */
export function ReportSheet({ gs, onClose, onFiled }: {
  gs: GameState;
  onClose: () => void;
  /** the state after the thank you landed, if it did */
  onFiled: (next: GameState) => void;
}) {
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState<{ gem: boolean; copied: boolean } | null>(null);
  const [shot, setShot] = useState<File | null>(null);

  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator
    && (() => { try { return navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }); } catch { return false; } })();

  const env = {
    build: __BUILD__,
    device: deviceLine(navigator.userAgent, matchMedia('(display-mode: standalone)').matches),
  };

  async function send() {
    if (!kind) return;
    const message = composeReport(gs, kind, text, env);
    let copied = false;
    try { await navigator.clipboard.writeText(message); copied = true; } catch { /* no clipboard: he can still type it */ }
    // a screenshot chosen on a phone that can share it goes with the words
    let shared = false;
    if (shot && canShareFiles) {
      try { await navigator.share({ files: [shot], text: message }); shared = true; } catch { /* he backed out of the share sheet */ }
    }
    if (!shared) window.open(REPORT_CHAT_URL, '_blank', 'noopener');
    const filed = fileReport(gs, text);
    setSent({ gem: filed.gem, copied });
    onFiled(filed.gs);
  }

  const prompt = REPORT_KINDS.find(k => k.id === kind)?.prompt;

  return (
    <Portal>
      <div className="sheet-scrim" onClick={onClose}>
        <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="דיווח על תקלה">
          <div className="sheet-grip" />

          {!sent && (
            <>
              <div className="stack" style={{ alignItems: 'center', gap: 6, padding: '2px 0 6px' }}>
                <Icon name="alert" size={26} color="var(--gold)" />
                <div className="h2" style={{ fontSize: 21 }}>דווח על תקלה</div>
                <p className="hint" style={{ margin: 0, textAlign: 'center', maxWidth: 300 }}>
                  מה קרה?
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
                      {!shot && !canShareFiles && ' צרף אותו בצ\'אט.'}
                      {!shot && canShareFiles && ' בחר אותו כאן.'}
                    </span>
                  </label>
                  <button className="btn" disabled={!text.trim()} onClick={send}>שלח באינסטגרם</button>
                </div>
              )}
            </>
          )}

          {sent && (
            <div className="stack" style={{ alignItems: 'center', gap: 10, padding: '6px 0 4px', textAlign: 'center', animation: 'riseIn .25s ease' }}>
              {sent.gem
                ? <span style={{ animation: 'pop .5s var(--ease-out)' }}><Gem size={44} /></span>
                : <Icon name="handshake" size={30} color="var(--gold)" />}
              <div className="h2" style={{ fontSize: 21 }}>
                {sent.gem ? 'תודה. זה עוזר לנו יותר ממה שאתה חושב.' : 'תודה.'}
              </div>
              <p className="hint" style={{ margin: 0, maxWidth: 320 }}>
                {sent.copied
                  ? 'ההודעה הועתקה. הדבק בצ\'אט ושלח.'
                  : 'לא הצלחנו להעתיק את ההודעה. כתוב אותה בצ\'אט במילים שלך.'}
                {!canShareFiles && ' צילום מסך של הרגע עוזר יותר מכל תיאור. צרף אותו בצ\'אט.'}
              </p>
              <a className="btn dark btn-sm" href={REPORT_CHAT_URL} target="_blank" rel="noopener noreferrer" style={{ marginTop: 6 }}>
                פתח את הצ'אט שוב
              </a>
              <button className="btn btn-sm" style={{ marginTop: 2 }} onClick={onClose}>סגור</button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
