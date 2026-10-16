import { useState } from 'react';
import { asset } from '../asset.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

/**
 * The square by a message: the speaker's portrait when he has one, his icon when he has not or the picture fails to load.
 * The frame and the colour are the sender's, so one sender keeps looking like the same person across the game.
 */
export function Face({ src, icon, color, size }: { src: string | null; icon: IconName; color: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const show = src && !broken;
  return (
    <span style={{
      width: size, height: size, borderRadius: Math.round(size * 0.32), display: 'grid', placeItems: 'center', flex: 'none', overflow: 'hidden',
      background: 'linear-gradient(180deg,var(--surface-3),var(--surface))',
      border: `1px solid ${color}44`,
    }}>
      {show
        ? <img src={asset(src)} alt="" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <Icon name={icon} size={Math.round(size * 0.5)} color={color} />}
    </span>
  );
}
