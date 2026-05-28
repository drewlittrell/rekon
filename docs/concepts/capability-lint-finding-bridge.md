# Capability Lint Finding Bridge

The capability lint finding bridge is the **preview** layer
between capability-architecture policy *evaluation*
([`CapabilityArchitectureLintReport`](../artifacts/capability-architecture-lint-report.md))
and Rekon's *governed* findings pipeline. Its artifact is the
[`CapabilityLintFindingBridgeReport`](../artifacts/capability-lint-finding-bridge-report.md).

It exists because the
[`CapabilityArchitectureLintReport` → `FindingReport` bridge
decision](../strategy/capability-lint-finding-bridge-decision.md)
selected **Option B**: ship an intermediate preview artifact
*before* any code writes `FindingReport` from lint rows. The
bridge answers a single question — *"which lint violations are
eligible to become governed findings later, and why?"* — without
promoting anything.

## Where It Fits

The capability ontology stack (see
[capability-ontology.md](capability-ontology.md)):

1. `EvidenceGraph`
2. `CapabilityNormalizationReport`
3. `CapabilityPhraseReport`
4. `CapabilityMap` (v1 + v2 phrase-backed)
5. `CapabilityContract` — operator-authored policy.
6. `CapabilityArchitectureLintReport` — policy evaluation.
7. **`CapabilityLintFindingBridgeReport`** — preview bridge.
   (This page.)

The bridge sits between **evaluation** (the lint report) and
**enforcement** (governed findings via `FindingReport` →
`FindingFilterReport` → `FindingLifecycleReport` →
`IssueAdjudicationReport` → `CoherencyDelta`). It is itself
neither: it is a preview projection.

## Preview, Not FindingReport

**`CapabilityLintFindingBridgeReport` is preview, not
`FindingReport`.** Building or writing one:

- **does not write `FindingReport`** — no bridge writes
  `FindingReport` today, and the bridge report itself never
  does;
- **does not mutate `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`**;
- creates **no `WorkOrder`** and **no `VerificationPlan`**
  (`WorkOrder` / `VerificationPlan` creation is not included);
- adds no resolver routing by capability, no verification
  planning by capability, no `RefactorPreservationContract`,
  and no source writes.

**Only a later explicit writer decision may allow eligible
bridge candidates to become governed findings.** That writer
does not exist yet; it requires its own decision and safety
review. Even once it ships, promoted candidates flow through the
[graph-aware finding filters](graph-aware-finding-filters.md),
the [`FindingStatusLedger`](../artifacts/finding-status-ledger.md),
and [issue adjudication](issue-adjudication.md) like any other
finding. `FindingLifecycleReport` and
[`CoherencyDelta`](coherency-delta.md) stay downstream.

## How It Classifies Rows

For each row in the source `CapabilityArchitectureLintReport`,
the bridge emits one candidate with a `decision` and a `reason`.

A row is **`eligible`** only when *all* hold:

- `status === "violation"`;
- a `findingCandidate` preview exists;
- `confidence` is `high` or `medium`;
- `severity` is `high` or `medium`;
- `evidenceRefs` is non-empty.

Otherwise it is **`ineligible`** (`not-a-violation`,
`not-evaluated`, `missing-finding-candidate`, `low-confidence`,
`low-severity`, or `missing-evidence`), or **`needs-review`**
when its proposed finding id duplicates an earlier eligible
row's (`duplicate-candidate`).

Eligible candidates carry a deterministic, slug-safe proposed
finding id:

```text
capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>
```

No timestamp; stable across runs. Duplicate ids are handled
deterministically: the first keeps `eligible`, later collisions
become `needs-review`.

## How To Run It

```sh
rekon capability lint bridge-findings \
  [--lint-report <CapabilityArchitectureLintReport:id>] \
  [--root <path>] [--json]
```

The command reads the latest (or pinned) lint report, writes a
`CapabilityLintFindingBridgeReport` under
`.rekon/artifacts/actions/`, prints an eligible / ineligible /
needs-review summary, and says **"No FindingReport entries were
written."**

## What This Is Not

- Not a `FindingReport` writer. It proposes; it does not
  promote.
- Not a governance mutation. Filters, lifecycle, adjudication,
  and `CoherencyDelta` are untouched.
- Not a work-order or verification-plan generator.
- Not a source rewriter or LLM inference step.

## Cross-References

- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [`CapabilityArchitectureLintReport` → `FindingReport` bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
- [Capability-Aware Architecture Linting concept](capability-aware-architecture-linting.md)
- [CapabilityArchitectureLintReport artifact](../artifacts/capability-architecture-lint-report.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Graph-aware finding filters concept](graph-aware-finding-filters.md)
- [Issue adjudication concept](issue-adjudication.md)
- [Coherency delta concept](coherency-delta.md)
- [Remediation work orders concept](remediation-work-orders.md)
- [Capability ontology concept](capability-ontology.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
