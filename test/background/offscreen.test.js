describe('offscreen message boundaries', () => {
  const oldManifestVersion = global.extensionManifest.manifest_version;
  const oldSendMessage = global.chrome.runtime.sendMessage;
  const oldGetURL = global.chrome.runtime.getURL;
  const oldGetContexts = global.chrome.runtime.getContexts;
  const oldCreateDocument = global.chrome.offscreen.createDocument;
  const oldRuntimeLastError = global.chrome.runtime.lastError;

  beforeEach(() => {
    jest.resetModules();
    global.extensionManifest.manifest_version = 3;
    global.chrome.runtime.lastError = null;
    global.chrome.runtime.getURL = jest.fn(path => `chrome-extension://id/${path}`);
    global.chrome.runtime.getContexts = jest.fn(async () => []);
    global.chrome.offscreen.createDocument = jest.fn(async () => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    global.extensionManifest.manifest_version = oldManifestVersion;
    global.chrome.runtime.sendMessage = oldSendMessage;
    global.chrome.runtime.getURL = oldGetURL;
    global.chrome.runtime.getContexts = oldGetContexts;
    global.chrome.offscreen.createDocument = oldCreateDocument;
    global.chrome.runtime.lastError = oldRuntimeLastError;
  });

  test('parseWebDavDirectoryInOffscreen sends parse request and resolves items', async () => {
    global.chrome.runtime.sendMessage = jest.fn((message, cb) => cb({
      ok: true,
      items: [{ name: 'vm-script.user.js' }],
    }));
    const { parseWebDavDirectoryInOffscreen } = require('@/background/utils/offscreen');
    const items = await parseWebDavDirectoryInOffscreen('<xml/>');
    expect(items).toEqual([{ name: 'vm-script.user.js' }]);
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'VMOffscreenParseWebDavDirectory',
      xml: '<xml/>',
    }), expect.any(Function));
    expect(global.chrome.offscreen.createDocument).toHaveBeenCalled();
  });

  test('requestInOffscreen rejects when offscreen response times out', async () => {
    jest.useFakeTimers();
    global.chrome.runtime.sendMessage = jest.fn(() => {});
    const { requestInOffscreen } = require('@/background/utils/offscreen');
    const pending = requestInOffscreen({
      id: 'req-timeout',
      url: 'https://example.com/',
      timeout: 100,
    });
    const assertion = expect(pending).rejects.toThrow('Offscreen message timeout: VMOffscreenHttpRequest');
    await jest.advanceTimersByTimeAsync(30e3);
    await assertion;
  });

  test('abortOffscreenRequest swallows runtime send errors', async () => {
    global.chrome.runtime.sendMessage = jest.fn((_message, cb) => {
      global.chrome.runtime.lastError = { message: 'offscreen unavailable' };
      cb();
      global.chrome.runtime.lastError = null;
    });
    const { abortOffscreenRequest } = require('@/background/utils/offscreen');
    await expect(abortOffscreenRequest('req-1')).resolves.toBeUndefined();
  });
});
