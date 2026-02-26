const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const ROOTS = [
  resolve('src/background'),
  resolve('src/common'),
];
const FILE_RE = /\.(?:js|vue)$/;
const HTTP_URL_RE = /http:\/\/[^\s'"`)]*/g;
const LOCAL_HTTP_RE = /^http:\/\/(?:(?:localhost|127(?:\.\d{1,3}){3}|\[::1\]|(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}|[^/]+\.local)(?::\d+)?(?:\/|$))/i;
const ALLOWLIST = new Set([
  // XML namespace constants (not network traffic)
  'http://www.w3.org/1999/xhtml',
]);

function walk(dir, out) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
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
  ROOTS.forEach(root => walk(root, files));
  const violations = [];
  for (const abs of files) {
    const relPath = relative(resolve('.'), abs).replace(/\\/g, '/');
    const source = readFileSync(abs, 'utf8');
    HTTP_URL_RE.lastIndex = 0;
    let match;
    while ((match = HTTP_URL_RE.exec(source))) {
      const value = match[0];
      if (ALLOWLIST.has(value) || LOCAL_HTTP_RE.test(value)) {
        continue;
      }
      violations.push(`${relPath}:${getLine(source, match.index)} -> ${value}`);
    }
  }
  if (violations.length) {
    throw new Error(
      'MV3 HTTPS-origin policy violations (remote http:// URLs are not allowed):\n'
      + `- ${violations.join('\n- ')}`,
    );
  }
  console.log('MV3 HTTPS-origin checks passed.');
}

run();
