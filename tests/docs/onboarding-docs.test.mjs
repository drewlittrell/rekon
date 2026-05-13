import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const docs = {
  readme: "../../README.md",
  firstTen: "../../docs/getting-started/first-10-minutes.md",
  authoring: "../../docs/extensions/authoring-capabilities.md",
  manifest: "../../docs/extensions/capability-manifest.md",
  security: "../../docs/extensions/security-model.md",
  artifacts: "../../docs/artifacts/index.md",
  resolverPacket: "../../docs/artifacts/resolver-packet.md",
  resolvers: "../../docs/concepts/resolvers.md",
  customCapability: "../../examples/custom-capability/README.md",
  contributing: "../../CONTRIBUTING.md",
};

test("alpha onboarding docs expose the primary user path", async () => {
  const readme = await read(docs.readme);
  const firstTen = await read(docs.firstTen);

  for (const content of [readme, firstTen]) {
    includes(content, "node packages/cli/dist/index.js init --root examples/simple-js-ts");
    includes(content, "node packages/cli/dist/index.js observe --root examples/simple-js-ts --json");
    includes(content, "node packages/cli/dist/index.js project --root examples/simple-js-ts --json");
    includes(content, "node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json");
    includes(content, "node packages/cli/dist/index.js resolve preflight");
    includes(content, "node packages/cli/dist/index.js publish agents --root examples/simple-js-ts");
  }

  includes(readme, "Observe -> Project -> Snapshot -> Evaluate -> Resolve -> Publish -> Learn -> Act");
  includes(firstTen, "resolutionTrace");
  includes(firstTen, "node packages/cli/dist/index.js memory add");
  includes(firstTen, "node packages/cli/dist/index.js intent work-order");
  includes(firstTen, "node packages/cli/dist/index.js reconcile");
});

test("extension docs cover manifest, permissions, conformance, and external loading", async () => {
  const combined = [
    await read(docs.authoring),
    await read(docs.manifest),
    await read(docs.security),
    await read(docs.customCapability),
  ].join("\n");

  for (const role of [
    "evidence-provider",
    "projector",
    "evaluator",
    "resolver",
    "publisher",
    "learner",
    "actuator",
  ]) {
    includes(combined, role);
  }

  for (const phrase of [
    "validateCapability",
    "assertCapabilityConforms",
    "consumes",
    "produces",
    "permissions",
    ".rekon/config.json",
    "write:source",
  ]) {
    includes(combined, phrase);
  }
});

test("artifact and resolver docs explain provenance and traceability", async () => {
  const combined = [
    await read(docs.artifacts),
    await read(docs.resolverPacket),
    await read(docs.resolvers),
  ].join("\n");

  for (const phrase of [
    "ArtifactHeader",
    "producer",
    "inputRefs",
    "provenance",
    "resolutionTrace",
    "OwnershipMap -> ObservedRepo -> ownership GraphSlice -> EvidenceGraph",
    "fallback",
    "risk.evaluate",
  ]) {
    includes(combined, phrase);
  }
});

test("contributing docs state public API and security expectations", async () => {
  const contributing = await read(docs.contributing);

  for (const phrase of [
    "Public API Changes",
    "Changelog Expectations",
    "Authoring Capabilities",
    "Security Notes",
    "Codex and Agent Contributions",
    "git diff --check",
  ]) {
    includes(contributing, phrase);
  }
});

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function includes(content, expected) {
  assert.ok(content.includes(expected), `Expected docs to include: ${expected}`);
}
