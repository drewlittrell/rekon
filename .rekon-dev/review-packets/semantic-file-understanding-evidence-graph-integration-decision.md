# Review Packet — Semantic File Understanding → Evidence Graph Integration Decision

**Slice:** semantic-file-understanding-evidence-graph-integration-decision ·
**Base:** `33f28fb` · **Track:** semantic intelligence · **Type:** strategy /
architecture decision (no runtime/source change)

Decides how `SemanticFileUnderstandingReport` contributes LLM-derived inference
claims into `CapabilityEvidenceGraph`. Selects **Option B — explicit
semantic-report-to-graph integration.**

## CHANGES MADE

- New memo `docs/strategy/semantic-file-understanding-evidence-graph-integration-decision.md`.
- This review packet.
- New docs test (22 assertions).
- Cross-reference updates to 11 docs (graph memos/artifact/concept, semantic
  artifact/concept, release/migration notes, README, CHANGELOG).

## PUBLIC API CHANGES

None. Decision-only batch — no types, signatures, artifacts, or commands
changed.

## PURPOSE PRESERVATION CHECK

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates.
This decision keeps semantic interpretation on the *prepare* side: LLM file
understanding becomes graph *evidence* (inference claims), never graph *proof*.
Deterministic facts remain authoritative; semantic claims preserve
provider/model/provenance; unsupported claims stay needs-review/conflicted;
semantic reports never approve, execute, write source, or satisfy proof gates.
The product guarantee is preserved.

## CODEBASE-INTEL ALIGNMENT

The old `codebase-intel` system fused deterministic structure with LLM file
interpretation in one store. The architecture decision (slice 152) re-expressed
that as one evidence-backed graph. This decision specifies the first
LLM-evidence source — semantic file understanding — as `llm_extraction`
evidence and `llm` / `inference` claims, rebuilding the classic semantic layer
on the graph substrate without inheriting model authority.

## CURRENT SURFACES

Grounded at `33f28fb`. The kernel already supports the entire mapping with **no
type change**: evidence `source` set includes `llm_extraction`; claim `source`
set includes `llm`; `claimType` includes `inference`; `status` includes
`accepted` / `needs-review` / `conflicted`. `SemanticFileUnderstandingReport`
shape confirmed: `file{path,sha256,...}`, `normalizationTrace{provider,model,
provenance,...}`, `summary{purpose,responsibilities,publicExports,imports,
touchedConcepts}`, `capabilitySignals[{id,label,confidence,sourceEvidence}]`,
`findings[{id,severity,message,sourceEvidence,...}]`, `boundaries{8 false}`.

## OPTIONS CONSIDERED

A (deterministic forever) rejected/deferred; **B (explicit integration)
selected**; C (automatic consumption) rejected/deferred; D (semantic as facts)
rejected; E (wait for embeddings) rejected/deferred.

## MAPPING MODEL

report ref → `llm_extraction` evidence artifactRef; file path+sha256 → evidence
path / staleness; summary.purpose/responsibilities/touchedConcepts → inference
claims; capabilitySignals → capability nodes + inference claims; findings →
needs-review/conflicted claims; normalizationTrace → provider/model/provenance
metadata. Signal `confidence` enum maps to numeric `[0,1]` (low→0.25, medium→0.5,
high→0.75); never 1.0 (reserved for deterministic facts).

## CONFLICT MODEL

Deterministic facts win. Semantic export/import claims with no matching
deterministic `exposes`/`imports` fact → conflicted; unsupported capability →
needs-review; contradicting responsibility → needs-review/conflicted by
confidence.

## STALENESS MODEL

Consume only when path matches a file node, sha256 matches current hash (when
available), and report boundaries are all false. Stale → warn + skip, never
silent. Provider/model change → metadata/policy warning, not a proof problem.
v1: warn-on-stale, skip; optional `--semantic-report-staleness warn|block`
later.

## CLI SURFACE

`rekon capability graph build --semantic-file-reports latest` or
`--semantic-file-report-ref <ref>`. No flags → deterministic-only. The build
never calls a provider; it reads stored reports.

## BOUNDARY MODEL

14 pinned boundary statements (deterministic by default; inference not fact;
context not proof; deterministic facts win; preserve provenance; unsupported →
needs-review/conflicted; no silent stale; no approval/commands/source-writes/
WorkOrder/VerificationPlan/Circe; embeddings deferred; intent:go deferred).

## TESTS / VERIFICATION

- New docs test (22 assertions): headings, 14 statements, 4 tables, CHANGELOG,
  packet PURPOSE PRESERVATION CHECK.
- Full 9-command gate. No CLI smoke (decision-only).

## INTENTIONALLY UNTOUCHED

`CapabilityEvidenceGraph`, `SemanticFileUnderstandingReport`, the builders, the
CLI, the verification spine, embeddings, Circe. No source behavior changed.

## RISKS / FOLLOW-UP

- Confidence enum→numeric mapping is a pinned recommendation; the implementation
  must not emit 1.0 for semantic claims.
- `usedLlm: false` on the graph means "this build invoked no provider," not "no
  LLM data present" — the implementation may add a surface (e.g. a summary
  count) so operators see LLM-derived claims are present without flipping the
  boundary. Not a kernel change in this batch.
- Verb/noun derivation from capability signals may fail; those become
  needs-review claims, not capability nodes.

## NEXT STEP

**Semantic File Understanding → Evidence Graph Integration Implementation.**
