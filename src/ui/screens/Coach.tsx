import { TopBack } from '../components/TopBack.tsx';
import * as G from '../../game/state.ts';
import { getManager, TRAINING_KEYS, MENTAL_KEYS, ATTR_HINT, ATTR_LABEL } from '../../data/managers.ts';
import { LICENCES, licence, licenceRank, requiredLicence, coachRating, ratingBreakdown, standingName } from '../../game/coach.ts';
import { LEAGUE_NAMES } from '../../data/clubs.ts';
import { Icon } from '../components/Icon.tsx';
import { Meters, formatMoney } from '../components/bits.tsx';
import { AttrGroup } from './Archetype.tsx';
import type { Coach } from '../../game/coach.ts';

/**
 * Your own coaching CV. The badges are a ladder you climb across a career, and
 * this is where you see how far up it you are and what the next rung demands.
 */
export function CoachScreen({ gs, onBack, onReport }: { gs: G.GameState; onBack: () => void; onReport: () => void }) {
  const c = gs.coach;
  const m = getManager(c.archetype);
  const held = licenceRank(c.licence);
  const tier = G.club(gs).tier;
  const needed = requiredLicence(tier);

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 13 }}>
        <TopBack onBack={onBack} />
        {/* who you are */}
        <div className="tile-hero" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 13 }}>
            <div className="coach-guide-vid" style={{ width: 74, height: 74 }} aria-hidden="true">
              <video src={`${import.meta.env.BASE_URL}coach/guide.mp4`} autoPlay muted loop playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="h2" style={{ fontSize: 22, lineHeight: 1.1 }}>
                {gs.profile.name}{gs.profile.nickname ? ` "${gs.profile.nickname}"` : ''}
              </div>
              <div className="sub" style={{ fontSize: 13.5, marginTop: 3 }}>{m.name} · {licence(c.licence).name}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold-hi)', marginTop: 4 }}>
                {standingName(coachRating(c))}
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 'none' }}>
              <div className="score-face num" style={{ fontSize: 38, color: 'var(--gold-hi)', lineHeight: 1 }}>{coachRating(c)}</div>
              <div className="sub" style={{ fontSize: 11.5 }}>מתוך <span className="num">100</span></div>
            </div>
          </div>
          <div className="row" style={{ gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: 'rgba(233,185,73,.14)', color: 'var(--gold)' }}>
              עונות <span className="num">{c.seasons}</span>
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)' }}>
              {LEAGUE_NAMES[tier]}
            </span>
            {c.promotions > 0 && (
              <span className="chip" style={{ background: 'rgba(51,194,122,.14)', color: 'var(--win)' }}>
                עליות <span className="num">{c.promotions}</span>
              </span>
            )}
            {c.titles > 0 && (
              <span className="chip" style={{ background: 'rgba(233,185,73,.2)', color: 'var(--gold-hi)' }}>
                אליפויות <span className="num">{c.titles}</span>
              </span>
            )}
          </div>
        </div>

        {/* where the standing comes from, so it is a target and not a mystery */}
        <StandingCard coach={c} />

        {/* the two groups of ability */}
        <div className="tile" style={{ padding: '13px 14px' }}>
          <AttrGroup title="אימון" keys={TRAINING_KEYS} attrs={c.attrs} color="var(--gold)" />
          <div style={{ height: 12 }} />
          <AttrGroup title="מנטלי" keys={MENTAL_KEYS} attrs={c.attrs} color="var(--sky)" />
        </div>

        {/* what each one actually does, so the numbers are not decoration */}
        <div className="tile" style={{ padding: '12px 14px' }}>
          <div className="label-cap" style={{ marginBottom: 8 }}>מה כל נתון עושה</div>
          <div className="stack" style={{ gap: 7 }}>
            {[...TRAINING_KEYS, ...MENTAL_KEYS].map(k => (
              <div key={k} style={{ fontSize: 13, lineHeight: 1.45 }}>
                <b style={{ color: 'var(--ink)' }}>{ATTR_LABEL[k]}</b>
                <span style={{ color: 'var(--ink-dim)' }}> · {ATTR_HINT[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* the ladder */}
        <div className="label-cap">הרישיונות</div>
        <div className="stack" style={{ gap: 9 }}>
          {LICENCES.map((l, i) => {
            const done = i <= held;
            const isNext = i === held + 1;
            const blocking = l.id === needed && i > held;
            return (
              <div key={l.id} className="tile" style={{
                padding: '12px 13px',
                borderColor: blocking ? 'color-mix(in srgb, var(--loss) 45%, transparent)'
                  : done ? 'color-mix(in srgb, var(--win) 34%, transparent)' : undefined,
                opacity: done || isNext || blocking ? 1 : .55,
              }}>
                <div className="row" style={{ gap: 10 }}>
                  <Icon name={done ? 'trophy' : 'clipboard'} size={17}
                    color={done ? 'var(--win)' : blocking ? 'var(--loss)' : 'var(--ink-faint)'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5 }}>{l.name}</div>
                    <div className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>{l.blurb}</div>
                  </div>
                  {done
                    ? <span className="chip" style={{ background: 'rgba(51,194,122,.16)', color: 'var(--win)' }}>הושג</span>
                    : <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)' }}>{formatMoney(l.cost)}</span>}
                </div>
                {blocking && (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--loss)', marginTop: 7 }}>
                    חובה כדי לפתוח עונה ב{LEAGUE_NAMES[tier]}. הקורס מחכה לך בקיץ.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="hint">קורסים נלמדים בפרה־סיזן בלבד, בין העונות.</p>

        <div className="tile" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert" size={18} color="var(--gold)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>משהו לא עובד?</div>
            <div className="hint" style={{ margin: 0 }}>דווח לנו, זה מגיע ישר אלינו.</div>
          </div>
          <button className="btn dark btn-sm" onClick={onReport}>דווח על תקלה</button>
        </div>

        <div className="spacer" />
        <button className="btn dark" onClick={onBack}>חזרה ›</button>
      </div>
    </>
  );
}

/**
 * What the standing is made of.
 *
 * A number nobody can explain is a number nobody chases, so every term is on
 * screen with what it is worth and how much of it he has. It doubles as a
 * lesson: a manager looking at twenty five points sitting in "the highest
 * division you have managed" knows exactly what the next season is for.
 */
function StandingCard({ coach }: { coach: Coach }) {
  const b = ratingBreakdown(coach);
  return (
    <div className="tile" style={{ padding: '13px 14px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="label-cap">מה בונה את הדירוג</span>
        <span className="sub" style={{ fontSize: 12.5 }}>
          <span className="num">{b.rating}</span> מתוך <span className="num">100</span>
        </span>
      </div>
      <div className="stack" style={{ gap: 9 }}>
        {b.parts.map(part => (
          <div key={part.key}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-dim)' }}>{part.label}</span>
              <span className="num" style={{ fontSize: 13, fontWeight: 800, color: part.got >= part.of ? 'var(--win)' : 'var(--ink-faint)' }}>
                {part.got}/{part.of}
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.round((part.got / part.of) * 100)}%`,
                background: part.got >= part.of ? 'var(--win)' : 'linear-gradient(90deg,var(--gold),var(--gold-hi))',
                borderRadius: 3,
              }} />
            </div>
          </div>
        ))}
      </div>
      <p className="hint" style={{ margin: '11px 0 0' }}>
        הדירוג לא נגזר מהתכונות שלך. הוא נבנה ממה שעשית: כמה גבוה אימנת, מה לקחת, כמה עונות עברת, ואיזו תעודה בידך.
      </p>
    </div>
  );
}
