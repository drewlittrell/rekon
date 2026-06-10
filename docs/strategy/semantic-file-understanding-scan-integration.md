# Semantic File Understanding Scan Integration

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: **Implemented** (slice 147). Base: `7ab666b`. Track A (finish LLM-backed
semantic parsing). Integrates `SemanticFileUnderstandingReport` into the normal
`rekon scan` path as an explicit, opt-in semantic scan layer.

## Summary

Semantic file understanding is now a **scan layer**, not a separate workflow an
operator must remember. When the operator explicitly asks for it, scan produces
one [`SemanticFileUnderstandingReport`](../artifacts/semantic-file-understanding-report.md)
per selected file:

```bash
rekon scan --semantic-files auto
rekon scan --semantic-files required --llm-provider openai --llm-model <model>
```

Plain `rekon scan` is unchanged: it stays deterministic and calls no provider.
The single-file debugging command
([`rekon semantic file understand --path`](../concepts/semantic-file-understanding.md))
remains; both paths now share the same builder, router-bound adapter, and write.

## Why This Exists

The old codebase-intelligence system treated semantic file understanding as part
of its scan layer. Rekon restored single-file semantic understanding (slice 144)
and reviewed it safe/stable (slice 145), but making operators run a separate
command for every file is the wrong primary ergonomics. This slice integrates
semantic file understanding into scan **without surprising provider calls**.

This **replaces** the earlier "batch command first, scan flag later" direction
recorded in the
[Semantic File Understanding Scan Integration Decision](./semantic-file-understanding-scan-integration-decision.md)
(slice 146). The scan flag is implemented now; the separate batch command is not
needed as a precondition.

## Product Guarantees

- **scan remains deterministic by default.**
- **semantic file understanding in scan is explicit opt-in.**
- **provider calls are never surprising defaults.**
- **source text is not sent to providers by default.**
- **SemanticFileUnderstandingReport is proposal/context, not proof.**
- **semantic file understanding does not approve plans.**
- **semantic file understanding does not execute commands.**
- **semantic file understanding does not write source files.**
- **semantic file understanding does not generate embeddings.**
- **embeddings remain deferred to a separate track.**
- **intent:go remains deferred.**

Deterministic facts remain authoritative for imports and public exports (the
hallucination guard); the provider's claimed imports/exports are ignored.

## Scan Integration Model

`rekon scan` runs the deterministic substrate pipeline (the same `runRefresh`
that `rekon refresh` runs: observe → project → snapshot → evaluate, producing the
EvidenceGraph / CapabilityMap / IntelligenceSnapshot). That substrate always
runs and is never gated on a provider.

After the substrate, scan runs the **semantic scan layer** only when
`--semantic-files` is present and not `off`. The layer reuses the shipped
single-file machinery: `buildSemanticFileUnderstandingReport` (deterministic
structural extraction + provider-output coercion) and a router-bound adapter
(`createSemanticFileUnderstandingAdapter`). Each report is written with
`store.write(report, { category: "actions" })`. The layer reads source files; it
never modifies them.

## CLI Surface

```bash
rekon scan \
  [--semantic-files off|auto|required] \
  [--llm-provider <id>] \
  [--llm-model <model>] \
  [--semantic-file-limit <n>] \
  [--semantic-file-path <path>] \
  [--semantic-changed-only] \
  [--root <path>] [--json]
```

Default: `--semantic-files off`. With the flag absent, scan output is identical
to today (no `semanticFiles` block, no provider call).

## Semantic Mode Model

- `off` (default): deterministic scan only; writes no `SemanticFileUnderstandingReport`.
- `auto`: selected files get a report; the provider is attempted only if
  configured/available; an unavailable provider falls back to a deterministic
  report with a warning (`status: provider-unavailable`); scan exits 0 unless a
  non-semantic scan error occurs.
- `required`: selected files require provider success. A missing provider/key is
  **preflighted before any report is written** — scan exits non-zero and writes
  no report. Required never falsely reports success.

The CLI is the only place that reads the API key (from `OPENAI_API_KEY`); the
capability-model builder never reads the environment.

## File Selection Model

