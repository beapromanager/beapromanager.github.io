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
 * complete, before the reward is even drawn, so a tab closed on the reward
 * has still been paid. Seeking is snapped back and the playback rate pinned,
 * so the only way to the end is through the middle.
 *
 * Leaving the app (a call, the home button, another tab) voids the sitting
 * on the spot, as the manager was told: the clip stops, the card says so,
 * and the next tap starts from the top. The X asks first, because a thumb
 * brushing the corner should not throw away eleven seconds of watching.
 *
 * The advertiser's address sits under the clip the whole time. A tap on it
 * mid clip is a leave like any other, so it asks too, and says that the same
 * door is waiting at the end; the reward card leads with it.
 *
 * The reward is the moment: the gem is born in the middle of the screen,
 * flies up into the counter in the top strip, and the count ticks over with
 * a flash. Only then does the card rise. All of it lives inside this overlay,
 * so nothing underneath has to know.
 *
 * Sound is on, this is an ad, but browsers may refuse sound without a fresh
 * gesture; then it plays muted with a button to turn the sound on, and if
 * even that is refused there is a button to start it by hand.
 */
type View = 'loading' | 'playing' | 'confirm' | 'done' | 'aborted';
type Confirm = 'exit' | 'site';
type Reward = 'born' | 'flying' | 'landed';

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function AdPlayer({ ad, gems, left, backRef, onComplete, onClose, onRetry }: {
  ad: Ad;
  /** the gem count, which steps up the moment the sitting completes */
  gems: number;
  /** sittings left this season, read after the gem is paid */
  left: number;
  /** the phone's back button lands here while the ad is up */
  backRef: MutableRefObject<(() => void) | null>;
  onComplete: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const vid = useRef<HTMLVideoElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const stage = useRef<Reward>('born');     // the reward's own record, event or clock
  const session = useRef<A.AdSession>(A.startAd(ad));
  const [view, setView] = useState<View>('loading');
  const [confirm, setConfirm] = useState<Confirm>('exit');
  const [remaining, setRemaining] = useState(ad.seconds);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [fit, setFit] = useState<'cover' | 'contain'>('contain');
  const [reason, setReason] = useState<A.AdSession['reason']>(null);
  // the counter shows the old total until the gem lands in it
  const [shown, setShown] = useState(gems);
  const [reward, setReward] = useState<Reward>('born');
  const [pop, setPop] = useState(false);

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
    backRef.current = () => askLeave('exit');
    return () => { backRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const askLeave = (why: Confirm) => {
    const st = s().status;
    if (st !== 'playing') { onClose(); return; }
    if (view === 'confirm') return;
    vid.current?.pause();
    setConfirm(why);
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
      if (reduceMotion) { stage.current = 'landed'; setReward('landed'); setShown(gems + 1); }
      setView('done');
    } else abort(next);
  };

  /** the gem has been born mid screen: send it to the counter */
  const fly = () => {
    if (stage.current !== 'born') return;
    const from = flyer.current?.getBoundingClientRect();
    const to = pill.current?.getBoundingClientRect();
    if (!from || !to || !flyer.current) { land(); return; }
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    flyer.current.style.transform = `translate(${dx}px, ${dy}px) scale(.3)`;
    stage.current = 'flying';
    setReward('flying');
  };
  const land = () => {
    if (stage.current === 'landed') return;
    stage.current = 'landed';
    setShown(gems);          // gems already stepped up in onComplete
    setPop(true);
    setReward('landed');
  };

  // the animation events drive the reward, but a tab the browser is not
  // painting never fires them, so the clock walks it through regardless
  useEffect(() => {
    if (view !== 'done' || reduceMotion) return;
    const a = window.setTimeout(fly, 900);
    const b = window.setTimeout(land, 1700);
    return () => { clearTimeout(a); clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const line = reason === 'hidden' ? 'יצאת באמצע, הפרסומת לא נספרה.'
    : reason === 'error' ? 'הפרסומת לא נטענה. בדוק חיבור ונסה שוב.'
    : 'הפרסומת לא נצפתה עד הסוף.';
  const after = left === 0 ? 'זו הייתה האחרונה העונה.'
    : left === 1 ? 'נשארה צפייה אחת העונה.'
    : `נשארו ${left} צפיות העונה.`;

  return (
    <Portal>
      <div className="ad-scrim" role="dialog" aria-label="פרסומת">
        {fit === 'contain' && <div className="ad-backdrop" style={{ backgroundImage: `url('${asset(ad.poster)}')` }} aria-hidden="true" />}
        <video
          ref={vid}
          className="ad-vid"
          style={{ objectFit: fit }}
          src={asset(ad.src)}
          poster={asset(ad.poster)}
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          onLoadedMetadata={e => {
            const v = e.currentTarget;
            set(A.withDuration(s(), v.duration));
            setRemaining(A.remaining(s()));
            // a clip shaped like the screen fills it edge to edge; anything else
            // is shown whole over a blurred wash of its own poster, because an
            // advertiser's words at the edge of the frame are not ours to crop
            const clip = v.videoWidth / v.videoHeight, screen = window.innerWidth / window.innerHeight;
            if (clip > 0 && Math.abs(screen / clip - 1) < 0.08) setFit('cover');
          }}
          onCanPlay={() => { if (view === 'loading') { setView('playing'); void tryPlay(); } }}
          onTimeUpdate={onTime}
          onEnded={onEnded}
          onError={() => { if (s().status === 'playing') abort(A.failed(s())); }}
          onSeeking={e => { const v = e.currentTarget; if (Math.abs(v.currentTime - s().pos) > A.MAX_STEP) v.currentTime = s().pos; }}
          onRateChange={e => { if (e.currentTarget.playbackRate !== 1) e.currentTarget.playbackRate = 1; }}
        />

        {/* the strip along the top: the X, what this is, the count, how long is left, the mute */}
        <div className="ad-top">
          <button className="ad-x" onClick={() => askLeave('exit')} aria-label="סגור">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="ad-meta">
            <span className="ad-tag">פרסומת</span>
            <span ref={pill} className={`ad-pill${pop ? ' pop' : ''}`} onAnimationEnd={() => setPop(false)} aria-label={`${shown} יהלומים`}>
              <Gem size={14} /><b className="num">{shown}</b>
            </span>
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

        {/* the advertiser's door, and the promise, under the clip */}
        {(view === 'playing' || view === 'loading') && (
          <div className="ad-foot">
            <button className="ad-site" onClick={() => askLeave('site')}>
              <span className="ad-brand">{ad.brand}</span>
              <span className="ad-url num">{ad.site} ‹</span>
            </button>
            <span className="ad-promise"><Gem size={15} /> יהלום אחד בסיום</span>
          </div>
        )}

        {view === 'loading' && <div className="ad-panel"><div className="ad-line">הפרסומת נטענת...</div></div>}

        {needsTap && view === 'playing' && (
          <div className="ad-panel">
            <button className="btn" onClick={() => void tryPlay()}>הפעל את הפרסומת</button>
          </div>
        )}

        {view === 'confirm' && confirm === 'exit' && (
          <div className="ad-panel">
            <div className="ad-line">לצאת באמצע? לא תקבל את היהלום.</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={stay}>להישאר</button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={leave}>לצאת</button>
            </div>
          </div>
        )}

        {view === 'confirm' && confirm === 'site' && (
          <div className="ad-panel">
            <div className="ad-line">לעבור לאתר עכשיו? הפרסומת תתבטל ולא תקבל את היהלום. בסיום הפרסומת יש כפתור לאתר.</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={stay}>להמשיך לצפות</button>
              <a className="btn ghost" style={{ flex: 1 }} href={ad.link} target="_blank" rel="noopener noreferrer sponsored" onClick={leave}>לעבור עכשיו</a>
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

        {/* the gem, born mid screen, then sent up into the counter */}
        {view === 'done' && reward !== 'landed' && (
          <div
            ref={flyer}
            className={`ad-flyer ${reward}`}
            onAnimationEnd={e => { if (e.animationName === 'adGemBorn') fly(); }}
            onTransitionEnd={e => { if (e.propertyName === 'transform') land(); }}
            aria-hidden="true"
          >
            <div className="ad-burst" />
            <Gem size={96} />
            <b className="score-face">+1</b>
          </div>
        )}

        {view === 'done' && reward === 'landed' && (
          <div className="ad-panel ad-done">
            <div className="ad-line">קיבלת יהלום אחד. {after}</div>
            <a className="btn" href={ad.link} target="_blank" rel="noopener noreferrer sponsored">
              כניסה לאתר {ad.brand}
            </a>
            <button className="btn ghost" onClick={onClose}>מעולה</button>
          </div>
        )}
      </div>
    </Portal>
  );
}
