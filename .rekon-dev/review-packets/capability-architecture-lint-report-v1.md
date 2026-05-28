# Review Packet: CapabilityArchitectureLintReport v1 Implementation

Thirty-eighth slice on the codebase-intel-classic
capability-ontology track. Implements the Capability-
Aware Architecture Linting Decision (shipped at
`23d3663`) as a separate evaluation artifact —
`CapabilityArchitectureLintReport` — with v1 scope
limited to `allowed/forbidden layer` and
`allowed/forbidden system` rules.

## CHANGES MADE

- `packages/kernel-repo-model/src/index.ts`
  - Added types: `CapabilityArchitectureLintStatus`,
    `CapabilityArchitectureLintRule`,
    `CapabilityArchitectureLintSeverity`,
    `CapabilityArchitectureLintConfidence`,
    `CapabilityArchitectureLintFindingCandidate`,
    `CapabilityArchitectureLintRow`,
    `CapabilityArchitectureLintSummary`,
    `CapabilityArchitectureLintSource`,
    `CapabilityArchitectureLintReport`.
  - Added `createCapabilityArchitectureLintReport`
    factory (deterministic ordering, summary recompute).
  - Added
    `validateCapabilityArchitectureLintReport`,
    `assertCapabilityArchitectureLintReport`,
    `capabilityArchitectureLintReportSchema`.
- `packages/sdk/src/index.ts` — registered
  `CapabilityArchitectureLintReport` as an experimental
  artifact type.
- `packages/runtime/src/index.ts` — registered the
  artifact category as `"findings"` (evaluation lives
  in the findings directory but **does not** mutate
  governed-findings pipeline artifacts).
- `packages/capability-model/src/capability-architecture-lint.ts`
  (new) — `buildCapabilityArchitectureLintReport` helper
  implementing v1 evaluation rules:
  - `allowed-layer` / `forbidden-layer`:
    `pass` / `violation` / `not-evaluated`.
  - `allowed-system` / `forbidden-system`:
    `not-evaluated` (no deterministic system field on
    phrase-backed capabilities yet).
- `packages/capability-model/src/index.ts` — exported
  `buildCapabilityArchitectureLintReport`,
  `BuildCapabilityArchitectureLintReportInput`,
  `CAPABILITY_ARCHITECTURE_LINT_ARTIFACT_ID_PREFIX`,
  `CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY`.
- `packages/cli/src/index.ts` — added
  `rekon capability lint architecture` CLI command with
  `--root`, `--json`, `--capability-contract`, and
  `--capability-map` flags. Writes the lint report under
  `.rekon/artifacts/findings/`. Prints "No findings
  were written." in human mode.
- New docs: `docs/artifacts/capability-architecture-lint-report.md`,
  `docs/concepts/capability-aware-architecture-linting.md`.
- 11 supporting docs cross-referenced (capability-
  contract artifact + concept, capability-map artifact,
  capability-phrase-report artifact, capability-aware
  architecture linting decision, finding-report
  artifact, finding-lifecycle concept, graph-aware
  finding filters concept, coherency-delta concept,
  capability-ontology concept, roadmap, classic-
  behavior-roadmap).
- New contract test
  `tests/contract/capability-architecture-lint-report.test.mjs`
  (23 assertions including all 22 required).
- New docs test
  `tests/docs/capability-architecture-lint-report.test.mjs`
  (12 assertions).
- CHANGELOG + README updated.

## PUBLIC API CHANGES

- New artifact type:
  `CapabilityArchitectureLintReport` (schemaVersion
  `0.1.0`, stability `experimental`).
- New public exports from `@rekon/kernel-repo-model`:
  types + `createCapabilityArchitectureLintReport`,
  `validateCapabilityArchitectureLintReport`,
  `assertCapabilityArchitectureLintReport`,
  `capabilityArchitectureLintReportSchema`.
- New public exports from `@rekon/capability-model`:
  `buildCapabilityArchitectureLintReport`,
  `BuildCapabilityArchitectureLintReportInput`,
  `CAPABILITY_ARCHITECTURE_LINT_ARTIFACT_ID_PREFIX`,
  `CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY`.
- New CLI command:
  `rekon capability lint architecture`.

## PURPOSE PRESERVATION CHECK

Original problem:

> CapabilityContract records configured capability
> policy. That policy is visible in architecture
> summary and agent contract. But policy is not yet
> evaluated. Rekon needs an inspectable lint/evaluation
> artifact before any new policy signal can enter
> governed findings.

This slice produces the artifact. It preserves the
product guarantee:

- `CapabilityArchitectureLintReport` is **evaluation**,
  not enforcement.
- `CapabilityContract` remains policy input. Never
  mutated.
- `CapabilityMap` remains projection input. Never
  mutated.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, and `CoherencyDelta` are
  not mutated.
- Operators can inspect policy violations before any
  future finding bridge.

## CODEBASE-INTEL ALIGNMENT

The implementation matches the capability-aware
architecture linting decision (Option B): emit a
separate `CapabilityArchitectureLintReport` artifact
when capability-aware linting eventually ships, with
v1 scope limited to placement rules. The decision is
honored verbatim:

- No `FindingReport` mutation.
- No `FindingLifecycleReport` mutation.
- No `CoherencyDelta` mutation.
- No resolver routing.
- No verification planning.
- No `RefactorPreservationContract`.
- No source writes.
- No LLM-only inference.

## ARTIFACT MODEL

- `source.capabilityContractRef` + `source.capabilityMapRef`
  pin both inputs.
- `summary` re-derived from `rows` (validator rejects
  mismatched counts).
- `rows` sorted by
  `(contractId asc, rule asc, phraseCapabilityId asc,
  id asc)`.
- `byRule` and `bySeverity` keys are sorted
  ascending.
- Identical input → byte-identical output (apart from
  `header.generatedAt` / `header.artifactId`, both
  controllable by the caller).

## RULE EVALUATION MODEL

- Only `configured` contract rows are evaluated.
  `unmatched` rows are skipped.
- For each configured row, the helper looks up the
  matched phrase-backed capability by
  `capabilityRef.phraseCapabilityId`.
- If the phrase-backed capability is missing, emits
  one `not-evaluated` row per declared placement rule.
- `allowed-layer`: `pass` if layer in
  `allowedLayers`; `violation` otherwise.
- `forbidden-layer`: `violation` if layer in
  `forbiddenLayers`; `pass` otherwise.
- `allowed-system` / `forbidden-system`: always
  `not-evaluated` in v1 (no deterministic system
  field on phrase-backed capabilities yet).
- `findingCandidate` populated for `violation` rows
  only; preview only — no `FindingReport` is written.

## CLI SURFACE

```sh
rekon capability lint architecture \
  [--capability-contract <id|type:id>] \
  [--capability-map <id|type:id>] \
  [--root <path>] [--json]
```

Behavior:

- Reads latest `CapabilityContract` unless pinned.
- Reads latest `CapabilityMap` unless pinned.
- Writes `CapabilityArchitectureLintReport` under
  `.rekon/artifacts/findings/`.
- Prints summary.
- Says "No findings were written." in human mode.
- Does **not** write `FindingReport`.
- Does **not** mutate `FindingLifecycleReport`.
- Does **not** mutate `CoherencyDelta`.
- Does **not** mutate `CapabilityContract` or
  `CapabilityMap`.

## FINDING BRIDGE BOUNDARY

`findingCandidate` is a **preview** payload on
`violation` rows. It is not a finding. v1 never writes
`FindingReport`. A future explicit bridge slice may
promote selected lint rows through the finding
lifecycle, but no bridge ships in v1.

Pinned verbatim:

- "Does not lint at v1" — incorrect for slice 38; we
  now lint at v1. The decision-only constraint is
  honored at the slice-37 boundary.
- "Does not add resolver routing." — still honored.
- "Does not add verification planning." — still
  honored.
- "Does not resolve capability ambiguity beyond
  CapabilityMap v2." — still honored.
- "Does not introduce RefactorPreservationContract."
  — still honored.
- "Does not add source writes." — still honored.

## TESTS / VERIFICATION

- Contract test:
  `tests/contract/capability-architecture-lint-report.test.mjs`
  — 23 cases (validator, pass/violation/
  not-evaluated for each rule kind, missing
  phrase-backed, unmatched rows, summary counts,
  byRule / bySeverity determinism, CLI write, CLI
  pinned flags, CLI human output, CLI does not
  mutate `CapabilityContract`, `CapabilityMap`,
  `FindingReport`, `FindingLifecycleReport`,
  `CoherencyDelta`, `artifacts validate` remains
  clean, runtime registry registration).
- Docs test:
  `tests/docs/capability-architecture-lint-report.test.mjs`
  — 12 cases.
- Final 9-command gate (typecheck / test / build /
  diff-check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke /
  install-tarball-smoke) ran clean.

## INTENTIONALLY UNTOUCHED

- `CapabilityContract` type + `.rekon/capability-contracts.json`.
- `CapabilityMap` type and producer.
- `CapabilityPhraseReport` type and producer.
- `EvidenceGraph` type and producer.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `CoherencyDelta`
  artifacts and producers.
- Resolver routing, verification planning, source
  write reconciliation.

## RISKS / FOLLOW-UP

- v1 cannot evaluate system rules — every
  `allowed-system` / `forbidden-system` row lands as
  `not-evaluated`. A follow-up slice would add a
  deterministic `system` field to phrase-backed
  capabilities, then promote those rules.
- `requiredChecks` is reserved as a row kind but not
  evaluated. The verification pipeline remains
  separate; a future slice may bridge selected
  required-check rows into `VerificationPlan` (with
  explicit operator opt-in).
- Neighbor / preservation rules are deferred until
  later capability tooling exists.
- Finding bridge: explicit future slice required.

## NEXT STEP

Recommended:

```
CapabilityArchitectureLintReport safety review
```

Purpose: review the lint artifact and confirm it is
safe/stable before any publication surfacing or
finding bridge decision. Still no `FindingReport`
mutation, no `CoherencyDelta` mutation, no resolver
routing, no verification planning, no source writes.
