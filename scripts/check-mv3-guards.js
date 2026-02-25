const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const SRC_ROOT = resolve('src');
const RULES = [
  {
    name: 'getBackgroundPage',
    pattern: /\bgetBackgroundPage\s*\(/g,
    allow: new Set([
      'common/index.js',
    ]),
  },
  {
    name: 'tabs.executeScript',
    pattern: /\btabs\.executeScript\s*\(/g,
    allow: new Set([
      'background/utils/tabs.js',
    ]),
  },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    const st = statSync(file);
    if (st.isDirectory()) walk(file, out);
    else if (/\.(js|vue)$/.test(name)) out.push(file);
  }
}

function run() {
  const files = [];
  walk(SRC_ROOT, files);
  const violations = [];
  for (const absPath of files) {
    const relPath = relative(SRC_ROOT, absPath).replace(/\\/g, '/');
    const source = readFileSync(absPath, 'utf8');
    for (const rule of RULES) {
      if (rule.allow.has(relPath)) continue;
      if (rule.pattern.test(source)) {
        violations.push(`${rule.name}: src/${relPath}`);
      }
      rule.pattern.lastIndex = 0;
    }
  }
  if (violations.length) {
    throw new Error(`MV3 guard violations:\n- ${violations.join('\n- ')}`);
  }
  console.log('MV3 guard checks passed.');
}

run();
