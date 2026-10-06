// The jsdom harness of the page tests: the game's own TradeUI.html with its Vue app, a root window that runs the
// bundle as C# does, and the game's messages that fill the Vue state.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import type { TestContext } from 'vitest';
import type { PageData } from '../../src/Web/page/types';

// The jsdom windows carry the game's page globals and the page script's interface, which have no types.
export type Win = any;

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

export const GAME_DIR = process.env.SL_GAME_DIR ||
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Survival Log';
export const TRADE_HTML = path.join(GAME_DIR, 'SurvivalLog_Data', 'StreamingAssets', 'WebUI', 'UI', 'TradeUI', 'TradeUI.html');
// The bundle that Vite builds from src/Web/page/ (npm test builds it first).
const PAGE_JS_PATH = path.join(HERE, '..', '..', 'obj', 'page', 'page.js');
const DATA_JSON_PATH = path.join(HERE, '..', 'fixtures', 'data.json');

export const gameFound = fs.existsSync(TRADE_HTML);

const pageJs = gameFound ? fs.readFileSync(PAGE_JS_PATH, 'utf8') : '';
const tradeHtml = gameFound ? fs.readFileSync(TRADE_HTML, 'utf8') : '';

// The text of the bundle, with the CSS that it writes into the style node.
export function pageJsText(): string {
  return pageJs;
}

export function fixtureData(): PageData {
  return JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8'));
}

export function wait(win: Win, ms: number): Promise<void> {
  return new Promise((resolve) => win.setTimeout(resolve, ms));
}

// The game's TradeUI.html, loaded with its scripts. html replaces the page text, for a test of a changed page.
export async function loadTradeWindow(t: TestContext, html?: string): Promise<Win> {
  const dom = new JSDOM(html ?? tradeHtml, {
    url: url.pathToFileURL(TRADE_HTML).href,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  t.onTestFinished(() => dom.window.close());
  await new Promise<void>((resolve, reject) => {
    dom.window.addEventListener('load', () => resolve());
    setTimeout(() => reject(new Error('TradeUI.html did not fire load within 5s')), 5000);
  });
  return dom.window;
}

// A blank real window stands in for the root page (Root.html). Its iframe list hands back the TradeUI window in a box,
// so a test can give it a frame later. root.messages keeps each window.vuplex.postMessage text.
export function makeRootWindow(t: TestContext, tradeWindow: Win | null): Win {
  const root = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'file:///Root.html',
    pretendToBeVisual: true
  }).window as Win;
  t.onTestFinished(() => root.close());
  const frameBox = { current: tradeWindow };
  const originalQSA = root.document.querySelectorAll.bind(root.document);
  root.document.querySelectorAll = (selector: string) =>
    selector === 'iframe' ? (frameBox.current ? [{ contentWindow: frameBox.current }] : []) : originalQSA(selector);
  root.messages = [] as string[];
  root.vuplex = { postMessage: (text: string) => { root.messages.push(text); } };
  vm.createContext(root);
  root.__setTradeFrame = (w: Win) => { frameBox.current = w; };
  return root;
}

// vm.runInContext (not root.eval), so the bare "window" of page.js is the root window itself.
export function runPageJs(root: Win, callExpr: string): unknown {
  return vm.runInContext(pageJs + ';' + callExpr, root, { filename: 'page.js' });
}

// The full send of C#: the script, then setData.
export function setData(root: Win, data: PageData): unknown {
  return runPageJs(root, 'window.__bettertrade.setData(' + JSON.stringify(data) + ')');
}

// The messages of the mod, with its prefix taken off.
export function modMessages(root: Win): string[] {
  return root.messages
    .filter((m: string) => m.startsWith('slmod|bettertrade|'))
    .map((m: string) => m.substring('slmod|bettertrade|'.length));
}

// One item of the game's item JSON (AppendItemJson): the fields that the page reads.
export function item(id: number, x: number, y: number, extra?: Record<string, unknown>): Record<string, unknown> {
  return { id, x, y, w: 1, h: 1, icon: '', name: 'Item ' + id, ct: 1, r: 0, quality: 0, useTimes: -1, useTimesMax: 0, tv: 10, cat: 1, sub: 0, ...extra };
}

// Sends one message of the game to the page (as WebUILayer does), then waits for Vue to render it.
export async function postGame(w: Win, type: string, data: Record<string, unknown>): Promise<void> {
  w.postMessage({ type, data }, '*');
  await wait(w, 30);
}

// One offered row of the game's shelf JSON: the fields that the page reads. id is the config id.
export function shelfItem(id: number, extra?: Record<string, unknown>): Record<string, unknown> {
  return { id, n: 'Offer ' + id, icon: 'x.png', r: 0, max: 5, qty: 0, tv: 10, des: '', ...extra };
}

// A trade window with a storage grid of 4 x 3 cells and a drone of 3 x 2 cells.
export async function openTrade(w: Win, bagItems: object[], droneItems: object[] = []): Promise<void> {
  await postGame(w, 'WebUI_Trade_FootMsg', { phase: 'trade', barMode: 'balance', barPos: 0, barNet: 0, dealLinePos: 0 });
  await postGame(w, 'WebUI_Trade_BagMsg', { bagCols: 4, bagRows: 3, bagItemsJson: JSON.stringify(bagItems), bagTabsJson: '[]' });
  await postGame(w, 'WebUI_Trade_DroneMsg', { droneCols: 3, droneRows: 2, droneItemsJson: JSON.stringify(droneItems) });
}
