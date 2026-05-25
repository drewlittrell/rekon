// Contract tests for the
// reconciliation-exact-diff-operation-v1 slice.
//
// Pins:
//   - additive optional beforeText / afterText / diffKind on
//     CoherencyRemediationStep + ReconciliationPlanOperation
//   - safety-gated emission of `exact_text_replacement` operation
//   - Reconciliation Preview v1 renders a real unified diff
//   - read-only: source files unchanged, no extra artifacts beyond the
//     suggest flow's own output, artifacts validate clean
//
// Source-write apply is NOT exercised anywhere in this test.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  suggestReconciliationOperations,
} from "../../packages/capability-reconcile/dist/index.js";
import { validateCoherencyDelta } from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(
  repoRoot,
  "tests/fixtures/reconciliation-preview/exact-diff-v1",
);

const FIXTURE_TARGET_BEFORE = [
  "// Fixture file used by the reconciliation-exact-diff-operation-v1 contract test.",
  "// The seeded CoherencyDelta in the same fixture carries beforeText that matches",
  "// this file byte-for-byte. The expected afterText replaces the legacy import",
  "// with the modern equivalent.",
  "import { legacy } from \"./legacy.js\";",
  "",
  "export function greet(name: string): string {",
  "  return `${legacy(name)}`;",
  "}",
  "",
].join("\n");

const FIXTURE_TARGET_AFTER = [
  "// Fixture file used by the reconciliation-exact-diff-operation-v1 contract test.",
  "// The seeded CoherencyDelta in the same fixture carries beforeText that matches",
  "// this file byte-for-byte. The expected afterText replaces the legacy import",
  "// with the modern equivalent.",
  "import { modern } from \"./modern.js\";",
  "",
  "export function greet(name: string): string {",
  "  return `${modern(name)}`;",
  "}",
  "",
].join("\n");

// ---------- 1: validator accepts optional patch fields ----------

test("CoherencyDelta validator accepts optional beforeText / afterText / diffKind on remediation steps", () => {
  const delta = makeCoherencyDeltaBody({ withPatch: true });
  const result = validateCoherencyDelta(delta);
  assert.equal(
    result.ok,
    true,
    `validator should accept patch fields; issues: ${JSON.stringify(result.issues)}`,
  );
});

// ---------- 2: validator accepts steps without patch fields ----------

test("CoherencyDelta validator accepts remediation steps without patch fields", () => {
  const delta = makeCoherencyDeltaBody({ withPatch: false });
  const result = validateCoherencyDelta(delta);
  assert.equal(
    result.ok,
    true,
    `validator should still accept steps without patch fields; issues: ${JSON.stringify(result.issues)}`,
  );
});

// ---------- 3: classifier emits exact fields on the happy path ----------

test("classifier emits beforeText / afterText / diffKind for the exact_text_replacement candidate", async () => {
  await withFixtureRoot(async (root) => {
    const ops = suggestReconciliationOperations({
      coherencyDelta: {
        remediationQueue: [exactPatchStep()],
      },
      repoRoot: root,
    });
    assert.equal(ops.length, 1);
    const op = ops[0];
    assert.equal(op.operation, "exact_text_replacement");
    assert.equal(op.class, "source-write-deferred");
    assert.equal(op.status, "deferred");
    assert.equal(op.diffKind, "exact-text-replacement");
    assert.equal(op.beforeText, FIXTURE_TARGET_BEFORE);
    assert.equal(op.afterText, FIXTURE_TARGET_AFTER);
    assert.deepEqual(op.requiresPermission, ["write:source"]);
  });
});

// ---------- 4: classifier drops patch fields when current file is missing ----------

test("classifier drops patch fields when the current file is missing", async () => {
  await withFixtureRoot(async (root) => {
    const ops = suggestReconciliationOperations({
      coherencyDelta: {
        remediationQueue: [
          {
            ...exactPatchStep(),
            files: ["does-not-exist.ts"],
          },
        ],
      },
      repoRoot: root,
    });
    assert.equal(ops.length, 1);
    const op = ops[0];
    assert.notEqual(
      op.operation,
      "exact_text_replacement",
      "must fall through to regex-based classification when file is missing",
    );
    assert.equal(op.beforeText, undefined);
    assert.equal(op.afterText, undefined);
    assert.equal(op.diffKind, undefined);
  });
});

