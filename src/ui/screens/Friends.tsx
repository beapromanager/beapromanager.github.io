import { useMemo, useState } from 'react';
import * as G from '../../game/state.ts';
import { FRIEND_TRAITS, friendLine, FRIEND_AGE } from '../../game/friends.ts';
import type { FriendSpec, FriendTraitId } from '../../game/friends.ts';
import type { Position } from '../../engine/matchEngine.ts';
import { Kit } from '../components/Kit.tsx';
import { homeKit } from '../../data/kits.ts';
import { Icon } from '../components/Icon.tsx';
import { Stepper } from '../components/Stepper.tsx';

/**
 * The two you bring with you.
 *
 * Everything else in the opening is a choice between things the game offers.
 * This is the one screen where the manager puts something of his own into the
 * save, and it has to look like it.
 *
 * Two shirts hang here from the first second, one being filled in and one
 * still empty, because that answers what the screen is without a sentence:
 * two places in the dressing room, two and no more. They are the anchor. The
 * name lands on the back as he types it, the quality and the shirt number
 * follow, and when the first man is done his shirt settles and the second one
 * lights up. Nothing else on the screen is allowed to compete with that, which
 * is why the presenter who used to open this step is gone: he was four lines
 * of a man talking before anybody knew what he was being asked.
 *
 * Not everybody wants to do this. The way out is on the first step, quietly,
 * and taking it is final: a career either started with them or it did not.
 */

const STAGES = ['name', 'trait', 'position'] as const;
type Stage = typeof STAGES[number];

/** The lines a manager picks from, grouped the way a team sheet is read. */
const LINES: { label: string; tone: string; picks: Position[] }[] = [
  { label: 'שוער', tone: 'var(--pos-gk)', picks: ['GK'] },
  { label: 'הגנה', tone: 'var(--pos-def)', picks: ['CB', 'LB', 'RB'] },
  { label: 'קישור', tone: 'var(--pos-mid)', picks: ['CDM', 'CM', 'CAM'] },
  { label: 'התקפה', tone: 'var(--pos-atk)', picks: ['LW', 'ST', 'RW'] },
];

const POS_NAME: Record<Position, string> = {
  GK: 'שוער', CB: 'בלם', LB: 'מגן שמאל', RB: 'מגן ימין',
  CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר התקפי',
  LW: 'כנף שמאל', ST: 'חלוץ', RW: 'כנף ימין',
};

/** What a half finished friend looks like while he is being decided. */
interface Draft {
  first: string;
  last: string;
  trait: FriendTraitId | null;
  position: Position | null;
}

const EMPTY: Draft = { first: '', last: '', trait: null, position: null };
const fullName = (d: Draft) => `${d.first.trim()} ${d.last.trim()}`.trim();
const done = (d: Draft) => !!(d.first.trim() && d.last.trim() && d.trait && d.position);
/** the two of them wear the shirts nobody wanted */
const SHIRT_NUMBER = [17, 24];

