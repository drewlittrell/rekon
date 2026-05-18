import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  createFindingFilterPolicySuggestionReport,
  createFindingReport,
  fingerprintFindingFilterPolicies,
  summarizeFindingFilterPolicyStatus,
} from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("summarizeFindingFilterPolicyStatus: total / used / unused counts", () => {
  const policies = [
    rule("alpha", { pathPattern: "src/a/**" }),
    rule("beta", { pathPattern: "src/b/**" }),
    rule("gamma", { pathPattern: "src/c/**" }),
  ];
  const filterReport = makeFilterReport({
    kept: 4,
    filtered: [
      filteredEntry("f1", "policy-exception", "policy", { policyId: "alpha" }),
      filteredEntry("f2", "policy-exception", "policy", { policyId: "alpha" }),
      filteredEntry("f3", "policy-exception", "policy", { policyId: "beta" }),
    ],
    byPolicy: { alpha: 2, beta: 1, gamma: 0 },
    policyFingerprint: fingerprintFindingFilterPolicies(policies),
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  assert.equal(result.summary.totalPolicies, 3);
  assert.equal(result.summary.usedPolicies, 2);
  assert.equal(result.summary.unusedPolicies, 1);
  assert.deepEqual(
    result.policies.map((entry) => ({ id: entry.id, used: !entry.isUnused })),
    [
      { id: "alpha", used: true },
      { id: "beta", used: true },
      { id: "gamma", used: false },
    ],
  );
});

test("summarizeFindingFilterPolicyStatus: surfaces current + report fingerprints", () => {
  const policies = [rule("only", { pathPattern: "src/only/**" })];
  const fingerprint = fingerprintFindingFilterPolicies(policies);
  const filterReport = makeFilterReport({
    kept: 1,
    filtered: [filteredEntry("a", "policy-exception", "policy", { policyId: "only" })],
    byPolicy: { only: 1 },
    policyFingerprint: fingerprint,
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  assert.equal(result.currentPolicyFingerprint.digest, fingerprint.digest);
  assert.equal(result.reportPolicyFingerprint?.digest, fingerprint.digest);
});

test("summarizeFindingFilterPolicyStatus: freshness 'fresh' when fingerprints match", () => {
  const policies = [rule("only", { pathPattern: "src/only/**" })];
  const fingerprint = fingerprintFindingFilterPolicies(policies);
  const filterReport = makeFilterReport({
    kept: 1,
    filtered: [],
    policyFingerprint: fingerprint,
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  assert.equal(result.freshness.status, "fresh");
  assert.equal(result.freshness.recommendedCommand, undefined);
});

test("summarizeFindingFilterPolicyStatus: freshness 'stale' when fingerprints differ + recommends rekon refresh", () => {
  const rulesA = [rule("a", { pathPattern: "src/a/**" })];
  const rulesB = [rule("b", { pathPattern: "src/b/**" })];
  const filterReport = makeFilterReport({
    kept: 1,
    filtered: [],
    policyFingerprint: fingerprintFindingFilterPolicies(rulesA),
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies: rulesB,
    filterReport,
  });
  assert.equal(result.freshness.status, "stale");
  assert.equal(result.freshness.recommendedCommand, "rekon refresh");
  // Stale fingerprint warning propagates to every policy.
  assert.ok(
    result.policies.every((entry) =>
      entry.warnings.some((w) => w.code === "stale-policy-fingerprint"),
    ),
  );
});

test("summarizeFindingFilterPolicyStatus: unused policy gets unused-policy warning", () => {
  const policies = [
    rule("used", { pathPattern: "src/u/**" }),
    rule("idle", { pathPattern: "src/i/**" }),
  ];
  const filterReport = makeFilterReport({
    kept: 0,
    filtered: [filteredEntry("a", "policy-exception", "policy", { policyId: "used" })],
    byPolicy: { used: 1, idle: 0 },
    policyFingerprint: fingerprintFindingFilterPolicies(policies),
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  const idle = result.policies.find((entry) => entry.id === "idle");
  assert.ok(idle);
  assert.equal(idle.isUnused, true);
  assert.ok(idle.warnings.some((w) => w.code === "unused-policy"));
});

test("summarizeFindingFilterPolicyStatus: dominant policy gets dominant-policy warning", () => {
  const policies = [
    rule("hot", { pathPattern: "src/hot/**" }),
    rule("noise", { pathPattern: "src/noise/**" }),
  ];
  const filterReport = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(5, (i) => filteredEntry(`hot-${i}`, "policy-exception", "policy", { policyId: "hot" })),
      filteredEntry("n", "policy-exception", "policy", { policyId: "noise" }),
    ],
    byPolicy: { hot: 5, noise: 1 },
    policyFingerprint: fingerprintFindingFilterPolicies(policies),
  });
  const healthReport = synthHealthReport({
    totalFindings: 7,
    filterReport,
    dominantPolicy: { policyId: "hot", count: 5, rate: 0.7143 },
    filterRateByPolicy: { hot: 0.7143, noise: 0.1429 },
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
    healthReport,
  });
  const hot = result.policies.find((entry) => entry.id === "hot");
  assert.ok(hot);
  assert.equal(hot.isDominant, true);
  assert.ok(hot.warnings.some((w) => w.code === "dominant-policy"));
});

test("summarizeFindingFilterPolicyStatus: low-confidence policy gets low-confidence-policy warning", () => {
  const policies = [
    rule("uncertain", {
      pathPattern: "src/u/**",
      confidence: "low",
      evidence: "tentative",
    }),
  ];
  const filterReport = makeFilterReport({
    kept: 1,
    filtered: [filteredEntry("u", "policy-exception", "policy", { policyId: "uncertain", confidence: "low" })],
    byPolicy: { uncertain: 1 },
    policyFingerprint: fingerprintFindingFilterPolicies(policies),
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  const entry = result.policies[0];
  assert.equal(entry.isLowConfidence, true);
  assert.ok(entry.warnings.some((w) => w.code === "low-confidence-policy"));
});

test("summarizeFindingFilterPolicyStatus: broad policy gets broad-policy warning", () => {
  const policies = [rule("wide", { pathPattern: "src/**" })];
  const filterReport = makeFilterReport({
    kept: 0,
    filtered: [filteredEntry("w", "policy-exception", "policy", { policyId: "wide" })],
    byPolicy: { wide: 1 },
    policyFingerprint: fingerprintFindingFilterPolicies(policies),
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  const entry = result.policies[0];
  assert.equal(entry.isBroadPattern, true);
  assert.ok(entry.warnings.some((w) => w.code === "broad-policy"));
});

test("summarizeFindingFilterPolicyStatus: missing FindingFilterReport → freshness missing-report + global warning", () => {
  const policies = [rule("any", { pathPattern: "src/any/**" })];
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
  });
  assert.equal(result.freshness.status, "missing-report");
  assert.equal(result.freshness.recommendedCommand, "rekon refresh");
  assert.ok(
    result.globalWarnings.some((w) => w.code === "missing-filter-report"),
    `expected missing-filter-report global warning, got ${JSON.stringify(result.globalWarnings)}`,
  );
});

test("summarizeFindingFilterPolicyStatus: filter report present but health missing → missing-filter-health global warning", () => {
  const policies = [rule("only", { pathPattern: "src/only/**" })];
  const filterReport = makeFilterReport({
    kept: 1,
    filtered: [],
    policyFingerprint: fingerprintFindingFilterPolicies(policies),
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    filterReport,
  });
  assert.ok(
    result.globalWarnings.some((w) => w.code === "missing-filter-health"),
    `expected missing-filter-health, got ${JSON.stringify(result.globalWarnings)}`,
  );
});

test("summarizeFindingFilterPolicyStatus: suggestions render dryRun + apply commands (low-confidence → --force)", () => {
  const policies = [];
  const suggestionReport = createFindingFilterPolicySuggestionReport({
    header: synthHeader("FindingFilterPolicySuggestionReport"),
    suggestions: [
      {
        id: "policy-suggestion:test:high",
        reason: "repeated-filtered-path",
        suggestedRule: rule("policy-suggestion:test:high", {
          pathPattern: "src/generated/**",
          reason: "generated-file",
          evidence: "generated source",
        }),
        confidence: "high",
        rationale: "synthetic",
        affectedFindingIds: ["a", "b"],
        affectedPaths: [],
        affectedTypes: [],
        sourceFilterReportIds: [],
        evidence: [],
      },
      {
        id: "policy-suggestion:test:low",
        reason: "high-volume-filtered-pattern",
        suggestedRule: rule("policy-suggestion:test:low", { reason: "generated-file", evidence: "weak" }),
        confidence: "low",
        rationale: "synthetic",
        affectedFindingIds: ["a"],
        affectedPaths: [],
        affectedTypes: [],
        sourceFilterReportIds: [],
        evidence: [],
      },
    ],
  });
  const result = summarizeFindingFilterPolicyStatus({
    configPath: "/synth/.rekon/config.json",
    policies,
    suggestionReport,
  });
  assert.equal(result.summary.suggestionsAvailable, 2);
  const high = result.suggestions.find((s) => s.id === "policy-suggestion:test:high");
  const low = result.suggestions.find((s) => s.id === "policy-suggestion:test:low");
  assert.ok(high);
  assert.ok(low);
  assert.ok(high.applyCommand.includes("policy-suggestion:test:high"));
  assert.ok(!high.applyCommand.includes("--force"));
  assert.ok(low.applyCommand.includes("--force"));
  assert.ok(low.dryRunCommand.includes("--dry-run"));
  assert.ok(low.dryRunCommand.includes("--force"));
});

// ---------- CLI behavior tests ----------

test("rekon findings filter-policy status: command runs and does not mutate config", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const configPath = join(root, ".rekon", "config.json");
    const configBefore = await readFile(configPath, "utf8");
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "status",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.ok(result.currentPolicyFingerprint);
    assert.equal(result.summary.totalPolicies, 0);
    const configAfter = await readFile(configPath, "utf8");
    assert.equal(configAfter, configBefore, "status must not mutate .rekon/config.json");
  });
});

test("rekon findings filter-policy status: malformed config fails without writing", async () => {
  await withFreshWorkspace(async ({ root }) => {
    const configPath = join(root, ".rekon", "config.json");
    await writeFile(configPath, "this is not json{{{", "utf8");
    const before = await readFile(configPath, "utf8");
    const failed = runCliExpectFailure([
      "findings",
      "filter-policy",
      "status",
      "--root",
      root,
      "--json",
    ]);
    assert.ok(
      (failed.stderr || failed.stdout).includes("Failed to parse"),
      `expected parse failure, got ${failed.stderr || failed.stdout}`,
    );
    const after = await readFile(configPath, "utf8");
    assert.equal(after, before, "malformed config must not be overwritten");
  });
});

test("rekon findings filter-policy status: --policy filters rendered policies but keeps summary global", async () => {
  await withWorkspaceWithPolicies(async ({ root }) => {
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "status",
        "--policy",
        "alpha",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.summary.totalPolicies, 2);
    assert.equal(result.renderedPolicyCount, 1);
    assert.deepEqual(result.policies.map((entry) => entry.id), ["alpha"]);
  });
});

test("rekon findings filter-policy status: --warnings-only narrows to entries with warnings", async () => {
  await withWorkspaceWithPolicies(async ({ root }) => {
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "status",
        "--warnings-only",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.summary.totalPolicies, 2);
    assert.ok(result.policies.every((entry) => entry.warnings.length > 0));
  });
});

test("rekon findings filter-policy status: --unused-only narrows to unused entries", async () => {
  await withWorkspaceWithPolicies(async ({ root }) => {
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "status",
        "--unused-only",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.ok(result.policies.every((entry) => entry.isUnused));
  });
});

test("existing rekon findings filter-policy list / suggest behavior unchanged", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const suggest = JSON.parse(
      runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]).stdout,
    );
    const list = JSON.parse(
      runCli(["findings", "filter-policy", "list", "--root", root, "--json"]).stdout,
    );
    assert.equal(suggest.artifact.type, "FindingFilterPolicySuggestionReport");
    assert.equal(list.artifact.type, "FindingFilterPolicySuggestionReport");
  });
});