// ---------- 5: classifier rejects paths that escape repoRoot ----------

test("classifier rejects paths that escape repoRoot", async () => {
  await withFixtureRoot(async (root) => {
    const escapingPaths = [
      "/etc/passwd",
      "../../etc/passwd",
    ];
    for (const escapingPath of escapingPaths) {
      const ops = suggestReconciliationOperations({
        coherencyDelta: {
          remediationQueue: [
            {
              ...exactPatchStep(),
              files: [escapingPath],
            },
          ],
        },
        repoRoot: root,
      });
      assert.equal(ops.length, 1);
      const op = ops[0];
      assert.notEqual(
        op.operation,
        "exact_text_replacement",
        `escaping path ${escapingPath} must NOT produce exact_text_replacement`,
      );
      assert.equal(op.beforeText, undefined);
      assert.equal(op.afterText, undefined);
    }
  });
});

// ---------- 6: classifier rejects no-op patches ----------

test("classifier rejects patches where afterText equals beforeText", async () => {
  await withFixtureRoot(async (root) => {
    const ops = suggestReconciliationOperations({
      coherencyDelta: {
        remediationQueue: [
          {
            ...exactPatchStep(),
            afterText: FIXTURE_TARGET_BEFORE, // no-op
          },
        ],
      },
      repoRoot: root,
    });
    assert.equal(ops.length, 1);
    const op = ops[0];
    assert.notEqual(
      op.operation,
      "exact_text_replacement",
      "no-op patches must not produce exact_text_replacement",
    );
    assert.equal(op.beforeText, undefined);
  });
});

// ---------- 7: preview marks the generated operation previewable ----------

test("CLI reconcile preview marks the generated exact_text_replacement operation previewable", async () => {
  await withSeededRoot(async (root, planRef) => {
    const preview = runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);
    const exactOp = preview.operations.find(
      (op) => op.kind === "source-patch" && op.previewable,
    );
    assert.ok(
      exactOp,
      `expected a previewable source-patch operation; got: ${JSON.stringify(
        preview.operations,
        null,
        2,
      )}`,
    );
  });
});

// ---------- 8: preview renders a real unified diff ----------

test("CLI reconcile preview renders a real unified diff for the exact_text_replacement operation", async () => {
  await withSeededRoot(async (root, planRef) => {
    const preview = runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);
    const exactOp = preview.operations.find((op) => op.previewable && op.diff);
    assert.ok(exactOp, "expected a previewable operation with a diff");
    assert.equal(exactOp.diff.format, "unified");
    assert.match(exactOp.diff.text, /^--- a\/target\.ts/m);
    assert.match(exactOp.diff.text, /^\+\+\+ b\/target\.ts/m);
    assert.match(exactOp.diff.text, /^-import \{ legacy \} from/m);
    assert.match(exactOp.diff.text, /^\+import \{ modern \} from/m);
  });
});

// ---------- 9: preview rejects when current file no longer matches beforeText ----------

test("CLI reconcile preview marks operation not-previewable when current file no longer matches beforeText", async () => {
  await withSeededRoot(async (root, planRef) => {
    // After the plan is written, mutate the target file. The preview helper
    // does its own current-file-match check; the operation must flip to
    // not-previewable with the canonical mismatch reason.
    await writeFile(
      join(root, "target.ts"),
      "// Operator hand-edit between plan + preview.\n",
      "utf8",
    );

    const preview = runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);

    const exactOp = preview.operations.find(
      (op) => op.kind === "source-patch" && op.path === "target.ts",
    );
    assert.ok(exactOp, "expected the source-patch operation in the preview");
    assert.equal(exactOp.previewable, false);
    assert.equal(exactOp.diff, undefined);
    assert.match(
      exactOp.reason,
      /Current file content does not match expected before text/,
    );
  });
});

// ---------- 10: --json returns previewable operation + diff ----------

test("CLI reconcile preview --json carries previewable operation + diff together", async () => {
  await withSeededRoot(async (root, planRef) => {
    const preview = runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);
    assert.equal(preview.kind, "rekon.reconciliation.preview");
    // Find the previewable operation; it must carry a unified diff.
    const previewable = preview.operations.find((op) => op.previewable === true);
    assert.ok(previewable, "expected at least one previewable operation");
    assert.ok(previewable.diff, "previewable operation must carry a diff");
    assert.equal(previewable.diff.format, "unified");
    assert.equal(preview.recommendation.applyAvailable, false);
  });
});

