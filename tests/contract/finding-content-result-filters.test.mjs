import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingContentFilters,
  applyFindingFilters,
  applyFindingResultFilters,
  createFindingReport,
  validateFindingResultFilterOptions,
} from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- content filter pure-helper tests ----------

test("A: empty constructor stub filters as empty-constructor-stub", () => {
  const finding = stub("ec-1", {
    files: ["src/Foo.ts"],
    details: { stubName: "constructor", stubReason: "empty_body" },
  });
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "empty-constructor-stub");
  assert.equal(decision.confidence, "high");
});

test("D: same-directory import filters as same-directory-import", () => {
  const finding = architecture("sd-1", "imports.use_at_alias", {
    files: ["src/lib/file.ts"],
    details: { evidence: ["./neighbor.ts", "./other.ts"] },
  });
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "same-directory-import");
});

test("E: SVG namespace URL filters as svg-namespace-url", () => {
  const finding = architecture(
    "svg-1",
    "external_apis.no_hardcoded_api_urls_outside_providers",
    {
      files: ["src/components/Icon.tsx"],
      details: {
        evidence: ["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink"],
      },
    },
  );
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "svg-namespace-url");
});

test("F: NODE_ENV filters as client-env-node-env", () => {
  const finding = architecture("env-1", "security.api_keys_server_side_only", {
    files: ["src/client/env.ts"],
    details: { envVars: ["NODE_ENV"] },
  });
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "client-env-node-env");
});

test("G: speculative anti-pattern filters as speculative-anti-pattern", () => {
  const finding = {
    id: "spec-1",
    type: "anti_pattern",
    severity: "medium",
    title: "Possible business logic in service",
    description: "This may indicate business logic that belongs elsewhere.",
    subjects: ["src/service.ts"],
    files: ["src/service.ts"],
  };
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "speculative-anti-pattern");
});

test("I: hardcoded-config-not-DDE filters as hardcoded-config-not-dde", () => {
  const finding = architecture(
    "hc-1",
    "architecture.decisions.go_through_dde_gates",
    {
      files: ["src/ui/Button.tsx"],
      details: {
        decisionCapabilities: [],
        decisionConcerns: ["timeout is hardcoded", "magic number for delay"],
      },
    },
  );
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "hardcoded-config-not-dde");
});

test("M: route handler import filters as route-handler-with-service", () => {
  const finding = architecture("rh-1", "routes.construct_and_inject_deps", {
    files: ["src/app/api/widgets/route.ts"],
    details: { imports: ["./handler"] },
  });
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
});

test("O: external API comment-only filters as external-api-comment-only", () => {
  const finding = architecture(
    "ext-1",
    "external_apis.calls_go_through_providers",
    {
      files: ["src/docs/notes.ts"],
      details: { imports: ["./lib/string-utils"] },
    },
  );
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "external-api-comment-only");
});

test("Q: Next.js route convention filters as nextjs-route-convention", () => {
  const finding = architecture("nx-1", "routes.single_http_handler_export", {
    files: ["src/app/api/items/route.ts"],
    details: { otherExports: ["runtime", "dynamic"] },
  });
  const decision = applyFindingContentFilters({ finding });
  assert.ok(decision);
  assert.equal(decision.reason, "nextjs-route-convention");
});

test("normal finding is kept (no content filter applies)", () => {
  const finding = architecture("ok-1", "some.real.rule", {
    files: ["src/feature/widget.ts"],
    description: "A genuine architecture concern that should not be suppressed.",
    details: {},
  });
  assert.equal(applyFindingContentFilters({ finding }), null);
  const result = applyFindingFilters({ findings: [finding] });
  assert.equal(result.keptFindings.length, 1);
  assert.equal(result.filteredFindings.length, 0);
});

// ---------- result filter pure-helper tests ----------

test("minConfidence filters below threshold with audit entry", () => {
  const finding = architecture("mc-1", "rule", {
    files: ["src/foo.ts"],
    details: { minCapabilityConfidence: 0.4 },
  });
  const result = applyFindingFilters({
    findings: [finding],
    resultFilters: { minConfidence: 0.7 },
  });
  assert.equal(result.keptFindings.length, 0);
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].reason, "below-min-confidence");
  assert.equal(result.filteredFindings[0].source, "system");
});

