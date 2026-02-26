# Background Message Contract Specification

This document defines the minimum security contract for messages entering background command routing.

## Entry Point

- Primary handler: `src/background/index.js` -> `handleCommandMessage`.

## Required Payload Shape

Incoming message must satisfy all of:

1. Payload is a non-null object.
2. Payload is not an array.
3. `cmd` is a non-empty string.
4. `cmd.length <= 128`.

If any check fails, message is rejected and logged as:

- `command.rejected.invalidPayload`
- or `command.rejected.invalid`

## Command Resolution Rules

1. Command must exist in internal command registry (`commands` object).
2. Unknown commands are ignored and logged (`command.ignored`).
3. Commands marked `isOwn` require extension-origin context unless explicitly faked for trusted internal direct calls.

## Sender Trust Rules

1. Treat content/page-origin messages as untrusted input.
2. Do not execute privileged flows unless:
  - command is registered,
  - sender/origin checks pass,
  - command-level logic validates data.

## Error Handling Contract

1. Command execution errors are normalized to serializable `Error` objects.
2. Failures are logged in diagnostics via `logCommandFailed`.

## Negative Test Cases (Required Per Release)

1. Non-object payload (`null`, string, array) is rejected safely.
2. Empty/oversized command name is rejected safely.
3. Unknown command is ignored without privileged side effects.
4. `isOwn` command from non-extension origin is rejected.

## Enforcement Hooks

- CI runtime contract check:
  - `scripts/check-mv3-runtime-contracts.js`
- MV3 smoke gate:
  - `yarn smoke:mv3:test`
