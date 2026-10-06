// Runs the page script bundle against the game's own TradeUI.html, so a game update that renames or removes a
// page part that the script needs shows here first, not only in the game.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { test } from 'vitest';
import {
  GAME_DIR, TRADE_HTML, gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, modMessages, openTrade, runPageJs,
  setData, wait
} from './harness';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

if (!gameFound) {
  test.skip(`page.js against the game page: game files not found under SL_GAME_DIR (${GAME_DIR}); set SL_GAME_DIR to the game folder`, () => {});
} else {
  test('static: each part name of the FEATURES table is in TradeUI.html', () => {
    const source = fs.readFileSync(path.join(HERE, '..', '..', 'src', 'Web', 'page', 'core.ts'), 'utf8');
    const table = source.match(/export const FEATURES = \{([\s\S]*?)\};/);
    assert.ok(table, 'FEATURES table not found in core.ts');
    const html = fs.readFileSync(TRADE_HTML, 'utf8');
    const names = Array.from(table[1].matchAll(/'([^']+)'/g), (m) => m[1]);
    assert.ok(names.length > 0);
    for (const name of names) {
      // A "#id.path" part names a property path of the element, which is not page text: only the id is checked.
      const selector = name.charAt(0) === '#' ? name.split('.')[0] : name;
      for (const piece of selector.replace(/^[#.]/, '').split(/[ .>]+/).filter(Boolean))
        assert.ok(html.includes(piece), `page part "${name}" not found in TradeUI.html`);
    }
  });

  // The class names of the libraries come from a prefix at run time, so the test reads the style node of the frame.
  test('style: each mod node that needs a look has a rule in the style node of the frame', async (t) => {
    const tradeWindow = await loadTradeWindow(t);
    await openTrade(tradeWindow, [item(101, 0, 0)]);
    const root = makeRootWindow(t, tradeWindow);
    setData(root, fixtureData());
    const style = tradeWindow.document.getElementById('bettertrade-style')?.textContent || '';
    for (const cls of ['bt-badge', 'bt-dim', 'bt-bar-offer', 'bt-bar-goods', 'bt-bar-tip', 'bt-hide', 'bt-head', 'bt-chip',
      'bt-tip', 'bt-tip-line', 'bt-view', 'bt-view-btn', 'bt-view-menu', 'bt-view-opt', 'bt-view-on', 'bt-view-active',
      'bt-view-ico', 'bt-view-break', 'bt-med', 'bt-count', 'bt-dicon']) {
      assert.match(style, new RegExp('\\.' + cls + '[\\s,.:{\\[)>]'), `no rule for .${cls} in the style node`);
    }
    assert.doesNotMatch(style, /PFX/);
  });

  test('interface: setData with no TradeUI frame answers and posts no TradeUI frame', (t) => {
    const root = makeRootWindow(t, null);
    const result = setData(root, fixtureData());
    assert.equal(result, 'no TradeUI frame');
    assert.deepEqual(modMessages(root), ['no TradeUI frame']);
  });

  test('interface: a second full send keeps the first interface and its data', async (t) => {
    const tradeWindow = await loadTradeWindow(t);
    await openTrade(tradeWindow, [item(101, 0, 0)]);
    const root = makeRootWindow(t, null);
    setData(root, fixtureData());
    const first = root.__bettertrade;

    runPageJs(root, '0');
    assert.equal(root.__bettertrade, first);

    root.__setTradeFrame(tradeWindow);
    assert.equal(root.__bettertrade.apply(), 'installed');
    assert.equal(tradeWindow.document.querySelectorAll('#bettertrade-style').length, 1);
    root.__bettertrade.apply();
    assert.equal(tradeWindow.document.querySelectorAll('#bettertrade-style').length, 1, 'a second pass wrote a second style node');
  });

  test('interface: a page with no #app reports the Vue part as missing once and does nothing else', async (t) => {
    const tradeWindow = await loadTradeWindow(t);
    tradeWindow.document.getElementById('app').id = 'renamed';
    const root = makeRootWindow(t, tradeWindow);

    const result = setData(root, fixtureData());
    root.__bettertrade.apply();

    assert.match(String(result), /missing: vue/);
    assert.deepEqual(modMessages(root).filter((m) => m.startsWith('missing:')), ['missing: vue(#app._vnode.component)']);
    assert.equal(tradeWindow.document.getElementById('bettertrade-style'), null);
    assert.equal(tradeWindow.__bettertradeObserver, undefined);
  });

  test('pass: one setData gives one apply pass, and the observer adds no pass for the writes of the mod', async (t) => {
    const tradeWindow = await loadTradeWindow(t);
    await openTrade(tradeWindow, [item(101, 0, 0), item(102, 1, 0)], [item(103, 0, 0)]);
    const root = makeRootWindow(t, tradeWindow);

    assert.equal(setData(root, fixtureData()), 'installed');
    await wait(tradeWindow, 50);

    assert.equal(tradeWindow.__bettertradePasses, 1);
    assert.equal(tradeWindow.__bettertradeObserverPasses || 0, 0);
    assert.deepEqual(modMessages(root), []);
  });

  test('interface: a send before the page is ready reports no missing part', async (t) => {
    const tradeWindow = await loadTradeWindow(t);
    const root = makeRootWindow(t, tradeWindow);

    assert.equal(setData(root, fixtureData()), 'installed');
    assert.deepEqual(modMessages(root), []);
  });

  test('pass: one MutationObserver for each frame', async (t) => {
    const tradeWindow = await loadTradeWindow(t);
    await openTrade(tradeWindow, [item(101, 0, 0)]);
    const root = makeRootWindow(t, tradeWindow);

    setData(root, fixtureData());
    const observer = tradeWindow.__bettertradeObserver;
    root.__bettertrade.apply();

    assert.ok(observer);
    assert.equal(tradeWindow.__bettertradeObserver, observer);
  });
}
