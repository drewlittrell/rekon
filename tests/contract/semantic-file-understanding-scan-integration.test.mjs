// Semantic File Understanding Scan Integration (slice 147).
//
// `rekon scan --semantic-files auto|required` integrates Semantic File
// Understanding into the normal scan path as an EXPLICIT opt-in layer. Plain
// `rekon scan` (and `--semantic-files off`) stay purely deterministic and call
// no provider. All tests are key-free: provider creds are scrubbed so the
// no-provider path is deterministic (auto → fallback report + warning; required
// → exit non-zero, no report). The deterministic structural extraction stays
// authoritative for imports/exports (the hallucination guard).

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const TS_SRC =
  [
    "// Greeter utility module.",
    'import path from "node:path";',
    'import { readFile } from "node:fs/promises";',
    'export const existing = "ok";',
    "export function greet(name) { return `hello ${name}`; }",
    "export class Greeter {}",
    "function internalHelper() { return readFile; }",
    'export function joinName(name) { return path.join("names", name); }',
  ].join("\n") + "\n";

const noKeyEnv = () => {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.REKON_LLM_ENABLED;
  delete env.REKON_LLM_PROVIDER;
  delete env.REKON_LLM_MODEL;
  delete env.REKON_RUN_LIVE_LLM_TESTS;
  return env;
};

function makeRepo({ richIgnored = false, extraSources = [] } = {}) {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-sfu-scan-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "sfu-scan", version: "0.0.0", type: "module" }) + "\n");
  writeFileSync(join(ROOT, "src/index.ts"), TS_SRC);
  for (const [rel, body] of extraSources) {
    mkdirSync(join(ROOT, rel, ".."), { recursive: true });
    writeFileSync(join(ROOT, rel), body);
  }
  if (richIgnored) {
    mkdirSync(join(ROOT, "node_modules", "pkg"), { recursive: true });
    mkdirSync(join(ROOT, ".next", "server"), { recursive: true });
    mkdirSync(join(ROOT, "dist"), { recursive: true });
    writeFileSync(join(ROOT, "node_modules/pkg/ignored.ts"), "export const ignored = true;\n");
    writeFileSync(join(ROOT, ".next/server/ignored.js"), "export const generated = true;\n");
    writeFileSync(join(ROOT, "dist/ignored.js"), "export const ignored = true;\n");
  }
  return ROOT;
}

const scan = (ROOT, extra = []) =>
  spawnSync(process.execPath, [cliPath, "scan", "--root", ROOT, ...extra, "--json"], {
    encoding: "utf8",
    env: noKeyEnv(),
  });

function scanAsync(ROOT, extra, env) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [cliPath, "scan", "--root", ROOT, ...extra, "--json"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolveResult({ status, stdout, stderr }));
  });
}
const autoArgs = (model = "test-model") => ["--semantic-files", "auto", "--llm-provider", "openai", "--llm-model", model];

function readReports(ROOT) {
  const dir = join(ROOT, ".rekon/artifacts/actions");
  let names = [];
  try {
    names = readdirSync(dir).filter((n) => n.startsWith("SemanticFileUnderstandingReport-"));
  } catch {
    return [];
  }
  return names.map((n) => JSON.parse(readFileSync(join(dir, n), "utf8")));
}
const countReports = (ROOT) => readReports(ROOT).length;
const parse = (res) => {
  try {
    return JSON.parse(res.stdout);
  } catch {
    return undefined;
  }
};

// A single shared auto-scan fixture (rich repo with ignored dirs) reused by the
// many inspection assertions, to keep the number of (slow) scan runs low.
let _auto;
function autoFixture() {
  if (_auto) return _auto;
  const ROOT = makeRepo({ richIgnored: true, extraSources: [["src/util.ts", "export function add(a, b) { return a + b; }\n"]] });
  const srcBefore = readFileSync(join(ROOT, "src/index.ts"), "utf8");
  const res = scan(ROOT, autoArgs());
  _auto = { ROOT, res, json: parse(res), reports: readReports(ROOT), srcBefore };
  return _auto;
}

// --- 1-2: plain scan stays deterministic -----------------------------------

test("1. plain `rekon scan` succeeds", () => {
  const ROOT = makeRepo();
  const res = scan(ROOT);
  assert.equal(res.status, 0, res.stderr);
});

