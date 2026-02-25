#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-}"
REPO="${2:-Zulenka/ProjectSaturn}"

if [[ -z "$STAGE" ]]; then
  echo "Usage: $0 <canary|beta|stable> [owner/repo]" >&2
  exit 2
fi

if [[ "${SKIP_GH_ISSUE_CHECKS:-0}" != "1" ]] && ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is not installed." >&2
  exit 127
fi

case "$STAGE" in
  canary|beta|stable) ;;
  *)
    echo "Error: invalid stage '$STAGE'. Expected canary, beta, or stable." >&2
    exit 2
    ;;
esac

run_local_checks() {
  if [[ "${SKIP_LOCAL_CHECKS:-0}" == "1" ]]; then
    echo "Skipping local build/smoke checks (SKIP_LOCAL_CHECKS=1)."
    return
  fi
  if [[ "$STAGE" == "canary" ]]; then
    yarn -s build:all
    yarn -s build:all:mv3
  fi
  yarn -s smoke:mv3:test
}

count() {
  local query="$1"
  gh issue list --repo "$REPO" --search "$query" --json number --jq 'length'
}

run_local_checks

if [[ "${SKIP_GH_ISSUE_CHECKS:-0}" == "1" ]]; then
  OPEN_P0=0
  OPEN_P1=0
  GH_STATUS="skipped (SKIP_GH_ISSUE_CHECKS=1)"
else
  OPEN_P0="$(count "is:open label:mv3 label:regression label:P0 -label:tracking")"
  OPEN_P1="$(count "is:open label:mv3 label:regression label:P1 -label:tracking")"
  GH_STATUS="enabled"
fi

PASS=1
REASON=""
case "$STAGE" in
  canary|beta)
    if [[ "$OPEN_P0" -ne 0 ]]; then
      PASS=0
      REASON="open mv3 regression P0 issues: $OPEN_P0"
    fi
    ;;
  stable)
    if [[ "$OPEN_P0" -ne 0 || "$OPEN_P1" -ne 0 ]]; then
      PASS=0
      REASON="open mv3 regression blockers (P0=$OPEN_P0, P1=$OPEN_P1)"
    fi
    ;;
esac

cat <<EOF
MV3 Rollout Gate
- Stage: $STAGE
- Repo: $REPO
- GitHub issue checks: $GH_STATUS
- Open mv3 regression P0: $OPEN_P0
- Open mv3 regression P1: $OPEN_P1
EOF

if [[ "$PASS" -eq 1 ]]; then
  echo "Gate result: PASS"
  exit 0
fi

echo "Gate result: FAIL ($REASON)" >&2
exit 3
