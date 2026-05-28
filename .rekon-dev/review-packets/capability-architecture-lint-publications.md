# Review Packet: CapabilityArchitectureLintReport Publication Surfacing

Fortieth slice on the codebase-intel-classic
capability-ontology track. Product capability batch.
Surfaces the latest `CapabilityArchitectureLintReport` in
the architecture summary and agent contract publications
as **read-only visibility**, following the
`CapabilityArchitectureLintReport` safety review at
`15d62cc`.

## CHANGES MADE

- `packages/capability-docs/src/index.ts`:
  - New `buildCapabilityArchitectureLintPublicationSection`
    helper + `CapabilityArchitectureLintReportLike`
    structural types + boundary / proof-deferral
    constants.
  - Architecture summary publisher reads the latest
    `CapabilityArchitectureLintReport`, renders a
    `## Capability Architecture Linting` section after
    the Capability Contracts section (before the proof
    loop), and cites the report in `header.inputRefs`.
  - Agent contract publisher reads the latest lint
    report, renders a `### Capability Architecture
    Linting` section in the operating-state group, and
    cites the report in `header.inputRefs`.
  - New agent-contract "Do Not Do" reminder covering
    FindingReport mutation, lifecycle mutation,
    CoherencyDelta remediation, resolver routing,
    verification planning, RefactorPreservationContract,
    and source-write permission.
  - Manifest `consumes` gains
    `CapabilityArchitectureLintReport`; new invalidation
    rule `capability-architecture-lint.changed`.
- New contract test
  `tests/contract/capability-architecture-lint-publications.test.mjs`
  (20 assertions).
- New docs test
  `tests/docs/capability-architecture-lint-publications.test.mjs`
  (10 assertions).
- Docs updated (artifact + concept add a Publication
  Surfacing section; supporting docs cross-referenced).
- CHANGELOG + README updated.

## PUBLIC API CHANGES

- New public exports from `@rekon/capability-docs`:
  `buildCapabilityArchitectureLintPublicationSection`,
  `CapabilityArchitectureLintReportLike` (+ row / summary
  / source like-types),
  `BuildCapabilityArchitectureLintPublicationSectionInput`,
  `BuildCapabilityArchitectureLintPublicationSectionResult`,
  `CAPABILITY_ARCHITECTURE_LINT_PUBLICATION_BOUNDARY_LINE`,
  `CAPABILITY_ARCHITECTURE_LINT_PUBLICATION_PROOF_DEFERRAL_LINE`.
- `@rekon/capability-docs` manifest `consumes` gains
  `CapabilityArchitectureLintReport` and a new
  invalidation rule. No new artifact type, no new CLI
  command, no version bump.

## PURPOSE PRESERVATION CHECK

Original problem:

> `CapabilityArchitectureLintReport` now evaluates
> configured `CapabilityContract` placement policy.
> Operators and agents need visibility into violations /
> passes / not-evaluated rows in the main publications.
> Visibility must not imply enforcement or finding
> lifecycle mutation.

This slice surfaces the lint results and preserves the
guarantee:

- Lint results become visible in the architecture summary
  and agent contract.
