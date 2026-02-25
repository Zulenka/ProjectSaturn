import { execSync } from 'child_process';
import { cp, mkdir, readFile, rm } from 'fs/promises';
import { resolve } from 'path';

const DIST_DIR = resolve('dist');
const UNPACKED_DIR = resolve('dist-builds/chrome-mv3');
const ASSETS_DIR = resolve('dist-assets');

function run(cmd, env = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  });
}

function getVersion(pkg) {
  return `${pkg.version.match(/\d+\.\d+/)[0]}.${pkg.beta || 0}`;
}

async function main() {
  // 1) Build MV3 runtime output and baseline export.
  run('npm run build:chrome-mv3');

  // 2) Apply beta manifest to dist before packaging.
  run('npx gulp manifest', {
    TARGET_BROWSER: 'chrome',
    TARGET_MANIFEST: 'mv3',
    BETA: '1',
  });

  // 3) Package zip artifact.
  const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const version = getVersion(pkg);
  const zipName = `Violentmonkey-beta-webext-beta-v${version}.zip`;
  const zipPath = resolve('dist-assets', zipName);
  await mkdir(ASSETS_DIR, { recursive: true });
  await rm(zipPath, { force: true });
  run(`cd dist && zip -rq "../dist-assets/${zipName}" .`);

  // 4) Refresh loose unpacked files in a fixed folder for browser reload.
  await rm(UNPACKED_DIR, { recursive: true, force: true });
  await cp(DIST_DIR, UNPACKED_DIR, { recursive: true });

  console.log(`\nUnpacked (load this in browser): ${UNPACKED_DIR}`);
  console.log(`Zip package: ${zipPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
