# Memory Artifacts

Memory artifacts retain scoped guidance and the evidence needed to decide
whether it should be delivered again.

| Artifact | Produced by | Consumed by |
| --- | --- | --- |
| `OperatorFeedbackEntry` | memory learner | selection and curation |
| `ContextUsageEvent` | CLI or MCP host | grounded outcome evaluation |
| `OutcomeEvent` | change validation and proof-gated refresh | grounded outcome evaluation |
| `ContextOutcomeEvaluationReport` | memory learner | curation |
| `MemoryCurationReport` | memory learner | task-context selection |
| `MemorySelection` | memory learner | resolvers and publications |

`ContextUsageEvent` records the exact bounded context delivered for one task,
including item identities, source-span keys, constraint and check digests, and
channel. Its projection digest covers the canonical delivery before the event's
own `contextUsageRef` is attached, avoiding a self-referential digest. Delivery
is not a claim that a model read or applied the context.

`OutcomeEvent` links a validation, accepted refresh, runtime observation, or
external result to exact context-usage refs. Repository proof, runtime
observations, and external evidence can ground an outcome. Self-report can be
recorded but cannot reinforce memory.

`context_for_task` returns the written `ContextUsageEvent` ref. Pass that ref
back to `validate_change` (or CLI `--context-usage`) so pathless discovery and
scope refinement retain exact delivery lineage even when the final diff is a
subset of the initially resolved scope.

`ContextOutcomeEvaluationReport` collapses shared artifact lineage before
classifying an item as `unobserved`, `associated`, `suggestive`,
`corroborated`, or `refuted`. One proof root counts once. Counterevidence
dominates. Evaluation scans at most 512 usage and outcome events; a truncated
window is marked `partial` rather than treated as complete.

At most one matching, unobserved entry may enter task context once as an
unresolved trial. It cannot repeat unless grounded outcomes classify it as
`suggestive` or `corroborated`. Every delivered entry carries `memory` trust,
its grounding status, and supporting refs. It cannot override repository law
or deterministic evidence.

All artifacts use the standard Rekon header with schema version, subject,
producer, input refs, freshness, and provenance. Memory must not rewrite
ownership, rules, findings, contracts, or architecture facts.
