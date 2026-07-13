import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const summaryPath = join(repoRoot, "tests/fixtures/dogfood/external-reference-summary.json");
const dogfoodRoot = process.env.REKON_DOGFOOD_REFERENCE_ROOT;
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

test("optional external-reference dogfood regression", async (t) => {
  if (!dogfoodRoot) {
    t.skip("Set REKON_DOGFOOD_REFERENCE_ROOT to run the optional dogfood regression.");
    return;
  }

  const root = resolve(dogfoodRoot);
  const preflightPath = representativePaths.find((path) => existsSync(join(root, path))) ?? representativePaths[0];
  const previousIndex = await readArtifactIndex(root);
  const previousEntries = new Set(previousIndex.map(artifactIdentity));

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
  const currentRunEntries = index.filter((entry) => !previousEntries.has(artifactIdentity(entry)));
  const counts = countByType(currentRunEntries);

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
    target: "external-reference",
    currentRunArtifactCounts: counts,
    preflight: {
      ownershipResolution: preflight.packet.ownerSystems.length > 0 ? "resolved" : "explicitly-unresolved",
      ownerSystemCount: preflight.packet.ownerSystems.length,
      warningCount: preflight.packet.warnings.length,
      resolutionTraceEntries: preflight.packet.resolutionTrace.length,
    },
  };
  const serialized = `${JSON.stringify(summary, null, 2)}\n`;

  assert.equal(serialized.includes(root), false, "dogfood summary must not include the external root");
  assert.equal(serialized.includes(".rekon/artifacts"), false, "dogfood summary must not include artifact paths");

  await mkdir(join(repoRoot, "tests/fixtures/dogfood"), { recursive: true });
  await writeFile(summaryPath, serialized, "utf8");
});

test("checked-in external-reference dogfood summary is sanitized", async () => {
  const serialized = await readFile(summaryPath, "utf8");
  const summary = JSON.parse(serialized);

  assert.equal(Object.hasOwn(summary, "root"), false);
  assert.equal(Object.hasOwn(summary, "generatedAt"), false);
  assert.equal(serialized.includes(".rekon/artifacts"), false);
  assert.equal(/\/(?:Users|home|private|tmp)\//.test(serialized), false);
  assert.equal(/[A-Za-z]:\\/.test(serialized), false);
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
  const counts = index.reduce((result, entry) => {
    result[entry.type] = (result[entry.type] ?? 0) + 1;
    return result;
  }, {});
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function artifactIdentity(entry) {
  return `${entry.type}:${entry.id}`;
}

async function readArtifactIndex(root) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  if (!existsSync(indexPath)) return [];
  const parsed = JSON.parse(await readFile(indexPath, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}
