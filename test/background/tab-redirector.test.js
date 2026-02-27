const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis() {
  const tabsOnUpdated = getListenerApi();
  const tabsOnRemoved = getListenerApi();
  const tabsOnCreated = getListenerApi();
  const webRequestOnBeforeRequest = getListenerApi();
  const runtimeOnConnect = getListenerApi();
  const dnrUpdateSessionRules = jest.fn(async () => {});
  global.browser.tabs.query = jest.fn(async () => []);
  global.browser.tabs.get = jest.fn(async id => ({ id, url: 'https://example.com/' }));
  global.browser.tabs.executeScript = jest.fn(async () => []);
  global.browser.tabs.update = jest.fn(async () => ({}));
  global.browser.tabs.create = jest.fn(async () => ({ id: 55 }));
  global.browser.tabs.remove = jest.fn(async () => {});
  global.browser.tabs.onUpdated = tabsOnUpdated;
  global.browser.tabs.onRemoved = tabsOnRemoved;
  global.browser.tabs.onCreated = tabsOnCreated;
  global.browser.runtime.sendMessage = jest.fn(async () => ({}));
  global.browser.runtime.onConnect = runtimeOnConnect;
  global.browser.webRequest = {
    onBeforeRequest: webRequestOnBeforeRequest,
  };
  global.browser.declarativeNetRequest = {
    updateSessionRules: dnrUpdateSessionRules,
  };
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
  return {
    tabsOnUpdated,
    webRequestOnBeforeRequest,
    dnrUpdateSessionRules,
  };
}

function loadTabRedirector(manifestVersion) {
  jest.resetModules();
  global.extensionManifest.manifest_version = manifestVersion;
  require('@/background/utils/tab-redirector');
}

async function flushTasks() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

function findUserJsBlockingListener(calls) {
  return calls.find(([, filter, options]) => (
    Array.isArray(options)
    && options.includes('blocking')
    && filter?.types?.includes('main_frame')
    && filter?.urls?.some(url => url.includes('.user.js'))
  ));
}

