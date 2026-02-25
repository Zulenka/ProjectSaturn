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
  global.browser.storage.local.remove = jest.fn(async () => {});
  global.browser.webRequest = {
    onBeforeRequest: webRequestOnBeforeRequest,
  };
  global.chrome.i18n = {
    getMessage: jest.fn((name) => name),
  };
}

function loadDbCommands(manifestVersion = 3) {
  jest.resetModules();
  setupBrowserApis();
  global.extensionManifest.manifest_version = manifestVersion;
  require('@/background/utils/db');
  return require('@/background/utils/init').commands;
}

describe('export/import basic flow', () => {
  test('exports installed script and re-imports from exported code', async () => {
    const commands = loadDbCommands(3);
    const scriptName = `MV3 Export Import ${Date.now()}`;
    const code = `\
// ==UserScript==
// @name ${scriptName}
// @namespace vm-test
// @version 1.0.0
// @match *://*/*
// ==/UserScript==
console.log('mv3 export/import');
`;
    const installed = await commands.ParseScript({
      code,
      from: 'https://example.com/scripts/test.user.js',
      url: 'https://example.com/scripts/test.user.js',
    });
    expect(installed.isNew).toBe(true);
    const installedId = installed.where.id;
    const exported = await commands.ExportZip({ values: false });
    const exportedItem = exported.items.find(item => item.script.props.id === installedId);
    expect(exportedItem).toBeTruthy();
    expect(exportedItem.code).toContain(`@name ${scriptName}`);
    const reImported = await commands.ParseScript({
      code: exportedItem.code,
      isNew: false,
    });
    expect(reImported.where.id).toBe(installedId);
    expect(reImported.update.meta.name).toBe(scriptName);
  });
});
