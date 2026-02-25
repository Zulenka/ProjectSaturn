# MV3 Code Review Tracker

Last updated: 2026-02-25

This tracker records review-blocking MV3 architecture requirements that must be implemented before final acceptance.
Primary implementation guidance: `deep-research-report.md`.

## Live Regression Status (Zulenka/ProjectSaturn)

| Issue | Title | Status | Notes |
| --- | --- | --- | --- |
| #12 | MV3 install regression: Illegal invocation on StorageArea + imageData error during install | Closed | User validated install succeeds in Chrome (2026-02-25). |
| #13 | MV3/Opera regression: userscripts blocked with noninjectable warning on expected scriptable page | Open | Mitigations shipped (`6a3a5c30`, `fc20c612`); pending Opera retest on `torn.com` forum URL. |
| #15 | MV3 CSP EvalError on blocked injection fallback | Closed | Fixed via `81c97512`, `2b7bd57f`, `fc20c612` with guard enforcement in `61384f00`. |
| #16 | MV3: define Chromium/Opera minimum for userscripts execute path | Closed | Implemented via `ffb0def2` + `0931c8ec` (manifest baseline, artifact checks, runtime warnings). |

## Priority Findings

| ID | Requirement | Current State | Required Implementation | Status |
| --- | --- | --- | --- | --- |
| CR-MV3-01 | Use `chrome.declarativeNetRequest` instead of blocking `webRequest`; use `chrome.offscreen` for WebDAV and `GM_xmlhttpRequest` support paths. | MV3 currently gates/degrades blocking `webRequest` behavior and does not implement `offscreen` flow for these paths. | Replace blocking/interception-dependent logic with DNR rule orchestration and add offscreen-backed execution where background DOM/network flow is required. | Open |
| CR-MV3-02 | Use `chrome.userScripts.register` instead of `executeScript`. | Injection path currently relies on `tabs.executeScript` / `scripting.executeScript` compatibility wrapper. | Re-architect script registration/injection pipeline around `chrome.userScripts.register` with parity for frame/run-at/update lifecycle behavior. | In progress |

## Execution Phases (From Research Report)

| Phase | Scope | Related Findings | Status |
| --- | --- | --- | --- |
| P1 | Replace blocking/interception-dependent request logic with DNR ruleset orchestration (`static` + `dynamic/session` where needed), including rule lifecycle and priority strategy. | CR-MV3-01 | In progress |
| P2 | Introduce offscreen-backed worker flow for DOM/network-adjacent tasks required by WebDAV + `GM_xmlhttpRequest` support paths; enforce runtime message boundaries. | CR-MV3-01 | In progress |
| P3 | Replace imperative tab/script injection wrapper path with `chrome.userScripts.register` architecture, including update/unregister lifecycle and run-at/frame parity verification. | CR-MV3-02 | In progress |
| P4 | Hardening pass: permissions/CSP/WAR minimization, service-worker lifecycle resilience tests, and cold-start validation with DevTools closed. | CR-MV3-01, CR-MV3-02 | In progress |

## Progress Log

