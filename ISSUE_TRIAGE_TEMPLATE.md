# Issue Triage Template (Violentmonkey Backlog)

Use this template to triage issues from the backlog snapshot consistently and quickly.

## 1. Triage Record Template

Copy/paste per issue into your tracking doc (or adapt to CSV columns).

```md
Issue: #<number> - <title>
URL: <issue_url>

Type: bug | enhancement | support | docs | policy | external
Area: sync | editor | ui | injection | network | storage | browser-compat | release | docs | other
Priority: P0 | P1 | P2 | P3
Repro Status: reproducible | needs-info | not-reproducible | not-applicable
Impact: widespread | moderate | localized | low
Browser Scope: firefox | chromium | opera | edge | all | unknown

Disposition: fix | duplicate | close-external | close-unsupported | close-stale | defer-canonical | needs-maintainer-decision
Owner: <name>
Milestone: <milestone or blank>

Notes:
- <key observation>
- <repro summary or blocker>
- <links to duplicate/canonical issues if any>
```

## 2. Type Classification Rules

Use these rules to classify fast:

- `bug`
  - behavior previously worked or should work but does not
  - incorrect output, crash, broken UI, failed request, failed sync, etc.
- `enhancement`
  - new behavior, UX improvement, new option, new API support
- `support`
  - user is asking how to use something, unclear environment issue, configuration question
- `docs`
  - documentation or example gaps
- `policy`
  - support stance, roadmap, browser support decision, maintenance boundary
- `external`
  - upstream browser/site/platform limitation, not fixable in extension code alone

## 3. Area Mapping (Component Buckets)

- `sync`
  - cloud sync, import/export, sync state machine, credentials, conflict behavior
- `editor`
  - code editor, syntax highlighting, autocomplete, formatting, editor UX
- `ui`
  - dashboard, popup, options page, layout, visuals, navigation
- `injection`
  - userscript injection timing/realm/frame/content-script/page-script behavior
- `network`
  - `GM_xmlhttpRequest`, headers, cookies, CORS behavior, downloads
- `storage`
  - script storage, values, cache, persistence performance/corruption
- `browser-compat`
  - Firefox/Chromium/Opera/Edge-specific issues, manifest/runtime compatibility
- `release`
  - packaging, store publishing, versioning, CI artifacts
- `docs`
  - README/site/help text

## 4. Priority Rubric

### P0 (Urgent)

- Data loss/corruption
- Security/privacy issue
- Extension fails to load/start for supported browsers
- Script injection broadly broken
- Sync/export/import causing irreversible user impact

### P1 (High)

- Major feature broken with clear repro
- Browser-specific regression affecting many users
- Frequent issue with strong user impact/workaround poor or none

### P2 (Normal)

- Localized bug with workaround
- Accepted enhancement with clear scope
- UI/editor issue not blocking core workflows

### P3 (Low)

- Nice-to-have enhancement
- Ambiguous feature request
- Low-impact polish items

## 5. Repro Status Rules

- `reproducible`
  - You reproduced on current build (note browser/version)
- `needs-info`
  - Missing repro steps, environment/version, logs, sample script, etc.
- `not-reproducible`
  - Tried on current build and cannot reproduce
- `not-applicable`
  - For policy/docs/duplicate closure cases

Minimum repro data to request for bugs:
- browser + version
- extension version
- OS
- steps to reproduce
- expected result
- actual result
- sample userscript / URL (if safe to share)

## 6. Disposition Rules (What To Do With The Issue)

- `fix`
  - actionable bug or accepted feature with aligned scope
- `duplicate`
  - same root issue already tracked elsewhere
- `close-external`
  - upstream browser/site limitation or third-party behavior
- `close-unsupported`
  - unsupported browser/version/platform/configuration
- `close-stale`
  - insufficient info after request and waiting period
- `defer-canonical`
  - move under a broader tracking issue (e.g., MV3 migration)
- `needs-maintainer-decision`
  - product direction/policy needed before coding

## 7. Quick Triage Checklist (Per Issue)

1. Is this a PR accidentally included? If yes, skip from issue backlog.
2. Is it obviously a duplicate?
3. Is it a support question that should become docs?
4. Is it blocked by browser policy/support stance?
5. Can you classify area and priority in under 60 seconds?
6. If bug: does it have enough info to reproduce?
7. Choose disposition and next action.

## 8. Standardized Response Templates (Canned Replies)

## A. Needs More Info (Bug)

```md
Thanks for the report. I can’t reproduce this yet from the current details.

Please provide:
- Browser + version
- Violentmonkey version
- OS
- Exact steps to reproduce
- Expected result vs actual result
- A minimal userscript/sample page (if possible)

Without a reproducible case, this is hard to fix safely.
```

## B. Duplicate

```md
Thanks for reporting this. This is being tracked in #<canonical_issue>.

I’m closing this as a duplicate to keep discussion and fixes in one place.
If you have additional repro details not covered there, please add them to #<canonical_issue>.
```

## C. External Limitation (Browser / Site)

```md
Thanks for the report. This appears to be caused by browser/site behavior outside of Violentmonkey’s control.

I’m closing this as an external limitation. If the upstream behavior changes, we can reevaluate.
```

## D. Unsupported Environment / Policy

```md
Thanks for the report. This environment/browser configuration is not currently supported by project policy.

I’m closing this issue, but if support policy changes in the future we can revisit it.
```

## E. Stale / Not Reproducible

```md
I’m unable to reproduce this on a current build, and there hasn’t been enough follow-up information to continue investigation.

Closing for now. If you can reproduce it on the latest version, please open a new issue with detailed steps and environment info.
```

## F. Deferred To Canonical Tracking Issue

```md
Thanks for the suggestion/report. This fits into the broader tracking issue #<canonical_issue>.

I’m closing this to keep implementation planning centralized in the canonical thread.
```

## 9. Triage Spreadsheet / CSV Columns (Recommended)

Use these exact columns if you want a sortable spreadsheet:

```text
issue_number,title,url,type,area,priority,repro_status,impact,browser_scope,labels_current,disposition,owner,milestone,created_at,updated_at,comments_count,notes
```

## 10. Batch Processing Strategy (For 80-Issue Snapshot)

Recommended order:
1. `bug` + `sync` + `interoperability`
2. `browser-compat` / policy-linked issues
3. `ui` / `editor`
4. remaining `enhancement` issues

Batch-close patterns:
- duplicates
- stale/no-repro
- unsupported browser policy cases
- external limitations

## 11. Definition of Done (Triage Stage)

An issue is considered triaged when:
- It has `type`, `area`, `priority`, `repro_status`
- It has a disposition selected
- It has either:
  - a clear next action (for `fix`)
  - a closure reason + canonical link/template response

