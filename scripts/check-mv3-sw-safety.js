const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const ROOT = resolve('src/background');
const ALLOWLIST = new Set([
  // Explicitly isolated DOM-dependent utilities.
  'utils/icon.js',
  'utils/clipboard.js',
]);
const PATTERNS = [
  { name: 'document', re: /\bdocument\b/g },
  { name: 'window', re: /\bwindow\b/g },
  { name: 'Image', re: /\bImage\b/g },
  { name: 'navigator.clipboard', re: /\bnavigator\s*\.\s*clipboard\b/g },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (/\.(js|vue)$/.test(name)) out.push(abs);
  }
}

function sanitizeLine(rawLine, state) {
  let line = rawLine;
  while (line.length) {
    if (state.inBlockComment) {
      const end = line.indexOf('*/');
      if (end < 0) return '';
      line = line.slice(end + 2);
      state.inBlockComment = false;
      continue;
    }
    const blockStart = line.indexOf('/*');
    const lineComment = line.indexOf('//');
    if (blockStart >= 0 && (lineComment < 0 || blockStart < lineComment)) {
      const end = line.indexOf('*/', blockStart + 2);
      if (end < 0) {
        line = line.slice(0, blockStart);
        state.inBlockComment = true;
        break;
      }
      line = line.slice(0, blockStart) + line.slice(end + 2);
      continue;
    }
    if (lineComment >= 0) line = line.slice(0, lineComment);
    break;
  }
  return line.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '');
}

function run() {
  const files = [];
  walk(ROOT, files);
  const violations = [];
  for (const abs of files) {
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    if (ALLOWLIST.has(rel)) continue;
    const state = { inBlockComment: false };
    const lines = readFileSync(abs, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const clean = sanitizeLine(line, state);
      if (!clean.trim()) return;
      for (const { name, re } of PATTERNS) {
        re.lastIndex = 0;
        if (re.test(clean)) {
          violations.push(`${name}: src/background/${rel}:${idx + 1}`);
        }
      }
    });
  }
  if (violations.length) {
    throw new Error(`MV3 service-worker safety violations:\n- ${violations.join('\n- ')}`);
  }
  console.log('MV3 service-worker safety checks passed.');
}

run();
