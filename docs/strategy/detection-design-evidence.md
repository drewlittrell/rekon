# Detection Design Evidence Dossier (WO-3, Step 1–2 + drafted Step 4 inputs)

**Status: evidence dossier — no design decision is pinned by this document.**
Every recommendation below is marked `AGENT-DRAFT` and is an input to the
Step 3 operator adjudication interview, not a conclusion. The pinned
per-goal decisions land in `docs/strategy/detection-design-decisions.md`
only after the operator answers the questionnaire at the end of this
dossier. Rule-map dispositions in `tests/bench/rule-map.json` do not change
until that document exists and is cited row-by-row.

Companion data: [`detection-design-evidence.data.json`](detection-design-evidence.data.json)
(per-rule fire distributions, suppression ratios, sub-rule inventories —
counts and rule identifiers only). Per-finding samples with real paths live
in the **local dossier supplement under the corpus root**
(`<REKON_PARITY_CORPUS>/detection-design-samples.md`), never in this
repository.

## Governing principle (pinned verbatim from WO-3)

> **Detection mechanisms may be redesigned; detection goals must be served
> or explicitly rejected.** A classic rule is not a requirement; the failure
> mode it was built to catch is. Port classic's mechanism only when it
> remains the best available design given Rekon's substrate (EvidenceGraph
> provenance, GraphSlices, OwnershipMap/CapabilityMap, declared-intent
> artifacts, the adjudication + filter stack, memory). Where Rekon's
> substrate enables a better design, build that instead and record the
> divergence as a design decision, not a gap.

## Provenance and method

- **Corpus:** the four non-zero classic baselines (7,308 weighted findings:
  a Next.js design-system repo, a large product MVP, a simulation engine,
  and classic's self-scan) plus the suppression layers
  (`filtered-issues.json`) across all seven locally scanned repos —
  2,155 suppressed findings.
- **Classic source read as reference only** (AGENTS.md rule 4 / ADR 0004):
  `domain/issues/evaluators/**`, `domain/issues/RulesResolver.ts`,
  `services/issues/**` (concern pipeline, canonical issues, semantic
  similarity, ownership detection), `domain/analysis/**` (ontology
  validation, capability comparison), `domain/bugs/deriveBugFindings.ts`.
  Nothing is imported.
- **Actioned-rate from dispositions: absent.** Every classic issue that
  carries a `status` field carries `status: "new"`; the corpus contains no
  accepted/ignored/resolved dispositions. Per the work order, signal-quality
  ground truth therefore comes from (a) the suppression layer — what the
  operator/policies actively tuned out — and (b) the Step 3 interview.

## The two architectures inside "classic detection"

The single most consequential finding of the source read: classic's 17 rule
ids hide **two completely different detection architectures**, and the
port-vs-redesign calculus differs for each.

1. **LLM-concern pipeline.** `tech_debt`, `lint`, `dead_code`, `stub`, and
   part of `anti_pattern`/`architecture` are not static rules. Classic's
   per-file LLM analysis emits free-text "concerns" with a type and
   severity; `services/issues/concern-issues.ts` promotes them to issues
   gated by **keyword heuristics over the LLM's own prose** (`must not`,
   `never`, vs. speculative `consider`, `could`). Porting these rules means
   porting an LLM-analysis pipeline plus prose-shape filters — there is no
   deterministic mechanism to migrate.
2. **Deterministic evaluators.** `architecture` (most of it),
   `naming_violation`, `pattern_violation`, the `canonical_*` family,
   `capability_overlap`, `semantic_similarity`, `ownership_violation`,
   `system_anomaly`, `duplication`, `unification_opportunity` run as
   compiled invariant rules (`RulesResolver.runCompiledInvariantRules` over
   `RULE_EVALUATORS`) or dedicated analyzers, configured per repo with
   enable/disable switches — 76 distinct sub-rule ids observed in the
   corpus, including project-specific overrides hardcoded for individual
   repos.

The 76-sub-rule inventory is the accretion thesis made measurable: the
`architecture` umbrella alone carries 41 distinct sub-rules (5 of them
project-specific overrides), each added when a particular problem appeared
in a particular repo.

