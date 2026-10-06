// Library copy of shared/number-badge 1.0.0. Do not edit: see src/Shared/number-badge/VERSION.
// The number badge of an item cell: a small number at the top left of the cell, with the tone that the mod gives,
// and the dim of a cell with no number. Each class name comes from the prefix of the mod: <prefix>-badge,
// <prefix>-<tone>, <prefix>-dim on the cell, and <prefix>-layer for a layer that the mod makes.
import css from './numberBadge.css?inline';

// The look of one cell. A null text means no badge (dim still applies). id keys the badge in a layer (data-id).
export interface BadgeLook {
  text: string | null;
  tone?: string | null;
  dim?: boolean;
  id?: string;
}

// The CSS of the library with the prefix of the mod. The mod puts it between its tokens and its own rules.
export function numberBadgeCss(prefix: string): string {
  return css.replace(/PFX/g, prefix);
}

// Writes the badge and the dim class of each cell, only where they differ. looks[i] is the look of cells[i]; a null
// look means no badge and no dim. With a layer, the badges go into the layer at the places (left, top) of their
// cells, keyed by the id of the look, and a badge of a cell that is gone goes; else each badge is the last child of
// its cell.
export function drawBadges(doc: Document, prefix: string, cells: ArrayLike<Element>, looks: (BadgeLook | null)[], layer?: HTMLElement): void {
  const badgeCls = prefix + '-badge';
  const dimCls = prefix + '-dim';
  const kept = new Set<string>();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i] as HTMLElement;
    const look = looks[i] || null;
    const id = look && look.id !== undefined ? look.id : String(i);
    let badge = (layer
      ? layer.querySelector(':scope > .' + badgeCls + '[data-id="' + id + '"]')
      : cell.querySelector(':scope > .' + badgeCls)) as HTMLElement | null;
    if (!look || look.text === null) {
      if (badge) badge.remove();
    } else {
      if (!badge) {
        badge = doc.createElement('span');
        if (layer) badge.dataset.id = id;
      }
      const cls = badgeCls + (look.tone ? ' ' + prefix + '-' + look.tone : '');
      if (badge.className !== cls) badge.className = cls;
      if (badge.textContent !== look.text) badge.textContent = look.text;
      if (layer) {
        if (badge.style.left !== cell.style.left) badge.style.left = cell.style.left;
        if (badge.style.top !== cell.style.top) badge.style.top = cell.style.top;
        if (badge.parentElement !== layer) layer.appendChild(badge);
        kept.add(id);
      } else if (cell.lastElementChild !== badge) {
        cell.appendChild(badge);
      }
    }
    const dimmed = !!look && !!look.dim;
    if (cell.classList.contains(dimCls) !== dimmed) cell.classList.toggle(dimCls, dimmed);
  }
  if (layer) {
    layer.querySelectorAll(':scope > .' + badgeCls).forEach((el) => {
      if (!kept.has((el as HTMLElement).dataset.id || '')) el.remove();
    });
  }
}
