const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis() {
  const onBeforeSendHeaders = getListenerApi();
  const onHeadersReceived = getListenerApi();
  global.browser.tabs.query = jest.fn(async () => []);
  global.browser.tabs.sendMessage = jest.fn(async () => {});
  global.browser.tabs.onUpdated = getListenerApi();
  global.browser.tabs.onRemoved = getListenerApi();
  global.browser.tabs.onCreated = getListenerApi();
  global.browser.runtime.onConnect = getListenerApi();
  global.browser.runtime.sendMessage = jest.fn(async () => ({}));
  global.browser.webRequest = {
    OnBeforeSendHeadersOptions: { EXTRA_HEADERS: 'extraHeaders' },
    onBeforeSendHeaders,
    onHeadersReceived,
  };
  global.browser.cookies = {
    ...(global.browser.cookies || {}),
    getAllCookieStores: async () => [{ id: 'firefox-default', tabIds: [1] }],
    getAll: async () => [],
    set: jest.fn(),
  };
  global.chrome.i18n = {
    getMessage: jest.fn(name => name),
  };
}

describe('requests offscreen fallback', () => {
  const OriginalXHR = global.XMLHttpRequest;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    global.XMLHttpRequest = OriginalXHR;
  });

  test('uses offscreen request path in MV3 when XMLHttpRequest is unavailable', async () => {
    setupBrowserApis();
    global.extensionManifest.manifest_version = 3;
    global.XMLHttpRequest = undefined;
    const requestInOffscreen = jest.fn(async () => ({
      status: 200,
      statusText: 'OK',
      url: 'https://example.com/data',
      headers: 'content-type: text/plain\r\n',
      contentType: 'text/plain',
      data: 'ok',
    }));
    jest.doMock('@/background/utils/offscreen', () => ({
      requestInOffscreen,
      abortOffscreenRequest: jest.fn(async () => {}),
    }));
    require('@/background/utils/requests');
    const { commands } = require('@/background/utils/init');
    await commands.HttpRequest({
      id: 'req-offscreen-1',
      url: 'https://example.com/data',
      method: 'GET',
      headers: {},
      data: [],
      events: [{ readystatechange: true, load: true, loadend: true }, {}],
      anonymous: true,
      [kXhrType]: '',
    }, {
      tab: { id: 1 },
      url: 'https://example.com/',
    });
    expect(requestInOffscreen).toHaveBeenCalledWith(expect.objectContaining({
      id: 'req-offscreen-1',
      url: 'https://example.com/data',
      method: 'GET',
    }));
    const types = global.browser.tabs.sendMessage.mock.calls
      .map(([, payload]) => payload.data?.type);
    expect(types).toEqual(expect.arrayContaining(['readystatechange', 'load', 'loadend']));
  });

  test('AbortRequest forwards to offscreen abort for pending MV3 offscreen request', async () => {
    setupBrowserApis();
    global.extensionManifest.manifest_version = 3;
    global.XMLHttpRequest = undefined;
    const abortOffscreenRequest = jest.fn(async () => {});
    let resolvePending;
    const requestInOffscreen = jest.fn(() => new Promise(resolve => {
      resolvePending = resolve;
    }));
    jest.doMock('@/background/utils/offscreen', () => ({
      requestInOffscreen,
      abortOffscreenRequest,
    }));
    require('@/background/utils/requests');
    const { commands } = require('@/background/utils/init');
    const requestPromise = commands.HttpRequest({
      id: 'req-offscreen-2',
      url: 'https://example.com/data',
      method: 'GET',
      headers: {},
      data: [],
      events: [{ readystatechange: true, load: true, loadend: true }, {}],
      anonymous: true,
      [kXhrType]: '',
    }, {
      tab: { id: 1 },
      url: 'https://example.com/',
    });
    await Promise.resolve();
    commands.AbortRequest('req-offscreen-2');
    expect(abortOffscreenRequest).toHaveBeenCalledWith('req-offscreen-2');
    resolvePending({
      status: 200,
      statusText: 'OK',
      url: 'https://example.com/data',
      headers: '',
      contentType: 'text/plain',
      data: 'done',
    });
    await requestPromise;
  });
});
