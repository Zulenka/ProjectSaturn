const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis({ throwPrefetchHook } = {}) {
  const tabsOnUpdated = getListenerApi();
  const tabsOnRemoved = getListenerApi();
  const tabsOnCreated = getListenerApi();
  const tabsOnReplaced = getListenerApi();
  const runtimeOnConnect = getListenerApi();
  const webRequestOnBeforeRequest = getListenerApi();
  webRequestOnBeforeRequest.addListener.mockImplementation(() => {
    if (throwPrefetchHook) throw new Error('prefetch hook unsupported');
  });
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
});
