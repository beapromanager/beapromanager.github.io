import { TopBack } from '../components/TopBack.tsx';
import { useEffect, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import { overall } from '../../engine/matchEngine.ts';
import { PACKS, ADS_PER_SEASON, GEMS_PER_AD, GEMS_ON_PROMOTION } from '../../game/packs.ts';
import type { PackId, PackPull } from '../../game/packs.ts';
import { RARITY_LABEL, RARITY_OVR_COLOR } from '../../game/cards.ts';
import { UltraCard } from '../components/UltraCard.tsx';
import { Gem, GemCount } from '../components/Gem.tsx';
import { Icon } from '../components/Icon.tsx';
import { Portal } from '../components/Portal.tsx';
import { formatMoney } from '../components/bits.tsx';

/**
 * The pack shop. Gems come from milestones and a capped ad, never from the
 * club's budget, so nothing here can be bought with transfer profit.
 */
export function PacksScreen({ gs, onWatchAd, onBuy, onSign, onSell, onBack }: {
  gs: G.GameState;
  onWatchAd: () => void;
  onBuy: (id: PackId) => void;
  onSign: () => void;
  onSell: () => void;
  onBack: () => void;
}) {
  const left = G.adsLeft(gs);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <>
      <div className="screen pad stack pad-b" style={{ gap: 12 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <div className="h2">חבילות שחקנים</div>
            <div className="sub" style={{ fontSize: 14 }}>יהלומים לא נקנים מהתקציב. הם באים מהדרך.</div>
          </div>
          <div className="tile" style={{ padding: '9px 13px', flex: 'none' }}>
            <GemCount n={gs.gems} size={21} />
          </div>
        </div>

        {/* where gems come from */}
        <div className="tile" style={{ padding: '12px 13px' }}>
          <div className="label-cap" style={{ marginBottom: 9 }}>איך משיגים יהלומים</div>
          <div className="stack" style={{ gap: 8 }}>
            <SourceLine icon="trophy" text="עלייה לליגה גבוהה יותר" value={`+${GEMS_ON_PROMOTION}`} />
            <SourceLine icon="crowd" text={`צפייה בפרסומת, ${ADS_PER_SEASON} בעונה`} value={`+${GEMS_PER_AD}`} />
          </div>

          <button
            className="btn"
            style={{ marginTop: 12, opacity: left > 0 ? 1 : .45 }}
            disabled={left === 0}
            onClick={() => { setMsg(null); onWatchAd(); }}
          >
            {left === 0 ? 'ניצלת את כל הצפיות העונה' : left === 1 ? 'צפה בפרסומת · נשארה אחת העונה' : `צפה בפרסומת · נשארו ${left} העונה`}
          </button>
        </div>

        {msg && (
          <div className="tile" style={{ padding: '10px 13px', fontSize: 14.5, fontWeight: 700 }} aria-live="polite">{msg}</div>
        )}

        <div className="label-cap" style={{ marginTop: 2 }}>החבילות</div>
        {PACKS.map(spec => {
          const blocked = G.packBlockedReason(gs, spec.id);
          return (
            <div key={spec.id} className="tile" style={{ padding: '13px 14px' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{spec.name}</div>
                  <div className="sub" style={{ fontSize: 13.5, marginTop: 3 }}>{spec.blurb}</div>
                </div>
                <div className="row" style={{ gap: 5, flex: 'none', marginInlineStart: 10 }}>
                  <Gem size={19} />
                  <b className="score-face" style={{ fontSize: 22 }}>{spec.cost}</b>
                </div>
              </div>
              <button
                className="btn" style={{ marginTop: 11 }}
                disabled={!!blocked}
                onClick={() => { setMsg(null); onBuy(spec.id); }}
              >
                {blocked ?? 'פתח חבילה'}
              </button>
            </div>
          );
        })}

        <p className="hint">
          שום חבילה לא נותנת שחקן חזק יותר מרמת הבסיס של הליגה שמעליך. זה מה ששומר על הטיפוס.
        </p>

        <div className="spacer" />
        <button className="btn dark" onClick={onBack}>חזרה ›</button>
      </div>

      {gs.pull && (
        <PackReveal
          pull={gs.pull}
          club={G.club(gs)}
          squadFull={G.squadSize(gs) >= G.MAX_SQUAD}
          standing={squadStanding(gs, gs.pull)}
          onSign={onSign}
          onSell={onSell}
        />
      )}
    </>
  );
}

/**
 * What the card actually means to THIS squad. In the lower divisions the tier
 * cap keeps even the dearest pack inside the plain band, so the rarity name
 * alone undersells a card that is about to walk into the first eleven. Rank
 * tells the truth the colour cannot.
 */
function squadStanding(gs: G.GameState, pull: PackPull): string | null {
  const sq = G.mySquad(gs);
  const all = [...sq.starters, ...sq.bench];
  if (!all.length) return null;
  const o = overall(pull.player);
  const better = all.filter(p => overall(p) < o).length;
  const avg = Math.round(all.reduce((s, p) => s + overall(p), 0) / all.length);
  if (better === all.length) return 'השחקן הכי טוב בסגל שלך';
  if (better >= all.length - 3) return `בשלישייה הטובה בסגל שלך`;
  if (o > avg) return `מעל ממוצע הסגל (${avg})`;
  return null;
}

function SourceLine({ icon, text, value }: { icon: 'trophy' | 'crowd'; text: string; value: string }) {
  return (
    <div className="row" style={{ gap: 9 }}>
      <Icon name={icon} size={16} color="var(--ink-faint)" />
      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-dim)' }}>{text}</span>
      <span className="row" style={{ gap: 4, flex: 'none' }}>
        <b className="num" style={{ fontSize: 15 }}>{value}</b>
        <Gem size={14} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- the reveal */

/**
 * The reveal. The tension IS the product, so the sequence is deliberately
 * unhurried: light first (its colour is the first hint), then the card, then
 * the stats, and the rating last, counting up. Tap skips straight to the end,
 * because a ceremony you cannot skip becomes a punishment by the third time.
 */
type Beat = 'dark' | 'shake' | 'light' | 'rise' | 'flip' | 'done';

const BEATS: [Beat, number][] = [
  ['shake', 350], ['light', 750], ['rise', 1350], ['flip', 2000], ['done', 2750],
];

function PackReveal({ pull, club, squadFull, standing, onSign, onSell }: {
  pull: PackPull;
  club: Parameters<typeof UltraCard>[0]['club'];
  squadFull: boolean;
  /** how he compares to the squad you already have */
  standing: string | null;
  onSign: () => void;
  onSell: () => void;
}) {
  const [beat, setBeat] = useState<Beat>('dark');
  const timers = useRef<number[]>([]);
  const accent = RARITY_OVR_COLOR[pull.rarity];
  const o = overall(pull.player);

  useEffect(() => {
    timers.current = BEATS.map(([b, at]) => window.setTimeout(() => setBeat(b), at));
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  function skip() {
    timers.current.forEach(clearTimeout);
    setBeat('done');
  }

  const shown = beat !== 'dark' && beat !== 'shake';
  const carded = beat === 'flip' || beat === 'done';
  const done = beat === 'done';

  return (
    <Portal>
      <div
        className="moment-scrim"
        onClick={done ? undefined : skip}
        role="dialog" aria-modal="true"
        aria-label={`נפתחה חבילה, ${pull.player.name}, דירוג ${o}`}
        style={{ display: 'grid', placeItems: 'center', padding: 20 }}
      >
        {/* the light behind everything, its colour is the first hint of rarity */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(50% 40% at 50% 45%, ${accent}, transparent 70%)`,
          opacity: shown ? (done ? .30 : .55) : 0,
          transition: 'opacity .6s ease',
        }} />

        <div style={{ position: 'relative', display: 'grid', placeItems: 'center', gap: 18 }}>
          {!carded ? (
            <div style={{
              width: 168, height: 225,
              background: 'linear-gradient(158deg,#12241a,#0a1710 55%,#081109)',
              border: `1px solid ${accent}66`,
              clipPath: 'polygon(0 0,100% 0,100% 100%,25px 100%,0 calc(100% - 25px))',
              display: 'grid', placeItems: 'center',
              boxShadow: `0 18px 40px rgba(0,0,0,.6), inset 0 0 40px ${accent}55`,
              animation: beat === 'shake' ? 'pack-shake .38s ease-in-out' : undefined,
              transform: beat === 'rise' ? 'translateY(-10px) scale(1.04)' : 'none',
              transition: 'transform .5s cubic-bezier(.2,.7,.2,1)',
            }}>
              <Icon name="shirt" size={44} color={accent} />
            </div>
          ) : (
            <div style={{ animation: 'pack-flip .5s cubic-bezier(.2,.7,.2,1)' }}>
              <UltraCard player={pull.player} club={club} size="l" />
            </div>
          )}

          {done && (
            <div className="stack stagger" style={{ gap: 12, width: 'min(340px, 86vw)', textAlign: 'center' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{pull.player.name}</div>
                {standing && (
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--win)', marginTop: 5 }}>{standing}</div>
                )}
                <div className="row" style={{ gap: 7, justifyContent: 'center', marginTop: 7, flexWrap: 'wrap' }}>
                  <span className="chip" style={{ background: `${accent}22`, color: accent, fontWeight: 800 }}>
                    {RARITY_LABEL[pull.rarity]}
                  </span>
                  <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)' }}>
                    גיל <span className="num">{pull.player.age}</span>
                  </span>
                  {pull.upside >= 4 && (
                    <span className="chip" style={{ background: 'rgba(51,194,122,.16)', color: 'var(--win)', fontWeight: 800 }}>
                      יכול להגיע ל־<span className="num">{o + pull.upside}</span>
                    </span>
                  )}
                </div>
              </div>

              {squadFull && (
                <div className="tile" style={{ padding: '9px 12px', fontSize: 13.5, color: 'var(--ink-dim)' }}>
                  הסגל מלא, אפשר רק למכור אותו. תפנה מקום ותפתח חבילה חדשה.
                </div>
              )}

              <div className="row" style={{ gap: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={onSell}>
                  מכור · {formatMoney(pull.cashValue)}
                </button>
                <button className="btn" style={{ flex: 1.4 }} disabled={squadFull} onClick={onSign}>
                  צרף לסגל ‹
                </button>
              </div>
            </div>
          )}

          {!done && <div className="hint" style={{ color: 'var(--ink-faint)' }}>הקש לדילוג</div>}
        </div>
      </div>
    </Portal>
  );
}
