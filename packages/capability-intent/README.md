# @rekon/capability-intent

Built-in Rekon intent and work-order capability.

The package consumes a `ResolverPacket` and writes `IntentMap`, `WorkOrder`,
and `VerificationPlan` artifacts. It is modeled as an SDK actuator because it
produces action-oriented artifacts, but the initial implementation performs no
source writes and executes no commands.
