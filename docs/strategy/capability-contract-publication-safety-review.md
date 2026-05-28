# CapabilityContract Publication Safety Review

**Slice:** thirty-sixth on the capability-ontology
track.

**Scope:** end-to-end read-only audit of the
`CapabilityContract` publication surfacing shipped at
`ebf8b56`. This memo is a strategy / safety-review
batch. No runtime behavior changes, no helper changes,
no validator changes, no CLI changes.

## Decision Summary

`CapabilityContract` publication surfacing is **safe /
stable** as read-only operator + agent visibility. The
helper is pure, both publishers are strictly read-only
over every upstream artifact and over
`.rekon/capability-contracts.json`, the boundary
statement is rendered verbatim in both surfaces, and
the agent contract carries a verbatim `Do Not Do`
reminder that covers all six overclaim risks
(architecture linting, resolver routing, verification
planning, finding resolution,
`RefactorPreservationContract`, source-write
permission). Proof-report surfacing remains explicitly
deferred — `CapabilityContract` is policy context,
not verification proof.

**Recommendation: declare publication surfacing safe /
stable. Begin the capability-aware architecture
linting decision as the next slice.** That decision
must pin how (if ever) configured placement /
neighbor / required-check policy becomes findings or
lint reports — without implementing linting yet.
Resolver routing, verification planning, finding
resolution, `RefactorPreservationContract`, and
source writes remain deferred and gated on their own
decision + safety review pairs.

Pinned verbatim:

- CapabilityContract publication surfacing is
  read-only visibility.
- CapabilityContract is policy, not projection or
  enforcement.
- CapabilityContract publication surfacing does not
  imply architecture linting, resolver routing,
  verification planning, finding resolution,
  RefactorPreservationContract behavior, or
  source-write permission.
- Publications read the latest CapabilityContract;
  they never generate it.
- Proof report surfacing remains deferred because
  CapabilityContract is policy context, not
  verification proof.
- Architecture linting decision work may begin after
  this safety review if no blockers are found.

## Why This Review Exists

