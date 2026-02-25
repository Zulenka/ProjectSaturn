describe('storage helpers', () => {
  let originalLocal;

  beforeEach(() => {
    originalLocal = global.browser.storage.local;
  });

  afterEach(() => {
    global.browser.storage.local = originalLocal;
  });

  test('getStorageKeys keeps StorageArea binding', async () => {
    jest.resetModules();
    const local = {
      get: jest.fn(async () => ({})),
      set: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
      getKeys: jest.fn(function getKeys() {
        if (this !== local) throw new TypeError('Illegal invocation');
        return Promise.resolve(['a', 'b']);
      }),
    };
    global.browser.storage.local = local;
    const { getStorageKeys } = require('@/background/utils/storage');
    await expect(getStorageKeys()).resolves.toEqual(['a', 'b']);
    expect(local.getKeys).toHaveBeenCalledTimes(1);
  });

  test('getStorageKeys is optional when API is unavailable', async () => {
    jest.resetModules();
    const local = {
      get: jest.fn(async () => ({})),
      set: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    };
    global.browser.storage.local = local;
    const { getStorageKeys } = require('@/background/utils/storage');
    expect(getStorageKeys()).toBeUndefined();
  });
});
