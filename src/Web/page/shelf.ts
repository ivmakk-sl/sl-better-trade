// The offered rows of a trade: the value of one unit on the icon, and a click on the icon that opens the game's item
// detail popup through C#.
import { BADGE_PREFIX, post } from './core';
import type { PageData, TradeState } from './types';
import { drawBadges } from '../../Shared/number-badge/web/numberBadge';

type IconEl = HTMLElement & { __btDetail?: number };

// The rows are the .shelf-row nodes in the order of shelf.items (a keyed v-for keeps the order). The click reads the
// config id of the row at click time, so a row that Vue reuses for another item sends the right id.
export function applyShelf(doc: Document, state: TradeState, data: PageData): void {
  const rows = doc.querySelectorAll('.shelf-list > .shelf-row');
  const items = state.shelf.items;
  if (rows.length !== items.length) return;
  for (let i = 0; i < rows.length; i++) {
    const icon = rows[i].querySelector(':scope .shelf-icon') as IconEl | null;
    if (!icon) continue;
    drawBadge(doc, icon, items[i].id, data);
    icon.__btDetail = items[i].id;
    if (!icon.hasAttribute('data-interactive')) icon.setAttribute('data-interactive', '');
    // The page syncs its click rects on a class change, not on a new data-interactive attribute.
    if (!icon.classList.contains('bt-detail')) icon.classList.add('bt-detail');
    if (icon.dataset.btClick) continue;
    icon.dataset.btClick = '1';
    icon.addEventListener('click', () => {
      if (icon.__btDetail) post('detail:' + icon.__btDetail);
    });
  }
}

// The value of one offered unit, in a badge at the top left of the icon, as on a cell. The row keeps its layout.
function drawBadge(doc: Document, icon: Element, configId: number, data: PageData): void {
  const unit = data.shelf[String(configId)];
  drawBadges(doc, BADGE_PREFIX, [icon], [unit === undefined ? null : { text: String(unit), tone: 'full' }]);
}