test("severity filters below threshold with audit entry", () => {
  const finding = {
    id: "sv-1",
    type: "issue",
    severity: "low",
    title: "minor",
    description: "minor",
    subjects: ["src/foo.ts"],
    files: ["src/foo.ts"],
  };
  const result = applyFindingFilters({
    findings: [finding],
    resultFilters: { severity: "high" },
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].reason, "below-min-severity");
});

test("systems filters outside selected systems with audit entry", () => {
  const finding = {
    id: "sys-1",
    type: "issue",
    severity: "medium",
    title: "in payments",
    description: "issue inside payments",
    subjects: ["src/payments/handler.ts"],
    files: ["src/payments/handler.ts"],
    details: { system: "payments" },
  };
  const result = applyFindingFilters({
    findings: [finding],
    resultFilters: { systems: ["runtime", "search"] },
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].reason, "outside-selected-system");
});

test("pathExcludes filters matching path with audit entry", () => {
  const finding = {
    id: "pe-1",
    type: "issue",
    severity: "medium",
    title: "in fixtures",
    description: "fixture noise",
    subjects: ["fixtures/sample.ts"],
    files: ["fixtures/sample.ts"],
  };
  const result = applyFindingFilters({
    findings: [finding],
    resultFilters: { pathExcludes: ["fixtures/**"] },
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].reason, "configured-path-exclusion");
});

test("result filters do not silently drop findings", () => {
  const finding = architecture("audit-1", "rule", {
    files: ["src/foo.ts"],
    details: { minCapabilityConfidence: 0.1 },
  });
  const result = applyFindingFilters({
    findings: [finding],
    resultFilters: { minConfidence: 0.9 },
  });
  assert.equal(result.keptFindings.length, 0);
  assert.equal(result.filteredFindings.length, 1);
  // Audit entry preserves the full finding payload + reason +
  // evidence + confidence + filteredAt + source.
  const entry = result.filteredFindings[0];
  assert.equal(entry.findingId, "audit-1");
  assert.equal(entry.finding.id, "audit-1");
  assert.equal(typeof entry.evidence, "string");
  assert.ok(entry.evidence.length > 0);
  assert.equal(entry.confidence, "high");
  assert.equal(entry.source, "system");
  assert.ok(typeof entry.filteredAt === "string");
});

test("validateFindingResultFilterOptions accepts a valid block", () => {
  const { options, issues } = validateFindingResultFilterOptions({
    minConfidence: 0.7,
    severity: "medium",
    systems: ["runtime", "src"],
    pathExcludes: ["fixtures/**"],
  });
  assert.deepEqual(issues, []);
  assert.equal(options.minConfidence, 0.7);
  assert.equal(options.severity, "medium");
  assert.deepEqual(options.systems, ["runtime", "src"]);
  assert.deepEqual(options.pathExcludes, ["fixtures/**"]);
});

test("validateFindingResultFilterOptions rejects invalid entries", () => {
  const cases = [
    {
      label: "minConfidence out of range",
      input: { minConfidence: 1.5 },
      expected: "finding-result-filters-min-confidence-invalid",
    },
    {
      label: "severity invalid",
      input: { severity: "bogus" },
      expected: "finding-result-filters-severity-invalid",
    },
    {
      label: "pathExcludes absolute",
      input: { pathExcludes: ["/etc/hosts"] },
      expected: "finding-result-filters-path-excludes-absolute",
    },
    {
      label: "pathExcludes traversal",
      input: { pathExcludes: ["../escape"] },
      expected: "finding-result-filters-path-excludes-traversal",
    },
  ];
  for (const { label, input, expected } of cases) {
    const { issues } = validateFindingResultFilterOptions(input);
    assert.ok(
      issues.some((issue) => issue.code === expected),
      `${label}: expected ${expected}, got ${JSON.stringify(issues)}`,
    );
  }
});

// ---------- end-to-end CLI tests ----------

