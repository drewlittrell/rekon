import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  createFindingFilterPolicySuggestionReport,
  isBroadFindingFilterPolicyRule,
  planFindingFilterPolicyApply,
} from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests for the planner ----------

test("isBroadFindingFilterPolicyRule: flags repository-wide patterns as broad", () => {
  for (const pattern of ["*", "**", "**/*", "*/**", ".", "./**"]) {
    assert.equal(
      isBroadFindingFilterPolicyRule(rule({ pathPattern: pattern })),
      true,
      `expected ${pattern} to be broad`,
    );
  }
});

test("isBroadFindingFilterPolicyRule: flags single top-level <segment>/** as broad", () => {
  for (const pattern of ["src/**", "packages/**", "apps/**", "lib/**", "tests/**", "vendor/**"]) {
    assert.equal(
      isBroadFindingFilterPolicyRule(rule({ pathPattern: pattern })),
      true,
      `expected ${pattern} to be broad`,
    );
  }
});

test("isBroadFindingFilterPolicyRule: keeps two-segment patterns narrow", () => {
  for (const pattern of ["src/generated/**", "tests/fixtures/**", "packages/foo/generated/**"]) {
    assert.equal(
      isBroadFindingFilterPolicyRule(rule({ pathPattern: pattern })),
      false,
      `expected ${pattern} to be narrow`,
    );
  }
});

test("isBroadFindingFilterPolicyRule: extra matcher narrows an otherwise-broad pathPattern", () => {
  assert.equal(
    isBroadFindingFilterPolicyRule(rule({ pathPattern: "src/**", type: "myrule.x" })),
    false,
  );
  assert.equal(
    isBroadFindingFilterPolicyRule(rule({ pathPattern: "**", ruleId: "explicit" })),
    false,
  );
  assert.equal(
    isBroadFindingFilterPolicyRule(rule({ pathPattern: "src/**", severity: "low" })),
    false,
  );
});

test("isBroadFindingFilterPolicyRule: no pathPattern + no narrow matcher counts as broad", () => {
  // High-volume-filtered-pattern suggestions intentionally have
  // no matcher; they should be treated as broad.
  assert.equal(
    isBroadFindingFilterPolicyRule({
      id: "no-matchers",
      reason: "policy-exception",
      evidence: "synthetic",
    }),
    true,
  );
});

test("planFindingFilterPolicyApply: clean append", () => {
  const suggestion = makeSuggestion({
    id: "s1",
    confidence: "high",
    rule: rule({
      id: "narrow-1",
      pathPattern: "src/generated/**",
      reason: "generated-file",
    }),
  });
  const plan = planFindingFilterPolicyApply({ suggestion, existingRules: [] });
  assert.deepEqual(plan.diff.addedFindingFilters.map((entry) => entry.id), ["narrow-1"]);
  assert.equal(plan.diff.replacedFindingFilters.length, 0);
  assert.equal(plan.diff.beforeCount, 0);
  assert.equal(plan.diff.afterCount, 1);
  assert.equal(plan.requiresForce, false);
  assert.deepEqual(plan.blockers, []);
});

test("planFindingFilterPolicyApply: duplicate id replaces existing rule", () => {
  const before = rule({
    id: "dup",
    pathPattern: "src/old/**",
    reason: "policy-exception",
    evidence: "old",
  });
  const suggestion = makeSuggestion({
    id: "s-dup",
    confidence: "high",
    rule: rule({
      id: "dup",
      pathPattern: "src/new/**",
      reason: "policy-exception",
      evidence: "new",
    }),
  });
  const plan = planFindingFilterPolicyApply({ suggestion, existingRules: [before] });
  assert.equal(plan.diff.addedFindingFilters.length, 0);
  assert.equal(plan.diff.replacedFindingFilters.length, 1);
  assert.equal(plan.diff.replacedFindingFilters[0].before.pathPattern, "src/old/**");
  assert.equal(plan.diff.replacedFindingFilters[0].after.pathPattern, "src/new/**");
  assert.equal(plan.requiresForce, true);
  assert.ok(plan.blockers.some((blocker) => blocker.code === "duplicate-rule-id"));
});

