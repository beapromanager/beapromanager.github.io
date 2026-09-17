import type { Formation } from '../../data/formations.ts';

/** A formation as eleven dots on a small pitch, for a picker. */
export function ShapeMap({ f, on }: { f: Formation; on: boolean }) {
  return (
    <svg viewBox="0 0 62 80" className="form-map" aria-hidden="true">
      <rect x="1" y="1" width="60" height="78" rx="4" fill="rgba(255,255,255,.04)"
        stroke="rgba(255,255,255,.10)" strokeWidth="1" />
      <line x1="1" y1="40" x2="61" y2="40" stroke="rgba(255,255,255,.10)" strokeWidth="1" />
      <rect x="20" y="70" width="22" height="9" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1" />
      {f.slots.map((sl, i) => (
        <circle key={i} r={i === 0 ? 2.3 : 3}
          cx={5 + sl.y * 52}
          cy={i === 0 ? 74 : 64 - sl.d * 52}
          fill={i === 0 ? 'rgba(255,255,255,.32)' : on ? 'var(--gold-hi)' : 'rgba(255,255,255,.58)'} />
      ))}
    </svg>
  );
}
