import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");

test("semantic debt file limit caps the reusable report instead of expanding on retry", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-semantic-budget-"));
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const parsed = JSON.parse(body);
      requests.push(parsed);
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        model: "budget-test-model",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: providerResult(parsed) }],
        }],
        usage: { input_tokens: 10, output_tokens: 2 },
      }));
    });
  });

  try {
    await mkdir(join(root, "src"), { recursive: true });
    for (const name of ["a.ts", "b.ts", "c.ts"]) {
      await writeFile(join(root, "src", name), `export const ${name[0]} = ${JSON.stringify(name)};\n`);
    }
    const baseUrl = await listen(server);
    const args = [
      "scan",
      "--root", root,
      "--json",
      "--semantic-files", "off",
      "--semantic-debt", "auto",
      "--semantic-debt-model", "budget-test-model",
      "--semantic-debt-file-limit", "2",
    ];
    const env = {
      ...process.env,
      OPENAI_API_KEY: "test-key",
      REKON_LLM_BASE_URL: `${baseUrl}/v1`,
      REKON_LLM_ENABLED: "true",
      REKON_SEMANTIC: "auto",
    };

    const first = JSON.parse(await runCli(args, env));
    assert.equal(first.semanticDebt.judged, 2);
    assert.equal(first.semanticDebt.reused, 0);
    assert.equal(semanticDebtRequestCount(requests), 2);

    const store = createLocalArtifactStore(root);
    await store.init();
    const latestRef = (await store.list("SemanticDebtJudgmentReport")).at(-1);
    const latest = await store.read(latestRef);
    await store.write({
      ...latest,
      header: {
        ...latest.header,
        artifactId: "semantic-debt-legacy-eligibility",
        generatedAt: new Date(Date.parse(latest.header.generatedAt) + 1).toISOString(),
      },
      policy: { ...latest.policy, eligibilityVersion: "debt-eligibility-v2" },
    }, { category: "actions" });

    const second = JSON.parse(await runCli(args, env));
    assert.equal(second.semanticDebt.judged, 0);
    assert.equal(second.semanticDebt.reused, 2);
    assert.equal(semanticDebtRequestCount(requests), 2, "a stricter eligibility revision must reuse still-eligible unchanged judgments");
  } finally {
    await new Promise((resolveClose) => server.close(() => resolveClose()));
    await rm(root, { recursive: true, force: true });
  }
});

test("repeatable semantic debt file paths target only the requested eligible files", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-semantic-targets-"));
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const parsed = JSON.parse(body);
      requests.push(parsed);
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        model: "target-test-model",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: providerResult(parsed) }],
        }],
        usage: { input_tokens: 10, output_tokens: 2 },
      }));
    });
  });

  try {
    await mkdir(join(root, "src"), { recursive: true });
    for (const name of ["a.ts", "b.ts", "c.ts"]) {
      await writeFile(join(root, "src", name), `export const ${name[0]} = ${JSON.stringify(name)};\n`);
    }
    const baseUrl = await listen(server);
    const args = [
      "scan",
      "--root", root,
      "--json",
      "--semantic-files", "off",
      "--semantic-debt", "required",
      "--semantic-debt-model", "target-test-model",
      "--semantic-debt-file-limit", "2",
      "--semantic-debt-file-path", "src/c.ts",
      "--semantic-debt-file-path", "src/a.ts",
      "--semantic-debt-file-path", "src/c.ts",
    ];
    const env = {
      ...process.env,
      OPENAI_API_KEY: "test-key",
      REKON_LLM_BASE_URL: `${baseUrl}/v1`,
      REKON_LLM_ENABLED: "true",
      REKON_SEMANTIC: "auto",
    };

    const output = JSON.parse(await runCli(args, env));
    assert.equal(output.semanticDebt.judged, 2);
    assert.equal(semanticDebtRequestCount(requests), 2);

    const store = createLocalArtifactStore(root);
    await store.init();
    const latestRef = (await store.list("SemanticDebtJudgmentReport")).at(-1);
    const latest = await store.read(latestRef);
    assert.deepEqual(latest.entries.map((entry) => entry.path), ["src/a.ts", "src/c.ts"]);
  } finally {
    await new Promise((resolveClose) => server.close(() => resolveClose()));
    await rm(root, { recursive: true, force: true });
  }
});

function listen(server) {
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolveListen(`http://127.0.0.1:${port}`);
    });
  });
}

function semanticDebtRequestCount(requests) {
  return requests.filter((request) => request?.text?.format?.name === "SemanticDebtJudgmentResult").length;
}

function providerResult(request) {
  if (request?.text?.format?.name === "AssessmentJudgmentResult") {
    return JSON.stringify({
      verdict: "insufficient_evidence",
      rationale: "The budget fixture does not provide evidence for a decisive judgment.",
      confidence: 0.4,
      evidence: [],
      recommendedVerification: [],
    });
  }
  return JSON.stringify({ concerns: [] });
}

function runCli(args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", rejectRun);
    child.once("close", (code) => {
      if (code === 0) resolveRun(stdout);
      else rejectRun(new Error(`rekon scan exited ${code}: ${stderr || stdout}`));
    });
  });
}
