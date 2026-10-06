// The request demands of the delivery request list of Deliver Request: the request demand bars, or the
// game's look with the bars off.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Demand, PageData } from '../../src/Web/page/types';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, modMessages, openTrade, postGame, setData, wait, type Win } from './harness';

function data(requests: Record<string, Demand[]>, bars: boolean): PageData {
  return { ...fixtureData(), mode: 'request', bar: null, header: { wants: [], half: [] }, items: {}, bars, requests, rewards: {} };
}

// Three rows: the selected "Aid: Empty Homes" with the given request demands, "Aid: Damp Stacks", and a rescue camp
// race (kind 2), which has no request demand data.
async function requestWindow(w: Win, dims: { l: string }[]): Promise<void> {
  await postGame(w, 'WebUI_Trade_HeaderMsg', { cpName: 'Office', mode: 'dispatch' });
  await openTrade(w, [item(101, 0, 0)]);
  await postGame(w, 'WebUI_Trade_ShelfMsg', {
    supplyTargetsJson: JSON.stringify([
      { k: 1, id: 5, face: 'H', name: 'Aid: Empty Homes', sel: true, dims: dims.map((d) => ({ ...d, cur: 0, add: 0 })) },
      { k: 1, id: 6, face: 'L', name: 'Aid: Damp Stacks', sel: false, dims: [{ l: 'Disinfectant Spray', cur: 0.5, add: 0 }] },
      { k: 2, id: 0, face: 'R', name: 'Rescue camp', sel: false, dims: [{ l: 'Our camp', cur: 0.3, add: 0 }] }
    ])
  });
}

function list(w: Win): Element {
  return w.document.querySelector('.sup-list') as Element;
}

function rows(w: Win): Element[] {
  return Array.from(w.document.querySelectorAll('.sup-list > .sup-row'));
}

function cells(w: Win, row: number): Element[] {
  return Array.from(rows(w)[row].querySelectorAll('.sup-dims > .sup-cell'));
}

const LOCKPICK: Demand = { need: 2, paid: 0, count: '0/2', done: false, item: 0 };
const PACKAGE: Demand = { need: 3, paid: 1, count: '1/3', done: false, item: 0 };
const LONG = 'Home Power Storage Station Package';
const WIRE_OBJECT = {
  id: 20372, n: 'Electrical Wire', r: 0, max: 3, qty: 0, tv: 12, demand: false,
  category: 'Material', shelfLife: '', des: 'A coil of wire.', icon: 'wire.png'
};

// "Aid: Empty Homes" (and the row of the key "other") with an item request demand for Electrical Wire, then a total.
function itemData(other = ''): PageData {
  const demands: Demand[] = [
    { need: 3, paid: 1, count: '1/3', done: false, item: 20372 },
    { need: 100, paid: 0, count: '0/100', done: false, item: 0 }
  ];
  const requests: Record<string, Demand[]> = { '1_5': demands };
  if (other) requests[other] = [demands[0]];
  return { ...data(requests, true), objects: { 20372: WIRE_OBJECT } };
}

