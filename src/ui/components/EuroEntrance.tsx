import { useEffect, useState } from 'react';
import type { Club } from '../../data/clubs.ts';
import { Crest } from './Crest.tsx';

/**
 * The beat before a European kickoff: the two crests face each other across
 * the screen, the way a fighting game shows its two fighters, with the round,
 * the two towns and the ground between them. Itzik's note: the crests have to
 * look WOW in the match itself, one against the other.
 *
 * A beat and not a screen, like the flares: it arrives on its own, holds for
 * ENTRANCE_BEAT, leaves on its own, and a tap anywhere ends it early. Motion
 * is CSS so prefers-reduced-motion is honoured in one place.
 */
export const ENTRANCE_BEAT = 4600;
const ENTRANCE_OUT = 480;

export interface EntranceLines {
  /** the round, "שמינית הגמר" */
  round: string;
  /** which leg, "משחק ראשון" / "המשחק החוזר" / "הגמר" */
  leg: string;
  /** home town and country, "ראש העין, ישראל" */
  homePlace: string;
  awayPlace: string;
  /** where it is played: his town in Israel, their town in their country, or neutral ground */
  venue: string;
}

export function EuroEntrance({ home, away, lines, onDone }: { home: Club; away: Club; lines: EntranceLines; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), ENTRANCE_BEAT - ENTRANCE_OUT);
    const end = window.setTimeout(onDone, ENTRANCE_BEAT);
    return () => { window.clearTimeout(out); window.clearTimeout(end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="eu-entrance" data-leaving={leaving ? '1' : '0'} onClick={onDone} role="presentation">
      <div className="eu-entrance-light eu-entrance-light-a" aria-hidden="true" />
      <div className="eu-entrance-light eu-entrance-light-b" aria-hidden="true" />
      <div className="eu-entrance-round">
        <span className="chip chip-euro">{lines.round}</span>
        <span className="eu-entrance-leg">{lines.leg}</span>
      </div>
      <div className="eu-entrance-face">
        <div className="eu-entrance-side eu-entrance-home">
          <Crest club={home} size={118} />
          <b className="eu-entrance-name">{home.name}</b>
          <span className="eu-entrance-place">{lines.homePlace}</span>
        </div>
        <div className="eu-entrance-vs" aria-hidden="true">
          <span>VS</span>
        </div>
        <div className="eu-entrance-side eu-entrance-away">
          <Crest club={away} size={118} />
          <b className="eu-entrance-name">{away.name}</b>
          <span className="eu-entrance-place">{lines.awayPlace}</span>
        </div>
      </div>
      <div className="eu-entrance-venue">{lines.venue}</div>
      <div className="eu-entrance-skip">לחיצה מדלגת</div>
    </div>
  );
}
