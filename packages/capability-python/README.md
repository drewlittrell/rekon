# @rekon/capability-python

Built-in Python evidence capability for Rekon.

## Stability

Label: `experimental, public`.

## Purpose

The capability runs during `Observe` and emits source-backed `file`, `import`,
`export`, `symbol`, `test`, `entry_point`, `ownership_hint`, and
`capability_hint` facts. Imports resolve to repository files only when the
target is unique. It also emits `python:injected_dependency` for a narrow
constructor-injection shape: a class stores and calls at least two constructor
parameters and each parameter has one same-package class-name match.

The injected-dependency fact describes a deterministic source pattern and a
bounded name-resolution candidate. Its confidence and provenance are retained;
it does not establish runtime wiring.

## Public Surface

The default export is an SDK capability definition. `pythonProvider`,
`extractPythonImports()`, and `extractPythonSymbols()` are public for capability
testing and deterministic tooling.

## Boundaries

This package reads Python source and writes evidence through the runtime. It
does not execute Python, import application modules, call a model, or classify
bugs. Parser and file-walk helpers not exported from the package root are
`internal`.
