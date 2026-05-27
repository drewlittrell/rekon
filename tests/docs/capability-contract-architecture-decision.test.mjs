// Docs tests for the CapabilityContract Architecture
// Decision (thirty-second slice on the capability-
// ontology track). Pins the verbatim guarantees the
// memo must carry so the next slice
// (`CapabilityContract` v1 implementation) has a stable
// target shape to plan against.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(path) {
  return await readFile(`${repoRoot}/${path}`, "utf8");
}

function plainText(text) {
  return text.replace(/\s+/g, " ").toLowerCase().replace(/`/g, "");
}

const memoPath
  = "docs/strategy/capability-contract-architecture-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 2000, "memo must be substantial");
  assert.ok(
    text.includes("# CapabilityContract Architecture Decision"),
    "memo must have the expected heading",
  );
});

// ---------- 2: required headings ----------

test("memo contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Config Model",
    "## Artifact Model",
    "## CapabilityMap Boundary",
    "## RefactorPreservationContract Boundary",
    "## Future Consumers",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must include ${heading}`);
  }
});

// ---------- 3: selects config + artifact ----------

test("memo selects config + artifact effective contract (Option B)", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "option b — capabilitycontract is an artifact-backed policy layer generated from config + capabilitymap v2",
    )
      || text.includes(
        "option b - capabilitycontract is an artifact-backed policy layer generated from config + capabilitymap v2",
      )
      || (
        text.includes("config + artifact effective contract")
        && text.includes("| selected |")
      ),
    "memo must select Option B (config + artifact effective contract)",
  );
});

// ---------- 4: policy, not projection ----------

test("memo says CapabilityContract is policy, not projection", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract is policy, not projection"),
    "memo must pin CapabilityContract is policy, not projection",
  );
});

// ---------- 5: CapabilityMap v2 remains projection ----------

test("memo says CapabilityMap v2 remains projection and must not grow policy fields", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 remains projection and must not grow policy fields",
    ),
    "memo must pin CapabilityMap v2 remains projection and must not grow policy fields",
  );
});

// ---------- 6: not architecture linting ----------

test("memo says CapabilityContract does not implement architecture linting by itself", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitycontract does not implement architecture linting by itself",
    ),
    "memo must pin CapabilityContract does not implement architecture linting",
  );
});

// ---------- 7: not resolver routing ----------

test("memo says CapabilityContract does not implement resolver routing by capability", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitycontract does not implement resolver routing by capability",
    ),
    "memo must pin CapabilityContract does not implement resolver routing",
  );
});

// ---------- 8: not verification planning ----------

test("memo says CapabilityContract does not implement verification planning by capability", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitycontract does not implement verification planning by capability",
    ),
    "memo must pin CapabilityContract does not implement verification planning",
  );
});

// ---------- 9: not source writes ----------

test("memo says CapabilityContract does not implement source writes", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitycontract does not implement source writes",
    ),
    "memo must pin CapabilityContract does not implement source writes",
  );
});

// ---------- 10: RefactorPreservationContract deferred ----------

test("memo says RefactorPreservationContract remains phase-specific and comes later", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "refactorpreservationcontract remains phase-specific and comes later",
    ),
    "memo must pin RefactorPreservationContract remains phase-specific and comes later",
  );
});

// ---------- 11: config path ----------

test("memo mentions .rekon/capability-contracts.json", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(".rekon/capability-contracts.json"),
    "memo must mention the recommended config path",
  );
});

// ---------- 12: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("reserve name only"));
  assert.ok(plain.includes("config + artifact effective contract"));
  assert.ok(plain.includes("artifact-only inferred contract"));
  assert.ok(plain.includes("add policy fields to capabilitymap"));
  assert.ok(plain.includes("only inside refactorpreservationcontract"));
});

// ---------- 13: boundary table ----------

test("memo includes the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Layer | Responsibility |"));
  const plain = plainText(text);
  assert.ok(plain.includes("capabilityphrasereport"));
  assert.ok(plain.includes("capabilitymap v2"));
  assert.ok(plain.includes("capabilitycontract"));
  assert.ok(plain.includes("refactorpreservationcontract"));
});

// ---------- 14: consumer table ----------

test("memo includes the consumer table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Future Consumer | How CapabilityContract Helps |"));
  const plain = plainText(text);
  assert.ok(plain.includes("architecture linting"));
  assert.ok(plain.includes("resolver routing"));
  assert.ok(plain.includes("verification planning"));
  assert.ok(plain.includes("semantic impact"));
  assert.ok(plain.includes("refactor preservation"));
});

// ---------- 15: CHANGELOG mention ----------

test("CHANGELOG mentions CapabilityContract Architecture Decision", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("capabilitycontract architecture decision"),
    "CHANGELOG must mention the CapabilityContract Architecture Decision slice",
  );
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-contract-architecture-decision.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  const plain = plainText(packet);
  assert.ok(
    plain.includes("capabilitycontract architecture decision")
      || plain.includes("capability-contract-architecture-decision"),
    "review packet must name the architecture decision slice",
  );
});
