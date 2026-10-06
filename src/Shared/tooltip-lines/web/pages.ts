// Library copy of shared/tooltip-lines 1.1.1. Do not edit: see src/Shared/tooltip-lines/VERSION.
// The table of the web pages of the game that have an item tooltip: where each page keeps its tooltip parts, what
// they are called, which node the tooltip is, and how to read the ids of the item under the pointer.
//
// Each fact here is read from the game's own code: the page file for a part name and a tooltip node, and the item
// message class of the page or the decompiled builder of its JSON for an id field.
import { setupState } from './shapes';
import type { IdReader, ItemIds, PageEntry } from './shapes';

const NONE: ItemIds = { configId: 0, itemId: 0 };

function numberOf(raw: unknown): number {
  const id = typeof raw === 'string' ? Number(raw) : raw;
  return typeof id === 'number' && isFinite(id) && id > 0 ? id : 0;
}

// A web page whose named field holds the item config id.
export function configField(field: string): IdReader {
  return (it) => {
    const configId = numberOf(it[field]);
    return configId ? { configId, itemId: 0 } : NONE;
  };
}

// A web page whose named field holds the item instance id and that gives no item config id.
export function itemField(field: string): IdReader {
  return (it) => {
    const itemId = numberOf(it[field]);
    return itemId ? { configId: 0, itemId } : NONE;
  };
}

// The trade window: an offered row of shelf.items holds the item config id in its id field, and an item cell of the
// character or of the drone holds the item instance id in the same field. The page's own shelf.items tells them
// apart, as Better Trade does today, because the fields alone do not.
const tradeIds: IdReader = (it, w) => {
  const id = numberOf(it.id);
  if (!id) return NONE;
  const setup = setupState(w) as { shelf?: { items?: unknown[] } } | null;
  const shelf = setup && setup.shelf ? setup.shelf.items : null;
  const offered = Array.isArray(shelf) && shelf.indexOf(it) >= 0;
  return offered ? { configId: id, itemId: 0 } : { configId: 0, itemId: id };
};

// The shop window: an item of the stock holds the item config id in itemConfigId, and an item cell of the character
// holds the item instance id in id and no item config id at all. The two field sets do not overlap.
const shopIds: IdReader = (it) => {
  const configId = numberOf(it.itemConfigId);
  if (configId) return { configId, itemId: 0 };
  const itemId = numberOf(it.id);
  return itemId ? { configId: 0, itemId } : NONE;
};

// A page of the reactive shape: the tooltip parts live in the setup closure of its Vue app.
function reactive(page: string, pageId: string, itemArg: number, ids: IdReader): PageEntry {
  return { page, pageId, shape: 'reactive', fill: 'onItemEnter', move: 'onItemMove', itemArg, tip: 'div.tooltip', ids };
}

// A page of the window shape: the tooltip parts live on the page window, under the names that page gives them.
function windowPage(page: string, pageId: string, fill: string, move: string, tip: string): PageEntry {
  return { page, pageId, shape: 'window', fill, move, itemArg: 0, tip, ids: configField('configId') };
}

// The second name of each entry is the page id that the game itself uses, read from the UIKey of its WebUIVm class
// (the bare word beside the page URL in its call index). It is the folder name for eleven of the fourteen pages, and
// differs for the storage window, the trade window, and the shop window.
export const PAGES: PageEntry[] = [
  reactive('BackpackUI', 'Backpack', 2, configField('cfgId')),
  reactive('TradeUI', 'Trade', 1, tradeIds),
  reactive('ShopUI', 'Shop', 1, shopIds),
  windowPage('Cooking', 'Cooking', 'showItemTip', 'moveTooltip', '#recipeTooltip'),
  windowPage('MaterialRack', 'MaterialRack', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('AidDepot', 'AidDepot', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('BrewPanel', 'BrewPanel', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('DailyFert', 'DailyFert', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('DroneHub', 'DroneHub', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('DyePanel', 'DyePanel', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('RatCage', 'RatCage', 'showItemTip', 'moveTip', '#itemTooltip'),
  windowPage('Compressor', 'Compressor', 'showTip', 'moveTip', '#itemTip'),
  windowPage('Shredder', 'Shredder', 'showTip', 'moveTip', '#itemTip'),
  windowPage('GreenhouseBuild', 'GreenhouseBuild', 'showTip', 'moveTip', '#itemTip'),
];

// The entry of a web page by its folder name, or null when the library does not serve that page.
export function pageEntry(page: string): PageEntry | null {
  for (const entry of PAGES) if (entry.page === page) return entry;
  return null;
}

// The entry of a web page by the page id that the game uses, or null. This is what a mod looks up when it has a page
// id from the game, such as the argument of WebUILayer.SendMessageToPage.
export function pageEntryById(pageId: string): PageEntry | null {
  for (const entry of PAGES) if (entry.pageId === pageId) return entry;
  return null;
}
