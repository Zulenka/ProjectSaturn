import { readFile } from 'fs/promises';
import { resolve } from 'path';

const mode = (process.argv[2] || 'mv3').toLowerCase();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readManifest(dir) {
  const file = resolve('dist-builds', dir, 'manifest.json');
  const raw = await readFile(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${file}: ${e.message}`);
  }
}

function checkMv3Manifest(manifest, dir) {
  assert(manifest.manifest_version === 3, `${dir}: expected manifest_version=3`);
  assert(manifest.action, `${dir}: expected action in MV3 manifest`);
  assert(!manifest.browser_action, `${dir}: browser_action must be absent in MV3 manifest`);
  assert(manifest.background?.service_worker, `${dir}: expected background.service_worker in MV3 manifest`);
  assert(!manifest.background?.scripts, `${dir}: background.scripts must be absent in MV3 manifest`);
  assert(manifest.permissions?.includes('scripting'), `${dir}: expected scripting permission in MV3 manifest`);
  assert(!manifest.permissions?.includes('webRequestBlocking'), `${dir}: webRequestBlocking must be absent in MV3 manifest`);
}

function checkMv2Manifest(manifest, dir) {
  assert(manifest.manifest_version === 2, `${dir}: expected manifest_version=2`);
  assert(manifest.browser_action, `${dir}: expected browser_action in MV2 manifest`);
}

async function verifyMv3() {
  for (const dir of ['chrome-mv3', 'opera-mv3']) {
    checkMv3Manifest(await readManifest(dir), dir);
  }
}

async function verifyDual() {
  await verifyMv3();
  for (const dir of ['chrome', 'firefox', 'opera']) {
    checkMv2Manifest(await readManifest(dir), dir);
  }
}

if (!['mv3', 'dual'].includes(mode)) {
  throw new Error(`Unsupported mode "${mode}". Use "mv3" or "dual".`);
}

await (mode === 'dual' ? verifyDual() : verifyMv3());
console.log(`Artifact verification passed (${mode}).`);