export function FriendsScreen({ gs, onDone }: { gs: G.GameState; onDone: (specs: FriendSpec[]) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([EMPTY, EMPTY]);
  const [who, setWho] = useState(0);
  const [stage, setStage] = useState<Stage>('name');
  const [texter, setTexter] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);

  const c = G.club(gs);
  const kit = useMemo(() => homeKit(c), [c]);
  const mgr = gs.profile.nickname || gs.profile.name || 'מאמן';
  const d = drafts[who];
  const set = (patch: Partial<Draft>) =>
    setDrafts(list => list.map((x, i) => (i === who ? { ...x, ...patch } : x)));

  const nameReady = d.first.trim().length >= 2 && d.last.trim().length >= 2;
  const ready = nameReady && !!d.trait && !!d.position;

  function next() {
    if (stage === 'name' && nameReady) return setStage('trait');
    if (stage === 'trait' && d.trait) return setStage('position');
    if (stage === 'position' && ready) {
      if (who === 0) { setWho(1); setStage('name'); return; }
      setAsking(true);
    }
  }

  function back() {
    if (asking) return setAsking(false);
    if (stage === 'position') return setStage('trait');
    if (stage === 'trait') return setStage('name');
    if (who === 1) { setWho(0); setStage('position'); }
  }

  function finish(pick: number) {
    onDone(drafts.map((x, i) => ({
      name: fullName(x), position: x.position!, trait: x.trait!, texter: i === pick,
    })));
  }

  /** the two shirts, the anchor of the whole screen */
  const Lockers = ({ size, active }: { size: number; active: number | null }) => (
    <div className="row" style={{ justifyContent: 'center', gap: size < 90 ? 14 : 22, position: 'relative' }}>
      {[0, 1].map(i => {
        const x = drafts[i];
        const lit = active === i;
        const filled = !!x.last.trim();
        return (
          <div key={i} className="stack" style={{ alignItems: 'center', gap: 6, flex: 'none' }}>
            <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              {lit && (
                <div aria-hidden="true" style={{
                  position: 'absolute', width: size * 1.5, height: size * 1.5, borderRadius: '50%',
                  background: 'radial-gradient(closest-side, rgba(233,185,73,.22), transparent 72%)',
                }} />
              )}
              <div style={{
                opacity: lit ? 1 : filled ? 0.72 : 0.3,
                filter: lit ? 'none' : 'saturate(.55)',
                transform: lit ? 'none' : 'scale(.92)',
                transition: 'opacity var(--t-mid) var(--ease), transform var(--t-mid) var(--ease), filter var(--t-mid)',
              }}>
                <Kit kit={kit} size={size}
                  back={{ name: x.last.trim(), number: SHIRT_NUMBER[i] }}
                  label={x.last.trim() ? `חולצת ${c.short} עם השם ${x.last.trim()}` : `חולצה פנויה ב${c.short}`} />
              </div>
            </div>
            <div style={{
              fontSize: size < 90 ? 12.5 : 14, fontWeight: 800, textAlign: 'center',
              color: lit ? 'var(--gold-hi)' : filled ? 'var(--ink-dim)' : 'var(--ink-faint)',
              maxWidth: size + 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fullName(x) || `חבר ${i + 1}`}
            </div>
            {size >= 90 && (
              <div className="hint" style={{ margin: 0, fontSize: 12 }}>
                {x.position ? POS_NAME[x.position] : lit ? '' : 'עדיין ריקה'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ------------------------------------------------- the question at the end */
  if (asking) {
    return (
      <div className="screen pad stack pad-b" style={{ gap: 16, minHeight: '100%', flex: 1 }}>
        <Stepper current={5} />
        <div>
          <span className="eyebrow">אחרון</span>
          <h1 className="h1" style={{ marginTop: 10 }}>מי מהשניים לא מפסיק לכתוב?</h1>
          <p className="sub">אחד מהם ישלח לך הודעות כל העונה. השני יגיד לך הכל פנים מול פנים.</p>
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'stretch', marginTop: 4 }}>
          {drafts.map((x, i) => (
            <button key={i} className="tile select" data-on={texter === i ? '1' : '0'}
              onClick={() => setTexter(i)}
              style={{
                flex: 1, padding: 14, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 9, background: 'transparent',
                borderColor: texter === i ? 'var(--gold)' : undefined,
                boxShadow: texter === i ? 'var(--glow-gold)' : undefined,
                animation: `riseIn .3s var(--ease-out) ${i * 0.06}s both`,
              }}>
              <Kit kit={kit} size={78} back={{ name: x.last.trim(), number: SHIRT_NUMBER[i] }} />
              <div style={{ fontWeight: 900, fontSize: 15.5, textAlign: 'center' }}>{fullName(x)}</div>
              <div className="hint" style={{ margin: 0, fontSize: 13 }}>{POS_NAME[x.position!]}</div>
              {texter === i && (
                <span className="chip" style={{ background: 'rgba(233,185,73,.16)', color: 'var(--gold)' }}>
                  <Icon name="mic" size={13} /> הוא זה
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="spacer" />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn dark btn-sm" onClick={back} style={{ flex: 'none', width: 'auto', padding: '11px 15px' }}>
            חזרה
          </button>
          <button className="btn" disabled={texter === null} onClick={() => finish(texter!)} style={{ flex: 1 }}>
            {texter === null ? 'תבחר אחד' : 'יוצאים לדרך'}
            {texter !== null && <Icon name="chevron" size={17} />}
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------- the three steps */
  const first = who === 0 && stage === 'name';
  return (
    <div className="screen pad stack pad-b" style={{ gap: 13, minHeight: '100%', flex: 1 }}>
      <Stepper current={5} />
      {stage === 'name' && <div className="spacer" />}

      <div style={{ marginTop: 2 }}>
        <span className="eyebrow">{who === 0 ? 'החבר הראשון' : 'החבר השני'}</span>
        <h1 className="h1" style={{ marginTop: 10, fontSize: first ? 'clamp(25px,6.6vw,32px)' : undefined }}>
          {stage === 'name'
            ? (who === 0 ? `${mgr}, קח איתך 2 חברים מהשכונה לסגל` : 'ועכשיו השני')
            : stage === 'trait' ? `מה כולם אומרים על ${d.first.trim()}?`
              : `איפה ${d.first.trim()} משחק?`}
        </h1>
        <p className="sub" style={{ marginTop: 7 }}>
          {stage === 'name' ? 'איתך עד הסוף.'
            : stage === 'trait' ? 'דבר אחד שהוא עושה טוב יותר מכולם, ומה זה עולה לך.'
              : 'החולצה שהוא לובש בפעם הראשונה, וכנראה גם בפעם המאה.'}
        </p>
      </div>

      {/* two shirts on the wall, one being filled in and one still waiting */}
      <div style={{ padding: stage === 'trait' ? '2px 0' : '6px 0 2px' }}>
        <Lockers size={stage === 'trait' ? 62 : stage === 'name' ? 132 : 112} active={who} />
      </div>

      {stage === 'name' && (
        <div className="tile-hero stack" style={{ gap: 13, padding: 15 }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="lbl" htmlFor="f-first">שם פרטי</label>
              <input id="f-first" className="field" value={d.first} autoFocus
                onChange={e => set({ first: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && nameReady) next(); }}
                placeholder="אורי" maxLength={14} autoComplete="off" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl" htmlFor="f-last">שם משפחה</label>
              <input id="f-last" className="field" value={d.last}
                onChange={e => set({ last: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && nameReady) next(); }}
                placeholder="כהן" maxLength={14} autoComplete="off" />
            </div>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            בן {FRIEND_AGE}, ובעוד כמה עונות הוא יכול להיות הכי טוב שיש לך.
          </p>
        </div>
      )}

      {stage === 'trait' && (
        <div className="stack" style={{ gap: 8 }}>
          {FRIEND_TRAITS.map((t, i) => {
            const on = d.trait === t.id;
            return (
              <button key={t.id} className="tile select" data-on={on ? '1' : '0'}
                onClick={() => set({ trait: t.id })}
                style={{
                  padding: '11px 13px', textAlign: 'start', background: 'transparent',
                  borderColor: on ? 'var(--gold)' : undefined,
                  boxShadow: on ? 'var(--glow-gold)' : undefined,
                  animation: `riseIn .26s var(--ease-out) ${i * 0.04}s both`,
                }}>
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span className="chip" style={{
                    background: on ? 'rgba(233,185,73,.2)' : 'var(--surface-3)',
                    color: on ? 'var(--gold)' : 'var(--ink)',
                  }}>{t.label}</span>
                  {on && <Icon name="target" size={15} color="var(--gold)" />}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: on ? 'var(--ink)' : 'var(--ink-dim)' }}>
                  {friendLine(t, d.first.trim())}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {stage === 'position' && (
        <div className="stack" style={{ gap: 10 }}>
          {LINES.map((line, li) => (
            <div key={line.label} className="stack" style={{ gap: 6, animation: `riseIn .26s var(--ease-out) ${li * 0.04}s both` }}>
              <span className="label-cap" style={{ color: line.tone }}>{line.label}</span>
              <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                {line.picks.map(p => {
                  const on = d.position === p;
                  return (
                    <button key={p} className="select" onClick={() => set({ position: p })}
                      style={{
                        flex: '1 1 30%', minHeight: 46, padding: '9px 6px',
                        borderRadius: 'var(--plate-sm)', fontWeight: 800, fontSize: 14.5,
                        background: on ? 'color-mix(in srgb, var(--tone) 22%, var(--surface))' : 'var(--surface)',
                        border: `1px solid ${on ? 'var(--tone)' : 'var(--line)'}`,
                        color: on ? 'var(--ink)' : 'var(--ink-dim)',
                        '--tone': line.tone,
                      } as React.CSSProperties}>
                      {POS_NAME[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="spacer" />

      <div className="row" style={{ gap: 10 }}>
        {(who > 0 || stage !== 'name') && (
          <button className="btn dark btn-sm" onClick={back} style={{ flex: 'none', width: 'auto', padding: '11px 15px' }}>
            חזרה
          </button>
        )}
        <button className="btn" style={{ flex: 1 }}
          disabled={stage === 'name' ? !nameReady : stage === 'trait' ? !d.trait : !ready}
          onClick={next}>
          {stage === 'name' ? (nameReady ? 'ממשיכים' : 'תכתוב שם ושם משפחה')
            : stage === 'trait' ? (d.trait ? 'ממשיכים' : 'תבחר אחת')
              : ready ? (who === 0 ? 'ועכשיו השני' : 'שניהם חתמו') : 'תבחר עמדה'}
          <Icon name="chevron" size={17} />
        </button>
      </div>

      {/* the way out, only at the very start, and taking it is final */}
      {first && (
        <button onClick={() => onDone([])}
          style={{
            background: 'transparent', border: 'none', color: 'var(--ink-faint)',
            fontSize: 14.5, fontWeight: 700, padding: '6px 0', textDecoration: 'underline',
            textUnderlineOffset: 4, minHeight: 44,
          }}>
          אני מתחיל בלי חברים
        </button>
      )}
    </div>
  );
}
