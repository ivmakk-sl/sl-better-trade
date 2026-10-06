// More lines in the hover tooltip of an offered row and of an item of the character: the subcategory, the uses, the
// stats of one use, the effect of a book, the crop of a seed, and the value line with its factors (or the number of
// the mode).
//
// The lines go through the shared tooltip lines library, which owns the wrap of the hover parts of the page, the
// place of each block, and the correction for a tooltip that grew. The mod gives two blocks: what the item is at
// rank 10, and what it is worth at rank 30, so another mod can sit between them or below them by its own rank.
import { addTipLines } from '../../Shared/tooltip-lines/web/tooltipLines';
import type { TipContext } from '../../Shared/tooltip-lines/web/tooltipLines';
import { view, word } from './core';
import type { Cell, Info, PageData, ShelfItem } from './types';

const PAGE = 'TradeUI';
const STATS = ['satiety', 'morale', 'stamina', 'health', 'life'];
const KINDS: Record<string, string> = { sat: 'satiety', seed: 'seed', mat: 'material', med: 'medicine', fuel: 'fuel' };

function num(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function infoLines(data: PageData, info: Info | undefined): string[] {
  if (!info) return [];
  const lines: string[] = [];
  if (info.sub) lines.push(info.sub);
  if (info.uses > 1) lines.push(word(data.words, 'uses') + ' ' + info.uses);
  const stats: string[] = [];
  for (let i = 0; i < STATS.length; i++)
    if (info.stats[i]) stats.push(word(data.words, STATS[i]) + ' ' + num(info.stats[i]));
  if (stats.length) lines.push(stats.join(' · '));
  if (info.read) lines.push(word(data.words, 'onRead') + ': ' + info.read);
  if (info.crop) lines.push(word(data.words, 'grows') + ': ' + info.crop);
  return lines;
}

// "84 = 28 x 6 uses x ½ (Half value)": the trade value of a cell with its parts.
function tradeLine(data: PageData, c: Cell): string {
  let text = word(data.words, 'tradeValue') + ' ' + c.n;
  const tip = c.tip;
  // A value with nothing that multiplies it needs no parts ("Trade value 22", not "22 = 22").
  if (!tip || (tip.count <= 1 && tip.uses === 1 && !tip.f.length)) return text;
  text += ' = ' + tip.tv;
  if (tip.count > 1) text += ' x ' + tip.count;
  if (tip.uses !== 1) text += ' x ' + num(tip.uses) + ' ' + word(data.words, 'uses').toLowerCase();
  for (const f of tip.f) {
    text += ' x ' + f.x.replace('×', '');
    if (f.why === 'half') text += ' (' + word(data.words, 'halfValue') + ')';
    else if (f.why === 'wanted') text += ' (' + word(data.words, 'wants') + ')';
  }
  return text;
}

// "Request +5 · Product, +1 · Product Types": what the stack adds to each request demand that it fills.
function requestLine(data: PageData, c: Cell): string {
  const parts = (c.demands || []).map((d) => '+' + d.add + (d.name ? ' · ' + d.name : ''));
  if (!parts.length && c.n > 0) parts.push('+' + c.n);
  return parts.length ? word(data.words, 'request') + ' ' + parts.join(', ') : '';
}

// The number of a cell in a mode other than a trade.
function modeLine(data: PageData, c: Cell): string {
  if (c.dim) return '';
  switch (data.mode) {
    case 'supply':
    case 'camp': {
      const k = KINDS[c.kind];
      return word(data.words, k || 'supply') + ' ' + c.n;
    }
    case 'donate': return word(data.words, 'satiety') + ' ' + c.n;
    case 'request': return requestLine(data, c);
    default: return '';
  }
}

// "91 = 13 x 7 uses": the value of one offered unit; a factor when the goods count it higher (Medicine at a camp).
function shelfLine(data: PageData, it: ShelfItem, info: Info | undefined): string {
  const unit = data.shelf[String(it.id)];
  if (unit === undefined) return '';
  const uses = info && info.uses > 1 ? info.uses : 1;
  let text = word(data.words, 'tradeValue') + ' ' + unit;
  if (uses === 1 && unit === it.tv) return text;
  text += ' = ' + it.tv;
  if (uses > 1) text += ' x ' + uses + ' ' + word(data.words, 'uses').toLowerCase();
  const base = it.tv * uses;
  if (base > 0 && unit !== base) text += ' x ' + num(unit / base);
  return text;
}

// The item under the pointer, as the two numbers the library reads from the page. An offered row of the goods gives
// an item config id, and an item cell of the character or of the drone gives an item instance id.
function cellOf(data: PageData, ctx: TipContext): { info: Info | undefined; cell: Cell | null; shelf: ShelfItem | null } {
  if (ctx.configId) {
    const shelf = ctx.item as ShelfItem;
    return { info: data.info[String(ctx.configId)], cell: null, shelf };
  }
  const cell = data.items[String(ctx.itemId)];
  if (!cell) return { info: undefined, cell: null, shelf: null };
  return { info: cell.info ? data.info[cell.info] : undefined, cell, shelf: null };
}

// Rank 10: what the item is.
export function factLines(ctx: TipContext): string[] {
  const data = view.data;
  if (!data || data.mode === 'none') return [];
  const found = cellOf(data, ctx);
  if (!found.shelf && !found.cell) return [];
  return infoLines(data, found.info);
}

// Rank 30: what the item is worth, or the number of the mode.
export function valueLines(ctx: TipContext): string[] {
  const data = view.data;
  if (!data || data.mode === 'none') return [];
  const found = cellOf(data, ctx);
  const value = found.shelf
    ? shelfLine(data, found.shelf, found.info)
    : found.cell
      ? (data.mode === 'trade' ? tradeLine(data, found.cell) : modeLine(data, found.cell))
      : '';
  return value ? [value] : [];
}

// Registers both blocks of the mod with the library, which installs itself into the trade window on the first call
// and keeps the registry of every mod in that frame.
export function applyTooltip(root: Window = window): void {
  addTipLines(root, { page: PAGE, id: 'bettertrade-facts', rank: 10, prefix: 'bt', lines: factLines });
  addTipLines(root, { page: PAGE, id: 'bettertrade-value', rank: 30, prefix: 'bt', lines: valueLines });
}
