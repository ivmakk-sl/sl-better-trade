// The value view: a dropdown below the storage grid that shows the items of the open tab in the order of their numbers.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Cell, PageData, PageItem } from '../../src/Web/page/types';
import { pack } from '../../src/Web/page/valueView';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, postGame, setData, wait, type Win } from './harness';

function data(): PageData {
  return { ...fixtureData(), words: { viewDefault: 'Default', sort: 'Sort', tradeValue: 'Trade value', supply: 'Supply', satiety: 'Satiety', request: 'Request' } };
}

// The cell of each item of the storage grid by logic id, as "x,y" from the place that the page draws.
function places(w: Win): Record<string, string> {
  const s = w.document.getElementById('app')._vnode.component.setupState;
  const out: Record<string, string> = {};
  const cells = w.document.querySelectorAll('#tradeBagGrid > .item');
  s.bag.items.forEach((it: { id: number }, i: number) => {
    const el = cells[i] as HTMLElement;
    out[it.id] = ((parseInt(el.style.left) - 3) / 56) + ',' + ((parseInt(el.style.top) - 3) / 56);
  });
  return out;
}

const click = (w: Win, el: Element | null) => el!.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const button = (w: Win) => w.document.querySelector('.bag-toolbar > .bt-view > .bt-view-btn') as HTMLElement;
const menu = (w: Win) => w.document.querySelector('.bt-view-menu') as HTMLElement;

// Selects a choice by its index in the list: 0 is Default, 1 the value choice.
async function choose(w: Win, which: 'default' | 'value'): Promise<void> {
  const doc = w.document;
  click(w, button(w));
  const option = doc.querySelectorAll('.bt-view-menu > .bt-view-opt')[which === 'default' ? 0 : 1];
  assert.ok(option, 'no menu option ' + which);
  option.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(w, 20);
}

async function bag(w: Win, cols: number, rows: number, items: object[], owner = '1'): Promise<void> {
  await postGame(w, 'WebUI_Trade_FootMsg', { phase: 'trade', barMode: 'balance' });
  await postGame(w, 'WebUI_Trade_BagMsg', { bagCols: cols, bagRows: rows, bagItemsJson: JSON.stringify(items), bagTabsJson: '[]', bagOwnerKey: owner, bagIsRack: false });
  await postGame(w, 'WebUI_Trade_DroneMsg', { droneCols: 3, droneRows: 2, droneItemsJson: '[]' });
}

// Hardtack 84 at (2,0), Bandage 90 at (0,1), Wire 60 at (0,0): the fixture numbers.
const FRIDGE = [item(103, 0, 0), item(101, 2, 0), item(102, 0, 1)];

// The sort keys of the value order, on pack alone: the order of the ids by their places in a grid of
// 4 columns.
function orderOf(cells: Record<number, Partial<Cell>>, mode = 'request'): number[] {
  const ids = Object.keys(cells).map(Number);
  const items = ids.map((id, i) => ({ id, x: i % 4, y: Math.floor(i / 4), w: 1, h: 1, tv: 0, cat: 1, sub: 0 }) as PageItem);
  const full: Record<string, Cell> = {};
  for (const id of ids)
    full[id] = { n: 0, cls: '', kind: '', dim: false, o: 0, tip: null, demands: [], info: '', cid: 0, exp: 0, ...cells[id] };
  const places = pack(items, 4, 3, { ...fixtureData(), mode, items: full });
  assert.ok(places, 'the items do not fit');
  return ids.slice().sort((a, b) => {
    const pa = places.get(a) as [number, number];
    const pb = places.get(b) as [number, number];
    return pa[1] * 4 + pa[0] - (pb[1] * 4 + pb[0]);
  });
}

test('the value order: the number first, the highest first', () => {
  assert.deepEqual(orderOf({ 1: { n: 2, cid: 50 }, 2: { n: 9, cid: 60 }, 3: { n: 5, cid: 70 } }), [2, 3, 1]);
});

