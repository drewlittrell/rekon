// WO-19 behavioral tests: the contract layer (operator:wo-19#contract-layer
// - sdk to kernel silent, contract to capability fires, capability to sdk
// silent) and the dist-import exemptions (operator:wo-19#dist-scope -
// silent under a declared glob, fires outside it; repo-jurisdiction
// config, corpus repos untouched).

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
const spec = (source, resolvedTarget, name = "x") => ({
  kind: "import_specifier",
  subject: `${source}:${resolvedTarget}:${name}`,
  value: { source, target: "spec", name, local: name, specifierKind: "named", resolvedTarget },
});

test("contract layer: sdk->kernel silent, contract->capability fires, capability->sdk silent", () => {
  const grammar = ontology.compileEffectiveGrammar({ ratifiedArchetypeIds: [PP] });

  assert.equal(ontology.assignGrammarLayer(grammar, "packages/sdk/src/index.ts"), "contract");

  const findings = policy.evaluateGrammarDivergence({
    facts: [
      file("packages/sdk/src/index.ts"),
      file("packages/kernel-findings/src/index.ts"),
      file("packages/capability-policy/src/index.ts"),
      // contract -> kernel: the law ("imports kernel only") - silent.
      spec("packages/sdk/src/index.ts", "packages/kernel-findings/src/index.ts"),
      // contract -> capability: forbidden edge - fires.
      spec("packages/sdk/src/hypothetical.ts", "packages/capability-policy/src/index.ts"),
      // capability -> contract: allowed (capabilities consume the sdk to
      // define themselves) - silent. This was the WO-18 FP class.
      spec("packages/capability-policy/src/index.ts", "packages/sdk/src/index.ts"),
    ],
    grammar,
  }).filter((f) => f.payload.law.axis === "layer_import");

  assert.equal(findings.length, 1);
  assert.equal(findings[0].files[0], "packages/sdk/src/hypothetical.ts");
  assert.match(findings[0].payload.law.declaration, /operator:wo-18#package-platform/);
});

test("dist-import exemptions and declared entrypoints keep intentional built bootstraps quiet", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "rekon-wo19-dist-"));

  try {
    mkdirSync(join(tmp, ".rekon"), { recursive: true });
    writeFileSync(join(tmp, ".rekon", "scan-scope.json"), JSON.stringify({
      distImportExemptions: [
        { glob: "vendor/**", reason: "Vendored adapters consume the built package (operator:wo-19#dist-scope)." },
      ],
    }));

    const exemptions = await policy.loadDistImportExemptions(tmp);

    assert.equal(exemptions.length, 1);
    assert.match(exemptions[0].reason, /operator:wo-19#dist-scope/);

    const graph = {
      header: { subject: { repoId: "fixture" } },
      facts: [
        { kind: "import", subject: "vendor/adapter.ts:../../dist/index.js", value: { source: "vendor/adapter.ts", target: "../../dist/index.js" } },
        { kind: "import", subject: "src/app.ts:../dist/index.js", value: { source: "src/app.ts", target: "../dist/index.js" } },
        { kind: "import", subject: "src/vendor.ts:dependency/dist/index.js", value: { source: "src/vendor.ts", target: "dependency/dist/index.js" } },
        { kind: "entry_point", subject: "cli:bin/tool.js", value: { path: "bin/tool.js", entryKind: "cli" } },
        { kind: "import", subject: "bin/tool.js:../dist/cli.js", value: { source: "bin/tool.js", target: "../dist/cli.js" } },
      ],
    };
    const written = [];
    const stubArtifacts = {
      list: async (type) => (type === "EvidenceGraph" ? [{ type: "EvidenceGraph", id: "eg-1", schemaVersion: "0.1.0" }] : []),
      read: async () => graph,
      write: async (_type, report) => { written.push(report); return { type: "FindingReport", id: report.header.artifactId, schemaVersion: "0.1.0" }; },
    };

    // With the repo's config: vendor and the declared entrypoint are exempt; src fires.
    await policy.policyEvaluator.evaluate({ artifacts: stubArtifacts, input: { repoRoot: tmp } });
    const fired = written.findLast((report) => report.header.artifactType === "FindingReport")
      .findings.filter((f) => f.ruleId === "imports.noDistImports");

    assert.deepEqual(fired.map((f) => (f.subjects?.[0] ?? f.files?.[0]).split(":")[0]), ["src/app.ts"]);

    // Without repo config: vendor fires, the declared entrypoint remains quiet.
    await policy.policyEvaluator.evaluate({ artifacts: stubArtifacts, input: {} });
    const allFired = written.findLast((report) => report.header.artifactType === "FindingReport")
      .findings.filter((f) => f.ruleId === "imports.noDistImports");

    assert.deepEqual(
      allFired.map((f) => (f.subjects?.[0] ?? f.files?.[0]).split(":")[0]).sort(),
      ["src/app.ts", "vendor/adapter.ts"],
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
