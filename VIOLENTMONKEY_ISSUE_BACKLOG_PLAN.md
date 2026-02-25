# Violentmonkey Issue Backlog Plan (Snapshot-Based)

Source snapshot:
- `C:\Users\jness\Documents\Torn\ProjectSaturn\issue-export\issues.json`
- Snapshot parsed on 2026-02-24

Backlog summary from snapshot:
- Open issues: `80`
- Top labels: `enhancement (64)`, `bug (11)`, `external (9)`, `interoperability (9)`, `sync (6)`, `ui (5)`
- Age profile (approx): median `754` days, p90 `1952` days, oldest `3596` days

## Goal

Resolve the current backlog safely and sustainably by:
- fixing real bugs,
- shipping accepted features in batches,
- closing duplicates/out-of-scope/external-limitations quickly,
- improving triage hygiene so the backlog does not regrow immediately.

## Success Criteria

- All 80 snapshot issues are moved to a final disposition:
  - `Fixed`
  - `Closed (duplicate)`
  - `Closed (unsupported / external limitation)`
  - `Closed (not reproducible / no response)`
  - `Deferred to canonical tracking issue`
- Every remaining open issue has clear labels, owner, and next action.
- Median age of open issues trends downward after each release cycle.

## Constraints and Reality

- Not every issue should be "fixed" in code.
- Some items are product-policy decisions (especially Chromium/MV2/MV3 support).
- Some items are browser/platform limitations and should be closed with documentation.
- Feature requests should be batched by component to avoid churn.

## Operating Model

## 1. Freeze the Scope

- Treat this export as the backlog snapshot to process.
- New incoming issues are triaged separately and should not disrupt the snapshot burn-down.
- Maintain a simple tracking board or spreadsheet keyed by issue number.

Recommended columns:
- `Issue #`
- `Title`
- `Type` (`bug`, `enhancement`, `support`, `docs`, `policy`, `external`)
- `Area` (`sync`, `editor`, `ui`, `injection`, `network`, `storage`, `browser-compat`, `release`, `docs`)
- `Priority` (`P0..P3`)
- `Repro Status` (`reproducible`, `needs info`, `not reproducible`)
- `Disposition` (`fix`, `close`, `duplicate`, `defer`)
- `Owner`
- `Target Milestone`
- `Notes`

## 2. Policy Decisions First (Blockers to Fast Closure)

Make explicit maintainer decisions before engineering work:
- Chromium support policy (MV2-only fork support vs MV3 migration program)
- Support matrix by browser/version
- What counts as unsupported browser behavior vs project bug
- Threshold for closing stale enhancement requests

Deliverables:
- Pinned issue or docs page for browser support policy
- Reusable close/reply templates for common cases
- Canonical tracking issues for large themes (e.g. MV3, major compatibility gaps)

## 3. Full Triage Pass (All 80 Issues)

Process every issue once and assign:
- Type
- Area
- Priority
- Repro status
- Disposition

Triage rules:
- Close immediately if duplicate, unsupported, external limitation, or stale with no repro after follow-up.
- Keep open only if actionable and aligned with project direction.
- Merge duplicates into one canonical issue and cross-link.

Target time:
- 1-2 minutes for obvious items
- 5-10 minutes for complex/technical items

Expected output:
- 100% labeled and categorized snapshot

## 4. Prioritization Framework

Use this execution order:
1. Data loss / corruption / sync reliability
2. Injection/runtime breakage
3. Browser compatibility regressions
4. Editor/UI correctness bugs
5. QoL enhancements (batched)
6. Advanced features / API extensions

Priority rubric:
- `P0`: data loss, security, install/update breakage, widespread regression
- `P1`: major feature broken, reproducible browser-specific failures
- `P2`: localized bug or accepted enhancement with clear value
- `P3`: nice-to-have enhancement or unclear proposal

## 5. Workstreams (Parallel Execution)

### A. Platform / Browser Compatibility

Scope:
- Chromium/Firefox/Opera/Edge behavior differences
- Support-policy issues
- Manifest/platform compatibility tracking

