// The medicine total of the drone in Deliver Supplies to a neighbor, which the game does not show: one more chip
// "Medicine +56" in the selected neighbor row, in the style of the game's own "Seeds +8" line (the drone's own preview
// line does not render for medicine alone).
import { word } from './core';
import type { PageData } from './types';

export function applyMedicine(doc: Document, data: PageData): void {
  const row = doc.querySelector('.sup-row.on');
  const place = row ? (row.querySelector('.sup-dims') || row.querySelector('.sup-details')) : null;
  let chip = doc.querySelector('.bt-med') as HTMLElement | null;
  if (!place || data.medicine === null) {
    if (chip) chip.remove();
    return;
  }
  const text = word(data.words, 'medicine') + ' +' + data.medicine;
  if (!chip) {
    chip = doc.createElement('span');
    chip.className = 'sup-cell bt-med';
  }
  if (chip.textContent !== text) chip.textContent = text;
  if (chip.parentElement !== place || place.lastElementChild !== chip) place.appendChild(chip);
}

export function clearMedicine(doc: Document): void {
  const chip = doc.querySelector('.bt-med');
  if (chip) chip.remove();
}
