// The storage pass: the coin icon of the trading tag in the storage window (BackpackUI). The page keeps its tag icons
// in a const of setup(), which a script cannot reach, and its render calls tagIconSvg of the setup state with the
// IconKey of each tag (the misc icon for an unknown key). So the pass gives the coin to the registry of the mod tags
// library, which wraps tagIconSvg of the #app component once for all mods. Each pass posts its result, because the
// sends of C# have no result callback.
import { registerTagIcon } from '../../Shared/mod-tags/web/registerTagIcon';
import tradeSvg from '../../Shared/icons/web/trade.svg?raw';
import { post } from './core';

// The IconKey of the trading tag (TradingTagLogic.IconKey in C#).
const TRADE_KEY = 'trade';

type AppNode = HTMLElement & { _vnode?: { component?: { setupState?: Record<string, unknown> } } };

export function findStorageFrame(): Window | null {
  const frames = document.querySelectorAll('iframe');
  for (let i = 0; i < frames.length; i++) {
    const w = frames[i].contentWindow;
    if (!w) continue;
    try { if (/BackpackUI\.html/i.test(String(w.location))) return w; } catch (e) { /* a frame of another origin */ }
  }
  return null;
}

// One pass over the storage window frame. No retry: the next ready call of the window makes a new pass.
export function runStorage(): string {
  const w = findStorageFrame();
  const result = w ? installTagIcon(w) : 'no storage frame';
  post(result);
  return result;
}

function installTagIcon(w: Window): string {
  const app = w.document.getElementById('app') as AppNode | null;
  const state = app && app._vnode && app._vnode.component && app._vnode.component.setupState;
  if (!state) return 'storage: missing #app';
  if (!registerTagIcon(state, TRADE_KEY, tradeSvg)) return 'storage: missing tagIconSvg';
  return 'storage: installed';
}
