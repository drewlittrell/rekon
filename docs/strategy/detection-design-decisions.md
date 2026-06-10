# Detection Design Decisions (WO-3, pinned)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned. Operator-ratified 2026-06-10.** This document records the
Step 3 adjudication answers verbatim, pins a decision for every classic
detection goal (`port` / `redesign` / `reject` / `defer`), authorizes the
resulting `tests/bench/rule-map.json` disposition rows (every row cites a
section of this document), and publishes the sequenced Phase 1
implementation queue. Evidence basis:
[detection-design-evidence.md](detection-design-evidence.md) +
[detection-design-evidence.data.json](detection-design-evidence.data.json).

Framing document: `docs/strategy/rekon-system-model.md`
(operator-approved 2026-06-10) locates detection on the **sensor track** of
the system model — sensors observe and report; actuators (WO-5 scope) act.
Every decision below is a sensor-track decision. *(The system model
document was approved in an adjacent session and is not yet committed to
this repository; until it lands, this document is the durable citation
anchor for every rule-map row — see Risks.)*

## Governing principle (pinned verbatim from WO-3)

> **Detection mechanisms may be redesigned; detection goals must be served
> or explicitly rejected.** A classic rule is not a requirement; the failure
> mode it was built to catch is. Port classic's mechanism only when it
> remains the best available design given Rekon's substrate (EvidenceGraph
> provenance, GraphSlices, OwnershipMap/CapabilityMap, declared-intent
> artifacts, the adjudication + filter stack, memory). Where Rekon's
> substrate enables a better design, build that instead and record the
> divergence as a design decision, not a gap.

## Operator adjudication record (Step 3 answers, verbatim)

Recorded as ground truth. Two answers are operator-marked as *derived* from
evidence rather than recalled — they stand as ratified but remain open to
correction (marked inline).

> **A. Boundary drift**
> A1: Often. This cluster is why Rekon exists.
> A2: Trusted the structural families: layering, canonical paths,
> ownership, DI. The 41-sub-rule sprawl includes hardcoded
> project-specific overrides that were point fixes. Suppression in this
> cluster was defense against false signal, never rejection of the
> principle. *(Operator-marked derived: edit if any specific sub-rules
> earned verbatim preservation through repeated real saves.)*
> A3: Semantic boundary drift: observed behavior versus declared purpose.
> Classic compared structure to structure. Close it via the ontology +
> CapabilityEvidenceGraph + capability-aware lint chain, which is
> partially shipped; part 2 must inventory what exists before designing
> anything new.
> A4: Default set; project-specific law (DDE, gates, streaming, module
> registry) to operator overlay per WO-4's split. `system_anomaly`:
> rejected; it policed classic's own pipeline.
>
> **B. Shortcuts**
> B1: Stopped reading the list. The deterministic markers (TODOs, disabled
> tests, deprecations) were the actionable residue.
> B2: The LLM's judgment was valuable as understanding and context, never
> as proof. Route semantic signals into the graph as inference claims;
> they reach FindingReport only with deterministic corroboration or
> operator confirmation, through the existing bridge pattern. Default scan
> stays deterministic; semantic stays opt-in.
> B3: Debt velocity (trend over scans), agent-introduced debt as a ratchet
> on new code, and shortcuts versus declared plan via the intent and
> verification artifacts.
> B4: Deterministic markers and trend in the default set; LLM debt
> judgment as semantic overlay.
>
> **C. Redundancy**
> C1: The goal is live; the mechanism never earned trust. Suppression
> measured precision, not value. *(Operator-marked derived: correct if
> overlap findings ever did drive a consolidation.)*
> C2: `dead_code` goal trusted, mechanism weak; redesign on graph
> reachability, accepted. `capability_overlap` becomes a priority redesign
> on the capability graph; declared sharing disambiguates intentional
> overlap from drift.
> C3: Capability-level redundancy: two systems implementing the same
> declared capability.
> C4: Similarity-family defer ratified; re-entry when the embedding layer
> is precision-scored.
>
> **D. Conventions**
> D1: The naming contract sub-rule changed names; the rest was noise.
> D2: Trust concentrated in the {Entity}{Role} contract (724 of 846
> fires). Redesign as an ontology-backed contract check, derivable from
> the declared grammar WO-4 ports.
> D3: Names as declarations of system membership, checked against ratified
> ontology rather than pattern lists.
> D4: `lint` rejection ratified; 1,282 findings leave the denominator with
> citation. Record "consume real linter output as evidence facts" as a
> separate future decision, not part of this rejection.
>
> **Cross-cutting**
> 5: Correction: contract drift and handoff violations were not missed by
> classic; `drift-artifacts.ts` implements both. Reclassify them as
> classic guarantee preservation per `docs/strategy/rekon-system-model.md`
> (operator-approved 2026-06-10) and give them rule-map/manifest rows as
> ports. The genuinely new candidates rank: 1. intent divergence, 2. debt
> trend, 3. verification decay (extension of freshness, not new
> detection). None struck.
> 6: Nothing verbatim. Project-specific sub-rules route to the overlay
> example pack via WO-4's manifest.

