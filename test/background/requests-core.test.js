const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupWebRequestApis() {
  const onBeforeSendHeaders = getListenerApi();
  const onHeadersReceived = getListenerApi();
  const setCookie = jest.fn();
  global.browser.webRequest = {
    OnBeforeSendHeadersOptions: {
      EXTRA_HEADERS: 'extraHeaders',
    },
    onBeforeSendHeaders,
    onHeadersReceived,
  };
  global.browser.cookies = {
    ...(global.browser.cookies || {}),
    set: setCookie,
  };
  return { onBeforeSendHeaders, onHeadersReceived, setCookie };
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
    const listener = onBeforeSendHeaders.addListener.mock.calls[0][0];
    const reqId = 'req1';
    const requestId = 'core-1';
    const { requests, VM_VERIFY } = require('@/background/utils/requests-core');
    requests[reqId] = {};
    const result = listener({
      requestId,
      url: 'https://example.com/data',
      requestHeaders: [
        { name: VM_VERIFY, value: reqId },
      ],
    });
    expect(result).toBeUndefined();
    expect(requests[reqId].coreId).toBe(requestId);
    expect(requests[reqId].url).toBe('https://example.com/data');

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
    const listener = onBeforeSendHeaders.addListener.mock.calls[0][0];
    const reqId = 'req1';
    const requestId = 'core-2';
    const { requests, VM_VERIFY } = require('@/background/utils/requests-core');
    requests[reqId] = {};
    const result = listener({
      requestId,
      url: 'https://example.com/data',
      requestHeaders: [
        { name: VM_VERIFY, value: reqId },
      ],
    });
    expect(result).toBeTruthy();
    expect(result.requestHeaders).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'test', value: '1' }),
    ]));
    expect(warn).not.toHaveBeenCalledWith(
      'MV3: request header injection is limited without webRequest blocking.',
    );

    warn.mockRestore();
  });

  test('merges cookie and auth header injections for MV2 request flows', () => {
    const { onBeforeSendHeaders } = setupWebRequestApis();
    const { toggleHeaderInjector, requests, VM_VERIFY, kCookie } = loadRequestsCore(2);
    const reqId = 'req-cookie-auth';
    requests[reqId] = { [kCookie]: true };
    toggleHeaderInjector(reqId, {
      cookie: { name: kCookie, value: 'session=2' },
      authorization: { name: 'authorization', value: 'Basic Zm9vOmJhcg==' },
    });
    const listener = onBeforeSendHeaders.addListener.mock.calls[0][0];
    const result = listener({
      requestId: 'core-cookie-auth',
      url: 'https://example.com/data',
      requestHeaders: [
        { name: VM_VERIFY, value: reqId },
        { name: 'Cookie', value: 'session=1' },
      ],
    });
    expect(result.requestHeaders).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: kCookie, value: 'session=1; session=2' }),
      expect.objectContaining({ name: 'authorization', value: 'Basic Zm9vOmJhcg==' }),
    ]));
  });

  test('drops Set-Cookie response headers for anonymous MV2 requests', () => {
    const { onHeadersReceived } = setupWebRequestApis();
    const {
      toggleHeaderInjector, requests, verify, kSetCookie,
    } = loadRequestsCore(2);
    const reqId = 'req-anon';
    const coreId = 'core-anon';
    requests[reqId] = { [kSetCookie]: false };
    verify[coreId] = reqId;
    toggleHeaderInjector(reqId, {});
    const listener = onHeadersReceived.addListener.mock.calls[0][0];
    const responseHeaders = [
      { name: 'Set-Cookie', value: 'sid=abc; Path=/' },
      { name: 'Content-Type', value: 'text/plain' },
    ];
    const result = listener({
      requestId: coreId,
      url: 'https://example.com/data',
      responseHeaders,
    });
    expect(result.responseHeaders).toEqual([
      { name: 'Content-Type', value: 'text/plain' },
    ]);
    expect(requests[reqId].responseHeaders).toContain('Set-Cookie: sid=abc; Path=/');
  });

  test('replays Set-Cookie into custom store in MV3 non-blocking mode', () => {
    const { onHeadersReceived, setCookie } = setupWebRequestApis();
    const {
      toggleHeaderInjector, requests, verify, kSetCookie,
    } = loadRequestsCore(3);
    const reqId = 'req-store';
    const coreId = 'core-store';
    requests[reqId] = {
      [kSetCookie]: true,
      storeId: 'firefox-container-1',
    };
    verify[coreId] = reqId;
    toggleHeaderInjector(reqId, {});
    const listener = onHeadersReceived.addListener.mock.calls[0][0];
    const result = listener({
      requestId: coreId,
      url: 'https://example.com/data',
      responseHeaders: [
        { name: 'Set-Cookie', value: 'sid=abc; Path=/; SameSite=None; Secure' },
      ],
    });
    expect(result).toBeUndefined();
    expect(setCookie).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/data',
      name: 'sid',
      value: 'abc',
      path: '/',
      sameSite: 'no_restriction',
      secure: true,
      storeId: 'firefox-container-1',
    }));
  });
});
