const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const yaml = require('js-yaml');

const MANIFEST_PATH = resolve('src/manifest.yml');
const JUSTIFICATION_PATH = resolve('docs/security/host-scope-justification.md');
const EXPECTED_SCOPE = ['http://*/*', 'https://*/*', 'file:///*'];

function hasAllUrlsScope(manifest) {
  const contentScripts = manifest.content_scripts || [];
  const contentHasAll = contentScripts.some(script => (
    Array.isArray(script.matches) && script.matches.includes('<all_urls>')
  ));
  const permissions = manifest.permissions || [];
  const permissionsHasAll = permissions.includes('<all_urls>');
  return contentHasAll || permissionsHasAll;
}

function run() {
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = yaml.load(raw) || {};
  if (hasAllUrlsScope(manifest)) {
    throw new Error('MV3 host scope check failed: <all_urls> is forbidden. Use explicit host patterns.');
  }
  const contentMatches = new Set(
    (manifest.content_scripts || [])
      .flatMap(script => script.matches || []),
  );
  const hostPermissions = new Set(
    (manifest.permissions || []).filter(perm => /^\w+:\/\//.test(perm)),
  );
  for (const scope of EXPECTED_SCOPE) {
    if (!contentMatches.has(scope)) {
      throw new Error(`MV3 host scope check failed: missing content_scripts scope ${scope}.`);
    }
    if (!hostPermissions.has(scope)) {
      throw new Error(`MV3 host scope check failed: missing permission scope ${scope}.`);
    }
  }
  if (!existsSync(JUSTIFICATION_PATH)) {
    throw new Error('MV3 host scope check failed: docs/security/host-scope-justification.md is missing.');
  }
  const text = readFileSync(JUSTIFICATION_PATH, 'utf8');
  if (!/Current Necessity/i.test(text) || !/Reduction Plan/i.test(text) || !/No `<all_urls>`/i.test(text)) {
    throw new Error('MV3 host scope check failed: host scope justification is missing required sections.');
  }
  console.log('MV3 host scope check passed with explicit scoped hosts and justification.');
}

run();