test("config validate accepts valid findingResultFilters", async () => {
  await withFreshWorkspace(async ({ root }) => {
    await patchConfig(root, {
      findingResultFilters: {
        minConfidence: 0.7,
        severity: "medium",
        pathExcludes: ["fixtures/**"],
      },
    });
    const result = JSON.parse(
      runCli(["config", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues ?? [], []);
  });
});

test("config validate rejects invalid findingResultFilters", async () => {
  await withFreshWorkspace(async ({ root }) => {
    await patchConfig(root, {
      findingResultFilters: { minConfidence: 2 },
    });
    // `rekon config validate` exits 1 on invalid config; still emits
    // structured JSON on stdout. Re-use the same parsing pattern as
    // other contract suites: capture stdout regardless of exit code.
    const output = runCliExpectFailure([
      "config",
      "validate",
      "--root",
      root,
      "--json",
    ]);
    const result = JSON.parse(output.stdout);
    assert.equal(result.valid, false);
    assert.ok(
      result.issues.some(
        (issue) => issue.code === "finding-result-filters-min-confidence-invalid",
      ),
      `expected min-confidence error, got ${JSON.stringify(result.issues)}`,
    );
  });
});

test("rekon findings filter loads findingResultFilters and writes audit entries", async () => {
  await withSeededFixture(async ({ root }) => {
    await patchConfig(root, {
      findingResultFilters: { pathExcludes: ["src/excluded/**"] },
    });
    const result = JSON.parse(
      runCli(["findings", "filter", "--root", root, "--json"]).stdout,
    );
    assert.ok(result.resultFilters, "filter command should echo loaded result filters");
    assert.deepEqual(result.resultFilters.pathExcludes, ["src/excluded/**"]);

    const filterReport = await readLatestFilterReport(root);
    assert.ok(filterReport);
    const filtered = filterReport.filteredFindings.find(
      (entry) => entry.findingId === "excluded-1",
    );
    assert.ok(filtered, "excluded-1 must appear in filteredFindings");
    assert.equal(filtered.reason, "configured-path-exclusion");
  });
});

test("lifecycle/adjudication/coherency exclude result-filtered findings", async () => {
  await withSeededFixture(async ({ root }) => {
    await patchConfig(root, {
      findingResultFilters: { pathExcludes: ["src/excluded/**"] },
    });
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const lifecycle = await readLatestArtifactJson(root, "FindingLifecycleReport");
    assert.ok(lifecycle, "lifecycle report must exist");
    const activeIds = (lifecycle.activeFindings ?? []).map((entry) =>
      entry.findingId ?? entry.id ?? entry.finding?.id,
    );
    assert.ok(
      !activeIds.includes("excluded-1"),
      `excluded-1 must not be in active lifecycle, got ${JSON.stringify(activeIds)}`,
    );
  });
});

test("raw FindingReport is not mutated by content/result filtering", async () => {
  await withSeededFixture(async ({ root }) => {
    await patchConfig(root, {
      findingResultFilters: { pathExcludes: ["src/excluded/**"] },
    });
    const beforePath = await locateLatestArtifact(root, "FindingReport");
    const before = await readFile(beforePath, "utf8");
    runCli(["findings", "filter", "--root", root, "--json"]);
    const after = await readFile(beforePath, "utf8");
    assert.equal(after, before, "FindingReport must remain byte-identical");
  });
});

test("artifacts validate stays clean after content/result filtering", async () => {
  await withSeededFixture(async ({ root }) => {
    await patchConfig(root, {
      findingResultFilters: { severity: "high" },
    });
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues ?? [], []);
  });
});

test("filter-health summary reports content/result counts and result-filter-over-filtering alert fires when applicable", async () => {
  await withSeededFixture(async ({ root }) => {
    // Use a `critical`-only floor — the seeded fixture has only
    // `high` and `low` findings, so 7/7 should be result-filtered.
    await patchConfig(root, {
      findingResultFilters: { severity: "critical" },
    });
    runCli(["findings", "filter", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["findings", "filter-health", "--root", root, "--json"]).stdout,
    );
    const alertCodes = result.alerts.map((alert) => alert.code);
    assert.ok(
      alertCodes.includes("result-filter-over-filtering"),
      `expected result-filter-over-filtering alert, got ${JSON.stringify(alertCodes)}`,
    );
    assert.equal(
      typeof result.summary.resultFiltered,
      "number",
      "filter-health summary must report resultFiltered count",
    );
    assert.equal(
      typeof result.summary.contentFiltered,
      "number",
      "filter-health summary must report contentFiltered count",
    );
    assert.ok(
      result.summary.resultFiltered >= 5,
      `expected resultFiltered >= 5, got ${result.summary.resultFiltered}`,
    );
  });
});

// ---------- helpers ----------

function stub(id, overrides = {}) {
  return {
    id,
    type: "stub",
    severity: "medium",
    title: overrides.title ?? `Stub ${id}`,
    description: overrides.description ?? `Stub finding ${id}`,
    subjects: overrides.subjects ?? overrides.files ?? [],
    files: overrides.files,
    details: overrides.details,
  };
}

function architecture(id, ruleId, overrides = {}) {
  return {
    id,
    type: "architecture",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Architecture ${id}`,
    description: overrides.description ?? `Architecture finding ${id}`,
    subjects: overrides.subjects ?? overrides.files ?? [],
    files: overrides.files,
    ruleId,
    details: overrides.details,
  };
}

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-content-result-filters-"));
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
 * Seed a workspace with: refresh, then a synthetic FindingReport
 * that contains:
 *  - one finding in `src/excluded/` (for pathExcludes tests)
 *  - five low-severity findings (for severity result-filter)
 *  - one kept normal finding
 * After this, callers can run the filter pipeline through CLI.
 */
async function withSeededFixture(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const store = createLocalArtifactStore(root);
    await store.init();

    const findings = [
      {
        id: "excluded-1",
        type: "issue",
        severity: "high",
        title: "Excluded fixture",
        description: "Should be result-filtered by pathExcludes.",
        subjects: ["src/excluded/a.ts"],
        files: ["src/excluded/a.ts"],
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `low-${index}`,
        type: "issue",
        severity: "low",
        title: `Low ${index}`,
        description: "Low severity finding for result-filter tests.",
        subjects: [`src/low/${index}.ts`],
        files: [`src/low/${index}.ts`],
      })),
      {
        id: "kept-1",
        type: "issue",
        severity: "high",
        title: "Kept finding",
        description: "Should remain active across most fixtures.",
        subjects: ["src/feature/foo.ts"],
        files: ["src/feature/foo.ts"],
      },
    ];

    const ev = (await store.list("EvidenceGraph"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const om = (await store.list("OwnershipMap"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];

    const inputRefs = [];
    if (ev) inputRefs.push({ type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion });
    if (om) inputRefs.push({ type: om.type, id: om.id, schemaVersion: om.schemaVersion });

    const report = createFindingReport({
      header: {
        artifactType: "FindingReport",
        artifactId: `seeded-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "content-result-test" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs,
        freshness: { status: "fresh" },
      },
      findings,
    });
    await store.write(report, { category: "findings" });

    await callback({ root, store });
  });
}