test("planFindingFilterPolicyApply: broad pattern requires force", () => {
  const suggestion = makeSuggestion({
    id: "s-broad",
    confidence: "high",
    rule: rule({ id: "broad-1", pathPattern: "src/**", reason: "policy-exception" }),
  });
  const plan = planFindingFilterPolicyApply({ suggestion, existingRules: [] });
  assert.equal(plan.isBroadPattern, true);
  assert.equal(plan.requiresForce, true);
  assert.ok(plan.blockers.some((blocker) => blocker.code === "broad-path-pattern"));
});

test("planFindingFilterPolicyApply: low-confidence requires force", () => {
  const suggestion = makeSuggestion({
    id: "s-low",
    confidence: "low",
    rule: rule({ id: "low-1", pathPattern: "src/generated/**", reason: "generated-file" }),
  });
  const plan = planFindingFilterPolicyApply({ suggestion, existingRules: [] });
  assert.equal(plan.isLowConfidence, true);
  assert.equal(plan.requiresForce, true);
  assert.ok(plan.blockers.some((blocker) => blocker.code === "low-confidence-suggestion"));
});

// ---------- CLI behavior tests ----------

test("apply --dry-run returns proposed rule + diff and does not mutate config", async () => {
  await withSuggestionFixture(async ({ root, suggestionId, rule }) => {
    const configBefore = await readFile(join(root, ".rekon", "config.json"), "utf8");

    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--dry-run",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, false);
    assert.equal(result.dryRun, true);
    assert.equal(result.suggestionId, suggestionId);
    assert.equal(result.rule.id, rule.id);
    assert.equal(result.diff.beforeCount, 0);
    assert.equal(result.diff.afterCount, 1);
    assert.deepEqual(result.diff.addedFindingFilters.map((entry) => entry.id), [rule.id]);
    assert.equal(result.diff.replacedFindingFilters.length, 0);
    assert.equal(result.validation.valid, true);

    const configAfter = await readFile(join(root, ".rekon", "config.json"), "utf8");
    assert.equal(configAfter, configBefore, "dry-run must not mutate config");
  });
});

test("apply --preview is an alias for --dry-run", async () => {
  await withSuggestionFixture(async ({ root, suggestionId }) => {
    const configBefore = await readFile(join(root, ".rekon", "config.json"), "utf8");
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--preview",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, false);
    assert.equal(result.dryRun, true);
    const configAfter = await readFile(join(root, ".rekon", "config.json"), "utf8");
    assert.equal(configAfter, configBefore, "--preview must not mutate config");
  });
});

test("actual apply appends a new non-broad high-confidence rule", async () => {
  await withSuggestionFixture(async ({ root, suggestionId, rule }) => {
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, true);
    assert.equal(result.dryRun, false);
    assert.equal(result.diff.afterCount, 1);
    assert.deepEqual(result.diff.addedFindingFilters.map((entry) => entry.id), [rule.id]);

    const config = JSON.parse(
      await readFile(join(root, ".rekon", "config.json"), "utf8"),
    );
    assert.ok(Array.isArray(config.findingFilters));
    assert.equal(config.findingFilters.length, 1);
    assert.equal(config.findingFilters[0].id, rule.id);
  });
});

test("dry-run reports config-missing when the file is absent and does not add findingFilters", async () => {
  await withSuggestionFixture(async ({ root, suggestionId }) => {
    const configPath = join(root, ".rekon", "config.json");
    await rm(configPath, { force: true });

    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--dry-run",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, false);
    assert.equal(result.dryRun, true);
    assert.ok(
      result.warnings.some((entry) => entry.code === "config-missing"),
      "dry-run should warn that config is missing",
    );
    // The runtime store bootstraps `.rekon/config.json` during
    // its init step (so subsequent rekon commands have somewhere
    // to write). The user-visible guarantee is that dry-run
    // never writes the suggested rule into findingFilters.
    const after = JSON.parse(await readFile(configPath, "utf8"));
    assert.ok(
      !Array.isArray(after.findingFilters) || after.findingFilters.length === 0,
      "dry-run must not write findingFilters",
    );
  });
});

