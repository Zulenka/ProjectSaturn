# MV3 Migration Plan (Program Epic #1934)

Drafted: February 25, 2026  
Parent issue: https://github.com/violentmonkey/violentmonkey/issues/1934

## Goal

Ship a Chromium MV3 build that preserves core Violentmonkey behavior for install, injection, update, sync auth, and GM request flows while keeping Firefox on current manifest flow until Firefox-targeted MV3 work is explicitly approved.

## Success Criteria

- Chromium MV3 package builds and signs in CI/release workflows.
- Service-worker restart resilience is verified for popup/options/confirm workflows.
- Script install/injection/update flows pass acceptance tests on Chrome and Edge.
- Known parity gaps are documented and linked to follow-up issues.
  - Reference: `MV3_PARITY_GAPS.md`
- `#1934` is reduced to coordination status only, with implementation tracked in child issues.

## Guardrails

- Keep a dual-track build during migration: `firefox-mv2` + `chromium-mv3`.
- Avoid large rewrites without measurable migration benefit.
- Every behavior change must be tied to an explicit issue and release note.
- No release cut without defined rollback steps.

## Program Board

| ID | Workstream | Priority | Status | Owner | Target |
| --- | --- | --- | --- | --- | --- |
| MV3-01 | Scope, architecture, and policy lock | P0 | Not started | TBD | Week 1 |
| MV3-02 | Manifest/build split and artifact generation | P0 | Completed | TBD | Week 1 |
| MV3-03 | Messaging/RPC decoupling from background page | P0 | In progress | TBD | Week 2 |
| MV3-04 | Service-worker-safe background runtime | P0 | In progress | TBD | Week 2 |
| MV3-05 | Injection engine MV3 port | P0 | In progress | TBD | Weeks 3-4 |
| MV3-06 | GM request/network interception redesign | P0 | In progress | TBD | Weeks 4-5 |
| MV3-07 | `.user.js` install and redirect flow replacement | P0 | In progress | TBD | Week 5 |
| MV3-08 | Sync OAuth callback interception replacement | P1 | In progress | TBD | Week 6 |
| MV3-09 | UI/action/popup compatibility polish | P1 | In progress | TBD | Week 7 |
| MV3-10 | CI/release rollout and stabilization | P0 | In progress | TBD | Week 8 |

## Milestones and Checklists

## M1: Scope and Architecture Lock (Week 1)

Reference ADR:
- `MV3_ARCHITECTURE_DECISIONS.md`

- [ ] Finalize Chromium support matrix and parity target for first MV3 release.
- [ ] Decide and document injection strategy (`userScripts` vs `scripting` orchestration).
- [ ] Decide expected behavior for request-header and cookie handling under MV3 constraints.
- [ ] Publish design note in `#1934` and pin it as source of truth.
- [ ] Create all child issues listed in this plan and link them to `#1934`.

Exit criteria:
- Program assumptions are explicit and approved by maintainers.
- No unresolved architecture questions block implementation issues.

## M2: Build/Manifest Split (Week 1)

- [x] Add MV3 manifest template/overlay for Chromium targets.
- [x] Keep existing Firefox MV2 path untouched.
- [x] Update manifest build helper to emit `action`, `background.service_worker`, and MV3 permissions model.
- [x] Update packaging scripts to generate MV3 artifacts.
- [x] Ensure CI uploads both tracks for review builds.

Exit criteria:
- CI produces installable `chromium-mv3` and `firefox-mv2` artifacts for each commit.

## M3: Messaging and Runtime Decoupling (Week 2)

- [ ] Replace background-page direct access patterns with message/port-based RPC.
- [ ] Migrate high-frequency `sendCmdDirectly` usage to async RPC where required.
- [ ] Remove global assumptions that only work in persistent background pages.
- [ ] Add retry and reconnection handling around worker wake/suspend cycles.

Exit criteria:
- Popup/options/confirm pages work after manual service worker restart.

## M4: Service Worker Safety (Week 2)

- [ ] Remove or isolate background DOM-dependent features (clipboard, icon rasterization, similar).
- [ ] Introduce offscreen document path only where required.
- [ ] Ensure no hidden dependency on `document` lifecycle in background runtime.
- [ ] Add smoke tests for worker suspend/resume continuity.