## Correction to the dossier: "classic never caught" amended

The dossier's five net-new candidates were drafted before classic's
contract-drift layer was verified. Grounded against classic source
(`packages/product-capability-contracts/src/drift-artifacts.ts`, reference
only): `buildCapabilityChangeReport(base EvidenceGraph, head EvidenceGraph,
CapabilityContracts)` diffs declared contracts against evidence across
scans and emits exactly four violation kinds:

| Classic signal | Mechanism (verified) |
| --- | --- |
| `capability_removed` | capability present in base evidence, absent in head |
| `confidence_degraded` | capability max-confidence drops ≥ 0.2 between base and head |
| `handoff_broken` | a contract-declared handoff is no longer supported in head evidence |
| `outcome_missing` | a contract-declared outcome is no longer evidenced in head |

**Contract drift** and **handoff violations** therefore move from net-new
candidates to **classic guarantee preservation ports** (§5 below). These
signals never appear in the 17 issues.json rule ids — classic emitted them
through a separate `CapabilityChangeReport` artifact — so their rule-map
rows are additive (no corpus fire history) and exist so the scoreboard
carries the preservation obligation from day one.

The genuinely new detections, operator-ranked: **1. intent divergence,
2. debt trend, 3. verification decay** (an extension of path freshness,
not new detection). None struck.

## Substrate inventory (A3 obligation — what is already shipped)

Per A3, no cluster-A design work proceeds without inventorying the
partially shipped chain. As of `0a0cb71`:

- **Declared layer:** capability-ontology package (base + overlay packs,
  `.overrides.json` loader, normalize / review / suggestions / phrase
  projection CLI), CapabilityMap (+ phrase-backed additions),
  CapabilityContract (+ `rekon capability contract generate`),
  OwnershipMap, step/handoff declarations (StepCapabilityGraph,
  HandoffContract), intent artifacts (IntentAssessmentReport,
  PreparedIntentPlan + approval proof, IntentStatusReport, WorkOrder
  handoff, VerificationPlan handoff, IntentPlanBundle).
- **Observed layer:** EvidenceGraph (file/import/export/symbol facts via
  AST with regex fallback), GraphSlices, RuntimeGraphObservation/Drift
  reports, PathFreshnessReport, embeddings index + retrieval.
- **Comparison/lint chain:** CapabilityArchitectureLintReport
  (`rekon capability lint architecture`) → CapabilityLintFindingBridgeReport
  (`bridge-findings`) → FindingReport writer (dry-run + confirmed write) →
  lifecycle preview — the **existing bridge pattern** B2 names as the
  route for semantic/inference claims.
- **Governance:** FindingReport / FindingFilterReport / FindingStatusLedger,
  adjudication, coherency delta, publications.

