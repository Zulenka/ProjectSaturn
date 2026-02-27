# Issue 17 Implementation Plan

Issue: [#17](https://github.com/Zulenka/ProjectSaturn/issues/17)  
Title: Integrate GreasyFork install-button capture and default-to-VM install flow

## Objective
- Capture install flows originating from GreasyFork/SleazyFork install buttons.
- Route those flows into Violentmonkey's confirm/install flow when VM is installed.
- Keep browser behavior safe and non-breaking when payloads are invalid or VM cannot own the flow.

## Scope
- In scope:
  - Install button and `.user.js` navigation handling for GreasyFork/SleazyFork.
  - MV3 routing path (DNR + tab update fallback) and installer payload normalization.
  - Diagnostics and tests for install-routing decisions.
- Out of scope:
  - Post-install runtime execution/debugging of installed scripts.
  - Non-userscript download UX beyond safe fallback behavior.

## Current Baseline
- Existing install interception is in `src/background/utils/tab-redirector.js`.
- MV3 path already uses non-blocking fallback routing + DNR install blocking.
- Recent fix already added metadata fallback parsing:
  - JSON/JSONP (`/**/callback(...)`) -> resolve `code_url` -> fetch actual `.user.js`.
- Related regression test added in `test/background/tab-redirector.test.js`.

## Constraints (MV3 + Browser Behavior)
- Extensions cannot force global OS/browser default-handler behavior outside extension scope.
- Reliable implementation path is interception of `.user.js` navigation + routing into VM confirm.
- Some pages may return metadata/JSON wrappers instead of direct userscript text.
- Must avoid breaking normal navigation for non-userscript or malformed payloads.

## Implementation Phases

### Phase 1 - Install Route Normalization
Goal: Ensure any GreasyFork install path resolves to real userscript text before confirm.

Tasks:
1. Keep URL allowlist strict for trusted installer sources.
2. Resolve payload in this order:
   - Direct userscript text (`matchUserScript` pass).
   - JSON or JSONP metadata with `code_url` (or equivalent nested field).
   - Fetch resolved `code_url` and revalidate as userscript text.
3. Preserve original URL and resolved URL in flow state for tab replacement logic.
4. Keep existing safe fallback when validation fails.

Deliverables:
- Hardened `confirmInstall` resolution pipeline.
- Utility helpers for metadata parsing and invalid-preview handling.

Acceptance:
- GreasyFork install button flow no longer fails on JSONP metadata responses.
- Confirm page receives real userscript source for valid scripts.

### Phase 2 - Routing Decision Engine Hardening (MV3)
Goal: Make route decisions explicit, deterministic, and debuggable.

Tasks:
1. Explicitly classify each install attempt:
   - `direct-userscript`
   - `metadata-redirect`
   - `invalid-payload-fallback`
2. Ensure tab replacement checks accept both original request URL and resolved script URL.
3. Keep non-VM/non-script behavior unchanged (open original URL).
4. Add guardrails to avoid redirect loops.

Deliverables:
- Stable route-decision code path in `tab-redirector`.
- Clear branch logic around `from`, `url`, and `requestedUrl`.

Acceptance:
- No false "Invalid script" for valid GreasyFork install clicks.
- No looping or dead-end tabs in confirm/open flow.

### Phase 3 - Diagnostics & Observability
Goal: Make install routing failures actionable.

Tasks:
1. Emit structured diagnostics for each install decision branch.
2. Include:
   - source URL
   - resolved URL (if changed)
   - classification/result
   - failure reason and shortened payload preview (when invalid)
3. Ensure these events are visible in existing diagnostics export and log console.

Deliverables:
- New diagnostics events in background install path.
- Updated tests for event emission where practical.

Acceptance:
- Support can determine why an install routed/fell back from a single diagnostics export.

### Phase 4 - Test Matrix & Regression Protection
Goal: Lock behavior with automated tests and manual smoke runs.

Automated tests:
1. Direct `.user.js` from trusted host -> confirm opens.
2. JSON metadata with `code_url` -> second fetch -> confirm opens.
3. JSONP metadata with `code_url` -> second fetch -> confirm opens.
4. Invalid payload -> notification/fallback to original URL.
5. Tab replacement logic works with resolved URL mismatch from original URL.

Manual smoke tests:
1. GreasyFork install button (Chrome MV3).
2. Direct GreasyFork code URL.
3. SleazyFork equivalent path.
4. Invalid/non-script `.user.js` URL fallback.

Deliverables:
- Expanded `test/background/tab-redirector.test.js` coverage.
- Manual test checklist update if needed.

Acceptance:
- Automated test pass + manual path verification before release tag.

## Rollout Plan
1. Land Phase 1 + 2 in one PR (routing correctness).
2. Land Phase 3 + 4 in follow-up PR (diagnostics + expanded tests), or same PR if low-risk.
3. Ship in next beta build and confirm via user diagnostics export from real install attempts.

## Risks and Mitigations
- Risk: Provider response formats change.
  - Mitigation: keep parser tolerant but strict on final userscript validation.
- Risk: Overly broad interception affects non-script pages.
  - Mitigation: keep whitelist/blacklist strict and fallback non-destructive.
- Risk: MV3 timing differences across Chromium variants.
  - Mitigation: rely on tab update + confirm flow, not synchronous blocking assumptions.

## Definition of Done
- Issue #17 acceptance criteria satisfied in Chrome MV3:
  - Install button click on GreasyFork routes into VM confirm when valid.
  - JSON/JSONP metadata flows resolve to real `.user.js`.
  - Invalid payloads do not break browsing flow.
  - Tests exist for all major branches.
  - Diagnostics clearly describe routing outcomes.