test("apply writes the rule when config was missing and the workspace was just bootstrapped", async () => {
  await withSuggestionFixture(async ({ root, suggestionId, rule }) => {
    const configPath = join(root, ".rekon", "config.json");
    await rm(configPath, { force: true });

    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, true);
    assert.ok(result.warnings.some((entry) => entry.code === "config-missing"));

    const after = JSON.parse(await readFile(configPath, "utf8"));
    assert.ok(Array.isArray(after.findingFilters));
    assert.equal(after.findingFilters[0].id, rule.id);
  });
});

test("malformed config causes dry-run/apply to fail without writing", async () => {
  await withSuggestionFixture(async ({ root, suggestionId }) => {
    const configPath = join(root, ".rekon", "config.json");
    await writeFile(configPath, "this is not json{{{", "utf8");
    const before = await readFile(configPath, "utf8");

    const failedDry = runCliExpectFailure([
      "findings",
      "filter-policy",
      "apply",
      suggestionId,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);
    assert.ok(
      (failedDry.stderr || failedDry.stdout).includes("Failed to parse"),
      `expected parse failure on dry-run, got ${failedDry.stderr || failedDry.stdout}`,
    );

    const failedApply = runCliExpectFailure([
      "findings",
      "filter-policy",
      "apply",
      suggestionId,
      "--root",
      root,
      "--json",
    ]);
    assert.ok(
      (failedApply.stderr || failedApply.stdout).includes("Failed to parse"),
      `expected parse failure on apply, got ${failedApply.stderr || failedApply.stdout}`,
    );

    const after = await readFile(configPath, "utf8");
    assert.equal(after, before, "malformed config must not be overwritten");
  });
});

test("broad pattern dry-run succeeds with warning", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId, rule }) => {
      const result = JSON.parse(
        runCli([
          "findings",
          "filter-policy",
          "apply",
          suggestionId,
          "--dry-run",
          "--root",
          root,
          "--json",
        ]).stdout,
      );
      assert.equal(result.applied, false);
      assert.equal(result.isBroadPattern, true);
      assert.ok(result.warnings.some((entry) => entry.code === "broad-path-pattern"));
      assert.equal(result.wouldRefuse, true, "broad rules should refuse without --force");
      assert.ok(result.blockers.some((entry) => entry.code === "broad-path-pattern"));
      assert.equal(result.rule.id, rule.id);
    },
    { rule: rule({ id: "broad-1", pathPattern: "src/**", reason: "policy-exception" }), confidence: "high" },
  );
});

test("broad pattern apply fails without --force", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId }) => {
      const failed = runCliExpectFailure([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--root",
        root,
        "--json",
      ]);
      assert.ok(
        (failed.stderr || failed.stdout).includes("Broad finding filter")
        || (failed.stderr || failed.stdout).includes("--force"),
        `expected broad-pattern refusal, got ${failed.stderr || failed.stdout}`,
      );
    },
    { rule: rule({ id: "broad-2", pathPattern: "src/**", reason: "policy-exception" }), confidence: "high" },
  );
});

test("broad pattern apply succeeds with --force and surfaces warning", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId, rule }) => {
      const result = JSON.parse(
        runCli([
          "findings",
          "filter-policy",
          "apply",
          suggestionId,
          "--force",
          "--root",
          root,
          "--json",
        ]).stdout,
      );
      assert.equal(result.applied, true);
      assert.equal(result.force, true);
      assert.ok(result.warnings.some((entry) => entry.code === "broad-path-pattern"));

      const config = JSON.parse(
        await readFile(join(root, ".rekon", "config.json"), "utf8"),
      );
      assert.ok(config.findingFilters.some((entry) => entry.id === rule.id));
    },
    { rule: rule({ id: "broad-3", pathPattern: "src/**", reason: "policy-exception" }), confidence: "high" },
  );
});

test("low-confidence dry-run succeeds with warning", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId }) => {
      const result = JSON.parse(
        runCli([
          "findings",
          "filter-policy",
          "apply",
          suggestionId,
          "--dry-run",
          "--root",
          root,
          "--json",
        ]).stdout,
      );
      assert.equal(result.applied, false);
      assert.equal(result.isLowConfidence, true);
      assert.ok(result.warnings.some((entry) => entry.code === "low-confidence-suggestion"));
      assert.ok(result.blockers.some((entry) => entry.code === "low-confidence-suggestion"));
    },
    {
      rule: rule({
        id: "low-narrow-1",
        pathPattern: "src/generated/**",
        reason: "generated-file",
      }),
      confidence: "low",
    },
  );
});

