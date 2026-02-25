const { readFileSync } = require('fs');
const { resolve } = require('path');

function assertContains(text, pattern, message) {
  if (!pattern.test(text)) {
    throw new Error(message);
  }
}

function run() {
  const installFlow = readFileSync(resolve('src/background/utils/tab-redirector.js'), 'utf8');
  const syncFlow = readFileSync(resolve('src/background/sync/base.js'), 'utf8');
  assertContains(
    installFlow,
    /const\s+CAN_BLOCK_INSTALL_INTERCEPT\s*=\s*IS_FIREFOX\s*\|\|\s*!IS_MV3\s*;/,
    'tab-redirector: missing MV3 install fallback gate',
  );
  assertContains(
    installFlow,
    /tabsOnUpdated\.addListener\s*\(\s*onTabUpdated/,
    'tab-redirector: missing onUpdated fallback for MV3 .user.js installs',
  );
  assertContains(
    syncFlow,
    /const\s+CAN_BLOCK_AUTH_REDIRECT\s*=\s*!IS_MV3\s*;/,
    'sync/base: missing MV3 auth callback fallback gate',
  );
  assertContains(
    syncFlow,
    /browser\.tabs\.onUpdated\.addListener\s*\(\s*handler/,
    'sync/base: missing tabs.onUpdated fallback for MV3 OAuth callback detection',
  );
  console.log('MV3 runtime contract checks passed.');
}

run();
