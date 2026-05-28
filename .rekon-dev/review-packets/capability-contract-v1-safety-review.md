# Review packet — CapabilityContract v1 safety review

**Slice:** thirty-fourth on the capability-ontology track.

**Scope:** end-to-end read-only audit of the
`CapabilityContract` v1 artifact, helper, validator,
config model, and CLI shipped at `63e7b71`. Strategy /
safety-review batch.

**Status:** Shipped.

## CHANGES MADE

- New strategy memo:
  [`docs/strategy/capability-contract-v1-safety-review.md`](../../docs/strategy/capability-contract-v1-safety-review.md)
  with 11 required headings and 4 required tables
  (surface, matching, boundary, option).
- New docs test:
  `tests/docs/capability-contract-v1-safety-review.test.mjs`
  with 13 assertions.
- Updated cross-references in 9 supporting docs +
  README + CHANGELOG (decision memo, artifact
  reference, concept doc, capability-map artifact
  doc, ontology concept, architecture summary
  publication concept, agent operating contract
  concept, roadmap, classic-behavior roadmap, README,
  CHANGELOG).
- This review packet at
  `.rekon-dev/review-packets/capability-contract-v1-safety-review.md`.

## PUBLIC API CHANGES

None. This is a strategy / safety-review batch. No
source files under `packages/` change. No artifact
type, helper, validator, CLI command, permission, or
publication surface is added, removed, or modified.

## PURPOSE PRESERVATION CHECK

The original purpose of `CapabilityContract` v1 is to
publish an artifact-backed policy record that an
operator has authorised, while keeping the projection
layers (`EvidenceGraph` →
`CapabilityNormalizationReport` →
`CapabilityPhraseReport` → `CapabilityMap` v2)
strictly read-only and free of policy fields.

This safety review confirms:

- `CapabilityContract` is policy, not projection.
- `CapabilityMap` v2 remains projection.
- v1 emits `configured` + `unmatched` rows only;
  `suggested` remains reserved.
- v1 implements no architecture linting, resolver
  routing, verification planning, source writes, or
  `RefactorPreservationContract` behavior.
- The next slice may surface `CapabilityContract`
  in publications (architecture summary, agent
  contract) on the read-only-visibility model, but
  must not create policy enforcement.

## CODEBASE-INTEL ALIGNMENT

This slice does not modify codebase-intel surfaces.
`CapabilityContract` v1 stays under the existing
artifact-store + capability-ontology + intent stack.
The kernel artifact store, the SDK
`BUILT_IN_ARTIFACT_TYPES` registry, the runtime
`ARTIFACT_CATEGORY_BY_TYPE` map, and the
`@rekon/capability-model` projector boundary are
unchanged. No new boundary needs to be enforced as a
result of this review.

## ARTIFACT / CONFIG REVIEWED

- `CapabilityContract` artifact (registered in
  `@rekon/kernel-repo-model`, SDK, and runtime under
  category `actions`).
- `.rekon/capability-contracts.json` config (optional
  operator-supplied file).
- `buildCapabilityContract` helper in
  `@rekon/capability-model/src/capability-contract.ts`.
- `validateCapabilityContract` validator in
  `@rekon/kernel-repo-model/src/index.ts`.
- `rekon capability contract generate` CLI in
  `packages/cli/src/index.ts`.

## MATCHING RULE REVIEW

- Match is conjunctive: exact `verb` + `noun`
  required; `domain` / `pattern` / `layer` checked
  when populated.
- Most-specific match wins (greatest count of
  populated optional fields that agree).
- Ties on specificity break by the phrase-backed
  capability's `id` ascending — `CapabilityMap` v2
  already sorts deterministically.
- v1 reserves `suggested` rows; the helper never
  emits them.
- Empty-policy `configured` rows are dropped before
  emit so the validator never sees them.
- `configHash` is sha256 over canonical JSON of the
  consumed config; reproducible across runs.

## VALIDATOR REVIEW

- Required-field presence enforced.
- Status whitelist enforced.
- `configured` rows MUST carry `capabilityRef` with a
  valid `capabilityMapRef` + non-empty
  `phraseCapabilityId`.
- `unmatched` / `suggested` rows MUST NOT carry
  `capabilityRef` or any policy fields.
- `configured` rows MUST carry at least one populated
  policy field.
