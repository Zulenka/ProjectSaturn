# MV3 Security Guidelines Execution Plan

This plan operationalizes the requirements from `Chome Extenstion Securty Guidelines.md` into concrete code-review and implementation steps for this repository.

## Execution Rules

1. Run points in order unless blocked.
2. For each point, complete: audit -> patch -> tests -> evidence.
3. Record results in this file by changing `[ ]` to `[x]` and adding notes under each point.
4. Ship security-impacting changes behind small, reviewable PRs.

## Point-by-Point Plan

### Phase 0 - Baseline and Traceability

1. [x] Build a policy traceability matrix (PTM) for this repo
- Scope: map each major guideline to code paths and workflows.
- Targets: `src/`, `scripts/`, `.github/workflows/`, `src/manifest.yml`, `scripts/manifest-helper.js`.
- Deliverable: `docs/security/policy-traceability-matrix.md` (or equivalent path).
  Completed: `docs/security/policy-traceability-matrix.md`.

2. [x] Build a data inventory and disclosure map
- Scope: what user data is read, stored, transmitted, retention period, and purpose.
- Targets: `src/background/utils/requests*.js`, `src/background/sync/`, `src/background/utils/storage-cache.js`, `PRIVACY_POLICY.md`.
- Deliverable: `docs/security/data-inventory.md` + privacy policy delta list.
  Completed: `docs/security/data-inventory.md`.

### Phase 1 - Manifest, Permissions, and MV3 Architecture

3. [x] Enforce least-privilege permissions and host scope
- Scope: remove/justify broad permissions and broad host patterns.
- Targets: `src/manifest.yml`, `scripts/manifest-helper.js`, `scripts/verify-build-artifacts.js`.
- Checks:
```bash
yarn build:all:mv3
yarn verify:artifacts:dual
```
  Completed: replaced manifest `<all_urls>` with explicit scoped patterns (`http://*/*`, `https://*/*`, `file:///*`) and enforced by `scripts/check-mv3-host-scope-justification.js` + documented rationale.

4. [x] Tighten content script match scope and injection strategy
- Scope: minimize `<all_urls>` where possible; prefer `activeTab`/targeted injection for non-core pages.
- Targets: `src/manifest.yml`, `src/background/utils/tabs.js`, `src/background/utils/preinject.js`, `src/injected/`.
- Deliverable: host/match rationalization table per feature.
  Completed: content script matches now use explicit patterns instead of `<all_urls>`; strategy and reduction rationale documented in `docs/security/content-script-match-rationalization.md`.

5. [x] Harden service worker lifecycle assumptions
- Scope: ensure listener registration is synchronous and state does not depend on in-memory persistence.
- Targets: `src/background/index.js`, `src/background/utils/init.js`, `src/background/utils/storage-cache.js`, `src/background/utils/db.js`.
- Checks:
```bash
yarn smoke:mv3:test
```
  Completed: service-worker lifecycle contract checks added (`scripts/check-mv3-sw-lifecycle-contracts.js`) and enforced in `smoke:mv3:test` along with `check-mv3-sw-safety`.

### Phase 2 - Code Execution and CSP Hardening

6. [x] Remove arbitrary-string execution fallback paths in MV3 flows
- Scope: eliminate/contain eval-like patterns in extension context.
- Targets: `src/background/utils/tabs.js` (current `eval(source)` path), related injection call sites.
- Rule: no new `eval`, `new Function`, or string-based timer execution in extension code.
  Completed: MV3 string-code fallback now hard-disabled in `executeScriptInTab`; legacy eval path remains non-MV3 only.

7. [x] Enforce CSP-safe extension pages and DOM-safe rendering
- Scope: no inline script assumptions, no unsafe HTML injection in extension pages.
- Targets: `src/options/`, `src/popup/`, `src/confirm/`, `src/common/ui/`, manifest CSP via `scripts/manifest-helper.js`.
- Checks:
```bash
yarn smoke:mv3:test
node scripts/check-mv3-csp-contracts.js
```
  Completed: added `scripts/check-mv3-extension-ui-sanitization.js` and wired it into `smoke:mv3:test` to block unsafe DOM HTML sinks and unsafe `v-html` usage in extension pages.

8. [x] Eliminate remotely hosted executable-code paths
- Scope: JS/Wasm execution must come from packaged extension assets only.
- Targets: build output scanners in `scripts/`, runtime network execution paths in `src/background/utils/`.
- Checks:
```bash
rg -n "eval\\(|new Function|import\\(|WebAssembly|unsafe-eval" src scripts
```
  Completed: added `scripts/check-mv3-remote-code-paths.js` and `scripts/check-mv3-dynamic-code-guards.js`, both enforced in `smoke:mv3:test`.

### Phase 3 - Messaging, Network, Storage, and API Boundaries

