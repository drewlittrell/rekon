// Docs tests for the classic scanner/ontology parity
// audit. Pins the verbatim guarantees the memo must
// carry so future implementers do not regress.

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

const memoPath = "docs/strategy/classic-scanner-ontology-parity-audit.md";

// ---------- 1: audit memo exists ----------

test("audit memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(text.includes("# Classic Scanner/Ontology Parity Audit"));
});

// ---------- 2: codebase-intel is design prior art ----------

test("memo says codebase-intel is design prior art", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("codebase-intel is design prior art"),
    "memo must pin codebase-intel as design prior art",
  );
});

// ---------- 3: JS/TS AST extraction should be primary where available ----------

test("memo says JS/TS AST extraction should be primary where available", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("js/ts ast extraction should be primary where available"),
    "memo must pin JS/TS AST extraction as primary where available",
  );
});

// ---------- 4: regex is fallback, not primary, for JS/TS ----------

test("memo says regex extraction is fallback, not primary, for JS/TS", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("regex extraction is fallback, not primary, for js/ts"),
    "memo must pin regex as fallback (not primary) for JS/TS",
  );
});

// ---------- 5: EvidenceGraph remains repo-agnostic protocol ----------

test("memo says EvidenceGraph remains the repo-agnostic protocol", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("evidencegraph remains the repo-agnostic protocol"),
    "memo must pin EvidenceGraph as the repo-agnostic protocol",
  );
});

// ---------- 6: GraphOntologyValidator should not be ported wholesale ----------

test("memo says GraphOntologyValidator should not be ported wholesale", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("graphontologyvalidator should not be ported wholesale"),
    "memo must pin against porting GraphOntologyValidator wholesale",
  );
});

// ---------- 7: classic taxonomy methods should be adapted ----------

test("memo says classic taxonomy extraction / split / discovery / normalization should be adapted", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "classic taxonomy extraction / split / discovery / normalization should be adapted",
    ),
    "memo must pin classic taxonomy methods as `adapt`",
  );
});

// ---------- 8: CapabilityMap v2 should wait until post-AST coverage ----------

test("memo says CapabilityMap v2 should wait until post-AST coverage is measured", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 should wait until post-ast coverage is measured"),
    "memo must pin CapabilityMap v2 as deferred pending post-AST coverage",
  );
});

// ---------- 9: classic method table ----------

test("memo includes the classic method table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Classic Method | Purpose | Rekon Decision |"));
  // Must include the key rows the work order lists.
  const plain = plainText(text);
  assert.ok(plain.includes("extractedname"));
  assert.ok(plain.includes("graphontologyvalidator monolith"));
  assert.ok(plain.includes("reject wholesale"));
});

// ---------- 10: scanner parity table ----------

test("memo includes the scanner parity table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Capability | Classic | Rekon Current | Gap |"));
  const plain = plainText(text);
  assert.ok(plain.includes("ast needed"));
});

// ---------- 11: next-step table ----------

test("memo includes the next-step decision table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Next Step | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("js/ts ast adapter decision"));
  assert.ok(plain.includes("capabilitymap v2"));
  assert.ok(plain.includes("graphontologyvalidator port"));
});

// ---------- 12: CHANGELOG mentions classic scanner/ontology parity audit ----------

test("CHANGELOG mentions classic scanner/ontology parity audit", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("classic scanner/ontology parity audit")
      || changelog.includes("classic scanner / ontology parity audit"),
    "CHANGELOG must mention the classic scanner/ontology parity audit",
  );
});

// ---------- 13: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/classic-scanner-ontology-parity-audit.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(
    packet.includes("classic scanner/ontology parity audit")
      || packet.includes("Classic Scanner/Ontology Parity Audit")
      || packet.includes("Classic Scanner / Ontology Parity Audit"),
  );
});
