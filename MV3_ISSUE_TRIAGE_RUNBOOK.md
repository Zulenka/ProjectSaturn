# MV3 Issue Triage Runbook

Last updated: 2026-02-25

Use this runbook during canary/beta/stable rollout to monitor MV3 regressions.

## Labels

- Primary label: `mv3`
- Severity labels: `P0`, `P1`, `P2`
- Recommended additional labels: `regression`, `install-flow`, `injection`, `gm-request`, `sync`

## Intake workflow

1. Check new MV3 issues:
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 sort:created-desc"`
2. Check high-severity open regressions:
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 label:P0"`
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 label:P1"`
3. Tag unlabelled MV3 regressions from recent intake:
   - `gh issue list --repo Zulenka/ProjectSaturn --search "is:open sort:updated-desc"`
   - Apply `mv3` + severity label to confirmed MV3 regressions.

## Weekly burn-down

Track and post weekly counts:

- Open `mv3` issues
- Open `mv3` + `P0`
- Open `mv3` + `P1`
- Newly opened `mv3` issues in the last 7 days
- Closed `mv3` issues in the last 7 days

Example query:

- `gh issue list --repo Zulenka/ProjectSaturn --search "is:open label:mv3 updated:>=2026-02-18"`
- `yarn report:mv3:triage` (prints open/new/closed `mv3` counts and P0/P1 split)

## Rollout gating

- Do not advance canary -> beta or beta -> stable while unresolved `mv3` P0/P1 regressions remain.
- Reference `MV3_ROLLOUT_CHECKLIST.md` rollback triggers for immediate rollback conditions.