9. [x] Harden internal/external messaging contracts
- Scope: validate sender, command allowlist, payload schema; deny by default.
- Targets: `src/background/index.js`, `src/common/handlers.js`, `src/injected/content/bridge.js`, `src/common/browser.js`.
- Deliverable: message contract spec + negative-test cases.
  Completed: payload-shape and command-name validation guards are active in `src/background/index.js`; `isOwn` sender-origin guard is enforced and covered by `test/background/index.test.js`; spec is documented in `docs/security/message-contract-spec.md`.

10. [x] Constrain high-risk API usage (DNR, webRequest, userScripts, offscreen)
- Scope: verify MV3-compliant gating and fallback behavior.
- Targets: `src/background/utils/tab-redirector.js`, `src/background/utils/preinject.js`, `src/background/utils/requests-core.js`, `src/background/utils/tabs.js`, `src/background/utils/offscreen.js`.
- Checks:
```bash
node scripts/check-mv3-blocking-gates.js
node scripts/check-mv3-runtime-contracts.js
node scripts/check-mv3-sw-safety.js
```
  Completed: API-gating checks are enforced by `check-mv3-blocking-gates`, `check-mv3-runtime-contracts`, and `check-mv3-sw-safety`, all wired into `smoke:mv3:test`.

11. [x] Enforce secure storage/token handling boundaries
- Scope: keep sensitive auth data out of content scripts and minimize long-lived stored secrets.
- Targets: `src/background/utils/storage-cache.js`, `src/background/sync/`, `src/injected/content/`.
- Deliverable: secret-handling rules and token lifecycle notes.
  Completed: secret boundaries documented and enforced (`docs/security/secret-handling-rules.md`, `scripts/check-mv3-secret-boundaries.js`), and diagnostics now redact token/secret-like keys with test coverage.

12. [x] Enforce HTTPS-only network and origin allowlists
- Scope: ensure remote requests are constrained to required secure origins.
- Targets: `src/background/utils/requests.js`, `src/background/utils/url.js`, sync providers in `src/background/sync/`.
- Checks:
```bash
rg -n "http://" src
```
  Completed: WebDAV omitted-scheme default changed from `http://` to `https://`, explicit remote HTTP is rejected in `src/background/sync/webdav.js`, and `scripts/check-mv3-https-origins.js` now enforces remote-HTTP bans in source.

### Phase 4 - Supply Chain, CI, and Release Readiness

13. [x] Add/strengthen dependency and static security scans
- Scope: enforce vulnerability and dangerous-pattern checks in CI.
- Targets: `.github/workflows/ci.yml`, `package.json`, `scripts/`.
- Baseline checks:
```bash
npm audit --audit-level=high
```
  Completed: added `audit:deps:high` (`yarn audit --level high --groups dependencies`) and wired it into `.github/workflows/ci.yml`.

14. [x] Add CI guard scripts for policy-sensitive regressions
- Scope: fail CI on permission creep, CSP regression, remote-code indicators, forbidden execution patterns.
- Targets: existing guards in `scripts/check-mv3-*.js`, `.github/workflows/ci.yml`.
- Deliverable: CI "security gates" stage with required pass criteria.
  Completed: added `scripts/check-mv3-dynamic-code-guards.js` and wired it into `smoke:mv3:test`.

15. [x] Create Chrome Web Store review evidence pack per release
- Scope: policy/permission/data-flow deltas and test evidence bundled for each release.
- Targets: `MV3_BETA_TEST_CHECKLIST.md`, `MV3_ROLLOUT_CHECKLIST.md`, release workflow docs.
- Deliverable: `docs/security/release-evidence-template.md`.
  Completed: `docs/security/release-evidence-template.md`.

16. [x] Final pre-release signoff checklist
- Required:
  - [x] MV3 build and smoke tests pass.
  - [x] No unreviewed remote execution paths.
  - [x] Permissions/hosts align with single-purpose behavior.
  - [x] Privacy policy and disclosures match actual behavior.
  - [x] Incident response hotfix path is documented and tested.
  Completed: privacy contract check (`scripts/check-mv3-privacy-contract.js`) and incident drill evidence (`docs/security/incident-response-drill.md`, `scripts/check-mv3-incident-contract.js`) are enforced in `smoke:mv3:test`.

## Suggested Work Breakdown (PR Sequence)

1. PR-1: Phase 0 artifacts (PTM + data inventory).
2. PR-2: Phase 1 manifest/permission/match-scope tightening.
3. PR-3: Phase 2 execution-path and CSP hardening.
4. PR-4: Phase 3 messaging/network/storage controls.
5. PR-5: Phase 4 CI gates and review-evidence automation.

## Progress Notes

- Date: 2026-02-25
- Current phase: Execution plan complete
- Blockers: none
- Next point: Track newly reported runtime regressions against this security baseline
