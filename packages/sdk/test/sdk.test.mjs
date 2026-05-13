import assert from "node:assert/strict";
import test from "node:test";

import {
  createCapabilityRegistry,
  defineCapability,
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
