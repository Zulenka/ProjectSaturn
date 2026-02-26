const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative, resolve } = require('path');

const ROOT = resolve('src');
const RULES = [
  {
    name: 'eval',
    pattern: /\beval\s*\(/g,
    allow: [
      {
        file: 'background/utils/tabs.js',
        linePattern: /return\s+eval\(source\);/,
      },
    ],
  },
  {
    name: 'new Function',
    pattern: /new\s+Function\s*\(/g,
    allow: [],
  },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (/\.(js|vue)$/.test(name)) out.push(abs);
  }
}

function getLineInfo(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const lineEnd = text.indexOf('\n', index);
  return {
    line,
    text: text.slice(lineStart, lineEnd >= 0 ? lineEnd : undefined),
  };
}

function isAllowed(rule, relPath, lineText) {
  return rule.allow.some(item => item.file === relPath && item.linePattern.test(lineText));
}

function run() {
  const files = [];
  walk(ROOT, files);
  const violations = [];
  for (const abs of files) {
    const relPath = relative(ROOT, abs).replace(/\\/g, '/');
    const source = readFileSync(abs, 'utf8');
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(source))) {
        const lineInfo = getLineInfo(source, match.index);
        if (isAllowed(rule, relPath, lineInfo.text)) {
          continue;
        }
        violations.push(`${rule.name}: src/${relPath}:${lineInfo.line}`);
      }
    }
  }
  if (violations.length) {
    throw new Error(`MV3 dynamic-code guard violations:\n- ${violations.join('\n- ')}`);
  }
  console.log('MV3 dynamic-code guard checks passed.');
}

run();
