---
freshness:
  paths:
    - packages/capability-model/src/**
    - tests/bench/rule-map.json
---
# Work Order: Cluster-A Divergence Detector v1 (WO-9, queue slot 1)

> Committed verbatim as issued by the operator (2026-06-10) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (detector composition on the
existing lint, bridge, and findings chain; finding writes follow the
shipped dry-run-then-confirmed pattern; no execution, network, or source
writes). Sensor track, Phase 1 queue slot 1 per
`docs/strategy/detection-design-decisions.md`.

**Convention notes:** lives in `docs/work-orders/`, committed before
execution, amendments as commits, executing agent verifies tip first.
**Step 0 applies in full and shapes this slice more than any prior one.**

**Operator input, named not blocked-on:** archetype ratification for the
rekon repo itself (a config edit per WO-4.1's activation rule). Without
it, the detector correctly scores zero on the home repo. If ratified
before completion, the self-scan results join the evidence; if not, the
completion summary records it as the pending operator action.

---

## Step 0: substrate audit (mandatory, reshapes scope)

Per the work-orders convention: audit from tier-1 sources before design.
Specifically:

1. **Group the latest FindingReport by ruleId.** The WO-6 dogfood showed
   228 open findings on the rekon repo. Determine what they are (expected:
   `capability_architecture_policy` from the lint-to-bridge chain),
   whether they're governed (in the lifecycle, adjudicated) or
   accumulating untriaged, and report the distribution.
2. **Inventory what `CapabilityArchitectureLintReport` already checks.**
   The WO-4 decision memo names layers, file types, and forbidden types as
   the lint chain's grammar reads. Enumerate the live checks from source.
3. **Inventory the bridge and writer path** (dry-run preview, confirmed
   write, lifecycle entry) as the emission route this detector rides.

The decision memo reports found-versus-build. If the lint chain already
covers the layer and file-type axes, this slice builds **only the missing
divergence axes** plus bench wiring, and says so. Rebuilding live
capability is the failure Step 0 exists to prevent.

## Objective

Extend declared-vs-observed divergence detection to the full cluster-A
scope pinned in the decisions doc, riding the existing chain: every
finding names the declaration it diverges from, jurisdiction is absolute,
and the bench moves off 0.0% for the first time with both recall and
precision measured.

## The divergence axes (built or confirmed-existing per Step 0)

1. **Layer and import law** at symbol-level granularity: the WO-8
   `import_specifier` facts with `resolvedTarget` evaluated against the
   compiled grammar's layer edges and `cannotImport` rules. File-level
   evaluation may already exist in the lint chain; the symbol-level
   extension is this slice's addition.
2. **Canonical gap, bypass, and misplacement** as axes of one check: a
   gap fires only where a canonical path is *declared* and unsatisfied; a
   bypass only where declared and circumvented. No declaration, no
   finding. This is the FP class elimination by construction that the
   detection design pinned.
3. **Ownership violation:** OwnershipMap `owns` and `doesNotOwn` against
   observed placement and imports.
4. **Placement rules** from the compiled grammar (file type and location
   law), production scope only.

Out of this slice: the naming contract (slot 5), reachability (slot 6),
and the semantic behavior-vs-purpose extension (rides this detector in a
later slice per A3; needs more than symbol facts).

## Pinned constraints

- **Jurisdiction is absolute.** Findings derive only from packs in
  `findingsEligiblePackIds` (base, declared, ratified). Unratified
  archetype law surfaces only through the advisory path, clearly marked.
  A jurisdiction test proves the detector emits nothing on a repo with no
  ratified grammar.
- **Every finding carries its law.** The finding payload cites the
  declaration diverged from (grammar rule id, ownership entry, canonical
  declaration), with the pack and tier it came from. Declared-vs-observed
  means the observer can always ask "diverged from what."
- **Non-production scope fix folds in** (the WO-4.1 follow-up): advisory
  and detector evaluation exclude non-production paths, classic
  `isNonProductionPath` parity, with its own test.
- **The FP gauntlet is the precision gate.** Mine the architecture
  cluster's 981 classic suppressions (the labeled-negative dataset:
  `type_only_file`, `factory_file_creates_deps`,
  `route_handler_with_service`, `empty_constructor_stub`, and peers) into
  fixtures. The detector fires on classic's kept findings and stays
  silent on its suppressed ones; the bench precision dimension lands here
  as a scorer, not a promise.
- **Stable rule ids, mapped.** `rule-map.json` rows for `architecture`,
  `canonical_gap`, `canonical_bypass`, `canonical_misplacement`,
  `ownership_violation`, and `pattern_violation` gain `rekonRuleId`
  mappings; matched findings flip `missed-redesigned` toward `matched`
  per the bench policy. Every row edit cites this work order.
- **No score-motivated filters.** The anti-gaming rules hold: precision
  comes from detector design against the gauntlet, never from filter
  policies added to move the number.

## Bench obligations

- Full corpus bench run. Expected movement: portions of architecture
  (1,984), canonical family (132), ownership (2), and pattern_violation
  (4) flip toward `matched`. Report per-repo recall (the aggregate is
  dominated by the codebase-intel self-scan; per-repo is the primary
  readout) and the precision score against the suppressed set.
- **Generality re-run:** figma-ds on the 446-pair graph, nothing
  ratified: zero detector findings (jurisdiction proof) and sane
  advisory output. This closes the WO-4.1 thin-evidence risk.
- Cluster A is deterministic-origin: per-finding identity matching, no
  coverage scorer needed here.

## Verification plan

Required checks (per AGENTS.md): `npm run typecheck` / `npm run test` /
`npm run build`.

Slice-specific evidence: Step 0 inventory in the decision memo; contract
tests per axis with fire and silent cases drawn from the FP gauntlet; the
jurisdiction test; the non-production scope test; the bench report
(per-repo recall, precision vs suppressed, movement table); the figma-ds
generality result; dry-run finding preview before any confirmed write;
and, if ratification lands in time, the rekon self-scan triage snapshot
(what the detector finds at home, grouped, with the 228 pre-existing
findings reconciled rather than duplicated).

## Completion summary must include

CHANGES MADE / PUBLIC API CHANGES / TESTS · VERIFICATION (Step 0
found-vs-built, bench movement table with per-repo recall and precision,
generality result, rule-map updates with citations) / INTENTIONALLY
UNTOUCHED / RISKS · FOLLOW-UP / NEXT STEP (expected: slots 5 and 6 ride
the same facts; slot 2 wave per the operator's dispatch; D3's unified
evidence-strength scale noted as the severity/confidence alignment
follow-up).

---

## PURPOSE PRESERVATION CHECK

- **Original problem:** boundary drift was classic's reason to exist (A1:
  often; this cluster is why Rekon exists), and classic's mechanism
  drowned the signal in context-blind false positives (981 suppressions).
- **Classic workflow guarantee:** the structural families the operator
  trusted: layering, canonical paths, ownership. Suppression was defense
  of the principle against the mechanism.
- **Rekon equivalent guarantee:** the same principles detected against
  declared law with jurisdiction, every finding citing the declaration it
  diverges from, precision proven against classic's own suppression
  record rather than asserted.
- **What would mean we failed:** findings without citable law; emission
  from unratified packs; precision bought with filters instead of design;
  the 228 pre-existing findings duplicated instead of reconciled; or
  recall claimed from the aggregate while per-repo numbers hide regressions.
- **Regression test for the original problem:** the FP gauntlet fixtures
  and the jurisdiction test, permanent; the bench precision dimension,
  ongoing.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** the architecture cluster (41
  sub-rules), `canonical_*`, `ownership_violation`, `pattern_violation`,
  redesigned per the pinned decisions; the GraphOntologyValidator lineage
  arrives here as detection rather than only as filters.
- **What Rekon keeps:** the trusted structural families and classic's
  suppression record as the precision ground truth.
- **What Rekon redesigns:** heuristics-without-context become
  declared-vs-observed with jurisdiction; the missing context classic's
  FPs lacked is the declared layer this detector reads.
- **What Rekon does not port:** the hardcoded project-specific sub-rules
  (overlay tier, per WO-4.1) and the prose-judged architecture remainder
  (semantic overlay, later).
- **How this advances the migration:** the scoreboard moves. Parity stops
  being a plan and starts being a number with a direction.
