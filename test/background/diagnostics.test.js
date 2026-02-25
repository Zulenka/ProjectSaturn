const getListenerApi = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

function setupBrowserApis(seed = {}) {
  const db = { ...seed };
  global.browser.storage.local.get = jest.fn(async keys => {
    if (!keys) return { ...db };
    if (Array.isArray(keys)) {
      return keys.reduce((res, key) => {
        if (key in db) res[key] = db[key];
        return res;
      }, {});
    }
    if (typeof keys === 'string') {
      return { [keys]: db[keys] };
    }
    return Object.keys(keys).reduce((res, key) => {
      res[key] = key in db ? db[key] : keys[key];
      return res;
    }, {});
  });
  global.browser.storage.local.set = jest.fn(async data => {
    Object.assign(db, data);
  });
  global.browser.runtime.onInstalled = getListenerApi();
  global.browser.runtime.onStartup = getListenerApi();
  global.browser.runtime.onSuspend = getListenerApi();
  return db;
}

describe('diagnostics logging backend', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('captures actions/errors and exports a structured JSON payload', async () => {
    setupBrowserApis();
    const diagnostics = require('@/background/utils/diagnostics');
    const { commands } = require('@/background/utils/init');
    diagnostics.logBackgroundAction('test.action', { ok: true });
    diagnostics.logBackgroundError('test.error', new Error('boom'), { scope: 'unit' });
    diagnostics.logCommandReceived({
      cmd: 'CheckUpdate',
      data: { id: 1, nested: { enabled: true } },
      mode: 'content',
      src: {
        origin: extensionOrigin,
        url: 'https://www.torn.com/forums.php',
        tab: { id: 9 },
        [kFrameId]: 0,
        [kTop]: true,
      },
    });
    diagnostics.logCommandSucceeded({
      cmd: 'CheckUpdate',
      startedAt: performance.now() - 25,
    });
    diagnostics.logCommandFailed({
      cmd: 'CheckUpdate',
      error: new Error('request failed'),
      startedAt: performance.now() - 10,
      src: {
        tab: { id: 9 },
        url: 'https://www.torn.com/forums.php',
        [kFrameId]: 0,
      },
    });
    const current = await commands.DiagnosticsGetLog({ limit: 20 });
    expect(current.entries.length).toBeGreaterThanOrEqual(5);
    expect(current.stats.byEvent['test.action']).toBe(1);
    expect(current.stats.byEvent['test.error']).toBe(1);
    expect(current.stats.byEvent['command.received']).toBe(1);
    expect(current.stats.byEvent['command.succeeded']).toBe(1);
    expect(current.stats.byEvent['command.failed']).toBe(1);
    const exported = await commands.DiagnosticsExportLog({ limit: 20 });
    expect(exported.fileName).toMatch(/^projectsaturn-diagnostics-/);
    expect(exported.mimeType).toBe('application/json');
    const parsed = JSON.parse(exported.content);
    expect(parsed.meta.extension.version).toBe(process.env.VM_VER);
    expect(parsed.meta.extension.buildId).toBe(process.env.VM_BUILD_ID || '');
    expect(parsed.meta.schemaVersion).toBe(1);
    expect(parsed.stats.total).toBe(parsed.entries.length);
  });

  test('clear command empties diagnostics entries', async () => {
    setupBrowserApis();
    const diagnostics = require('@/background/utils/diagnostics');
    const { commands } = require('@/background/utils/init');
    diagnostics.logBackgroundAction('cleanup.before', { count: 1 });
    const before = await commands.DiagnosticsGetLog();
    expect(before.entries.length).toBeGreaterThan(0);
    const cleared = await commands.DiagnosticsClearLog();
    expect(cleared.cleared).toBeGreaterThan(0);
    const after = await commands.DiagnosticsGetLog();
    expect(after.entries).toEqual([]);
  });

  test('mv3 health command returns userscripts/offscreen/dnr snapshot', async () => {
    setupBrowserApis();
    global.extensionManifest.manifest_version = 3;
    global.chrome.runtime.getURL = jest.fn(path => `chrome-extension://id/${path}`);
    global.chrome.runtime.getContexts = jest.fn(async () => [{ contextType: 'OFFSCREEN_DOCUMENT' }]);
    global.chrome.declarativeNetRequest = {
      ...(global.chrome.declarativeNetRequest || {}),
      getSessionRules: jest.fn(async () => [{ id: 940001 }]),
    };
    global.chrome.userScripts = {
      register: jest.fn(async () => {}),
      unregister: jest.fn(async () => {}),
    };
    global.browser.userScripts = global.chrome.userScripts;
    require('@/background/utils/diagnostics');
    const { commands } = require('@/background/utils/init');
    const health = await commands.DiagnosticsGetMv3Health({ force: true });
    expect(health.manifestVersion).toBe(3);
    expect(health.extension.version).toBe(process.env.VM_VER);
    expect(health.extension.buildId).toBe(process.env.VM_BUILD_ID || '');
    expect(health.userscripts.state).toBe('ok');
    expect(health.offscreen.contextCount).toBe(1);
    expect(health.dnr.sessionRuleCount).toBe(1);
    expect(health.dnr.hasInstallInterceptRule).toBe(true);
  });
});
