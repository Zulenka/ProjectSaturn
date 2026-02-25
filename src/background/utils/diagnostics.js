import { addOwnCommands } from './init';
import { pushAlert } from './alerts';
import storage from './storage';
import { getUserScriptsHealth } from './tabs';

const DIAGNOSTICS_STORAGE_KEY = 'diagnosticsLog';
const DIAGNOSTICS_SCHEMA_VERSION = 1;
const MV3_INSTALL_DNR_RULE_ID = 940001;
const DIAGNOSTICS_MAX_ENTRIES = 1500;
const DIAGNOSTICS_SAVE_DELAY = 1200;
const MAX_STRING_LENGTH = 400;
const MAX_ARRAY_ITEMS = 24;
const MAX_OBJECT_KEYS = 24;
const LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
const IGNORED_COMMANDS = new Set([
  'DiagnosticsGetLog',
  'DiagnosticsExportLog',
  'DiagnosticsClearLog',
]);

const state = {
  dropped: 0,
  entries: [],
  nextId: 1,
  loaded: false,
  persistTimer: 0,
  persistQueue: Promise.resolve(),
  sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  startedAt: Date.now(),
};

const loadPromise = (async () => {
  try {
    const saved = await storage.base.getOne(DIAGNOSTICS_STORAGE_KEY);
    if (saved?.version === DIAGNOSTICS_SCHEMA_VERSION && Array.isArray(saved.entries)) {
      const pendingEntries = state.entries.slice();
      state.entries.length = 0;
      saved.entries.forEach(item => {
        const normalized = normalizeStoredEntry(item);
        if (normalized) state.entries.push(normalized);
      });
      pendingEntries.forEach(item => {
        const normalized = normalizeStoredEntry(item);
        if (normalized) state.entries.push(normalized);
      });
      state.nextId = Math.max(state.nextId, +saved.nextId || 1);
      state.dropped = +saved.dropped || 0;
      trimLog();
    }
  } catch (err) {
    if (process.env.DEBUG) console.warn('Failed to load diagnostics log:', err);
  } finally {
    state.loaded = true;
  }
})();

function normalizeStoredEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const ts = +entry.ts || Date.now();
  const level = normalizeLevel(entry.level);
  const event = `${entry.event || 'unknown'}`.slice(0, MAX_STRING_LENGTH);
  const type = `${entry.type || 'action'}`.slice(0, MAX_STRING_LENGTH);
  return {
    id: +entry.id || state.nextId++,
    ts,
    iso: entry.iso || new Date(ts).toISOString(),
    level,
    type,
    event,
    details: sanitizeValue(entry.details),
  };
}

function normalizeLevel(level) {
  return LEVEL_PRIORITY[level] >= 0 ? level : 'info';
}

function getLevelPriority(level) {
  return LEVEL_PRIORITY[normalizeLevel(level)];
}

