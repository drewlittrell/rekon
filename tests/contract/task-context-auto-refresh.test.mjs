import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createLocalArtifactStore } from "@rekon/runtime";
import { assessTaskContextFreshness } from "../../packages/cli/dist/task-context-freshness.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliEntry = join(repoRoot, "packages/cli/dist/index.js");

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [cliEntry, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 120_000,
      env: {
        ...process.env,
        VOYAGE_API_KEY: "",
        OPENAI_API_KEY: "",
        ANTHROPIC_API_KEY: "",
      },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      status: error.status ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}

function startMcp(root) {
  const child = spawn(process.execPath, [cliEntry, "mcp", "serve", "--root", root], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      VOYAGE_API_KEY: "",
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
    },
  });
  let buffer = "";
  let nextId = 1;
  const pending = new Map();

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line) continue;
      const message = JSON.parse(line);
      pending.get(message.id)?.resolve(message);
      pending.delete(message.id);
    }
  });

  return {
    child,
    rpc(method, params) {
      return new Promise((resolvePromise, reject) => {
        const id = nextId++;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`MCP request timed out: ${method}`));
        }, 120_000);
        timer.unref();
        pending.set(id, {
          resolve(message) {
            clearTimeout(timer);
            resolvePromise(message);
          },
        });
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });
    },
    stop() {
      child.kill();
    },
  };
}

async function latestCount(store, type) {
  return (await store.list(type)).length;
}

test("CLI and MCP task-context gateways refresh changed evidence without touching source", async () => {
  const root = mkdtempSync(join(tmpdir(), "rekon-context-freshness-"));
  const sourcePath = join(root, "src", "index.ts");
  let mcp;

  try {
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      `${JSON.stringify({ name: "context-freshness-fixture", version: "1.0.0", type: "module" }, null, 2)}\n`,
    );
    writeFileSync(sourcePath, 'export const bootstrap = "initial";\n');
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["-c", "user.email=test@example.com", "-c", "user.name=Test", "add", "-A"], { cwd: root });
    execFileSync("git", ["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-qm", "fixture"], { cwd: root });

    const initialContext = runCli([
      "context", "task", "--root", root,
      "--task", "Inspect the bootstrap in src/index.ts.",
      "--path", "src/index.ts",
      "--json",
    ]);
    assert.equal(initialContext.status, 0, initialContext.stderr || initialContext.stdout);
    const initialPayload = JSON.parse(initialContext.stdout);
    assert.equal(initialPayload.artifactFreshness.status, "refreshed");
    assert.ok(initialPayload.warnings.some((warning) => warning.includes("rekon contracts maintain")));

    const store = createLocalArtifactStore(root);
    await store.init();
    const initialEvidenceCount = await latestCount(store, "EvidenceGraph");
    const initialGraphCount = await latestCount(store, "CapabilityEvidenceGraph");

    const cliSource = [
      'export const bootstrap = "initial";',
      'export const changedMarker = "cli";',
      "",
    ].join("\n");
    writeFileSync(sourcePath, cliSource);
    const cliContext = runCli([
      "context", "task", "--root", root,
      "--task", "Modify the bootstrap in src/index.ts.",
      "--path", "src/index.ts",
      "--json",
    ]);
    assert.equal(cliContext.status, 0, cliContext.stderr || cliContext.stdout);
    const cliPayload = JSON.parse(cliContext.stdout);
    assert.equal(cliPayload.artifactFreshness.status, "refreshed");
    assert.equal(cliPayload.artifactFreshness.scope, "changed-files");
    assert.deepEqual(cliPayload.artifactFreshness.changedFiles, ["src/index.ts"]);
    assert.ok(await latestCount(store, "EvidenceGraph") > initialEvidenceCount);
    assert.ok(await latestCount(store, "CapabilityEvidenceGraph") > initialGraphCount);
    assert.equal(readFileSync(sourcePath, "utf8"), cliSource);

    const pathless = runCli([
      "context", "task", "--root", root,
      "--task", "Modify the bootstrap in src/index.ts.",
      "--json",
    ]);
    assert.equal(pathless.status, 0, pathless.stderr || pathless.stdout);
    const pathlessPayload = JSON.parse(pathless.stdout);
    assert.equal(pathlessPayload.artifactFreshness.status, "current");
    assert.equal(pathlessPayload.retrieval.status, "fallback");
    assert.equal(pathlessPayload.retrieval.fallback, "graph-lexical");
    assert.ok(pathlessPayload.contextItems.some((item) => item.path === "src/index.ts"));

    const mcpSource = `${cliSource}export const changedAgain = "mcp";\n`;
    writeFileSync(sourcePath, mcpSource);
    const beforeNoRefresh = await latestCount(store, "EvidenceGraph");
    const bypass = runCli([
      "context", "task", "--root", root,
      "--task", "Modify src/index.ts.",
      "--path", "src/index.ts",
      "--no-auto-refresh",
      "--json",
    ]);
    assert.equal(bypass.status, 0, bypass.stderr || bypass.stdout);
    assert.equal(await latestCount(store, "EvidenceGraph"), beforeNoRefresh);

    mcp = startMcp(root);
    const response = await mcp.rpc("tools/call", {
      name: "context_for_task",
      arguments: {
        task: "Modify the bootstrap in src/index.ts.",
        paths: ["src/index.ts"],
        profile: "compact",
      },
    });
    assert.equal(response.error, undefined);
    assert.equal(response.result.isError, false);
    const mcpPayload = JSON.parse(response.result.content[0].text);
    assert.ok(mcpPayload.data.context.warnings.value.some((warning) =>
      warning.includes("rekon contracts maintain")));
    assert.ok(await latestCount(store, "EvidenceGraph") > beforeNoRefresh);
    assert.equal(readFileSync(sourcePath, "utf8"), mcpSource);

    const afterMcpRefresh = await latestCount(store, "EvidenceGraph");
    await mcp.rpc("tools/call", {
      name: "context_for_task",
      arguments: {
        task: "Modify the bootstrap in src/index.ts.",
        paths: ["src/index.ts"],
        profile: "compact",
      },
    });
    assert.equal(await latestCount(store, "EvidenceGraph"), afterMcpRefresh);
  } finally {
    mcp?.stop();
    rmSync(root, { recursive: true, force: true });
  }
});

