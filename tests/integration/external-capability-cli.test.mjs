import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  appendFile,
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
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const todoPackageName = "rekon-capability-todo-example";

test("external TODO capability is operable through the CLI", async (t) => {
  if (!existsSync(join(repoRoot, "node_modules", todoPackageName))) {
    t.skip(
      `External capability not installed. Run 'npm install ./examples/custom-capability --no-save' before this test.`,
    );
    return;
  }

  const root = await mkdtemp(join(tmpdir(), "rekon-external-cli-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    await appendFile(
      join(root, "src", "index.ts"),
      "\n// TODO: replace demo greeting\n",
      "utf8",
    );

    runCli(["init", "--root", root, "--json"]);

    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));

    config.capabilities = [
      ...config.capabilities,
      { package: todoPackageName },
    ];
    config.permissions = {
      ...(config.permissions ?? {}),
      [todoPackageName]: ["read:source", "read:artifacts", "write:artifacts"],
    };

    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const validateConfig = JSON.parse(
      runCli(["config", "validate", "--root", root, "--json"]).stdout,
    );

    assert.equal(validateConfig.valid, true, JSON.stringify(validateConfig, null, 2));

    const capabilities = JSON.parse(
      runCli(["capabilities", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(
      capabilities.capabilities.some(
        (entry) => entry.id === "rekon-capability-todo-example",
      ),
      "external TODO capability must appear in capabilities list",
    );

    const publishers = JSON.parse(
      runCli(["publish", "list", "--root", root, "--json"]).stdout,
    );

    const todoPublisher = publishers.publishers.find(
      (publisher) => publisher.id === "todo.report",
    );

    assert.ok(todoPublisher, "publish list must include the external TODO publisher");
    assert.equal(todoPublisher.capabilityId, "rekon-capability-todo-example");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const publishResult = JSON.parse(
      runCli([
        "publish",
        "run",
        "todo.report",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(publishResult.artifacts));
    assert.ok(publishResult.artifacts.length > 0, "publish run todo.report emitted no artifacts");
    assert.ok(
      publishResult.artifacts.some((artifact) => artifact.type === "Publication"),
      "publish run todo.report must emit a Publication",
    );

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
