const { readFileSync } = require('fs');
const { resolve } = require('path');

function assertContains(text, pattern, message) {
  if (!pattern.test(text)) {
    throw new Error(message);
  }
}

function run() {
  const privacyPolicy = readFileSync(resolve('PRIVACY_POLICY.md'), 'utf8');
  const dataInventory = readFileSync(resolve('docs/security/data-inventory.md'), 'utf8');

  const requiredPolicySections = [
    /##\s+Information Processed/i,
    /##\s+When Data Leaves Your Device/i,
    /##\s+Optional Cloud Sync/i,
    /##\s+Permissions and Why They Exist/i,
    /##\s+Your Controls/i,
  ];
  requiredPolicySections.forEach((sectionRe, idx) => {
    assertContains(
      privacyPolicy,
      sectionRe,
      `privacy-contract: missing required section #${idx + 1} in PRIVACY_POLICY.md`,
    );
  });

  const requiredPolicyTerms = [
    /userscript/i,
    /diagnostics/i,
    /sync/i,
    /https|tls|modern cryptography/i,
    /does not sell personal information/i,
  ];
  requiredPolicyTerms.forEach((termRe, idx) => {
    assertContains(
      privacyPolicy,
      termRe,
      `privacy-contract: missing required disclosure term #${idx + 1} in PRIVACY_POLICY.md`,
    );
  });

  assertContains(
    dataInventory,
    /##\s+Disclosure Mapping/i,
    'privacy-contract: docs/security/data-inventory.md is missing Disclosure Mapping section',
  );
  assertContains(
    dataInventory,
    /Diagnostics|diagnostics/i,
    'privacy-contract: diagnostics data class must be tracked in data inventory',
  );
  assertContains(
    dataInventory,
    /Sync|sync/i,
    'privacy-contract: sync data class must be tracked in data inventory',
  );

  console.log('MV3 privacy contract checks passed.');
}

run();
