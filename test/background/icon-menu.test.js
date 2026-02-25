const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis() {
  const tabsOnUpdated = getListenerApi();
  const tabsOnRemoved = getListenerApi();
  const tabsOnCreated = getListenerApi();
  const tabsOnReplaced = getListenerApi();
  const runtimeOnConnect = getListenerApi();
  const webRequestOnBeforeRequest = getListenerApi();
  global.browser.tabs.query = jest.fn(async () => []);
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
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
  global.chrome.action = {
    setIcon: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setTitle: jest.fn(),
  };
}

describe('icon menu handlers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('updateScriptsInTab does not throw when badge state is empty (worker restart case)', () => {
    jest.resetModules();
    setupBrowserApis();
    const { handleHotkeyOrMenu } = require('@/background/utils/icon');
    const { commands } = require('@/background/utils/init');
    commands.CheckUpdate = jest.fn();
    expect(() => handleHotkeyOrMenu('updateScriptsInTab', { id: 42 })).not.toThrow();
    expect(commands.CheckUpdate).not.toHaveBeenCalled();
  });

  test('updateScriptsInTab triggers update for script ids when badge state exists', () => {
    jest.resetModules();
    setupBrowserApis();
    const { handleHotkeyOrMenu, badges } = require('@/background/utils/icon');
    const { commands } = require('@/background/utils/init');
    commands.CheckUpdate = jest.fn();
    badges[42] = {
      [IDS]: new Set([10, 11]),
    };
    handleHotkeyOrMenu('updateScriptsInTab', { id: 42 });
    expect(commands.CheckUpdate).toHaveBeenCalledWith([10, 11]);
  });
});
