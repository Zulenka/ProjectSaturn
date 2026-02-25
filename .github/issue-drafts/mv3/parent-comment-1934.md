MV3 migration execution plan is ready and split into trackable workstreams.

Source-of-truth plan file: `MV3_MIGRATION_PLAN.md` (in this repository).

## Program Milestones

- [ ] M1: Scope and architecture lock
- [ ] M2: Build/manifest split
- [ ] M3: Messaging/runtime decoupling from background page
- [ ] M4: Service worker safety refactor
- [ ] M5: Injection engine port
- [ ] M6: GM request/network redesign
- [ ] M7: `.user.js` install flow replacement
- [ ] M8: Sync OAuth callback replacement
- [ ] M9: UI/action compatibility polish
- [ ] M10: Release rollout and stabilization

## Child Issues (Planned Cards)

- [ ] MV3-01: Scope and architecture lock
- [ ] MV3-02: Manifest/build split and artifacts
- [ ] MV3-03: Remove background page coupling from UI clients
- [ ] MV3-04: Service worker compatibility refactor
- [ ] MV3-05: Injection API port and parity
- [ ] MV3-06: GM request header/cookie model for MV3
- [ ] MV3-07: `.user.js` interception/install flow replacement
- [ ] MV3-08: Sync OAuth callback capture replacement
- [ ] MV3-09: Action/popup compatibility for MV3
- [ ] MV3-10: Staged rollout and regression triage

## Cadence

- Weekly status update in this issue (`#1934`) with:
  - completed items,
  - active blockers,
  - risk changes,
  - next milestone exit criteria.
