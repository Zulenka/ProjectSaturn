const { readFileSync } = require('fs');
const { resolve } = require('path');

function assertHas(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

function validateProvider(file, label) {
  const source = readFileSync(resolve(file), 'utf8');
  assertHas(
    source,
    /async\s+authorize\s*\(\)\s*\{[\s\S]*?openAuthPage\s*\(\s*url\s*,\s*config\.redirect_uri\s*\)/,
    `${label}: authorize() must call openAuthPage(url, config.redirect_uri)`,
  );
  assertHas(
    source,
    /matchAuth\s*\(\s*url\s*\)\s*\{[\s\S]*?this\.session\s*=\s*null[\s\S]*?query\.state\s*!==\s*state\s*\|\|\s*!query\.code/,
    `${label}: matchAuth() must clear session and validate state+code`,
  );
  assertHas(
    source,
    /return\s*\{\s*[\s\S]*code\s*:\s*query\.code[\s\S]*code_verifier\s*:\s*codeVerifier[\s\S]*\}/,
    `${label}: matchAuth() must return code and code_verifier payload`,
  );
}

function run() {
  validateProvider('src/background/sync/dropbox.js', 'dropbox');
  validateProvider('src/background/sync/googledrive.js', 'googledrive');
  validateProvider('src/background/sync/onedrive.js', 'onedrive');
  console.log('MV3 sync provider contract checks passed.');
}

run();