describe('tab-redirector listener mode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('registers non-blocking tabs.onUpdated fallback for MV3 install interception', () => {
    const { tabsOnUpdated, webRequestOnBeforeRequest, dnrUpdateSessionRules } = setupBrowserApis();
    loadTabRedirector(3);
    const onUpdatedUserJsCall = tabsOnUpdated.addListener.mock.calls.find(([, filter]) => (
      filter?.properties?.length === 1 && filter.properties[0] === 'url'
    ));
    expect(onUpdatedUserJsCall).toBeTruthy();
    expect(findUserJsBlockingListener(webRequestOnBeforeRequest.addListener.mock.calls)).toBeFalsy();
    expect(dnrUpdateSessionRules).toHaveBeenCalledTimes(1);
  });

  test('registers blocking webRequest interception for MV2 install flow', () => {
    const { tabsOnUpdated, webRequestOnBeforeRequest, dnrUpdateSessionRules } = setupBrowserApis();
    loadTabRedirector(2);
    const onUpdatedUserJsCall = tabsOnUpdated.addListener.mock.calls.find(([, filter]) => (
      filter?.properties?.length === 1 && filter.properties[0] === 'url'
    ));
    expect(onUpdatedUserJsCall).toBeFalsy();
    expect(findUserJsBlockingListener(webRequestOnBeforeRequest.addListener.mock.calls)).toBeTruthy();
    expect(dnrUpdateSessionRules).not.toHaveBeenCalled();
  });

  test('MV2 blocking install interception uses about:blank redirect (no javascript: URL)', () => {
    const { webRequestOnBeforeRequest } = setupBrowserApis();
    loadTabRedirector(2);
    const call = findUserJsBlockingListener(webRequestOnBeforeRequest.addListener.mock.calls);
    expect(call).toBeTruthy();
    const [listener] = call;
    const result = listener({
      method: 'GET',
      tabId: 7,
      url: 'https://example.com/sample.user.js',
    });
    expect(result).toEqual({ redirectUrl: 'about:blank' });
  });

  test('MV3 fallback opens Confirm page for valid user script URL', async () => {
    jest.resetModules();
    const { tabsOnUpdated } = setupBrowserApis();
    const targetUrl = 'https://example.com/test.user.js';
    global.browser.tabs.get = jest.fn(async id => ({
      id,
      url: targetUrl,
      active: false,
      incognito: false,
      windowId: 1,
    }));
    global.extensionManifest.manifest_version = 3;
    const common = require('@/common');
    const reqSpy = jest.spyOn(common, 'request').mockResolvedValue({
      data: '// ==UserScript==\n// @name Example\n// ==/UserScript==\n',
    });
    require('@/background/utils/tab-redirector');
    const { commands } = require('@/background/utils/init');
    commands.Notification = jest.fn();
    const handlers = tabsOnUpdated.addListener.mock.calls
      .filter(([, filter]) => !filter || filter?.properties?.includes('url'))
      .map(([fn]) => fn);
    expect(handlers.length).toBeGreaterThan(0);
    handlers.forEach(fn => fn(12, { url: targetUrl }, { id: 12, url: targetUrl }));
    await flushTasks();
    expect(reqSpy).toHaveBeenCalledWith(targetUrl);
    expect(global.browser.tabs.update).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ url: expect.stringContaining('confirm/index.html#') }),
    );
    expect(commands.Notification).not.toHaveBeenCalled();
  });

  test('MV3 fallback keeps navigation for invalid user script URL', async () => {
    jest.resetModules();
    const { tabsOnUpdated } = setupBrowserApis();
    const targetUrl = 'https://example.com/not-a-script.user.js';
    global.browser.tabs.get = jest.fn(async id => ({
      id,
      url: targetUrl,
      active: false,
      incognito: false,
      windowId: 1,
    }));
    global.extensionManifest.manifest_version = 3;
    const common = require('@/common');
    const reqSpy = jest.spyOn(common, 'request').mockResolvedValue({
      data: 'not a userscript',
    });
    require('@/background/utils/tab-redirector');
    const { commands } = require('@/background/utils/init');
    commands.Notification = jest.fn();
    const handlers = tabsOnUpdated.addListener.mock.calls
      .filter(([, filter]) => !filter || filter?.properties?.includes('url'))
      .map(([fn]) => fn);
    expect(handlers.length).toBeGreaterThan(0);
    handlers.forEach(fn => fn(12, { url: targetUrl }, { id: 12, url: targetUrl }));
    await flushTasks();
    expect(reqSpy).toHaveBeenCalledWith(targetUrl);
    const updatedUrls = global.browser.tabs.update.mock.calls
      .map(([, options]) => options?.url)
      .filter(Boolean);
    expect(updatedUrls).toContain(targetUrl);
    expect(commands.Notification).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining(targetUrl),
    }));
  });

  test('MV3 fallback opens Confirm page for whitelisted install source without content fetch', async () => {
    jest.resetModules();
    const { tabsOnUpdated } = setupBrowserApis();
    const targetUrl = 'https://greasyfork.org/scripts/123/code/test.user.js';
    global.browser.tabs.get = jest.fn(async id => ({
      id,
      url: targetUrl,
      active: false,
      incognito: false,
      windowId: 1,
    }));
    global.extensionManifest.manifest_version = 3;
    const common = require('@/common');
    const reqSpy = jest.spyOn(common, 'request').mockResolvedValue({
      data: '// ==UserScript==\n// @name ShouldNotFetch\n// ==/UserScript==\n',
    });
    require('@/background/utils/tab-redirector');
    const handlers = tabsOnUpdated.addListener.mock.calls
      .filter(([, filter]) => !filter || filter?.properties?.includes('url'))
      .map(([fn]) => fn);
    handlers.forEach(fn => fn(33, { url: targetUrl }, { id: 33, url: targetUrl }));
    await flushTasks();
    expect(reqSpy).toHaveBeenCalledWith(targetUrl);
    expect(global.browser.tabs.update).toHaveBeenCalledWith(
      33,
      expect.objectContaining({ url: expect.stringContaining('confirm/index.html#') }),
    );
  });

  test('MV3 fallback accepts localized GreasyFork install source', async () => {
    jest.resetModules();
    const { tabsOnUpdated } = setupBrowserApis();
    const targetUrl = 'https://greasyfork.org/en/scripts/123/code/test.user.js';
    global.browser.tabs.get = jest.fn(async id => ({
      id,
      url: targetUrl,
      active: false,
      incognito: false,
      windowId: 1,
    }));
    global.extensionManifest.manifest_version = 3;
    const common = require('@/common');
    const reqSpy = jest.spyOn(common, 'request').mockResolvedValue({
      data: '// ==UserScript==\n// @name Localized\n// ==/UserScript==\n',
    });
    require('@/background/utils/tab-redirector');
    const handlers = tabsOnUpdated.addListener.mock.calls
      .filter(([, filter]) => !filter || filter?.properties?.includes('url'))
      .map(([fn]) => fn);
    handlers.forEach(fn => fn(34, { url: targetUrl }, { id: 34, url: targetUrl }));
    await flushTasks();
    expect(reqSpy).toHaveBeenCalledWith(targetUrl);
    expect(global.browser.tabs.update).toHaveBeenCalledWith(
      34,
      expect.objectContaining({ url: expect.stringContaining('confirm/index.html#') }),
    );
  });

  test('MV3 fallback resolves GreasyFork JSONP metadata to code_url before opening Confirm', async () => {
    jest.resetModules();
    const { tabsOnUpdated } = setupBrowserApis();
    const targetUrl = 'https://greasyfork.org/scripts/567659/code/test.user.js';
    const resolvedCodeUrl = 'https://update.greasyfork.org/scripts/567659/test.user.js';
    global.browser.tabs.get = jest.fn(async id => ({
      id,
      url: targetUrl,
      active: false,
      incognito: false,
      windowId: 1,
    }));
    global.extensionManifest.manifest_version = 3;
    const common = require('@/common');
    const reqSpy = jest.spyOn(common, 'request').mockImplementation(async (url) => {
      if (url === targetUrl) {
        return {
          data: `/**/callback({"id":567659,"code_url":"${resolvedCodeUrl}"})`,
        };
      }
      if (url === resolvedCodeUrl) {
        return {
          data: '// ==UserScript==\n// @name Example\n// ==/UserScript==\n',
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    require('@/background/utils/tab-redirector');
    const handlers = tabsOnUpdated.addListener.mock.calls
      .filter(([, filter]) => !filter || filter?.properties?.includes('url'))
      .map(([fn]) => fn);
    handlers.forEach(fn => fn(44, { url: targetUrl }, { id: 44, url: targetUrl }));
    await flushTasks();
    expect(reqSpy).toHaveBeenCalledWith(targetUrl);
    expect(reqSpy).toHaveBeenCalledWith(resolvedCodeUrl);
    expect(global.browser.tabs.update).toHaveBeenCalledWith(
      44,
      expect.objectContaining({ url: expect.stringContaining('confirm/index.html#') }),
    );
  });
});
