# Symbol-Facts Projection v2 Decision (WO-8, queue slot 0)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-8, sensor track).** Spec authority is the
graph-aware v3 memo, whose v1 (export/symbol facts) already shipped; this
records only the decisions v2 (import-specifier edges, re-export chains,
target resolution) added.

## Two new fact kinds, never value enrichment of existing ones

`import_specifier` and `reexport` are NEW kinds rather than fields added
to `import`/`export` facts. Fact ids hash `kind + subject + value`;
enriching existing values would have shifted every import fact's id and
broken downstream dedupe keys against historical graphs — the exact
failure the work order names. Existing kinds are byte-identical to
pre-slice output.

## Dedupe surface: no location in value OR provenance

Export/symbol facts omit location from `value` (v1 precedent).
The new kinds omit it from `provenance` too: the dedupe key includes
provenance while the id does not, so a line-bearing provenance lets two
facts share an id while failing to dedupe — an id collision. Caught by
the dedupe test during this slice; repeated identical imports now
collapse to one fact, aliased bindings stay distinct.

## Resolution: declared truth only, fixed probe order

`resolvedTarget` appears on the new kinds when the specifier resolves
against the scanned file set: relative specifiers (`./`, `../`) and
**tsconfig `compilerOptions.paths` aliases**. The v3 memo's "no tsconfig
resolution" pin governs the parser layer (no `ts.Program`, no
typechecker); reading `paths` as plain config data at the provider is
edge resolution, not program construction, and the work order's own
figma-ds pair-count obligation is unreachable without it (the repo
imports almost exclusively via `@/*`). Probe order is fixed (exact,
`.js`→`.ts` ESM swap, extensions, `index.*`); aliases are
longest-prefix-first; a miss yields no `resolvedTarget` — never a guess.
Undeclared conventions (`~/`, root-bare) do not resolve.

## JSONC handling: string-aware scanner, not regexes

The recorded lesson: a naive block-comment regex eats everything between
the `/*` inside a `"@/*"` paths key and the `*/` inside a
`"**/*.test.ts"` exclude glob — exactly the strings tsconfigs are made
of. figma-ds's aliases silently parsed to zero until the stripper became
a string-aware scanner. Any parse failure still yields zero aliases:
resolution degrades, never errors.

## Side-effect imports are edges

`import "./x"` emits an `import_specifier` with `name: "*"`,
`specifierKind: "side-effect"` — it is a real file-to-file dependency
the pair count and future reachability work must see.

## Out of scope, recorded

Call-graph edges (not scoped by the memo); nested/monorepo tsconfig
discovery (root `tsconfig.json` only — extendable when a corpus repo
needs it); `extends` chains; package.json `imports`/`exports`
self-references.
