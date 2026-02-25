#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-Zulenka/ProjectSaturn}"
DAYS="${2:-7}"

if [[ "${SKIP_GH_ISSUE_CHECKS:-0}" != "1" ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "Error: gh CLI is not installed." >&2
    exit 127
  fi

  probe_err="$(mktemp)"
  if ! gh issue list --repo "$REPO" --limit 1 >/dev/null 2>"$probe_err"; then
    if grep -qi "disabled issues" "$probe_err"; then
      echo "Error: '$REPO' has issues disabled, so MV3 issue triage reporting is unavailable." >&2
      rm -f "$probe_err"
      exit 2
    fi
    cat "$probe_err" >&2
    rm -f "$probe_err"
    exit 1
  fi
  rm -f "$probe_err"
fi

count() {
  local query="$1"
  gh issue list --repo "$REPO" --search "$query" --json number --jq 'length'
}

SINCE="$(date -u -d "$DAYS days ago" +%Y-%m-%d 2>/dev/null || date -u -v-"$DAYS"d +%Y-%m-%d)"

if [[ "${SKIP_GH_ISSUE_CHECKS:-0}" == "1" ]]; then
  OPEN_MV3_TRACKING=0
  OPEN_MV3_REG=0
  OPEN_MV3_P0=0
  OPEN_MV3_P1=0
  NEW_MV3_REG=0
  CLOSED_MV3_REG=0
  GH_STATUS="skipped (SKIP_GH_ISSUE_CHECKS=1)"
else
  OPEN_MV3_TRACKING="$(count "is:open label:mv3 label:tracking")"
  OPEN_MV3_REG="$(count "is:open label:mv3 label:regression -label:tracking")"
  OPEN_MV3_P0="$(count "is:open label:mv3 label:regression label:P0 -label:tracking")"
  OPEN_MV3_P1="$(count "is:open label:mv3 label:regression label:P1 -label:tracking")"
  NEW_MV3_REG="$(count "label:mv3 label:regression -label:tracking created:>=$SINCE")"
  CLOSED_MV3_REG="$(count "label:mv3 label:regression -label:tracking is:closed closed:>=$SINCE")"
  GH_STATUS="enabled"
fi

cat <<EOF
MV3 Regression Report ($REPO)
Window: last $DAYS days (since $SINCE UTC)
- GitHub issue checks: $GH_STATUS

- Open mv3 tracking issues: $OPEN_MV3_TRACKING
- Open mv3 regressions: $OPEN_MV3_REG
- Open mv3 regression P0: $OPEN_MV3_P0
- Open mv3 regression P1: $OPEN_MV3_P1
- New mv3 regressions (window): $NEW_MV3_REG
- Closed mv3 regressions (window): $CLOSED_MV3_REG
EOF
