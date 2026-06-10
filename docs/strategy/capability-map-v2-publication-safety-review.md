# CapabilityMap v2 Publication Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status:** review complete; recommendation recorded.
**Slice:** `capability-map-v2-publication-safety-review`.
**Sequence position:** Thirty-first slice on the
capability-ontology track. Follows the
[CapabilityMap v2 Publication Surfacing](capability-map-v2-high-confidence-decision.md)
(thirtieth slice), which shipped the architecture
summary and agent contract surfacing of the
additive `phraseBackedCapabilities` /
`phraseBackedSummary` / `phraseSourceRef`
projection.

## Decision Summary

**Recommendation: `CapabilityMap` v2 publication
surfacing is safe/stable as read-only visibility.**
The review confirms the architecture summary and
agent contract surfacing preserve every boundary the
[v2 publication surfacing batch](../../CHANGELOG.md)
committed to: publication generation is
strictly read-only with respect to `CapabilityMap`
and every upstream artifact, the boundary statement
is rendered in every surface, the agent contract
`Do Not Do` reminder covers all five overclaim
risks, and proof report surfacing is explicitly
deferred.

**Pinned verbatim (asserted by docs test):**

- **`CapabilityMap` v2 publication surfacing is
  read-only visibility.**
- **`CapabilityMap` v2 phrase-backed capabilities
  are projection context, not `CapabilityContract`
  policy.**
- **`CapabilityMap` v2 phrase-backed capabilities
  do not imply resolver routing, architecture
  linting, verification planning, source-write
  permission, or finding resolution.**
- **Proof report surfacing remains deferred
  because `CapabilityMap` v2 is semantic
  projection, not verification proof.**
- **`CapabilityContract` decision work may begin
  after this safety review if no blockers are
  found.**

**Recommended next slice:** `CapabilityContract`
architecture decision. The projection layer is now
visible and bounded; the next capability layer
should decide policy / placement / preservation
semantics **before** any linting, routing, or
verification-planning behavior is built.

Architecture linting, resolver routing by
capability, verification planning by capability,
and source-write apply remain **deferred** until
the `CapabilityContract` decision lands.

This memo is a **strategy / safety review only**. It
does not modify the
`buildCapabilityMapV2PublicationSection` helper,
the architecture summary or agent contract
publishers, the
`AGENT_CONTRACT_DO_NOT_DO` list, the proof report,
the manifest, the contract test, or any runtime
behaviour.

## Why This Review Exists

The thirtieth slice shipped a new public surface:
two publications now render
`CapabilityMap` v2 phrase-backed capabilities to
operators (architecture summary) and agents (agent
contract). The risk that downstream consumers
misread the projection as **policy** — and start
using v2 entries to route the resolver, lint
architecture violations, plan verification, or
authorise source writes — climbs the moment
publication surfacing ships, because the data is
now in human and agent eyeballs.

Before the next capability layer (`CapabilityContract`)
is designed, a **read-only audit** has to confirm:

1. Publication generation actually leaves
   `CapabilityMap`, `CapabilityPhraseReport`,
   `CapabilityNormalizationReport`, and
   `EvidenceGraph` untouched.
2. The boundary statement is visible in both
   rendered surfaces.
3. The `Do Not Do` reminder covers every overclaim
   risk an agent could plausibly reach for.
4. Proof report surfacing remains deferred (semantic
   projection vs verification proof split).
5. No CLI command is invoked by publication
   generation.
6. No new artifact type or invalidation rule was
   sneaked in.

A safety review that confirms (1)–(6) lets the next
slice cite this memo as the gate for
`CapabilityContract` decision work. A safety review
that finds a blocker pauses the capability-ontology
track until the blocker ships its own fix slice.

## Publication Surfaces Reviewed

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | semantic projection is not proof |

The review walked each surface end-to-end.

**Architecture summary** (`## CapabilityMap v2
Phrase-Backed Capabilities`): renders the
`CapabilityMap` ref, the
`CapabilityPhraseReport` ref (`phraseSourceRef`),
summary counts (`total`, `withDomain`,
`withPattern`, `withLayer`), optional top-verb /
top-noun lines, the explicit boundary statement,
the proof-report-deferral line, and a 20-row-capped
table. No table duplication with the existing
`## Capability Phrases` section — v2 uses six
columns (`Verb | Noun | Domain | Pattern | Layer |
Evidence`); v1 phrase report uses five columns
(`Verb | Noun | Status | Confidence | Evidence`).

