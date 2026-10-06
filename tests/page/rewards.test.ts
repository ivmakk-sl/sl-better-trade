// The delivery request rewards of the delivery request list of Deliver Request: a strip under
// the request demands of a row with a "Rewards" title and the reward items, each with its icon and "xN"; a long reward
// shows 3 lines and a "+N" tile that opens the strip in place.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ItemObject, PageData, RewardItem } from '../../src/Web/page/types';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, modMessages, openTrade, postGame, setData, wait, type Win } from './harness';

function obj(id: number, n: string, icon: string, des = ''): ItemObject {
  return { id, n, r: 0, max: 1, qty: 0, tv: 10, demand: false, category: 'Material', shelfLife: '', des, icon };
}

const OBJECTS: Record<string, ItemObject> = {
  2177: obj(2177, 'Barricade Construction Guide', 'guide.png', 'A guide.'),
  9032: obj(9032, 'Gold Bar', 'gold.png', 'A bar of gold.')
};
// A long reward: a package and 19 kinds of seeds, 20 items.
const SEEDS: RewardItem[] = [{ id: 20369, count: 1 }];
OBJECTS[20369] = obj(20369, 'Purple Dye', 'dye.png');
for (let i = 0; i < 19; i++) {
  OBJECTS[15007 + i] = obj(15007 + i, 'Seeds ' + i, 'seed' + i + '.png');
  SEEDS.push({ id: 15007 + i, count: 1 });
}

function data(rewards: Record<string, RewardItem[]>, bars = true): PageData {
  const base = fixtureData();
  return {
    ...base, mode: 'request', bar: null, header: { wants: [], half: [] }, items: {}, bars, requests: {}, objects: OBJECTS, rewards,
    words: { ...base.words, rewards: 'Rewards' }
  };
}

const DOCK: Record<string, RewardItem[]> = { '1_5': [{ id: 2177, count: 3 }, { id: 9032, count: 1 }] };
const NURSERY: Record<string, RewardItem[]> = { '1_5': SEEDS };

async function requestWindow(w: Win): Promise<void> {
  await postGame(w, 'WebUI_Trade_HeaderMsg', { cpName: 'Office', mode: 'dispatch' });
  await openTrade(w, [item(101, 0, 0)]);
  await postGame(w, 'WebUI_Trade_ShelfMsg', {
    supplyTargetsJson: JSON.stringify([
      { k: 1, id: 5, face: 'H', name: 'Aid: Dock Crew Meals', sel: false, dims: [{ l: 'Meat dishes (total satiety)', cur: 0, add: 0 }] },
      { k: 5, id: 1, face: 'R', name: 'A Call From the Research Station', sel: true, dims: [{ l: 'Product', cur: 0.2, add: 0 }] }
    ])
  });
}

function rows(w: Win): Element[] {
  return Array.from(w.document.querySelectorAll('.sup-list > .sup-row'));
}

function buttons(w: Win, row: number): HTMLElement[] {
  return Array.from(rows(w)[row].querySelectorAll('.bt-rewards .bt-reward'));
}

function more(w: Win, row: number): HTMLElement | null {
  return rows(w)[row].querySelector('.bt-rewards .bt-more');
}

type Setup = { onItemEnter?: unknown };
function setupOf(w: Win): Setup {
  return (w.document.getElementById('app') as unknown as { _vnode: { component: { setupState: Setup } } })._vnode.component.setupState;
}

