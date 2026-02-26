# Extension Security Incident Response Runbook

## 1. Trigger Conditions

Start this runbook when any of the following occurs:

- Confirmed malicious behavior or account compromise.
- Repeated critical runtime failures affecting security boundaries.
- CWS warning/takedown/policy violation notice tied to security risk.
- Sensitive data exposure or suspected credential/token leak.

## 2. Severity Levels

- `SEV-1`: Active abuse, malicious update risk, or exposed credentials in production.
- `SEV-2`: High-risk vulnerability with known exploit path, no active abuse confirmed.
- `SEV-3`: Hardening issue or policy gap without immediate exploit.

## 3. Immediate Containment (First 30 Minutes)

1. Freeze release pipeline:
- Pause publish steps in `.github/workflows/release.yml`.
- Block non-hotfix merges.

2. Protect accounts/secrets:
- Rotate CWS/API credentials (`CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`).
- Rotate sync provider secrets/tokens as applicable.
- Verify maintainer MFA/security keys are enabled.

3. Enable diagnostic capture:
- Export local diagnostics log from extension diagnostics flow.
- Preserve failing HARs and error console traces.

4. Scope impact:
- Identify affected versions/tags.
- Identify impacted feature paths and permissions involved.

## 4. Triage and Root Cause

Use this checklist:

- [ ] Reproduce in clean profile with only extension enabled.
- [ ] Confirm whether issue is extension-side vs site/network/policy side.
- [ ] Locate entry point (message handler, injection path, network path, sync path).
- [ ] Confirm whether exploit requires user interaction.
- [ ] Document blast radius (who/what data/features are affected).

## 5. Patch Workflow

1. Create hotfix branch:
- Branch name: `hotfix/security-<yyyymmdd>-<short-topic>`.

2. Implement minimal fix:
- Prefer smallest safe change that closes exploit path.
- Avoid opportunistic refactors.

3. Add regression tests:
- Unit tests for exploit path.
- If feasible, smoke scenario added to `smoke:mv3:test` coverage.

4. Validate:

```bash
yarn smoke:mv3:test
yarn build:all:mv3
yarn verify:artifacts:mv3
```

## 6. Release and Rollout

1. Build patched artifacts.
2. Publish as expedited beta/stable based on severity.
3. Monitor diagnostics and user reports post-release.
4. If needed, publish follow-up patch with additional hardening.

## 7. Communications

- Internal incident note must include:
  - Timeline (UTC)
  - Root cause
  - Impacted versions
  - Mitigation and release tag
  - Remaining risks

- External comms:
  - If user-impacting, publish concise changelog/security note.
  - Respond to CWS review/policy contacts with patch evidence.

## 8. Post-Incident Actions

- [ ] Add permanent guardrails (CI check, contract test, docs update).
- [ ] Update PTM/data inventory/release evidence template if scope changed.
- [ ] Record lessons learned and owner for each follow-up task.

## 9. Evidence Checklist

- Incident ticket/link:
- Reproduction evidence:
- Diagnostic export file:
- HAR/capture files:
- Fix commit:
- Test command output:
- Release tag:
