// Runs in the root page, and reaches the TradeUI iframe through iframe.contentWindow. Defines
// window.__bettertrade once. C# calls setData(data) when the numbers of the trade window change or the root page
// has no script, and apply() at each other refresh of the window. Each call runs one pass and does not retry:
// when the TradeUI frame is not there, C# sends again later. storage() runs the storage pass alone, when the storage
// window is ready. A second full send of the script keeps the first interface and its data.
import { view } from './core';
import { run } from './install';
import { runStorage } from './storage';
import type { PageData } from './types';

// Stores the data and applies it in one pass.
function setData(data: PageData): string {
  view.data = data || null;
  return run();
}

window.__bettertrade = window.__bettertrade || { setData, apply: run, storage: runStorage };
