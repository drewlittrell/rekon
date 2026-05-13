import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import docsCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("docs publisher writes metadata-bearing publication artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-docs-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [docsCapability],
    });
    const snapshotRef = await runtime.runSnapshot();
    const refs = await runtime.runPublish();

    assert.deepEqual(refs.map((ref) => ref.type), ["Publication", "Publication"]);

    const agents = await runtime.artifacts.read(refs[0]);
    assert.equal(agents.header.artifactType, "Publication");
    assert.equal(agents.header.snapshotId, snapshotRef.id);
    assert.equal(agents.kind, "agents");
    assert.match(agents.content, /Docs are publications, not canonical truth/);
    assert.equal(agents.header.inputRefs[0].type, "IntelligenceSnapshot");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