function sanitizeError(error) {
  if (error instanceof Error) {
    return sanitizeValue({
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
  }
  return sanitizeValue(error);
}

function clipString(value) {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...`
    : value;
}

function sanitizeValue(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;
  const type = typeof value;
  if (type === 'boolean' || type === 'number') return value;
  if (type === 'string') return clipString(value);
  if (type === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (depth > 4) return '[MaxDepth]';
  if (type !== 'object') return `${value}`;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map(item => sanitizeValue(item, depth + 1, seen));
  }
  const obj = {};
  Object.keys(value).slice(0, MAX_OBJECT_KEYS).forEach(key => {
    obj[key] = sanitizeValue(value[key], depth + 1, seen);
  });
  return obj;
}

function summarizeData(data) {
  if (data == null) return { type: `${data}` };
  if (typeof data === 'string') {
    return {
      type: 'string',
      length: data.length,
      preview: clipString(data),
    };
  }
  if (Array.isArray(data)) {
    return { type: 'array', length: data.length };
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    return {
      type: 'object',
      keyCount: keys.length,
      keys: keys.slice(0, MAX_OBJECT_KEYS),
    };
  }
  return {
    type: typeof data,
    value: sanitizeValue(data),
  };
}

function summarizeSender(src) {
  if (!src) return null;
  return sanitizeValue({
    fake: !!src.fake,
    origin: src.origin,
    url: src.url,
    tabId: src.tab?.id,
    frameId: src[kFrameId],
    documentId: src[kDocumentId],
    [kTop]: src[kTop],
  });
}

function trimLog() {
  const overflow = state.entries.length - DIAGNOSTICS_MAX_ENTRIES;
  if (overflow > 0) {
    state.entries.splice(0, overflow);
    state.dropped += overflow;
  }
}

function queuePersist() {
  state.persistQueue = state.persistQueue
    .then(async () => {
      await loadPromise;
      await storage.base.setOne(DIAGNOSTICS_STORAGE_KEY, {
        version: DIAGNOSTICS_SCHEMA_VERSION,
        dropped: state.dropped,
        nextId: state.nextId,
        entries: state.entries,
      });
    })
    .catch(err => {
      if (process.env.DEBUG) console.warn('Failed to persist diagnostics log:', err);
    });
  return state.persistQueue;
}

function schedulePersist(forceNow) {
  if (forceNow) {
    clearTimeout(state.persistTimer);
    state.persistTimer = 0;
    return queuePersist();
  }
  if (state.persistTimer) return state.persistQueue;
  state.persistTimer = setTimeout(() => {
    state.persistTimer = 0;
    queuePersist();
  }, DIAGNOSTICS_SAVE_DELAY);
  state.persistTimer.unref?.();
  return state.persistQueue;
}

function createEntry(type, level, event, details) {
  const ts = Date.now();
  return {
    id: state.nextId++,
    ts,
    iso: new Date(ts).toISOString(),
    level: normalizeLevel(level),
    type,
    event: clipString(`${event}`),
    details: sanitizeValue(details),
  };
}

function appendEntry(entry, forcePersist) {
  state.entries.push(entry);
  trimLog();
  schedulePersist(forcePersist || entry.level === 'error');
}

function getDuration(startedAt) {
  if (!Number.isFinite(startedAt)) return undefined;
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

function getStats(entries) {
  const byEvent = {};
  const byLevel = {};
  const byType = {};
  entries.forEach(({ event, level, type }) => {
    byEvent[event] = (byEvent[event] || 0) + 1;
    byLevel[level] = (byLevel[level] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
  });
  return {
    byEvent,
    byLevel,
    byType,
    total: entries.length,
  };
}

function getMeta(entryCount = state.entries.length) {
  return {
    dropped: state.dropped,
    entryCount,
    sessionId: state.sessionId,
    sessionStartedAt: new Date(state.startedAt).toISOString(),
    schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
    extension: {
      manifestVersion: extensionManifest.manifest_version,
      name: extensionManifest.name,
      version: process.env.VM_VER,
    },
  };
}

async function getFilteredEntries({
  event,
  level = 'debug',
  limit,
  since,
  type,
} = {}) {
  await loadPromise;
  const minLevel = getLevelPriority(level);
  const sinceTs = since == null
    ? 0
    : Number.isFinite(since)
      ? +since
      : Date.parse(since) || 0;
  let entries = state.entries.filter(item => (
    item.ts >= sinceTs
    && getLevelPriority(item.level) >= minLevel
    && (!event || item.event === event)
    && (!type || item.type === type)
  ));
  const max = +limit || 0;
  if (max > 0 && entries.length > max) entries = entries.slice(-max);
  return entries;
}

function formatTimestampForFile(ts) {
  return new Date(ts).toISOString().replace(/[.:]/g, '-');
}

async function getMv3RuntimeHealth({ force } = {}) {
  const isMv3 = extensionManifest.manifest_version === 3;
  if (!isMv3) {
    return {
      checkedAt: new Date().toISOString(),
      manifestVersion: extensionManifest.manifest_version,
      status: 'not-mv3',
    };
  }
  const userscripts = await getUserScriptsHealth(force !== false);
  const capabilities = {
    offscreenCreateDocument: !!chrome.offscreen?.createDocument,
    runtimeGetContexts: !!chrome.runtime?.getContexts,
    dnrGetSessionRules: !!chrome.declarativeNetRequest?.getSessionRules,
    dnrUpdateSessionRules: !!chrome.declarativeNetRequest?.updateSessionRules,
    userScriptsExecute: !!(chrome.userScripts || browser.userScripts)?.execute,
    userScriptsRegister: !!(chrome.userScripts || browser.userScripts)?.register,
  };
  let dnr = {
    hasInstallInterceptRule: false,
    sessionRuleCount: null,
    error: '',
  };
  if (chrome.declarativeNetRequest?.getSessionRules) {
    try {
      const rules = await chrome.declarativeNetRequest.getSessionRules();
      dnr = {
        hasInstallInterceptRule: !!rules?.some(rule => rule?.id === MV3_INSTALL_DNR_RULE_ID),
        sessionRuleCount: rules?.length || 0,
        error: '',
      };
    } catch (e) {
      dnr.error = `${e?.message || e || ''}`;
    }
  }
  let offscreen = {
    contextCount: null,
    error: '',
  };
  if (chrome.runtime?.getContexts) {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('offscreen/index.html')],
      });
      offscreen.contextCount = contexts?.length || 0;
    } catch (e) {
      offscreen.error = `${e?.message || e || ''}`;
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    manifestVersion: extensionManifest.manifest_version,
    minimumChromeVersion: extensionManifest.minimum_chrome_version || '',
    userscripts,
    capabilities,
    dnr,
    offscreen,
  };
}

export function logBackgroundAction(event, details, level = 'info') {
  appendEntry(createEntry('action', level, event, details));
}

export function logBackgroundError(event, error, details) {
  const alertMessage = `${event}: ${
    error instanceof Error
      ? error.message
      : `${error || 'Unknown error'}`
  }`;
  appendEntry(createEntry('error', 'error', event, {
    ...details,
    error: sanitizeError(error),
  }), true);
  void pushAlert({
    code: `bg.${event}`,
    severity: 'error',
    message: alertMessage,
    details: sanitizeValue(details),
    fingerprint: `bg.${event}:${alertMessage}`,
  });
}

export function logCommandReceived({ cmd, data, mode, src }) {
  if (!cmd || IGNORED_COMMANDS.has(cmd)) return;
  logBackgroundAction('command.received', {
    cmd,
    mode,
    sender: summarizeSender(src),
    data: summarizeData(data),
  });
}

export function logCommandSucceeded({ cmd, startedAt }) {
  if (!cmd || IGNORED_COMMANDS.has(cmd)) return;
  logBackgroundAction('command.succeeded', {
    cmd,
    durationMs: getDuration(startedAt),
  });
}

export function logCommandFailed({ cmd, error, startedAt, src }) {
  if (!cmd || IGNORED_COMMANDS.has(cmd)) return;
  logBackgroundError('command.failed', error, {
    cmd,
    durationMs: getDuration(startedAt),
    sender: summarizeSender(src),
  });
}

addOwnCommands({
  async DiagnosticsGetLog(options) {
    const entries = await getFilteredEntries(options);
    return {
      meta: getMeta(entries.length),
      entries,
      stats: getStats(entries),
    };
  },
  async DiagnosticsExportLog(options) {
    const entries = await getFilteredEntries(options);
    const exportedAt = Date.now();
    const payload = {
      exportedAt: new Date(exportedAt).toISOString(),
      meta: getMeta(entries.length),
      stats: getStats(entries),
      entries,
    };
    const content = JSON.stringify(payload, null, 2);
    return {
      content,
      entryCount: entries.length,
      fileName: `projectsaturn-diagnostics-${formatTimestampForFile(exportedAt)}.json`,
      mimeType: 'application/json',
    };
  },
  async DiagnosticsClearLog() {
    await loadPromise;
    const cleared = state.entries.length;
    state.entries.length = 0;
    state.dropped = 0;
    state.nextId = 1;
    await schedulePersist(true);
    return { cleared };
  },
  async DiagnosticsGetMv3Health(options) {
    return getMv3RuntimeHealth(options);
  },
});

browser.runtime.onInstalled?.addListener(details => {
  logBackgroundAction('runtime.installed', {
    previousVersion: details?.previousVersion,
    reason: details?.reason,
  });
});
browser.runtime.onStartup?.addListener(() => {
  logBackgroundAction('runtime.startup', {});
});
browser.runtime.onSuspend?.addListener(() => {
  logBackgroundAction('runtime.suspend', {});
  void schedulePersist(true);
});
globalThis.addEventListener?.('error', event => {
  logBackgroundError('runtime.error', event.error || event.message, {
    column: event.colno,
    file: event.filename,
    line: event.lineno,
  });
});
globalThis.addEventListener?.('unhandledrejection', event => {
  logBackgroundError('runtime.unhandledrejection', event.reason, {});
});
