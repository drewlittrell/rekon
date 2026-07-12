# Semantic Debt Model Evaluation

Rekon evaluates semantic-debt models against a checked-in labeled corpus. The
goal is to select the least expensive configuration that preserves useful debt
recall while routing architecture, dead-code, lint, and stub concerns to their
own semantic-claim categories.

## Method

The corpus contains concrete debt examples, clean files, and routing cases for
architecture, dead code, lint, and generated code. Each model receives the same
`debt-judge-v1` prompt and JSON schema. Results pass through Rekon's production
`coerceDebtConcerns()` filter before scoring.
Only included `tech_debt` concerns count as a positive debt prediction; all
preserved concern categories remain visible in the evaluation record.

The report records:

- precision, recall, F1, accuracy, and parse success;
- repeat stability by case;
- p50 and p95 request latency;
- input, cached input, cache-write, output, and reasoning tokens;
- current and steady-state token cost;
- the non-dominated cost/quality frontier.

Models must complete at least 99% of requests to qualify for the frontier.

Pricing is versioned in the evaluator. Claude Sonnet 5 reports both its current
introductory price and the price effective after August 31, 2026. Reasoning
tokens are included in billed output and are not counted twice.

## Run

Build and inspect the request matrix without calling a provider:

```sh
npm run eval:semantic-debt -- --dry-run --repeats 3
```

Run all configured models:

```sh
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... \
  npm run eval:semantic-debt -- --repeats 3
```

Use `--list-models` to see configuration IDs and `--models <id,id>` to run a
subset. The default cost ceiling is $20 and can be changed with
`--max-cost-usd`. Reports are written under ignored `.rekon-dev/evals/`.

API keys remain environment-only. Evaluation output is local evidence, not a
generated product artifact or canonical repository truth.

## Production profiles

The three-repeat evaluation selected two OpenAI Responses profiles:

- Default: `gpt-5.6-luna` with `low` effort. It had the strongest qualifying
  quality result and stable predictions across all repeated cases.
- Economy: `gpt-5.4-nano` with `none` effort. It retained materially better
  debt recall than the prior small-model baseline at lower cost than Luna.

`rekon scan` uses the default profile for semantic-debt judgment. Select the
economy profile explicitly:

```sh
rekon scan --semantic-debt-model gpt-5.4-nano --semantic-debt-effort none
```

The overrides are also available as `REKON_SEMANTIC_DEBT_MODEL` and
`REKON_SEMANTIC_DEBT_EFFORT`. Model and effort are recorded in
`SemanticDebtJudgmentReport.policy` and participate in report reuse. The
semantic-debt-specific options do not alter other LLM callers.
