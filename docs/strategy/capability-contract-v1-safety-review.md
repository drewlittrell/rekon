# CapabilityContract v1 Safety Review

**Slice:** thirty-fourth on the capability-ontology
track.

**Scope:** end-to-end review of the
`CapabilityContract` v1 artifact, helper, validator,
config model, and CLI shipped at `63e7b71`. No runtime
behavior changes in this slice — this memo is a
read-only audit.

## Decision Summary

`CapabilityContract` v1 is **safe / stable** as an
artifact-backed policy layer. The projection / policy
boundary holds: `CapabilityMap` v2 stays a projection,
`CapabilityContract` carries only operator-authored
binding rules, and no consumer in the codebase reads
the new artifact today.

**Recommendation: declare v1 safe / stable. Ship
`CapabilityContract` publication surfacing next, on
the strict read-only-visibility model already used
for `CapabilityMap` v2 publication surfacing.**
Enforcement consumers (architecture linting, resolver
routing by capability, verification planning by
capability, source writes,
`RefactorPreservationContract`) remain deferred and
gated on their own decision + safety review pairs.

Pinned verbatim:

- `CapabilityContract` is policy, not projection.
- `CapabilityMap` v2 remains projection.
- `CapabilityContract` v1 emits configured and
  unmatched rows only; suggested remains reserved.
- `CapabilityContract` v1 does not implement
  architecture linting, resolver routing, verification
  planning, source writes, or
  `RefactorPreservationContract` behavior.
- The next slice may surface `CapabilityContract` in
  publications, but must not create policy
  enforcement.

## Why This Review Exists

