// The lines that the mod adds to the hover tooltip of an offered row and of an item of the character.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { PageData } from '../../src/Web/page/types';
import { addTipLines } from '../../src/Shared/tooltip-lines/web/tooltipLines';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, openTrade, postGame, setData, shelfItem, wait, type Win } from './harness';

const WORDS = {
  tradeValue: 'Trade value', uses: 'Uses', satiety: 'Satiety', morale: 'Morale', stamina: 'Stamina', health: 'Health', life: 'Life',
  onRead: 'On read', grows: 'Grows', halfValue: 'Half value', wants: 'Wants', supply: 'Supply', request: 'Request', seed: 'Seed',
  material: 'Material', medicine: 'Medicine', fuel: 'Fuel'
};

function data(extra?: Partial<PageData>): PageData {
  const d = fixtureData();
  return {
    ...d, words: WORDS, ...extra,
    info: {
      ...d.info,
      3011: { sub: '', uses: 1, stats: [0, 0, 0, 0, 0], read: 'Read for 1 hour to gain +200 Crafting proficiency.', crop: '' },
      ...(extra && extra.info)
    }
  };
}

// The mod draws two blocks, its item facts at rank 10 and its value line at rank 30, so the text of the mod is the
// text of both in the order the tooltip holds them.
async function hover(w: Win, el: Element): Promise<string> {
  el.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
  await wait(w, 20);
  const blocks = w.document.querySelectorAll('div.tooltip > .bt-tip');
  let text = '';
  for (let i = 0; i < blocks.length; i++) text += blocks[i].textContent;
  return text;
}

