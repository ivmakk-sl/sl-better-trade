// The offer and the goods beside the bottom bar of a trade (form A).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'vitest';
import type { Bar, PageData } from '../../src/Web/page/types';
import {
  TRADE_HTML, gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, modMessages, openTrade, postGame, setData, type Win
} from './harness';

// One item in the drone: the offer number shows only while the drone holds an item.
const DRONE = [item(201, 0, 0)];

function withBar(bar: Bar | null): PageData {
  return { ...fixtureData(), words: { offer: 'Your offer', goods: 'Goods', dealLine: 'Deal line' }, bar };
}

function text(w: Win, selector: string): string | null {
  const el = w.document.querySelector(selector);
  return el ? el.textContent : null;
}

if (gameFound) {
  test('an offer of 56 for goods of 72 shows 56 at the left, 72 at the right, and no other number', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)], DRONE);
    setData(makeRootWindow(t, w), withBar({ offer: 56, goods: 72, dealLine: 72, picked: true }));

    assert.equal(text(w, '.foot-main > .bt-bar-offer'), '56');
    assert.equal(text(w, '.foot-main > .bt-bar-goods'), '72');
    assert.equal(w.document.querySelectorAll('.foot-main > [class*="bt-bar"]:not(.bt-bar-tip)').length, 2);
    assert.ok(w.document.body.classList.contains('bettertrade-bar'), 'no body class for the side margins of the bar');
    assert.ok(w.document.querySelector('.bal-track'), 'the game bar is gone');
  });

  test('a deal-line talent: the hover gives the words with the deal line', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)], DRONE);
    setData(makeRootWindow(t, w), withBar({ offer: 56, goods: 72, dealLine: 52, picked: true }));

    w.document.querySelector('.bal-track').dispatchEvent(new w.MouseEvent('mouseenter'));
    assert.equal(text(w, '.bt-bar-tip'), 'Your offer 56 · Goods 72 · Deal line 52');
    assert.ok(!w.document.querySelector('.bt-bar-tip').hidden);
    w.document.querySelector('.bal-track').dispatchEvent(new w.MouseEvent('mouseleave'));
    assert.ok(w.document.querySelector('.bt-bar-tip').hidden);
  });

  test('before any pick the bar shows the offer only', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)], DRONE);
    setData(makeRootWindow(t, w), withBar({ offer: 23, goods: 0, dealLine: 0, picked: false }));

    assert.equal(text(w, '.bt-bar-offer'), '23');
    assert.equal(w.document.querySelector('.bt-bar-goods'), null);
  });

  test('an empty drone shows no offer number, and the goods still show', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)], DRONE);
    const root = makeRootWindow(t, w);
    setData(root, withBar({ offer: 23, goods: 44, dealLine: 44, picked: true }));

    await postGame(w, 'WebUI_Trade_DroneMsg', { droneCols: 3, droneRows: 2, droneItemsJson: '[]' });
    setData(root, withBar({ offer: 0, goods: 44, dealLine: 44, picked: true }));

    assert.equal(w.document.querySelector('.bt-bar-offer'), null);
    assert.equal(text(w, '.bt-bar-goods'), '44');
  });

  test('no bar data shows no bar numbers and no body class', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)]);
    const root = makeRootWindow(t, w);
    setData(root, withBar({ offer: 56, goods: 72, dealLine: 72, picked: true }));

    root.__bettertrade.setData(withBar(null));

    assert.equal(w.document.querySelectorAll('[class*="bt-bar"]').length, 0);
    assert.ok(!w.document.body.classList.contains('bettertrade-bar'));
  });

  test('a game change of the foot keeps one set of mod nodes', async (t) => {
    const w = await loadTradeWindow(t);
    await openTrade(w, [item(101, 0, 0)], DRONE);
    setData(makeRootWindow(t, w), withBar({ offer: 56, goods: 72, dealLine: 72, picked: true }));

    await postGame(w, 'WebUI_Trade_FootMsg', { footNote: 'Add a little more.', barPos: -0.1, barNet: -0.13, dealReady: false });
    await postGame(w, 'WebUI_Trade_FootMsg', { barMode: 'charge' });
    await postGame(w, 'WebUI_Trade_FootMsg', { barMode: 'balance' });

    assert.equal(w.document.querySelectorAll('.bt-bar-offer').length, 1);
    assert.equal(w.document.querySelectorAll('.bt-bar-goods').length, 1);
  });

  test('a renamed node of the page: no bar numbers, the cells keep their badges, one message names the bar', async (t) => {
    const html = fs.readFileSync(TRADE_HTML, 'utf8').split('bal-track').join('bal-renamed');
    const w = await loadTradeWindow(t, html);
    await openTrade(w, [item(101, 0, 0)]);
    const root = makeRootWindow(t, w);

    setData(root, withBar({ offer: 56, goods: 72, dealLine: 72, picked: true }));
    root.__bettertrade.apply();

    assert.equal(w.document.querySelector('.bt-bar-offer'), null);
    assert.equal(w.document.querySelector('#tradeBagGrid > .item > .bt-badge')?.textContent, '84');
    assert.deepEqual(modMessages(root), ['missing: bar(.bal-track)']);
  });
}
