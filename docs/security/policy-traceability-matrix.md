# MV3 Policy Traceability Matrix (PTM)

This matrix maps Chrome MV3/CWS security requirements to concrete controls in this repository.

## Status Legend

- `Implemented`: control exists and is actively enforced.
- `Partial`: control exists but has known gaps or legacy exceptions.
- `Planned`: no direct control yet; tracked in execution plan.

## Matrix

| Requirement Area | Requirement Summary | Repo Control(s) | Verification | Status | Gap / Next Action |
|---|---|---|---|---|---|
| MV3 architecture | Use MV3 service worker model and MV3 packaging | `scripts/manifest-helper.js`, `scripts/verify-build-artifacts.js`, `dist-builds/*-mv3/manifest.json` | `yarn build:all:mv3 && yarn verify:artifacts:mv3` | Implemented | Keep enforcing through CI |
| Listener lifecycle | Register background listeners safely in SW flow | `src/background/index.js`, `src/background/utils/*` | `yarn smoke:mv3:test` | Implemented | Audit for async registration regressions each release |
| Least privilege | Minimize named permissions and host scope | `src/manifest.yml`, MV3 transform in `scripts/manifest-helper.js`, host-scope gate in `scripts/check-mv3-host-scope-justification.js` | Build manifest diff + install warning review | Partial | `<all_urls>` remains broad; tighten by feature |
| Host permissions separation | Use `host_permissions` in MV3 | `scripts/manifest-helper.js` | `yarn verify:artifacts:mv3` | Implemented | None |
| Content script scope | Avoid broad content-script execution when possible | `src/manifest.yml`, `src/injected/*`, `src/background/utils/preinject.js` | URL-scope tests + manual URL sampling | Partial | Scope reduction plan required per feature |
| webRequest blocking removal | Avoid `webRequestBlocking` in MV3 | `scripts/manifest-helper.js`, `scripts/verify-build-artifacts.js` | `yarn verify:artifacts:mv3` | Implemented | None |
| DNR adoption | Prefer DNR for supported interception paths | `src/background/utils/tab-redirector.js`, diagnostics checks | `yarn smoke:mv3:test` | Partial | Expand DNR coverage as remaining webRequest paths are retired |
| Remote code restrictions | Prevent remotely hosted executable code | MV3 guard scripts including `scripts/check-mv3-dynamic-code-guards.js`, build packaging | `yarn smoke:mv3:test` | Partial | Continue reducing residual non-MV3 legacy dynamic execution paths |
| CSP safety | Maintain CSP-safe injection/bootstrap paths | `scripts/check-mv3-csp-contracts.js`, `src/injected/content/inject.js` | `node scripts/check-mv3-csp-contracts.js` | Implemented | Continue enforcing as hard gate |
| Arbitrary execution | Avoid dynamic code execution in extension context | MV3 fallback gating in `src/background/utils/tabs.js` + dynamic-code guards | `yarn smoke:mv3:test` | Partial | Legacy non-MV3 eval shim remains and is monitored by guardrails |
| Messaging trust boundary | Validate/contain command handling from tabs/content | `src/background/index.js`, `src/common/browser.js`, `src/injected/content/bridge.js`, `docs/security/message-contract-spec.md` | Runtime contract checks + smoke | Partial | Add direct negative unit tests for invalid payload and sender edge cases |
| External connectivity | Restrict `externally_connectable` and external message surface | No `externally_connectable` in manifest source | Manifest audit | Implemented | Keep absent unless explicitly needed |
| Secure storage | Store only required extension data; isolate areas | `src/background/utils/storage.js`, `src/background/utils/storage-cache.js`, `src/background/utils/db.js` | Storage key audit + export checks | Implemented | Add documented retention schedule per key class |
| Sensitive token handling | Keep credentials/tokens in background-only flows | `src/background/sync/base.js`, provider files in `src/background/sync/*` | Sync provider tests | Partial | Add explicit token lifecycle/rotation notes |
| HTTPS transport | Use secure network transport for remote data | `src/background/sync/*`, `src/common/util.js`, `src/background/utils/requests.js` | `rg -n "http://"` + runtime network audit | Partial | Omitted-scheme WebDAV defaults to HTTPS and remote explicit HTTP is blocked; audit remaining explicit HTTP exceptions |
| Diagnostics transparency | Record actionable security/runtime diagnostics | `src/background/utils/diagnostics.js`, `src/background/utils/alerts.js` | `test/background/diagnostics.test.js` | Implemented | Add security-focused alert codes to triage docs |
| Supply-chain checks | Run static/runtime guards in CI | `.github/workflows/ci.yml`, `package.json` smoke scripts | CI run | Implemented | Add dependency vulnerability gate policy thresholds |
| Build artifact integrity | Validate expected MV3 artifacts and contracts | `scripts/verify-build-artifacts.js`, `scripts/check-mv3-release-contract.js` | `yarn verify:artifacts:dual` | Implemented | None |
| Store review readiness | Keep release evidence/checklists for policy review | `MV3_BETA_TEST_CHECKLIST.md`, `MV3_ROLLOUT_CHECKLIST.md`, `docs/security/release-evidence-template.md` | Release checklist review | Implemented | Keep template synced with policy updates |
| Incident readiness | Support rapid rollback/hotfix and diagnostics export | `docs/security/incident-response-runbook.md`, diagnostics export commands, release workflows | Manual drill | Implemented | Run scheduled incident simulation quarterly |

## Immediate Priority Gaps

1. Reduce broad host/content-script scope where feasible from `<all_urls>`.
2. Add direct negative unit tests for command payload/sender validation.
3. Run scheduled incident simulation and archive evidence with release docs.