---

## Goal cluster A — Purpose / boundary drift

**Members:** `architecture` (1,984 fires), `canonical_gap` (45),
`canonical_bypass` (50), `canonical_misplacement` (2), `system_anomaly`
(32), `ownership_violation` (37), `pattern_violation` (4).

**The question this cluster answers:** *is the code where the declared
structure says it should be, doing what that location promises, importing
only what that location may import?* This is Rekon's reason to exist.

### architecture — 1,984 fires, 33% suppression, 41 sub-rules

- **Mechanism (classic):** three overlapping sources. (1) Compiled
  invariant evaluators per sub-rule — layering (`delegates / orchestrates /
  decides / persists` direction checks), thin-services/handlers line- and
  responsibility-thresholds, DI rules ("services must not instantiate
  infra"), route conventions, testing-presence rules
  (`zod_schemas_have_validation_tests`), import conventions
  (`imports.use_at_alias`). (2) `validateAgainstOntology.ts`: a
  file-types ontology assigns each file a role; role definitions constrain
  location, suffix, allowed imports, and hub status. (3) LLM concerns
  typed `architecture` passing the keyword gate.
- **Fire distribution:** all four repos; ~2 fires/file across 1,003
  distinct files — broad, not point-shaped.
- **Signal quality indicators:** the **highest absolute suppression in the
  corpus** (981 suppressed; 33%). The dominant suppression reasons are
  structural false-positive classes the heuristics could not see:
  `type_only_file` (664 across rules), `factory_file_creates_deps` (382),
  `route_handler_with_service` (360) — i.e., per-file pattern heuristics
  repeatedly mis-modeled legitimate shapes, and filters were bolted on
  after the fact.
- **Accretion markers:** 41 sub-rules; 5 hardcoded project-specific
  overrides; testing-presence rules filed under "architecture"; the same
  goal also patrolled by `canonical_*`, `ownership_violation`, and
  `system_anomaly` (overlapping responsibility).
- **AGENT-DRAFT design — redesign.** This is the textbook
  declared-vs-observed divergence detector: compare OwnershipMap /
  CapabilityMap / capability-ontology declarations and CapabilityContracts
  against EvidenceGraph import + symbol facts, and emit findings only where
  a *declaration* is contradicted by *evidence* — instead of inferring
  intent from per-file pattern heuristics and then suppressing the
  inevitable misreads. Classic's suppression catalog becomes Rekon's design
  input: `type_only_file` et al. are evidence-distinguishable shapes, so
  the detector never fires on them rather than filtering them afterwards.
  Substrate needed: the export/symbol-facts EvidenceGraph projection
  (graph-aware v3 memo) for symbol-level divergence; import-level
  divergence is feasible on today's facts. The thin-services / complexity
  sub-rules are a different goal in disguise (size/complexity budgets) and
  should be adjudicated separately in Step 3. Bench posture: same goal,
  comparable granularity → findings map to classic `architecture` for
  matching where a mapped declaration exists; everything else is **designed
  divergence** under the `redesigned` disposition.

### canonical_gap (45) / canonical_bypass (50) / canonical_misplacement (2)

- **Mechanism (classic):** `services/issues/CanonicalIssues.ts` against a
  canonical-paths config: *gap* = a capability with no canonical home,
  *bypass* = code reaching around a canonical implementation (e.g. raw
  fetch where a canonical client exists), *misplacement* = canonical-shaped
  code outside its canonical home.
- **Signal quality:** `canonical_gap` is the second-most-suppressed rule in
  the corpus (**69% suppression**) — the gap heuristic mostly found things
  the operator did not consider gaps. `canonical_bypass` (21%) and
  `canonical_misplacement` (0%, n=2) fired rarely and precisely.
- **Accretion markers:** three rule ids for one concept (declared canonical
  homes vs observed usage), separate from `architecture` which patrols the
  same boundary with different heuristics.
- **AGENT-DRAFT design — redesign, merged.** One declared-vs-observed
  detector over canonical declarations: CapabilityMap/ontology names the
  canonical provider per capability; EvidenceGraph import facts show who
  implements/uses what; divergence emits a single finding family with a
  `gap` / `bypass` / `misplacement` axis in details. The 69% gap-noise
  problem is addressed by requiring a *declaration* before a gap can exist
  (no inferred "should have a canonical home" guesses).

### system_anomaly (32, 29% suppression)

- **Mechanism (classic):** classifier disagreement — "LLM labeled
  system=X but signals (N%) suggest Y". An internal consistency check
  between classic's LLM system-labeler and its deterministic signal-based
  classifier.
- **AGENT-DRAFT design — reject (as a user-facing detector).** This
  patrols classic's *own pipeline disagreement*, not the user's codebase.
  Rekon's equivalent concern (is a file's system membership unknown?) is
  already a built-in emitter
  (`architecture.noUnknownSystemForSourceFile`); a two-classifier
  disagreement rule has no meaning in Rekon's architecture. Candidate
  citation target: the decisions doc section ratifying this rejection.

