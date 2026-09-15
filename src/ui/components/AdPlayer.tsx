import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Portal } from './Portal.tsx';
import { Gem } from './Gem.tsx';
import { asset } from '../asset.ts';
import type { Ad } from '../../data/ads.ts';
import * as A from '../../game/adWatch.ts';

/**
 * The ad, full screen, and the gem at the end of it.
 *
 * The video element is the witness and the pure session in adWatch is the
 * judge: every timeupdate, the metadata, `ended`, an error, all go through
 * the session, and the gem is paid the instant it says the sitting is
 * complete, before the reward card is even drawn, so a tab closed on the
 * card has still been paid. Seeking is snapped back and the playback rate
 * pinned, so the only way to the end is through the middle.
 *
 * Leaving the app (a call, the home button, another tab) voids the sitting
 * on the spot, as the manager was told: the clip stops, the card says so,
 * and the next tap starts from the top. The X asks first, because a thumb
 * brushing the corner should not throw away eleven seconds of watching.
 *
 * Sound is on, this is an ad, but browsers may refuse sound without a fresh
 * gesture; then it plays muted with a button to turn the sound on, and if
 * even that is refused there is a button to start it by hand.
 */
type View = 'loading' | 'playing' | 'confirm' | 'done' | 'aborted';

export function AdPlayer({ ad, left, backRef, onComplete, onClose, onRetry }: {
  ad: Ad;
  /** sittings left this season, read after the gem is paid */
  left: number;
  /** the phone's back button lands here while the ad is up */
  backRef: MutableRefObject<(() => void) | null>;
  onComplete: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const vid = useRef<HTMLVideoElement>(null);
  const session = useRef<A.AdSession>(A.startAd(ad));
  const [view, setView] = useState<View>('loading');
  const [remaining, setRemaining] = useState(ad.seconds);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [reason, setReason] = useState<A.AdSession['reason']>(null);

  const s = () => session.current;
  const set = (next: A.AdSession) => { session.current = next; };

  /** the sitting ended without the gem: stop the clip and say why */
  const abort = (next: A.AdSession) => {
    set(next);
    vid.current?.pause();
    setReason(next.reason);
    setView('aborted');
  };

  // try to play with sound; fall back to muted; fall back to a tap
  const tryPlay = async () => {
    const v = vid.current;
    if (!v) return;
    try {
      await v.play();
      setNeedsTap(false);
    } catch {
      if (!v.muted) {
        v.muted = true; setMuted(true);
        try { await v.play(); setNeedsTap(false); return; } catch { /* fall through */ }
      }
      setNeedsTap(true);
    }
  };

  // the app going to the background voids the sitting outright
  useEffect(() => {
    const gone = () => { if (document.hidden && s().status === 'playing') abort(A.hidden(s())); };
    const torn = () => { if (s().status === 'playing') abort(A.hidden(s())); };
    document.addEventListener('visibilitychange', gone);
    window.addEventListener('pagehide', torn);
    return () => {
      document.removeEventListener('visibilitychange', gone);
      window.removeEventListener('pagehide', torn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the phone's back button behaves like the X
  useEffect(() => {
    backRef.current = () => askLeave();
    return () => { backRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const askLeave = () => {
    const st = s().status;
    if (st === 'done') { onClose(); return; }
    if (st === 'aborted') { onClose(); return; }
    if (view === 'confirm') return;
    vid.current?.pause();
    setView('confirm');
  };
  const stay = () => { setView('playing'); void tryPlay(); };
  const leave = () => { set(A.leave(s())); onClose(); };

  const onTime = () => {
    const v = vid.current;
    if (!v || s().status !== 'playing') return;
    const next = A.advance(s(), v.currentTime);
    set(next);
    setRemaining(A.remaining(next));
    setProgress(Math.min(1, next.pos / next.seconds));
  };

  const onEnded = () => {
    if (s().status !== 'playing') return;
    const next = A.ended(s());
    set(next);
    if (A.completed(next)) {
      setProgress(1); setRemaining(0);
      onComplete();
      setView('done');
    } else abort(next);
  };

  const line = reason === 'hidden' ? 'יצאת באמצע, הפרסומת לא נספרה.'
    : reason === 'error' ? 'הפרסומת לא נטענה. בדוק חיבור ונסה שוב.'
    : 'הפרסומת לא נצפתה עד הסוף.';
  const after = left === 0 ? 'זו הייתה האחרונה העונה.'
    : left === 1 ? 'נשארה צפייה אחת העונה.'
    : `נשארו ${left} צפיות העונה.`;

  return (
    <Portal>
      <div className="ad-scrim" role="dialog" aria-label="פרסומת">
        <video
          ref={vid}
          className="ad-vid"
          src={asset(ad.src)}
          poster={asset(ad.poster)}
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          onLoadedMetadata={e => { set(A.withDuration(s(), e.currentTarget.duration)); setRemaining(A.remaining(s())); }}
          onCanPlay={() => { if (view === 'loading') { setView('playing'); void tryPlay(); } }}
          onTimeUpdate={onTime}
          onEnded={onEnded}
          onError={() => { if (s().status === 'playing') abort(A.failed(s())); }}
          onSeeking={e => { const v = e.currentTarget; if (Math.abs(v.currentTime - s().pos) > A.MAX_STEP) v.currentTime = s().pos; }}
          onRateChange={e => { if (e.currentTarget.playbackRate !== 1) e.currentTarget.playbackRate = 1; }}
        />

        {/* the strip along the top: what this is, how long is left, the X */}
        <div className="ad-top">
          <button className="ad-x" onClick={askLeave} aria-label="סגור">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="ad-meta">
            <span className="ad-tag">פרסומת</span>
            <span className="ad-left num">{view === 'done' ? 'הסתיים' : `עוד ${remaining} שניות`}</span>
          </div>
          <button className="ad-x" onClick={() => { const v = vid.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }}
            aria-label={muted ? 'הפעל קול' : 'השתק'}>
            {muted
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5zM22 9l-6 6M16 9l6 6" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>}
          </button>
        </div>
        <div className="ad-progress" aria-hidden="true"><div style={{ width: `${progress * 100}%` }} /></div>

        {/* the promise, small, under the clip */}
        {(view === 'playing' || view === 'loading') && (
          <div className="ad-foot">
            <span className="ad-brand">{ad.brand}</span>
            <span className="ad-promise"><Gem size={15} /> יהלום אחד בסיום</span>
          </div>
        )}

        {view === 'loading' && <div className="ad-panel"><div className="ad-line">הפרסומת נטענת...</div></div>}

        {needsTap && view === 'playing' && (
          <div className="ad-panel">
            <button className="btn" onClick={() => void tryPlay()}>הפעל את הפרסומת</button>
          </div>
        )}

        {view === 'confirm' && (
          <div className="ad-panel">
            <div className="ad-line">לצאת באמצע? לא תקבל את היהלום.</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={stay}>להישאר</button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={leave}>לצאת</button>
            </div>
          </div>
        )}

        {view === 'aborted' && (
          <div className="ad-panel">
            <div className="ad-line">{line}</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={onRetry}>צפה מההתחלה</button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>לא עכשיו</button>
            </div>
          </div>
        )}

        {view === 'done' && (
          <div className="ad-panel ad-done">
            <div className="ad-reward"><Gem size={44} /><b className="score-face">+1</b></div>
            <div className="ad-line">קיבלת יהלום אחד. {after}</div>
            <button className="btn" onClick={onClose}>מעולה</button>
          </div>
        )}
      </div>
    </Portal>
  );
}
