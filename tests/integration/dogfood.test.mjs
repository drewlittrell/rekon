import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const dogfoodRoot = process.env.REKON_DOGFOOD_CLASSIC_ROOT;
const representativePaths = [
  "services/AnalysisService.ts",
  "services/FullScanHandler.ts",
  "services/ContextHandler.ts",
  "services/IssueDetectionService.ts",
  "domain/issues/RulesResolver.ts",
  "services/GraphBuildProvider.ts",
  "package.json",
  "src/index.ts",
];

test("optional legacy-reference dogfood regression", async (t) => {
  if (!dogfoodRoot) {
    t.skip("Set REKON_DOGFOOD_CLASSIC_ROOT to run the optional dogfood regression.");
    return;
  }

  const root = resolve(dogfoodRoot);
  const preflightPath = representativePaths.find((path) => existsSync(join(root, path))) ?? representativePaths[0];

  runCli(["init", "--root", root, "--json"]);
  runCli(["observe", "--root", root, "--json"]);
  runCli(["project", "--root", root, "--json"]);
  runCli(["snapshot", "--root", root, "--json"]);
  runCli(["evaluate", "--root", root, "--json"]);
  const preflight = JSON.parse(runCli([
    "resolve",
    "preflight",
    "--root",
    root,
    "--path",
    preflightPath,
    "--goal",
    "dogfood preflight",
    "--json",
  ]).stdout);

  const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
  const counts = countByType(index);

  assert.ok((counts.EvidenceGraph ?? 0) > 0, "dogfood should emit EvidenceGraph");
  assert.ok((counts.ObservedRepo ?? 0) > 0 || (counts.OwnershipMap ?? 0) > 0, "dogfood should emit model projections");
  assert.ok((counts.GraphSlice ?? 0) > 0, "dogfood should emit graph slices");
  assert.ok((counts.FindingReport ?? 0) > 0, "dogfood should emit finding reports");
  assert.ok(preflight.packet.resolutionTrace.length > 0, "preflight should include resolutionTrace");
  assert.ok(
    preflight.packet.ownerSystems.length > 0 ||
      preflight.packet.warnings.some((warning) => warning.includes("Ownership unresolved")),
    "preflight should resolve ownership or explain unresolved ownership",
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    root,
    preflightPath,
    counts,
    resolverPacket: preflight.artifact,
    ownerSystems: preflight.packet.ownerSystems,
    warnings: preflight.packet.warnings,
    resolutionTraceEntries: preflight.packet.resolutionTrace.length,
  };
  const summaryPath = join(repoRoot, "tests/fixtures/dogfood/legacy-reference-summary.json");

  await mkdir(join(repoRoot, "tests/fixtures/dogfood"), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
});

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  return result;
}

function countByType(index) {
  return index.reduce((counts, entry) => {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    return counts;
  }, {});
}
