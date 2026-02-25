import { executeScriptInTab } from '@/background/utils/tabs';
import { browser as browserApi } from '@/common/consts';

const { tabs } = browserApi;
const browser = global.browser;

let oldTabsExecuteScript;
let oldBrowserScripting;
let oldChromeScripting;
let oldRuntimeLastError;

beforeEach(() => {
  oldTabsExecuteScript = tabs.executeScript;
  oldBrowserScripting = browser.scripting;
  oldChromeScripting = chrome.scripting;
  oldRuntimeLastError = chrome.runtime.lastError;
  chrome.runtime.lastError = null;
});

afterEach(() => {
  tabs.executeScript = oldTabsExecuteScript;
  browser.scripting = oldBrowserScripting;
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
  browser.scripting = undefined;
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
  browser.scripting = undefined;
  chrome.scripting = {
    executeScript: jest.fn((details, cb) => cb([{ result: 7 }])),
  };
  const res = await executeScriptInTab(14, { code: '3 + 4' });
  expect(chrome.scripting.executeScript).toHaveBeenCalled();
  expect(res).toEqual([7]);
});

test('executeScriptInTab rejects when callback-style chrome.scripting reports runtime error', async () => {
  tabs.executeScript = undefined;
  browser.scripting = undefined;
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
  browser.scripting = {
    executeScript: jest.fn(() => {
      throw new Error('bad promise api');
    }),
  };
  chrome.scripting = {
    executeScript: jest.fn((details, cb) => cb([{ result: 9 }])),
  };
  const res = await executeScriptInTab(16, { code: '4 + 5' });
  expect(browser.scripting.executeScript).toHaveBeenCalled();
  expect(chrome.scripting.executeScript).toHaveBeenCalled();
  expect(res).toEqual([9]);
});

test('executeScriptInTab maps MV3 frame and runAt options to scripting target details', async () => {
  tabs.executeScript = undefined;
  browser.scripting = undefined;
  let details;
  chrome.scripting = {
    executeScript: jest.fn((injectedDetails, cb) => {
      details = injectedDetails;
      cb([{ result: true }]);
    }),
  };
  const res = await executeScriptInTab(17, {
    code: '1',
    [kFrameId]: 7,
    [RUN_AT]: 'document_start',
  });
  expect(details).toEqual(expect.objectContaining({
    target: { tabId: 17, frameIds: [7] },
    injectImmediately: true,
    args: ['1'],
    func: expect.any(Function),
  }));
  expect(res).toEqual([true]);
});

test('executeScriptInTab maps MV3 allFrames and files options', async () => {
  tabs.executeScript = undefined;
  browser.scripting = undefined;
  let details;
  chrome.scripting = {
    executeScript: jest.fn((injectedDetails, cb) => {
      details = injectedDetails;
      cb([{ result: 'ok' }]);
    }),
  };
  const res = await executeScriptInTab(18, {
    allFrames: true,
    files: ['a.js', 'b.js'],
  });
  expect(details).toEqual(expect.objectContaining({
    target: { tabId: 18, allFrames: true },
    files: ['a.js', 'b.js'],
  }));
  expect(res).toEqual(['ok']);
});

test('executeScriptInTab rejects when no compatible injection API exists', async () => {
  tabs.executeScript = undefined;
  browser.scripting = undefined;
  chrome.scripting = undefined;
  await expect(executeScriptInTab(19, { code: '1' }))
    .rejects.toThrow('tabs.executeScript and scripting.executeScript are unavailable');
});

test('executeScriptInTab keeps top-frame target by default in MV3', async () => {
  tabs.executeScript = undefined;
  browser.scripting = undefined;
  let details;
  chrome.scripting = {
    executeScript: jest.fn((injectedDetails, cb) => {
      details = injectedDetails;
      cb([{ result: 'top' }]);
    }),
  };
  const res = await executeScriptInTab(20, { code: '2 + 2' });
  expect(details).toEqual(expect.objectContaining({
    target: { tabId: 20 },
    args: ['2 + 2'],
  }));
  expect(res).toEqual(['top']);
});

test('executeScriptInTab does not force immediate injection for document_end and document_idle', async () => {
  tabs.executeScript = undefined;
  browser.scripting = undefined;
  const seen = [];
  chrome.scripting = {
    executeScript: jest.fn((injectedDetails, cb) => {
      if (cb) {
        seen.push(injectedDetails);
        cb([{ result: true }]);
      }
    }),
  };
  await executeScriptInTab(21, { code: '1', [RUN_AT]: 'document_end' });
  await executeScriptInTab(21, { code: '1', [RUN_AT]: 'document_idle' });
  expect(seen).toHaveLength(2);
  seen.forEach(details => {
    expect(details.target).toEqual({ tabId: 21 });
    expect(details.injectImmediately).toBeUndefined();
  });
});

test('getTabUrl prefers current tab.url over pendingUrl', () => {
  const { getTabUrl } = require('@/background/utils/tabs');
  expect(getTabUrl({
    url: 'https://www.torn.com/forums.php#/!p=threads&f=61&t=16047184',
    pendingUrl: 'chrome://startpageshared/',
  })).toBe('https://www.torn.com/forums.php#/!p=threads&f=61&t=16047184');
});

test('getTabUrl falls back to pendingUrl when url is absent', () => {
  const { getTabUrl } = require('@/background/utils/tabs');
  expect(getTabUrl({
    pendingUrl: 'https://example.com/pending',
  })).toBe('https://example.com/pending');
});
