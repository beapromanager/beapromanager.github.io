import type { Club } from '../../data/clubs.ts';

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

export function Crest({ club, size = 44 }: { club: Club; size?: number }) {
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
