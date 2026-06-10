# Graph-Aware Filter Provider v3 Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Decision memo only. No runtime behavior changes ship in
> this slice. The memo evaluates what (if anything) the
> graph-aware finding filter provider should port next now
> that v1 (the five port-soon candidates) and v2
> (file-existence / import-evidence strengthening) are in
> operator hands. It separates checks that can ship now,
> checks that need missing artifact projections first,
> checks to defer, and checks to reject permanently.
>
> **Substrate update:** the memo's recommended next slice —
> the **`EvidenceGraph` export / symbol facts projection
> v1** — has shipped. `@rekon/capability-js-ts` now emits
> `kind: "export"` and `kind: "symbol"` facts with the
> spec'd `{ name, kind, default?/exported? }` value shape,
> and `@rekon/kernel-findings` exports `listExportsForFile`
> and `listSymbolsForFile` helpers. **No graph-aware filter
> consumes the new facts yet** — the substrate ships alone,
> as the memo prescribed. A future slice will ship the
> first v3 candidate check that depends on it (the memo's
> strongest recommendation is strengthening
> `nextjs-route-convention` to confirm route file exports
> structurally via the new facts).

## Decision Summary

**Do not port a broad v3 catalog yet.**

The graph-aware finding filter provider's purpose has
always been **trustworthy, auditable structural filtering**
— not a recreation of classic's monolithic
`GraphOntologyValidator`. v1 + v2 already cover the five
classic checks the parity audit named as the highest-value
"port-soon" candidates. Every remaining candidate either:

1. **Already ships as a classic content filter** in
   `@rekon/kernel-findings` and would only benefit from
   graph-backed *confirmation* (not a new filter); or
2. **Cannot be proven from current Rekon artifacts** and
   therefore needs at least one missing projection first;
   or
3. **Belongs in an external rule pack** (project-specific
   framework conventions) rather than core; or
4. **Is permanently rejected** (source scraping, LLM /
   semantic / fuzzy / embedding matching, runtime truth
   graph, monolithic validator port).

The recommended next implementation slice is **not** a v3
check at all — it is the **substrate** that unblocks
multiple candidates simultaneously:

> **Recommended next implementation:
> `EvidenceGraph` export / symbol facts projection v1.**

Many remaining candidate checks (UI hook role, provider
abstraction, capability-confirmed factory, route segment
convention beyond v2) require knowing what a file
*exports* and what *symbols* it owns, not just what it
imports. Today Rekon's `EvidenceGraph` carries import
facts but no first-class export / symbol facts. Adding
that projection unblocks 3–4 v3 candidates at once and is
much smaller in scope than a runtime truth graph or a
broad framework catalog.

After the export / symbol facts projection ships, the
follow-up v3 slice should ship **one** narrow graph-aware
check that depends on it (the strongest candidate from
the new substrate). Until then, no v3 graph-aware checks
should land.

## What v1/v2 Already Cover

