# Freshness And Invalidation

Freshness is Rekon's current statement about whether an artifact can be
trusted relative to its declared inputs. Invalidation is the declared
reason an artifact should be regenerated.

This is one of the durable wins distilled from `codebase-intel-classic`:
generated context, derived intelligence, and publications go stale.
Rekon makes that fact explicit instead of silently lying.

See also:

- [classic-wins.md](../strategy/classic-wins.md) — "Freshness Must Be
  Explicit".
- [classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md) —
  the Watcher And Freshness behavior card.
- [classic-behavior-roadmap.md](../strategy/classic-behavior-roadmap.md) —
  phasing for watcher / file-change engine.

## Statuses

Artifact freshness uses four statuses:

- `fresh` — the artifact is based on the latest known required inputs
  and no freshness warnings exist.
- `stale` — the artifact is valid JSON and passes integrity checks, but
  a newer relevant input exists or declared invalidation rules say it
  should be regenerated.
- `partial` — the artifact exists but some expected input is missing or
  incomplete.
- `unknown` — Rekon cannot prove freshness because inputs are missing,
  lineage is absent, or invalidation rules are not available.

The same vocabulary applies to single artifacts and to aggregate results.

## Integrity Versus Freshness

Integrity and freshness are independent:

- Integrity asks: is the artifact structurally valid? Do the index
  entries match the on-disk files? Are digests correct? Are paths inside
  the workspace?
- Freshness asks: is the artifact still relevant given what we know
  about its inputs?

An artifact can pass integrity (`rekon artifacts validate` returns
`valid: true`) and still be `stale`. A `stale` artifact is not broken;
it is out of date.

## Current Alpha Behavior

Rekon does not yet run a watcher or file-change freshness engine. The
alpha runtime computes freshness from artifact lineage:

- Every artifact's `header.inputRefs` is inspected.
- For each input ref, the runtime checks whether the artifact index has
  a newer artifact of the same type that the consumer did not reference.
- Missing inputs and missing lineage are surfaced explicitly.

This is enough to answer questions like "did this `FindingReport`
evaluate the latest `EvidenceGraph`?" without polling the filesystem.

## Freshness Checks

The runtime applies these checks to every indexed artifact, optionally
filtered by `--type` and `--id` from the CLI:

1. **Input ref existence.** Every entry in `header.inputRefs` should
   resolve to an indexed artifact. A missing input ref produces an
   `input.missing` warning and the artifact's status becomes `partial`.
2. **Newer input by type.** If an artifact references
   `EvidenceGraph:evidence-1` but the index has a newer
   `EvidenceGraph:evidence-2` written after the referenced one, the
   artifact is marked `stale` with a `newer-input-exists` warning. The
   same applies to every artifact type referenced through `inputRefs`
   (e.g., `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `GraphSlice`,
   `FindingReport`, `ResolverPacket`, `MemorySelection`,
   `IntelligenceSnapshot`).
3. **Unknown lineage.** An artifact with no `inputRefs` that is not a
   recognized canonical input (currently `EvidenceGraph`, `Rulebook`,
   `OperatorFeedbackEntry`) raises a `lineage.unknown` warning and
   becomes `unknown`.
4. **Unreadable artifact.** If the index points at an artifact that
   cannot be read or parsed, the entry is reported as `unknown` with an
   `artifact.unreadable` error.

The aggregate status is `unknown` if any artifact is `unknown`,
`partial` if any artifact is `partial`, `stale` if any artifact is
`stale`, otherwise `fresh`.

File-system mtimes and source-file change detection are **not** part of
the alpha. They belong to the future watcher / freshness engine described
in the classic-behavior roadmap.

## CLI Surface

Use `rekon artifacts freshness` to inspect freshness:

```sh
rekon artifacts freshness --root <repo> --json
rekon artifacts freshness --root <repo> --type FindingReport --json
rekon artifacts freshness --root <repo> --type ResolverPacket --id <artifact-id> --json
```

Output shape:

```json
{
  "status": "fresh",
  "checkedAt": "2026-05-13T20:00:00.000Z",
  "issues": [],
  "artifacts": [
    {
      "type": "FindingReport",
      "id": "finding-report-1",
      "status": "fresh",
      "issues": []
    }
  ]
}
```

When a newer input exists:

```json
{
  "status": "stale",
  "issues": [
    {
      "code": "newer-input-exists",
      "severity": "warning",
      "artifactType": "FindingReport",
      "artifactId": "finding-report-1",
      "inputType": "EvidenceGraph",
      "inputId": "evidence-122",
      "message": "FindingReport:finding-report-1 references EvidenceGraph:evidence-122, but newer EvidenceGraph:evidence-130 exists."
    }
  ]
}
```

`rekon artifacts validate` remains integrity-only; it answers a
different question and keeps a stable shape.

## Invalidation Rules In Manifests

Capabilities declare invalidation rules through `CapabilityManifest`'s
`invalidatedBy`. Each rule is:

```ts
type InvalidationRule = {
  id: string;
  description?: string;
  inputs?: string[];   // artifact types whose change invalidates this output
  paths?: string[];    // file globs whose change invalidates this output
  events?: string[];   // named events (reserved for future runtime support)
};
```

A built-in evaluator declares:

```ts
invalidatedBy: [
  {
    id: "evidence.changed",
    description: "Findings change when evidence changes.",
    inputs: ["EvidenceGraph"],
  },
];
```

A built-in evidence provider declares path-based invalidation:

```ts
invalidatedBy: [
  {
    id: "source.changed",
    description: "JS/TS evidence changes when source files change.",
    paths: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
  },
];
```

Today's freshness checks consume the `inputs` lineage path implicitly
via `header.inputRefs`. `paths` and `events` rules are public intent:
they describe what *should* trigger regeneration. A future watcher /
freshness engine will evaluate them.

Capability authors should declare conservative `invalidatedBy` rules so
the future engine has accurate information without retroactive edits.

## Snapshot Status

`IntelligenceSnapshot.status.freshness` is the existing per-snapshot
status field. The runtime sets it during `runSnapshot()`:

- `unknown` — no `EvidenceGraph` is indexed.
- `partial` — evidence exists, but artifact index validation reported
  warnings or expected projection families are incomplete.
- `fresh` — latest evidence is included and no warnings exist.
- `stale` — reserved for future invalidation work informed by
  `validateArtifactFreshness()`.

The snapshot's status answers a different question than
`validateArtifactFreshness()`. The snapshot status is computed at the
moment of writing the snapshot. The freshness validator answers the
question after the fact, against the full index.

## Dogfood Regression

The optional dogfood regression is gated by `REKON_DOGFOOD_CLASSIC_ROOT`.
Without that environment variable, the test is skipped cleanly and CI
does not depend on a local checkout.

```sh
REKON_DOGFOOD_CLASSIC_ROOT=/path/to/codebase-intel npm run test
```

## Cross-References

- [Artifact header](../artifacts/artifact-header.md)
- [Intelligence snapshot](../artifacts/intelligence-snapshot.md)
- [Capability manifest](../extensions/capability-manifest.md)
- [Capability model](../strategy/capability-model.md)
- [Classic wins](../strategy/classic-wins.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
