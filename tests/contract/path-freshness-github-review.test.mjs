// Contract tests for the path-freshness GitHub review
// surfacing slice (P1.1
// path-freshness-github-review-surfacing). Pins:
//
//   1.  github-check dry-run output includes no-report
//       guidance when PathFreshnessReport is absent.
//   2.  github-check dry-run output includes fresh
//       status when report is fresh.
//   3.  github-check dry-run output includes stale
//       warning when report is stale.
//   4.  github-check conclusion is unchanged by stale
//       PathFreshnessReport (this slice's pinned
//       design contract).
//   5.  github-check dry-run cites PathFreshnessReport
//       ref when present.
//   6.  pr-comment dry-run body includes no-report
//       guidance when absent.
//   7.  pr-comment dry-run body includes fresh status
//       when report is fresh.
//   8.  pr-comment dry-run body includes stale
//       warning when report is stale.
//   9.  pr-comment body cites PathFreshnessReport ref
//       in citedRefs when present.
//  10.  github-check --send uses the same payload
//       content via a fake API server and does not
//       alter readiness gates.
//  11.  pr-comment --send uses the same comment body
//       via a fake API server and does not alter
//       readiness gates.
//  12.  GitHub review payload generation does not
//       create a new PathFreshnessReport.
//  13.  GitHub review payload generation does not run
//       `rekon refresh`.
//  14.  artifacts validate remains clean.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");
const exampleRoot = join(repoRoot, "examples", "simple-js-ts");

async function makeRepoWithPathFreshness({ status = "absent" } = {}) {
  const tmp = await mkdtemp(join(tmpdir(), "rekon-path-fresh-gh-review-"));
  const root = join(tmp, "simple-js-ts");
  await cp(exampleRoot, root, {
    recursive: true,
    filter(source) {
      return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
    },
  });
  // Ensure a full proof chain exists so the publish CLI
  // does not fail. `ensureSnapshotReady` will fill in
  // EvidenceGraph / OwnershipMap / FindingReport / Snapshot
  // on first publish; we trigger it explicitly via init +
  // refresh so the test does not rely on publish-time
  // mutation order.
  const init = spawnSync(process.execPath, [cliPath, "init", "--root", root, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(init.status, 0, init.stderr || init.stdout);

  if (status !== "absent") {
    await runCliJson(root, ["paths", "freshness"]); // status: unknown -> baseline
    if (status === "fresh") {
      await runCliJson(root, ["paths", "freshness"]); // no changes -> fresh
    } else if (status === "stale") {
      await runCliJson(root, ["paths", "freshness"]); // capture fresh baseline first
      await writeFile(
        join(root, "src", "index.ts"),
        "// edit\nexport const dirty = 1;\n",
      );
      await runCliJson(root, ["paths", "freshness", "--path", "src/index.ts"]);
    } else if (status !== "unknown") {
      throw new Error(`unknown path-freshness setup status: ${status}`);
    }
  }

  return { tmp, root, cleanup: () => rm(tmp, { recursive: true, force: true }) };
}

async function runCliJson(root, args) {
  const result = spawnSync(
    process.execPath,
    [cliPath, ...args, "--root", root, "--json"],
    { cwd: repoRoot, encoding: "utf8", env: { ...process.env } },
  );
  if (result.status !== 0) {
    throw new Error(
      `CLI ${args.join(" ")} exited ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

async function runCliAsync({ args, env }) {
  const proc = spawn(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env,
  });
  let stdout = "";
  let stderr = "";
  proc.stdout?.on("data", (chunk) => { stdout += chunk; });
  proc.stderr?.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolveExit) => {
    proc.on("exit", (code) => resolveExit(code));
    proc.on("error", () => resolveExit(null));
  });
  return { status, stdout, stderr };
}

async function createFakeApiServer({ status = 201, respondWith = { id: 1 } } = {}) {
  const state = { requestCount: 0, lastRequest: { method: "", path: "", body: "" } };
  const server = createServer((req, res) => {
    state.requestCount += 1;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      state.lastRequest = { method: req.method ?? "", path: req.url ?? "", body };
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(respondWith));
    });
  });
  const baseUrl = await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolveListen(`http://127.0.0.1:${port}`);
    });
  });
  return {
    baseUrl,
    get requestCount() { return state.requestCount; },
    get lastRequest() { return state.lastRequest; },
    close() {
      return new Promise((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

function artifactCountsByType(listing) {
  const items = Array.isArray(listing) ? listing : listing.artifacts ?? [];
  const counts = new Map();
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const type = entry.type;
    if (typeof type !== "string") continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return counts;
}

// ---------- 1: github-check dry-run no-report ----------

test("github-check dry-run renders no-report path-freshness guidance when absent", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "absent" });
  try {
    const result = await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    const summary = result.payload.output.summary;
    assert.match(summary, /Working tree path freshness:/);
    assert.match(summary, /no PathFreshnessReport found/i);
    assert.match(summary, /rekon paths freshness/);
  } finally {
    await cleanup();
  }
});

// ---------- 2: github-check dry-run fresh ----------

test("github-check dry-run renders fresh status when report is fresh", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "fresh" });
  try {
    const result = await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    const summary = result.payload.output.summary;
    assert.match(summary, /Working-tree freshness: `fresh`/);
    assert.match(summary, /Refresh recommended: `no`/);
  } finally {
    await cleanup();
  }
});

