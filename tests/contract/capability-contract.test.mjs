// Contract tests for the CapabilityContract v1 artifact
// (thirty-third slice on the capability-ontology track).
//
// Verifies that the new policy artifact:
//   - registers cleanly in the SDK + runtime,
//   - validates as a "CapabilityContract" with summary
//     re-derived from contracts,
//   - emits configured rows only when a config row
//     matches a v2 phrase-backed capability,
//   - emits unmatched rows for config rows that don't
//     match (no policy fields carried),
//   - applies conjunctive matching with most-specific
//     winner + id tie-break,
//   - never mutates the source CapabilityMap or the
//     `.rekon/capability-contracts.json` config,
//   - reserves `suggested` for future use (v1 does not
//     emit it),
//   - exposes itself via the `rekon capability contract
//     generate` CLI.
//
// CapabilityMap is projection; CapabilityContract is
// policy — these are different layers. v1 ships the
// artifact + producer + CLI only. No linting, routing,
// or verification planning by capability runs off it.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertCapabilityContract,
  createCapabilityContract,
  validateCapabilityContract,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildCapabilityContract,
} from "../../packages/capability-model/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const CAPABILITY_MAP_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};
const PHRASE_REPORT_REF = {
  type: "CapabilityPhraseReport",
  id: "capability-phrase-test-001",
  path: ".rekon/artifacts/projections/CapabilityPhraseReport-test.json",
  schemaVersion: "0.1.0",
};
const EVIDENCE_REF = {
  type: "EvidenceGraph",
  id: "evidence-test-001",
  path: ".rekon/artifacts/evidence/EvidenceGraph-test.json",
  schemaVersion: "0.1.0",
};

function makeBaseHeader() {
  return {
    artifactType: "CapabilityContract",
    artifactId: `capability-contract-test-${Date.now()}`,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "test-repo" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [CAPABILITY_MAP_REF],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.95 },
  };
}

function makePhraseBackedCapability(overrides = {}) {
  return {
    id: "capability-phrase:phrase-001",
    phraseRef: { report: PHRASE_REPORT_REF, phraseId: "phrase-001" },
    verb: "compute",
    noun: "invoice-preview",
    domain: "billing",
    evidenceRefs: [EVIDENCE_REF],
    sourceCandidateIds: ["candidate-001"],
    confidence: "high",
    status: "stable",
    ...overrides,
  };
}

function makeCapabilityMap(phraseBacked) {
  return {
    header: {
      artifactType: "CapabilityMap",
      artifactId: "capability-map-test-001",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "test-repo" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [EVIDENCE_REF, PHRASE_REPORT_REF],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    },
    entries: [],
    phraseBackedCapabilities: phraseBacked,
    phraseSourceRef: PHRASE_REPORT_REF,
  };
}

// ---------- 1: validator rejects bad shape ----------

test("validateCapabilityContract rejects non-object input", () => {
  const result = validateCapabilityContract(null);
  assert.equal(result.ok, false);
});

// ---------- 2: createCapabilityContract emits empty artifact with no config ----------

test("createCapabilityContract emits empty contracts when config absent", () => {
  const contract = createCapabilityContract({
    header: makeBaseHeader(),
    source: { capabilityMapRef: CAPABILITY_MAP_REF },
    summary: {
      total: 0,
      configured: 0,
      suggested: 0,
      unmatched: 0,
      withRequiredChecks: 0,
      withPlacementRules: 0,
      withPreservationRules: 0,
    },
    contracts: [],
  });
  assert.equal(contract.contracts.length, 0);
  assert.equal(contract.summary.configured, 0);
  assert.equal(contract.summary.unmatched, 0);
  assert.equal(contract.summary.total, 0);
});

// ---------- 3: assertCapabilityContract throws on bad summary ----------

test("assertCapabilityContract throws when summary doesn't match contracts", () => {
  assert.throws(() => {
    assertCapabilityContract({
      header: { ...makeBaseHeader() },
      source: { capabilityMapRef: CAPABILITY_MAP_REF },
      summary: {
        total: 5, // wrong — there are zero entries
        configured: 0,
        suggested: 0,
        unmatched: 0,
        withRequiredChecks: 0,
        withPlacementRules: 0,
        withPreservationRules: 0,
      },
      contracts: [],
    });
  });
});

