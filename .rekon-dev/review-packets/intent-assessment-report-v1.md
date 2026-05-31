# Review Packet — IntentAssessmentReport v1

Slice 78 on the capability-ontology track. Product-capability batch. Registers
and implements `IntentAssessmentReport` v1 — a read-only readiness assessment
of a user request against the existing Rekon context spine, the first artifact
of the staged Rekon intent spine selected at `45f9cd0`. It is assessment, not
WorkOrder: it creates no `WorkOrder` / `VerificationPlan`, executes no
commands, writes no source, and mutates nothing.

## CHANGES MADE

- Registered the `IntentAssessmentReport` artifact type:
  `@rekon/kernel-repo-model` types + `createIntentAssessmentReport` factory +
  `validateIntentAssessmentReport` + `assertIntentAssessmentReport` +
  `intentAssessmentReportSchema`; `@rekon/sdk` `BUILT_IN_ARTIFACT_TYPES`;
  `@rekon/runtime` `ARTIFACT_CATEGORY_BY_TYPE` (category `actions`).
- New `@rekon/capability-model.buildIntentAssessmentReport` helper (structural
  `Like` inputs; readiness / blocker policy; reads no files).
- New `rekon intent assess` CLI command (latest-context resolution, scope
  flags, human + `--json` output).
- New `docs/artifacts/intent-assessment-report.md` +
  `docs/concepts/intent-assessment.md`.
- New `tests/contract/intent-assessment-report.test.mjs` (28+ assertions) +
  `tests/docs/intent-assessment-report.test.mjs` (12 assertions).
- Updated ~18 supporting docs + CHANGELOG + README + this review packet.

## PUBLIC API CHANGES

- New exported artifact type `IntentAssessmentReport` and its factory /
  validator / assert / schema from `@rekon/kernel-repo-model`.
- New `buildIntentAssessmentReport` + `INTENT_ASSESSMENT_REPORT_ARTIFACT_ID_PREFIX`
  + six structural `Like` types from `@rekon/capability-model`.
- New `rekon intent assess` CLI command. No existing API changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon has the full intelligence spine needed to judge
  readiness but lacked a first-class artifact that assesses a user request
  before preparation. Classic intent assessment checked actionability, gates,
  verification state, and staleness; Rekon must do the equivalent and
  additionally fold the step / handoff / runtime-drift spine into readiness.
- **Guarantee preserved.** `IntentAssessmentReport` is an assessment artifact,
  not a `WorkOrder`. It captures request / scope / readiness / blockers /
  warnings / missing context / matched context; consumes existing artifacts
  read-only; recommends a next action without preparing phases or executing
  work; and blocks or warns when critical context is stale, missing, drifted,
  uncovered, or unverified. It creates no `WorkOrder` / `VerificationPlan`,
  runs nothing, and writes no source.

## CODEBASE-INTEL ALIGNMENT

Implements the IntentAssessmentReport v1 decision (`45f9cd0`) and the
integration review's recorded classic-source finding: classic intent readiness
was gate-based plus hash/staleness-based and did not consume the
step/handoff/runtime-drift spine. Rekon extends parity by wiring the graph
spine into readiness — recorded honestly as a Rekon-native extension, not
literal classic behavior. Nothing from classic codebase-intel is imported.

## ARTIFACT MODEL

`IntentAssessmentReport` { header, request, source(14 optional refs), readiness
(status, score?, recommendedNextAction), matchedContext(systems, capabilities,
steps, paths), blockers[], warnings[], missingContext[] }. Factory normalizes
the request, dedupes + sorts each entry list by (severity, category, id),
sorts matched-context arrays, and asserts; validator enforces enums, unique
ids per list, non-empty fields, and ref validity. Category `actions`.

## REQUEST / SCOPE MODEL

`request` is the only required input: `goal` (required), `kind` (bug / feature
/ refactor / investigation / migration / unknown; defaults unknown), optional
`scope` (paths / systems / capabilities / steps), optional `constraints` /
`nonGoals`. Scope hints are advisory; an unmappable scope yields
`insufficient-context` with a `scope-ambiguous` entry.