Implication: cluster-A v1 is a **composition slice**, not a green-field
detector — it extends the lint→bridge→findings chain with
declaration-vs-evidence divergence axes rather than introducing a parallel
pipeline.

## Pinned decisions

### A. Boundary drift (pinned)

| Classic rule | Decision | Disposition |
| --- | --- | --- |
| `architecture` | **redesign** — declared-vs-observed divergence on the ontology/CapabilityMap/contract layer vs EvidenceGraph facts, composed onto the existing capability lint chain | `redesigned` |
| `canonical_gap` / `canonical_bypass` / `canonical_misplacement` | **redesign, merged** into the same detector (gap/bypass/misplacement as axes; a gap requires a declaration to exist) | `redesigned` |
| `ownership_violation` | **redesign, folded in** (OwnershipMap is the declaration side) | `redesigned` |
| `pattern_violation` | **port** (config-declared forbidden patterns; lands as a thin emitter in the same family) | `redesigned` until landed, then `ported` |
| `system_anomaly` | **reject** — policed classic's own two-classifier pipeline, meaningless in Rekon's architecture (A4) | `rejected` |

Rationale: A1 (often), A2 (structural families trusted; suppression was
false-signal defense, not principle rejection). The cluster's 981
suppressions are the FP taxonomy the redesign must defeat (see Bench
scoring policy). A3's semantic-drift extension (observed behavior vs
declared purpose) rides the same detector once symbol facts land.
Default-set placement per A4; project-specific law (DDE, gates, streaming,
module registry) goes to the operator overlay per WO-4's split.

### B. Shortcuts (pinned)

| Classic rule | Decision | Disposition |
| --- | --- | --- |
| `tech_debt` | **redesign, split**: deterministic markers (TODO/FIXME/HACK, `@deprecated`, disabled tests) as evidence facts + emitter in the default set; debt **trend over scans** next; LLM debt judgment as opt-in semantic overlay routed through the bridge pattern (inference claims need deterministic corroboration or operator confirmation to reach FindingReport) | `redesigned` |
| `stub` | **redesign, folded** into the tech_debt deterministic core (a stub that matters is evidence-visible; the prose-judged standalone rule ran 92% suppression) | `redesigned` |
| `anti_pattern` | **redesign**: deterministic sub-rules (console-logging, no-business-logic-in-services) re-expressed as declared policy rules; LLM remainder to the semantic overlay | `redesigned` |

Rationale: B1 (stopped reading the list; markers were the actionable
residue), B2 (LLM judgment = context, never proof; default scan stays
deterministic), B4 (markers + trend default; LLM overlay opt-in). B3 names
the trend layer, the agent-introduced-debt ratchet, and
shortcuts-vs-declared-plan as the goal's growth direction.

### C. Redundancy (pinned)

| Classic rule | Decision | Disposition |
| --- | --- | --- |
| `dead_code` | **redesign** on graph reachability (unreferenced exports via symbol facts; unreachable-from-entry via GraphSlices) | `redesigned` |
| `capability_overlap` | **priority redesign** on the capability graph — declared sharing disambiguates intentional overlap from drift (C2, C3) | `redesigned` |
| `semantic_similarity` | **defer** — re-entry when the embedding layer is precision-scored (C4) | `deferred` |
| `duplication` | **defer** — same re-entry condition (file-granularity end of the same goal) | `deferred` |
| `unification_opportunity` | **defer** — same re-entry condition (aggregation end of the same goal) | `deferred` |

Rationale: C1 (goal live, mechanism never earned trust; suppression
measured precision, not value — operator-marked derived), C2–C4. The
re-entry condition is a named slice: embedding-similarity precision scoring
against the corpus before any of the three deferred goals gets a detector.

### D. Conventions (pinned)

