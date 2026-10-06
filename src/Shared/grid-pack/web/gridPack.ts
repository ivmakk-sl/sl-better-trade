// Library copy of shared/grid-pack 1.0.0. Do not edit: see src/Shared/grid-pack/VERSION.
// The sorted grid places of a list of items in a given order, for the screen only: the game never sees them.
// First fit, row by row from the top left (the row-major scan of the game's BagPacker).

export interface PackItem<Id> { id: Id; w?: number; h?: number }

// The place [x, y] of each item by its id, or null when an item has no free place in this order.
export function pack<Id>(items: PackItem<Id>[], cols: number, rows: number): Map<Id, [number, number]> | null {
  const used: boolean[][] = [];
  for (let y = 0; y < rows; y++) used.push(new Array(cols).fill(false));
  const free = (x: number, y: number, w: number, h: number): boolean => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (used[y + j][x + i]) return false;
    return true;
  };
  const result = new Map<Id, [number, number]>();
  for (const it of items) {
    const w = it.w || 1, h = it.h || 1;
    let placed = false;
    for (let y = 0; y + h <= rows && !placed; y++) {
      for (let x = 0; x + w <= cols && !placed; x++) {
        if (!free(x, y, w, h)) continue;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
        result.set(it.id, [x, y]);
        placed = true;
      }
    }
    if (!placed) return null;
  }
  return result;
}
