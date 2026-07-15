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

test("scan independently judges candidates and excludes a source-grounded rejection from the final assessment report", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-assessment-judge-"));
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      requests.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        model: "assessment-judge-test",
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({
              verdict: "rejected",
              rationale: "The fixture marks this candidate as an intentional compatibility wrapper.",
              confidence: 0.95,
              evidence: [{
                path: "src/index.ts",
                excerpt: "return new Promise(async (resolve) => resolve(1));",
              }],
              recommendedVerification: [],
            }),
          }],
        }],
        usage: { input_tokens: 120, output_tokens: 40 },
      }));
    });
  });

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "judge-fixture", version: "1.0.0", type: "module" }));
    await writeFile(join(root, "src", "index.ts"), [
      "export async function load() {",
      "  return new Promise(async (resolve) => resolve(1));",
      "}",
      "",
    ].join("\n"));
    const baseUrl = await listen(server);
    const output = JSON.parse(await runCli([
      "scan",
      "--root", root,
      "--json",
      "--semantic-files", "off",
      "--semantic-debt", "auto",
      "--semantic-debt-file-limit", "0",
      "--semantic-debt-model", "assessment-judge-test",
    ], {
      ...process.env,
      OPENAI_API_KEY: "test-key",
      REKON_LLM_BASE_URL: baseUrl,
      REKON_LLM_ENABLED: "true",
    }));

    assert.equal(output.status, "passed");
    assert.equal(output.assessmentJudgment.rejected, 1);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].model, "assessment-judge-test");

    const store = createLocalArtifactStore(root);
    await store.init();
    const judgmentEntries = await store.list("AssessmentJudgmentReport");
    assert.equal(judgmentEntries.length, 1);
    const judgment = await store.read(judgmentEntries[0]);
    assert.equal(judgment.judgments[0].verdict, "rejected");
    assert.equal(judgment.judgments[0].evidence[0].lineStart, 2);

    const assessmentEntries = (await store.list("AssessmentReport"))
      .slice()
      .sort((left, right) => left.writtenAt.localeCompare(right.writtenAt));
    assert.ok(assessmentEntries.length >= 2);
    const first = await store.read(assessmentEntries[0]);
    const final = await store.read(assessmentEntries.at(-1));
    assert.ok(first.assessments.some((assessment) => assessment.ruleId === "typescript.asyncPromiseExecutor"));
    assert.equal(final.assessments.some((assessment) => assessment.ruleId === "typescript.asyncPromiseExecutor"), false);
    assert.ok(final.header.inputRefs.some((ref) => ref.type === "AssessmentJudgmentReport"));
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
      resolveListen(`http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`);
    });
  });
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
