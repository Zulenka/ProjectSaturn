#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-violentmonkey/violentmonkey}"
PARENT_ISSUE="${2:-1934}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRAFTS="$ROOT/.github/issue-drafts/mv3"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is not installed." >&2
  exit 127
fi

gh auth status >/dev/null

create() {
  local title="$1"
  local body_file="$2"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body-file "$body_file"
}

echo "Creating MV3 child issues in $REPO..."

u1="$(create "MV3 Program: Scope and Architecture Lock" "$DRAFTS/MV3-01.md")"
u2="$(create "Build System: Add Chromium MV3 Manifest and Artifacts" "$DRAFTS/MV3-02.md")"
u3="$(create "Runtime: Remove Background Page Coupling from UI Clients" "$DRAFTS/MV3-03.md")"
u4="$(create "Background Runtime: Service Worker Compatibility Refactor" "$DRAFTS/MV3-04.md")"
u5="$(create "Injection Engine: MV3 API Port and Behavior Parity" "$DRAFTS/MV3-05.md")"
u6="$(create "Network: GM Request and Header/Cookie Flow for MV3" "$DRAFTS/MV3-06.md")"
u7="$(create "Installer: Replace MV2 .user.js Interception Flow" "$DRAFTS/MV3-07.md")"
u8="$(create "Sync: MV3-Compatible OAuth Callback Capture" "$DRAFTS/MV3-08.md")"
u9="$(create "UI: Action/Popup Compatibility for MV3" "$DRAFTS/MV3-09.md")"
u10="$(create "Release: MV3 Staged Rollout and Regression Triage" "$DRAFTS/MV3-10.md")"

echo
echo "Created child issues:"
printf '%s\n' "$u1" "$u2" "$u3" "$u4" "$u5" "$u6" "$u7" "$u8" "$u9" "$u10"
echo
echo "Next command (post parent issue #$PARENT_ISSUE comment draft):"
echo "gh issue comment $PARENT_ISSUE --repo \"$REPO\" --body-file \"$DRAFTS/parent-comment-1934.md\""
