const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const ROOT = resolve('src');
const FILE_RE = /\.(?:js|vue)$/;
const RULES = [
  {
    name: 'OAuth access_token usage',
    re: /\baccess_token\b/g,
    allow: relPath => relPath.startsWith('background/sync/'),
  },
  {
    name: 'OAuth refresh_token usage',
    re: /\brefresh_token\b/g,
    allow: relPath => relPath.startsWith('background/sync/'),
  },
  {
    name: 'Bearer token header usage',
    re: /\bBearer\b/g,
    allow: relPath => relPath.startsWith('background/sync/'),
  },
  {
    name: 'Authorization header construction',
    re: /\bAuthorization\b/g,
    allow: relPath => relPath.startsWith('background/sync/')
      || relPath === 'common/util.js',
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
    const relPath = relative(ROOT, abs).replace(/\\/g, '/');
    const source = readFileSync(abs, 'utf8');
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(source))) {
        if (rule.allow(relPath)) continue;
        violations.push(`${rule.name}: src/${relPath}:${getLine(source, match.index)}`);
      }
    }
  }
  if (violations.length) {
    throw new Error(`MV3 secret boundary violations:\n- ${violations.join('\n- ')}`);
  }
  console.log('MV3 secret boundary checks passed.');
}

run();
