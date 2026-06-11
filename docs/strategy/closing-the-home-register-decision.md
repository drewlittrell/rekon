# Closing the Home Register - Decision (WO-20)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-20, law track, rekon home).** Dispatch ratified
every part; nothing was struck.

## The landing, every subtraction named

235 -> **5**: minus 224 (Part 1, exact: 204 + 20, `other: []`) minus 5
(Part 3 deletions: all five dead_code findings retired) minus 1
(Part 4: the cli fire under the command-surface claim). The remaining
5 = 3 debt markers (inventory by design) + 2 judged antiPattern stands.
Bench untouched at 8.7% (520/5,950); **all four corpus repos PROVEN
byte-identical** at the finding-id level.

## Part 1: the keyless-gate purpose claim

`distImportExemptions` gained `tests/contract/**` and
`packages/*/test/**` (`operator:wo-20#keyless-gate`, claim verbatim in
config). The 224 retired exactly; the register's
test-suite-consumes-built-output line is zero.

## Part 2: the kernel->contract edge

The edge joined the pack (`operator:wo-20#kernel-contract-edge`, noted
in the topology description; the schema has no per-edge source field).
Zero fires, as the WO-19 run predicted; the edge-matrix test gained the
row; corpus identity proven.

## Part 3: package entries are declared roots, survivors deleted

`declaredRoots: [{glob, reason}]` joined `.rekon/scan-scope.json`
(`operator:wo-20#package-roots`), expanding against the scanned file
set and joining the WO-14 manifest/convention roots (general law - it
also future-proofs packages whose manifests lack a main field; today
the conventions already resolved all 23 entries).

**Deletion list (all unambiguous; the arbiter was the typecheck plus a
repo-wide reference grep covering string references, codegen, and test
doubles - every flagged export had only in-file references):**

| File | Exports un-exported |
| --- | --- |
| capability-policy/src/dead-code.ts | GENERATED_GLOBS_CONFIG_PATH |
| capability-docs/src/intent-plan-bundle.ts | IntentPhaseVerificationPosture, IntentPlanBundleTarget |
| capability-js-ts/src/ast-extractor.ts | the 10 flagged Ast* type/interface names |
| capability-model/src/circe-operator-command-boundary.ts | CirceOperatorCommandPlacement |
| capability-model/src/intent-work-order-handoff.ts | IntentWorkOrderScope |

A fitting coda: the slice's own fresh addition (`DeclaredRootGlob`,
exported then consumed only internally) was caught by the detector in
the landing run and un-exported the same way - the law judged the law's
implementation, in-slice.

## Part 4: the antiPattern tail, all three enumerated

| File | Verdict |
| --- | --- |
| packages/cli/src/index.ts | RETIRED - command surface; the WO-17 claim extends by rekon's overlay (`operator:wo-20#command-surface`, exceptions packages/cli/** and packages/mcp/**, claim verbatim) |
| packages/runtime/src/index.ts | STANDS - the console.error calls are the runtime's log-line formatter (formatLogLine -> stderr): a logging-SEAM candidate, not a command surface. The WO-17 mentor seam claim fits verbatim but extending it to rekon needs its own overlay entry this order does not authorize. One-line follow-up ruling. |
| packages/capability-ontology/src/grammar/packs/grammar-base.ts | STANDS - a NEW FP class: law-text-as-data. The consoleLogging row's own dont/examples strings contain console.log, so the law's text matches the law's detection signal. No established ruling covers it; future ruling candidate (e.g. grammar pack files as a detection-data class). |

## Housekeeping

Same-slice contradictions per the WO-18 convention: checked, none
(home findings, not bench keeps; `overruled.json` untouched at 44).

## The home register after this order

| Item | Count | Disposition |
| --- | --- | --- |
| debt.markers | 3 | inventory by design |
| runtime logging-seam candidate | 1 | one-line follow-up ruling |
| law-text-as-data FP class | 1 | new class, ruling candidate |
| BXRX port | - | simulacrum's recorded item |

Self-scan: 250 (WO-18) -> 235 (WO-19) -> **5**. The register is closed
to the judged set: nothing on it is unexamined.
