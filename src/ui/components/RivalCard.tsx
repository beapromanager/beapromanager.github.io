import { useEffect, useRef } from 'react';
import { euroClub, asClub } from '../../data/europeClubs.ts';
import { POS_HE } from '../../data/academyText.ts';
import type { Position } from '../../engine/matchEngine.ts';
import { Crest } from './Crest.tsx';
import { Portal } from './Portal.tsx';

/**
 * One second in gold before a summit night (R4): their crest, how strong the eleven the engine made tonight really
 * is, their best man on the sheet, and his chance to win the match. The chance is counted by the engine itself
 * (summitOdds) and arrives from a worker; if it has not arrived yet the card says so rather than invent a number.
 * A tap cuts early; under reduced motion it stands still for the same second.
 */
export const RIVAL_CARD_MS = 1000;

export function RivalCard({ oppId, rating, keyMan, chance, rivalry, onDone }: {
  oppId: string; rating: number;
  keyMan: { name: string; position: string; ovr: number } | null;
  /** whole percent, rounded to 5; null while it is still being counted */
  chance: number | null;
  /** one line of history (R10), only after a meeting before; none yet */
  rivalry?: string | null;
  onDone: () => void;
}) {
  const ended = useRef(false);
  const end = () => { if (!ended.current) { ended.current = true; onDone(); } };
  useEffect(() => {
    const t = window.setTimeout(end, RIVAL_CARD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const c = euroClub(oppId);
  if (!c) return null;
  return (
    <Portal>
      <div className="el-rival-veil" data-summit="1" onClick={end} role="presentation" data-testid="rival-card">
        <div className="el-rival">
          <div className="el-kicker">היריבה הלילה</div>
          <Crest club={asClub(c)} size={92} />
          <div className="el-title el-foil-text" style={{ fontSize: 24 }}>{c.name}</div>
          <div className="el-rival-facts">
            <div><span className="el-rival-label">כוח הסגל</span><b className="num">{rating}</b></div>
            <div><span className="el-rival-label">סיכוי לניצחון</span><b className="num">{chance === null ? 'נספר' : `${chance}%`}</b></div>
          </div>
          {keyMan && (
            <div className="el-rival-key">
              <span className="el-rival-label">שחקן מפתח</span>
              <span>{keyMan.name} · {POS_HE[keyMan.position as Position] ?? keyMan.position} · <span className="num">{keyMan.ovr}</span></span>
            </div>
          )}
          {rivalry && <div className="el-rival-history">{rivalry}</div>}
        </div>
      </div>
    </Portal>
  );
}
