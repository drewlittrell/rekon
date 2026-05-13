# @rekon/capability-reconcile

Built-in Rekon reconciliation capability.

The initial actuator is intentionally constrained. It validates reconciliation
plans, supports dry-run, and writes artifact-only logs. Source-writing and
command-running operations fail unless a future runtime permission model
explicitly enables them.
