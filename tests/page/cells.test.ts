// The badge of each cell of the storage grid and the drone, in each mode.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Cell, PageData } from '../../src/Web/page/types';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, openTrade, postGame, setData, wait, type Win } from './harness';

function cell(n: number, extra?: Partial<Cell>): Cell {
  return { n, cls: '', kind: '', dim: false, o: 0, tip: null, demands: [], info: '', cid: 0, exp: 0, ...extra };
}

function modeData(mode: string, items: Record<string, Cell>): PageData {
  return { ...fixtureData(), mode, items };
}

// The cell nodes of the storage grid and of the drone, in page order.
function bagCells(w: Win): Element[] { return Array.from(w.document.querySelectorAll('#tradeBagGrid > .item')); }
function droneCells(w: Win): Element[] { return Array.from(w.document.querySelectorAll('.col.mid .grid-container > .item')); }
function badge(el: Element): Element | null { return el.querySelector(':scope > .bt-badge'); }

if (gameFound) {
  test('trade: each cell shows the trade value of its stack in the color of its factor', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0), item(102, 1, 0)], [item(103, 0, 0)]);
    const root = makeRootWindow(t, w);

    setData(root, fixtureData());

    const [hardtack, bandage] = bagCells(w);
    assert.equal(badge(hardtack)?.textContent, '84');
    assert.ok(badge(hardtack)?.classList.contains('bt-low'));
    assert.equal(badge(bandage)?.textContent, '90');
    assert.ok(badge(bandage)?.classList.contains('bt-wanted'));
    const wire = droneCells(w)[0];
    assert.equal(badge(wire)?.textContent, '60');
    assert.ok(badge(wire)?.classList.contains('bt-full'));
    assert.equal(hardtack.lastElementChild, badge(hardtack), 'the badge is not the last child of the cell');
  });

  test('trade: the badge rules give the three colors from tokens and put the badge at the top left', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), fixtureData());

    const css = w.document.getElementById('bettertrade-style').textContent;
    assert.match(css, /\.bt-badge\.bt-full[^{]*\{[^}]*var\(--bt-gold\)/);
    assert.match(css, /\.bt-badge\.bt-low\s*\{[^}]*var\(--bt-coral\)/);
    assert.match(css, /\.bt-badge\.bt-wanted\s*\{[^}]*var\(--bt-green\)/);
    assert.match(css, /\.bt-badge\s*\{[^}]*top:[^}]*left:/);
  });

  test('supply: a cell shows only its number, with no kind icon; a cell that adds nothing is dimmed', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(201, 0, 0), item(202, 1, 0)]);
    setData(makeRootWindow(t, w), modeData('supply', { 201: cell(80, { kind: 'sat' }), 202: cell(0, { dim: true, o: 5 }) }));

    const [rice, book] = bagCells(w);
    assert.equal(badge(rice)?.textContent, '80');
    assert.equal(badge(rice)?.querySelector('.bt-ico'), null, 'a kind icon on the cell');
    assert.ok(badge(rice)?.classList.contains('bt-full'), 'the number is not gold');
    assert.equal(badge(book), null, 'a cell that adds nothing has a badge');
    assert.ok(book.classList.contains('bt-dim'));
    assert.ok(!rice.classList.contains('bt-dim'));
  });

  test('a game change of the children of a dimmed cell still runs the observer', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(201, 0, 0), item(202, 1, 0)]);
    setData(makeRootWindow(t, w), modeData('supply', { 201: cell(80, { kind: 'sat' }), 202: cell(0, { dim: true, o: 5 }) }));
    await wait(w, 20);
    const before = w.__bettertradeObserverPasses || 0;

    const book = bagCells(w)[1];
    assert.ok(book.classList.contains('bt-dim'));
    book.appendChild(w.document.createElement('span'));
    await wait(w, 20);

    assert.ok((w.__bettertradeObserverPasses || 0) > before, 'the observer skipped a game change of a dimmed cell');
  });

  test('donation and request: a cell shows its number with no icon, a request number with a plus sign', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(301, 0, 0)]);
    const root = makeRootWindow(t, w);

    setData(root, modeData('donate', { 301: cell(80) }));
    assert.equal(badge(bagCells(w)[0])?.textContent, '80');
    assert.equal(badge(bagCells(w)[0])?.querySelector('.bt-ico'), null);

    root.__bettertrade.setData(modeData('request', { 301: cell(36, { demands: [{ name: 'Meat satiety', add: 36 }] }) }));
    assert.equal(badge(bagCells(w)[0])?.textContent, '+36');
  });

  test('request: a cell with no number and no dim (a failed drop check) shows no badge and is not dimmed', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(301, 0, 0)]);
    setData(makeRootWindow(t, w), modeData('request', { 301: cell(0) }));

    assert.equal(badge(bagCells(w)[0]), null);
    assert.equal(w.document.querySelectorAll('.bt-dim').length, 0);
  });

  test('none: a window with no mode shows no badge, and a later setData removes the old badges', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    const root = makeRootWindow(t, w);
    setData(root, fixtureData());
    assert.ok(badge(bagCells(w)[0]));

    root.__bettertrade.setData(modeData('none', {}));
    assert.equal(w.document.querySelectorAll('.bt-badge').length, 0);
  });

  test('a new bag.items array after a message keeps one badge for each cell', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0), item(102, 1, 0)]);
    setData(makeRootWindow(t, w), fixtureData());

    await postGame(w, 'WebUI_Trade_BagMsg', { bagItemsJson: JSON.stringify([item(102, 0, 0), item(101, 1, 0), item(999, 2, 0)]) });
    await wait(w, 20);

    const cells = bagCells(w);
    assert.equal(cells.length, 3);
    assert.equal(badge(cells[0])?.textContent, '90');
    assert.equal(badge(cells[1])?.textContent, '84');
    assert.equal(badge(cells[2]), null, 'an item with no data got a badge');
    for (const c of cells) assert.ok(c.querySelectorAll('.bt-badge').length <= 1);
  });

  test('the badge survives a Vue patch of its cell', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), fixtureData());

    await postGame(w, 'WebUI_Trade_BagMsg', { bagItemsJson: JSON.stringify([item(101, 0, 0, { ct: 3 })]) });
    await wait(w, 20);

    const c = bagCells(w)[0];
    assert.equal(c.querySelector('.item-count')?.textContent, 'x3');
    assert.equal(badge(c)?.textContent, '84');
  });

  test('the badges cost one pass, and the observer adds none for them', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0), item(102, 1, 0)], [item(103, 0, 0)]);
    setData(makeRootWindow(t, w), fixtureData());
    await wait(w, 50);

    assert.equal(w.document.querySelectorAll('.bt-badge').length, 3);
    assert.equal(w.__bettertradePasses, 1);
    assert.equal(w.__bettertradeObserverPasses || 0, 0);
  });
}
