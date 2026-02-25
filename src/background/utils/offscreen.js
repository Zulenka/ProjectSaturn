const IS_MV3 = extensionManifest.manifest_version === 3;
const OFFSCREEN_URL = 'offscreen/index.html';
const MSG_PARSE_WEBDAV = 'VMOffscreenParseWebDavDirectory';
const MSG_HTTP_REQUEST = 'VMOffscreenHttpRequest';
const MSG_HTTP_ABORT = 'VMOffscreenAbortRequest';
const OFFSCREEN_DEFAULT_TIMEOUT = 30e3;
const OFFSCREEN_PARSE_TIMEOUT = 10e3;
const OFFSCREEN_ABORT_TIMEOUT = 5e3;
const OFFSCREEN_REQUEST_TIMEOUT_BUFFER = 15e3;
const OFFSCREEN_REQUEST_MAX_TIMEOUT = 5 * 60e3;

let creatingOffscreen;

async function ensureOffscreenDocument() {
  if (!IS_MV3 || !chrome.offscreen?.createDocument) return false;
  if (creatingOffscreen) return creatingOffscreen;
  creatingOffscreen = (async () => {
    const fullUrl = chrome.runtime.getURL(OFFSCREEN_URL);
    if (chrome.runtime.getContexts) {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [fullUrl],
      });
      if (contexts.length) return true;
    }
    try {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_URL,
        reasons: ['DOM_PARSER'],
        justification: 'Parse WebDAV XML and execute DOM-dependent MV3 background tasks.',
      });
    } catch (e) {
      const message = `${e?.message || e || ''}`;
      if (!/single offscreen\s+doc|already exists/i.test(message)) throw e;
    }
    return true;
  })()
    .finally(() => {
      creatingOffscreen = null;
    });
  return creatingOffscreen;
}

async function sendOffscreenMessage(message, { timeout = OFFSCREEN_DEFAULT_TIMEOUT } = {}) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    let settled;
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(response);
    };
    const timer = timeout > 0 && setTimeout(() => {
      finish(new Error(`Offscreen message timeout: ${message?.type || 'unknown'}`));
    }, timeout);
    timer?.unref?.();
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) finish(new Error(err.message));
        else finish(null, response);
      });
    } catch (e) {
      finish(e);
    }
  });
}

export async function parseWebDavDirectoryInOffscreen(xml) {
  if (!IS_MV3) return null;
  const response = await sendOffscreenMessage({
    type: MSG_PARSE_WEBDAV,
    xml,
  }, {
    timeout: OFFSCREEN_PARSE_TIMEOUT,
  });
  if (!response?.ok) {
    throw new Error(response?.error || 'Offscreen WebDAV parse failed.');
  }
  return response.items || [];
}

export async function requestInOffscreen(payload) {
  if (!IS_MV3) return null;
  const timeout = Math.max(
    OFFSCREEN_DEFAULT_TIMEOUT,
    Math.min(
      OFFSCREEN_REQUEST_MAX_TIMEOUT,
      (+payload?.timeout || 0) + OFFSCREEN_REQUEST_TIMEOUT_BUFFER,
    ),
  );
  const response = await sendOffscreenMessage({
    type: MSG_HTTP_REQUEST,
    payload,
  }, {
    timeout,
  });
  if (!response?.ok) {
    throw new Error(response?.error || 'Offscreen HTTP request failed.');
  }
  return response.result;
}

export async function abortOffscreenRequest(id) {
  if (!IS_MV3) return;
  await sendOffscreenMessage({
    type: MSG_HTTP_ABORT,
    id,
  }, {
    timeout: OFFSCREEN_ABORT_TIMEOUT,
  }).catch(() => {});
}

export const OFFSCREEN_MESSAGES = {
  MSG_PARSE_WEBDAV,
  MSG_HTTP_REQUEST,
  MSG_HTTP_ABORT,
};
