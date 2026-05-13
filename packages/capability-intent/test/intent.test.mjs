import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import intentCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("intent capability creates work orders from resolver packets", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-intent-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [intentCapability],
    });
    const preflightRef = await runtime.artifacts.write({
      header: {
        artifactType: "ResolverPacket",
        artifactId: "preflight-1",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "repo", paths: ["src/index.ts"] },
        producer: { id: "test", version: "0.1.0" },
        inputRefs: [],
        provenance: { confidence: 1 },
      },
      goal: "modify bootstrap",
      paths: ["src/index.ts"],
      ownerSystems: ["src"],
      risk: { tier: "low", reasons: [] },
      requiredChecks: ["npm run test"],
      relevantFindings: [],
    });
    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-intent.work-order",
      input: { preflightRef },
    });

    assert.deepEqual(refs.map((ref) => ref.type), ["IntentMap", "WorkOrder", "VerificationPlan"]);

    const workOrder = await runtime.artifacts.read(refs[1]);
    assert.equal(workOrder.requiredChecks[0], "npm run test");
    assert.match(workOrder.markdown, /Do not bypass failing checks/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
