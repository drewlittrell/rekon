import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import graphCapability from "../../packages/capability-graph/dist/index.js";
import jsTsCapability from "../../packages/capability-js-ts/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

test("JS/TS evidence projects route-handler-service calls and entry reachability", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-call-reachability-"));
  try {
    await mkdir(join(root, "app", "api", "users"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "call-fixture", main: "./dist/index.js" }));
    await writeFile(join(root, "src", "index.ts"), "export { listUsers } from './user-service.js';\n");
    await writeFile(join(root, "src", "user-service.ts"), [
      "import * as prisma from '@prisma/client';",
      "export function listUsers() { events.emit('users.loaded'); return prisma.user.findMany(); }",
      "export function guarded() { try { return listUsers(); } catch (error) { throw error; } }",
    ].join("\n"));
    await writeFile(join(root, "app", "api", "users", "route.ts"), [
      "import { listUsers } from '../../../src/user-service.js';",
      "export function GET() { return listUsers(); }",
    ].join("\n"));

    const runtime = await createRuntime({ repoRoot: root, capabilities: [jsTsCapability, graphCapability] });
    await runtime.runObserve();
    const refs = await runtime.runProject({ projectorId: "@rekon/capability-graph.projector" });
    const slices = await Promise.all(refs.map((ref) => runtime.artifacts.read(ref)));
    const byName = (name) => slices.find((slice) => slice.header.artifactId.startsWith(`${name}-`));
    const calls = byName("call-graph");
    const reachability = byName("reachability-graph");
    const behavior = byName("behavior-graph");

    assert.ok(calls.edges.some((edge) =>
      edge.source === "callable:app/api/users/route.ts#GET"
      && edge.target === "callable:src/user-service.ts#listUsers"
      && edge.kind === "calls"));
    assert.ok(reachability.edges.some((edge) =>
      edge.source === "entry:route:app/api/users/route.ts"
      && edge.target === "callable:app/api/users/route.ts#GET"
      && edge.kind === "handles"));
    assert.ok(reachability.edges.some((edge) =>
      edge.source === "entry:route:app/api/users/route.ts"
      && edge.target === "src/user-service.ts"
      && edge.kind === "reaches"));
    assert.ok(behavior.edges.some((edge) => edge.kind === "emits" && edge.target === "event:users.loaded"));
    assert.ok(behavior.edges.some((edge) => edge.kind === "accesses" && edge.target === "state:@prisma/client"));
    assert.ok(behavior.edges.some((edge) => edge.kind === "propagates_error" && edge.metadata.action === "rethrow"));
    assert.equal(calls.edges.some((edge) => edge.kind === "observed"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
