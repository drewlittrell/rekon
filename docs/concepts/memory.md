# Memory

Rekon's memory capability captures operator guidance and feeds the
resolvers (and, indirectly, publications) without ever rewriting
canonical repo facts. This batch (memory ranking / curation v1)
makes memory selection scoped, ranked, freshness-aware, verification-
aware, and explainable.

This is the alpha "lite" form of classic operator feedback. See the
**Operator Feedback And Memory** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and the **P1.2** guarantee in
[../strategy/classic-guarantee-regression-plan.md](../strategy/classic-guarantee-regression-plan.md).

## Why It Exists

Operators routinely correct agents and supply project-specific
guidance: "the provider retry policy belongs in the provider layer",
"do not edit the generated dist directory", "this finding is accepted
risk." Without durable, scoped, quality-managed memory, agents
forget those corrections and either re-litigate them or over-apply
generic advice.

Bad memory is dangerous: a stale broad note that says "be careful
with the codebase" can outweigh a fresh path-specific verified rule
and produce prompt sludge that misleads later work. The point of
ranking / curation is to keep good memory salient and stale or
unverified memory out of the way.

Memory **never** mutates ownership, rules, findings, or evidence.
It enriches resolver output and publications with explainable
guidance.

## What Changed In v1

- `OperatorFeedbackEntry` gained optional scope (`systems`,
  `capabilities`, `layers`, `tags`), quality signals (`reliability`,
  `priority`), provenance (`createdAt`, `updatedAt`, `source`,
  `status`), verification (`verification.status`,
  `verification.verifiedAt`, `verification.verificationResultRef`),
  and a free-form `rationale`. Existing entries that have only
  `instruction` / `scope.paths` / `scope.goal` / `confidence`
  continue to rank correctly via fallbacks (default reliability 0.5,
  default priority `normal`, default status `active`).
- `MemorySelection` gained a structured `query`, a `selected` array
  whose entries carry `id` / `score` / `reasons` / `match` /
  `priority` / `verification`, and a `rejected` array naming
  entries that were filtered out and why. The legacy `selections`
  array is preserved (and now equals `selected`) so the resolver
  and any older consumer keep working unchanged.
- `rekon memory add` accepts richer flags: `--system`,
  `--capability`, `--tag` (repeatable), `--layer` (repeatable),
  `--priority low|normal|high`, `--reliability <0..1>`,
  `--verified`, `--rationale <text>`. Existing flags still work.
- `rekon memory select` accepts new filters: `--system`,
  `--capability`, `--tag` (repeatable), `--limit <n>`. Existing
  `--path` / `--goal` continue to work.

## Ranking Algorithm

Selection is deterministic and reason-attached. There is no LLM in
the loop.

For every active entry, the scorer starts at `0.1` and applies:

| Signal | Adjustment | Reason added |
| --- | --- | --- |
| Exact path match (`scope.paths` includes `query.path`) | +0.45 | `path-exact-match: <path>` |
| Path prefix match (one of the scope paths is a prefix of the query path, or vice versa) | +0.35 | `path-prefix-match: <path>` |
| System match (`query.system` ∈ `scope.systems`) | +0.25 | `system-match: <system>` |
| Capability match (`query.capability` ∈ `scope.capabilities`) | +0.2 | `capability-match: <capability>` |
| Tag match per matching tag, capped at +0.2 | +0.1 each | `tag-match: <tag>` |
| Entry has scope but nothing matched the query | reject | `scope-mismatch` |
| Entry has no scope at all (paths/systems/capabilities/tags all empty) | +0.05 | `no-scope-fallback` |
| `verification.status === "verified"` | +0.2 | `verified` |
| `verification.status === "disputed"` | reject | `disputed-rejected` |
| `status === "deprecated"` | reject | `deprecated-rejected` |
| `status === "superseded"` | reject | `superseded-rejected` |
| `reliability` (default 0.5) | + reliability × 0.15 | `reliability-<value>` or `low-reliability-<value>` for ≤0.25 |
| `priority === "high"` | +0.1 | `high-priority` |
| `priority === "low"` | −0.05 | `low-priority` |
| Updated within 30 days | +0.1 | `fresh-within-30-days` |
| Updated within 180 days | +0.05 | `fresh-within-180-days` |
| Older than 365 days | −0.1 | `stale-over-365-days` |
| Exactly one of paths/systems/capabilities/tags scoped | +0.1 | `scoped-specific` |
| No scope at all (already matched no-scope-fallback) | −0.05 | `broad-scope-penalty` |

The final score is clamped to `[0, 1]`. Ties are broken by
specificity (descending), then by `updatedAt` (descending), then by
artifact id (ascending).

Rejected entries are surfaced in `selection.rejected` so curators
can see what was filtered and why.

## CLI Surface

```sh
rekon memory add --root <repo> \
  --instruction <text> \
  --path <path> \
  [--goal <goal>] \
  [--system <system>] \
  [--capability <capability>] \
  [--tag <tag>] \
  [--layer <layer>] \
  [--priority low|normal|high] \
  [--reliability <0..1>] \
  [--verified] \
  [--rationale <text>] \
  [--json]
```

```sh
rekon memory select --root <repo> \
  --path <path> \
  [--goal <goal>] \
  [--system <system>] \
  [--capability <capability>] \
  [--tag <tag>] \
  [--limit <n>] \
  [--json]
```

Both commands return JSON shapes that include the legacy fields
plus the new ranking metadata.

## Output Shape

