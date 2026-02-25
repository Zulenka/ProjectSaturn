const IS_MV3 = extensionManifest.manifest_version === 3;
const OFFSCREEN_URL = 'offscreen/index.html';
const MSG_PARSE_WEBDAV = 'VMOffscreenParseWebDavDirectory';
const MSG_HTTP_REQUEST = 'VMOffscreenHttpRequest';
const MSG_HTTP_ABORT = 'VMOffscreenAbortRequest';

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

async function sendOffscreenMessage(message) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
      } else {
        resolve(response);
      }
    });
  });
}

export async function parseWebDavDirectoryInOffscreen(xml) {
  if (!IS_MV3) return null;
  const response = await sendOffscreenMessage({
    type: MSG_PARSE_WEBDAV,
    xml,
  });
  if (!response?.ok) {
    throw new Error(response?.error || 'Offscreen WebDAV parse failed.');
  }
  return response.items || [];
}

export async function requestInOffscreen(payload) {
  if (!IS_MV3) return null;
  const response = await sendOffscreenMessage({
    type: MSG_HTTP_REQUEST,
    payload,
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
  }).catch(() => {});
}

export const OFFSCREEN_MESSAGES = {
  MSG_PARSE_WEBDAV,
  MSG_HTTP_REQUEST,
  MSG_HTTP_ABORT,
};
