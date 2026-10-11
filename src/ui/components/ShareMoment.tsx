import { useState } from 'react';
import { Icon } from './Icon.tsx';

/**
 * "Send this to a friend", on the moments a manager is proud of.
 *
 * One tap opens the phone's own share sheet, with the words and the link.
 * Where there is no share sheet (a desktop browser) it opens WhatsApp with
 * the same words and copies them, so the button is never one that does nothing.
 * Backing out of the sheet is not an error and says nothing.
 */
export function ShareMoment({ text, link, glass, onShared }: {
  text: string;
  link: string;
  /** the pill that sits on a photograph, rather than the button on a card */
  glass?: boolean;
  onShared?: () => void;
}) {
  const [said, setSaid] = useState<'sent' | 'copied' | null>(null);

  async function go(e: React.MouseEvent) {
    e.stopPropagation();   // inside the celebration a tap anywhere else means "continue"
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BE A PRO', text, url: link });
        setSaid('sent'); onShared?.();
        return;
      }
    } catch { return; /* the sheet was dismissed, which is not an error */ }
    try { await navigator.clipboard?.writeText(`${text}\n${link}`); setSaid('copied'); } catch { /* the words went to WhatsApp anyway */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`, '_blank', 'noopener');
    onShared?.();
  }

  return (
    <button type="button" onClick={go} className={glass ? 'share-glass' : 'btn dark btn-sm'}>
      <Icon name="share" size={glass ? 17 : 18} color={glass ? '#fff' : 'var(--gold)'} />
      {said === 'sent' ? 'תודה ששיתפת' : said === 'copied' ? 'הועתק, נפתח וואטסאפ' : 'שתף עם חבר'}
    </button>
  );
}
