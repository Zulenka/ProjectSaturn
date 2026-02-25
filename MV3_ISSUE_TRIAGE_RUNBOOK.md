# MV3 Issue Triage Runbook

Last updated: 2026-02-25

Use this runbook during canary/beta/stable rollout to monitor MV3 regressions.

## Labels

- Primary label: `mv3`
- Severity labels: `P0`, `P1`, `P2`
- Recommended additional labels: `regression`, `install-flow`, `injection`, `gm-request`, `sync`

## Intake workflow

1. Check new MV3 regression issues:
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 label:regression -label:tracking sort:created-desc"`
2. Check high-severity open regressions:
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 label:regression label:P0 -label:tracking"`
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 label:regression label:P1 -label:tracking"`
3. Tag unlabelled MV3 regressions from recent intake:
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open sort:updated-desc"`
   - Apply `mv3` + `regression` + severity label to confirmed MV3 regressions.
4. Keep program/task cards out of regression counts:
   - Use `tracking` label on roadmap/epic/workstream issues.

## Weekly burn-down

Track and post weekly counts:

- Open `mv3` + `tracking` issues
- Open `mv3` + `regression`
- Open `mv3` + `regression` + `P0`
- Open `mv3` + `regression` + `P1`
- Newly opened `mv3` regressions in the last 7 days
- Closed `mv3` regressions in the last 7 days

Example query:

- `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 label:regression -label:tracking updated:>=2026-02-18"`
- `yarn report:mv3:triage` (prints tracking vs regression counts and P0/P1 split)

## Rollout gating

- Do not advance canary -> beta or beta -> stable while unresolved `mv3`+`regression` P0/P1 issues remain.
- Reference `MV3_ROLLOUT_CHECKLIST.md` rollback triggers for immediate rollback conditions.
- Run stage gates:
  - `yarn rollout:mv3:canary`
  - `yarn rollout:mv3:beta`
  - `yarn rollout:mv3:stable`

## Repository constraint

- If GitHub issues are disabled for the repository, `mv3` issue-label triage cannot run.
- In that case, keep rollout gating on alternate intake channels and re-enable issues before stable rollout.
