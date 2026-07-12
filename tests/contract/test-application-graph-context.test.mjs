import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import graphCapability from "../../packages/capability-graph/dist/index.js";
import jsTsCapability from "../../packages/capability-js-ts/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

test("JS/TS evidence projects deterministic test context for routes and screens", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-test-context-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await mkdir(join(root, "app", "api", "users"), { recursive: true });
    await mkdir(join(root, "app", "users"), { recursive: true });
    await writeFile(join(root, "src", "user-service.ts"), "export const loadUser = () => ({ id: 1 });\n", "utf8");
    await writeFile(join(root, "tests", "user.test.ts"), [
      "import test from 'node:test';",
      "import { loadUser } from '../src/user-service.js';",
      "test('loads user', () => loadUser());",
    ].join("\n"), "utf8");
    await writeFile(join(root, "app", "api", "users", "route.ts"), [
      "import { loadUser } from '../../../src/user-service.js';",
      "export function GET() { return Response.json(loadUser()); }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "app", "users", "page.tsx"), [
      "import { loadUser } from '../../src/user-service.js';",
      "export default function Page() { return <main>{loadUser().id}</main>; }",
    ].join("\n"), "utf8");

    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "test-context-fixture",
      capabilities: [jsTsCapability, graphCapability],
      logger: { info() {}, warn() {}, error() {} },
    });
    await runtime.runObserve({ includeTests: true });
    const refs = await runtime.runProject({ projectorId: "@rekon/capability-graph.projector" });
    const applicationGraph = await runtime.artifacts.read(refs[3]);
    const testNode = "test:tests/user.test.ts";

    assert.equal(applicationGraph.edges.some((edge) =>
      edge.source === testNode
      && edge.target === "src/user-service.ts"
      && edge.kind === "depends_on"), true);
    assert.equal(applicationGraph.edges.some((edge) =>
      edge.source === testNode
      && edge.kind === "related_to"
      && edge.target.startsWith("route:")
      && edge.metadata.relationship === "shared-dependency"), true);
    assert.equal(applicationGraph.edges.some((edge) =>
      edge.source === testNode
      && edge.kind === "related_to"
      && edge.target.startsWith("screen:")), true);
    assert.equal(applicationGraph.edges.some((edge) =>
      edge.source === testNode
      && edge.target === "capability:src"
      && edge.kind === "related_to"), true);
    assert.equal(applicationGraph.edges.some((edge) => edge.kind === "covers"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
