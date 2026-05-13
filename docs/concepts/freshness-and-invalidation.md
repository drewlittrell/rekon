# Freshness And Invalidation

Freshness is Rekon's current statement about whether an artifact can be trusted
relative to its declared inputs. Invalidation is the declared reason an artifact
should be regenerated.

## Current Alpha Behavior

Rekon does not yet run a watcher or file-change freshness engine. The alpha
runtime performs minimal integrity-based freshness checks when writing an
`IntelligenceSnapshot`:

- `fresh`: latest evidence exists and artifact index validation has no warnings
- `unknown`: no `EvidenceGraph` is indexed
- `partial`: evidence exists, but artifact index validation failed or an
  expected projection family is incomplete
- `stale`: reserved for future invalidation work

## Artifact Index Integrity

The runtime validates `.rekon/registry/artifacts.index.json` by checking that
indexed files exist, paths stay inside the repo, headers match index entries,
digests match payloads, duplicate `type:id` entries are reported, and no Rekon
output points at `.codebase-intel`.

Use:

```sh
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
```

## Invalidation Rules

Capabilities declare invalidation rules in their manifests. Those declarations
are public intent: they describe what should cause a capability output to be
regenerated. The current runtime records freshness and warnings but does not yet
evaluate file-change invalidation rules automatically.

## Dogfood Regression

The optional dogfood regression is gated by `REKON_DOGFOOD_CLASSIC_ROOT`.
Without that environment variable, the test is skipped cleanly and CI does not
depend on a local checkout.

```sh
REKON_DOGFOOD_CLASSIC_ROOT=/path/to/codebase-intel npm run test
```
