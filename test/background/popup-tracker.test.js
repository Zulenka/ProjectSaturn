const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis({ throwPrefetchHook, activeTab } = {}) {
  const tabsOnUpdated = getListenerApi();
  const tabsOnRemoved = getListenerApi();
  const tabsOnCreated = getListenerApi();
  const tabsOnReplaced = getListenerApi();
  const runtimeOnConnect = getListenerApi();
  const webRequestOnBeforeRequest = getListenerApi();
  webRequestOnBeforeRequest.addListener.mockImplementation(() => {
    if (throwPrefetchHook) throw new Error('prefetch hook unsupported');
  });
  global.browser.tabs.query = jest.fn(async () => activeTab ? [activeTab] : []);
  global.browser.tabs.get = jest.fn(async id => ({ id, url: 'https://example.com/' }));
  global.browser.tabs.update = jest.fn(async () => ({}));
  global.browser.tabs.create = jest.fn(async () => ({ id: 55 }));
  global.browser.tabs.remove = jest.fn(async () => {});
  global.browser.tabs.onUpdated = tabsOnUpdated;
  global.browser.tabs.onRemoved = tabsOnRemoved;
  global.browser.tabs.onCreated = tabsOnCreated;
  global.browser.tabs.onReplaced = tabsOnReplaced;
  global.browser.runtime.sendMessage = jest.fn(async () => ({}));
  global.browser.runtime.onConnect = runtimeOnConnect;
  global.browser.webRequest = {
    onBeforeRequest: webRequestOnBeforeRequest,
  };
  global.extensionManifest.action = {
    default_popup: 'popup/index.html',
  };
  global.extensionManifest.browser_action = {
    default_popup: 'popup/index.html',
  };
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
  return { webRequestOnBeforeRequest };
}

