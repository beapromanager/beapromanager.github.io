import { useState } from 'react';
import * as G from '../../game/state.ts';
import { ROUND_NAMES } from '../../game/cup.ts';
import { asset } from '../asset.ts';
import { useAssetsReady } from '../assetReady.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';

/** the cup's own draw-bowl backdrop (21.10); shown only once confirmed real */
export const CUP_DRAW_BG = asset('/moments/cup/draw.webp');

/**
 * The cup draw, from the manager's seat. Itzik's note of 20.10: the draw has
 * to be interesting, a gradual reveal with real tension, not just a list.
 *
 * Europe's own draw (EuroDraw.tsx) pulls one ball at a time on a flat 900ms
 * timer. This one builds instead: the moment the NEXT ball in the bowl is
 * the manager's own tie, the bowl is told ahead of the pull (`nextIsMine`)
 * and holds on a bracing beat — the border and the ball itself pulse amber —
 * before the pairing shows, so his own name never lands as flatly as a
 * stranger's two names would. Every other ball still pulls on the ordinary
 * timer underneath it.
 *
 * The draw itself was made in the summer (or, for the staged entrant who
 * joins at the quarter, right after the pre-bracket is decided — see
 * cupDrawDue in state.ts, which is owed again at that exact moment) and lives in the save;
 * this screen only reveals it, one tie at a time, and never changes it. A
 * reload shows the same ties in the same order, same as Europe's.
 */
export function CupDrawScreen({ gs, onDone }: { gs: G.GameState; onDone: () => void }) {
  const round = gs.cup?.round ?? 0;
  const ties = gs.cup?.ties[round] ?? [];
  const [shown, setShown] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [bracing, setBracing] = useState(false);
  const me = G.club(gs);
  const clubOf = (id: string) => (id === gs.clubId ? me : G.cupClub(gs, id));
  const done = shown >= ties.length;
  const nextIsMine = !!ties[shown] && (ties[shown].a === gs.clubId || ties[shown].b === gs.clubId);
  const title = round === 0 ? `הגרלת ${ROUND_NAMES[0]}` : `הגרלת ${ROUND_NAMES[round]}`;
  const bgReady = useAssetsReady([CUP_DRAW_BG]);
  const bg = bgReady[CUP_DRAW_BG] ? CUP_DRAW_BG : null;

  const pull = () => {
    if (rolling || done) return;
    setRolling(true);
    if (nextIsMine) {
      window.setTimeout(() => {
        setBracing(true);
        window.setTimeout(() => { setBracing(false); setShown(s => s + 1); setRolling(false); }, 1000);
      }, 900);
    } else {
      window.setTimeout(() => { setShown(s => s + 1); setRolling(false); }, 650);
    }
  };

  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      <div className="match-hero" data-cup="1"
        style={bg ? { backgroundImage: `linear-gradient(165deg, rgba(49,32,21,.55), rgba(20,12,7,.88)), url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="label-cap" style={{ color: 'var(--cup, #D98A3D)' }}>גביע המדינה</span>
          <span className="chip chip-cup">{title}</span>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {done ? 'ההגרלה הושלמה.' : bracing ? 'הכדור הבא... זה אתם.' : round === 0 ? 'שישה עשר כדורים בקערה. לוחצים ומושכים.' : 'הקערה נפתחת שוב, אחרי השמינית.'}
        </p>
      </div>

      {!done && (
        <button className="eu-bowl" data-brace={bracing ? '1' : '0'} onClick={pull} disabled={rolling} aria-label="מושכים כדור">
          <span className="eu-ball" data-rolling={rolling && !bracing ? '1' : '0'} aria-hidden="true" />
          <span className="eu-bowl-word">{bracing ? 'מתח בקערה...' : rolling ? 'הכדור יוצא...' : `למשוך כדור (${ties.length - shown} זוגות נותרו)`}</span>
        </button>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {ties.slice(0, shown).map((t, i) => {
          const mine = t.a === gs.clubId || t.b === gs.clubId;
          const a = clubOf(t.a), b = clubOf(t.b);
          return (
            <div key={i} className="eu-tie" data-mine={mine ? '1' : '0'} style={{ ['--i' as never]: i } as React.CSSProperties}>
              <div className="eu-tie-side"><Crest club={a} size={34} /><span>{a.short}</span></div>
              <span className="eu-tie-vs">{mine ? 'אתם' : 'נגד'}</span>
              <div className="eu-tie-side"><Crest club={b} size={34} /><span>{b.short}</span></div>
            </div>
          );
        })}
      </div>

      {done ? (
        <button className="btn" onClick={onDone}>לעץ הגביע <Icon name="chevron" size={17} /></button>
      ) : (
        <button className="btn dark" onClick={onDone}>דלג על ההגרלה</button>
      )}
    </div>
  );
}
