# SemanticFileUnderstandingReport

Status: **Implemented** (v1, slice 144). Category: `actions`. Stability: experimental.
`schemaVersion: 0.1.0`.

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
