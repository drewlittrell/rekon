# Review Packet — CapabilityContract Architecture Decision

Strategy / architecture decision batch.
**Thirty-second slice on the capability-ontology
track.** Commits Rekon to **Option B**:
`CapabilityContract` is an artifact-backed policy
layer generated from operator config + the latest
`CapabilityMap` v2. Decision memo only — no
implementation. **No `CapabilityContract` artifact
type registered, no producer or helper shipped, no
runtime behaviour changed.** No `CapabilityMap`
mutation. No `CapabilityPhraseReport` /
`CapabilityNormalizationReport` / `EvidenceGraph`
mutation. No architecture linting. No resolver
routing. No verification planning. No source
writes. No LLM-only inference. No npm publish. No
version bump. No git tag. No GitHub Release. No
new branch.

## CHANGES MADE

- **New strategy memo**
  `docs/strategy/capability-contract-architecture-decision.md`
  with the 11 required headings (Decision Summary,
  Why This Decision Exists, Current Boundary,
  Options Considered, Recommendation, Config
  Model, Artifact Model, CapabilityMap Boundary,
  RefactorPreservationContract Boundary, Future
  Consumers, What This Does Not Do, Implementation
  Sequence) plus three required tables (option /
  boundary / consumer).
- **New 16-assertion docs test**
  `tests/docs/capability-contract-architecture-decision.test.mjs`
  pinning the seven required boundary statements,
  the three required tables, the eleven
  required headings, the
  `.rekon/capability-contracts.json` config-path
  mention, the CHANGELOG entry, and the review
  packet `PURPOSE PRESERVATION CHECK`.
- **New review packet** (this file).
- **Supporting doc updates** (10):
  - `docs/strategy/capability-map-v2-publication-safety-review.md`
    — Follow-Up Work entry for `CapabilityContract`
    decision marked ✅ shipped.
  - `docs/strategy/capability-map-v2-safety-review.md`
    — Follow-Up Work entry for `CapabilityContract`
    architecture decision marked ✅ shipped.
  - `docs/strategy/capability-phrase-contract-architecture-decision.md`
    — `CapabilityContract` policy-layer note
    tightened to reference this decision memo.
  - `docs/artifacts/capability-map.md` — Related
    Documents adds the `CapabilityContract`
    decision; CapabilityContract Boundary
    cross-link.
  - `docs/artifacts/capability-phrase-report.md`
    — cross-link to the `CapabilityContract`
    decision.
  - `docs/concepts/capability-ontology.md` — Layer
    7 entry references the `CapabilityContract`
    decision and the deferred-consumer list.
  - `docs/concepts/architecture-summary-publication.md`
    — note that the future `CapabilityContract`
    surfacing is gated on its own decision +
    safety review pair.
  - `docs/concepts/agent-operating-contract.md` —
    Section Map row notes the future
    `CapabilityContract` surface is deferred.
  - `docs/strategy/roadmap.md` — new
    thirty-second-slice entry at the top.
  - `docs/strategy/classic-behavior-roadmap.md`
    — new thirty-second-slice entry at the top.
  - `README.md` — new comment block at the top
    of the news section.
  - `CHANGELOG.md` — new top entry.

## PUBLIC API CHANGES

None. Strategy / architecture decision / docs /
tests-only batch. No type changes. No helper
changes. No producer changes. No manifest changes.
No CLI changes. No SDK changes. No artifact
registration. No runtime changes.

The memo *sketches* an artifact shape
(`CapabilityContract` type with `header`,
`source`, `summary`, `contracts[]`) and a config
shape (`.rekon/capability-contracts.json`), but
**does not** ship either. The implementation slice
(next) ships the type, the producer, and the
artifact registration.

## PURPOSE PRESERVATION CHECK

The architecture decision explicitly preserves
every pin from the
[CapabilityMap v2 Publication Safety Review](../../docs/strategy/capability-map-v2-publication-safety-review.md)
and adds seven required boundary statements
(asserted by the docs test):

- **`CapabilityContract` is policy, not
  projection.** The whole point of the decision.
  Verified by the option table (Option D — adding
  policy fields to `CapabilityMap` — is rejected)
  and by the boundary table (separate row from
  `CapabilityMap` v2).
- **`CapabilityMap` v2 remains projection and
  must not grow policy fields.** Verified by the
  *CapabilityMap Boundary* section's explicit
  "what does not change" list, and by Option D's
  rejection.
- **`CapabilityContract` does not implement
  architecture linting by itself.** The Future
  Consumers section names architecture linting as
  a downstream consumer of `CapabilityContract`,
  not as a behaviour of `CapabilityContract`
  itself.
- **`CapabilityContract` does not implement
  resolver routing by capability.** Same pattern
  — resolver routing is downstream.
- **`CapabilityContract` does not implement
  verification planning by capability.** Same
  pattern — verification planning is downstream.
