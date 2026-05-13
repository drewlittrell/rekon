import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("capabilities list reports built-in capabilities", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli(["capabilities", "list", "--root", root, "--json"]);
    const parsed = JSON.parse(result.stdout);

    assert.ok(Array.isArray(parsed.capabilities), "capabilities is an array");
    assert.ok(parsed.capabilities.length >= 9, "expected built-in capabilities");
    const ids = parsed.capabilities.map((entry) => entry.id);
    for (const expected of [
      "@rekon/capability-js-ts",
      "@rekon/capability-docs",
      "@rekon/capability-policy",
      "@rekon/capability-resolver",
    ]) {
      assert.ok(ids.includes(expected), `expected capability ${expected}`);
    }
  });
});

test("capabilities list --verbose includes handler ids", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli([
      "capabilities",
      "list",
      "--root",
      root,
      "--verbose",
      "--json",
    ]);
    const parsed = JSON.parse(result.stdout);

    const docsEntry = parsed.capabilities.find(
      (entry) => entry.manifest.id === "@rekon/capability-docs",
    );

    assert.ok(docsEntry, "expected docs capability in verbose listing");
    assert.ok(Array.isArray(docsEntry.handlers.publishers));
    assert.ok(
      docsEntry.handlers.publishers.some(
        (publisher) => publisher.id === "@rekon/capability-docs.publisher",
      ),
      "docs capability must register its publisher",
    );
  });
});

test("capabilities inspect returns manifest and handlers", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli([
      "capabilities",
      "inspect",
      "@rekon/capability-resolver",
      "--root",
      root,
      "--json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.manifest.id, "@rekon/capability-resolver");
    assert.ok(Array.isArray(parsed.handlers.resolvers));
    assert.ok(
      parsed.handlers.resolvers.some((resolver) => resolver.id === "resolve.preflight"),
      "resolver capability must register resolve.preflight",
    );
  });
});

test("capabilities inspect errors for unknown capability", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCliRaw([
      "capabilities",
      "inspect",
      "@example/missing",
      "--root",
      root,
      "--json",
    ]);

    assert.notEqual(result.status, 0, "unknown capability must exit non-zero");
    assert.match(result.stderr, /Unknown capability/);
  });
});

test("publish list reports built-in docs publisher", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli(["publish", "list", "--root", root, "--json"]);
    const parsed = JSON.parse(result.stdout);

    assert.ok(Array.isArray(parsed.publishers));
    assert.ok(
      parsed.publishers.some(
        (publisher) => publisher.id === "@rekon/capability-docs.publisher",
      ),
      "publish list must include @rekon/capability-docs.publisher",
    );
  });
});

test("publish run targets a specific publisher by id", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli([
      "publish",
      "run",
      "@rekon/capability-docs.publisher",
      "--root",
      root,
      "--json",
    ]);
    const parsed = JSON.parse(result.stdout);

    assert.ok(Array.isArray(parsed.artifacts));
    assert.ok(parsed.artifacts.length > 0, "publisher must write at least one artifact");
    assert.ok(
      parsed.artifacts.some((artifact) => artifact.type === "Publication"),
      "publish run must emit Publication artifacts",
    );
  });
});

test("publish run errors clearly for unknown publisher", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCliRaw([
      "publish",
      "run",
      "no.such.publisher",
      "--root",
      root,
      "--json",
    ]);

    assert.notEqual(result.status, 0, "unknown publisher must exit non-zero");
    assert.match(result.stderr, /Unknown publisher/);
    assert.match(result.stderr, /rekon publish list/);
  });
});

test("publish agents shortcut continues to work", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli(["publish", "agents", "--root", root, "--json"]);
    const parsed = JSON.parse(result.stdout);

    assert.ok(Array.isArray(parsed.artifacts));
    assert.ok(parsed.artifacts.length > 0);
  });
});

test("config validate reports clean default config", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCli(["config", "validate", "--root", root, "--json"]);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.issues, []);
    assert.equal(parsed.configExists, true);
  });
});

test("config validate fails when config is missing", async () => {
  await withFixture(async (root) => {
    const result = runCliRaw(["config", "validate", "--root", root, "--json"]);

    assert.notEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.valid, false);
    assert.equal(parsed.configExists, false);
    assert.ok(parsed.issues.some((issue) => issue.code === "config-missing"));
  });
});

test("config validate flags unknown permissions and bad shape", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));

    config.capabilities.push({ package: "rekon-capability-todo-example" });
    config.permissions = {
      "rekon-capability-todo-example": ["read:source", "make:coffee"],
      "rekon-capability-orphan": ["read:artifacts"],
    };

    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const result = runCliRaw(["config", "validate", "--root", root, "--json"]);

    assert.notEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.valid, false);
    assert.ok(
      parsed.issues.some(
        (issue) => issue.code === "permission-unknown" && issue.message.includes("make:coffee"),
      ),
      "expected permission-unknown for make:coffee",
    );
    assert.ok(
      parsed.issues.some((issue) => issue.code === "permissions-unknown-capability"),
      "expected permissions-unknown-capability for the orphan entry",
    );
  });
});

test("config validate fails on malformed JSON", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    await writeFile(join(root, ".rekon", "config.json"), "{not json", "utf8");

    const result = runCliRaw(["config", "validate", "--root", root, "--json"]);

    assert.notEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.valid, false);
    assert.ok(parsed.issues.some((issue) => issue.code === "config-not-json"));
  });
});

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-generic-cap-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = runCliRaw(args);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  return result;
}

function runCliRaw(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}