// ---------- 4: configured row matched against v2 phrase ----------

test("buildCapabilityContract emits a configured row for a verb+noun match", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "billing.invoice-preview",
          match: { verb: "compute", noun: "invoice-preview" },
          requiredChecks: ["npm run test"],
        },
      ],
    },
    configPath: ".rekon/capability-contracts.json",
    generatedAt: "2026-05-27T00:00:00.000Z",
  });
  assert.equal(contract.contracts.length, 1);
  assert.equal(contract.contracts[0].status, "configured");
  assert.deepEqual(
    contract.contracts[0].capabilityRef,
    { capabilityMapRef: CAPABILITY_MAP_REF, phraseCapabilityId: "capability-phrase:phrase-001" },
  );
  assert.equal(contract.summary.configured, 1);
  assert.equal(contract.summary.unmatched, 0);
  assert.equal(contract.summary.withRequiredChecks, 1);
});

// ---------- 5: unmatched row when no v2 phrase matches ----------

test("buildCapabilityContract emits an unmatched row when no v2 capability matches", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "unknown.capability",
          match: { verb: "ship", noun: "rocket" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  assert.equal(contract.contracts.length, 1);
  assert.equal(contract.contracts[0].status, "unmatched");
  assert.equal(contract.contracts[0].capabilityRef, undefined);
  assert.equal(contract.contracts[0].requiredChecks, undefined);
  assert.equal(contract.summary.unmatched, 1);
});

// ---------- 6: unmatched rows MUST NOT carry policy fields ----------

test("unmatched rows must not carry policy fields", () => {
  const result = validateCapabilityContract({
    header: { ...makeBaseHeader() },
    source: { capabilityMapRef: CAPABILITY_MAP_REF },
    summary: {
      total: 1,
      configured: 0,
      suggested: 0,
      unmatched: 1,
      withRequiredChecks: 1,
      withPlacementRules: 0,
      withPreservationRules: 0,
    },
    contracts: [
      {
        id: "bad-unmatched",
        match: { verb: "ship", noun: "rocket" },
        status: "unmatched",
        requiredChecks: ["npm test"],
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) =>
      issue.message.includes("no policy fields populated for unmatched rows"),
    ),
    "validator must reject unmatched rows with policy fields",
  );
});

// ---------- 7: configured rows MUST carry capabilityRef ----------

test("configured rows must carry capabilityRef", () => {
  const result = validateCapabilityContract({
    header: { ...makeBaseHeader() },
    source: { capabilityMapRef: CAPABILITY_MAP_REF },
    summary: {
      total: 1,
      configured: 1,
      suggested: 0,
      unmatched: 0,
      withRequiredChecks: 1,
      withPlacementRules: 0,
      withPreservationRules: 0,
    },
    contracts: [
      {
        id: "bad-configured",
        match: { verb: "compute", noun: "invoice-preview" },
        status: "configured",
        requiredChecks: ["npm test"],
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) =>
      issue.path.endsWith(".capabilityRef")
      && issue.message.includes("Expected an object for configured rows."),
    ),
    "validator must reject configured row missing capabilityRef",
  );
});

// ---------- 8: configured rows MUST have at least one policy field ----------

test("configured rows must carry at least one policy field", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "empty.policy",
          match: { verb: "compute", noun: "invoice-preview" },
          // No policy fields populated.
        },
      ],
    },
  });
  // The builder drops empty-policy rows before emit so
  // the artifact stays valid.
  assert.equal(contract.contracts.length, 0);
  assert.equal(contract.summary.total, 0);
});

// ---------- 9: most-specific match wins ----------

