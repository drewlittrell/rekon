import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingFilters,
  createFindingFilterReport,
  createFindingReport,
  deriveFindingFilterPolicySuggestions,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildFindingFilterPolicySuggestionReport,
  buildFindingFilterReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("deriveFindingFilterPolicySuggestions: repeated generated path prefix → high-confidence repeated-filtered-path", () => {
  const filterReport = makeFilterReport([
    finding("a", { files: ["src/generated/one.ts"] }),
    finding("b", { files: ["src/generated/two.ts"] }),
    finding("c", { files: ["src/generated/three.ts"] }),
  ]);
  const suggestions = deriveFindingFilterPolicySuggestions({ filterReports: [filterReport] });
  // We expect both a repeated-filtered-policy-gap and a
  // repeated-filtered-path candidate, deduped to one: policy-gap
  // wins for the same pathPattern because built-in filters fired.
  const pathSuggestions = suggestions.filter((entry) =>
    entry.suggestedRule.pathPattern === "src/generated/**",
  );
  assert.equal(pathSuggestions.length, 1, "should not duplicate suggestions for the same pathPattern");
  const [pathSuggestion] = pathSuggestions;
  assert.equal(pathSuggestion.reason, "repeated-filtered-policy-gap");
  assert.equal(pathSuggestion.confidence, "high");
  assert.equal(pathSuggestion.suggestedRule.pathPattern, "src/generated/**");
  assert.equal(pathSuggestion.suggestedRule.reason, "generated-file");
  assert.deepEqual(pathSuggestion.affectedFindingIds.sort(), ["a", "b", "c"]);
});

test("deriveFindingFilterPolicySuggestions: two repeated paths → medium-confidence repeated-filtered-path", () => {
  // Two policy-filtered entries (no built-in fallback) → emits a
  // repeated-filtered-path suggestion, never a policy-gap.
  const filterReport = {
    header: artifactHeader("FindingFilterReport", "fr-two"),
    summary: {
      totalFiltered: 2,
      kept: 1,
      byReason: { "policy-exception": 2 },
      byConfidence: { medium: 2 },
      byType: { "test.example": 2 },
      bySeverity: { medium: 2 },
    },
    keptFindings: [finding("k1", { files: ["src/lib/ok.ts"] })],
    filteredFindings: [
      filteredEntry("a", "src/legacy/one.ts", { source: "policy", reason: "policy-exception", policyId: "p1" }),
      filteredEntry("b", "src/legacy/two.ts", { source: "policy", reason: "policy-exception", policyId: "p1" }),
    ],
  };
  const suggestions = deriveFindingFilterPolicySuggestions({ filterReports: [filterReport] });
  const candidate = suggestions.find(
    (entry) => entry.reason === "repeated-filtered-path"
      && entry.suggestedRule.pathPattern === "src/legacy/**",
  );
  assert.ok(candidate, `expected repeated-filtered-path suggestion, got ${JSON.stringify(suggestions)}`);
  assert.equal(candidate.confidence, "medium");
  assert.equal(candidate.suggestedRule.reason, "policy-exception");
});

test("deriveFindingFilterPolicySuggestions: existing matching config policy suppresses duplicate suggestion", () => {
  const filterReport = makeFilterReport([
    finding("a", { files: ["src/generated/one.ts"] }),
    finding("b", { files: ["src/generated/two.ts"] }),
    finding("c", { files: ["src/generated/three.ts"] }),
  ]);
  const suggestions = deriveFindingFilterPolicySuggestions({
    filterReports: [filterReport],
    policies: [
      {
        id: "existing-gen",
        reason: "generated-file",
        evidence: "already covered",
        pathPattern: "src/generated/**",
      },
    ],
  });
  // No repeated-path / policy-gap suggestion should reuse that
  // pattern because the existing policy already covers it.
  for (const candidate of suggestions) {
    assert.notEqual(
      candidate.suggestedRule.pathPattern,
      "src/generated/**",
      `expected no duplicate suggestion for already-covered pathPattern, got ${JSON.stringify(candidate)}`,
    );
  }
});

