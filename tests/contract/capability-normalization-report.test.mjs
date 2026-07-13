// Contract tests for the @rekon/capability-ontology v1 slice
// (Capability Ontology Translation Layer — first runtime
// implementation: CapabilityNormalizationReport).
//
// The translation layer is **read-only**: it never mutates
// EvidenceGraph raw facts, never updates CapabilityMap, and
// never writes source files. The lexical split is purely
// deterministic. LLM normalization is not invoked.
//
// Tests pin:
//   - lexical splitter handles camelCase / snake_case / kebab-case
//   - lexical splitter exposes confidence
//   - built-in ontology compiles without operator config
//   - config merging keeps built-in canonical entries
//   - alias resolution flags aliasApplied
//   - candidate extraction reads symbol / export / capability_hint
//   - ownership_hint candidates are extracted but classified ignored
//   - default-name export is dropped from candidates
//   - unknown verbs flagged unknown-verb
//   - unknown nouns flagged unknown-noun
//   - both unknown → unknown
//   - single-token names → low-confidence
//   - empty graph → empty report
//   - summary counts match candidate statuses
//   - report header references the source EvidenceGraph
//   - report effective hash matches ontology hash
//   - CLI command writes a CapabilityNormalizationReport
//   - CLI command does not mutate source files
//   - artifacts validate stays clean after CLI run

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  BUILTIN_CAPABILITY_ONTOLOGY,
  buildCapabilityNormalizationReport,
  compileEffectiveCapabilityOntology,
  extractCapabilityCandidates,
  loadCapabilityOntologyConfig,
  normalizeCapabilityCandidates,
  splitCapabilityName,
} from "../../packages/capability-ontology/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: lexical splitter handles common name shapes ----------

test("splitCapabilityName splits camelCase / snake_case / kebab-case deterministically", () => {
  const camel = splitCapabilityName("getUserToken");
  assert.deepEqual(camel.tokens, ["get", "user", "token"]);
  assert.equal(camel.verb, "get");
  assert.equal(camel.noun, "token");

  const snake = splitCapabilityName("save_user_session");
  assert.deepEqual(snake.tokens, ["save", "user", "session"]);

  const kebab = splitCapabilityName("delete-user-record");
  assert.deepEqual(kebab.tokens, ["delete", "user", "record"]);
});

// ---------- 2: lexical splitter exposes a confidence band ----------

test("splitCapabilityName exposes split confidence", () => {
  assert.equal(splitCapabilityName("getUser").confidence, "high");
  assert.equal(splitCapabilityName("getUserToken").confidence, "medium");
  assert.equal(splitCapabilityName("doStuff").confidence, "high");
  assert.equal(splitCapabilityName("orphan").confidence, "low");
  assert.equal(splitCapabilityName("").confidence, "low");
});

// ---------- 3: built-in ontology compiles without operator config ----------

test("compileEffectiveCapabilityOntology compiles without operator config", () => {
  const ontology = compileEffectiveCapabilityOntology();
  assert.equal(ontology.source.configPath, undefined);
  assert.equal(ontology.source.configHash, undefined);
  assert.equal(ontology.source.builtinVersion, BUILTIN_CAPABILITY_ONTOLOGY.version);
  assert.ok(ontology.verbs.canonical.includes("get"));
  assert.ok(ontology.nouns.canonical.includes("user"));
  assert.ok(ontology.effectiveHash.length >= 8, "effectiveHash must be non-empty");
});

// ---------- 4: config merging keeps built-in canonical entries ----------

test("config merging keeps built-in canonical entries while adding new ones", () => {
  const ontology = compileEffectiveCapabilityOntology({
    config: {
      version: "0.1.0",
      verbs: { canonical: ["dispatch"], aliases: { send: "dispatch" } },
      nouns: { canonical: ["invoice"] },
    },
    configPath: ".rekon/capability-ontology.json",
    configHash: "abcd1234",
  });

  assert.ok(ontology.verbs.canonical.includes("get"));
  assert.ok(ontology.verbs.canonical.includes("dispatch"));
  assert.equal(ontology.verbs.aliasToCanonical.send, "dispatch");
  assert.ok(ontology.nouns.canonical.includes("invoice"));
  assert.equal(ontology.source.configPath, ".rekon/capability-ontology.json");
});

