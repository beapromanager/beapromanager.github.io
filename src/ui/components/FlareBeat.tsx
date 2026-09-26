import { useEffect, useState } from 'react';
import type { FlareReason } from '../../game/state.ts';

/**
 * The flares, the beat before kickoff on the four nights that are not ordinary.
 *
 * A beat and not a screen. It arrives on its own, holds for FLARE_BEAT, and
 * leaves on its own, because the way from the hub to a first ball was six taps
 * and is now three, and buying atmosphere back with a seventh tap would be a bad
 * trade. A tap anywhere ends it early for anyone who does not want it.
 *
 * It says nothing about how to play. The scout already gave the advice two
 * screens ago and the terrace already gave its opinion, in those words, so a
 * third voice repeating either of them is the thing that made the old corridor
 * feel padded. This only names the night.
 *
 * The photograph is not here yet, by design: Itzik and I are making it next, and
 * one picture serves all four nights with the headline doing the rest. Until it
 * lands the terrace is lit by the gradients in tokens.css, which is the same red
 * glow the picture will sit inside, so dropping it in changes one rule.
 *
 * Motion is CSS, so prefers-reduced-motion is honoured in one place rather than
 * being re-decided in JS: the flicker and the drift stop, the beat still passes.
 */

/** How long the terrace holds, matched to the reporter's reply beat. */
export const FLARE_BEAT = 2200;

/** How long the fade out takes, inside the beat rather than added to it. */
const FLARE_OUT = 420;

/**
 * PLACEHOLDER WORDS. Itzik writes these; these are drafts to react to and not
 * approved copy. No long dashes anywhere, here or in what replaces them.
 */
const SAID: Record<FlareReason, { title: string; line: string }> = {
  opener:     { title: 'העונה נפתחת',   line: 'היציע חיכה לזה כל הקיץ.' },
  derby:      { title: 'דרבי',          line: 'הערב העיר מחולקת לשניים.' },
  promotion:  { title: 'משחק עלייה',    line: 'תשעים דקות בין הליגה הזאת לליגה הבאה.' },
  relegation: { title: 'משחק הישרדות',  line: 'תשעים דקות שיחליטו אם נשארים בליגה.' },
};

export function FlareBeat({ reason, onDone }: { reason: FlareReason; onDone: () => void }) {
  const said = SAID[reason];
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), FLARE_BEAT - FLARE_OUT);
    const end = window.setTimeout(onDone, FLARE_BEAT);
    return () => { window.clearTimeout(out); window.clearTimeout(end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flare-beat" data-leaving={leaving ? '1' : '0'}
      onClick={onDone} role="img" aria-label={`${said.title}. ${said.line}`}>
      {/* the terrace: two mouths of light coming up from below, the way a stand
          looks from the touchline when the flares go up in it */}
      <div className="flare-glow flare-glow-a" aria-hidden="true" />
      <div className="flare-glow flare-glow-b" aria-hidden="true" />
      {/* smoke drifting across the light, which is what actually sells it */}
      <div className="flare-smoke" aria-hidden="true" />
      <div className="flare-vignette" aria-hidden="true" />

      <div className="flare-say">
        <div className="flare-title">{said.title}</div>
        <div className="flare-line">{said.line}</div>
      </div>
    </div>
  );
}