test('the value order: items of the same number stand together by item', () => {
  // Strawberry (2541) and Tomato (2001) in mixed places, each +2.
  const order = orderOf({ 1: { n: 2, cid: 2541 }, 2: { n: 2, cid: 2001 }, 3: { n: 2, cid: 2541 }, 4: { n: 2, cid: 2001 } });
  assert.deepEqual(order, [2, 4, 1, 3]);
});

test('the value order: among the stacks of one item, the one that expires sooner comes first', () => {
  const order = orderOf({ 1: { n: 84, cid: 12001, exp: 9000 }, 2: { n: 84, cid: 12001, exp: 3000 }, 3: { n: 84, cid: 12001, exp: 6000 } });
  assert.deepEqual(order, [2, 3, 1]);
});

test('the value order: a stack that does not spoil keeps its place among its item', () => {
  assert.deepEqual(orderOf({ 1: { n: 5, cid: 20101 }, 2: { n: 5, cid: 20101 } }), [1, 2]);
});

test('the value order: a dimmed cell comes last in the game order, whatever its item and expiry', () => {
  const order = orderOf({
    1: { dim: true, cid: 900, exp: 9 }, 2: { n: 1, cid: 50 }, 3: { dim: true, cid: 100, exp: 1 }, 4: { n: 3, cid: 60 }
  });
  assert.deepEqual(order, [4, 2, 1, 3]);
});

test('the value order in Deliver Supplies: the kind group comes before the number', () => {
  const order = orderOf({ 1: { n: 90, o: 2, cid: 1 }, 2: { n: 10, o: 0, cid: 2 }, 3: { n: 50, o: 0, cid: 3 } }, 'supply');
  assert.deepEqual(order, [3, 2, 1]);
});

