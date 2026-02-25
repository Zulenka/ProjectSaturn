# MV3 Parity Gaps and Behavior Contracts

Last updated: 2026-02-25

This file tracks known behavior differences between Firefox MV2 and Chromium MV3 paths.
Use it as the source-of-truth companion for MV3 rollout and release notes.

## Network / GM Request

- Request-header mutation is limited under MV3 because blocking `webRequest` is unavailable.
  - Current behavior: listeners remain active for request/response metadata capture.
  - Current behavior: custom header injection attempts are logged once in debug mode.
- `xhrInject` preinject mode requires blocking `webRequest` and is disabled in MV3.
  - Current behavior: option is auto-disabled with debug warning.

## Install Flow (`.user.js`)

- MV2 flow used blocking `webRequest` redirects/cancel paths.
- MV3 flow uses `tabs.onUpdated` interception fallback for `.user.js` main-frame URLs.
  - Current behavior: supported installs continue to open the Confirm flow.
  - Current behavior: listener is scoped to URL updates when filter support exists.

## Sync OAuth Callback

- MV2 flow cancels callback requests via blocking `webRequest`.
- MV3 flow uses tab URL observation and closes auth tab when callback is detected.
  - Current behavior: listener is tab-scoped where API filters are supported.
  - Current behavior: listener cleanup is bounded (tab-close + timeout safety).

## Popup / UI Runtime

- Popup prefetch using `webRequest` may be unavailable in some MV3 runtimes.
  - Current behavior: hook registration is guarded; popup continues without prefetch optimization.
- Direct background-page command path is disabled in MV3.
  - Current behavior: command routing uses runtime messaging fallback.

## Injection Runtime

- MV3 top-frame injection is migrating to `chrome.userScripts.register`.
  - Current behavior: top-frame content/probe paths use `tryUserScripts` and fall back to execute-style APIs when unavailable.
  - Current behavior: one-shot registrations are unregistered via bounded cleanup timer.
- Subframe and legacy-path parity is still partially execute-style.
  - Current behavior: frame-scoped injection fallback remains active where `userScripts` parity is not fully implemented.

## Release/Build Contract

- Firefox release track remains MV2.
- Chromium release tracks (Chrome + Opera + Edge) are packaged/published as MV3.
- Chromium MV3 baseline now requires `minimum_chrome_version >= 135.0` for userscripts execute compatibility.
- CI builds both tracks for verification (`build:all` + `build:all:mv3`).

## Remaining High-Risk Validation

- Staged store rollout monitoring (canary -> beta -> stable) with `mv3` regression triage.
- Strict-CSP and iframe-heavy site matrix validation against production-like browsing sessions.
- Cross-browser validation of `userScripts` path behavior on Chrome/Opera channels (install + runtime injection parity).