if (gameFound) {
  test('with the bars off, a pass leaves the request demands as the game drew them', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }, { l: 'Wire' }]);
    const before = list(w).innerHTML;

    setData(makeRootWindow(t, w), data({ '1_5': [LOCKPICK, { need: 2, paid: 2, count: '2/2', done: true, item: 0 }] }, false));

    assert.equal(list(w).innerHTML, before);
    assert.ok(!list(w).hasAttribute('data-bt-bars'));
  });

  test('the gold labels of the request demands are gone', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);

    setData(makeRootWindow(t, w), data({ '1_5': [LOCKPICK] }, true));

    assert.equal(w.document.querySelectorAll('.bt-need, .bt-hide').length, 0);
    assert.doesNotMatch(w.document.getElementById('bettertrade-style').textContent, /\.bt-need/);
  });

  test('a row with data gets the bars: the row mark and a count node, with no native title', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: LONG }, { l: 'Lockpick' }]);

    setData(makeRootWindow(t, w), data({ '1_5': [PACKAGE, LOCKPICK] }, true));

    assert.ok(rows(w)[0].hasAttribute('data-bt-bars'));
    assert.ok(list(w).hasAttribute('data-bt-bars'));
    const [first, second] = cells(w, 0);
    assert.equal(first.querySelectorAll(':scope > .bt-count').length, 1);
    assert.equal(first.querySelector(':scope > .bt-count')?.textContent, '1/3');
    assert.equal(first.getAttribute('title'), null);
    assert.equal(second.querySelector(':scope > .bt-count')?.textContent, '0/2');
    assert.ok(first.querySelector(':scope > .sup-dl'), 'the game label is gone');
    assert.ok(first.querySelector(':scope > .sup-track'), 'the game bar is gone');
  });

  test('a hover on a bar with no item shows its full label in the game tooltip, and leaving hides it', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: LONG }]);
    setData(makeRootWindow(t, w), data({ '1_5': [PACKAGE] }, true));
    const tip = w.document.querySelector('div.tooltip') as HTMLElement;

    cells(w, 0)[0].dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await wait(w, 20);
    assert.notEqual(tip.style.display, 'none');
    assert.match(tip.textContent || '', new RegExp(LONG));

    cells(w, 0)[0].dispatchEvent(new w.MouseEvent('mouseleave'));
    await wait(w, 20);
    assert.equal(tip.style.display, 'none');
  });

  test('a second pass adds no second count node', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);
    const root = makeRootWindow(t, w);

    setData(root, data({ '1_5': [LOCKPICK] }, true));
    root.__bettertrade.apply();

    assert.equal(cells(w, 0)[0].querySelectorAll('.bt-count').length, 1);
  });

  test('a game change of the rows keeps one count node for each request demand, with the new count', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);
    const root = makeRootWindow(t, w);
    setData(root, data({ '1_5': [LOCKPICK] }, true));

    await requestWindow(w, [{ l: 'Lockpick' }]);
    root.__bettertrade.setData(data({ '1_5': [{ need: 2, paid: 1, count: '1/2', done: false, item: 0 }] }, true));

    assert.equal(w.document.querySelectorAll('.bt-count').length, 1);
    assert.equal(cells(w, 0)[0].querySelector('.bt-count')?.textContent, '1/2');
  });

  test('a row with no data keeps the look of the game: the rescue camp race and a row missing in the data', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);

    setData(makeRootWindow(t, w), data({ '1_5': [LOCKPICK] }, true));

    for (const row of [1, 2]) {
      assert.ok(!rows(w)[row].hasAttribute('data-bt-bars'), 'row ' + row);
      assert.equal(rows(w)[row].querySelectorAll('.bt-count').length, 0);
      assert.equal(cells(w, row)[0].getAttribute('title'), null);
    }
  });

  test('a row count that does not match dispRows draws nothing', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);
    rows(w)[2].remove();

    setData(makeRootWindow(t, w), data({ '1_5': [LOCKPICK] }, true));

    assert.equal(w.document.querySelectorAll('[data-bt-bars], .bt-count').length, 0);
  });

  test('turning the bars off removes the mod nodes and marks', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);
    const root = makeRootWindow(t, w);
    setData(root, data({ '1_5': [LOCKPICK] }, true));

    root.__bettertrade.setData(data({}, false));

    assert.equal(w.document.querySelectorAll('[data-bt-bars], .bt-count, .sup-cell[title]').length, 0);
  });

  test('a request demand for one item gets the item icon as the first node of its bar, once', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Electrical Wire' }, { l: 'Fruit (total Satiety)' }]);
    const root = makeRootWindow(t, w);

    setData(root, itemData());
    root.__bettertrade.apply();

    const [wire, fruit] = cells(w, 0);
    const icons = wire.querySelectorAll('img.bt-dicon');
    assert.equal(icons.length, 1);
    assert.equal(wire.firstElementChild, icons[0]);
    assert.equal(icons[0].getAttribute('src'), 'wire.png');
    assert.equal(fruit.querySelectorAll('img.bt-dicon').length, 0);
  });

  test('a hover on an item bar shows the game tooltip of the item, and leaving it hides the tooltip', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Electrical Wire' }, { l: 'Fruit (total Satiety)' }]);
    setData(makeRootWindow(t, w), itemData());
    const tip = w.document.querySelector('div.tooltip') as HTMLElement;

    cells(w, 0)[0].dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await wait(w, 20);
    assert.match(tip.textContent || '', /A coil of wire\./);
    assert.notEqual(tip.style.display, 'none');

    cells(w, 0)[0].dispatchEvent(new w.MouseEvent('mouseleave'));
    await wait(w, 20);
    assert.equal(tip.style.display, 'none');
  });

  test('a hover on a bar with no item shows only its label, with no item description', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Electrical Wire' }, { l: 'Fruit (total Satiety)' }]);
    setData(makeRootWindow(t, w), itemData());

    cells(w, 0)[1].dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await wait(w, 20);

    const tip = w.document.querySelector('div.tooltip') as HTMLElement;
    assert.match(tip.textContent || '', /Fruit \(total Satiety\)/);
    assert.doesNotMatch(tip.textContent || '', /A coil of wire/);
  });

  test('a click on an item bar opens the item detail popup and does not select the delivery request', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Electrical Wire' }, { l: 'Fruit (total Satiety)' }]);
    const root = makeRootWindow(t, w);
    setData(root, itemData('1_6'));
    const rowClicks: string[] = [];
    rows(w)[1].addEventListener('click', () => rowClicks.push('row'));

    const wireOfOtherRow = cells(w, 1)[0];
    assert.ok(wireOfOtherRow.hasAttribute('data-interactive'));
    wireOfOtherRow.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    assert.deepEqual(modMessages(root), ['detail:20372']);
    assert.deepEqual(rowClicks, []);
  });

  test('a click on the title of the row or on a bar with no item still reaches the row', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Electrical Wire' }, { l: 'Fruit (total Satiety)' }]);
    const root = makeRootWindow(t, w);
    setData(root, itemData());
    const rowClicks: string[] = [];
    rows(w)[0].addEventListener('click', () => rowClicks.push('row'));

    (rows(w)[0].querySelector('.sup-nmtx') as Element).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    cells(w, 0)[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    assert.deepEqual(rowClicks, ['row', 'row']);
    assert.deepEqual(modMessages(root), []);
  });

  test('with the bars off, no icon and no item hover or click', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Electrical Wire' }, { l: 'Fruit (total Satiety)' }]);
    const root = makeRootWindow(t, w);
    setData(root, itemData());

    root.__bettertrade.setData({ ...itemData(), bars: false });
    cells(w, 0)[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    assert.equal(w.document.querySelectorAll('img.bt-dicon, .sup-cell[data-interactive]').length, 0);
    assert.deepEqual(modMessages(root), []);
  });

  test('the style node has the rules of the bars', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w, [{ l: 'Lockpick' }]);

    setData(makeRootWindow(t, w), data({ '1_5': [LOCKPICK] }, true));

    const style = w.document.getElementById('bettertrade-style').textContent;
    assert.match(style, /\.sup-list\[data-bt-bars\]\s*\{[^}]*overflow-x:\s*hidden/);
    assert.match(style, /\.sup-row\[data-bt-bars\] \.sup-dl\s*\{[^}]*text-overflow:\s*ellipsis/);
    assert.match(style, /\.bt-count\s*[,{]/);
  });
}
