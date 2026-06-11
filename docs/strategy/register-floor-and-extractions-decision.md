# Register Floor and Triage Extractions - Decision (WO-21)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-21, law track rekon home + corpus data gathering).**
Dispatch ratified both rulings; nothing was struck.

## Parts 1 and 2: the floor is reached

Both rulings landed as exceptions on rekon's consoleLogging overlay row
(both checkouts), compiled with clean notes:

- `operator:wo-21#logging-seam`: `packages/runtime/src/index.ts` - the
  stderr writes are the seam implementing logging, the one sanctioned
  console boundary (the WO-17 claim verbatim).
- `operator:wo-21#law-text-as-data`:
  `packages/capability-ontology/src/grammar/packs/**` - grammar pack
  sources quote the patterns they forbid, and quoting a pattern is part
  of forbidding it, never committing it.

**The general class, named:** any repo hosting law text hits
law-text-as-data - detection signals matching the law's own quoted
examples. **The codebase-intel check came back clean:** its three
remaining console fires (handlers/validate-config.handler.ts,
lib/intent/state.ts, prompts/memory/legacy/20260423.snapshot.mjs) are
NOT law-text hosts (classic's law lives in YAML the scanner does not
read as source). No candidates; nothing stretched.

**Rekon self-scan: 5 -> 3.** The home register floor: 3 debt markers,
inventory by design, plus the BXRX port on simulacrum's side.

## Part 3: the three extractions (corpus root, never committed)

| File | Records | Coverage |
| --- | --- | --- |
| triage-ui-domain.json | **56** unmatched ui-edge findings | 56/56 with import line + 2-line context + file head |
| triage-business-logic.json | **24** (mentor 20 + ci 4) | 24/24 with the law's own detection-regex signal line + context + head |
| triage-dead-exports.json | population **1,491**, sample **30** | 24/30 with export line (6 are star-reexport shapes the declaration regex cannot pin; noted per record); every record carries file importer count + head |

**A reporting correction, recorded (the WO-17 memo is a snapshot and
stands; this memo carries the correction):** WO-17's "94 appeared, every
one ui->domain" was an axis-level over-summary. The activated-edge set
decomposes as **ui->domain 11 + ui->infra 83** (both edges the ui
declaration activated in the fullstack topology). The WO-21 "~54
ui-to-domain" inherited that compression; the extraction covers the
full activated ui-edge cluster as the order's intent (the precision
question on the campaign's newest recall): 94 total, 38 file-matched to
classic architecture-family keeps, **56 unmatched extracted** (7
ui->domain + 49 ui->infra).

Sampling method (dead-exports): proportional by top-level directory,
deterministic even-spacing within strata; strata counts recorded in the
file. The population (1,491 export names across mentor's dead_code
findings) supersedes the order's ~900 estimate - reported, not
absorbed.

No judgment in this slice; the planner's pass follows.

## Expected deltas, verified

- Rekon: 5 -> 3 exactly (one per ruling).
- Bench: untouched, 8.7% (520/5,950); **all four corpus repos PROVEN
  byte-identical** (findings) - the extractions read, never write.
- Same-slice contradictions: none (the ci class check above reports no
  candidates).

## The register after this slice

| Item | Disposition |
| --- | --- |
| debt.markers (3) | inventory by design - THE FLOOR |
| BXRX port | simulacrum's recorded item |
| planner queue | the three triage JSONs await the judgment pass |
