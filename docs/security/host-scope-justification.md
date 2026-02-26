# Host Scope Justification (Explicit Patterns)

This document records why broad host scope currently exists and how it will be reduced safely.

## Current Necessity

`<all_urls>` is no longer used in the manifest template. Host scope is explicitly limited to:

1. `http://*/*`
2. `https://*/*`
3. `file:///*`

These scopes are still broad because the extension acts as a userscript manager and must:

1. Detect and evaluate userscript matching/injection opportunities across arbitrary user-visited sites.
2. Support compatibility flows that rely on broad interception/injection surfaces during MV3 transition.

Primary references in code:

- `src/manifest.yml` (`content_scripts.matches` and host-scoped permissions are explicit)
- `scripts/manifest-helper.js` (moves URL scope into MV3 `host_permissions` during transform)
- `src/background/utils/preinject.js` and `src/injected/*` (runtime injection paths)

## No `<all_urls>` Baseline

`<all_urls>` is forbidden in this codebase by CI guard (`scripts/check-mv3-host-scope-justification.js`).
Reintroduction requires explicit policy/security review and guard updates.

## Risk Acknowledgement

Broad host scope increases:

1. Blast radius if a privileged path is compromised.
2. Chrome Web Store review sensitivity and timeline risk.
3. Need for strict message/input validation and defensive defaults.

## Reduction Plan (Staged)

1. **Phase A - Inventory and telemetry-safe analysis**
- Map which features truly need broad always-on access.
- Separate core userscript matching requirements from convenience features.

2. **Phase B - Conditional execution**
- Move non-core logic to user-intent paths (`activeTab` / command-driven flows).
- Keep broad scope only for core script manager functions that cannot be narrowed yet.

3. **Phase C - Host scope segmentation**
- Introduce narrower default match patterns where possible.
- Keep explicit protocol-scoped patterns only; do not reintroduce `<all_urls>`.

4. **Phase D - Revalidation**
- Re-run install/upgrade warning review.
- Update PTM and release evidence template with scope changes.

## Review Cadence

- Re-evaluate this justification every release that touches:
  - permissions/host permissions,
  - content-script matches,
  - injection architecture.
