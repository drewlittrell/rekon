# @rekon/capability-memory

Built-in Rekon memory capability.

The package uses the public `@rekon/sdk` learner API. It writes typed
`OperatorFeedbackEntry`, `MemoryEvent`, and `MemorySelection` artifacts.
Memory selections can enrich resolver packets, but memory does not rewrite
ownership, rules, findings, or other architecture facts.