The graph-aware finding filter provider currently consumes
`ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
`EvidenceGraph`, and (optionally) `GraphSlice` artifacts
to suppress findings backed by structural evidence.

**v1 (graph-aware-finding-filter-provider v1 slice,
shipped at `776adcf`):**
- New additive optional projections —
  `ObservedRepo.files?: string[]`,
  `ObservedSystem.kind?: string`.
- `FindingGraphFilterContext` (structural `Like` types so
  the kernel stays free of `kernel-repo-model` /
  `kernel-evidence` / `kernel-graph` deps).
- `applyFindingGraphFilters({ finding, graphContext })`.
- Runtime `graphContext` plumbing in
  `buildFindingFilterReport`; cited only when used.
- Five checks (no new reason codes; shared with v2
  classic content filter):
  - `route-handler-with-service`
  - `route-http-middleware-only`
  - `external-api-comment-only`
  - `factory-file-creates-deps`
  - `module-gate-verified-caller`

**Graph-aware filter surfacing in publications / filter
health (shipped at `01faa49`):**
- `graphAwareFiltered` mutually-exclusive bucket in
  `FindingFilterHealthSummary` (split from
  `contentFiltered`; counts sum to `totalFiltered`).
- `byGraphAwareReason` / `filterRateByGraphAwareReason` /
  `dominantGraphAwareReason` (alphabetic tiebreak).
- Two new alerts: `graph-aware-filter-dominance` and
  `graph-aware-reason-dominance` (both gated on
  `totalFindings >= 5` at `>= 50 %` rate).
- Architecture summary "Graph-Aware Filter Reasons" table
  + audit pointer; agent contract graph-aware count +
  conditional audit instruction + new "Do Not Do"
  reminder.

**v2 (graph-aware-finding-filter-provider-v2 slice,
shipped at `0ab0b16`):**
- New exported helpers (`normalizeRepoPath`,
  `sameRepoPath`, `siblingPath`, `listObservedRepoFiles`,
  `observedRepoHasFile`, `findSiblingFile`,
  `listImportTargetsForFile`,
  `fileImportsTargetMatching`).
- `FindingGraphArtifactUsed` type +
  `FindingGraphFilterDecision.usedArtifacts` so each
  decision identifies which artifact contributed evidence.
- `ApplyFindingFiltersResult.graphArtifactsUsed` so the
  runtime cites only the artifacts that actually
  contributed to a match.
- `EvidenceGraph` import facts now preferred over
  `Finding.details.imports` across all five checks.
- `ObservedRepo.files` sibling-file lookups for
  `route-handler-with-service`.
- `OwnershipMap` + `ObservedSystem.kind === "module"`
  preferred over the bare `/modules/` path heuristic for
  `module-gate-verified-caller`.
- Pipeline reordered: graph-aware now runs *before*
  classic content so the audit credits the strongest
  source. Classic content remains the fallback.

What does NOT ship in v1/v2:
- No new reason codes.
- No source-file reads.
- No LLM / semantic / fuzzy / embedding logic.
- No `GraphOntologyValidator` port.
- No runtime truth graph.
- No framework-wide exception catalogs.

## Remaining Classic Checks

The classic codebase-intel project carried more checks
than v1 + v2 ported. This memo evaluates the ten most
prominent remaining candidates. Each entry follows a fixed
shape so future contributors can extend the list with the
same rigor.

### 1. UI HTTP provider abstraction (deeper)

- **Classic purpose:** suppress findings under
  `ui_http_direct_call` when the file is a UI hook that
  *should* abstract its HTTP call through a provider —
  classic confirmed the abstraction structurally.
- **Current Rekon coverage:** `ui-http-provider-abstraction`
  (v2 classic content filter). Fires on
  `details.concernTag === "ui_http_direct_call"` plus a
  hook-shaped path (`/hooks/` or `/use*`). Graph-aware
  could *strengthen* this with provider-role facts.
- **Artifact evidence needed:** export / symbol facts
  proving the file is a React hook (default export named
  `use*`); ownership/capability facts proving the file is
  intended to delegate to a provider boundary.
- **Available today?** Partially. `OwnershipMap` carries
  some ownership facts; `CapabilityMap` does not have a
  "provider boundary" capability shape yet. Export /
  symbol facts are missing.
- **Risk:** medium. False-suppression in this layer would
  cause `ui_http_direct_call` to silently drop. The
  existing v2 content filter is conservative; adding a
  weaker graph-aware variant could *expand* suppression
  on top of it.
- **Recommendation:** **needs missing projections first.**
  Wait for export / symbol facts projection v1 + an
  optional `provider-boundary` capability shape before
  shipping a graph-aware confirmation.

### 2. UI hook uses HTTP not DB

- **Classic purpose:** suppress findings that warn a UI
  hook touches "database" when the hook actually only
  performs HTTP calls (e.g. `useAdmin`, `useFetch`,
  `useApi`, `useQuery`).
- **Current Rekon coverage:**
  `ui-hook-uses-http-not-db` (v2 classic content filter).
  Fires on description-shape + hook-name patterns. No
  graph-aware variant.
- **Artifact evidence needed:** import facts proving the
  file imports `fetch` / `axios` / a fetch wrapper but
  does NOT import any DB driver / ORM. Export facts
  proving the file exports a `use*` hook.
- **Available today?** Import facts: yes (via v2's
  `listImportTargetsForFile`). Export facts: no.
- **Risk:** medium. Same as #1 — adding a weaker variant
  could expand suppression.
- **Recommendation:** **needs missing projections first.**
  Same gating as #1. Could also be implemented as a
  predicate over import facts alone (drop the
  hook-confirmation requirement), but the false-suppression
  risk is too high without confirming the file is a hook.

### 3. Hardcoded config not DDE

- **Classic purpose:** suppress
  `architecture.decisions.go_through_dde_gates` findings
  when the description / concerns are config-shaped
  (`hardcoded`, `magic number`, `timeout`) and contain no
  business-decision fragments.
- **Current Rekon coverage:**
  `hardcoded-config-not-dde` (v2 classic content filter).
  Fires on `decisionCapabilities` / `decisionConcerns`
  shape. Pure detector-detail logic.
- **Artifact evidence needed:** the
  `DDE` capability concept is project-specific. To
  strengthen graph-aware, Rekon would need a project's
  DDE rulebook surfaced as artifacts.
- **Available today?** No. DDE is not in the open-source
  Rekon artifact set.
- **Risk:** high. The DDE pattern is project-specific
  (`codebase-intel-classic` repo). Porting a DDE catalog
  to core Rekon would couple core to a project-specific
  rulebook.
- **Recommendation:** **reject for core.** Operators with
  DDE workflows should ship the catalog as an external
  rule pack (`@rekon/example-rule-packs/...`) or as a
  policy in `.rekon/config.json`. Core stays generic.

### 4. Module gate verified caller (beyond current kind/path)

- **Classic purpose:** confirm a module-gate finding is
  inside "verified caller" territory using deeper
  ownership facts than v1's
  `OwnershipMap` + `ObservedSystem.kind === "module"`
  lookup.
- **Current Rekon coverage:**
  `module-gate-verified-caller` (v1, v2). v2 already
  prefers structural kind over the `/modules/` path
  heuristic.
- **Artifact evidence needed:** an `OwnershipMap` entry
  for the file's *caller* (not just the file itself),
  plus the caller's `ObservedSystem.kind`. Today the
  caller is unknown to the filter — we only see the
  finding's `files[]`.
- **Available today?** No. The "caller" concept requires
  call-graph evidence (callers ↔ callees), which is a
  `GraphSlice` we don't produce yet.
- **Risk:** low (no-op until evidence exists).
- **Recommendation:** **defer.** Wait for call-graph
  `GraphSlice` evidence. v1 + v2 already cover the
  practical cases (file path + owner kind).

### 5. Framework-specific route segment config conventions

- **Classic purpose:** suppress findings under
  `routes.single_http_handler_export` when a `route.ts`
  file's other exports are exactly Next.js segment-config
  exports (`runtime`, `dynamic`, `revalidate`,
  `fetchCache`, `preferredRegion`).
- **Current Rekon coverage:** `nextjs-route-convention`
  (v2 classic content filter). Fires on
  `details.otherExports` shape.
- **Artifact evidence needed:** export facts for the file
  (the list of named exports). Today Rekon depends on
  detectors to surface `details.otherExports`.
- **Available today?** No first-class export facts.
- **Risk:** low (existing v2 content filter is
  conservative).
- **Recommendation:** **needs missing projections first.**
  Once export / symbol facts ship, a graph-aware variant
  could confirm `route.ts` exports without trusting
  `details.otherExports`. Note: this check is
  Next.js-specific. Consider shipping as an external rule
  pack (`@rekon/example-rule-packs/nextjs-routes`)
  rather than core.

### 6. Factory by capability signal (beyond path evidence)

- **Classic purpose:** confirm a "factory" file actually
  owns a factory / DI capability — not just a file with
  `factory` in the name.
- **Current Rekon coverage:**
  `factory-file-creates-deps` (v1, v2). v2 already
  consumes `CapabilityMap` (when entries contain
  `factory` / `init` / `bootstrap` in the capability
  name).
- **Artifact evidence needed:** structured capability
  roles. Today `CapabilityMap.entries[].capability` is a
  free-form string. A canonical "factory" capability
  role would let the check assert role membership rather
  than substring match.
- **Available today?** Partially. CapabilityMap exists
  but lacks a structured role taxonomy.
- **Risk:** low.
- **Recommendation:** **defer to a future capability
  role taxonomy slice.** Don't add a graph-aware check
  whose only improvement is "match the capability name
  more strictly." Wait until capability roles are a
  first-class concept across Rekon.

### 7. Provider boundary / external API provider proof

- **Classic purpose:** confirm a finding under
  `external_apis.calls_go_through_providers` originates
  inside a provider boundary — files explicitly designed
  to wrap external APIs.
- **Current Rekon coverage:**
  `external-api-comment-only` (v1, v2). v2 prefers
  EvidenceGraph import facts. Confirms *absence* of
  external API imports; does NOT confirm the file is a
  provider.
- **Artifact evidence needed:** a `provider-boundary`
  capability role (which files are designated providers).
  Then findings under provider files would be
  *strengthened* (the file is allowed to import external
  APIs), and findings in non-provider files would be
  *re-surfaced* even when import facts are missing.
- **Available today?** No.
- **Risk:** medium. False-suppression in the provider
  case is acceptable (the file IS supposed to call the
  API); false-suppression in the non-provider case is
  serious.
- **Recommendation:** **needs missing projections first.**
  Wait for an explicit `provider-boundary` capability
  shape. Consider an external rule pack for the
  project-specific provider list.

### 8. Runtime truth graph checks

- **Classic purpose:** consume runtime-only correctness
  facts (e.g. "this constructor is only called once
  in production").
- **Current Rekon coverage:** none. No runtime
  substrate. `EvidenceGraph` carries static facts only.
- **Artifact evidence needed:** a runtime-truth graph
  producer that observes the running system. This is a
  major substrate, not a filter slice.
- **Available today?** No.
- **Risk:** very high — runtime observation is invasive
  and brittle.
- **Recommendation:** **defer indefinitely.** Document
  it in the audit as a permanent deferral candidate.
  Rekon's "artifact-first" guarantee deliberately does
  not extend to runtime observation. If a runtime
  substrate ever ships, it should be a separate
  workstream, not a graph-aware filter check.

### 9. Full policy-owner parser

- **Classic purpose:** parse classic's "policy owner"
  rulebook — which capabilities own which architectural
  decisions — and use it to suppress findings against
  the correct owner.
- **Current Rekon coverage:**
  `@rekon/kernel-rulebook` carries a deterministic rule
  representation, but it doesn't carry classic's
  policy-owner semantics.
- **Artifact evidence needed:** a structured rule
  ownership artifact (probably `OwnershipMap` extended
  with a `decisionOwner` field, or a new `PolicyOwnerMap`
  artifact).
- **Available today?** No.
- **Risk:** high — recreating classic's policy-owner
  parser is exactly the "monolithic validator" anti-goal
  the audit rejected.
- **Recommendation:** **reject** as written. If operators
  need rule-ownership semantics, ship it as a rulebook
  feature (declarative rules with owner metadata), not as
  a graph-aware filter check. Don't try to parse classic.

### 10. Test / generated / external graph-ontology checks (beyond paths)

- **Classic purpose:** suppress findings in test /
  generated / external files using graph-ontology
  evidence (e.g. file is referenced *only* from a test
  runner, file is generated *by* a build step).
- **Current Rekon coverage:** `test-file`, `generated-file`,
  `external-file` (built-in path heuristics).
- **Artifact evidence needed:** referrer evidence — who
  imports this file? An import-graph reverse lookup over
  `EvidenceGraph` import facts could power "file is only
  imported by test files" / "file is only imported by
  generated files."
- **Available today?** Partially. `listImportTargetsForFile`
  reads forward imports; reverse lookup is one helper
  away (`listImportSourcesForFile`).
- **Risk:** low.
- **Recommendation:** **candidate to port now** as a
  small slice IF the new helper is added. But the
  existing path-based filters already cover the high-value
  cases. Wait until operator data shows path heuristics
  are missing test/generated files.

## Product Decision Criteria

Every v3 candidate is evaluated against the same criteria.

### User value
- Does this reduce real false-positive noise users will
  see in `rekon refresh` output, the architecture summary
  publication, or the agent contract? A check that fires
  on findings the current pipeline already suppresses
  adds zero user value.

### Evidence quality
- Can current Rekon artifacts (`EvidenceGraph`,
  `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
  `GraphSlice`) prove the exception **without** reading
  source files, calling an LLM, or guessing? If evidence
  is missing, the check must remain a no-op.

