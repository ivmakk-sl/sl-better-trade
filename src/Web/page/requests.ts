// The request demand bars of the delivery request list of Deliver Request. The CSS of the mod restyles the
// game's nodes of a marked row into one bar for each request demand; the page code adds only the count node
// ("paid/need"). With the bars off (config entry DeliveryRequestList), the request demands stay as the game draws them.
//
// The marks on game nodes are data attributes, not bt- classes: a node with a bt- class is a mod node to the observer,
// which would then miss the game's changes inside it.
//
// A hover on a bar shows the game's tooltip of the trade window: for a request demand for one item, the
// item tooltip; for each other bar, its full label alone, because the label on the bar can be cut and the game's web
// view shows no native title. The bar of an item also gets the item icon as its first node, and a click on it opens
// the game's item detail popup through C# and does not reach the row, so the row stays unselected.
import { component, post } from './core';
import type { Demand, DispRow, ItemObject, PageData } from './types';

const MARK = 'data-bt-bars';
const COUNT = 'bt-count';
const ICON = 'bt-dicon';

// The state of a bar at event time: Vue can reuse a cell for another request demand.
type Cell = HTMLElement & { __btOn?: boolean; __btItem?: ItemObject | null; __btHooked?: boolean };

type Tip = { onItemEnter?(e: MouseEvent, it: unknown): void; onItemMove?(e: MouseEvent): void; onItemLeave?(): void };

function tipOf(doc: Document): Tip | null {
  return (component(doc)?.setupState as unknown as Tip) || null;
}

// The object of the game's tooltip: the item, or an object with only the full label as its name (id 0, so no mod adds
// item lines to it).
function tipObject(cell: Cell): unknown {
  if (cell.__btItem) return cell.__btItem;
  return { id: 0, n: (cell.querySelector(':scope > .sup-dl')?.textContent || '').trim(), icon: '' };
}

function hook(doc: Document, cell: Cell): void {
  if (cell.__btHooked) return;
  cell.__btHooked = true;
  cell.addEventListener('mouseenter', (e) => { if (cell.__btOn) tipOf(doc)?.onItemEnter?.(e, tipObject(cell)); });
  cell.addEventListener('mousemove', (e) => { if (cell.__btOn) tipOf(doc)?.onItemMove?.(e); });
  cell.addEventListener('mouseleave', () => { if (cell.__btOn) tipOf(doc)?.onItemLeave?.(); });
  cell.addEventListener('click', (e) => {
    if (!cell.__btOn || !cell.__btItem) return;
    e.stopPropagation();
    post('detail:' + cell.__btItem.id);
  });
}

function drawIcon(doc: Document, cell: Cell, item: ItemObject | null): void {
  let icon = cell.querySelector(':scope > img.' + ICON) as HTMLImageElement | null;
  if (!item || !item.icon) {
    icon?.remove();
    return;
  }
  if (!icon) {
    icon = doc.createElement('img');
    icon.className = ICON;
    icon.setAttribute('draggable', 'false');
    cell.insertBefore(icon, cell.firstChild);
  }
  if (icon.getAttribute('src') !== item.icon) icon.setAttribute('src', item.icon);
}

function drawCell(doc: Document, cell: Cell, demand: Demand, data: PageData): void {
  let count = cell.querySelector(':scope > .' + COUNT);
  if (!count) {
    count = doc.createElement('span');
    count.className = COUNT;
    cell.appendChild(count);
  }
  if (count.textContent !== demand.count) count.textContent = demand.count;
  const item = (demand.item && data.objects && data.objects[String(demand.item)]) || null;
  cell.__btOn = true;
  cell.__btItem = item;
  drawIcon(doc, cell, item);
  hook(doc, cell);
  if (item) {
    if (!cell.hasAttribute('data-interactive')) cell.setAttribute('data-interactive', '');
  } else cell.removeAttribute('data-interactive');
}

function clearRow(row: Element): void {
  row.removeAttribute(MARK);
  row.querySelectorAll('.sup-dims > .sup-cell').forEach((el) => {
    const cell = el as Cell;
    cell.querySelector(':scope > .' + COUNT)?.remove();
    cell.querySelector(':scope > img.' + ICON)?.remove();
    cell.removeAttribute('data-interactive');
    cell.__btOn = false;
    cell.__btItem = null;
  });
}

// The rows are the .sup-row nodes of the list in the order of the page's dispRows; the cells of a row are its request
// demands in order. A row whose cell count differs from its data keeps the game's look.
export function applyRequests(doc: Document, dispRows: DispRow[], data: PageData): void {
  const list = doc.querySelector('.sup-list');
  const rows = doc.querySelectorAll('.sup-list > .sup-row');
  if (!list || !data.bars || rows.length !== dispRows.length) {
    clearRequests(doc);
    return;
  }
  if (!list.hasAttribute(MARK)) list.setAttribute(MARK, '');
  for (let r = 0; r < rows.length; r++) {
    const demands = data.requests[dispRows[r].k + '_' + dispRows[r].id];
    const cells = rows[r].querySelectorAll('.sup-dims > .sup-cell');
    if (!demands || demands.length !== cells.length) {
      clearRow(rows[r]);
      continue;
    }
    if (!rows[r].hasAttribute(MARK)) rows[r].setAttribute(MARK, '');
    for (let i = 0; i < cells.length; i++) drawCell(doc, cells[i] as Cell, demands[i], data);
  }
}

export function clearRequests(doc: Document): void {
  doc.querySelector('.sup-list')?.removeAttribute(MARK);
  doc.querySelectorAll('.sup-list > .sup-row').forEach(clearRow);
}
