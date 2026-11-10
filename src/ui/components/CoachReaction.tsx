import { useState } from 'react';
import type { CoachClip } from '../../game/summitCoach.ts';
import { COACH_FALLBACK, COACH_MS } from '../../game/summitCoach.ts';
import { useSummitAsset } from '../summitAsset.ts';
import { asset } from '../asset.ts';

/**
 * The coach's answer to a kick in a summit shootout (R6). Itzik's clip when it is there (coach/<clip>.mp4, once,
 * muted); until then the coach the game already has, the cheering clip or the portrait, moved by CSS for the same
 * time, with a line under him so the moment is never told by movement alone. Under reduced motion he stands still.
 * It holds nothing: the screen's own button is there the whole time.
 */
const CELEBRATE = asset('/coach/celebrate.mp4');
const GUIDE = asset('/coach/guide.webp');

export function CoachReaction({ clip, big = false }: { clip: CoachClip; big?: boolean }) {
  const own = useSummitAsset(`coach/${clip}`);
  const [broken, setBroken] = useState(false);
  const fb = COACH_FALLBACK[clip];
  const ms = COACH_MS[clip];
  const useOwn = own.ready && !broken;
  const fallback = own.failed || broken;
  return (
    <div className="el-coach" data-big={big ? '1' : '0'} data-clip={clip} data-testid="coach-reaction">
      <div className="el-coach-frame" data-move={useOwn ? undefined : fb.move} style={{ ['--coach-ms' as string]: `${ms}ms` }}>
        {useOwn && <video src={own.src ?? undefined} poster={own.poster ?? undefined} autoPlay muted playsInline onError={() => setBroken(true)} />}
        {fallback && (fb.media === 'celebrate'
          ? <video src={CELEBRATE} poster={GUIDE} autoPlay muted playsInline />
          : <img src={GUIDE} alt="" />)}
      </div>
      <div className="el-coach-label">{fb.label}</div>
    </div>
  );
}