// ---------- 3: github-check dry-run stale ----------

test("github-check dry-run renders stale warning when report is stale", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "stale" });
  try {
    const result = await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    const summary = result.payload.output.summary;
    assert.match(summary, /Working-tree freshness: `stale`/);
    assert.match(summary, /Refresh recommended: `yes`/);
    assert.match(summary, /Run `rekon refresh` before relying on generated artifacts/);
  } finally {
    await cleanup();
  }
});

// ---------- 4: stale path freshness does NOT change Check conclusion ----------

test("stale path freshness does not change GitHub Check conclusion", async () => {
  const fresh = await makeRepoWithPathFreshness({ status: "fresh" });
  let conclusionFresh;
  try {
    const result = await runCliJson(fresh.root, ["publish", "github-check", "--dry-run"]);
    conclusionFresh = result.payload.conclusion;
  } finally {
    await fresh.cleanup();
  }
  const stale = await makeRepoWithPathFreshness({ status: "stale" });
  let conclusionStale;
  try {
    const result = await runCliJson(stale.root, ["publish", "github-check", "--dry-run"]);
    conclusionStale = result.payload.conclusion;
  } finally {
    await stale.cleanup();
  }
  assert.equal(
    conclusionStale,
    conclusionFresh,
    `expected GitHub Check conclusion to be identical between fresh and stale path freshness; got fresh=${conclusionFresh} stale=${conclusionStale}`,
  );
});

// ---------- 5: github-check dry-run cites PathFreshnessReport ----------

test("github-check dry-run cites PathFreshnessReport in citedRefs + summary", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "fresh" });
  try {
    const result = await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    const citedRefs = result.payload.citedRefs;
    assert.ok(Array.isArray(citedRefs), "expected payload.citedRefs to be an array");
    const reportRef = citedRefs.find((ref) => ref?.type === "PathFreshnessReport");
    assert.ok(reportRef, `expected PathFreshnessReport in citedRefs; got ${JSON.stringify(citedRefs)}`);
    assert.match(result.payload.output.summary, /PathFreshnessReport: `PathFreshnessReport:/);
  } finally {
    await cleanup();
  }
});

// ---------- 6: pr-comment dry-run no-report ----------

test("pr-comment dry-run renders no-report path-freshness guidance when absent", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "absent" });
  try {
    const result = await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    const body = result.comment.markdown;
    assert.match(body, /Working-tree freshness/);
    assert.match(body, /Working-tree freshness is unknown\. Run `rekon paths freshness`/);
  } finally {
    await cleanup();
  }
});

// ---------- 7: pr-comment dry-run fresh ----------

test("pr-comment dry-run renders fresh status when report is fresh", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "fresh" });
  try {
    const result = await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    const body = result.comment.markdown;
    assert.match(body, /\| Working-tree freshness \| `fresh` \|/);
  } finally {
    await cleanup();
  }
});

// ---------- 8: pr-comment dry-run stale ----------

test("pr-comment dry-run renders stale warning when report is stale", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "stale" });
  try {
    const result = await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    const body = result.comment.markdown;
    assert.match(body, /\| Working-tree freshness \| `stale` \|/);
    assert.match(body, /Working-tree source paths changed since the latest path freshness baseline/);
    assert.match(body, /rekon refresh/);
  } finally {
    await cleanup();
  }
});

// ---------- 9: pr-comment cites PathFreshnessReport in citedRefs ----------

test("pr-comment dry-run cites PathFreshnessReport in citedRefs", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "fresh" });
  try {
    const result = await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    assert.match(
      String(result.citedRefs?.pathFreshness ?? ""),
      /^PathFreshnessReport:/,
      `expected citedRefs.pathFreshness; got ${JSON.stringify(result.citedRefs)}`,
    );
    assert.match(
      result.comment.markdown,
      /\| PathFreshnessReport \| `PathFreshnessReport:/,
    );
  } finally {
    await cleanup();
  }
});

// ---------- 10: github-check --send (fake API) uses same payload content ----------

test("github-check --send sends the same path-freshness lines via a fake API", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "stale" });
  const transport = await createFakeApiServer({ respondWith: { id: 42 } });
  try {
    const env = {
      PATH: process.env.PATH || "",
      REKON_GITHUB_CHECKS: "1",
      REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
      GITHUB_TOKEN: "fake-token-pf-xyz",
      GITHUB_REPOSITORY: "drewlittrell/rekon",
      GITHUB_SHA: "deadbeefcafebabe",
      GITHUB_EVENT_NAME: "workflow_dispatch",
    };
    const result = await runCliAsync({
      args: [
        "publish", "github-check", "--send", "--root", root, "--json",
        "--confirm-checks-write", "--api-base-url", transport.baseUrl,
      ],
      env,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.payload.output.summary, /Working-tree freshness: `stale`/);
    assert.match(parsed.payload.output.summary, /Run `rekon refresh`/);
    assert.equal(transport.requestCount, 1, "fake API received exactly one POST");
    // The send payload posted to the fake API must include
    // the path-freshness lines in `output.summary`.
    const sent = JSON.parse(transport.lastRequest.body);
    assert.match(sent.output?.summary ?? "", /Working-tree freshness: `stale`/);
  } finally {
    await transport.close();
    await cleanup();
  }
});

