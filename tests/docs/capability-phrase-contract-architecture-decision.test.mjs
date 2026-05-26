// Docs tests for the CapabilityPhrase + CapabilityContract
// architecture decision (strategy / docs / tests-only batch).
//
// Pins the verbatim guarantees the memo must carry so future
// implementers cannot quietly drift away from them.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(path) {
  return await readFile(`${repoRoot}/${path}`, "utf8");
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ");
}

function plainText(text) {
  return collapseWhitespace(text).toLowerCase().replace(/`/g, "");
}

const memoPath = "docs/strategy/capability-phrase-contract-architecture-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be a substantial document");
  assert.ok(text.includes("# CapabilityPhrase + CapabilityContract Architecture Decision"));
});

// ---------- 2: intermediate semantic unit ----------

test("memo says CapabilityPhrase is the intermediate semantic unit", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("intermediate semantic unit between capabilitynormalizationreport and capabilitymap v2")
      || text.includes("intermediate semantic unit between capabilitynormalizationreport and the future capabilitymap v2"),
    "memo must pin CapabilityPhrase as the intermediate semantic unit between CapabilityNormalizationReport and CapabilityMap v2",
  );
});

// ---------- 3: different from normalized verb/noun ----------

test("memo says CapabilityPhrase is different from a normalized verb/noun", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase is different from a normalized verb/noun")
      || text.includes("capabilityphrase is different from a normalized verb / noun"),
    "memo must pin that CapabilityPhrase is different from a normalized verb/noun pair",
  );
});

// ---------- 4: CapabilityContract is future policy / preservation layer ----------

test("memo says CapabilityContract is the future policy / preservation layer", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract is the future policy / preservation layer")
      || text.includes("capabilitycontract is the future policy/preservation layer")
      || text.includes("capabilitycontract is a future policy / preservation layer")
      || text.includes("capabilitycontract is a future policy/preservation layer"),
    "memo must pin CapabilityContract as the future policy/preservation layer",
  );
});

// ---------- 5: CapabilityMap v2 consumes stable claims ----------

test("memo says CapabilityMap v2 consumes stable CapabilityPhrase claims", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 should consume stable capabilityphrase claims")
      || text.includes("capabilitymap v2 consumes only stable, confidence-scored capabilityphrase claims")
      || text.includes("capabilitymap v2 consumes only stable, confidence- scored capabilityphrase claims")
      || text.includes("capabilitymap v2 will consume only stable, confidence- scored capabilityphrase claims"),
    "memo must pin CapabilityMap v2 to consume stable / confidence-scored CapabilityPhrase claims",
  );
});

// ---------- 6: AST is optional evidence, not foundational truth ----------

test("memo says AST is optional evidence, not foundational truth", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("ast is optional evidence, not foundational truth")
      || text.includes("ast / typechecker evidence is optional enrichment, never foundational truth")
      || text.includes("ast / typechecker evidence is optional enrichment, not foundational truth"),
    "memo must pin AST as optional evidence, not foundational truth",
  );
});

// ---------- 7: repo / language / architecture agnostic evidence ----------

test("memo says repo / language / architecture agnostic evidence is required", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("repo / language / architecture agnostic evidence is required")
      || text.includes("repo/language/architecture agnostic evidence is required"),
    "memo must pin repo / language / architecture agnostic evidence as required",
  );
});

// ---------- 8: architecture linting ----------

test("memo says CapabilityPhrase supports architecture linting", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase supports architecture linting")
      || text.includes("architecture linting"),
    "memo must mention architecture linting as a CapabilityPhrase use case",
  );
});

// ---------- 9: resolver routing ----------

test("memo says CapabilityPhrase supports resolver routing", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase supports resolver routing")
      || text.includes("resolver routing"),
    "memo must mention resolver routing as a CapabilityPhrase use case",
  );
});

// ---------- 10: verification planning ----------

test("memo says CapabilityPhrase supports verification planning", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase supports verification planning")
      || text.includes("verification planning"),
    "memo must mention verification planning as a CapabilityPhrase use case",
  );
});

// ---------- 11: semantic impact analysis ----------

test("memo says CapabilityPhrase supports semantic impact analysis", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase supports semantic impact analysis")
      || text.includes("semantic impact"),
    "memo must mention semantic impact analysis as a CapabilityPhrase use case",
  );
});

// ---------- 12: memory ----------

test("memo says CapabilityPhrase supports memory", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase supports memory")
      || text.includes("attach guidance to capability, not path"),
    "memo must mention memory as a CapabilityPhrase use case",
  );
});

// ---------- 13: refactor preservation ----------

test("memo says CapabilityPhrase supports refactor preservation", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrase supports refactor preservation")
      || text.includes("refactor preservation"),
    "memo must mention refactor preservation as a CapabilityPhrase use case",
  );
});

// ---------- 14: evidence-source table ----------

test("memo includes the evidence-source table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Field | Evidence Sources | V1 Status |"));
  assert.ok(text.includes("| `verb` |"));
  assert.ok(text.includes("| `noun` |"));
  assert.ok(text.includes("| `domain` |"));
  assert.ok(text.includes("| `pattern` |"));
  assert.ok(text.includes("| `layer` |"));
  assert.ok(text.includes("| `sideEffects` |"));
  assert.ok(text.includes("| `inputs` / `outputs` |"));
});

// ---------- 15: use-case table ----------

test("memo includes the use-case table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Use Case | CapabilityPhrase Role |"));
  assert.ok(text.includes("| architecture linting |"));
  assert.ok(text.includes("| naming honesty |"));
  assert.ok(text.includes("| overloaded files |"));
  assert.ok(text.includes("| resolver routing |"));
  assert.ok(text.includes("| verification planning |"));
  assert.ok(text.includes("| semantic impact |"));
  assert.ok(text.includes("| memory |"));
  assert.ok(text.includes("| refactor preservation |"));
});

// ---------- 16: boundary table ----------

test("memo includes the layer / boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Layer | Responsibility |"));
  assert.ok(text.includes("| `CapabilityNormalizationReport` | translation audit |"));
  assert.ok(text.includes("| `CapabilityPhrase` | purpose-bearing semantic claim |"));
  assert.ok(text.includes("| `CapabilityMap` | stable capability projection |"));
  assert.ok(text.includes("| `CapabilityContract` | placement / proof / preservation policy |"));
  assert.ok(text.includes("| `RefactorPreservationContract` | phase-specific refactor obligations |"));
});

// ---------- 17: CHANGELOG mentions the decision ----------

test("CHANGELOG mentions the CapabilityPhrase architecture decision", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrase")
      && changelog.includes("architecture decision"),
    "CHANGELOG must mention the CapabilityPhrase architecture decision",
  );
});

// ---------- 18: review packet exists ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-contract-architecture-decision.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhrase"));
  assert.ok(packet.includes("CapabilityContract"));
});