- **`CapabilityContract` does not implement
  source writes.** No `write:source` permission;
  the producer holds `read:artifacts` +
  `write:artifacts` only.
- **`RefactorPreservationContract` remains
  phase-specific and comes later.** A separate
  section pins the persistent-vs-phase-specific
  distinction and the inheritance pattern
  (`RefactorPreservationContract` inherits
  `preservationRules` from `CapabilityContract`).

### Boundary preservation (negative properties)

- `CapabilityContract` artifact registration —
  not done.
- `CapabilityContract` producer / helper / CLI
  command — not shipped.
- `CapabilityMap` mutation — not done.
- `CapabilityPhraseReport` mutation — not done.
- `CapabilityNormalizationReport` mutation — not
  done.
- `EvidenceGraph` mutation — not done.
- Architecture linting from `CapabilityContract`
  — not added.
- Resolver routing by capability — not added.
- Verification planning by capability — not
  added.
- Source writes — not added.
- `RefactorPreservationContract` — not added.
- LLM-only inference — not added.
- New artifact type — not added.
- New invalidation rule — not added (the
  artifact-level `capability-contracts.changed` /
  `capability-map.changed` rules ship with the
  implementation slice).
- CLI command additions — none.
- npm publish — not done.
- Version bump — not done.
- Git tag — not done.
- GitHub Release — not done.
- New branch — not created.

## CODEBASE-INTEL ALIGNMENT

The decision keeps Rekon aligned with the
`codebase-intel-classic` reference intent
surface:

- **Capability contracts / drift reports**:
  classic separated capability claims from
  capability obligations. This memo restates the
  same separation as the projection / policy
  split.
- **Architecture invariants**: classic kept
  invariants in a rulebook layer, separate from
  the snapshot. `CapabilityContract` is the new
  invariant surface (with operator config + an
  audited artifact).
- **Intent gates**: classic gated downstream
  behaviour on explicit policy. The selected
  Option B preserves this by making operator
  config the source of truth and the artifact a
  read-only audit.
- **Verification contracts**: classic linked
  capability changes to required checks. The
  `requiredChecks[]` field on each contract row
  is the explicit mapping point. The verification
  planning consumer (deferred) reads this list.
- **Purpose-preserving refactor planning**:
  classic recorded preservation obligations
  per-refactor. This memo separates standing
  preservation (`CapabilityContract.preservationRules`)
  from phase-specific preservation
  (`RefactorPreservationContract`).

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| reserve name only | rejected/deferred | boundary is clear enough to model |
| config + artifact effective contract | selected | operator policy plus artifact audit |
| artifact-only inferred contract | rejected | projection would become policy |
| add policy fields to CapabilityMap | rejected | blurs projection and policy |
| only inside RefactorPreservationContract | rejected | policy should exist before refactor phase |

Option B carries every classic-alignment
guarantee, every projection / policy boundary the
preceding capability-ontology decisions pinned,
and gives downstream consumers a stable target
shape to plan against. The four rejected options
each break at least one of those constraints.

## CONFIG MODEL

Recommended path: `.rekon/capability-contracts.json`

```json
{
  "version": "0.1.0",
  "contracts": [
    {
      "id": "billing.invoice-preview",
      "match": {
        "verb": "compute",
        "noun": "invoice-preview",
        "domain": "billing"
      },
      "allowedLayers": ["domain", "service"],
      "forbiddenLayers": ["route", "ui"],
      "allowedSystems": ["billing", "pricing"],
      "requiredChecks": ["npm run test -- pricing"],
      "requiredNeighbors": [
        { "verb": "validate", "noun": "coupon" }
      ],
      "forbiddenNeighbors": [
        { "verb": "capture", "noun": "payment" }
      ],
      "preservationRules": [
        "Preserve tax rounding behavior.",
        "Preserve expired-coupon rejection semantics."
      ]
    }
  ]
}
```

Rules:

- Missing config is allowed (empty `contracts[]`
  on the artifact).
- No inferred contract becomes binding without
  config or explicit generated-review status.
- The `match` block is conjunctive.
- Operators authorise every binding rule. Rekon
  never writes the config file.

## ARTIFACT MODEL

Sketch in the memo's *Artifact Model* section.
Key guarantees:

- v1 emits only `configured` and `unmatched`
  rows. `suggested` is deferred.
- Every `configured` row cites the consumed
  `CapabilityMap` and the matched
  `phraseCapabilityId`.
- `header.inputRefs` includes the consumed
  `CapabilityMap` ref and (when present) the
  `CapabilityPhraseReport` ref.
- Manifest carries new invalidation rules
  `capability-contracts.changed` (config) and
  `capability-map.changed` (artifact).
- No new permission. No `write:source`. No
  `write:rules`.
