import { executeScriptInTab } from '@/background/utils/tabs';
import { browser as browserApi } from '@/common/consts';

const { tabs } = browserApi;

let oldTabsExecuteScript;
let oldBrowserScripting;
let oldChromeScripting;
let oldRuntimeLastError;

beforeEach(() => {
  oldTabsExecuteScript = tabs.executeScript;
  oldBrowserScripting = browserApi.scripting;
  oldChromeScripting = chrome.scripting;
  oldRuntimeLastError = chrome.runtime.lastError;
  chrome.runtime.lastError = null;
});

afterEach(() => {
  tabs.executeScript = oldTabsExecuteScript;
  browserApi.scripting = oldBrowserScripting;
  chrome.scripting = oldChromeScripting;
  chrome.runtime.lastError = oldRuntimeLastError;
});

test('executeScriptInTab uses tabs.executeScript when available', async () => {
  const result = [1];
  tabs.executeScript = jest.fn(async () => result);
  const options = { code: '1' };
  const res = await executeScriptInTab(12, options);
  expect(tabs.executeScript).toHaveBeenCalledWith(12, options);
  expect(res).toBe(result);
});

test('executeScriptInTab maps callback scripting.executeScript results', async () => {
  tabs.executeScript = undefined;
  browserApi.scripting = undefined;
  chrome.scripting = {
    executeScript: jest.fn((details, cb) => cb([
      { result: 'a' },
      { result: 'b' },
    ])),
  };
  const res = await executeScriptInTab(13, { code: '1 + 1' });
  expect(chrome.scripting.executeScript).toHaveBeenCalled();
  expect(res).toEqual(['a', 'b']);
});

test('executeScriptInTab supports callback-style chrome.scripting.executeScript fallback', async () => {
  tabs.executeScript = undefined;
  browserApi.scripting = undefined;
  chrome.scripting = {
    executeScript: jest.fn((details, cb) => cb([{ result: 7 }])),
  };
  const res = await executeScriptInTab(14, { code: '3 + 4' });
  expect(chrome.scripting.executeScript).toHaveBeenCalled();
  expect(res).toEqual([7]);
});

test('executeScriptInTab rejects when callback-style chrome.scripting reports runtime error', async () => {
  tabs.executeScript = undefined;
  browserApi.scripting = undefined;
  chrome.scripting = {
    executeScript: jest.fn((details, cb) => {
      chrome.runtime.lastError = { message: 'boom' };
      cb();
      chrome.runtime.lastError = null;
    }),
  };
  await expect(executeScriptInTab(15, { code: '0' })).rejects.toThrow('boom');
});

test('executeScriptInTab falls back to callback API if promise-like API throws', async () => {
  tabs.executeScript = undefined;
  browserApi.scripting = {
    executeScript: jest.fn(() => {
      throw new Error('bad promise api');
    }),
  };
  chrome.scripting = {
    executeScript: jest.fn((details, cb) => cb([{ result: 9 }])),
  };
  const res = await executeScriptInTab(16, { code: '4 + 5' });
  expect(browserApi.scripting.executeScript).toHaveBeenCalled();
  expect(chrome.scripting.executeScript).toHaveBeenCalled();
  expect(res).toEqual([9]);
});