if (gameFound) {
  test('a row with a reward gets one strip after its request demands: the title, then one button for each reward item', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);

    setData(makeRootWindow(t, w), data(DOCK));

    const strips = rows(w)[0].querySelectorAll('.bt-rewards');
    assert.equal(strips.length, 1);
    assert.equal(strips[0].previousElementSibling?.classList.contains('sup-dims'), true);
    assert.equal(strips[0].querySelector('.bt-rewards-title')?.textContent, 'Rewards');
    assert.ok(strips[0].querySelector('.bt-rewards-title > .bt-rewards-rule'), 'no rule after the title');
    const [guide, gold] = buttons(w, 0);
    assert.equal(guide.querySelector('img')?.getAttribute('src'), 'guide.png');
    assert.equal(guide.querySelector('.bt-xn')?.textContent, 'x3');
    assert.equal(gold.querySelector('.bt-xn'), null);
    assert.equal(strips[0].querySelectorAll('svg').length, 0, 'no gift badge');
    assert.ok(guide.hasAttribute('data-interactive'));
    assert.equal(more(w, 0), null);
  });

  test('a row with no reward gets no strip, and a second pass adds no second strip', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    const root = makeRootWindow(t, w);

    setData(root, data(DOCK));
    root.__bettertrade.apply();

    assert.equal(rows(w)[0].querySelectorAll('.bt-rewards').length, 1);
    assert.equal(rows(w)[1].querySelectorAll('.bt-rewards').length, 0);
  });

  test('no reward data draws no strip, and removes a strip of an earlier pass', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    const root = makeRootWindow(t, w);
    setData(root, data(DOCK));

    root.__bettertrade.setData(data({}));

    assert.equal(w.document.querySelectorAll('.bt-rewards').length, 0);
  });

  test('the strip draws with the bars off too, under the game\'s request demands', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);

    setData(makeRootWindow(t, w), data(DOCK, false));

    assert.equal(buttons(w, 0).length, 2);
    assert.equal(rows(w)[0].hasAttribute('data-bt-bars'), false);
  });

  test('a long reward shows 3 lines: the first reward items and a "+N" tile in the last place', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);

    setData(makeRootWindow(t, w), data(NURSERY));

    // 5 places a line with no layout (jsdom): 15 places, 14 reward items and "+6".
    assert.equal(buttons(w, 0).length, 14);
    assert.equal(more(w, 0)?.textContent, '+6');
    assert.ok(more(w, 0)?.hasAttribute('data-interactive'));
  });

  test('a click on "+N" shows each reward item and the collapse tile, and a click on that shows 3 lines again, with no row click', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    const root = makeRootWindow(t, w);
    setData(root, data(NURSERY));
    const rowClicks: string[] = [];
    rows(w)[0].addEventListener('click', () => rowClicks.push('row'));

    more(w, 0)?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.equal(buttons(w, 0).length, 20);
    assert.equal(more(w, 0)?.textContent, '−');

    root.__bettertrade.apply();
    assert.equal(buttons(w, 0).length, 20, 'a pass closed the open strip');

    more(w, 0)?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.equal(buttons(w, 0).length, 14);
    assert.equal(more(w, 0)?.textContent, '+6');
    assert.deepEqual(rowClicks, []);
    assert.deepEqual(modMessages(root), []);
  });

  test('a click on "+N" after new data shows the item objects of the new data', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    const root = makeRootWindow(t, w);
    setData(root, data(NURSERY));

    const fresh = data(NURSERY);
    fresh.objects = { ...fresh.objects, 15025: obj(15025, 'Seeds new', 'new.png') };
    root.__bettertrade.setData(fresh);
    more(w, 0)?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    const last = buttons(w, 0)[19];
    assert.equal(last.querySelector('img')?.getAttribute('src'), 'new.png');
  });

  test('a hover on a reward item shows the game tooltip of that item, and leaving hides it', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    setData(makeRootWindow(t, w), data(DOCK));
    const tip = w.document.querySelector('div.tooltip') as HTMLElement;

    buttons(w, 0)[1].dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await wait(w, 20);
    assert.match(tip.textContent || '', /Gold Bar/);
    assert.match(tip.textContent || '', /A bar of gold\./);

    buttons(w, 0)[1].dispatchEvent(new w.MouseEvent('mouseleave'));
    await wait(w, 20);
    assert.equal(tip.style.display, 'none');
  });

  test('with no onItemEnter on the page, a reward item gets its name as the title', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    delete setupOf(w).onItemEnter;

    setData(makeRootWindow(t, w), data(DOCK));

    assert.equal(buttons(w, 0)[1].getAttribute('title'), 'Gold Bar');
  });

  test('a click on a reward item opens the item detail popup and does not reach the row', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);
    const root = makeRootWindow(t, w);
    setData(root, data(DOCK));
    const rowClicks: string[] = [];
    rows(w)[0].addEventListener('click', () => rowClicks.push('row'));

    buttons(w, 0)[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    assert.deepEqual(modMessages(root), ['detail:9032']);
    assert.deepEqual(rowClicks, []);
  });

  test('the style node has the rules of the strip', async (t) => {
    const w = await loadTradeWindow(t);
    await requestWindow(w);

    setData(makeRootWindow(t, w), data(DOCK));

    const style = w.document.getElementById('bettertrade-style').textContent;
    for (const cls of ['bt-rewards', 'bt-rewards-title', 'bt-rewards-rule', 'bt-rewards-icons', 'bt-reward', 'bt-reward-ico', 'bt-more', 'bt-xn'])
      assert.match(style, new RegExp('\\.' + cls + '[\\s,.:{\\[)>]'), `no rule for .${cls}`);
    assert.doesNotMatch(style, /\.bt-gift/);
  });
}