test("2. plain `rekon scan` defaults to auto (operator ruling 2026-07-09): keyless it writes nothing and reports an honest zero-work summary", () => {
  const ROOT = makeRepo();
  const res = scan(ROOT);
  const json = parse(res);
  assert.equal(json.semanticFiles.mode, "auto");
  assert.equal(json.semanticFiles.providerAvailable, false);
  assert.equal(json.semanticFiles.written, 0);
  assert.equal(countReports(ROOT), 0);
});

// --- 3-5: help surface ------------------------------------------------------

test("3. scan help lists --semantic-files", () => {
  const res = spawnSync(process.execPath, [cliPath], { encoding: "utf8", env: noKeyEnv() });
  const scanLine = (res.stdout + res.stderr).split("\n").find((l) => l.includes("rekon scan [--semantic-files"));
  assert.ok(scanLine, "scan usage line present");
  assert.match(scanLine, /--semantic-files/);
});

test("4. scan help lists --llm-provider", () => {
  const res = spawnSync(process.execPath, [cliPath], { encoding: "utf8", env: noKeyEnv() });
  const scanLine = (res.stdout + res.stderr).split("\n").find((l) => l.includes("rekon scan [--semantic-files"));
  assert.match(scanLine, /--llm-provider/);
});

test("5. scan help lists --llm-model", () => {
  const res = spawnSync(process.execPath, [cliPath], { encoding: "utf8", env: noKeyEnv() });
  const scanLine = (res.stdout + res.stderr).split("\n").find((l) => l.includes("rekon scan [--semantic-files"));
  assert.match(scanLine, /--llm-model/);
});

test("5a. default semantic route uses OpenAI when a key is present and provider flags are omitted", async () => {
  const requests = [];
  const paths = [];
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      paths.push(request.url);
      requests.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        model: "gpt-5.6-luna-test",
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({
              summary: {
                purpose: "Exports greeting utilities.",
                responsibilities: ["Format a greeting"],
                touchedConcepts: ["greeting"],
              },
              capabilitySignals: [],
              findings: [],
            }),
          }],
        }],
      }));
    });
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const ROOT = makeRepo();
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const env = noKeyEnv();
  env.OPENAI_API_KEY = "test-key";
  env.REKON_LLM_BASE_URL = `http://127.0.0.1:${address.port}`;

  try {
    const res = await scanAsync(
      ROOT,
      ["--semantic-file-limit", "1", "--semantic-file-path", "src/index.ts", "--semantic-debt", "off"],
      env,
    );
    assert.equal(res.status, 0, res.stderr);
    const json = parse(res);
    assert.equal(json.semanticFiles.provider, "openai");
    assert.equal(json.semanticFiles.model, "gpt-5.6-luna-test");
    assert.equal(json.semanticFiles.written, 1);
    assert.equal(requests.length, 1);
    assert.deepEqual(paths, ["/responses"]);
    assert.equal(requests[0].model, "gpt-5.6-luna");
    assert.equal(requests[0].reasoning.effort, "low");
    const [report] = readReports(ROOT);
    assert.equal(report.normalizationTrace.method, "semantic-llm");
    assert.equal(report.normalizationTrace.provider, "openai");
    assert.equal(report.normalizationTrace.model, "gpt-5.6-luna-test");
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});

test("5b. GPT-5 semantic routes use the OpenAI Responses API", async () => {
  const requests = [];
  const paths = [];
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      paths.push(request.url);
      requests.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        model: "gpt-5.6-luna-test",
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({
              summary: {
                purpose: "Exports greeting utilities.",
                responsibilities: ["Format a greeting"],
                touchedConcepts: ["greeting"],
              },
              capabilitySignals: [],
              findings: [],
            }),
          }],
        }],
      }));
    });
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const ROOT = makeRepo();
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const env = noKeyEnv();
  env.OPENAI_API_KEY = "test-key";
  env.REKON_LLM_BASE_URL = `http://127.0.0.1:${address.port}`;

  try {
    const res = await scanAsync(
      ROOT,
      [
        "--semantic-files", "required",
        "--semantic-file-limit", "1",
        "--semantic-file-path", "src/index.ts",
        "--semantic-debt", "off",
        "--llm-model", "gpt-5.6-luna",
      ],
      env,
    );
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(paths, ["/responses"]);
    assert.equal(requests[0].model, "gpt-5.6-luna");
    assert.equal(requests[0].reasoning.effort, "low");
    assert.equal(parse(res).semanticFiles.written, 1);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});

