// The offered rows of a trade: the detail click on the icon.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, modMessages, openTrade, postGame, setData, shelfItem, type Win } from './harness';

function shelfIcons(w: Win): HTMLElement[] { return Array.from(w.document.querySelectorAll('.shelf-row .shelf-icon')); }

if (gameFound) {
  test('a click on the icon of an offered row sends its config id for the item detail popup', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5001), shelfItem(5002)]) });
    const root = makeRootWindow(t, w);
    setData(root, fixtureData());

    const icons = shelfIcons(w);
    assert.equal(icons.length, 2);
    assert.ok(icons[1].hasAttribute('data-interactive'), 'the click-through of the page needs data-interactive');
    // The page syncs its click rects on a class change, not on a new data-interactive attribute.
    assert.ok(icons[1].classList.contains('bt-detail'), 'no mod class on the icon, so the page does not sync its click rect');
    icons[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    assert.deepEqual(modMessages(root), ['detail:5002']);
  });

  test('a second pass adds no second click to an icon', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5001)]) });
    const root = makeRootWindow(t, w);
    setData(root, fixtureData());
    root.__bettertrade.apply();

    shelfIcons(w)[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    assert.deepEqual(modMessages(root), ['detail:5001']);
  });

  test('an offered row with no quantity picked shows the value of one unit on its icon', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5001)]) });
    setData(makeRootWindow(t, w), fixtureData());

    const badge = w.document.querySelector('.shelf-row .shelf-icon > .bt-badge');
    assert.ok(badge, 'no badge on the icon');
    assert.equal(badge.textContent, '91');
    assert.equal(badge.className, 'bt-badge bt-full');
    assert.equal(badge.parentElement.lastElementChild, badge);
    assert.equal(w.document.querySelector('.shelf-row-bottom > [class*="bt-"]'), null, 'a mod node in the row bottom');
    // The game fades the whole icon box (opacity .6); with a badge the fade moves to the image, so the badge is clear.
    const icon = w.document.querySelector('.shelf-icon');
    assert.equal(w.getComputedStyle(icon).opacity, '1');
    assert.equal(w.getComputedStyle(icon.querySelector('img')).opacity, '0.6');
  });

  test('a picked quantity keeps the value of one unit, and the stepper keeps its children', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    await postGame(w, 'WebUI_Trade_ShelfMsg', { shelfItemsJson: JSON.stringify([shelfItem(5002, { qty: 2 })]) });
    setData(makeRootWindow(t, w), fixtureData());

    assert.equal(w.document.querySelector('.shelf-icon > .bt-badge')?.textContent, '10');
    const bottom = w.document.querySelector('.shelf-row-bottom');
    assert.equal(bottom.children.length, 1);
    assert.equal(bottom.querySelectorAll('.stepper > .sbtn').length, 3);
  });

  test('a donation window has no offered rows and reports no missing part', async (t) => {
    const w = await loadTradeWindow(t);
    await postGame(w, 'WebUI_Trade_HeaderMsg', { mode: 'donate' });
    await openTrade(w, [item(101, 0, 0)]);
    const root = makeRootWindow(t, w);

    assert.equal(setData(root, { ...fixtureData(), mode: 'donate' }), 'installed');
    assert.deepEqual(modMessages(root), []);
  });
}