```json
{
  "artifact": { "type": "MemorySelection", "id": "memory-selection-...", "path": "..." },
  "selection": {
    "header": { "...": "..." },
    "path": "src/index.ts",
    "goal": "modify bootstrap",
    "query": {
      "path": "src/index.ts",
      "paths": ["src/index.ts"],
      "goal": "modify bootstrap",
      "system": "src",
      "capability": null,
      "tags": null
    },
    "selections": [ "... legacy array, equals 'selected' ..." ],
    "selected": [
      {
        "id": "feedback-...",
        "instruction": "Preserve bootstrap behavior.",
        "score": 0.91,
        "reasons": [
          "path-prefix-match: src",
          "system-match: src",
          "verified",
          "high-priority",
          "fresh-within-30-days"
        ],
        "match": { "paths": ["src"], "systems": ["src"] },
        "priority": "high",
        "verification": "verified",
        "scope": { "paths": ["src"], "systems": ["src"], "tags": null },
        "confidence": 0.91,
        "reason": "scope prefix match"
      }
    ],
    "rejected": [
      { "id": "feedback-deprecated-...", "reasons": ["deprecated-rejected"] }
    ]
  }
}
```

## Resolver Integration

`resolve.preflight` continues to read memory through the existing
`applicableMemory` path. Because the resolver reads `selection.
selections[*].instruction` / `scope` / `confidence` / `reason`, the
v1 enrichment is fully backwards compatible — older entries surface
with the same legacy fields, and ranked entries surface with the
same legacy fields plus the new `id` / `score` / `reasons` / `match`
fields.

## Publication Integration

The [agent operating contract](agent-operating-contract.md) reads
the latest `MemorySelection` and renders the ranked `selected[*]`
entries (those with `reasons`) in its Memory Guidance section.
Entries without `reasons` are intentionally excluded — the
operating contract only carries memory it can explain. The
architecture summary and proof report do not surface memory
directly; they remain focused on governance and proof state.

**Invariant:** memory cannot mutate `ownerSystems`, `risk`,
`findings`, `status`, or `nextRequiredResolver` in a resolver
packet. The contract test `preflight resolver includes selected
memory but does not mutate ownerSystems or finding status` pins
this. Route / seam / issue resolvers do not consume memory in this
alpha; that is documented as deferred follow-up rather than a
silent gap.

## Curation Surface

Curation/promotion is intentionally deferred to a later batch. v1
ships:

- **Rejection visibility** — entries with `status: "deprecated"`,
  `status: "superseded"`, or `verification.status: "disputed"`
  appear in `selection.rejected` so a curator can see what is being
  excluded and why.
- **Freshness penalty** — entries older than 365 days surface the
  `stale-over-365-days` reason. The entry is still selected so the
  operator can update or deprecate it.
- **Reliability signal** — low-reliability entries (`reliability
  <= 0.25`) surface `low-reliability-<value>` so curators see them.

Future work (out of scope here): automatic promotion of consistently
used + verified entries into `Rulebook` rules, supersession chains,
context-usage analytics, decay policies beyond simple freshness.

## What This Is Not

- **Not architecture facts.** Memory entries never appear in
  `OwnershipMap`, `CapabilityMap`, `ObservedRepo`, `FindingReport`,
  `CoherencyDelta`, `WorkOrder`, or `VerificationResult`.
  Resolvers may *read* memory; they never write findings or
  ownership from it.
- **Not an LLM summarizer.** No model is called. All ranking is
  deterministic.
- **Not a chat log promoter.** No automatic extraction from agent
  transcripts.
- **Not a global / org-wide store.** Each `.rekon/` is independent.
- **Not an automatic curation engine.** `rekon memory curation`
  produces a `MemoryCurationReport` that *recommends* keep /
  reinforce / review / deprecate / supersede-candidate, but **never**
  mutates `OperatorFeedbackEntry.status`. Operators apply curation
  decisions explicitly.

## When To Use Memory

- After repeatedly correcting the same agent mistake — record the
  correction with `rekon memory add --path <where> --system
  <system> --verified --rationale <why>`.
- When governance decisions (e.g. an accepted finding's policy
  context) need to be visible to future agents — record the
  decision as scoped, verified memory.
- When onboarding a new repo — seed `rekon memory add` for the
  highest-cost mistakes operators expect to repeat.

## CLI Smoke

```sh
node packages/cli/dist/index.js memory add \
  --root examples/simple-js-ts \
  --instruction "Preserve bootstrap behavior." \
  --path src --system src \
  --priority high --verified --reliability 0.9 \
  --rationale "Repeated operator correction." --json

node packages/cli/dist/index.js memory select \
  --root examples/simple-js-ts \
  --path src/index.ts --goal "modify bootstrap" --system src --json

node packages/cli/dist/index.js resolve preflight \
  --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
```

## Recording And Curating Memory Quality

Selection is not usage. After a memory helps or hurts, record the
outcome explicitly so future curation runs can recommend keep /
reinforce / review / deprecate / supersede-candidate. See
[memory-curation.md](memory-curation.md) for the full concept.

```sh
node packages/cli/dist/index.js memory usage record <memory-entry-id> \
  --root examples/simple-js-ts --outcome helpful \
  --note "Helped scope the change." --json

node packages/cli/dist/index.js memory usage list \
  --root examples/simple-js-ts --json

node packages/cli/dist/index.js memory curation \
  --root examples/simple-js-ts --json
```

## Cross-References

- [Memory artifacts](../artifacts/memory-artifacts.md)
- [Operator memory entry](../artifacts/operator-memory-entry.md)
- [Memory selection](../artifacts/memory-selection.md)
- [Memory usage ledger](../artifacts/memory-usage-ledger.md)
- [Memory curation report](../artifacts/memory-curation-report.md)
- [Memory curation concept](memory-curation.md)
- [Resolvers](resolvers.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
- [Beta readiness / remaining classic-parity review](../strategy/beta-readiness-classic-parity-review.md)
- [Source-write reconciliation policy decision](../strategy/source-write-reconciliation-policy-decision.md)
