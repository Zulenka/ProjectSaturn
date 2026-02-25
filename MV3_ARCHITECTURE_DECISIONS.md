# MV3 Architecture Decisions (ADR)

Date: 2026-02-25
Status: Draft (implementation-backed)

This document records currently implemented decisions for Chromium MV3 migration.

## ADR-01: Dual-track packaging

- Decision:
  - Keep Firefox on MV2.
  - Ship Chromium-family targets on MV3.
- Rationale:
  - Firefox MV3 scope is separate and not required for Chromium migration completion.
  - Current codebase already supports target-specific manifest transforms.
- Implementation:
  - `TARGET_MANIFEST=mv3` for Chromium/Opera.
  - Release workflows package/publish Chromium tracks as MV3.

## ADR-02: Background-page coupling strategy

- Decision:
  - In MV3 mode, avoid direct background-page calls and use runtime messaging path.
- Rationale:
  - Service workers do not provide persistent background pages.
  - Direct page access is brittle and blocks restart resilience.
- Implementation:
  - `sendCmdDirectly` bypasses background-page direct path in MV3.
  - UI paths that previously depended on background page use message/port channels.

## ADR-03: Request interception model under MV3 limits

- Decision:
  - Keep passive `webRequest` listeners for metadata capture.
  - Do not rely on blocking request mutation in MV3.
- Rationale:
  - Blocking `webRequest` is unavailable in MV3 Chromium policy model.
  - GM request pipelines still require deterministic request/response metadata.
- Implementation:
  - Listener registration remains active in MV3 with compatibility fallbacks.
  - Header mutation-dependent paths degrade with explicit warnings and documented gaps.

## ADR-04: Install and sync callback interception replacement

- Decision:
  - Replace blocking interception paths with tab-observation fallback paths.
- Rationale:
  - `.user.js` install and OAuth callback flows previously relied on blocking cancellation.
  - MV3 requires non-blocking control flows in these cases.
- Implementation:
  - Install flow uses `tabs.onUpdated` fallback for `.user.js` main-frame URLs.
  - Sync auth callback uses tab-scoped URL observation, tab-close cleanup, and timeout cleanup.

## ADR-05: Release rollout contract

- Decision:
  - CI validates both tracks (`mv2` + `mv3`), release tracks use MV3 for Chromium-family stores.
- Rationale:
  - Dual validation lowers migration risk while preserving Firefox continuity.
  - Store-published Chromium artifacts must match MV3 migration objective.
- Implementation:
  - CI runs `build:all` and `build:all:mv3`.
  - Release and Edge release workflows package Chromium assets with `TARGET_MANIFEST=mv3`.

## ADR-06: Offscreen document usage

- Decision:
  - Introduce an MV3 offscreen document for background tasks that require DOM-adjacent/runtime-window execution semantics.
- Rationale:
  - WebDAV directory XML parsing and `GM_xmlhttpRequest` fallback behavior require a resilient MV3 service-worker compatible execution path.
  - Offscreen runtime isolates this work from service-worker lifecycle limits while preserving message-driven boundaries.
- Implementation:
  - MV3 manifest transform now includes `offscreen` permission.
  - Added offscreen bridge (`src/background/utils/offscreen.js`) and offscreen runtime handlers (`src/offscreen/index.js`).
  - WebDAV parsing path routes through offscreen in MV3 (`src/background/sync/webdav.js`).
  - `GM_xmlhttpRequest` fallback routes via offscreen fetch/abort handling when `XMLHttpRequest` is unavailable (`src/background/utils/requests.js`).

## ADR-07: MV3 user script injection path

- Decision:
  - Start migrating top-frame MV3 code injection to `chrome.userScripts.register` while preserving compatibility fallback to execute-style APIs.
- Rationale:
  - `userScripts` is the intended MV3 injection architecture for userscript-style execution semantics.
  - Incremental migration reduces release risk while preserving current behavior in runtimes lacking full `userScripts` support.
- Implementation:
  - MV3 manifest transform now includes `userScripts` permission.
  - Added `registerUserScriptOnce` helper in `src/background/utils/tabs.js` with timed unregister cleanup.
  - `executeScriptInTab` accepts `tryUserScripts` opt-in and falls back to legacy injection APIs on failure.
  - Injection/probe call sites opted into `tryUserScripts` for MV3 top-frame paths (`preinject`, `popup-tracker`, `tab-redirector`).

## Open decisions still requiring maintainer signoff

- Final first-release parity contract for GM request header/cookie edge cases.
- Full lifecycle strategy for replacing remaining execute-style injection fallbacks with durable `userScripts` registration parity.
- Definitive runbook for service-worker restart smoke testing and rollback thresholds.
- Public release-note scope for known MV3 limitations.