// ---------- 5: alias resolution flags aliasApplied ----------

test("alias resolution flags aliasApplied on the outcome", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const outcomes = normalizeCapabilityCandidates({
    candidates: [
      {
        id: "candidate-0000",
        raw: { name: "retrieveUser", verb: "retrieve", noun: "user", splitConfidence: "high" },
        source: { kind: "symbol", path: "src/users.ts", symbol: "retrieveUser" },
      },
    ],
    ontology,
  });
  assert.equal(outcomes[0].status, "normalized");
  assert.equal(outcomes[0].normalized?.verb, "get");
  assert.equal(outcomes[0].normalized?.verbAliasApplied, "retrieve");
});

// ---------- 6: candidate extraction reads symbol/export/capability_hint ----------

test("extractCapabilityCandidates reads symbol, export, and capability_hint facts", () => {
  const graph = makeGraph([
    fact("symbol", "src/users.ts", { name: "getUser" }),
    fact("export", "src/users.ts", { name: "createUser" }),
    fact("capability_hint", "src/users.ts", { hint: "validateUser" }),
  ]);
  const candidates = extractCapabilityCandidates(graph);
  const kinds = candidates.map((entry) => entry.source.kind);
  assert.deepEqual(kinds, ["symbol", "export", "capability_hint"]);
});

test("symbol and export facts for one declaration become one candidate with both provenance ids", () => {
  const symbol = fact("symbol", "src/users.ts", { name: "getUser", symbolKind: "function" });
  const exported = fact("export", "src/users.ts", { name: "getUser", kind: "function" });
  const graph = makeGraph([exported, symbol]);
  const candidates = extractCapabilityCandidates(graph);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source.kind, "symbol");
  assert.equal(candidates[0].source.symbol, "getUser");
  assert.equal(candidates[0].source.exportName, "getUser");
  assert.deepEqual(candidates[0].source.factIds, [exported.id, symbol.id].sort());
  assert.deepEqual(candidates[0].source.factKinds, ["export", "symbol"]);

  const report = buildCapabilityNormalizationReport({
    header: makeHeader(),
    ontology: compileEffectiveCapabilityOntology(),
    graph,
  });
  assert.deepEqual(report.candidates[0].source.factIds, candidates[0].source.factIds);
  assert.deepEqual(report.candidates[0].source.factKinds, ["export", "symbol"]);
});

// ---------- 7: ownership_hint candidates are classified ignored ----------

test("ownership_hint candidates are extracted but classified ignored", () => {
  const graph = makeGraph([
    fact("ownership_hint", "src/users.ts", { path: "src/users.ts", system: "users" }),
  ]);
  const ontology = compileEffectiveCapabilityOntology();
  const report = buildCapabilityNormalizationReport({
    header: makeHeader(),
    ontology,
    graph,
  });
  assert.equal(report.summary.totalCandidates, 1);
  assert.equal(report.summary.ignored, 1);
  assert.equal(report.candidates[0].status, "ignored");
});

// ---------- 8: default-name export is dropped from candidates ----------

test("default-name exports are dropped from candidates", () => {
  const graph = makeGraph([
    fact("export", "src/index.ts", { name: "default", kind: "default" }),
    fact("export", "src/index.ts", { name: "getUser" }),
  ]);
  const candidates = extractCapabilityCandidates(graph);
  const names = candidates.map((entry) => entry.raw.name);
  assert.ok(!names.includes("default"));
  assert.ok(names.includes("getUser"));
});

// ---------- 9: unknown verb flagged unknown-verb ----------

