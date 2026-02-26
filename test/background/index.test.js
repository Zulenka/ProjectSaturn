describe('background command payload validation', () => {
  let commands;

  beforeEach(() => {
    jest.resetModules();
    commands = {
      ValidCommand: jest.fn(() => 'ok'),
      OwnCommand: Object.assign(jest.fn(() => 'own-ok'), { isOwn: true }),
    };
    global.chrome.runtime.onMessage = { addListener: jest.fn() };
    global.chrome.commands = { onCommand: { addListener: jest.fn() } };
    jest.doMock('@/background/utils', () => ({
      addPublicCommands: jest.fn(),
      commands,
      init: null,
    }));
    jest.doMock('@/background/sync', () => ({}));
    jest.doMock('@/background/utils/clipboard', () => ({}));
    jest.doMock('@/background/utils/notifications', () => ({}));
    jest.doMock('@/background/utils/preinject', () => ({}));
    jest.doMock('@/background/utils/script', () => ({}));
    jest.doMock('@/background/utils/storage-fetch', () => ({}));
    jest.doMock('@/background/utils/tab-redirector', () => ({}));
    jest.doMock('@/background/utils/tester', () => ({}));
    jest.doMock('@/background/utils/update', () => ({}));
    jest.doMock('@/background/utils/icon', () => ({
      handleHotkeyOrMenu: jest.fn(),
    }));
    jest.doMock('@/background/utils/diagnostics', () => ({
      logBackgroundAction: jest.fn(),
      logBackgroundError: jest.fn(),
      logCommandFailed: jest.fn(),
      logCommandReceived: jest.fn(),
      logCommandSucceeded: jest.fn(),
    }));
    require('@/background/index');
  });

  test('rejects non-object payloads without throwing', () => {
    expect(global.handleCommandMessage(null, { origin: 'https://evil.test' })).toBeUndefined();
    expect(global.handleCommandMessage('bad', { origin: 'https://evil.test' })).toBeUndefined();
    expect(global.handleCommandMessage([], { origin: 'https://evil.test' })).toBeUndefined();
    expect(commands.ValidCommand).not.toHaveBeenCalled();
  });

  test('rejects invalid command names without executing commands', () => {
    const src = { origin: 'chrome-extension://id', fake: true };
    expect(global.handleCommandMessage({ cmd: '' }, src)).toBeUndefined();
    expect(global.handleCommandMessage({ cmd: 123 }, src)).toBeUndefined();
    expect(global.handleCommandMessage({ cmd: 'x'.repeat(129) }, src)).toBeUndefined();
    expect(commands.ValidCommand).not.toHaveBeenCalled();
  });

  test('rejects isOwn command from non-extension sender', () => {
    const src = {
      origin: 'https://evil.test',
      url: 'https://evil.test/path',
      tab: { id: 1 },
    };
    expect(() => global.handleCommandMessage({ cmd: 'OwnCommand' }, src))
      .toThrow('Command is only allowed in extension context: OwnCommand');
    expect(commands.OwnCommand).not.toHaveBeenCalled();
  });

  test('allows isOwn command for trusted fake sender path', async () => {
    const src = {
      origin: 'https://not-extension.test',
      fake: true,
      url: 'https://not-extension.test/path',
      tab: { id: 2 },
    };
    await expect(global.handleCommandMessage({ cmd: 'OwnCommand' }, src))
      .resolves.toBe('own-ok');
    expect(commands.OwnCommand).toHaveBeenCalledTimes(1);
  });
});
