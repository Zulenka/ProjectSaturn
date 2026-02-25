# MV3 Rollout and Rollback Checklist

Last updated: 2026-02-25

Use this checklist when preparing Chromium MV3 releases.

## Pre-release gate

- [ ] CI green on both tracks:
  - [ ] `build:all`
  - [ ] `build:all:mv3`
  - [ ] `smoke:mv3:test`
- [ ] Release workflow package targets confirmed:
  - [ ] Chrome MV3
  - [ ] Opera MV3
  - [ ] Edge MV3
  - [ ] Firefox MV2
- [ ] Parity-gap document reviewed:
  - [ ] `MV3_PARITY_GAPS.md`
- [ ] Architecture decisions reviewed:
  - [ ] `MV3_ARCHITECTURE_DECISIONS.md`

## Staged rollout

- [ ] Canary cohort (internal / early adopters) monitored.
- [ ] Beta rollout monitored for install, injection, and GM request regressions.
- [ ] Stable rollout only after no open P0/P1 MV3 regressions.

## Runtime smoke checks (release candidate)

- [ ] Popup opens and refreshes state after service worker restart.
- [ ] `.user.js` install flow opens Confirm page from supported hosts.
- [ ] GM request smoke scripts pass basic header/cookie scenarios.
- [ ] Sync OAuth callback completes and closes auth tab.

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