if (gameFound) {
  test('a food on an offered row: the subcategory, the uses, the stats of one use, and the trade value', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5001, { tv: 13, n: 'Organic Fragrant Rice' })]) });
    setData(makeRootWindow(t, w), data());

    const text = await hover(w, w.document.querySelector('.shelf-row'));

    assert.match(text, /Staple "Rice"/);
    assert.match(text, /Uses 7/);
    assert.match(text, /Satiety 7\.5/);
    assert.match(text, /Morale -4/);
    assert.doesNotMatch(text, /Stamina|Health|Life/);
    assert.match(text, /Trade value 91 = 13 x 7 uses/);
    assert.equal(w.document.querySelector('div.tooltip').lastElementChild.className, 'bt-tip');
    assert.match(w.document.querySelector('.tooltip-name').textContent, /Organic Fragrant Rice/, 'the game lines are gone');
  });

  test('a value with nothing to multiply shows no parts', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(103, 0, 0, { ct: 1 })]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5002, { tv: 10 })]) });
    setData(makeRootWindow(t, w), data({
      items: { 103: { n: 30, cls: 'full', kind: '', dim: false, o: 0, tip: { tv: 30, count: 1, uses: 1, f: [] }, demands: [], info: '', cid: 0, exp: 0 } },
      info: { 5002: { sub: '', uses: 1, stats: [0, 0, 0, 0, 0], read: '', crop: '' } }
    }));

    assert.match(await hover(w, w.document.querySelector('.shelf-row')), /Trade value 10$/);
    assert.match(await hover(w, w.document.querySelector('#tradeBagGrid > .item')), /Trade value 30$/);
  });

  test('a book shows its effect on read', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(3011, { tv: 40 })]) });
    setData(makeRootWindow(t, w), data({ shelf: { 3011: 40 } }));

    const text = await hover(w, w.document.querySelector('.shelf-row'));

    assert.match(text, /On read: Read for 1 hour to gain \+200 Crafting proficiency\./);
  });

  test('the reason of a coral number: the value line with its factors names the half value', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), data());

    const text = await hover(w, w.document.querySelector('#tradeBagGrid > .item'));

    assert.match(text, /84 = 28 x 6 uses x ½ \(Half value\)/);
  });

  test('a cell of Deliver Request gives its number and names the request demand that it fills', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), data({
      mode: 'request',
      items: { 101: { n: 36, cls: '', kind: '', dim: false, o: 0, tip: null, demands: [{ name: 'Meat satiety', add: 36 }], info: '', cid: 0, exp: 0 } }
    }));

    const text = await hover(w, w.document.querySelector('#tradeBagGrid > .item'));

    assert.match(text, /Request \+36 · Meat satiety/);
  });

  test('a cell of Deliver Request with no number (a failed drop check) gives no request line', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), data({
      mode: 'request',
      items: { 101: { n: 0, cls: '', kind: '', dim: false, o: 0, tip: null, demands: [], info: '', cid: 0, exp: 0 } }
    }));

    const text = await hover(w, w.document.querySelector('#tradeBagGrid > .item'));

    assert.doesNotMatch(text, /Request/);
  });

  test('an item object of the mod (the fields of the game\'s AppendShelfJson) shows the game tooltip with no stock and no trade value', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), data({
      mode: 'request',
      items: {},
      shelf: { 20372: 12 },
      info: { 20372: { sub: '', uses: 1, stats: [0, 0, 0, 0, 0], read: '', crop: '' } }
    }));
    const wire = {
      id: 20372, n: 'Electrical Wire', r: 0, max: 3, qty: 0, tv: 12, demand: false,
      category: 'Material', shelfLife: '', des: 'A coil of wire.', icon: 'wire.png'
    };
    const setup = (w.document.getElementById('app') as unknown as { _vnode: { component: { setupState: { onItemEnter(e: MouseEvent, it: unknown): void } } } })._vnode.component.setupState;

    setup.onItemEnter(new w.MouseEvent('mouseenter', { clientX: 10, clientY: 10 }), wire);
    await wait(w, 20);

    const tip = w.document.querySelector('div.tooltip') as HTMLElement;
    assert.match(tip.textContent || '', /Electrical Wire/);
    assert.match(tip.textContent || '', /A coil of wire\./);
    assert.doesNotMatch(tip.textContent || '', /Trade value|12 = |\b3\b/);
    assert.equal(w.document.querySelectorAll('div.tooltip > .bt-tip').length, 0);
  });

  test('a cell that fills two request demands names each with its own number', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), data({
      mode: 'request',
      items: {
        101: {
          n: 5, cls: '', kind: '', dim: false, o: 0, tip: null, info: '', cid: 0, exp: 0,
          demands: [{ name: 'Product', add: 5 }, { name: 'Product Types', add: 1 }]
        }
      }
    }));

    const text = await hover(w, w.document.querySelector('#tradeBagGrid > .item'));

    assert.match(text, /Request \+5 · Product, \+1 · Product Types/);
  });

  test('a hover on another item replaces the block', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0), item(102, 1, 0)]);
    setData(makeRootWindow(t, w), data());
    const cells = w.document.querySelectorAll('#tradeBagGrid > .item');

    await hover(w, cells[0]);
    const text = await hover(w, cells[1]);

    assert.equal(w.document.querySelectorAll('.bt-tip').length, 1);
    assert.match(text, /90 = 56 x 1\.6 \(Wants\)/);
    assert.doesNotMatch(text, /84/);
  });

  test('the mod alone draws its item facts and its value line, in that order, below the lines of the game', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5001, { tv: 13, n: 'Organic Fragrant Rice' })]) });
    setData(makeRootWindow(t, w), data());

    await hover(w, w.document.querySelector('.shelf-row'));

    const tip = w.document.querySelector('div.tooltip');
    const ids = [].slice.call(tip.querySelectorAll(':scope > [data-sl-tip]')).map((e: Element) => e.getAttribute('data-sl-tip'));
    assert.deepEqual(ids, ['bettertrade-facts', 'bettertrade-value']);
    assert.match(tip.querySelector('[data-sl-tip="bettertrade-facts"]').textContent, /Staple "Rice"/);
    assert.match(tip.querySelector('[data-sl-tip="bettertrade-value"]').textContent, /Trade value 91/);
    assert.match(tip.querySelector('.tooltip-name').textContent, /Organic Fragrant Rice/, 'the game lines are gone');
  });

  test('a block of another mod is drawn once and keeps its place by its rank', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5001, { tv: 13, n: 'Organic Fragrant Rice' })]) });
    const root = makeRootWindow(t, w);
    setData(root, data());
    addTipLines(root, { page: 'TradeUI', id: 'other-mod', rank: 40, prefix: 'xx', lines: () => ['Total: 7'] });

    await hover(w, w.document.querySelector('.shelf-row'));
    await hover(w, w.document.querySelector('.shelf-row'));

    const tip = w.document.querySelector('div.tooltip');
    const ids = [].slice.call(tip.querySelectorAll(':scope > [data-sl-tip]')).map((e: Element) => e.getAttribute('data-sl-tip'));
    assert.deepEqual(ids, ['bettertrade-facts', 'bettertrade-value', 'other-mod'], 'one of each, in rank order');
    assert.equal(tip.querySelectorAll('[data-sl-tip="other-mod"]').length, 1);
  });
}
