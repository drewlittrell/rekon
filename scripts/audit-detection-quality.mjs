import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { BUILT_IN_POLICY_RULES } from "../packages/capability-policy/dist/index.js";
import { validateQualityThresholds } from "../tests/bench/quality-core.mjs";

const inventoryPath = resolve("tests/evals/detection-quality/emitter-inventory.json");
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const cases = JSON.parse(await readFile(resolve("tests/evals/detection-quality/cases.json"), "utf8"));
const thresholds = JSON.parse(await readFile(resolve("tests/bench/quality-thresholds.json"), "utf8"));
const allowedKinds = new Set(["finding", "risk", "opportunity", "semantic_claim", "model_diagnostic"]);

assert.equal(inventory.schemaVersion, "1.0.0", "unexpected emitter inventory schema");
assert.ok(Array.isArray(inventory.emitters), "emitter inventory must contain an emitters array");

const byRule = new Map();
for (const emitter of inventory.emitters) {
  assert.equal(typeof emitter.ruleId, "string", "every emitter needs a ruleId");
  assert.equal(byRule.has(emitter.ruleId), false, `duplicate emitter inventory row: ${emitter.ruleId}`);
  assert.ok(Array.isArray(emitter.outputKinds) && emitter.outputKinds.length > 0, `${emitter.ruleId} needs outputKinds`);
  assert.ok(emitter.outputKinds.every((kind) => allowedKinds.has(kind)), `${emitter.ruleId} has an unsupported output kind`);
  assert.ok(String(emitter.evidence ?? "").length > 0, `${emitter.ruleId} needs an evidence contract`);
  assert.ok(String(emitter.jurisdiction ?? "").length > 0, `${emitter.ruleId} needs jurisdiction`);
  assert.ok(String(emitter.remediationUnit ?? "").length > 0, `${emitter.ruleId} needs a remediation unit`);
  byRule.set(emitter.ruleId, emitter);
}

for (const ruleId of BUILT_IN_POLICY_RULES) {
  assert.ok(byRule.has(ruleId), `built-in policy rule missing from emitter inventory: ${ruleId}`);
}
for (const ruleId of byRule.keys()) {
  assert.ok(BUILT_IN_POLICY_RULES.includes(ruleId), `inventory contains an unknown built-in rule: ${ruleId}`);
}
validateQualityThresholds(thresholds, [...byRule.keys()]);

assert.equal(cases.schemaVersion, "1.0.0", "unexpected detection-quality case schema");
assert.ok(Array.isArray(cases.cases) && cases.cases.length > 0, "detection-quality cases are required");
const caseIds = new Set();
for (const detectionCase of cases.cases) {
  assert.equal(caseIds.has(detectionCase.id), false, `duplicate detection-quality case: ${detectionCase.id}`);
  caseIds.add(detectionCase.id);
  const emitter = byRule.get(detectionCase.ruleId);
  assert.ok(emitter, `case references unknown emitter: ${detectionCase.ruleId}`);
  assert.ok(emitter.outputKinds.includes(detectionCase.expectedKind), `${detectionCase.id} expects a kind not declared by ${detectionCase.ruleId}`);
  assert.ok(String(detectionCase.reason ?? "").length > 0, `${detectionCase.id} needs an adjudication reason`);
}

const counts = {};
for (const emitter of inventory.emitters) {
  for (const kind of emitter.outputKinds) counts[kind] = (counts[kind] ?? 0) + 1;
}

process.stdout.write(`${JSON.stringify({ valid: true, rules: inventory.emitters.length, cases: cases.cases.length, qualityThresholds: Object.keys(thresholds.rules).length, outputKinds: counts }, null, 2)}\n`);
