# Changelog

All notable changes to Rekon will be documented in this file.

## 0.1.0-alpha.1

- Shipped `EvidenceGraph` export / symbol facts projection
  v1 (P1.1 evidence-export-symbol-facts-v1 slice) — the
  substrate the graph-aware filter provider v3 decision
  memo recommended.

  **`@rekon/capability-js-ts` evidence provider extensions:**
  - New `kind: "export"` facts. `subject` = repo-relative
    file path; `value: { name, kind, default? }`. `kind`
    is one of `"function" | "class" | "const" | "let" |
    "var" | "type" | "interface" | "namespace" |
    "default" | "unknown"`. `default: true` only for
    `export default …` forms.
  - New `kind: "symbol"` facts. `subject` = repo-relative
    file path; `value: { name, kind, exported? }`.
    `exported` is `true` when the declaration itself
    begins with `export` (conservative: symbols
    re-exported via separate `export { ... }` clauses are
    NOT marked exported; the corresponding export fact
    captures the re-export side).
  - Extraction covers: named declaration exports
    (function / class / const / let / var / type /
    interface / namespace / enum), default exports
    (`export default function|class|<expression>`),
    `export { a, b as c }` named lists (renamed alias is
    the exported identifier; source is excluded),
    `export * from "..."` (`name: "*", kind:
    "namespace"`), `export * as alias from "..."`, and
    local declarations of every supported keyword.
  - Both kinds dedupe by `kind + subject + value` (line
    is intentionally NOT included in provenance so
    duplicate declarations on different lines collapse to
    one fact).
  - **No source-file reads at filter time** — extraction
    happens at evidence-extraction time (the provider's
    existing file scan). No AST, no type checker, no
    LLM, no semantic role inference.

  **`@rekon/kernel-findings` new exports:**
  - `listExportsForFile(context, filePath):
    FileExportSummary[]` — reads
    `EvidenceGraph` export facts and returns the
    sorted-by-name-then-kind summary list. Path matching
    uses `normalizeRepoPath`.
  - `listSymbolsForFile(context, filePath):
    FileSymbolSummary[]` — reads `EvidenceGraph` symbol
    facts the same way.
  - Both return the empty array when the graph is absent
    or has no facts for the file.

  **No graph-aware filter consumes the new facts yet.**
  The substrate ships alone, per the v3 memo's
  substrate-first discipline. Existing v1 + v2
  graph-aware filter behavior is unchanged (pinned by the
  new substrate test's "graph-aware filter behavior is
  unchanged in this substrate batch" case). Older
  `EvidenceGraph` artifacts continue to validate (no new
  artifact type, no `schemaVersion` bump).

  Strategy docs updated:
  `docs/artifacts/evidence-graph.md` (new "Built-in Fact
  Kinds" table + dedicated "Export / symbol facts
  (substrate v1)" section);
  `docs/concepts/graph-aware-finding-filters.md`
  (new helpers documented in the "v2 Helpers" section);
  `docs/strategy/graph-aware-filter-provider-v3-decision.md`
  (top blockquote updated with substrate-shipped status);
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (top blockquote updated with substrate-shipped status);
  `docs/strategy/issue-governance-architecture-decision.md`
  (step 18 flipped to shipped; step 19 reserved for the
  first v3 candidate check);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (new substrate slice
  entries).

  Pinned by
  `tests/contract/evidence-export-symbol-facts.test.mjs`
  (13 tests). Full suite: 744 passed / 1 skipped / 0
  failed.

  Implements step 18 of the issue governance ADR
  Implementation Order (flipped from `(future)` to
  `(shipped)`). No artifact `schemaVersion` bump. No new
  artifact type. No new capability role. No new CLI
  subcommand or flag. No new reason codes. No source-file
  reads at filter time. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator` port.
  No version bump. No npm publish.

  The first v3 candidate check that consumes the new
  facts (strongest candidate per the v3 memo:
  strengthening `nextjs-route-convention` to confirm
  route file exports structurally) is the recommended
  next slice.

- Shipped graph-aware filter provider v3 decision memo —
  remaining classic checks (P1.1
  graph-aware-filter-provider-v3-decision slice).
  Strategy-only batch — no runtime behavior changes ship.
  The memo
  ([`docs/strategy/graph-aware-filter-provider-v3-decision.md`](docs/strategy/graph-aware-filter-provider-v3-decision.md))
  evaluates the ten most prominent remaining classic
  graph / ontology checks (UI HTTP provider abstraction,
  UI hook uses HTTP not DB, hardcoded config not DDE,
  module gate verified caller beyond current
  kind/path, framework-specific route segment config
  conventions, factory-by-capability beyond path,
  provider boundary / external API provider proof,
  runtime truth graph checks, full policy-owner parser,
  test / generated / external graph-ontology checks
  beyond paths) and concludes that **no broad v3 catalog
  ships next**.

  **Decision separation:**
  - **Port now:** zero checks. Every candidate either
    needs missing projections, is project-specific, or
    is permanently rejected.
  - **Needs missing projections first:** UI HTTP
    provider abstraction (deeper), UI hook uses HTTP
    not DB, framework-specific route segment config
    conventions, factory by capability beyond path,
    provider boundary / external API provider proof.
  - **Defer:** module gate verified caller beyond
    current kind/path (needs call-graph evidence),
    factory by capability (needs capability role
    taxonomy), runtime truth graph checks (needs
    runtime substrate — likely deferred indefinitely).
  - **Reject:** monolithic `GraphOntologyValidator`
    port, source-reading filters, LLM / semantic /
    fuzzy / embedding matching, project-specific
    hardcoded exception catalogs in core
    (`hardcoded-config-not-dde` belongs in an external
    rule pack), full policy-owner parser.

  **Required artifact projections identified
  (in priority order):**
  1. **`EvidenceGraph` export / symbol facts** —
     unblocks UI hook role, UI hook uses HTTP not DB,
     framework-specific route segment config beyond
     v2, capability-confirmed factory. Additive
     optional `kind: "export"` and `kind: "symbol"`
     facts on the existing `EvidenceGraph` (no new
     artifact type, no `schemaVersion` bump).
     **Recommended first.**
  2. **`CapabilityMap.entries[].role?: string`** —
     unblocks provider boundary / external API provider
     proof and a stronger capability-confirmed factory.
  3. **Call-graph / referrer evidence** — unblocks
     deeper module-gate caller confirmation and
     reverse-import test / generated / external
     confirmation.

  **Recommended next implementation:**
  `EvidenceGraph` export / symbol facts projection v1
  ships alone as the substrate. No graph-aware filter
  ports in the same slice — the substrate ships first,
  v3 candidate checks consume it in a follow-up.

  Strategy docs updated:
  `docs/strategy/graph-ontology-validator-lite-audit.md`
  (new "v3 Decision Follow-up" section + v2/v3 update
  blockquotes); `docs/strategy/issue-governance-architecture-decision.md`
  (step 17 flipped to shipped; step 18 reserved for the
  substrate); `docs/strategy/classic-guarantee-regression-plan.md`
  (v3 decision memo entry with pin to docs test);
  `docs/strategy/classic-subsystem-purpose-map.md` (row 6
  references v3 memo and substrate);
  `docs/strategy/classic-behavior-roadmap.md` and
  `docs/strategy/roadmap.md` (v3 decision memo entries).

  Pinned by
  `tests/docs/graph-aware-filter-provider-v3-decision.test.mjs`.
  No artifact `schemaVersion` bump. No new artifact
  type. No new capability role. No new CLI subcommand
  or flag. No new reason codes. No source-file reads.
  No LLM, semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No
  npm publish.

  `EvidenceGraph` export / symbol facts projection v1 is
  the recommended next slice.

- Shipped graph-aware finding filter provider v2 — file-
  existence / import-evidence strengthening (P1.1
  graph-aware-finding-filter-provider-v2 slice).
  Strengthens the five v1 graph-aware checks with deeper
  artifact-backed evidence while preserving every prior
  invariant: no source-file reads, no LLM / semantic /
  fuzzy / embedding matching, no `GraphOntologyValidator`
  port, no new reason codes, raw `FindingReport` remains
  byte-identical, lifecycle / adjudication / coherency
  continue to exclude graph-filtered findings.

  **New pure helpers in `@rekon/kernel-findings`
  (exported):**
  - `normalizeRepoPath(path)` — strips leading `./` and
    backslashes; rejects absolute paths and `.rekon/`
    artifact paths (returns the empty string so consumers
    cannot accidentally match against them).
  - `sameRepoPath(a, b)` — comparison over normalized
    paths.
  - `siblingPath(filePath, siblingName)` — computes the
    sibling path in the same directory.
  - `listObservedRepoFiles(ctx)` — sorted, deduped,
    normalized `ObservedRepo.files`.
  - `observedRepoHasFile(ctx, path)` — membership test
    against `ObservedRepo.files`.
  - `findSiblingFile(ctx, filePath, siblingName)` —
    returns the sibling path when present in
    `ObservedRepo.files`, `undefined` otherwise.
  - `listImportTargetsForFile(ctx, filePath)` — reads
    `EvidenceGraph` import facts
    (`kind === "import"`, `subject === filePath`).
  - `fileImportsTargetMatching(ctx, filePath, predicate)`
    — filters the import targets through a predicate.

  **Strengthened checks:**
  - `route-handler-with-service` — strongest:
    `Finding.details.imports` handler entry; fallback:
    `EvidenceGraph` import fact pointing at a handler
    (`usedArtifacts: ["EvidenceGraph"]`); fallback:
    `ObservedRepo.files` sibling `handler.ts` /
    `handler.tsx` (`usedArtifacts: ["ObservedRepo"]`).
  - `route-http-middleware-only` — prefers
    `EvidenceGraph` import facts over
    `Finding.details.imports`. Filters only when at
    least one infra import exists AND every infra import
    lives under `/infra/http/` or `/infra/Identity`.
    No-op when no import evidence is available from
    either source.
  - `external-api-comment-only` — prefers
    `EvidenceGraph` import facts over
    `Finding.details.imports`. An explicit empty
    `details.imports: []` array still proves absence at
    medium confidence. No-op when no import evidence is
    available.
  - `factory-file-creates-deps` — path-only matches now
    return `usedArtifacts: []`; `CapabilityMap` matches
    return `usedArtifacts: ["CapabilityMap"]`. Evidence
    string distinguishes the two sources.
  - `module-gate-verified-caller` — prefers
    `OwnershipMap` + `ObservedSystem.kind === "module"`
    (medium, `usedArtifacts: ["OwnershipMap",
    "ObservedRepo"]`) over the bare `/modules/` path
    heuristic (medium, fallback only). The
    `GateEvaluator` path remains the strongest signal
    (high, `usedArtifacts: []`).

  **`FindingGraphFilterDecision.usedArtifacts`** — each
  graph-aware decision now returns a deduped list of
  artifacts that contributed evidence
  (`"ObservedRepo"` / `"EvidenceGraph"` /
  `"OwnershipMap"` / `"CapabilityMap"` /
  `"GraphSlice"`). Pure path / detector-import matches
  return an empty array.

  **`ApplyFindingFiltersResult.graphArtifactsUsed`** —
  `applyFindingFilters` collects per-decision
  `usedArtifacts` across the run into a sorted deduped
  array. Always present (possibly empty).

  **Pipeline reorder.** Graph-aware now runs *before*
  classic content (previously: after). When both layers
  can match the same finding, the graph-aware version
  takes credit so the audit trail names the strongest
  artifact-backed source. Classic content remains the
  fallback when graph-aware is no-op (missing artifacts).
  The five shared reason codes still bucket as
  `graphAwareFiltered` in filter-health regardless of
  which stage fired — bucket math is unchanged.

  **Runtime inputRefs precision.** `buildFindingFilterReport`
  now filters its loaded graph-input refs by
  `result.graphArtifactsUsed`, so
  `FindingFilterReport.header.inputRefs` cites only the
  artifacts that actually contributed to a match in this
  run. An artifact loaded into the graph context but
  never matched against is no longer cited.

  **Tests.** 17 new contract tests at
  `tests/contract/graph-aware-finding-filters-v2.test.mjs`
  cover: helper behavior (normalization, sibling lookup,
  import-target listing, predicate filtering), each
  strengthened check (sibling-file routing, EvidenceGraph
  routing, conservative no-op when evidence missing,
  non-allowed infra import rejection, openai-import
  rejection, GateEvaluator high-confidence,
  ObservedSystem.kind preferred over `/modules/`),
  conservative no-op across all checks, precise
  `graphArtifactsUsed` reporting (sorted + deduped),
  end-to-end CLI inputRefs citing (ObservedRepo only when
  sibling-file used, EvidenceGraph when import evidence
  used), raw `FindingReport` byte-identity, lifecycle /
  adjudication / coherency exclusion, and
  `rekon artifacts validate` cleanliness. Full suite:
  715 passed / 1 skipped / 0 failed.

  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No new reason codes. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No npm
  publish.

  Graph-aware filter provider v3 decision memo (review
  what remaining classic checks still warrant porting)
  is the recommended next slice.

- Shipped graph-aware filter surfacing in publications /
  filter health (P1.1
  graph-aware-filter-health-publications slice). The
  graph-aware finding filter provider v1 already suppressed
  structural false positives; this slice makes that work
  visible in operator-facing surfaces and adds two new
  dominance alerts.

  **`FindingFilterHealthSummary` extensions
  (`@rekon/kernel-findings`):**
  - New `graphAwareFiltered: number` bucket — split out of
    `contentFiltered`. The five graph-aware reason codes
    (`route-handler-with-service`,
    `route-http-middleware-only`,
    `external-api-comment-only`,
    `factory-file-creates-deps`,
    `module-gate-verified-caller`) are now classified as
    graph-aware whenever their entry is not policy-sourced.
    Buckets remain mutually exclusive; `policyFiltered +
    contentFiltered + graphAwareFiltered + resultFiltered +
    builtInPathFiltered` always equals `totalFiltered`.
  - New `byGraphAwareReason: Record<string, number>` — raw
    counts computed only over entries that pass
    `isGraphAwareFiltered`, so a policy entry sharing a
    graph-aware reason code does not inflate the table.
    Always present (empty when no graph-aware filter fired).
  - New
    `filterRateByGraphAwareReason: Record<string, number>` —
    rates rounded to four decimals.
  - New
    `dominantGraphAwareReason?: { reason; count; rate }` —
    alphabetic tiebreak; present when at least one
    graph-aware filter fired.
  - New helper `isGraphAwareFiltered(entry)` is exported.
    Policy entries take precedence — an entry with
    `source: "policy"` (or a `policyId`) is classified as
    policy, never graph-aware, even if its reason code is
    graph-aware.

  **Two new alerts (both gated on `totalFindings >= 5`):**
  - `graph-aware-filter-dominance` — fires when
    `graphAwareFiltered / totalFindings >= 0.5`. Message:
    "Graph-aware filter is dominant — review
    `FindingFilterReport.filteredFindings`."
  - `graph-aware-reason-dominance` — fires when
    `dominantGraphAwareReason.rate >= 0.5`. Message names
    the dominant reason.
  Alerts remain sorted by `code` for deterministic output.

  **Architecture summary publication
  (`@rekon/capability-docs.architecture-summary`):**
  - The `Finding Filter Health` section renders an extra
    `- Graph-aware filtered findings: <n>` bullet alongside
    the existing kept / filtered / built-in-path counts.
  - When `graphAwareFiltered > 0` (or the count map is
    populated), the section also renders a dedicated
    `### Graph-Aware Filter Reasons` table sourced from
    `byGraphAwareReason` (alphabetic) plus an audit pointer
    paragraph: "Inspect `FindingFilterReport.filteredFindings`
    for the structural evidence behind each graph-aware
    match (sibling-file existence, import-graph facts,
    capability ownership, module-kind routing)."
  - The new alert codes surface in the existing alerts
    table when their thresholds fire.

  **Agent contract publication
  (`@rekon/capability-docs.agent-contract`):**
  - The `Finding Filter Health` subsection adds the
    graph-aware count bullet.
  - When `graphAwareFiltered > 0`, the subsection adds an
    explicit audit instruction: "If graph-aware filtering
    is high, inspect `FindingFilterReport.filteredFindings`
    for the structural evidence (sibling-file existence,
    import-graph facts, capability ownership, module-kind
    routing) before drawing conclusions."
  - New "Do Not Do" entry: "Do not treat graph-aware
    filtering as proof that the underlying issue never
    existed; inspect `FindingFilterReport.filteredFindings`
    for the structural evidence (sibling-file existence,
    import-graph facts, capability ownership, module-kind
    routing) before drawing conclusions."

  **Tests.** 16 new contract tests at
  `tests/contract/graph-aware-filter-health-publications.test.mjs`
  pin: classifier behavior (the five graph-aware reasons,
  policy precedence, content-bucket exclusion), bucket
  math (counts sum to `totalFiltered`,
  `byGraphAwareReason` is not inflated by policy entries),
  rate / dominant-reason calculations with alphabetic
  tiebreak, both alerts' thresholds (50 % rate + 5-finding
  minimum corpus), publication rendering (architecture
  summary table + audit pointer, agent contract count +
  audit instruction + Do Not Do reminder), alert codes
  appearing in publication alert tables when present, and
  `rekon artifacts validate` cleanliness after publishing
  both surfaces with seeded graph-aware fixtures. Full
  suite holds at 698 passed / 1 skipped / 0 failed.

  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new CLI subcommand or flag.
  No new reason codes. No source-file reads. No LLM,
  semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator` port. No version bump. No npm
  publish.

  Graph-aware filter provider v2 (file-existence /
  import-evidence strengthening) is the recommended next
  slice.

- Shipped graph-aware finding filter provider v1 (P1.1
  graph-aware-finding-filter-provider v1 slice). Implements
  the five port-soon candidate checks from the
  [GraphOntologyValidator-lite audit](docs/strategy/graph-ontology-validator-lite-audit.md)
  while preserving every audit invariant: no source-file
  reads, no LLM / semantic / fuzzy / embedding matching,
  no monolithic validator, filtered findings remain
  auditable in `FindingFilterReport.filteredFindings`, raw
  `FindingReport` is never mutated.

  **Repo-model projections (shipped first):**
  - `ObservedRepo.files?: string[]` — flat, sorted,
    repo-relative file index. Absolute paths and `.rekon/`
    artifact paths are dropped at the kernel boundary.
    Populated by `@rekon/capability-model.projector` from
    `kind: "file"` evidence facts.
  - `ObservedSystem.kind?: string` — optional structural
    kind (`module` / `service` / `route` / `ui` /
    `infra` / `unknown` / custom). Survives normalization
    across system merges.
  Both fields are additive optional; older artifacts
  continue to validate and serialize unchanged. No
  `schemaVersion` bump.

  **New exports from `@rekon/kernel-findings`:**
  - `FindingGraphFilterContext` (type).
  - `FindingGraphFilterDecision` (type).
  - `EvidenceGraphLike`, `ObservedRepoLike`,
    `OwnershipMapLike`, `CapabilityMapLike`,
    `GraphSliceLike`, `EvidenceFactLike` (structural
    sub-shapes — the kernel stays free of
    `kernel-repo-model` / `kernel-evidence` /
    `kernel-graph` runtime deps; real artifacts are
    structurally compatible).
  - `applyFindingGraphFilters({ finding, graphContext })`
    — pure deterministic helper. Iterates five private
    case functions in fixed order; returns the first
    matching decision or `null`.

  **Five checks (all reuse existing v2 reason codes — no
  new codes were introduced):**
  - `route-handler-with-service` —
    `Finding.details.imports` includes a `*/handler`
    import OR `ObservedRepo.files` lists a sibling
    `<dir>handler.ts` / `<dir>handler.tsx`.
  - `route-http-middleware-only` — every `/infra/`
    import under `details.imports` lives under
    `/infra/http/` or `/infra/Identity`.
  - `external-api-comment-only` — `details.imports` (or
    `EvidenceGraph` import facts) contain no
    `openai` / `openrouter` / `@openai/*` reference;
    high confidence with graph evidence, medium with
    only detector-supplied imports.
  - `factory-file-creates-deps` — path heuristics
    (`Factory.ts`, `factory.ts`, `core/services/**/init/**`)
    OR `CapabilityMap` capability whose name contains
    `factory` / `init` / `bootstrap` and whose subjects
    include the file.
  - `module-gate-verified-caller` — `GateEvaluator`
    path (high) OR `/modules/` path (medium) OR
    `OwnershipMap` routes the file to an `ObservedSystem`
    whose `kind === "module"` (medium).

  **Pipeline integration.** `applyFindingFilters` now runs
  filters in fixed priority order:
  `policy → classic content → graph-aware →
  built-in path → result`. The pipeline short-circuits
  on the first match. Graph-aware filters land at priority
  level `15` between the content layer and the broad path
  heuristics so a structural match always wins over a
  generic path heuristic but never over an
  operator-supplied policy.

  **Runtime integration.** `buildFindingFilterReport`
  reads the latest `ObservedRepo` / `OwnershipMap` /
  `CapabilityMap` / `EvidenceGraph` from the store and
  threads them as `graphContext`. New
  `BuildFindingFilterReportOptions.useGraphContext?` lets
  callers opt out (defaults `true`).
  `FindingFilterReport.header.inputRefs` cites a graph
  artifact only when at least one graph-aware match
  actually used the data — so the audit lists exactly the
  evidence the report depended on. Missing graph artifacts
  → conservative no-op (the relevant check does not fire).

  **Tests:** new
  `tests/contract/graph-aware-finding-filters.test.mjs`
  (20 assertions; all passing): 4 repo-model projection
  tests, 11 graph-helper / pipeline tests, 5 end-to-end
  CLI tests covering refresh-populates-files,
  sibling-handler match through CLI with `ObservedRepo`
  `inputRef` citation, lifecycle / adjudication /
  coherency exclusion, raw `FindingReport` byte-identity,
  and `rekon artifacts validate` cleanliness. Full suite:
  **682 passed / 1 skipped / 0 failed**.

  Docs:
  - New
    [`docs/concepts/graph-aware-finding-filters.md`](docs/concepts/graph-aware-finding-filters.md).
  - `docs/concepts/finding-filters.md` — new
    "Graph-aware filters (v1)" entry in the Reasons list.
  - `docs/artifacts/finding-filter-report.md` — new
    "Graph-Aware Filters (v1)" section.
  - `docs/concepts/refresh.md` — `findings.filter` step
    description expanded to mention graph-aware filters.
  - `docs/strategy/graph-ontology-validator-lite-audit.md`
    — status note updated to reflect v1 shipped.
  - ADR Implementation Order step 14 flipped to shipped;
    new step 15 "Graph-aware filter provider v1 surfaces
    in publications / filter health"; old step 15
    renumbered to 16.
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/graph-aware-finding-filter-provider-v1.md`.

  Aligned to `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. No new artifact type. No
  artifact `schemaVersion` bump (additive optional fields
  only). No new capability role. No new CLI subcommand
  or flag. No new reason codes. No LLM / semantic /
  fuzzy / embedding matching. No `GraphOntologyValidator`.
  No source-file reads from filter logic. No version
  bump. No npm publish.
- Shipped `GraphOntologyValidator`-lite parity audit (P1.1
  graph-ontology-validator-lite-audit slice). Docs-only
  decision memo — no runtime behavior changes, no new
  public API, no `schemaVersion` bump, no version bump,
  no npm publish.

  New strategy doc:
  [`docs/strategy/graph-ontology-validator-lite-audit.md`](docs/strategy/graph-ontology-validator-lite-audit.md).

  Decision: **do not** port classic
  `GraphOntologyValidator` as a monolithic service.
  Reproduce the *outcome* (filtered findings with
  structural evidence preserved in
  `FindingFilterReport.filteredFindings`), not the
  architecture (one service that scrapes source, builds
  graph, resolves rules, applies exceptions). The
  Rekon-native shape is a future capability-level
  **graph-aware finding filter provider** that consumes
  the existing `EvidenceGraph`, `GraphSlice`,
  `ObservedRepo`, `OwnershipMap`, and `CapabilityMap`
  artifacts and contributes decisions to
  `applyFindingFilters` via a new optional
  `graphContext` input. The provider emits
  `FilteredFinding` entries with `source: "system"`
  reusing existing v2 reasons — no new artifact type, no
  new reason codes.

  Audit classifies every classic check as
  **covered** (already shipped by content/result filters
  v2), **port-soon**, **defer**, or **rejected**:
  - **Port-soon (5):** route handler with sibling
    (`route-handler-with-service`), route HTTP middleware
    only (`route-http-middleware-only`), external-API
    comment only (`external-api-comment-only`), factory
    file creates deps (`factory-file-creates-deps`),
    module gate verified caller
    (`module-gate-verified-caller`). All five already
    have v2 structural filters; the graph provider adds
    artifact-backed confirmation when the upstream
    detector did not emit the right `details` payload.
  - **Defer:** full graph ontology validation suite,
    framework-specific exception catalog
    (DDE / Next.js / provider semantics), runtime truth
    graph (no runtime substrate yet), source-reading
    classifier (violates artifact-first invariant),
    factory-by-capability signal until `CapabilityMap`
    strength is proven, persistent
    `filtered-issues.json` merge semantics
    (`FindingFilterReport` artifact history is enough).
  - **Rejected:** monolithic validator port,
    source-file reads from filter logic, LLM / semantic /
    fuzzy / embedding review, filter logic that mutates
    `FindingReport` or `FindingFilterReport`.

  Required artifact projections (ship **first**, before
  any filter logic): a flat file index — likely
  `ObservedRepo.files?: string[]` —, and an optional
  `ObservedSystem.kind?: "module" | "package" | ...`
  field. Building filter logic that quietly returns no
  matches because the upstream artifact is empty would
  defeat the audit.

  Audit also includes:
  - per-check input table (`Check`, `Required inputs`,
    `Currently available?`, `Missing artifact/data`,
    `Suggested producer`),
  - 12 future regression test scenarios for the next
    implementation slice,
  - recommended implementation order
    (artifact projections → capability skeleton → five
    checks one at a time → docs → ADR / strategy
    updates),
  - capability shape sketch with the
    `GraphAwareFindingFilterProvider` interface.

  New docs test
  `tests/docs/graph-ontology-validator-lite-audit.test.mjs`
  asserts the audit's structure, decisions, and
  cross-references (audit doc exists, decision summary
  rejects monolithic port, references each required
  artifact + future provider, port-soon + defer
  classifications present, artifact-inputs + regression
  tests sections present, ADR + CHANGELOG entries
  present). Full suite passes.

  Strategy docs updated:
  - ADR Implementation Order step 13 flipped from
    `(future)` to `(shipped)`; new step 14 "Graph-aware
    finding filter provider v1"; old step 14 renumbered
    to 15.
  - Subsystem-purpose-map: subsystem 6 row appended with
    the audit; next-slice column changed to "Graph-aware
    finding filter provider v1"; status string updated
    with `+ graph-ontology-validator-lite-audit`.
  - Behavior-roadmap: new detailed entry for the audit
    slice with classic-source alignment, classified
    checks, rejected approaches, and the next
    recommended slice.
  - Classic-guarantee-regression-plan: new shipped entry
    "`GraphOntologyValidator`-lite parity audit" pinned
    by the new docs test.
  - Roadmap: new bullet for the audit slice.
  - CHANGELOG: this entry.

  Review packet:
  `.rekon-dev/review-packets/graph-ontology-validator-lite-audit.md`.

  Aligned to
  `infra/validation/GraphOntologyValidator.ts`,
  `services/IssueDetectionService.ts`,
  `services/issues/content-filters.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filter-architecture.ts`,
  `services/issues/filter-health.ts`,
  `domain/issues/evaluators/**`,
  `domain/issues/RulesResolver.ts`,
  `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`. No runtime change; no
  new artifact type; no `schemaVersion` bump; no new
  capability role; no new CLI subcommand; no version
  bump; no npm publish.
- Shipped filter policy operator workflow polish (P1.1
  filter-policy-status v1 slice). New CLI surface
  `rekon findings filter-policy status [--policy <id>]
  [--warnings-only] [--unused-only]` is a read-only operator
  workflow that combines the configured `findingFilters`
  policy set with the latest `FindingFilterReport`,
  `FindingFilterHealthReport`, and
  `FindingFilterPolicySuggestionReport` into a single
  structured JSON document so operators can audit
  policy health without manually combining several
  artifacts. The command is **strictly read-only**.
  `.rekon/config.json` is never mutated;
  `rekon findings filter-policy apply` remains the only
  command that writes config. Malformed config fails
  clearly with a "Failed to parse" error and leaves the
  file unchanged.

  Per-policy entries report:
  - `id`, `reason`, optional `confidence`, full `matchers`
    block.
  - `usageCount` (from
    `FindingFilterReport.summary.byPolicy`).
  - `usageRate` (from
    `FindingFilterHealthReport.summary.filterRateByPolicy`
    or recomputed from `usageCount / totalFindings`).
  - `filteredFindingIds` — sorted list of finding ids the
    policy suppressed in the latest filter run.
  - `warnings[]` and `recommendedActions[]` derived
    deterministically.
  - Convenience flags `isUnused`, `isDominant`,
    `isLowConfidence`, `isBroadPattern`.

  Per-policy warning codes:
  - **`unused-policy`** — `usageCount === 0`.
  - **`dominant-policy`** — id matches
    `healthReport.summary.dominantPolicy.policyId` OR
    `usageRate >= 0.5` AND `totalFindings >= 5`.
  - **`low-confidence-policy`** —
    `rule.confidence === "low"` OR a
    `low-confidence-policy-filter` health alert exists AND
    the policy is the dominant policy.
  - **`broad-policy`** —
    `isBroadFindingFilterPolicyRule(rule)` returns `true`
    (reuses the apply-safety v2 predicate).
  - **`stale-policy-fingerprint`** — propagated to every
    policy when the current vs. report fingerprint
    digests diverge.

  Global warnings:
  - **`missing-filter-report`** — no
    `FindingFilterReport` indexed yet.
  - **`missing-filter-health`** — `FindingFilterReport`
    exists but `FindingFilterHealthReport` does not.

  Freshness mirrors filter-policy-freshness v2 with four
  states: `fresh` / `stale` / `missing-report` / `unknown`.
  On stale / missing / unknown, the response includes a
  `recommendedCommand` (typically `rekon refresh`).

  Suggestions are rendered as advisory records with
  `dryRunCommand` + `applyCommand` strings. Low-confidence
  suggestions append `--force` to both. The status command
  **never** applies suggestions on its own initiative.

  Optional flags filter the rendered `policies` array
  without touching `summary` counts (always computed over
  the full policy set). The CLI emits a
  `renderedPolicyCount` field at the top level so callers
  can see how many entries the filter left.

  New exports from `@rekon/kernel-findings`:
  - `summarizeFindingFilterPolicyStatus(input)` — pure
    deterministic helper.
  - `FindingFilterPolicyStatusResult` (type).
  - `FindingFilterPolicyStatusEntry` (type).
  - `FindingFilterPolicyStatusSuggestion` (type).
  - `FindingFilterPolicyStatusSummary` (type).
  - `FindingFilterPolicyStatusWarning` (type).
  - `FindingFilterPolicyStatusFreshness` (union type).
  - `SummarizeFindingFilterPolicyStatusInput` (type).

  New file-local CLI helper
  `readLatestArtifactOrUndefined<T>(store, artifactType)`
  factors out the read-the-latest pattern shared by this
  command and future read-only surfaces.

  18 new contract tests in
  `tests/contract/finding-filter-policy-status.test.mjs`
  cover: 11 pure-helper tests (total / used / unused
  counts; current + report fingerprints; freshness fresh /
  stale + recommended `rekon refresh`; every per-policy
  warning; missing filter / health global warnings;
  suggestions with `--force` appended for low-confidence)
  plus 7 CLI behavior tests (no-mutation guarantee on
  fresh + populated workspaces, malformed-config failure
  without write, `--policy` / `--warnings-only` /
  `--unused-only` narrowing, existing
  `suggest` / `list` behavior unchanged, and
  `rekon artifacts validate` cleanliness). Full suite:
  **647 passed / 1 skipped / 0 failed**.

  Docs:
  - New
    `docs/concepts/finding-filter-policy-status.md`.
  - `docs/concepts/finding-filter-policy-suggestions.md`
    — CLI surface lists the new command; new bullet in
    the pipeline list.
  - `docs/concepts/finding-filters.md` — new "Auditable
    via `rekon findings filter-policy status`" bullet.
  - `docs/artifacts/finding-filter-health-report.md` —
    Consumed By entry naming the new command.
  - `docs/strategy/issue-governance-architecture-decision.md`
    — Implementation Order step 11 flipped to shipped;
    new step 12 "Filter policy explicit disable / remove
    workflow" and step 13 "`GraphOntologyValidator`-lite
    parity audit".
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - README adds an example invocation.
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/finding-filter-policy-status-v1.md`.

  No artifact `schemaVersion` bump. No new artifact type.
  No new capability role. No new write permission. No
  LLM, semantic, fuzzy, or embedding matching. No
  `GraphOntologyValidator`. No watcher / daemon. No
  version bump. No npm publish.
- Shipped filter-health diagnostics v2 (P1.1
  filter-health-diagnostics v2 slice).
  `FindingFilterHealthReport.summary` gains six additive
  diagnostic fields and `buildFindingFilterHealth` emits six
  new deterministic alerts so operators can see whether
  filtering is healthy, over-broad, stale, policy-heavy,
  low-confidence, or dominated by a single filter class.
  Filtering decisions are not affected; raw
  `FindingReport` / `FindingFilterReport` /
  `FindingFilterHealthReport` are not mutated.

  New `FindingFilterHealthSummary` fields:
  - **`builtInPathFiltered`** — count of findings suppressed
    by built-in path / content heuristics
    (`generated-file` / `external-file` / `test-file` /
    `canary-file` / `content-filter` /
    `explicit-exclusion` / `policy-exception` / `other`).
    Combined with `policyFiltered` / `contentFiltered` /
    `resultFiltered`, all four buckets sum to
    `totalFiltered`.
  - **`filterRateByReason`** —
    `byReason[reason] / totalFindings` rounded to four
    decimals.
  - **`filterRateByPolicy?`** — per-policy rate; present
    when `byPolicy` is non-empty.
  - **`dominantReason?`** — `{ reason, count, rate }` for
    the reason that suppressed the most findings (alphabetic
    tiebreak).
  - **`dominantPolicy?`** — `{ policyId, count, rate }` for
    the configured policy that suppressed the most findings
    (alphabetic tiebreak).
  - **`policyFingerprint?`** — mirror of the upstream
    `FindingFilterReport.policyFingerprint` so health
    consumers don't have to re-read the filter report.

  Six new deterministic alerts (sorted by code; existing
  alerts unchanged):
  - **`reason-over-filtering`** — `totalFindings >= 5` AND
    `dominantReason.rate >= 0.5`. One reason is doing more
    than half the suppression even when the overall filter
    rate is moderate.
  - **`policy-dominance`** — `totalFindings >= 5` AND
    `dominantPolicy.rate >= 0.5`. Same intent as
    `reason-over-filtering` but applied to configured
    policies.
  - **`content-filter-dominance`** — `totalFindings >= 5`
    AND `contentFiltered / totalFindings >= 0.5`. Classic
    content filters are dominating.
  - **`result-filter-dominance`** — `totalFindings >= 5`
    AND `resultFiltered / totalFindings >= 0.5`. Operator-
    configured result filters are dominating.
  - **`policy-fingerprint-missing`** — `policyFiltered > 0`
    AND the upstream `FindingFilterReport` has no
    `policyFingerprint` (report predates
    filter-policy-freshness v2). Mirrors the freshness
    publisher warning.
  - **`stale-policy-fingerprint`** — caller supplied
    `currentPolicyFingerprint` that does not match
    `report.policyFingerprint`. Operator changed
    `.rekon/config.json findingFilters` after the latest
    filter run. Mirrors the freshness publisher warning.

  Dominance thresholds (50 % rate + 5-finding minimum
  corpus) are deliberately lower than the over-filtering
  thresholds above (80 %). They surface a different failure
  mode: one rule / category dominating even when the
  overall filter rate is moderate.

  New exported classifiers from `@rekon/kernel-findings`:
  - **`isPolicyFiltered(entry)`** — `source === "policy"` or
    `policyId` set.
  - **`isResultFiltered(entry)`** — non-policy entry whose
    reason is in the 4-case result-filter set.
  - **`isClassicContentFiltered(entry)`** — non-policy entry
    whose reason is in the 17-case classic content set.
  - **`isBuiltInPathFiltered(entry)`** — non-policy entry
    whose reason is in the 8-case built-in path /
    content set.
  Policy takes precedence; the other three buckets are
  mutually exclusive over the remainder.

  Plumbing: `buildFindingFilterHealth` /
  `createFindingFilterHealthReport` (kernel) and
  `buildFindingFilterHealthReport` (runtime) accept an
  optional
  `currentPolicyFingerprint: FindingFilterPolicyFingerprint`
  (additive). `rekon findings filter-health` and
  `rekon refresh` fingerprint the current
  `.rekon/config.json findingFilters` via the existing
  `loadFindingFilterPolicies` +
  `fingerprintFindingFilterPolicies` and forward it so the
  report can emit `stale-policy-fingerprint` /
  `policy-fingerprint-missing` alerts locally — mirroring
  the freshness warnings the architecture summary / agent
  contract publishers already render. The CLI JSON output
  for `rekon findings filter-health` echoes
  `currentPolicyFingerprint` so operators can confirm what
  was loaded.

  Publication impact: no shape change. The architecture
  summary and agent contract render
  `FindingFilterHealthReport.alerts` generically (code +
  message), so the six new alert codes surface
  automatically in the existing Filter Health table /
  subsection.

  17 new contract tests in
  `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`
  cover: 13 pure-helper tests for the classifiers, every
  new alert (including `policy-fingerprint-missing` /
  `stale-policy-fingerprint` and the negative "no
  stale-policy-fingerprint when fingerprints match" case),
  the four bucket-sum invariant, dominant-reason /
  dominant-policy tiebreak, and the
  `low-confidence-filtered` count refinement; plus 4
  end-to-end CLI tests covering `rekon findings filter-health`
  echoing the fingerprint, `rekon refresh` producing a
  fresh-fingerprint report, publications surfacing the new
  alert codes via existing generic tables, and
  `rekon artifacts validate` cleanliness. Full suite: 629
  passed / 1 skipped / 0 failed.

  Docs updated:
  - `docs/artifacts/finding-filter-health-report.md` — Shape
    gains six new diagnostic fields; alerts table includes
    the six new diagnostics v2 alert codes (13 total).
  - `docs/concepts/finding-filters.md` — Health Alerts
    section expanded to list all 13 alerts; new
    "Classification helpers" subsection documenting the
    four classifiers + policy-takes-precedence rule.
  - `docs/strategy/issue-governance-architecture-decision.md`
    — Implementation Order step 10 flipped to shipped + new
    step 11 "Filter policy operator workflow polish".
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/finding-filter-health-diagnostics-v2.md`.

  No artifact `schemaVersion` bump (additive optional
  fields). No new artifact type. No new capability role. No
  new CLI subcommand or flag. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator`. No
  watcher / daemon. No version bump. No npm publish.
- Shipped classic issue filtering parity v2 — content/result
  filter expansion (P1.1 classic-content-result-filters v2
  slice). `FindingFilterReason` extended additively with 17
  classic-inspired content reasons that mirror
  codebase-intel-classic's content-filtering pipeline plus 4
  result-filter reasons for the operator-configured surface
  filter (`minConfidence` / `severity` / `systems` /
  `pathExcludes`). Every filtered finding remains auditable
  via `FindingFilterReport.filteredFindings`; raw
  `FindingReport` is never mutated; operator status decisions
  (`accepted` / `ignored` / `resolved`) remain in
  `FindingStatusLedger` and are not used as a substitute.

  Content filter reasons (17 cases, all `source: "system"`):
  - **Stub/import family (6):**
    `empty-constructor-stub`,
    `storage-retrieval-placeholder`,
    `client-safe-infra`, `same-directory-import`,
    `svg-namespace-url`, `client-env-node-env`.
  - **Architecture family (5):**
    `speculative-anti-pattern`,
    `archetype-inference-note`,
    `hardcoded-config-not-dde`,
    `ui-http-provider-abstraction`,
    `ui-hook-uses-http-not-db`.
  - **Rule-id family (6):**
    `module-gate-verified-caller`,
    `route-handler-with-service`,
    `route-http-middleware-only`,
    `external-api-comment-only`,
    `factory-file-creates-deps`,
    `nextjs-route-convention`.

  Result filter reasons (4 cases):
  - `below-min-confidence` — finding's
    `details.minCapabilityConfidence` is below the
    configured floor.
  - `below-min-severity` — finding's severity is below the
    configured floor (critical > high > medium > low).
  - `outside-selected-system` — finding's `details.system` /
    `details.ownerSystems` don't overlap the allowed list.
  - `configured-path-exclusion` — finding's files match an
    operator-configured glob pattern.

  `Finding` gains an additive optional
  `details?: Record<string, unknown>` field for detectors to
  surface structured detail (`stubName`, `stubReason`,
  `imports`, `envVars`, `evidence`, `decisionConcerns`,
  `decisionCapabilities`, `concernTag`, `owner.kind`,
  `otherExports`, `minCapabilityConfidence`, `system`,
  `ownerSystems`). The field is treated as opaque by
  downstream consumers that don't specifically know how to
  interpret it. No schemaVersion bump.

  New exports from `@rekon/kernel-findings`:
  - `FindingContentFilterContext` (type).
  - `FindingContentFilterDecision` (type).
  - `FindingResultFilterOptions` (type).
  - `applyFindingContentFilters({ finding })` — pure
    deterministic function returning the first matching
    decision or `null`. Synchronous, side-effect-free.
  - `applyFindingResultFilters(finding, options)` — pure
    deterministic function over
    `FindingResultFilterOptions`.
  - `validateFindingResultFilterOptions(value)` — structural
    validator returning `{ options, issues }` (issue codes:
    `finding-result-filters-not-object`,
    `finding-result-filters-min-confidence-invalid`,
    `finding-result-filters-severity-invalid`,
    `finding-result-filters-systems-invalid`,
    `finding-result-filters-systems-entry-invalid`,
    `finding-result-filters-path-excludes-invalid`,
    `finding-result-filters-path-excludes-entry-invalid`,
    `finding-result-filters-path-excludes-absolute`,
    `finding-result-filters-path-excludes-traversal`).

  `applyFindingFilters` now runs filters in fixed priority
  order: **policy → classic content → built-in path →
  result**. The pipeline short-circuits on the first match.
  Classic content filters land at priority `10`-`12`;
  result filters at `20`; broad path heuristics at `0`-`5`.

  Operators add `findingResultFilters` to
  `.rekon/config.json`:
  ```json
  {
    "findingResultFilters": {
      "minConfidence": 0.7,
      "severity": "medium",
      "systems": ["runtime", "src"],
      "pathExcludes": ["fixtures/**"]
    }
  }
  ```
  `rekon config validate` enforces: `minConfidence` is a
  number in `[0, 1]`; `severity` is one of
  `critical` / `high` / `medium` / `low`; `systems` is an
  array of non-empty strings; `pathExcludes` is an array of
  project-relative glob patterns (absolute paths and `..`
  traversal are rejected). The CLI loader is best-effort:
  invalid entries are dropped at the loader boundary so a
  malformed config doesn't blow up refresh —
  `rekon config validate` is the full diagnostic.
  `rekon findings filter` / `rekon findings filter-health` /
  `rekon refresh` all load and pass result filters through.
  `BuildFindingFilterReportOptions` and
  `BuildFindingFilterHealthReportOptions` gain optional
  `resultFilters?: FindingResultFilterOptions` (additive).

  `FindingFilterHealthReport.summary` gains two additive
  counts: `contentFiltered` (findings suppressed by a
  classic content filter) and `resultFiltered` (findings
  suppressed by a result filter). Two new alerts:
  - **`content-filter-high-volume`** — one classic content
    reason accounts for `>= 5` findings AND `> 50 %` of
    total findings.
  - **`result-filter-over-filtering`** — configured
    `findingResultFilters` suppress more than 80 % of total
    findings.

  24 new contract tests in
  `tests/contract/finding-content-result-filters.test.mjs`
  cover: 10 content-filter helper tests (cases A, D, E, F,
  G, I, M, O, Q + normal-finding kept), 7 result-filter
  helper tests (`minConfidence` / `severity` / `systems` /
  `pathExcludes` + non-silent-drop +
  `validateFindingResultFilterOptions` accept + reject),
  and 7 end-to-end CLI tests covering `rekon config validate`
  acceptance + rejection, `rekon findings filter` loading
  result filters and writing audit entries, lifecycle /
  adjudication / coherency excluding result-filtered
  findings, raw `FindingReport` integrity,
  `rekon artifacts validate` cleanliness, and the new
  `content-filter-high-volume` /
  `result-filter-over-filtering` alerts. Full suite: 612
  passed / 1 skipped / 0 failed.

  Docs updated:
  - `docs/concepts/finding-filters.md` — "Classic Content
    Filters" table (17 cases) + "Classic Result Filters"
    section; "Health Alerts" expanded to 7 alerts.
  - `docs/artifacts/finding-filter-report.md` — new
    "Classic-Inspired Content / Result Filters (v2)"
    section documenting pipeline order, `Finding.details`,
    and configured `findingResultFilters`.
  - `docs/artifacts/finding-filter-health-report.md` —
    shape gains `contentFiltered` / `resultFiltered`
    counts; alerts table includes the two new v2 alerts.
  - `docs/strategy/issue-governance-architecture-decision.md`
    — Implementation Order step 9 flipped to shipped + new
    step 10 "Filter-health diagnostics v2".
  - Four strategy docs (subsystem-purpose-map,
    behavior-roadmap, guarantee-regression-plan, roadmap).
  - CHANGELOG. Review packet:
    `.rekon-dev/review-packets/finding-content-result-filters-v2.md`.

  No artifact `schemaVersion` bump (additive optional
  field). No new artifact type. No new capability role. No
  new CLI subcommand or flag. No LLM, semantic, fuzzy, or
  embedding matching. No `GraphOntologyValidator`. No
  watcher / daemon. No version bump. No npm publish.
- Shipped configured filter policy freshness / publication
  guardrails (P1.1 filter-policy-freshness v2 slice).
  `FindingFilterReport` now carries an additive optional
  `policyFingerprint: { digest, ruleCount, ruleIds }` — an
  order-sensitive fingerprint of the `findingFilters` policy
  set the filter run used. Order matters because
  `applyFindingFilters` runs policies in declared order and the
  first match wins. Two policy sets with the same rules in a
  different order produce different fingerprints. New exported
  helper `fingerprintFindingFilterPolicies(policies)` in
  `@rekon/kernel-findings` canonicalizes each rule (drops
  undefined matchers, preserves array order) and digests with
  the existing `digestJson` SHA-256 helper.
  `buildFindingFilterReport` always stamps the fingerprint —
  including the empty-policy fingerprint when no rules are
  configured — so future comparisons can distinguish "no
  fingerprint recorded" (older reports → `unknown`) from "ran
  with zero policies" (`ruleCount: 0`).

  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read the current
  `.rekon/config.json` `findingFilters` via the new
  `loadCurrentFindingFilterPolicies(repoRoot)` helper,
  fingerprint the result, and compare against the latest
  `FindingFilterReport.policyFingerprint` via the new pure
  `computeFilterPolicyStaleness({ currentFingerprint,
  filterReport })` helper. Status is one of:
  - **`fresh`** — fingerprints match.
  - **`stale`** — fingerprints diverge; the operator changed
    `findingFilters` after the latest filter run. Active
    governance (lifecycle / adjudication / coherency /
    publications) may be stale until `rekon refresh`.
  - **`missing`** — no `FindingFilterReport` indexed.
  - **`unknown`** — latest `FindingFilterReport` predates
    filter-policy-freshness v2 and has no fingerprint.

  Architecture summary renders `## Finding Filter Policy
  Freshness` between `## Finding Filter Health` and
  `## Finding Filter Policy Suggestions`. The section lists
  the status, the current config fingerprint, and the report
  fingerprint (12-char short-digest + rule count). On `stale`
  it emits a blockquote: "`.rekon/config.json` `findingFilters`
  changed after the latest FindingFilterReport was produced.
  Active governance may be stale. Run `rekon refresh` to
  rebuild the filter chain with the current policy set."
  `missing` / `unknown` emit the same recommendation.

  Agent contract renders the matching `### Finding Filter
  Policy Freshness` subsection under `Active Governance State`
  and on `stale` emits a louder blockquote: "Do not rely on
  active governance until `rekon refresh` rebuilds findings
  with the current `findingFilters` config." The agent
  contract's `Do Not Do` list gains a third filter-related
  reminder: "Do not rely on active issue / coherency counts
  after `.rekon/config.json` `findingFilters` changed until
  `rekon refresh` has rebuilt the filter chain with the
  current policy set."

  `rekon findings filter-policy apply` JSON output gains three
  new fingerprint fields:
  - `currentPolicyFingerprint` — state before apply (always
    emitted).
  - `projectedPolicyFingerprint` — dry-run only; the
    fingerprint the apply would land.
  - `policyFingerprint` — actual apply only; the fingerprint
    the next `rekon refresh` will stamp onto the new
    `FindingFilterReport`.

  Validator accepts the additive optional field (digest is a
  non-empty string; `ruleCount` is a non-negative integer;
  `ruleIds.length === ruleCount`). The existing
  `finding-filter.changed` capability-docs invalidation rule's
  description expanded to mention the freshness section; no
  new invalidation rule (policyFingerprint drift is part of
  the filter report change). The architecture summary +
  agent contract publishers' `publish({ artifacts })`
  signatures changed to `publish({ artifacts, input })` so the
  runtime-injected `repo.root` flows through to the loader.

  New exports from `@rekon/kernel-findings`:
  - `FindingFilterPolicyFingerprint` (type).
  - `fingerprintFindingFilterPolicies` (helper).

  New exports from `@rekon/capability-docs`:
  - `FilterPolicyStaleness` (type).
  - `computeFilterPolicyStaleness` (pure compute).
  - `loadCurrentFindingFilterPolicies` (async loader).

  19 new contract tests in
  `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  cover: 4 pure-helper tests for
  `fingerprintFindingFilterPolicies` (deterministic,
  order-sensitive, empty-array stable,
  undefined-matcher-insensitive), 4 pure-helper tests for
  `computeFilterPolicyStaleness` (missing / unknown / fresh /
  stale), 3 loader / refresh integration tests (refresh
  stamps fingerprint; loader returns empty-policy fingerprint;
  loader fingerprints actual rules), 2 apply-CLI fingerprint
  tests (dry-run + apply both report the correct fingerprints
  and dry-run leaves config byte-identical), 4 end-to-end
  publication tests (architecture fresh after refresh,
  architecture stale after config change, agent contract
  stale + Do Not Do reminder, refresh-clears-stale), and 2
  integrity tests (raw `FindingReport` byte-identical,
  `rekon artifacts validate` clean). Full suite: 588 passed /
  1 skipped / 0 failed.

  Docs updated:
  `docs/artifacts/finding-filter-report.md` (Shape includes
  `FindingFilterPolicyFingerprint` and the new
  `policyFingerprint` field; new "Policy Fingerprint" section
  documenting downstream surfaces);
  `docs/concepts/finding-filters.md` (new "Policy Fingerprint
  and Freshness" section after "Audit Guarantee");
  `docs/concepts/finding-filter-policy-suggestions.md`
  ("Surfaced In Publications" expanded to cross-reference the
  freshness section);
  `docs/artifacts/architecture-summary-publication.md` (new
  numbered section 8 "Finding Filter Policy Freshness";
  previous 8-17 shifted to 9-18);
  `docs/concepts/architecture-summary-publication.md`
  (publisher description extended);
  `docs/artifacts/agent-contract-publication.md` (new
  subsection description + new Do Not Do reminder);
  `docs/concepts/agent-operating-contract.md` (section table
  updated; new "Finding Filter Policy Freshness" prose
  section);
  `docs/concepts/refresh.md` (added a new "When To Use It"
  bullet for after `.rekon/config.json` changes);
  `docs/strategy/issue-governance-architecture-decision.md`
  (Implementation Order step 8 flipped from `(future)` to
  `(shipped)`); four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap);
  CHANGELOG. Review packet:
  `.rekon-dev/review-packets/filter-policy-freshness-guardrails.md`.

  No new artifact type. No artifact `schemaVersion` bump
  (additive optional field). No new capability role. No
  watcher / daemon / file-system event loop. No new CLI
  subcommand. No LLM, semantic, fuzzy, or embedding
  matching. No version bump. No npm publish.
- Shipped filter policy suggestion apply safety v2 (P1.1
  filter-policy-apply-safety v2 slice).
  `rekon findings filter-policy apply` is now safer and more
  transparent. Two new flags: `--dry-run` and `--preview`
  (aliases). Dry-run runs the full apply plan (suggestion
  lookup, config load, projected `findingFilters`,
  validation) and prints a structured JSON plan **without
  writing**:
  - `applied: false`, `dryRun: true`.
  - `rule` — the exact rule that would land in
    `findingFilters`.
  - `diff.addedFindingFilters: FindingFilterPolicyRule[]` —
    rules appended when the id is new.
  - `diff.replacedFindingFilters: { before, after }[]` —
    populated when the suggestion id collides with an
    existing rule (with `--force`, the existing rule is
    **replaced**, not duplicated).
  - `diff.beforeCount` / `diff.afterCount`.
  - `warnings[]` — `{ code, message }` records for
    `low-confidence-suggestion`, `broad-path-pattern`,
    `duplicate-rule-id`, and `config-missing`.
  - `blockers[]` — subset of warnings that would refuse the
    actual apply without `--force`.
  - `requiresForce` / `wouldRefuse` /
    `isLowConfidence` / `isDuplicateRuleId` /
    `isBroadPattern` — convenience flags.
  - `validation.valid` / `validation.issues` — the result of
    running `validateFindingFilterPolicyRules` against the
    projected config.
  Three deterministic force-gated blockers:
  - **`low-confidence-suggestion`** — fires when the
    suggestion has `confidence: "low"`. Preserves the
    existing low-confidence gate.
  - **`broad-path-pattern`** — fires when
    `isBroadFindingFilterPolicyRule(rule)` returns `true`.
    The new deterministic predicate flags `pathPattern`
    values of `*`, `**`, `**/*`, `*/**`, `.`, `./**`, or any
    single top-level `<segment>/**` (`src/**`,
    `packages/**`, `apps/**`, `lib/**`, `tests/**`,
    `test/**`, etc.). A rule that lacks both a `pathPattern`
    and any narrow matcher (`type`, `ruleId`, `severity`,
    `titleIncludes`, `descriptionIncludes`) is also broad.
    Two-segment patterns (`src/generated/**`) are not
    broad. A `pathPattern: "src/**"` paired with a narrow
    matcher (e.g. `type: "myrule"`) is not broad either —
    the extra matcher narrows it.
  - **`duplicate-rule-id`** — fires when `findingFilters`
    already contains a rule with the suggestion id. With
    `--force`, the apply path **replaces** the existing
    rule (recorded in `diff.replacedFindingFilters`),
    not appends a duplicate. Without `--force`, apply
    refuses with a clear error.
  Both dry-run and apply now validate the projected
  `findingFilters` using
  `validateFindingFilterPolicyRules`. Validation failures
  refuse the write even with `--force`; the
  high-volume-filtered-pattern suggestion deliberately lacks
  a matcher and therefore cannot be applied directly under
  `--force` (operators must augment the rule). Malformed
  `.rekon/config.json` (file exists but isn't valid JSON
  / isn't a JSON object) is never overwritten — both
  dry-run and apply fail with an explicit "Failed to parse"
  message. Unrelated top-level config fields are preserved
  on write. The actual apply path emits `applied: true` plus
  the same plan + diff + warnings + validation shape; the
  legacy `appliedRule` alias is retained for back-compat.
  Apply now also surfaces `config-missing` in warnings when
  `.rekon/config.json` was absent before the invocation —
  dry-run never creates the file (the runtime store still
  bootstraps a default for subsequent rekon commands, but
  no rule is written), and the actual apply creates a
  default config before writing the appended rule.
  New exports from `@rekon/kernel-findings`:
  `isBroadFindingFilterPolicyRule`,
  `planFindingFilterPolicyApply`, plus shape types
  `FindingFilterPolicyApplyPlan`,
  `FindingFilterPolicyApplyDiff`,
  `FindingFilterPolicyApplyWarning`,
  `FindingFilterPolicyApplyBlocker`,
  `FindingFilterPolicyApplyWarningCode`,
  `FindingFilterPolicyApplyBlockerCode`,
  `PlanFindingFilterPolicyApplyInput`. New file-local CLI
  helpers in `packages/cli/src/index.ts`
  (`loadConfigForApply`, `parseFindingFiltersFromConfig`,
  `buildAppliedConfig`, `formatApplyRefusalMessage`).
  21 new contract tests in
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  cover: 5 pure-helper tests for
  `isBroadFindingFilterPolicyRule` + `planFindingFilterPolicyApply`
  (repository-wide patterns, single top-level patterns,
  two-segment narrow patterns, extra-matcher narrowing,
  no-matcher implicit broad), and 16 CLI behavior tests
  (`--dry-run` returns plan + diff and does not mutate
  config; `--preview` is an alias; actual apply appends a
  new non-broad high-confidence rule; dry-run reports
  config-missing when the file is absent and does not add
  findingFilters; apply writes the rule when config was
  missing and the workspace was just bootstrapped;
  malformed config causes dry-run / apply to fail without
  writing; broad pattern dry-run succeeds with warning;
  broad pattern apply fails without `--force`; broad
  pattern apply succeeds with `--force` and surfaces
  warning; low-confidence dry-run succeeds with warning;
  low-confidence apply fails without `--force`;
  low-confidence apply succeeds with `--force` on a narrow
  rule; duplicate id dry-run reports duplicate +
  `replacedFindingFilters`; duplicate id apply fails
  without `--force`; duplicate id apply with `--force`
  replaces the existing rule; unrelated config fields are
  preserved; `rekon config validate` passes after apply;
  `suggest` / `list` still do not mutate config). The
  pre-existing
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  was updated to match the new error shape and to document
  that `--force` on a high-volume-filtered-pattern rule
  still fails validation (since the rule has no matcher).
  Full suite: 569 passed / 1 skipped / 0 failed. Docs
  updated:
  `docs/concepts/finding-filter-policy-suggestions.md`
  (Apply Safety section now lists all 10 safety rules + a
  table documenting the dry-run JSON shape +
  recommended operator workflow),
  `docs/artifacts/finding-filter-policy-suggestion-report.md`
  (CLI Surface + Apply Safety Rules expanded),
  `docs/concepts/finding-filters.md` (Promotable bullet
  expanded with broad-pattern + dry-run guidance),
  `docs/strategy/issue-governance-architecture-decision.md`
  (Implementation Order step 7 flipped to shipped + new
  step 8 "Configured filter policy freshness /
  publication guardrails"), four strategy docs
  (subsystem-purpose-map, behavior-roadmap,
  guarantee-regression-plan, roadmap), README, and
  CHANGELOG. Review packet:
  `.rekon-dev/review-packets/finding-filter-policy-apply-safety-v2.md`.
  No new artifact type. No artifact `schemaVersion` bump.
  No publication shape change. No new capability role. No
  new CLI subcommand (only new flags). No LLM, semantic,
  fuzzy, or embedding matching. No version bump. No npm
  publish.
- Shipped filter policy suggestions surfaced in architecture
  summary / agent contract (P1.1
  filter-policy-suggestions-publications v2 slice).
  `@rekon/capability-docs.architecture-summary` now reads the
  latest `FindingFilterPolicySuggestionReport`, cites it in
  `header.inputRefs`, and renders a
  `## Finding Filter Policy Suggestions` section after
  `## Finding Filter Health`. The section lists total /
  by-reason / by-confidence counts, a per-suggestion table
  with columns `Suggestion | Confidence | Reason |
  Suggested Rule | Affected Findings | Evidence` (capped at
  20 rows), a `--force` warning when any suggestion is
  low-confidence or duplicates an existing `findingFilters`
  rule id, and an audit-pointer footer clarifying that
  suggestions are advisory and that
  `rekon findings filter-policy apply <suggestion-id>` is the
  only command that mutates `.rekon/config.json`. Missing
  suggestion reports emit explicit
  `rekon findings filter-policy suggest` /
  `rekon refresh` hints.
  `@rekon/capability-docs.agent-contract` adds a matching
  `### Finding Filter Policy Suggestions` subsection under
  `Active Governance State` with an advisory blockquote,
  top suggestions (capped at 5; each rendered as
  `<id> — <reason> (<confidence>) → <suggested rule preview>
  (<affected count> finding(s))`), and two new `Do Not Do`
  reminders:
  - "Do not apply filter policy suggestions without explicit
    operator approval; run
    `rekon findings filter-policy apply <id>` only when the
    operator instructs it."
  - "Do not treat filter policy suggestions as already-applied
    config; they are advisory until
    `rekon findings filter-policy apply` writes them to
    `.rekon/config.json`."
  Both publications additionally render an inline
  **Stale Suggestions** banner when the cited suggestion
  report's `header.inputRefs` does not reference the latest
  `FindingFilterReport` artifact id (so an operator can see at
  a glance that the suggestions were derived from older filter
  data and that `rekon findings filter-policy suggest` should
  be rerun). New exports from `@rekon/capability-docs`:
  - `FilterPolicySuggestionStaleness` (type) —
    `{ stale, latestFilterReportId?, citedFilterReportIds }`.
  - `computeFilterPolicySuggestionStale(suggestion, filterReport?)`
    — file-local stale-detection helper (deterministic, no
    network, no LLM).
  Manifest update: `@rekon/capability-docs.consumes` adds
  `FindingFilterPolicySuggestionReport`; new
  `finding-filter-policy-suggestions.changed` invalidation rule
  invalidates both publications when the suggestion report
  changes. Stale-suggestion detection is a targeted local
  check; it does **not** extend the global
  `detectGovernanceFreshness` helper. The `Do Not Do` block on
  the agent contract grows from one to three filter-related
  reminders (one from filter-health v1 + two new
  policy-suggestion reminders). Docs updated:
  `agent-contract-publication` artifact + concept,
  `architecture-summary-publication` artifact + concept,
  `finding-filter-policy-suggestion-report` artifact (new
  "Consumed By" entries), `finding-filter-policy-suggestions`
  concept (new "Surfaced In Publications" section),
  `finding-filters` concept (new "Visible in publications"
  bullet), `issue-governance-architecture-decision` ADR
  (Implementation Order step 6 flipped to shipped + new
  step 7), four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap), and
  CHANGELOG. 13 new contract tests in
  `tests/contract/publications-filter-policy-suggestions.test.mjs`
  cover: architecture-summary inputRefs / counts / row rendering
  / `--force` warning / missing-report branch / stale banner;
  agent-contract inputRefs / subsection / advisory blockquote /
  Do Not Do reminders / missing-report branch / stale banner;
  regression coverage for the unrelated agents and proof
  publishers, plus a hardened `rekon artifacts validate`
  invariant. Full suite: 542 passed / 1 skipped / 0 failed. No
  LLM, semantic, fuzzy, or embedding matching; no new CLI
  surface; no artifact schemaVersion bump; no new capability
  role; no version bump; no npm publish.
- Shipped filter policy / exclusion persistence v2 (P1.1
  filter-policy-suggestions v2 slice). New
  `FindingFilterPolicySuggestionReport` artifact records
  candidate `findingFilters` rules derived deterministically
  from the latest N `FindingFilterReport` artifacts (default
  5, configurable via `--recent-limit`). The artifact lists
  each suggestion's `id`, `reason`, `suggestedRule`,
  `confidence`, `rationale`, affected finding ids / paths /
  types, the source `FindingFilterReport` ids, and evidence
  refs back to those reports. Four deterministic suggestion
  reasons:
  - **`repeated-filtered-policy-gap`** (high confidence;
    computed first so it wins over `repeated-filtered-path`
    at the same pathPattern) — ≥ 3 built-in-filtered
    findings share a path prefix and no existing
    `findingFilters` rule covers it.
  - **`repeated-filtered-path`** (high ≥ 3 / medium = 2) —
    ≥ 2 filtered findings share a path prefix.
  - **`repeated-filtered-type`** (medium) — ≥ 3 filtered
    findings share `finding.type`.
  - **`high-volume-filtered-pattern`** (low review prompt
    with no `pathPattern`) — one filter reason accounts for
    > 80 % of filtered findings and the bucket has ≥ 5
    findings.
  Path-prefix heuristic uses the first two segments
  (`src/generated/foo.ts`, `src/generated/bar.ts` →
  `src/generated/**`). Coverage check drops any suggestion
  whose `pathPattern` / `type` is already covered by an
  existing `findingFilters` rule. Suggestion + rule ids are
  deterministic (`policy-suggestion:<reason>:<hash>` /
  `suggested-<hash>`) so reruns over the same inputs stay
  stable. New exports from `@rekon/kernel-findings`:
  `FindingFilterPolicySuggestion`,
  `FindingFilterPolicySuggestionReason`,
  `FindingFilterPolicySuggestionConfidence`,
  `FindingFilterPolicySuggestionSummary`,
  `FindingFilterPolicySuggestionReport`,
  `DeriveFindingFilterPolicySuggestionsInput`,
  `deriveFindingFilterPolicySuggestions(input)`,
  `summarizeFindingFilterPolicySuggestions(suggestions)`,
  `createFindingFilterPolicySuggestionReport(input)`,
  `validateFindingFilterPolicySuggestionReport(value)`,
  `assertFindingFilterPolicySuggestionReport(value)`,
  `findingFilterPolicySuggestionReportSchema`. New runtime
  helper
  `buildFindingFilterPolicySuggestionReport(store, options?)`
  reads the latest N filter reports (or a pinned set), runs
  the derivation, and writes the report to the `findings`
  category with `inputRefs` citing every consumed
  `FindingFilterReport`. Registered as an experimental
  built-in artifact type in `@rekon/sdk`.
  New CLI commands:
  `rekon findings filter-policy suggest` (read-only) /
  `rekon findings filter-policy list` (read-only) /
  `rekon findings filter-policy apply <suggestion-id>
  [--force]` (the only mutating command). `apply` reads
  `.rekon/config.json`, appends the suggested rule to
  `findingFilters`, preserves every other top-level field
  (including project extensions), writes
  `<JSON>\n` in one `writeFile`, and creates a default
  config when one doesn't exist. `apply` refuses
  low-confidence suggestions and duplicate rule ids without
  `--force`; `suggest` / `list` never mutate the config.
  Docs added: new artifact spec
  (`docs/artifacts/finding-filter-policy-suggestion-report.md`)
  + new concept doc
  (`docs/concepts/finding-filter-policy-suggestions.md`).
  Docs updated:
  `finding-filter-report` / `finding-filter-health-report`
  artifacts, `finding-filters` concept,
  `issue-governance-architecture-decision` ADR
  (Implementation Order step 5 flipped to shipped + new
  step 6), four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap),
  and CHANGELOG. 15 new contract tests in
  `tests/contract/finding-filter-policy-suggestions.test.mjs`.
  Full suite: 529 passed / 1 skipped / 0 failed. No LLM,
  semantic, fuzzy, or embedding matching;
  `GraphOntologyValidator` port and persistent exclusion
  lists beyond config-backed rules remain deferred. No SDK
  API removal; no artifact schemaVersion bump; no new
  capability role; no version bump; no npm publish.
- Shipped filter health / issue adjudication surfaces in
  publications v1 (P1.1 filter-health-publications v1 slice).
  `@rekon/capability-docs.architecture-summary` and
  `@rekon/capability-docs.agent-contract` now read the latest
  `FindingFilterReport` and `FindingFilterHealthReport`, cite
  them in `header.inputRefs`, and surface filter behavior to
  the surfaces operators and agents actually read.
  Architecture summary adds a `## Finding Filter Health`
  section after `## Accepted Issue Merge Roll-ups`. The
  section lists total / kept / filtered counts, filter rate,
  policy-filtered total, a **Filter Reasons** table (per
  reason, sorted by descending count), a **Policy Filters**
  table (per `findingFilters` policy id, with any unused
  policy ids listed below the table), and a **Filter Health
  Alerts** table (severity / code / message per alert).
  Always closes with "Filtered findings are not deleted.
  Inspect `FindingFilterReport.filteredFindings` for the
  full audit." Missing filter artifacts emit explicit
  `rekon findings filter` / `rekon findings filter-health` /
  `rekon refresh` hints.
  Agent contract adds a `### Finding Filter Health`
  subsection under `Active Governance State` listing
  kept / filtered counts, filter rate, active policy count,
  and warning count. When any alerts exist, the subsection
  emits a blockquote ("Filter-health warnings exist. Do not
  assume active governance is complete until filtered
  findings are reviewed.") followed by up to five
  `<code> — <message>` bullets. Always closes with the
  inspect-`FindingFilterReport.filteredFindings` hint. The
  agent contract `Do Not Do` list gains: "Do not treat a
  clean active-governance surface as proof that no raw
  findings exist; inspect FindingFilterReport when
  filter-health warnings exist or the filter rate is high."
  Manifest update: `@rekon/capability-docs.consumes` adds
  `FindingFilterReport` and `FindingFilterHealthReport`; new
  `finding-filter.changed` invalidation rule (inputs:
  `FindingFilterReport`, `FindingFilterHealthReport`). Two
  new file-local helpers in `packages/capability-docs`:
  `appendArchitectureFindingFilterHealth(sections, filter,
  health)` and `appendAgentContractFindingFilterHealth(...)`,
  plus a small `sortedCountEntries(counts, limit)` utility
  that returns up to 10 entries sorted descending by count
  then by id. `ArchitectureSummaryInputs` and
  `AgentContractInputs` gain optional
  `findingFilterReport?` and `findingFilterHealthReport?`.
  12 new contract tests in
  `tests/contract/publications-filter-health.test.mjs`
  covering: section/subsection rendering, on-disk
  inputRefs, alert visibility (including the agent-contract
  warnings blockquote), missing-artifact command guidance
  for both publications, freshness goes stale on a newer
  `FindingFilterHealthReport`, `publish agents` /
  `publish proof` still work, and `artifacts validate`
  cleanliness. Full suite: 514 passed / 1 skipped. Docs
  updated across architecture-summary-publication
  (artifact + concept), agent-contract-publication
  (artifact + concept), finding-filter-report,
  finding-filter-health-report, finding-filters concept,
  issue-governance-architecture-decision ADR
  (Implementation Order), four strategy docs, and CHANGELOG.
  No SDK API change; no artifact schemaVersion bump; no new
  capability role; no CLI subcommand change; no version
  bump; no npm publish.
- Shipped filter policy / configured exclusions v1 (P1.1
  filter policy v1 slice). `.rekon/config.json` now accepts
  an optional `findingFilters` array of project-specific
  policy rules. Each entry requires `id`, `reason`, and
  `evidence`, plus at least one deterministic matcher among
  `pathPattern` (simple glob — `*` per segment, `**` across
  segments, `?` per character), `type`, `ruleId`, `severity`,
  `titleIncludes`, `descriptionIncludes`. Path patterns are
  project-relative; absolute paths and `..` traversal are
  rejected at validation time. Optional `confidence` defaults
  to `medium`. Policy rules run **before** built-in
  deterministic filters, in declared order — the first
  matching rule wins. Filtered entries record
  `source: "policy"` plus a `policyId` so the audit trail
  names the rule that suppressed each finding. The raw
  `FindingReport` is **not** mutated; filtered findings stay
  auditable in `FindingFilterReport.filteredFindings`. Two
  new exported helpers in `@rekon/kernel-findings`:
  `validateFindingFilterPolicyRules(value)` (used by
  `rekon config validate`; returns sanitized rules + a sorted
  issue list) and an updated `applyFindingFilters(...)` that
  accepts an optional `policies: FindingFilterPolicyRule[]`.
  New exported types: `FindingFilterPolicyRule`,
  `FindingFilterPolicyValidationIssue`,
  `ApplyFindingFiltersOptions`.
  `FindingFilterReport.summary.byPolicy` reports per-policy
  filtered counts (including zero for unused policies).
  `FindingFilterHealthReport.summary` gains `byPolicy`,
  `policyFiltered`, and `unusedPolicies`; three new
  policy-aware alerts: `policy-over-filtering` (configured
  policies suppress > 80 % of findings),
  `low-confidence-policy-filter` (any policy hit at
  `confidence: "low"`), and `unused-policy-filter` (any
  configured policy matched zero findings). New runtime
  helper options: `BuildFindingFilterReportOptions.policies`
  and `BuildFindingFilterHealthReportOptions.policies`. The
  CLI loads `.rekon/config.json` `findingFilters` once per
  invocation (and once per `rekon refresh`) and forwards the
  rules to both runtime helpers; output includes
  `policyFilters: <count>`. `rekon config validate` now
  validates `findingFilters` and rejects duplicate ids,
  missing matchers, unknown reasons, and absolute /
  traversal `pathPattern` values. Docs updated across
  `finding-filter-report` artifact, `finding-filter-health-report`
  artifact, `finding-filters` concept, `refresh` concept,
  `issue-governance-architecture-decision` ADR
  (Implementation Order + Open Questions), four strategy
  docs (subsystem-purpose-map, behavior-roadmap,
  guarantee-regression-plan, roadmap), and CHANGELOG. 19 new
  contract tests in
  `tests/contract/finding-filter-policy.test.mjs`. Full
  suite: 502 passed / 1 skipped. No LLM, semantic, fuzzy, or
  embedding matching; `GraphOntologyValidator` port and
  persistent exclusion lists remain deferred. No SDK API
  removal; no artifact schemaVersion bump; no new capability
  role; no version bump; no npm publish.
- Shipped filter-aware lifecycle / adjudication (P1.1
  filter-aware lifecycle v1 slice).
  `@rekon/runtime.buildFindingLifecycleReport` now lists the
  latest `FindingFilterReport` and uses its `keptFindings` as
  the active latest set whenever the filter report cites the
  latest `FindingReport` in its `header.inputRefs`
  (current-enough check). The lifecycle synthesizes a
  `FindingReport`-shaped object that reuses the raw report's
  header (so previous-report lifecycle comparison stays stable)
  but swaps in `keptFindings` as the active surface; the raw
  `FindingReport` on disk is **not** mutated. The lifecycle's
  own `header.inputRefs` cite the `FindingFilterReport` plus
  the filter report's transitive raw `FindingReport` lineage,
  so `rekon artifacts freshness` marks lifecycle stale when a
  newer filter arrives, and lineage to the raw report stays
  intact. When the latest filter report is missing or stale —
  i.e., does not cite the latest `FindingReport` — the
  lifecycle falls back to the raw `FindingReport` transparently
  and does **not** cite the stale filter. `IssueAdjudicationReport`
  and `CoherencyDelta` are filter-aware **transitively**: only
  kept findings become governed issue groups, coherency items,
  and remediation queue entries. Filtered findings stay
  auditable in `FindingFilterReport.filteredFindings`. No new
  CLI surface; no SDK API removal; no artifact schemaVersion
  bump; no new capability role; no version bump; no npm
  publish. 7 new contract tests in
  `tests/contract/filter-aware-lifecycle-adjudication.test.mjs`
  covering keptFindings preference, raw-fallback when no filter
  exists, stale-filter rejection, transitive adjudication +
  coherency exclusion of filtered findings, end-to-end CLI
  rebuild path, `rekon refresh` on a clean fixture still
  produces a filter-aware lifecycle, and `artifacts validate`
  cleanliness. Full suite: 483 passed / 1 skipped. Docs
  updated across `finding-filter-report` artifact,
  `finding-lifecycle-report` artifact, `issue-adjudication-report`
  artifact, `coherency-delta` artifact, `finding-filters`
  concept, `finding-lifecycle` concept, `issue-adjudication`
  concept, `coherency-delta` concept, `refresh` concept,
  `issue-governance-architecture-decision` ADR (implementation
  order + lifecycle layer), four strategy docs (subsystem-
  purpose-map, behavior-roadmap, guarantee-regression-plan,
  roadmap), and this CHANGELOG.
- Shipped the issue-governance architecture decision +
  false-positive filtering audit (P1.1 filtering v1 slice).
  Added the
  [issue-governance-architecture-decision ADR](docs/strategy/issue-governance-architecture-decision.md)
  that formalizes Rekon's layered issue-governance model
  (FindingReport → FindingFilterReport → FindingStatusLedger →
  FindingLifecycleReport → IssueAdjudicationReport →
  CoherencyDelta) and explicitly labels `IssueMergeCandidate`,
  `IssueMergeDecisionLedger`, accepted-merge rollups in
  `CoherencyDelta`, and publication / resolver awareness of
  those rollups as **Rekon product extensions** — useful and
  supported, but not classic codebase-intel parity. Future work
  must label batches as classic-guarantee preservation, Rekon
  reinterpretation, or Rekon product extension. AGENTS.md +
  CONTRIBUTING.md updated with the same instruction. Two new
  artifact types ship in `@rekon/kernel-findings` and
  `@rekon/sdk`: `FindingFilterReport` records system / policy
  false-positive suppression over `FindingReport` with `reason`,
  `evidence`, optional `filePath`, `confidence`
  (`high` / `medium` / `low`), `filteredAt`, and `source`
  (`system` / `operator` / `policy`) per filtered finding, plus
  a `keptFindings` projection alongside the filtered list. The
  raw `FindingReport` is **not** mutated. Deterministic v1
  filter rules with priority
  `generated > external > test > canary > content`:
  `generated-file` (path segment `dist` / `build` / `generated`,
  or `__generated__` / `.generated.` substring; confidence
  high), `external-file` (path segment `node_modules` /
  `vendor` / `third_party`; high), `test-file` (path segment
  `test` / `tests` / `__tests__` / `__test__`, or filename
  ending with `.test.{ts,tsx,js,jsx,mjs,cjs}` /
  `.spec.{ts,tsx,js,jsx,mjs,cjs}`; high), `canary-file` (path
  contains `canary`; high), `content-filter` (finding text
  mentions "generated output" plus generated path; medium).
  `explicit-exclusion` and `policy-exception` reasons reserved
  for future config-driven exclusions. No LLM, semantic, fuzzy,
  or embedding matching; `GraphOntologyValidator` port deferred.
  `FindingFilterHealthReport` summarizes the latest filter
  report (`totalFindings`, `totalFiltered`, `filterRate`,
  `highConfidenceFiltered`, `lowConfidenceFiltered`, `byReason`)
  and emits deterministic alerts `high-filter-rate` (when
  `filterRate > 0.8`) and `low-confidence-filtered` (when any
  low-confidence entry exists). New `@rekon/kernel-findings`
  helpers: `applyFindingFilters`,
  `summarizeFindingFilterReport`,
  `createFindingFilterReport`, `validateFindingFilterReport`,
  `assertFindingFilterReport`, `findingFilterReportSchema`,
  `buildFindingFilterHealth`,
  `createFindingFilterHealthReport`,
  `validateFindingFilterHealthReport`,
  `assertFindingFilterHealthReport`,
  `findingFilterHealthReportSchema`. New `@rekon/runtime`
  helpers: `buildFindingFilterReport(store, options?)` and
  `buildFindingFilterHealthReport(store, options?)`. New CLI:
  `rekon findings filter` and `rekon findings filter-health`.
  `rekon refresh` adds `findings.filter` and
  `findings.filter-health` steps between `evaluate` and
  `findings.lifecycle`; `REQUIRED_REFRESH_ARTIFACT_TYPES`
  extended with `FindingFilterReport` and
  `FindingFilterHealthReport`. `FindingFilterReport` /
  `FindingFilterHealthReport` registered as
  experimental in `@rekon/sdk` and categorized under
  `findings` in `@rekon/runtime`. `rekon artifacts freshness`
  marks each artifact `stale` when its upstream input is
  superseded. Lifecycle / adjudication / coherency still
  consume `FindingReport` directly — filter-aware lifecycle /
  adjudication is the recommended next slice. Docs added:
  `docs/strategy/issue-governance-architecture-decision.md`,
  `docs/artifacts/finding-filter-report.md`,
  `docs/artifacts/finding-filter-health-report.md`,
  `docs/concepts/finding-filters.md`. Docs updated across
  finding-report / finding-lifecycle-report /
  issue-adjudication-report artifact docs;
  finding-lifecycle / issue-adjudication / coherency-delta /
  refresh concept docs; four strategy docs
  (subsystem-purpose-map, behavior-roadmap,
  guarantee-regression-plan, roadmap), classic-alignment-map;
  README, AGENTS.md, CONTRIBUTING.md. 18 new contract tests in
  `tests/contract/finding-filters.test.mjs`. Existing
  `refresh-command` and `coherency-delta-adjudicated` tests
  updated for the new refresh step order. Full suite: 476
  passed / 1 skipped. No version bump. No npm publish.
- Shipped publication and resolver awareness of accepted merge
  decisions (P1.1 merge-awareness slice). The architecture
  summary, agent operating contract, and `resolve.issue` now
  surface `CoherencyDelta` v3 merged rollup items in the places
  humans and agents actually read:
  `@rekon/capability-docs.architecture-summary` adds an
  `## Accepted Issue Merge Roll-ups` section with one row per
  merged rollup item (rollup id, member group ids, decision ids,
  member finding count, severity, status, active flag).
  `@rekon/capability-docs.agent-contract` adds an
  `### Accepted Issue Merge Roll-ups` subsection under
  `Active Governance State` with the same metadata in bullet
  form plus an instruction to inspect every member group and
  finding id before editing, and adds a new `Do Not Do`
  reminder against treating accepted merge roll-ups as automatic
  mutation of raw issue groups.
  `@rekon/capability-resolver.issueResolver` adds a new optional
  `mergeRollup: IssueMergeRollupSummary` field on `IssuePacket`
  (rollup id, merged group ids, decision/candidate ids, unioned
  member finding ids, severity, status, active) and attaches it
  when the matched group is part of an accepted merged rollup in
  the latest `CoherencyDelta`. The packet also gains a
  sibling-group warning ("Matched issue group is part of an
  operator-accepted merged roll-up; inspect sibling group(s) …
  before acting."), a new `issue.merge` /
  `sourceType: "CoherencyDelta"` / `status: "used"`
  `resolutionTrace` entry, and `header.inputRefs` cites the
  source `CoherencyDelta`. Rejected decisions never produce a
  `mergeRollup` (they don't reach `CoherencyDelta` as merged), so
  the resolver naturally keeps groups separate. None of the three
  surfaces reads `IssueMergeDecisionLedger` directly — all rollup
  metadata flows through `CoherencyDelta` only, keeping the
  display consistent with the latest delta projection.
  `IssueAdjudicationReport.groups` is **not** mutated; raw groups
  remain inspectable. Manifest:
  `@rekon/capability-resolver.consumes` gains `CoherencyDelta`.
  Public API additions: new exported type
  `IssueMergeRollupSummary` from `@rekon/capability-resolver`;
  `IssuePacket.mergeRollup` is additive optional;
  `ResolutionTraceEntry.sourceType` gains literal
  `"CoherencyDelta"`. Internal helpers
  (`findMergeRollupForGroup`, `toMergeRollupSummary`,
  `collectMergedRollups`) are local to their packages. Docs
  updated across architecture-summary-publication artifact +
  concept, agent-contract-publication artifact + concept,
  resolver-packet artifact, resolvers concept,
  coherency-delta artifact + concept,
  `issue-merge-decisions.md` concept (new
  `Downstream Surfaces` section), and four strategy docs
  (classic-subsystem-purpose-map, classic-behavior-roadmap,
  classic-guarantee-regression-plan, roadmap). 10 new contract
  tests in
  `tests/contract/merge-decision-publication-resolver-awareness.test.mjs`.
  Full suite: 458 passed / 1 skipped. No artifact mutation, no
  LLM, no fuzzy / embedding / semantic matching, no new
  capability role, no SDK API break beyond the additive optional
  field, no schemaVersion bump, no version bump, no npm publish.
- Shipped CoherencyDelta v3 respects accepted merge decisions (P1.1
  coherency-merge slice). `@rekon/runtime.buildCoherencyDelta` now
  reads the latest `IssueMergeDecisionLedger` (when it carries any
  decisions), resolves the latest decision per `candidateId`, and
  collapses accepted-merged `IssueAdjudicationGroup` records into
  a single merged `CoherencyDeltaItem`
  (`id: coherency:rollup:merged:<sorted-group-ids-joined-by-+>`)
  with one merged remediation step
  (`id: remediation:merged:<sorted-group-ids-joined-by-+>`).
  Merged items carry additive optional fields
  `mergedIssueGroupIds`, `mergeDecisionIds`, `mergeCandidateIds`,
  a union of `memberFindingIds`, the worst severity in the bucket,
  the canonical group's `issueGroupId` / `canonicalFindingId`, and
  a `groupingReasons` array that includes
  `"operator-accepted-merge"`. Rejected decisions (and candidates
  with no decision) keep groups separate, identical to v2 behavior.
  Latest decision per `candidateId` wins: a later `rejected`
  supersedes an earlier `accepted` and vice versa. The
  `IssueAdjudicationReport.groups` artifact is **not** mutated —
  the rollup is a derived projection in `CoherencyDelta` only.
  Added pure helper
  `rollupIssueGroupsByAcceptedMergeDecisions(input)` in
  `@rekon/kernel-findings`, and three new optional fields on
  `CoherencyDeltaItem` (`mergedIssueGroupIds`,
  `mergeDecisionIds`, `mergeCandidateIds`). `inputRefs` cite the
  ledger when used, so `rekon artifacts freshness` marks the
  delta `stale` after a newer `IssueMergeDecisionLedger`. Docs
  updated across the CoherencyDelta artifact + concept,
  IssueMergeDecisionLedger artifact + concept, IssueAdjudicationReport
  artifact + concept, and four strategy docs
  (`classic-subsystem-purpose-map.md`,
  `classic-behavior-roadmap.md`,
  `classic-guarantee-regression-plan.md`, `roadmap.md`). 12 new
  contract tests in
  `tests/contract/coherency-delta-merge-decisions.test.mjs`. One
  existing test in `issue-merge-decision-ledger.test.mjs` was
  updated to reflect the v3 invariants (accepted decisions still
  do not mutate `IssueAdjudicationReport.groups`, but
  `CoherencyDelta` now merges the linked groups in its
  projection). No artifact mutation of upstream sources, no LLM,
  no fuzzy / embedding / semantic matching, no new capability
  role, no version bump, no npm publish.
- Bumped the workspace and every `@rekon/*` package to `0.1.0-alpha.1` (root, all 19 packages, all `@rekon/*` internal dependency ranges).
- Recorded the public package boundary decision: all 19 packages are scheduled to publish under the `experimental, public` stability label. See `docs/release/public-package-boundaries.md`.
- Excluded `.tsbuildinfo` from publish tarballs by relocating the TypeScript build info file out of `dist/` in every package tsconfig. `npm pack --dry-run` now reports six entries per package (README, package.json, four dist files).
- Strengthened `scripts/publish-dry-run.mjs` to fail on `.tsbuildinfo` inclusion and to print a concise per-package summary. Existing guards against `.rekon/`, `.rekon-dev/`, dogfood fixtures, forbidden tokens, missing READMEs/licenses/dist outputs, and absolute paths remain.
- Added `scripts/install-tarball-smoke.mjs`: packs all 19 workspace packages, installs them into a temp consumer project via `file:` dependencies, copies `examples/simple-js-ts` into the project, runs the golden CLI flow, and validates the artifact index. Tarballs and the consumer project are cleaned up at the end.
- Added `docs/release/npm-publish-plan.md` with auth prerequisites, dependency-safe publish order, dry-run and publish command templates, post-publish smoke, and rollback/deprecate guidance. Explicit instruction: do not publish until manual approval.
- Added `docs/release/0.1.0-alpha.1.md` release notes draft describing what Rekon is, what is included, install/use instructions, CLI flows, capability authoring, known limitations, verification commands, dogfood note, and publish status.
- Updated `docs/release/alpha-release-checklist.md` to check off the items completed by this batch and to point at the new public package boundaries doc, npm publish plan, and release notes.
- Fixed the `@rekon/cli` entry-point detection so the installed binary runs correctly when `process.argv[1]` points through a symlinked path (e.g., npm's `node_modules/.bin/rekon` symlink, macOS `/tmp` → `/private/tmp` resolution, or any global install location). The CLI now compares the realpath of `process.argv[1]` to the module's own file URL.
- Added `tests/docs/release-readiness.test.mjs` covering: every workspace package at `0.1.0-alpha.1`, internal `@rekon/*` dependency ranges pinned to the same version, release readiness docs present, every workspace package listed (publish or deferred) in the public boundaries doc, npm publish plan requiring manual approval, release notes drafted, and the publish dry-run script guarding against `.tsbuildinfo`.
- Updated `tests/docs/package-stability.test.mjs` to require `scripts/install-tarball-smoke.mjs` exists.
- No artifact shape, kernel contract, SDK API, or capability behavior changes were made.
- Documentation-only correction to the publish posture: `docs/release/npm-publish-plan.md` now defaults to `--tag alpha` for the first public alpha, with `--tag latest` documented as the explicit opt-in if alpha should become the default install target. `docs/release/0.1.0-alpha.1.md` updates the install command to `npm install --no-save @rekon/cli@alpha` and notes that bare `npm install @rekon/cli` will not pull the alpha while the `alpha` dist-tag is in use. `docs/release/alpha-release-checklist.md` adds explicit checklist items for the scope/dist-tag decision, `npm login`, and the dist-tag-specific post-publish smoke. The decision rationale and exact commands live in `.rekon-dev/review-packets/dist-tag-decision.md`.
- Added generic capability execution CLI commands so external (and built-in) capabilities can be operated without bespoke runtime scripts:
  - `rekon capabilities list --verbose` — adds per-capability handler summary including handler ids.
  - `rekon capabilities inspect <capability-id>` — prints manifest, registered handlers, and artifact types.
  - `rekon config validate` — lightweight validation of `.rekon/config.json` (shape, capabilities array, known permissions, risky-permission warnings). Returns `{ valid, configPath, configExists, issues }`.
  - `rekon publish list` — lists all registered publishers as `{ id, capabilityId, produces }`.
  - `rekon publish run <publisher-id> [--input-json <json>]` — executes the named publisher (built-in or external) after ensuring snapshot inputs are ready.
- Kept `rekon publish agents` as the built-in docs publisher shortcut.
- Updated `examples/custom-capability/README.md` to drop the runtime-script workaround for the external TODO publisher; the example now walks through the CLI flow end-to-end (`config validate`, `capabilities list`, `capabilities inspect`, `publish list`, `publish run todo.report`).
- Bumped `examples/custom-capability/package.json` internal `@rekon/*` dependency ranges from `0.1.0-alpha.0` to `0.1.0-alpha.1` so the documented `npm install ./examples/custom-capability --no-save` flow resolves under the post-bump workspace.
- Updated `docs/extensions/authoring-capabilities.md` and `docs/extensions/capability-manifest.md` with sections covering the new CLI surface.
- Updated the root `README.md` CLI command list to include `config validate`, `capabilities inspect`, `publish list`, and `publish run`.
- Added `tests/contract/generic-capability-execution.test.mjs` covering all new commands plus the `publish agents` shortcut, unknown-publisher / unknown-capability errors, and config-validate error paths.
- Added `tests/integration/external-capability-cli.test.mjs` that exercises the full external capability flow through the CLI against a temp copy of `examples/simple-js-ts` (self-skips when `rekon-capability-todo-example` is not installed).
- No kernel, SDK, runtime, or capability behavior changes. The runtime already supported `publisherId` filtering through `runPublish`; this batch exposes it via CLI.
- Extended generic capability execution to evaluators and resolvers:
  - `rekon evaluate list` — lists every registered evaluator with `id`, `capabilityId`, and `produces`.
  - `rekon evaluate run <evaluator-id> [--input-json <json>]` — runs a single evaluator, including external rule packs, and writes the produced `FindingReport`(s) through the normal artifact store.
  - `rekon resolve list` — lists every registered resolver.
  - `rekon resolve run <resolver-id> [--input-json <json>]` — runs a single resolver, injecting the latest `IntelligenceSnapshot` ref when `--input-json` omits `snapshotRef`. Returns the resulting `ResolverPacket` (with `resolutionTrace`) inline alongside the artifact refs.
- `rekon evaluate` (no subcommand) still runs every registered evaluator; `rekon resolve preflight --path … --goal …` remains the friendly workflow shortcut.
- Generic actuator and learner CLI dispatch are intentionally deferred: actuators may write source or run commands, learners already have explicit `rekon memory …` commands. The docs say so out loud in `docs/extensions/authoring-capabilities.md` and `docs/strategy/capability-model.md`.
- Added `tests/contract/generic-evaluator-resolver-execution.test.mjs` with 9 tests: evaluator list, evaluator run, unknown evaluator, bare `evaluate` still works, resolver list, resolver run with auto-injected snapshot, resolver run with explicit snapshotRef, unknown resolver, and `resolve preflight` shortcut still works.
- Extended `tests/integration/external-capability-cli.test.mjs` to assert `evaluate list` includes the external `todo.findings` evaluator and to run it via `evaluate run` before `publish run todo.report`.
- Updated `docs/extensions/authoring-capabilities.md`, `docs/extensions/capability-manifest.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `examples/custom-capability/README.md`, and the root `README.md` to document the new commands and the explicit actuator/learner deferral.
- Added classic behavior distillation strategy docs to anchor future work in `codebase-intel-classic`'s hard-won lessons without copying its file structure:
  - `docs/strategy/classic-behavior-distillation.md` — 12 behavior cards covering evidence/observation, deterministic+LLM analysis, graph intelligence, rule governance, issue detection, resolver/preflight, publications, memory, intent/work orders, reconciliation, watcher/freshness, and GitHub/SaaS surfaces. Each card states classic source areas, what is good, what is accidental, Rekon reinterpretation, and migration path.
  - `docs/strategy/classic-wins.md` — the 13 durable principles distilled from classic (evidence before opinion, deterministic before semantic, provenance on every claim, generated docs as publications, executable rules, governance-grade issues, relational graphs, self-explaining resolvers, scoped/verified/fresh memory, agent proof gates, deterministic-first reconciliation, explicit freshness, declared capability contracts).
  - `docs/strategy/classic-to-rekon-translation.md` — translation patterns and concrete examples for evaluator, graph projector, resolver+publisher, memory learner, and reconciliation actuator.
  - `docs/strategy/classic-refactor-principles.md` — ten rules for porting (preserve goal not file structure, artifact contract not cache location, evaluator semantics not registry sprawl, etc.).
  - `docs/strategy/classic-behavior-roadmap.md` — phased migration plan (Phase A already represented, Phase B next distillations, Phase C later maturity, Phase D deferred surfaces).
  - `docs/strategy/classic-alignment-map.md` — quick-lookup table mapping classic source areas to Rekon roles, artifacts, packages, and phases.
- Updated `AGENTS.md` to require a `CODEBASE-INTEL ALIGNMENT` section in major capability work and to state that new capabilities should distill, generalize, or prepare migration for a proven classic behavior unless explicitly marked as experimental exploration.
- Updated `CONTRIBUTING.md` to require contributors to read the classic behavior docs before proposing migrated capabilities, and to require proposals to identify what is good, what is accidental, and how Rekon will preserve the win.
- Updated `docs/strategy/north-star.md` and `docs/strategy/roadmap.md` to cross-link the new classic behavior docs.
- Added `tests/docs/classic-behavior-distillation.test.mjs` covering: all six new strategy docs exist, every behavior family appears in the distillation, every principle appears in the wins doc, every required example appears in the translation doc, every refactor principle appears in the refactor doc, the roadmap defines phases A–D, the alignment map covers every behavior family row, `AGENTS.md` requires `CODEBASE-INTEL ALIGNMENT`, and `CONTRIBUTING.md` links the classic docs.
- No kernel, SDK, runtime, CLI, capability, or artifact behavior changes. Docs/strategy/test pass only.
- Added `examples/import-boundary-rule-pack/`: the first migrated external rule pack capability. Maps to `codebase-intel-classic` import governance (`domain/issues/evaluators/imports/*`, `domain/issues/RulesResolver.ts`, `services/issues/detection-phases.ts`). The package registers an evaluator with id `import-boundaries.evaluate` that consumes the latest `EvidenceGraph` and produces a `FindingReport` containing:
  - `import_boundary.parent_relative_import` (severity: medium) — imports starting with `../`.
  - `import_boundary.generated_output_import` (severity: high) — imports referencing `dist/` or `build/`.
- The rule pack ships its own README, conformance test (`assertCapabilityConforms()` + synthetic-graph evaluator harness), and fixture under `fixtures/bad-imports/`. Package-level test command: `npm --prefix examples/import-boundary-rule-pack run test`.
- Added `tests/integration/import-boundary-rule-pack-cli.test.mjs` that runs the full external rule-pack flow through the CLI (`config validate`, `capabilities list`, `capabilities inspect`, `observe`, `evaluate list`, `evaluate run import-boundaries.evaluate`, `artifacts validate`) and asserts that both finding types are emitted with the right severities. The test self-skips when `node_modules/rekon-capability-import-boundaries-example` is absent.
- Updated `README.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-alignment-map.md`, and `docs/strategy/classic-behavior-roadmap.md` to reference the new external rule pack and mark Phase B's "first external rule-pack example" as shipped.
- No SDK, runtime, kernel, CLI, or built-in capability behavior changes. No version bump. The example evaluator is an external capability and is not registered as a built-in.
- Added artifact freshness validation and a CLI surface for it.
- Added `validateArtifactFreshness(store, options?)` to `@rekon/runtime`. The helper inspects every indexed artifact's `header.inputRefs`, compares to the latest indexed artifact of the same input type, and reports `fresh` / `stale` / `partial` / `unknown` per artifact and in aggregate. Issue codes are `newer-input-exists`, `input.missing`, `lineage.unknown`, and `artifact.unreadable`. Results include `status`, `checkedAt`, `issues`, and `artifacts: { type, id, status, issues }[]`.
- Added new runtime exports: `ArtifactFreshnessStatus`, `ArtifactFreshnessIssue`, `ArtifactFreshnessEntry`, `ArtifactFreshnessResult`, `ArtifactFreshnessOptions`.
- Added `rekon artifacts freshness [--type <type>] [--id <id>] [--json]` CLI command backed by `validateArtifactFreshness`. `rekon artifacts validate` remains integrity-only.
- Tightened CLI helpers `ensureSnapshotReady` and `ensurePreflight` to only run a new `runSnapshot()` when there is no existing snapshot or the latest known inputs are newer than the latest snapshot. Prior behavior unconditionally re-ran snapshot, which made artifacts written before publish/preflight legitimately stale even on a clean golden flow. The new behavior keeps the latest artifact of every major type `fresh` after the golden flow without changing artifact/SDK contracts.
- Added `tests/contract/artifact-freshness.test.mjs` (6 tests) covering: golden-flow freshness of the latest artifact of every major type; FindingReport stale after a newer EvidenceGraph; ResolverPacket stale after newer model/finding/snapshot inputs; Publication stale after newer resolver/snapshot inputs; missing `inputRef` produces `partial`; CLI JSON shape contract.
- Documented the freshness model in `docs/concepts/freshness-and-invalidation.md` (statuses, integrity-vs-freshness, check rules, CLI surface, invalidation rule shape, snapshot-vs-validator distinction). Updated `docs/artifacts/artifact-header.md`, `docs/artifacts/intelligence-snapshot.md`, `docs/extensions/capability-manifest.md`, and `docs/strategy/capability-model.md` to reference the new surface and clarify how today's freshness validator evaluates `invalidatedBy.inputs` while `paths`/`events` remain future intent.
- Added a Freshness section to both external capability READMEs (`examples/custom-capability/README.md`, `examples/import-boundary-rule-pack/README.md`) showing the `rekon artifacts freshness --type <type>` flow.
- Updated `docs/strategy/classic-behavior-roadmap.md` to mark the lineage-based freshness portion of the Phase B "freshness/invalidation engine" item as shipped; path/event-driven invalidation remains future watcher work.
- No watcher or daemon added. No file-system mtime/inotify integration. No artifact header shape changes. No SDK changes. No new capability roles. No version bump. No npm publish.
- Extended `@rekon/capability-resolver` with three new resolver handlers alongside the existing `resolve.preflight`:
  - `resolve.route` — given paths + goal, decide single-owner / cross-owner / unresolved routing. Sets `nextRequiredResolver` to `resolve.preflight` or `resolve.seam`. Records routing decision in `resolutionTrace`.
  - `resolve.seam` — given paths spanning owners, designate primary + secondary owners or escalate when a primary cannot be chosen. Honors an explicit `primaryOwner` input when it matches one of the resolved systems.
  - `resolve.issue` — given an issue id or fragment, find the matching `Finding` (exact id first, unique-fragment fallback). Surfaces ambiguous-match and missing-match warnings without silently choosing. Resolves ownership for the matched finding's files and recommends `resolve.preflight` / `resolve.seam` / `resolve.route` accordingly.
- Added a shared `ResolverPacketBase` shape (`resolverId`, `phase`, `summary`, `warnings`, `nextSteps`, `resolutionTrace`) plus per-phase packet types (`RoutePacket`, `SeamPacket`, `IssuePacket`). The existing `PreflightPacket` is unchanged.
- Friendly CLI shortcuts added: `rekon resolve route`, `rekon resolve seam`, `rekon resolve issue`. Generic dispatch (`rekon resolve list` / `rekon resolve run <id>`) works for every resolver. New CLI helper `ensureSnapshotForResolver` shares snapshot readiness across the three new commands and only writes a new snapshot when one is missing or inputs are newer than the latest snapshot.
- Updated `docs/concepts/resolvers.md`, `docs/artifacts/resolver-packet.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, and the root `README.md` to describe the resolver phase flow, the new packet fields per phase, and the `route → seam → preflight` / `issue → …` flow.
- Added `tests/contract/route-seam-issue-resolvers.test.mjs` covering 12 direct-evaluator scenarios (single-owner / cross-owner / unresolved routing, seam resolved / needs-primary / unresolved, issue exact / fragment / ambiguous / cross-owner / missing) plus 7 CLI tests (`resolve list` reports all four resolvers, each friendly shortcut writes a phase-tagged packet, `resolve run resolve.route` dispatches the same handler, existing preflight still works, and `artifacts freshness` stays clean after writing route/seam/issue packets).
- No artifact header shape changes. No SDK changes. No new capability roles. No version bump. No npm publish.
- Added finding lifecycle and status preservation.
- `@rekon/kernel-findings` exports `FindingStatusDecision`, `FindingStatusDecisionStatus`, `FindingStatusDecisionReason`, `FindingStatusLedger`, `EffectiveFinding`, `EffectiveFindingLifecycle`, `FindingLifecycleReport`, and `FindingLifecycleInput` types plus `createFindingStatusLedger`, `validateFindingStatusLedger`, `assertFindingStatusLedger`, `findingStatusLedgerSchema`, `createFindingLifecycleReport`, `validateFindingLifecycleReport`, `assertFindingLifecycleReport`, `findingLifecycleReportSchema`, `applyFindingStatusDecisions`, `deriveFindingLifecycle`, and `findLatestDecisionForFinding` helpers. Raw `Finding` and `FindingReport` shapes are unchanged.
- `@rekon/runtime` exports `BuildFindingLifecycleOptions` and `buildFindingLifecycleReport(store, options?)` which reads every indexed `FindingReport` (latest = active, earlier = previous), the latest `FindingStatusLedger`, and computes a `FindingLifecycleReport` projection.
- `FindingStatusLedger` is now treated as a canonical input artifact for freshness purposes (alongside `EvidenceGraph`, `Rulebook`, and `OperatorFeedbackEntry`); ledger artifacts with no `inputRefs` do not raise `lineage.unknown`.
- New CLI commands:
  - `rekon findings list [--status <status>]` — prints effective findings (id, type, severity, files, `effectiveStatus`, `statusSource`, `statusReason`, `statusNote`).
  - `rekon findings lifecycle` — writes a `FindingLifecycleReport` artifact via the runtime store.
  - `rekon findings status list` — prints the decisions in the latest `FindingStatusLedger`.
  - `rekon findings status set <finding-id> --status accepted|ignored|resolved --note <note> [--reason <reason>]` — appends or replaces a decision for the finding id and writes a new `FindingStatusLedger`. `ignored` and `resolved` require `--note`; `--reason` accepts `accepted-risk`, `false-positive`, `fixed`, `not-actionable`, or `other`.
- Updated `resolve.issue` to read the latest `FindingStatusLedger` (when one is indexed) and annotate the matched `issue` with `status`, `statusSource`, `statusNote`, and `statusReason`. Adds a warning when the matched finding is `accepted` ("verify policy before changing"), `ignored` ("verify before acting"), or `resolved` ("confirm whether action is still needed"). The resolver does not silently treat ignored/accepted findings as no-ops.
- Added `tests/contract/finding-lifecycle.test.mjs` (13 tests) covering: ledger validation rejects ignored decisions without notes; `deriveFindingLifecycle` marks first-seen findings as new, repeated findings as existing, ledger decisions override derived status, absent prior findings become resolved; CLI `findings lifecycle`, `findings list`, and `findings status set` end-to-end; CLI rejection of `findings status set --status ignored` without `--note`; `resolve.issue` annotates accepted/ignored matches with status and warnings; `rekon artifacts freshness` keeps `FindingStatusLedger` and `FindingLifecycleReport` in the output and stays away from `unknown`.
- Documented the lifecycle model: `docs/concepts/finding-lifecycle.md`, `docs/artifacts/finding-status-ledger.md`, `docs/artifacts/finding-lifecycle-report.md`. Updated `docs/artifacts/finding-report.md`, `docs/artifacts/resolver-packet.md`, `docs/concepts/resolvers.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, and the root `README.md` to point at the new surface.
- No artifact header shape changes. No SDK changes. No new capability roles. `Finding.status` enum is unchanged. `FindingReport` shape is unchanged; lifecycle data lives in separate `FindingStatusLedger` and `FindingLifecycleReport` artifacts. No version bump. No npm publish.
- Added Coherency Delta Lite — a derived governance artifact rolled up from `FindingLifecycleReport`.
- `@rekon/kernel-findings` exports `CoherencyDelta`, `CoherencyDeltaItem`, `CoherencyDeltaItemStatus`, `CoherencyDeltaSeverity`, `CoherencyDeltaSummary`, `CoherencyDeltaInput`, `CoherencyRemediationStep`, `CoherencyRemediationPriority`, `severityToPriority`, and the helpers `createCoherencyDelta`, `validateCoherencyDelta`, `assertCoherencyDelta`, `coherencyDeltaSchema`.
- `@rekon/runtime` exports `BuildCoherencyDeltaOptions` and `buildCoherencyDelta(store, options?)`. The helper reads the latest `FindingLifecycleReport` (or builds one in place), the latest `OwnershipMap` and `ObservedRepo`, assigns systems per finding by longest-prefix match (`OwnershipMap` → `ObservedRepo` → `"unknown"`), and emits a `CoherencyDelta` with full `header.inputRefs`. `FindingStatusLedger`, `FindingLifecycleReport`, and `CoherencyDelta` are now in the artifact category map under `findings`.
- New CLI command `rekon coherency delta [--root <path>] [--json]` writes a `CoherencyDelta` artifact and prints `{ artifact, summary, remediationQueue }`.
- Coherency delta semantics:
  - `active === true` when finding status is `new` or `existing`. `accepted`, `ignored`, and `resolved` items are included for visibility but excluded from `summary.active` and from `remediationQueue`.
  - Priority mapping: `critical` and `high` → `p0`; `medium` → `p1`; `low` → `p2`.
  - Items and remediation queue are sorted deterministically (active first, then severity rank, then status rank, then `findingId`; queue by priority then `findingId`).
  - Summary includes `total`, `active`, `resolved`, `accepted`, `ignored`, `bySeverity`, `byType`, `bySystem`, and `topPaths` (up to 10 paths by occurrence count).
- Added `tests/contract/coherency-delta.test.mjs` (10 tests) covering: kernel-level summary by severity/type/system, accepted/ignored exclusion from active, resolved findings included but not active, remediation queue priority mapping and ordering, `severityToPriority` per-severity, `OwnershipMap`-based system assignment, `"unknown"` fallback, CLI writing a `CoherencyDelta`, freshness marking older deltas stale after a newer `FindingLifecycleReport`, and `artifacts validate` staying clean with `CoherencyDelta` indexed.
- Added `docs/artifacts/coherency-delta.md` and `docs/concepts/coherency-delta.md`. Updated `docs/artifacts/finding-lifecycle-report.md`, `docs/concepts/finding-lifecycle.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. `Finding`, `FindingReport`, `FindingStatusLedger`, and `FindingLifecycleReport` shapes are unchanged. No version bump. No npm publish.
- Added architecture summary publisher and `rekon publish architecture` CLI shortcut.
- `@rekon/capability-docs` registers a second publisher `@rekon/capability-docs.architecture-summary` (alongside the existing `@rekon/capability-docs.publisher`). The publisher consumes the latest `IntelligenceSnapshot` (required), plus `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport` (each optional) and emits one `Publication` artifact.
- Extended the package-local `PublicationArtifact.kind` enum to include `"architecture-summary"` and added an optional `title` field. The artifact `kind` is package-internal metadata; the `Publication` artifact type itself is unchanged at the kernel level.
- Added `@rekon/kernel-findings` and `@rekon/kernel-repo-model` as dependencies of `@rekon/capability-docs` (used internally for type imports). The capability manifest now declares `consumes` of `IntelligenceSnapshot`, `ResolverPacket`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport`, and adds a `coherency.changed` invalidation rule alongside the existing `snapshot.changed` rule.
- New CLI command `rekon publish architecture [--root <path>] [--json]` invokes the new publisher via `runPublish({ publisherId })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.architecture-summary` is equivalent.
- The publication content is a Markdown document with the following sections: Repository Overview, Owner Systems (table, capped at 20 rows), Capability Map (bullets, capped at 20), Coherency Summary (active/accepted/ignored/resolved counts plus severity breakdown — surfaces a "run `rekon coherency delta`" hint when missing), Top Affected Paths, Remediation Queue (priority/finding/severity/systems/action — capped at 20 rows), Agent Guidance, Freshness, Input Artifacts (header refs). When inputs are missing, the section text explains what to run next instead of pretending data exists.
- Added `tests/contract/architecture-summary-publisher.test.mjs` (8 tests) covering: publisher appears in `publish list`; CLI shortcut writes a `Publication` containing every documented section; generic `publish run` dispatches the same handler; `inputRefs` cite `IntelligenceSnapshot`/`ObservedRepo`/`OwnershipMap`/`CapabilityMap`/`CoherencyDelta` when present; the publication flags missing `CoherencyDelta`; `artifacts freshness` marks older summaries `stale` after a newer `CoherencyDelta`; existing `publish agents` still works; running the publisher against the import-boundary rule pack fixture surfaces active findings + a P0/P1 remediation row (test self-skips if the rule pack is not installed).
- Updated `packages/capability-docs/test/docs.test.mjs` to invoke `runPublish` with `publisherId: "@rekon/capability-docs.publisher"` so the existing docs-publisher test stays scoped, and added a new test exercising the architecture-summary publisher directly through the runtime.
- Added new docs: `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`. Updated `docs/extensions/authoring-capabilities.md`, `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md` to describe the new publisher and surface.
- No artifact header shape changes. No SDK changes. No new capability roles. No kernel contract changes (`Publication` shape at the kernel level is unchanged; the new `kind` value lives in the package-local artifact type). No version bump. No npm publish. The publisher reads existing artifacts and does not synthesize a `CoherencyDelta` or `FindingLifecycleReport` if missing — it surfaces the gap in the markdown instead.
- Added remediation work orders generated from `CoherencyDelta`.
- `@rekon/capability-intent` registers a second actuator `@rekon/capability-intent.remediation-work-order` (alongside the existing `@rekon/capability-intent.work-order`). The new actuator consumes the latest `CoherencyDelta` (required), plus the latest `FindingLifecycleReport` and `ResolverPacket` (each optional), and writes one `IntentMap`, one `WorkOrder`, and one `VerificationPlan` per invocation. Accepted/ignored/resolved findings are excluded because they never enter `CoherencyDelta.remediationQueue`. When no active items remain, the actuator writes no artifacts and the CLI returns `{ artifacts: [], selectedItems: [], message }`.
- Extended the package-local `WorkOrder` type with optional `source: "resolver" | "coherency-delta"` and `remediationItems: RemediationWorkOrderItem[]` fields. Existing resolver-based work orders set `source: "resolver"` and omit `remediationItems`. The `WorkOrder` artifact type at the kernel level is unchanged.
- Added `@rekon/kernel-findings` as a dependency of `@rekon/capability-intent` (used for `CoherencyDelta`, `CoherencyRemediationStep`, `CoherencyRemediationPriority`, and `FindingLifecycleReport` type imports). The capability manifest now declares `consumes` of `ResolverPacket`, `CoherencyDelta`, and `FindingLifecycleReport`, and adds `coherency.changed` and `lifecycle.changed` invalidation rules alongside the existing `preflight.changed` rule.
- New CLI command `rekon intent remediation [--finding <finding-id>] [--priority p0|p1|p2] [--limit <n>] [--root <path>] [--json]`. Optional filters select a subset of `CoherencyDelta.remediationQueue`; default limit is 5. The command auto-runs `ensureCoherencyDeltaReady` (which auto-runs observe/project/evaluate/snapshot/lifecycle/delta if missing) before dispatching `@rekon/capability-intent.remediation-work-order`.
- The remediation work-order markdown body contains, in order: Source (CoherencyDelta id, + FindingLifecycleReport id when available), Objective, Selected Remediation Items table (priority/finding/severity/systems/files/action), Scope (paths + owner systems), Required Checks (`npm run typecheck`, `npm run test`, `npm run build`, `rekon artifacts validate --json`, `rekon artifacts freshness --json`), Success Criteria, Guardrails (strengthened anti-gaming instruction + optional Risk Notes), Follow-up Evidence (re-run evaluate/findings lifecycle/coherency delta/publish architecture).
- The anti-gaming instruction was strengthened to: *"Do not modify tests, artifact validators, rules, findings, status ledgers, or verification scripts merely to make this work order appear complete. Verification gates exist to prove real implementation correctness; if a gate is wrong, record that as a finding or follow-up instead of gaming it."*
- The `VerificationPlan` for remediation work orders includes the same five commands the work order requires, plus `successCriteria` mirrored from the work order. The actuator never executes the commands.
- Added `tests/contract/remediation-work-order.test.mjs` (12 tests) covering: `intent remediation` writes IntentMap/WorkOrder/VerificationPlan from active findings; active CoherencyDelta items are selected and accepted/ignored findings are excluded; `--priority` and `--finding` filters narrow the selection; no-active-items returns no artifacts with a clear message; the work order markdown includes Selected Remediation Items and the strengthened anti-gaming guardrail; the verification plan includes validate/freshness commands; the work order cites `CoherencyDelta` in `header.inputRefs`; `artifacts freshness` marks older remediation work orders stale after a newer CoherencyDelta; the existing `intent work-order` (resolver-based) command still works; the import-boundary rule pack fixture surfaces a `p0` remediation row (test self-skips if the rule pack is not installed).
- Added new docs: `docs/artifacts/verification-plan.md`, `docs/concepts/remediation-work-orders.md`. Updated `docs/artifacts/work-order.md` to describe both work-order flavors, `docs/artifacts/coherency-delta.md` and `docs/concepts/coherency-delta.md` to list the remediation work-order actuator as a consumer, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. No kernel contract changes (`WorkOrder`, `VerificationPlan`, and `IntentMap` at the kernel level are unchanged; the new `source` and `remediationItems` fields live on the package-local `WorkOrder` type). No source-writing reconciliation. No auto-apply. No version bump. No npm publish.
- Added reconciliation suggestion plans generated from `WorkOrder` / `CoherencyDelta`.
- `@rekon/capability-reconcile.actuator` now supports two modes: manual (operator-driven, artifact-only, existing behavior unchanged) and suggestion (governance-driven, classifies each remediation item into a `ReconciliationPlanOperation`). Suggestion mode reads the latest `WorkOrder` with `source === "coherency-delta"` if available, otherwise falls back to the latest `CoherencyDelta`. Source-write and command operations are never applied.
- New exported helper `suggestReconciliationOperations(input)` is a pure function that classifies remediation items by inspecting `title` + `action` text (case-insensitive). Mapping: docs/documentation/README/AGENTS -> `docs_regeneration` artifact-only; baseline/accept/ignore/false positive/status ledger -> `finding_baseline_write` artifact-only; import/generated output/dist/build/boundary -> `safe_import_rewrite` source-write-deferred (requires `write:source`); scaffold/generate file/create file -> `generated_scaffold_write` source-write-deferred (requires `write:source`); test/verify/command/run -> `verification_command_run` command-deferred (requires `execute:commands`); unmatched -> `manual_review` manual-review.
- Extended package-local `ReconciliationPlan` shape with optional `summary` (per-class and per-status counts) and richer per-operation fields: `class` (`artifact-only`/`deterministic-deferred`/`source-write-deferred`/`command-deferred`/`manual-review`), `source` (`manual`/`work-order`/`coherency-delta`), `findingId`, `priority`, `files`, `systems`, `suggestedAction`, `requiresPermission`. Existing single-operation legacy plans now also include `class: "artifact-only"` and `source: "manual"` so the summary stays meaningful. The `ReconciliationPlan` artifact type at the kernel level is unchanged.
- Added a new `manual_review` value to the package-local `ReconciliationOperation` union so unclassified remediation items have a first-class home instead of being misclassified or denied.
- Extended `ReconciliationLog` (additive only) with optional `planned` and `denied` arrays of full `ReconciliationPlanOperation` records. Existing `applied` / `deferred` string-arrays are unchanged.
- Added `@rekon/kernel-findings` as a dependency of `@rekon/capability-reconcile` (used internally for `CoherencyDelta`, `CoherencyRemediationStep`, and `CoherencyRemediationPriority` type imports). The capability manifest now declares `consumes` of `IntelligenceSnapshot`, `Publication`, `FindingReport`, `CoherencyDelta`, and `WorkOrder`, and adds `coherency.changed` and `work-order.changed` invalidation rules alongside the existing `snapshot.changed` rule.
- New CLI command `rekon reconcile suggest [--finding <finding-id>] [--priority p0|p1|p2] [--limit <n>] [--apply] [--root <path>] [--json]`. Reads the latest remediation work order or coherency delta, classifies operations, and writes one `ReconciliationPlan`, one `ReconciliationLog`, and one `ActionLog`. `--apply` only applies `artifact-only` operations; source-write and command operations stay `deferred`. CLI auto-runs `ensureCoherencyDeltaReady` (observe/project/evaluate/snapshot/lifecycle/delta as needed) before dispatching.
- Existing CLI command `rekon reconcile [--operation <name>] [--apply]` is unchanged. The legacy path still denies any non-artifact-only operation passed via `--operation`.
- Added `tests/contract/reconciliation-suggestions.test.mjs` (17 tests): 7 unit tests over the pure classification helper (import / docs / test / unknown / baseline / WorkOrder-preferred / filters + limit) and 10 CLI integration tests covering writes/summary/priority/finding filters, `--apply` artifact-only behavior, the legacy `rekon reconcile --operation` path still working and still denying source ops, freshness staleness after a newer CoherencyDelta, and a self-skipping import-boundary rule pack integration test that confirms all import remediation lands as deferred `safe_import_rewrite` with `write:source` permission.
- Added new docs: `docs/artifacts/reconciliation-plan.md`, `docs/concepts/reconciliation-plans.md`. Rewrote `docs/artifacts/reconciliation-log.md` to describe the optional `planned`/`denied` fields and the manual vs suggestion modes. Updated `docs/artifacts/work-order.md`, `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`, `docs/concepts/remediation-work-orders.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `ReconciliationPlan`, `ReconciliationLog`, and `ActionLog` artifact types at the kernel level are unchanged; the new fields live on package-local types. No source writes. No command execution. No auto-apply for deferred classes. No version bump. No npm publish.
- Added verification result recording.
- `@rekon/capability-intent` now exports `createVerificationResult(input)` plus the package-local `VerificationResult`, `VerificationCommandResult`, `VerificationResultSummary`, `VerificationCommandStatus`, `VerificationResultStatus`, `VerificationPlanLike`, and `CreateVerificationResultInput` types. The helper takes a `VerificationPlan`, a list of operator-supplied `VerificationCommandResult` entries, and writes a single `VerificationResult` artifact with deterministic overall-status derivation.
- The helper fills missing plan commands with `not-run` entries (preserving the plan's command order), appends submitted commands not in the plan after the plan-ordered list, and derives the overall status: `passed` (all plan commands passed, none failed), `failed` (any command failed), `partial` (some commands `skipped`/`not-run` and none failed), `not-run` (empty submission or every entry is `not-run`).
- Raw stdout/stderr is not stored by default. Operators can attach `stdoutDigest` / `stderrDigest` (e.g. SHA-256 hex) and `notes` for additional context. This keeps artifacts small and prevents accidental secret capture.
- The `VerificationResult.header.inputRefs` always include the consumed `VerificationPlan`. When the plan exposes a `workOrderRef`, the work order is also cited. Extra evidence artifact refs can be supplied via `createVerificationResult({ extraInputRefs })`.
- New CLI command `rekon verify record [--plan <id|type:id>] --result-json <json> [--root <path>] [--json]`. The CLI parses operator-supplied JSON of shape `{ recordedBy?, evidenceNotes?, commands: [{ command, status, exitCode?, durationMs?, startedAt?, completedAt?, stdoutDigest?, stderrDigest?, notes? }] }`, resolves the requested plan (defaulting to the latest with a warning), invokes the helper, and writes the artifact under the `actions` category. Unknown plans return a clear error listing known plan ids.
- The artifact freshness validator already tracks `VerificationPlan` and `WorkOrder` in `header.inputRefs`, so `rekon artifacts freshness --type VerificationResult` marks an older result `stale` automatically once a newer plan or work order lands.
- Added `tests/contract/verification-result.test.mjs` (18 tests): 7 helper unit tests covering all-passed/any-failed/missing-as-not-run/empty-as-not-run/extra-command preservation/inputRefs/digest+notes preservation, plus 11 CLI/runtime integration tests covering default-plan-with-warning, explicit `--plan <id>`, `--plan type:id`, unknown-plan rejection, no-plan-exists rejection, missing-`--result-json` rejection, malformed-JSON rejection, `artifacts validate` clean, freshness staleness after a newer plan, the existing `intent work-order` and `intent remediation` flows still working, and failed-command status preservation end-to-end.
- Added new docs: `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`. Updated `docs/artifacts/verification-plan.md`, `docs/artifacts/work-order.md`, `docs/concepts/remediation-work-orders.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `VerificationResult` artifact type is package-local (kernel runtime already mapped its category). No command execution. No source writes. No auto-apply or auto-publish based on results. No version bump. No npm publish.
- Added architecture summary v2 — proof-loop publication sections.
- `@rekon/capability-docs.architecture-summary` now reads the latest available `WorkOrder` (one remediation work order where `source === "coherency-delta"`, plus one resolver work order), `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult` alongside the existing `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport` inputs. Every artifact actually read is cited in `header.inputRefs`. The publisher does not import from `@rekon/capability-intent` or `@rekon/capability-reconcile`; it defines minimal local "Like" types and reads each artifact through the standard reader to avoid a package cycle.
- Extended `renderArchitectureSummary` to emit four new sections between the existing Remediation Queue and Agent Guidance sections:
  - **Work Orders**: table with one row per available work-order flavor (`coherency-delta` and `resolver`) showing source, goal, paths, owner systems, and selected item count. Missing work orders are called out with a `rekon intent remediation` / `rekon intent work-order` hint.
  - **Reconciliation Plans**: summary row (total / artifact-only / source-write deferred / command deferred / manual review / applied / planned / deferred / denied) plus up to 5 top operations with class, status, permission, and finding id. Missing plans recommend `rekon reconcile suggest`.
  - **Verification Status**: status row (status / passed / failed / skipped / not-run / recorded by / recorded at). Explicit "Verification is not complete." line when status is `failed`/`partial`/`not-run`. Explicit "VerificationResult may be stale; latest VerificationPlan differs." line when the result references an older plan. Missing results recommend `rekon verify record`.
  - **Proof Loop**: governance / planning / verification state bullets plus a single "Suggested next command:" line that walks `coherency delta -> intent remediation -> reconcile suggest -> intent remediation or intent work-order -> verify record -> address failures -> rerun evaluate/lifecycle/coherency-delta/publish architecture` in priority order.
- Updated the capability manifest: `consumes` now lists `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult`. Added a new `proof-loop.changed` invalidation rule citing those four input types alongside the existing `snapshot.changed` and `coherency.changed` rules. `rekon artifacts freshness` now marks an older architecture summary `stale` once any newer proof-loop input is indexed.
- Added `tests/contract/architecture-summary-proof-loop.test.mjs` (11 tests): all four new sections always present; recommend `rekon verify record` when no result exists; recommend `rekon coherency delta` when missing; partial verification surfaces the not-run count and triggers the "address failures" suggestion; failed verification surfaces the failed table row and the "not complete" callout; `header.inputRefs` cite the new artifacts when present; Work Orders table distinguishes `coherency-delta` and `resolver` rows; stale-plan callout fires when the latest result references an older plan; freshness marks the publication stale after a newer `VerificationResult`; existing `publish agents` still works; import-boundary fixture (self-skipping) confirms reconciliation classification rows include `safe_import_rewrite`, `source-write-deferred`, and `write:source`.
- Updated `docs/artifacts/architecture-summary-publication.md` and `docs/concepts/architecture-summary-publication.md` to describe the new sections, inputs, and freshness behavior. Added "Surfaced In Publications" notes to `docs/concepts/verification-results.md`, `docs/concepts/reconciliation-plans.md`, and `docs/concepts/remediation-work-orders.md`, plus a new "Consumed By" entry on `docs/artifacts/verification-result.md`. Updated `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. No new actuator/handler — only the existing publisher learned to read more artifacts. No kernel changes. No command execution. No source writes. No auto-apply based on verification results. No verification judgment. No GitHub/CI/dashboard surfaces. No version bump. No npm publish.
- Added verification-aware issue and remediation context.
- New exports from `@rekon/capability-intent`:
  - `lookupVerificationEvidence(artifacts, findingId)`: a pure async helper that chains `findingId -> WorkOrder.remediationItems -> VerificationPlan.workOrderRef -> VerificationResult.verificationPlanRef` and returns a typed `VerificationEvidenceSummary` with status (`passed` / `failed` / `partial` / `not-run` / `missing`), the underlying artifact refs, the result's summary counts, recorded-by/recorded-at, and any non-fatal lookup warnings. Matching is by `findingId` and artifact refs; no semantic or text-based heuristics.
  - `VerificationEvidenceStatus` and `VerificationEvidenceSummary` types.
- Extended `RemediationActuatorInput` with optional `excludeFindingIds: string[]`. The actuator filter now drops any remediation step whose `findingId` is in the exclusion set. Existing `--finding` / `--priority` / `--limit` filters are unchanged.
- `@rekon/capability-resolver` now depends on `@rekon/capability-intent` (no cycle — `capability-intent` does not depend on `capability-resolver`). Added matching tsconfig project reference. `@rekon/capability-resolver` re-exports `VerificationEvidenceStatus` and `VerificationEvidenceSummary` for convenience.
- `IssuePacket` gained an optional `verification: VerificationEvidenceSummary` field. The `resolve.issue` resolver now invokes `lookupVerificationEvidence` for every matched finding, attaches the summary, adds a status-specific warning (`failed` / `partial` / `not-run` / `missing` each have a distinct warning; `passed` does not warn), and emits an `issue.verification` `resolutionTrace` entry with `sourceType` set to the deepest matched artifact (`VerificationResult` / `VerificationPlan` / `WorkOrder` / `Fallback`). `issueNextSteps` was extended to include a verification-aware recommended action (e.g. "Run `rekon verify record` against the existing VerificationPlan to capture proof.").
- Extended `ResolutionTraceEntry.sourceType` enum with three additive values: `"WorkOrder"`, `"VerificationPlan"`, `"VerificationResult"`. Existing consumers reading `sourceType` already use string-typed switches.
- Updated the `@rekon/capability-resolver` manifest: `consumes` now lists `WorkOrder`, `VerificationPlan`, and `VerificationResult` alongside the existing inputs. Added a new `verification.changed` invalidation rule citing those three types so older `resolve.issue` packets are correctly marked `stale` when verification evidence moves.
- Important invariant preserved: passing verification **never** auto-resolves the finding, mutates `FindingStatusLedger`, or removes the issue from `relatedFindings`. It only changes the recommended next step and adds informational context. The trace records the decision.
- New CLI flag `rekon intent remediation --skip-verified`. When set, the CLI reads the latest `CoherencyDelta`, calls `lookupVerificationEvidence` for each candidate `findingId` (respecting any `--finding` / `--priority` filters), and builds an `excludeFindingIds` list of items whose chain resolves to `passed`. The list is passed to the actuator via the new `excludeFindingIds` input. Excluded findings are reported back to the operator in a new top-level `skippedVerified: Array<{ findingId, status: "passed", verificationResultRef }>` field. `failed`, `partial`, `not-run`, and `missing` findings are never skipped. The flag is opt-in; default behavior is unchanged.
- When `--skip-verified` removes every candidate, the CLI writes no new artifacts and returns `{ artifacts: [], selectedItems: [], skippedVerified: [...], message: "No active remediation items remain after skipping verified items." }`. Existing "no active remediation items" message is preserved for the unfiltered path.
- Added `tests/contract/verification-aware-issue-remediation.test.mjs` (12 tests): 6 cover `resolve.issue` integration (missing / not-run / partial / failed / passed without auto-resolve / `issue.verification` trace presence). 5 cover `intent remediation --skip-verified` (passes skipped, failed retained, not-run/partial retained, all-skipped path writes no new work order, default flow ignores verification). 1 self-skipping import-boundary fixture integration test confirms the passed-verification path skips every finding under that WorkOrder.
- Added new docs / sections: updated `docs/concepts/resolvers.md` with the verification lookup behavior; `docs/artifacts/resolver-packet.md` documents the new `verification` field, the warning matrix, and the `issue.verification` trace step; `docs/concepts/remediation-work-orders.md` documents `--skip-verified`, `skippedVerified` output shape, and the all-skipped path; `docs/concepts/verification-results.md` adds a "Surfaced In Resolvers And Remediation" section; `docs/artifacts/work-order.md` adds `resolve.issue` and `intent remediation --skip-verified` to its Consumed By list; `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md` are updated.
- No artifact header shape changes. No SDK changes. No new capability roles. The `VerificationResult` artifact type and the `WorkOrder` shape at the kernel level are unchanged. No command execution. No source writes. No auto-apply. No automatic mutation of `FindingStatusLedger` or finding lifecycle. No CI/GitHub integration. No semantic verification judgment. No version bump. No npm publish.
- Added proof report publication.
- `@rekon/capability-docs` registers a third publisher `@rekon/capability-docs.proof-report` (alongside the existing `.publisher` and `.architecture-summary`). The new publisher reads the latest available `IntelligenceSnapshot` (optional; used for the header subject when present), up to two `WorkOrder` artifacts (one remediation order where `source === "coherency-delta"` and one resolver order), the latest `VerificationPlan` (the minimum useful input), the latest `VerificationResult`, plus optional `CoherencyDelta`, `ReconciliationPlan`, and `FindingLifecycleReport` for context. Every artifact actually read is cited in `header.inputRefs`; missing artifacts are not cited.
- Extended package-local `PublicationArtifact.kind` to include `"proof-report"` alongside `"agents"`, `"repo-summary"`, and `"architecture-summary"`. The `Publication` artifact type at the kernel level is unchanged.
- The proof report content is a Markdown document with these sections when a `VerificationPlan` exists: **Proof Status** (status / passed / failed / skipped / not-run row plus a `> Verification is not complete.` callout for failed/partial/not-run or a `> Verification recorded as passed. This does not automatically resolve findings.` callout for passed); **Work Order** (source / goal / paths / systems for the latest remediation or resolver work order); **Verification Plan** (table of plan commands plus the plan id); **Verification Results** (per-command status / exit code / notes table); **Failed / Missing Evidence** (bullet list naming every failed / skipped / not-run command, including plan commands missing from the recorded results); **Remediation Context** (up to 10 remediation items from `WorkOrder.remediationItems` or `CoherencyDelta.remediationQueue`); **Reconciliation Context** (up to 10 operations with class / status / permission from the latest `ReconciliationPlan`); **Next Recommended Action** (status-derived bullets); **Input Artifacts** (cited refs).
- When no `VerificationPlan` exists, the publication is intentionally short: it says "No VerificationPlan found. Run `rekon intent work-order` or `rekon intent remediation` first." plus the Input Artifacts list. The publisher does not synthesize missing artifacts and does not throw on missing snapshot.
- New CLI command `rekon publish proof [--root <path>] [--json]` invokes the new publisher via `runPublish({ publisherId: "@rekon/capability-docs.proof-report" })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.proof-report` is equivalent. The publisher appears in `rekon publish list`.
- Anti-gaming discipline preserved: failed commands are listed in both the per-command table and the Failed / Missing Evidence bullets; skipped / not-run statuses are reported separately and never collapse into passed; passing verification explicitly does not auto-resolve findings (the callout says so); every section is sourced from a cited artifact (no synthesis).
- Added `tests/contract/proof-report-publisher.test.mjs` (13 tests): publisher appears in `publish list`; CLI shortcut writes a Publication with `kind: "proof-report"`; generic `publish run` dispatches the same handler; the publication includes Proof Status / Work Order / Verification Plan / Verification Results / Failed-Missing Evidence / Remediation Context / Reconciliation Context / Next Recommended Action / Input Artifacts sections; failed status surfaces the failed table row, the "not complete" callout, the Failed bullet, and the "Fix the failing checks" next action; partial / not-run surfaces the partial row, the callout, the Not-run bullet, and the "Complete the missing checks" next action; passed surfaces the no-auto-resolve callout and the "Re-run `rekon evaluate`" next action; `header.inputRefs` cite VerificationPlan / VerificationResult / WorkOrder when present; the no-result path recommends `rekon verify record`; the no-plan path recommends `rekon intent work-order` / `rekon intent remediation`; existing `publish agents` and `publish architecture` still work; freshness marks older proof reports `stale` after a newer VerificationResult; a self-skipping import-boundary fixture test confirms remediation context surfaces import findings and reconciliation context surfaces `safe_import_rewrite` / `source-write-deferred` / `write:source`.
- Added new docs: `docs/artifacts/proof-report-publication.md`, `docs/concepts/proof-report-publication.md`. Updated `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`, `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `Publication` artifact type at the kernel level is unchanged (the new `kind` widens the package-local type only). No new actuator/handler — only a third publisher inside the same capability. No command execution. No source writes. No auto-resolve. No CI/GitHub/dashboard surfaces. No verification judgment. No version bump. No npm publish.
- Added classic guarantees audit (docs / tests only — no runtime behavior changes).
- New strategy docs:
  - `docs/strategy/classic-guarantees-audit.md` — per-subsystem audit covering 15 major classic subsystems (full scan / refresh orchestration, evidence + repo observation, deterministic + semantic analysis, graph intelligence, rule engine / compiled invariants, issue detection / adjudication, coherency delta / remediation roll-up, resolver / context / preflight, generated docs / agent docs, operator feedback / memory, intent preparation / proof gates, reconciliation / deterministic operations, watcher / freshness / live context trust, GitHub / CI / PR surfaces, SaaS / dashboard). Each entry lists original problem, classic workflow guarantee, classic shape that provided the guarantee, what Rekon already preserves, what Rekon may be discounting, current gap, Rekon equivalent guarantee, regression test, priority, and next implementation slice.
  - `docs/strategy/classic-guarantee-regression-plan.md` — P0/P1/P2 regression plan with 7 P0 guarantees (one-command coherent state, finding lifecycle preserved, resolver/preflight explainable, publications cite inputs, work orders + anti-gaming, reconciliation does not silently source-write, freshness distinguishes valid vs current), 6 P1 guarantees (issue adjudication / dedupe, memory ranking, agent-operating-contract publication, path/event freshness, richer graph slices, rulebook compilation), and 5 P2 guarantees (source-write apply, watcher daemon, CI surfaces, SaaS dashboard, semantic augmentation). Each entry pairs a proposed regression test with the implementation batch that should ship it.
  - `docs/strategy/classic-subsystem-purpose-map.md` — quick-reference table to read first before proposing capability work. Columns: classic subsystem, original problem, classic guarantee, Rekon equivalent today, gap, priority, next slice.
- Updated `AGENTS.md`: completion summary now requires a `PURPOSE PRESERVATION CHECK` section for any major capability / resolver / publisher / actuator / memory / freshness / issue / orchestration work, with explicit fields (original problem, classic workflow guarantee, classic shape, Rekon equivalent guarantee, what would mean we failed, regression test). The `CODEBASE-INTEL ALIGNMENT` requirement is preserved and rewired alongside the new check. Adds the explicit rule "Do not call classic orchestration 'weight' unless the work order identifies which guarantee is preserved elsewhere."
- Updated `CONTRIBUTING.md`: new "Preserving Classic Workflow Guarantees" section requires contributors who migrate or reinterpret a classic subsystem to identify the original problem and workflow guarantee. Names the audit / regression plan / purpose map as the anchor.
- Updated `docs/strategy/north-star.md`, `docs/strategy/classic-behavior-distillation.md`, `docs/strategy/classic-wins.md`, `docs/strategy/classic-refactor-principles.md` (added the "Preserve The Workflow Guarantee, Not Just The Feature" rule), `docs/strategy/classic-behavior-roadmap.md` (audit entry in Phase B), and `docs/strategy/roadmap.md` to cross-reference the new audit / regression plan / purpose map.
- Added `tests/docs/classic-guarantees-audit.test.mjs` asserting: all three new strategy docs exist; the audit doc contains all 15 subsystem headings, the "Classic workflow guarantee" phrase, and the "What Rekon may be discounting" phrase; the regression plan contains P0/P1/P2 sections and every required P0/P1 guarantee title; `AGENTS.md` contains the `PURPOSE PRESERVATION CHECK` requirement, the orchestration-weight rule, and the audit cross-references; `CONTRIBUTING.md` contains the migrated-subsystem guarantee requirement.
- No runtime behavior changes. No SDK changes. No kernel changes. No capability changes. No CLI changes. No artifact shape changes. No new tests beyond the docs assertions above. No version bump. No npm publish.
- Added `rekon refresh` (closes P0.1 from the Classic Guarantees Audit).
- New CLI command `rekon refresh [--root <path>] [--skip-publish] [--skip-freshness] [--changed-file <path>] [--json]` orchestrates the full Rekon lifecycle in the documented order: `init` (heals only a missing config; leaves a malformed config for `config.validate` to report) → `config.validate` → `observe` → `project` → `snapshot` → `evaluate` → `findings.lifecycle` → `coherency.delta` → `publish.architecture` → `artifacts.validate` → `artifacts.freshness`. Stops on the first failure, records every step in the result, and exits non-zero on `status: "failed"`.
- Return shape (also written to stdout when `--json` is set): `{ root, startedAt, completedAt, status, steps: RefreshStep[], validation, freshness, artifacts, missing }`. Each `RefreshStep` carries `id`, `status` (`passed` / `failed` / `skipped`), optional `artifacts`, optional `summary`, optional `issues`, and optional `message`. The `missing` array names required artifact types (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `IntelligenceSnapshot`, `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`, and `Publication(architecture-summary)` unless `--skip-publish`) that the run did not produce.
- Latest-major freshness interpretation: the artifact freshness validator is run as-is, but the refresh's verdict is computed against the **latest artifact of each major type** (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `IntelligenceSnapshot`, `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`, `Publication`). For each latest-major entry, `newer-input-exists` issues are filtered out — those are about historical sibling references (e.g. `buildFindingLifecycleReport` deliberately cites every prior `FindingReport` to derive resolved-finding state). A second back-to-back refresh therefore still reports `passed` even though the artifact store keeps prior artifacts on disk. When `--skip-publish` is set, `Publication` is excluded from the latest-major check so an intentionally unrefreshed publication does not flip the verdict.
- Failure semantics: any failed step stops the run, records the failed step's `message`, and returns `status: "failed"`. Lifecycle steps are never silently skipped — `--skip-publish` and `--skip-freshness` are opt-in and always appear as `status: "skipped"` entries in `steps` with the reason in `message`. Required-artifact-family checks that find missing types after a successful run produce `status: "partial"`.
- Implementation lives entirely in the CLI layer as a package-local `runRefresh(root, options)` helper plus the new command handler. No new runtime exports, no new artifact types, no kernel changes. The helper reuses existing helpers: `runtime.runObserve` / `runProject` / `runSnapshot` / `runEvaluate` / `runPublish`, plus `buildFindingLifecycleReport`, `buildCoherencyDelta`, `validateArtifactIndex`, and `validateArtifactFreshness`.
- Added `tests/contract/refresh-command.test.mjs` (11 tests) covering: clean-fixture orchestration produces every required artifact family; steps run in documented order; an architecture-summary Publication is written; status is `passed` when latest-major is fresh; malformed `.rekon/config.json` fails before observe; `--skip-publish` records a skipped step, writes no Publication, and excludes Publication from latest-major; `--skip-freshness` records a skipped step and still validates; a second back-to-back refresh still passes despite historical artifacts; producing steps (`observe`/`project`/`snapshot`/`evaluate`/`findings.lifecycle`/`coherency.delta`/`publish.architecture`) all record artifact refs; existing `publish agents` and `artifacts validate` still work after a refresh; a self-skipping import-boundary fixture integration test confirms the resulting architecture summary surfaces active findings.
- Added `@rekon/kernel-artifacts` as a direct dep of `@rekon/cli` (already a transitive dep) so the new helper can import the `ArtifactRef` type; tsconfig project reference added to match.
- New docs: `docs/concepts/refresh.md` describes why the command exists, the section-by-section semantics, the latest-major freshness rule, failure behavior, and when to use it. Updated `docs/strategy/classic-guarantees-audit.md` (subsystem 1 entry now marks the guarantee preserved and points to the new tests), `docs/strategy/classic-guarantee-regression-plan.md` (P0.1 now marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (priority column for row 1 now reads "P0 preserved"), `docs/strategy/classic-behavior-roadmap.md` (P0.1 closure entry added), `docs/strategy/roadmap.md`, the root `README.md` (First 10 Minutes now uses `rekon refresh`), `AGENTS.md` (recommends `rekon refresh` for agents that need a coherent state), and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. No new artifact types (the result is plain JSON, not an artifact). No source writes. No verification command execution. No watcher or daemon. No version bump. No npm publish.
- Added memory ranking / curation v1 (closes P1.2 from the Classic Guarantees Audit).
- `@rekon/capability-memory` now applies a deterministic, reason-attached ranking when selecting `OperatorFeedbackEntry` artifacts. The score starts at 0.1 and combines: exact path match (+0.45), path prefix match (+0.35), system match (+0.25), capability match (+0.2), tag match (+0.1 each, capped +0.2), verified (+0.2), reliability × 0.15 (default 0.5), priority (`high` +0.1, `low` −0.05), freshness (within 30 days +0.1, within 180 days +0.05, older than 365 days −0.1), and specificity (`scoped-specific` +0.1 when exactly one scope dimension matches; `broad-scope-penalty` −0.05 when the entry has no scope at all). Score is clamped to `[0, 1]`. Entries with `status: "deprecated"`, `status: "superseded"`, or `verification.status: "disputed"` are rejected outright; entries whose scope is non-empty but does not match the query are rejected with `scope-mismatch`. Ties break by specificity desc, then `updatedAt` desc, then artifact id asc.
- Extended the package-local `OperatorFeedbackEntry` shape (additive only): optional `scope.systems` / `scope.capabilities` / `scope.layers` / `scope.tags` alongside existing `scope.paths` / `scope.goal`; optional `rationale`; optional `evidence: ArtifactRef[]`; optional `verification: { status, verifiedAt, verificationResultRef }`; optional `reliability: number` (0..1); optional `priority: "low" | "normal" | "high"`; optional `createdAt` / `updatedAt`; optional `source: "operator" | "system"`; optional `status: "active" | "deprecated" | "superseded"`. The existing `instruction`, `scope.paths`, `scope.goal`, and `confidence` fields are unchanged; entries written before this batch continue to rank correctly via the default reliability (0.5), priority (`normal`), and status (`active`) fallbacks.
- Extended the package-local `MemorySelection` shape (additive only): new `query: { path, paths, goal, system, capability, tags }`; new `selected: MemorySelectionItem[]` with per-item `id` / `score` / `reasons` / `match: { paths, systems, capabilities, tags }` / `priority` / `verification` plus the legacy `instruction` / `scope` / `confidence` / `reason` fields; new `rejected: Array<{ id, reasons }>`. The legacy `selections[*]` array continues to exist and equals `selected` so the existing resolver memory reader (which iterates `selection.selections[*].instruction`) keeps working without changes.
- Extended `rekon memory add` with new flags: `--system <system>`, `--capability <capability>`, `--tag <tag>` (repeatable), `--layer <layer>` (repeatable), `--priority low|normal|high`, `--reliability <0..1>`, `--verified`, `--rationale <text>`. Existing `--instruction` / `--path` / `--goal` flags are unchanged. Invalid `--priority` or out-of-range `--reliability` values are rejected with clear errors.
- Extended `rekon memory select` with new filters: `--system <system>`, `--capability <capability>`, `--tag <tag>` (repeatable), `--limit <n>`. Existing `--path` / `--goal` flags are unchanged. `--limit` defaults to 5 when omitted.
- Resolver invariant preserved (and pinned by test): `resolve.preflight` includes selected memory in `applicableMemory` but does **not** mutate `ownerSystems`, `risk`, `findings`, `status`, or `nextRequiredResolver`. Memory enriches resolver output; it does not become repo truth. The contract test `preflight resolver includes selected memory but does not mutate ownerSystems or finding status` exercises a deliberately mis-scoped memory entry (`--system memory-system`) against a real OwnershipMap-derived `src` system and asserts the imaginary memory system never appears in `ownerSystems`.
- Curation surface in v1: rejected entries are visible (`selection.rejected[*]` with reasons), stale entries surface `stale-over-365-days` in their reasons (still selected so curators can act on them), low-reliability entries (≤0.25) surface `low-reliability-<value>`. Promotion to `Rulebook`, supersession chains, and context-usage analytics are explicit future work (the new "Curation Surface" section in `docs/concepts/memory.md` says so).
- Added `tests/contract/memory-ranking-curation.test.mjs` (10 tests): path-specific verified memory outranks broad stale memory; deprecated and superseded entries are rejected; disputed entries are rejected; high priority does not let a non-matching entry beat an exact verified path match; stale memory receives the freshness penalty but stays selected; `memory select` output includes scores / reasons / a `MemorySelection` artifact whose legacy `selections[*]` array is preserved; `memory add` supports the new flags and the produced entry carries them; `resolve preflight` includes selected memory but does not mutate `ownerSystems` or finding status; `memory list` reports the new metadata; verified memory with `verificationResultRef` carries the `verified` reason and the `verification` summary field on the selection item.
- Updated docs: new `docs/concepts/memory.md` (ranking algorithm, CLI surface, output shape, resolver invariant, curation principles, what-this-is-not); new `docs/artifacts/operator-memory-entry.md` and `docs/artifacts/memory-selection.md` (full shapes, field notes, examples); updated `docs/artifacts/memory-artifacts.md` (points at the new docs); updated `docs/strategy/classic-guarantees-audit.md` (subsystem 10 marks the guarantee preserved at v1 and lists the remaining gaps), `docs/strategy/classic-guarantee-regression-plan.md` (P1.2 marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (row 10 priority now reads "P1 preserved (v1)"; next slice = promotion engine), `docs/strategy/classic-behavior-roadmap.md` (P1.2 closure entry added), `docs/strategy/roadmap.md` (memory ranking entry added before the refresh entry), the root `README.md` (memory add example shows the new flags), and this `CHANGELOG.md`.
- No new exports beyond the extended package-local types from `@rekon/capability-memory`. No kernel changes. No SDK changes. No new capability roles. No new artifact types. No CLI commands added (only new flags on existing commands). No LLM. No automatic promotion engine. No source writes. No context-usage logging beyond what existed before. No version bump. No npm publish.
- Added agent operating contract publication v1 (closes P1.3 from the Classic Guarantees Audit).
- `@rekon/capability-docs` now registers a fourth publisher `@rekon/capability-docs.agent-contract` alongside the existing `.publisher`, `.architecture-summary`, and `.proof-report` publishers. The new publisher reads the latest available `IntelligenceSnapshot` (required; throws with a "Run `rekon refresh` first" message when missing) plus optional `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`, `WorkOrder` (remediation and resolver), `ReconciliationPlan`, `VerificationPlan`, `VerificationResult`, and `MemorySelection`. Every artifact actually read is cited in `header.inputRefs`.
- Extended package-local `PublicationArtifact.kind` to include `"agent-contract"` alongside `"agents"`, `"repo-summary"`, `"architecture-summary"`, and `"proof-report"`. The `Publication` artifact type at the kernel level is unchanged.
- Added a local `MemorySelectionLike` shape inside `@rekon/capability-docs` so the publisher can read ranked `selected[*]` items without importing `@rekon/capability-memory` (avoids a new package edge). Items without `reasons` are intentionally excluded from the Memory Guidance section — the publication only carries memory it can explain.
- The agent contract Markdown contains, in fixed order: title + metadata; **How To Use This Contract**; **Canonical Truth** (`.rekon/artifacts` is the source of truth; this publication may be stale); **Operating Rules** (resolve before edit, no cross-owner without seam, no completion without proof, anti-gaming on tests/validators/ledgers/scripts, no mutation to hide unresolved work, publications are guidance); **Resolver Workflow** (`route → seam (if cross-owner) → preflight`, `issue → seam/preflight`); **Ownership And Capabilities** (systems table from `ObservedRepo`, capability bullets from `CapabilityMap`, ownership entry count); **Active Governance State** (active/accepted/ignored/resolved counts, severity breakdown, top affected paths, remediation queue P0/P1/P2 counts, lifecycle summary); **Proof And Verification State** (presence/missing for each proof-loop artifact, explicit "Verification is not complete." for failed/partial/not-run, "passed does not auto-resolve findings" for passed, stale-plan callout); **Memory Guidance** (score/instruction/scope/reasons table, capped at 10); **Required Checks** (from latest `VerificationPlan.commands` or the default typecheck/test/build + `rekon artifacts validate` + `rekon artifacts freshness`); **Do Not Do** (anti-gaming reminders); **Next Recommended Actions** (derived from current state); **Input Artifacts**.
- New CLI command `rekon publish agent-contract [--root <path>] [--json]` invokes the new publisher via `runPublish({ publisherId })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.agent-contract` is equivalent. The publisher appears in `rekon publish list`.
- Updated the capability manifest: `consumes` now includes `MemorySelection` (alongside the existing snapshot/ownership/capability/coherency/finding-lifecycle/work-order/reconciliation/verification-plan/verification-result inputs). Added a new `memory.changed` invalidation rule so an older agent contract goes stale when ranked memory changes.
- Important invariant preserved (and pinned by test): the publisher writes only to `.rekon/artifacts/publications/agent-contract.md`. It does **not** overwrite the repository's root `AGENTS.md`, does not inject into `CLAUDE.md`, and does not write any file outside `.rekon/`. The contract test `publish agent-contract does not overwrite a root AGENTS.md` asserts the publisher never created a root `AGENTS.md` in a fixture that shipped without one.
- Added `tests/contract/agent-operating-contract-publisher.test.mjs` (16 tests): publisher appears in `publish list`; CLI shortcut writes a Publication with `kind: "agent-contract"` to the documented path; generic `publish run` dispatches the same handler; all 13 sections render; canonical-truth warning is present; operating rules cover resolve-before-edit and anti-gaming; Memory Guidance shows score+reasons when ranked memory exists; missing MemorySelection recommends `rekon memory select`; partial / failed verification surfaces visibly; Required Checks come from `VerificationPlan` when present; `header.inputRefs` cite MemorySelection / VerificationResult / WorkOrder / VerificationPlan; the artifact writes to `.rekon/artifacts/publications/agent-contract.md`; publishing does not create a root `AGENTS.md`; existing `publish agents` / `publish architecture` / `publish proof` still work; freshness marks the publication stale after a newer MemorySelection.
- Added new docs: `docs/artifacts/agent-contract-publication.md`, `docs/concepts/agent-operating-contract.md`. Updated `docs/artifacts/architecture-summary-publication.md`, `docs/artifacts/proof-report-publication.md`, `docs/artifacts/memory-selection.md`, `docs/concepts/memory.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-guarantees-audit.md` (subsystem 9 entry marks the guarantee preserved at v1; lists the remaining gaps), `docs/strategy/classic-guarantee-regression-plan.md` (P1.3 marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (row 9 priority reads "P1 preserved (v1)"; next slice = optional export/install command), `docs/strategy/classic-behavior-roadmap.md` (P1.3 closure entry added), `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md` (`publish agent-contract` added to the CLI example list), `AGENTS.md` (recommends running the contract for agents that need a current operating contract), and this `CHANGELOG.md`.
- No artifact header shape changes. No SDK changes. No new capability roles. The `Publication` artifact type at the kernel level is unchanged (the new `kind` widens the package-local type only). No new actuator/handler — only a fourth publisher inside the same capability. No command execution. No source writes. No root `AGENTS.md` / `CLAUDE.md` overwrite. No CI/GitHub/dashboard surfaces. No version bump. No npm publish.
- Added operator-assisted issue merge decision ledger (closes the merge-decisions slice of P1.1 in the Classic Guarantees Audit). Operators can now record explicit `accepted` / `rejected` decisions on `IssueMergeCandidate` records as durable artifacts. **Decisions never merge groups.** `CoherencyDelta`, `resolve.issue`, and the publications continue to operate on actual `IssueAdjudicationGroup` records. A future `CoherencyDelta` v3 may opt in to consuming accepted decisions; that is deferred.
- `@rekon/kernel-findings` gained `IssueMergeDecisionStatus`, `IssueMergeDecisionReason`, `IssueMergeDecision`, and `IssueMergeDecisionLedger` types. New exported pure helpers: `createIssueMergeDecisionLedger`, `validateIssueMergeDecisionLedger`, `assertIssueMergeDecisionLedger`, `issueMergeDecisionLedgerSchema`, `findLatestIssueMergeDecision`, and `applyIssueMergeDecisionsToCandidates`. `IssueMergeCandidate` gained six optional decision-annotation fields: `decision`, `decisionId`, `decisionNote`, `decisionReason`, `decisionDecidedAt`, `decisionDecidedBy` (all populated by `applyIssueMergeDecisionsToCandidates` from the latest ledger; absent when no ledger exists). Candidate generation is unchanged — decisions are applied on read, not stored on the report.
- `@rekon/runtime` gained the `recordIssueMergeDecision(store, options)` helper plus the `RecordIssueMergeDecisionOptions` type. It validates the candidate id against the latest `IssueAdjudicationReport`, refuses unknown ids with an error listing every available candidate id, validates the required `note`, appends the new decision to the latest ledger's history (or starts a fresh one), and writes a new `IssueMergeDecisionLedger` artifact whose `header.inputRefs` cite the adjudication report and the prior ledger. `IssueMergeDecisionLedger` is registered as a built-in artifact type in `@rekon/sdk`, routed under the `findings` category in `@rekon/runtime`'s artifact category map, and added to `CANONICAL_INPUT_TYPES` so its own freshness check does not require upstream lineage.
- Decision rules: `decision` is `"accepted"` or `"rejected"`. `note` is required and non-empty. `reason` is optional and must be one of `same-root-cause` / `separate-issues` / `false-positive-candidate` / `other`. `source` is `"operator"` for CLI-recorded decisions. Decision history is preserved: each call appends to the latest ledger's `decisions` array, and `findLatestIssueMergeDecision` picks the highest `decidedAt` for the current effective annotation. A new decision for the same candidate id **does not** remove prior decisions from history.
- New CLI commands: `rekon issues merge candidates [--root <path>] [--json]` returns candidates annotated with the latest ledger decisions; `rekon issues merge decide <candidate-id> --decision accepted|rejected --note <note> [--reason <reason>] [--decided-by <name>] [--root <path>] [--json]` records a new decision and returns the ledger ref plus the new decision; `rekon issues merge decisions [--root <path>] [--json]` returns the latest ledger's decisions in order. Existing `rekon issues list` and `rekon issues adjudicate` now also include annotated `mergeCandidates` when a ledger exists. The CLI's `ISSUE_MERGE_DECISION_REASONS` constant and the `PROTECTED_AGENT_DOC_*` constants are now declared at the top of `packages/cli/src/index.ts` to avoid temporal-dead-zone errors when `parseIssueMergeDecisionReason` is called during `main()`'s synchronous prefix on the `issues merge decide` branch (the same TDZ-safety pattern used by the earlier `agent-contract export` batch).
- Invariants pinned by tests: ledger rejects empty notes; `findLatestIssueMergeDecision` returns the most-recent decision for a candidate (by `decidedAt`) and ignores decisions for other candidates; `applyIssueMergeDecisionsToCandidates` annotates without mutating the input array; `recordIssueMergeDecision` refuses unknown candidate ids with a listing of available ids; CLI `issues merge decide` requires `--note`; accepted decisions do not merge groups (`CoherencyDelta` keeps 2 items + 2 remediation steps for 2 cross-rule findings); rejected decisions keep the candidate visible with `decision: "rejected"`; `IssueMergeDecisionLedger` does not raise `lineage.unknown` because it is in `CANONICAL_INPUT_TYPES`; `rekon artifacts validate` stays clean after a decision is recorded; raw artifact families (`FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`, `IssueAdjudicationReport`, `CoherencyDelta`) are never mutated.
- Added `tests/contract/issue-merge-decision-ledger.test.mjs` (14 tests covering pure-helper validation, latest-decision lookup, annotation purity, CLI `merge candidates`, CLI `merge decide` happy path, unknown-candidate error with listing, missing-note error, CLI `merge decisions` empty / populated, annotated `issues list`, accepted-decision-does-not-merge-CoherencyDelta, rejected-decision-keeps-candidate-visible, freshness without `lineage.unknown`, and `artifacts validate` cleanliness).
- Updated docs: new `docs/artifacts/issue-merge-decision-ledger.md` and `docs/concepts/issue-merge-decisions.md`. Updated `docs/artifacts/issue-adjudication-report.md` (Merge Candidates section adds the Operator Decisions subsection; cross-references add the new artifact + concept). Updated `docs/concepts/issue-adjudication.md` (anti-gaming reminders now reference the shipped operator-decision surface). Updated `docs/concepts/coherency-delta.md` (the "Merge candidates are advisory only" callout now also explicitly notes that accepted decisions do not affect counts). Updated four strategy docs: `classic-subsystem-purpose-map.md` (subsystem 6 now reads "P1 preserved (v1 + coherency v2 + resolver v2 + publication v2 + freshness v2 + merge-hints v2 + merge-decisions v2)" with next slice CoherencyDelta v3), `classic-behavior-roadmap.md` (new Phase B entry), `classic-guarantee-regression-plan.md` (P1.1 records the new 14-test contract suite), `roadmap.md` (new bullet under completed alpha spine). `CHANGELOG.md` records this entry.
- No `ArtifactHeader` shape changes. No `Publication` / `CoherencyDelta` / `IssueAdjudicationReport` shape changes (the new optional fields on `IssueMergeCandidate` are populated on read by `applyIssueMergeDecisionsToCandidates`, not stored on the report). No SDK API changes beyond the built-in artifact type registration. No new capability roles, permissions, or actuators. No mutation of upstream artifacts. No semantic / fuzzy / embedding / LLM matching. No automatic merge. No version bump. No npm publish.
- Added issue adjudication v2: deterministic cross-rule merge hints (closes the merge-hints slice of P1.1 in the Classic Guarantees Audit). After deterministic exact grouping runs, the adjudicator now emits advisory `IssueMergeCandidate` records for pairs of distinct groups sharing at least two deterministic signals. **Candidates are never merged groups.** `CoherencyDelta`, `resolve.issue`, and publications still count and route the underlying groups separately. No artifact mutation. No LLM. No embeddings. No fuzzy matching.
- `@rekon/kernel-findings` gained `IssueMergeCandidate`, `IssueMergeCandidateStrength`, and `IssueMergeCandidateReason` types, plus a new exported pure helper `deriveMergeCandidates(groups)`. `IssueAdjudicationReport` now optionally carries `mergeCandidates?: IssueMergeCandidate[]`; `IssueAdjudicationSummary` carries `mergeCandidates?: number`. The validator accepts the new shapes; both fields are absent when no candidates qualify.
- Detection signals (weights additive, confidence capped at `1.0`): `same-file` / `overlapping-files` (`+0.35`), `same-subject` / `overlapping-subjects` (`+0.30`), `same-severity` (`+0.10`), `related-type-prefix` (`+0.15`, only when both types contain `.` and differ), `same-suggested-action` (`+0.15`, via a fixed deterministic keyword bucket — `import` / `generated-output` / `verification` / `documentation` / `ownership-boundary`), `shared-system` (`+0.15`). A pair must score at least **two** signals AND confidence `>= 0.45` to qualify.
- Strength is derived from capped confidence: `strong` (`>= 0.70`), `medium` (`>= 0.45`), `weak` (below the emit floor, not surfaced by default).
- Activity filter (noise reduction): pairs where **both groups are inactive** are skipped entirely; pairs where **exactly one group is inactive** require `strong` confidence to emit and the candidate's `note` calls out the inactive context. Active/active pairs emit at the standard `>= 0.45` floor.
- Candidate id: `merge-candidate:<sorted-group-id-1>:<sorted-group-id-2>`. `memberFindingIds` is the sorted union across both groups, so raw findings remain traceable. The report sorts `mergeCandidates` by `strength` (strong→medium→weak), then `confidence` desc, then `id` asc, and caps the array at **50** entries.
- Invariants pinned by tests: cross-rule findings same file/subject/severity → 2 groups + 1 merge candidate; exact duplicates still group normally with no candidate between members; unrelated findings produce no candidate; two inactive groups produce no candidate; mixed-activity below `strong` threshold produces no candidate; deterministic / repeatable confidence + strength + id; `deriveMergeCandidates` exported helper produces identical output on the same input; `rekon issues adjudicate` JSON includes `mergeCandidates`; `rekon issues list` JSON exposes `mergeCandidates` from the latest report; `rekon coherency delta` counts groups not candidates (2 cross-rule findings → 2 delta items, 2 remediation steps); `rekon artifacts validate` stays clean with merge candidates in the report.
- Added `tests/contract/issue-adjudication-merge-candidates.test.mjs` (12 tests covering pure-helper output, deterministic confidence/strength, unrelated-findings exclusion, duplicate-member exclusion, inactive-pair exclusion, mixed-activity strong-only emission, exported helper parity, CLI `issues adjudicate` JSON, CLI `issues list` JSON, CoherencyDelta non-counting of candidates, and `artifacts validate` cleanliness).
- Updated docs: `docs/artifacts/issue-adjudication-report.md` adds the `IssueMergeCandidate` shape to the Shape section and a new "Merge Candidates (v2)" section documenting detection signals, weights, strength labels, activity filter, ordering, and the suggested-action keyword buckets. `docs/concepts/issue-adjudication.md` adds a "Merge Candidates (v2)" concept section. `docs/concepts/coherency-delta.md` adds an explicit "Merge candidates are advisory only" callout. `docs/strategy/classic-subsystem-purpose-map.md` subsystem 6 now reads "P1 preserved (v1 + coherency v2 + resolver v2 + publication v2 + freshness v2 + merge-hints v2)". `docs/strategy/classic-behavior-roadmap.md` adds the new Phase B entry. `docs/strategy/classic-guarantee-regression-plan.md` P1.1 records the shipped merge-hints slice and the new 12-test contract suite. `docs/strategy/roadmap.md` adds a new bullet under completed alpha spine. `CHANGELOG.md` records this entry.
- No `ArtifactHeader` shape changes. No `Publication` shape changes. No `CoherencyDelta` shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No CLI signature changes (the existing `rekon issues adjudicate` / `rekon issues list` JSON output is extended additively with a `mergeCandidates` field). No mutation of any upstream artifact. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Added stale-source freshness guardrails for adjudication + coherency in publications and `resolve.issue` (closes the trust slice of P1.1 in the Classic Guarantees Audit). The surfaces that consume `IssueAdjudicationReport` and `CoherencyDelta` now render their own inline freshness warnings instead of relying solely on `rekon artifacts freshness`. No artifact mutation. No auto-regeneration. No watcher/daemon.
- `@rekon/capability-docs`: new package-local `detectGovernanceFreshness(artifacts)` helper plus `GovernanceFreshness` type. The helper reads the latest `IssueAdjudicationReport`, `FindingLifecycleReport`, and `CoherencyDelta` and reports `{ adjudication, coherency, warnings, recommendedCommand }` with per-artifact status `fresh | stale | missing`. Detection rules: `IssueAdjudicationReport` is stale when its `header.inputRefs` cite a `FindingLifecycleReport` whose id is not the latest indexed, or when no lifecycle is cited but a lifecycle exists; `CoherencyDelta` is stale when it cites an older `IssueAdjudicationReport`, when it was built from raw lifecycle (no adjudication cited, no `issueGroupId` on any item) while adjudication now exists, or when its cited adjudication is transitively stale. Recommended command defaults to `rekon refresh`; `rekon issues adjudicate` is recommended when adjudication is missing but lifecycle exists.
- Architecture summary: a new `## Input Freshness Warnings` section renders only when warnings exist (silence is the success signal). When emitted, it lists each warning, links the canonical inputs by id, and closes with a `Recommended command:` line. The section appears between `## Governed Issue Groups` and `## Top Affected Paths`.
- Agent operating contract: a new `### Governance Freshness` subsection always renders inside Active Governance State. It prints `- Issue adjudication: fresh | stale | missing` and `- Coherency delta: fresh | stale | missing`. When stale, a blockquote callout lists every warning and adds "Do not treat governed issue counts as current until `rekon refresh` (or `rekon issues adjudicate && rekon coherency delta`) has run." Recommended command line follows.
- `@rekon/capability-resolver`: new package-local `detectAdjudicationStaleness(artifacts, reportRef)` helper called inside `buildGroupIssuePacket`. When the matched `IssueAdjudicationReport`'s cited `FindingLifecycleReport` is not the latest, the resolver appends "IssueAdjudicationReport may be stale; run `rekon issues adjudicate` or `rekon refresh` before relying on group counts." to `packet.warnings` and writes an `issue.freshness` `resolutionTrace` entry with `status: "warning"`. When fresh, a `status: "used"` `issue.freshness` entry is still written so the trace explicitly records the freshness check ran.
- Invariants pinned by tests: stale adjudication chain → architecture summary contains `## Input Freshness Warnings` with `Recommended command: \`rekon refresh\``; agent contract contains `### Governance Freshness` showing `stale` for both adjudication and coherency plus the blockquote callout; `resolve.issue` group mode includes the stale-adjudication warning + `issue.freshness` trace entry with `status: "warning"`. Clean chain → architecture summary omits the freshness section; agent contract shows `- Issue adjudication: fresh` / `- Coherency delta: fresh` without the callout; `resolve.issue` emits an `issue.freshness` trace with `status: "used"` and no extra warning. Lifecycle-mode-delta-while-adjudication-exists → agent contract shows the "was built from raw FindingLifecycleReport but an IssueAdjudicationReport now exists" warning. Recommendation strings consistently point to `rekon refresh` (or `rekon issues adjudicate` in the resolver warning).
- Added `tests/contract/adjudication-coherency-freshness-guardrails.test.mjs` (10 tests covering: architecture-summary warns on stale adjudication; architecture-summary warns on transitively-stale coherency; agent-contract Governance Freshness shows both stale; `resolve.issue` warning + trace; consistent `rekon refresh` recommendation across all surfaces; clean-chain has no false stale warnings in either publication; clean-chain resolver emits fresh `issue.freshness` trace; agent-contract warns on lifecycle-mode-delta + adjudication-exists mode mismatch; `artifacts validate` stays clean after stale-chain publications; all four existing publishers still work).
- No artifact-header shape changes. No `Publication` shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No watcher / daemon / file-system mtime / path-event invalidation introduced. No auto-regeneration of missing or stale inputs. No mutation of `FindingReport` / `FindingStatusLedger` / `FindingLifecycleReport` / `IssueAdjudicationReport` / `CoherencyDelta`. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Updated docs: `docs/concepts/freshness-and-invalidation.md` (new "Surface-Level Freshness Guardrails" section listing each consumer surface, detection rules, and the read-only invariant), `docs/concepts/architecture-summary-publication.md` (How It Is Built describes the freshness section), `docs/concepts/agent-operating-contract.md` (section map references the Governance Freshness subsection), `docs/concepts/resolvers.md` (new paragraph on `issue.freshness` trace + warning), `docs/concepts/issue-adjudication.md` and `docs/artifacts/issue-adjudication-report.md` (Failure Visibility section adds the surface guardrails list), `docs/concepts/coherency-delta.md` and `docs/artifacts/coherency-delta.md` (stale-source guardrails callout + freshness paragraph), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 13 records consumer-surface guardrails), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/classic-alignment-map.md` (Watcher / freshness row updated), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `CHANGELOG.md` (this entry).
- Added publications use adjudicated issue groups (closes the publication-consumption slice of P1.1 in the Classic Guarantees Audit). Both `@rekon/capability-docs.architecture-summary` and `@rekon/capability-docs.agent-contract` now read the latest `IssueAdjudicationReport`, cite it in `header.inputRefs`, and surface a "Governed Issue Groups" section. Raw findings remain traceable via `memberFindingIds` rendered alongside each group.
- `@rekon/capability-docs` manifest: `consumes` adds `IssueAdjudicationReport`. New invalidation rule `issue-adjudication.changed` (inputs: `["IssueAdjudicationReport"]`) so older publications go stale once a newer adjudication report lands. `Publication` artifact shape is unchanged.
- Architecture summary content additions: a new top-level `## Governed Issue Groups` section follows `## Coherency Summary`. When an `IssueAdjudicationReport` is indexed, the section prints `Total groups / Active groups / Accepted groups / Ignored groups / Resolved groups / Mixed groups` counts, a member-finding total, and a table of up to 20 groups (`Group | Status | Severity | Type | Members | Files`). The `Members` column carries the member count plus the first few member finding ids (`2: f1, f2` style) so raw findings stay visible. When no adjudication report is indexed, the section emits a "Run `rekon issues adjudicate` or `rekon refresh`" hint and warns that raw lifecycle counts above may overstate drift. The existing `## Coherency Summary` section now labels its unit as `governed issue groups` when the CoherencyDelta was built from adjudicated groups (every delta item carries an `issueGroupId`), otherwise as `findings`, with a one-line preface stating the mode.
- Agent operating contract content additions: a new `### Governed Issue Groups` subsection follows the existing Active Governance State counts. It prints `Active governed groups`, per-status breakdown, total groups + member finding totals, and the top 5 active groups (one bullet per group with `id`, severity, truncated title, and member count). It always includes the line `Use `rekon resolve issue --issue <group-id>` for adjudicated issue context.`. When no adjudication report is indexed, the subsection emits a "Run `rekon refresh`" hint and warns that raw lifecycle totals may overstate drift. The Active Governance State preface also labels counts as `governed issue groups` vs. `findings` depending on whether `CoherencyDelta` was built from adjudicated groups. The Do Not Do list adds: "Do not treat raw finding count as governed issue count when an IssueAdjudicationReport exists; use governed issue groups (memberFindingIds preserves raw traceability)."
- Invariants pinned by tests: publications cite `IssueAdjudicationReport` in `header.inputRefs` when one exists; publications never invent groups or invoke adjudication themselves (they only read the artifact); raw `FindingReport` / `FindingStatusLedger` / `FindingLifecycleReport` / `IssueAdjudicationReport` are not mutated; `rekon publish agents` and `rekon publish proof` continue to work; `rekon artifacts freshness` marks an older architecture summary or agent contract `stale` when a newer `IssueAdjudicationReport` lands.
- Added `tests/contract/publications-adjudicated-issues.test.mjs` (11 tests covering: architecture summary cites `IssueAdjudicationReport`; architecture summary renders Governed Issue Groups with counts + member ids; architecture Coherency Summary distinguishes governed-groups vs. raw-finding mode; agent contract cites `IssueAdjudicationReport`; agent contract Governed Issue Groups subsection lists active groups + member counts; agent contract surfaces the `rekon resolve issue --issue <group-id>` instruction; agent contract Do Not Do warns about raw-vs-governed counts; both publications fall back to a "run `rekon issues adjudicate`" hint when no report is indexed; freshness marks an older architecture summary stale after a newer adjudication report; `publish agents` and `publish proof` still work).
- Updated docs: `docs/artifacts/architecture-summary-publication.md` (new Governed Issue Groups section in Content Structure; renumbered subsequent sections; Inputs Consumed adds `IssueAdjudicationReport`; Freshness And Provenance lists newer-adjudication-report as a stale trigger), `docs/concepts/architecture-summary-publication.md` (How It Is Built mentions the new group-aware behavior), `docs/artifacts/agent-contract-publication.md` (Active Governance State entry expanded with the Governed Issue Groups subsection), `docs/concepts/agent-operating-contract.md` (section map row updated), `docs/artifacts/issue-adjudication-report.md` and `docs/concepts/issue-adjudication.md` (mark publication consumption as shipped; "future" → "shipped"), `docs/strategy/classic-subsystem-purpose-map.md` (subsystems 6 and 9 updated), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry "Publications use adjudicated issue groups"), `docs/strategy/classic-alignment-map.md` (Generated docs / publications row), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 records the shipped publication slice + the new 11-test suite), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `CHANGELOG.md` (this entry).
- No `ArtifactHeader` shape changes. No `Publication` shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No source writes. No mutation of upstream artifacts. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Added `resolve.issue` v2 from `IssueAdjudicationReport` (closes the resolver-consumption slice of P1.1 in the Classic Guarantees Audit, after v1 adjudication and v2 CoherencyDelta consumption shipped earlier in the same `0.1.0-alpha.1` cycle).
- `@rekon/capability-resolver`: `IssuePacket` gained four optional fields — `issueGroup: IssueGroupSummary`, `matchSource: "IssueAdjudicationReport" | "FindingReport"`, `verificationByFinding: IssueVerificationByFinding[]` — populated only in v2 group mode. New exported types `IssueGroupSummary` and `IssueVerificationByFinding`. The existing `issue`, `relatedFindings`, `ownerSystems`, `matchedScopes`, `verification`, `nextRequiredResolver`, `resolutionTrace`, `warnings`, `nextSteps` fields are unchanged. `ResolutionTraceEntry.sourceType` adds `"IssueAdjudicationReport"`.
- `issueResolver.resolve` (`resolve.issue`) now prefers the latest `IssueAdjudicationReport` group when one exists. Matching order against the report's `groups`: exact `group.id`, exact `canonicalFindingId`, exact member `findingId`, unique substring across `group.id` / `canonicalFindingId` / any member id / `type` / `title` / `description` / `ruleId`. A unique match returns a group-aware packet (`matchSource: "IssueAdjudicationReport"`); ambiguous fragments emit a warning and refuse to silently choose; missing report or no-match queries fall back to the raw `FindingReport` path with an explicit `issue.match` trace entry citing the adjudication report (or `Fallback` when no report exists at all). The existing raw-mode behavior is unchanged.
- Group-mode ownership combines `group.systems` (when declared) with the existing `OwnershipMap` → `ObservedRepo` → ownership `GraphSlice` → `EvidenceGraph` precedence. When the declared and resolved systems differ in either direction, the packet emits the warning "Issue group systems differ from ownership resolution; inspect IssueAdjudicationReport and OwnershipMap." Group-status warnings appear for `accepted` / `ignored` / `resolved` / `mixed`. Next-resolver decision: multi-owner → `resolve.seam`, single-owner → `resolve.preflight`, no files → `resolve.route`.
- Group-mode verification is aggregated across every `memberFindingId`. The resolver calls `lookupVerificationEvidence` for each member, picks the worst status (`failed > partial > not-run > missing > passed`) for the packet's top-level `verification`, and exposes the per-finding breakdown in `verificationByFinding`. Passing aggregated verification does **not** auto-resolve any member finding or the group as a whole.
- `@rekon/capability-resolver` manifest `consumes` adds `FindingStatusLedger` (consumed via `readLatestLedgerFromArtifacts` already, now declared) and `IssueAdjudicationReport`.
- Trace entries added in group mode: `step: "issue.match", sourceType: "IssueAdjudicationReport"` with status `used` (unique match), `warning` (ambiguous), or `fallback` (no match → raw path will follow); `step: "issue.ownership", sourceType: "IssueAdjudicationReport"` when the resolver combined `group.systems` with the resolved precedence; `step: "issue.verification"` always includes a `details.perFinding` array in group mode. The raw-mode trace shape is unchanged.
- Invariants pinned by tests: raw-mode behavior is unchanged when no `IssueAdjudicationReport` exists (existing 31 tests in `route-seam-issue-resolvers.test.mjs` + `verification-aware-issue-remediation.test.mjs` continue to pass without modification); duplicate findings collapsed into one adjudicated group return a single group-mode packet with `memberFindingIds` for full traceability; ambiguous group fragments do not silently choose; missing report and no-group-match queries both fall back to the raw path with an explicit fallback trace; aggregated verification surfaces the worst status while exposing per-member detail; no mutation of `FindingReport` / `FindingStatusLedger` / `FindingLifecycleReport` / `IssueAdjudicationReport`.
- Added `tests/contract/issue-resolver-adjudicated.test.mjs` (17 tests covering pure-resolver group-mode against a synthetic harness: exact group id / canonical / member id matching, ambiguous fragment warning, raw fallback when no report, raw fallback when report has no match, ownership from group files, multi-owner → resolve.seam, accepted/ignored/resolved status warnings, group.systems vs OwnershipMap contradiction warning, `issue.match` trace with `sourceType: "IssueAdjudicationReport"`, `verificationByFinding` per-member aggregation; plus CLI tests for `rekon resolve issue`, `rekon resolve run resolve.issue`, and the raw-fallback fallback-trace path).
- Updated docs: `docs/artifacts/resolver-packet.md` (Issue phase section adds `issueGroup`, `matchSource`, `verificationByFinding`; new "v2 group mode" matching order; new aggregated-verification paragraph), `docs/concepts/resolvers.md` (issue resolver intro now describes group-preferred matching + raw fallback; verification paragraph adds aggregation across members), `docs/artifacts/issue-adjudication-report.md` and `docs/concepts/issue-adjudication.md` (mark `resolve.issue` v2 consumption as shipped), `docs/concepts/verification-results.md` (new paragraph on group-mode aggregation), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 records the shipped resolver consumption slice and the new test plan), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6 reads "P1 preserved (v1 + coherency v2 + resolver v2)"; subsystem 8 records the group-aware resolver), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/classic-alignment-map.md` (Resolver / preflight context row now records v2 group mode), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `CHANGELOG.md` (this entry).
- No artifact-header shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No source writes. No mutation of upstream artifacts. No semantic / fuzzy / embedding / LLM matching. No version bump. No npm publish.
- Added CoherencyDelta v2 from `IssueAdjudicationReport` (closes the coherency-consumption slice of P1.1 in the Classic Guarantees Audit, after v1 adjudication shipped earlier in the same `0.1.0-alpha.1` cycle).
- `@rekon/kernel-findings`: `CoherencyDeltaItem` gained four optional group-aware fields — `issueGroupId`, `canonicalFindingId`, `memberFindingIds`, `groupingReasons` — populated when the item was derived from an `IssueAdjudicationGroup`. The fields are absent for lifecycle-finding-derived items so existing lifecycle-mode consumers see no change. `CoherencyDeltaInput` was widened additively: it now accepts an optional `issueGroups: IssueAdjudicationGroup[]` plus optional `systemsForIssueGroup` callback. The existing `findings` / `resolvedFindings` / `systemsForFinding` fields became optional so callers can use either mode; lifecycle-mode callers pass the same three fields unchanged.
- `createCoherencyDelta` dispatches on input shape: when `issueGroups` is non-empty, it builds items from groups; otherwise it preserves the v1 lifecycle path. Group-mode item id is `coherency:group:<group-id>` (so it cannot collide with the lifecycle-mode `coherency:<finding-id>`). Group status maps to item status as: `active → existing+active`; `accepted → accepted+inactive`; `ignored → ignored+inactive`; `resolved → resolved+inactive`; `mixed → existing+active` when `group.active` is true, else `accepted+inactive`. Severity uses `group.severity`; files / subjects / evidence are taken from the group; systems combine the group's declared `systems` with the optional callback's output (deduplicated, sorted; falls back to `["unknown"]`). `remediationQueue` step id is `remediation:group:<group-id>` in group mode (vs. `remediation:<finding-id>` in legacy mode), so adjudicated rollups produce **one step per active group, not one per duplicate member**.
- `@rekon/runtime.buildCoherencyDelta` now prefers the latest `IssueAdjudicationReport` when one exists and no explicit `lifecycleReportId` is requested. It cites the report in `header.inputRefs` along with every ref the report itself carried (transitively the `FindingLifecycleReport`, `FindingReport`(s), `FindingStatusLedger`). When no adjudication report exists or the caller pins a `lifecycleReportId`, the legacy lifecycle path runs unchanged.
- `rekon refresh` now runs `issues.adjudicate` between `findings.lifecycle` and `coherency.delta`. The new step writes an `IssueAdjudicationReport` and records it in the refresh result. `RefreshStepId` adds `"issues.adjudicate"` (between `"findings.lifecycle"` and `"coherency.delta"`). `REQUIRED_REFRESH_ARTIFACT_TYPES` and `MAJOR_FRESHNESS_TYPES` both add `"IssueAdjudicationReport"` so the freshness gate verifies the latest adjudication report is current.
- Invariants pinned by tests: lifecycle-mode `CoherencyDelta` still works when no `IssueAdjudicationReport` exists (legacy fallback); duplicate findings grouped into one adjudicated group produce exactly one delta item and one remediation step; `issueGroupId` / `canonicalFindingId` / `memberFindingIds` / `groupingReasons` survive end-to-end through the runtime helper and the CLI; accepted / ignored / resolved groups are inactive and absent from the remediation queue; mixed groups with at least one active member remain active; `rekon refresh` step order is `init → config.validate → observe → project → snapshot → evaluate → findings.lifecycle → issues.adjudicate → coherency.delta → publish.architecture → artifacts.validate → artifacts.freshness`; `IssueAdjudicationReport` appears in `freshness.latestMajor`; `CoherencyDelta` becomes stale after a newer `IssueAdjudicationReport`; `rekon artifacts validate` stays clean with adjudicated CoherencyDelta in the store.
- Added `tests/contract/coherency-delta-adjudicated.test.mjs` (11 tests covering pure-helper group mode, remediation-queue collapse, status preservation, mixed-with-active, legacy fallback, runtime helper preference, runtime helper fallback, CLI group-aware coherency, refresh step ordering and `IssueAdjudicationReport` in `latestMajor`, freshness invalidation by newer adjudication report, and artifacts validate cleanliness).
- Updated `tests/contract/refresh-command.test.mjs` to require `"issues.adjudicate"` in the step order, `"IssueAdjudicationReport"` in the required artifact types, and to include `"issues.adjudicate"` in the list of producing steps whose `artifacts` array must be non-empty. The existing 10 coherency-delta v1 tests in `tests/contract/coherency-delta.test.mjs` continue to pass without modification because the test seeds do not include an `IssueAdjudicationReport`, exercising the legacy fallback.
- Updated docs: `docs/artifacts/coherency-delta.md` (new Adjudicated Mode section, Legacy Lifecycle Mode section, group-aware fields on the item type, updated inputRefs + freshness narrative), `docs/concepts/coherency-delta.md` (replaced the "Future input" callout with a current "Adjudicated input (v2)" callout), `docs/artifacts/issue-adjudication-report.md` and `docs/concepts/issue-adjudication.md` (mark `CoherencyDelta` v2 consumption as shipped; `resolve.issue` v2 remains deferred), `docs/concepts/refresh.md` (lifecycle list adds step 8 `issues.adjudicate`, step numbering shifted; latest-major list adds `IssueAdjudicationReport`; sample JSON output includes the new step), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 records the shipped v2 slice and the new 11-test suite), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6 now reads "P1 preserved (v1 + coherency v2)"; subsystem 7 records the v2 shape), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `README.md` (the refresh lifecycle string now includes `issues adjudicate`), and this `CHANGELOG.md`.
- No artifact-header shape changes. No SDK API changes. No new capability roles, permissions, or actuators. No source writes. No LLM. No fuzzy / semantic matching. No mutation of `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`, or `IssueAdjudicationReport`. No version bump. No npm publish.
- Added issue adjudication / dedupe v1 (closes the first slice of P1.1 — Issue Adjudication / Dedupe / False-positive handling — in the Classic Guarantees Audit).
- `@rekon/kernel-findings` gained `IssueAdjudicationStatus`, `IssueAdjudicationGroup`, `IssueAdjudicationSummary`, `IssueAdjudicationReport`, and `IssueAdjudicationInput` types. Exported pure helpers: `deriveIssueAdjudication`, `createIssueAdjudicationReport`, `validateIssueAdjudicationReport`, `assertIssueAdjudicationReport`, and `issueAdjudicationReportSchema`. The artifact carries a `summary` (counts per status / severity / type) and a `groups` array with `canonicalFindingId`, `memberFindingIds`, `groupingKey`, `groupingReasons`, and per-status `statusBreakdown`.
- Grouping is **deterministic only**. The group key is `type | ruleId | files(sorted) | subjects(sorted)`; when files are empty the subjects dimension is used; when both are empty the finding id becomes a singleton key. Reasons (`"same-type"`, `"same-rule"`, `"same-files"`, `"same-subjects"`, `"singleton-no-grouping-key"`) record which dimensions formed the key. No fuzzy / semantic / embedding / LLM matching.
- Canonical finding selection per group: prefer active members (`new` / `existing`), then highest severity (`critical > high > medium > low`), then earliest id lexicographically. Group severity is the highest severity across all members.
- Group status derivation: all members `new`/`existing` → `active`; all `accepted` → `accepted`; all `ignored` → `ignored`; all `resolved` → `resolved`; otherwise → `mixed`. `active: boolean` is true whenever any member is `new` or `existing` (so `mixed` groups can still be flagged for action). Per-status counts survive in `statusBreakdown`.
- `@rekon/runtime` exports a new `buildIssueAdjudicationReport(store, options?)` helper. It reads the latest `FindingLifecycleReport` (or builds one from latest `FindingReport` + `FindingStatusLedger` if no lifecycle report exists), reads `OwnershipMap` / `ObservedRepo` if available for optional per-group `systems` assignment, and writes an `IssueAdjudicationReport` whose `header.inputRefs` cite the lifecycle report plus everything that report itself cited. `BuildIssueAdjudicationOptions` accepts `lifecycleReportId`.
- New CLI commands: `rekon issues adjudicate [--root <path>] [--json]` always builds and writes a fresh report; `rekon issues list [--status active|accepted|ignored|resolved|mixed] [--root <path>] [--json]` returns the latest report's groups (building one if none exists) and optionally filters the returned groups by status without re-deriving the underlying report.
- Registered `IssueAdjudicationReport` as a built-in artifact type in `@rekon/sdk` (schemaVersion `0.1.0`, stability `experimental`). Routed it under the `findings` category in `@rekon/runtime`'s artifact category map.
- Invariants pinned by tests: raw `FindingReport`, `FindingStatusLedger`, and `FindingLifecycleReport` are **never** mutated by adjudication (bytes-on-disk check); no finding is dropped (singletons emit singleton groups); the report's `inputRefs` carry the lifecycle ref; `rekon artifacts freshness` marks the report stale after a newer `FindingLifecycleReport`; `rekon artifacts validate` stays clean after writing the new artifact.
- Added `tests/contract/issue-adjudication.test.mjs` (15 tests): grouping by type/rule/files/subjects; singleton-no-grouping-key fallback when files and subjects are empty; subject-only grouping when files are empty; no finding is dropped; highest severity wins per group; accepted/ignored/resolved statuses survive in `statusBreakdown`; mixed group with active+ignored is `active: true` and status `mixed`; `createIssueAdjudicationReport` produces a valid artifact; CLI `issues adjudicate` writes the report; CLI `issues list` returns groups and supports `--status`; CLI `issues list` builds a fresh report if none exists; adjudication does not mutate any of the three upstream artifacts; freshness invalidation cites newer `FindingLifecycleReport`; `artifacts validate` stays clean; runtime helper carries lifecycle ref in `inputRefs`.
- `CoherencyDelta` is **not** changed in this batch. Documentation notes (`docs/concepts/coherency-delta.md`) explicitly call out that a future `CoherencyDelta` v2 will consume adjudicated groups instead of raw lifecycle findings. The current `CoherencyDelta` continues to operate on `FindingLifecycleReport` exactly as before. `resolve.issue` is similarly unchanged in this batch; future v2 may search adjudicated groups first.
- Added new docs: `docs/artifacts/issue-adjudication-report.md`, `docs/concepts/issue-adjudication.md`. Updated `docs/artifacts/finding-lifecycle-report.md` (cross-links the new adjudication artifact + concept), `docs/concepts/finding-lifecycle.md` (clarifies that adjudication is a separate projection — the lifecycle still matches by id, not by dedupe), `docs/concepts/coherency-delta.md` (adds a "Future input" note about v2 consuming adjudicated groups), `docs/strategy/classic-guarantee-regression-plan.md` (P1.1 entry now records the shipped slice and the new contract tests), `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6 reads "P1 preserved (v1)"; next slice = CoherencyDelta v2), `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry), `docs/strategy/roadmap.md` (new bullet under completed alpha spine), `README.md` (new commands), and this `CHANGELOG.md`.
- No artifact-header shape changes. No SDK API changes beyond the new built-in artifact type registration. No new capability roles, permissions, or actuators. No source writes. No mutation of upstream artifacts. No LLM. No version bump. No npm publish.
- Added memory usage evidence / curation v1 (closes the next slice of the operator-feedback / memory-curation guarantee under P1.2 in the Classic Guarantees Audit).
- `@rekon/capability-memory` gained two new artifact types: `MemoryUsageLedger` and `MemoryCurationReport`. Both are registered as built-in artifact types in `@rekon/sdk` and routed through `@rekon/runtime`'s artifact category map (`MemoryUsageLedger` → `actions`, `MemoryCurationReport` → `publications`). The capability's manifest now produces `MemoryUsageLedger` and `MemoryCurationReport` and consumes `MemoryUsageLedger`. A new invalidation rule (`memory.usage.changed`) marks curation reports stale when newer ledgers land.
- `MemoryUsageEvent` records explicit operator feedback about how a selected memory was used: `outcome` is one of `helpful` / `ignored` / `harmful` / `stale` / `unclear`. A `note` is required when `outcome` is `harmful` / `stale` / `ignored`. Events carry optional `memorySelectionId`, `usedBy`, `context` (`path`, `goal`, `resolverId`, `publicationId`, `workOrderId`), and `evidence` refs. `MemoryUsageLedger` appends events from the latest ledger on each write so history is preserved.
- `MemoryCurationItem` summarizes per-memory outcome counts and emits a deterministic `recommendation` from the rules: `harmfulCount >= 2 → deprecate`; `harmfulCount >= 1 → review`; `staleCount >= 2 → supersede-candidate`; `helpfulCount >= 2 → reinforce`; `helpfulCount >= 1 && ignoredCount == 0 → keep`; `ignoredCount >= 2 && helpfulCount == 0 → review`; otherwise `review`. Each item carries `reasons` (deterministic, human-readable explanation tokens) and a stable `score` for sort ordering. `MemoryCurationReport.summary` reports `totalMemories` / `totalUsageEvents` / per-recommendation counts.
- Pure helpers exported from `@rekon/capability-memory`: `createMemoryUsageLedger`, `validateMemoryUsageLedger`, `createMemoryCurationReport`, `deriveMemoryCuration`. The learner gained two new modes: `"usage-record"` and `"curation"`. The existing `"add"` and `"select"` modes are unchanged.
- New CLI commands: `rekon memory usage record <memory-entry-id> --outcome <outcome> [--note <note>] [--selection <selection-id>] [--path <path>] [--goal <goal>] [--used-by <name>] [--root <path>] [--json]`, `rekon memory usage list [--root <path>] [--json]`, and `rekon memory curation [--root <path>] [--json]`. Curation against an empty repo returns `{ artifact: null, summary: { totalMemories: 0 }, message: "No memory entries found." }` without writing an artifact. `memory usage list` returns `{ artifact: null, events: [] }` when no ledger exists yet.
- Invariants pinned by tests: `memory select` does **not** automatically record a usage event (selection is not usage); curation **never** mutates `OperatorFeedbackEntry.status` or any other field on a feedback entry; harmful/stale/ignored outcomes without a note are rejected at the CLI and learner boundary; the `MemoryCurationReport` becomes stale via `rekon artifacts freshness` when a newer `MemoryUsageLedger` lands.
- Agent operating contract publication integration: `@rekon/capability-docs.agent-contract` now reads the latest `MemoryCurationReport` (added to manifest `consumes`, with a new `memory.curation.changed` invalidation rule) and renders a short "Memory Curation Status" sub-section inside Memory Guidance with `memories needing review`, `reinforce candidates`, plus optional deprecate / supersede counts. The report ref is cited in `header.inputRefs` when present. No other section of the agent contract changed. The `MemorySelection` reading path is unchanged.
- Added `tests/contract/memory-usage-curation.test.mjs` (13 tests): usage record writes `MemoryUsageLedger`; harmful/stale/ignored without note is rejected (three separate tests); usage list returns recorded events; curation recommends `reinforce` for repeated helpful, `review` for a single harmful, `deprecate` for repeated harmful, `supersede-candidate` for repeated stale; curation does not mutate `OperatorFeedbackEntry`; memory select does not automatically record usage; `MemoryCurationReport` freshness goes stale after a newer `MemoryUsageLedger`; agent-contract publication includes the "Memory Curation Status" line with the correct counts and cites `MemoryCurationReport` in `inputRefs`.
- Added new docs: `docs/artifacts/memory-usage-ledger.md`, `docs/artifacts/memory-curation-report.md`, `docs/concepts/memory-curation.md`. Updated `docs/concepts/memory.md` (explicit "selection is not usage" + new CLI smoke), `docs/artifacts/memory-selection.md` (links the new ledger / curation docs; replaces the "Future `MemoryUsageEvent` could record …" deferral language), `docs/artifacts/operator-memory-entry.md` (cross-links the new docs), `docs/strategy/classic-guarantees-audit.md` / `classic-guarantee-regression-plan.md` / `classic-subsystem-purpose-map.md` / `classic-behavior-roadmap.md` / `roadmap.md` (record the new shipped slice and the explicit no-automatic-promotion / no-LLM-summarization deferral list), `README.md` (CLI command list), and this `CHANGELOG.md`.
- No artifact-header shape changes. No SDK API changes beyond the two new built-in artifact type registrations. No new capability roles. No new permissions. No source writes. No automatic memory mutation. No LLM. No version bump. No npm publish.
- Added `rekon agent-contract export --output <path> [--force] [--root <path>] [--json]` so operators can materialize the latest `agent-contract` Publication under a chosen repo-local path. Safe by default: the output must resolve inside the repo root; existing files require `--force`; protected agent-instruction paths (`AGENTS.md`, `CLAUDE.md` case-insensitive, `.cursor/rules/*.md`, `.github/copilot-instructions.md`) require `--force` and the JSON output reports `protectedPath: true`. The written file starts with a generated preamble citing the source `Publication:<id>`, declaring the file is not canonical truth, pointing to `.rekon/artifacts`, and stating the regenerate command. If no `agent-contract` Publication exists yet, the command auto-publishes one (requires a current snapshot) before exporting. JSON output: `{ outputPath, absolutePath, publicationRef: { type, id, schemaVersion }, forced, protectedPath, wrote, message? }`. `rekon publish agent-contract` still never writes a root `AGENTS.md`.
- Added `tests/contract/agent-contract-export.test.mjs` (15 tests): happy-path export writes `AGENTS.rekon.md` and reports the Publication ref; preamble cites the source Publication; original content is preserved; refuses existing without `--force`; force overwrites with the `Overwrote existing file because --force was provided.` message; refuses `AGENTS.md` without `--force`; allows `AGENTS.md` with `--force` and reports `protectedPath: true` with the protected-file message; refuses `CLAUDE.md`; refuses `.cursor/rules/*.md`; refuses `.github/copilot-instructions.md`; refuses absolute paths outside root and `../` relative escapes; auto-publishes when no Publication exists; `publish agent-contract` alone does not create a root `AGENTS.md`; JSON output carries `publicationRef`, `outputPath`, `absolutePath`, `forced`, `protectedPath`, and `wrote`; missing `--output` errors with the documented message.
- Updated `docs/concepts/agent-operating-contract.md` and `docs/artifacts/agent-contract-publication.md` to document the export command, the safe-by-default rules, the protected-path list, the JSON shape, and the recommended `AGENTS.rekon.md` target. Updated `AGENTS.md` and `README.md` to surface the new command. The CLI usage line for `agent-contract export` now appears in `rekon` help output.
- Implementation note: the protected agent-doc path detection (`PROTECTED_AGENT_DOC_BASENAMES`, `PROTECTED_AGENT_DOC_RELATIVE_PATTERNS`) is declared at the top of `packages/cli/src/index.ts`. The CLI invokes `main()` at module load and async function bodies run synchronously until the first `await`, so the consts must be initialized before any handler reaches `isProtectedAgentDocPath`.
- No artifact shape, kernel, SDK, or capability behavior changes. No new publisher. No source writes. No automatic AGENTS.md / CLAUDE.md mutation. No version bump. No npm publish.

## 0.1.0-alpha.0

- Initialized Rekon as an open-source monorepo.
- Added public package boundaries for kernels, SDK, runtime, CLI, and initial built-in capabilities.
- Added governance, security, contributing, and architecture decision scaffolding.
- Added the initial `@rekon/kernel-artifacts` public API for artifact refs, headers, JSON artifact validation, and deterministic JSON digests.
- Added the initial `@rekon/kernel-evidence` public API for evidence facts, evidence graphs, provider context, provider contracts, and dedupe helpers.
- Added the initial `@rekon/sdk` capability definition and in-memory registry API.
- Added the initial local `@rekon/runtime` artifact store, observe, snapshot, and resolver execution APIs.
- Added the built-in `@rekon/capability-js-ts` evidence provider.
- Added the initial `@rekon/cli` commands for init, capability listing, observe, snapshot, artifact inspection, and preflight resolution.
- Added the built-in `@rekon/capability-resolver` preflight resolver.
- Added GitHub Actions CI for typecheck, test, build, and whitespace checks.
- Added `@rekon/kernel-snapshot` as the public IntelligenceSnapshot contract used by runtime and resolver.
- Added `@rekon/kernel-repo-model` for ObservedRepo, OwnershipMap, and CapabilityMap contracts.
- Added `@rekon/capability-model` as a deterministic EvidenceGraph-to-model projector.
- Added `rekon project` and updated preflight resolution to prefer OwnershipMap and ObservedRepo before raw evidence fallback.
- Added `@rekon/kernel-rulebook` and `@rekon/kernel-findings` public contracts.
- Added `@rekon/kernel-graph` graph node, edge, slice, validation, and composition helpers.
- Added `@rekon/capability-graph` for import, symbol, and ownership graph slices.
- Added `@rekon/capability-policy` for initial rule evaluation and finding reports.
- Added runtime publish, learn, and act execution APIs.
- Added `@rekon/capability-docs` publication artifacts and `rekon publish agents`.
- Added `@rekon/capability-memory` feedback and selection artifacts plus `rekon memory` commands.
- Added `@rekon/capability-intent` work-order and verification-plan artifacts.
- Added `@rekon/capability-reconcile` artifact-only reconciliation plans and logs.
- Added local installed external capability loading from `.rekon/config.json`.
- Added a complete `examples/custom-capability` TODO detector.
- Added migration backlog and dogfood fixture documentation.
- Updated CI to Node 24 with Node 24-compatible GitHub Actions.
- Tightened the documented Node engine lanes to Node 20.12, 22, and 24.
- Added repository-wide artifact contract tests for the CLI smoke flow, artifact headers, index paths, digests, and generated artifact public-safety checks.
- Added SDK capability conformance helpers and contract tests for built-in and example capabilities.
- Added `resolve.preflight` `resolutionTrace` entries for ownership resolution, fallback behavior, finding/memory checks, and risk decisions.
- Updated preflight ownership resolution to prefer `OwnershipMap`, then `ObservedRepo`, then ownership `GraphSlice`, then raw `EvidenceGraph` ownership hints.
- Reworked the root README as the alpha onboarding entry point with a 10-minute CLI walkthrough, lifecycle overview, artifact/provenance explanation, capability overview, and alpha limitations.
- Added `docs/getting-started/first-10-minutes.md` and expanded artifact, resolver trace, extension authoring, manifest, security, package README, and contributing documentation.
- Polished `examples/custom-capability` as the canonical TODO capability example, including conformance testing, runtime execution instructions, expected outputs, and troubleshooting.
- Added lightweight docs contract tests for onboarding, extension authoring, artifact traceability, and contributor guidance.
- No runtime behavior, artifact shape, or SDK public API changes were made in the alpha onboarding docs pass.
- Updated process docs for solo alpha development to push directly to `main` after checks pass.
- Added runtime artifact index validation for index shape, required fields, duplicate refs, path containment, header/index matching, and digest verification.
- Added `rekon artifacts validate` for local artifact integrity checks.
- Hardened snapshot status so missing evidence reports `unknown`, malformed indexes or incomplete projection families report `partial`, and clean evidence-backed snapshots report `fresh`.
- Expanded full CLI smoke contract coverage to memory, intent, reconciliation, header freshness, index validation, and digest checks.
- Added an optional `REKON_DOGFOOD_CLASSIC_ROOT` dogfood regression harness that skips cleanly when no classic checkout is configured.
- Added durable NorthStar strategy docs in `docs/strategy/`: `north-star.md`, `capability-model.md`, `roadmap.md`, and `codebase-intel-classic-migration.md`.
- Added `docs/release/alpha-release-checklist.md` for the `0.1.0-alpha.1` go/no-go criteria.
- Added `docs/concepts/stability.md` describing the four stability labels (`stable`, `experimental`, `internal`, `deprecated`) and the alpha defaults for each package.
- Added stability labels to every `packages/*/README.md`.
- Linked strategy docs and the release checklist from `README.md`, and pointed `AGENTS.md` and `CONTRIBUTING.md` to the NorthStar.
- Added `scripts/audit-package-exports.mjs` to inspect every workspace package for required fields, `@rekon/*` scope, license, forbidden tokens, and source imports from `codebase-intel`.
- Added `scripts/publish-dry-run.mjs` to run `npm pack --dry-run --json` per workspace package, report tarball contents, and fail on missing READMEs, missing licenses, missing build output, accidental `.rekon/` or dogfood fixture inclusion, or other forbidden tokens. No package is ever published.
- Added `scripts/install-smoke.mjs` to copy `examples/simple-js-ts` into a temp workspace, run the full golden CLI flow against the built CLI, and validate the resulting artifact index. Install-from-tarball smoke remains a deferred follow-up.
- Added `scripts/audit-license.mjs` to verify the root LICENSE, the root `package.json` license, and every package license declare Apache-2.0.
- Added docs tests for the new strategy docs, the alpha release checklist, the stability concept doc, and per-package stability labels.
- No runtime behavior, artifact shape, or SDK public API changes were made in the alpha release readiness pass.