test("most-specific match wins when multiple v2 entries share verb+noun", () => {
  const map = makeCapabilityMap([
    makePhraseBackedCapability({ id: "capability-phrase:p-generic", domain: undefined }),
    makePhraseBackedCapability({ id: "capability-phrase:p-domain", domain: "billing" }),
  ]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "billing-rule",
          match: { verb: "compute", noun: "invoice-preview", domain: "billing" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  assert.equal(contract.contracts.length, 1);
  assert.equal(contract.contracts[0].capabilityRef.phraseCapabilityId, "capability-phrase:p-domain");
});

// ---------- 10: id tie-break sorts asc ----------

test("ties on specificity break by phrase-backed id asc", () => {
  const map = makeCapabilityMap([
    makePhraseBackedCapability({ id: "capability-phrase:zeta" }),
    makePhraseBackedCapability({ id: "capability-phrase:alpha" }),
  ]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "rule",
          match: { verb: "compute", noun: "invoice-preview", domain: "billing" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  assert.equal(contract.contracts[0].capabilityRef.phraseCapabilityId, "capability-phrase:alpha");
});

// ---------- 11: conjunctive match — domain mismatch excludes ----------

test("conjunctive match excludes domain mismatches", () => {
  const map = makeCapabilityMap([
    makePhraseBackedCapability({ domain: "pricing" }),
  ]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "billing-only",
          match: { verb: "compute", noun: "invoice-preview", domain: "billing" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  assert.equal(contract.contracts[0].status, "unmatched");
});

// ---------- 12: deterministic ordering by (verb, noun, id) ----------

test("createCapabilityContract sorts contracts deterministically", () => {
  const map = makeCapabilityMap([
    makePhraseBackedCapability({ id: "capability-phrase:a", verb: "delete", noun: "user" }),
    makePhraseBackedCapability({ id: "capability-phrase:b", verb: "create", noun: "user" }),
  ]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "z-rule",
          match: { verb: "delete", noun: "user" },
          requiredChecks: ["npm test"],
        },
        {
          id: "a-rule",
          match: { verb: "create", noun: "user" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  assert.equal(contract.contracts[0].match.verb, "create");
  assert.equal(contract.contracts[1].match.verb, "delete");
});

// ---------- 13: header.inputRefs cites capabilityMap + phraseReport ----------

test("header.inputRefs cites the consumed CapabilityMap (and CapabilityPhraseReport when present)", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    phraseReportRef: PHRASE_REPORT_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "rule",
          match: { verb: "compute", noun: "invoice-preview" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  const types = contract.header.inputRefs.map((ref) => ref.type);
  assert.ok(types.includes("CapabilityMap"));
  assert.ok(types.includes("CapabilityPhraseReport"));
});

// ---------- 14: suggested rows are reserved for future ----------

test("v1 builder never emits suggested rows", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const contract = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "rule",
          match: { verb: "compute", noun: "invoice-preview" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  for (const entry of contract.contracts) {
    assert.notEqual(entry.status, "suggested");
  }
  assert.equal(contract.summary.suggested, 0);
});

// ---------- 15: configHash is reproducible ----------

test("configHash is stable across two runs of the same config", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const config = {
    version: "0.1.0",
    contracts: [
      {
        id: "rule",
        match: { verb: "compute", noun: "invoice-preview" },
        requiredChecks: ["npm test"],
      },
    ],
  };
  const a = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config,
    configPath: ".rekon/capability-contracts.json",
    configHash: "sha256:deadbeef",
    generatedAt: "2026-05-27T00:00:00.000Z",
  });
  const b = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config,
    configPath: ".rekon/capability-contracts.json",
    configHash: "sha256:deadbeef",
    generatedAt: "2026-05-27T00:00:00.000Z",
  });
  assert.equal(a.source.configHash, b.source.configHash);
});

// ---------- 16: SDK registers CapabilityContract ----------

test("runtime accepts a CapabilityContract write", async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), "rekon-contract-runtime-"));
  try {
    const runtime = await createRuntime({ repoRoot: runtimeRoot });
    const map = makeCapabilityMap([makePhraseBackedCapability()]);
    const contract = buildCapabilityContract({
      capabilityMap: map,
      capabilityMapRef: CAPABILITY_MAP_REF,
      config: {
        version: "0.1.0",
        contracts: [
          {
            id: "rule",
            match: { verb: "compute", noun: "invoice-preview" },
            requiredChecks: ["npm test"],
          },
        ],
      },
    });
    const ref = await runtime.artifacts.write(contract);
    assert.equal(ref.type, "CapabilityContract");
    const round = await runtime.artifacts.read(ref);
    assert.equal(round.contracts.length, 1);
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});