| Classic rule | Decision | Disposition |
| --- | --- | --- |
| `naming_violation` | **redesign** as an ontology-backed naming-contract check — the {Entity}{Role} contract (724/846 fires) derived from the declared grammar WO-4 ports; names checked as declarations of system membership, not pattern lists (D2, D3) | `redesigned` |
| `lint` | **reject** — classic ran no linter; the model opined on style. Style enforcement belongs to real linters. 1,282 findings leave the denominator with this citation (D4). "Consume real linter output as evidence facts" is recorded as a **separate future decision**, explicitly not part of this rejection. | `rejected` |

### §5. Preservation ports (contract drift + handoff violations)

Reclassified from net-new to **classic guarantee preservation** per the
operator's cross-cutting correction and the system model. Four additive
rule-map rows carry the obligation:

| Rule-map row | Classic source | Rekon design (sensor track) |
| --- | --- | --- |
| `capability_removed` | drift-artifacts.ts | CapabilityContract diffed against EvidenceGraph history: declared capability loses all supporting evidence between scans |
| `confidence_degraded` | drift-artifacts.ts | same diff: capability confidence drops past a declared threshold |
| `handoff_broken` | drift-artifacts.ts | HandoffContract / contract-declared handoffs checked against head evidence (and handoff coverage events) |
| `outcome_missing` | drift-artifacts.ts | contract-declared outcomes checked for evidence support between scans |

These rows have no corpus fire history (classic emitted them via
`CapabilityChangeReport`, outside issues.json); they classify as
`missed-redesigned` only if a future corpus export surfaces them, and exist
now so the preservation obligation is on the scoreboard, not in prose.

### Net-new detections (operator-ranked, sensor track)

1. **Intent divergence** — IntentPlanBundle / WorkOrder / VerificationPlan
   declare the plan; EvidenceGraph deltas show what happened; divergence is
   a finding. (Rekon product extension.)
2. **Debt trend** — growth-rate over artifact history (lands as the
   tech_debt trend layer, §B).
3. **Verification decay** — verification proofs going stale relative to
   source change; an extension of PathFreshness × VerificationRun lineage,
   not a new detector family.

## Bench scoring policy (authorized by this document)

1. **Dispositions.** `tests/bench/rule-map.json` rows are scoring
   dispositions: `ported` (live emitter, per-finding matching), `unported`
   (undecided gap — none remain after this document), **`redesigned`**
   (decision pinned — port or redesign — detector not yet landed; citation
   required; classifies `missed-redesigned`, in the denominator,
   *uncredited*; flips toward `matched` as detectors land and carry
   `rekonRuleId`), **`deferred`** (real goal, missing substrate; citation +
   re-entry condition required; in the denominator, uncredited, excluded
   from the Phase 1 gap queue), `rejected` (goal not Rekon's to serve;
   citation required; **excluded from the denominator** and listed with its
   citation — per WO-3, the denominator shrinks only this way).
