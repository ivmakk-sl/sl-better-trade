// Better Trade with Her Dishes on one cell, and the places of the header that the game renders for each trader.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import { test } from 'vitest';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, openTrade, postGame, setData } from './harness';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const HER_DISHES_JS = path.join(HERE, '..', '..', '..', 'HerDishes', 'src', 'page.js');
const HER = '.item:has(> img.item-icon[src$="#her"])';

if (gameFound && fs.existsSync(HER_DISHES_JS)) {
  test('a her dish cell keeps the heart and the pink border of Her Dishes and shows the badge', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0, { icon: 'dish.png#her' })]);
    const root = makeRootWindow(t, w);
    assert.match(String(vm.runInContext(fs.readFileSync(HER_DISHES_JS, 'utf8'), root)), /TradeUI: installed/);
    setData(root, fixtureData());

    const cell = w.document.querySelector('#tradeBagGrid > .item');
    const herCss = w.document.getElementById('herdishes-style').textContent;
    assert.ok(cell.matches(HER), 'the cell is not a her dish cell for the Her Dishes rules');
    assert.ok(herCss.includes(HER + '::after'), 'the heart rule of Her Dishes is gone');
    assert.ok(cell.matches('.item:not(.expired, .selected, .in-action, .ctrl-held .can-quick, .kin-hint, .camp-rej)' + ':has(> img.item-icon[src$="#her"])'), 'the border rule of Her Dishes does not match the cell');
    assert.equal(cell.querySelector(':scope > .bt-badge')?.textContent, '84');
  });

  test('Better Trade uses no ::after and no bottom right corner of a cell', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), fixtureData());

    const css = w.document.getElementById('bettertrade-style').textContent;
    assert.doesNotMatch(css, /::?after/);
    assert.doesNotMatch(css, /\.bt-badge\s*\{[^}]*(right|bottom):/);
  });
}

if (gameFound) {
  test('a neighbor trade has the bubble and no info rows', async (t) => {
    const w = await loadTradeWindow(t);
    await postGame(w, 'WebUI_Trade_HeaderMsg', { cpName: 'Neighbor', bubbleText: 'Hello', mode: 'trade', offerCatsJson: '', wantExceptJson: '' });
    await openTrade(w, [item(101, 0, 0)]);

    assert.ok(w.document.querySelector('.head .bubble'));
    assert.equal(w.document.querySelector('.info-rows'), null);
  });

  test('a camp trade has the bubble and the info rows with the wants row', async (t) => {
    const w = await loadTradeWindow(t);
    await postGame(w, 'WebUI_Trade_HeaderMsg', {
      cpName: 'Camp', mode: 'trade',
      offerCatsJson: JSON.stringify([{ n: 'Material', c: 9 }]),
      wantExceptJson: JSON.stringify({ n: 'Food', c: 1 })
    });
    await openTrade(w, [item(101, 0, 0)]);

    assert.ok(w.document.querySelector('.head .bubble'));
    assert.ok(w.document.querySelector('.bubble .info-rows'));
    assert.equal(w.document.querySelectorAll('.info-rows > .cp-row').length, 2);
  });
}