Exit criteria:
- Background logic runs safely in service worker context with no DOM exceptions.

## M5: Injection Engine Port (Weeks 3-4)

- [ ] Replace MV2 `tabs.executeScript` usage in background injection paths.
- [ ] Rework preinject timing logic that currently depends on MV2 request hooks.
- [ ] Preserve `run_at`, frame handling, realm decisions, and cache behavior.
- [ ] Validate with strict CSP sites and multi-frame pages.

Exit criteria:
- Injection reliability meets pre-migration baseline on target Chromium versions.

## M6: GM Request and Network Model (Weeks 4-5)

- [x] Replace blocking request mutation approach with MV3-compatible strategy.
- [x] Define and document unavoidable parity differences.
- [x] Port request header/cookie handling with explicit tests.
- [ ] Validate GM request flows against real-world scripts.

Exit criteria:
- GM request behavior is deterministic, documented, and tested for supported scenarios.

## M7: Install Flow and Redirect Handling (Week 5)

- [x] Replace blocking `.user.js` interception/redirect approach.
- [x] Preserve install UX for supported sources.
- [ ] Handle unsupported flows with clear user messaging.
- [x] Add regression coverage for install entrypoints.

Exit criteria:
- Script install flow is stable under MV3 and aligned with documented constraints.

## M8: Sync OAuth Callback Flow (Week 6)

- [x] Replace blocking callback interception used in sync auth flow.
- [x] Ensure auth tab lifecycle remains user-safe and deterministic.
- [ ] Cover callback path with end-to-end tests for each sync provider in scope.

Exit criteria:
- OAuth sync setup works in MV3 for the supported provider list.

## M9: UI/Action Compatibility (Week 7)

- [x] Move `browserAction` assumptions to `action` abstraction for Chromium MV3.
- [x] Update popup prefetch/injectability checks that rely on MV2 APIs.
- [x] Validate badge/menu states under worker wake/suspend behavior.

Exit criteria:
- Popup and action behaviors are stable and match documented expectations.

## M10: Release and Rollout (Week 8)

Operational checklist:
- `MV3_ROLLOUT_CHECKLIST.md`

- [x] Add MV3 release assets and store upload paths.
- [ ] Run staged rollout: canary -> beta -> stable.
- [ ] Monitor issue intake and tag regressions with `mv3`.
- [ ] Publish migration notes and known limitations.
- [ ] Define rollback trigger and rollback procedure.

Exit criteria:
- MV3 reaches stable with no unresolved P0/P1 regressions.

## Risks and Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Injection regressions on CSP-heavy sites | High | Add CSP-focused acceptance suite before release |
| GM request parity gaps surprise users | High | Document expected differences and release-noted behavior |
| Service worker lifecycle causes intermittent failures | High | Add restart-resilience tests and retry logic in RPC layer |
| Release complexity with dual tracks | Medium | Keep explicit artifact naming and CI matrix checks |
| Scope creep from unrelated enhancements | Medium | Keep `#1934` closed to non-MV3 feature work |

## Test and Acceptance Matrix

- [ ] Install `.user.js` from supported hosts.
- [ ] Injection correctness in top frame and nested iframe.
- [ ] `run_at` behavior (`start`, `end`, `idle`) parity checks.
- [ ] Popup load and menu actions after service worker restart.
- [ ] GM request smoke scripts (headers/cookies/basic auth scenarios).
- [ ] Sync OAuth callback and first sync transaction.
- [ ] Update-check and update-apply flow.
- [ ] Export/import basic flow.

## Issue-Ready Child Cards

Copy each card to GitHub as a child issue under `#1934`.

## Card MV3-01

Title: `MV3 Program: Scope and Architecture Lock`  
Labels: `enhancement`, `policy`, `browser-compat`, `mv3`, `P0`  
Body checklist:
- [ ] Finalize target browser/version matrix for first MV3 release.
- [ ] Approve injection strategy and compatibility goals.
- [ ] Approve GM request behavior contract under MV3 constraints.
- [ ] Publish architecture decision record linked from `#1934`.
Definition of done:
- Decisions are documented and approved by maintainers.

## Card MV3-02

