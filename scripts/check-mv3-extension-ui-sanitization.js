const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const ROOTS = [
  resolve('src/options'),
  resolve('src/popup'),
  resolve('src/confirm'),
  resolve('src/common/ui'),
];
const FILE_RE = /\.(?:js|vue|html)$/;
const FORBIDDEN_PATTERNS = [
  { name: 'innerHTML assignment', re: /\binnerHTML\s*=/g },
  { name: 'outerHTML assignment', re: /\bouterHTML\s*=/g },
  { name: 'insertAdjacentHTML', re: /\binsertAdjacentHTML\s*\(/g },
  { name: 'document.write', re: /\bdocument\s*\.\s*write\s*\(/g },
];
const SAFE_V_HTML_RE = /^i18n\(\s*['"][^'"]+['"]\s*\)$/;

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

function scanForbiddenPatterns(relPath, source, violations) {
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(source))) {
      violations.push(`${name}: ${relPath}:${getLine(source, match.index)}`);
    }
  }
}

function scanVueHtmlBindings(relPath, source, violations) {
  if (!relPath.endsWith('.vue')) return;
  const re = /v-html\s*=\s*(['"])([\s\S]*?)\1/g;
  let match;
  while ((match = re.exec(source))) {
    const expr = match[2].trim();
    if (!SAFE_V_HTML_RE.test(expr)) {
      violations.push(`unsafe v-html binding "${expr}": ${relPath}:${getLine(source, match.index)}`);
    }
  }
}

function run() {
  const files = [];
  ROOTS.forEach(root => walk(root, files));
  const violations = [];
  for (const abs of files) {
    const relPath = relative(resolve('.'), abs).replace(/\\/g, '/');
    const source = readFileSync(abs, 'utf8');
    scanForbiddenPatterns(relPath, source, violations);
    scanVueHtmlBindings(relPath, source, violations);
  }
  if (violations.length) {
    throw new Error(`MV3 extension UI sanitization violations:\n- ${violations.join('\n- ')}`);
  }
  console.log('MV3 extension UI sanitization checks passed.');
}

run();