test("deriveFindingFilterPolicySuggestions: repeated filtered type → repeated-filtered-type suggestion", () => {
  // Three policy-filtered findings sharing the same type but
  // different non-overlapping path prefixes, so the type rule
  // surfaces clearly.
  const filterReport = {
    header: artifactHeader("FindingFilterReport", "fr-type"),
    summary: {
      totalFiltered: 3,
      kept: 0,
      byReason: { "policy-exception": 3 },
      byConfidence: { medium: 3 },
      byType: { "custom.rule": 3 },
      bySeverity: { medium: 3 },
    },
    keptFindings: [],
    filteredFindings: [
      filteredEntry("a", "src/featureA/x.ts", { type: "custom.rule", source: "policy", reason: "policy-exception", policyId: "p1" }),
      filteredEntry("b", "src/featureB/x.ts", { type: "custom.rule", source: "policy", reason: "policy-exception", policyId: "p2" }),
      filteredEntry("c", "src/featureC/x.ts", { type: "custom.rule", source: "policy", reason: "policy-exception", policyId: "p3" }),
    ],
  };
  const suggestions = deriveFindingFilterPolicySuggestions({ filterReports: [filterReport] });
  const typeSuggestion = suggestions.find(
    (entry) => entry.reason === "repeated-filtered-type" && entry.suggestedRule.type === "custom.rule",
  );
  assert.ok(typeSuggestion, `expected repeated-filtered-type suggestion, got ${JSON.stringify(suggestions)}`);
  assert.equal(typeSuggestion.confidence, "medium");
  assert.deepEqual(typeSuggestion.affectedFindingIds.sort(), ["a", "b", "c"]);
});

test("deriveFindingFilterPolicySuggestions: high-volume dominant reason → low-confidence review suggestion", () => {
  // 5 findings, all generated-file (100% share). Ensure each
  // finding has a distinct path prefix so the path-based rules
  // don't dominate the suggestion list — but the high-volume
  // rule still fires from reasonTotals (which sums across all
  // file paths, regardless of bucket).
  const filterReport = makeFilterReport([
    finding("a", { files: ["src/dist/a.ts"] }),
    finding("b", { files: ["packages/dist/b.ts"] }),
    finding("c", { files: ["apps/dist/c.ts"] }),
    finding("d", { files: ["lib/dist/d.ts"] }),
    finding("e", { files: ["build/e.ts"] }),
  ]);
  const suggestions = deriveFindingFilterPolicySuggestions({ filterReports: [filterReport] });
  const review = suggestions.find((entry) => entry.reason === "high-volume-filtered-pattern");
  assert.ok(review, `expected high-volume-filtered-pattern suggestion, got ${JSON.stringify(suggestions.map((s) => s.id))}`);
  assert.equal(review.confidence, "low");
  assert.equal(review.suggestedRule.pathPattern, undefined, "high-volume review suggestion intentionally has no pathPattern");
});

test("deriveFindingFilterPolicySuggestions: suggestion includes evidence refs + source filter report ids", () => {
  const filterReport = makeFilterReport([
    finding("a", { files: ["src/generated/x.ts"] }),
    finding("b", { files: ["src/generated/y.ts"] }),
    finding("c", { files: ["src/generated/z.ts"] }),
  ]);
  const ref = { type: "FindingFilterReport", id: filterReport.header.artifactId, schemaVersion: "0.1.0" };
  const suggestions = deriveFindingFilterPolicySuggestions({
    filterReports: [filterReport],
    filterReportRefs: [ref],
  });
  assert.ok(suggestions.length > 0);
  const [first] = suggestions;
  assert.deepEqual(first.sourceFilterReportIds, [filterReport.header.artifactId]);
  assert.equal(first.evidence.length, 1);
  assert.equal(first.evidence[0].type, "FindingFilterReport");
  assert.equal(first.evidence[0].id, filterReport.header.artifactId);
});

// ---------- end-to-end CLI tests ----------

