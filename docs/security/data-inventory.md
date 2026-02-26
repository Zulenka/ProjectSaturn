# MV3 Data Inventory and Disclosure Map

This inventory documents major data classes handled by the extension, why they are used, where they are stored, and where they are transmitted.

## Data Classes

| Data Class | Purpose | Source | Stored In | Sent To | Retention | Code References |
|---|---|---|---|---|---|---|
| Extension options/preferences | Feature configuration and UI behavior | User actions in options/popup | `browser.storage.local` (`storage.base`, key `options`) | Not by default | Until user changes/removes | `src/background/utils/options.js`, `src/background/utils/storage.js` |
| Script metadata | Track installed userscript state and config | Script install/update/import flows | `storage.script` (`scr:` prefix) | Sync providers when sync enabled | Persistent until remove | `src/background/utils/db.js`, `src/background/utils/storage.js` |
| Script source code | Execute userscripts and support export/import | Install/update/import | `storage.code` (`code:` prefix) | Sync providers when sync enabled | Persistent until remove | `src/background/utils/db.js`, `src/background/utils/storage.js` |
| Script values (`GM_*Value`) | Persist per-script runtime state | Runtime scripts via API bridge | `storage.value` (`val:` prefix) | Sync providers when sync enabled | Persistent until remove/reset | `src/background/utils/storage.js`, `src/background/utils/storage-cache.js` |
| Cached remote resources/metadata | Performance and update checks | Fetch/update pipeline | `storage.cache` (`cac:`), `storage.mod` (`mod:`), `storage.require` (`req:`) | Fetched from source URLs | TTL/feature-dependent | `src/background/utils/storage-fetch.js`, `src/background/utils/storage.js` |
| Sync credentials/tokens | Authenticate to cloud sync backends | OAuth/password sync setup | Sync config under options (`sync.services.*`) | Dropbox/Google Drive/OneDrive/WebDAV endpoints | Until revoke/overwrite | `src/background/sync/base.js`, `src/background/sync/*.js` |
| Sync payload data | Backup/restore script code + metadata | Sync push/pull | In-memory + storage writes | Provider APIs | Provider/user-controlled | `src/background/sync/base.js`, `src/background/sync/*.js` |
| Network request metadata and headers | Implement GM_xmlhttpRequest and compatibility behavior | Userscript API calls | In-memory request map; partial diagnostics | Remote target URLs requested by scripts | Request lifecycle | `src/background/utils/requests.js`, `src/background/utils/requests-core.js` |
| Runtime diagnostics and error logs | Debugging, triage, export | Background command/events/errors | `diagnosticsLog` in `storage.base` | Exported manually by user | Rolling window (max entries capped) | `src/background/utils/diagnostics.js` |
| Alert state | Surface extension alerts and unread counts | Internal alert generation | `alertsState` in `storage.base` | Not by default | Persistent until cleared | `src/background/utils/alerts.js` |

## Data Flow Notes

1. Privileged operations are background-driven:
- Script/network/storage/sync flows are coordinated in `src/background/*`.
- Content scripts operate as lower-trust message peers and should not receive secrets.

2. Sync is opt-in feature-based:
- Data export to third-party providers occurs only when sync is configured/enabled.
- Provider endpoints are hardcoded in provider modules (`dropbox`, `googledrive`, `onedrive`, `webdav`).

3. Diagnostics contain operational metadata:
- Command names, sender context, and sanitized error details are logged.
- Sensitive value sanitization exists but should be reviewed whenever new log fields are added.

## Disclosure Mapping (Privacy Policy Alignment)

| Disclosure Topic | Current Coverage | Required Action |
|---|---|---|
| What is stored locally | Partially covered | Expand with explicit storage classes (`options`, scripts, values, diagnostics) |
| What is sent over network | Partially covered | Enumerate sync provider traffic and user-initiated request behavior |
| Credentials/tokens handling | Partially covered | Add lifecycle/revocation language for sync tokens/password auth |
| Diagnostics/error logging | Not explicit enough | Add clear statement that diagnostics are local by default and user-exported |
| Retention/deletion behavior | Partial | Add user-facing deletion/reset paths and retention model |

## Security Gaps Identified During Inventory

1. WebDAV transport defaults and HTTP policy have been hardened.
- Location: `src/background/sync/webdav.js`
- Change applied: omitted scheme now defaults to `https://`.
- Change applied: explicit `http://` is now accepted only for local/private hosts.

2. Dynamic-code fallback has been constrained for MV3 flows.
- Location: `src/background/utils/tabs.js`
- Change applied: MV3 string-code fallback is now hard-disabled.
- Follow-up: reduce remaining non-MV3 legacy shim surface over time.

3. Broad host/content scope remains.
- Location: `src/manifest.yml` (template uses `<all_urls>`), converted into MV3 host permissions.
- Risk: overbroad access and review friction.
- Action: permission-to-feature reduction pass.

## Next Steps

1. Update `PRIVACY_POLICY.md` to explicitly cover data classes and flows listed above.
2. Document data deletion and reset paths in user-facing docs.
