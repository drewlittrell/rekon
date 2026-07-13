import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");

test("semantic debt file limit caps the reusable report instead of expanding on retry", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-semantic-budget-"));
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      requests.push(JSON.parse(body));
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        model: "budget-test-model",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: '{"concerns":[]}' }],
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
    assert.equal(requests.length, 2);

    const second = JSON.parse(await runCli(args, env));
    assert.equal(second.semanticDebt.judged, 0);
    assert.equal(second.semanticDebt.reused, 2);
    assert.equal(requests.length, 2, "retry must not spend another file-limit batch");
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