test("unknown verb is flagged unknown-verb", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const outcomes = normalizeCapabilityCandidates({
    candidates: [
      {
        id: "candidate-0000",
        raw: { name: "quibbleUser", verb: "quibble", noun: "user", splitConfidence: "high" },
        source: { kind: "symbol", path: "src/users.ts", symbol: "quibbleUser" },
      },
    ],
    ontology,
  });
  assert.equal(outcomes[0].status, "unknown-verb");
});

// ---------- 10: unknown noun flagged unknown-noun ----------

test("unknown noun is flagged unknown-noun", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const outcomes = normalizeCapabilityCandidates({
    candidates: [
      {
        id: "candidate-0000",
        raw: { name: "getQuiddich", verb: "get", noun: "quiddich", splitConfidence: "high" },
        source: { kind: "symbol", path: "src/wizards.ts", symbol: "getQuiddich" },
      },
    ],
    ontology,
  });
  assert.equal(outcomes[0].status, "unknown-noun");
});

// ---------- 11: both unknown → unknown ----------

test("verb + noun both unknown becomes unknown", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const outcomes = normalizeCapabilityCandidates({
    candidates: [
      {
        id: "candidate-0000",
        raw: { name: "quibbleQuiddich", verb: "quibble", noun: "quiddich", splitConfidence: "high" },
        source: { kind: "symbol", path: "src/wizards.ts", symbol: "quibbleQuiddich" },
      },
    ],
    ontology,
  });
  assert.equal(outcomes[0].status, "unknown");
});

// ---------- 12: single-token names map to low-confidence ----------

test("single-token names become low-confidence outcomes", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const outcomes = normalizeCapabilityCandidates({
    candidates: [
      {
        id: "candidate-0000",
        raw: { name: "orphan", verb: "orphan", noun: undefined, splitConfidence: "low" },
        source: { kind: "symbol", path: "src/users.ts", symbol: "orphan" },
      },
    ],
    ontology,
  });
  assert.equal(outcomes[0].status, "low-confidence");
});

// ---------- 13: empty graph → empty report ----------

test("empty EvidenceGraph produces an empty CapabilityNormalizationReport", () => {
  const graph = makeGraph([]);
  const ontology = compileEffectiveCapabilityOntology();
  const report = buildCapabilityNormalizationReport({
    header: makeHeader(),
    ontology,
    graph,
  });
  assert.equal(report.summary.totalCandidates, 0);
  assert.deepEqual(report.candidates, []);
});

// ---------- 14: summary counts match candidate statuses ----------

test("summary counts match candidate statuses", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const graph = makeGraph([
    fact("symbol", "src/users.ts", { name: "getUser" }),
    fact("symbol", "src/wizards.ts", { name: "quibbleQuiddich" }),
    fact("ownership_hint", "src/users.ts", { system: "users" }),
  ]);
  const report = buildCapabilityNormalizationReport({
    header: makeHeader(),
    ontology,
    graph,
  });
  const reHash = report.candidates.reduce(
    (acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] ?? 0) + 1;
      return acc;
    },
    {},
  );
  assert.equal(report.summary.normalized, reHash["normalized"] ?? 0);
  assert.equal(report.summary.unknown, reHash["unknown"] ?? 0);
  assert.equal(report.summary.ignored, reHash["ignored"] ?? 0);
  assert.equal(report.summary.totalCandidates, report.candidates.length);
});

// ---------- 15: report header references the source EvidenceGraph ----------

test("report carries the EvidenceGraph ref in its inputRefs + candidates", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const graphRef = {
    type: "EvidenceGraph",
    id: "graph-001",
    schemaVersion: "0.1.0",
    path: "artifacts/evidence/graph-001.json",
  };
  const graph = makeGraph([fact("symbol", "src/users.ts", { name: "getUser" })]);
  const header = { ...makeHeader(), inputRefs: [graphRef] };
  const report = buildCapabilityNormalizationReport({
    header,
    ontology,
    graph,
    graphRef,
  });
  assert.equal(report.header.inputRefs[0].id, "graph-001");
  assert.equal(report.candidates[0].source.artifactRef?.id, "graph-001");
});

