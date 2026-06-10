# Semantic File Understanding Scan Integration Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: **Superseded** (slice 147). Originally **Decided** (slice 146), base
`8bad858`. Track A. Decision-only batch; no runtime behavior changes, no scan
integration implemented here.

> **Superseded by implementation (slice 147).** This decision recommended a
> "batch command first, scan flag later" sequencing (`rekon semantic files
> understand --changed|--all` before any `rekon scan` flag). That direction was
> **reversed**: the scan flag was implemented directly. Semantic file
> understanding is now integrated into `rekon scan --semantic-files
> off|auto|required` as an explicit opt-in layer; the separate batch command was
> not needed as a precondition. The product guarantees below still hold (scan
> remains deterministic by default; explicit opt-in; no surprising provider
> calls; source text not sent to providers by default; reports are
> proposal/context, not proof). See
> [Semantic File Understanding Scan Integration](./semantic-file-understanding-scan-integration.md).

## Decision Summary

Semantic file understanding becomes repo-scale through an **explicit batch command
first** (Option B / B1): `rekon semantic files understand --changed|--all`, before any
`rekon scan` flag. **Scan remains deterministic by default.** The batch command defaults
to deterministic-only (semantic `off`) unless the operator selects a provider mode;
**provider calls are never surprising defaults** and **source text is not sent to
providers by default**. A `rekon scan --semantic-files` flag is deferred until the batch
command is implemented and safety-reviewed. Embeddings remain a separate, later track.

## Why This Decision Exists

`rekon semantic file understand --path <file>` (slice 144, safety-reviewed slice 145)
produces one `SemanticFileUnderstandingReport` per file. That is safe but too low-level
for repo-scale usefulness. The natural next step — "understand the whole repo" — could be
implemented by wiring semantic understanding into `rekon scan`, but running LLMs during
scan by default would create privacy, cost, latency, and trust problems and would violate
the deterministic-scan-by-default guarantee. This decision pins a safe integration model
before any implementation.

## Current Scan Surface

Grounded against the shipped CLI at `8bad858`:

- `rekon scan [--root <path>] [--json]` — only `--root` and `--json` flags. **It has no
  `--semantic` or `--llm-*` flag today.**
- `scan` initializes `.rekon/` if needed and runs `runRefresh(root, {})` — the shared
  deterministic substrate pipeline, identical to `rekon refresh` with no skips — then
  reports the workspace state (`not_initialized` / `initialized_without_snapshot` /
  `snapshot_ready`) and post-scan next actions.
- The pipeline produces the deterministic substrate (EvidenceGraph, CapabilityMap,
  IntelligenceSnapshot, and related projections). It calls **no providers** and produces
  **no `SemanticFileUnderstandingReport`**.
- `scan` writes nothing outside `.rekon/`, executes no commands, and does not implement
  intent:go.

Naming note: the proposed batch command is `rekon semantic **files** understand` (plural,
many files) — distinct from the shipped singular `rekon semantic **file** understand`
(one `--path`).

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| manual single-file only | rejected/deferred | too low-level |
| explicit batch command before scan flag | selected | repo-scale without surprising scan |
| scan flag now | deferred | useful later after batch review |
| automatic during scan | rejected | cost/privacy/surprise risk |
| embeddings with scan now | rejected/deferred | separate track |

- **Option A — manual single-file only.** Keep only `rekon semantic file understand
  --path <file>`. Safe but too low-level for repo-scale usefulness. Rejected/deferred.
- **Option B — explicit batch command before scan flag.** Add `rekon semantic files
  understand --changed|--all`. Repo-scale utility without surprising scan/provider calls.
  **Selected.**
- **Option C — scan flag now.** Add `rekon scan --semantic-files off|auto|required`.
  Useful later, but the batch command is easier to test and review first. Deferred.
- **Option D — automatic during scan.** Every scan calls providers by default.
  Surprising, costly, privacy-sensitive, violates the deterministic-scan default.
  Rejected.
- **Option E — embeddings with scan now.** Generate embeddings during scan. Embeddings
  are a separate track. Rejected/deferred.

## Recommendation

Implement **Option B1 — an explicit batch command before any scan flag**. The selected
v1 surface is:

```bash
rekon semantic files understand \
  --changed \
  [--semantic off|auto|required] \
  [--llm-provider <id>] \
  [--llm-model <model>] \
  [--root <path>] \
  [--json]
```

with `--all` as an alternative selector. The batch command reuses the shipped pure
builder and router adapter; it is easier to reason about, test, and dogfood before mixing
with scan.

## Batch Command Model

| Command | Decision |
| --- | --- |
| semantic file understand --path | already shipped |
| semantic files understand --changed | selected next |
| semantic files understand --all | selected next |
| scan --semantic-files | deferred |
| scan default behavior | deterministic |

Recommended minimum v1 selectors: `--changed`, `--all`, `--path <path>`. Optional later:
`--max-files <n>`. Behavior:

- select files (changed set, all, or a path/glob);
- skip ignored / binary / generated / oversized files;
- compute each file's sha256;
- reuse an existing `SemanticFileUnderstandingReport` when the sha256 (and semantic
  mode/provider/model policy) matches;
- write new reports for changed files;
- emit a batch summary (counts: understood / fell-back / skipped / reused).

The batch command runs no commands, writes no source, and produces only
`SemanticFileUnderstandingReport` artifacts.

## Scan Flag Model

A future `rekon scan --semantic-files off|auto|required` may layer semantic file
understanding onto scan — but **only after** the batch command is implemented and
safety-reviewed. The default must remain `off`; **semantic file understanding during scan
is explicit opt-in only**, and scan with no `--semantic-files` flag stays exactly as it is
today (deterministic substrate, no providers).

