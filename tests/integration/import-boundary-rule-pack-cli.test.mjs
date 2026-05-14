import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

test("external import-boundary rule pack is operable through the CLI", async (t) => {
  if (!existsSync(join(repoRoot, "node_modules", ruleackPackageName))) {
    t.skip(
      `External rule pack not installed. Run 'npm install ./examples/import-boundary-rule-pack --no-save' before this test.`,
    );
    return;
  }

  const root = await mkdtemp(join(tmpdir(), "rekon-import-boundary-cli-"));

  try {
    await cp(fixtureRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(fixtureRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    runCli(["init", "--root", root, "--json"]);

    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));

    config.capabilities = [
      ...config.capabilities,
      { package: ruleackPackageName },
    ];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };

    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const validateConfig = JSON.parse(
      runCli(["config", "validate", "--root", root, "--json"]).stdout,
    );

    assert.equal(
      validateConfig.valid,
      true,
      JSON.stringify(validateConfig, null, 2),
    );

    const capabilities = JSON.parse(
      runCli(["capabilities", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(
      capabilities.capabilities.some((entry) => entry.id === ruleackPackageName),
      "capabilities list must include the external rule pack",
    );

    const inspect = JSON.parse(
      runCli([
        "capabilities",
        "inspect",
        ruleackPackageName,
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.equal(inspect.manifest.id, ruleackPackageName);
    assert.ok(
      inspect.handlers.evaluators.some(
        (entry) => entry.id === "import-boundaries.evaluate",
      ),
      "rule pack must register the import-boundaries.evaluate evaluator",
    );

    runCli(["observe", "--root", root, "--json"]);

    const evaluators = JSON.parse(
      runCli(["evaluate", "list", "--root", root, "--json"]).stdout,
    );

    const ruleackEvaluator = evaluators.evaluators.find(
      (entry) => entry.id === "import-boundaries.evaluate",
    );

    assert.ok(ruleackEvaluator, "evaluate list must include import-boundaries.evaluate");
    assert.equal(ruleackEvaluator.capabilityId, ruleackPackageName);
    assert.ok(ruleackEvaluator.produces.includes("FindingReport"));

    const runResult = JSON.parse(
      runCli([
        "evaluate",
        "run",
        "import-boundaries.evaluate",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    const reportRef = runResult.artifacts.find(
      (artifact) => artifact.type === "FindingReport",
    );

    assert.ok(reportRef, "evaluate run must emit a FindingReport");

    const reportPath = join(root, reportRef.path);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    const types = new Set((report.findings ?? []).map((finding) => finding.type));

    assert.ok(
      types.has("import_boundary.parent_relative_import"),
      "report must include import_boundary.parent_relative_import",
    );
    assert.ok(
      types.has("import_boundary.generated_output_import"),
      "report must include import_boundary.generated_output_import",
    );

    for (const finding of report.findings ?? []) {
      if (finding.type === "import_boundary.parent_relative_import") {
        assert.equal(finding.severity, "medium");
      }

      if (finding.type === "import_boundary.generated_output_import") {
        assert.equal(finding.severity, "high");
      }
    }

    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );

    assert.equal(validate.valid, true, JSON.stringify(validate, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  return result;
}
