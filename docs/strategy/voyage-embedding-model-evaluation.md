# Voyage Embedding Model Evaluation

Rekon evaluates embedding profiles against a checked-in repository retrieval
corpus before changing the production default.

Retrieval quality and duplicate classification are separate evaluations. A
model that retrieves related code well does not necessarily distinguish
duplicate implementations from merely related responsibilities.

## Decision

The default profile is `voyage-4` at 512 dimensions. It retained perfect
labeled retrieval across three repeats, produced the strongest 512-dimension
separation margin, costs one-third as much per token as `voyage-code-3`, and
uses half the vector storage of the previous 1024-dimension default.

`voyage-4-lite` at 512 dimensions is the economy profile. It matched the
labeled retrieval result with a slightly lower separation margin and costs
one-ninth as much per token as `voyage-code-3`.

Asymmetric Voyage 4 profiles were evaluated but did not improve this corpus,
so Rekon keeps a symmetric default.

## Method

The corpus contains 18 repository documents and 14 task-shaped queries. Each
profile receives identical document and query text with the correct Voyage
`input_type`. The evaluator records:

- top-1 accuracy, MRR, recall, and nDCG@5;
- relevant-versus-irrelevant score margin;
- repeat stability and request latency;
- provider-reported input tokens and estimated cost;
- dimensions and float-vector storage.

The repeated evaluation compared `voyage-code-3`, `voyage-4-lite`, `voyage-4`,
`voyage-4-large`, and asymmetric Voyage 4 combinations at 1024 and 512
dimensions. All profiles retrieved every labeled target at rank one. At 512
dimensions, mean score margin was `0.234318` for `voyage-4`, `0.229412` for
`voyage-4-lite`, and `0.200219` for `voyage-code-3`.

Pricing is recorded as of July 10, 2026. Voyage lists per-million-token prices
of $0.06 for `voyage-4`, $0.02 for `voyage-4-lite`, $0.12 for
`voyage-4-large`, and $0.18 for `voyage-code-3`:

- <https://docs.voyageai.com/docs/pricing>
- <https://docs.voyageai.com/docs/embeddings>
- <https://blog.voyageai.com/2026/01/15/voyage-4/>

## Run

Inspect the matrix without making provider calls:

```sh
npm run eval:voyage-embeddings -- --dry-run
```

Run the repeated live evaluation:

```sh
VOYAGE_API_KEY=... npm run eval:voyage-embeddings -- --repeats 3
```

Reports are written under ignored `.rekon-dev/evals/`. Credentials remain in
the environment and are never written to evaluation output.

Validate the production `duplicate_candidate` threshold against the balanced
labeled pair corpus without a provider call:

```sh
npm run eval:embedding-duplicates -- --dry-run
```

Run the live repeated pair evaluation:

```sh
VOYAGE_API_KEY=... npm run eval:embedding-duplicates -- --repeats 3
```

The report records precision, recall, F1, positive/negative separation, repeat
stability, provider tokens, and cost at the production threshold of `0.95`.
Pairs include both paraphrased duplicate responsibilities and hard negatives
that are related but operationally distinct.

## Migration

Model and dimensions already participate in Rekon's embedding cache identity.
After upgrading, rebuild the cache once:

```sh
rekon embeddings index --all
```

Queries reject incompatible cached model spaces and identify the required
reindex operation. Voyage 4 variants may share a vector space; `voyage-code-3`
does not share that compatibility contract.