### Auditability
- Can the filter evidence string explain exactly why the
  filter fired, naming the artifact-backed signal?
  Vague evidence ("structural signal detected") is not
  good enough. The v2 evidence model
  (`usedArtifacts: [...]`) sets the bar.

### Scope
- Is the check general enough for open-source Rekon, or
  is it project-specific (Next.js / DDE / a single
  provider catalog)? Project-specific checks belong in
  external rule packs, not core.

### Safety
- What is the cost of a false suppression? The
  graph-aware stage runs **before** active lifecycle /
  adjudication / coherency. A false suppression hides a
  real issue from the entire downstream governance
  surface. Lower confidence demands stricter evidence.

### Implementation complexity
- Does it require missing projections, policy-owner
  parsing, or a runtime truth graph? If the substrate
  isn't there yet, defer. Don't add the substrate
  *and* the check in the same slice.

### Extensibility
- Could this be better as an external graph-aware filter
  capability than as a built-in check? Project-specific
  framework conventions (Next.js segment configs, DDE
  catalogs, provider lists) belong in rule packs.

## Candidate Checks To Port Now

After applying the criteria, **zero** of the ten
remaining checks pass the bar for "port-now" today.
Every candidate either needs missing projections, is
project-specific (belongs in an external rule pack), or
is permanently rejected.

