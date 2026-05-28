# Review packet — CapabilityContract publication surfacing

**Slice:** thirty-fifth on the capability-ontology track.

**Scope:** surface the latest `CapabilityContract` as a
read-only **Capability Contracts** section in the
architecture-summary and agent-operating-contract
publications. Read-only visibility only — no enforcement,
no source writes, no config writes.

**Status:** Shipped.

## CHANGES MADE

- `packages/capability-docs/src/index.ts`:
  - New pure helper
    `buildCapabilityContractPublicationSection(input)`
    (structurally typed `CapabilityContractLike`
    duck-type input, bounded contract table at 20
    rows, no-contract guidance branch, boundary
    statement verbatim).
  - Exported `CapabilityContractLike`,
    `CapabilityContractEntryLike`,
    `CapabilityContractSummaryLike`,
    `CapabilityContractSourceLike`,
    `BuildCapabilityContractPublicationSectionInput`,
    `BuildCapabilityContractPublicationSectionResult`,
    `CAPABILITY_CONTRACT_PUBLICATION_BOUNDARY_LINE`,
    and
    `CAPABILITY_CONTRACT_PUBLICATION_PROOF_DEFERRAL_LINE`.
  - Architecture-summary publisher reads the latest
    `CapabilityContract`, cites it in
    `header.inputRefs` when present, and renders a
    `## Capability Contracts` section after the
    CapabilityMap v2 section.
  - Agent-contract publisher reads the latest
    `CapabilityContract`, cites it in
    `header.inputRefs` when present, and renders a
    `### Capability Contracts` section inside the
    operating-state group.
  - `AGENT_CONTRACT_DO_NOT_DO` extended with a
    verbatim reminder pinning the
    no-enforcement boundary.
  - Manifest extended: `consumes:
    CapabilityContract` declared; new
    `capability-contract.changed` invalidation rule.
- New 19-assertion contract test
  `tests/contract/capability-contract-publications.test.mjs`.
- New 11-assertion docs test
  `tests/docs/capability-contract-publications.test.mjs`.
- Docs updated: architecture summary publication
  concept + artifact docs, agent operating contract
  concept + artifact docs, proof report publication
  concept + artifact docs (deferral pinned),
  CapabilityContract artifact + concept docs,
  CapabilityMap artifact doc, ontology concept doc,
  safety-review memo, architecture decision memo,
  roadmap + classic roadmap, README, CHANGELOG.
- This review packet at
  `.rekon-dev/review-packets/capability-contract-publications.md`.

## PUBLIC API CHANGES

Additive only. New named exports from
`@rekon/capability-docs`:

- `buildCapabilityContractPublicationSection`
- `CapabilityContractLike`,
  `CapabilityContractEntryLike`,
  `CapabilityContractSummaryLike`,
  `CapabilityContractSourceLike`
- `BuildCapabilityContractPublicationSectionInput`,
  `BuildCapabilityContractPublicationSectionResult`
- `CAPABILITY_CONTRACT_PUBLICATION_BOUNDARY_LINE`,
  `CAPABILITY_CONTRACT_PUBLICATION_PROOF_DEFERRAL_LINE`

The publisher manifest grows: `consumes` adds
`CapabilityContract`; new `capability-contract.changed`
invalidation rule joins the existing rule set. No
existing exports change. No artifact type, helper, CLI
command, or permission is added, removed, or modified
outside of `@rekon/capability-docs`.

## PURPOSE PRESERVATION CHECK

The original purpose of `CapabilityContract` v1 is to
publish operator-authored policy in an artifact-backed
form without enforcing it. The v1 safety review
(thirty-fourth slice) declared the artifact safe / stable
and recommended publication surfacing as the next slice,
on the strict model used by the `CapabilityMap` v2
publication safety review.

This batch:

- Makes `CapabilityContract` visible to operators and
  agents in the architecture summary and agent contract.
- Carries a verbatim boundary statement on every
  surface: *"CapabilityContract is policy visibility
  only; this publication does not enforce linting,
  routing, verification planning, or source writes."*
- Carries a new `Do Not Do` reminder in the agent
  contract pinning that the surface does NOT imply
  architecture linting, resolver routing, verification
  planning, finding resolution,
  `RefactorPreservationContract`, or source-write
  permission.
- Cites the latest `CapabilityContract` in
  `header.inputRefs` of both publications so reviewers
  can trace exactly which contract a publication saw.
- Renders a bounded contract table (capped at 20 rows)
  so very large contracts stay readable in the
  publication output.

The publishers never run `rekon capability contract
generate`, never mutate the contract, never mutate
`.rekon/capability-contracts.json`, and never mutate the
projection layers (`CapabilityMap`,
`CapabilityPhraseReport`, `EvidenceGraph`).

## CODEBASE-INTEL ALIGNMENT

No codebase-intel surface changes. `CapabilityContract`
remains under the existing artifact-store + intent stack.
The publisher boundary in `@rekon/capability-docs`
already enforces read-only-over-artifacts; this slice
extends that boundary cleanly to the new artifact type.

