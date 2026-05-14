# Architecture Summary Publication

## Purpose

The architecture summary is a `Publication` artifact that summarizes
repository structure, ownership, capabilities, active coherency
findings, top affected paths, remediation priorities, current
proof-loop state (work orders, reconciliation plans, verification
status), and agent guidance. It is the alpha "lite" form of the
classic generated architecture docs and assistant-doc projections.

## Produced By

- `@rekon/capability-docs.architecture-summary` (a publisher handler
  inside the existing `@rekon/capability-docs` capability).

## Consumed By

- Humans and agents who want a single concise governance read of the
  current repository state.
- Future surfaces (GitHub check publishers, dashboards) — these are
  out of scope for the alpha.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`Publication`. The header carries:

- `producer.id` = `@rekon/capability-docs`.
- `inputRefs` cite every artifact actually read to build the summary:
  `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`,
  `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and
  `VerificationResult`. Missing artifacts are not cited.
- `freshness.status` mirrors the snapshot's freshness.

## Shape

The publication uses the existing `PublicationArtifact` shape with an
extended `kind` enum:

```ts
type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary" | "architecture-summary";
  title?: string;
  path: string;
  format: "markdown";
  content: string;
};
```

For the architecture summary:

- `kind` = `"architecture-summary"`.
- `title` = `"Rekon Architecture Summary"`.
- `path` = `.rekon/artifacts/publications/architecture-summary.md`.
- `format` = `"markdown"`.
- `content` is the rendered markdown.

## Content Structure

The publication content includes these sections, in order:

1. **Repository Overview** — repo id, root, system count, capability
   count, indexed-artifact category counts, snapshot freshness.
2. **Owner Systems** — table of owner systems with truncated paths and
   capabilities. Up to 20 rows; remaining systems collapsed into a
   "+N more" entry.
3. **Capability Map** — bullet list with truncated subjects/systems
   per capability. Up to 20 entries; remaining collapsed.
4. **Coherency Summary** — counts of active/accepted/ignored/resolved
   findings and a severity breakdown. When no CoherencyDelta is
   indexed, the section instructs the operator to run
   `rekon coherency delta`.
5. **Top Affected Paths** — table of paths from
   `CoherencyDelta.summary.topPaths`. Up to 10 rows.
6. **Remediation Queue** — table of remediation steps from
   `CoherencyDelta.remediationQueue` with priority, finding id,
   severity, systems, and the truncated action. Up to 20 rows.
7. **Work Orders** — table showing the latest remediation
   (`source = "coherency-delta"`) and resolver work orders. Each row
   reports source, goal, paths, owner systems, and selected item count
   (for remediation orders) or `n/a` (for resolver orders). Missing
   work orders are called out with a "run `rekon intent remediation`
   or `rekon intent work-order`" hint.
8. **Reconciliation Plans** — summary table (total / artifact-only /
   source-write deferred / command deferred / manual review / applied
   / deferred / denied) plus up to 5 top operations with class, status,
   permissions, and finding. Missing plans recommend
   `rekon reconcile suggest`.
9. **Verification Status** — table of the latest `VerificationResult`
   status, summary counts, recorded by, recorded at. Failed / partial
   / not-run results display an explicit "Verification is not
   complete." line. If the result references an older
   `VerificationPlan` than the latest, the section says
   "VerificationResult may be stale; latest VerificationPlan differs."
10. **Proof Loop** — `Governance:` / `Planning:` / `Verification:`
    state bullets plus a single "Suggested next command:" line that
    walks the loop `coherency delta -> intent remediation -> reconcile
    suggest -> verify record -> address failures -> publish`.
11. **Agent Guidance** — short bullet list reminding readers of the
    route → seam → preflight flow and required checks.
12. **Freshness** — instructs the operator to run
    `rekon artifacts freshness --json`.
13. **Input Artifacts** — bullet list of `ArtifactRef`s cited in the
    header.

## Inputs Consumed

The publisher reads the latest available of each:

- `IntelligenceSnapshot` (required; the publisher throws if missing).
- `ObservedRepo` (optional).
- `OwnershipMap` (optional).
- `CapabilityMap` (optional).
- `CoherencyDelta` (optional).
- `FindingLifecycleReport` (optional).
- `WorkOrder` (optional). The publisher reads up to two: the latest
  remediation work order (where `source === "coherency-delta"`) and
  the latest resolver work order.
- `ReconciliationPlan` (optional).
- `VerificationPlan` (optional). The publisher tracks the latest plan
  even when no `VerificationResult` is recorded yet, so the
  Verification Status section can flag stale results.
- `VerificationResult` (optional).

Every artifact actually read is cited in `header.inputRefs`. The
publisher does not synthesize missing artifacts; each missing section
calls out what to run next.

## Freshness And Provenance

The publication's `freshness.status` mirrors the snapshot's freshness
at write time. `rekon artifacts freshness` marks an older architecture
summary `stale` once any newer input artifact lands:

- newer `IntelligenceSnapshot`,
- newer `CoherencyDelta`,
- newer `OwnershipMap` / `ObservedRepo` / `CapabilityMap`,
- newer `FindingLifecycleReport`,
- newer `WorkOrder`,
- newer `ReconciliationPlan`,
- newer `VerificationPlan`,
- newer `VerificationResult`.

Rebuild with `rekon publish architecture` to refresh.

## CLI Surface

```sh
rekon publish architecture --root <repo> --json
rekon publish run @rekon/capability-docs.architecture-summary --root <repo> --json
rekon publish list --root <repo> --json
```

The two write paths are equivalent; the shortcut exists for parity
with `rekon publish agents`.

## What This Is Not

- Not canonical architecture truth. The publication is a derived
  projection. Canonical truth lives in `.rekon/artifacts`.
- Not the full classic `ArchitectureDocsHandler` tree. There is no
  per-system generated doc set in this alpha.
- Not an AGENTS.md overwrite. Rekon does not inject this output into
  the repo's root AGENTS.md.
- Not a watcher- or PR-driven publication. CLI/runtime only.
- Not a dashboard.
- Not a remediation auto-apply pipeline. The queue lists work; it does
  not run it.

## Cross-References

- [Architecture summary concept](../concepts/architecture-summary-publication.md)
- [CoherencyDelta](coherency-delta.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
