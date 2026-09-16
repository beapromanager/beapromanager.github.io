import type { Kit as KitStrip, KitPattern } from '../../data/kits.ts';

/**
 * A football shirt, drawn rather than photographed.
 *
 * A kit is a simple shape: body, sleeves, collar, and a pattern across the
 * front. Drawing it means every colour and every pattern exists for free, the
 * whole set weighs a couple of kilobytes, and no club can ever be missing its
 * artwork, which matters when the town list grows past a thousand.
 *
 * It takes a strip, not a club, so the same component draws a home shirt, a
 * change strip, and whatever a side is actually wearing in a given match.
 */

let uid = 0;

export function Kit({ kit, pattern, size = 88, sponsor, sponsorLogo, label }: {
  kit: KitStrip;
  /** override the strip's own pattern; the strip's wins when this is omitted */
  pattern?: KitPattern;
  size?: number;
  /** the shirt front wordmark, once the club has sold the space */
  sponsor?: string;
  /** the sponsor's mark printed on the chest, over the name when there is one */
  sponsorLogo?: string;
  /** what a screen reader says; the shirt is decoration without one */
  label?: string;
}) {
  // gradients and clips are referenced by id, so two shirts on one screen must
  // not share them
  const id = `k${(uid = (uid + 1) % 100000)}`;
  // the strip carries its own pattern (a white change kit is striped); an
  // explicit prop can still override it
  const pat = pattern ?? kit.pattern ?? 'solid';

  return (
    <svg viewBox="0 0 100 108" width={size} height={size * 1.08}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ display: 'block', flex: 'none' }}>
      <defs>
        {/* the pattern is clipped to the shirt, so stripes stop at the seam */}
        <clipPath id={`${id}-c`}><path d={SHIRT} /></clipPath>
        {/* a roll of shade at each edge, so a flat shape reads as cloth */}
        <linearGradient id={`${id}-sh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".26" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".07" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
      </defs>

      <path d={SHIRT} fill={kit.shirt} />

      <g clipPath={`url(#${id}-c)`}>
        {pat === 'stripes' && [12, 28, 44, 60, 76].map(x => (
          <rect key={x} x={x} y="0" width="8.5" height="108" fill={kit.trim} opacity=".9" />
        ))}
        {pat === 'hoops' && [20, 42, 64, 86].map(y => (
          <rect key={y} x="0" y={y} width="100" height="10" fill={kit.trim} opacity=".9" />
        ))}
        {pat === 'half' && <rect x="50" y="0" width="50" height="108" fill={kit.trim} opacity=".9" />}
        {pat === 'sash' && <path d="M2 14 L38 4 L98 92 L64 104 Z" fill={kit.trim} opacity=".88" />}
        <rect x="0" y="0" width="100" height="108" fill={`url(#${id}-sh)`} />
      </g>

      {/* the seam where the sleeve meets the body, which is most of what makes
          a shirt read as a shirt rather than a blob */}
      <path d="M28 11 Q31 30 27 48" fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="1.2" />
      <path d="M72 11 Q69 30 73 48" fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="1.2" />

      {/* cuffs */}
      <path d="M3 32 L9 55 L18 52 L12 30 Z" fill={kit.trim} />
      <path d="M97 32 L91 55 L82 52 L88 30 Z" fill={kit.trim} />

      {/* a crew collar, stroked along the neckline so it sits like a band */}
      <path d="M31 9 Q50 25 69 9" fill="none" stroke={kit.trim} strokeWidth="6" strokeLinecap="round" />

      {sponsorLogo ? (
        <>
          <rect x="30" y="43" width="40" height="36" rx="4" fill="rgba(0,0,0,.42)" />
          <image href={sponsorLogo} x="34" y="46" width="32" height="30" preserveAspectRatio="xMidYMid meet" />
        </>
      ) : sponsor && (
        <>
          {/* a printed panel, so the name reads on a white half as well as a dark one */}
          <rect x="24" y="54" width="52" height="12" rx="2.5" fill="rgba(0,0,0,.42)" />
          <text x="50" y="63" textAnchor="middle" fill="#fff" fontSize={sponsor.length > 10 ? 6.2 : 7.6} fontWeight="800"
            letterSpacing="0.2" style={{ fontFamily: 'inherit' }}>
            {sponsor}
          </text>
        </>
      )}

      <path d={SHIRT} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * Body and both sleeves in one path. Shoulder, sleeve out and down, cuff, back
 * up under the arm, body tapering to a hem with a slight curve, and a neckline
 * dipping between the shoulders.
 */
const SHIRT =
  'M31 9 L12 15 L3 32 L9 55 L20 51 L18 52 L21 101 Q50 106 79 101 L82 52 L80 51 L91 55 L97 32 L88 15 L69 9 Q50 25 31 9 Z';