## Cache And Staleness Model

| Condition | Decision |
| --- | --- |
| file hash unchanged | reuse report |
| file hash changed | stale / regenerate |
| provider/model changed | regenerate or mark policy-changed |
| semantic mode changed | regenerate or mark policy-changed |

`SemanticFileUnderstandingReport` stays a **canonical artifact** (it is an
operator-visible source-understanding report), not a hidden cache. Incremental selection
uses **file path + sha256**: if the latest report for a path has a matching sha256 and the
same semantic mode/provider/model policy, the batch command skips it; if the file's
sha256 changes, the prior report is stale; changing provider/model (or semantic mode) may
force a new report even when the file hash is unchanged.

## Source Text Privacy Model

**Source text is not sent to providers by default.** Source contents go to a provider only
when the operator explicitly chooses a semantic mode that uses a provider (`--semantic
auto` / `--semantic required`) or repo config explicitly enables it. The batch command's
privacy default is `--semantic off` (deterministic only, no provider, no key read). With
`--semantic auto` and no provider/key, it falls back to a deterministic report and makes
no provider call; with `--semantic required` and no provider/key, it fails cleanly and
writes no report. This mirrors the shipped single-file command.

## Intent Context Relationship

`SemanticFileUnderstandingReport` **is proposal/context, not proof.** It may later feed
intent context as additional context — `IntentAssessmentReport` may use it as extra
context and `IntentPlanActionabilityReport` may use it to improve source grounding — but
it must never become proof, must not approve plans, and must not replace the deterministic
EvidenceGraph / CapabilityMap / StepCapabilityGraph. Automatic consumption is **deferred**
until the batch command exists and is reviewed.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| scan default | deterministic |
| provider calls | explicit/configured only |
| source text privacy | not sent by default |
| semantic report vs proof | proposal/context |
| semantic report vs approval | no approval |
| semantic report vs command execution | no execution |
| semantic report vs source writes | no writes |
| semantic report vs embeddings | none |
| intent:go | deferred |

Pinned boundary statements:

- **Scan remains deterministic by default.**
- **Semantic file understanding during scan is explicit opt-in only.**
- **Provider calls are never surprising defaults.**
- **Source text is not sent to providers by default.**
- **SemanticFileUnderstandingReport is proposal/context, not proof.**
- **Semantic file understanding does not approve plans.**
- **Semantic file understanding does not execute commands.**
- **Semantic file understanding does not write source files.**
- **Semantic file understanding does not generate embeddings.**
- **Embeddings remain deferred to a separate track.**
- **intent:go remains deferred.**

## Decision questions answered

1. **Should semantic file understanding integrate with scan?** Eventually — but via an
   explicit batch command first, then optionally a scan flag.
2. **Should it run by default?** No.
3. **What opt-in flag/command should enable it?** A new `rekon semantic files understand
   --changed|--all` command; later, `rekon scan --semantic-files off|auto|required`.
4. **Should scan call it directly or delegate to a separate command?** A separate batch
   command first; a scan flag is deferred.
5. **Should it be incremental / source-hash based?** Yes — path + sha256.
6. **How are stale reports detected?** A changed file sha256 makes the prior report stale.
7. **Canonical artifacts or cache/index area?** Canonical artifacts (operator-visible),
   with sha256-based reuse for incremental selection.
8. **Should source text be sent to providers by default?** No.
9. **How is source privacy represented?** Via the explicit `--semantic off|auto|required`
   mode; default `off`.
10. **How does provider routing work during the batch?** The same router-bound adapter as
    the single-file command; the CLI is the only env-key reader.
11. **What file selection policy should v1 use?** `--changed` / `--all` / `--path`, skipping
    ignored/binary/generated/oversized files.
12. **Should reports feed intent context?** As proposal/context only, and deferred until
    the batch command exists.
13. **Should `IntentAssessmentReport` use them?** Optionally, later, as context — not proof.
14. **Should `IntentPlanActionabilityReport` use them?** Optionally, later, for source
    grounding — not proof.
15. **How does this relate to embeddings?** Separate and deferred.
16. **What slice follows?** Semantic Files Understand Batch Command v1.

## What This Does Not Do

This decision implements no scan integration, changes no scan behavior, runs no providers,
implements no embeddings, adds no vector storage or retrieval, adds no providers, executes
no commands, writes no source, creates no PreparedIntentPlan / WorkOrder / VerificationPlan
/ VerificationRun / VerificationResult, runs no Circe, implements no intent:go, publishes
nothing to npm, and bumps no versions.

## Implementation Sequence

1. **Semantic Files Understand Batch Command v1** (next): `rekon semantic files understand
   --changed|--all` with source-hash reuse/staleness, provider/source-privacy boundaries,
   and a batch summary. Still no embeddings, source writes, command execution,
   auto-approval, or intent:go.
2. A safety review of the batch command.
3. **Only then** decide the `rekon scan --semantic-files` flag.
4. Embeddings remain their own separate, later track (Embeddings Parity Audit / Embedding
   Index Decision).

## Related

- [Semantic File Understanding Safety Review](./semantic-file-understanding-safety-review.md)
- [Semantic File Understanding v1 strategy](./semantic-file-understanding-v1.md)
- [SemanticFileUnderstandingReport artifact](../artifacts/semantic-file-understanding-report.md)
- [Semantic File Understanding concept](../concepts/semantic-file-understanding.md)
- [Classic LLM Semantic Parsing Parity Decision](./classic-llm-semantic-parsing-parity-decision.md)

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](./semantic-file-understanding-scan-integration-safety-review.md).
