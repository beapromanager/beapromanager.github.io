/**
 * The picture a manager sends from פסגת אירופה (R8): 1080 by 1350, drawn on a canvas only when he asks for it.
 *
 * Itzik, 10.11.2026: until the lawyer has cleared the twenty, the card carries NO summit club's name, crest or
 * colours. Only his own club (its crest and name), the headline, the season, the score as numbers, the BE A PRO
 * logo and beapro.co.il. That is why this file takes no opponent at all and knows nothing of the European clubs.
 *
 * The words are drawn by the code after the fonts are in (document.fonts.ready), in Hebrew, right to left.
 */
import { SHARE_SITE } from '../data/site.ts';

export const CARD_W = 1080;
export const CARD_H = 1350;
export const CARD_SITE = SHARE_SITE;

export interface ShareCardData {
  /** "אלופי אירופה", "גמר פסגת אירופה" or "ניצחון בפסגה" */
  headline: string;
  /** his own club, the only club named on the card */
  club: string;
  season: number;
  /** his goals first; null when there is no score to show */
  score: [number, number] | null;
  pens: [number, number] | null;
}

export interface ShareCardArt {
  /** his own crest, already an image; null draws no crest */
  crest: CanvasImageSource | null;
  logo: CanvasImageSource | null;
  /** Itzik's share/bg picture when it is there; null draws the card's own background */
  bg: CanvasImageSource | null;
}

function tokens() {
  const cs = getComputedStyle(document.documentElement);
  const t = (n: string) => cs.getPropertyValue(n).trim();
  return { bg0: t('--el-bg0'), bg3: t('--el-bg3'), g1: t('--el-g1'), g2: t('--el-g2'), g3: t('--el-g3'), g4: t('--el-g4'), ink: t('--el-ink'), dim: t('--el-ink-dim') };
}

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** A crest drawn on the page as SVG, turned into an image the canvas can take. */
export function svgToImage(svg: SVGElement | null): Promise<HTMLImageElement | null> {
  if (!svg) return Promise.resolve(null);
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)));
}

export function drawShareCard(data: ShareCardData, art: ShareCardArt): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const c = cv.getContext('2d')!;
  const T = tokens();
  const W = CARD_W, H = CARD_H, cx = W / 2;
  // the background: his picture, or black with a gold glow where the crest sits
  if (art.bg) c.drawImage(art.bg, 0, 0, W, H);
  else {
    const g = c.createRadialGradient(cx, 380, 40, cx, 520, 980);
    g.addColorStop(0, T.bg3); g.addColorStop(1, T.bg0);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.5; c.strokeStyle = T.g1; c.lineWidth = 2;
    for (const r of [250, 330, 420]) { c.beginPath(); c.arc(cx, 380, r, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }
    c.globalAlpha = 1;
  }
  // the plaque frame
  const gold = c.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, T.g4); gold.addColorStop(0.35, T.g2); gold.addColorStop(0.7, T.g1); gold.addColorStop(1, T.g3);
  c.strokeStyle = gold; c.lineWidth = 6; c.strokeRect(36, 36, W - 72, H - 72);
  c.lineWidth = 1.5; c.strokeRect(56, 56, W - 112, H - 112);
  for (const [x, y] of [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]]) {
    c.fillStyle = gold; c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
  }
  if (art.crest) c.drawImage(art.crest, cx - 160, 200, 320, 320);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl';
  // the headline, in foil
  const foil = c.createLinearGradient(0, 610, 0, 730);
  foil.addColorStop(0, T.g4); foil.addColorStop(0.5, T.g3); foil.addColorStop(1, T.g1);
  c.fillStyle = foil;
  c.font = '900 118px "Frank Ruhl Libre", serif';
  c.fillText(data.headline, cx, 670, W - 160);
  c.fillStyle = T.ink; c.font = '700 62px "Frank Ruhl Libre", serif';
  c.fillText(data.club, cx, 790, W - 180);
  c.fillStyle = T.dim; c.font = '700 40px "Frank Ruhl Libre", serif';
  c.fillText(`פסגת אירופה · עונה ${data.season}`, cx, 862, W - 200);
  if (data.score) {
    // numbers read left to right, his goals first
    c.direction = 'ltr'; c.font = '900 150px "Frank Ruhl Libre", serif';
    const foil2 = c.createLinearGradient(0, 930, 0, 1060);
    foil2.addColorStop(0, T.g4); foil2.addColorStop(1, T.g2);
    c.fillStyle = foil2;
    c.fillText(`${data.score[0]} : ${data.score[1]}`, cx, 990);
    c.direction = 'rtl';
    if (data.pens) { c.fillStyle = T.dim; c.font = '700 38px "Frank Ruhl Libre", serif'; c.fillText(`${data.pens[0]}:${data.pens[1]} בפנדלים`, cx, 1082); }
  }
  // the game's own mark and its address
  // the mark (the game's own icon) in a gold-rimmed tile, and the name beside it, as one centred line
  c.direction = 'ltr'; c.font = '900 58px "Frank Ruhl Libre", serif';
  const name = 'BE A PRO', tile = art.logo ? 104 : 0, gap = art.logo ? 22 : 0;
  const nameW = c.measureText(name).width, x0 = cx - (tile + gap + nameW) / 2, y0 = 1128;
  if (art.logo) {
    c.save();
    c.beginPath(); c.roundRect(x0, y0 - tile / 2, tile, tile, 18); c.clip();
    c.drawImage(art.logo, x0, y0 - tile / 2, tile, tile);
    c.restore();
    c.strokeStyle = gold; c.lineWidth = 3; c.beginPath(); c.roundRect(x0, y0 - tile / 2, tile, tile, 18); c.stroke();
  }
  c.textAlign = 'left'; c.fillStyle = T.ink; c.fillText(name, x0 + tile + gap, y0 + 2);
  c.textAlign = 'center';
  c.direction = 'ltr'; c.fillStyle = T.g3; c.font = '700 44px "Frank Ruhl Libre", serif';
  c.fillText(CARD_SITE, cx, 1236);
  return cv;
}

export function cardBlob(cv: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => cv.toBlob(b => resolve(b), 'image/png'));
}
