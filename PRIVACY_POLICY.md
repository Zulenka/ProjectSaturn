# ProjectSaturn Privacy Policy

Effective date: February 25, 2026

This Privacy Policy describes how ProjectSaturn (a userscript-manager browser extension based on Violentmonkey) handles information.

This document applies to the extension code in this repository. It does not override the privacy policies of websites you visit, sync providers you enable, or third-party userscripts you install.

## Important Disclaimer

ProjectSaturn executes user-installed scripts. Third-party userscripts can read page data and can send data to remote servers according to each script's code and permissions. You are responsible for reviewing and trusting any userscript you install.

## Summary

- No built-in advertising or analytics SDK is included in the extension code.
- Data is stored locally by default in browser extension storage.
- Network activity occurs for extension features (such as script installs/updates and optional sync) and for userscript-requested operations.
- The extension can process sensitive page data because userscripts run on pages you allow.

## Information Processed

### 1. Data Stored Locally (by default)

ProjectSaturn stores data in browser extension storage, including:

- Installed userscript code and metadata (`@name`, `@match`, `@grant`, update URLs, etc.).
- Userscript state and options (enabled/disabled status, per-script settings).
- Userscript values (for APIs such as `GM_setValue` / `GM_getValue`).
- Cached script resources and update metadata.
- Extension settings and UI preferences.
- Alert records (local alert history).
- Diagnostics records (local troubleshooting/event logs).

### 2. Runtime Data Processed

During operation, the extension processes:

- Page URL, tab/frame identifiers, and injection state to decide which scripts run.
- Script install/update metadata and downloaded script content.
- Request/response data needed for userscript network APIs (for example `GM_xmlhttpRequest` flows).
- Notification content shown to the user.
- Clipboard data only when a script/user action invokes clipboard-related APIs.

### 3. Optional Diagnostics Data

If diagnostics features are used, local logs may include:

- Command names and execution outcomes.
- Sanitized payload previews and error messages/stacks.
- Sender metadata such as tab ID, frame ID, URL/origin (when available).

Diagnostics are kept locally unless you explicitly export/share them.

## When Data Leaves Your Device

Data may be transmitted in the following cases:

- Script install/update checks and downloads (`@updateURL`, `@downloadURL`, install links).
- Script resource loads (`@require`, `@resource`, `@icon` URLs).
- Userscript-initiated network requests permitted by script metadata/API usage.
- Optional sync service operations if you configure sync.

## Optional Cloud Sync

ProjectSaturn supports optional sync providers (for example Dropbox, Google Drive, OneDrive, and WebDAV). If enabled by you, sync data may include script code, script metadata, and related configuration data needed for synchronization.

Authentication tokens and sync state are stored in extension configuration to maintain sync sessions.

If you do not enable sync, sync providers are not used.

## Permissions and Why They Exist

Depending on target build/browser, the extension may request permissions such as:

- `tabs`, `<all_urls>`: match/inject scripts on pages.
- `webRequest` / `webRequestBlocking` or MV3 DNR equivalents: userscript/install/update request handling.
- `storage`, `unlimitedStorage`: save scripts/settings/values/logs.
- `notifications`: show extension/script notifications.
- `contextMenus`: extension menu commands.
- `clipboardWrite`: clipboard API support.
- `cookies`: request/session compatibility for script/network features.
- MV3 permissions such as `scripting`, `userScripts`, `offscreen`, `declarativeNetRequest`: modern injection and request handling paths.

## Data Sharing and Sale

- ProjectSaturn does not include built-in ad-tech or telemetry pipelines in this repository.
- ProjectSaturn does not sell personal information.
- Data is shared externally only as required by:
  - Your installed scripts and their configured endpoints.
  - Your chosen sync provider(s).
  - Script install/update/resource hosts.

## Retention

- Local extension data remains until you remove scripts, clear data, or uninstall the extension.
- Diagnostics and alerts use bounded local logs and may be rotated/trimmed.
- Exported diagnostics files are stored where you choose to save them.

## Security Notes

- Extension storage protections are subject to your browser/profile security.
- Any third-party userscript can materially affect privacy and security.
- Only install scripts from sources you trust, and review permissions (`@grant`, `@connect`, matches).

## Your Controls

You can:

- Disable/remove scripts.
- Disable extension injection.
- Clear local diagnostics/alerts.
- Disable or remove sync configuration.
- Uninstall the extension to remove extension-managed local data.

## Changes to This Policy

This policy may be updated as features change. The latest version in this repository is the authoritative version for this project.

## Contact

For questions or issues, use this repository's issue tracker:

- https://github.com/Zulenka/ProjectSaturn/issues
