// Contract tests for the reconciliation preview helper +
// `rekon reconcile preview` CLI command.
//
// The preview is **read-only**: it reads a ReconciliationPlan
// (and optionally the named file content for an exact-diff
// path) and never writes source files or artifacts.
//
// Tests pin:
//   - helper accepts a ReconciliationPlan + planRef
//   - summary counts operations
//   - artifact-only operation is classified artifact-only
//   - source-write-deferred without exact patch data is not-previewable
//   - exact before/after produces unified diff
//   - current-file mismatch prevents diff
//   - recommendation says apply is unavailable
//   - CLI --json returns structured preview
//   - CLI human output says source-write apply is not available
//   - CLI refuses missing --plan
//   - preview does not mutate source files
//   - preview does not write new artifacts
//   - artifacts validate stays clean

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
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { buildReconciliationPreview } from "../../packages/capability-reconcile/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: helper accepts a ReconciliationPlan ----------

test("buildReconciliationPreview accepts a ReconciliationPlan + planRef", async () => {
  const plan = makeFixturePlan([
    artifactOnlyOp("docs_regeneration", "Refresh docs"),
  ]);
  const planRef = makePlanRef(plan.header.artifactId);

  const preview = await buildReconciliationPreview({ plan, planRef });

  assert.equal(preview.kind, "rekon.reconciliation.preview");
  assert.equal(preview.planRef.id, planRef.id);
  assert.equal(preview.operations.length, 1);
});

// ---------- 2: summary counts operations ----------

test("preview summary counts operations by kind, previewable, and high-risk", async () => {
  const plan = makeFixturePlan([
    artifactOnlyOp("docs_regeneration", "Refresh docs"),
    sourceDeferredOp("safe_import_rewrite", "Update imports", ["src/index.ts"]),
    manualReviewOp("Inspect ambiguous remediation"),
  ]);
  const planRef = makePlanRef(plan.header.artifactId);

  const preview = await buildReconciliationPreview({ plan, planRef });

  assert.equal(preview.summary.total, 3);
  assert.equal(preview.summary.artifactOnly, 1);
  assert.equal(preview.summary.sourcePatch, 1);
  assert.equal(preview.summary.manual, 1);
  assert.equal(preview.summary.previewable, 1, "only artifact-only is previewable in v1");
  assert.equal(preview.summary.highRisk, 1, "source-write-deferred operation is high-risk");
  assert.equal(preview.status, "partial");
});

// ---------- 3: artifact-only operation classification ----------

test("artifact-only operation is classified artifact-only and previewable", async () => {
  const plan = makeFixturePlan([
    artifactOnlyOp("docs_regeneration", "Regenerate AGENTS.md"),
  ]);
  const planRef = makePlanRef(plan.header.artifactId);

  const preview = await buildReconciliationPreview({ plan, planRef });

  const op = preview.operations[0];
  assert.equal(op.kind, "artifact-only");
  assert.equal(op.previewable, true);
  assert.equal(op.risk, "low");
  assert.equal(op.diff, undefined);
});

// ---------- 4: source-write op without patch data → not-previewable ----------

test("source-write-deferred operation without exact patch data is not-previewable", async () => {
  const plan = makeFixturePlan([
    sourceDeferredOp("safe_import_rewrite", "Update imports", ["src/index.ts"]),
  ]);
  const planRef = makePlanRef(plan.header.artifactId);

  const preview = await buildReconciliationPreview({ plan, planRef });

  const op = preview.operations[0];
  assert.equal(op.kind, "source-patch");
  assert.equal(op.previewable, false);
  assert.equal(op.risk, "high");
  assert.equal(op.diff, undefined);
  assert.match(
    op.reason,
    /ReconciliationPlan does not include exact patch data/,
  );
});

// ---------- 5: exact before/after produces unified diff ----------

