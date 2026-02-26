# MV3 Release Evidence Template

Use this template for every release candidate (`beta` and `stable`) before publishing.

## Release Metadata

- Version:
- Git commit:
- Build date (UTC):
- Target(s): `chrome-mv3` / `opera-mv3`
- Release type: `beta` / `stable`

## Scope of Change

- Summary of feature/security changes:
- Files/modules with security impact:
- High-risk flags:
  - [ ] Permission changes
  - [ ] Host scope changes
  - [ ] Injection/runtime execution changes
  - [ ] Messaging contract changes
  - [ ] Sync/network/data-flow changes

## Policy and Privacy Alignment

- Single-purpose impact statement:
- Privacy policy delta needed:
  - [ ] No
  - [ ] Yes (link and summary)
- Data inventory delta needed:
  - [ ] No
  - [ ] Yes (link and summary)
- Disclosure/consent impact:
  - [ ] No change
  - [ ] Change required

## Manifest and Permission Diff

- Manifest diff reviewed:
  - [ ] `permissions`
  - [ ] `host_permissions`
  - [ ] `content_scripts.matches`
  - [ ] `minimum_chrome_version`
- Justification for each permission/host change:

## Security Verification Outputs

Paste command outputs or CI links:

```bash
yarn smoke:mv3:test
yarn build:all:mv3
yarn verify:artifacts:mv3
```

- Dynamic-code guard:
  - [ ] Passed (`check:mv3:dynamic-code-guards`)
- CSP contracts:
  - [ ] Passed (`check:mv3:csp-contracts`)
- Runtime contracts:
  - [ ] Passed (`check:mv3:runtime-contracts`)
- Blocking-gate contracts:
  - [ ] Passed (`check:mv3:blocking-gates`)
- SW safety:
  - [ ] Passed (`check:mv3:sw-safety`)

## Runtime Validation (Manual)

- Extension loads in clean profile:
  - [ ] Chrome
  - [ ] Opera
- Core journeys verified:
  - [ ] Script install
  - [ ] Script update
  - [ ] Script execution on target pages
  - [ ] Options and popup actions
  - [ ] Sync (if configured)
- Console/runtime errors triaged:
  - [ ] Yes (attach issue links)

## Risk Assessment and Mitigation

- Top 3 risks in this release:
1.
2.
3.
- Mitigations shipped:
- Deferred risks and owners:

## Approval

- Security reviewer:
- Release reviewer:
- Decision:
  - [ ] Approve publish
  - [ ] Approve canary only
  - [ ] Block release
