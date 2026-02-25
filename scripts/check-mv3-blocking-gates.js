const { readFileSync } = require('fs');
const { resolve } = require('path');

function assertHas(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

function run() {
  const requestsCore = readFileSync(resolve('src/background/utils/requests-core.js'), 'utf8');
  const tabRedirector = readFileSync(resolve('src/background/utils/tab-redirector.js'), 'utf8');
  const syncBase = readFileSync(resolve('src/background/sync/base.js'), 'utf8');
  const preinject = readFileSync(resolve('src/background/utils/preinject.js'), 'utf8');

  assertHas(
    requestsCore,
    /const\s+CAN_BLOCK_WEBREQUEST\s*=\s*!IS_MV3\s*;/,
    'requests-core: missing CAN_BLOCK_WEBREQUEST gate',
  );
  assertHas(
    requestsCore,
    /\.\.\.\(CAN_BLOCK_WEBREQUEST\s*\?\s*\['blocking'\]\s*:\s*\[\]\)/,
    'requests-core: blocking webRequest options must remain MV3-gated',
  );

  assertHas(
    tabRedirector,
    /const\s+CAN_BLOCK_INSTALL_INTERCEPT\s*=\s*IS_FIREFOX\s*\|\|\s*!IS_MV3\s*;/,
    'tab-redirector: missing CAN_BLOCK_INSTALL_INTERCEPT gate',
  );
  assertHas(
    tabRedirector,
    /if\s*\(\s*CAN_BLOCK_INSTALL_INTERCEPT\s*\)\s*\{[\s\S]*?onBeforeRequest\.addListener[\s\S]*?\['blocking'\]/,
    'tab-redirector: blocking install interception must remain behind CAN_BLOCK_INSTALL_INTERCEPT',
  );

  assertHas(
    syncBase,
    /const\s+CAN_BLOCK_AUTH_REDIRECT\s*=\s*!IS_MV3\s*;/,
    'sync/base: missing CAN_BLOCK_AUTH_REDIRECT gate',
  );
  assertHas(
    syncBase,
    /if\s*\(\s*CAN_BLOCK_AUTH_REDIRECT\s*\)\s*\{[\s\S]*?onBeforeRequest\.addListener[\s\S]*?\['blocking'\]/,
    'sync/base: blocking OAuth callback interception must remain behind CAN_BLOCK_AUTH_REDIRECT',
  );

  assertHas(
    preinject,
    /const\s+CAN_BLOCK_WEBREQUEST\s*=\s*!IS_MV3\s*;/,
    'preinject: missing CAN_BLOCK_WEBREQUEST gate',
  );
  assertHas(
    preinject,
    /CAN_BLOCK_WEBREQUEST\s*&&\s*'blocking'/,
    'preinject: blocking option in webRequest extras must remain MV3-gated',
  );
  assertHas(
    preinject,
    /if\s*\(\s*enable\s*&&\s*!CAN_BLOCK_WEBREQUEST\s*\)\s*\{/,
    'preinject: xhrInject must be disabled in MV3 runtimes without blocking webRequest',
  );

  console.log('MV3 blocking-gate checks passed.');
}

run();
