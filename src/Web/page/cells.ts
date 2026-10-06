// The badge of each cell of the storage grid and the drone: the number of the item in the mode of the window, at the
// top left of the cell (the only corner that the game and Her Dishes leave free). The number badge library draws it.
import { BADGE_PREFIX } from './core';
import type { PageData, PageItem, TradeState } from './types';
import { drawBadges, type BadgeLook } from '../../Shared/number-badge/web/numberBadge';

const BAG_GRID = '#tradeBagGrid';
const DRONE_GRID = '.col.mid .grid-container';

// The look of a badge from the data of its item; null for an item with no data. A cell that adds nothing in the mode
// has no badge and is dimmed. The number of a satiety mode is gold with no icon; the tooltip names the supply kind.
function badgeLook(data: PageData, it: PageItem): BadgeLook | null {
  const c = data.items[String(it.id)];
  if (!c) return null;
  if (c.dim) return { text: null, dim: true };
  switch (data.mode) {
    case 'trade': return { text: String(c.n), tone: c.cls || 'full' };
    case 'supply':
    case 'camp':
    case 'donate': return { text: String(c.n), tone: 'full' };
    // No number and no dim: the game's drop check failed, so the cell keeps the game's look.
    case 'request': return c.n > 0 ? { text: '+' + c.n, tone: 'full' } : null;
    default: return null;
  }
}

// The cells of one grid are its .item children in the order of the items of the page state (a keyed v-for keeps
// the order). A grid whose cell count differs from its items (a drag ghost, a game change) is left as it is.
function drawGrid(doc: Document, grid: Element | null, items: PageItem[], data: PageData | null): void {
  if (!grid) return;
  const cells = grid.querySelectorAll(':scope > .item');
  if (cells.length !== items.length) return;
  drawBadges(doc, BADGE_PREFIX, cells, items.map((it) => (data ? badgeLook(data, it) : null)));
}

export function applyCells(doc: Document, state: TradeState, data: PageData | null): void {
  drawGrid(doc, doc.querySelector(BAG_GRID), state.bag.isRack ? [] : state.bag.items, data);
  drawGrid(doc, doc.querySelector(DRONE_GRID), state.drone.items, data);
}
