// Library copy of shared/tooltip-lines 1.1.1. Do not edit: see src/Shared/tooltip-lines/VERSION.
// Keeps a tooltip inside the window after the blocks of the mods made it taller or wider.
//
// A web page places its tooltip for its own size (BackpackUI reserves 200 x 100). With one or more blocks under the
// lines of the game the box can pass the bottom or the right edge, so it moves up or left. The page writes left and
// top again on every pointer move, so the correction has to run after each move and not only after the hover.

export interface Place {
  left: number;
  top: number;
}

export interface Edges {
  bottom: number;
  right: number;
}

export interface Size {
  w: number;
  h: number;
}

// The gap kept to the edge of the window, in page pixels.
export const PAD = 4;

// The place of a tooltip that passes an edge. edges is the box in view pixels, view is the window in view pixels, and
// scale is the factor between view pixels and page pixels (the UI zoom of the game). A tooltip never moves past 0,
// because a negative place would push it out on the other side.
export function placeInside(place: Place, edges: Edges, view: Size, scale: number, pad: number): Place {
  let left = place.left;
  let top = place.top;
  const over = edges.bottom - view.h + pad;
  if (over > 0) top = Math.max(0, top - over / scale);
  const right = edges.right - view.w + pad;
  if (right > 0) left = Math.max(0, left - right / scale);
  return { left, top };
}

// Moves the tooltip node, when its box passes an edge. It does nothing while the page has no layout, which is the
// case before the first paint.
export function keepInside(doc: Document, tip: HTMLElement): void {
  const w = doc.defaultView as Window | null;
  if (!w) return;
  const rect = tip.getBoundingClientRect();
  if (!rect.height || !tip.offsetHeight) return;
  const scale = rect.height / tip.offsetHeight;
  if (!scale) return;
  const place: Place = { left: parseFloat(tip.style.left || '0') || 0, top: parseFloat(tip.style.top || '0') || 0 };
  const next = placeInside(place, { bottom: rect.bottom, right: rect.right }, { w: w.innerWidth, h: w.innerHeight }, scale, PAD);
  if (next.top !== place.top) tip.style.top = next.top + 'px';
  if (next.left !== place.left) tip.style.left = next.left + 'px';
}