Conservative by default. The walk includes a fixed allow-list of source / config
/ docs extensions (`.ts .tsx .js .jsx .mjs .cjs .json .md .yml .yaml`) and
excludes `node_modules`, `dist`, `build`, `coverage`, `.git`, `.rekon`,
lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`,
`npm-shrinkwrap.json`), files above a conservative byte limit (256 KiB), and
binary files (NUL-byte sniff). Selection is sorted for deterministic ordering.

- `--semantic-file-limit <n>` caps the number of files selected (default 100).
- `--semantic-file-path <path>` analyzes only that path (bypassing the allow-list
  and lockfile filters, so an explicitly named file is always considered).
- `--semantic-changed-only` analyzes only files whose latest report is missing or
  stale by sha256 / provider / model / mode.

## Reuse / Staleness Model

Hash-based reuse is implemented. A file's latest `SemanticFileUnderstandingReport`
is reused (no new report written) when its content `sha256` is unchanged **and**
the semantic policy (mode + provider + model) is unchanged. If the content
sha256 changes, a new report is generated. If the provider or model changes, the
policy changes and a new report is generated. The scan summary reports
`written`, `reused`, `skipped`, and `failed` counts.

## Scan JSON Output

When `--semantic-files` is present, scan adds a `semanticFiles` block:

```json
{ "semanticFiles": { "mode": "auto", "selected": 12, "written": 12, "reused": 0, "skipped": 0, "failed": 0, "provider": "openai", "model": "..." } }
```

When `off`, the block is `{ "mode": "off", "selected": 0, "written": 0, "reused": 0, "skipped": 0, "failed": 0 }`.
When the flag is absent, the block is omitted entirely so plain scan output is
unchanged. Human output adds a short `Semantic files: ...` line only when the
flag is present.

## Boundaries

Producing reports during scan **executes no commands**, **writes no source
files**, **generates no embeddings**, creates no PreparedIntentPlan / WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, runs no Circe, approves
no plans, and does not implement intent:go. Each report's eight boundary booleans
are forced `false` by the kernel factory and rejected if non-false by the
validator.

## What This Does Not Do

This slice integrates semantic file understanding into scan as an opt-in layer.
It does not make provider calls by default, does not implement embeddings, adds
no vector storage or retrieval, adds no provider packages, executes no commands,
writes no source files, creates no PreparedIntentPlan / WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, runs no Circe, does not
implement intent:go, automatically consumes reports into intent context, alters
no WorkOrder / VerificationPlan gates, publishes nothing to npm, and bumps no
versions.

## Implementation

- `packages/cli/src/index.ts` — `rekon scan --semantic-files` flags, the
  `runSemanticScanLayer` function (selection / reuse / preflight / write), the
  shared `produceSemanticFileUnderstandingReport` helper, the file-walk
  (`collectSemanticScanCandidates`), and usage/help updates.
- `packages/capability-model/src/semantic-file-understanding-report.ts` — the
  builder accepts an optional explicit `artifactId` so each file's report has a
  unique id within a batch (the store keys files by `type-artifactId`); the
  single-file path is unchanged.

## Verification

- Contract test: `tests/contract/semantic-file-understanding-scan-integration.test.mjs`
  (26 assertions: plain-scan determinism, off no-op, auto fallback + warning,
  required preflight exit-non-zero/no-report, selection/skip, limit, file-path,
  authoritative imports/exports, boundaries, validate-clean, source-unchanged,
  hash-based reuse / sha-change / policy-change).
- Docs test: `tests/docs/semantic-file-understanding-scan-integration.test.mjs`.
- Full 9-command gate green; keyless CLI smoke matrix confirmed.

## Next Step

Recommended: **Semantic File Understanding Scan Integration Safety Review** —
review this integration before `SemanticFileUnderstandingReport` is consumed
automatically into intent context. Still no embeddings, no source writes, no
command execution, no approval, no intent:go.

## Related

- [Semantic File Understanding concept](../concepts/semantic-file-understanding.md)
- [SemanticFileUnderstandingReport artifact](../artifacts/semantic-file-understanding-report.md)
- [Semantic File Understanding v1 strategy](./semantic-file-understanding-v1.md)
- [Semantic File Understanding Safety Review](./semantic-file-understanding-safety-review.md)
- [Semantic File Understanding Scan Integration Decision (superseded)](./semantic-file-understanding-scan-integration-decision.md)
- [Rekon LLM Provider Routing concept](../concepts/rekon-llm-provider-routing.md)
- [Classic LLM Semantic Parsing Parity Decision](./classic-llm-semantic-parsing-parity-decision.md)

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](./semantic-file-understanding-scan-integration-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](./semantic-file-understanding-intent-context-decision.md).

### Intent semantic context — implemented (slice 150)

The slice-149 decision is now implemented: `rekon intent assess` / `rekon intent plan review` consume SemanticFileUnderstandingReport(s) as proposal/context via `--semantic-context latest` or `--semantic-context-ref <ref>`, never as proof. See [Semantic File Understanding Intent Context Implementation](./semantic-file-understanding-intent-context-implementation.md).
