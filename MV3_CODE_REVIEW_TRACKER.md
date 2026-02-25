# MV3 Code Review Tracker

Last updated: 2026-02-25

This tracker records review-blocking MV3 architecture requirements that must be implemented before final acceptance.

## Live Regression Status (Zulenka/ProjectSaturn)

| Issue | Title | Status | Notes |
| --- | --- | --- | --- |
| #12 | MV3 install regression: Illegal invocation on StorageArea + imageData error during install | Closed | User validated install succeeds in Chrome (2026-02-25). |
| #13 | MV3/Opera regression: userscripts blocked with noninjectable warning on expected scriptable page | Open | Still under investigation/retest on Opera (`torn.com` forum URL). |

## Priority Findings

| ID | Requirement | Current State | Required Implementation | Status |
| --- | --- | --- | --- | --- |
| CR-MV3-01 | Use `chrome.declarativeNetRequest` instead of blocking `webRequest`; use `chrome.offscreen` for WebDAV and `GM_xmlhttpRequest` support paths. | MV3 currently gates/degrades blocking `webRequest` behavior and does not implement `offscreen` flow for these paths. | Replace blocking/interception-dependent logic with DNR rule orchestration and add offscreen-backed execution where background DOM/network flow is required. | Open |
| CR-MV3-02 | Use `chrome.userScripts.register` instead of `executeScript`. | Injection path currently relies on `tabs.executeScript` / `scripting.executeScript` compatibility wrapper. | Re-architect script registration/injection pipeline around `chrome.userScripts.register` with parity for frame/run-at/update lifecycle behavior. | Open |

## Evidence Pointers

- `src/background/utils/requests-core.js`
- `src/background/utils/preinject.js`
- `src/background/utils/tabs.js`
- `src/background/sync/webdav.js`
- `MV3_ARCHITECTURE_DECISIONS.md`
- `MV3_PARITY_GAPS.md`
