# SemanticFileUnderstandingReport

Status: **Implemented** (v1, slice 144). Category: `actions`. Stability: experimental.
`schemaVersion: 0.1.0`.

> **Evidence Graph integration decided (slice 155) and implemented (slice 156):**
> the [Semantic File Understanding → Evidence Graph Integration Decision](../strategy/semantic-file-understanding-evidence-graph-integration-decision.md)
> pinned how this report contributes `llm_extraction` evidence and `llm` /
> `inference` claims to `CapabilityEvidenceGraph` — explicit and opt-in
> (Option B), grounded to `file.path` / `sha256`, with `capabilitySignals` →
> capability nodes + inference claims and `findings` → needs-review / conflicted
> claims. It contributes inference claims, not fact claims; deterministic facts
> win. `rekon capability graph build --semantic-file-reports latest` /
> `--semantic-file-report-ref <ref>` now ship that integration — see the
> [Implementation](../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md).

A read-only, per-file understanding artifact. It is produced by
`rekon semantic file understand` (and `buildSemanticFileUnderstandingReport` in
`@rekon/capability-model`). See the
[Semantic File Understanding concept](../concepts/semantic-file-understanding.md).

## Shape

```ts
type SemanticFileUnderstandingReport = {
  header: ArtifactHeader; // artifactType "SemanticFileUnderstandingReport"
  schemaVersion: "0.1.0";

  status: {
    value: "understood" | "needs-review" | "provider-unavailable" | "blocked";
    reason: string;
  };

  file: {
    path: string;
    sha256: string;
    language?: string;
    lineCount: number;
    byteLength: number;
  };

  normalizationTrace: {
    method: "deterministic" | "semantic-llm" | "deterministic-fallback";
    invokedSemanticUnderstanding: boolean;
    provider?: string;
    model?: string;
    provenance: "source-only" | "semantic-llm";
    warnings: string[];
  };

  summary: {
    purpose: string;
    responsibilities: string[];
    publicExports: string[]; // deterministic — authoritative
    imports: string[];       // deterministic — authoritative
    touchedConcepts: string[];
  };

  capabilitySignals: Array<{
    id: string;
    label: string;
    confidence: "low" | "medium" | "high";
    sourceEvidence: Array<{ lineStart?: number; lineEnd?: number; excerpt: string }>;
  }>;

  findings: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    message: string;
    sourceEvidence: string[];
    suggestedFollowUp?: string;
  }>;

  boundaries: {
    executedCommands: false;
    wroteSourceFiles: false;
    createdPreparedIntentPlan: false;
    createdWorkOrder: false;
    createdVerificationPlan: false;
    generatedEmbeddings: false;
    ranCirce: false;
    implementedIntentGo: false;
  };
};
```

## Status values

- `understood` — a deterministic or semantic understanding was produced.
- `needs-review` — semantic understanding produced one or more high-severity findings.
- `provider-unavailable` — `--semantic auto` was requested but the provider was
  unavailable or returned nothing usable; the report carries the deterministic
  understanding only.
- `blocked` — the file is empty; there is nothing to understand.

## Guarantees

- **Provider output is schema-validated and deterministically rechecked.** Imports and
  public exports are always the deterministic extraction (the hallucination guard);
  provider output is a proposal, not proof.
- The factory forces all eight `boundaries` booleans to `false`; the validator rejects
  any report whose boundary value is not `false`.
- Producing this report **executes no commands**, **writes no source files**,
  **generates no embeddings**, **creates no PreparedIntentPlan / WorkOrder /
  VerificationPlan / VerificationRun / VerificationResult**, runs no Circe, and does not
  implement intent:go.

## Registration

- Type + factory + validator + schema: `@rekon/kernel-repo-model`
  (`createSemanticFileUnderstandingReport`, `validateSemanticFileUnderstandingReport`,
  `assertSemanticFileUnderstandingReport`, `semanticFileUnderstandingReportSchema`).
- Builder: `@rekon/capability-model` (`buildSemanticFileUnderstandingReport`).
- SDK built-in artifact type + runtime category (`actions`).

## Related

- [Semantic File Understanding concept](../concepts/semantic-file-understanding.md)
- [Semantic File Understanding v1 strategy](../strategy/semantic-file-understanding-v1.md)
- [IntentPlanActionabilityReport artifact](./intent-plan-actionability-report.md)

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](../strategy/semantic-file-understanding-safety-review.md).

## Semantic File Understanding Scan Integration Decision

How `SemanticFileUnderstandingReport` integrates with scan is decided (slice 146): scan remains deterministic by default; repo-scale understanding arrives first as an explicit batch command (`rekon semantic files understand --changed|--all`) before any `rekon scan --semantic-files` flag. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. Next: Semantic Files Understand Batch Command v1. See [Semantic File Understanding Scan Integration Decision](../strategy/semantic-file-understanding-scan-integration-decision.md).

## Semantic File Understanding Scan Integration

Semantic file understanding is now an explicit opt-in scan layer (slice 147): `rekon scan --semantic-files auto|required` writes one `SemanticFileUnderstandingReport` per selected file, reusing the shipped single-file builder and router-bound adapter. Plain `rekon scan` (and `--semantic-files off`) stay deterministic and call no provider. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. This reverses the slice-146 batch-command-first decision. See [Semantic File Understanding Scan Integration](../strategy/semantic-file-understanding-scan-integration.md).

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](../strategy/semantic-file-understanding-scan-integration-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](../strategy/semantic-file-understanding-intent-context-decision.md).

### Intent semantic context — implemented (slice 150)

The slice-149 decision is now implemented: `rekon intent assess` / `rekon intent plan review` consume SemanticFileUnderstandingReport(s) as proposal/context via `--semantic-context latest` or `--semantic-context-ref <ref>`, never as proof. See [Semantic File Understanding Intent Context Implementation](../strategy/semantic-file-understanding-intent-context-implementation.md).

## Semantic File Understanding Intent Context Safety Review

The slice-150 semantic intent-context integration was ground-reviewed and declared safe/stable: `SemanticFileUnderstandingReport` consumption by `rekon intent assess` / `rekon intent plan review` is explicit, proposal/context-only, never weakens readiness/proof gates, and stale reports are never consumed silently. See [Semantic File Understanding Intent Context Safety Review](../strategy/semantic-file-understanding-intent-context-safety-review.md).