### ownership_violation (37, 12% suppression)

- **Mechanism (classic):** `ownership-detection.ts` + alignment-map rules:
  files/capabilities touching systems they are not declared owners of,
  with hand-tuned helpers (e.g. `importsDecisionEngine`) that are
  project-vocabulary-specific.
- **AGENT-DRAFT design — redesign, folded into the cluster-A
  declared-vs-observed detector** (OwnershipMap is literally the
  declaration side). Low volume, low suppression: the goal earned its keep;
  the mechanism is replaceable.

### pattern_violation (4, 0% suppression)

- **Mechanism (classic):** `forbiddenPatternsBySystem.ts` — per-system
  forbidden-pattern lists from config.
- **AGENT-DRAFT design — port (small).** Declared forbidden patterns
  checked against evidence is already Rekon-shaped (the built-in policy
  rules are exactly this form); a config-driven forbidden-pattern emitter
  is a thin, honest port. Tiny corpus volume; sequencing priority comes
  from operator trust, not fire count.

---

## Goal cluster B — Accumulating shortcuts

**Members:** `tech_debt` (2,119 fires, 8% suppression), `stub` (21 fires,
**92% suppression**), `anti_pattern` (125, 47% suppression).

**The question:** *where is deferred work piling up, and is it growing?*

### tech_debt — the largest single rule in the corpus

- **Mechanism (classic):** LLM-concern pipeline. The model reads each file
  and writes prose concerns; `categorizeTechDebt` buckets the prose; the
  keyword gate drops speculative phrasing and low-severity items without
  strong wording. There is no deterministic detector to port.
- **Fire distribution:** 2,119 across 939 files (~2.26/file) — the
  highest-volume signal classic produced, and the lowest suppression of
  any high-volume rule (8%), i.e. the operator largely *left it standing*.
  Whether that means "trusted" or "tuned out mentally" is precisely a
  Step 3 question.
- **AGENT-DRAFT design — split.** (a) The deterministic core (TODO/FIXME/
  HACK markers, `@deprecated` usage, disabled tests) is a cheap evidence
  fact + emitter — portable without an LLM. (b) The LLM-judged remainder is
  a candidate for Rekon's existing LLM-provider layer *as a filter-stack
  participant, not a primary emitter* — and the substrate-native upgrade
  classic could never do: **trend over scans**. Rekon keeps artifact
  history; debt that is growing across EvidenceGraph generations is signal
  even when any single snapshot is acceptable state. Draft disposition:
  redesign (deterministic core first; trend layer after; LLM judgment
  deferred until the provider layer is scored for this use).

### stub — 92% suppression: the noisiest rule classic shipped

- **Mechanism (classic):** LLM concerns typed `stub` plus
  `parseStubDescription` prose parsing; suppressions dominated by
  `empty_constructor_stub` (235) — the heuristic could not tell an
  intentional thin constructor from an abandoned stub.
- **AGENT-DRAFT design — fold into the tech_debt deterministic core.**
  A stub that matters is evidence-visible (exported symbol with empty/throw
  body — needs the symbol-facts projection). The standalone rule, judged on
  prose, earned a 92% suppression rate; Rekon already consumed classic's
  stub *filter* idea (details.stubName) as a finding filter.