- Validator enforces: at least one policy field
  populated for `configured` rows; no policy
  fields for `unmatched` rows;
  `phraseCapabilityId` non-empty;
  `capabilityMapRef` valid.

## BOUNDARY MODEL

| Layer | Responsibility |
| --- | --- |
| `CapabilityPhraseReport` | semantic purpose projection |
| `CapabilityMap` v2 | stable capability projection |
| `CapabilityContract` | placement / proof / preservation policy |
| `RefactorPreservationContract` | phase-specific refactor obligations |

`CapabilityContract` is the **policy** layer.
Architecture linting, resolver routing by
capability, and verification planning by
capability sit above and consume it.
`RefactorPreservationContract` is a phase-specific
extension that inherits `preservationRules` from
`CapabilityContract`.

## FUTURE CONSUMERS

| Future Consumer | How CapabilityContract Helps |
| --- | --- |
| architecture linting | checks allowed / forbidden placement |
| resolver routing | routes by configured capability ownership/policy |
| verification planning | maps capability changes to required checks |
| semantic impact | identifies neighboring capability constraints |
| refactor preservation | provides preservation rules |
| agent contract / architecture summary publications | renders configured contracts as policy context |

**All consumers are deferred until the contract
artifact exists and passes safety review.** No
consumer ships in this slice or the next. Each
consumer ships its own decision memo before
runtime work lands.

## TESTS / VERIFICATION

- New 16-assertion docs test passes.
- All previously-passing tests still pass (2652
  pass / 0 fail / 10 skipped baseline from the
  thirty-first slice).
- 9-command verification gate (typecheck, test,
  build, diff-check, audit-package-exports,
  audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke) passes.
- No CLI smoke required (strategy / architecture
  decision only).
- No new dependencies. No new exports. No new
  files outside the `docs/` / `tests/docs/` /
  `.rekon-dev/review-packets/` surfaces.

## INTENTIONALLY UNTOUCHED

- `packages/kernel-repo-model/src/**` — no type
  changes. `CapabilityContract` type is sketched
  in the memo only.
- `packages/sdk/src/**` — no artifact type
  registration. `CapabilityContract` is not in
  the registry yet.
- `packages/runtime/src/**` — no producer
  registration.
- `packages/capability-docs/src/**` — no
  publication surfacing helper. The future
  surfacing slice (gated on v1 implementation +
  safety review) adds one.
- `packages/capability-model/src/**` — producer
  unchanged.
- `packages/capability-ontology/src/**` —
  producer unchanged.
- `tests/contract/**` — no contract test for
  `CapabilityContract` yet (lands with v1
  implementation).
- All existing publication / CLI surfaces — no
  v2 mutation, no v1 mutation, no producer
  re-routing.

## RISKS / FOLLOW-UP

- **Premature consumer adoption (medium).** A
  downstream surface might try to consume
  `CapabilityContract` before v1 ships and the
  safety review confirms it. Mitigation: the
  agent contract `Do Not Do` reminder (when
  shipped in the implementation slice) will
  cover this. Until then, the existing
  CapabilityMap v2 reminder still says agents
  must not treat projection as policy.
- **Config / artifact drift (low).** Operators
  may edit `.rekon/capability-contracts.json`
  without re-running `rekon refresh`. Mitigation:
  the artifact-level
  `capability-contracts.changed` invalidation
  rule (defined here, implemented in v1) marks
  the artifact stale when config changes.
- **`suggested` workflow scope creep (medium).**
  The `suggested` row type is sketched in the
  artifact model but **not** implemented in v1.
  If a future contributor adds `suggested`
  emission without first shipping the suggestion
  / review workflow, operators will conflate
  preview policy with applied policy. Mitigation:
  the v1 implementation memo will explicitly
  pin `suggested` as deferred and the
  16-assertion docs test in this batch already
  pins it.
- **`RefactorPreservationContract` collapse
  risk (low).** A future contributor may try to
  fold preservation rules into
  `CapabilityContract` permanently and skip
  `RefactorPreservationContract`. Mitigation:
  the *RefactorPreservationContract Boundary*
  section enumerates the persistent-vs-phase
  distinction.

## NEXT STEP

**`CapabilityContract` v1 implementation**
(thirty-third slice). Scope: register the
`CapabilityContract` artifact type in
`@rekon/kernel-repo-model` + SDK + runtime; ship a
producer in the appropriate capability package
that reads `.rekon/capability-contracts.json`
(when present) and the latest `CapabilityMap` v2
and emits the effective contract artifact. Emits
`configured` + `unmatched` rows only. No
publication surfacing yet. No CLI commands beyond
`rekon refresh` re-projecting. No linting /
routing / verification / writes.

After v1 implementation: `CapabilityContract`
safety review (gated on v1); then publication
surfacing; then publication safety review; then
downstream-consumer decisions (architecture
linting, resolver routing, verification planning,
semantic impact); then
`RefactorPreservationContract` decision.
