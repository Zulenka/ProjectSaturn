import { cp, mkdir, rm } from 'fs/promises';
import { resolve } from 'path';

const target = (process.argv[2] || process.env.TARGET_BROWSER || '').toLowerCase();

if (!target) {
  throw new Error('TARGET_BROWSER (or CLI arg) is required for scripts/export-dist.mjs');
}

if (!['chrome', 'firefox', 'opera'].includes(target)) {
  throw new Error(`Unsupported target browser: ${target}`);
}

const srcDir = resolve('dist');
const outRoot = resolve('dist-builds');
const outDir = resolve(outRoot, target);

await mkdir(outRoot, { recursive: true });
await rm(outDir, { recursive: true, force: true });
await cp(srcDir, outDir, { recursive: true });

console.log(`Exported ${srcDir} -> ${outDir}`);
