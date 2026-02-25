import { cp, mkdir, rm } from 'fs/promises';
import { resolve } from 'path';

const target = (process.argv[2] || process.env.TARGET_BROWSER || '').toLowerCase();
const manifestTarget = (process.env.TARGET_MANIFEST || 'mv2').toLowerCase();

if (!target) {
  throw new Error('TARGET_BROWSER (or CLI arg) is required for scripts/export-dist.mjs');
}

if (!['chrome', 'firefox', 'opera'].includes(target)) {
  throw new Error(`Unsupported target browser: ${target}`);
}
if (!['mv2', 'mv3'].includes(manifestTarget)) {
  throw new Error(`Unsupported TARGET_MANIFEST: ${manifestTarget}`);
}
if (manifestTarget === 'mv3' && !['chrome', 'opera'].includes(target)) {
  throw new Error(`TARGET_MANIFEST=mv3 requires TARGET_BROWSER=chrome|opera (got ${target})`);
}

const srcDir = resolve('dist');
const outRoot = resolve('dist-builds');
const outDir = resolve(outRoot, manifestTarget === 'mv3' ? `${target}-mv3` : target);

await mkdir(outRoot, { recursive: true });
await rm(outDir, { recursive: true, force: true });
await cp(srcDir, outDir, { recursive: true });

console.log(`Exported ${srcDir} -> ${outDir}`);
