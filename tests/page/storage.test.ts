// The storage pass of the page script: the coin icon of the trading tag in the storage window (BackpackUI), against
// a fake Vue component of the #app node. The game page keeps its tag icons in a const of setup(), and its render
// calls tagIconSvg of the setup state with the IconKey of each tag.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { test, type TestContext } from 'vitest';
import tradeSvg from '../../src/Shared/icons/web/trade.svg?raw';
import { makeRootWindow, modMessages, runPageJs, type Win } from './harness';

type IconFn = ((icon: string) => string) & { __slModTagIcons?: Record<string, string> };

function storageWindow(t: TestContext, setupState: Record<string, unknown> | null): Win {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'file:///WebUI/UI/BackpackUI/BackpackUI.html',
  });
  t.onTestFinished(() => dom.window.close());
  const w: Win = dom.window;
  if (setupState) w.document.getElementById('app')._vnode = { component: { setupState } };
  return w;
}

function gameState(): Record<string, unknown> {
  return { tagIconSvg: (icon: string) => 'game:' + icon };
}

const storagePass = (root: Win) => runPageJs(root, 'window.__bettertrade.storage()');

test('storage: the trade key gets the coin, each other key the game icon', (t) => {
  const state = gameState();
  const root = makeRootWindow(t, storageWindow(t, state));
  storagePass(root);
  const fn = state.tagIconSvg as IconFn;
  assert.equal(fn('trade'), tradeSvg);
  assert.equal(fn('misc'), 'game:misc');
  assert.equal(fn.__slModTagIcons?.trade, tradeSvg);
  assert.deepEqual(modMessages(root), ['storage: installed']);
});

test('storage: many passes keep one wrapper', (t) => {
  const state = gameState();
  const root = makeRootWindow(t, storageWindow(t, state));
  storagePass(root);
  const first = state.tagIconSvg;
  storagePass(root);
  storagePass(root);
  assert.equal(state.tagIconSvg, first);
});

test('storage: the coin joins the registry of Project Cook', (t) => {
  const state = gameState();
  const game = state.tagIconSvg as IconFn;
  const icons: Record<string, string> = { cook: '<svg id="cook"/>' };
  const cook: IconFn = (icon: string) => icons[icon] ?? game(icon);
  cook.__slModTagIcons = icons;
  state.tagIconSvg = cook;
  const root = makeRootWindow(t, storageWindow(t, state));
  storagePass(root);
  assert.equal(state.tagIconSvg, cook);
  assert.equal(cook('trade'), tradeSvg);
  assert.equal(cook('cook'), '<svg id="cook"/>');
});

test('storage: no Vue component posts the missing part', (t) => {
  const root = makeRootWindow(t, storageWindow(t, null));
  storagePass(root);
  assert.deepEqual(modMessages(root), ['storage: missing #app']);
});

test('storage: no tagIconSvg posts the missing part', (t) => {
  const root = makeRootWindow(t, storageWindow(t, {}));
  storagePass(root);
  assert.deepEqual(modMessages(root), ['storage: missing tagIconSvg']);
});

test('storage: no storage frame posts it, and never the TradeUI frame message', (t) => {
  const root = makeRootWindow(t, null);
  storagePass(root);
  assert.deepEqual(modMessages(root), ['no storage frame']);
});
