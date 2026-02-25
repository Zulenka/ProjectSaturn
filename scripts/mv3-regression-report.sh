#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-Zulenka/ProjectSaturn}"
DAYS="${2:-7}"

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

count() {
  local query="$1"
  gh issue list --repo "$REPO" --search "$query" --json number --jq 'length'
}

SINCE="$(date -u -d "$DAYS days ago" +%Y-%m-%d 2>/dev/null || date -u -v-"$DAYS"d +%Y-%m-%d)"

OPEN_MV3="$(count "is:open label:mv3")"
OPEN_MV3_P0="$(count "is:open label:mv3 label:P0")"
OPEN_MV3_P1="$(count "is:open label:mv3 label:P1")"
NEW_MV3="$(count "label:mv3 created:>=$SINCE")"
CLOSED_MV3="$(count "label:mv3 is:closed closed:>=$SINCE")"

cat <<EOF
MV3 Regression Report ($REPO)
Window: last $DAYS days (since $SINCE UTC)

- Open mv3 issues: $OPEN_MV3
- Open mv3 P0: $OPEN_MV3_P0
- Open mv3 P1: $OPEN_MV3_P1
- New mv3 issues (window): $NEW_MV3
- Closed mv3 issues (window): $CLOSED_MV3
EOF
