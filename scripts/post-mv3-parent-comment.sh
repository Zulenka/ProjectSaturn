#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-violentmonkey/violentmonkey}"
PARENT_ISSUE="${2:-1934}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BODY_FILE="$ROOT/.github/issue-drafts/mv3/parent-comment-1934.md"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is not installed." >&2
  exit 127
fi

gh auth status >/dev/null
gh issue comment "$PARENT_ISSUE" --repo "$REPO" --body-file "$BODY_FILE"
echo "Posted comment to issue #$PARENT_ISSUE in $REPO."

