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
 * The photograph for each night.
 *
 * Two pictures for four nights, and the split is the point of view. Opening day
 * is shot from the touchline through the fence, which is where the manager
 * stands: the crowd is in front of him and he is about to be judged by it. The
 * three nights that decide something are shot from inside the terrace, among
 * the raised arms, because on those nights the question is not what he thinks
 * of them, it is what they are about to do to him.
 *
 * Both are framed so the smoke closes over everything past the nearest rank.
 * Neither can be counted, so neither lies in a division: the opening match of a
 * career draws thirty one into a ground holding fifty, and the same frames have
 * to still be true in ליגת העל at sixteen thousand.
 */
const PHOTO: Partial<Record<FlareReason, string>> = {
  opener: asset('/flares/opener.webp'),
  derby: asset('/flares/crowd.webp'),
  promotion: asset('/flares/crowd.webp'),
  relegation: asset('/flares/crowd.webp'),
};

/**
 * Where the type sits, as a share of the screen's height.
 *
 * Measured off each photograph in forty bands rather than chosen by eye, and
 * they wanted different answers, which is the whole reason this is a map.
 *
 * On the touchline frame the flares and the raised arms run at 104 to 138 of
 * 255 and the band under them, where the fence is, runs at 21 to 28. On the
 * terrace frame the smoke reaches 166, the brightest thing in the game, and
 * from just past half way down the silhouetted backs are crushed to a flat
 * ZERO. Either way the middle of the screen, where the type used to sit, is
 * the brightest part of the picture.
 *
 * Neither number needs the photograph darkened to carry white type.
 */
const SAY_AT: Record<FlareReason, string> = {
  opener: '58%',
  // low enough to come off the arms, high enough not to hang at the bottom
  derby: '62%',
  promotion: '62%',
  relegation: '62%',
};

/**
 * What the terrace says. Itzik's words, three of the four of them written by
 * him and put in exactly as he typed them, including the space he put before
 * the exclamation mark.
 *
 * The big line names the night and the small one is what the crowd makes of it.
 * Nothing here advises: the scout gave the advice two screens ago and the
 * terrace already gave its opinion in its own words, and a third voice saying
 * either of those again is what made the old corridor feel padded.
 */
const SAID: Record<FlareReason, { title: string; line: string }> = {
  opener:     { title: 'העונה נפתחת',   line: 'היציע חיכה לזה כל הקיץ.' },
  derby:      { title: 'דרבי מעל הכל',  line: 'כל העיר יודעת !' },
  promotion:  { title: 'משחק עלייה',    line: '90 דקות של מלחמה על המגרש בשביל עלייה' },
  relegation: { title: 'משחק הישרדות',  line: '90 דקות של הישרדות בליגה' },
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
