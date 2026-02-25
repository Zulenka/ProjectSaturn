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
  global.browser.tabs.query = jest.fn(async () => []);
  global.browser.tabs.get = jest.fn(async id => ({ id, url: 'https://example.com/' }));
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
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
  return {
    tabsOnUpdated,
    webRequestOnBeforeRequest,
  };
}

function loadTabRedirector(manifestVersion) {
  jest.resetModules();
  global.extensionManifest.manifest_version = manifestVersion;
  require('@/background/utils/tab-redirector');
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
  test('registers non-blocking tabs.onUpdated fallback for MV3 install interception', () => {
    const { tabsOnUpdated, webRequestOnBeforeRequest } = setupBrowserApis();
    loadTabRedirector(3);
    const onUpdatedUserJsCall = tabsOnUpdated.addListener.mock.calls.find(([, filter]) => (
      filter?.properties?.length === 1 && filter.properties[0] === 'url'
    ));
    expect(onUpdatedUserJsCall).toBeTruthy();
    expect(findUserJsBlockingListener(webRequestOnBeforeRequest.addListener.mock.calls)).toBeFalsy();
  });

  test('registers blocking webRequest interception for MV2 install flow', () => {
    const { tabsOnUpdated, webRequestOnBeforeRequest } = setupBrowserApis();
    loadTabRedirector(2);
    const onUpdatedUserJsCall = tabsOnUpdated.addListener.mock.calls.find(([, filter]) => (
      filter?.properties?.length === 1 && filter.properties[0] === 'url'
    ));
    expect(onUpdatedUserJsCall).toBeFalsy();
    expect(findUserJsBlockingListener(webRequestOnBeforeRequest.addListener.mock.calls)).toBeTruthy();
  });
});
