const { readFileSync } = require('fs');
const { resolve } = require('path');

function assertContains(text, pattern, message) {
  if (!pattern.test(text)) {
    throw new Error(message);
  }
}

function readWorkflow(name) {
  return readFileSync(resolve('.github', 'workflows', name), 'utf8');
}

function run() {
  const release = readWorkflow('release.yml');
  const edge = readWorkflow('release-edge.yml');
  assertContains(
    release,
    /TARGET_BROWSER=chrome\s+TARGET_MANIFEST=mv3\s+npx\s+gulp\s+manifest/,
    'release.yml: Chrome release build must use TARGET_MANIFEST=mv3',
  );
  assertContains(
    release,
    /TARGET_BROWSER=opera\s+TARGET_MANIFEST=mv3\s+npx\s+gulp\s+manifest/,
    'release.yml: Opera release build must use TARGET_MANIFEST=mv3',
  );
  assertContains(
    release,
    /TARGET_BROWSER=chrome\s+TARGET_MANIFEST=mv3\s+BETA=1\s+npx\s+gulp\s+manifest/,
    'release.yml: CWS beta build must use TARGET_MANIFEST=mv3',
  );
  assertContains(
    edge,
    /TARGET_BROWSER=chrome\s+TARGET_MANIFEST=mv3\s+yarn\s+build/,
    'release-edge.yml: Edge build must use TARGET_MANIFEST=mv3',
  );
  console.log('MV3 release contract checks passed.');
}

run();
