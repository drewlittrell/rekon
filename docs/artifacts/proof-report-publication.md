# Proof Report Publication

## Purpose

The proof report is a focused `Publication` artifact that summarizes
the most recent `VerificationPlan` and `VerificationResult` alongside
the work-order, remediation, and reconciliation context they cover.
It exists to give humans and agents a small, citable proof readout
without making them inspect six artifacts manually or wade through
the broader architecture summary.

It is the alpha "lite" form of classic intent / agent-doc proof
visibility — see
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Intent Preparation And Anti-Gaming") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Agent
Proof Gates Beat Confidence Narratives").

## Produced By

- `@rekon/capability-docs.proof-report` (a publisher handler inside
  the existing `@rekon/capability-docs` capability).

## Consumed By

- Humans and agents reviewing whether the latest remediation work has
  proof.
- Future PR/check or dashboard surfaces (deferred).

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`Publication`. The header carries:

- `producer.id` = `@rekon/capability-docs`.
- `inputRefs` cite every artifact actually read to build the report:
  `IntelligenceSnapshot` (if available), `WorkOrder` (remediation
  and/or resolver), `VerificationPlan`, `VerificationResult`,
  `CoherencyDelta`, `ReconciliationPlan`, and `FindingLifecycleReport`.
  Missing artifacts are not cited.
- `freshness.status` mirrors the snapshot's freshness when present,
  otherwise defaults to `fresh`.

## Shape

The publication uses the existing `PublicationArtifact` shape with an
extended `kind` enum:

```ts
type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary" | "architecture-summary" | "proof-report";
  title?: string;
  path: string;
  format: "markdown";
  content: string;
};
```

For the proof report:

- `kind` = `"proof-report"`.
- `title` = `"Rekon Proof Report"`.
- `path` = `.rekon/artifacts/publications/proof-report.md`.
- `format` = `"markdown"`.
- `content` is the rendered markdown.

## Content Structure

When a `VerificationPlan` exists, the publication contains, in order:

1. **Proof Status** — `status / passed / failed / skipped / not-run`
   table from the latest `VerificationResult.summary`. Failed,
   partial, and not-run statuses surface an explicit
   `> Verification is not complete.` callout. Passed status surfaces
   `> Verification recorded as passed. This does not automatically
   resolve findings.`
2. **Work Order** — source / goal / paths / systems for the linked
   remediation (`source === "coherency-delta"`) or resolver work
   order.
3. **Verification Plan** — table of the plan's commands plus the plan
   id.
4. **Verification Results** — per-command table (command / status /
   exit code / notes). Missing when no `VerificationResult` exists.
5. **Failed / Missing Evidence** — bullet list naming every failed,
   skipped, and not-run command (including plan commands missing from
   the recorded results).
6. **Remediation Context** — priority / finding / severity / systems /
   files for up to 10 remediation items, sourced from the work
   order's `remediationItems` (preferred) or the
   `CoherencyDelta.remediationQueue`.
7. **Reconciliation Context** — operation / class / status /
   permission for up to 10 operations from the latest
   `ReconciliationPlan`.
8. **Next Recommended Action** — bullets that depend on the proof
   state (run `rekon verify record` when missing, fix failures when
   failed, complete missing checks when partial/not-run, re-run
   evaluate -> lifecycle -> coherency-delta -> publish architecture
   when passed).
9. **Input Artifacts** — bullet list of `ArtifactRef`s cited in the
   header.

When no `VerificationPlan` exists, the publication is intentionally
short: it says
"No VerificationPlan found. Run `rekon intent work-order` or
`rekon intent remediation` first." plus the Input Artifacts list.

## Inputs Consumed

The publisher reads the latest available of each:

- `IntelligenceSnapshot` (optional; used for the header subject when
  present).
- `WorkOrder` (optional). The publisher reads up to two: the latest
  remediation work order (where `source === "coherency-delta"`) and
  the latest resolver work order.
- `VerificationPlan` (the minimum useful input).
- `VerificationResult` (optional).
- `CoherencyDelta` (optional).
- `ReconciliationPlan` (optional).
- `FindingLifecycleReport` (optional; not currently rendered but cited
  in `inputRefs` for completeness when present).

Every artifact actually read is cited in `header.inputRefs`. The
publisher does not synthesize missing artifacts; each missing section
points to the command that produces it.

## Freshness And Provenance

The publication's `freshness.status` mirrors the snapshot's freshness
when one is indexed, otherwise defaults to `fresh`.
`rekon artifacts freshness` marks an older proof report `stale` once
any newer cited input artifact is indexed — most importantly a newer
`VerificationResult` or `VerificationPlan`.

Rebuild with `rekon publish proof` to refresh.

## CLI Surface

```sh
rekon publish proof --root <repo> --json
rekon publish run @rekon/capability-docs.proof-report --root <repo> --json
rekon publish list --root <repo> --json
```

The shortcut exists for parity with `rekon publish agents` and
`rekon publish architecture`. Both write paths produce the same
artifact.

## What This Is Not

- Not a command runner. The publisher does not execute the listed
  verification commands.
- Not a verification judge. Rekon stores the operator's recorded
  outcomes and reports them faithfully; it does not score or grade
  them.
- Not canonical evidence. The `VerificationResult` artifact is the
  evidence; this publication is a derived projection.
- Not a CI integration. PR/check publishers remain deferred.
- Not an auto-apply trigger. Passing verification never resolves
  findings or applies reconciliation operations.
- Not a substitute for the architecture summary. The architecture
  summary still covers the broader governance state; this report
  zooms into the proof loop.

## Cross-References

- [Proof report concept](../concepts/proof-report-publication.md)
- [VerificationPlan](verification-plan.md)
- [VerificationResult](verification-result.md)
- [Architecture summary publication](architecture-summary-publication.md)
- [WorkOrder](work-order.md)
- [CoherencyDelta](coherency-delta.md)
- [Capability model](../strategy/capability-model.md)