## READINESS MODEL

Statuses `ready-for-prepare` / `blocked` / `needs-review` /
`insufficient-context` / `stale-context`, with optional `score` and a required
`recommendedNextAction`. Precedence: stale-context > blocked >
insufficient-context > needs-review > ready-for-prepare. `recommendedNextAction`
is a strict 1:1 map of the status (run-verification reserved for future use).

## BLOCKER MODEL

Uniform `IntentAssessmentBlocker` (id, category, severity, message, optional
`sourceRefs`) across blockers / warnings / missingContext. Categories:
missing-artifact / stale-context / runtime-drift / handoff-coverage /
finding-governance / proof-missing / scope-ambiguous / source-write-unavailable.
Missing required spine → high blockers; high drift / unresolved-contract →
blockers; uncovered / parse-errors / missing optional inputs → warnings.

## MATCHED CONTEXT MODEL

`matchedContext` resolves the request scope into systems / capabilities /
steps / paths, augmented by `StepCapabilityGraph` steps (systems + paths for
matched step ids) and `CapabilityMap` entries (systems for matched
capabilities) where deterministic. An empty match → `insufficient-context`. No
LLM matching in v1.

## CLI SURFACE

`rekon intent assess --goal <text> [--root] [--json] [--kind] [--path]
[--system] [--capability] [--step] [--constraint] [--non-goal]`. Resolves the
latest available context artifacts, writes one `IntentAssessmentReport` under
`actions/`, and prints the readiness summary plus the boundary statement. List
flags accept repeats and comma-separated values. Missing `--goal` exits
non-zero.

## BOUNDARY MODEL

IntentAssessmentReport is assessment, not WorkOrder; it does not create
WorkOrder / VerificationPlan, execute commands, or write source.
RuntimeGraphDriftReport is an input to readiness, not the intent system itself.
PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go
remain deferred.

## TESTS / VERIFICATION

- Contract test (28+ assertions): validation, missing-goal failure, missing
  spine blockers, drift / coverage / freshness / proof signals, matched
  context, readiness precedence, action mapping, factory ordering, and CLI
  behavior (writes report, requires goal, supports kind + scope flags, creates
  no WorkOrder / VerificationPlan / VerificationRun, writes no source, leaves
  `artifacts validate` clean).
- Docs test (12 assertions): artifact + concept docs, eight boundary
  statements, CHANGELOG mention, this packet's PURPOSE PRESERVATION CHECK.
- Full gate: typecheck, test, build, `git diff --check`, audit-package-exports,
  audit-license, publish-dry-run, install-smoke, install-tarball-smoke, plus
  the CLI smoke matrix.

## INTENTIONALLY UNTOUCHED

Every existing artifact type, schema, validator, factory, and CLI command; the
graph spine (`StepCapabilityGraph` / `HandoffContract` / `HandoffCoverageReport`
/ `RuntimeGraphObservationReport` / `RuntimeGraphDriftReport`); `WorkOrder` /
`VerificationPlan` / `VerificationRun` / `VerificationResult` /
`PathFreshnessReport`; `PreparedIntentPlan` / `IntentStatusReport` /
`IntentGoDecision` (deferred); all version numbers; classic codebase-intel (not
imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- PathFreshnessReport staleness uses per-entry `changed` / `missing` status and
  top-level `stale` status; the scope-relevance heuristic is path-prefix based
  and documented as conservative.
- VerificationResult proof uses the top-level `passed` / `failed` / `partial` /
  `not-run` status; richer per-command analysis can deepen later.
- `source-write-unavailable` is reserved (the request carries no source-write
  flag in v1); it is unemitted until a source-write policy is decided.
- Matched-context augmentation is deterministic and light (no LLM); deeper
  scope resolution can follow without changing the artifact type.

## NEXT STEP

IntentAssessmentReport safety review — review the assessment artifact before
the PreparedIntentPlan v1 decision. Still no `PreparedIntentPlan`, no
`WorkOrder` / `VerificationPlan` creation, no command execution, and no source
writes.
