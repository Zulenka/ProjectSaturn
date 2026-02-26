# Permission-to-Feature Map (MV3)

This map links declared permissions/hosts to concrete features and code paths to support least-privilege review.

## MV3 Permissions

| Permission / Host | Feature(s) | Primary Code Paths | Keep / Review |
|---|---|---|---|
| `tabs` | Tab targeting, script injection targeting, redirect/install flows | `src/background/utils/tabs.js`, `src/background/utils/tab-redirector.js`, `src/common/index.js` | Keep |
| `webRequest` | Request interception and compatibility hooks used by GM request/injection flows | `src/background/utils/requests-core.js`, `src/background/utils/preinject.js`, `src/background/sync/base.js` | Review for additional MV3 reduction |
| `notifications` | User alerts and system notifications | `src/background/utils/notifications.js`, `src/background/utils/alerts.js` | Keep |
| `storage` | Extension config, scripts, values, diagnostics persistence | `src/background/utils/storage.js`, `src/background/utils/db.js`, `src/background/utils/options.js` | Keep |
| `unlimitedStorage` | Large script/value datasets | Storage subsystem | Review (size metrics recommended) |
| `clipboardWrite` | Clipboard operations from extension actions | `src/background/utils/clipboard.js` | Keep |
| `contextMenus` | Context menu actions/commands | `src/background/utils/icon.js`, command wiring | Keep |
| `cookies` | Cookie routing for GM request behavior and container/incognito handling | `src/background/utils/requests.js`, `src/background/utils/requests-core.js` | Review for narrower use if possible |
| `declarativeNetRequest` | MV3 interception/session rule support | `src/background/utils/tab-redirector.js`, diagnostics checks | Keep |
| `offscreen` | Offscreen document fallback for MV3 fetch/XML parsing | `src/background/utils/offscreen.js`, `src/offscreen/index.js`, `src/background/sync/webdav.js` | Keep |
| `userScripts` | MV3 userscript registration/execution model | `src/background/utils/tabs.js`, `src/background/utils/popup-tracker.js`, diagnostics | Keep |
| `scripting` | MV3 script injection API usage | `src/background/utils/tabs.js` | Keep |
| `<all_urls>` host scope | Userscript/content coverage and request compatibility | `src/manifest.yml` -> MV3 host permissions via `scripts/manifest-helper.js`; content scripts in `src/injected/*` | High-priority reduction candidate |

## MV3 Content Script Scope

| Current Scope | Reason | Review Action |
|---|---|---|
| `content_scripts.matches = <all_urls>` | Extension acts as userscript manager and must observe script-matching/injection opportunities broadly | Evaluate split strategy: narrow default match + user-triggered/activeTab path for non-core pages |

## Immediate Reduction Candidates

1. Assess whether some `webRequest` listeners can be replaced by DNR or moved to narrower filters.
2. Assess narrowing host scope for always-on content scripts, while preserving core userscript functionality.
3. Determine if `unlimitedStorage` is still required based on practical script/value footprint.

## Verification Commands

```bash
yarn build:all:mv3
yarn verify:artifacts:mv3
yarn smoke:mv3:test
```