test("low-confidence apply fails without --force", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId }) => {
      const failed = runCliExpectFailure([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--root",
        root,
        "--json",
      ]);
      assert.ok(
        (failed.stderr || failed.stdout).includes("low-confidence"),
        `expected low-confidence refusal, got ${failed.stderr || failed.stdout}`,
      );
    },
    {
      rule: rule({
        id: "low-narrow-2",
        pathPattern: "src/generated/**",
        reason: "generated-file",
      }),
      confidence: "low",
    },
  );
});

test("low-confidence apply succeeds with --force on a narrow rule", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId, rule }) => {
      const result = JSON.parse(
        runCli([
          "findings",
          "filter-policy",
          "apply",
          suggestionId,
          "--force",
          "--root",
          root,
          "--json",
        ]).stdout,
      );
      assert.equal(result.applied, true);
      assert.equal(result.force, true);
      assert.ok(result.warnings.some((entry) => entry.code === "low-confidence-suggestion"));

      const config = JSON.parse(
        await readFile(join(root, ".rekon", "config.json"), "utf8"),
      );
      assert.ok(config.findingFilters.some((entry) => entry.id === rule.id));
    },
    {
      rule: rule({
        id: "low-narrow-3",
        pathPattern: "src/generated/**",
        reason: "generated-file",
      }),
      confidence: "low",
    },
  );
});

test("duplicate id dry-run reports duplicate and replacedFindingFilters", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId, rule }) => {
      const configPath = join(root, ".rekon", "config.json");
      const config = JSON.parse(await readFile(configPath, "utf8"));
      config.findingFilters = [
        {
          id: rule.id,
          reason: "policy-exception",
          evidence: "preexisting",
          pathPattern: "src/old-path/**",
        },
      ];
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

      const result = JSON.parse(
        runCli([
          "findings",
          "filter-policy",
          "apply",
          suggestionId,
          "--dry-run",
          "--root",
          root,
          "--json",
        ]).stdout,
      );
      assert.equal(result.applied, false);
      assert.equal(result.isDuplicateRuleId, true);
      assert.ok(result.warnings.some((entry) => entry.code === "duplicate-rule-id"));
      assert.equal(result.diff.addedFindingFilters.length, 0);
      assert.equal(result.diff.replacedFindingFilters.length, 1);
      assert.equal(result.diff.replacedFindingFilters[0].before.pathPattern, "src/old-path/**");
      assert.equal(result.diff.replacedFindingFilters[0].after.id, rule.id);
    },
  );
});

test("duplicate id apply fails without --force", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId, rule }) => {
      const configPath = join(root, ".rekon", "config.json");
      const config = JSON.parse(await readFile(configPath, "utf8"));
      config.findingFilters = [
        {
          id: rule.id,
          reason: "policy-exception",
          evidence: "preexisting",
          pathPattern: "src/old-path/**",
        },
      ];
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

      const failed = runCliExpectFailure([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--root",
        root,
        "--json",
      ]);
      assert.ok(
        (failed.stderr || failed.stdout).includes("already contains")
        || (failed.stderr || failed.stdout).includes("duplicate"),
        `expected duplicate refusal, got ${failed.stderr || failed.stdout}`,
      );
    },
  );
});

test("duplicate id apply with --force replaces the existing rule", async () => {
  await withSuggestionFixture(
    async ({ root, suggestionId, rule }) => {
      const configPath = join(root, ".rekon", "config.json");
      const before = JSON.parse(await readFile(configPath, "utf8"));
      before.findingFilters = [
        {
          id: rule.id,
          reason: "policy-exception",
          evidence: "preexisting",
          pathPattern: "src/old-path/**",
        },
      ];
      await writeFile(configPath, `${JSON.stringify(before, null, 2)}\n`, "utf8");

      const result = JSON.parse(
        runCli([
          "findings",
          "filter-policy",
          "apply",
          suggestionId,
          "--force",
          "--root",
          root,
          "--json",
        ]).stdout,
      );
      assert.equal(result.applied, true);
      assert.equal(result.diff.replacedFindingFilters.length, 1);

      const after = JSON.parse(await readFile(configPath, "utf8"));
      assert.equal(after.findingFilters.length, 1, "duplicate id should be replaced, not appended");
      assert.equal(after.findingFilters[0].id, rule.id);
      assert.equal(after.findingFilters[0].pathPattern, rule.pathPattern);
    },
  );
});

