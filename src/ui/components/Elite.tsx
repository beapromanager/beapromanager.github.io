import type { ReactNode } from 'react';
import type { SummitEmblem } from '../../data/europeClubs.ts';

/**
 * פסגת אירופה's black and gold (Itzik, 31.10.2026, europe_tier2_luxury_design_he.md): the shared gradients, the
 * plaque frame with its corners, the rule, and the small gold emblems the summit crests carry instead of letters
 * (his table of 8.11). Everything here is drawn in code; no picture, no text baked in.
 */

/** The gradients every gold stroke and fill uses, defined once on the page (App renders it). */
export function EliteDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <linearGradient id="el-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--el-g4)' }} />
          <stop offset=".35" style={{ stopColor: 'var(--el-g3)' }} />
          <stop offset=".7" style={{ stopColor: 'var(--el-g2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--el-g1)' }} />
        </linearGradient>
        <linearGradient id="el-gold-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--el-g4)' }} />
          <stop offset=".3" style={{ stopColor: 'var(--el-g2)' }} />
          <stop offset=".55" style={{ stopColor: 'var(--el-g0)' }} />
          <stop offset=".8" style={{ stopColor: 'var(--el-g3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--el-g1)' }} />
        </linearGradient>
        <radialGradient id="el-shine" cx=".3" cy=".2" r=".8">
          <stop offset="0" style={{ stopColor: 'var(--el-shine)', stopOpacity: .38 }} />
          <stop offset=".6" style={{ stopColor: 'var(--el-shine)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** A plaque: dark panel, a hairline of gold, and four engraved corners. */
export function EliteFrame({ children, className = '', as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' }) {
  const Tag = as;
  const corner = (pos: string) => (
    <svg className={`el-corner el-corner-${pos}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 22 V8 Q2 2 8 2 H22" fill="none" stroke="url(#el-gold)" strokeWidth="1.6" />
      <path d="M6 22 V10 Q6 6 10 6 H22" fill="none" stroke="url(#el-gold)" strokeWidth=".8" opacity=".7" />
      <circle cx="8" cy="8" r="1.6" fill="url(#el-gold)" />
    </svg>
  );
  return (
    <Tag className={`el-plaque ${className}`}>
      {corner('tl')}{corner('tr')}{corner('bl')}{corner('br')}
      {children}
    </Tag>
  );
}

/** A gold rule with a diamond in the middle. */
export function EliteRule() {
  return (
    <div className="el-rule" role="presentation">
      <span /><i /><span />
    </div>
  );
}

/**
 * The twenty emblems, on a 100 by 100 grid around the centre. Simple shapes that read at 34px: each points at the
 * club's city and none at the real club's own mark (summit-check holds the names).
 */
const EMBLEM: Record<SummitEmblem, ReactNode> = {
  star8: <path d="M50 22 L56 40 L74 30 L64 47 L80 50 L64 53 L74 70 L56 60 L50 78 L44 60 L26 70 L36 53 L20 50 L36 47 L26 30 L44 40 Z" />,
  swords: <>
    <path d="M26 24 L34 20 L70 60 L76 56 L80 62 L70 72 L64 68 L68 62 Z" />
    <path d="M74 24 L66 20 L30 60 L24 56 L20 62 L30 72 L36 68 L32 62 Z" />
    <rect x="36" y="58" width="6" height="14" rx="2" transform="rotate(-42 39 65)" />
    <rect x="58" y="58" width="6" height="14" rx="2" transform="rotate(42 61 65)" />
  </>,
  lighthouse: <>
    <path d="M42 36 H58 L62 76 H38 Z" />
    <rect x="40" y="27" width="20" height="9" rx="1.5" />
    <path d="M44 27 L50 20 L56 27 Z" />
    <path d="M30 76 H70 V80 H30 Z" />
    <path d="M24 30 L36 31 M76 30 L64 31 M27 22 L37 27 M73 22 L63 27" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </>,
  spool: <>
    <ellipse cx="50" cy="28" rx="20" ry="6" />
    <ellipse cx="50" cy="72" rx="20" ry="6" />
    <rect x="38" y="28" width="24" height="44" />
    <path d="M38 36 H62 M38 44 H62 M38 52 H62 M38 60 H62" stroke="var(--el-etch)" strokeWidth="2" opacity=".55" />
    <path d="M62 64 Q76 70 74 82" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </>,
  bee: <>
    <ellipse cx="38" cy="38" rx="11" ry="8" opacity=".85" transform="rotate(-25 38 38)" />
    <ellipse cx="62" cy="38" rx="11" ry="8" opacity=".85" transform="rotate(25 62 38)" />
    <ellipse cx="50" cy="58" rx="13" ry="18" />
    <path d="M38 52 H62 M37 60 H63 M40 68 H60" stroke="var(--el-etch)" strokeWidth="3.4" />
    <circle cx="50" cy="38" r="6" />
  </>,
  anchor: <>
    <circle cx="50" cy="26" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
    <rect x="47" y="31" width="6" height="44" />
    <rect x="37" y="38" width="26" height="5" rx="2" />
    <path d="M26 58 Q30 78 50 78 Q70 78 74 58 L68 60 Q66 72 50 72 Q34 72 32 60 Z" />
    <path d="M24 56 L32 52 L32 62 Z M76 56 L68 52 L68 62 Z" />
  </>,
  clocktower: <>
    <path d="M50 16 L60 32 H40 Z" />
    <rect x="40" y="32" width="20" height="46" />
    <circle cx="50" cy="44" r="7" fill="var(--el-etch)" />
    <path d="M50 44 V39 M50 44 L54 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="44" y="58" width="12" height="20" fill="var(--el-etch)" opacity=".45" />
    <rect x="34" y="76" width="32" height="5" />
  </>,
  arrow: <>
    <path d="M28 72 L66 34" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M60 24 L78 22 L76 40 Z" />
    <path d="M24 66 L32 74 L26 80 L18 72 Z M30 60 L38 68 L32 74 L24 66 Z" />
  </>,
  peak: <>
    <path d="M18 76 L42 34 L52 50 L60 40 L82 76 Z" />
    <path d="M42 34 L48 44 L44 46 L40 42 L36 45 Z" fill="var(--el-snow)" />
    <path d="M60 40 L66 50 L62 51 L58 48 Z" fill="var(--el-snow)" />
  </>,
  pickaxes: <>
    <path d="M24 34 Q40 18 58 26 L54 30 Q42 26 30 38 Z" />
    <path d="M76 34 Q60 18 42 26 L46 30 Q58 26 70 38 Z" />
    <path d="M44 28 L72 76" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M56 28 L28 76" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
  </>,
  castle: <>
    <path d="M26 40 V78 H74 V40 H68 V46 H62 V40 H56 V46 H44 V40 H38 V46 H32 V40 Z" />
    <path d="M40 30 V40 H60 V30 H56 V34 H52 V30 H48 V34 H44 V30 Z" />
    <path d="M44 78 V64 Q50 56 56 64 V78 Z" fill="var(--el-etch)" />
  </>,
  spires: <>
    <path d="M50 14 L56 40 V78 H44 V40 Z" />
    <path d="M32 30 L37 50 V78 H27 V50 Z" />
    <path d="M68 30 L73 50 V78 H63 V50 Z" />
    <rect x="24" y="74" width="52" height="5" />
  </>,
  moonstars: <>
    <path d="M58 22 A28 28 0 1 0 74 66 A22 22 0 1 1 58 22 Z" />
    <path d="M68 28 L70.5 34 L77 34.5 L72 38.5 L73.5 45 L68 41.5 L62.5 45 L64 38.5 L59 34.5 L65.5 34 Z" />
    <circle cx="76" cy="52" r="2.6" />
  </>,
  volcano: <>
    <path d="M16 78 L40 42 H60 L84 78 Z" />
    <path d="M40 42 L46 54 L50 46 L54 56 L60 42 Z" fill="var(--el-etch)" opacity=".55" />
    <path d="M44 34 Q40 24 48 20 Q46 28 52 26 Q60 22 56 34 Z" />
    <circle cx="62" cy="22" r="3" /><circle cx="38" cy="26" r="2.4" />
  </>,
  bridge: <>
    <rect x="16" y="44" width="68" height="6" />
    <path d="M22 50 V64 Q36 50 50 64 Q64 50 78 64 V50 Z" />
    <rect x="22" y="36" width="6" height="14" /><rect x="72" y="36" width="6" height="14" />
    <path d="M18 72 Q26 68 34 72 T50 72 T66 72 T82 72" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </>,
  ship: <>
    <path d="M20 64 H80 L72 76 H28 Z" />
    <rect x="48" y="20" width="4" height="44" />
    <path d="M52 24 Q72 36 52 58 Z" />
    <path d="M48 30 Q32 42 48 58 Z" />
    <path d="M52 20 L62 24 L52 27 Z" />
  </>,
  sun: <>
    <circle cx="50" cy="50" r="13" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <path key={a} d="M50 18 L54 30 H46 Z" transform={`rotate(${a} 50 50)`} />
    ))}
  </>,
  flame: <path d="M50 16 Q66 36 62 50 Q70 46 70 38 Q82 58 70 72 Q62 82 50 82 Q36 82 30 70 Q24 56 34 44 Q34 54 40 56 Q34 38 50 16 Z" />,
  thistle: <>
    <path d="M38 40 L42 22 L46 36 L50 18 L54 36 L58 22 L62 40 Z" />
    <circle cx="50" cy="48" r="12" />
    <path d="M38 48 Q50 58 62 48" fill="none" stroke="var(--el-etch)" strokeWidth="2" opacity=".5" />
    <rect x="48" y="58" width="4" height="22" />
    <path d="M50 70 Q36 66 30 56 Q42 60 50 66 Z M50 74 Q64 70 70 60 Q58 64 50 70 Z" />
  </>,
  windmill: <>
    <path d="M44 46 H56 L60 80 H40 Z" />
    <circle cx="50" cy="42" r="4" />
    <path d="M50 42 L28 20 L24 26 Z M50 42 L72 20 L76 26 Z M50 42 L72 64 L76 58 Z M50 42 L28 64 L24 58 Z" />
  </>,
};

/** One emblem, in gold with a dark edge so it reads on any colour of crest. */
export function Emblem({ name, x = 0, y = 0, scale = 1 }: { name: SummitEmblem; x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) translate(50 50) scale(${scale}) translate(-50 -50)`} className="el-emblem"
      fill="url(#el-gold)" color="var(--el-g3)" stroke="var(--el-edge)" strokeWidth="1.4" strokeLinejoin="round" paintOrder="stroke">
      {EMBLEM[name]}
    </g>
  );
}
export const EMBLEM_NAMES = Object.keys(EMBLEM) as SummitEmblem[];