async function patchConfig(root, patch) {
  const configPath = join(root, ".rekon", "config.json");
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    config = {};
  }
  await writeFile(
    configPath,
    `${JSON.stringify({ ...config, ...patch }, null, 2)}\n`,
    "utf8",
  );
}

async function readLatestFilterReport(root) {
  const findingsDir = join(root, ".rekon", "artifacts", "findings");
  const files = (await readdir(findingsDir))
    .filter((file) => file.startsWith("FindingFilterReport-"))
    .sort();
  if (files.length === 0) return undefined;
  return JSON.parse(await readFile(join(findingsDir, files[files.length - 1]), "utf8"));
}

async function readLatestArtifactJson(root, artifactType) {
  const findingsDir = join(root, ".rekon", "artifacts", "findings");
  const files = (await readdir(findingsDir))
    .filter((file) => file.startsWith(`${artifactType}-`))
    .sort();
  if (files.length === 0) return undefined;
  return JSON.parse(await readFile(join(findingsDir, files[files.length - 1]), "utf8"));
}

async function locateLatestArtifact(root, artifactType) {
  const findingsDir = join(root, ".rekon", "artifacts", "findings");
  const files = (await readdir(findingsDir))
    .filter((file) => file.startsWith(`${artifactType}-`))
    .sort();
  if (files.length === 0) {
    throw new Error(`no ${artifactType} artifact under ${findingsDir}`);
  }
  return join(findingsDir, files[files.length - 1]);
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