test("unrelated config fields are preserved", async () => {
  await withSuggestionFixture(async ({ root, suggestionId }) => {
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.projectExtension = { keep: true, nested: { ok: 1 } };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli([
      "findings",
      "filter-policy",
      "apply",
      suggestionId,
      "--root",
      root,
      "--json",
    ]);

    const after = JSON.parse(await readFile(configPath, "utf8"));
    assert.deepEqual(after.projectExtension, { keep: true, nested: { ok: 1 } });
    assert.ok(Array.isArray(after.findingFilters));
  });
});

test("config validate passes after apply", async () => {
  await withSuggestionFixture(async ({ root, suggestionId }) => {
    runCli([
      "findings",
      "filter-policy",
      "apply",
      suggestionId,
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

test("suggest/list still do not mutate config", async () => {
  await withSuggestionFixture(async ({ root }) => {
    const configBefore = await readFile(join(root, ".rekon", "config.json"), "utf8");
    runCli(["findings", "filter-policy", "list", "--root", root, "--json"]);
    const configAfter = await readFile(join(root, ".rekon", "config.json"), "utf8");
    assert.equal(configAfter, configBefore, "list must never mutate config");
  });
});

// ---------- helpers ----------

function rule(overrides = {}) {
  return {
    id: overrides.id ?? "rule-id",
    reason: overrides.reason ?? "policy-exception",
    evidence: overrides.evidence ?? "synthetic evidence",
    pathPattern: overrides.pathPattern,
    type: overrides.type,
    ruleId: overrides.ruleId,
    severity: overrides.severity,
    titleIncludes: overrides.titleIncludes,
    descriptionIncludes: overrides.descriptionIncludes,
    confidence: overrides.confidence,
  };
}

function makeSuggestion({ id, confidence, rule: ruleArg }) {
  const cleanedRule = Object.fromEntries(
    Object.entries(ruleArg).filter(([, value]) => value !== undefined),
  );
  return {
    id,
    reason: "repeated-filtered-path",
    suggestedRule: cleanedRule,
    confidence,
    rationale: "synthetic rationale",
    affectedFindingIds: ["a", "b"],
    affectedPaths: ["src/generated/a.ts"],
    affectedTypes: ["test.example"],
    sourceFilterReportIds: ["fr-synthetic"],
    evidence: [],
  };
}

async function withSuggestionFixture(callback, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "rekon-apply-safety-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    await store.init();
    const ruleArg = options.rule
      ?? rule({
        id: "narrow-1",
        pathPattern: "src/generated/**",
        reason: "generated-file",
        evidence: "generated source",
      });
    const confidence = options.confidence ?? "high";
    const suggestionId = `policy-suggestion:synthetic:${ruleArg.id}`;
    const cleanedRule = Object.fromEntries(
      Object.entries(ruleArg).filter(([, value]) => value !== undefined),
    );
    const report = createFindingFilterPolicySuggestionReport({
      header: {
        artifactType: "FindingFilterPolicySuggestionReport",
        artifactId: `apply-safety-suggestions-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "synthetic" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
      },
      suggestions: [
        {
          id: suggestionId,
          reason: "repeated-filtered-path",
          suggestedRule: cleanedRule,
          confidence,
          rationale: "Synthetic suggestion for apply-safety tests.",
          affectedFindingIds: ["a", "b"],
          affectedPaths: ["src/generated/a.ts"],
          affectedTypes: ["test.example"],
          sourceFilterReportIds: ["fr-synthetic"],
          evidence: [],
        },
      ],
    });
    await store.write(report, { category: "findings" });

    await callback({ root, suggestionId, rule: cleanedRule });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
