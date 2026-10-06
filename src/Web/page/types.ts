// The data that the page script reads: the fields of the TradeUI page state, and the data of setData.

// One part of the value of a cell: a rate ("×½") and why it applies.
export interface Factor {
  x: string;
  why: string;
}

// The parts of the trade value of a cell, for its tooltip line: tv x count x uses, then the factors.
export interface Tip {
  tv: number;
  count: number;
  uses: number;
  f: Factor[];
}

// A request demand that a cell fills (PageJson.CellDemand in C#).
export interface CellDemand {
  name: string;
  add: number;
}

// The number of one cell (PageJson.Cell in C#). cls is "full", "low", "wanted", or empty; kind is "sat", "seed",
// "mat", "med", "fuel", or empty; o is the group rank of the value view.
export interface Cell {
  n: number;
  cls: string;
  kind: string;
  dim: boolean;
  o: number;
  tip: Tip | null;
  // Each request demand that the cell fills in Deliver Request, in the game's order, with what the stack adds to it.
  demands: CellDemand[];
  // The key of the tooltip lines of the cell in PageData.info; empty for none.
  info: string;
  // The config id and the expiry moment (0 for an item that does not spoil), for the value order.
  cid: number;
  exp: number;
}

// The offer, the goods, and the deal line, as whole numbers. picked is false before any pick.
export interface Bar {
  offer: number;
  goods: number;
  dealLine: number;
  picked: boolean;
}

// A category of the header with its factor.
export interface Group {
  name: string;
  x: string;
}

// The tooltip lines of an item. stats: Satiety, Morale, Stamina, Health, Life of one use.
export interface Info {
  sub: string;
  uses: number;
  stats: number[];
  read: string;
  crop: string;
}

// One request demand of a row of the delivery request list (RequestData.DemandView in C#): the need, the delivered
// amount, the count "paid/need", and whether it is done.
export interface Demand {
  need: number;
  paid: number;
  count: string;
  done: boolean;
  // The config id of the item of a request demand for one item; 0 for none.
  item: number;
}

// The data of setData (PageJson.DataJson in C#). mode is "trade", "supply", "camp", "donate", "request", or
// "none". items by logic id, shelf (the value of one offered unit) by config id, info by config id or "L" and the
// logic id.
export interface PageData {
  mode: string;
  words: Record<string, string>;
  items: Record<string, Cell>;
  shelf: Record<string, number>;
  bar: Bar | null;
  header: { wants: Group[]; half: Group[] };
  medicine: number | null;
  // The request demand bars of the delivery request list are on (config entry DeliveryRequestList).
  bars: boolean;
  // The request demands of each row of the delivery request list, by the row key "<kind>_<id>"; empty with the bars off.
  requests: Record<string, Demand[]>;
  info: Record<string, Info>;
  // The item objects of the game's tooltip, by config id: for the item request demands and the delivery request
  // rewards. icon is the item icon.
  objects: Record<string, ItemObject>;
  // The delivery request reward of each row of the delivery request list, by the row key "<kind>_<id>"; empty with
  // the rewards off.
  rewards: Record<string, RewardItem[]>;
}

// One item of a delivery request reward (RewardData.Item in C#): its config id, whose item object is in
// PageData.objects, and its count.
export interface RewardItem {
  id: number;
  count: number;
}

// An item object as the game builds it for an offered row (Reducer_Web_TradeUI.AppendShelfJson): the page's tooltip
// reads n, category, shelfLife, and des.
export interface ItemObject {
  id: number;
  n: string;
  icon: string;
  [field: string]: unknown;
}

// One item of bag.items or drone.items of the page state (the game's item JSON). id is the logic id.
export interface PageItem {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  tv: number;
  cat: number;
  sub: number;
}

// One offered row of shelf.items. id is the config id.
export interface ShelfItem {
  id: number;
  qty: number;
  max: number;
  tv: number;
}

// One row of the delivery request list of Deliver Request (the page's dispRows): k is the kind of the delivery request.
export interface DispRow {
  k: number;
  id: number;
}

// The fields of the setup state of the TradeUI Vue app that the script reads.
export interface TradeState {
  ready: boolean;
  localText: Record<string, string>;
  bag: { items: PageItem[]; cols: number; rows: number; isRack: boolean; ownerKey: string };
  drone: { items: PageItem[] };
  shelf: { items: ShelfItem[] };
  foot: { barMode: string; phase: string };
  dispRows: DispRow[];
}

// The TradeUI frame, with the counts and the observer of the page script.
export type TradeWindow = Window & typeof globalThis & {
  Vue: {
    nextTick(fn: () => void): void;
    watch(source: () => unknown, cb: () => void, options?: { flush?: 'pre' | 'post' | 'sync' }): void;
  };
  __bettertradePasses?: number;
  __bettertradeObserverPasses?: number;
  __bettertradeObserver?: MutationObserver;
};

export interface BetterTradeApi {
  setData(data: PageData): string;
  apply(): string;
  storage(): string;
}

declare global {
  interface Window {
    // The interface of the page script in the root page.
    __bettertrade?: BetterTradeApi;
    // The message bridge of Vuplex in the root page.
    vuplex?: { postMessage(text: string): void };
  }
}
