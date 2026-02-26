const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const ROOT = resolve('src');
const FILE_RE = /\.(?:js|vue|html)$/;
const RULES = [
  {
    name: 'dynamic import from remote URL',
    re: /\bimport\s*\(\s*['"]https?:\/\//g,
  },
  {
    name: 'importScripts from remote URL',
    re: /\bimportScripts\s*\(\s*['"]https?:\/\//g,
  },
  {
    name: 'remote script tag source',
    re: /<script[^>]+src\s*=\s*['"]https?:\/\//gi,
  },
  {
    name: 'remote worker script URL',
    re: /\b(?:new\s+Worker|new\s+SharedWorker)\s*\(\s*['"]https?:\/\//g,
  },
  {
    name: 'remote wasm streaming fetch',
    re: /\bWebAssembly\s*\.\s*instantiate(?:Streaming)?\s*\(\s*(?:await\s+)?fetch\s*\(\s*['"]https?:\/\//g,
  },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (FILE_RE.test(name)) out.push(abs);
  }
}

function getLine(source, index) {
  return source.slice(0, index).split('\n').length;
}

function run() {
  const files = [];
  walk(ROOT, files);
  const violations = [];
  for (const abs of files) {
    const relPath = relative(resolve('.'), abs).replace(/\\/g, '/');
    const source = readFileSync(abs, 'utf8');
    for (const { name, re } of RULES) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(source))) {
        violations.push(`${name}: ${relPath}:${getLine(source, match.index)}`);
      }
    }
  }
  if (violations.length) {
    throw new Error(`MV3 remote executable-code path violations:\n- ${violations.join('\n- ')}`);
  }
  console.log('MV3 remote executable-code path checks passed.');
}

run();
