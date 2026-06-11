---
freshness:
  paths:
    - packages/capability-js-ts/src/**
---
# Work Order: Symbol-Facts EvidenceGraph Projection (WO-8, queue slot 0)

> Committed verbatim as issued by the operator (2026-06-10) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (evidence layer extension; no
detectors, no governance change). Sensor track, Phase 1 queue slot 0 per
`docs/strategy/detection-design-decisions.md`.

**Convention note:** lives in `docs/work-orders/`, committed before
execution; amendments land as commits.

**This is a thin work order on purpose.** The spec authority is the
graph-aware v3 decision memo (read it first; it defined this projection
and its consumers) plus the decisions doc's queue entry. This document
adds only the obligations the queue entry left implicit.

---

## Objective

Extend the EvidenceGraph with symbol-level facts: exported symbols (name,
kind, declaring file), import-specifier-level edges (which symbols a file
imports from where, beyond file-to-file), and re-export chains. AST-backed
via the existing extraction adapter, with the existing regex-fallback
parity discipline and per-fact provenance.

Unblocks, per the queue: slot 1 (symbol-level divergence axes), slot 5
(naming contract check), slot 6 (dead_code via unreferenced exports), and
stub-as-evidence; strengthens the WO-4.1 generality evidence (richer
import pairs on figma-ds).

## Obligations beyond the v3 memo

1. **Determinism proof:** re-running observe on an unchanged fixture
   yields deep-equal symbol facts (modulo timestamps), same as the WO-2
   determinism guard; fact ordering is stable.
2. **Scale evidence:** observe wall-clock recorded on mentor-family-mvp
   before and after (the WO-2 baseline exists); a regression beyond
   reasonable proportional cost is a finding, not a footnote.
3. **Corpus evidence:** fact counts per corpus repo in the completion
   summary, and specifically the figma-ds resolvable-import-pair count
   versus the prior 14, since slot 1's verification re-runs the
   generality check on this richer graph.
4. **No emitters.** The bench is expected to read 0.0% unchanged; any
   bench movement from this slice is a defect.
5. **Freshness and provenance unchanged in shape:** symbol facts carry
   the same provenance discipline as existing facts; no new staleness
   semantics.

## Non-goals

Call-graph edges (callers/callees) unless the v3 memo explicitly scopes
them here; detectors of any kind; schema changes beyond the fact types
the memo names; runtime facts.

## Verification plan

Required checks (per AGENTS.md): `npm run typecheck` / `npm run test` /
`npm run build`.

Slice-specific evidence: AST-vs-fallback parity tests on fixtures;
determinism deep-equal; the scale and corpus numbers above; bench re-run
showing no movement.

## Completion summary must include

CHANGES MADE / PUBLIC API CHANGES / TESTS · VERIFICATION (fact counts,
figma-ds pair count, wall-clock delta, bench unchanged) / INTENTIONALLY
UNTOUCHED / RISKS · FOLLOW-UP / NEXT STEP (expected: queue slot 1, the
cluster-A divergence detector, with the non-production-path advisory fix
and the figma-ds generality re-run folded in).

---

## PURPOSE PRESERVATION CHECK

- **Original problem:** detection goals that need symbol-level truth
  (naming contracts, dead exports, fine-grained boundary law) can't be
  served by file-granularity evidence.
- **Classic workflow guarantee:** classic's per-file analysis carried
  exports and capabilities; the detection value of several trusted rules
  rested on it.
- **Rekon equivalent guarantee:** the same truth, carried as provenanced
  graph facts the whole substrate can join against.
- **What would mean we failed:** nondeterministic fact emission breaking
  downstream dedupe keys; a silent scale regression; or scope creep into
  detector work.
- **Regression test:** the determinism deep-equal and the parity tests,
  permanent.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** per-file export/symbol analysis,
  re-carried as graph facts per the graph-aware v3 memo.
- **What Rekon keeps:** the truth; **what it redesigns:** the carrier
  (graph facts over per-file cache entries).
- **How this advances the migration:** four queue entries and one
  generality claim stand on this projection.
