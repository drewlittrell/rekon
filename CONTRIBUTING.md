# Contributing

Rekon is open-source from the first commit. Contributions should preserve public package boundaries and treat API, docs, examples, and generated artifacts as product surfaces.

## Ground Rules

- Use Rekon naming consistently: `Rekon`, `rekon`, `.rekon/`, `REKON_`, and `@rekon/*`.
- Do not import from `codebase-intel-classic`.
- Built-in capabilities must use `@rekon/sdk`.
- Generated artifacts must include schema version, producer metadata, input refs, and provenance.
- Capabilities must declare consumes, produces, permissions, and invalidation rules.
- Keep kernel packages pure and side-effect free.

## Local Checks

```sh
npm install
npm run typecheck
npm run test
npm run build
```

Run `npm run lint` when linting is configured.
