// Library copy of shared/tooltip-lines 1.1.1. Do not edit: see src/Shared/tooltip-lines/VERSION.
// The tooltip shapes of the web pages of the game. A mod names the web page and the library picks the shape, so no
// mod reads a web page to find out how its tooltip is built.
//
// Two shapes exist. A page of the reactive shape keeps its tooltip parts in the setup closure of its Vue app and
// draws its tooltip from its own reactive state. A page of the window shape keeps them on its page window. The names
// of the parts differ by web page (onItemEnter, showItemTip, showTip; onItemMove, moveTooltip, moveTip), so each
// entry of the page table names its own, and the shape says only where the library looks for them. Each page has a
// part that fills the tooltip and a part that moves it, and the library wraps both.
import { keepInside } from './keepInside';
import { clear, draw, wrapOnce } from './register';
import type { TipContext } from './register';

export type ShapeName = 'reactive' | 'window';

// The ids that a web page gives for the item under the pointer. An id that the page does not give is 0.
export interface ItemIds {
  configId: number;
  itemId: number;
}

// Reads the ids out of an item object of one web page. Each web page has its own, because the field names and what
// they hold differ by web page. The trade window needs the page window too, to tell an offered row from an item cell.
export type IdReader = (it: Record<string, unknown>, w: Window) => ItemIds;

// One web page of the game. page is its folder name, which is also the name of its file and so the way the library
// finds its frame; pageId is the name the game itself calls the page, which is what WebUILayer.SendMessageToPage
// gives C# and is not always the folder name (Backpack, Trade, and Shop). fill is the part that fills the tooltip and
// move the part that moves it; itemArg is the place of the item in the arguments of the fill part; tip is the selector
// of the tooltip node; ids reads the ids of the item.
export interface PageEntry {
  page: string;
  pageId: string;
  shape: ShapeName;
  fill: string;
  move?: string;
  itemArg: number;
  tip: string;
  ids: IdReader;
}

// What the web page does not have. An empty list means the library installed its wrap.
export interface InstallReport {
  page: string;
  missing: string[];
}

type AnyFn = (...args: unknown[]) => unknown;
type Bag = Record<string, unknown>;

// The setup closure of a Vue page of the game, which holds its tooltip state and its hover parts. Null when the page
// has no mounted app, which the library reports as a missing part.
export function setupState(w: Window): Bag | null {
  const app = w.document.getElementById('app') as (HTMLElement & { _vnode?: { component?: { setupState?: unknown } } }) | null;
  const state = app && app._vnode && app._vnode.component ? app._vnode.component.setupState : null;
  return (state as Bag) || null;
}

// Installs the wrap of the tooltip parts of the web page, once for all mods, and reports each part the page lacks.
export function install(w: Window, entry: PageEntry): InstallReport {
  const bag = partsBag(w, entry);
  if (!bag) return { page: entry.page, missing: ['#app setup state'] };
  const missing: string[] = [];
  if (typeof bag[entry.fill] !== 'function') missing.push(entry.fill);
  if (entry.move && typeof bag[entry.move] !== 'function') missing.push(entry.move);
  if (!w.document.querySelector(entry.tip)) missing.push(entry.tip);
  if (missing.length) return { page: entry.page, missing };
  wrapFill(w, entry, bag, entry.fill);
  if (entry.move) wrapMove(w, entry, bag, entry.move);
  return { page: entry.page, missing: [] };
}

// Where the tooltip parts of the web page live: the setup closure of its Vue app, or its page window.
function partsBag(w: Window, entry: PageEntry): Bag | null {
  return entry.shape === 'reactive' ? setupState(w) : (w as unknown as Bag);
}

// Wraps the part that fills the tooltip. The page writes its own lines first, then the library draws the blocks.
function wrapFill(w: Window, entry: PageEntry, bag: Bag, part: string): void {
  if (!wrapOnce(w, entry.page + ':' + part)) return;
  const inner = bag[part] as AnyFn;
  bag[part] = (...args: unknown[]) => {
    const result = inner(...args);
    afterRender(w, () => fill(w, entry, args[entry.itemArg]));
    return result;
  };
}

// Wraps the part that moves the tooltip. The page resets the place of the tooltip on each pointer move.
function wrapMove(w: Window, entry: PageEntry, bag: Bag, part: string): void {
  if (!wrapOnce(w, entry.page + ':' + part)) return;
  const inner = bag[part] as AnyFn;
  bag[part] = (...args: unknown[]) => {
    const result = inner(...args);
    afterFrame(w, () => moved(w, entry));
    return result;
  };
}

function fill(w: Window, entry: PageEntry, it: unknown): void {
  const tip = w.document.querySelector(entry.tip) as HTMLElement | null;
  if (!tip) return;
  const ids = it && typeof it === 'object' ? entry.ids(it as Bag, w) : { configId: 0, itemId: 0 };
  // A call that names no item, such as the drone hub's showItemTip({ name: row.name }), gets no block at all.
  if (!ids.configId && !ids.itemId) {
    clear(w.document, tip);
    return;
  }
  const ctx: TipContext = { page: entry.page, configId: ids.configId, itemId: ids.itemId, item: it };
  draw(w.document, tip, ctx);
  keepInside(w.document, tip);
}

// The page wrote the place of its tooltip again, so the correction runs again for the whole group of blocks.
function moved(w: Window, entry: PageEntry): void {
  const tip = w.document.querySelector(entry.tip) as HTMLElement | null;
  if (tip && tip.querySelector(':scope > [data-sl-tip]')) keepInside(w.document, tip);
}

// A failure of one mod leaves the tooltip with the lines of the game.
function guard(run: () => void): () => void {
  return () => {
    try {
      run();
    } catch {
      // The tooltip keeps the lines of the game.
    }
  };
}

// After the page wrote its own lines. A page of the reactive shape renders them in the next Vue tick, so the draw
// waits for that tick and not for a frame: a frame would show the tooltip once without the blocks.
function afterRender(w: Window, run: () => void): void {
  const vue = (w as unknown as { Vue?: { nextTick?: (f: () => void) => void } }).Vue;
  const safe = guard(run);
  if (vue && typeof vue.nextTick === 'function') vue.nextTick(safe);
  else if (typeof w.requestAnimationFrame === 'function') w.requestAnimationFrame(safe);
  else w.setTimeout(safe, 0);
}

// After the page wrote the place of its tooltip. Each page defers that write to the next animation frame, so the
// correction has to wait for a frame too. A Vue tick is a microtask and would run before the page wrote the place,
// and the page would then overwrite the correction.
function afterFrame(w: Window, run: () => void): void {
  const safe = guard(run);
  if (typeof w.requestAnimationFrame === 'function') w.requestAnimationFrame(safe);
  else w.setTimeout(safe, 0);
}