- Publications cite the lint report when present.
- `findingCandidate` remains preview-only.
- Publications do not write findings or mutate governance
  artifacts (`FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `CoherencyDelta`).
- Publications do not imply resolver routing, verification
  planning, source writes, or
  `RefactorPreservationContract` behavior.

## CODEBASE-INTEL ALIGNMENT

The surfacing mirrors the read-only-visibility model
already proven for `CapabilityContract` publication
surfacing (thirty-fifth slice) and CapabilityMap v2
surfacing: a pure structural-typed section helper, a
read-only publisher wiring that cites the artifact in
`inputRefs`, an explicit boundary statement, a deferred
proof-report surface, and an agent-contract "Do Not Do"
reminder. It keeps the capability-ontology stack on its
disciplined decision → implementation → safety review →
**surfacing** cadence.

## PUBLICATION SURFACES

- **Architecture summary** (`## Capability Architecture
  Linting`): report ref, source contract + map refs,
  summary counts (total / violations / passes /
  not-evaluated), optional byRule / bySeverity, bounded
  row table (cap 20), evaluation guidance, boundary
  statement.
- **Agent contract** (`### Capability Architecture
  Linting`): same content at heading level 3, plus the
  agent "Do Not Do" reminder elsewhere in the contract.
- **Proof report**: deferred (documented).

## READ-ONLY GUARANTEE

Publication generation may read the latest lint report,
render summary / rows, and cite it in `inputRefs`. It must
not — and the contract test asserts it does not — run
`rekon capability lint architecture`, mutate the lint
report, `CapabilityContract`, `CapabilityMap`,
`FindingReport`, `FindingLifecycleReport`, or
`CoherencyDelta`. The contract test snapshots the artifact
index before/after both publish commands and asserts
counts + digests are unchanged for each type, plus a clean
`artifacts validate`.

## BOUNDARY STATEMENTS

Rendered verbatim:

- "CapabilityArchitectureLintReport is evaluation
  visibility only; this publication does not write
  findings, mutate lifecycle state, route resolvers,
  generate verification plans, or write source files."
- "CapabilityArchitectureLintReport is evaluation, not
  enforcement. `violation` rows are policy-evaluation
  signals, not governed findings; `findingCandidate` is
  preview-only and writes no FindingReport.
  `not-evaluated` rows mean Rekon lacks deterministic
  context for that rule."
- Agent "Do Not Do": "Do not treat
  CapabilityArchitectureLintReport publication surfacing
  as FindingReport mutation, lifecycle mutation,
  CoherencyDelta remediation, resolver routing,
  verification planning, RefactorPreservationContract, or
  source-write permission. ... findingCandidate is
  preview-only."

## PROOF REPORT DEFERRAL

Proof-report surfacing of
`CapabilityArchitectureLintReport` is deferred. The lint
report is policy-evaluation context, not verification
proof. The deferral is documented in the artifact doc and
the concept doc, mirroring the `CapabilityContract`
proof-report deferral precedent.

## TESTS / VERIFICATION

- Contract test (20 assertions): no-report guidance,
  section present, summary counts, bounded table,
  boundary statement, inputRefs citation (architecture +
  agent), evaluation-not-enforcement, preview-only
  findingCandidate, not-evaluated explanation, surfacing
  boundary, Do-Not-Do reminder, and six non-mutation
  guarantees (lint report, CapabilityContract,
  CapabilityMap, FindingReport, FindingLifecycleReport,
  CoherencyDelta), proof-report deferral, clean
  `artifacts validate`.
- Docs test (10 assertions).
- Full 9-command gate + CLI smoke matrix
  (`publish architecture` + `publish agent-contract`
  render the section; `artifacts validate` clean; no
  finding artifacts written by publications).

## INTENTIONALLY UNTOUCHED

- `CapabilityArchitectureLintReport` type / factory /
  validator / helper / CLI.
- `CapabilityContract`, `CapabilityMap`,
  `CapabilityPhraseReport`, `EvidenceGraph`.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `CoherencyDelta`.
- Resolver routing, verification planning, source-write
  reconciliation, `RefactorPreservationContract`.
- Proof-report publication (deferred).

## RISKS / FOLLOW-UP

- The surfaced section is informational; agents must not
  read it as enforcement. The boundary statement + Do Not
  Do reminder mitigate this.
- A future finding-bridge slice would change how lint
  rows flow; until then publications stay read-only.
- Publication safety review (next slice) should confirm
  the read-only surfacing is safe / stable before the
  finding-bridge decision begins.

## NEXT STEP

Recommended next slice:
**CapabilityArchitectureLintReport publication safety
review**. Review the publication surfacing and decide
whether the first finding-bridge decision can begin. Still
no FindingReport mutation, no lifecycle mutation, no
CoherencyDelta mutation, no resolver routing, no
verification planning, no source writes.