The strongest candidate that *could* ship as a small
slice if the substrate were already in place is
**reverse-import test-file confirmation** (entry 10
above). But the existing v1 path heuristics already cover
that case, so the user value is marginal until operator
data shows otherwise.

**Recommendation: no graph-aware check ports in the v3
implementation slice. The substrate work ships first.**
After the substrate ships and operators run against real
repos, the data from the new "Graph-Aware Filter
Reasons" surface and the two graph-aware dominance
alerts will tell us *which* of the remaining candidates is
actually missing in practice.

## Candidate Checks That Need Missing Projections First

Five of the ten remaining checks (entries 1, 2, 5, 6, 7)
need at least one of the following missing projections.

### Export / symbol facts (priority 1)

- **Why needed:** UI hook role, UI hook uses HTTP not DB,
  framework-specific route segment config conventions,
  factory by capability all depend on knowing what a file
  *exports* and what *symbols* it owns. Today Rekon's
  `EvidenceGraph` carries import facts (forward edges
  only); there is no symmetric "export" / "symbol" fact
  shape.
- **Producer candidate:** extend the existing
  `@rekon/capability-model.projector` to surface
  `kind: "export"` and `kind: "symbol"` facts alongside
  the existing import facts. Reuse the same evidence
  fact shape (`id` / `kind` / `subject` / `value`).
