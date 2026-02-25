# MV3 Rollout and Rollback Checklist

Last updated: 2026-02-25

Use this checklist when preparing Chromium MV3 releases.

## Pre-release gate

- [ ] CI green on both tracks:
  - [ ] `build:all`
  - [ ] `build:all:mv3`
  - [ ] `smoke:mv3:test`
- [x] Release workflow package targets confirmed:
  - [x] Chrome MV3
  - [x] Opera MV3
  - [x] Edge MV3
  - [x] Firefox MV2
- [x] Parity-gap document reviewed:
  - [x] `MV3_PARITY_GAPS.md`
- [x] Architecture decisions reviewed:
  - [x] `MV3_ARCHITECTURE_DECISIONS.md`

Latest local verification (2026-02-25):

- [x] `build:all`
- [x] `build:all:mv3`
- [x] `smoke:mv3:test`

## Staged rollout

- [ ] Canary cohort (internal / early adopters) monitored.
- [ ] Beta rollout monitored for install, injection, and GM request regressions.
- [ ] Stable rollout only after no open P0/P1 MV3 regressions.

Current regression baseline (2026-02-25):

- Open `mv3`+`regression` P0: `0`
- Open `mv3`+`regression` P1: `0`
- Command: `yarn report:mv3:triage`

## Runtime smoke checks (release candidate)

- [x] Popup opens and refreshes state after service worker restart.
- [x] `.user.js` install flow opens Confirm page from supported hosts.
- [x] GM request smoke scripts pass basic header/cookie scenarios.
- [x] Sync OAuth callback completes and closes auth tab.

## Rollback triggers

Trigger rollback if any of the following appear after release:
- P0 break in install flow (`.user.js` unsupported unexpectedly).
- P0 injection failure on broad set of Chromium sites.
- P1 widespread GM request regressions breaking major scripts.
- P1 sync auth regressions for supported providers.

## Rollback steps

1. Pause Chromium MV3 publication in store pipelines.
2. Re-publish last known-good Chromium package.
3. Mark MV3 regression issues with `mv3` and severity labels.
4. Update release notes with temporary limitation/rollback status.
5. Gate next rollout attempt on explicit regression closure list.
