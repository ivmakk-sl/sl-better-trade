// Library copy of shared/tooltip-lines 1.1.1. Do not edit: see src/Shared/tooltip-lines/VERSION.
// The registry of the tooltip blocks and the draw of one group of blocks into a tooltip of the game.
//
// The library copies of two mods are two closures, so the registry cannot live in a module. It lives on the window
// object of the frame of the web page, as __slTipLines. That name and its shape (an object with a blocks array of
// records with id, rank, prefix, and lines) are a contract that no library version changes. The window object is the
// host rather than the wrapped tooltip part, because another mod can put its own wrapper over that part and a
// property on it would then be hidden: the next library copy would find no host, build a second registry, and a block
// could draw twice.

// What the library knows about the item under the pointer. A mod reads no item object of a web page.
//
// Each web page names its items its own way: most give the item config id, while an item cell of the character in the
// trade window and in the shop window gives the item instance id only. So both ids are here, and the one that the web
// page does not give is 0. A mod reads its number by whichever id it got.
export interface TipContext {
  page: string;
  configId: number;
  itemId: number;
  item: unknown;
}

// The lines of one block for the item under the pointer. An empty list means no block for this hover.
export type TipLines = (ctx: TipContext) => string[];

// The nodes of one block, for a mod whose line holds a part of its own, for example a word in a color of the mod.
// An empty list means no block for this hover. The mod owns the markup inside its block.
export type TipNodes = (ctx: TipContext) => HTMLElement[];

// One block of one mod. rank fixes the place of the block; two blocks of one rank order by their ids.
//
// A block gives its content as lines of text or as its own nodes. A block that gives both draws its nodes, so a mod
// has one way at a time and the library never has to merge the two.
export interface TipBlock {
  id: string;
  rank: number;
  prefix: string;
  lines?: TipLines;
  nodes?: TipNodes;
}

export interface TipHost {
  blocks: TipBlock[];
  wrapped: string[];
}

const HOST = '__slTipLines';

// The one registry of the frame. The first library copy that runs creates it, and each later copy finds it.
export function host(w: Window): TipHost {
  const holder = w as unknown as Record<string, TipHost | undefined>;
  const found = holder[HOST];
  if (found && Array.isArray(found.blocks)) {
    if (!Array.isArray(found.wrapped)) found.wrapped = [];
    return found;
  }
  const made: TipHost = { blocks: [], wrapped: [] };
  holder[HOST] = made;
  return made;
}

// True the first time for a part of a web page, and false after that, so the part is wrapped once for all mods. The
// mark lives in the host and not on the wrapped part itself, because another mod can wrap the part again with a plain
// function and a mark on the part would then be out of reach.
export function wrapOnce(w: Window, key: string): boolean {
  const wrapped = host(w).wrapped;
  if (wrapped.indexOf(key) >= 0) return false;
  wrapped.push(key);
  return true;
}

// Adds the block, or replaces the block of the same id, so a second pass of one mod adds no second block.
export function register(w: Window, block: TipBlock): void {
  const blocks = host(w).blocks;
  const at = blocks.findIndex((b) => b.id === block.id);
  if (at >= 0) blocks[at] = block;
  else blocks.push(block);
}

// Removes the block of this mod and its element. The blocks of the other mods stay.
export function unregister(w: Window, id: string): void {
  const blocks = host(w).blocks;
  const at = blocks.findIndex((b) => b.id === id);
  if (at >= 0) blocks.splice(at, 1);
  const el = w.document ? elementOf(w.document, id) : null;
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function elementOf(doc: Document, id: string): HTMLElement | null {
  return doc.querySelector('[data-sl-tip="' + id + '"]') as HTMLElement | null;
}

function sorted(blocks: TipBlock[]): TipBlock[] {
  return blocks.slice().sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Writes the blocks of all mods into the tooltip, in rank order. A block that is already in the tooltip keeps its
// place, so a block of another mod is never pushed behind. A block that the web page dropped is added again.
export function draw(doc: Document, tip: HTMLElement, ctx: TipContext): void {
  const blocks = sorted(host(doc.defaultView as Window).blocks);
  const elements: (HTMLElement | null)[] = blocks.map((b) => tip.querySelector(':scope > [data-sl-tip="' + b.id + '"]') as HTMLElement | null);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const children = content(doc, b, ctx);
    let el = elements[i];
    if (!children.length) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      elements[i] = null;
      continue;
    }
    if (!el) {
      el = doc.createElement('div');
      el.dataset.slTip = b.id;
      elements[i] = el;
    }
    el.className = b.prefix + '-tip';
    el.textContent = '';
    for (const child of children) el.appendChild(child);
    if (el.parentNode !== tip) tip.insertBefore(el, anchor(tip, blocks, elements, i));
  }
}

// The children of one block: its own nodes when it gives them, else one element for each line of text. A part that
// throws gives nothing, so a web page that changed costs its own block and not the tooltip.
function content(doc: Document, b: TipBlock, ctx: TipContext): HTMLElement[] {
  try {
    if (b.nodes) return b.nodes(ctx) || [];
    if (!b.lines) return [];
    const out: HTMLElement[] = [];
    for (const text of b.lines(ctx) || []) {
      const line = doc.createElement('div');
      line.className = b.prefix + '-tip-line';
      line.textContent = text;
      out.push(line);
    }
    return out;
  } catch {
    return [];
  }
}

// The element of the first later block that is already in the tooltip. Null means the end of the tooltip.
function anchor(tip: HTMLElement, blocks: TipBlock[], elements: (HTMLElement | null)[], from: number): HTMLElement | null {
  for (let i = from + 1; i < blocks.length; i++) {
    const el = elements[i];
    if (el && el.parentNode === tip) return el;
  }
  return null;
}

// Removes each block of the library from the tooltip, for a hover that carries no item config id.
export function clear(doc: Document, tip: HTMLElement): void {
  for (const el of Array.from(tip.querySelectorAll(':scope > [data-sl-tip]'))) el.remove();
}