- 2026-02-25:
  - Added MV3 DNR session-rule interception for trusted `.user.js` install sources in `tab-redirector` (MV3 path), while preserving existing MV2 blocking gate and MV3 tab-update fallback flow.
  - Added MV3 `declarativeNetRequest` permission in manifest transformation for Chromium MV3 builds.
  - Added/updated regression tests for DNR setup and MV3 artifact/manifest expectations.
  - Added MV3 offscreen bridge foundation (`src/background/utils/offscreen.js` + `src/offscreen/index.js`) and wired WebDAV XML parsing to offscreen in MV3 path.
  - Added MV3 `offscreen` permission in manifest transformation and updated artifact checks.
  - Added initial MV3 offscreen HTTP fallback path for `GM_xmlhttpRequest` when `XMLHttpRequest` is unavailable in service worker context.
  - Added regression coverage for offscreen fallback (`test/background/requests-offscreen.test.js`) and parser behavior (`test/common/webdav-xml.test.js`).
  - Began MV3 `userScripts.register` migration slice: added MV3 `userScripts` permission wiring in manifest transform + artifact checks.
  - Added top-frame one-shot `userScripts.register` helper (`registerUserScriptOnce`) with timed unregister fallback.
  - Added per-tab `userScripts` cleanup path to unregister tracked one-shot registrations on tab completion/removal (timer fallback retained).
  - Wired content-realm preinject path to opt into `userScripts` on MV3 top frame while retaining `executeScript` fallback for parity.
  - Added regression coverage for `registerUserScriptOnce` success/fallback and `executeScriptInTab` `tryUserScripts` behavior (`test/background/tabs.test.js`).
  - Fixed CSP-blocked fallback path by preferring `userScripts.execute` for MV3 `tryUserScripts` injections; extended preinject to opt in across frames.
  - Added opt-out guards for legacy eval fallback in MV3 probe/warn call sites (`popup-tracker`, `tab-redirector`) so they do not trigger CSP eval errors when userscripts APIs are unavailable.
  - Reduced false MV3 `noninjectable` states in popup initialization by treating empty probe results as injectable when userscripts APIs are present.
  - Updated popup init to treat missing tab URL as unknown (probe first), avoiding premature noninjectable classification when URL is temporarily unavailable.
  - Disabled legacy eval fallback in MV3 preinject path to avoid CSP `unsafe-eval` violations in core userscript injection flow.
  - Added MV3 guard checks to enforce these fallback protections in `scripts/check-mv3-blocking-gates.js`.
  - Added DEBUG-only noninjectable diagnosis logging in popup init to capture tab URL/pending URL/userscripts capability context during Opera retest.
  - Added popup-tracker regression coverage for both missing-URL outcomes: injectability probe success and noninjectable fallback when userscripts capability is absent.
  - Opened issue #16 to track minimum-version/runtime policy for required userscripts capability support in MV3 release channels.
  - Added once-per-session debug warnings when MV3 userscripts capabilities (`userScripts` / `userScripts.execute`) are unavailable on strict no-legacy-fallback paths.
  - Raised MV3 Chromium `minimum_chrome_version` to `135.0` and added artifact/test assertions for userscripts execute baseline compatibility.
  - Verified local MV3 build and contract checks pass (`build:all:mv3`, `smoke:mv3:test`, `check:mv3:*`); rollout gate GH issue query step is environment-network dependent.
  - Added `SKIP_GH_ISSUE_CHECKS=1` override in rollout gate script so local beta/canary/stable gating can still run in restricted network environments.
  - Local rollout gates now pass in offline mode for canary/beta/stable (`SKIP_GH_ISSUE_CHECKS=1 yarn -s rollout:mv3:{canary|beta|stable}`).
  - Added `SKIP_GH_ISSUE_CHECKS=1` override in MV3 triage report script to allow local reporting flow without GitHub API access.
  - Added `MV3_BETA_TEST_CHECKLIST.md` for Chrome/Opera manual validation coverage (install, injection, `.user.js`, offscreen GM request, WebDAV, SW resilience).
  - Hardened MV3 one-shot userscript lifecycle by adding startup stale-registration cleanup (`userScripts.getScripts` + `unregister`) and wiring register-path calls through this cleanup gate.
  - Shifted MV3 preinject content path to prefer one-shot `userScripts.register` in top-frame injections, with subframe-safe `userScripts.execute` fallback retained where frame-targeting is required.
  - Disabled MV3 legacy execute-style fallback by default on `tryUserScripts` paths; legacy fallback now requires explicit opt-in to limit CSP/eval regressions.
  - Hardened icon context-menu setup against duplicate-id races by retrying create after remove on duplicate runtime errors to suppress repeated startup `runtime.lastError` noise.
  - Expanded MV3 contract guards to block direct `scripting.executeScript` call sites outside the shared tabs wrapper and to enforce register-first/legacy-fallback-default-disabled runtime invariants.
  - Added bounded offscreen message timeouts for WebDAV parse / GM request relay / abort signaling to enforce runtime message boundaries in MV3 service-worker flows.
  - Added dedicated offscreen boundary regression coverage (`test/background/offscreen.test.js`) and included it in MV3 smoke unit suite.
  - Added an MV3 runtime health snapshot command (`DiagnosticsGetMv3Health`) plus settings UI panel to report userscripts capability state, DNR session-rule presence, and offscreen context visibility for Chrome/Opera retest diagnostics.
  - Re-ran MV3 validation gates after hardening (`smoke:mv3:test`, `build:all:mv3`, `verify:artifacts:mv3`) with passing status.
  - Replaced remaining `javascript:` install-intercept redirect fallback with `about:blank` in `tab-redirector` to avoid strict CSP console violations during `.user.js` interception.
  - Replaced iframe bootstrap `src: 'javascript:void 0'` with `about:blank` in injected content runtime to reduce CSP-triggered script URL violations in strict pages.
  - Enabled MV3 `onHeadersReceived` CSP detection listener path so strict response CSP can force content-realm injection earlier in the preinject flow.
  - Hardened MV3 CSP detection timing by prewarming script env on `onHeadersReceived` cache misses and carrying CSP hints (`forceContent` / `nonce`) into `prepareBag` before first page-level injection attempt.
  - Added `check:mv3:csp-contracts` guard (`scripts/check-mv3-csp-contracts.js`) and wired it into `smoke:mv3:test` to enforce no `javascript:` fallback URLs and preserve MV3 CSP prewarm/prepare contracts.
  - Added extension build identity (`process.env.VM_BUILD_ID`) to diagnostics metadata and MV3 health snapshots so unpacked reload verification can confirm the exact commit/tag under test.
  - Added a concise version/build line in the Settings -> MV3 Runtime Health panel to make unpacked-build verification visible without parsing the full JSON block.
  - Added regression coverage for MV3 CSP detector listener wiring and non-`javascript:` MV2 install intercept redirect behavior.
  - Re-ran MV3 smoke pipeline after CSP hardening updates (`smoke:mv3`) with passing status.

## Evidence Pointers

- `src/background/utils/requests-core.js`
- `src/background/utils/preinject.js`
- `src/background/utils/tabs.js`
- `src/background/sync/webdav.js`
- `MV3_ARCHITECTURE_DECISIONS.md`
- `MV3_PARITY_GAPS.md`
- `MV3_BETA_TEST_CHECKLIST.md`
