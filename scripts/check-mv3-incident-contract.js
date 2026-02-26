const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

const RUNBOOK_PATH = resolve('docs/security/incident-response-runbook.md');
const DRILL_PATH = resolve('docs/security/incident-response-drill.md');

function assertContains(text, pattern, message) {
  if (!pattern.test(text)) {
    throw new Error(message);
  }
}

function run() {
  if (!existsSync(RUNBOOK_PATH)) {
    throw new Error('incident-contract: incident response runbook is missing');
  }
  if (!existsSync(DRILL_PATH)) {
    throw new Error('incident-contract: incident response drill log is missing');
  }

  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  const drill = readFileSync(DRILL_PATH, 'utf8');

  assertContains(runbook, /##\s+3\.\s+Immediate Containment/i,
    'incident-contract: runbook missing Immediate Containment section');
  assertContains(runbook, /##\s+5\.\s+Patch Workflow/i,
    'incident-contract: runbook missing Patch Workflow section');
  assertContains(runbook, /##\s+6\.\s+Release and Rollout/i,
    'incident-contract: runbook missing Release and Rollout section');
  assertContains(runbook, /##\s+9\.\s+Evidence Checklist/i,
    'incident-contract: runbook missing Evidence Checklist section');

  assertContains(runbook, /yarn smoke:mv3:test/i,
    'incident-contract: runbook must require smoke:mv3:test validation');
  assertContains(runbook, /yarn build:all:mv3/i,
    'incident-contract: runbook must require build:all:mv3 validation');
  assertContains(runbook, /yarn verify:artifacts:mv3/i,
    'incident-contract: runbook must require verify:artifacts:mv3 validation');

  assertContains(drill, /Drill Date:\s+\d{4}-\d{2}-\d{2}/,
    'incident-contract: drill log must include Drill Date');
  assertContains(drill, /Scenario:/,
    'incident-contract: drill log must include scenario');
  assertContains(drill, /Result:\s+(pass|passed)/i,
    'incident-contract: drill log must include pass result');

  console.log('MV3 incident contract checks passed.');
}

run();
