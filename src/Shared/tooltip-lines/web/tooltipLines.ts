// Library copy of shared/tooltip-lines 1.1.1. Do not edit: see src/Shared/tooltip-lines/VERSION.
// The one way for a mod to extend a tooltip of an item in a web page of the game.
//
// A mod names the web page, gives its block an id, a rank, and a class prefix, and gives a part that returns the
// lines of the block for the item under the pointer. The library finds the open frame of that web page, wraps its
// tooltip parts once for all mods, and draws the blocks of all mods in rank order below the lines of the game.
//
// A mod never reads a web page to find out how its tooltip is built, and never wraps a tooltip part itself. Two mods
// that both add a block share one registry and one wrap, so each block is drawn once and the order of the blocks
// comes from the ranks and not from which mod loaded first.
import css from './tooltipLines.css?inline';
import { pageEntry } from './pages';
import { register, unregister } from './register';
import type { TipLines, TipNodes } from './register';
import { install } from './shapes';
import type { InstallReport } from './shapes';

export type { TipContext, TipLines, TipNodes } from './register';
export type { InstallReport } from './shapes';

// The ranks that the mods of this workspace use. A mod may register more than one block.
//
//   10  what the item is: subcategory, uses, stats, tier
//   20  what it does in this window
//   30  what it is worth: the trade value and its factors
//   40  how much the character holds: the item total

export interface TipBlockSpec {
  // The web page of the game, by its folder name (BackpackUI, TradeUI, Cooking, and so on).
  page: string;
  // The id of the block of this mod. Two blocks of one rank order by their ids.
  id: string;
  rank: number;
  // The prefix of the class names and the CSS variables of this mod (bt, it, projectcook).
  prefix: string;
  // The content of the block: lines of text, or the mod's own nodes when a line holds a part in a color of the mod.
  // A block that gives both draws its nodes.
  lines?: TipLines;
  nodes?: TipNodes;
}

// The CSS of a block with the prefix of the mod. The mod puts it between its tokens and its own rules.
export function tooltipLinesCss(prefix: string): string {
  return css.replace(/PFX/g, prefix);
}

// The open frame of a web page of the game, read from the root page. Null while that window is not open, or while its
// page is still loading.
export function findTipFrame(root: Window, page: string): Window | null {
  const frames = root.document.querySelectorAll('iframe');
  const match = new RegExp('/' + page + '\\.html', 'i');
  for (let i = 0; i < frames.length; i++) {
    const w = (frames[i] as HTMLIFrameElement).contentWindow;
    if (!w) continue;
    try {
      if (!match.test(String(w.location))) continue;
    } catch {
      continue;
    }
    if (w.document.readyState !== 'complete') continue;
    return w;
  }
  return null;
}

// Adds the block of a mod to the tooltip of a web page. Null when that window is not open, so the mod can try again
// on its next push. Otherwise a report: an empty missing list means the block is installed, and a part in that list
// means the web page changed and the mod should log it once.
export function addTipLines(root: Window, spec: TipBlockSpec): InstallReport | null {
  const entry = pageEntry(spec.page);
  if (!entry) return { page: spec.page, missing: ['no entry in the page table'] };
  const w = findTipFrame(root, spec.page);
  if (!w) return null;
  const report = install(w, entry);
  if (report.missing.length) return report;
  register(w, { id: spec.id, rank: spec.rank, prefix: spec.prefix, lines: spec.lines, nodes: spec.nodes });
  return report;
}

// Removes the block of a mod. The blocks of the other mods keep their lines and their places.
export function removeTipLines(root: Window, page: string, id: string): void {
  const w = findTipFrame(root, page);
  if (w) unregister(w, id);
}
