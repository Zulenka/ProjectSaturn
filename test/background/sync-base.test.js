const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis() {
  const tabsOnUpdated = getListenerApi();
  const tabsOnRemoved = getListenerApi();
  const webRequestOnBeforeRequest = getListenerApi();
  const runtimeOnConnect = getListenerApi();
  global.browser.tabs.create = jest.fn(async () => ({ id: 77 }));
  global.browser.tabs.remove = jest.fn(async () => {});
  global.browser.tabs.query = jest.fn(async () => []);
  global.browser.tabs.onUpdated = tabsOnUpdated;
  global.browser.tabs.onRemoved = tabsOnRemoved;
  global.browser.runtime.sendMessage = jest.fn(async () => ({}));
  global.browser.runtime.onConnect = runtimeOnConnect;
  global.browser.webRequest = {
    onBeforeRequest: webRequestOnBeforeRequest,
  };
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
  return {
    tabsOnUpdated,
    tabsOnRemoved,
    webRequestOnBeforeRequest,
    runtimeOnConnect,
  };
}

function loadSyncBase(manifestVersion) {
  jest.resetModules();
  global.extensionManifest.manifest_version = manifestVersion;
  return require('@/background/sync/base');
}

describe('openAuthPage', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('uses tabs.onUpdated fallback in MV3', async () => {
    jest.useFakeTimers();
    const { tabsOnUpdated, tabsOnRemoved, webRequestOnBeforeRequest } = setupBrowserApis();
    const { openAuthPage } = loadSyncBase(3);
    const updatedBefore = tabsOnUpdated.addListener.mock.calls.length;
    const removedBefore = tabsOnRemoved.addListener.mock.calls.length;
    await openAuthPage('https://example.com/auth', 'https://localhost:8443/callback');
    expect(global.browser.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com/auth' });
    const updatedCalls = tabsOnUpdated.addListener.mock.calls.slice(updatedBefore);
    expect(updatedCalls).toHaveLength(1);
    const [authUpdatedHandler, authUpdatedFilter] = updatedCalls[0];
    expect(authUpdatedFilter).toEqual({
      tabId: 77,
      properties: ['url'],
    });
    expect(webRequestOnBeforeRequest.addListener).not.toHaveBeenCalled();
    const onTabClosed = tabsOnRemoved.addListener.mock.calls.slice(removedBefore)[0][0];
    onTabClosed(77);
    expect(tabsOnUpdated.removeListener).toHaveBeenCalledWith(authUpdatedHandler);
  });

  test('falls back to unfiltered tabs.onUpdated when filter options are unsupported', async () => {
    jest.useFakeTimers();
    const { tabsOnUpdated } = setupBrowserApis();
    let triedFiltered = false;
    tabsOnUpdated.addListener.mockImplementation((fn, filter) => {
      if (filter) {
        triedFiltered = true;
        throw new Error('unsupported filter');
      }
    });
    const { openAuthPage } = loadSyncBase(3);
    const before = tabsOnUpdated.addListener.mock.calls.length;
    await openAuthPage('https://example.com/auth', 'https://localhost:8443/callback');
    expect(triedFiltered).toBe(true);
    const calls = tabsOnUpdated.addListener.mock.calls.slice(before);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBeUndefined();
  });

  test('uses webRequest blocking listener in MV2 and strips redirect port in url filter', async () => {
    jest.useFakeTimers();
    const { tabsOnUpdated, tabsOnRemoved, webRequestOnBeforeRequest } = setupBrowserApis();
    const { openAuthPage } = loadSyncBase(2);
    const updatedBefore = tabsOnUpdated.addListener.mock.calls.length;
    const removedBefore = tabsOnRemoved.addListener.mock.calls.length;
    await openAuthPage('https://example.com/auth', 'https://localhost:8443/callback');
    expect(tabsOnUpdated.addListener.mock.calls.slice(updatedBefore)).toHaveLength(0);
    const webReqCall = webRequestOnBeforeRequest.addListener.mock.calls.at(-1);
    expect(webReqCall).toEqual([
      expect.any(Function),
      {
        urls: ['https://localhost/callback*'],
        types: ['main_frame', 'xmlhttprequest'],
      },
      ['blocking'],
    ]);
    const onTabClosed = tabsOnRemoved.addListener.mock.calls.slice(removedBefore)[0][0];
    onTabClosed(77);
    expect(webRequestOnBeforeRequest.removeListener).toHaveBeenCalledWith(webReqCall[0]);
  });

  test('cleans up MV3 auth listeners on timeout', async () => {
    jest.useFakeTimers();
    const { tabsOnUpdated, tabsOnRemoved, webRequestOnBeforeRequest } = setupBrowserApis();
    const { openAuthPage } = loadSyncBase(3);
    const removedBefore = tabsOnRemoved.addListener.mock.calls.length;
    await openAuthPage('https://example.com/auth', 'https://localhost:8443/callback');
    const [onTabClosed] = tabsOnRemoved.addListener.mock.calls.slice(removedBefore)[0];
    const [onUpdatedHandler] = tabsOnUpdated.addListener.mock.calls.at(-1);
    jest.runOnlyPendingTimers();
    expect(tabsOnUpdated.removeListener).toHaveBeenCalledWith(onUpdatedHandler);
    expect(tabsOnRemoved.removeListener).toHaveBeenCalledWith(onTabClosed);
    expect(webRequestOnBeforeRequest.removeListener).not.toHaveBeenCalled();
  });

  test('cleans up MV2 auth listeners on timeout', async () => {
    jest.useFakeTimers();
    const { tabsOnUpdated, tabsOnRemoved, webRequestOnBeforeRequest } = setupBrowserApis();
    const { openAuthPage } = loadSyncBase(2);
    const removedBefore = tabsOnRemoved.addListener.mock.calls.length;
    const updatedRemoveBefore = tabsOnUpdated.removeListener.mock.calls.length;
    await openAuthPage('https://example.com/auth', 'https://localhost:8443/callback');
    const [onTabClosed] = tabsOnRemoved.addListener.mock.calls.slice(removedBefore)[0];
    const [onBeforeRequestHandler] = webRequestOnBeforeRequest.addListener.mock.calls.at(-1);
    jest.runOnlyPendingTimers();
    expect(webRequestOnBeforeRequest.removeListener).toHaveBeenCalledWith(onBeforeRequestHandler);
    expect(tabsOnRemoved.removeListener).toHaveBeenCalledWith(onTabClosed);
    expect(tabsOnUpdated.removeListener.mock.calls.length).toBe(updatedRemoveBefore);
  });
});