The thirty-fifth slice
([CapabilityContract Publication Surfacing](#cross-references))
shipped the first publication surface that renders the
**policy** layer of the capability ontology stack.
Operators and agents can now see configured /
unmatched `CapabilityContract` rows directly in the
architecture summary and agent operating contract.

Visibility is valuable but adjacent to enforcement
language. Three failure modes appear at this layer:

1. **Surface creep.** A future change tightens the
   publication to render or imply that
   `CapabilityContract` is enforced — for example by
   adding a "violations" sub-section that hints at
   architecture linting before that decision lands.
2. **Mutation creep.** A future change has the
   publisher invoke `rekon capability contract
   generate`, or has it edit
   `.rekon/capability-contracts.json`, blurring the
   read-only line between projection / policy /
   publication / enforcement.
3. **Proof-loop conflation.** A future change adds
   `CapabilityContract` to the proof report,
   conflating policy context with verification proof
   without a safety review.

This memo audits the thirty-fifth slice against all
three. The audit is read-only: no source files,
helpers, validators, schemas, configs, CLI surfaces,
or publication renderers change in this slice.

## Publication Surfaces Reviewed

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | policy context is not proof |

**Architecture summary (`## Capability Contracts`
section).** Rendered after the CapabilityMap v2
section. When a `CapabilityContract` exists, the
section surfaces the contract ref, the source
`CapabilityMap` ref, the optional config path
(`.rekon/capability-contracts.json`), summary counts
(`total` / `configured` / `unmatched` / `suggested` /
`withRequiredChecks` / `withPlacementRules` /
`withPreservationRules`), the boundary statement, and
a bounded contract table (capped at 20 rows). When no
contract exists, the section renders no-contract
guidance pointing operators at `rekon capability
contract generate --json`. The latest contract is
cited in `header.inputRefs`.

**Agent operating contract (`### Capability
Contracts` subsection).** Mirrors the architecture
summary inside the operating-state group. Always
rendered — with no-contract guidance when empty — so
agents see policy state alongside repo state.

**Proof report.** Surfacing is **deferred**. The
proof-report concept doc and artifact doc both carry
a "Not a `CapabilityContract` surface" bullet citing
this safety review.

## Read-Only Guarantee

The publication generation path may:

- Read the latest `CapabilityContract`.
- Render summary counts, the bounded contract table,
  and the boundary statement.
- Cite the contract in `header.inputRefs`.

The publication generation path **must not**:

- Run `rekon capability contract generate` (or any
  other contract-generation entry point).
- Mutate the `CapabilityContract` artifact.
- Mutate `.rekon/capability-contracts.json`.
- Mutate `CapabilityMap`.
- Mutate `CapabilityPhraseReport`.
- Mutate `EvidenceGraph`.
- Mutate any other upstream artifact.
- Enforce policy.
- Create findings.
- Update lifecycle status.

**Audit.** The 19-assertion contract test
[`tests/contract/capability-contract-publications.test.mjs`](../../tests/contract/capability-contract-publications.test.mjs)
pins each of these invariants against a real
workspace by snapshotting the artifact index
before / after publication and comparing IDs +
digests. The CLI smoke matrix in the implementation
slice's review packet confirms the
`.rekon/capability-contracts.json` config file is
byte-identical before and after the publishers run.
Helper code in
[`packages/capability-docs/src/index.ts`](../../packages/capability-docs/src/index.ts)
(`buildCapabilityContractPublicationSection`) is
pure: it takes JSON-shaped input, returns string
lines, and never touches the artifact store, the
filesystem, the network, or any global state.

**Conclusion.** Read-only guarantee holds. No
publication code path can mutate
`CapabilityContract`, the config file, or any
projection layer.

## Boundary Statement Review

The boundary statement is rendered verbatim in both
publications and the agent-contract `Do Not Do`
reminder:

> *"CapabilityContract is policy, not projection.
> CapabilityContract is policy visibility only; this
> publication does not enforce linting, routing,
> verification planning, or source writes."*

Both statements survive identically when the section
renders against an empty contract, a single
configured row, a single unmatched row, or the full
table (verified by the contract test).

| Overclaim Risk | Guardrail |
| --- | --- |
| treated as architecture linting | explicit boundary statement + Do Not Do |
| treated as resolver routing | explicit boundary statement + Do Not Do |
| treated as verification planning | explicit boundary statement + Do Not Do |
| treated as finding resolution | explicit boundary statement + Do Not Do |
| treated as RefactorPreservationContract | explicit boundary statement + Do Not Do |
| treated as source-write permission | explicit boundary statement + Do Not Do |

**Audit.** The boundary statement covers four of the
six overclaim risks directly ("does not enforce
linting, routing, verification planning, or source
writes"). The fifth ("treated as finding resolution")
and sixth ("treated as `RefactorPreservationContract`
behavior") are covered by the `Do Not Do` reminder in
the agent contract; the architecture summary inherits
the same coverage through the rendered boundary line
plus the section's read-only framing. No additional
overclaim risks were found during this review.

## Agent Contract Do Not Do Review

The agent contract carries this verbatim reminder
(added by the thirty-fifth slice):

> *"Do not treat CapabilityContract publication
> surfacing as architecture linting, resolver
> routing, verification planning, finding resolution,
> RefactorPreservationContract, or source-write
> permission. The CapabilityContract section in this
> contract is policy visibility only; configured /
> unmatched rows are operator-authored policy
> records, not enforced behavior."*

**Coverage check.**

| Risk | Covered? |
| --- | --- |
| architecture linting | ✅ named explicitly |
| resolver routing | ✅ named explicitly |
| verification planning | ✅ named explicitly |
| finding resolution | ✅ named explicitly |
| `RefactorPreservationContract` behavior | ✅ named explicitly |
| source-write permission | ✅ named explicitly |

**Phrasing check.** The reminder distinguishes
between *configured* (operator-authored, but not
enforced) and *unmatched* (policy with no current
match in `CapabilityMap` v2) rows in a single
sentence, which prevents the natural agent failure
mode "configured = active rule". The line ends with
the explicit phrase "not enforced behavior" so any
agent quoting the reminder pulls that pin into its
reasoning trace.

**Conclusion.** The `Do Not Do` reminder is
sufficient. No additional reminders are needed for
this surface.

## Proof Report Deferral

`CapabilityContract` is **deferred** from the proof
report. The proof-report concept doc carries the
verbatim bullet:

> *"Not a `CapabilityContract` surface. Proof-report
> surfacing of `CapabilityContract` is deferred
> (thirty-fifth slice on the capability-ontology
> track). `CapabilityContract` is operator-authored
> policy context, not verification proof — surfacing
> configured / unmatched policy rows in the proof
> report would conflate policy visibility with
> verification proof. The architecture summary and
> agent contract publications carry the read-only
> Capability Contracts section instead. Re-evaluate
> this deferral only when a separate decision +
> safety-review pair defines a natural policy
> section for the proof report."*

The proof-report artifact doc carries the matching
deferral. The proof-report publisher source code does
not read `CapabilityContract` and does not render any
section about it; the publisher manifest only
consumes `CapabilityContract` for invalidation of the
architecture summary and agent contract surfaces, not
the proof report.

**Conclusion.** Proof-report deferral is correct and
documented in three independent places (concept doc,
artifact doc, this memo). Re-evaluation requires its
own decision + safety review pair.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare surfacing safe/stable | selected | read-only and bounded |
| architecture linting decision next | selected | policy-to-finding boundary must be designed before behavior |
| more publication polish first | deferred | no blocker found |
| resolver routing next | rejected | routing should wait until linting/policy boundary is pinned |
| verification planning next | rejected | planning should wait until policy/finding boundary is pinned |

**Selected.** Declare the publication surfacing safe
/ stable. Begin the capability-aware architecture
linting decision as the next slice — strategy /
decision memo only, no implementation. The decision
must pin how (if ever) configured policy becomes
findings or lint reports without shipping linting
itself.

**Deferred.** Publication polish (per-row links to
source files, per-row links to the consumed
`CapabilityMap` ref, operator-feedback collection on
the new section). Valuable but not blocking. Will
fall out of cohort dogfood naturally as operators
react to the new surface.

**Rejected.** Skipping the linting decision in favour
of resolver routing or verification planning. Both
would consume `CapabilityContract` policy fields
(`allowedLayers`, `allowedSystems`,
`requiredChecks`); both deserve their own decision +
safety review pairs; both should happen *after* the
policy-to-finding boundary is pinned. Pinning that
boundary first is what protects the policy layer
from sliding into routing / planning / source-write
behavior without operator review.

## Recommendation

**Declare `CapabilityContract` publication surfacing
safe / stable as read-only visibility.**

**Begin the capability-aware architecture linting
decision as the next slice.** That memo must:

- enumerate the surface options for policy-driven
  findings (no findings, advisory findings, full
  finding lifecycle, separate "lint report"
  artifact),
- pin a recommended option with explicit boundary
  statements,
- defer the actual linting implementation, resolver
  routing, verification planning, finding
  resolution, `RefactorPreservationContract`, and
  source writes,
- carry its own safety-review pair before any
  enforcement-adjacent code lands.

Enforcement consumers in scope to remain deferred
until that decision lands: architecture linting,
resolver routing by capability, verification planning
by capability, finding resolution,
`RefactorPreservationContract`, source writes.

## What This Does Not Do

This safety-review batch is read-only. Specifically:

- No source file under `packages/` is modified.
- No artifact validator, helper, or CLI command is
  modified.
- No publication surface is modified.
- No new artifact type is registered.
- No new permission is registered.
- No GitHub Action template is touched.
- No `RefactorPreservationContract` shape is added.
- No architecture linting ships.
- No resolver routing by capability ships.
- No verification planning by capability ships.
- No finding resolution behavior ships.
- No source writes ship.
- No `CapabilityMap` mutation.
- No `CapabilityPhraseReport` mutation.
- No `EvidenceGraph` mutation.
- No `.rekon/capability-contracts.json` mutation.
- No LLM-only inference.
- No npm publish. No version bump.

## Follow-Up Work

Tracked, not gating this safety review:

- **Capability-aware architecture linting decision
  (next slice).** Strategy / decision memo only. Pins
  whether and how configured `CapabilityContract`
  policy ever becomes findings or lint reports.
- **Publication polish.** Per-row links to relevant
  source files; per-row link to the consumed
  `CapabilityMap` v2 entry. Refinement candidate
  after the linting decision lands.
- **Cohort dogfood pass.** Run the publications
  against external cohort targets and capture
  operator reactions to the new section. Parallel
  to the architecture linting decision.
- **Long-deferred enforcement consumers.** Each one
  (architecture linting, resolver routing,
  verification planning, finding resolution,
  `RefactorPreservationContract`, source writes)
  remains gated on its own decision + safety review
  pair. They remain in their own decision queues.
- **`suggested`-row workflow.** Still reserved.
  v1 of `CapabilityContract` emits only
  `configured` and `unmatched` rows. The eventual
  suggestion-review workflow will need its own
  decision when it lands.

## Cross-references

- [CapabilityContract publication surfacing](capability-contract-architecture-decision.md)
  — thirty-fifth slice; the surfacing reviewed by
  this memo.
  See review packet
  [`.rekon-dev/review-packets/capability-contract-publications.md`](../../.rekon-dev/review-packets/capability-contract-publications.md).
- [`CapabilityContract` v1 Safety Review](capability-contract-v1-safety-review.md)
  — thirty-fourth slice; declares the artifact
  safe / stable.
- [`CapabilityContract` Architecture Decision](capability-contract-architecture-decision.md)
  — thirty-second slice; pins the policy /
  projection boundary.
- [`CapabilityContract` artifact reference](../artifacts/capability-contract.md)
- [`CapabilityContract` concept doc](../concepts/capability-contracts.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
  + [artifact doc](../artifacts/architecture-summary-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
  + [artifact doc](../artifacts/agent-contract-publication.md)
- [Proof report publication concept](../concepts/proof-report-publication.md)
  + [artifact doc](../artifacts/proof-report-publication.md)

## Status

Safety review recorded. Recommendation: declare
publication surfacing safe / stable as read-only
visibility. Recommended next slice:
*capability-aware architecture linting decision*
(strategy / decision memo only; no implementation;
resolver routing / verification planning / finding
resolution / `RefactorPreservationContract` / source
writes remain deferred).

**Update (thirty-seventh slice):** the
capability-aware architecture linting decision has
shipped — see
[Capability-Aware Architecture Linting Decision](capability-aware-architecture-linting-decision.md).
Recommendation: select Option B — emit a separate
`CapabilityArchitectureLintReport` artifact rather
than promoting straight to `FindingReport`. v1 scope:
placement rules (`allowedLayers` / `forbiddenLayers` /
`allowedSystems` / `forbiddenSystems`) over
configured `CapabilityContract` rows. Neighbor and
preservation rules deferred. Finding bridge,
remediation, routing, verification planning, source
writes all remain gated on their own decision +
safety review pairs.
