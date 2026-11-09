import type { Club } from '../../data/clubs.ts';
import { summitClub } from '../../data/europeClubs.ts';
import { Emblem } from './Elite.tsx';

/**
 * Club crest, drawn as vector so it scales cleanly at every size.
 * Shape + pattern + initials come from the club config, so every club
 * reads as a distinct badge without needing any real club artwork.
 */

const SHAPE_PATH: Record<Club['shape'], string> = {
  // 100x100 viewbox
  shield: 'M50 4 L92 18 V52 C92 76 72 90 50 96 C28 90 8 76 8 52 V18 Z',
  round: 'M50 5 A45 45 0 1 1 49.9 5 Z',
  diamond: 'M50 3 L95 50 L50 97 L5 50 Z',
};

function initials(club: Club): string {
  // strip the common prefix words so the letters are the town, not the movement
  // (the invented words of 29.10 stand in for the old four; the old ones stay for
  // the fixed leagues and any save that still carries them)
  const cleaned = club.short.replace(/^(?:(?:הפועל|מכבי|בני|בית"ר)\s*|(?:רעם|להב|ברק|שחף)\s+)/, '').trim();
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return cleaned.slice(0, 2);
}

/**
 * A club of פסגת אירופה wears the elite crest wherever it appears (Itzik, 31.10 and 8.11.2026): a gold ring, its
 * rating in stars over it (85 one, 89 five), a gold sheen that passes once, and its emblem where the letters were.
 * `elite={false}` draws a summit club the plain way; every other club is drawn exactly as before.
 */
export function Crest({ club, size = 44, elite }: { club: Club; size?: number; elite?: boolean }) {
  const top = summitClub(club.id);
  if (top && elite !== false) return <EliteCrest club={club} size={size} rating={top.rating} emblem={top.emblem} />;
  const uid = `crest-${club.id}`;
  const path = SHAPE_PATH[club.shape];
  const small = size < 34;

  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100"
      role="img" aria-label={`סמל ${club.name}`}
      style={{ flex: 'none', display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.45))' }}
    >
      <defs>
        <clipPath id={uid}><path d={path} /></clipPath>
      </defs>

      <g clipPath={`url(#${uid})`}>
        <rect x="0" y="0" width="100" height="100" fill={club.primary} />

        {club.pattern === 'stripes' && (
          <g fill={club.secondary} opacity="0.9">
            <rect x="14" y="0" width="13" height="100" />
            <rect x="44" y="0" width="13" height="100" />
            <rect x="74" y="0" width="13" height="100" />
          </g>
        )}
        {club.pattern === 'half' && (
          <rect x="50" y="0" width="50" height="100" fill={club.secondary} opacity="0.92" />
        )}
        {club.pattern === 'sash' && (
          <polygon points="0,74 74,0 100,0 0,100" fill={club.secondary} opacity="0.92" />
        )}
        {club.pattern === 'chevron' && (
          <polygon points="50,26 100,72 100,100 50,54 0,100 0,72" fill={club.secondary} opacity="0.92" />
        )}

        {/* subtle top sheen so the badge feels physical */}
        <rect x="0" y="0" width="100" height="42" fill="#fff" opacity="0.09" />
      </g>

      <path d={path} fill="none" stroke={club.accent} strokeWidth="5" opacity="0.95" />

      {!small && (
        <text
          x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fontFamily="Heebo, Rubik, sans-serif" fontWeight="900" fontSize="38"
          fill={club.accent}
          stroke={club.primary} strokeWidth="6" paintOrder="stroke"
        >
          {initials(club)}
        </text>
      )}
    </svg>
  );
}

function EliteCrest({ club, size, rating, emblem }: { club: Club; size: number; rating: number; emblem: Parameters<typeof Emblem>[0]['name'] }) {
  const uid = `crest-el-${club.id}`;
  const path = SHAPE_PATH[club.shape];
  const small = size < 34;
  const stars = Math.max(1, Math.min(5, rating - 84));
  return (
    <svg
      width={size} height={size} viewBox="-8 -16 116 120" className="el-crest"
      role="img" aria-label={`סמל ${club.name}`}
      style={{ flex: 'none', display: 'block', filter: 'var(--el-crest-shadow)' }}
    >
      <defs>
        <clipPath id={uid}><path d={path} /></clipPath>
      </defs>
      <g clipPath={`url(#${uid})`}>
        <rect x="0" y="0" width="100" height="100" fill={club.primary} />
        {club.pattern === 'stripes' && (
          <g fill={club.secondary} opacity="0.9">
            <rect x="14" y="0" width="13" height="100" /><rect x="44" y="0" width="13" height="100" /><rect x="74" y="0" width="13" height="100" />
          </g>
        )}
        {club.pattern === 'half' && <rect x="50" y="0" width="50" height="100" fill={club.secondary} opacity="0.92" />}
        {club.pattern === 'sash' && <polygon points="0,74 74,0 100,0 0,100" fill={club.secondary} opacity="0.92" />}
        {club.pattern === 'chevron' && <polygon points="50,26 100,72 100,100 50,54 0,100 0,72" fill={club.secondary} opacity="0.92" />}
        {/* a dark disc behind the emblem, so gold reads on white and on yellow alike */}
        <circle cx="50" cy="52" r="29" fill="var(--el-bg1)" opacity=".72" />
        <rect x="0" y="0" width="100" height="100" fill="url(#el-shine)" />
        <rect className="el-crest-sheen" x="-60" y="-10" width="40" height="130" fill="var(--el-g4)" opacity=".0" transform="rotate(20 50 50)" />
      </g>
      <path d={path} fill="none" stroke="var(--el-bg1)" strokeWidth="9" opacity=".9" />
      <path d={path} fill="none" stroke="url(#el-gold-ring)" strokeWidth="5.5" />
      <Emblem name={emblem} y={2} scale={small ? 0.78 : 0.62} />
      {!small && (
        <g fill="url(#el-gold)" stroke="var(--el-edge)" strokeWidth=".8" paintOrder="stroke">
          {Array.from({ length: stars }, (_, i) => {
            const x = 50 + (i - (stars - 1) / 2) * 13;
            return <path key={i} transform={`translate(${x} -7) scale(.55)`} d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.4 L6.4 8.6 L0 4.3 L-6.4 8.6 L-4.3 1.4 L-10 -3.1 L-2.9 -3.1 Z" />;
          })}
        </g>
      )}
    </svg>
  );
}
