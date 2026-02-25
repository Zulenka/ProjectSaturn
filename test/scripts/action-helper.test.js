const OLD_ARGV = [...process.argv];
const OLD_ENV = { ...process.env };

afterEach(() => {
  process.argv = [...OLD_ARGV];
  process.env = { ...OLD_ENV };
  jest.resetModules();
  jest.clearAllMocks();
});

function runActionHelper({ version = '2.35.0', describe } = {}) {
  const exportVariable = jest.fn();
  process.env.VERSION = version;
  process.argv = ['node', 'scripts/action-helper.js', 'ci'];
  jest.doMock('@actions/core', () => ({ exportVariable }));
  jest.doMock('../../scripts/common', () => ({
    exec: jest.fn(() => describe),
  }));
  jest.doMock('../../scripts/version-helper', () => ({
    getVersion: jest.fn(() => version),
    isBeta: jest.fn(() => false),
  }));
  jest.isolateModules(() => {
    require('../../scripts/action-helper');
  });
  return exportVariable;
}

test('action-helper falls back to version tag when git describe is unavailable', () => {
  const exportVariable = runActionHelper({ version: '3.1.4', describe: undefined });
  expect(exportVariable).toHaveBeenCalledWith('GIT_DESCRIBE', 'v3.1.4');
  expect(exportVariable).toHaveBeenCalledWith('ASSET_CHROME_ZIP', 'Violentmonkey-webext-chrome-v3.1.4.zip');
  expect(exportVariable).toHaveBeenCalledWith('ASSET_OPERA_ZIP', 'Violentmonkey-webext-opera-v3.1.4.zip');
});

test('action-helper uses git describe value when available', () => {
  const exportVariable = runActionHelper({ version: '3.1.4', describe: 'v3.1.4-5-gabc1234' });
  expect(exportVariable).toHaveBeenCalledWith('GIT_DESCRIBE', 'v3.1.4-5-gabc1234');
});
