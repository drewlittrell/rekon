# Review packet — CapabilityContract v1 implementation

**Slice:** thirty-third on the capability-ontology track.

**Scope:** register the `CapabilityContract` artifact
type, ship the reference producer in
`@rekon/capability-model`, and add the
`rekon capability contract generate` CLI command. The
artifact carries operator-authored binding rules
(placement, neighbors, required verification checks,
preservation notes) and a citation chain back into
`CapabilityMap` v2.

**Status:** Shipped.

## What changed

### Code

- `packages/kernel-repo-model/src/index.ts` — added
  `CapabilityContract*` types, `createCapabilityContract`
  constructor, `validateCapabilityContract` validator,
  `assertCapabilityContract` assert, and
  `capabilityContractSchema` export. Validator pins:
  - `configured` rows MUST carry
    `capabilityRef.capabilityMapRef` +
    `capabilityRef.phraseCapabilityId`,
  - `unmatched` rows MUST NOT carry any policy fields,
  - `configured` rows MUST carry at least one populated
    policy field,
  - `summary.*` counts are re-derived from `contracts`
    and must agree.
- `packages/sdk/src/index.ts` — added
  `{ type: "CapabilityContract", schemaVersion: "0.1.0",
  stability: "experimental" }` to
  `BUILT_IN_ARTIFACT_TYPES`.
- `packages/runtime/src/index.ts` — registered
  `CapabilityContract: "actions"` in
  `ARTIFACT_CATEGORY_BY_TYPE`. No new `ArtifactCategory`
  enum value added; `actions` is the existing home for
  operator-decision / policy artifacts
  (`VerificationPlan`, `WorkOrder`, `ReconciliationPlan`,
  `IntentMap`, `CapabilityNormalizationReviewLedger`,
  `CapabilityOntologySuggestionReport`).
- `packages/capability-model/src/capability-contract.ts`
  — new `buildCapabilityContract` helper. Deterministic
  over JSON input. Match semantics: conjunctive (`verb`
  + `noun` required; `domain` / `pattern` / `layer`
  checked when populated); most-specific match wins;
  ties break by phrase-backed `id` ascending.
- `packages/capability-model/src/index.ts` — re-export
  `buildCapabilityContract` +
  `CapabilityContractConfig` +
  `BuildCapabilityContractInput`.
- `packages/cli/src/index.ts` — new
  `rekon capability contract generate
  [--root <path>] [--json]
  [--capability-map <id|type:id>]` command. Reads
  optional `.rekon/capability-contracts.json`, parses
  it, hashes it (`sha256` over canonical JSON), reads
  the latest (or specified) `CapabilityMap`, and writes
  the artifact under `actions/`. Human mode prints the
  diagnostic-only reminder and re-states the
  CapabilityMap-unchanged invariant.

### Docs

- New artifact reference:
  [`docs/artifacts/capability-contract.md`](../../docs/artifacts/capability-contract.md).
- New concept doc:
  [`docs/concepts/capability-contracts.md`](../../docs/concepts/capability-contracts.md).
- Updated decision memo
  [`docs/strategy/capability-contract-architecture-decision.md`](../../docs/strategy/capability-contract-architecture-decision.md)
  Implementation Sequence row 3 to ✅ Shipped.
- Updated supporting docs:
  - [`docs/artifacts/capability-map.md`](../../docs/artifacts/capability-map.md)
    points at the policy layer.
  - [`docs/artifacts/capability-phrase-report.md`](../../docs/artifacts/capability-phrase-report.md)
    references `CapabilityContract` as downstream
    policy.
  - [`docs/concepts/capability-ontology.md`](../../docs/concepts/capability-ontology.md)
    layer ladder entry updated to "v1 shipped".
  - [`docs/concepts/architecture-summary-publication.md`](../../docs/concepts/architecture-summary-publication.md)
    notes that v1 implementation has shipped and
    publication surfacing is still gated.
  - [`docs/concepts/agent-operating-contract.md`](../../docs/concepts/agent-operating-contract.md)
    notes the v1 implementation has shipped and agent
    contract surfacing is still gated.
  - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
    new bullet for the thirty-third slice.
  - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
    new bullet for the thirty-third slice.
  - [`README.md`](../../README.md) new section for the
    `rekon capability contract generate` command.
  - [`CHANGELOG.md`](../../CHANGELOG.md) new entry.

### Tests

- New contract test:
  `tests/contract/capability-contract.test.mjs` —
  20 assertions covering shape, eligibility,
  configured / unmatched matching, tie-break, summary
  re-derivation, suggested rows reserved for future,
  config-hash reproducibility, runtime registration,
  and two CLI smoke tests against
  `tests/fixtures/js-ts-ast-evidence`.
- New docs test:
  `tests/docs/capability-contract.test.mjs` —
  21 assertions pinning the new artifact + concept
  docs and the cross-references in supporting docs.

## Invariants preserved

- `CapabilityContract` is **policy**, not projection.
- `CapabilityMap` v2 remains projection and does not
  grow policy fields. The v2 type and validator are
  unchanged in this slice.
- v1 emits **`configured`** and **`unmatched`** rows
  only. `suggested` is reserved for future use.
- `unmatched` rows MUST NOT carry any policy fields.
- The producer is deterministic over its JSON inputs
  (CapabilityMap + optional config).
- The producer does not mutate the supplied
  CapabilityMap.
- The producer does not write to the config file.
- The producer does not read source files.
- The producer does not invoke an LLM.

## What this slice does **not** ship

- No architecture linting against the contract.
- No resolver routing by capability.
- No verification planning by capability.
- No source mutation.
- No config write.
- No publication surfacing (architecture summary, agent
  contract, GitHub Check, PR comment, proof report).
  All publication surfaces remain unchanged.
- No new permission. Producer holds `read:artifacts` +
  `write:artifacts` only.
- No `suggested` rows. The suggestion / review workflow
  ships in a later slice.
- No `RefactorPreservationContract`.
- No npm publish. No version bump.

## CLI smoke summary

Run against `tests/fixtures/js-ts-ast-evidence` with a
written `.rekon/capability-contracts.json`. The CLI
emits the artifact under `.rekon/artifacts/actions/`
and prints both JSON (`--json`) and human-readable
output. The fixture config does not match any v2
phrase-backed capability in the fixture (deliberately
chosen verb / noun pair), so the smoke run exercises
the `unmatched` branch in addition to the metadata
plumbing. The configured / matched branch is exercised
by the in-process contract tests.

## Cross-references

- [`CapabilityContract` artifact reference](../../docs/artifacts/capability-contract.md)
- [`CapabilityContract` concept doc](../../docs/concepts/capability-contracts.md)
- [`CapabilityContract` Architecture Decision](../../docs/strategy/capability-contract-architecture-decision.md)
- [`CapabilityMap` artifact reference](../../docs/artifacts/capability-map.md)
- [`CapabilityPhraseReport` artifact reference](../../docs/artifacts/capability-phrase-report.md)
- [Capability Ontology concept](../../docs/concepts/capability-ontology.md)

## Recommended next slice

`CapabilityContract` v1 safety review — read-only audit
confirming the new producer, validator, and CLI surface
meet the same bar as prior projection-layer safety
reviews before any publication-surfacing decision can
land.
