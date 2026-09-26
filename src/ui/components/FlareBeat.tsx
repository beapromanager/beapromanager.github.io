import { useEffect, useState } from 'react';
import type { FlareReason } from '../../game/state.ts';
import { asset } from '../asset.ts';

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
 * THE PICTURE. Opening day has its own, shot from the touchline looking at the
 * crowd through the fence. It is framed close on purpose: the smoke swallows
 * everything past the first rank, so there is no way to count the people in it.
 * That matters more than it sounds, because the opening match of a career draws
 * THIRTY ONE, into a ground that holds fifty, and the same photograph has to
 * still be true in ליגת העל, where the town turns out sixteen thousand. A wide
 * shot of a full bowl would be a lie in season one and a lie in the direction
 * that matters, since round one of season one is when most people ever see it.
 * The other three nights have no picture yet and are carried by the light alone.
 *
 * Motion is CSS, so prefers-reduced-motion is honoured in one place rather than
 * being re-decided in JS: the flicker and the drift stop, the beat still passes.
 */

/** How long the terrace holds, matched to the reporter's reply beat. */
export const FLARE_BEAT = 2200;

/** How long the fade out takes, inside the beat rather than added to it. */
const FLARE_OUT = 420;

/**
 * The photograph for each night, where there is one.
 *
 * Opening day is shot; the derby and the two nights the season comes down to
 * are still to be made, and until they are those three run on light alone
 * rather than borrowing a picture that says the wrong thing.
 */
const PHOTO: Partial<Record<FlareReason, string>> = {
  opener: asset('/flares/opener.webp'),
};

/**
 * Where the type sits, as a share of the screen's height.
 *
 * Measured off the photograph rather than chosen: the band under the raised
 * arms, where the fence is, runs at a luminance of 21 to 28 out of 255, while
 * the flares above it reach 138. White type at the middle of the screen would
 * have sat half on the brightest part of the frame. Down here it sits on very
 * nearly black and needs nothing done to the picture to be legible.
 */
const SAY_AT: Record<FlareReason, string> = {
  opener: '58%',
  derby: '50%',
  promotion: '50%',
  relegation: '50%',
};

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

/**
 * Ask for the night's photograph early.
 *
 * Called from the dressing room, the screen immediately before this one, so the
 * picture has however long a manager spends picking his eleven to arrive. The
 * beat itself is only 2.2 seconds long, and a photograph that lands halfway
 * through it is a photograph nobody saw.
 */
export function preloadFlare(reason: FlareReason | null): void {
  const src = reason ? PHOTO[reason] : undefined;
  if (!src) return;
  const im = new Image();
  im.src = src;
}

export function FlareBeat({ reason, onDone }: { reason: FlareReason; onDone: () => void }) {
  const said = SAID[reason];
  const photo = PHOTO[reason];
  const [leaving, setLeaving] = useState(false);
  // the picture fades up over the light rather than replacing it in one frame,
  // so arriving late reads as the smoke clearing and not as a flash
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), FLARE_BEAT - FLARE_OUT);
    const end = window.setTimeout(onDone, FLARE_BEAT);
    return () => { window.clearTimeout(out); window.clearTimeout(end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!photo) return;
    const im = new Image();
    im.onload = () => setShown(true);
    im.src = photo;
    if (im.complete) setShown(true);
    return () => { im.onload = null; };
  }, [photo]);

  return (
    <div className="flare-beat" data-leaving={leaving ? '1' : '0'} data-photo={photo ? '1' : '0'}
      style={{ ['--flare-say-at' as string]: SAY_AT[reason] }}
      onClick={onDone} role="img" aria-label={`${said.title}. ${said.line}`}>
      {photo && (
        <div className="flare-photo" data-in={shown ? '1' : '0'} aria-hidden="true"
          style={{ backgroundImage: `url('${photo}')` }} />
      )}

      {/* the terrace: two mouths of light coming up from below, the way a stand
          looks from the touchline when the flares go up in it. With a photograph
          over it this is only the warmth underneath, turned right down */}
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
