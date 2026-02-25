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
  const preinjectFlow = readFileSync(resolve('src/background/utils/preinject.js'), 'utf8');
  const tabsFlow = readFileSync(resolve('src/background/utils/tabs.js'), 'utf8');
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
  assertContains(
    preinjectFlow,
    /preferRegister:\s*IS_MV3\s*&&\s*frameId\s*<=\s*0/,
    'preinject: MV3 top-frame content injection must prefer register path',
  );
  assertContains(
    preinjectFlow,
    /allowLegacyCodeFallback:\s*!IS_MV3/,
    'preinject: MV3 content injection must keep legacy execute fallback disabled',
  );
  assertContains(
    tabsFlow,
    /const\s+allowLegacyCodeFallback\s*=\s*options\.allowLegacyCodeFallback\s*!=\s*null[\s\S]*?extensionManifest\.manifest_version\s*!==\s*3/,
    'tabs: missing MV3 default legacy fallback gate',
  );
  assertContains(
    tabsFlow,
    /if\s*\(\s*!allowLegacyCodeFallback\s*\)\s*return\s*\[\]/,
    'tabs: missing legacy fallback short-circuit',
  );
  console.log('MV3 runtime contract checks passed.');
}

run();