// --- 6: off is an explicit no-op -------------------------------------------

test("6. `rekon scan --semantic-files off` writes no SemanticFileUnderstandingReport", () => {
  const ROOT = makeRepo();
  const res = scan(ROOT, ["--semantic-files", "off"]);
  assert.equal(res.status, 0, res.stderr);
  const json = parse(res);
  assert.equal(json.semanticFiles.mode, "off");
  assert.equal(json.semanticFiles.written, 0);
  assert.equal(countReports(ROOT), 0);
});

// --- 7-8: auto fallback (no key) -------------------------------------------

test("7. `rekon scan --semantic-files auto` with no provider writes deterministic-fallback reports", () => {
  const { json, reports } = autoFixture();
  assert.equal(json.semanticFiles.mode, "auto");
  assert.ok(json.semanticFiles.written > 0, "wrote at least one report");
  for (const r of reports) {
    assert.equal(r.normalizationTrace.method, "deterministic-fallback");
    assert.equal(r.status.value, "provider-unavailable");
  }
});

test("8. auto fallback report carries a warning", () => {
  const { reports } = autoFixture();
  assert.ok(reports.length > 0);
  for (const r of reports) assert.ok(r.normalizationTrace.warnings.length > 0, "warning recorded");
});

// --- 9-10: required (no key) preflights and writes nothing -------------------

test("9. `rekon scan --semantic-files required` with no provider exits non-zero", () => {
  const ROOT = makeRepo();
  const res = scan(ROOT, ["--semantic-files", "required", "--llm-provider", "openai", "--llm-model", "test-model"]);
  assert.notEqual(res.status, 0);
});

test("10. required with no provider writes no SemanticFileUnderstandingReport", () => {
  const ROOT = makeRepo();
  scan(ROOT, ["--semantic-files", "required", "--llm-provider", "openai", "--llm-model", "test-model"]);
  assert.equal(countReports(ROOT), 0);
});

// --- 11-12: file selection / skip behavior ---------------------------------

test("11. semantic scan writes reports only for selected source files", () => {
  const { reports } = autoFixture();
  const paths = reports.map((r) => r.file.path).sort();
  // src/index.ts, src/util.ts and package.json are the allow-listed candidates.
  assert.ok(paths.includes("src/index.ts"));
  assert.ok(paths.includes("src/util.ts"));
  for (const p of paths) {
    assert.ok(!p.includes("node_modules/"), `no node_modules path: ${p}`);
    assert.ok(!p.startsWith(".next/"), `no .next path: ${p}`);
    assert.ok(!p.startsWith("dist/"), `no dist path: ${p}`);
    assert.ok(!p.startsWith(".rekon/"), `no .rekon path: ${p}`);
  }
});

test("12. semantic scan skips node_modules / .next / dist / .rekon", () => {
  const { reports } = autoFixture();
  const offenders = reports.filter(
    (r) => r.file.path.includes("node_modules/")
      || r.file.path.startsWith(".next/")
      || r.file.path.startsWith("dist/")
      || r.file.path.startsWith(".rekon/"),
  );
  assert.equal(offenders.length, 0);
});

// --- 13: --semantic-file-limit ---------------------------------------------

test("13. semantic scan respects --semantic-file-limit", () => {
  const ROOT = makeRepo({
    extraSources: [
      ["src/a.ts", "export const a = 1;\n"],
      ["src/b.ts", "export const b = 1;\n"],
      ["src/c.ts", "export const c = 1;\n"],
    ],
  });
  const res = scan(ROOT, [...autoArgs(), "--semantic-file-limit", "1"]);
  const json = parse(res);
  assert.equal(json.semanticFiles.selected, 1);
  assert.equal(json.semanticFiles.written, 1);
  assert.ok(json.semanticFiles.skipped >= 1, "remaining candidates skipped");
  assert.equal(countReports(ROOT), 1);
});

// --- 14: --semantic-file-path ----------------------------------------------

test("14. semantic scan respects --semantic-file-path", () => {
  const ROOT = makeRepo({ extraSources: [["src/util.ts", "export const u = 1;\n"]] });
  const res = scan(ROOT, [...autoArgs(), "--semantic-file-path", "src/index.ts"]);
  const reports = readReports(ROOT);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].file.path, "src/index.ts");
});

