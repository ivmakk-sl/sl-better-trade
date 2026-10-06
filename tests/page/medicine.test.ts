// The medicine total of the drone in Deliver Supplies to a neighbor, which the game does not show.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { PageData } from '../../src/Web/page/types';
import { gameFound, fixtureData, item, loadTradeWindow, makeRootWindow, openTrade, postGame, setData, type Win } from './harness';

function supply(mode: string, medicine: number | null): PageData {
  return {
    ...fixtureData(), mode, medicine, words: { medicine: 'Medicine' }, bar: null, header: { wants: [], half: [] },
    items: { 101: { n: 56, cls: '', kind: 'med', dim: false, o: 3, tip: null, demands: [], info: '', cid: 0, exp: 0 } }
  };
}

async function supplyWindow(w: Win, target: Record<string, unknown>): Promise<void> {
  await postGame(w, 'WebUI_Trade_HeaderMsg', { cpName: 'Neighbor', mode: 'supply' });
  await openTrade(w, [], [item(101, 0, 0)]);
  await postGame(w, 'WebUI_Trade_ShelfMsg', { supplyTargetsJson: JSON.stringify([target]) });
}

if (gameFound) {
  test('a drone with a Bandage for a neighbor shows the medicine chip in the selected row', async (t) => {
    const w = await loadTradeWindow(t);
    await supplyWindow(w, { id: 7, name: 'Sammy', sel: true, camp: 0, frac: 50, lowPct: 20, left: 5, seedPct: 10, seedLow: 5, matPct: 10, matLow: 5, trust: -1 });
    setData(makeRootWindow(t, w), supply('supply', 56));

    const chip = w.document.querySelector('.sup-row.on .bt-med');
    assert.ok(chip, 'no medicine chip');
    assert.equal(chip.querySelector('.bt-ico'), null);
    assert.equal(chip.textContent, 'Medicine +56');
  });

  test('a camp row shows no medicine chip', async (t) => {
    const w = await loadTradeWindow(t);
    await supplyWindow(w, { id: 9, name: 'Camp', sel: true, camp: 1, tag: 'Camp' });
    setData(makeRootWindow(t, w), supply('camp', null));

    assert.equal(w.document.querySelector('.bt-med'), null);
  });

  test('a drone with no medicine removes the chip', async (t) => {
    const w = await loadTradeWindow(t);
    await supplyWindow(w, { id: 7, name: 'Sammy', sel: true, camp: 0, frac: 50, lowPct: 20, left: 5, seedPct: -1, matPct: -1, trust: -1 });
    const root = makeRootWindow(t, w);
    setData(root, supply('supply', 56));
    assert.ok(w.document.querySelector('.sup-row.on .bt-med'));

    root.__bettertrade.setData(supply('supply', null));

    assert.equal(w.document.querySelector('.bt-med'), null);
  });
}