test("rekon findings filter-policy suggest writes a suggestion report without mutating config", async () => {
  await withSeededFixture(async ({ root }) => {
    const configBefore = await readFile(join(root, ".rekon", "config.json"), "utf8");

    const result = JSON.parse(
      runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.artifact.type, "FindingFilterPolicySuggestionReport");
    assert.ok(result.summary.totalSuggestions >= 1);
    assert.ok(Array.isArray(result.suggestions) && result.suggestions.length >= 1);

    const configAfter = await readFile(join(root, ".rekon", "config.json"), "utf8");
    assert.equal(configAfter, configBefore, "suggest must never mutate .rekon/config.json");
  });
});

test("rekon findings filter-policy list returns the latest suggestion report", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    assert.equal(list.artifact.type, "FindingFilterPolicySuggestionReport");
    assert.ok(Array.isArray(list.suggestions) && list.suggestions.length >= 1);
  });
});

test("rekon findings filter-policy list before any suggest run returns a friendly empty payload", async () => {
  await withInitFixture(async (root) => {
    const result = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.artifact, null);
    assert.ok(typeof result.message === "string" && result.message.includes("rekon findings filter-policy suggest"));
  });
});

test("rekon findings filter-policy apply appends the suggested rule to .rekon/config.json", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    const applicable = list.suggestions.find((entry) => entry.confidence !== "low");
    assert.ok(applicable, "expected at least one non-low-confidence suggestion to apply");

    const applyResult = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        applicable.id,
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(applyResult.applied, true);
    assert.equal(applyResult.suggestionId, applicable.id);
    assert.equal(applyResult.appliedRule.id, applicable.suggestedRule.id);

    const config = JSON.parse(
      await readFile(join(root, ".rekon", "config.json"), "utf8"),
    );
    assert.ok(Array.isArray(config.findingFilters));
    const appended = config.findingFilters.find((rule) => rule.id === applicable.suggestedRule.id);
    assert.ok(appended, "applied rule must be present in config.findingFilters");
    assert.equal(appended.reason, applicable.suggestedRule.reason);
    assert.equal(appended.evidence, applicable.suggestedRule.evidence);
  });
});

test("rekon findings filter-policy apply refuses a low-confidence suggestion without --force", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    const lowConfidence = list.suggestions.find((entry) => entry.confidence === "low");
    if (!lowConfidence) {
      assert.ok(true, "no low-confidence suggestion in fixture; skipping");
      return;
    }

    const failed = runCliExpectFailure([
      "findings",
      "filter-policy",
      "apply",
      lowConfidence.id,
      "--root",
      root,
      "--json",
    ]);
    assert.ok(
      (failed.stderr || failed.stdout).includes("low-confidence"),
      `expected low-confidence rejection, got ${failed.stderr || failed.stdout}`,
    );

    // --force should succeed.
    const forced = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        lowConfidence.id,
        "--force",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(forced.applied, true);
    assert.equal(forced.force, true);
  });
});

test("rekon findings filter-policy apply refuses duplicate rule id without --force", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    const applicable = list.suggestions.find((entry) => entry.confidence !== "low");
    assert.ok(applicable);

    runCli([
      "findings",
      "filter-policy",
      "apply",
      applicable.id,
      "--root",
      root,
      "--json",
    ]);

    const failed = runCliExpectFailure([
      "findings",
      "filter-policy",
      "apply",
      applicable.id,
      "--root",
      root,
      "--json",
    ]);
    assert.ok(
      (failed.stderr || failed.stdout).includes("already contains a rule"),
      `expected duplicate-id rejection, got ${failed.stderr || failed.stdout}`,
    );

    const forced = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        applicable.id,
        "--force",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(forced.applied, true);
  });
});

