// The apply pass over the TradeUI frame, and its body observer.
import { applyBar, barShows, clearBar } from './bar';
import { applyCells } from './cells';
import { applyHeader, clearHeader } from './header';
import { applyMedicine, clearMedicine } from './medicine';
import { applyRequests, clearRequests } from './requests';
import { applyRewards, clearRewards } from './rewards';
import { applyShelf } from './shelf';
import { applyTooltip } from './tooltip';
import { applyValueView, clearValueView } from './valueView';
import { component, ensureStyle, findFrame, isModNode, missingText, post, postOnce, view, type Feature } from './core';
import type { PageData, TradeState, TradeWindow } from './types';

let applying = false;

interface Draw {
  // True when the page renders the parts of the feature now: only then is a missing part a game change.
  applies(state: TradeState, data: PageData | null): boolean;
  draw(doc: Document, state: TradeState, w: TradeWindow): void;
  // Removes the nodes of the feature when it does not apply.
  clear?(doc: Document): void;
}

// Each feature draws its own nodes from view.data and the Vue state, in this order.
const DRAW: Partial<Record<Feature, Draw>> = {
  cells: { applies: () => true, draw: (doc, state) => applyCells(doc, state, view.data) },
  shelf: {
    applies: (state, data) => !!data && data.mode === 'trade' && state.shelf.items.length > 0,
    draw: (doc, state) => applyShelf(doc, state, view.data as PageData),
  },
  header: {
    applies: (_state, data) => !!data && data.mode === 'trade',
    draw: (doc, state) => applyHeader(doc, state, view.data as PageData),
    clear: clearHeader,
  },
  valueView: {
    applies: (state, data) => !!data && data.mode !== 'none' && !state.bag.isRack,
    draw: (_doc, state, w) => applyValueView(w, state),
    clear: clearValueView,
  },
  tooltip: {
    applies: (_state, data) => !!data && data.mode !== 'none',
    draw: () => applyTooltip(),
  },
  medicine: {
    applies: (_state, data) => !!data && data.mode === 'supply',
    draw: (doc) => applyMedicine(doc, view.data as PageData),
    clear: clearMedicine,
  },
  requests: {
    applies: (_state, data) => !!data && data.mode === 'request',
    draw: (doc, state) => applyRequests(doc, state.dispRows || [], view.data as PageData),
    clear: clearRequests,
  },
  rewards: {
    applies: (_state, data) => !!data && data.mode === 'request',
    draw: (doc, state) => applyRewards(doc, state.dispRows || [], view.data as PageData),
    clear: clearRewards,
  },
  bar: {
    applies: (state, data) => !!data && data.mode === 'trade' && !!data.bar && barShows(state.foot.barMode),
    draw: (doc, state) => applyBar(doc, view.data as PageData, state.drone.items.length === 0),
    clear: clearBar,
  },
};

// One draw of each feature that applies and whose game parts are there. Returns the text of each missing part.
function applyFeatures(w: TradeWindow): string[] {
  const doc = w.document;
  const comp = component(doc);
  const missing: string[] = [];
  if (!comp) return [missingText(doc, 'vue')];
  const state = comp.setupState;
  // The page renders its window only once the first storage data came (ready); the observer draws it then.
  if (!state.ready) return missing;
  for (const feature of Object.keys(DRAW) as Feature[]) {
    const d = DRAW[feature];
    if (!d) continue;
    if (!d.applies(state, view.data)) {
      if (d.clear) d.clear(doc);
      continue;
    }
    const m = missingText(doc, feature);
    if (m) missing.push(m);
    else d.draw(doc, state, w);
  }
  return missing;
}

// True when each change of the records is a write of the mod: its own node added, removed, or changed.
function onlyModWrites(records: MutationRecord[]): boolean {
  for (const r of records) {
    if (isModNode(r.target)) continue;
    if (r.type === 'characterData') {
      if (r.target.parentElement && isModNode(r.target.parentElement)) continue;
      return false;
    }
    const nodes = Array.prototype.concat.call([], Array.from(r.addedNodes), Array.from(r.removedNodes)) as Node[];
    if (nodes.length === 0 || !nodes.every(isModNode)) return false;
  }
  return true;
}

// One pass over one TradeUI frame: the style node, the features, and the body observer that applies them again after
// each game change of the page. Returns "installed", with "; missing: ..." when a part is missing.
function apply(w: TradeWindow): string {
  const doc = w.document;
  if (!component(doc)) {
    const text = 'missing: ' + missingText(doc, 'vue');
    postOnce(text);
    return 'installed; ' + text;
  }
  w.__bettertradePasses = (w.__bettertradePasses || 0) + 1;
  ensureStyle(doc);
  applying = true;
  let missing: string[];
  try { missing = applyFeatures(w); } finally { applying = false; }

  if (!w.__bettertradeObserver) {
    const observer = new MutationObserver((records) => {
      if (applying || onlyModWrites(records)) return;
      w.__bettertradeObserverPasses = (w.__bettertradeObserverPasses || 0) + 1;
      applying = true;
      try { applyFeatures(w); } catch (e) { postOnce('error: ' + e); } finally { applying = false; }
    });
    // characterData: a pick changes only the text of the count of an offered row.
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    w.__bettertradeObserver = observer;
  }

  if (!missing.length) return 'installed';
  const text = 'missing: ' + missing.join(', ');
  postOnce(text);
  return 'installed; ' + text;
}

// One pass with the stored data. No retry: when the TradeUI frame is not there, C# sends again after the message.
export function run(): string {
  const w = findFrame();
  if (!w) {
    post('no TradeUI frame');
    return 'no TradeUI frame';
  }
  try {
    return apply(w);
  } catch (e) {
    const text = 'error: ' + e;
    postOnce(text);
    return text;
  }
}