describe('BaseService sync transactions', () => {
  test('imports remote script data on first sync transaction', async () => {
    setupBrowserApis();
    const { BaseService } = loadSyncBase(3);
    const plugin = require('@/background/plugin');
    const db = require('@/background/utils/db');
    const updateSpy = jest.spyOn(plugin.script, 'update').mockResolvedValue({});
    const listSpy = jest.spyOn(plugin.script, 'list').mockResolvedValue([]);
    const sortSpy = jest.spyOn(db, 'sortScripts').mockResolvedValue(false);
    const metaStore = {};
    const remoteUri = 'remote-script';
    const getRemoteSpy = jest.fn(async () => JSON.stringify({
      version: 1,
      code: `\
// ==UserScript==
// @name Remote Script
// @version 1.0.0
// ==/UserScript==
`,
      more: {
        enabled: 1,
        update: 1,
        lastUpdated: 1700,
      },
    }));
    const putSpy = jest.fn(async () => {});
    const removeSpy = jest.fn(async () => {});
    const TestService = BaseService.extend({
      name: 'mv3-test-sync',
      displayName: 'MV3 Test Sync',
      get: getRemoteSpy,
      put: putSpy,
      remove: removeSpy,
      async getSyncData() {
        return [
          {
            name: VIOLENTMONKEY,
            data: {
              timestamp: 1000,
              info: {
                [remoteUri]: {
                  modified: 1700,
                  position: 2,
                },
              },
            },
          },
          [
            {
              uri: remoteUri,
              name: `vm@2-${remoteUri}`,
            },
          ],
          [],
        ];
      },
    });
    const service = new TestService();
    service.config = {
      get(key, def) {
        return key in metaStore ? metaStore[key] : def;
      },
      set(key, value) {
        metaStore[key] = value;
      },
    };
    await service._sync();
    expect(getRemoteSpy).toHaveBeenCalledWith(expect.objectContaining({ uri: remoteUri }));
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      code: expect.stringContaining('==UserScript=='),
      position: 2,
      props: expect.objectContaining({ lastModified: 1700 }),
    }));
    expect(sortSpy).toHaveBeenCalled();
    expect(metaStore.meta).toEqual(expect.objectContaining({
      timestamp: 1000,
      lastSync: expect.any(Number),
    }));
    expect(putSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
    listSpy.mockRestore();
    sortSpy.mockRestore();
  });
});
