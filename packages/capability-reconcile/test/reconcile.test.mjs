import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import reconcileCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("reconciliation dry-run writes plan and logs", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-reconcile-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [reconcileCapability],
    });
    await runtime.runSnapshot();
    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-reconcile.actuator",
      input: { operations: ["docs_regeneration"], dryRun: true },
    });
    const plan = await runtime.artifacts.read(refs[0]);

    assert.deepEqual(refs.map((ref) => ref.type), ["ReconciliationPlan", "ReconciliationLog", "ActionLog"]);
    assert.equal(plan.operations[0].status, "planned");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation denies source-writing operations by default", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-reconcile-deny-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [reconcileCapability],
    });

    await assert.rejects(
      runtime.runAct({
        actuatorId: "@rekon/capability-reconcile.actuator",
        input: { operations: ["safe_import_rewrite"] },
      }),
      /requires denied source or command permissions/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