- **Future artifact shape:** additive — new evidence fact
  kinds on the existing `EvidenceGraph` (no new artifact
  type). `subject` = the file; `value.name` = the
  exported symbol name; `value.kind` =
  `"function"` / `"class"` / `"const"` / `"default"`.

### Provider-boundary capability role (priority 2)

- **Why needed:** provider boundary / external API
  provider proof depends on knowing which files are
  declared as provider boundaries. Today
  `CapabilityMap.entries[].capability` is a free-form
  string; there is no canonical
  `provider-boundary` role.
- **Producer candidate:** extend `CapabilityMap` with an
  optional `role?: string` field on each entry. The
  projector populates from explicit `role` facts in
  `EvidenceGraph`.
- **Future artifact shape:** additive optional —
  `CapabilityMap.entries[].role?: string`. No
  `schemaVersion` bump.

### Call-graph / referrer evidence (priority 3)

- **Why needed:** module gate verified caller (deeper),
  test/generated/external reverse-import confirmation,
  and the future "file is only called from X" checks
  depend on reverse-edge import evidence.
- **Producer candidate:** add a new
  `EvidenceGraph` fact kind `kind: "call-edge"` or expose
  reverse-import lookup via a helper
  (`listImportSourcesForFile`). The simpler helper is
  cheap; the full call-edge fact is a more invasive
  substrate.