// ---------- 11: source file unchanged before/after preview ----------

test("source files are unchanged before and after reconcile preview runs", async () => {
  await withSeededRoot(async (root, planRef) => {
    const before = await readFile(join(root, "target.ts"), "utf8");
    runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);
    const after = await readFile(join(root, "target.ts"), "utf8");
    assert.equal(after, before, "target.ts must be byte-identical after preview");
    assert.equal(
      after,
      FIXTURE_TARGET_BEFORE,
      "target.ts must still hold the canonical beforeText",
    );
  });
});

// ---------- 12: no ReconciliationPreviewReport artifact is written ----------

test("reconcile preview does not write a ReconciliationPreviewReport artifact", async () => {
  await withSeededRoot(async (root, planRef) => {
    runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);
    const indexRaw = await readFile(
      join(root, ".rekon/registry/artifacts.index.json"),
      "utf8",
    );
    const index = JSON.parse(indexRaw);
    const previewArtifacts = index.filter(
      (entry) =>
        entry.type === "ReconciliationPreviewReport" ||
        entry.artifactType === "ReconciliationPreviewReport",
    );
    assert.equal(
      previewArtifacts.length,
      0,
      "ReconciliationPreviewReport must NOT be written (still reserved + unregistered)",
    );
  });
});

// ---------- 13: artifacts validate stays clean ----------

test("artifacts validate stays clean after reconcile suggest + preview", async () => {
  await withSeededRoot(async (root, planRef) => {
    runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);
    const validation = runCliJson(["artifacts", "validate", "--root", root, "--json"]);
    assert.equal(
      validation.valid,
      true,
      `artifacts validate must remain clean; issues: ${JSON.stringify(validation.issues)}`,
    );
  });
});

// ---------- helpers ----------

function exactPatchStep() {
  return {
    id: "step-1",
    findingId: "fixture-finding",
    title: "Replace legacy import with modern equivalent",
    action: "exact-text replacement on target.ts",
    files: ["target.ts"],
    systems: ["fixture"],
    priority: "p1",
    severity: "medium",
    beforeText: FIXTURE_TARGET_BEFORE,
    afterText: FIXTURE_TARGET_AFTER,
    diffKind: "exact-text-replacement",
  };
}

function makeCoherencyDeltaBody({ withPatch }) {
  const step = exactPatchStep();
  if (!withPatch) {
    delete step.beforeText;
    delete step.afterText;
    delete step.diffKind;
  }
  return {
    header: {
      artifactType: "CoherencyDelta",
      artifactId: `coherency-delta-fixture-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "exact-diff-v1" },
      producer: { id: "@rekon/exact-diff-v1-fixture", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: { confidence: 1, notes: ["fixture"] },
    },
    summary: {
      total: 1,
      active: 1,
      resolved: 0,
      accepted: 0,
      ignored: 0,
      bySeverity: { medium: 1 },
      byType: {},
      bySystem: { fixture: 1 },
      topPaths: [{ path: "target.ts", count: 1 }],
    },
    items: [],
    remediationQueue: [step],
  };
}

async function withFixtureRoot(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-exact-diff-fixture-"));
  try {
    await cp(fixtureRoot, root, { recursive: true });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withSeededRoot(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-exact-diff-cli-"));
  try {
    await cp(fixtureRoot, root, { recursive: true });

    // Seed a CoherencyDelta directly into the store, then run the actuator
    // to produce a ReconciliationPlan from it. This mirrors what a real
    // upstream generator would write.
    const { createLocalArtifactStore } = await import(
      "../../packages/runtime/dist/index.js"
    );
    const store = createLocalArtifactStore(root);
    await store.init();
    const delta = makeCoherencyDeltaBody({ withPatch: true });
    await store.write(delta);

    // Now run reconcile suggest (apply=false) to produce a ReconciliationPlan.
    runCliJson(["reconcile", "suggest", "--root", root, "--json"]);

    const latest = runCliJson([
      "artifacts",
      "latest",
      "--type",
      "ReconciliationPlan",
      "--root",
      root,
      "--json",
    ]);
    const planRef = latest.artifact;
    assert.ok(planRef, "expected a ReconciliationPlan to be produced");

    await callback(root, planRef);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliJson(args) {
  return JSON.parse(runCli(args).stdout);
}
