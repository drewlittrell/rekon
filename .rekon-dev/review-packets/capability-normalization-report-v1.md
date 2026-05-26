# Review Packet: CapabilityNormalizationReport v1

**Slice:** First runtime implementation on the
capability-ontology track.
**Status:** Implemented. Ready for review.
**Owning package:** `@rekon/capability-ontology` (new).
**Decision lineage:** [Capability Ontology Architecture Impact
Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
→ [Capability Ontology Translation Layer
Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md).

## CHANGES MADE

- New package `@rekon/capability-ontology` (`projector` role,
  consumes `EvidenceGraph`, produces
  `CapabilityNormalizationReport`).
- New artifact type `CapabilityNormalizationReport`:
  - Registered in `@rekon/sdk` built-in artifact types.
  - Registered in `@rekon/runtime` artifact category map
    under `projections`.
- New CLI command:
  `rekon capability ontology normalize [--root <path>] [--json]`.
- Wired the capability into `BUILT_IN_CAPABILITIES` +
  `DEFAULT_CAPABILITIES` in `packages/cli/src/index.ts`.
- 19-assertion contract test
  `tests/contract/capability-normalization-report.test.mjs`
  (+ 1 loader sanity test → 20 tests total).
- 10-assertion docs test
  `tests/docs/capability-normalization-report.test.mjs`.
- New docs:
  - `docs/artifacts/capability-normalization-report.md`
  - `docs/concepts/capability-ontology.md`
- Cross-link updates to: the translation-layer decision memo,
  the architecture impact review memo, the EvidenceGraph
  artifact reference, the reconciliation-preview concept,
  the roadmap, the classic-behavior roadmap, README, and
  CHANGELOG.

## PUBLIC API CHANGES

Public exports of `@rekon/capability-ontology`:

- Default export: Rekon capability definition (`projector`
  handler).
- `BUILTIN_CAPABILITY_ONTOLOGY` — frozen baseline.
- `compileEffectiveCapabilityOntology(input)` — pure compiler.
- `loadCapabilityOntologyConfig(repoRoot)` — JSON loader.
- `splitCapabilityName(name)` — deterministic lexical splitter.
- `extractCapabilityCandidates(graph)` — candidate extractor.
- `normalizeCapabilityCandidates(input)` — pure normalizer.
- `buildCapabilityNormalizationReport(input)` — wires the
  pipeline.
- Types: `CapabilityOntologyConfig`,
  `EffectiveCapabilityOntology`,
  `CapabilityCandidate`, `CapabilityCandidateKind`,
  `CapabilityNormalizationStatus`,
  `CapabilityNormalizationReport`,
  `CapabilityNormalizationReportSummary`,
  `CapabilityNormalizationReportCandidate`.
- Identifier constants: `CAPABILITY_ONTOLOGY_CAPABILITY_ID`,
  `CAPABILITY_ONTOLOGY_PROJECTOR_ID`,
  `CAPABILITY_ONTOLOGY_VERSION`.

SDK / runtime additions are additive:

- `@rekon/sdk` adds `CapabilityNormalizationReport` to its
  built-in artifact types (`schemaVersion: "0.1.0"`,
  `stability: "experimental"`).
- `@rekon/runtime` adds `CapabilityNormalizationReport` to
  the artifact category map (`projections`).

CLI surface adds:

- `rekon capability ontology normalize [--root <path>] [--json]`.
- `usage()` now lists this command.

No prior public exports are modified.

## PURPOSE PRESERVATION CHECK

This slice is the **first runtime implementation** on the
capability-ontology track. It preserves the layered ontology
model exactly:

- `EvidenceGraph` (Layer 0) is **read-only**: the code never
  mutates raw facts.
- The package's built-in baseline + optional operator config
  are the source vocabulary (Layer 1–3).
- The `EffectiveCapabilityOntology` compiled at runtime is
  **internal** (Layer 4); only the audit report and the
  source/hash provenance leave the package.
- `CapabilityNormalizationReport` (Layer 5) is the **first
  registered artifact** (this slice).
- `CapabilityMap` (Layer 6) is **not touched**; integration
  is deferred to v2.
- `RefactorPreservationContract` (Layer 7) is **not
  introduced**.
- Unknown verbs / nouns **surface** to operators via
  `status: "unknown-verb" | "unknown-noun" | "unknown"`.
- LLM-only normalization is **not** invoked. The lexical
  split is purely regex-based.
- Findings are **not** mutated. The normalization report
  does not touch `FindingStatusLedger`, `FindingReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.

The translation-layer decision's verbatim pins are preserved
in the new concept doc:

- *"Do not flatten the ontology into a single config / report layer."*
- *"CapabilityNormalizationReport is the first registered
  artifact."*
- *"CapabilityMap integration is deferred to v2."*
- *"EvidenceGraph raw facts are unchanged."*
- *"Unknown verbs / nouns must surface to operators."*
- *"LLM suggestions are not truth in v1."*

## CODEBASE-INTEL ALIGNMENT

The package is the substrate equivalent of classic
`codebase-intel`'s `GraphOntologyValidator` *boundary*
expressed as a deterministic projector + audit artifact:

- No port of the monolithic validator.
- The deterministic split + alias merge replaces the classic
  monolith's normalization tables.
- Unknown terms become audit rows rather than disappearing
  into LLM-shaped output.
- Operators extend the ontology by editing
  `.rekon/capability-ontology.json` — the same surface area
  the decision memo committed to.

## PACKAGE / ARTIFACT MODEL

- Package: `@rekon/capability-ontology` v0.1.0-beta.0.
- Capability id: `@rekon/capability-ontology`.
- Roles: `projector`.
- Consumes: `EvidenceGraph`.
- Produces: `CapabilityNormalizationReport`.
- Permissions: `read:artifacts`, `write:artifacts`.
- InvalidatedBy: `EvidenceGraph` changes.
- Artifact category: `projections`.
- Artifact stability: `experimental`.

## ONTOLOGY CONFIG

- File: `.rekon/capability-ontology.json` (optional).
- Format: JSON only (no YAML in v1).
- Version: must be `"0.1.0"`.
- Sections: `verbs`, `nouns`, `roles`, `patterns`.
- Each section accepts: `canonical[]`, `aliases{}`,
  `categories{}` (verbs / nouns only), `thresholds.autoMap`
  (nouns only), and `includeSystemVerbs` / `includeSystemNouns`
  toggles (for forward compat).
- Built-in canonical entries are never removed; operator
  config merges on top.
- Invalid config (bad JSON, wrong version, wrong shape) fails
  the CLI command clearly. The CLI never silently ignores
  config errors.

## NORMALIZATION MODEL

- Candidates extracted from `symbol`, `export`,
  `capability_hint`, and `ownership_hint` facts.
- Default-name exports (`export default …` with `name: "default"`)
  are dropped.
- Ownership hints are kept as candidates but classified
  `ignored` so the report can audit them without claiming a
  verb/noun pairing.
- Names split by camelCase / snake_case / kebab-case
  boundaries.
- Confidence bands: `high` (2 tokens), `medium` (3+ tokens),
  `low` (1 token or empty).
- Lookups: canonical match first, then alias map. Both
  case-insensitive.
- Statuses: `normalized`, `unknown-verb`, `unknown-noun`,
  `unknown`, `ignored`, `low-confidence`.

## CLI SURFACE

```bash
rekon capability ontology normalize [--root <path>] [--json]
```

- Requires an existing `EvidenceGraph` in the local artifact
  store. Fails with a clear message if none exists.
- Reads the **latest** `EvidenceGraph` (index-tail).
- Loads optional `.rekon/capability-ontology.json`.
- Writes a single `CapabilityNormalizationReport` under
  `.rekon/artifacts/projections/`.
- `--json` emits the canonical report shape (artifact ref +
  ontology block + summary + candidates).
- Without `--json`, prints a short summary line + the artifact
  id.

## TESTS / VERIFICATION

- 9-command pre-validation gate (typecheck / test / build /
  diff / exports / license / publish-dry-run / install-smoke /
  install-tarball-smoke) **passed** on `243efd4` before this
  batch began.
- New contract test (20 tests including a sanity loader test;
  19 assertion areas as required) **passing**.
- New docs test (10 assertions) **passing** (verified
  individually + as part of full suite).
- Full 9-command verification gate to be re-run before merge.
- CLI smoke against `examples/simple-js-ts` exercised via the
  contract test (it executes the full `init → refresh →
  capability ontology normalize → artifacts validate` chain).

## INTENTIONALLY UNTOUCHED

- `CapabilityMap` integration (Layer 6 — v2).
- `RefactorPreservationContract` (Layer 7 — far-future).
- Any source-write apply path.
- Any LLM-backed normalization.
- Any finding mutation.
- Any workflow YAML.
- `package.json` / `package-lock.json` version field.
- Existing tests outside this slice.
- `pnpm-lock.yaml` (root checkout artifact — left untracked).

## RISKS / FOLLOW-UP

- **Built-in baseline coverage.** The seed vocabulary is
  intentionally small (~14 verbs, ~14 nouns). Operator
  dogfood output will likely surface many unknowns. That is
  expected and documented; the next slice is the baseline
  coverage review.
- **Ownership hints.** v1 keeps ownership_hint as `ignored`
  audit rows. A future slice can project ownership into a
  separate role-level surface; not in scope here.
- **Configuration discoverability.** The CLI does not yet
  print "no config found, using built-in baseline." The
  `ontology.source` field in the report makes this explicit
  for JSON consumers. Consider a human-mode hint in a
  follow-up.
- **Plural / singular handling.** No stemming in v1. `users`
  vs `user` will appear as two terms unless an alias is
  configured. Documented as audit signal.

## NEXT STEP

The recommended next slice is the **built-in baseline
ontology coverage review** against the operator dogfood
output (step 4 of the translation-layer decision
implementation sequence). It is gated on one or more
operator runs of the new normalize CLI.