### anti_pattern (125, 47% suppression)

- **Mechanism (classic):** mixed — a small evaluator set
  (`observability.no_console_logging` is nearly half the fires) plus LLM
  concerns. 5 sub-rules.
- **AGENT-DRAFT design — port the deterministic sub-rules** that survive
  Step 3 trust review as config-driven policy rules (console-logging,
  no-business-logic-in-services); drop the LLM-prose remainder into the
  same posture as tech_debt's. The 47% suppression suggests at least some
  sub-rules were noise; per-sub-rule trust is a Step 3 question.

---

## Goal cluster C — Redundancy

**Members:** `capability_overlap` (358, 42% suppression),
`semantic_similarity` (118, 12%), `dead_code` (250, 7%), `duplication`
(24, 8%), `unification_opportunity` (11, 31%).

**The question:** *what is doing the same job twice, or no job at all?*

### capability_overlap / semantic_similarity / unification_opportunity

- **Mechanism (classic):** all three run on classic's **feature-bag
  embedding index** — sparse vectors over extracted features, cosine
  similarity with separate same-system / cross-system thresholds
  (`semantic-similarity.ts`), capability-verb hierarchies for overlap
  classification (`capability-comparison-core.ts`), cluster reporting for
  unification opportunities. Three rule ids, one embedding substrate,
  escalating aggregation.
- **Signal quality:** capability_overlap's 42% suppression is concentrated
  in generic capability buckets (`validation`, `transformation`,
  `data_access` — the top sub-rules are exactly the categories where
  "overlap" is normal, not pathological).
- **AGENT-DRAFT design — defer, with a named re-entry condition.** Rekon
  has a live embedding layer (provider index + retrieval, shipped and
  dogfooded) but it has not been scored for similarity-detection quality.
  Re-entry condition: an embedding-similarity scoring slice against the
  corpus (precision sampling on known-duplicate pairs) before any of the
  three goals gets a detector. Porting classic's feature-bag math would
  mean maintaining a second embedding system — rejected as design;
  deferred as goal.

### dead_code (250, 7% suppression)

- **Mechanism (classic):** LLM-concern typed dead_code (no deterministic
  reachability analysis found in the emitting path).
- **AGENT-DRAFT design — redesign on GraphSlice reachability.** Export
  facts + import facts give a deterministic unreferenced-export detector
  (needs the symbol-facts projection for confidence); GraphSlices make
  "unreachable from any entry point" computable instead of LLM-guessed.
  Low suppression + real volume across all repos: the goal demonstrably
  mattered.

### duplication (24, 8% suppression)

- **Mechanism (classic):** `DuplicateDetectionHandler` — near-duplicate
  file detection.
- **AGENT-DRAFT design — defer into the same embedding re-entry condition
  as cluster C's similarity family** (it is the file-granularity end of the
  same goal). Tiny volume.

---

## Goal cluster D — Convention coherence

**Members:** `naming_violation` (846, 14% suppression, 7 sub-rules),
`lint` (1,282, 6% suppression).

**The question:** *do names and style communicate system membership?*

### naming_violation

- **Mechanism (classic):** deterministic evaluators against a naming
  contract — suffix taxonomies (`taxonomy.hub_suffix_requires_hub_status`),
  forbidden type suffixes, per-system naming conventions. 724 of 846 fires
  are one sub-rule: `architecture.naming_contract_violation`.
- **AGENT-DRAFT design — port-shaped redesign.** A naming contract is a
  *declaration*; checking observed file/symbol names against it is the
  same declared-vs-observed form as cluster A, sharing the ontology
  substrate (which Rekon already has: capability-ontology packs +
  overrides). Whether the default rule set ships in open-source Rekon or
  stays an operator overlay is a Step 3.4 question (mission scope vs
  personal tooling).

### lint

- **Mechanism (classic):** LLM-concern pipeline typed `lint` — classic ran
  no actual linter; the model opined on style.
