// Documentation coverage for the Capability Evidence Graph / Semantic
// Intelligence Architecture Decision (slice 152). Pins required headings, the
// Option B selection, the required statements + boundary statements, the five
// tables, the CHANGELOG mention, and the review packet's PURPOSE PRESERVATION
// CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/capability-evidence-graph-semantic-intelligence-decision.md";
const PACKET = ".rekon-dev/review-packets/capability-evidence-graph-semantic-intelligence-decision.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC)));
});

test("2. doc contains all required headings", () => {
  const headings = [
    "# capability evidence graph / semantic intelligence architecture decision",
    "## decision summary",
    "## why this decision exists",
    "## what the old system got right",
    "## what rekon changes",
    "## options considered",
    "## recommended architecture",
    "## capabilityevidencegraph model",
    "## facts and inferences",
    "## rich capability model",
    "## claim reconciliation",
    "## embeddings as secondary evidence",
    "## symbol-level intelligence",
    "## evaluation model",
    "## task-shaped context",
    "## human feedback model",
    "## boundary model",
    "## what this does not do",
    "## implementation sequence",
  ];
  for (const h of headings) assert.ok(doc.includes(h), `missing heading: ${h}`);
});

test("3. doc selects CapabilityEvidenceGraph first", () => {
  assert.ok(doc.includes("| capabilityevidencegraph first | selected |"));
});

test("4. says deterministic facts are the substrate; LLM and embedding outputs are evidence-backed inferences", () => {
  assert.ok(doc.includes("deterministic facts are the substrate; llm and embedding outputs are evidence-backed inferences"));
});

test("5. says verb:noun remains the human-readable shorthand, not the whole capability model", () => {
  assert.ok(doc.includes("verb:noun remains the human-readable shorthand, not the whole capability model"));
});

test("6. says label quality becomes a special case of general claim reconciliation", () => {
  assert.ok(doc.includes("label quality becomes a special case of general claim reconciliation"));
});

test("7. says embeddings are neighbor evidence, not truth", () => {
  assert.ok(doc.includes("embeddings are neighbor evidence, not truth"));
});

test("8. says do not embed whole files as the primary artifact", () => {
  assert.ok(doc.includes("do not embed whole files as the primary artifact"));
});

test("9. says use structural feature vectors and semantic embeddings separately", () => {
  assert.ok(doc.includes("use structural feature vectors and semantic embeddings separately"));
});

test("10. says files remain containers; symbols become first-class intelligence nodes", () => {
  assert.ok(doc.includes("files remain containers; symbols become first-class intelligence nodes"));
});

test("11. says every new scanner or inference layer should improve at least one measured quality metric", () => {
  assert.ok(doc.includes("every new scanner or inference layer should improve at least one measured quality metric"));
});

test("12. says context bundles should be task-shaped graph neighborhoods, not generic file lists", () => {
  assert.ok(doc.includes("context bundles should be task-shaped graph neighborhoods, not generic file lists"));
});

test("13. says human feedback should upgrade ontology/rules when patterns repeat, not only patch individual labels", () => {
  assert.ok(
    doc.includes("human feedback should upgrade ontology/rules when patterns repeat, not only patch individual labels"),
  );
});

test("14. says CapabilityEvidenceGraph is evidence-backed context, not proof by itself", () => {
  assert.ok(doc.includes("capabilityevidencegraph is evidence-backed context, not proof by itself"));
});

test("15. says LLM interpretation is proposal, not proof", () => {
  assert.ok(doc.includes("llm interpretation is proposal, not proof"));
});

test("16. says embedding similarity is proposal, not proof", () => {
  assert.ok(doc.includes("embedding similarity is proposal, not proof"));
});

test("17. says deterministic facts remain stronger than semantic or embedding inferences", () => {
  assert.ok(doc.includes("deterministic facts remain stronger than semantic or embedding inferences"));
});

test("18. says ontology is the contract for normalized capability meaning", () => {
  assert.ok(doc.includes("ontology is the contract for normalized capability meaning"));
});

test("19. says embeddings must not approve plans", () => {
  assert.ok(doc.includes("embeddings must not approve plans"));
});

test("20. says semantic intelligence must not execute commands", () => {
  assert.ok(doc.includes("semantic intelligence must not execute commands"));
});

test("21. says semantic intelligence must not write source files", () => {
  assert.ok(doc.includes("semantic intelligence must not write source files"));
});

test("22. says semantic intelligence must not run Circe", () => {
  assert.ok(doc.includes("semantic intelligence must not run circe"));
});

test("23. says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("24. doc includes option table", () => {
  assert.ok(doc.includes("| embedding index first | rejected/deferred | black-box without graph/evidence substrate |"));
});

test("25. doc includes graph table", () => {
  assert.ok(
    doc.includes("| nodes | file, symbol, capability, system, route, event, db_table, api, pattern, invariant, test, doc |"),
  );
});

test("26. doc includes facts/inferences table", () => {
  assert.ok(doc.includes("| facts | paths, imports, exports, symbols, routes, db reads/writes, tests |"));
});

test("27. doc includes embeddings table", () => {
  assert.ok(doc.includes("| whole-file embedding | not primary |"));
});

test("28. doc includes evaluation table", () => {
  assert.ok(doc.includes("| label accuracy | validate ontology/system inference |"));
});

test("29. CHANGELOG mentions Capability Evidence Graph / Semantic Intelligence Architecture Decision", () => {
  assert.ok(changelog.includes("Capability Evidence Graph / Semantic Intelligence Architecture Decision"));
});

test("30. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)), "review packet exists");
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