- **Future artifact shape:** additive — either a helper
  over existing import facts, or a new fact kind on
  `EvidenceGraph`. Prefer the helper unless a real
  use case demands the new fact shape.

## Checks To Defer

- **Module gate verified caller beyond current
  kind/path** (#4) — needs call-graph evidence. Defer.
- **Factory by capability beyond path** (#6) — needs a
  canonical capability role taxonomy. Defer.
- **Runtime truth graph checks** (#8) — needs a runtime
  observation substrate; out of scope for Rekon's
  artifact-first design. Defer indefinitely.

Deferred checks remain documented here and in the audit
so future contributors don't repropose them without new
evidence. A check moving from "deferred" to "needs
projections" requires the underlying substrate to ship
first.

## Checks To Reject

- **Monolithic `GraphOntologyValidator` port** — the
  parity audit already rejected this; the v3 memo
  reaffirms it. Recreating classic's validator architecture
  would couple Rekon to source IO, recreate the
  "one-service-knows-everything" problem, and lose the
  artifact-first guarantee.
- **Source-reading filters** — graph-aware filters never
  read source files. Findings come from detectors; filters
  consume artifacts only. An operator who needs inline
  exemption pragmas should ship that as an explicit
  workflow (e.g. file-level `// rekon-ignore` comment
  surfaced as a detector signal), not as filter logic.
- **LLM / semantic / fuzzy / embedding false-positive
  filtering in this layer** — permanently rejected per
  the issue governance ADR. Filter decisions must be
  deterministic and explainable.
- **Project-specific hardcoded exception catalogs in
  core** — DDE catalogs, Next.js-specific exception
  lists, named-provider lists, named-hook lists, etc.,
  belong in external rule packs
  (`@rekon/example-rule-packs/...`) or in operator
  `.rekon/config.json` policies. Core Rekon stays
  generic.
- **Full policy-owner parser** (#9) — recreating
  classic's policy-owner semantics is the "monolithic
  validator" anti-pattern. If operators need rule
  ownership, ship it as a rulebook feature.

## Required Artifact Projections

For the substrate work to unblock multiple v3 candidates
at once, three artifact projections are candidates (in
priority order):

1. **`EvidenceGraph` export / symbol facts** — unblocks
   #1, #2, #5, plus the strengthening of v2's
   `factory-file-creates-deps` (knowing a file exports a
   `default function factory()` is stronger than a path
   match). **Recommended first.**
2. **`CapabilityMap.entries[].role?: string`** — unblocks
   #7 (provider boundary) and a stronger #6
   (capability-confirmed factory).
3. **Call-graph / referrer evidence** (helper or new
   fact kind) — unblocks #4 (deeper module-gate caller
   confirmation) and #10 (reverse-import
   test/generated/external confirmation).

All three are additive optional projections; none requires
an artifact `schemaVersion` bump.

## Implementation Options

Four options were considered for how to ship v3 graph-aware
checks once the substrate exists.

### A. Continue in `@rekon/kernel-findings` helper

Pros: smallest scope; keeps everything in one place;
matches v1 + v2's pattern.
Cons: kernel-findings is already 4k+ lines; further
expansion couples the kernel to artifact-specific logic.
Recommendation: **avoid further expansion** unless the
check is a one-liner over the existing helpers.

### B. New built-in graph-aware filter capability

Pros: properly decoupled — a `capability-findings-graph`
package implementing the `GraphAwareFindingFilterProvider`
contract sketched in the audit; runtime loads it through
the existing capability registry.
Cons: more files / dependencies.
Recommendation: **prefer for built-in checks** that
should ship in every Rekon installation. The current
five checks could also be migrated to this shape, though
that's a separate refactor (and not a v3 deliverable).

### C. External example rule / filter pack

Pros: ideal home for project-specific framework checks
(Next.js segment configs, DDE catalogs, provider catalogs);
operators opt in.
Cons: external packs lack first-class CLI / runtime
plumbing today.
Recommendation: **prefer for project-specific or
framework-specific checks.** Open-source Rekon stays
generic; opinionated catalogs ship as external packs.

### D. Wait until more projections exist

Pros: avoids premature implementation when the substrate
is missing.
Cons: nothing ships.
Recommendation: **prefer until the substrate ships.**
This is the actual recommendation for v3.

**v3 implementation recommendation:** prefer **D** until
the export / symbol facts substrate ships. Once the
substrate is in place, prefer **B** for built-in checks
and **C** for project-specific ones.

## Recommended Next Implementation

> **EvidenceGraph export / symbol facts projection v1.**

Concrete scope for the next implementation slice:

- Extend `@rekon/capability-model.projector` (or a
  dedicated producer if the projector is the wrong
  layer) to surface `kind: "export"` and
  `kind: "symbol"` evidence facts alongside the existing
  `kind: "import"` facts.
- Each fact uses the existing `EvidenceFact` shape:
  - `subject` = repo-relative file path
  - `kind` = `"export"` or `"symbol"`
  - `value.name` = exported symbol name
    (`"default"` for default exports)
  - `value.kind` = `"function"` / `"class"` /
    `"const"` / `"default"` / `"namespace"` /
    `"type"` (deterministic enum)
  - `confidence` and `provenance` as today
- Add a kernel-findings helper
  `listExportsForFile(context, filePath): Array<{ name, kind }>`
  that reads the new facts and normalizes paths via the
  existing v2 helpers.
- Add contract tests pinning: helper behavior, producer
  output shape, additive-optional schema (older
  `EvidenceGraph` artifacts continue to validate), no
  source reads.
- No new artifact type. No `schemaVersion` bump. No new
  CLI command or flag. No new capability role.
- No graph-aware filter ports in this slice. The
  substrate work ships alone so v3 candidate checks can
  consume it in a follow-up slice.

After the substrate ships, the *next* slice should ship
one narrow graph-aware check that depends on it. Based on
the analysis above, the strongest candidate is:

- **Strengthen `nextjs-route-convention` (or a new
  graph-aware variant)** to confirm the route file's
  exports structurally via the new export facts. That
  removes the `details.otherExports` detector
  dependency. Ship as either a built-in graph-aware
  check (option B) or as an external rule pack
  (option C) — the next memo can decide based on
  operator data from the new alerts.

## Future Regression Tests

When the export / symbol facts substrate ships, the
following regression tests should land alongside it:

1. **Export fact producer.** Synthetic
   `ObservedRepo.files` + minimal source-evidence input
   produces `EvidenceGraph` facts of
   `kind: "export"` for each named / default export. No
   source-file reads at filter time (the producer reads
   source at *evidence-extraction* time, which is a
   different layer).
2. **`listExportsForFile` helper.** Given an
   `EvidenceGraph` with `kind: "export"` facts for a
   file, the helper returns the deterministic
   `{ name, kind }[]` list. Path normalization via
   `normalizeRepoPath`.
3. **Additive-optional schema.** Older
   `EvidenceGraph` artifacts (without `kind: "export"`
   facts) continue to validate; `rekon artifacts
   validate` stays clean.
4. **Conservative no-op.** Filters that would consume
   export facts treat their absence as a no-op (no
   guessed filtering).
5. **Inputrefs precision.** When a future graph-aware
   check consults export facts, the runtime cites
   `EvidenceGraph` in
   `FindingFilterReport.header.inputRefs` exactly as it
   does today for import-fact matches.

When a follow-up v3 check ports on top of the substrate,
the check's own regression tests should pin (per the
v1 / v2 pattern):

- Reason code is reused (no new code).
- Evidence string names the artifact + signal used.
- Confidence matches the strength of the evidence.
- Missing evidence → conservative no-op.
- Raw `FindingReport` unchanged.
- Lifecycle / adjudication / coherency exclude the
  filtered finding.
- `rekon artifacts validate` stays clean.

## Cross-References

- [GraphOntologyValidator-lite audit](graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](issue-governance-architecture-decision.md)
- [Classic guarantees audit](classic-guarantees-audit.md)
- [Classic guarantee regression plan](classic-guarantee-regression-plan.md)
- [Classic subsystem purpose map](classic-subsystem-purpose-map.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
