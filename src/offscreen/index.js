import '@/common/browser';
import { parseWebDavDirectoryListing } from '@/common/webdav-xml';

const MSG_PARSE_WEBDAV = 'VMOffscreenParseWebDavDirectory';

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
  if (msg?.type !== MSG_PARSE_WEBDAV) return;
  replyWith((async () => ({
    ok: true,
    items: parseWebDavDirectoryListing(msg.xml || '', name => /^vm(?:@\d+)?-/.test(name)),
  }))(), sendResponse);
  return true;
});
