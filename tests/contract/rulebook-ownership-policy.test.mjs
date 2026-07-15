import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import policyCapability, {
  OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID,
  evaluateDeclaredOwnershipRules,
} from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const logger = { info() {}, warn() {}, error() {} };

function ref(type, id) {
  return { type, id, schemaVersion: "0.1.0" };
}

function header(artifactType, artifactId, inputRefs = []) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-13T00:00:00.000Z",
    subject: { repoId: "fixture" },
    producer: { id: "test", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}

function rulebook(id, rules) {
  return {
    ref: ref("Rulebook", id),
    rulebook: { header: header("Rulebook", id), rules },
  };
}

function ownershipRule(overrides = {}) {
  return {
    id: "ownership.billing-no-calculation",
    severity: "high",
    message: "Billing must not own calculation capabilities.",
    source: ".rekon/rulebook.json",
    appliesTo: ["CapabilityMap"],
    evaluator: OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID,
    enabled: true,
    options: { system: "billing", capability: "calculates:*" },
    ...overrides,
  };
}

function modelInput(rulebooks) {
  const evidenceRef = ref("EvidenceGraph", "evidence-1");
  return {
    rulebooks,
    capabilityMapRef: ref("CapabilityMap", "capabilities-1"),
    capabilityMap: {
      header: header("CapabilityMap", "capabilities-1", [evidenceRef]),
      entries: [{
        capability: "calculates:invoice-total",
        subjects: ["src/billing/calculate.ts"],
        systems: ["projection-fallback"],
        confidence: 0.9,
        evidence: [evidenceRef],
      }],
    },
    ownershipMapRef: ref("OwnershipMap", "ownership-1"),
    ownershipMap: {
      header: header("OwnershipMap", "ownership-1", [evidenceRef]),
      entries: [{
        path: "src/billing",
        ownerSystem: "billing",
        basis: "declared",
        confidence: 1,
        evidence: [evidenceRef],
      }],
    },
  };
}

test("declared ownership law evaluates CapabilityMap with OwnershipMap attribution", () => {
  const result = evaluateDeclaredOwnershipRules(modelInput([
    rulebook("rulebook-1", [ownershipRule()]),
  ]));

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].ruleId, "ownership.billing-no-calculation");
  assert.deepEqual(result.findings[0].files, ["src/billing/calculate.ts"]);
  assert.equal(result.findings[0].details.law.evaluator, OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID);
  assert.equal(result.findings[0].details.law.system, "billing");
  assert.deepEqual(result.inputRefs.map((item) => item.type), ["CapabilityMap", "OwnershipMap", "Rulebook"]);
});

test("disabled and unrelated rules remain inert without validating evaluator-specific options", () => {
  const input = modelInput([
    rulebook("rulebook-1", [
      ownershipRule({ enabled: false, options: {} }),
      ownershipRule({ id: "other.rule", evaluator: "community.other", options: {} }),
    ]),
  ]);

  assert.deepEqual(evaluateDeclaredOwnershipRules(input), { findings: [], inputRefs: [] });
});

test("active declared ownership law rejects malformed options and duplicate ids", () => {
  const malformed = modelInput([
    rulebook("rulebook-1", [ownershipRule({ options: { system: "billing" } })]),
  ]);
  assert.throws(
    () => evaluateDeclaredOwnershipRules(malformed),
    /requires non-empty options\.system and options\.capability/,
  );

  const duplicate = modelInput([
    rulebook("rulebook-1", [ownershipRule()]),
    rulebook("rulebook-2", [ownershipRule()]),
  ]);
  assert.throws(
    () => evaluateDeclaredOwnershipRules(duplicate),
    /Duplicate active ownership rule id/,
  );
});

test("policy runtime emits a provenance-complete finding from repository law", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-rulebook-ownership-"));
  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [policyCapability],
      logger,
    });
    const evidence = {
      header: header("EvidenceGraph", "evidence-1"),
      facts: [
        { id: "file-1", kind: "file", subject: "src/billing/calculate.ts", value: { path: "src/billing/calculate.ts" }, confidence: 1, provenance: { source: "test", pack: "test", extractorVersion: "1" } },
        { id: "owner-1", kind: "ownership_hint", subject: "src/billing/calculate.ts", value: { path: "src/billing/calculate.ts", system: "billing", basis: "declared" }, confidence: 1, provenance: { source: "test", pack: "test", extractorVersion: "1" } },
      ],
    };
    const evidenceRef = await runtime.artifacts.write(evidence);
    const capabilityMap = modelInput([]).capabilityMap;
    capabilityMap.header.inputRefs = [evidenceRef];
    capabilityMap.entries[0].evidence = [evidenceRef];
    const ownershipMap = modelInput([]).ownershipMap;
    ownershipMap.header.inputRefs = [evidenceRef];
    ownershipMap.entries[0].evidence = [evidenceRef];

    const capabilityMapRef = await runtime.artifacts.write(capabilityMap);
    const ownershipMapRef = await runtime.artifacts.write(ownershipMap);
    const rulebookRef = await runtime.artifacts.write({
      header: header("Rulebook", "rulebook-1"),
      rules: [ownershipRule()],
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((item) => item.type === "FindingReport"));
    const finding = report.findings.find((item) => item.ruleId === "ownership.billing-no-calculation");

    assert.ok(finding);
    assert.deepEqual(
      report.header.inputRefs
        .filter((item) => ["Rulebook", "CapabilityMap", "OwnershipMap"].includes(item.type))
        .map((item) => `${item.type}:${item.id}`),
      [capabilityMapRef, ownershipMapRef, rulebookRef]
        .map((item) => `${item.type}:${item.id}`)
        .sort(),
    );
    assert.equal(finding.evidence.some((item) => item.type === "Rulebook"), true);
    assert.equal(finding.evidence.some((item) => item.type === "CapabilityMap"), true);
    assert.equal(finding.evidence.some((item) => item.type === "OwnershipMap"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