Actions:
- Maintain a browser support matrix in docs
- Consolidate duplicates into canonical compatibility issues
- Add browser-specific smoke checklists for releases

### B. Reliability (Sync / Update / Export / Import)

Scope:
- `sync`-labeled and related data-handling bugs

Actions:
- Reproduce each issue on latest build
- Add regression tests where possible
- Improve logging/diagnostics for failed sync/update operations

### C. Injection / Network Runtime

Scope:
- Script injection failures, request handling, permissions/network behavior

Actions:
- Reproduce with minimal test scripts
- Build a repeatable browser test matrix
- Add targeted tests for parser/bridge/request edge cases

### D. Editor / UI Correctness

Scope:
- UI regressions, editor rendering/interaction, settings/dashboard behaviors

Actions:
- Batch related fixes into fewer releases
- Add snapshot/unit tests for deterministic regressions

### E. Enhancements / QoL

Scope:
- Most `enhancement` issues (largest bucket)

Actions:
- Group by feature area and implement only accepted bundles
- Close low-value or obsolete requests with rationale

## 6. Execution Cycle (Recommended Cadence)

Repeat weekly:
1. Triage 10-20 issues
2. Reproduce and classify top bugs
3. Fix 2-5 high-impact items
4. Add tests/docs for each resolved item
5. Close duplicates/stale items in batch
6. Publish short progress summary

This keeps throughput high without waiting for a massive "backlog sprint" finish.

## 7. Definition of Done (Per Issue)

For bug fixes:
- Repro steps recorded
- Root cause identified
- Fix merged
- Test added if practical
- Release note entry (if user-visible)
- Issue closed with version/build note

For non-code closures:
- Clear reason (duplicate / unsupported / external / stale / not reproducible)
- Link to canonical issue/docs if applicable

## 8. Tooling and Process Improvements (Prevents Backlog Regrowth)

- Strengthen issue templates:
  - browser + version
  - extension version
  - minimal repro
  - logs/screenshots
- Add labels for:
  - `needs-repro`
  - `stale-needs-info`
  - `browser-policy`
  - `good-first-repro`
- Add canned replies for frequent closure scenarios
- Maintain a release smoke checklist across supported browsers

## 9. Milestone Plan (Pragmatic)

### Milestone 1: Triage & Policy (1 week)

- Triage all 80 snapshot issues
- Publish support policy / canonical tracker(s)
- Close obvious duplicates and unsupported reports

Expected outcome:
- Snapshot backlog reduced materially without code changes

### Milestone 2: Reliability Sprint (2-3 weeks)

- Focus on `bug`, `sync`, `interoperability` issues with reproductions
- Fix highest-impact failures first
- Add regression tests

### Milestone 3: Compatibility Sprint (2 weeks)

- Browser-specific issues and runtime quirks
- Documentation updates for known limitations

### Milestone 4: UI/Enhancement Batch (3-4 weeks)

- Ship grouped enhancements with shared code/test effort
- Close stale or low-value requests that do not align with current direction

## 10. Metrics to Track

- Snapshot issues remaining (80 -> 0)
- Closed-by-reason counts (`fixed`, `duplicate`, `external`, `stale`, etc.)
- Median open-issue age
- Repro coverage (% issues with usable repro)
- Regression rate after release
- New issue inflow vs resolution rate

## 11. Immediate Next Actions (Concrete)

1. Create a triage sheet from `issues.json` and populate baseline columns.
2. Label and disposition all 80 issues in one triage pass.
3. Create canonical tracking issues for repeated themes (especially browser compatibility/MV3 policy).
4. Start bug-fix work on the top `P0/P1` reliability and interoperability issues.
5. Batch-close duplicates/stale/non-repro items with standardized responses.

## 12. Optional Follow-Up Files to Create

- `ISSUE_TRIAGE_TEMPLATE.md` (label/disposition rubric)
- `ISSUE_RESPONSE_TEMPLATES.md` (close/reply snippets)
- `BROWSER_SUPPORT_MATRIX.md` (official support policy)
- `RELEASE_SMOKE_CHECKLIST.md` (Firefox/Chromium/Opera/Edge)