test("task-context freshness never hashes a source path through a symlinked parent", async (t) => {
  if (process.platform === "win32") {
    t.skip("Directory symlink creation is not reliably available on Windows test hosts.");
    return;
  }

  const root = mkdtempSync(join(tmpdir(), "rekon-context-symlink-root-"));
  const externalRoot = mkdtempSync(join(tmpdir(), "rekon-context-symlink-external-"));

  try {
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(externalRoot, "src"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      `${JSON.stringify({ name: "context-symlink-fixture", version: "1.0.0", type: "module" }, null, 2)}\n`,
    );
    const source = 'export const bootstrap = "same-content";\n';
    writeFileSync(join(root, "src", "index.ts"), source);
    writeFileSync(join(externalRoot, "src", "index.ts"), source);

    const initialContext = runCli([
      "context", "task", "--root", root,
      "--task", "Inspect src/index.ts.",
      "--path", "src/index.ts",
      "--json",
    ]);
    assert.equal(initialContext.status, 0, initialContext.stderr || initialContext.stdout);

    rmSync(join(root, "src"), { recursive: true, force: true });
    symlinkSync(join(externalRoot, "src"), join(root, "src"), "dir");

    const store = createLocalArtifactStore(root);
    await store.init();
    const assessment = await assessTaskContextFreshness({
      repoRoot: root,
      artifacts: store,
      requestedPaths: ["src/index.ts"],
    });
    assert.equal(assessment.status, "refresh-required");
    assert.deepEqual(assessment.changedFiles, ["src/index.ts"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(externalRoot, { recursive: true, force: true });
  }
});