The thirty-third slice
([CapabilityContract v1 implementation](#cross-references))
shipped the first **policy** artifact in the Rekon
capability ontology stack. Every layer before it is a
projection (`EvidenceGraph` →
`CapabilityNormalizationReport` →
`CapabilityPhraseReport` → `CapabilityMap` v2). Once
policy lives in an artifact, two failure modes appear:

1. **Boundary creep** — a future change collapses
   policy fields back into the projection layer,
   blurring "what the codebase does" with "what the
   operator wants enforced".
2. **Consumer creep** — a downstream consumer
   (publisher, linter, resolver, verification planner,
   reconciler) treats the new artifact as authority
   *before* a separate decision + safety review pair
   has signed off on that specific enforcement.

This memo audits the v1 implementation against both
failure modes. The audit is read-only: no source files,
helpers, validators, schemas, configs, or CLI surfaces
change in this slice.

## Artifact And Config Reviewed

| Surface | Status | Boundary |
| --- | --- | --- |
| `CapabilityContract` artifact | shipped | policy record only |
| `.rekon/capability-contracts.json` | optional | operator-supplied policy |
| CLI `rekon capability contract generate` | shipped | writes artifact, not config / source |
| publication surfacing | deferred | visibility only (next slice) |

**Artifact (`CapabilityContract`) — what the
validator enforces in v1:**

- `header.artifactType === "CapabilityContract"`.
- `source.capabilityMapRef` is a valid
  `ArtifactRef`; `source.phraseReportRef` is a valid
  `ArtifactRef` when present;
  `source.configPath` / `source.configHash` are
  strings when present.
- `contracts[]` is an array with unique `id`s.
- Each entry's `status` ∈
  `"configured" | "suggested" | "unmatched"`.
- Each entry's `match.verb` and `match.noun` are
  non-empty strings; `match.domain` /
  `match.pattern` / `match.layer` are strings when
  present.
- `configured` rows carry a
  `capabilityRef.capabilityMapRef` (valid ref) and a
  non-empty `capabilityRef.phraseCapabilityId`.
- `unmatched` (and `suggested`) rows do **not** carry
  any policy fields (`allowedLayers`,
  `forbiddenLayers`, `allowedSystems`,
  `forbiddenSystems`, `requiredChecks`,
  `requiredNeighbors`, `forbiddenNeighbors`,
  `preservationRules`, `messages`).
- `configured` rows carry **at least one** populated
  policy field.
- `summary.total`, `.configured`, `.suggested`,
  `.unmatched`, `.withRequiredChecks`,
  `.withPlacementRules`, `.withPreservationRules` are
  non-negative integers **and** are re-derived from
  `contracts[]`; a stale summary fails validation.

**Config (`.rekon/capability-contracts.json`) — what
the producer expects in v1:**

- Top-level `version` string.
- Optional `contracts[]` with `id`, `match.verb`,
  `match.noun` required per row; optional `domain`,
  `pattern`, `layer`, `allowedLayers`,
  `forbiddenLayers`, `allowedSystems`,
  `forbiddenSystems`, `requiredChecks`,
  `requiredNeighbors`, `forbiddenNeighbors`,
  `preservationRules`, `messages`.
- Missing file is allowed (and produces an artifact
  whose `contracts[]` is empty).
- Malformed rows (missing `id` / `verb` / `noun` /
  unsupported type) are dropped silently. The CLI
  surfaces this implicitly via the artifact's `total`
  vs config row count — operators see drift in their
  own diff of the emitted artifact. (See [Follow-Up
  Work](#follow-up-work) — surfacing per-row warnings
  is a candidate refinement for the publication slice
  or a later refinement slice.)

**Conclusion.** Artifact shape + validator
enforcement + config shape together pin the contract
artifact to operator-authored policy. There is no
fallback path that lets unmatched rows acquire policy
fields, and no fallback that lets configured rows
omit their citation back into `CapabilityMap`.

## Matching Rule Review

| Rule | Decision |
| --- | --- |
| exact verb+noun | required |
| domain / pattern / layer | optional specificity |
| most-specific-wins | implemented |
| config order | deterministic tie-break |
| suggested rows | reserved |

**`buildCapabilityContract` matching is
conjunctive.** A config row binds to a
`CapabilityMap` v2 phrase-backed capability iff:

- `phrase.verb === config.verb` (required),
- `phrase.noun === config.noun` (required),
- when `config.domain` is populated,
  `phrase.domain === config.domain`,
- when `config.pattern` is populated,
  `phrase.pattern === config.pattern`,
- when `config.layer` is populated,
  `phrase.layer === config.layer`.

If multiple v2 capabilities match a row, the helper
keeps the one that agrees on the **largest count of
populated optional fields** (specificity). Ties on
specificity break by the phrase-backed capability's
`id` ascending — `CapabilityMap` v2 already sorts
those deterministically, so the tie-break is stable
across runs over identical input.

**Determinism audit.**

- Helper input is JSON only (CapabilityMap + optional
  config). No source reads. No filesystem walks. No
  network. No timestamps influence matching.
- Output ordering is the same `(verb, noun, id)` sort
  used by `createCapabilityContract`, so two runs over
  identical input produce byte-identical artifacts
  modulo `header.generatedAt` / `header.artifactId`
  (which the producer derives from the supplied
  `generatedAt` so tests can pin it).
- `configHash` is sha256 over canonical JSON of the
  supplied config (object keys sorted, arrays as-is).
  Two runs over the identical config produce identical
  hashes.

**Conclusion.** Matching is strict, conjunctive,
most-specific-wins with a deterministic id tie-break.
Operators can predict exactly which v2 capability a
config row will bind to without running the producer.

## Validator Review

The validator at
`packages/kernel-repo-model/src/index.ts`
(`validateCapabilityContract`) enforces:

- Required-field presence (header, source, summary,
  contracts).
- Per-entry status whitelist
  (`configured` | `suggested` | `unmatched`).
- The hard invariants:
  - `configured` rows MUST carry a `capabilityRef`
    with a valid `capabilityMapRef` and a non-empty
    `phraseCapabilityId`;
  - `unmatched` (and `suggested`) rows MUST NOT carry
    a `capabilityRef`;
  - `unmatched` (and `suggested`) rows MUST NOT carry
    any populated policy fields;
  - `configured` rows MUST carry at least one
    populated policy field.
- Summary re-derivation: every count is recomputed
  from `contracts[]` and any mismatch is flagged.
- Duplicate `id` rejection.
- Neighbor sub-arrays carry non-empty `verb` + `noun`
  per element.

**Strictness audit.** The validator catches every
boundary failure I can imagine for v1: a configured
row missing its citation, an unmatched row carrying
forged policy, a stale summary, a duplicate id, a
malformed neighbor, a non-`CapabilityContract`
`artifactType`. The producer's normalization
(`createCapabilityContract`) drops empty-policy rows
before emit so the validator never sees them; the
validator still independently re-checks the invariant,
which means a hand-edited artifact also gets caught.

**Conclusion.** The validator is strict enough for
v1. No additional invariants are needed before
publication surfacing. The only candidate refinements
(non-blocking, deferred): a stricter range bound on
the `version` field of the config, and an optional
warning channel for dropped malformed config rows.

## CLI Boundary Review

The CLI command added at
`packages/cli/src/index.ts`
(`rekon capability contract generate`) holds the
following invariants:

- Reads `.rekon/capability-contracts.json` from
  `--root` when present; missing config is benign.
- Hashes the consumed config with sha256 over
  canonical JSON; stamps `source.configHash` into the
  artifact for future drift detection.
- Reads the latest (or explicitly pinned via
  `--capability-map`) `CapabilityMap` from the local
  artifact store.
- Resolves the optional `CapabilityPhraseReport` ref
  by preferring the `CapabilityMap.phraseSourceRef`
  field; falls back to the latest
  `CapabilityPhraseReport` only if v2 fields are
  absent.
- Calls `buildCapabilityContract` and writes the
  resulting artifact under `actions/`.
- Prints the diagnostic-only reminder in human mode
  ("Diagnostic only. No architecture linting,
  resolver routing, or verification planning by
  capability in v1.") and re-states the
  CapabilityMap-unchanged invariant.

**Source-write audit.** The CLI does **not** write,
create, or modify any file under the operator's
source tree. The only file it creates is the new
`CapabilityContract` artifact under
`.rekon/artifacts/actions/`, written via the runtime
artifact store the way every other Rekon CLI command
writes. The config file is read-only.

**Permission audit.** The CLI does not invoke any new
runtime permission. It runs entirely on
`read:artifacts` + `write:artifacts`.

**Failure modes audited.**

- Missing `CapabilityMap` → explicit error message
  pointing operators at `rekon refresh`.
- Wrong artifact type passed to `--capability-map` →
  explicit error message naming the actual type.
- Malformed `.rekon/capability-contracts.json` (parse
  failure) → explicit error pointing at the path; no
  silent fallback that could emit a misleading
  artifact.
- Missing `.rekon/capability-contracts.json` →
  benign; emits an artifact with empty `contracts[]`.

**Conclusion.** The CLI boundary is clear and
narrow. Operators get a deterministic artifact and a
diagnostic-only reminder. There is no opt-in flag in
v1 to read source files, write source files, mutate
config, or do anything beyond emitting the policy
artifact.

## Projection / Policy Boundary Review

| Boundary | Decision |
| --- | --- |
| `CapabilityMap` vs `CapabilityContract` | projection vs policy preserved |
| `CapabilityContract` vs linting | no linting |
| `CapabilityContract` vs resolver routing | no routing |
| `CapabilityContract` vs verification planning | no planning |
| `CapabilityContract` vs source writes | no writes |
| `CapabilityContract` vs `RefactorPreservationContract` | refactor-phase layer deferred |

**Projection layers (unchanged in this slice).**
`EvidenceGraph`, `CapabilityNormalizationReport`,
`CapabilityPhraseReport`, and `CapabilityMap` v2
remain projection artifacts. `CapabilityMap` v2's
fields, validator, helper, and publishers are
untouched by the v1 implementation slice and
untouched by this safety review.

**Policy layer (`CapabilityContract` v1).** The new
artifact carries only operator-authored binding
rules. Configured rows cite back into
`CapabilityMap` v2 phrase-backed capabilities, but
they never feed back: the producer reads
`CapabilityMap` v2, never writes it; the runtime
store registers `CapabilityContract` under the
`actions` category, not `projections`. There is no
code path that turns a `CapabilityContract` row into
a `CapabilityMap` entry.

**Downstream consumers (deferred).** Every consumer
that *could* read `CapabilityContract` —
architecture linting, resolver routing by capability,
verification planning by capability, semantic impact
analysis, refactor preservation, publication
surfacing — remains deferred. Code-search confirms
no source file under `packages/` reads the
`CapabilityContract` artifact today; the new helper
+ validator + CLI are the only places the symbol
appears.

**Conclusion.** The projection / policy boundary is
preserved by both the artifact registration and the
absence of any downstream consumer.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe / stable policy artifact | selected | strict validator + no consumers |
| publication surfacing next | selected | operators need visibility |
| add enforcement next | rejected | needs surfacing + safety first |
| more dogfood before surfacing | deferred | implementation tests + smoke sufficient for visibility |

**Selected.** Declare v1 safe / stable. Ship
publication surfacing next as read-only visibility
in the architecture summary + agent contract on the
same strict model used for the `CapabilityMap` v2
publication surfacing safety review.

**Rejected.** Add enforcement (architecture linting,
resolver routing, verification planning) before
visibility. Reason: operators and agents need to see
configured / unmatched rows for at least one full
cycle before any consumer treats the artifact as
authority. Shipping enforcement before visibility
removes the operator's ability to review the policy
the agent will be held to.

**Deferred.** More dogfood before surfacing. The v1
implementation already lands with a 20-assertion
contract test + 21-assertion docs test + CLI smoke
matrix. Additional dogfood (against external cohort
repos) is valuable but is not a blocker for read-only
publication surfacing; it can run in parallel with
the publication slice.

## Recommendation

**Declare `CapabilityContract` v1 safe / stable as
an artifact-backed policy layer.**

**Ship publication surfacing as the next slice.**
The surfacing must:

- read-only visibility only (no enforcement);
- carry the boundary statement verbatim
  ("CapabilityContract is policy, not projection";
  "CapabilityMap v2 remains projection";
  "CapabilityContract v1 does not lint, route,
  plan verification, or write source");
- stamp the consumed `CapabilityContract` ref into
  `header.inputRefs` of any surface that surfaces it;
- never mutate `CapabilityContract`,
  `CapabilityMap`, `CapabilityPhraseReport`,
  `CapabilityNormalizationReport`, or
  `EvidenceGraph`.

Surfaces in scope for the publication slice:

- architecture summary publication,
- agent operating contract publication.

Surfaces explicitly **out of scope** for the
publication slice:

- proof report publication (still deferred;
  `CapabilityContract` is not a verification proof),
- GitHub Check publisher,
- PR comment publisher.

## What This Does Not Do

This safety-review batch is read-only. Specifically:

- No source file under `packages/` is modified.
- No artifact validator is modified.
- No helper or CLI command is modified.
- No new artifact type is registered.
- No new permission is registered.
- No publication surface is modified.
- No GitHub Action template is touched.
- No `RefactorPreservationContract` shape is added.
- No `suggested` row workflow is added.
- No architecture linting ships.
- No resolver routing by capability ships.
- No verification planning by capability ships.
- No source writes ship.
- No `CapabilityMap` mutation.
- No `CapabilityPhraseReport` mutation.
- No `EvidenceGraph` mutation.
- No `.rekon/capability-contracts.json` mutation.
- No LLM-only inference.
- No npm publish. No version bump.

## Follow-Up Work

Tracked, not gating this safety review:

- **Publication surfacing** (next slice). Architecture
  summary + agent contract carry a read-only section
  citing the latest `CapabilityContract` ref with
  the boundary statement verbatim.
- **Publication-surfacing safety review** (slice
  after that). Same read-only-audit model used for
  the `CapabilityMap` v2 publication surfacing
  safety review.
- **Per-row config diagnostics**. The CLI silently
  drops malformed config rows today. A later
  refinement can either surface dropped-row counts in
  the JSON output or emit a non-blocking warning in
  human mode. Not a v1 blocker.
- **Cohort dogfood pass on `CapabilityContract`**.
  Run the new CLI against the existing cohort
  targets (boundary-contracts, structured-evals,
  figma-ds) and capture configured / unmatched row
  counts. Parallel to the publication slice.
- **`CapabilityContract` v1 safety review of
  publication surfacing** — required before any
  enforcement consumer is even considered.
- **Long-deferred consumers** remain in their own
  decision queues:
  architecture linting · resolver routing by
  capability · verification planning by capability ·
  source writes · `RefactorPreservationContract`.
  Each requires its own decision + safety review
  pair before landing.

## Cross-references

- [CapabilityContract v1 implementation](capability-contract-architecture-decision.md)
  — thirty-third slice; the implementation reviewed
  by this memo.
- [`CapabilityContract` artifact reference](../artifacts/capability-contract.md)
- [`CapabilityContract` concept doc](../concepts/capability-contracts.md)
- [`CapabilityMap` v2 publication safety review](capability-map-v2-publication-safety-review.md)
  — thirty-first slice; the read-only-audit model
  this memo reuses.
- [`CapabilityMap` v2 safety review](capability-map-v2-safety-review.md)
  — twenty-ninth slice; pins v2 as projection.
- [Capability Ontology concept](../concepts/capability-ontology.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)

## Status

Safety review recorded. Recommendation: declare v1
safe / stable. Recommended next slice:
`CapabilityContract` publication surfacing
(architecture summary + agent contract; read-only;
boundary statement verbatim).

**Update (thirty-fifth slice):** the recommended
next slice — `CapabilityContract` publication
surfacing — has shipped. Architecture summary +
agent contract publishers now render a read-only
**Capability Contracts** section. Proof report
surfacing remains deferred. See the new
[publication-surfacing review packet](../../.rekon-dev/review-packets/capability-contract-publications.md).

**Update (thirty-sixth slice):** the
publication-surfacing safety review has also
shipped — see
[`CapabilityContract` publication safety review](capability-contract-publication-safety-review.md).
Recommendation: publication surfacing is safe /
stable as read-only visibility; next slice is the
capability-aware architecture linting decision
(strategy / decision memo only; no implementation).
