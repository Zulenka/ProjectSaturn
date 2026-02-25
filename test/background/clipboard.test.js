describe('clipboard command', () => {
  const originalDocument = global.document;
  const originalBody = global.document?.body;
  const originalClipboard = global.navigator?.clipboard;
  const setBody = value => {
    Object.defineProperty(global.document, 'body', {
      configurable: true,
      value,
    });
  };

  afterEach(() => {
    jest.resetModules();
    global.document = originalDocument;
    if (global.document) setBody(originalBody);
    if (global.navigator) {
      Object.defineProperty(global.navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    }
  });

  test('uses DOM clipboard path when document exists', async () => {
    global.document = originalDocument;
    setBody(originalBody);
    global.document.execCommand = jest.fn(() => true);
    require('@/background/utils/clipboard');
    const { commands } = require('@/background/utils/init');
    await expect(commands.SetClipboard({
      type: 'text/plain',
      data: 'hello',
    })).resolves.toBe(true);
    expect(global.document.execCommand).toHaveBeenCalledWith('copy', false, null);
  });

  test('uses navigator.clipboard fallback without document', async () => {
    global.document = originalDocument;
    setBody(null);
    const writeText = jest.fn(async () => {});
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    require('@/background/utils/clipboard');
    const { commands } = require('@/background/utils/init');
    await expect(commands.SetClipboard({
      type: 'text/plain',
      data: 'hello',
    })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  test('returns false when no clipboard API is available', async () => {
    global.document = originalDocument;
    setBody(null);
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    require('@/background/utils/clipboard');
    const { commands } = require('@/background/utils/init');
    await expect(commands.SetClipboard({
      type: 'text/plain',
      data: 'hello',
    })).resolves.toBe(false);
  });
});
