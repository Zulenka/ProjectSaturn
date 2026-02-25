const { readFileSync } = require('fs');
const { resolve } = require('path');

function assertContains(text, pattern, message) {
  if (!pattern.test(text)) {
    throw new Error(message);
  }
}

function assertNotContains(text, pattern, message) {
  if (pattern.test(text)) {
    throw new Error(message);
  }
}

function run() {
  const tabRedirector = readFileSync(resolve('src/background/utils/tab-redirector.js'), 'utf8');
  const preinject = readFileSync(resolve('src/background/utils/preinject.js'), 'utf8');
  const injectContent = readFileSync(resolve('src/injected/content/inject.js'), 'utf8');

  assertContains(
    tabRedirector,
    /return\s+CAN_BLOCK_INSTALL_INTERCEPT\s*&&\s*\{\s*redirectUrl:\s*'about:blank'\s*\}/,
    'tab-redirector: install interception must use about:blank handoff',
  );
  assertNotContains(
    tabRedirector,
    /redirectUrl:\s*'javascript:void 0'/,
    'tab-redirector: javascript: redirect fallback must not be used',
  );

  assertContains(
    injectContent,
    /src:\s*'about:blank'/,
    'inject: iframe bootstrap must use about:blank',
  );
  assertNotContains(
    injectContent,
    /src:\s*'javascript:void 0'/,
    'inject: javascript: iframe bootstrap must not be used',
  );
  assertContains(
    injectContent,
    /const\s+forceContentByMeta\s*=\s*!isXml\s*&&\s*hasStrictMetaCsp\(\);[\s\S]*?if\s*\(isXml\s*\|\|\s*data\[FORCE_CONTENT\]\s*\|\|\s*forceContentByMeta\)/,
    'inject: strict meta CSP must force content-realm before page handshake',
  );
  assertContains(
    injectContent,
    /nonce\s*=\s*data\.nonce\s*\|\|\s*getPageNonce\(\);/,
    'inject: page handshake must fallback to DOM nonce when header nonce is unavailable',
  );

  assertContains(
    preinject,
    /if\s*\(!bag\s*&&\s*IS_MV3\s*&&\s*!skippedTabs\[info\.tabId\]\)\s*\{[\s\S]*?bag\s*=\s*prepare\(key,\s*info\.url,\s*isTop\);[\s\S]*?\}/,
    'preinject: MV3 onHeadersReceived must prewarm cache on miss',
  );
  assertContains(
    preinject,
    /if\s*\(env\.nonce\)\s*\{\s*inject\.nonce\s*=\s*env\.nonce;\s*\}/,
    'preinject: prepareBag must carry nonce hint from prewarm env',
  );
  assertContains(
    preinject,
    /if\s*\(env\[FORCE_CONTENT\]\)\s*\{\s*bag\[FORCE_CONTENT\]\s*=\s*inject\[FORCE_CONTENT\]\s*=\s*true;\s*\}/,
    'preinject: prepareBag must carry forceContent hint from prewarm env',
  );
  assertContains(
    preinject,
    /const\s+hasInjectData\s*=\s*!!bag\[INJECT\]\?\.\[SCRIPTS\];/,
    'preinject: strict-CSP detection must guard placeholder bags',
  );

  console.log('MV3 CSP contract checks passed.');
}

run();