// --- 15-16: report validity + authoritative deterministic facts -------------

test("15. semantic scan report validates", () => {
  const ROOT = autoFixture().ROOT;
  const res = spawnSync(process.execPath, [cliPath, "artifacts", "validate", "--root", ROOT, "--json"], {
    encoding: "utf8",
    env: noKeyEnv(),
  });
  assert.equal(JSON.parse(res.stdout).valid, true);
});

test("16. deterministic imports/exports remain authoritative in generated reports", () => {
  const { reports } = autoFixture();
  const idx = reports.find((r) => r.file.path === "src/index.ts");
  assert.ok(idx, "report for src/index.ts present");
  assert.deepEqual([...idx.summary.imports].sort(), ["node:fs/promises", "node:path"]);
  assert.deepEqual([...idx.summary.publicExports].sort(), ["Greeter", "existing", "greet", "joinName"]);
  assert.ok(!idx.summary.publicExports.includes("internalHelper"), "unexported internal excluded");
});

// --- 17: source files are never modified -----------------------------------

test("17. source files are unchanged by the semantic scan", () => {
  const { ROOT, srcBefore } = autoFixture();
  assert.equal(readFileSync(join(ROOT, "src/index.ts"), "utf8"), srcBefore);
});

// --- 18-22: boundaries hold on every generated report -----------------------

test("18. no commands executed (boundary)", () => {
  for (const r of autoFixture().reports) assert.equal(r.boundaries.executedCommands, false);
});

test("19. no embeddings generated (boundary)", () => {
  for (const r of autoFixture().reports) assert.equal(r.boundaries.generatedEmbeddings, false);
});

test("20. no PreparedIntentPlan created (boundary)", () => {
  for (const r of autoFixture().reports) assert.equal(r.boundaries.createdPreparedIntentPlan, false);
});

test("21. no WorkOrder created (boundary)", () => {
  for (const r of autoFixture().reports) assert.equal(r.boundaries.createdWorkOrder, false);
});

test("22. no VerificationPlan created (boundary)", () => {
  for (const r of autoFixture().reports) assert.equal(r.boundaries.createdVerificationPlan, false);
});

// --- 23: artifacts validate clean ------------------------------------------

test("23. artifacts validate clean after a semantic scan", () => {
  const ROOT = autoFixture().ROOT;
  const res = spawnSync(process.execPath, [cliPath, "artifacts", "validate", "--root", ROOT, "--json"], {
    encoding: "utf8",
    env: noKeyEnv(),
  });
  assert.equal(JSON.parse(res.stdout).valid, true);
});

// --- 24-26: hash-based reuse / staleness (sequential, shared repo) -----------

let _reuse;
function reuseFixture() {
  if (_reuse) return _reuse;
  const ROOT = makeRepo({ extraSources: [["src/util.ts", "export const u = 1;\n"]] });
  const run1 = parse(scan(ROOT, autoArgs("m1")));
  _reuse = { ROOT, run1, count1: countReports(ROOT) };
  return _reuse;
}

test("24. second scan with unchanged files reuses reports (no rewrite)", () => {
  const s = reuseFixture();
  const run2 = parse(scan(s.ROOT, autoArgs("m1")));
  assert.equal(run2.semanticFiles.written, 0);
  assert.equal(run2.semanticFiles.reused, s.run1.semanticFiles.written);
  assert.equal(countReports(s.ROOT), s.count1, "no new report files on disk");
});

test("25. changing a file's sha256 causes a new report", () => {
  const s = reuseFixture();
  appendFileSync(join(s.ROOT, "src/index.ts"), "\nexport const added = true;\n");
  const run3 = parse(scan(s.ROOT, autoArgs("m1")));
  assert.ok(run3.semanticFiles.written >= 1, "changed file rewritten");
  assert.ok(countReports(s.ROOT) > s.count1, "a new report file was written");
});

test("26. changing provider/model causes new reports (policy-changed)", () => {
  const s = reuseFixture();
  const run4 = parse(scan(s.ROOT, autoArgs("m2")));
  assert.equal(run4.semanticFiles.reused, 0, "old-policy reports are not reused");
  assert.equal(run4.semanticFiles.written, run4.semanticFiles.selected);
  assert.ok(run4.semanticFiles.written > 0);
});
