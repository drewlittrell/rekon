import assert from "node:assert/strict";
import test from "node:test";

import { createRulebook, validateRulebook } from "../dist/index.js";

const header = {
  artifactType: "Rulebook",
  artifactId: "rules",
  schemaVersion: "0.1.0",
  generatedAt: "2026-05-13T17:00:00.000Z",
  subject: { repoId: "rekon" },
  producer: { id: "test", version: "0.1.0" },
  inputRefs: [],
};

test("createRulebook normalizes rules", () => {
  const rulebook = createRulebook({
    header,
    rules: [{
      id: "imports.noDistImports",
      severity: "medium",
      message: "Do not import dist files.",
      source: "builtin",
      appliesTo: ["Import", "Import"],
    }],
  });

  assert.equal(validateRulebook(rulebook).ok, true);
  assert.equal(rulebook.rules[0].enabled, true);
  assert.deepEqual(rulebook.rules[0].appliesTo, ["Import"]);
});

test("validateRulebook rejects bad rules", () => {
  const result = validateRulebook({
    header: { ...header, artifactType: "EvidenceGraph" },
    rules: [{ id: "", severity: "bad", message: "", source: "", appliesTo: [1] }],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map((issue) => issue.path), [
    "$.header.artifactType",
    "$.rules[0].id",
    "$.rules[0].message",
    "$.rules[0].source",
    "$.rules[0].severity",
    "$.rules[0].appliesTo",
  ]);
});