- **AGENT-DRAFT design — reject.** Style enforcement belongs to real
  linters (eslint/biome) that repos already run; Rekon re-deriving lint
  opinions via LLM duplicates better tools with worse determinism. The
  candidate Rekon-native contribution is *consuming* linter output as
  evidence, not re-detecting it. Rejection requires the decisions doc as
  citation; its 1,282 findings then leave the denominator via a `rejected`
  row — the largest single honest movement available to the bench, and it
  must come from operator ratification, not from the score motive.

---

## What classic never caught (Step 3.3 drafts — both directions of the frame)

Candidates the substrate makes detectable that classic had no equivalent
for; each needs operator ranking in Step 3:

1. **Declared-intent divergence:** IntentPlanBundle / WorkOrder /
   VerificationPlan say X was the plan; EvidenceGraph deltas show Y
   happened. Classic had no declared-intent artifacts to diverge from.
2. **Capability contract drift:** a CapabilityContract pinned consumers/
   producers; the observed graph now violates it — drift caught at the
   contract, not rediscovered per file.
3. **Debt trend regression:** per-cluster-B above — growth-rate detection
   over artifact history, impossible in classic's single-snapshot world.
4. **Verification decay:** capabilities whose verification proofs go stale
   relative to source changes (PathFreshness × VerificationRun lineage).
5. **Handoff contract violations:** agent handoffs that skip declared
   reading order / verification gates — Rekon-native workflow surface.

## Bench integration (reserved, not implemented)

Per the work order: redesigned detectors either map to the classic rule for
matching (same goal, comparable granularity) or are declared **designed
divergence** under a reserved `redesigned` rule-map disposition whose
misses classify as such, citing the decisions doc. No bench code changes in
this slice; nothing leaves the denominator except future `rejected` rows
with rationale.

---

## Step 3 — Operator adjudication questionnaire

Answers will be recorded verbatim in
`docs/strategy/detection-design-decisions.md` as the signal-quality ground
truth. Per goal cluster:

**A. Purpose / boundary drift** (`architecture`, `canonical_*`,
`system_anomaly`, `ownership_violation`, `pattern_violation`)
1. Did findings of this type change what you did? (often / sometimes / never)
2. Which sub-rule families did you trust (layering? DI? ontology-role?
   canonical-bypass?) and which did you tune out?
3. What boundary drift did classic miss that you wanted caught?
4. In scope for open-source Rekon's default set, or operator overlay?

**B. Accumulating shortcuts** (`tech_debt`, `stub`, `anti_pattern`)
1. Did tech_debt's 2,119 findings change your work — or did you stop
   reading them? (often / sometimes / never)
2. Was the LLM's judgment of debt ever the thing you valued, or only the
   deterministic markers (TODOs, deprecations, disabled tests)?
3. What shortcut accumulation did classic miss (e.g. growing debt you
   only noticed much later)?
4. Default set or overlay?

**C. Redundancy** (`capability_overlap`, `semantic_similarity`,
`dead_code`, `duplication`, `unification_opportunity`)
1. Did similarity/overlap findings ever drive a real consolidation?
   (often / sometimes / never)
2. dead_code at 7% suppression: trusted? Overlap at 42%: tuned out?
3. What redundancy did classic miss?
4. Default set or overlay — and do you accept the drafted defer-until-
   embedding-scored re-entry condition?

**D. Convention coherence** (`naming_violation`, `lint`)
1. Did naming findings change names? Did lint findings change anything?
2. Trust split between the naming contract (724 fires on one sub-rule)
   and the rest?
3. What convention drift did classic miss?
4. Is `lint` rejection (delegate to real linters; classic's LLM-lint had
   no linter behind it) ratified? Default set or overlay for naming?

**Cross-cutting**
5. Rank the five "classic never caught" candidates (or strike them).
6. Anything in the 76-sub-rule inventory you want preserved verbatim that
   the cluster designs above would drop?

---

*Dossier provenance: classic source at `domain/issues/evaluators/**`,
`domain/issues/RulesResolver.ts`, `services/issues/**`,
`domain/analysis/**`, `domain/bugs/deriveBugFindings.ts` (reference only,
never imported — AGENTS.md rule 4 / ADR 0004); corpus statistics in the
companion data JSON; per-finding samples in the local supplement under the
corpus root.*