test("rekon findings filter-policy apply preserves unrelated config fields", async () => {
  await withSeededFixture(async ({ root }) => {
    // Patch in an extra top-level key that the command should not touch.
    const cfgPath = join(root, ".rekon", "config.json");
    const cfg = JSON.parse(await readFile(cfgPath, "utf8"));
    cfg.customExtension = { keep: "me" };
    await writeFile(cfgPath, JSON.stringify(cfg, null, 2), "utf8");

    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    const applicable = list.suggestions.find((entry) => entry.confidence !== "low");
    runCli([
      "findings",
      "filter-policy",
      "apply",
      applicable.id,
      "--root",
      root,
      "--json",
    ]);

    const after = JSON.parse(await readFile(cfgPath, "utf8"));
    assert.deepEqual(after.customExtension, { keep: "me" });
    assert.ok(Array.isArray(after.capabilities));
    assert.ok(Array.isArray(after.findingFilters));
  });
});

test("rekon config validate passes after applying a non-low-confidence suggestion", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    const applicable = list.suggestions.find((entry) => entry.confidence !== "low");
    runCli([
      "findings",
      "filter-policy",
      "apply",
      applicable.id,
      "--root",
      root,
      "--json",
    ]);

    const validate = JSON.parse(
      runCli(["config", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
});

test("artifacts validate stays clean after suggest + apply", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    const applicable = list.suggestions.find((entry) => entry.confidence !== "low");
    runCli([
      "findings",
      "filter-policy",
      "apply",
      applicable.id,
      "--root",
      root,
      "--json",
    ]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [`src/${id}.ts`],
    files: overrides.files,
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
  };
}

function artifactHeader(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function filteredEntry(id, filePath, overrides = {}) {
  return {
    findingId: id,
    finding: finding(id, { files: [filePath], type: overrides.type }),
    reason: overrides.reason ?? "policy-exception",
    evidence: overrides.evidence ?? `Synthetic ${id}`,
    filePath,
    confidence: overrides.confidence ?? "medium",
    filteredAt: "2026-05-14T00:00:00.000Z",
    source: overrides.source ?? "policy",
    policyId: overrides.policyId,
  };
}

/**
 * Build a FindingFilterReport by running applyFindingFilters
 * over a synthetic FindingReport. This guarantees the
 * filteredFindings entries carry the right `source` /
 * `reason` / `confidence` triplets that the suggestion
 * deriver inspects.
 */
function makeFilterReport(findings) {
  const findingReport = createFindingReport({
    header: artifactHeader("FindingReport", `fr-${Math.random().toString(36).slice(2, 10)}`),
    findings,
  });
  const { keptFindings, filteredFindings } = applyFindingFilters({ findings: findingReport.findings });
  return createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", `fr-filter-${Math.random().toString(36).slice(2, 10)}`),
    keptFindings,
    filteredFindings,
  });
}

async function seedRepeatedGeneratedFindings(store) {
  const ev = (await store.list("EvidenceGraph"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const om = (await store.list("OwnershipMap"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];

  const header = artifactHeader("FindingReport", `fr-suggest-${Date.now()}`);
  header.inputRefs = [];
  if (ev) header.inputRefs.push({ type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion });
  if (om) header.inputRefs.push({ type: om.type, id: om.id, schemaVersion: om.schemaVersion });

  const report = createFindingReport({
    header,
    findings: [
      finding("gen-a", { files: ["src/generated/a.ts"] }),
      finding("gen-b", { files: ["src/generated/b.ts"] }),
      finding("gen-c", { files: ["src/generated/c.ts"] }),
      finding("gen-d", { files: ["src/generated/d.ts"] }),
      finding("gen-e", { files: ["src/generated/e.ts"] }),
      finding("ok", { files: ["src/lib/x.ts"] }),
    ],
  });
  await store.write(report, { category: "findings" });

  // Apply built-in filters so a FindingFilterReport lands too.
  const filterReport = await buildFindingFilterReport(store);
  await store.write(filterReport, { category: "findings" });
}

async function withInitFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filter-policy-suggest-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withSeededFixture(callback) {
  await withInitFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedRepeatedGeneratedFindings(store);
    await callback({ root });
  });
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `expected non-zero exit, stdout: ${result.stdout}`);
  return result;
}