// ---------- 17 + 18: CLI smoke ----------

test("rekon capability contract generate writes an artifact and prints summary", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-contract-cli-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });

    // Seed the fixture so a CapabilityMap exists.
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);

    const projectPhrase = spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(projectPhrase.status, 0, projectPhrase.stderr || projectPhrase.stdout);
    const normReport = JSON.parse(projectPhrase.stdout).artifact;
    assert.ok(normReport, "expected ontology normalize to return an artifact ref");

    const phraseProject = spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        `${normReport.type}:${normReport.id}`,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(phraseProject.status, 0, phraseProject.stderr || phraseProject.stdout);

    // Re-run model projector so CapabilityMap consumes
    // the new CapabilityPhraseReport.
    const refresh2 = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh2.status, 0, refresh2.stderr || refresh2.stdout);

    // Write a config file.
    await mkdir(join(work, ".rekon"), { recursive: true });
    await writeFile(
      join(work, ".rekon", "capability-contracts.json"),
      JSON.stringify(
        {
          version: "0.1.0",
          contracts: [
            {
              id: "test.rule.unmatched",
              match: { verb: "ship", noun: "rocket" },
              requiredChecks: ["npm test"],
            },
          ],
        },
        null,
        2,
      ),
    );

    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);
    const payload = JSON.parse(generate.stdout);
    assert.equal(payload.artifact.type, "CapabilityContract");
    assert.equal(payload.configPresent, true);
    assert.equal(typeof payload.source.configHash, "string");
    assert.ok(payload.source.configHash.startsWith("sha256:"));
    assert.ok(Array.isArray(payload.contracts));
    // Source file is untouched after CLI runs.
    const configRaw = await readFile(
      join(work, ".rekon", "capability-contracts.json"),
      "utf8",
    );
    assert.ok(configRaw.includes("test.rule.unmatched"));
    // Discover the generated artifact and confirm category is actions.
    const actionsDir = join(work, ".rekon", "artifacts", "actions");
    const dirEntries = await readdir(actionsDir).catch(() => []);
    const contractFile = dirEntries.find((name) => name.startsWith("CapabilityContract-"));
    assert.ok(contractFile, "expected a CapabilityContract artifact in the actions/ directory");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CLI prints "Diagnostic only" line in human mode ----------

test("rekon capability contract generate (human mode) prints diagnostic guidance", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-contract-cli-human-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work], { encoding: "utf8" });
    assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);
    assert.ok(
      /Diagnostic only/i.test(generate.stdout),
      "human output must include the diagnostic guidance line",
    );
    assert.ok(
      /CapabilityMap remains unchanged\./i.test(generate.stdout),
      "human output must restate the CapabilityMap-unchanged invariant",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: source.configPath is preserved when present ----------

test("source.configPath is preserved when present and absent when missing", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const present = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "rule",
          match: { verb: "compute", noun: "invoice-preview" },
          requiredChecks: ["npm test"],
        },
      ],
    },
    configPath: ".rekon/capability-contracts.json",
  });
  assert.equal(present.source.configPath, ".rekon/capability-contracts.json");
  const absent = buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  assert.equal(absent.source.configPath, undefined);
});

// ---------- 21: v2 boundary — CapabilityMap is never mutated by the producer ----------

test("buildCapabilityContract never mutates the supplied CapabilityMap", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability()]);
  const before = JSON.stringify(map);
  buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: {
      version: "0.1.0",
      contracts: [
        {
          id: "rule",
          match: { verb: "compute", noun: "invoice-preview" },
          requiredChecks: ["npm test"],
        },
      ],
    },
  });
  assert.equal(JSON.stringify(map), before);
});
