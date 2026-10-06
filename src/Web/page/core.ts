// The helpers that all features use: the frame lookup, the Vue state, the stored data, the game parts, the messages
// to C#, and the style node.
import tokensCss from '../tokens.css?inline';
import pageCss from '../page.css?inline';
import { dropdownCss } from '../../Shared/dropdown/web/dropdown';
import { numberBadgeCss } from '../../Shared/number-badge/web/numberBadge';
import { tooltipLinesCss } from '../../Shared/tooltip-lines/web/tooltipLines';
import type { PageData, TradeState, TradeWindow } from './types';

// The data of the last setData; null until C# sends it. The choice of the value view lives here in the root page, so it
// stays for the game session: across the tabs, the trade windows, and the modes, until a browser rebuild.
export const view: { data: PageData | null; choice: 'default' | 'value' } = { data: null, choice: 'default' };

// The game parts that each feature needs. The Vue part is a property path of the page, the others are selectors that
// the page always renders while its window is open. A missing part turns off its feature and is reported once.
export const FEATURES = {
  vue: ['#app._vnode.component'],
  cells: ['#tradeBagGrid'],
  shelf: ['.shelf-list', '.shelf-icon'],
  header: ['.bubble'],
  tooltip: ['div.tooltip'],
  valueView: ['.bag-toolbar'],
  medicine: ['.sup-list'],
  requests: ['.sup-list'],
  rewards: ['.sup-list'],
  bar: ['.foot-main', '.bal-track']
};

export type Feature = keyof typeof FEATURES;

// A label with a capital first letter: some game words are unit labels in lower case ("trade value"). A Chinese word
// has no case and stays as it is.
export function cap(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// The text of a mod text from the data, with a capital first letter. C# sends each mod text from the i18n files, so
// the page keeps no text of its own: a missing one shows its name, as in the C# code.
export function word(words: Record<string, string>, name: string): string {
  const text = words[name];
  return text ? cap(text) : name;
}

// The texts that the script posted to C# since the root page has it, so each is posted once.
const posted = new Set<string>();

// Tells C# what it must act on, by message (C# sends each call with no callback).
export function post(text: string): void {
  try { window.vuplex?.postMessage('slmod|bettertrade|' + text); } catch (e) { /* the root page has no Vuplex bridge */ }
}

export function postOnce(text: string): void {
  if (posted.has(text)) return;
  posted.add(text);
  post(text);
}

// A part is a selector, or "#id.a.b": the element with that id and a property path on it.
function partExists(doc: Document, part: string): boolean {
  const dot = part.indexOf('.');
  if (part.charAt(0) !== '#' || dot < 0) return !!doc.querySelector(part);
  let obj: unknown = doc.getElementById(part.substring(1, dot));
  for (const step of part.substring(dot + 1).split('.')) {
    if (!obj) return false;
    obj = (obj as Record<string, unknown>)[step];
  }
  return !!obj;
}

// The text of the missing parts of a feature, or empty when the feature has all.
export function missingText(doc: Document, feature: Feature): string {
  const missing = FEATURES[feature].filter((part) => !partExists(doc, part));
  return missing.length ? feature + '(' + missing.join(',') + ')' : '';
}

// The Vue component of the trade window: the production runtime keeps #app._vnode.component, whose setupState is
// the reactive state of the page.
export function component(doc: Document): { setupState: TradeState; proxy: Record<string, unknown> } | null {
  const app = doc.getElementById('app') as (HTMLElement & { _vnode?: { component?: { setupState: TradeState; proxy: Record<string, unknown> } } }) | null;
  return (app && app._vnode && app._vnode.component) || null;
}

// The TradeUI frame once it has loaded, looked up again on each call: a reopened window is a new iframe.
export function findFrame(): TradeWindow | null {
  const frames = document.querySelectorAll('iframe');
  for (let i = 0; i < frames.length; i++) {
    const w = frames[i].contentWindow as TradeWindow | null;
    if (!w) continue;
    try { if (!/TradeUI\.html/i.test(String(w.location))) continue; } catch (e) { continue; }
    if (w.document.readyState !== 'complete') continue;
    return w;
  }
  return null;
}

// The prefixes of the classes of the libraries: the value view dropdown, the number badge of a cell, and the blocks
// of the mod in the item tooltip.
export const VIEW_PREFIX = 'bt-view';
export const BADGE_PREFIX = 'bt';
export const TIP_PREFIX = 'bt';

// The one style node of the mod in the frame: the tokens, the rules of the libraries, then the rules of the mod, so a
// rule of the mod wins over a library rule of the same weight.
export function ensureStyle(doc: Document): void {
  if (doc.getElementById('bettertrade-style')) return;
  const style = doc.createElement('style');
  style.id = 'bettertrade-style';
  style.textContent = [tokensCss, dropdownCss(VIEW_PREFIX), numberBadgeCss(BADGE_PREFIX),
    tooltipLinesCss(TIP_PREFIX), pageCss].join('\n');
  doc.head.appendChild(style);
}

// A node of the mod: its class names start with "bt-". The dim class of the number badge library sits on a game cell,
// so it does not make the cell a node of the mod: the observer must still see the game's changes of that cell.
export function isModNode(node: Node): boolean {
  const el = node as Element;
  return !!(el && el.classList && Array.prototype.some.call(el.classList, (c: string) => c.indexOf('bt-') === 0 && c !== 'bt-dim'));
}
