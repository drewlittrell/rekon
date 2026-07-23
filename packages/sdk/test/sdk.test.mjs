import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCapabilityConforms,
  createCapabilityRegistry,
  defineCapability,
  resolveArtifactLineage,
  validateCapability,
} from "../dist/index.js";

const provider = {
  id: "sample.provider",
  kind: "language",
  supports() {
    return true;
  },
  async extract() {
    return [];
  },
};

function sampleCapability(overrides = {}) {
  return defineCapability({
    manifest: {
      id: "@rekon/capability-sample",
      name: "Sample Capability",
      version: "0.1.0",
      roles: ["evidence-provider"],
      consumes: ["SourceFile"],
      produces: ["EvidenceGraph"],
      permissions: ["read:source", "write:artifacts"],
      invalidatedBy: [
        {
          id: "source.changed",
          paths: ["**/*"],
        },
      ],
      compatibility: {
        rekon: "^0.1.0",
      },
      ...overrides.manifest,
    },
    register(registry) {
      if (overrides.register) {
        overrides.register(registry);
        return;
      }

      registry.evidenceProvider(provider);
    },
  });
}

function artifact(type, id, inputRefs = []) {
  return {
    header: {
      artifactType: type,
      artifactId: id,
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-22T20:00:00.000Z",
      subject: { repoId: "rekon" },
      producer: { id: "@rekon/test", version: "1.0.0" },
      inputRefs,
    },
  };
}

function ref(type, id) {
  return { type, id, schemaVersion: "0.1.0" };
}

test("artifact lineage resolves shared root observations without double counting", async () => {
  const root = ref("VerificationRun", "run-1");
  const first = ref("VerificationResult", "result-1");
  const second = ref("ProofGateReport", "proof-1");
  const values = new Map([
    ["VerificationRun:run-1:0.1.0", artifact("VerificationRun", "run-1")],
    ["VerificationResult:result-1:0.1.0", artifact("VerificationResult", "result-1", [root])],
    ["ProofGateReport:proof-1:0.1.0", artifact("ProofGateReport", "proof-1", [root])],
  ]);
  const artifacts = {
    async read(artifactRef) {
      const value = values.get(`${artifactRef.type}:${artifactRef.id}:${artifactRef.schemaVersion}`);
      if (!value) throw new Error("missing fixture");
      return value;
    },
    async list() {
      return [];
    },
  };

  const lineage = await resolveArtifactLineage(artifacts, [first, second]);

  assert.equal(lineage.complete, true);
  assert.equal(lineage.visitedArtifacts, 3);
  assert.deepEqual(lineage.roots, [{ key: "VerificationRun:run-1:0.1.0", ref: root, seedRefs: [second, first] }]);
  assert.deepEqual(lineage.sharedRootKeys, ["VerificationRun:run-1:0.1.0"]);
});

test("artifact lineage fails closed on cycles", async () => {
  const first = ref("Artifact", "first");
  const second = ref("Artifact", "second");
  const values = new Map([
    ["Artifact:first:0.1.0", artifact("Artifact", "first", [second])],
    ["Artifact:second:0.1.0", artifact("Artifact", "second", [first])],
  ]);
  const lineage = await resolveArtifactLineage({
    async read(artifactRef) {
      return values.get(`${artifactRef.type}:${artifactRef.id}:${artifactRef.schemaVersion}`);
    },
    async list() {
      return [];
    },
  }, [first]);

  assert.equal(lineage.complete, false);
  assert.ok(lineage.issues.some((issue) => issue.code === "cycle-detected"));
});

test("SDK registers multiple capabilities and exposes a registry snapshot", () => {
  const registry = createCapabilityRegistry();

  registry.use(sampleCapability());
  registry.use(sampleCapability({
    manifest: {
      id: "@rekon/capability-other",
    },
    register(capabilityRegistry) {
      capabilityRegistry.evidenceProvider({
        ...provider,
        id: "other.provider",
      });
    },
  }));

  const snapshot = registry.snapshot();

  assert.deepEqual(
    snapshot.capabilities.map((capability) => capability.manifest.id),
    ["@rekon/capability-sample", "@rekon/capability-other"],
  );
  assert.deepEqual(
    snapshot.evidenceProviders.map((registeredProvider) => registeredProvider.id),
    ["sample.provider", "other.provider"],
  );
});

test("duplicate capability IDs fail validation", () => {
  const registry = createCapabilityRegistry();

  registry.use(sampleCapability());

  assert.throws(
    () => registry.use(sampleCapability()),
    /already registered/,
  );
});

test("duplicate handler IDs fail validation", () => {
  const registry = createCapabilityRegistry();

  registry.use(sampleCapability());

  assert.throws(
    () => registry.use(sampleCapability({
      manifest: {
        id: "@rekon/capability-other",
      },
      register(capabilityRegistry) {
        capabilityRegistry.evidenceProvider(provider);
      },
    })),
    /Handler sample.provider is already registered/,
  );
});

test("capability roles must match registered handlers", () => {
  const registry = createCapabilityRegistry();

  assert.throws(
    () => registry.use(sampleCapability({
      manifest: {
        roles: ["resolver"],
        produces: ["ResolverPacket"],
      },
    })),
    /registered evidence-provider, but its manifest does not declare that role/,
  );

  assert.throws(
    () => registry.use(sampleCapability({
      manifest: {
        id: "@rekon/capability-no-handler",
      },
      register() {},
    })),
    /declares evidence-provider but registered no handler/,
  );
});

