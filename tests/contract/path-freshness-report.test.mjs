// Contract tests for the PathFreshnessReport artifact +
// `buildSourceStateFingerprint` helper + `rekon paths
// freshness` CLI surface.
//
// These pin the first watcher / path-freshness slice
// selected by docs/strategy/post-beta-dogfood-evidence-triage.md
// and reserved by docs/strategy/watcher-path-freshness-policy-decision.md.
// They cover:
//
//   1. deterministic source-state fingerprint
//   2. default ignore set excludes machine-generated dirs
//   3. fingerprint changes when content changes
//   4. first `paths freshness` run records `unknown`
//   5. second run with no changes records `fresh`
//   6. changed tracked file records `stale` / `changed`
//   7. deleted tracked file records `stale` / `missing`
//   8. new file in tracked default set records `stale` / `new`
//   9. `--path` narrows tracking
//  10. recommendation includes `rekon refresh` when stale
//  11. PathFreshnessReport artifact validates
//  12. `artifacts validate` remains clean
//  13. command does not run `rekon refresh`
//  14. command does not mutate source files
//  15. file mtimes alone are not canonical freshness evidence

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildSourceStateFingerprint,
  DEFAULT_SOURCE_FINGERPRINT_IGNORE,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  comparePathFreshness,
  createPathFreshnessReport,
} from "../../packages/capability-intent/dist/index.js";

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const cliEntry = join(repoRoot, "packages", "cli", "dist", "index.js");
const exampleRoot = join(repoRoot, "examples", "simple-js-ts");

async function makeRepo() {
  const tmp = await mkdtemp(join(tmpdir(), "rekon-path-freshness-"));
  const root = join(tmp, "simple-js-ts");
  await cp(exampleRoot, root, { recursive: true });
  return { tmp, root, cleanup: () => rm(tmp, { recursive: true, force: true }) };
}

