// WO-20 behavioral tests: the kernel->contract edge row (Part 2), the
// keyless-gate dist exemption globs (Part 1), and the declared-roots
// glob mechanism (Part 3, operator:wo-20#package-roots).

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));

const PP = "grammar-archetype-package-platform";
const file = (path) => ({ kind: "file", subject: path, value: {} });
const exp = (path, name) => ({ kind: "export", subject: path, value: { name, kind: "const" } });
const spec = (source, resolvedTarget, name = "x") => ({
  kind: "import_specifier",
  subject: `${source}:${resolvedTarget}:${name}`,
  value: { source, target: "spec", name, local: name, specifierKind: "named", resolvedTarget },
});

test("Part 2: kernel->contract completes the constitutional edge", () => {
  const grammar = ontology.compileEffectiveGrammar({ ratifiedArchetypeIds: [PP] });
  const findings = policy.evaluateGrammarDivergence({
    facts: [
      file("kernel/store.ts"),
      file("packages/sdk/src/index.ts"),
      spec("kernel/store.ts", "packages/sdk/src/index.ts"),
    ],
    grammar,
  }).filter((f) => f.payload.law.axis === "layer_import");

  assert.equal(findings.length, 1);
  assert.equal(findings[0].files[0], "kernel/store.ts");
});

test("Part 1: keyless-gate globs - dist import inside silent, outside fires", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "rekon-wo20-gate-"));

  try {
    mkdirSync(join(tmp, ".rekon"), { recursive: true });
    writeFileSync(join(tmp, ".rekon", "scan-scope.json"), JSON.stringify({
      distImportExemptions: [
        { glob: "tests/contract/**", reason: "The keyless gate runs the committed suite against built output by design (operator:wo-20#keyless-gate)." },
        { glob: "packages/*/test/**", reason: "The keyless gate runs the committed suite against built output by design (operator:wo-20#keyless-gate)." },
      ],
    }));

    const graph = {
      header: { subject: { repoId: "fixture" } },
      facts: [
        { kind: "import", subject: "tests/contract/x.test.mjs:../../packages/a/dist/index.js", value: { source: "tests/contract/x.test.mjs", target: "../../packages/a/dist/index.js" } },
        { kind: "import", subject: "packages/a/test/a.test.mjs:../dist/index.js", value: { source: "packages/a/test/a.test.mjs", target: "../dist/index.js" } },
        { kind: "import", subject: "packages/a/src/main.ts:../dist/index.js", value: { source: "packages/a/src/main.ts", target: "../dist/index.js" } },
      ],
    };
    const written = [];
    const stubArtifacts = {
      list: async (type) => (type === "EvidenceGraph" ? [{ type: "EvidenceGraph", id: "eg-1", schemaVersion: "0.1.0" }] : []),
      read: async () => graph,
      write: async (_type, report) => { written.push(report); return { type: "FindingReport", id: report.header.artifactId, schemaVersion: "0.1.0" }; },
    };

    await policy.policyEvaluator.evaluate({ artifacts: stubArtifacts, input: { repoRoot: tmp } });
    const fired = written.findLast((report) => report.header.artifactType === "FindingReport")
      .findings.filter((f) => f.ruleId === "imports.noDistImports");

    assert.deepEqual(fired.map((f) => (f.subjects?.[0] ?? f.files?.[0]).split(":")[0]), ["packages/a/src/main.ts"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("Part 3: a declared root glob makes the package entry's exports API; orphans survive", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "rekon-wo20-roots-"));

  try {
    mkdirSync(join(tmp, ".rekon"), { recursive: true });
    writeFileSync(join(tmp, ".rekon", "scan-scope.json"), JSON.stringify({
      declaredRoots: [
        { glob: "packages/*/src/index.ts", reason: "A package's public entry is a consumption root (operator:wo-20#package-roots)." },
      ],
    }));

    const globs = await policy.loadDeclaredRootGlobs(tmp);

    assert.equal(globs.length, 1);
    assert.match(globs[0].reason, /operator:wo-20#package-roots/);

    const graph = {
      header: { subject: { repoId: "fixture" } },
      facts: [
        file("packages/a/src/index.ts"),
        exp("packages/a/src/index.ts", "api"),
        file("packages/a/src/orphan.ts"),
        exp("packages/a/src/orphan.ts", "deadThing"),
      ],
    };
    const written = [];
    const stubArtifacts = {
      list: async (type) => (type === "EvidenceGraph" ? [{ type: "EvidenceGraph", id: "eg-1", schemaVersion: "0.1.0" }] : []),
      read: async () => graph,
      write: async (_type, report) => { written.push(report); return { type: "FindingReport", id: report.header.artifactId, schemaVersion: "0.1.0" }; },
    };

    await policy.policyEvaluator.evaluate({ artifacts: stubArtifacts, input: { repo: { root: tmp } } });
    const dead = written.findLast((report) => report.header.artifactType === "AssessmentReport")
      .assessments.filter((assessment) => assessment.ruleId === "dead_code.unreferenced");

    // The declared-root entry's export is API (never flags); the orphan
    // survives as a risk because the declared root graph may omit dynamic or
    // externally consumed entry points.
    assert.deepEqual(dead.map((f) => f.files[0]), ["packages/a/src/orphan.ts"]);
    assert.equal(dead[0].kind, "risk");
    assert.match(dead[0].confidence.rationale, /entry points may be incomplete/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("WO-21: law text is data - a console string inside the packs path is silent, package code fires", () => {
  const base = [...ontology.compileEffectiveGrammar({}).antiPatterns.values()].find((a) => a.id === "consoleLogging");
  const grammar = ontology.compileEffectiveGrammar({
    overrides: {
      antiPatterns: [{
        ...base,
        details: {
          ...base.details,
          exceptions: [
            ...(base.details.exceptions ?? []),
            { path: "packages/capability-ontology/src/grammar/packs/**", reason: "Law text is data (operator:wo-21#law-text-as-data)." },
            { path: "packages/runtime/src/index.ts", reason: "The logging seam (operator:wo-21#logging-seam)." },
          ],
        },
        source: "operator:wo-21#logging-seam",
      }],
    },
  });
  const signal = (path) => ({ kind: "content_signal", subject: path, value: { signal: "consoleLogging" } });
  const findings = policy.evaluateAntiPatterns({
    facts: [
      signal("packages/capability-ontology/src/grammar/packs/grammar-base.ts"), // law text: silent
      signal("packages/runtime/src/index.ts"), // the seam: silent
      signal("packages/capability-policy/src/index.ts"), // package code: fires
    ],
    grammar,
  });

  assert.deepEqual(findings.map((f) => f.files[0]), ["packages/capability-policy/src/index.ts"]);
});
