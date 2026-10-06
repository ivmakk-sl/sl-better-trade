// The factors of the trader in the header of a trade: the mod hides the game's "Wants" row and shows its own groups,
// "Wants" (green) and "Half value" (coral). They go into .info-rows, or into a mod row of the bubble when the page
// renders no .info-rows (a neighbor). The "Offers" row of the game stays.
import { word } from './core';
import type { Group, PageData, TradeState } from './types';

const HIDE = 'bt-hide';

// The game's "Wants" row: the .cp-row whose label is the page's own wantLabel word. With no wantLabel the game page
// writes its own literal 想要 in each language, so the match uses that literal, not a mod text.
function gameWantsRow(doc: Document, state: TradeState): Element | null {
  const label = state.localText.wantLabel || '想要';
  const rows = doc.querySelectorAll('.info-rows > .cp-row');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.classList.contains('bt-head-row')) continue;
    if (row.querySelector(':scope > .cp-k')?.textContent === label) return row;
  }
  return null;
}

// One mod row: the label, then a chip for each category with its factor. Rewritten only when its text changes.
function drawRow(doc: Document, parent: Element, cls: string, label: string, groups: Group[]): void {
  let row = parent.querySelector(':scope > .bt-head-row.' + cls);
  if (!groups.length) {
    if (row) row.remove();
    return;
  }
  const text = label + '|' + groups.map((g) => g.name + ' ' + g.x).join('|');
  if (row && (row as HTMLElement).dataset.bt === text) return;
  if (!row) {
    row = doc.createElement('span');
    row.className = 'cp-row bt-head-row ' + cls;
    parent.appendChild(row);
  }
  (row as HTMLElement).dataset.bt = text;
  row.textContent = '';
  const k = doc.createElement('span');
  k.className = 'cp-k';
  k.textContent = label;
  row.appendChild(k);
  for (const g of groups) {
    const chip = doc.createElement('span');
    chip.className = 'bt-chip';
    chip.textContent = g.name + ' ' + g.x;
    row.appendChild(chip);
  }
}

export function applyHeader(doc: Document, state: TradeState, data: PageData): void {
  const wantsRow = gameWantsRow(doc, state);
  if (wantsRow && !wantsRow.classList.contains(HIDE)) wantsRow.classList.add(HIDE);

  const rows = doc.querySelector('.info-rows');
  let parent: Element | null = rows;
  if (!rows) {
    const bubble = doc.querySelector('.bubble') as Element;
    parent = bubble.querySelector(':scope > .bt-head');
    const any = data.header.wants.length || data.header.half.length;
    if (!parent && any) {
      parent = doc.createElement('div');
      parent.className = 'bt-head';
      bubble.appendChild(parent);
    } else if (parent && !any) {
      parent.remove();
      return;
    }
  }
  if (!parent) return;
  drawRow(doc, parent, 'bt-wants', word(data.words, 'wants'), data.header.wants);
  drawRow(doc, parent, 'bt-half', word(data.words, 'halfValue'), data.header.half);
}

// Removes the mod rows and shows the game's "Wants" row again.
export function clearHeader(doc: Document): void {
  doc.querySelectorAll('.bt-head-row, .bt-head').forEach((el) => el.remove());
  doc.querySelectorAll('.' + HIDE).forEach((el) => el.classList.remove(HIDE));
}
