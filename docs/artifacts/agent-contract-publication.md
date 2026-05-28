# Agent Operating Contract Publication

## Purpose

The agent operating contract is an instruction-grade `Publication`
that tells a coding agent how to operate in this repository before
it edits any code. It rolls up ownership, capabilities, current
governance state, proof-loop status, ranked operator memory, required
checks, anti-gaming guardrails, and recommended next actions into a
single document.

It is the Rekon-native equivalent of the classic generated agent /
context docs. See the **Generated Docs / Agent Docs** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and the **P1.3 Agent-operating-contract publication** guarantee in
[../strategy/classic-guarantee-regression-plan.md](../strategy/classic-guarantee-regression-plan.md).

## Produced By

- `@rekon/capability-docs.agent-contract` (a publisher handler
  inside the existing `@rekon/capability-docs` capability).

## Consumed By

- Coding agents and humans who need a single operating contract
  before editing the repository.
- Future PR/check publishers may consume this artifact as a
  "what the agent saw" attestation. Deferred.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`Publication`. The header carries:

- `producer.id` = `@rekon/capability-docs`.
- `inputRefs` cite every artifact actually read: at minimum the
  `IntelligenceSnapshot`; additionally any of `ObservedRepo`,
  `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`,
  `FindingLifecycleReport`, `WorkOrder`, `ReconciliationPlan`,
  `VerificationPlan`, `VerificationResult`, and `MemorySelection`
  when they are present.
- `freshness.status` mirrors the snapshot's freshness at write
  time.

## Shape

The publication uses the existing `PublicationArtifact` shape with
the extended `kind` enum:

```ts
type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary" | "architecture-summary" | "proof-report" | "agent-contract";
  title?: string;
  path: string;
  format: "markdown";
  content: string;
};
```

For the agent contract:

- `kind` = `"agent-contract"`.
- `title` = `"Rekon Agent Operating Contract"`.
- `path` = `.rekon/artifacts/publications/agent-contract.md`.
- `format` = `"markdown"`.
- `content` is the rendered markdown.

## Content Structure

The publication contains, in fixed order:

1. **Title + metadata** — generated timestamp, snapshot id.
2. **How To Use This Contract** — read before editing; do not treat
   as canonical truth.
3. **Canonical Truth** — `.rekon/artifacts` is the source of truth;
   this is a derived publication that may be stale.
4. **Operating Rules** — durable agent rules: resolve before edit,
   no cross-owner without seam, no completion without proof,
   anti-gaming on tests/validators/ledgers/scripts, no mutation to
   hide unresolved work, publications are guidance.
5. **Resolver Workflow** — route → seam (if cross-owner) → preflight;
   issue → seam/preflight; commands; resolver trace mention.
6. **Ownership And Capabilities** — system table (up to 10) from
   `ObservedRepo`, capability bullets (up to 10) from
   `CapabilityMap`, ownership entry count from `OwnershipMap`. When
   missing: "Run `rekon refresh`."
