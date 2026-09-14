import { useState } from 'react';
import type { Post, PostKind } from '../../data/feed.ts';
import { Icon } from './Icon.tsx';

/**
 * The club's timeline. Everything here is generated from the live save, so it
 * reads like the noise around a real club: the reporter's match line, the fan
 * page shouting, the rumour about your best player, the rest of the round.
 */

const KIND_LOOK: Record<PostKind, { color: string; icon: 'shirt' | 'mic' | 'crowd' | 'handshake' | 'trophy' }> = {
  club: { color: 'var(--gold)', icon: 'shirt' },
  press: { color: 'var(--sky)', icon: 'mic' },
  fan: { color: 'var(--win)', icon: 'crowd' },
  rumour: { color: 'var(--loss)', icon: 'handshake' },
  league: { color: 'var(--ink-dim)', icon: 'trophy' },
};

const FILTERS: { key: PostKind | 'all'; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'club', label: 'המועדון' },
  { key: 'rumour', label: 'שמועות' },
  { key: 'league', label: 'הליגה' },
  { key: 'fan', label: 'אוהדים' },
];

export function Feed({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState<PostKind | 'all'>('all');
  const [open, setOpen] = useState(false);

  const shown = filter === 'all' ? posts : posts.filter(p => p.kind === filter);
  const visible = open ? shown : shown.slice(0, 3);
  if (!posts.length) return null;

  return (
    <div className="stack" style={{ gap: 9 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="label-cap">מה מדברים עליכם</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700 }}>{posts.length} עדכונים</span>
      </div>

      {/* pills stay small, their tap area does not: see .feed-filter */}
      <div className="row feed-filter" style={{ gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const on = filter === f.key;
          const count = f.key === 'all' ? posts.length : posts.filter(p => p.kind === f.key).length;
          if (count === 0 && f.key !== 'all') return null;
          return (
            <button key={f.key} onClick={() => { setFilter(f.key); setOpen(false); }} style={{
              padding: '6px 11px', borderRadius: '9px 9px 9px 3px', fontWeight: 800, fontSize: 12.5,
              border: `1px solid ${on ? 'transparent' : 'var(--line-2)'}`,
              background: on ? 'linear-gradient(180deg,var(--gold-hi),var(--gold))' : 'var(--surface)',
              color: on ? '#1B1305' : 'var(--ink-dim)',
            }}>{f.label}</button>
          );
        })}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {visible.map(p => <PostCard key={p.id} p={p} />)}
      </div>

      {shown.length > 3 && (
        <button className="btn dark" style={{ padding: '10px' }} onClick={() => setOpen(!open)}>
          {open ? 'הצג פחות' : shown.length - 3 === 1 ? 'עוד עדכון אחד' : `עוד ${shown.length - 3} עדכונים`}
        </button>
      )}
    </div>
  );
}

function PostCard({ p }: { p: Post }) {
  const look = KIND_LOOK[p.kind];
  return (
    <div className="tile" style={{ padding: '11px 12px' }}>
      <div className="row" style={{ gap: 9, alignItems: 'flex-start' }}>
        <span style={{
          width: 34, height: 34, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center',
          background: `color-mix(in srgb, ${look.color} 16%, transparent)`,
          border: `1px solid color-mix(in srgb, ${look.color} 30%, transparent)`,
        }}>
          <Icon name={look.icon} size={16} color={look.color} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13.5 }}>{p.author}</b>
            {p.verified && (
              <span style={{
                width: 13, height: 13, borderRadius: '50%', background: 'var(--sky)',
                display: 'inline-grid', placeItems: 'center', color: '#04121c',
                fontSize: 9, fontWeight: 900, lineHeight: 1,
              }} title="מאומת">✓</span>
            )}
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{p.handle}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>· {p.when}</span>
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-line' }}>{p.text}</div>

          <div className="row" style={{ gap: 14, marginTop: 7 }}>
            <span className="row" style={{ gap: 4, fontSize: 12, color: 'var(--ink-faint)' }}>
              ♥ <span className="num">{p.likes}</span>
            </span>
            <span className="row" style={{ gap: 4, fontSize: 12, color: 'var(--ink-faint)' }}>
              ↻ <span className="num">{Math.round(p.likes / 6)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