test("exact before/after fields with matching file produce unified diff", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-preview-diff-"));
  try {
    const beforeText = 'import foo from "./foo";\nimport bar from "./bar";\n';
    const afterText = 'import foo from "./foo";\nimport baz from "./baz";\n';

    await writeFile(join(root, "target.ts"), beforeText, "utf8");

    const plan = makeFixturePlan([
      {
        ...sourceDeferredOp("safe_import_rewrite", "Replace bar with baz", [
          "target.ts",
        ]),
        beforeText,
        afterText,
      },
    ]);
    const planRef = makePlanRef(plan.header.artifactId);

    const preview = await buildReconciliationPreview({
      plan,
      planRef,
      repoRoot: root,
    });

    const op = preview.operations[0];
    assert.equal(op.previewable, true);
    assert.ok(op.diff, "expected diff to be generated");
    assert.equal(op.diff.format, "unified");
    assert.match(op.diff.text, /^--- a\/target\.ts/m);
    assert.match(op.diff.text, /^\+\+\+ b\/target\.ts/m);
    assert.match(op.diff.text, /^-import bar from/m);
    assert.match(op.diff.text, /^\+import baz from/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 6: current-file mismatch prevents diff ----------

test("current-file mismatch prevents diff generation", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-preview-mismatch-"));
  try {
    const beforeText = 'import foo from "./foo";\n';
    const afterText = 'import baz from "./baz";\n';
    // Write a DIFFERENT current file content than the plan expects.
    await writeFile(join(root, "target.ts"), 'import qux from "./qux";\n', "utf8");

    const plan = makeFixturePlan([
      {
        ...sourceDeferredOp("safe_import_rewrite", "Update imports", ["target.ts"]),
        beforeText,
        afterText,
      },
    ]);
    const planRef = makePlanRef(plan.header.artifactId);

    const preview = await buildReconciliationPreview({
      plan,
      planRef,
      repoRoot: root,
    });

    const op = preview.operations[0];
    assert.equal(op.previewable, false);
    assert.equal(op.diff, undefined);
    assert.match(
      op.reason,
      /Current file content does not match expected before text/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 7: recommendation says apply is unavailable ----------

test("preview recommendation says source-write apply is unavailable", async () => {
  const plan = makeFixturePlan([
    artifactOnlyOp("docs_regeneration", "Refresh docs"),
  ]);
  const planRef = makePlanRef(plan.header.artifactId);

  const preview = await buildReconciliationPreview({ plan, planRef });

  assert.equal(preview.recommendation.applyAvailable, false);
  assert.match(
    preview.recommendation.message,
    /Source-write apply is not available/,
  );
});

// ---------- 8: CLI --json returns structured preview ----------

test("CLI reconcile preview --json returns the structured preview", async () => {
  await withCliFixture(async (root, planRef) => {
    const result = runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);

    assert.equal(result.kind, "rekon.reconciliation.preview");
    assert.equal(result.planRef.type, "ReconciliationPlan");
    assert.equal(result.planRef.id, planRef.id);
    assert.ok(Array.isArray(result.operations));
    assert.ok(result.summary.total >= 1);
    assert.equal(result.recommendation.applyAvailable, false);
  });
});

// ---------- 9: CLI human output mentions apply unavailable ----------

test("CLI reconcile preview human output says source-write apply is not available", async () => {
  await withCliFixture(async (root, planRef) => {
    const result = runCli([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
    ]);

    assert.match(result.stdout, /Reconciliation preview/);
    assert.match(result.stdout, /Plan: ReconciliationPlan:/);
    assert.match(result.stdout, /Source-write apply is not available/);
  });
});

// ---------- 10: CLI refuses missing --plan ----------

test("CLI reconcile preview without --plan fails clearly", async () => {
  await withCliFixture(async (root) => {
    const failure = runCliExpectFailure([
      "reconcile",
      "preview",
      "--root",
      root,
      "--json",
    ]);

    assert.match(failure.stderr, /requires --plan/);
  });
});

// ---------- 11: preview does not mutate source files ----------

test("CLI reconcile preview does not mutate any source files in the fixture", async () => {
  await withCliFixture(async (root, planRef) => {
    const before = await captureRepoSnapshot(root);

    runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);

    const after = await captureRepoSnapshot(root);

    // Compare source-only entries (skip .rekon).
    const beforeSources = filterSources(before);
    const afterSources = filterSources(after);
    assert.deepEqual(
      afterSources,
      beforeSources,
      "source files changed after reconcile preview",
    );
  });
});

// ---------- 12: preview does not write new artifacts ----------

test("CLI reconcile preview does not write any new artifacts", async () => {
  await withCliFixture(async (root, planRef) => {
    const beforeIndex = await readFile(
      join(root, ".rekon/registry/artifacts.index.json"),
      "utf8",
    );
    const beforeListing = await listArtifactFiles(root);

    runCliJson([
      "reconcile",
      "preview",
      "--plan",
      `${planRef.type}:${planRef.id}`,
      "--root",
      root,
      "--json",
    ]);

    const afterIndex = await readFile(
      join(root, ".rekon/registry/artifacts.index.json"),
      "utf8",
    );
    const afterListing = await listArtifactFiles(root);

    assert.equal(afterIndex, beforeIndex, "artifact index changed after preview");
    assert.deepEqual(afterListing, beforeListing, "artifact files changed after preview");
  });
});

// ---------- 13: artifacts validate stays clean ----------

test("artifacts validate stays clean after reconcile preview", async () => {
  await withCliFixture(async (root, planRef) => {
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
      `validate issues: ${JSON.stringify(validation.issues)}`,
    );
  });
});

// ---------- helpers ----------

function makeFixturePlan(operations) {
  const artifactId = `reconciliation-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    header: {
      artifactType: "ReconciliationPlan",
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "fixture" },
      producer: { id: "@rekon/capability-reconcile-test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: { confidence: 1, notes: ["Test fixture plan"] },
    },
    dryRun: true,
    operations,
  };
}

function makePlanRef(id) {
  return {
    type: "ReconciliationPlan",
    id,
    path: `.rekon/artifacts/actions/ReconciliationPlan-${id}.json`,
    digest: "sha256-fixture",
    schemaVersion: "0.1.0",
  };
}

function artifactOnlyOp(name, action) {
  return {
    operation: name,
    class: "artifact-only",
    status: "planned",
    suggestedAction: action,
    findingId: "fixture-finding",
    reason: "Artifact-only fixture operation.",
  };
}

function sourceDeferredOp(name, action, files) {
  return {
    operation: name,
    class: "source-write-deferred",
    status: "deferred",
    suggestedAction: action,
    findingId: "fixture-finding",
    files,
    requiresPermission: ["write:source"],
    reason: "Source-write deferred fixture.",
  };
}

function manualReviewOp(action) {
  return {
    operation: "manual_review",
    class: "manual-review",
    status: "deferred",
    suggestedAction: action,
    findingId: "fixture-finding",
    reason: "Ambiguous remediation.",
  };
}

async function withCliFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-reconcile-preview-cli-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    runCliJson(["refresh", "--root", root, "--json"]);
    const planRef = await seedReconciliationPlan(root);
    await callback(root, planRef);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedReconciliationPlan(root) {
  // Use the canonical artifact store API to write the fixture plan so the
  // digest + index + on-disk JSON all line up exactly the way the store
  // expects (otherwise `artifacts validate` would flag a digest mismatch).
  const { createLocalArtifactStore } = await import(
    "../../packages/runtime/dist/index.js"
  );

  const store = createLocalArtifactStore(root);
  await store.init();

  const artifactId = `reconciliation-plan-test-${Date.now()}`;
  const plan = makeFixturePlan([
    artifactOnlyOp("docs_regeneration", "Refresh docs"),
    sourceDeferredOp("safe_import_rewrite", "Update imports", ["src/index.ts"]),
  ]);
  plan.header.artifactId = artifactId;

  return await store.write(plan);
}

async function captureRepoSnapshot(root) {
  const results = new Map();
  await walk(root);
  return results;

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(root, full);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const st = await stat(full);
        results.set(rel, { size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  }
}

function filterSources(snapshot) {
  const out = {};
  for (const [rel, meta] of snapshot.entries()) {
    if (rel.startsWith(".rekon/")) continue;
    out[rel] = meta.size;
  }
  return out;
}

async function listArtifactFiles(root) {
  const out = [];
  const base = join(root, ".rekon/artifacts");
  try {
    await walk(base);
  } catch {
    return [];
  }
  out.sort();
  return out;

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(relative(root, full));
      }
    }
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

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(
    result.status,
    0,
    `expected non-zero exit; stdout: ${result.stdout}; stderr: ${result.stderr}`,
  );
  return result;
}
