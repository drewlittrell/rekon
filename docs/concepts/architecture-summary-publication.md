# Architecture Summary Publication

A concise governance read of the repository in one Rekon-native
publication. It rolls up the snapshot, owner systems, capability map,
coherency delta, finding lifecycle, plus the full proof loop —
work orders, reconciliation plans, verification plans, and
verification results — into a single markdown document that humans
and agents can scan before editing code.

This is the alpha "lite" form of the classic generated architecture
docs and assistant-doc projections — see
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Publications And Generated Docs") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Generated
Docs Are Publications, Not Truth").

## Why It Exists

Before the architecture summary, governance lived across many
artifacts: `FindingReport`, `FindingStatusLedger`,
`FindingLifecycleReport`, `CoherencyDelta`, `OwnershipMap`,
`CapabilityMap`. Each is correct, but reading them all in one go was
friction. The architecture summary collapses them — and the
downstream proof-loop artifacts (`WorkOrder`, `ReconciliationPlan`,
`VerificationPlan`, `VerificationResult`) — into one publication:

- one paragraph for repository overview;
- one table for owner systems;
- a short capability map;
- a coherency summary (active/accepted/ignored/resolved + severity
  breakdown);
- top affected paths;
- a prioritized remediation queue;
- the latest work orders (remediation and resolver);
- the latest reconciliation plan classification summary;
- the latest verification status (passed / failed / partial /
  not-run);
- a proof-loop summary that suggests the next command to run;
- short agent guidance.

The publication does not replace any of the underlying artifacts. It
is a derived projection and is regenerated from artifacts each time.
It also does **not** execute verification commands, run reconciliation,
or judge verification sufficiency. Failed and partial verification
states are surfaced, not hidden.

## How It Is Built

`rekon publish architecture` invokes the
`@rekon/capability-docs.architecture-summary` publisher inside
`@rekon/capability-docs`. The publisher:

1. Reads the latest `IntelligenceSnapshot` (required).
2. Reads the latest `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
   `CoherencyDelta`, `IssueAdjudicationReport`, and
   `FindingLifecycleReport` if available. When an
   `IssueAdjudicationReport` is indexed, the summary renders a
   `Governed Issue Groups` section listing each adjudicated group
   with its member finding ids; the Coherency Summary section is
   also labeled as group-aware vs. raw-finding mode depending on
   whether the `CoherencyDelta` was built from adjudicated
   groups. The publisher also runs a small `detectGovernanceFreshness`
   helper across the latest `FindingLifecycleReport` /
   `IssueAdjudicationReport` / `CoherencyDelta` and, when any
   adjudication / coherency input is stale, renders an
   `## Input Freshness Warnings` section recommending the next
   rebuild command. The section is omitted when the chain is
   clean — silence is the success signal. See
   [freshness-and-invalidation.md](freshness-and-invalidation.md).
3. Reads the latest remediation `WorkOrder` (where `source ===
   "coherency-delta"`) and the latest resolver `WorkOrder` if either
   exists.
4. Reads the latest `ReconciliationPlan` if it exists.
5. Reads the latest `VerificationPlan` and `VerificationResult` if
   they exist. The latest plan is tracked even when no result is
   recorded yet, so the Verification Status section can flag stale
   results.
6. Renders the markdown summary.
7. Writes a `Publication` artifact with `kind = "architecture-summary"`
   and full `header.inputRefs`.

The publisher does **not** call runtime helpers to build missing
artifacts. If a `CoherencyDelta` is missing, the summary instructs the
operator to run `rekon coherency delta`; if no `VerificationResult`
is recorded yet, it instructs the operator to run
`rekon verify record`; and so on.

## CLI Surface

```sh
rekon publish architecture --root <repo> --json
rekon publish run @rekon/capability-docs.architecture-summary --root <repo> --json
rekon publish list --root <repo> --json
```

Both write paths emit the same artifact. The shortcut exists for
parity with `rekon publish agents`.

## When To Use It

- After a fresh evaluate + coherency-delta cycle, to capture a
  governance snapshot.
- After running `rekon verify record`, to confirm the proof loop is
  visible and the next suggested command is correct.
- Before handing repo state to an agent that does not have time to
  read every underlying artifact.
- When reviewing repository drift over time — read the latest
  publication and compare to the previous one.

For a smaller readout focused only on proof state, see the sibling
[proof report publication](proof-report-publication.md). The two
publications complement each other: the architecture summary covers
the broader governance loop; the proof report zooms into the latest
plan / result.

## What This Is Not

- Not canonical architecture truth. Generated docs never are. The
  publication cites its inputs; trust the inputs.
- Not the full classic generated-docs tree. There is no per-system
  generated doc set in this alpha.
- Not an AGENTS.md overwrite. Rekon does not inject content into the
  repo's root AGENTS.md.
- Not a watcher- or PR-driven publication. CLI/runtime only.
- Not a dashboard.
- Not a remediation auto-apply. The queue lists work; it does not run
  it.
- Not a verification runner. The Verification Status section reports
  the latest `VerificationResult`; it does not execute commands.
- Not a verification judge. Failed and partial verification states
  are surfaced verbatim, not scored or graded.

## Freshness

Run `rekon artifacts freshness --type Publication --json` to inspect
whether the latest architecture summary still reflects current inputs.
A newer `IntelligenceSnapshot`, `CoherencyDelta`, `OwnershipMap`,
`CapabilityMap`, `ObservedRepo`, `FindingLifecycleReport`,
`WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, or
`VerificationResult` will mark the summary `stale`. Rebuild with
`rekon publish architecture`.

## Cross-References

- [Architecture summary artifact](../artifacts/architecture-summary-publication.md)
- [Coherency delta concept](coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Resolvers](resolvers.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
