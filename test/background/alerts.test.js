function setupStorage(seed = {}) {
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
  return db;
}

describe('alerts manager', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('pushAlert deduplicates unread alerts and drives badge state', async () => {
    setupStorage();
    const { pushAlert, getAlertsBadgeState } = require('@/background/utils/alerts');
    const first = await pushAlert({
      code: 'mv3.userScriptsDisabled',
      severity: 'warn',
      message: 'Allow User Scripts is disabled for Violentmonkey.',
      fingerprint: 'mv3.userScriptsDisabled',
    });
    const second = await pushAlert({
      code: 'mv3.userScriptsDisabled',
      severity: 'warn',
      message: 'Allow User Scripts is disabled for Violentmonkey.',
      fingerprint: 'mv3.userScriptsDisabled',
    });
    expect(first.id).toBe(second.id);
    const badge = getAlertsBadgeState();
    expect(badge.show).toBe(true);
    expect(badge.count).toBe(1);
  });

  test('alerts commands expose unread/mark-read/clear workflow', async () => {
    setupStorage();
    const { pushAlert } = require('@/background/utils/alerts');
    const { commands } = require('@/background/utils/init');
    await pushAlert({
      code: 'bg.command.failed',
      severity: 'error',
      message: 'command.failed: boom',
      fingerprint: 'bg.command.failed:boom',
    });
    await pushAlert({
      code: 'bg.runtime.error',
      severity: 'error',
      message: 'runtime.error: fail',
      fingerprint: 'bg.runtime.error:fail',
    });
    let snapshot = await commands.AlertsGet({ unreadOnly: true, severity: 'warn' });
    expect(snapshot.unreadCount).toBe(2);
    expect(snapshot.items).toHaveLength(2);
    await commands.AlertsMarkRead({ id: snapshot.items[0].id });
    snapshot = await commands.AlertsGet({ unreadOnly: true, severity: 'warn' });
    expect(snapshot.unreadCount).toBe(1);
    await commands.AlertsClear({ readOnly: true });
    const afterClearRead = await commands.AlertsGet({ severity: 'warn' });
    expect(afterClearRead.totalCount).toBe(1);
    await commands.AlertsClear({ all: true });
    const afterClearAll = await commands.AlertsGet({ severity: 'warn' });
    expect(afterClearAll.totalCount).toBe(0);
    expect(afterClearAll.badge.show).toBe(false);
  });
});
