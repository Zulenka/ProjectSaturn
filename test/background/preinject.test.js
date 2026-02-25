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
  const notificationsOnClicked = getListenerApi();
  const notificationsOnClosed = getListenerApi();
  const notificationsOnButtonClicked = getListenerApi();
  const webRequestOnBeforeRequest = getListenerApi();
  const webRequestOnSendHeaders = getListenerApi();
  const webRequestOnHeadersReceived = getListenerApi();
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
  global.browser.notifications = {
    onClicked: notificationsOnClicked,
    onClosed: notificationsOnClosed,
    onButtonClicked: notificationsOnButtonClicked,
    create: jest.fn(async () => ''),
    clear: jest.fn(async () => true),
  };
  global.browser.webRequest = {
    OnBeforeSendHeadersOptions: {
      EXTRA_HEADERS: 'extraHeaders',
    },
    OnHeadersReceivedOptions: {
      EXTRA_HEADERS: 'extraHeaders',
    },
    onBeforeRequest: webRequestOnBeforeRequest,
    onSendHeaders: webRequestOnSendHeaders,
    onHeadersReceived: webRequestOnHeadersReceived,
  };
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
  return {
    tabsOnUpdated,
    webRequestOnSendHeaders,
  };
}

function loadPreinject(manifestVersion) {
  jest.resetModules();
  global.extensionManifest.manifest_version = manifestVersion;
  require('@/background/utils/preinject');
}

async function flushTasks() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('preinject listener mode', () => {
  test('uses tabs.onUpdated fallback prewarm path in MV3', async () => {
    const { tabsOnUpdated, webRequestOnSendHeaders } = setupBrowserApis();
    loadPreinject(3);
    await flushTasks();
    const hasUrlWatcher = tabsOnUpdated.addListener.mock.calls.some(([, filter]) => (
      filter?.properties?.length === 1 && filter.properties[0] === 'url'
    ));
    expect(hasUrlWatcher).toBe(true);
    expect(webRequestOnSendHeaders.addListener).not.toHaveBeenCalled();
  });

  test('uses webRequest onSendHeaders prewarm path in MV2', async () => {
    const { tabsOnUpdated, webRequestOnSendHeaders } = setupBrowserApis();
    loadPreinject(2);
    await flushTasks();
    const hasUrlWatcher = tabsOnUpdated.addListener.mock.calls.some(([, filter]) => (
      filter?.properties?.length === 1 && filter.properties[0] === 'url'
    ));
    expect(hasUrlWatcher).toBe(false);
    expect(webRequestOnSendHeaders.addListener).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ types: ['main_frame', 'sub_frame'] }),
    );
  });
});
