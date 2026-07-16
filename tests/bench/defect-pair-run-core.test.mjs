import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  boundedTail,
  buildDefectPairCommandArgs,
  collectDefectPairPaths,
  collectFocusedSnapshotCandidates,
  formatProcessDiagnostics,
  isAcceptableRefreshResult,
  parseCliJson,
} from "./defect-pair-run-core.mjs";
import { materializeFocusedSnapshot } from "./defect-pair-snapshot-core.mjs";

test("full ephemeral defect-pair runs request full setup and scanning together", () => {
  assert.deepEqual(buildDefectPairCommandArgs({
    temporaryRoot: "/tmp/corpus",
    output: "/tmp/output",
    pairs: ["pair-one"],
    full: true,
  }), {
    setupArgs: ["--root", "/tmp/corpus", "--pair", "pair-one", "--full"],
    benchArgs: [
      "--corpus", "/tmp/corpus",
      "--output", "/tmp/output",
      "--pair", "pair-one",
      "--full",
    ],
  });
});

test("focused defect-pair paths include affected, evidence, and tests once", () => {
  const pair = {
    affectedPaths: ["packages/example/src/index.ts"],
    evidencePaths: ["packages/example/src/context.ts", "packages/example/src/index.ts"],
    testPaths: ["packages/example/test/index.test.ts"],
  };

  assert.deepEqual(collectDefectPairPaths(pair), [
    "packages/example/src/context.ts",
    "packages/example/src/index.ts",
    "packages/example/test/index.test.ts",
  ]);
  const candidates = collectFocusedSnapshotCandidates(pair);
  for (const path of [
    "package.json",
    "tsconfig.json",
    "packages/package.json",
    "packages/example/package.json",
    "packages/example/tsconfig.json",
    ...collectDefectPairPaths(pair),
  ]) {
    assert.ok(candidates.includes(path), path);
  }
});

test("focused snapshots retain selected source and package context without a worktree", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "rekon-defect-snapshot-"));
  const sourceRoot = join(tempRoot, "source");
  const snapshotRoot = join(tempRoot, "snapshot");
  mkdirSync(join(sourceRoot, "packages/example/src"), { recursive: true });
  mkdirSync(join(sourceRoot, "packages/example/test"), { recursive: true });
  writeFileSync(join(sourceRoot, "package.json"), '{"private":true}\n');
  writeFileSync(join(sourceRoot, "packages/example/package.json"), '{"name":"example"}\n');
  writeFileSync(join(sourceRoot, "packages/example/tsconfig.json"), '{"compilerOptions":{}}\n');
  writeFileSync(join(sourceRoot, "packages/example/src/index.ts"), "export const value = 1;\n");
  writeFileSync(join(sourceRoot, "packages/example/src/context.ts"), "export const context = true;\n");
  writeFileSync(join(sourceRoot, "packages/example/test/index.test.ts"), "void value;\n");
  writeFileSync(join(sourceRoot, "packages/example/src/unrelated.ts"), "throw new Error('skip');\n");
  execFileSync("git", ["init", "--quiet"], { cwd: sourceRoot });
  execFileSync("git", ["add", "."], { cwd: sourceRoot });
  execFileSync("git", [
    "-c", "user.name=Rekon Test",
    "-c", "user.email=rekon@example.invalid",
    "commit", "--quiet", "-m", "fixture",
  ], { cwd: sourceRoot });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).trim();

  try {
    const materialized = materializeFocusedSnapshot({
      sourceRoot,
      snapshotRoot,
      commit,
      pair: {
        affectedPaths: ["packages/example/src/index.ts"],
        evidencePaths: ["packages/example/src/context.ts"],
        testPaths: ["packages/example/test/index.test.ts"],
      },
    });

    assert.ok(materialized.includes("package.json"));
    assert.ok(materialized.includes("packages/example/package.json"));
    assert.ok(materialized.includes("packages/example/tsconfig.json"));
    assert.equal(
      readFileSync(join(snapshotRoot, "packages/example/src/index.ts"), "utf8"),
      "export const value = 1;\n",
    );
    assert.equal(existsSync(join(snapshotRoot, "packages/example/src/unrelated.ts")), false);
    assert.equal(existsSync(join(snapshotRoot, ".git")), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("CLI JSON parsing preserves prefixed output and reports bounded process context", () => {
  assert.deepEqual(
    parseCliJson('notice\n{"status":"partial"}\n', "refresh fixture"),
    { status: "partial" },
  );

  const result = {
    status: null,
    signal: "SIGTERM",
    error: Object.assign(new Error("spawn buffer exceeded"), { code: "ENOBUFS" }),
    stderr: `stderr-${"x".repeat(5000)}`,
    stdout: `stdout-${"y".repeat(5000)}`,
  };
  assert.throws(
    () => parseCliJson(result.stdout, "refresh fixture", result),
    (error) => {
      assert.match(error.message, /Process status: none/);
      assert.match(error.message, /Process signal: SIGTERM/);
      assert.match(error.message, /Process error \(ENOBUFS\): spawn buffer exceeded/);
      assert.match(error.message, /\[truncated 2007 chars\]/);
      assert.ok(error.message.length < 7000, error.message.length);
      return true;
    },
  );
  assert.equal(boundedTail("abcdef", 3), "[truncated 3 chars]\ndef");
  assert.match(formatProcessDiagnostics(result, 20), /stderr tail:/);
});

test("partial refresh output is accepted only when the CLI process itself started cleanly", () => {
  assert.equal(
    isAcceptableRefreshResult({ status: 1, error: undefined }, { status: "partial" }),
    true,
  );
  assert.equal(
    isAcceptableRefreshResult(
      { status: null, error: new Error("spawn failed") },
      { status: "partial" },
    ),
    false,
  );
  assert.equal(isAcceptableRefreshResult({ status: 0, error: undefined }, { status: "ok" }), true);
});
