// The delivery request rewards of the delivery request list of Deliver Request: a strip after the
// request demands of each row with a reward, a "Rewards" title with a thin rule, then one
// button for each reward item with its icon and "xN" at its bottom right for more than one. A hover shows the game's
// item tooltip of the trade window, and a click opens the game's item detail popup through C# and does not reach the
// row. A long reward shows 3 lines, with a "+N" tile in the last place that opens the strip in place; the collapse
// tile at its end closes it again. The strip is a node of the mod, so it works with the request demand bars on or off.
import { component, post, word } from './core';
import type { DispRow, ItemObject, PageData, RewardItem } from './types';

const STRIP = 'bt-rewards';
const LINES = 3;
// The places of one line with no layout to measure (the page tests): what fits a row of the list in the game.
const PLACES = 5;
const SIZE = 26;
const GAP = 6;

type Tip = { onItemEnter?(e: MouseEvent, it: unknown): void; onItemMove?(e: MouseEvent): void; onItemLeave?(): void };
type Button = HTMLElement & { __btItem?: ItemObject };

// The rows whose long reward is open, by row key, for each trade window page: a reopened window is a new document.
const opened = new WeakMap<Document, Set<string>>();

function openSet(doc: Document): Set<string> {
  let set = opened.get(doc);
  if (!set) {
    set = new Set();
    opened.set(doc, set);
  }
  return set;
}

function tipOf(doc: Document): Tip | null {
  return (component(doc)?.setupState as unknown as Tip) || null;
}

function button(doc: Document, reward: RewardItem, item: ItemObject): Button {
  const b = doc.createElement('span') as Button;
  b.className = 'bt-reward';
  b.setAttribute('data-interactive', '');
  b.__btItem = item;
  if (item.icon) {
    const img = doc.createElement('img');
    img.className = 'bt-reward-ico';
    img.setAttribute('src', item.icon);
    img.setAttribute('draggable', 'false');
    b.appendChild(img);
  }
  if (reward.count > 1) {
    const n = doc.createElement('span');
    n.className = 'bt-xn';
    n.textContent = 'x' + reward.count;
    b.appendChild(n);
  }
  if (!tipOf(doc)?.onItemEnter) b.setAttribute('title', item.n);
  b.addEventListener('mouseenter', (e) => tipOf(doc)?.onItemEnter?.(e, b.__btItem));
  b.addEventListener('mousemove', (e) => tipOf(doc)?.onItemMove?.(e));
  b.addEventListener('mouseleave', () => tipOf(doc)?.onItemLeave?.());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.__btItem) post('detail:' + b.__btItem.id);
  });
  return b;
}

// The "+N" tile, or the collapse tile of an open strip: a click switches the row and draws its strip again.
function moreTile(doc: Document, text: string, onClick: () => void): HTMLElement {
  const m = doc.createElement('span');
  m.className = 'bt-more';
  m.setAttribute('data-interactive', '');
  m.textContent = text;
  m.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return m;
}

// The places of one line of icons: measured from the width of the strip when the page has a layout.
function placesOf(strip: HTMLElement): number {
  const width = strip.clientWidth;
  return width > 0 ? Math.max(1, Math.floor((width + GAP) / (SIZE + GAP))) : PLACES;
}

// The strip node with the reward items and the data of the last pass, so a click on the "+N" tile draws the latest
// item objects, and the places of one line that its icons were drawn for.
type Strip = HTMLElement & { __btKey?: string; __btShown?: RewardItem[]; __btData?: PageData; __btPlaces?: number };

function fillIcons(doc: Document, strip: Strip): void {
  const key = strip.__btKey as string;
  const shown = strip.__btShown as RewardItem[];
  const data = strip.__btData as PageData;
  const icons = strip.querySelector('.bt-rewards-icons') as HTMLElement;
  icons.textContent = '';
  const places = placesOf(strip);
  strip.__btPlaces = places;
  const max = LINES * places;
  const open = openSet(doc).has(key);
  const long = shown.length > max;
  const visible = long && !open ? shown.slice(0, max - 1) : shown;
  for (const r of visible) icons.appendChild(button(doc, r, data.objects[String(r.id)]));
  if (!long) return;
  const redraw = (): void => {
    const set = openSet(doc);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    fillIcons(doc, strip);
  };
  icons.appendChild(moreTile(doc, open ? '−' : '+' + (shown.length - visible.length), redraw));
}

// The strip of one row: its nodes are built again only when its reward items change, and its icons when the places
// of one line change (the width of the list changed).
function drawStrip(doc: Document, row: Element, key: string, rewards: RewardItem[], data: PageData): void {
  const dims = row.querySelector('.sup-dims');
  let strip = row.querySelector('.' + STRIP) as Strip | null;
  const shown = rewards.filter((r) => data.objects && data.objects[String(r.id)]);
  if (!dims || !shown.length) {
    strip?.remove();
    return;
  }
  const sig = shown.map((r) => r.id + 'x' + r.count).join(',');
  if (strip && strip.dataset.btSig === sig && strip.previousElementSibling === dims) {
    strip.__btShown = shown;
    strip.__btData = data;
    if (strip.__btPlaces !== placesOf(strip)) fillIcons(doc, strip);
    return;
  }
  strip?.remove();
  strip = doc.createElement('div') as Strip;
  strip.className = STRIP;
  strip.dataset.btSig = sig;
  strip.__btKey = key;
  strip.__btShown = shown;
  strip.__btData = data;
  const title = doc.createElement('div');
  title.className = 'bt-rewards-title';
  title.textContent = word(data.words, 'rewards');
  const rule = doc.createElement('span');
  rule.className = 'bt-rewards-rule';
  title.appendChild(rule);
  strip.appendChild(title);
  const icons = doc.createElement('div');
  icons.className = 'bt-rewards-icons';
  strip.appendChild(icons);
  dims.after(strip);
  fillIcons(doc, strip);
}

// The rows are the .sup-row nodes of the list in the order of the page's dispRows.
export function applyRewards(doc: Document, dispRows: DispRow[], data: PageData): void {
  const rows = doc.querySelectorAll('.sup-list > .sup-row');
  if (rows.length !== dispRows.length || !data.rewards) {
    clearRewards(doc);
    return;
  }
  for (let r = 0; r < rows.length; r++) {
    const key = dispRows[r].k + '_' + dispRows[r].id;
    const rewards = data.rewards[key];
    if (rewards && rewards.length) drawStrip(doc, rows[r], key, rewards, data);
    else rows[r].querySelector('.' + STRIP)?.remove();
  }
}

export function clearRewards(doc: Document): void {
  doc.querySelectorAll('.' + STRIP).forEach((el) => el.remove());
}
