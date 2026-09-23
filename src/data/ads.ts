/**
 * The ads that pay for a gem.
 *
 * A flat list, on purpose: an ad is a short portrait clip in public/ads with a
 * poster beside it, and adding one is adding a line here. Nothing about an ad
 * lives in the save, so the list can change under a running career freely.
 *
 * The recipe, from whatever the advertiser sends (PIC/ads, kept out of git):
 *   ffmpeg -i SRC -vf "scale=-2:1280,crop=720:1280,format=yuv420p" -r 30
 *     -c:v libx264 -preset slow -crf 29 -profile:v high -level 4.0
 *     -c:a aac -b:a 64k -ac 2 -movflags +faststart public/ads/ID.mp4
 *   ffmpeg -ss 0.5 -i public/ads/ID.mp4 -frames:v 1 -vf scale=360:-1
 *     -c:v libwebp -quality 72 public/ads/ID.webp
 * Portrait 720x1280, one to two megabytes for fifteen seconds, and nothing is
 * fetched until the button is pressed.
 *
 * `seconds` is the length as shipped. The player reads the real duration off
 * the file once it loads and prefers that; this is the fallback for a clip
 * whose metadata never arrives, so a broken file cannot turn into a free gem.
 */
export type Ad = {
  id: string;
  /** root-relative path, resolved through asset() */
  src: string;
  poster: string;
  seconds: number;
  /** who is advertising, shown under the clip */
  brand: string;
  /** where a tap takes him, the whole point of the ad for the advertiser */
  link: string;
  /** the address as printed, without the scheme, or the phone as it is read */
  site: string;
  /**
   * Which door it is.
   *
   * A shop has a website and the button says so. A local service is reached on
   * WhatsApp and nowhere else, and sending a man to a website that does not
   * exist would waste the only tap the advertiser gets. So the door has a kind,
   * and the three lines of copy around it follow from it.
   */
  channel?: 'site' | 'whatsapp';
};

/**
 * Whether the ads are running.
 *
 * The game goes out before the advertisers do, so at launch the button is a
 * promise rather than a clip, and the gems an ad would have paid are simply
 * given (see adFreeGems). Everything underneath stays wired: turning this back
 * to true is the whole of switching them on.
 */
export const ADS_LIVE = false;

export const ADS: readonly Ad[] = [
  { id: 'ultraskit', src: '/ads/ultraskit.mp4', poster: '/ads/ultraskit.webp', seconds: 15.3,
    brand: 'ULTRAS KIT', link: 'https://ultraskit.com/', site: 'ultraskit.com' },
  { id: 'novablux', src: '/ads/novablux.mp4', poster: '/ads/novablux.webp', seconds: 12.3,
    brand: 'NovaBluX', link: 'https://novablux.shop/', site: 'novablux.shop' },
  // a favour rather than a placement: a neighbourhood laundry, carried for
  // nothing, reached the way a neighbourhood business is actually reached
  { id: 'blacksheep', src: '/ads/blacksheep.mp4', poster: '/ads/blacksheep.webp', seconds: 14,
    brand: 'הכבשה השחורה', link: 'https://wa.me/972585599198', site: '058-559-9198',
    channel: 'whatsapp' },
];

/** The phone number a WhatsApp door dials, digits only, for the checks. */
export function adDigits(ad: Ad): string {
  return ad.link.replace(/\D/g, '');
}

export function adById(id: string): Ad {
  return ADS.find(a => a.id === id) ?? ADS[0];
}