- `summary` counts are re-derived from `contracts[]`
  and any mismatch is flagged.
- Duplicate `id` rejection.
- Neighbor sub-arrays validated per element.

Conclusion: strict enough for v1. No additional
invariants required before publication surfacing.

## CLI BOUNDARY REVIEW

- Reads `.rekon/capability-contracts.json` from
  `--root`; missing config is benign.
- Hashes the consumed config with sha256 over
  canonical JSON; stamps into `source.configHash`.
- Resolves `CapabilityMap` via `--capability-map` or
  latest; resolves `CapabilityPhraseReport` via
  `CapabilityMap.phraseSourceRef` with latest as
  fallback.
- Calls `buildCapabilityContract` and writes the
  artifact under `actions/`.
- Prints the diagnostic-only reminder in human mode
  and re-states the CapabilityMap-unchanged
  invariant.
- Holds `read:artifacts` + `write:artifacts` only;
  no new permission.
- Does not write, create, or modify any file under
  the operator's source tree.

## PROJECTION / POLICY BOUNDARY

| Boundary | Decision |
| --- | --- |
| `CapabilityMap` vs `CapabilityContract` | projection vs policy preserved |
| `CapabilityContract` vs linting | no linting |
| `CapabilityContract` vs resolver routing | no routing |
| `CapabilityContract` vs verification planning | no planning |
| `CapabilityContract` vs source writes | no writes |
| `CapabilityContract` vs `RefactorPreservationContract` | refactor-phase layer deferred |

Code-search confirms no source file under `packages/`
reads the `CapabilityContract` artifact today; the
helper + validator + CLI are the only places the
symbol appears.

## RECOMMENDATION

**Declare `CapabilityContract` v1 safe / stable as an
artifact-backed policy layer.**

**Ship `CapabilityContract` publication surfacing
next.** Read-only visibility in the architecture
summary and agent operating contract, on the strict
model already established by the `CapabilityMap` v2
publication safety review. Boundary statement carried
verbatim. No enforcement consumer ships alongside the
publication slice.

Enforcement consumers (architecture linting, resolver
routing by capability, verification planning by
capability, source writes,
`RefactorPreservationContract`) remain deferred and
gated on their own decision + safety review pairs.

## TESTS / VERIFICATION

- 13-assertion docs test
  (`tests/docs/capability-contract-v1-safety-review.test.mjs`)
  pins the verbatim guarantees in the safety review
  memo + CHANGELOG + review packet.
- Existing 20-assertion contract test
  (`tests/contract/capability-contract.test.mjs`)
  and 21-assertion docs test
  (`tests/docs/capability-contract.test.mjs`) still
  pass — this safety-review slice does not change
  runtime behavior.
- 9-command verification gate runs clean:
  typecheck · test · build · diff-check ·
  audit-package-exports · audit-license ·
  publish-dry-run · install-smoke ·
  install-tarball-smoke.

## INTENTIONALLY UNTOUCHED

- All source files under `packages/`.
- All artifact validators.
- All CLI command implementations.
- All publication surfaces (architecture summary,
  agent contract, proof report, GitHub Check, PR
  comment).
- The `.rekon/capability-contracts.json` shape (still
  optional, still operator-authored).
- The `CapabilityContract` artifact shape.
- The `RefactorPreservationContract` layer.

## RISKS / FOLLOW-UP

Tracked, not gating:

- **Per-row config diagnostics.** Malformed config
  rows are silently dropped today; future surfaces
  may want a non-blocking warning. Not a v1 blocker.
- **Cohort dogfood pass.** Run the new CLI against
  external cohort targets and capture configured /
  unmatched row counts. Parallel to the publication
  slice.
- **Publication-surfacing safety review.** Required
  immediately after the publication slice lands;
  same read-only-audit model.
- **Long-deferred enforcement consumers.** Each one
  (architecture linting, resolver routing,
  verification planning, source writes,
  `RefactorPreservationContract`) requires its own
  decision + safety review pair before landing. They
  remain in their own decision queues.

## NEXT STEP

`CapabilityContract` publication surfacing —
architecture summary and agent contract carry a
read-only section citing the latest
`CapabilityContract` ref with the boundary statement
verbatim. Still no linting. Still no resolver
routing. Still no verification planning. Still no
source writes.