2. **Identity vs coverage.** Deterministic-origin clusters (A, D-naming,
   drift ports) score per-finding identity, as today. LLM-origin clusters
   (B, dead_code's classic baseline) score **goal-level file-set
   coverage** when their redesigned detectors land — classic's prose
   findings don't have stable per-finding identity to match against. This
   policy is recorded now; the coverage scorer lands with the first
   LLM-origin redesign.
3. **Precision dimension.** The 2,155 suppressed classic findings are a
   labeled false-positive dataset. Each redesign mines its rule's
   suppression records for the FP taxonomy it must defeat
   (`type_only_file`, `factory_file_creates_deps`,
   `route_handler_with_service`, `empty_constructor_stub`, …), and the
   bench gains a precision check when detectors land: **fire on classic's
   kept findings; stay silent on its suppressed ones.**
4. **Anti-gaming continuity.** Every disposition change cites this
   document. Recall may still not be improved by uncited reclassification,
   uncited rule-map edits, or score-motivated filter policies. Suppression
   rate measures *mechanism precision*, not *goal value* — high-suppression
   rules (`stub` 92%, `canonical_gap` 69%, `anti_pattern` 47%,
   `capability_overlap` 42%) are priority redesign targets, not
   downgrades; their false positives were missing-context errors, and the
   declared layer is the missing context.

Expected scoreboard after this document's dispositions: denominator
7,308 → **5,994** (lint 1,282 + system_anomaly 32 leave with citations);
recall stays **0.0%** — nothing is credited until detectors land and
match. The instrument now distinguishes *designed-and-queued*
(`missed-redesigned`), *parked-with-re-entry* (`missed-deferred`), and
*not-Rekon's-job* (`rejected`) instead of one undifferentiated gap pile.

## Phase 1 implementation queue (sequenced)

Ordering = operator trust × corpus fire-rate × substrate readiness.
Prerequisite first (two or more redesigns require it). Every entry states
expected bench movement; LLM-origin entries score per the coverage policy.

| # | Slice | Serves | Prereqs | Expected bench movement |
| --- | --- | --- | --- | --- |
| 0 | **Symbol/export-facts EvidenceGraph projection** (graph-aware v3 memo) | A (symbol-level), dead_code, stub-as-evidence, naming | — | none directly; unblocks 1, 5, 6 |
| 1 | **Cluster-A divergence detector v1** — declared (ontology/CapabilityMap/contract/OwnershipMap) vs observed (import facts), composed on the lint→bridge→findings chain; canonical gap/bypass/misplacement + ownership axes; mines the 981-suppression FP taxonomy | architecture, canonical_*, ownership_violation | 0 (partial: import-level works today) | portions of 1,984+50+45+37+2 flip `missed-redesigned`→`matched`; precision check vs suppressed set |
| 2 | **tech_debt deterministic core** — marker facts (TODO/FIXME/HACK, `@deprecated`, disabled tests) + emitter | tech_debt, stub | — | marker-backed share of 2,119 + 21 via goal-level coverage |
| 3 | **Drift preservation ports** — the four §5 signals over CapabilityContract × EvidenceGraph history + handoff artifacts | §5 ports | contracts + history exist | no corpus movement; preservation proven by tests + rows flip toward `ported` |
| 4 | **capability_overlap redesign** on the capability graph with declared sharing | capability_overlap | CapabilityMap/contracts (shipped) | share of 358 |
| 5 | **naming contract check** — ontology-backed {Entity}{Role} | naming_violation | WO-4 grammar port | up to 724 of 846 |
| 6 | **dead_code reachability** — unreferenced exports + GraphSlice reachability | dead_code | 0 | share of 250 via coverage |
| 7 | **anti_pattern / pattern_violation policy pack** — deterministic sub-rules as declared policy rules | anti_pattern, pattern_violation | — | deterministic share of 125 + 4 |
| 8 | **tech_debt trend layer** — debt velocity over artifact history (B3) | net-new #2 | 2 | new detection; bench `new` + this doc as citation |
| 9 | **Intent divergence detector** (net-new #1) | intent artifacts vs evidence | intent artifacts (shipped) | new detection |
| 10 | **Verification decay** (net-new #3) | freshness × verification lineage | shipped substrate | new detection (freshness extension) |

Parked with named re-entry: **embedding precision-scoring slice** gates the
deferred family (semantic_similarity, duplication,
unification_opportunity). WO-4 (declared-grammar port + manifest + overlay
example pack; project-specific sub-rules route there) and WO-5 (actuator
skeleton — prevention side) run as parallel tracks outside this queue.

## Risks / follow-ups

- `docs/strategy/rekon-system-model.md` is cited as operator-approved
  (2026-06-10) but is not yet committed to this repository; its authoring
  session should push it (or the operator paste it for commit) so the
  cross-reference resolves. Until then this document is self-contained.
- WO-4 is referenced by scope (grammar port, manifest, overlay example
  pack) ahead of its own work-order document.
- The two operator-marked-derived answers (A2 verbatim-preservation,
  C1 overlap-consolidation) stand ratified but reversible; a correction
  edits this record and any affected disposition with a new citation line.
