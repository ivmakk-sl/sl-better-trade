// The factors of the trader in the header of a trade.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { PageData } from '../../src/Web/page/types';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, openTrade, postGame, setData, type Win } from './harness';

function header(wants: { name: string; x: string }[], half: { name: string; x: string }[]): PageData {
  return { ...fixtureData(), words: { wants: 'Wants', halfValue: 'Half value' }, header: { wants, half } };
}

function visible(w: Win, el: Element): boolean {
  return w.getComputedStyle(el).display !== 'none';
}

async function camp(w: Win): Promise<void> {
  await postGame(w, 'WebUI_Trade_LocalizationMsg', { offerLabel: 'Offers', wantLabel: 'Wants' });
  await postGame(w, 'WebUI_Trade_HeaderMsg', {
    cpName: 'Camp', mode: 'trade',
    offerCatsJson: JSON.stringify([{ n: 'Material', c: 9 }]),
    wantExceptJson: JSON.stringify({ n: 'Food', c: 1 })
  });
  await openTrade(w, [item(101, 0, 0)]);
}

if (gameFound) {
  test('a mod text that the data does not have shows its name, not an English text of the page', async (t) => {
    const w = await loadTradeWindow(t);
    await camp(w);
    setData(makeRootWindow(t, w), { ...header([], [{ name: 'Food', x: '×½' }]), words: {} });

    const half = w.document.querySelector('.info-rows > .bt-head-row.bt-half');
    assert.equal(half?.querySelector('.cp-k')?.textContent, 'halfValue');
  });

  test('a camp: the header shows the half value group in coral and no wants group, and the offers row stays', async (t) => {
    const w = await loadTradeWindow(t);
    await camp(w);
    setData(makeRootWindow(t, w), header([], [{ name: 'Food', x: '×½' }]));

    const rows = Array.from(w.document.querySelectorAll('.info-rows > .cp-row')) as Element[];
    const gameWants = rows.find((r) => r.querySelector('.cp-k')?.textContent === 'Wants' && !r.classList.contains('bt-head-row'));
    const offers = rows.find((r) => r.querySelector('.cp-k')?.textContent === 'Offers');
    assert.ok(gameWants && !visible(w, gameWants), 'the game wants row still shows');
    assert.ok(offers && visible(w, offers), 'the offers row is hidden');

    const half = w.document.querySelector('.info-rows > .bt-head-row.bt-half');
    assert.equal(half?.querySelector('.cp-k')?.textContent, 'Half value');
    assert.equal(half?.querySelector('.bt-chip')?.textContent, 'Food ×½');
    assert.equal(w.document.querySelector('.bt-head-row.bt-wants'), null);
    const css = w.document.getElementById('bettertrade-style').textContent;
    assert.match(css, /\.bt-half \.bt-chip\s*\{[^}]*var\(--bt-coral\)/);
  });

  test('a neighbor with a wanted category: the bubble shows the wants group in green and no half value group', async (t) => {
    const w = await loadTradeWindow(t);
    await postGame(w, 'WebUI_Trade_HeaderMsg', { cpName: 'Neighbor', bubbleText: 'Hello', mode: 'trade', offerCatsJson: '', wantExceptJson: '' });
    await openTrade(w, [item(101, 0, 0)]);
    setData(makeRootWindow(t, w), header([{ name: 'Medicine', x: '×1.6' }], []));

    const row = w.document.querySelector('.bubble > .bt-head > .bt-head-row.bt-wants');
    assert.equal(row?.querySelector('.cp-k')?.textContent, 'Wants');
    assert.equal(row?.querySelector('.bt-chip')?.textContent, 'Medicine ×1.6');
    assert.equal(w.document.querySelector('.bt-head-row.bt-half'), null);
    assert.match(w.document.getElementById('bettertrade-style').textContent, /\.bt-wants \.bt-chip\s*\{[^}]*var\(--bt-green\)/);
  });

  test('a later window with no groups removes the mod rows and shows the game wants row again', async (t) => {
    const w = await loadTradeWindow(t);
    await camp(w);
    const root = makeRootWindow(t, w);
    setData(root, header([], [{ name: 'Food', x: '×½' }]));

    root.__bettertrade.setData({ ...header([], []), mode: 'donate' });

    assert.equal(w.document.querySelectorAll('.bt-head-row').length, 0);
    const gameWants = (Array.from(w.document.querySelectorAll('.info-rows > .cp-row')) as Element[]).find((r) => r.querySelector('.cp-k')?.textContent === 'Wants') as Element;
    assert.ok(visible(w, gameWants));
  });

  test('a game change of the header keeps one set of mod rows', async (t) => {
    const w = await loadTradeWindow(t);
    await camp(w);
    setData(makeRootWindow(t, w), header([{ name: 'Medicine', x: '×1.6' }], [{ name: 'Food', x: '×½' }]));

    await postGame(w, 'WebUI_Trade_HeaderMsg', { bubbleText: 'Not quite enough.' });

    assert.equal(w.document.querySelectorAll('.bt-head-row.bt-wants').length, 1);
    assert.equal(w.document.querySelectorAll('.bt-head-row.bt-half').length, 1);
  });
}
