const VM_HOME = 'https://violentmonkey.github.io/';
const { resolve } = require('path');
const ENV_KEYS = [
  'SYNC_DROPBOX_CLIENT_ID',
  'SYNC_GOOGLE_DESKTOP_ID',
  'SYNC_GOOGLE_DESKTOP_SECRET',
  'SYNC_ONEDRIVE_CLIENT_ID',
];
const envSnapshot = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));

function restoreEnv() {
  ENV_KEYS.forEach((key) => {
    const value = envSnapshot[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  });
}

function makeBaseMocks() {
  const openAuthPage = jest.fn();
  const register = jest.fn();
  const getCodeChallenge = jest.fn(async () => ({
    code_challenge: 'challenge',
    code_challenge_method: 'S256',
  }));
  const getCodeVerifier = jest.fn(() => 'verifier');
  return { openAuthPage, register, getCodeChallenge, getCodeVerifier };
}

function makeCommonMocks() {
  return {
    dumpQuery: obj => new URLSearchParams(obj).toString(),
    loadQuery: str => Object.fromEntries(new URLSearchParams(str)),
    getUniqId: jest.fn(() => 'state-1'),
    noop: () => {},
  };
}

function loadProvider(filePath, env) {
  jest.resetModules();
  Object.entries(env).forEach(([k, v]) => {
    if (v == null) delete process.env[k];
    else process.env[k] = v;
  });
  const common = makeCommonMocks();
  const base = makeBaseMocks();
  jest.doMock('@/common', () => common);
  jest.doMock('@/background/sync/base', () => {
    const BaseService = {
      extend(spec) {
        function Service() {
          this.config = {
            get: jest.fn(),
            set: jest.fn(),
          };
          this.session = null;
        }
        Object.assign(Service.prototype, spec);
        return Service;
      },
    };
    return {
      BaseService,
      getCodeChallenge: base.getCodeChallenge,
      getCodeVerifier: base.getCodeVerifier,
      getItemFilename: item => item?.name || item?.uri || '',
      getURI: name => name,
      INIT_ERROR: 2,
      INIT_RETRY: 1,
      INIT_SUCCESS: 0,
      INIT_UNAUTHORIZED: 3,
      isScriptFile: () => true,
      openAuthPage: base.openAuthPage,
      register: base.register,
    };
  });
  const mod = require(filePath);
  return { mod, ...base };
}

afterEach(() => {
  restoreEnv();
});

describe('sync providers auth callback flow', () => {
  const files = {
    dropbox: resolve(__dirname, '../../src/background/sync/dropbox.js'),
    googledrive: resolve(__dirname, '../../src/background/sync/googledrive.js'),
    onedrive: resolve(__dirname, '../../src/background/sync/onedrive.js'),
  };

  test('Dropbox authorize/matchAuth/finishAuth contract', async () => {
    const { mod, openAuthPage, register } = loadProvider(files.dropbox, {
      SYNC_DROPBOX_CLIENT_ID: 'dropbox-client',
    });
    expect(register).toHaveBeenCalledWith(mod.Dropbox);
    const service = new mod.Dropbox();
    await service.authorize();
    expect(openAuthPage).toHaveBeenCalledWith(
      expect.stringContaining('https://www.dropbox.com/oauth2/authorize?'),
      `${VM_HOME}auth_dropbox.html`,
    );
    service.session = { state: 's1', codeVerifier: 'v1' };
    expect(service.matchAuth(`${VM_HOME}auth_dropbox.html?state=bad&code=abc`)).toBeUndefined();
    expect(service.session).toBeNull();
    service.session = { state: 's1', codeVerifier: 'v1' };
    expect(service.matchAuth(`${VM_HOME}auth_dropbox.html?state=s1&code=abc`)).toEqual({
      code: 'abc',
      code_verifier: 'v1',
    });
    service.authorized = jest.fn(async () => {});
    await service.finishAuth({ code: 'abc', code_verifier: 'v1' });
    expect(service.authorized).toHaveBeenCalledWith({
      code: 'abc',
      code_verifier: 'v1',
      grant_type: 'authorization_code',
      redirect_uri: `${VM_HOME}auth_dropbox.html`,
    });
  });

  test('GoogleDrive authorize/matchAuth/finishAuth contract', async () => {
    const { mod, openAuthPage, register } = loadProvider(files.googledrive, {
      SYNC_GOOGLE_DESKTOP_ID: 'google-client',
      SYNC_GOOGLE_DESKTOP_SECRET: 'google-secret',
    });
    expect(register).toHaveBeenCalledWith(mod.GoogleDrive);
    const service = new mod.GoogleDrive();
    await service.authorize();
    expect(openAuthPage).toHaveBeenCalledWith(
      expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth?'),
      'http://127.0.0.1:45678/',
    );
    expect(openAuthPage.mock.calls[0][0]).toContain('prompt=consent');
    service.session = { state: 'g1', codeVerifier: 'gv1' };
    expect(service.matchAuth('http://127.0.0.1:45678/?state=bad&code=abc')).toBeUndefined();
    expect(service.session).toBeNull();
    service.session = { state: 'g1', codeVerifier: 'gv1' };
    expect(service.matchAuth('http://127.0.0.1:45678/?state=g1&code=abc')).toEqual({
      code: 'abc',
      code_verifier: 'gv1',
    });
    service.authorized = jest.fn(async () => {});
    await service.finishAuth({ code: 'abc', code_verifier: 'gv1' });
    expect(service.authorized).toHaveBeenCalledWith({
      code: 'abc',
      code_verifier: 'gv1',
      grant_type: 'authorization_code',
      redirect_uri: 'http://127.0.0.1:45678/',
    });
  });

  test('OneDrive authorize/matchAuth/finishAuth contract', async () => {
    const { mod, openAuthPage, register } = loadProvider(files.onedrive, {
      SYNC_ONEDRIVE_CLIENT_ID: 'onedrive-client',
    });
    expect(register).toHaveBeenCalledWith(mod.OneDrive);
    const service = new mod.OneDrive();
    await service.authorize();
    expect(openAuthPage).toHaveBeenCalledWith(
      expect.stringContaining('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?'),
      `${VM_HOME}auth_onedrive.html`,
    );
    service.session = { state: 'o1', codeVerifier: 'ov1' };
    expect(service.matchAuth(`${VM_HOME}auth_onedrive.html?state=bad&code=abc`)).toBeUndefined();
    expect(service.session).toBeNull();
    service.session = { state: 'o1', codeVerifier: 'ov1' };
    expect(service.matchAuth(`${VM_HOME}auth_onedrive.html?state=o1&code=abc`)).toEqual({
      code: 'abc',
      code_verifier: 'ov1',
    });
    service.authorized = jest.fn(async () => {});
    await service.finishAuth({ code: 'abc', code_verifier: 'ov1' });
    expect(service.authorized).toHaveBeenCalledWith({
      code: 'abc',
      code_verifier: 'ov1',
      grant_type: 'authorization_code',
      redirect_uri: `${VM_HOME}auth_onedrive.html`,
    });
  });
});
