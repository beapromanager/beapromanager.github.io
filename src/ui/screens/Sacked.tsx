import * as G from '../../game/state.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { asset } from '../asset.ts';
import { FIX_SACKED_TEXT } from '../../data/fixingText.ts';

/**
 * The letter, and the box.
 *
 * The owner said the next defeat would end it, the defeat came, and this is
 * the corridor outside his office. It is deliberately quiet: no red flashing,
 * no exclamation marks. A chairman telling you the club cannot carry it any
 * more lands harder that way, and the numbers do the arguing.
 *
 * It is not the end of the career. The phone rings on the next screen.
 */
export function SackedScreen({ gs, onNext }: { gs: G.GameState; onNext: () => void }) {
  const s = gs.sacking!;
  const c = G.club(gs);
  if (s.reason === 'fixing') return <ClosedByTheFederation gs={gs} onNext={onNext} />;
  const money = (n: number) => `${n < 0 ? '-' : ''}₪${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      {/* the photograph is left alone: he is dead centre in it, and any caption
          laid over the top lands on his face */}
      <div className="sack-photo">
        <img src={asset('/sacked.webp')} alt="" />
        <div className="sack-shade" aria-hidden="true" />
      </div>

      <div className="row" style={{ gap: 11, marginTop: -4 }}>
        <Crest club={c} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label-cap" style={{ letterSpacing: '.14em' }}>{s.league}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1.2 }}>{s.club}</div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--loss)', lineHeight: 1 }}>
            פוטרת
          </div>
          <div className="sub" style={{ fontSize: 12.5, marginTop: 3, whiteSpace: 'nowrap' }}>
            עונה <span className="num">{s.season}</span> · מחזור <span className="num">{s.week}</span>
          </div>
        </div>
      </div>

      <div className="tile" style={{ padding: 15, lineHeight: 1.7, fontSize: 14.5 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold)', marginBottom: 7 }}>הבעלים</div>
        אמרתי לך שההפסד הבא הוא האחרון, ולא נעים לי שצדקתי.
        המועדון במינוס של {money(s.debt)}, ואני לא יכול יותר.
        <div style={{ height: 9 }} />
        קח את הדברים שלך מהמשרד. אני לא אומר עליך מילה רעה לאף אחד,
        ואם תשאל אותי בעוד שנתיים, אני עוד אצטער על היום הזה.
      </div>

      <div className="sack-figs">
        <Fig label="החוב" value={money(-s.debt)} tone="var(--loss)" />
        <Fig label="הגבול" value={money(s.limit)} />
        <Fig label="בטבלה" value={`${s.position}/${s.teams}`} />
      </div>

      <div className="spacer" />
      <button className="btn" onClick={onNext}>
        לצאת מהמשרד <Icon name="chevron" size={17} />
      </button>
    </div>
  );
}

function Fig({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: 3, flex: 1, minWidth: 0, ...({ '--fig': tone ?? 'var(--ink)' } as React.CSSProperties) }}>
      <span className="sack-fig">{value}</span>
      <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700 }}>{label}</span>
    </div>
  );
}

/** A club closed for a sold match: the letter from the federation, plain and cold. The way back is the bottom division. */
function ClosedByTheFederation({ gs, onNext }: { gs: G.GameState; onNext: () => void }) {
  const s = gs.sacking!;
  const c = G.club(gs);
  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      <div className="sack-photo">
        <img src={asset('/fix/caught.webp')} alt="" />
        <div className="sack-shade" aria-hidden="true" />
      </div>
      <div className="row" style={{ gap: 11, marginTop: -4 }}>
        <Crest club={c} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label-cap" style={{ letterSpacing: '.14em' }}>{s.league}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1.2 }}>{s.club}</div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--loss)', lineHeight: 1 }}>המועדון נסגר</div>
          <div className="sub" style={{ fontSize: 12.5, marginTop: 3, whiteSpace: 'nowrap' }}>
            עונה <span className="num">{s.season}</span> · מחזור <span className="num">{s.week}</span>
          </div>
        </div>
      </div>
      <div className="tile" style={{ padding: 15, lineHeight: 1.7, fontSize: 14.5 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold)', marginBottom: 7 }}>{FIX_SACKED_TEXT.title}</div>
        {FIX_SACKED_TEXT.body.split('\n').map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div className="stack" style={{ alignItems: 'center', gap: 3 }}>
        <span className="sack-fig" style={{ ['--fig' as string]: 'var(--loss)', textAlign: 'center' }}>{FIX_SACKED_TEXT.figure}</span>
      </div>
      <div className="spacer" />
      <button className="btn" onClick={onNext}>
        לצאת מהמשרד <Icon name="chevron" size={17} />
      </button>
    </div>
  );
}