Title: `Build System: Add Chromium MV3 Manifest and Artifacts`  
Labels: `enhancement`, `release`, `mv3`, `P0`  
Body checklist:
- [ ] Add MV3 manifest output path for Chromium targets.
- [ ] Preserve Firefox MV2 output path.
- [ ] Update export/build scripts for MV3 artifact naming.
- [ ] Update CI to upload both artifact tracks.
Definition of done:
- CI publishes installable artifacts for both tracks.

## Card MV3-03

Title: `Runtime: Remove Background Page Coupling from UI Clients`  
Labels: `enhancement`, `architecture`, `mv3`, `P0`  
Body checklist:
- [ ] Replace direct background-page data access with RPC.
- [ ] Migrate direct-call hotspots to async message-safe flows.
- [ ] Add retry behavior for worker wake-up transitions.
Definition of done:
- No required flow depends on `getBackgroundPage`.

## Card MV3-04

Title: `Background Runtime: Service Worker Compatibility Refactor`  
Labels: `enhancement`, `architecture`, `mv3`, `P0`  
Body checklist:
- [ ] Isolate or replace DOM-dependent background utilities.
- [ ] Add offscreen helpers only where necessary.
- [ ] Validate suspend/resume stability.
Definition of done:
- No service-worker runtime exceptions from DOM API usage.

## Card MV3-05

Title: `Injection Engine: MV3 API Port and Behavior Parity`  
Labels: `enhancement`, `injection`, `mv3`, `P0`  
Body checklist:
- [ ] Replace MV2 injection API usage with MV3-compatible APIs.
- [ ] Preserve realm and frame behavior.
- [ ] Validate strict CSP and iframe-heavy scenarios.
Definition of done:
- Injection acceptance tests pass on supported Chromium targets.

## Card MV3-06

Title: `Network: GM Request and Header/Cookie Flow for MV3`  
Labels: `enhancement`, `network`, `interoperability`, `mv3`, `P0`  
Body checklist:
- [ ] Replace blocking interception path with MV3-compatible model.
- [ ] Define and document parity gaps.
- [ ] Add request-behavior regression tests.
Definition of done:
- GM request core scenarios pass with documented behavior.

## Card MV3-07

Title: `Installer: Replace MV2 .user.js Interception Flow`  
Labels: `enhancement`, `browser-compat`, `mv3`, `P0`  
Body checklist:
- [ ] Redesign `.user.js` install interception for MV3.
- [ ] Preserve supported-host install UX.
- [ ] Add fallback UX for unsupported entrypoints.
Definition of done:
- Install flow is stable and documented for MV3 users.

## Card MV3-08

Title: `Sync: MV3-Compatible OAuth Callback Capture`  
Labels: `enhancement`, `sync`, `mv3`, `P1`  
Body checklist:
- [ ] Replace blocking callback interception in sync auth.
- [ ] Keep auth tab handling deterministic and safe.
- [ ] Validate end-to-end sync auth for each supported provider.
Definition of done:
- Sync auth setup succeeds on MV3 with tested providers.

## Card MV3-09

Title: `UI: Action/Popup Compatibility for MV3`  
Labels: `enhancement`, `ui`, `mv3`, `P1`  
Body checklist:
- [ ] Port toolbar action behavior to MV3 action model.
- [ ] Replace popup prefetch checks tied to MV2 APIs.
- [ ] Validate badge/menu correctness after worker restarts.
Definition of done:
- Popup/action UI behavior matches expected MV3 UX.

## Card MV3-10

Title: `Release: MV3 Staged Rollout and Regression Triage`  
Labels: `enhancement`, `release`, `mv3`, `P0`  
Body checklist:
- [ ] Add release workflow steps for MV3 artifacts and upload.
- [ ] Execute staged rollout (canary/beta/stable).
- [ ] Track regressions with `mv3` label and weekly burn-down.
- [ ] Publish known limitations and rollback criteria.
Definition of done:
- Stable MV3 rollout completed without open P0/P1 blockers.

## Reporting Cadence

- Weekly: update `#1934` with completed checklist items and blocker list.
- Every merge touching MV3 path: link PR to one `MV3-0x` card.
- End of each milestone: post pass/fail against exit criteria.
