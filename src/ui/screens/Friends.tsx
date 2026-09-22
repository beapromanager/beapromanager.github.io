import { useMemo, useState } from 'react';
import * as G from '../../game/state.ts';
import { FRIEND_TRAITS, friendLine, FRIEND_AGE } from '../../game/friends.ts';
import type { FriendSpec, FriendTraitId } from '../../game/friends.ts';
import type { Position } from '../../engine/matchEngine.ts';
import { Kit } from '../components/Kit.tsx';
import { homeKit } from '../../data/kits.ts';
import { Icon } from '../components/Icon.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { CoachGuide } from '../components/CoachGuide.tsx';

/**
 * The two you bring with you.
 *
 * Everything else in the opening is a choice between things the game offers.
 * This is the one screen where the manager puts something of his own into the
 * save, and it has to feel like it: a name he types, a quality he argues about
 * with himself, a shirt number. So the whole screen is built around one image,
 * his club's shirt with his friend's surname printed on the back, which fills
 * in as he decides and is the thing he will screenshot.
 *
 * Three decisions a man, then one question about the pair of them. Nothing is
 * asked twice and nothing is asked before it can be answered: the qualities
 * read with his name already in them, because a line about somebody with no
 * name is a line about nobody.
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

  /* ------------------------------------------------- the question at the end */
  if (asking) {
    return (
      <div className="screen pad stack pad-b" style={{ gap: 16 }}>
        <Stepper current={5} />
        <CoachGuide who="coach" text="שניהם חתמו. רק תגיד לי דבר אחד לפני שאני סוגר את התיק." />
        <div>
          <span className="eyebrow">אחרון</span>
          <h1 className="h1" style={{ marginTop: 10 }}>מי מהשניים לא מפסיק לכתוב?</h1>
          <p className="sub">אחד מהם ישלח לך הודעות כל העונה. השני יגיד לך הכל פנים מול פנים.</p>
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
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
              <Kit kit={kit} size={72} back={{ name: x.last.trim(), number: SHIRT_NUMBER[i] }} />
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
  return (
    <div className="screen pad stack pad-b" style={{ gap: 14 }}>
      <Stepper current={5} />
      {who === 0 && stage === 'name' && (
        <CoachGuide who="coach" text={`שמעתי שאתה מביא שניים מהבית. ${c.short} תמיד לקחה מקומיים, רק אל תצפה שהם יהיו מוכנים מהיום הראשון.`} />
      )}

      <div>
        <span className="eyebrow">{who === 0 ? 'החבר הראשון' : 'החבר השני'}</span>
        <h1 className="h1" style={{ marginTop: 9 }}>
          {stage === 'name' ? 'מי בא איתך?'
            : stage === 'trait' ? `מה כולם אומרים על ${d.first.trim()}?`
              : `איפה ${d.first.trim()} משחק?`}
        </h1>
        <p className="sub">
          {stage === 'name' ? `בן ${FRIEND_AGE}, מהשכונה, והכי גרוע בסגל ביום שהוא נכנס. מה שיקרה לו אחר כך תלוי רק בך.`
            : stage === 'trait' ? 'דבר אחד שהוא עושה טוב יותר מכולם, ומה זה עולה לך.'
              : 'החולצה שהוא לובש בפעם הראשונה, וכנראה גם בפעם המאה.'}
        </p>
      </div>

      {/* the shirt, which is the whole point of the screen */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: stage === 'trait' ? '0' : '4px 0 2px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: '-10% 20% 10%', borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(233,185,73,.16), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div key={`${who}-${d.last.trim()}`} style={{ animation: 'riseIn var(--t-slow) var(--ease-out) both' }}>
          <Kit kit={kit} size={stage === 'trait' ? 84 : 126}
            back={{ name: d.last.trim() || '', number: SHIRT_NUMBER[who] }}
            label={d.last.trim() ? `חולצת ${c.short} עם השם ${d.last.trim()}` : `חולצת ${c.short}`} />
        </div>
      </div>

      {stage === 'name' && (
        <div className="tile-hero stack" style={{ gap: 14, padding: 16 }}>
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
          <p className="hint" style={{ margin: 0 }}>שם המשפחה הוא מה שמודפס על הגב, ומה שהפרשן יצעק.</p>
        </div>
      )}

      {stage === 'trait' && (
        <div className="stack" style={{ gap: 9 }}>
          {FRIEND_TRAITS.map((t, i) => {
            const on = d.trait === t.id;
            return (
              <button key={t.id} className="tile select" data-on={on ? '1' : '0'}
                onClick={() => set({ trait: t.id })}
                style={{
                  padding: 13, textAlign: 'start', background: 'transparent',
                  borderColor: on ? 'var(--gold)' : undefined,
                  boxShadow: on ? 'var(--glow-gold)' : undefined,
                  animation: `riseIn .26s var(--ease-out) ${i * 0.04}s both`,
                }}>
                <div className="row" style={{ gap: 8, marginBottom: 5 }}>
                  <span className="chip" style={{
                    background: on ? 'rgba(233,185,73,.2)' : 'var(--surface-3)',
                    color: on ? 'var(--gold)' : 'var(--ink)',
                  }}>{t.label}</span>
                  {on && <Icon name="target" size={15} color="var(--gold)" />}
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.55, color: on ? 'var(--ink)' : 'var(--ink-dim)' }}>
                  {friendLine(t, d.first.trim())}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {stage === 'position' && (
        <div className="stack" style={{ gap: 11 }}>
          {LINES.map((line, li) => (
            <div key={line.label} className="stack" style={{ gap: 7, animation: `riseIn .26s var(--ease-out) ${li * 0.04}s both` }}>
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

      {/* what he is, so far, in one line */}
      {(d.trait || d.position) && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {d.trait && (
            <span className="pill" style={{ background: 'var(--surface-2)', color: 'var(--ink-dim)', border: '1px solid var(--line)' }}>
              {FRIEND_TRAITS.find(t => t.id === d.trait)!.label}
            </span>
          )}
          {d.position && (
            <span className="pill" style={{ background: 'var(--surface-2)', color: 'var(--ink-dim)', border: '1px solid var(--line)' }}>
              {POS_NAME[d.position]}
            </span>
          )}
          <span className="pill num" style={{ background: 'var(--surface-2)', color: 'var(--ink-dim)', border: '1px solid var(--line)' }}>
            {FRIEND_AGE}
          </span>
        </div>
      )}

      <div className="row" style={{ gap: 10 }}>
        {(who > 0 || stage !== 'name') && (
          <button className="btn dark btn-sm" onClick={back} style={{ flex: 'none', width: 'auto', padding: '11px 15px' }}>
            חזרה
          </button>
        )}
        <button className="btn" style={{ flex: 1 }}
          disabled={stage === 'name' ? !nameReady : stage === 'trait' ? !d.trait : !ready}
          onClick={next}>
          {stage === 'name' ? (nameReady ? 'ממשיכים' : 'שם פרטי ושם משפחה')
            : stage === 'trait' ? (d.trait ? 'ממשיכים' : 'תבחר אחת')
              : ready ? (who === 0 ? 'ועכשיו השני' : 'שניהם חתמו') : 'תבחר עמדה'}
          <Icon name="chevron" size={17} />
        </button>
      </div>
    </div>
  );
}