**Agent contract** (`### CapabilityMap v2
Phrase-Backed Capabilities`): identical content at
heading level 3, sitting inside the operating-state
group after the existing `### Capability Phrases`
subsection. The agent contract's `## Do Not Do`
list carries a v2-specific reminder enumerating all
five overclaim surfaces.

**Proof report**: no `CapabilityMap` v2 section
exists. The proof-report concept doc and artifact
doc both document the deferral and the rationale
(semantic projection is not verification proof).

## Read-Only Guarantee

The contract test (thirtieth slice) asserts the
following negative properties end-to-end:

- Publications **do not** create or mutate
  `CapabilityMap`.
- Publications **do not** mutate
  `CapabilityPhraseReport`.
- Publications **do not** mutate
  `CapabilityNormalizationReport`.
- Publications **do not** mutate `EvidenceGraph`.
- Proof report **does not** render a v2 section.

The review re-walks each property:

- **`buildCapabilityMapV2PublicationSection` is
  pure.** No `fs.write*`, no
  `artifacts.write` call, no `spawnSync` /
  `spawn` / `exec`, no LLM invocation, no
  network call. The helper takes a
  structurally-typed `CapabilityMapV2Like` input
  and returns a `{ lines, inputRef }` object. The
  input type matches three top-level fields
  (`header`, `phraseSourceRef`,
  `phraseBackedSummary`,
  `phraseBackedCapabilities`) — none of the
  upstream artifact fields are reachable through
  the structural type.
- **Publishers use `artifacts.read` only.** The
  architecture summary publisher calls
  `readLatestArtifact<CapabilityMap>(...)` (which
  internally calls `artifacts.list` +
  `artifacts.read`). The agent contract publisher
  reuses the same pattern. Neither calls
  `artifacts.write` on `CapabilityMap`,
  `CapabilityPhraseReport`,
  `CapabilityNormalizationReport`, or
  `EvidenceGraph`.
- **Publishers never invoke a CLI command.** The
  helper is in-process Markdown emission. No
  `child_process` import. No `spawnSync` call in
  the publisher path. The publication's
  `Publication` artifact is written via the
  existing `artifacts.write("Publication", ...)`
  call, which existed before v2 surfacing.
- **The manifest's
  `coherency.changed` invalidation rule already
  covered `CapabilityMap` changes.** No new
  invalidation rule was added; the existing rule's
  description was tightened only.

**Publication surfacing is read-only by
construction.** The contract test pins this at
three independent levels (artifact index, digest
comparison, no-section-in-proof-report).

## Boundary Statement Review

The helper emits a single boundary statement that
publishers cannot omit (it lives inside the helper's
output `lines[]`):

> These entries are projection context, not
> `CapabilityContract` placement policy.
> `CapabilityMap` v2 does not imply placement
> policy, ownership policy, resolver routing,
> architecture linting, verification planning, or
> source writes.

This statement enumerates every overclaim risk the
review identified:

| Overclaim Risk | Guardrail |
| --- | --- |
| treated as `CapabilityContract` policy | explicit boundary statement |
| treated as resolver routing authority | agent Do Not Do reminder |
| treated as architecture lint finding | agent Do Not Do reminder |
| treated as verification requirement | agent Do Not Do reminder |
| treated as source-write permission | agent Do Not Do reminder |

Both rendered surfaces (architecture summary at
level 2, agent contract at level 3) include this
boundary statement immediately above the bounded
table — operators and agents see the boundary
before they see the entries.

A second statement (proof-report deferral) appears
between the boundary line and the table:

> Proof-report surfacing of `CapabilityMap` v2 is
> deferred. `CapabilityMap` v2 is semantic
> capability projection, not verification proof.

The deferral statement appears even when the v2
fields are absent (the helper's empty-state path
also emits it), so an empty v2 surface never reads
as "v2 may eventually be proof".

The boundary statements are sufficient. No
additional wording is required.

## Agent Contract Do Not Do Review

The agent contract's `## Do Not Do` list gained two
related entries in the thirtieth slice. The review
re-checks coverage.

