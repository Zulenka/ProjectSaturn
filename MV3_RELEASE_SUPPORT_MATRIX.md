# MV3 Release Support Matrix and Parity Contract

Last updated: 2026-02-25

## Target channels (first MV3 release)

| Channel | Package track | Manifest |
| --- | --- | --- |
| Chrome Web Store | Chromium build (`build:chrome-mv3`) | MV3 |
| Edge Add-ons | Chromium build (`release-edge` path) | MV3 |
| Opera Add-ons | Opera build (`build:opera-mv3`) | MV3 |
| Firefox (AMO) | Firefox build (`build:firefox`) | MV2 |

## Parity target for first MV3 release

The first MV3 release targets parity for core user-visible flows:

- `.user.js` install from supported hosts opens Confirm flow.
- Injection executes correctly in top-frame and frame-targeted paths.
- `run_at` routing (`start`, `end`, `idle`) remains contractually mapped in MV3 injection wrapper.
- Sync OAuth callback flow and first sync transaction complete.
- Update-check/update-apply and export/import base flows complete.
- GM request metadata/cookie handling remains deterministic for supported MV3 model.

## Injection strategy decision

- Primary strategy: runtime orchestration through `scripting.executeScript` in MV3.
- Compatibility strategy: one wrapper (`executeScriptInTab`) normalizes MV2 (`tabs.executeScript`) and MV3 (`scripting.executeScript`) behavior.
- `userScripts` API is not required for first-release parity contract.

## Request/header/cookie behavior contract under MV3 constraints

- Blocking request mutation is not part of first-release MV3 parity for Chromium.
- Passive request/response listeners remain active for deterministic metadata flow.
- Custom store cookie replay behavior remains supported where applicable.
- `xhrInject` mode requiring blocking interception is out-of-scope for MV3 first release.

See also:

- `MV3_PARITY_GAPS.md`
- `MV3_ARCHITECTURE_DECISIONS.md`
- `MV3_MIGRATION_NOTES.md`
