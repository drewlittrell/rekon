# Proof Report Publication

A proof report is a focused, artifact-backed readout of the current
proof loop. It tells humans and agents: *"this is the latest
`VerificationPlan`, this is what was actually recorded against it,
this is what failed or never ran, and this is the next command."*

The proof report complements but does not replace the architecture
summary. The architecture summary covers the broader governance loop
(coherency, remediation, reconciliation, verification, agent
guidance); the proof report zooms into the proof state for the latest
work-order / plan / result triple.

This is the alpha "lite" form of classic intent / agent-doc proof
visibility — see
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Intent Preparation And Anti-Gaming") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Agent
Proof Gates Beat Confidence Narratives").

## Why It Exists

Before this batch, proof state was spread across `WorkOrder`,
`VerificationPlan`, `VerificationResult`, `CoherencyDelta`, the
architecture summary publication, and the resolver packet
`verification` field. Reading them in sequence works, but agents
often need a smaller artifact: *"what was promised, what was proven,
what's left."*

The proof report makes that smaller artifact concrete:

- one table for proof status;
- one table for the work order;
- one table listing the plan's commands;
- one table for the recorded per-command results;
- a bullet list naming every failed / skipped / not-run command;
- the remediation items the proof loop is about;
- the reconciliation plan's classified operations;
- a single recommended next command.

The publication does not replace the underlying artifacts. It cites
each consumed artifact in `header.inputRefs` and is rebuilt on every
publish.

## How It Is Built

`rekon publish proof` invokes the
`@rekon/capability-docs.proof-report` publisher inside
`@rekon/capability-docs`. The publisher:

1. Reads the latest `IntelligenceSnapshot` if available (used for the
   publication header subject; not required).
2. Reads up to two `WorkOrder` artifacts — the latest remediation
   (where `source === "coherency-delta"`) and the latest resolver.
3. Reads the latest `VerificationPlan` (the minimum useful input).
4. Reads the latest `VerificationResult` if present.
5. Reads the latest `CoherencyDelta`, `ReconciliationPlan`, and
   `FindingLifecycleReport` for context (each optional).
6. Renders the markdown sections (see below) and writes a
   `Publication` artifact with `kind = "proof-report"` and full
   `header.inputRefs`.

If no `VerificationPlan` exists, the publisher writes a short
publication that says so and recommends `rekon intent work-order` or
`rekon intent remediation`. It does **not** synthesize a plan or
execute any command.

## CLI Surface

```sh
rekon publish proof --root <repo> --json
rekon publish run @rekon/capability-docs.proof-report --root <repo> --json
rekon publish list --root <repo> --json
```

The shortcut is the friendly path; the generic dispatch writes the
same artifact.

## Section Map

| Section | Renders when... | Source artifacts |
| --- | --- | --- |
| Proof Status | `VerificationPlan` exists | `VerificationResult.status` + `summary` |
| **Verification Proof Summary** | `VerificationPlan` exists | `summarizeVerificationProofSurface` over `VerificationResult` + latest `VerificationPlan` |
| Work Order | A remediation or resolver `WorkOrder` exists | `WorkOrder` |
| Verification Plan | `VerificationPlan` exists | `VerificationPlan.commands` |
| Verification Results | `VerificationResult` exists | `VerificationResult.commandResults` (with `stdoutDigest` / `stderrDigest` prefixes; never raw excerpts) |
| Failed / Missing Evidence | always when a plan exists | `VerificationResult.commandResults` + plan's `commands` |
| Remediation Context | remediation items are present | `WorkOrder.remediationItems` (preferred) or `CoherencyDelta.remediationQueue` |
| Reconciliation Context | a `ReconciliationPlan` exists | `ReconciliationPlan.operations` |
| Next Recommended Action | always when a plan exists | status-derived |
| Input Artifacts | always | `header.inputRefs` |

The **Verification Proof Summary** row is new in
P1.1 verification-proof-surfaces-v2. The section
shows:

- `Source` — `manual`, `runner-derived`, or
  `unknown`.
- `Status` — same enum as the Proof Status row.
- `Freshness` — `fresh` / `stale` / `missing-plan`
  / `unknown` relative to the latest
  `VerificationPlan`.
- `VerificationResult` / `VerificationPlan` /
  `VerificationRun` / `WorkOrder` artifact refs.
- A failure callout (`> Verification failed. Do
  not treat this work as proven complete.`) for
  `failed` results.