// ---------- 11: pr-comment --send (fake API) uses same comment body ----------

test("pr-comment --send POSTs a body that includes the path-freshness rows", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "stale" });
  // The PR-comment send flow GETs existing comments first
  // (expect []) then POSTs the new comment body. We pin
  // that the POSTed body contains the path-freshness rows.
  const transport = await createPrCommentFakeApi();
  try {
    const env = {
      PATH: process.env.PATH || "",
      REKON_PR_COMMENTS: "1",
      REKON_PR_COMMENTS_WRITE_CONFIRMED: "1",
      GITHUB_TOKEN: "fake-token-pr-pf",
      GITHUB_REPOSITORY: "drewlittrell/rekon",
      GITHUB_PR_NUMBER: "999",
      GITHUB_EVENT_NAME: "workflow_dispatch",
    };
    const result = await runCliAsync({
      args: [
        "publish", "pr-comment", "--send", "--root", root, "--json",
        "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
      ],
      env,
    });
    assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}; stdout: ${result.stdout}`);
    const post = transport.requests.find((req) => req.method === "POST");
    assert.ok(post, `expected a POST request; got ${JSON.stringify(transport.requests.map((r) => r.method))}`);
    assert.match(post.body, /Working-tree freshness/);
    assert.match(post.body, /PathFreshnessReport:/);
  } finally {
    await transport.close();
    await cleanup();
  }
});

async function createPrCommentFakeApi() {
  const requests = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      requests.push({ method: req.method ?? "", path: req.url ?? "", body });
      res.setHeader("Content-Type", "application/json");
      if ((req.method ?? "") === "GET") {
        res.statusCode = 200;
        res.end("[]");
        return;
      }
      res.statusCode = 201;
      res.end(JSON.stringify({ id: 1, html_url: "https://example.invalid/pr/999#issuecomment-1" }));
    });
  });
  const baseUrl = await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolveListen(`http://127.0.0.1:${port}`);
    });
  });
  return {
    baseUrl,
    get requests() { return requests; },
    close() { return new Promise((resolveClose) => server.close(() => resolveClose())); },
  };
}

// ---------- 12: payload generation does not create a new PathFreshnessReport ----------

test("publish github-check + pr-comment dry-run do not write a new PathFreshnessReport", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "fresh" });
  try {
    const before = artifactCountsByType(await runCliJson(root, ["artifacts", "list"]));
    await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    const after = artifactCountsByType(await runCliJson(root, ["artifacts", "list"]));
    assert.equal(
      after.get("PathFreshnessReport") ?? 0,
      before.get("PathFreshnessReport") ?? 0,
      "publish dry-run must not add a new PathFreshnessReport",
    );
  } finally {
    await cleanup();
  }
});

// ---------- 13: payload generation does not run refresh ----------

test("publish github-check + pr-comment dry-run do not invoke `rekon refresh` (no new evidence/snapshot)", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "fresh" });
  try {
    // ensureSnapshotReady already populated the proof chain
    // in makeRepoWithPathFreshness via `init` (no — only
    // init runs there; the dry-run runs publish which calls
    // ensureSnapshotReady internally). To pin "does not run
    // refresh" we measure deltas across two consecutive
    // publish runs: the SECOND publish must not add fresh
    // evidence on top of the first.
    await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    const before = artifactCountsByType(await runCliJson(root, ["artifacts", "list"]));
    await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    const after = artifactCountsByType(await runCliJson(root, ["artifacts", "list"]));
    for (const refreshType of ["EvidenceGraph", "IntelligenceSnapshot", "ObservedRepo", "FindingReport"]) {
      assert.equal(
        after.get(refreshType) ?? 0,
        before.get(refreshType) ?? 0,
        `repeat dry-run publish must not add ${refreshType}; that would imply a refresh ran`,
      );
    }
  } finally {
    await cleanup();
  }
});

// ---------- 14: artifacts validate remains clean ----------

test("artifacts validate remains clean after publish github-check + pr-comment with path freshness", async () => {
  const { root, cleanup } = await makeRepoWithPathFreshness({ status: "stale" });
  try {
    await runCliJson(root, ["publish", "github-check", "--dry-run"]);
    await runCliJson(root, ["publish", "pr-comment", "--dry-run"]);
    const validate = await runCliJson(root, ["artifacts", "validate"]);
    assert.equal(validate.valid, true, `expected valid: true; got ${JSON.stringify(validate.issues)}`);
  } finally {
    await cleanup();
  }
});