7. **Active Governance State** — active/accepted/ignored/resolved
   counts, severity breakdown, top affected paths, remediation
   queue priorities (`P0/P1/P2`), plus the lifecycle summary line
   when present. The counts are labeled `governed issue groups`
   when the `CoherencyDelta` was built from an
   `IssueAdjudicationReport`, otherwise `findings`. A short
   preface states which mode is in effect. When the
   `CoherencyDelta` is missing: "Run `rekon coherency delta` or
   `rekon refresh`." The **Governed Issue Groups** subsection
   follows: active/accepted/ignored/resolved/mixed group counts,
   the member-finding total, the top 5 active groups by id with
   severity / title / member count, and the line `Use
   `rekon resolve issue --issue <group-id>` for adjudicated issue
   context.` When no `IssueAdjudicationReport` is indexed, the
   subsection emits a "run `rekon refresh`" hint and warns the
   reader that raw lifecycle totals may overstate drift. The
   **Accepted Issue Merge Roll-ups** subsection follows: one
   bullet per merged rollup item derived from `CoherencyDelta`
   v3 (where `mergedIssueGroupIds.length > 1`), naming the
   rollup id, member group ids, member finding count, decision
   id(s), severity, and active flag, plus the instruction to
   "inspect every member group and finding id before editing"
   and "Use `rekon resolve issue --issue <group-id>` for context
   on any member group." When no accepted roll-ups exist, the
   subsection says so explicitly; when no `CoherencyDelta`
   exists, it instructs the operator to run `rekon coherency
   delta`. See
   [../concepts/issue-merge-decisions.md](../concepts/issue-merge-decisions.md).
   The **Finding Filter Health** subsection follows, sourced
   from [`FindingFilterReport`](finding-filter-report.md) +
   [`FindingFilterHealthReport`](finding-filter-health-report.md).
   When both artifacts exist, the subsection lists kept /
   filtered counts, filter rate, active policy count, and
   warning count. When `FindingFilterHealthReport.alerts` is
   non-empty, a blockquote line "Filter-health warnings exist.
   Do not assume active governance is complete until filtered
   findings are reviewed." precedes a bulleted list of up to
   five alert `code` + `message` entries. The subsection always
   closes with "If filter rate is high or policy warnings exist,
   inspect `FindingFilterReport.filteredFindings` before
   claiming the repo has no active issues." Missing artifacts
   produce `rekon findings filter` / `rekon refresh` hints.
   See [../concepts/finding-filters.md](../concepts/finding-filters.md).
   The **Finding Filter Policy Suggestions** subsection
   follows, sourced from
   [`FindingFilterPolicySuggestionReport`](finding-filter-policy-suggestion-report.md).
   When the report exists, the subsection lists `Suggestions
   available`, `High confidence`, and
   `Low confidence requiring --force` counts, followed by an
   advisory blockquote ("Filter policy suggestions are
   advisory. Do not assume they are applied.") and up to five
   `<id> — <confidence> — <reason> — affected findings: <n>`
   bullets. Always closes with "Ask the operator before
   applying filter policy suggestions. Do not mutate
   `.rekon/config.json` unless explicitly instructed.…" The
   `Do Not Do` section adds two reminders: "Do not apply
   filter policy suggestions without explicit operator
   approval; run `rekon findings filter-policy apply <id>`
   only when the operator instructs it." and "Do not treat
   filter policy suggestions as already-applied config; they
   are advisory until `rekon findings filter-policy apply`
   writes them to `.rekon/config.json`." When the suggestion
   report does not cite the latest `FindingFilterReport`, the
   subsection emits a stale banner pointing operators back to
   `rekon findings filter-policy suggest`. Missing report
   emits an explicit `rekon findings filter-policy suggest`
   hint. See
   [../concepts/finding-filter-policy-suggestions.md](../concepts/finding-filter-policy-suggestions.md).
   The **Finding Filter Policy Freshness** subsection follows,
   comparing the current `.rekon/config.json` `findingFilters`
   fingerprint against the fingerprint stamped on the latest
   `FindingFilterReport`. Status is `fresh` / `stale` /
   `missing` / `unknown`. On `stale`, the subsection emits a
   blockquote: "Do not rely on active governance until
   `rekon refresh` rebuilds findings with the current
   `findingFilters` config." `missing` / `unknown` emit the
   same recommendation. The `Do Not Do` section adds a third
   filter-related reminder: "Do not rely on active issue /
   coherency counts after `.rekon/config.json` `findingFilters`
   changed until `rekon refresh` has rebuilt the filter chain
   with the current policy set."
8. **Proof And Verification State** — presence/missing for
   remediation WorkOrder, resolver WorkOrder, ReconciliationPlan,
   VerificationPlan, VerificationResult. Also surfaces (P1.1
   verification-proof-surfaces-v2):
   - `Proof source: manual / runner-derived / unknown` — derived
     by `summarizeVerificationProofSurface` from the result's
     `header.inputRefs` (a `VerificationRun` ref means
     runner-derived) and `recordedBy` (`rekon.local.exec@<version>`
     matches the in-tree runner).
   - `Proof freshness: fresh / stale / missing-plan / unknown` —
     compares the result's plan ref against the latest indexed
     plan.
   - For `failed` / `partial` / `not-run` results: agent
     instructions to treat proof as incomplete, not claim
     completion, and re-run verification.
   - For `stale` / `missing-plan` freshness: agent instructions to
     not rely on stale proof and run / request verification for
     the latest plan.
   - For passing fresh results: `passed does not auto-resolve
     findings`.
   - When the runner-derived result cites a `VerificationRun`,
     adds a `Runner-derived proof cites VerificationRun:<id>.`
     line.
9. **Memory Guidance** — table of ranked `MemorySelection`
   entries (up to 10) with Score, Instruction, Scope, Reasons.
   Entries without explicit `reasons` are excluded — only ranked
   memory appears. When no selection: "Run `rekon memory select
   --path <path> --goal <goal>`."
10. **Required Checks** — commands from the latest
    `VerificationPlan` when present, otherwise the default
    typecheck/test/build + `rekon artifacts validate` + `rekon
    artifacts freshness` list.
11. **Do Not Do** — explicit anti-gaming reminders.
12. **Next Recommended Actions** — derived from current artifact
    state (run refresh if no coherency delta, intent remediation if
    active findings without a remediation work order, reconcile
    suggest if no plan, verify record if no result, address
    failures if not-passed, memory select if no selection;
    otherwise proceed with scoped changes).
13. **Input Artifacts** — bullet list of every `ArtifactRef` cited
    in `header.inputRefs`.

## Memory Guidance

The Memory Guidance section reads the latest `MemorySelection` and
renders only ranked items (those with a non-empty `reasons` array).
Each row carries:

- `Score` — the v1 ranker's clamped 0..1 score.
- `Instruction` — the operator-supplied guidance.
- `Scope` — a compact summary of `paths` / `systems` /
  `capabilities` / `tags` that scoped the entry.
- `Reasons` — semicolon-separated tokens from the ranker
  (`path-prefix-match: src`, `verified`, `high-priority`, etc.).

Memory enriches guidance but never rewrites ownership, rules, or
findings. The contract test
`preflight resolver includes selected memory but does not mutate
ownerSystems or finding status` in
`tests/contract/memory-ranking-curation.test.mjs` pins this
invariant; the agent contract surfaces the same ranked output
without changing the architecture facts the rest of the publication
already cites.

## Failure Visibility

Failed, partial, and not-run verification states are always visible
in the Proof And Verification State section. The publication never
hides incomplete proof: it renders an explicit
`> Verification is not complete.` callout and lists the per-status
counts. Passing verification renders an explicit
`> Verification recorded as passed. This does not automatically
resolve findings.` callout so an agent reading the contract does not
treat passing checks as automatic finding resolution.

## CLI Surface

```sh
rekon publish agent-contract --root <repo> --json
rekon publish run @rekon/capability-docs.agent-contract --root <repo> --json
rekon publish list --root <repo> --json
rekon agent-contract export --root <repo> --output <path> [--force] --json
```

The first three commands produce the same `Publication` artifact.
`rekon agent-contract export` materializes that Publication's
content to an operator-chosen path under the repo root.

## Root AGENTS.md

`rekon publish agent-contract` writes only to
`.rekon/artifacts/publications/agent-contract.md`. It **does not**
overwrite the repository's root `AGENTS.md` or inject content into
`CLAUDE.md` or any other root file.

`rekon agent-contract export --output <path>` is the explicit
operator-driven path:

- The output path must resolve inside the repo root. Absolute paths
  outside the root and relative paths that escape the root with
  `..` are rejected.
- Existing files require `--force` to overwrite.
- Protected agent-instruction paths (`AGENTS.md`, `CLAUDE.md`
  case-insensitive; `.cursor/rules/*.md`;
  `.github/copilot-instructions.md`) require `--force` and the
  result reports `protectedPath: true`.
- The exported file begins with a generated preamble citing the
  source `Publication:<id>`, declaring the file is not canonical
  truth, and pointing to `.rekon/artifacts` plus the regenerate
  command.
- If no `agent-contract` Publication exists, the command
  auto-publishes one and then exports it.

JSON output shape:

```json
{
  "outputPath": "AGENTS.rekon.md",
  "absolutePath": "/abs/path/to/AGENTS.rekon.md",
  "publicationRef": {
    "type": "Publication",
    "id": "agent-contract-<timestamp>",
    "schemaVersion": "0.1.0"
  },
  "forced": false,
  "protectedPath": false,
  "wrote": true,
  "message": "Overwrote protected agent instruction file because --force was provided."
}
```

`message` is only present when the export overwrote an existing
file with `--force`.

The recommended export target is `AGENTS.rekon.md` in the repo
root. That name is not in the protected list and clearly signals to
readers that the file is generated by Rekon.

## Freshness And Provenance

The publication's `freshness.status` mirrors the snapshot's
freshness. `rekon artifacts freshness --type Publication` marks an
older agent contract `stale` once any newer cited input artifact
lands — `MemorySelection`, `VerificationResult`, `CoherencyDelta`,
`WorkOrder`, etc. Rebuild with `rekon publish agent-contract` (or
include it in a future `rekon refresh` extension).

## What This Is Not

- Not canonical architecture truth. The publication cites its
  inputs.
- Not a substitute for the architecture summary or the proof
  report. The architecture summary covers the broader governance
  loop; the proof report zooms into the latest plan/result; the
  agent contract is the agent-facing operating contract that
  combines them with operating rules, memory guidance, and
  anti-gaming language.
- Not a verification runner. Required checks are listed; commands
  are not executed.
- Not a memory-curation surface. Memory is read; entries are not
  mutated.
- Not a root-file writer. No root `AGENTS.md` overwrite by default.

## Merge Decision Freshness

When `CoherencyDelta` carries accepted merge roll-ups,
the agent operating contract renders a `### Merge
Decision Freshness` subsection right below
`### Accepted Issue Merge Roll-ups`. The subsection
emits compact `Merge decisions / Adjudication /
Lifecycle: fresh|stale` lines plus a recommended
`rekon refresh` command. When any rule fires, the
publication prepends a callout: *"Do not rely on
accepted merge roll-ups until `rekon refresh`
rebuilds adjudication and coherency state."* The
`Do Not Do` list also includes the corresponding
agent-facing reminder. See
[issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md).

## Merge Candidate Decisions

When the latest `IssueAdjudicationReport.mergeCandidates`
is non-empty, the agent operating contract renders a
`### Merge Candidate Decisions` subsection with a
compact `Merge candidate decisions:` bullet list
(`Undecided` / `Accepted` / `Rejected` counts). When
undecided candidates exist, the section instructs the
agent to *"Ask the operator to review undecided
candidates before treating merge roll-ups as final."*
and gives the command
(`rekon issues merge candidates --undecided --json`).
A new `Do Not Do` reminder warns the agent against
assuming advisory merge candidates are accepted. See
[issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md).

## CapabilityMap v2 Phrase-Backed Capabilities

The agent contract renders a **`### CapabilityMap
v2 Phrase-Backed Capabilities`** subsection
sourced from the latest `CapabilityMap` when the v2
fields (`phraseBackedCapabilities`,
`phraseBackedSummary`, `phraseSourceRef`) are
populated. The subsection sits inside the
operating-state group, after `### Capability
Phrases`, and surfaces:

- the `CapabilityMap` ref;
- the consumed `CapabilityPhraseReport` ref
  (`phraseSourceRef`);
- `total` / `withDomain` / `withPattern` /
  `withLayer` counts from
  `phraseBackedSummary`;
- top-verb / top-noun summaries when available;
- a boundary statement (*"These entries are
  projection context, not `CapabilityContract`
  placement policy. `CapabilityMap` v2 does not
  imply placement policy, ownership policy,
  resolver routing, architecture linting,
  verification planning, or source writes."*);
- a proof-report-deferral line; and
- a bounded table capped at 20 phrase-backed
  capabilities.

The agent contract's `## Do Not Do` list carries a
verbatim reminder: *"Do not treat `CapabilityMap`
v2 phrase-backed capabilities as
`CapabilityContract` policy, resolver routing
authority, architecture lint findings, verification
requirements, or source-write permission.
`CapabilityMap` v2 phrase-backed capabilities are
stable capability projection; they are not
placement policy, ownership policy, or source-write
authority."*

**Publications are read-only over `CapabilityMap`:**
the agent contract publisher reads the latest
`CapabilityMap` and never mutates `CapabilityMap`,
never mutates `CapabilityPhraseReport`, never
mutates `CapabilityNormalizationReport`, never
mutates `EvidenceGraph`, and never re-runs `rekon
capability phrase project` or `rekon refresh`.
When the latest `CapabilityMap` has no v2 fields,
the subsection renders no-report guidance and
still emits the boundary statement.

See
[`CapabilityMap` artifact reference](capability-map.md).
The publication surfacing passed a
[publication safety review](../strategy/capability-map-v2-publication-safety-review.md)
(next slice: `CapabilityContract` architecture
decision).

## Capability Contracts

The agent contract also renders a **`###
Capability Contracts`** subsection sourced from
the latest `CapabilityContract` (thirty-fifth
slice on the capability-ontology track). The
subsection sits inside the operating-state group,
after `### CapabilityMap v2 Phrase-Backed
Capabilities`, and surfaces:

- the `CapabilityContract` ref;
- the source `CapabilityMap` ref;
- the optional config path
  (`.rekon/capability-contracts.json`);
- summary counts (`total` / `configured` /
  `unmatched` / `suggested` /
  `withRequiredChecks` / `withPlacementRules` /
  `withPreservationRules`);
- the boundary statement (*"CapabilityContract is
  policy visibility only; this publication does
  not enforce linting, routing, verification
  planning, or source writes."*); and
- a bounded contract table capped at 20 rows
  (`| Status | Verb | Noun | Domain | Layer |
  Checks | Rules |`).

The agent contract's `## Do Not Do` list carries
a verbatim reminder: *"Do not treat
`CapabilityContract` publication surfacing as
architecture linting, resolver routing,
verification planning, finding resolution,
`RefactorPreservationContract`, or source-write
permission. The `CapabilityContract` section in
this contract is policy visibility only;
configured / unmatched rows are operator-authored
policy records, not enforced behavior."*

**Publications are read-only over
`CapabilityContract`:** the agent contract
publisher reads the latest `CapabilityContract`
and never mutates `CapabilityContract`, never
mutates `.rekon/capability-contracts.json`,
never mutates `CapabilityMap`, never mutates
`CapabilityPhraseReport`, never mutates
`EvidenceGraph`, and never re-runs `rekon
capability contract generate`. When no
`CapabilityContract` exists, the subsection
renders no-contract guidance pointing operators
at `rekon capability contract generate --json`
and still emits the boundary statement. Proof
report surfacing of `CapabilityContract` is
explicitly **deferred**. See the
[`CapabilityContract` artifact reference](capability-contract.md),
the
[`CapabilityContract` v1 Safety Review](../strategy/capability-contract-v1-safety-review.md),
and the
[`CapabilityContract` publication safety review](../strategy/capability-contract-publication-safety-review.md)
— thirty-sixth slice; declares this surfacing safe /
stable as read-only visibility.

## Capability Architecture Linting

The agent contract also renders a **`### Capability
Architecture Linting`** subsection sourced from the
latest `CapabilityArchitectureLintReport` (**fortieth
slice** on the capability-ontology track), inside the
operating-state group after `### Capability Contracts`.
It surfaces the lint report ref, the source
`CapabilityContract` + `CapabilityMap` refs, summary
counts (`total` / `violations` / `passes` /
`notEvaluated`), optional byRule / bySeverity lines, and
a bounded lint-row table (`| Status | Rule | Contract |
Capability | Severity | Confidence | Message |`, capped
at 20 rows). When no report exists, the subsection
renders no-report guidance pointing operators at `rekon
capability lint architecture --json`.

The agent contract's `## Do Not Do` list carries a
verbatim reminder: *"Do not treat
`CapabilityArchitectureLintReport` publication surfacing
as FindingReport mutation, lifecycle mutation,
CoherencyDelta remediation, resolver routing,
verification planning, RefactorPreservationContract, or
source-write permission. The Capability Architecture
Linting section is evaluation visibility only; violation
rows are policy-evaluation signals, not governed
findings, and findingCandidate is preview-only."*

**Publications are read-only over
`CapabilityArchitectureLintReport`:** the agent contract
publisher reads the latest lint report and never mutates
the lint report, `CapabilityContract`, `CapabilityMap`,
`FindingReport`, `FindingFilterReport`,
`FindingLifecycleReport`, or `CoherencyDelta`, and never
re-runs `rekon capability lint architecture`. Proof
report surfacing of `CapabilityArchitectureLintReport`
is explicitly **deferred**. See the
[`CapabilityArchitectureLintReport` artifact reference](capability-architecture-lint-report.md),
the
[capability-aware architecture linting concept](../concepts/capability-aware-architecture-linting.md),
the
[`CapabilityArchitectureLintReport` safety review](../strategy/capability-architecture-lint-report-safety-review.md),
and the
[`CapabilityArchitectureLintReport` publication safety review](../strategy/capability-architecture-lint-publication-safety-review.md)
— forty-first slice; declares this surfacing safe /
stable as read-only visibility.

## Cross-References

- [Agent contract concept](../concepts/agent-operating-contract.md)
- [Architecture summary publication](architecture-summary-publication.md)
- [Proof report publication](proof-report-publication.md)
- [MemorySelection](memory-selection.md)
- [Memory concept](../concepts/memory.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md)
- [Issue merge decision publication / detail polish](../strategy/issue-merge-decision-publication-detail-polish.md)
- [Capability model](../strategy/capability-model.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
- [Watcher / path freshness policy decision](../strategy/watcher-path-freshness-policy-decision.md) —
  this publication is the primary surface for the agent
  contract refresh-after-edit policy. A future `###
  Working Tree Freshness` subsection will render with
  the path-freshness implementation slice; the existing
  `### Governance Freshness` subsection covers
  artifact-lineage freshness only.
- [PathFreshnessReport](path-freshness-report.md) +
  [Path freshness concept doc](../concepts/path-freshness.md) —
  the agent contract **now renders a `### Working
  Tree Path Freshness` subsection** sourced from the
  latest `PathFreshnessReport`. The subsection sits
  between the Verification Proof Status block and
  Memory Guidance, surfaces the report ref, baseline
  ref (if any), refresh recommendation, and a
  bounded per-path table (cap 20 non-fresh entries).
  A new entry in the agent contract's `## Do Not Do`
  list pins: *"Do not treat artifact lineage
  freshness as proof that the working tree has not
  changed; check the latest PathFreshnessReport via
  `rekon paths freshness --json` and run `rekon
  refresh` if the report is stale."* The latest
  `PathFreshnessReport` is cited in
  `header.inputRefs` when present. **Publication
  generation is read-only with respect to
  working-tree freshness: it never runs `rekon paths
  freshness` and never runs `rekon refresh`.**
- **Capability ontology suggestion publication
  surfacing.** The agent contract publisher reads
  the latest `CapabilityOntologySuggestionReport`
  and renders a `### Capability Ontology
  Suggestions` subsection. The publisher also
  appends a `Do Not Do` reminder pinning that the
  report is preview-only — entries are **not
  applied vocabulary**, and the operator must
  apply proposed
  `.rekon/capability-ontology.json` changes
  manually outside the publication. The latest
  report is cited in `header.inputRefs` when
  present. **Publication generation is read-only
  with respect to ontology state: it never mutates
  `.rekon/capability-ontology.json`, never mutates
  the `CapabilityNormalizationReviewLedger`, never
  writes a new
  `CapabilityOntologySuggestionReport`, and never
  mutates `CapabilityMap`.** When no report
  exists the subsection renders no-report
  guidance.
