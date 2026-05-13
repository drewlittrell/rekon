# @rekon/capability-reconcile

Built-in Rekon reconciliation capability.

## Stability

Experimental alpha.

## Purpose

The initial actuator is intentionally constrained. It validates reconciliation
plans, supports dry-run, and writes artifact-only logs. Source-writing and
command-running operations fail unless a future runtime permission model
explicitly enables them.

## Lifecycle Fit

Runs during `Act` after snapshots, resolver packets, docs, or work orders exist.

## Public Surface

The default export is a Rekon capability definition with actuator handlers for
artifact-only reconciliation operations.

## Import Boundary

Use this package as a capability. Do not bypass runtime permissions to write
source files or execute commands.
