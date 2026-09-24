import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { ReportSheet } from './ReportSheet.tsx';
import { describeError } from '../../game/report.ts';
import { loadCareer, saveCareer } from '../../game/save.ts';
import { trackCrash, stepFor } from '../../game/telemetry.ts';
import type { GameState } from '../../game/state.ts';

/**
 * The net under the whole game.
 *
 * A crash used to be a black or frozen screen, which is the one moment a
 * manager most needs to tell us something and has the least to say: he
 * cannot describe a blank. So the boundary catches what React throws, and
 * the window catches what the handlers throw, and both land here: a card
 * that says the career is safe (it is: it was saved on every change and
 * nothing here touches it), a way back, and a report with the error already
 * written into it, name, message and the first frames, which is the part
 * that points at a line of code.
 *
 * Reloading is the way back on purpose. Whatever state threw is gone, and
 * the title screen picks the last good save up.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown | null }> {
  state = { error: null as unknown | null };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (this.state.error != null) return <Crashed error={this.state.error} />;
    return <WindowNet>{this.props.children}</WindowNet>;
  }
}

/**
 * Errors thrown outside React's render: a tap handler, a timer, a promise.
 * Only a real Error counts; a failed image or script fires the same event
 * with no error on it and is not a crash.
 */
function WindowNet({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<unknown | null>(null);
  useEffect(() => {
    const onError = (e: ErrorEvent) => { if (e.error instanceof Error) setError(e.error); };
    const onReject = (e: PromiseRejectionEvent) => { if (e.reason instanceof Error) setError(e.reason); };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onReject); };
  }, []);
  if (error != null) return <Crashed error={error} />;
  return <>{children}</>;
}

export function Crashed({ error }: { error: unknown }) {
  const [report, setReport] = useState(false);
  // the last good save, for the report's context line and for the thank you
  const [gs, setGs] = useState<GameState | null>(() => { try { return loadCareer(); } catch { return null; } });
  const crash = describeError(error);

  // The funnel says where people stop. It cannot say whether they stopped
  // because they were bored or because the screen went black, and those two
  // want opposite fixes. So a crash is counted, with the step it happened on
  // and the KIND of error, and nothing else: see telemetry.ts on why the
  // message is not sent. Reporting by hand stays, for the story.
  useEffect(() => {
    trackCrash(error, gs ? stepFor(gs) : null);
    // once per crash screen, whatever re-renders after it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="screen pad stack" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="exit-sheet" role="alert">
        <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
          <Icon name="alert" size={28} color="var(--loss)" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)' }}>משהו נשבר.</div>
          <p className="sub" style={{ textAlign: 'center', margin: 0 }}>
            הקריירה שלך שמורה. המשחק צילם את השגיאה, ואם תשלח אותה לנו נתקן.
          </p>
        </div>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => setReport(true)}>דווח על התקלה</button>
        <button className="btn dark btn-sm" style={{ marginTop: 9 }} onClick={() => location.reload()}>חזור למשחק</button>
        <p className="hint" style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12, opacity: .7, direction: 'ltr' }}>{crash}</p>
      </div>
      {report && (
        <ReportSheet gs={gs} crash={crash} onClose={() => setReport(false)}
          onFiled={next => { setGs(next); saveCareer(next); }} />
      )}
    </div>
  );
}
