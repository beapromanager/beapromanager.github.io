import { useEffect, useState } from 'react';
import * as G from '../../game/state.ts';
import { Kit } from '../components/Kit.tsx';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { seasonLabel } from '../../data/seasonKit.ts';
import type { SeasonKit } from '../../data/seasonKit.ts';
import { LEAGUE_NAMES } from '../../data/clubs.ts';
import { asset } from '../asset.ts';

/**
 * The kit launch.
 *
 * Every summer a real club puts out a shirt, and the moment that makes people
 * care is not the shirt on its own: it is the shirt held up next to last year's,
 * because that is when you can see what changed and why. So that is the whole
 * screen. Last season's on the right, where the past sits in Hebrew, this
 * season's swinging in beside it, and one line saying what the club did to earn
 * the difference.
 *
 * Staged with timers rather than CSS delays, the same way the round turn is,
 * so the reveal is driven by state that is actually there in the DOM at each
 * step and is not at the mercy of a compositor.
 */
export function KitReveal({ gs, onDone }: { gs: G.GameState; onDone: () => void }) {
  const kit = gs.kitReveal!;
  const old = G.previousKit(gs);
  const c = G.club(gs);
  const champion = kit.reason === 'champion';

  // 0 last season's shirt alone · 1 the new one arrives · 2 its name · 3 the way on
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = [700, 1150, 1650].map((ms, i) => setTimeout(() => setStep(s => Math.max(s, i + 1)), ms));
    return () => t.forEach(clearTimeout);
  }, []);

  // tapping anywhere skips straight to the end, because nobody should have to
  // sit through a reveal twice
  const skip = () => (step < 3 ? setStep(3) : onDone());

  return (
    <div className="screen pad stack pad-b kit-reveal"
      onClick={skip} data-champion={champion ? '1' : undefined}>
      <div className="row" style={{ marginTop: 4, gap: 11 }}>
        <Crest club={c} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h2">מדי העונה</div>
          <div className="sub" style={{ fontSize: 13.5 }}>
            {c.short} · {LEAGUE_NAMES[c.tier]} · <span className="num">{seasonLabel(kit.season)}</span>
          </div>
        </div>
      </div>

      <div className="tile-hero kit-stage">
        {/* the launch event itself, bleeding into the top of the case. The shirt
            below is the one that came out of that room, which is the only reason
            a photograph belongs on this screen at all */}
        <div className="kit-launch">
          <img src={asset('/ultraskit.webp')} alt="" width={1600} height={893} />
        </div>

        <div className="kit-pair">
          {old && (
            <figure className="kit-slot kit-old">
              <Kit kit={old} size={100} label={`המדים של ${seasonLabel(old.season)}`} />
              <figcaption>
                <span className="kit-cap">עונה שעברה</span>
                <span className="num kit-year">{seasonLabel(old.season)}</span>
              </figcaption>
            </figure>
          )}

          <div className="kit-arrow" data-in={step >= 1 ? '1' : '0'} aria-hidden="true">
            <Icon name="chevron" size={18} />
          </div>

          <figure className="kit-slot kit-new" data-in={step >= 1 ? '1' : '0'}>
            <div className="kit-halo" aria-hidden="true" />
            {champion && (
              <span className="kit-crown"><Icon name="trophy" size={12} /> אלופים</span>
            )}
            <Kit kit={kit} size={140} label={`המדים החדשים של ${c.short}`} />
            <figcaption>
              <span className="kit-cap kit-cap-new">חדש</span>
              <span className="num kit-year">{seasonLabel(kit.season)}</span>
            </figcaption>
          </figure>
        </div>

        <div className="kit-title" data-in={step >= 2 ? '1' : '0'}>
          <div className="kit-name" style={champion ? { color: 'var(--gold-hi)' } : undefined}>
            {kit.name}
          </div>
          <div className="kit-note">{kit.note}</div>
        </div>

        <div className="kit-swatches" data-in={step >= 2 ? '1' : '0'}>
          <Swatch hex={kit.shirt} name="גוף" />
          <Swatch hex={kit.trim} name={champion ? 'זהב' : 'עיטור'} />
          <span className="chip kit-chip">{PATTERN_HE[kit.pattern]}</span>
        </div>
      </div>

      <button className="btn" data-in={step >= 3 ? '1' : '0'} disabled={step < 3}
        style={{ opacity: step >= 3 ? 1 : 0, transition: 'opacity .3s ease' }}
        onClick={e => { e.stopPropagation(); onDone(); }}>
        לובשים את זה
      </button>

      <p className="hint">
        הצבע של {c.short} לא משתנה לעולם. מה שמשתנה זה הגזרה, ומה שהיא מספרת
        על העונה שעברה.
      </p>
    </div>
  );
}

function Swatch({ hex, name }: { hex: string; name: string }) {
  return (
    <span className="chip kit-chip">
      <i className="kit-dot" style={{ background: hex }} aria-hidden="true" />
      {name}
    </span>
  );
}

const PATTERN_HE: Record<SeasonKit['pattern'], string> = {
  solid: 'חלק',
  stripes: 'פסים',
  hoops: 'טבעות',
  sash: 'אלכסון',
  half: 'חצוי',
};
