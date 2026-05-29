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

## Publication Surfacing

The [architecture summary](../artifacts/architecture-summary-publication.md)
and [agent contract](../artifacts/agent-contract-publication.md)
publications surface the latest
`CapabilityLintFindingBridgeReport` (forty-fifth slice) as
**read-only visibility** — a `Capability Lint Finding Bridge`
section with summary counts, a bounded candidate table, and the
eligible / ineligible / needs-review guidance, citing the report
in `header.inputRefs`.

The surfacing is read-only and additive:

- Publications **read the latest
  `CapabilityLintFindingBridgeReport`**; they **never run
  `rekon capability lint bridge-findings`**.
- Publications **do not write `FindingReport`**, do not mutate
  `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`, and **do not
  create `WorkOrder` or `VerificationPlan`**.
- `proposedFinding` is **preview-only**; surfacing does not
  imply resolver routing, verification planning, or **source
  writes** (no source files are written).

**Proof-report surfacing is deferred** — the bridge report is
preview / governance-candidate context, not verification proof.

## Cross-References

- [CapabilityLintFindingBridgeReport safety review](../strategy/capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; declares the preview bridge **safe /
  stable** and selects publication surfacing next (visibility
  only, no finding writes).
- [CapabilityLintFindingBridgeReport publication safety review](../strategy/capability-lint-finding-bridge-publication-safety-review.md)
  — forty-sixth slice; declares the architecture summary + agent
  contract surfacing **safe / stable as read-only visibility**
  and selects the `FindingReport` writer decision next.
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects **Option B** — a future,
  separate, opt-in `FindingReport` writer with a required dry-run
  preview and explicit confirmation. The writer is **not
  implemented** and writes no `FindingReport`; it would write a
  new `FindingReport` artifact and leave the finding filters,
  lifecycle, adjudication, `CoherencyDelta`, `WorkOrder` /
  `VerificationPlan`, and source writes downstream and untouched.
  The **dry-run helper / CLI** (`rekon capability lint
  write-findings --dry-run`) has since **shipped** (forty-eighth
  slice, preview only): it previews the proposed `FindingReport`
  body, writes no `FindingReport`, and rejects write-ish flags;
  write mode is deferred. The dry-run **safety review**
  (forty-ninth slice) declared the helper / CLI **safe / stable
  as preview-only writer modeling** (no blocker) and selected the
  writer mode decision next.
- [CapabilityLintFindingBridgeReport → FindingReport writer mode decision](../strategy/capability-lint-finding-writer-mode-decision.md)
  — fiftieth slice; selects **Option B** — a future, opt-in write
  mode behind `--confirm-finding-write` that reuses the dry-run
  preview and writes a **new** `FindingReport` only. **Not
  implemented**; `--write` / `--send` / `--execute` stay rejected,
  and no governance artifact, `WorkOrder`, or `VerificationPlan` is
  mutated or created. The **writer implementation** has since
  shipped (fifty-first slice): opt-in `--confirm-finding-write`
  writes a new `FindingReport` only.
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