// ---------- 16: report effective hash matches the ontology hash ----------

test("report.ontology.effectiveHash equals the compiled ontology hash", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const graph = makeGraph([fact("symbol", "src/users.ts", { name: "getUser" })]);
  const report = buildCapabilityNormalizationReport({
    header: makeHeader(),
    ontology,
    graph,
  });
  assert.equal(report.ontology.effectiveHash, ontology.effectiveHash);
});

// ---------- 17: CLI writes a CapabilityNormalizationReport ----------

test("rekon capability ontology normalize writes a CapabilityNormalizationReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-ontology-cli-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    runCli(work, ["init"]);
    runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
    const result = runCli(work, ["capability", "ontology", "normalize", "--json"]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.artifact.type, "CapabilityNormalizationReport");
    assert.equal(typeof payload.summary.totalCandidates, "number");

    const reportPath = join(work, payload.artifact.path);
    const written = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(written.header.artifactType, "CapabilityNormalizationReport");
    assert.equal(written.ontology.source, "builtin");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: CLI does not mutate source files ----------

test("rekon capability ontology normalize does not mutate any source file", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-ontology-noop-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    const before = await snapshotSourceFiles(work);

    runCli(work, ["init"]);
    runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
    runCli(work, ["capability", "ontology", "normalize", "--json"]);

    const after = await snapshotSourceFiles(work);
    assert.deepEqual(before, after);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: artifacts validate stays clean after a normalize run ----------

test("rekon artifacts validate stays clean after a normalize run", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-ontology-validate-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    runCli(work, ["init"]);
    runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
    runCli(work, ["capability", "ontology", "normalize"]);
    const result = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(result.stdout);
    assert.ok(Array.isArray(payload.issues), "validate result should include issues array");
    assert.equal(payload.issues.length, 0);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Test helpers ----------

function fact(kind, subject, value) {
  return {
    id: `${kind}:${subject}:${JSON.stringify(value)}`,
    kind,
    subject,
    value,
    confidence: 1,
    provenance: {
      source: "test",
      pack: "test",
      extractorVersion: "0.0.1",
      file: subject,
    },
  };
}

function makeGraph(facts) {
  return {
    header: {
      artifactType: "EvidenceGraph",
      artifactId: "graph-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "test", version: "0.0.0" },
      inputRefs: [],
    },
    facts,
  };
}

function makeHeader() {
  return {
    artifactType: "CapabilityNormalizationReport",
    artifactId: "capability-normalization-test",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-26T00:00:00Z",
    subject: { repoId: "/tmp/test" },
    producer: {
      id: "@rekon/capability-ontology.normalization-projector",
      version: "0.1.0",
    },
    inputRefs: [],
  };
}

function runCli(cwd, args) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
    );
  }
  return result;
}

async function snapshotSourceFiles(root) {
  const targets = ["src", "package.json", "tsconfig.json"];
  const snapshot = {};
  for (const target of targets) {
    const absolute = join(root, target);
    try {
      const info = await stat(absolute);
      if (info.isDirectory()) {
        const entries = await readdir(absolute, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const filePath = join(absolute, entry.name);
          const contents = await readFile(filePath, "utf8");
          snapshot[relative(root, filePath)] = createHash("sha256")
            .update(contents)
            .digest("hex");
        }
      } else if (info.isFile()) {
        const contents = await readFile(absolute, "utf8");
        snapshot[target] = createHash("sha256").update(contents).digest("hex");
      }
    } catch {
      // Ignore missing files
    }
  }
  return snapshot;
}

// Use the loader for surface coverage (sanity that the loader
// returns `found: false` when no config exists).
test("loadCapabilityOntologyConfig returns found:false when no config exists", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-ontology-loader-"));
  try {
    const result = await loadCapabilityOntologyConfig(work);
    assert.equal(result.found, false);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
