# Agent Operating Contract

A coding agent that has not been told the operating contract of a
repository will guess. It will infer architecture from whatever files
it happens to read, miss current findings or proof state, ignore
repo-specific rules, and repeat operator-corrected mistakes. The
agent operating contract publication is the small, current, generated
document that closes that gap.

It is the Rekon-native preservation of the workflow guarantee classic
`AGENTS.md` / `CLAUDE.md` style generated docs provided: surface the
required checks, owner systems, anti-gaming policy, resolver flow,
and current proof state in a medium agents reliably read — before
they edit code.

For the audit anchor, see the **Generated Docs / Agent Docs** entry
in [../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and the **P1.3** guarantee in
[../strategy/classic-guarantee-regression-plan.md](../strategy/classic-guarantee-regression-plan.md).

## Why It Exists

Before this batch the closest Rekon publication was the architecture
summary, which is broad and audience-neutral, or the `agents` /
`repo-summary` doc, which is a thin indexed-intelligence summary.
Neither was an opinionated operating contract that an agent could
read in 30 seconds and operate from.

The agent operating contract is opinionated on purpose:

- it states durable operating rules ("resolve before edit", "do not
  claim completion without a VerificationResult", anti-gaming);
- it surfaces the resolver flow as the way work starts;
- it shows current ownership, capabilities, and governance state;
- it includes ranked memory guidance with scores and reasons;
- it lists required checks and a do-not-do list;
- it recommends the next concrete command.

Everything in the document derives from artifacts. The publication
itself is downstream. It cites every input it read and can be
regenerated from those inputs at any time.

## How It Is Built

`rekon publish agent-contract` invokes the
`@rekon/capability-docs.agent-contract` publisher inside
`@rekon/capability-docs`. The publisher:

1. Reads the latest `IntelligenceSnapshot` (required; throws with
   a "Run `rekon refresh` first" message when missing).
2. Reads the latest `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
   `CoherencyDelta`, `FindingLifecycleReport` if present.
3. Reads the latest remediation `WorkOrder` (where `source ===
   "coherency-delta"`) and the latest resolver `WorkOrder` if either
   exists.
4. Reads the latest `ReconciliationPlan` if present.
5. Reads the latest `VerificationPlan` ref directly (so it can flag
   a stale-plan mismatch) and the latest `VerificationResult` if
   present.
6. Reads the latest `MemorySelection` if present.
7. Renders the markdown contract.
8. Writes a `Publication` artifact with `kind = "agent-contract"`
   and full `header.inputRefs`.

If an optional input is missing, the corresponding section renders
the next command the operator should run instead of pretending the
state is current.

## Section Map

| Section | Renders when... | Source artifacts |
| --- | --- | --- |
| How To Use This Contract | always | n/a |
| Canonical Truth | always | n/a |
| Operating Rules | always | n/a (durable rules) |
| Resolver Workflow | always | n/a (durable flow) |
| Ownership And Capabilities | `ObservedRepo` and/or `CapabilityMap` present | `ObservedRepo`, `OwnershipMap`, `CapabilityMap` |
| CapabilityMap v2 Phrase-Backed Capabilities | `CapabilityMap` v2 fields present | `CapabilityMap` (rendered as `### CapabilityMap v2 Phrase-Backed Capabilities`; projection context only — **not** placement policy, ownership policy, resolver routing authority, architecture lint findings, verification requirements, or source-write permission). See the [publication safety review](../strategy/capability-map-v2-publication-safety-review.md). The [`CapabilityContract` v1 artifact](../artifacts/capability-contract.md) has shipped (thirty-third slice) as the policy layer that consumes `CapabilityMap` v2; v1 is **diagnostic only**. The [`CapabilityContract` v1 safety review](../strategy/capability-contract-v1-safety-review.md) has shipped (thirty-fourth slice) and selects publication surfacing as the next slice — read-only visibility only, no enforcement. Agent contract surfacing of `CapabilityContract` is the next slice on the track; until that slice + its own safety review land, `CapabilityContract` is **not** surfaced in this contract. |
| Active Governance State | `CoherencyDelta` present | `CoherencyDelta`, `FindingLifecycleReport`, `IssueAdjudicationReport`, `FindingFilterReport`, `FindingFilterHealthReport`, `FindingFilterPolicySuggestionReport` (Governed Issue Groups + Accepted Issue Merge Roll-ups + Finding Filter Health + Finding Filter Policy Freshness + Finding Filter Policy Suggestions + Governance Freshness subsections) |
| Proof And Verification State | always | `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, `VerificationResult` |
| Memory Guidance | always (table only when ranked items exist) | `MemorySelection` |
| Required Checks | always | `VerificationPlan.commands` (default fallback) |
| Do Not Do | always | n/a (durable rules) |
| Next Recommended Actions | always | derived from current state |
| Input Artifacts | always | `header.inputRefs` |

## Memory Guidance In Particular

The Memory Guidance section reads the v1 ranked memory output.
Entries that lack `reasons` are intentionally excluded; the
publication only carries memory it can explain. Each row shows:

- the clamped 0..1 score from the v1 ranker;
- the operator-supplied instruction;
- a compact scope summary (paths / systems / capabilities / tags);
- the ranked reasons (`path-prefix-match: src`, `verified`,
  `high-priority`, `fresh-within-30-days`, etc.).

Memory enriches guidance but never rewrites ownership, rules, or
findings. The architecture summary, the proof report, and the
underlying canonical artifacts remain the source of truth for
those.

## Failure Visibility

The Proof And Verification State section never hides incomplete
proof. A `failed`, `partial`, or `not-run` `VerificationResult`
surfaces an explicit `> Verification is not complete.` callout. A
`passed` result surfaces `> Verification recorded as passed. This
does not automatically resolve findings.` so an agent does not
treat passing checks as automatic finding closure. When the latest
`VerificationResult` references an older plan, the publication
surfaces a stale-plan callout consistent with the architecture
summary's behavior.

P1.1 verification-proof-surfaces-v2 adds:

- `Proof source: manual / runner-derived / unknown` and
  `Proof freshness: fresh / stale / missing-plan / unknown`
  lines so agents see how the proof was produced and whether
  it is current.
- Explicit agent instructions for incomplete proof
  (`Treat proof as incomplete. Do not claim completion. Re-run
  verification or ask the operator for proof.`) and stale
  proof (`Do not rely on stale proof. Run or request
  verification for the latest plan.`).
- New `Do Not Do` entries:
  - `Do not treat passed verification as automatic finding
    resolution; status changes require explicit
    lifecycle/status artifacts.`
  - `Do not treat stale, partial, failed, timeout, killed, or
    not-run verification as proof of completion.`

## Accepted Issue Merge Roll-ups

When `CoherencyDelta` v3 carries merged rollup items derived from
operator-accepted `IssueMergeDecisionLedger` decisions, the
contract renders an `Accepted Issue Merge Roll-ups` subsection
under `Active Governance State`. Each bullet names the rollup id,
its underlying group ids, the decision id(s) that produced it,
the member finding count, the worst severity in the bucket, and
whether the rollup is active. The subsection also instructs
agents to inspect every member group and finding id before
editing and points them at `rekon resolve issue --issue
<group-id>` for context on any member group. The contract reads
this signal from `CoherencyDelta` only — it does not consume the
ledger directly, so the rollup display stays in lockstep with
whatever `CoherencyDelta` was indexed last. The `Do Not Do`
section adds an explicit reminder that a merged rollup does not
mutate the raw `IssueAdjudicationReport` groups; agents must
still inspect `mergedIssueGroupIds` and `memberFindingIds` before
acting. See
[issue-merge-decisions.md](issue-merge-decisions.md) and
[coherency-delta.md](coherency-delta.md).

## Finding Filter Health

The contract renders a `Finding Filter Health` subsection under
`Active Governance State` so agents see when active governance is
heavily filtered. Sourced from
[`FindingFilterReport`](../artifacts/finding-filter-report.md) +
[`FindingFilterHealthReport`](../artifacts/finding-filter-health-report.md).
The subsection lists kept / filtered counts, filter rate, active
policy count, warning count, and a dedicated graph-aware filtered
count. When `graphAwareFiltered > 0`, the subsection adds an
explicit instruction: "If graph-aware filtering is high, inspect
`FindingFilterReport.filteredFindings` for the structural evidence
(sibling-file existence, import-graph facts, capability ownership,
module-kind routing) before drawing conclusions." When the health
report carries any alerts, a blockquote "Filter-health warnings
exist. Do not assume active governance is complete until filtered
findings are reviewed." precedes a bulleted list of up to five
alert `code` + `message` entries (including the new
`graph-aware-filter-dominance` and `graph-aware-reason-dominance`
codes when their thresholds are met). The subsection always
closes with "If filter rate is high or policy warnings exist,
inspect `FindingFilterReport.filteredFindings` before claiming
the repo has no active issues." Missing filter artifacts produce
explicit `rekon findings filter` / `rekon refresh` hints. The
`Do Not Do` section carries three filter-related reminders:
"Do not treat a clean active-governance surface as proof that
no raw findings exist; inspect FindingFilterReport when
filter-health warnings exist or the filter rate is high.";
"Do not treat graph-aware filtering as proof that the
underlying issue never existed; inspect
`FindingFilterReport.filteredFindings` for the structural
evidence (sibling-file existence, import-graph facts,
capability ownership, module-kind routing) before drawing
conclusions."; and the new "Do not treat detector-detail
fallback filtering as equivalent to EvidenceGraph-backed
structural evidence. When `Graph-aware evidence sources`
shows `DetectorDetails` entries, review them more critically
than `EvidenceGraph` entries — the detector's claim was not
corroborated by artifact evidence." (graph-aware import
evidence publication diagnostics slice).

After the same diagnostics slice, the Finding Filter
Health subsection also renders a compact
`Graph-aware evidence sources:` list under the existing
graph-aware audit instruction when graph-aware filtering
exists. The list shows per-source counts
(`EvidenceGraph` / `DetectorDetails` / `ObservedRepo`)
so agents can tell at a glance whether graph-aware
suppression is artifact-backed or relying on fallback.

See [finding-filters.md](finding-filters.md) and
[graph-aware-finding-filters.md](graph-aware-finding-filters.md).

## Finding Filter Policy Suggestions

The contract renders a `Finding Filter Policy Suggestions`
subsection under `Active Governance State` whenever a
[`FindingFilterPolicySuggestionReport`](../artifacts/finding-filter-policy-suggestion-report.md)
is indexed. The subsection lists suggestions-available,
high-confidence, and low-confidence-requiring-`--force` counts.
When suggestions exist, the contract emits an advisory
blockquote ("Filter policy suggestions are advisory. Do not
assume they are applied.") and up to five
`<id> — <confidence> — <reason> — affected findings: <n>`
bullets. The subsection always closes with "Ask the operator
before applying filter policy suggestions. Do not mutate
`.rekon/config.json` unless explicitly instructed."

When the suggestion report does **not** cite the latest
`FindingFilterReport` in its `header.inputRefs`, the
subsection emits a stale banner pointing operators back to
`rekon findings filter-policy suggest`. Missing-report
branches emit explicit suggest-command guidance instead.

The `Do Not Do` list gains two reminders so agents never
mutate config on their own initiative: "Do not apply filter
policy suggestions without explicit operator approval; run
`rekon findings filter-policy apply <id>` only when the
operator instructs it." and "Do not treat filter policy
suggestions as already-applied config; they are advisory
until `rekon findings filter-policy apply` writes them to
`.rekon/config.json`." See
[finding-filter-policy-suggestions.md](finding-filter-policy-suggestions.md).

## Finding Filter Policy Freshness

The contract renders a `Finding Filter Policy Freshness`
subsection under `Active Governance State` whenever a
`FindingFilterReport` is indexed. It compares the current
`.rekon/config.json` `findingFilters` fingerprint against the
fingerprint stamped on the latest `FindingFilterReport`.
Status is one of `fresh` / `stale` / `missing` / `unknown`.

When the operator changes `findingFilters` after the latest
filter run, the subsection's status becomes `stale` and the
contract emits a blockquote: "Do not rely on active
governance until `rekon refresh` rebuilds findings with the
current `findingFilters` config." `missing` (no
`FindingFilterReport` indexed) and `unknown` (older
`FindingFilterReport` without a `policyFingerprint`) emit
the same recommendation.

The `Do Not Do` list gains a third filter-related reminder:
"Do not rely on active issue / coherency counts after
`.rekon/config.json` `findingFilters` changed until `rekon
refresh` has rebuilt the filter chain with the current
policy set." See
[finding-filters.md](finding-filters.md) "Policy Fingerprint
and Freshness".

## CLI Surface

```sh
rekon publish agent-contract --root <repo> --json
rekon publish run @rekon/capability-docs.agent-contract --root <repo> --json
rekon publish list --root <repo> --json
rekon agent-contract export --root <repo> --output <path> [--force] --json
```

The first three commands produce the same Publication artifact. The
fourth exports an existing Publication to an operator-chosen path
under the repo root and never writes outside the repo.

## Root AGENTS.md Policy

`rekon publish agent-contract` writes only to
`.rekon/artifacts/publications/agent-contract.md`. It does not
overwrite root `AGENTS.md`, inject into `CLAUDE.md`, or write any
file outside `.rekon/`. A contract test
(`publish agent-contract does not overwrite a root AGENTS.md`)
pins this invariant.

`rekon agent-contract export --output <path>` is the explicit
operator-driven way to materialize the generated contract under a
repo path. It is safe by default:

- The output path must resolve inside the repo root. Absolute paths
  outside the root and relative paths that escape the root with
  `..` are rejected.
- If the output file already exists, the command refuses to
  overwrite it unless `--force` is provided.
- Protected agent-instruction paths (`AGENTS.md`, `CLAUDE.md`,
  `.cursor/rules/*.md`, `.github/copilot-instructions.md`,
  case-insensitive on basenames) require `--force` to overwrite,
  and the JSON output reports `protectedPath: true` so the operator
  intent is visible.
- The written file carries a generated preamble citing the source
  `Publication:<id>`, declaring the file is not canonical truth,
  and pointing to `.rekon/artifacts` and the regenerate command.
- If no `agent-contract` Publication exists yet, the command
  auto-publishes one (the latest `IntelligenceSnapshot` must be
  available) and then exports it.

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
file (either a regular file with `--force` or a protected
agent-instruction file with `--force`).

The recommended idiomatic export target is `AGENTS.rekon.md` in
the repo root; that name is not in the protected list and signals
to readers that the file is generated by Rekon.

## When To Use It

- Before an agent edits any code in this repository.
- After a `rekon refresh` so the contract reflects the latest
  governance and proof state.
- After adding or updating ranked memory (`rekon memory add` +
  `rekon memory select`) so the new guidance surfaces.
- Before a code review, to confirm the agent had the correct
  operating context.

## Relationship To Other Publications

- The **agents** publication (`@rekon/capability-docs.publisher`,
  `kind: "agents"`) remains a thin indexed-intelligence summary —
  useful for orientation, not opinionated.
- The **architecture summary** publication
  (`@rekon/capability-docs.architecture-summary`,
  `kind: "architecture-summary"`) is the broader governance read:
  Repository Overview, Owner Systems, Capability Map, Coherency
  Summary, Top Affected Paths, Remediation Queue, Work Orders,
  Reconciliation Plans, Verification Status, Proof Loop, Agent
  Guidance.
- The **proof report** publication
  (`@rekon/capability-docs.proof-report`, `kind: "proof-report"`)
  is the focused proof readout for the latest plan / result.
- The **agent operating contract** publication
  (`@rekon/capability-docs.agent-contract`,
  `kind: "agent-contract"`) is the agent-facing operating
  contract — opinionated rules, ranked memory, anti-gaming
  reminders, next command.

Use them together. The contract is what an agent reads before
editing; the others are deeper references the contract points at.

## What This Is Not

- Not canonical truth. Publications cite artifacts; artifacts are
  the source of truth.
- Not a watcher. The contract is regenerated on demand, not on file
  events.
- Not a root-file writer. No `AGENTS.md` overwrite by default.
- Not a command runner. Required checks are listed; commands are
  not executed.
- Not a memory mutator. The ranked memory is consumed as-is; the
  contract does not update operator feedback.
- Not a CI publisher. PR/check surfaces remain Phase D.

## Freshness

`rekon artifacts freshness --type Publication --json` marks an
older agent contract `stale` when any newer cited input artifact is
indexed: `MemorySelection`, `VerificationResult`, `CoherencyDelta`,
`WorkOrder`, `ReconciliationPlan`, ownership/capability map,
snapshot. Rebuild with `rekon publish agent-contract`.

A `### Merge Decision Freshness` subsection sits below
`### Accepted Issue Merge Roll-ups` and warns agents
when the consumed merge-roll-up lineage is stale. The
`Do Not Do` reminder adds: *"Do not rely on accepted
merge roll-ups after merge decisions, adjudication, or
lifecycle artifacts change until `rekon refresh` has
run."* See
[issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md).

A `### Merge Candidate Decisions` subsection follows
the freshness block whenever merge candidates exist.
It shows the accepted / rejected / undecided counts
and (when undecided > 0) instructs the agent to ask
the operator to review undecided candidates before
treating merge roll-ups as final. A new `Do Not Do`
reminder warns against assuming advisory candidates
are accepted. See
[issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md).

## Cross-References

- [Agent contract artifact](../artifacts/agent-contract-publication.md)
- [Architecture summary publication](../artifacts/architecture-summary-publication.md)
- [Proof report publication](../artifacts/proof-report-publication.md)
- [MemorySelection](../artifacts/memory-selection.md)
- [Memory concept](memory.md)
- [Resolvers](resolvers.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md)
- [Issue merge decision publication / detail polish](../strategy/issue-merge-decision-publication-detail-polish.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
- [Watcher / path freshness policy decision](../strategy/watcher-path-freshness-policy-decision.md) —
  pins the agent contract policy: agents should treat
  artifacts as stale after source edits until `rekon
  refresh` has run; agents must not invoke `rekon
  refresh` on the operator's behalf without explicit
  permission.
- [Beta release readiness checklist](../strategy/beta-release-readiness-checklist.md) —
  the release-slice CLI smoke matrix includes
  `rekon publish agent-contract` to confirm this
  surface emits on fixture input. Beta limitations
  carried forward: known limitations must be
  documented before beta is announced.

Agents should additionally treat the latest
[`PathFreshnessReport`](../artifacts/path-freshness-report.md)
as authoritative for **working-tree freshness**.
If the most recent `PathFreshnessReport.status` is
`stale`, the agent should recommend `rekon
refresh` before relying on existing artifacts and
must **not** assume that artifact lineage
freshness alone implies the source files are
current. **Artifact lineage freshness is not
working-tree freshness.** As of the
`path-freshness-publication-surfacing` slice, the
agent contract publication renders a `### Working
Tree Path Freshness` subsection (sourced from the
latest report) plus a new entry in `## Do Not Do`
that pins the lineage-vs-working-tree distinction
verbatim; agents should treat that subsection as
the canonical signal and avoid relying on
artifact lineage freshness alone after source
edits. The full path-freshness track has been
declared beta-private stable; see
[Path Freshness Safety Review](../strategy/path-freshness-safety-review.md).

The agent operating contract now also surfaces the latest
[`CapabilityOntologySuggestionReport`](../artifacts/capability-ontology-suggestion-report.md)
under a `### Capability Ontology Suggestions` subsection
in the operating-state group, and appends a `Do Not Do`
reminder pinning that the report is preview-only — entries
must **not** be treated as applied ontology config. The
publication is read-only with respect to
`.rekon/capability-ontology.json`, the
`CapabilityNormalizationReviewLedger`, and `CapabilityMap`.
Operators apply proposed config changes manually outside
the publication.
