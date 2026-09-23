/**
 * Every new page starts at the top.
 *
 * Nothing feels more broken than tapping something at the bottom of a long list
 * and landing halfway down whatever opens next, so this is not a nicety.
 *
 * The reset used to live only in the App, keyed on the game phase, and that
 * turned out to be the wrong unit. A phase is not a page: the press room asks
 * two questions without changing phase, the summer runs three market rounds
 * inside one, and the squad, the market and the table each swap what they are
 * showing behind a tab. Every one of those is a new page to the person holding
 * the phone, and every one of them was leaving him scrolled where he was.
 *
 * So the App resets on a key that includes those sub pages, and anything that
 * changes what a screen is showing calls this directly.
 */
export function scrollToTop(): void {
  // which element actually scrolls depends on the layout, and it has changed
  // more than once, so every plausible one is reset rather than guessed at
  const targets: (Element | null)[] = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById('root'),
    document.querySelector('.frame'),
  ];
  for (const el of targets) if (el) (el as HTMLElement).scrollTop = 0;
  try { window.scrollTo(0, 0); } catch { /* jsdom and friends */ }
}

/** How near an edge the finger has to be before the page starts moving. */
export const EDGE_BAND = 72;

/**
 * How fast the page should scroll while a man is being carried, in pixels a
 * frame, negative for up.
 *
 * The bench is pinned to the bottom of the screen, so the bottom of the screen
 * is a destination and not an edge: `bottomInset` is how much of it the bench
 * occupies, and the finger inside that strip must move nothing at all. A target
 * that slides away as you reach for it is what made this feel broken. The band
 * immediately above the bench still scrolls, because the far end of the pitch
 * can be below the fold and has to be reachable.
 */
export function edgeScrollSpeed(y: number, viewportHeight: number, bottomInset = 0): number {
  if (y < EDGE_BAND) return -Math.ceil((EDGE_BAND - y) / 6);
  const floor = viewportHeight - bottomInset;
  if (y > floor - EDGE_BAND && y < floor) return Math.ceil((y - (floor - EDGE_BAND)) / 6);
  return 0;
}