if (gameFound) {
  test('the dropdown is at the left of Auto Organize, with the sort icon and Sort, and the list names Default and the value choice', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());

    const view = w.document.querySelector('.bag-toolbar > .bt-view');
    assert.ok(view?.nextElementSibling?.classList.contains('sort-btn'));
    assert.equal(button(w).textContent, 'Sort ▾');
    assert.equal(button(w).querySelector('.bt-view-ico')?.getAttribute('data-choice'), 'sort');
    assert.ok(button(w).querySelector('.bt-view-ico svg'));
    assert.ok(!button(w).classList.contains('bt-view-active'));
    assert.ok(button(w).hasAttribute('data-interactive'));
    click(w, button(w));
    const options = w.document.querySelectorAll('.bt-view-menu > .bt-view-opt');
    assert.deepEqual([...options].map((o) => o.textContent), ['Default', 'Trade value']);
    assert.deepEqual([...options].map((o) => o.querySelector('.bt-view-ico')?.getAttribute('data-choice')), ['default', 'trade']);
    assert.equal(w.document.querySelectorAll('.bt-view-opt.bt-view-on').length, 0, 'Default is marked in gold');
  });

  for (const [mode, word] of [['trade', 'Trade value'], ['supply', 'Supply'], ['donate', 'Satiety'], ['request', 'Request']]) {
    test(`the value choice in the mode ${mode}: the coin and ${word} in the active look`, async (t) => {
      const w = await loadTradeWindow(t);
      await bag(w, 4, 3, FRIDGE);
      setData(makeRootWindow(t, w), { ...data(), mode } as PageData);

      await choose(w, 'value');

      assert.equal(button(w).textContent, word + ' ▾');
      assert.equal(button(w).querySelector('.bt-view-ico')?.getAttribute('data-choice'), 'trade');
      assert.ok(button(w).classList.contains('bt-view-active'));
      assert.ok(w.document.querySelectorAll('.bt-view-opt')[1].classList.contains('bt-view-on'));
    });
  }

  test('a click on a cell closes the open list, keeps the choice, and reaches the cell', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());
    await choose(w, 'value');

    click(w, button(w));
    assert.equal(menu(w).hidden, false);
    const cell = w.document.querySelector('#tradeBagGrid > .item') as HTMLElement;
    let cellClicks = 0;
    cell.addEventListener('click', () => cellClicks++);
    click(w, cell);

    assert.equal(menu(w).hidden, true);
    assert.equal(cellClicks, 1);
    assert.equal(button(w).textContent, 'Trade value ▾');
    assert.deepEqual(places(w), { 102: '0,0', 101: '1,0', 103: '2,0' });
  });

  test('a game word in lower case starts the label with a capital letter', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), { ...data(), words: { viewDefault: 'Default', tradeValue: 'trade value' } });

    await choose(w, 'value');

    assert.equal(w.document.querySelector('.bt-view-btn')?.textContent, 'Trade value ▾');
  });

  test('sort a fridge by trade value: the highest number at the top left, then the others in order', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());

    await choose(w, 'value');

    assert.deepEqual(places(w), { 102: '0,0', 101: '1,0', 103: '2,0' });
    assert.equal(w.document.querySelector('.bt-view-btn')?.textContent, 'Trade value ▾');
    assert.equal(w.document.querySelectorAll('#tradeBagGrid > .item')[2].querySelector('.bt-badge')?.textContent, '90', 'the badge left its item');
  });

  test('Default shows the real places again', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());
    await choose(w, 'value');

    await choose(w, 'default');

    assert.deepEqual(places(w), { 103: '0,0', 101: '2,0', 102: '0,1' });
  });

  test('the choice stays after a tab message', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());
    await choose(w, 'value');

    await bag(w, 4, 3, [item(103, 3, 2), item(102, 0, 2)], '2');

    assert.deepEqual(places(w), { 103: '1,0', 102: '0,0' });
  });

  test('the game Auto Organize message gets the value order again', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());
    await choose(w, 'value');

    await postGame(w, 'WebUI_Trade_BagMsg', { bagItemsJson: JSON.stringify([item(101, 0, 0), item(102, 1, 0), item(103, 2, 0)]) });

    assert.deepEqual(places(w), { 102: '0,0', 101: '1,0', 103: '2,0' });
  });

  test('a pack that does not fit keeps the game places', async (t) => {
    const w = await loadTradeWindow(t);
    // A grid of 4 x 2: the game has the 2 x 2 Wire at the left; in the value order the two 2 x 1 items take the top row
    // first, and the Wire no longer fits.
    await bag(w, 4, 2, [item(103, 0, 0, { w: 2, h: 2 }), item(102, 2, 0, { w: 2 }), item(101, 2, 1, { w: 2 })]);
    setData(makeRootWindow(t, w), data());

    await choose(w, 'value');

    assert.deepEqual(places(w), { 103: '0,0', 102: '2,0', 101: '2,1' });
  });

  test('the choice stays for the next trade: a new frame keeps the value choice', async (t) => {
    const w1 = await loadTradeWindow(t);
    await bag(w1, 4, 3, FRIDGE);
    const root = makeRootWindow(t, w1);
    setData(root, data());
    await choose(w1, 'value');

    const w2 = await loadTradeWindow(t);
    await bag(w2, 4, 3, FRIDGE);
    root.__setTradeFrame(w2);
    root.__bettertrade.apply();
    await wait(w2, 20);

    assert.equal(w2.document.querySelector('.bt-view-btn')?.textContent, 'Trade value ▾');
    assert.deepEqual(places(w2), { 102: '0,0', 101: '1,0', 103: '2,0' });
  });

  test('the choice stays for the next trade in another mode: the donation shows Satiety', async (t) => {
    const w1 = await loadTradeWindow(t);
    await bag(w1, 4, 3, FRIDGE);
    const root = makeRootWindow(t, w1);
    setData(root, data());
    await choose(w1, 'value');

    const w2 = await loadTradeWindow(t);
    await bag(w2, 4, 3, FRIDGE);
    root.__setTradeFrame(w2);
    setData(root, { ...data(), mode: 'donate' } as PageData);

    assert.equal(button(w2).textContent, 'Satiety ▾');
    assert.ok(button(w2).classList.contains('bt-view-active'));
  });

  test('no dropdown on a rack tab', async (t) => {
    const w = await loadTradeWindow(t);
    await bag(w, 4, 3, FRIDGE);
    setData(makeRootWindow(t, w), data());

    await postGame(w, 'WebUI_Trade_BagMsg', { bagIsRack: true, bagRackRowsJson: '[]' });

    assert.equal(w.document.querySelector('.bt-view'), null);
  });
}
