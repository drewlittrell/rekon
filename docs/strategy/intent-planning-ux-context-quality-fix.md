# Intent Planning UX / Context Quality Fix

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — a context substrate, not a proof
> artifact; it may guide humans and agents but must not approve plans, execute
> commands, or write source files; consumption stays explicit; intent prepare /
> approve / status / handoff remain separately gated; intent:go deferred. Next:
> TaskContextReport Human/Agent Context Export. See
> [`task-context-report-broader-workflow-decision.md`](./task-context-report-broader-workflow-decision.md).

> **Slice 175 · product capability batch.** Base `f210b1c`. Fixes the one
> non-blocking ergonomics issue carried out of the TaskContextReport intent
> dogfood and its safety review: `rekon context task` with an existing embeddings
> index, no `--path`, and an implicitly-defaulted provider whose key is missing
> used to exit non-zero. It now degrades gracefully to a graph + lexical context
> fallback. No new artifact, no new command, no boundary weakened.

## Decision Summary

The full task-context intent dogfood path is safe/stable. The only carried issue
was UX: `rekon context task` with an existing embeddings index but an
**implicitly-defaulted** embedding provider (`voyage`) and a missing API key
exited non-zero instead of degrading. This fix makes that one case degrade
gracefully while keeping explicit-provider failures strict.

**Implicit embedding-provider failure degrades to graph + lexical context or a
clear warning.** **Explicit provider failure remains visible and strict.** The
fix changes only the `rekon context task` CLI branch plus a pure, additive
`selectLexicalGraphContextPaths` helper and an opt-in `lexicalContextPaths` input
to `buildTaskContextReport`. **Task context remains proposal/context, not proof.**

## The Issue

| Scenario | Before | After |
| --- | --- | --- |
| `context task --path ...` | reliable | unchanged (reliable) |
| `context task --provider mock ...` | reliable | unchanged (reliable) |
| `context task` (no index, no `--path`) | `context-retrieval-unavailable` | unchanged (still fails cleanly) |
| `context task` (index, implicit `voyage`, no key, no `--path`) | **exits non-zero** | **degrades to graph + lexical context** |
| `context task --provider voyage` (no key) | strict failure | unchanged (strict failure) |

The surprising behavior was the fourth row: an embeddings index existed, the
operator passed no explicit provider, the internal default (`voyage`) had no API
key, and the command failed rather than degrading.

## The Fix

1. **Distinguish explicit from implicit provider.** `context task` records
   whether the operator passed `--provider` (explicit) or the command defaulted
   internally to `voyage` (implicit), and whether an embedding call was actually
   attempted and failed (e.g. `missing-api-key`).
2. **Graph + lexical fallback for implicit failure.** When there is no embedding
   retrieval and no `--path`, and the failure came from an implicitly-defaulted
   provider, the command derives candidate context paths by lexically matching the
   task text against graph file nodes (and the labels of capabilities they
   implement) via the pure `selectLexicalGraphContextPaths` helper, then builds a
   TaskContextReport from those graph nodes. The selected nodes are **real
   deterministic graph facts**; only the *selection* is lexical, and the items are
   labelled `deterministic_graph` with a fallback reason.
3. **Strict explicit failure.** An explicit `--provider` that fails (e.g.
   `--provider voyage` with no key) still fails cleanly with
   `context-retrieval-unavailable`. **Explicit provider failure remains visible
   and strict.**
4. **Honest, no fabrication.** If the lexical fallback finds no matching graph
   node and there is no `--path`, the command still fails cleanly with
   `context-retrieval-unavailable` — it never emits misleading empty context.
5. **Visible warnings + retrieval status.** The fallback path adds
   `provider-unavailable` and `graph-lexical-fallback` warnings and a
   `retrieval: { status: "fallback", fallback: "graph-lexical" }` field to the
   JSON output, and surfaces the fallback warning in the human output.

## Boundary Model

Nothing about the trust model changed. **Task context remains proposal/context,
not proof.** **Verification hints remain hints, not executed commands.** **Source
files are not written.** **No commands are executed.** **No WorkOrder or
VerificationPlan is created.** **No Circe is run.** **intent:go remains
deferred.** Deterministic graph facts still outrank embedding similarity; the
lexical fallback only ever surfaces nodes that already exist in the deterministic
graph.

### Boundary table

| Boundary | Fix Finding |
| --- | --- |
| task context vs proof | proposal/context |
| explicit provider failure | strict / visible |
| implicit provider failure | degrades to graph + lexical |
| fabricated context | never (fails cleanly on no match) |
| verification hints | hints, not executed commands |
| source writes | none |
| command execution | none |
| WorkOrder / VerificationPlan | none |
| Circe | not run |
| intent:go | deferred |

## Retrieval-Assisted Context Review

The graph + lexical fallback is a deterministic, conservative heuristic: it
tokenizes the task text (dropping short and structural words), matches against
graph file-node path tokens plus implementing-capability label tokens, ranks by
overlap then lexicographically, and caps the result. It invents nothing, reads no
files, calls no providers, and executes nothing. Embedding retrieval (with a real
provider) remains the preferred, higher-signal path; the fallback exists so an
operator without an embedding key still gets useful, honestly-labelled graph
context instead of a hard failure.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| degrade implicit failure to graph + lexical | selected | fixes the exact ergonomics issue |
| keep explicit failure strict | selected | explicit requests must surface failures |
| degrade explicit failure too | rejected | would hide an operator's explicit choice |
| fabricate context when no match | rejected | misleading; fail cleanly instead |
| make task context automatic | rejected | out of scope; explicit opt-in remains |
| redesign provider architecture | rejected | unnecessary for this fix |

## What This Does Not Do

No automatic task context; no change to `intent assess` / `intent plan review`
behavior; no change to prepare / approval / status / handoff gates; no broader
workflow use; no duplicate detection; no canonical recommendations; no provider
architecture change; no OpenAI embeddings; no ANN/HNSW; no executed verification
hints; no target-repo command execution; no source writes; no plan approval; no
PreparedIntentPlan / WorkOrder / VerificationPlan creation; no Circe; no
intent:go; no npm publish; no version bump; no branch.

## Tests / Verification

A 19-assertion contract test
(`tests/contract/intent-planning-ux-context-quality.test.mjs`) exercises the
implicit-degrade path, the strict explicit-failure path, the preserved
`--path` / `--provider mock` / retrieval-low-signal / hint / do-not-touch
behaviors, and the source-immutability and no-handoff-artifact boundaries. A
12-assertion docs test locks in this memo's boundary statements. Full keyless
9-command gate plus a CLI dogfood of the exact failing scenario.

## Recommendation

Ship the fix. The implicit provider-default missing-key case now degrades
gracefully; broader agent/operator workflow use is unblocked. Next:
**TaskContextReport Broader Workflow Decision** (alternative: **Intent Planning UX
/ Context Quality Safety Review**).

## Related

- [TaskContextReport Intent Dogfood Safety Review](./task-context-report-intent-dogfood-safety-review.md)
- [TaskContextReport Intent Dogfood](./task-context-report-intent-dogfood.md)
- [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md)
- [Task-Shaped Context](../concepts/task-shaped-context.md)