**Updated existing entry** (CapabilityPhraseReport
do-not-do):

> Do not treat `CapabilityPhraseReport` entries as
> `CapabilityMap` ownership or placement policy;
> `CapabilityPhraseReport` is semantic purpose
> projection and `CapabilityNormalizationReport`
> remains translation audit. The high-confidence
> subset projects into
> `CapabilityMap.phraseBackedCapabilities` (v2);
> `CapabilityContract` policy remains deferred.

**New entry** (v2-specific):

> Do not treat `CapabilityMap` v2 phrase-backed
> capabilities as `CapabilityContract` policy,
> resolver routing authority, architecture lint
> findings, verification requirements, or
> source-write permission. `CapabilityMap` v2
> phrase-backed capabilities are stable capability
> projection; they are not placement policy,
> ownership policy, or source-write authority.

The new entry covers every overclaim surface
identified in the boundary review:

- `CapabilityContract` policy ✅
- resolver routing authority ✅
- architecture lint findings ✅
- verification requirements ✅
- source-write permission ✅

Finding resolution is the only overclaim risk not
already covered verbatim. Today, `CapabilityMap` v2
entries are not connected to any
`FindingLifecycleReport` / `IssueAdjudicationReport`
surface, so an agent has no plausible path to "v2
projects into finding resolution". The review notes
this as a low-priority follow-up to add explicitly
if any future surface starts linking v2 to
findings.

The `Do Not Do` reminder is sufficient for the
current publication surfacing. No additional
reminder entries are required in this batch.

## Proof Report Deferral

**Proof report surfacing remains deferred.**

Rationale (unchanged from the thirtieth slice's
implementation rationale):

- `CapabilityMap` v2 is **semantic capability
  projection**, not verification proof.
- The proof report describes
  `VerificationPlan` / `VerificationResult` proof
  state. Surfacing v2 there would conflate
  semantic projection with verification proof and
  invite agents / operators to treat v2 entries as
  proof of completion.

The contract test enforces this by asserting no
`CapabilityMap v2 Phrase-Backed Capabilities`
section appears in the proof report content. The
proof-report concept doc and artifact reference
both document the deferral.

**The deferral is the correct decision and should
remain.** If a future slice surfaces v2 in proof
reports, it must:

1. Ship its own decision memo + safety review;
2. Pin the difference between *projection
   visibility in the proof loop* and *proof
   itself*; and
3. Update the proof-report's "What This Is Not"
   list accordingly.

Without that explicit gate, proof report surfacing
remains the wrong layer for `CapabilityMap` v2.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare surfacing safe/stable | selected | read-only and bounded |
| `CapabilityContract` decision next | selected | policy layer must be designed before behavior |
| more publication polish first | deferred | no blocker found |
| resolver routing next | rejected | needs `CapabilityContract` boundary first |

**Selected**: declare publication surfacing safe /
stable, and start `CapabilityContract`
architecture-decision work as the next slice.

**Why `CapabilityContract` is the right next
step**:

- Operators and agents can now see v2 entries.
  Real-repo feedback will accumulate quickly. The
  feedback only becomes actionable if there is a
  policy layer (`CapabilityContract`) to absorb
  it.
- Architecture linting, resolver routing by
  capability, verification planning by capability,
  and source-write apply all require
  `CapabilityContract` semantics first. Each of
  those four surfaces is downstream of policy —
  designing policy before behaviour keeps the
  capability-ontology track in order.
- The
  [Capability Phrase Contract Architecture Decision](capability-phrase-contract-architecture-decision.md)
  (twentieth slice) already pinned
  `CapabilityContract` as the next architecture
  decision after v2 lands. This safety review
  removes the last remaining gate (publication
  surfacing).

**Why publication polish is not the right next
step**:

- The publication surfacing contract test (16
  assertions) + docs test (9 assertions) cover
  the boundary, the read-only guarantee, the
  proof-report deferral, the bounded table, and
  the structural input contract. No regression
  surface was found in this review.
- Top-verb / top-noun ordering uses deterministic
  tie-break (count desc, then key asc). The
  bounded table cap (20 rows) prevents runaway
  output on large repos.
- Wording polish (e.g. adding a finding-resolution
  reminder line) is a low-priority follow-up, not
  a publication safety blocker.

**Why resolver routing is the wrong next step**:

- Routing the resolver by capability would consume
  v2 entries as routing keys — that is policy, not
  projection. It belongs in `CapabilityContract`.
- The agent contract `Do Not Do` reminder
  explicitly tells agents not to treat v2 as
  routing authority. Shipping resolver routing on
  v2 entries would invalidate that reminder.

## Recommendation

**`CapabilityMap` v2 publication surfacing is safe
/ stable as read-only visibility.** No blockers. No
runtime changes required.

Ship `CapabilityContract` architecture decision as
the next slice.

The recommended scope for the `CapabilityContract`
architecture decision:

- Allowed layers per capability.
- Allowed systems per capability.
- Forbidden layers per capability.
- Required checks (cross-link to
  `VerificationPlan` semantics).
- Required / forbidden neighbouring capabilities.
- Preservation rules (cross-link to
  `RefactorPreservationContract` placeholders).
- Strict decision-memo only — **no implementation,
  no linting, no routing, no verification planning,
  no source writes**.

Deferred (gated on `CapabilityContract` decision
+ subsequent implementation slices):

- Architecture linting from `CapabilityContract`.
- Resolver routing by capability.
- Verification planning by capability.
- Source-write apply.

## What This Does Not Do

- It does **not** modify the
  `buildCapabilityMapV2PublicationSection` helper.
- It does **not** modify the architecture summary
  publisher, the agent contract publisher, or the
  proof report publisher.
- It does **not** add the `CapabilityContract`
  artifact, type, helper, or capability.
- It does **not** add architecture linting,
  resolver routing by capability, verification
  planning by capability, or source-write apply.
- It does **not** mutate `EvidenceGraph`,
  `CapabilityNormalizationReport`,
  `CapabilityPhraseReport`, or `CapabilityMap`
  (any field).
- It does **not** add source writes.
- It does **not** invoke an LLM.
- It does **not** bump versions or publish to
  npm.
- It does **not** add a new artifact type or
  invalidation rule.

## Follow-Up Work

- **`CapabilityContract` architecture decision** —
  ✅ shipped as the thirty-second slice. Selects
  Option B (config + artifact effective contract);
  pins the projection / policy split; commits
  Rekon to `.rekon/capability-contracts.json` as
  the operator policy source and a
  `CapabilityContract` artifact for audit. See
  [CapabilityContract Architecture Decision](capability-contract-architecture-decision.md).
- **`CapabilityContract` implementation** (gated
  on the decision memo). Adds the artifact type +
  type definitions to `@rekon/kernel-repo-model`
  and a producer / consumer in the appropriate
  capability package. Not in this slice and not
  in the next.
- **Architecture linting from
  `CapabilityContract`** (further future; gated
  on the implementation slice).
- **Resolver routing by capability** (further
  future; gated on `CapabilityContract`).
- **Verification planning by capability**
  (further future; gated on `CapabilityContract`).
- **Post-publication coverage review** (parallel
  / opportunistic). Measure phrase-backed entry
  quality on the cohort + fixture once operators
  produce real-repo feedback on the publication
  surfaces.

## Cross-References

- [CapabilityMap v2 High-Confidence-Only Decision](capability-map-v2-high-confidence-decision.md)
  — twenty-seventh slice; decision memo for v2
  shape.
- [CapabilityMap v2 Safety Review](capability-map-v2-safety-review.md)
  — twenty-ninth slice; safety review of v2
  projection.
- [Capability Phrase Contract Architecture Decision](capability-phrase-contract-architecture-decision.md)
  — twentieth slice; pins `CapabilityContract`
  as a further-future layer (this review
  un-defers the architecture-decision step).
- [`CapabilityMap` artifact reference](../artifacts/capability-map.md)
  — produced by the twenty-eighth slice; updated
  by the thirtieth slice for publication
  surfacing.
- [Architecture summary publication](../artifacts/architecture-summary-publication.md)
  — rendered surface.
- [Agent contract publication](../artifacts/agent-contract-publication.md)
  — rendered surface.
- [Proof report publication](../artifacts/proof-report-publication.md)
  — v2 surfacing deferred here.

## Status

Review complete. Recommendation: `CapabilityMap` v2
publication surfacing is safe / stable as read-only
visibility. Next slice: `CapabilityContract`
architecture decision.
