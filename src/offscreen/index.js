import '@/common/browser';
import { parseWebDavDirectoryListing } from '@/common/webdav-xml';

const MSG_PARSE_WEBDAV = 'VMOffscreenParseWebDavDirectory';
const MSG_HTTP_REQUEST = 'VMOffscreenHttpRequest';
const MSG_HTTP_ABORT = 'VMOffscreenAbortRequest';
const requests = new Map();

function replyWith(promise, sendResponse) {
  Promise.resolve(promise).then(
    data => sendResponse(data),
    err => sendResponse({
      ok: false,
      error: err?.message || `${err}`,
    }),
  );
}

browser.runtime.onMessage.addListener((msg, _src, sendResponse) => {
  if (msg?.type === MSG_PARSE_WEBDAV) {
    replyWith((async () => ({
      ok: true,
      items: parseWebDavDirectoryListing(msg.xml || '', name => /^vm(?:@\d+)?-/.test(name)),
    }))(), sendResponse);
    return true;
  }
  if (msg?.type === MSG_HTTP_REQUEST) {
    replyWith(requestHttp(msg.payload), sendResponse);
    return true;
  }
  if (msg?.type === MSG_HTTP_ABORT) {
    replyWith(Promise.resolve(abortHttp(msg.id)), sendResponse);
    return true;
  }
});

async function requestHttp(payload) {
  const {
    id,
    url,
    method = 'GET',
    headers = {},
    body,
    timeout = 0,
    responseType,
    anonymous,
  } = payload || {};
  if (!id || !url) throw new Error('Invalid offscreen request payload.');
  const controller = new AbortController();
  requests.set(id, controller);
  let timer;
  if (timeout > 0) {
    timer = setTimeout(() => controller.abort(), timeout);
  }
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      credentials: anonymous ? 'omit' : 'include',
    });
    const loadMethod = responseType === 'arraybuffer' ? 'arrayBuffer'
      : responseType === 'blob' ? 'blob'
        : 'text';
    return {
      ok: true,
      result: {
        status: res.status || 200,
        statusText: res.statusText,
        url: res.url,
        headers: stringifyHeaders(res.headers),
        contentType: res.headers.get('content-type') || '',
        data: await res[loadMethod](),
      },
    };
  } finally {
    requests.delete(id);
    clearTimeout(timer);
  }
}

function abortHttp(id) {
  const controller = requests.get(id);
  if (controller) {
    controller.abort();
    requests.delete(id);
  }
  return { ok: true };
}

function stringifyHeaders(headers) {
  let out = '';
  headers?.forEach((value, name) => {
    out += `${name}: ${value}\r\n`;
  });
  return out;
}

browser.runtime.onSuspend?.addListener(() => {
  requests.forEach(controller => controller.abort());
  requests.clear();
  return true;
});