test("capabilities cannot produce undeclared artifact types from handlers", () => {
  const registry = createCapabilityRegistry();

  assert.throws(
    () => registry.use(sampleCapability({
      manifest: {
        roles: ["resolver"],
        produces: ["ResolverPacket"],
      },
      register(capabilityRegistry) {
        capabilityRegistry.resolver({
          id: "sample.resolver",
          produces: ["FindingReport"],
          async resolve() {
            return [];
          },
        });
      },
    })),
    /does not declare/,
  );
});

test("capabilities can register custom artifact types they produce", () => {
  const registry = createCapabilityRegistry();

  registry.use(sampleCapability({
    manifest: {
      roles: ["resolver"],
      produces: ["TodoReport"],
    },
    register(capabilityRegistry) {
      capabilityRegistry.artifactType({
        type: "TodoReport",
        schemaVersion: "0.1.0",
      });
      capabilityRegistry.resolver({
        id: "todo.resolver",
        produces: ["TodoReport"],
        async resolve() {
          return [];
        },
      });
    },
  }));

  assert.equal(
    registry.snapshot().artifactTypes.some((artifactType) => artifactType.type === "TodoReport"),
    true,
  );
});

test("capabilities cannot request unknown permissions", () => {
  assert.throws(
    () => sampleCapability({
      manifest: {
        permissions: ["read:source", "root:everything"],
      },
    }),
    /Unknown capability permission/,
  );
});

test("capabilities must declare permissions before registration", () => {
  assert.throws(
    () => defineCapability({
      manifest: {
        id: "@rekon/capability-no-permissions",
        name: "No Permissions",
        version: "0.1.0",
        roles: ["evidence-provider"],
        consumes: ["SourceFile"],
        produces: ["EvidenceGraph"],
        compatibility: {
          rekon: "^0.1.0",
        },
      },
      register(registry) {
        registry.evidenceProvider(provider);
      },
    }),
    /manifest.permissions/,
  );

  assert.throws(
    () => sampleCapability({
      manifest: {
        permissions: [],
      },
    }),
    /manifest.permissions must declare at least one permission/,
  );
});

test("validateCapability reports conformance issues without throwing", () => {
  const result = validateCapability(sampleCapability({
    manifest: {
      invalidatedBy: [],
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "manifest.invalidation_missing");
});

test("assertCapabilityConforms runs evidence providers when context is supplied", async () => {
  await assertCapabilityConforms(sampleCapability(), {
    providerContext: {
      repoRoot: process.cwd(),
      includeTests: false,
    },
  });
});

test("assertCapabilityConforms validates handler output headers", async () => {
  const capability = sampleCapability({
    manifest: {
      roles: ["resolver"],
      produces: ["ResolverPacket"],
    },
    register(capabilityRegistry) {
      capabilityRegistry.resolver({
        id: "sample.resolver",
        produces: ["ResolverPacket"],
        async resolve({ artifacts }) {
          return [
            await artifacts.write("ResolverPacket", {
              header: {
                artifactType: "ResolverPacket",
                artifactId: "packet-1",
                schemaVersion: "0.1.0",
                generatedAt: new Date().toISOString(),
                subject: {
                  repoId: "repo",
                },
                producer: {
                  id: "sample.resolver",
                  version: "0.1.0",
                },
                inputRefs: [],
                provenance: {
                  confidence: 1,
                },
              },
            }),
          ];
        },
      });
    },
  });

  const writes = [];
  await assertCapabilityConforms(capability, {
    artifacts: {
      async read() {
        return {};
      },
      async list() {
        return [];
      },
      async write(type, artifact) {
        writes.push({ type, artifact });
        return {
          type,
          id: artifact.header.artifactId,
          schemaVersion: artifact.header.schemaVersion,
        };
      },
    },
  });

  assert.equal(writes.length, 1);
});

test("assertCapabilityConforms rejects sloppy output headers", async () => {
  const capability = sampleCapability({
    manifest: {
      roles: ["resolver"],
      produces: ["ResolverPacket"],
    },
    register(capabilityRegistry) {
      capabilityRegistry.resolver({
        id: "bad.resolver",
        produces: ["ResolverPacket"],
        async resolve({ artifacts }) {
          return [
            await artifacts.write("ResolverPacket", {
              header: {
                artifactType: "ResolverPacket",
                artifactId: "packet-1",
                schemaVersion: "0.1.0",
                generatedAt: new Date().toISOString(),
                subject: {
                  repoId: "repo",
                },
                producer: {
                  id: "bad.resolver",
                  version: "0.1.0",
                },
                inputRefs: [],
              },
            }),
          ];
        },
      });
    },
  });

  await assert.rejects(
    assertCapabilityConforms(capability, {
      artifacts: {
        async read() {
          return {};
        },
        async list() {
          return [];
        },
        async write(type, artifact) {
          return {
            type,
            id: artifact.header.artifactId,
            schemaVersion: artifact.header.schemaVersion,
          };
        },
      },
    }),
    /header.provenance is required/,
  );
});
