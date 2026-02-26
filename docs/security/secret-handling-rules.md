# Secret Handling Rules (MV3)

This document defines where sync/auth secrets may exist and where they must not.

## Allowed Secret Zones

| Zone | Allowed Data | Notes |
|---|---|---|
| `src/background/sync/*` | OAuth access/refresh tokens, WebDAV basic auth material | Privileged background-only flows. |
| Background storage layer (`storage.base` / sync config) | Persisted sync credentials/state | Required for user-enabled sync sessions. |

## Disallowed Secret Zones

1. Content scripts (`src/injected/content/*`).
2. Page-realm bridge code (`src/injected/web/*`) except request field passthrough required by user scripts.
3. Extension UI rendering state (`src/options`, `src/popup`, `src/confirm`) beyond masked user input controls.
4. Diagnostics export payloads in cleartext for token/secret-like keys.

## Required Controls

1. Token-bearing network requests are background-owned.
2. Diagnostics sanitization must redact key names matching secret/token patterns.
3. Remote HTTP transport is forbidden for non-local hosts.
4. Any new sync provider must document credential lifecycle (issue, refresh, revoke).

## Verification

Run per release:

```bash
yarn smoke:mv3:test
```

Manual review:

1. Confirm no new background-to-content messages include auth/token fields.
2. Confirm diagnostics export redaction still covers token/secret-like keys.
