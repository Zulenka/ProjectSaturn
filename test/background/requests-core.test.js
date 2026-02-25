const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupWebRequestApis() {
  const onBeforeSendHeaders = getListenerApi();
  const onHeadersReceived = getListenerApi();
  global.browser.webRequest = {
    OnBeforeSendHeadersOptions: {
      EXTRA_HEADERS: 'extraHeaders',
    },
    onBeforeSendHeaders,
    onHeadersReceived,
  };
  return { onBeforeSendHeaders, onHeadersReceived };
}

function loadRequestsCore(manifestVersion) {
  jest.resetModules();
  global.extensionManifest.manifest_version = manifestVersion;
  return require('@/background/utils/requests-core');
}

describe('requests-core toggleHeaderInjector', () => {
  test('uses non-blocking listeners and warns once in MV3', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { onBeforeSendHeaders, onHeadersReceived } = setupWebRequestApis();
    const { toggleHeaderInjector } = loadRequestsCore(3);

    toggleHeaderInjector('req1', { test: { name: 'test', value: '1' } });
    toggleHeaderInjector('req2', {});

    const reqOptions = onBeforeSendHeaders.addListener.mock.calls[0][2];
    const resOptions = onHeadersReceived.addListener.mock.calls[0][2];
    expect(reqOptions).toContain('requestHeaders');
    expect(resOptions).toContain('responseHeaders');
    expect(reqOptions).not.toContain('blocking');
    expect(resOptions).not.toContain('blocking');
    expect(warn).toHaveBeenCalledWith(
      'MV3: request header injection is limited without webRequest blocking.',
    );

    toggleHeaderInjector('req1', null);
    expect(onBeforeSendHeaders.removeListener).not.toHaveBeenCalled();
    expect(onHeadersReceived.removeListener).not.toHaveBeenCalled();

    toggleHeaderInjector('req2', null);
    expect(onBeforeSendHeaders.removeListener).toHaveBeenCalledTimes(1);
    expect(onHeadersReceived.removeListener).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });

  test('uses blocking listeners in MV2', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { onBeforeSendHeaders, onHeadersReceived } = setupWebRequestApis();
    const { toggleHeaderInjector } = loadRequestsCore(2);

    toggleHeaderInjector('req1', { test: { name: 'test', value: '1' } });

    const reqOptions = onBeforeSendHeaders.addListener.mock.calls[0][2];
    const resOptions = onHeadersReceived.addListener.mock.calls[0][2];
    expect(reqOptions).toContain('blocking');
    expect(resOptions).toContain('blocking');
    expect(warn).not.toHaveBeenCalledWith(
      'MV3: request header injection is limited without webRequest blocking.',
    );

    warn.mockRestore();
  });
});