describe('popup-tracker startup', () => {
  const debugSnapshot = process.env.DEBUG;

  afterEach(() => {
    process.env.DEBUG = debugSnapshot;
  });

  test('loads when popup prefetch hook registration is unsupported', () => {
    jest.resetModules();
    process.env.DEBUG = '1';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupBrowserApis({ throwPrefetchHook: true });
    expect(() => require('@/background/utils/popup-tracker')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('registers popup prefetch hook when runtime supports it', () => {
    jest.resetModules();
    process.env.DEBUG = '';
    const { webRequestOnBeforeRequest } = setupBrowserApis();
    expect(() => require('@/background/utils/popup-tracker')).not.toThrow();
    expect(webRequestOnBeforeRequest.addListener).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ types: ['main_frame'] }),
    );
  });

  test('InitPopup reports restarted state after worker clears badge inject state', async () => {
    jest.resetModules();
    process.env.DEBUG = '';
    const activeTab = { id: 42, url: 'https://example.com/' };
    setupBrowserApis({ activeTab });
    const cacheState = {};
    const cacheMock = {
      pop: jest.fn(() => undefined),
      get: jest.fn(key => cacheState[key]),
      put: jest.fn((key, value) => ((cacheState[key] = value), value)),
    };
    const badges = {};
    const getFailureReason = jest.fn(() => ['', IS_APPLIED]);
    const getScriptsByURL = jest.fn(() => ({ 11: 1 }));
    const getData = jest.fn(async () => ({ [SCRIPTS]: [{ id: 11 }], menus: {} }));
    const executeScriptInTab = jest.fn(async () => [true]);
    jest.doMock('@/background/utils/cache', () => ({
      __esModule: true,
      default: cacheMock,
    }));
    jest.doMock('@/background/utils/icon', () => ({
      badges,
      getFailureReason,
    }));
    jest.doMock('@/background/utils/db', () => ({
      getData,
      getScriptsByURL,
    }));
    jest.doMock('@/background/utils/tabs', () => ({
      executeScriptInTab,
    }));
    const { commands } = require('@/background/utils/init');
    commands.GetTabDomain = jest.fn(() => ({ host: 'example.com', domain: 'example.com' }));
    require('@/background/utils/popup-tracker');
    const [cachedSetPopup, data, failure] = await commands.InitPopup();
    expect(failure[0]).toBe('failureReasonRestarted');
    expect(cachedSetPopup[0][0][INJECT_INTO]).toBe('off');
    expect(data.tab).toEqual(activeTab);
    expect(executeScriptInTab).toHaveBeenCalledWith(42, {
      code: '1',
      [RUN_AT]: 'document_start',
      tryUserScripts: global.extensionManifest.manifest_version === 3,
      allowRegisterFallback: false,
      allowLegacyCodeFallback: false,
    });
  });

  test('InitPopup keeps MV3 tab injectable when probe result is empty but userscripts API exists', async () => {
    jest.resetModules();
    process.env.DEBUG = '';
    const activeTab = { id: 43, url: 'https://example.com/' };
    setupBrowserApis({ activeTab });
    global.extensionManifest.manifest_version = 3;
    const cacheState = {};
    const cacheMock = {
      pop: jest.fn(() => undefined),
      get: jest.fn(key => cacheState[key]),
      put: jest.fn((key, value) => ((cacheState[key] = value), value)),
    };
    const badges = {};
    const getFailureReason = jest.fn((url) => (
      url ? ['', IS_APPLIED] : ['failureReasonNoninjectable', IS_APPLIED]
    ));
    const getScriptsByURL = jest.fn(() => ({}));
    const getData = jest.fn(async () => ({ [SCRIPTS]: [], menus: {} }));
    const executeScriptInTab = jest.fn(async () => []);
    jest.doMock('@/background/utils/cache', () => ({
      __esModule: true,
      default: cacheMock,
    }));
    jest.doMock('@/background/utils/icon', () => ({
      badges,
      getFailureReason,
    }));
    jest.doMock('@/background/utils/db', () => ({
      getData,
      getScriptsByURL,
    }));
    jest.doMock('@/background/utils/tabs', () => ({
      executeScriptInTab,
    }));
    const { commands } = require('@/background/utils/init');
    commands.GetTabDomain = jest.fn(() => ({ host: 'example.com', domain: 'example.com' }));
    require('@/background/utils/popup-tracker');
    const [, data, failure] = await commands.InitPopup();
    expect(data.tab).toEqual(activeTab);
    expect(failure[0]).toBe('');
    expect(executeScriptInTab).toHaveBeenCalledWith(43, {
      code: '1',
      [RUN_AT]: 'document_start',
      tryUserScripts: global.extensionManifest.manifest_version === 3,
      allowRegisterFallback: false,
      allowLegacyCodeFallback: false,
    });
  });

  test('InitPopup probes when tab URL is missing before declaring noninjectable', async () => {
    jest.resetModules();
    process.env.DEBUG = '';
    const activeTab = { id: 44 };
    setupBrowserApis({ activeTab });
    global.extensionManifest.manifest_version = 3;
    const cacheState = {};
    const cacheMock = {
      pop: jest.fn(() => undefined),
      get: jest.fn(key => cacheState[key]),
      put: jest.fn((key, value) => ((cacheState[key] = value), value)),
    };
    const badges = {};
    const getFailureReason = jest.fn((url) => (
      url ? ['', IS_APPLIED] : ['failureReasonNoninjectable', IS_APPLIED]
    ));
    const getScriptsByURL = jest.fn(() => ({}));
    const getData = jest.fn(async () => ({ [SCRIPTS]: [], menus: {} }));
    const executeScriptInTab = jest.fn(async () => [true]);
    jest.doMock('@/background/utils/cache', () => ({
      __esModule: true,
      default: cacheMock,
    }));
    jest.doMock('@/background/utils/icon', () => ({
      badges,
      getFailureReason,
    }));
    jest.doMock('@/background/utils/db', () => ({
      getData,
      getScriptsByURL,
    }));
    jest.doMock('@/background/utils/tabs', () => ({
      executeScriptInTab,
    }));
    const { commands } = require('@/background/utils/init');
    commands.GetTabDomain = jest.fn(() => ({ host: '', domain: '' }));
    require('@/background/utils/popup-tracker');
    const [, data, failure] = await commands.InitPopup();
    expect(data.tab).toEqual(activeTab);
    expect(failure[0]).toBe('');
    expect(executeScriptInTab).toHaveBeenCalledWith(44, {
      code: '1',
      [RUN_AT]: 'document_start',
      tryUserScripts: global.extensionManifest.manifest_version === 3,
      allowRegisterFallback: false,
      allowLegacyCodeFallback: false,
    });
  });

  test('InitPopup returns noninjectable when URL is missing and probe fails', async () => {
    jest.resetModules();
    process.env.DEBUG = '';
    const activeTab = { id: 45 };
    setupBrowserApis({ activeTab });
    global.extensionManifest.manifest_version = 3;
    global.chrome.userScripts = {};
    global.browser.userScripts = global.chrome.userScripts;
    const cacheState = {};
    const cacheMock = {
      pop: jest.fn(() => undefined),
      get: jest.fn(key => cacheState[key]),
      put: jest.fn((key, value) => ((cacheState[key] = value), value)),
    };
    const badges = {};
    const getFailureReason = jest.fn((url) => (
      url ? ['', IS_APPLIED] : ['failureReasonNoninjectable', IS_APPLIED]
    ));
    const getScriptsByURL = jest.fn(() => ({}));
    const getData = jest.fn(async () => ({ [SCRIPTS]: [], menus: {} }));
    const executeScriptInTab = jest.fn(async () => []);
    jest.doMock('@/background/utils/cache', () => ({
      __esModule: true,
      default: cacheMock,
    }));
    jest.doMock('@/background/utils/icon', () => ({
      badges,
      getFailureReason,
    }));
    jest.doMock('@/background/utils/db', () => ({
      getData,
      getScriptsByURL,
    }));
    jest.doMock('@/background/utils/tabs', () => ({
      executeScriptInTab,
    }));
    const { commands } = require('@/background/utils/init');
    commands.GetTabDomain = jest.fn(() => ({ host: '', domain: '' }));
    require('@/background/utils/popup-tracker');
    const [, data, failure] = await commands.InitPopup();
    expect(data.tab).toEqual(activeTab);
    expect(failure[0]).toBe('failureReasonNoninjectable');
    expect(executeScriptInTab).toHaveBeenCalledWith(45, {
      code: '1',
      [RUN_AT]: 'document_start',
      tryUserScripts: global.extensionManifest.manifest_version === 3,
      allowRegisterFallback: false,
      allowLegacyCodeFallback: false,
    });
  });

  test('InitPopup appends userScripts toggle guidance when MV3 health check reports disabled', async () => {
    jest.resetModules();
    process.env.DEBUG = '';
    const activeTab = { id: 46 };
    setupBrowserApis({ activeTab });
    global.extensionManifest.manifest_version = 3;
    const cacheState = {};
    const cacheMock = {
      pop: jest.fn(() => undefined),
      get: jest.fn(key => cacheState[key]),
      put: jest.fn((key, value) => ((cacheState[key] = value), value)),
    };
    const badges = {};
    const getFailureReason = jest.fn((url) => (
      url ? ['', IS_APPLIED] : ['failureReasonNoninjectable', IS_APPLIED]
    ));
    const getScriptsByURL = jest.fn(() => ({}));
    const getData = jest.fn(async () => ({ [SCRIPTS]: [], menus: {} }));
    const executeScriptInTab = jest.fn(async () => []);
    const getUserScriptsHealth = jest.fn(async () => ({
      state: 'disabled',
      message: 'Allow User Scripts is disabled for Violentmonkey.',
    }));
    jest.doMock('@/background/utils/cache', () => ({
      __esModule: true,
      default: cacheMock,
    }));
    jest.doMock('@/background/utils/icon', () => ({
      badges,
      getFailureReason,
    }));
    jest.doMock('@/background/utils/db', () => ({
      getData,
      getScriptsByURL,
    }));
    jest.doMock('@/background/utils/tabs', () => ({
      executeScriptInTab,
      getUserScriptsHealth,
    }));
    const { commands } = require('@/background/utils/init');
    commands.GetTabDomain = jest.fn(() => ({ host: '', domain: '' }));
    require('@/background/utils/popup-tracker');
    const [, data, failure] = await commands.InitPopup();
    expect(data.tab).toEqual(activeTab);
    expect(failure[0]).toContain('failureReasonNoninjectable');
    expect(failure[0]).toContain('Allow User Scripts is disabled');
    expect(getUserScriptsHealth).toHaveBeenCalled();
  });
});