test("rekon artifacts validate stays clean after filter-policy status runs", async () => {
  await withWorkspaceWithPolicies(async ({ root }) => {
    runCli(["findings", "filter-policy", "status", "--root", root, "--json"]);
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
});

// ---------- helpers ----------

function rule(id, overrides = {}) {
  return {
    id,
    reason: overrides.reason ?? "policy-exception",
    evidence: overrides.evidence ?? `Synthetic policy ${id}`,
    confidence: overrides.confidence,
    pathPattern: overrides.pathPattern,
    type: overrides.type,
    ruleId: overrides.ruleId,
    severity: overrides.severity,
    titleIncludes: overrides.titleIncludes,
    descriptionIncludes: overrides.descriptionIncludes,
  };
}

function synthFinding(id, filePath) {
  return {
    id,
    type: "issue",
    severity: "medium",
    title: `Finding ${id}`,
    description: `Synthetic finding ${id}`,
    subjects: [filePath],
    files: [filePath],
  };
}

function filteredEntry(id, reason, source, overrides = {}) {
  return {
    findingId: id,
    finding: synthFinding(id, overrides.filePath ?? `src/${id}.ts`),
    reason,
    evidence: overrides.evidence ?? `Synthetic filter evidence for ${id}`,
    filePath: overrides.filePath ?? `src/${id}.ts`,
    confidence: overrides.confidence ?? "high",
    filteredAt: "2026-05-17T00:00:00.000Z",
    source,
    policyId: overrides.policyId,
  };
}

function synthHeader(artifactType, overrides = {}) {
  return {
    artifactType,
    artifactId: overrides.artifactId ?? `synthetic-${artifactType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: overrides.repoId ?? "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: overrides.inputRefs ?? [],
    freshness: { status: "fresh" },
  };
}

function makeFilterReport({ kept, filtered, byPolicy, policyFingerprint }) {
  const byReason = {};
  const byConfidence = {};
  const byType = {};
  const bySeverity = {};
  for (const entry of filtered) {
    byReason[entry.reason] = (byReason[entry.reason] ?? 0) + 1;
    byConfidence[entry.confidence] = (byConfidence[entry.confidence] ?? 0) + 1;
    byType[entry.finding.type] = (byType[entry.finding.type] ?? 0) + 1;
    bySeverity[entry.finding.severity] = (bySeverity[entry.finding.severity] ?? 0) + 1;
  }
  const summary = {
    totalFiltered: filtered.length,
    kept,
    byReason,
    byConfidence,
    byType,
    bySeverity,
  };
  if (byPolicy) summary.byPolicy = byPolicy;
  const report = {
    header: synthHeader("FindingFilterReport"),
    summary,
    keptFindings: times(kept, (index) => synthFinding(`kept-${index}`, "src/kept.ts")),
    filteredFindings: filtered,
  };
  if (policyFingerprint) report.policyFingerprint = policyFingerprint;
  return report;
}

function synthHealthReport({ totalFindings, filterReport, dominantPolicy, filterRateByPolicy }) {
  return {
    header: synthHeader("FindingFilterHealthReport"),
    summary: {
      totalFindings,
      totalFiltered: filterReport.summary.totalFiltered,
      filterRate:
        totalFindings === 0
          ? 0
          : Math.round((filterReport.summary.totalFiltered / totalFindings) * 10000) / 10000,
      highConfidenceFiltered: filterReport.filteredFindings.filter((entry) => entry.confidence === "high").length,
      lowConfidenceFiltered: filterReport.filteredFindings.filter((entry) => entry.confidence === "low").length,
      byReason: filterReport.summary.byReason,
      byPolicy: filterReport.summary.byPolicy,
      policyFiltered: filterReport.filteredFindings.filter((entry) => entry.source === "policy").length,
      unusedPolicies: [],
      contentFiltered: 0,
      resultFiltered: 0,
      builtInPathFiltered: 0,
      filterRateByReason: {},
      filterRateByPolicy: filterRateByPolicy ?? {},
      dominantPolicy,
      policyFingerprint: filterReport.policyFingerprint,
    },
    alerts: [],
  };
}

function times(n, fn) {
  return Array.from({ length: n }, (_, index) => fn(index));
}

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filter-policy-status-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Seed a workspace with: refresh, then patch `.rekon/config.json`
 * to add two `findingFilters` policies. The fixture intentionally
 * keeps both policies *unused* relative to the empty example
 * findings, so they trigger `unused-policy` warnings deterministically.
 */
async function withWorkspaceWithPolicies(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.findingFilters = [
      {
        id: "alpha",
        reason: "policy-exception",
        evidence: "synthetic for status tests",
        pathPattern: "src/alpha/**",
      },
      {
        id: "beta",
        reason: "policy-exception",
        evidence: "synthetic for status tests",
        pathPattern: "src/beta/**",
      },
    ];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    // Rerun refresh so the FindingFilterReport.policyFingerprint
    // matches the just-written config — that way the stale-policy
    // warning doesn't show up and confuse the assertions.
    runCli(["refresh", "--root", root, "--json"]);
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
