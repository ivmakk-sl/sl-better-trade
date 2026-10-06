// The offer and the goods beside the bottom bar of a trade (form A): the offer at the left end of the bar, the goods
// at the right end. A hover on the bar gives the words with the deal line.
import { word } from './core';
import type { Bar, PageData } from './types';

const BODY_CLASS = 'bettertrade-bar';

// The bar of the game renders in these modes only.
export function barShows(barMode: string): boolean {
  return barMode === 'balance' || barMode === 'noquote';
}

function node(doc: Document, parent: Element, cls: string): HTMLElement {
  let el = parent.querySelector(':scope > .' + cls) as HTMLElement | null;
  if (!el) {
    el = doc.createElement('span');
    el.className = cls;
    parent.appendChild(el);
  }
  return el;
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function drop(parent: Element, cls: string): void {
  const el = parent.querySelector(':scope > .' + cls);
  if (el) el.remove();
}

export function tipText(bar: Bar, words: Record<string, string>): string {
  const parts = [word(words, 'offer') + ' ' + bar.offer];
  if (bar.picked) parts.push(word(words, 'goods') + ' ' + bar.goods, word(words, 'dealLine') + ' ' + bar.dealLine);
  return parts.join(' · ');
}

type TrackEl = HTMLElement & { __btTip?: boolean };

// droneEmpty: no offer number while the drone holds no item.
export function applyBar(doc: Document, data: PageData, droneEmpty: boolean): void {
  const bar = data.bar as Bar;
  const main = doc.querySelector('.foot-main') as HTMLElement;
  const track = main.querySelector('.bal-track') as TrackEl;
  if (!doc.body.classList.contains(BODY_CLASS)) doc.body.classList.add(BODY_CLASS);

  if (droneEmpty) drop(main, 'bt-bar-offer');
  else setText(node(doc, main, 'bt-bar-offer'), String(bar.offer));
  if (bar.picked) setText(node(doc, main, 'bt-bar-goods'), String(bar.goods));
  else drop(main, 'bt-bar-goods');

  const tip = node(doc, main, 'bt-bar-tip');
  setText(tip, tipText(bar, data.words));
  if (!track.__btTip) {
    track.__btTip = true;
    track.addEventListener('mouseenter', () => {
      const t = main.querySelector(':scope > .bt-bar-tip') as HTMLElement | null;
      if (t) t.hidden = false;
    });
    track.addEventListener('mouseleave', () => {
      const t = main.querySelector(':scope > .bt-bar-tip') as HTMLElement | null;
      if (t) t.hidden = true;
    });
    tip.hidden = true;
  }
}

// Removes the nodes and the body class of the bar numbers.
export function clearBar(doc: Document): void {
  doc.body.classList.remove(BODY_CLASS);
  const main = doc.querySelector('.foot-main');
  if (!main) return;
  for (const cls of ['bt-bar-offer', 'bt-bar-goods', 'bt-bar-tip']) drop(main, cls);
}
