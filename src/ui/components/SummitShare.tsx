import { useRef, useState } from 'react';
import type { Club } from '../../data/clubs.ts';
import { asset } from '../asset.ts';
import { useSummitAsset } from '../summitAsset.ts';
import { drawShareCard, cardBlob, loadImage, svgToImage } from '../shareCard.ts';
import type { ShareCardData } from '../shareCard.ts';
import { Crest } from './Crest.tsx';

/**
 * Sending a summit moment (R8). The picture is made only when he presses: 1080 by 1350, his own club and nothing of
 * the summit's clubs (shareCard.ts). Where the phone can share a file, the share sheet opens with the picture, the
 * words and the link. Everywhere else the honest way: save the picture, copy the words, and say plainly that the
 * tag has to be pasted by hand and that WhatsApp by a link carries words only.
 */
const LOGO = asset('/logo.webp');

export function SummitShare({ club, card, text, link, onShared }: {
  club: Club;
  card: ShareCardData;
  /** the words, with @be.a.pro.il in them, without the link */
  text: string;
  link: string;
  onShared?: () => void;
}) {
  const crestBox = useRef<HTMLDivElement>(null);
  const bg = useSummitAsset('share/bg');
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function picture(): Promise<{ blob: Blob; file: File } | null> {
    try { await document.fonts?.ready; } catch { /* the card is drawn with whatever is there */ }
    const [crest, logo, back] = await Promise.all([
      svgToImage(crestBox.current?.querySelector('svg') ?? null), loadImage(LOGO), bg.src ? loadImage(bg.src) : Promise.resolve(null),
    ]);
    const blob = await cardBlob(drawShareCard(card, { crest, logo, bg: back }));
    return blob ? { blob, file: new File([blob], 'be-a-pro.png', { type: 'image/png' }) } : null;
  }
  const save = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'be-a-pro.png';
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const copy = async () => { try { await navigator.clipboard?.writeText(`${text}\n${link}`); return true; } catch { return false; } };
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  async function share(e: React.MouseEvent) {
    stop(e);
    if (busy) return;
    setBusy(true);
    try {
      const pic = await picture();
      if (pic && navigator.canShare?.({ files: [pic.file] })) {
        try { await navigator.share({ files: [pic.file], text, url: link }); setSaid('נשלח'); onShared?.(); } catch { /* he closed the sheet, which is not an error */ }
        return;
      }
      // no file sharing on this phone: the picture is saved and the words are copied, and we say so
      if (pic) save(pic.blob);
      const copied = await copy();
      setSaid(pic ? (copied ? 'התמונה נשמרה והטקסט הועתק' : 'התמונה נשמרה') : 'לא הצלחנו ליצור את התמונה');
      if (pic) onShared?.();
    } finally { setBusy(false); }
  }
  async function saveOnly(e: React.MouseEvent) {
    stop(e);
    const pic = await picture();
    if (pic) { save(pic.blob); setSaid('התמונה נשמרה'); } else setSaid('לא הצלחנו ליצור את התמונה');
  }
  async function copyOnly(e: React.MouseEvent) { stop(e); setSaid((await copy()) ? 'הטקסט הועתק' : 'לא הצלחנו להעתיק'); }
  function whatsapp(e: React.MouseEvent) {
    stop(e);
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`, '_blank', 'noopener');
    onShared?.();
  }

  return (
    <div className="el-share" onClick={stop} data-testid="summit-share">
      {/* his crest, drawn off screen so the card can take it as a picture */}
      <div ref={crestBox} className="el-share-crest" aria-hidden="true"><Crest club={club} size={320} /></div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="btn btn-sm" onClick={share} disabled={busy}>שתף תמונה</button>
        <button type="button" className="btn dark btn-sm" onClick={whatsapp}>וואטסאפ</button>
        <button type="button" className="btn dark btn-sm" onClick={saveOnly}>שמור תמונה</button>
        <button type="button" className="btn dark btn-sm" onClick={copyOnly}>העתק טקסט</button>
      </div>
      <div className="el-share-said" role="status" aria-live="polite">{said ?? ''}</div>
      <p className="el-share-note">
        אי אפשר לתייג אוטומטית באינסטגרם. התמונה נשמרת והטקסט עם <span dir="ltr">@be.a.pro.il</span> מועתק, ומדביקים אותו בעצמכם. בוואטסאפ דרך קישור עובר רק הטקסט.
      </p>
    </div>
  );
}
