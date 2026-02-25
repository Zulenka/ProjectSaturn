import { __CODE } from '@/common/consts';

function createScript(id, version = '1.0.0') {
  return {
    meta: {
      name: `Script ${id}`,
      version,
    },
    props: { id },
    config: {},
  };
}

function loadUpdateModule({
  scripts,
  options = {},
  getScriptUpdateUrlImpl,
  requestNewerImpl,
  parseMetaImpl,
  parseScriptImpl,
  fetchResourcesImpl,
} = {}) {
  jest.resetModules();
  const commands = {};
  const sendCmd = jest.fn();
  const getScriptUpdateUrl = jest.fn(getScriptUpdateUrlImpl);
  const requestNewer = jest.fn(requestNewerImpl);
  const parseMeta = jest.fn(parseMetaImpl);
  const parseScript = jest.fn(parseScriptImpl || (async ({ id }) => ({
    update: createScript(id, '1.0.1'),
  })));
  const fetchResources = jest.fn(fetchResourcesImpl || (async () => null));
  const notifyToOpenScripts = jest.fn();
  const setOption = jest.fn();
  const getOption = jest.fn((key) => ({
    autoUpdate: 0,
    notifyUpdates: false,
    notifyUpdatesGlobal: false,
    updateEnabledScriptsOnly: false,
    lastUpdate: 0,
    ...options,
  })[key]);
  jest.doMock('@/common', () => ({
    compareVersion: (a, b) => (a === b ? 0 : a > b ? 1 : -1),
    ensureArray: value => (Array.isArray(value) ? value : [value]),
    getScriptName: script => script.meta?.name || `#${script.props?.id || '?'}`,
    getScriptUpdateUrl,
    i18n: (key, args) => (args?.length ? `${key}:${args.join(',')}` : key),
    sendCmd,
    trueJoin(sep) {
      return this.filter(Boolean).join(sep);
    },
  }));
  jest.doMock('@/background/utils/db', () => ({
    fetchResources,
    getScriptById: id => scripts.find(script => script.props.id === id),
    getScripts: () => scripts,
    notifyToOpenScripts,
    parseScript,
  }));
  jest.doMock('@/background/utils/init', () => ({
    addOwnCommands: obj => Object.assign(commands, obj),
    commands,
    init: Promise.resolve(),
  }));
  jest.doMock('@/background/utils/options', () => ({
    getOption,
    hookOptions: jest.fn(),
    setOption,
  }));
  jest.doMock('@/common/options-defaults', () => ({
    kUpdateEnabledScriptsOnly: 'updateEnabledScriptsOnly',
  }));
  jest.doMock('@/background/utils/storage-fetch', () => ({
    requestNewer,
  }));
  jest.doMock('@/background/utils/script', () => ({
    parseMeta,
  }));
  require('@/background/utils/update');
  return {
    commands,
    sendCmd,
    getScriptUpdateUrl,
    requestNewer,
    parseMeta,
    parseScript,
    fetchResources,
    notifyToOpenScripts,
    setOption,
  };
}

describe('update command flow', () => {
  test('CheckUpdate applies newer code and records lastUpdate on full scan', async () => {
    const script = createScript(1, '1.0.0');
    const updateData = `\
// ==UserScript==
// @name Script 1
// @version 1.1.0
// ==/UserScript==
console.log('updated');
`;
    const {
      commands,
      parseScript,
      sendCmd,
      setOption,
    } = loadUpdateModule({
      scripts: [script],
      getScriptUpdateUrlImpl: () => ['https://example.com/update.user.js', 'https://example.com/update.user.js'],
      requestNewerImpl: async () => ({ data: updateData }),
      parseMetaImpl: () => ({
        version: '1.1.0',
        [__CODE]: `\
// ==UserScript==
// @name Script 1
// @version 1.1.0
// ==/UserScript==
`,
      }),
      parseScriptImpl: async ({ id, code }) => ({
        update: { ...script, props: { id }, meta: { ...script.meta, version: '1.1.0' }, code },
      }),
    });
    const updated = await commands.CheckUpdate();
    expect(updated).toBe(1);
    expect(parseScript).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      code: updateData,
      bumpDate: true,
      update: expect.objectContaining({ checking: false }),
    }));
    expect(sendCmd).toHaveBeenCalledWith('UpdateScript', expect.objectContaining({
      where: { id: 1 },
      update: expect.objectContaining({ message: 'msgUpdated' }),
    }));
    expect(setOption).toHaveBeenCalledWith('lastUpdate', expect.any(Number));
  });

  test('CheckUpdate reports no-update path without applying code', async () => {
    const script = createScript(2, '1.0.0');
    const {
      commands,
      parseScript,
      fetchResources,
      sendCmd,
    } = loadUpdateModule({
      scripts: [script],
      getScriptUpdateUrlImpl: () => ['https://example.com/s2.user.js', 'https://example.com/s2.user.js'],
      requestNewerImpl: async () => ({ data: '// ==UserScript==\n// @version 1.0.0\n// ==/UserScript==' }),
      parseMetaImpl: () => ({ version: '1.0.0', [__CODE]: '// ==UserScript==\n// @version 1.0.0\n// ==/UserScript==' }),
      fetchResourcesImpl: async () => null,
    });
    const updated = await commands.CheckUpdate();
    expect(updated).toBe(0);
    expect(parseScript).not.toHaveBeenCalled();
    expect(fetchResources).toHaveBeenCalledWith(script, expect.any(Object));
    expect(sendCmd).toHaveBeenCalledWith('UpdateScript', expect.objectContaining({
      where: { id: 2 },
      update: expect.objectContaining({
        message: 'msgNoUpdate',
        checking: false,
      }),
    }));
  });

  test('CheckUpdate by explicit id does not update global lastUpdate', async () => {
    const script = createScript(3, '1.0.0');
    const {
      commands,
      setOption,
    } = loadUpdateModule({
      scripts: [script],
      getScriptUpdateUrlImpl: () => ['https://example.com/s3.user.js', 'https://example.com/s3.user.js'],
      requestNewerImpl: async () => ({ data: '// ==UserScript==\n// @version 1.0.0\n// ==/UserScript==' }),
      parseMetaImpl: () => ({ version: '1.0.0', [__CODE]: '// ==UserScript==\n// @version 1.0.0\n// ==/UserScript==' }),
    });
    await commands.CheckUpdate(3);
    expect(setOption).not.toHaveBeenCalledWith('lastUpdate', expect.anything());
  });
});