function runCli(args, root) {
  const result = spawnSync("node", [cliEntry, ...args, "--root", root, "--json"], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test" },
  });
  if (result.status !== 0) {
    throw new Error(
      `CLI ${args.join(" ")} exited ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

async function snapshotSourceTree(root) {
  const entries = [];
  async function walk(dir, prefix) {
    const dirEntries = await readdir(dir, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entry.name === ".rekon" || entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const absolutePath = join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stats = await stat(absolutePath);
      const contents = await readFile(absolutePath);
      entries.push({ path: relativePath, size: stats.size, contents: contents.toString("base64") });
    }
  }
  await walk(root, "");
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

// ---------- 1: deterministic fingerprint ----------

test("buildSourceStateFingerprint is deterministic across runs", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    const a = await buildSourceStateFingerprint({
      repoRoot: root,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const b = await buildSourceStateFingerprint({
      repoRoot: root,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(a.rootHash, b.rootHash);
    assert.deepEqual(a.paths.map((p) => p.path), b.paths.map((p) => p.path));
    assert.deepEqual(a.paths.map((p) => p.hash), b.paths.map((p) => p.hash));
  } finally {
    await cleanup();
  }
});

// ---------- 2: ignore set excludes machine-generated dirs ----------

test("default fingerprint walk ignores .git / node_modules / .rekon / dist by default", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    await mkdir(join(root, ".git"), { recursive: true });
    await writeFile(join(root, ".git", "HEAD"), "ref: refs/heads/main\n");
    await mkdir(join(root, "node_modules", "foo"), { recursive: true });
    await writeFile(join(root, "node_modules", "foo", "package.json"), "{}");
    await mkdir(join(root, "dist"), { recursive: true });
    await writeFile(join(root, "dist", "out.js"), "console.log('x');");
    await mkdir(join(root, ".rekon"), { recursive: true });
    await writeFile(join(root, ".rekon", "noise.json"), "{}");

    const fingerprint = await buildSourceStateFingerprint({
      repoRoot: root,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const paths = fingerprint.paths.map((p) => p.path);
    for (const path of paths) {
      assert.ok(
        !path.startsWith(".git/")
          && !path.startsWith("node_modules/")
          && !path.startsWith("dist/")
          && !path.startsWith(".rekon/"),
        `unexpected ignored path leaked into fingerprint: ${path}`,
      );
    }
    assert.ok(
      Array.isArray(fingerprint.ignoredGlobs)
        && DEFAULT_SOURCE_FINGERPRINT_IGNORE.every((segment) =>
          fingerprint.ignoredGlobs.includes(segment),
        ),
      "fingerprint should record its ignored glob set",
    );
  } finally {
    await cleanup();
  }
});

// ---------- 3: fingerprint reflects content change ----------

test("fingerprint root hash changes when file content changes", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    const before = await buildSourceStateFingerprint({
      repoRoot: root,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    await writeFile(join(root, "src", "index.ts"), "// mutated\nexport {};\n");
    const after = await buildSourceStateFingerprint({
      repoRoot: root,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    assert.notEqual(before.rootHash, after.rootHash);
  } finally {
    await cleanup();
  }
});

// ---------- 4: first paths freshness run is unknown ----------

test("first `rekon paths freshness` run writes PathFreshnessReport with status `unknown`", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    const result = runCli(["paths", "freshness"], root);
    assert.equal(result.status, "unknown");
    assert.equal(result.summary.fresh, 0);
    assert.equal(result.summary.changed, 0);
    assert.equal(result.recommendation.refreshRecommended, false);
    assert.match(result.recommendation.message, /No baseline|No prior/i);
    assert.equal(result.artifact.type, "PathFreshnessReport");
  } finally {
    await cleanup();
  }
});

// ---------- 5: second run with no changes is fresh ----------

test("second `paths freshness` run with no changes reports `fresh`", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const second = runCli(["paths", "freshness"], root);
    assert.equal(second.status, "fresh");
    assert.equal(second.summary.changed, 0);
    assert.equal(second.summary.missing, 0);
    assert.equal(second.summary.new, 0);
    assert.equal(second.recommendation.refreshRecommended, false);
  } finally {
    await cleanup();
  }
});

// ---------- 6: changed tracked file is stale/changed ----------

test("changed tracked file reports `stale` and `changed`", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    await writeFile(
      join(root, "src", "index.ts"),
      "// mutated\nexport const x = 1;\n",
    );
    const result = runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    assert.equal(result.status, "stale");
    assert.equal(result.summary.changed, 1);
    assert.equal(result.summary.missing, 0);
    assert.equal(result.summary.new, 0);
    const changedEntry = result.entries.find((e) => e.path === "src/index.ts");
    assert.ok(changedEntry, "expected an entry for src/index.ts");
    assert.equal(changedEntry.status, "changed");
    assert.ok(changedEntry.currentHash);
    assert.ok(changedEntry.baselineHash);
    assert.notEqual(changedEntry.currentHash, changedEntry.baselineHash);
  } finally {
    await cleanup();
  }
});

// ---------- 7: deleted tracked file is stale/missing ----------

test("deleted tracked file reports `stale` and `missing`", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    await rm(join(root, "src", "index.ts"));
    const result = runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    assert.equal(result.status, "stale");
    assert.equal(result.summary.missing, 1);
    const entry = result.entries.find((e) => e.path === "src/index.ts");
    assert.ok(entry);
    assert.equal(entry.status, "missing");
    assert.equal(entry.currentExists, false);
  } finally {
    await cleanup();
  }
});

// ---------- 8: new file in tracked default set is stale/new ----------

test("new file appearing under default walk reports `stale` and `new`", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    await writeFile(join(root, "src", "added.ts"), "export const added = true;\n");
    const result = runCli(["paths", "freshness"], root);
    assert.equal(result.status, "stale");
    assert.ok(result.summary.new >= 1, "expected at least one new entry");
    const entry = result.entries.find((e) => e.path === "src/added.ts");
    assert.ok(entry, "expected entry for src/added.ts");
    assert.equal(entry.status, "new");
  } finally {
    await cleanup();
  }
});

// ---------- 9: --path restricts tracking ----------

test("--path restricts tracking to supplied paths", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    const result = runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    assert.equal(result.summary.total, 1);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].path, "src/index.ts");
  } finally {
    await cleanup();
  }
});

// ---------- 10: recommendation names rekon refresh when stale ----------

test("recommendation includes `rekon refresh` when stale", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    await writeFile(join(root, "src", "index.ts"), "// dirty\nexport const y = 2;\n");
    const result = runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    assert.equal(result.status, "stale");
    assert.equal(result.recommendation.refreshRecommended, true);
    assert.ok(
      result.recommendation.commands.includes("rekon refresh"),
      "expected commands to include rekon refresh",
    );
    assert.match(result.recommendation.message, /rekon refresh/);
  } finally {
    await cleanup();
  }
});

// ---------- 11: artifact validates structurally ----------

test("createPathFreshnessReport accepts a well-formed report", () => {
  const header = {
    artifactType: "PathFreshnessReport",
    artifactId: "test-report",
    schemaVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    subject: { repoId: "test-repo" },
    producer: { id: "@rekon/cli.paths-freshness", version: "0.1.0-beta.0" },
    inputRefs: [],
  };
  const currentSourceState = {
    algorithm: "sha256",
    rootHash: "deadbeef",
    paths: [{ path: "src/index.ts", exists: true, hash: "h1", size: 1 }],
    generatedAt: "2026-01-01T00:00:00.000Z",
  };
  const comparison = comparePathFreshness(currentSourceState, undefined);
  const report = createPathFreshnessReport({
    header,
    status: comparison.status,
    currentSourceState,
    entries: comparison.entries,
    summary: comparison.summary,
    recommendation: comparison.recommendation,
  });
  assert.equal(report.header.artifactType, "PathFreshnessReport");
  assert.equal(report.status, "unknown");
  assert.equal(report.summary.total, 1);
});

// ---------- 12: artifacts validate remains clean ----------

test("`rekon artifacts validate` remains clean after multiple paths freshness runs", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    await writeFile(join(root, "src", "index.ts"), "// edit-a\nexport const a = 1;\n");
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    await writeFile(join(root, "src", "index.ts"), "// edit-b\nexport const b = 2;\n");
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    const validate = runCli(["artifacts", "validate"], root);
    assert.equal(validate.valid, true, `expected valid: true; got ${JSON.stringify(validate.issues)}`);
  } finally {
    await cleanup();
  }
});

// ---------- 13: command does not run rekon refresh ----------

test("`rekon paths freshness` does not run `rekon refresh` (does not produce new refresh artifacts)", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    // The example fixture may already carry refresh-produced
    // artifacts (EvidenceGraph etc.); the contract here is
    // that `paths freshness` does not ADD any new ones.
    const countsBefore = artifactCountsByType(runCli(["artifacts", "list"], root));
    runCli(["paths", "freshness"], root);
    runCli(["paths", "freshness"], root);
    const countsAfter = artifactCountsByType(runCli(["artifacts", "list"], root));
    for (const refreshType of [
      "EvidenceGraph",
      "IntelligenceSnapshot",
      "ObservedRepo",
      "Publication",
      "FindingReport",
    ]) {
      assert.equal(
        countsAfter.get(refreshType) ?? 0,
        countsBefore.get(refreshType) ?? 0,
        `paths freshness must not add ${refreshType} artifacts`,
      );
    }
    assert.equal(
      (countsAfter.get("PathFreshnessReport") ?? 0)
        - (countsBefore.get("PathFreshnessReport") ?? 0),
      2,
      "paths freshness must add exactly one PathFreshnessReport per invocation",
    );
  } finally {
    await cleanup();
  }
});

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

// ---------- 14: command does not mutate source files ----------

test("`rekon paths freshness` does not mutate source files", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    const before = await snapshotSourceTree(root);
    runCli(["paths", "freshness"], root);
    runCli(["paths", "freshness"], root);
    const after = await snapshotSourceTree(root);
    assert.deepEqual(after, before, "source tree changed across paths freshness runs");
  } finally {
    await cleanup();
  }
});

// ---------- 15: mtimes alone are not canonical freshness evidence ----------

test("file mtimes alone are not used as canonical freshness evidence", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    // Touch mtime forward but DO NOT change content; the
    // canonical hash should still match → fresh.
    const target = join(root, "src", "index.ts");
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await utimes(target, future, future);
    const second = runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    assert.equal(second.status, "fresh");
    assert.equal(second.summary.changed, 0);
  } finally {
    await cleanup();
  }
});
