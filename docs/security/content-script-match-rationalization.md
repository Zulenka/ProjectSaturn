# Content Script Match Rationalization (MV3)

This document records why current match scope exists and which execution paths can be narrowed without breaking core behavior.

## Current Match Surface

| Surface | Current Scope | Why It Exists |
|---|---|---|
| `content_scripts.matches` | `<all_urls>` | Userscript manager must evaluate script metadata against arbitrary user-visited pages. |
| Background injection fallback paths | Tab/frame scoped at runtime | Required for targeted reinjection, install handoff, and compatibility flows. |

## Feature Scope Classification

| Feature Group | Requires broad scope now? | Notes |
|---|---|---|
| Core userscript matching/injection | Yes | Primary product behavior; cannot be narrowed without dropping site coverage. |
| Script install interception | Mostly no | Interception can remain targeted to known installer hosts via DNR/tab listeners. |
| Popup/options UI behavior | No | Extension-page only, no host scope required. |
| Diagnostics and alerts | No | Background/internal only. |

## Immediate Reduction Candidates

1. Keep broad matching only for core userscript runtime evaluation.
2. Continue shifting install/update interception to targeted host filters and DNR.
3. Audit non-core features for `activeTab`-driven activation where possible.

## Release Gate

For any change to host permissions or `content_scripts.matches`:

1. Update this document and `docs/security/host-scope-justification.md`.
2. Re-run:
   - `yarn smoke:mv3:test`
   - `yarn build:all:mv3`
   - `yarn verify:artifacts:mv3`
