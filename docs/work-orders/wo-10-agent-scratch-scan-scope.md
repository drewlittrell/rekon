---
freshness:
  paths:
    - packages/capability-js-ts/src/**
---
# Work Order: Agent-Scratch Scan Scope (WO-10)

> Committed verbatim as issued by the operator (2026-06-10) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** implementation (observe-level scope fix; small). Sensor
track. **Convention notes:** committed before execution; Step 0 applies in
its light form (confirm where the file walk happens and that no exclusion
config exists before adding one).

**Defect, from the WO-9 triage** (`rekon-parity-corpus/triage-v2.json`):
observe scans embedded agent scratch trees. Mentor's corpus copy carries a
full duplicate app tree under `.claude/worktrees/`, producing 122 of 245
detector findings (50%) as contamination and inflating WO-8's fact counts.
Rekon's own repo carries executor worktrees and has the same exposure.
Classic's `isNonProductionPath` predates this contamination class; it's an
agent-era artifact.

## Scope

1. **Default observe exclusions** for agent scratch directories: `.claude/`
   and `.codex/`, applied at the file-walk level so excluded trees produce
   no facts in any provider (AST and fallback both). Configurable: the
   operator can extend or override the list in repo config; the default
   ships on.
2. **Contract test:** a fixture with an embedded scratch tree yields zero
   facts from it, with the exclusion list respected and the override path
   tested.
3. **Restate the numbers.** Re-run observe across the corpus and the
   bench: WO-8's fact-count table restated (per repo, with the figma-ds
   pair count and the mentor wall-clock), WO-9's movement table restated,
   and the 163-versus-89 unmatched reconciliation reported against the
   clean scan. The completion summary shows before/after side by side.
4. Rekon self-scan refreshed; its own worktree contamination delta
   reported.

## Non-goals

No `.gitignore`-driven scoping (a larger design question with different
semantics; recorded as a follow-up decision). No law calibration (the
middleware-edge overlay is a separate operator act). No detector changes.

## Verification

Required checks per AGENTS.md, the contract test above, and the restated
tables. Expected direction: mentor detector findings drop by roughly the
122 contamination findings; fact counts drop proportionally; recall
percentages shift only by denominator-side cleanup, with every delta
explained in the summary.

## PURPOSE PRESERVATION CHECK

- **Original problem:** evidence must describe the repo's source, and
  agent scratch trees are duplicated source the repo doesn't own.
- **What would mean we failed:** exclusions applied at the finding level
  instead of observe (facts still polluting the graph), or the default
  list silently swallowing a directory an operator declared as real
  source (the override path is the guard).
- **Regression test:** the fixture, permanent.

## CODEBASE-INTEL ALIGNMENT

Classic's non-production scoping, extended to a contamination class that
didn't exist when classic was written. The agent era scanned its own
workbenches; this slice teaches the scanner the difference.
