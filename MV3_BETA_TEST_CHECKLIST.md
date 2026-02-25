# MV3 Beta Test Checklist (Chrome + Opera)

Last updated: 2026-02-25

Use this checklist for manual validation before broad MV3 rollout.

## Preconditions

- Build artifacts are fresh:
  - `yarn -s build:all:mv3`
- Extension installed from unpacked `dist-builds/chrome-mv3` (Chrome) or `dist-builds/opera-mv3` (Opera).
- Browser channel meets MV3 userscripts execution baseline (Chromium 135+).
- Test with DevTools closed for service-worker lifecycle realism, then retest with DevTools open for diagnostics.

## Core Install + Injection

1. Open:
   - `https://www.torn.com/forums.php#/!p=threads&f=61&t=16047184`
2. Confirm popup does not show `noninjectable` warning.
3. Run a known simple userscript on page load and verify expected DOM change.
4. Reload tab and verify script runs again without duplicate side effects.

Expected:
- No `Illegal invocation` errors related to `StorageArea`.
- No userscript execution loss on first load or reload.
- No `EvalError`/`unsafe-eval` CSP violations from extension injection paths.
- No CSP violations referencing `javascript:` script URLs from extension install/injection fallback paths.

## `.user.js` Install Intercept

1. Open a valid `.user.js` URL (trusted source and non-trusted source).
2. Verify Confirm flow opens.
3. Open an invalid `.user.js` payload.
4. Verify tab returns to source URL and warning notification appears.

Expected:
- Valid scripts route to confirm/install.
- Invalid scripts are rejected without breaking navigation.

## GM_xmlhttpRequest Fallback (MV3 Offscreen)

1. Run a script that performs `GM_xmlhttpRequest` to allowed targets.
2. Verify request completes and response callbacks fire.
3. Trigger request abort path.

Expected:
- Success callbacks and error/abort callbacks behave as expected.
- No service-worker-context XHR crash.

## WebDAV Sync Path

1. Configure WebDAV sync provider.
2. Trigger sync pull/push.
3. Verify remote directory listing and script data parsing.

Expected:
- No XML parsing failures from service worker.
- Sync results consistent with MV2 behavior.

## Service Worker Resilience

1. Perform normal script run.
2. Wait for worker idle termination (no extension interaction).
3. Re-open target site and popup.

Expected:
- Extension wakes correctly and continues injection/sync behavior.

## MV3 Runtime Health Snapshot (Settings)

1. Open Options -> Settings -> Maintenance.
2. Use `Refresh MV3 Runtime Health`.
3. Record:
   - `userscripts.state`
   - `dnr.hasInstallInterceptRule`
   - `offscreen.contextCount`
   - `extension.buildId`

Expected:
- `userscripts.state` is `ok` after enabling required browser userscripts permission.
- DNR install-intercept rule is present in MV3 session rules.
- Offscreen context count is non-null and stable during active MV3 flows.
- `extension.buildId` matches the intended beta commit/tag under test.

## Console Warnings to Capture

- `Violentmonkey cannot run userscripts in this page ...`
- Any uncaught promise/type errors in extension context
- Any `EvalError` mentioning CSP `unsafe-eval` in extension context
- Any offscreen messaging/request failures

If any failure occurs, log:
- Browser + version
- URL
- Repro steps
- Extension console stack trace
