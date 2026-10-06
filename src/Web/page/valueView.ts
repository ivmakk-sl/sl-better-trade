// The value view: a dropdown below the storage grid, Default or the value choice of the mode. The value
// choice gives the items of the open tab new places in the page state only, packed first-fit (the grid pack library)
// in the order of the mod numbers. The game never sees these places: a drag to the drone, a drop on a tab, and a
// click name the item by its id. The choice lives in the root page (view.choice), so it stays for the game session;
// the real places live in the frame, with the items array that they belong to.
import { view, VIEW_PREFIX, word } from './core';
import type { PageData, PageItem, TradeState, TradeWindow } from './types';
import { drawDropdown, removeDropdown, type DropdownIcon } from '../../Shared/dropdown/web/dropdown';
import { pack as packGrid } from '../../Shared/grid-pack/web/gridPack';
import defaultIcon from '../../Shared/icons/web/default.svg?raw';
import sortIcon from '../../Shared/icons/web/sort.svg?raw';
import tradeIcon from '../../Shared/icons/web/trade.svg?raw';

type Choice = 'default' | 'value';

interface ViewState {
  // The items array of the page that the real places belong to, and those places by logic id.
  items: PageItem[] | null;
  real: Map<number, [number, number]>;
  watching: boolean;
}

type ViewWindow = TradeWindow & { __btView?: ViewState };

const VALUE_WORD: Record<string, string> = {
  trade: 'tradeValue', supply: 'supply', camp: 'supply', donate: 'satiety', request: 'request'
};

// The drawn icons of the dropdown; the coin is the icon of the value choice in each mode. trim: a file ends with a
// line break, which would be a text node of the button.
const ICONS: Record<string, DropdownIcon> = {
  sort: { key: 'sort', html: sortIcon.trim() },
  default: { key: 'default', html: defaultIcon.trim() },
  trade: { key: 'trade', html: tradeIcon.trim() },
};

function frameState(w: ViewWindow): ViewState {
  if (!w.__btView) w.__btView = { items: null, real: new Map(), watching: false };
  return w.__btView;
}

function label(data: PageData, choice: Choice): string {
  if (choice === 'default') return word(data.words, 'viewDefault');
  return word(data.words, VALUE_WORD[data.mode] || VALUE_WORD.trade);
}

// The value places of the items, or null when they do not fit the grid in the value order: the group
// rank (the supply kind), the number, the highest first, then the item (config id), so the same items stand together,
// then the expiry moment of a stack that spoils, the soonest first. A dimmed cell comes last, in the game's order.
export function pack(items: PageItem[], cols: number, rows: number, data: PageData): Map<number, [number, number]> | null {
  const keyed = items.map((it, i) => {
    const c = data.items[String(it.id)];
    const last = !c || c.dim ? 1 : 0;
    return {
      it, i, last,
      o: c && !last ? c.o : 0,
      n: c && !last ? c.n : 0,
      cid: c && !last ? c.cid || 0 : 0,
      exp: c && !last && c.exp > 0 ? c.exp : Number.MAX_SAFE_INTEGER,
    };
  });
  keyed.sort((a, b) => a.last - b.last || a.o - b.o || b.n - a.n || a.cid - b.cid || a.exp - b.exp || a.i - b.i);
  return packGrid(keyed.map((k) => k.it), cols, rows);
}

// Gives the items of the open tab the places of the choice. A new items array of the page holds the real places.
function order(w: ViewWindow, state: TradeState): void {
  const vs = frameState(w);
  const items = state.bag.items;
  if (vs.items !== items) {
    vs.items = items;
    vs.real = new Map(items.map((it) => [it.id, [it.x, it.y] as [number, number]]));
  }
  const data = view.data;
  const valuePlaces = view.choice === 'value' && data && data.mode !== 'none' && !state.bag.isRack
    ? pack(items, state.bag.cols, state.bag.rows, data) : null;
  const places = valuePlaces || vs.real;
  for (const it of items) {
    const p = places.get(it.id);
    if (!p) continue;
    if (it.x !== p[0]) it.x = p[0];
    if (it.y !== p[1]) it.y = p[1];
  }
}

// The dropdown at the left of the game's Auto Organize button. With Default the button reads Sort with the sort icon;
// with the value choice, the coin and the name of the value choice in the active look.
function draw(w: ViewWindow, state: TradeState, data: PageData): void {
  const toolbar = w.document.querySelector('.bag-toolbar') as HTMLElement;
  const active = view.choice === 'value';
  drawDropdown(w.document, toolbar, {
    prefix: VIEW_PREFIX,
    anchor: '.sort-btn',
    button: active
      ? { icon: ICONS.trade, text: label(data, 'value') + ' ▾' }
      : { icon: ICONS.sort, text: word(data.words, 'sort') + ' ▾' },
    active,
    choices: [{ icon: ICONS.default, text: label(data, 'default') }, { icon: ICONS.trade, text: label(data, 'value') }],
    current: active ? 1 : 0,
    select: (i) => {
      view.choice = i === 1 ? 'value' : 'default';
      order(w, state);
      if (view.data) draw(w, state, view.data);
    },
  });
}

export function applyValueView(w: ViewWindow, state: TradeState): void {
  const vs = frameState(w);
  if (!vs.watching) {
    vs.watching = true;
    // flush 'sync': each new items array of a game message gets its places before the page draws it.
    w.Vue.watch(() => state.bag.items, () => order(w, state), { flush: 'sync' });
  }
  if (view.data) draw(w, state, view.data);
  order(w, state);
}

export function clearValueView(doc: Document): void {
  removeDropdown(doc.querySelector('.bag-toolbar'), VIEW_PREFIX);
}