- A stale callout when the result cites an older
  plan, plus a recommended
  `rekon verify run --plan <latest> --execute`
  command.
- A `> Verification passed. Passing proof does not
  automatically resolve findings.` callout for
  passed, fresh, no-warning results.

The **Verification Results** table now includes
stdout / stderr **digest prefixes** (first 12 hex
characters) so operators can verify identity
without dumping the full 64-char hash and without
ever rendering the raw stream.

## Status Behavior

| Result status | Callout | Next action |
| --- | --- | --- |
| `passed` | `> Verification recorded as passed. This does not automatically resolve findings.` | "Re-run `rekon evaluate` → `rekon findings lifecycle` → `rekon coherency delta` to confirm addressed findings are no longer active." |
| `failed` | `> Verification is not complete.` | "Fix the failing checks and record a new VerificationResult with `rekon verify record`." |
| `partial` | `> Verification is not complete.` | "Complete the missing checks and record an updated VerificationResult with `rekon verify record`." |
| `not-run` | `> Verification is not complete.` | Same as `partial`. |
| no result | `No VerificationResult found.` + `> Verification is not complete.` | "Run `rekon verify record` to capture proof against the latest VerificationPlan. Or run `rekon verify run --plan <id> --execute` followed by `rekon verify result from-run --run <run-id>` to derive a VerificationResult from a runner-produced VerificationRun. Use `rekon verify run --plan <id> --dry-run` to preview the plan first (no execution)." |

## Anti-Gaming / Proof Discipline

The proof report reinforces the same anti-gaming discipline as the
underlying `VerificationResult`:

- **Failures are evidence.** Failed commands are listed in both the
  per-command table and the Failed / Missing Evidence bullets.
- **Skipped is not passed.** Skipped and not-run commands are
  reported separately; they do not collapse into the passed count.
- **Passed does not auto-resolve.** The explicit callout for passed
  verification reminds the reader that findings remain open until the
  evaluator confirms.
- **Trust the artifacts.** Every section is sourced from a cited
  artifact; the publication is downstream, not canonical.

## Freshness

`rekon artifacts freshness --type Publication --json` marks an older
proof report `stale` when a newer cited input artifact is indexed.
Rebuild with `rekon publish proof`.

## What This Is Not

- Not a command runner. No execution.
- Not a verification judge. The publication reports the operator's
  recorded outcome verbatim.
- Not auto-apply. Passing verification does not promote reconciliation
  operations.
- Not a substitute for the architecture summary. Use both.
- Not a CI/GitHub check publisher. Those remain deferred. The
  read-only `rekon verify github-workflow validate` command
  enforces the alpha safety contract on **copied** workflow
  templates (no GitHub API writes, no
  `pull_request_target`, etc.) but does not publish the proof
  report itself. The first GitHub-write decision memo + a
  gated skeleton
  (`buildGitHubCheckPayload`,
  `assessGitHubCheckPublisherReadiness` in
  `@rekon/capability-docs`) ship in
  [`verification-runner-github-check-publisher-decision.md`](../strategy/verification-runner-github-check-publisher-decision.md);
  the skeleton calls no GitHub API and imports no network
  client, and the eventual API call sits behind a default-deny
  readiness gate.
- Not a sufficiency scorer. Failures stay first-class; the publisher
  does not weight or rank them.

## Cross-References

- [Proof report artifact](../artifacts/proof-report-publication.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Verification results concept](verification-results.md)
- [Architecture summary publication concept](architecture-summary-publication.md)
- [Remediation work orders concept](remediation-work-orders.md)
- [Reconciliation plans concept](reconciliation-plans.md)
- [Issue merge decision publication / detail polish](../strategy/issue-merge-decision-publication-detail-polish.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [Verification runner CI / GitHub adapter decision](../strategy/verification-runner-ci-github-decision.md)
- [Verification runner GitHub Check publisher decision](../strategy/verification-runner-github-check-publisher-decision.md)
- [GitHub Check publisher send workflow safety review](../strategy/github-check-publisher-send-workflow-safety-review.md)
- [PR comment publisher decision](../strategy/pr-comment-publisher-decision.md)
- [GitHub Actions workflow template guide](../examples/github-actions-verification-runner.md)
- [Opt-in GitHub Check send workflow template](../examples/workflows/rekon-verification-check-send.yml)
- [VerificationRun artifact](../artifacts/verification-run.md)
- [Verification runs concept](verification-runs.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