## PUBLICATION SURFACES

| Surface | Heading | Status |
| --- | --- | --- |
| Architecture summary | `## Capability Contracts` | ✅ shipped |
| Agent operating contract | `### Capability Contracts` | ✅ shipped |
| Proof report | (deferred — policy context, not verification proof) | ⏳ deferred |
| GitHub Check publisher | (not in scope) | ⏳ not in scope |
| PR comment publisher | (not in scope) | ⏳ not in scope |

## READ-ONLY GUARANTEE

The publication generation path may:

- Read the latest `CapabilityContract`.
- Render summary counts and a bounded contract table.
- Cite the contract in `header.inputRefs`.

The publication generation path **must not**:

- Run `rekon capability contract generate` (or any
  other contract-generation entry point).
- Mutate the `CapabilityContract` artifact.
- Mutate `.rekon/capability-contracts.json`.
- Mutate `CapabilityMap`.
- Mutate `CapabilityPhraseReport`.
- Mutate `EvidenceGraph`.
- Enforce policy.
- Create findings.
- Update lifecycle status.

The 19-assertion contract test pins each of these
invariants against a real workspace.

## BOUNDARY STATEMENTS

Verbatim in the rendered output of both publications:

> "CapabilityContract is policy visibility only;
> this publication does not enforce linting,
> routing, verification planning, or source writes."

Verbatim in the agent contract's `## Do Not Do` list:

> "Do not treat CapabilityContract publication
> surfacing as architecture linting, resolver
> routing, verification planning, finding
> resolution, RefactorPreservationContract, or
> source-write permission. The CapabilityContract
> section in this contract is policy visibility
> only; configured / unmatched rows are
> operator-authored policy records, not enforced
> behavior."

## PROOF REPORT DEFERRAL

Proof-report surfacing of `CapabilityContract` is
explicitly **deferred**. Documented in:

- [`docs/concepts/proof-report-publication.md`](../../docs/concepts/proof-report-publication.md)
  — new "Not a `CapabilityContract` surface" bullet.
- [`docs/artifacts/proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md)
  — matching deferral bullet.
- [`docs/concepts/capability-contracts.md`](../../docs/concepts/capability-contracts.md)
  — operator-facing cross-reference notes the
  deferral.

Rationale: `CapabilityContract` is policy context,
not verification proof. Surfacing configured /
unmatched policy rows in the proof report would
conflate policy visibility with verification proof.
Re-evaluation requires its own decision + safety
review pair.

## TESTS / VERIFICATION

- 19-assertion contract test
  `tests/contract/capability-contract-publications.test.mjs`
  exercises no-contract guidance, summary counts,
  bounded table, boundary statement, citation in
  `header.inputRefs`, agent contract section + Do Not
  Do reminder, all five read-only invariants, the
  proof-report deferral documentation, and a clean
  `rekon artifacts validate`.
- 11-assertion docs test
  `tests/docs/capability-contract-publications.test.mjs`
  pins cross-references in 6 publication-surfacing
  docs + CHANGELOG + review packet.
- 9-command verification gate runs clean: typecheck ·
  test · build · diff-check · audit-package-exports ·
  audit-license · publish-dry-run · install-smoke ·
  install-tarball-smoke.

## INTENTIONALLY UNTOUCHED

- `CapabilityContract` artifact validator + helper +
  CLI command.
- `.rekon/capability-contracts.json` shape.
- `CapabilityMap`, `CapabilityPhraseReport`,
  `CapabilityNormalizationReport`, `EvidenceGraph`
  artifact validators, projectors, and helpers.
- Proof report publication helper.
- GitHub Check and PR comment publisher payloads.
- All CLI publish commands.
- All runtime permissions.

## RISKS / FOLLOW-UP

Tracked, not gating:

- **Publication safety review.** Recommended next
  slice. Read-only audit of this publication
  surfacing on the strict model used by the
  `CapabilityMap` v2 publication safety review.
- **Operator-feedback loop.** Once cohort runs hit
  publications, capture operator reactions to the
  new section. Expect requests for:
  filterable rows; per-row links to relevant
  source files; per-row links to the consumed
  `CapabilityMap` ref. These are refinement
  candidates, not blockers.
- **Proof report deferral re-evaluation.** If the
  proof report ever surfaces a "policy obligations
  this proof did / did not satisfy" view, that's
  the natural moment to re-open the deferral.
  Document that decision under a separate
  decision + safety-review pair.
- **Enforcement consumers** (architecture linting,
  resolver routing by capability, verification
  planning by capability,
  `RefactorPreservationContract`) remain deferred.

## NEXT STEP

`CapabilityContract` publication safety review —
read-only audit of the publication surfaces shipped
in this slice. After that lands, the first
enforcement-adjacent decision (likely
capability-aware architecture linting) becomes
eligible to begin.
