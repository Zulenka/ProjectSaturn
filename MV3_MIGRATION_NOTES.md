# MV3 Migration Notes

Last updated: 2026-02-25

## Release scope

- Chromium-family tracks (Chrome, Opera, Edge) ship on Manifest V3.
- Firefox remains on Manifest V2 in the current release line.

## What changed

- Background/runtime command routing in MV3 uses runtime messaging paths instead of background-page direct access.
- `.user.js` install interception in MV3 uses non-blocking tab update observation.
- Sync OAuth callback capture in MV3 uses tab URL observation with deterministic cleanup.
- GM request handling in MV3 keeps passive request/response metadata listeners and documented non-blocking limitations.

## Known limitations

- MV3 Chromium does not support blocking `webRequest` request mutation for this extension model.
- `xhrInject` mode requiring blocking `webRequest` is disabled in MV3.
- Popup prefetch optimization via `webRequest` may be unavailable in some runtimes; popup flow continues with guarded fallback.

See: `MV3_PARITY_GAPS.md`

## Validation snapshot

Validated on 2026-02-25 with:

- `yarn build:all`
- `yarn build:all:mv3`
- `yarn smoke:mv3:test`

Acceptance matrix status in `MV3_MIGRATION_PLAN.md` is fully checked.

## Rollback policy

Rollback triggers and steps are defined in:

- `MV3_ROLLOUT_CHECKLIST.md` (`Rollback triggers`, `Rollback steps`)

If rollback triggers fire, pause MV3 publication, republish last known-good Chromium package, and gate next rollout on explicit regression closure.
