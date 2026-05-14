import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { EvidenceProvider } from "@rekon/kernel-evidence";

export type CapabilityRole =
  | "evidence-provider"
  | "projector"
  | "evaluator"
  | "resolver"
  | "publisher"
  | "actuator"
  | "learner";

export type CapabilityPermission =
  | "read:source"
  | "read:artifacts"
  | "write:artifacts"
  | "write:source"
  | "execute:commands"
  | "network:outbound";

export type InvalidationRule = {
  id: string;
  description?: string;
  inputs?: string[];
  paths?: string[];
  events?: string[];
};

export type CapabilityManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  roles: CapabilityRole[];
  consumes: string[];
  produces: string[];
  permissions?: CapabilityPermission[];
  invalidatedBy?: InvalidationRule[];
  compatibility: {
    rekon: string;
    artifactSchemas?: Record<string, string>;
  };
};

export type ArtifactTypeDefinition = {
  type: string;
  schemaVersion: string;
  description?: string;
  stability?: "stable" | "experimental" | "internal" | "deprecated";
};

export type ArtifactReader = {
  read(ref: ArtifactRef): Promise<unknown>;
  list(type?: string): Promise<ArtifactRef[]>;
};

export type ArtifactWriter = {
  write(type: string, artifact: unknown): Promise<ArtifactRef>;
};

export type Projector = {
  id: string;
  produces: string[];
  project(input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]>;
};

export type Evaluator = {
  id: string;
  produces: string[];
  evaluate(input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]>;
};

export type Resolver = {
  id: string;
  produces: string[];
  resolve(input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]>;
};

export type Publisher = {
  id: string;
  produces: string[];
  publish(input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]>;
};

export type Actuator = {
  id: string;
  produces: string[];
  act(input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]>;
};

export type Learner = {
  id: string;
  produces: string[];
  learn(input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]>;
};

export interface CapabilityRegistry {
  artifactType(definition: ArtifactTypeDefinition): void;
  evidenceProvider(provider: EvidenceProvider): void;
  projector(projector: Projector): void;
  evaluator(evaluator: Evaluator): void;
  resolver(resolver: Resolver): void;
  publisher(publisher: Publisher): void;
  actuator(actuator: Actuator): void;
  learner(learner: Learner): void;
}

export type CapabilityDefinition = {
  manifest: CapabilityManifest;
  register(registry: CapabilityRegistry): void;
};

export type RegisteredCapability = {
  manifest: CapabilityManifest;
  artifactTypes: ArtifactTypeDefinition[];
  evidenceProviders: EvidenceProvider[];
  projectors: Projector[];
  evaluators: Evaluator[];
  resolvers: Resolver[];
  publishers: Publisher[];
  actuators: Actuator[];
  learners: Learner[];
};

export type CapabilityRegistrySnapshot = {
  artifactTypes: ArtifactTypeDefinition[];
  capabilities: RegisteredCapability[];
  evidenceProviders: EvidenceProvider[];
  projectors: Projector[];
  evaluators: Evaluator[];
  resolvers: Resolver[];
  publishers: Publisher[];
  actuators: Actuator[];
  learners: Learner[];
};

export type RuntimeCapabilityRegistry = CapabilityRegistry & {
  use(capability: CapabilityDefinition): RegisteredCapability;
  snapshot(): CapabilityRegistrySnapshot;
};

export type CapabilityValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type CapabilityValidationResult =
  | {
    ok: true;
    registered: RegisteredCapability;
    issues: [];
  }
  | {
    ok: false;
    issues: CapabilityValidationIssue[];
  };

export type CapabilityConformanceTestContext = {
  providerContext?: import("@rekon/kernel-evidence").ProviderContext;
  artifacts?: ArtifactReader & ArtifactWriter;
  input?: Record<string, unknown>;
  handlers?: string[];
};

const VALID_ROLES = new Set<CapabilityRole>([
  "evidence-provider",
  "projector",
  "evaluator",
  "resolver",
  "publisher",
  "actuator",
  "learner",
]);

const VALID_PERMISSIONS = new Set<CapabilityPermission>([
  "read:source",
  "read:artifacts",
  "write:artifacts",
  "write:source",
  "execute:commands",
  "network:outbound",
]);

const BUILT_IN_ARTIFACT_TYPES: ArtifactTypeDefinition[] = [
  { type: "EvidenceGraph", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "IntelligenceSnapshot", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "ObservedRepo", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "OwnershipMap", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "CapabilityMap", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "GraphSlice", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "Rulebook", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "FindingReport", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "ResolverPacket", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "Publication", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "OperatorFeedbackEntry", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "MemoryEvent", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "ContextUsageEvent", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "OutcomeEvent", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "MemorySelection", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "MemoryUsageLedger", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "MemoryCurationReport", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "IntentMap", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "WorkOrder", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "VerificationPlan", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "VerificationResult", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "ReconciliationPlan", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "ReconciliationLog", schemaVersion: "0.1.0", stability: "experimental" },
  { type: "ActionLog", schemaVersion: "0.1.0", stability: "experimental" },
];

export function defineCapability(definition: CapabilityDefinition): CapabilityDefinition {
  validateManifest(definition.manifest);

  if (typeof definition.register !== "function") {
    throw new TypeError("Capability register must be a function.");
  }

  return definition;
}

export function validateCapability(capability: CapabilityDefinition): CapabilityValidationResult {
  try {
    const registry = createCapabilityRegistry();
    const registered = registry.use(capability);
    const issues = validateRegisteredCapability(registered, registry.snapshot().artifactTypes);

    if (issues.length > 0) {
      return { ok: false, issues };
    }

    return { ok: true, registered, issues: [] };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: "capability.registration_failed",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

export async function assertCapabilityConforms(
  capability: CapabilityDefinition,
  testContext: CapabilityConformanceTestContext = {},
): Promise<RegisteredCapability> {
  const result = validateCapability(capability);

  if (!result.ok) {
    throw new Error(formatCapabilityIssues(capability.manifest?.id ?? "unknown", result.issues));
  }

  await runConformanceHandlers(result.registered, testContext);

  return result.registered;
}

export function createCapabilityRegistry(): RuntimeCapabilityRegistry {
  const artifactTypes = new Map<string, ArtifactTypeDefinition>();
  const capabilities = new Map<string, RegisteredCapability>();
  const handlerIds = new Map<string, string>();

  for (const definition of BUILT_IN_ARTIFACT_TYPES) {
    artifactTypes.set(definition.type, definition);
  }

  let activeCapability: MutableRegisteredCapability | null = null;

  const registry: RuntimeCapabilityRegistry = {
    artifactType(definition) {
      validateArtifactTypeDefinition(definition);
      ensureActiveCapability(activeCapability);
      ensureUniqueArtifactType(artifactTypes, definition.type);
      artifactTypes.set(definition.type, definition);
      activeCapability.artifactTypes.push(definition);
    },
    evidenceProvider(provider) {
      ensureActiveCapability(activeCapability);
      ensureRoleAllowed(activeCapability.manifest, "evidence-provider");
      ensureHandlerId(handlerIds, provider.id, activeCapability.manifest.id);
      activeCapability.evidenceProviders.push(provider);
    },
    projector(projector) {
      const capability = registerProducedHandler(activeCapability, handlerIds, "projector", projector, projector.produces);
      capability.projectors.push(projector);
    },
    evaluator(evaluator) {
      const capability = registerProducedHandler(activeCapability, handlerIds, "evaluator", evaluator, evaluator.produces);
      capability.evaluators.push(evaluator);
    },
    resolver(resolver) {
      const capability = registerProducedHandler(activeCapability, handlerIds, "resolver", resolver, resolver.produces);
      capability.resolvers.push(resolver);
    },
    publisher(publisher) {
      const capability = registerProducedHandler(activeCapability, handlerIds, "publisher", publisher, publisher.produces);
      capability.publishers.push(publisher);
    },
    actuator(actuator) {
      const capability = registerProducedHandler(activeCapability, handlerIds, "actuator", actuator, actuator.produces);
      capability.actuators.push(actuator);
    },
    learner(learner) {
      const capability = registerProducedHandler(activeCapability, handlerIds, "learner", learner, learner.produces);
      capability.learners.push(learner);
    },
    use(capability) {
      const definition = defineCapability(capability);

      if (capabilities.has(definition.manifest.id)) {
        throw new Error(`Capability ${definition.manifest.id} is already registered.`);
      }

      const registered: MutableRegisteredCapability = {
        manifest: definition.manifest,
        artifactTypes: [],
        evidenceProviders: [],
        projectors: [],
        evaluators: [],
        resolvers: [],
        publishers: [],
        actuators: [],
        learners: [],
      };

      activeCapability = registered;

      try {
        definition.register(registry);
      } finally {
        activeCapability = null;
      }

      ensureManifestRolesHaveHandlers(registered);
      ensureManifestProducesKnownArtifacts(registered, artifactTypes);
      capabilities.set(definition.manifest.id, registered);

      return cloneRegisteredCapability(registered);
    },
    snapshot() {
      const registeredCapabilities = [...capabilities.values()].map(cloneRegisteredCapability);

      return {
        artifactTypes: [...artifactTypes.values()],
        capabilities: registeredCapabilities,
        evidenceProviders: registeredCapabilities.flatMap((capability) => capability.evidenceProviders),
        projectors: registeredCapabilities.flatMap((capability) => capability.projectors),
        evaluators: registeredCapabilities.flatMap((capability) => capability.evaluators),
        resolvers: registeredCapabilities.flatMap((capability) => capability.resolvers),
        publishers: registeredCapabilities.flatMap((capability) => capability.publishers),
        actuators: registeredCapabilities.flatMap((capability) => capability.actuators),
        learners: registeredCapabilities.flatMap((capability) => capability.learners),
      };
    },
  };

  return registry;
}

type MutableRegisteredCapability = RegisteredCapability;

type ProducedHandler = {
  id: string;
  produces: string[];
};

function validateManifest(manifest: CapabilityManifest): void {
  ensureNonEmptyString(manifest.id, "manifest.id");
  ensureNonEmptyString(manifest.name, "manifest.name");
  ensureNonEmptyString(manifest.version, "manifest.version");
  ensureStringArray(manifest.roles, "manifest.roles");
  ensureStringArray(manifest.consumes, "manifest.consumes");
  ensureStringArray(manifest.produces, "manifest.produces");

  if (!manifest.compatibility || typeof manifest.compatibility !== "object") {
    throw new TypeError("manifest.compatibility is required.");
  }

  ensureNonEmptyString(manifest.compatibility.rekon, "manifest.compatibility.rekon");

  for (const role of manifest.roles) {
    if (!VALID_ROLES.has(role as CapabilityRole)) {
      throw new Error(`Unknown capability role: ${role}`);
    }
  }

  for (const permission of manifest.permissions ?? []) {
    if (!VALID_PERMISSIONS.has(permission)) {
      throw new Error(`Unknown capability permission: ${permission}`);
    }
  }
}

function validateRegisteredCapability(
  capability: RegisteredCapability,
  artifactTypes: ArtifactTypeDefinition[],
): CapabilityValidationIssue[] {
  const issues: CapabilityValidationIssue[] = [];
  const manifest = capability.manifest;
  const artifactTypeNames = new Set(artifactTypes.map((artifactType) => artifactType.type));

  if (!manifest.permissions || manifest.permissions.length === 0) {
    issues.push({
      code: "manifest.permissions_missing",
      path: "manifest.permissions",
      message: `Capability ${manifest.id} must declare permissions.`,
    });
  }

  if (!manifest.invalidatedBy || manifest.invalidatedBy.length === 0) {
    issues.push({
      code: "manifest.invalidation_missing",
      path: "manifest.invalidatedBy",
      message: `Capability ${manifest.id} must declare invalidation rules.`,
    });
  }

  for (const [index, rule] of (manifest.invalidatedBy ?? []).entries()) {
    if (typeof rule.id !== "string" || rule.id.length === 0) {
      issues.push({
        code: "manifest.invalidation_rule_id_missing",
        path: `manifest.invalidatedBy.${index}.id`,
        message: `Capability ${manifest.id} has an invalid invalidation rule id.`,
      });
    }

    const hasSource = (rule.inputs?.length ?? 0) > 0 || (rule.paths?.length ?? 0) > 0 || (rule.events?.length ?? 0) > 0;

    if (!hasSource) {
      issues.push({
        code: "manifest.invalidation_rule_source_missing",
        path: `manifest.invalidatedBy.${index}`,
        message: `Capability ${manifest.id} invalidation rule ${rule.id} must declare inputs, paths, or events.`,
      });
    }
  }

  for (const artifactType of manifest.produces) {
    if (!artifactTypeNames.has(artifactType)) {
      issues.push({
        code: "manifest.produces_unknown_artifact",
        path: "manifest.produces",
        message: `Capability ${manifest.id} produces unknown artifact type ${artifactType}.`,
      });
    }
  }

  const handlerIssues = [
    ...capability.projectors.flatMap((handler) => validateProducedHandler(manifest.id, handler.id, handler.produces, manifest.produces, "projector")),
    ...capability.evaluators.flatMap((handler) => validateProducedHandler(manifest.id, handler.id, handler.produces, manifest.produces, "evaluator")),
    ...capability.resolvers.flatMap((handler) => validateProducedHandler(manifest.id, handler.id, handler.produces, manifest.produces, "resolver")),
    ...capability.publishers.flatMap((handler) => validateProducedHandler(manifest.id, handler.id, handler.produces, manifest.produces, "publisher")),
    ...capability.actuators.flatMap((handler) => validateProducedHandler(manifest.id, handler.id, handler.produces, manifest.produces, "actuator")),
    ...capability.learners.flatMap((handler) => validateProducedHandler(manifest.id, handler.id, handler.produces, manifest.produces, "learner")),
  ];

  return [...issues, ...handlerIssues];
}

function validateProducedHandler(
  capabilityId: string,
  handlerId: string,
  produces: string[],
  manifestProduces: string[],
  role: CapabilityRole,
): CapabilityValidationIssue[] {
  const issues: CapabilityValidationIssue[] = [];

  if (!produces || produces.length === 0) {
    issues.push({
      code: "handler.produces_missing",
      message: `${role} handler ${handlerId} in ${capabilityId} must declare produced artifact types.`,
    });
  }

  for (const artifactType of produces) {
    if (!manifestProduces.includes(artifactType)) {
      issues.push({
        code: "handler.produces_undeclared",
        message: `${role} handler ${handlerId} produces ${artifactType}, but ${capabilityId} does not declare it.`,
      });
    }
  }

  return issues;
}

async function runConformanceHandlers(
  capability: RegisteredCapability,
  testContext: CapabilityConformanceTestContext,
): Promise<void> {
  const selectedHandlers = new Set(testContext.handlers ?? []);
  const shouldRun = (handlerId: string): boolean => selectedHandlers.size === 0 || selectedHandlers.has(handlerId);

  if (testContext.providerContext) {
    for (const provider of capability.evidenceProviders.filter((handler) => shouldRun(handler.id))) {
      if (provider.supports(testContext.providerContext)) {
        const facts = await provider.extract(testContext.providerContext);
        assertEvidenceFacts(provider.id, facts);
      }
    }
  }

  if (!testContext.artifacts) {
    return;
  }

  const artifacts = createConformanceArtifactAccess(testContext.artifacts);
  const input = testContext.input;

  for (const projector of capability.projectors.filter((handler) => shouldRun(handler.id))) {
    assertRefs(projector.id, projector.produces, await projector.project({ artifacts, input }));
  }

  for (const evaluator of capability.evaluators.filter((handler) => shouldRun(handler.id))) {
    assertRefs(evaluator.id, evaluator.produces, await evaluator.evaluate({ artifacts, input }));
  }

  for (const resolver of capability.resolvers.filter((handler) => shouldRun(handler.id))) {
    assertRefs(resolver.id, resolver.produces, await resolver.resolve({ artifacts, input }));
  }

  for (const publisher of capability.publishers.filter((handler) => shouldRun(handler.id))) {
    assertRefs(publisher.id, publisher.produces, await publisher.publish({ artifacts, input }));
  }

  for (const actuator of capability.actuators.filter((handler) => shouldRun(handler.id))) {
    assertRefs(actuator.id, actuator.produces, await actuator.act({ artifacts, input }));
  }

  for (const learner of capability.learners.filter((handler) => shouldRun(handler.id))) {
    assertRefs(learner.id, learner.produces, await learner.learn({ artifacts, input }));
  }
}

function createConformanceArtifactAccess(artifacts: ArtifactReader & ArtifactWriter): ArtifactReader & ArtifactWriter {
  return {
    read: (ref) => artifacts.read(ref),
    list: (type) => artifacts.list(type),
    async write(type, artifact) {
      assertWrittenArtifactHeader(type, artifact);

      return artifacts.write(type, artifact);
    },
  };
}

function assertWrittenArtifactHeader(type: string, artifact: unknown): void {
  if (!artifact || typeof artifact !== "object" || !("header" in artifact)) {
    throw new Error(`Artifact ${type} must include a header.`);
  }

  const header = (artifact as { header?: unknown }).header;

  if (!header || typeof header !== "object") {
    throw new Error(`Artifact ${type} header must be an object.`);
  }

  const candidate = header as {
    artifactType?: unknown;
    artifactId?: unknown;
    schemaVersion?: unknown;
    generatedAt?: unknown;
    subject?: unknown;
    producer?: unknown;
    inputRefs?: unknown;
    provenance?: unknown;
  };

  ensureHeaderString(candidate.artifactType, `${type}.header.artifactType`);
  ensureHeaderString(candidate.artifactId, `${type}.header.artifactId`);
  ensureHeaderString(candidate.schemaVersion, `${type}.header.schemaVersion`);
  ensureHeaderString(candidate.generatedAt, `${type}.header.generatedAt`);

  if (candidate.artifactType !== type) {
    throw new Error(`Artifact header type ${String(candidate.artifactType)} does not match write type ${type}.`);
  }

  if (!candidate.subject || typeof candidate.subject !== "object") {
    throw new Error(`Artifact ${type} header.subject is required.`);
  }

  if (!candidate.producer || typeof candidate.producer !== "object") {
    throw new Error(`Artifact ${type} header.producer is required.`);
  }

  const producer = candidate.producer as { id?: unknown; version?: unknown };
  ensureHeaderString(producer.id, `${type}.header.producer.id`);
  ensureHeaderString(producer.version, `${type}.header.producer.version`);

  if (!Array.isArray(candidate.inputRefs)) {
    throw new Error(`Artifact ${type} header.inputRefs must be an array.`);
  }

  if (!candidate.provenance || typeof candidate.provenance !== "object") {
    throw new Error(`Artifact ${type} header.provenance is required.`);
  }
}

function assertEvidenceFacts(providerId: string, facts: unknown): void {
  if (!Array.isArray(facts)) {
    throw new Error(`Evidence provider ${providerId} must return an array of facts.`);
  }

  for (const [index, fact] of facts.entries()) {
    if (!fact || typeof fact !== "object") {
      throw new Error(`Evidence provider ${providerId} fact ${index} must be an object.`);
    }

    const candidate = fact as { id?: unknown; kind?: unknown; subject?: unknown; confidence?: unknown; provenance?: unknown };
    ensureHeaderString(candidate.id, `${providerId}.facts.${index}.id`);
    ensureHeaderString(candidate.kind, `${providerId}.facts.${index}.kind`);
    ensureHeaderString(candidate.subject, `${providerId}.facts.${index}.subject`);

    if (typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1) {
      throw new Error(`Evidence provider ${providerId} fact ${index} confidence must be between 0 and 1.`);
    }

    if (!candidate.provenance || typeof candidate.provenance !== "object") {
      throw new Error(`Evidence provider ${providerId} fact ${index} provenance is required.`);
    }
  }
}

function assertRefs(handlerId: string, produces: string[], refs: ArtifactRef[]): void {
  if (!Array.isArray(refs)) {
    throw new Error(`Handler ${handlerId} must return ArtifactRef[].`);
  }

  for (const ref of refs) {
    ensureHeaderString(ref.type, `${handlerId}.ref.type`);
    ensureHeaderString(ref.id, `${handlerId}.ref.id`);
    ensureHeaderString(ref.schemaVersion, `${handlerId}.ref.schemaVersion`);

    if (!produces.includes(ref.type)) {
      throw new Error(`Handler ${handlerId} returned ${ref.type}, but declares ${produces.join(", ")}.`);
    }
  }
}

function ensureHeaderString(value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }
}

function formatCapabilityIssues(capabilityId: string, issues: CapabilityValidationIssue[]): string {
  return [
    `Capability ${capabilityId} failed conformance validation:`,
    ...issues.map((issue) => `- ${issue.code}: ${issue.message}`),
  ].join("\n");
}

function validateArtifactTypeDefinition(definition: ArtifactTypeDefinition): void {
  ensureNonEmptyString(definition.type, "artifactType.type");
  ensureNonEmptyString(definition.schemaVersion, "artifactType.schemaVersion");
}

function ensureActiveCapability(
  activeCapability: MutableRegisteredCapability | null,
): asserts activeCapability is MutableRegisteredCapability {
  if (!activeCapability) {
    throw new Error("Capability handlers can only be registered while registering a capability.");
  }
}

function registerProducedHandler<THandler extends ProducedHandler>(
  activeCapability: MutableRegisteredCapability | null,
  handlerIds: Map<string, string>,
  role: CapabilityRole,
  handler: THandler,
  produces: string[],
): MutableRegisteredCapability {
  ensureActiveCapability(activeCapability);
  ensureRoleAllowed(activeCapability.manifest, role);
  ensureHandlerId(handlerIds, handler.id, activeCapability.manifest.id);
  ensureStringArray(produces, `${handler.id}.produces`);

  for (const artifactType of produces) {
    if (!activeCapability.manifest.produces.includes(artifactType)) {
      throw new Error(
        `Handler ${handler.id} produces ${artifactType}, but ${activeCapability.manifest.id} does not declare it.`,
      );
    }
  }

  return activeCapability;
}

function ensureRoleAllowed(manifest: CapabilityManifest, role: CapabilityRole): void {
  if (!manifest.roles.includes(role)) {
    throw new Error(`Capability ${manifest.id} registered ${role}, but its manifest does not declare that role.`);
  }
}

function ensureHandlerId(
  handlerIds: Map<string, string>,
  handlerId: string,
  capabilityId: string,
): void {
  ensureNonEmptyString(handlerId, "handler.id");

  const existingCapability = handlerIds.get(handlerId);

  if (existingCapability) {
    throw new Error(`Handler ${handlerId} is already registered by ${existingCapability}.`);
  }

  handlerIds.set(handlerId, capabilityId);
}

function ensureManifestRolesHaveHandlers(capability: RegisteredCapability): void {
  const roleHandlers: Record<CapabilityRole, unknown[]> = {
    "evidence-provider": capability.evidenceProviders,
    projector: capability.projectors,
    evaluator: capability.evaluators,
    resolver: capability.resolvers,
    publisher: capability.publishers,
    actuator: capability.actuators,
    learner: capability.learners,
  };

  for (const role of capability.manifest.roles) {
    if (roleHandlers[role].length === 0) {
      throw new Error(`Capability ${capability.manifest.id} declares ${role} but registered no handler.`);
    }
  }
}

function ensureManifestProducesKnownArtifacts(
  capability: RegisteredCapability,
  artifactTypes: Map<string, ArtifactTypeDefinition>,
): void {
  for (const artifactType of capability.manifest.produces) {
    if (!artifactTypes.has(artifactType)) {
      throw new Error(
        `Capability ${capability.manifest.id} produces ${artifactType}, but no artifact type is registered.`,
      );
    }
  }
}

function ensureUniqueArtifactType(
  artifactTypes: Map<string, ArtifactTypeDefinition>,
  artifactType: string,
): void {
  if (artifactTypes.has(artifactType)) {
    throw new Error(`Artifact type ${artifactType} is already registered.`);
  }
}

function ensureNonEmptyString(value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
}

function ensureStringArray(value: unknown, path: string): void {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`${path} must be an array of strings.`);
  }
}

function cloneRegisteredCapability(capability: RegisteredCapability): RegisteredCapability {
  return {
    manifest: {
      ...capability.manifest,
      roles: [...capability.manifest.roles],
      consumes: [...capability.manifest.consumes],
      produces: [...capability.manifest.produces],
      permissions: capability.manifest.permissions ? [...capability.manifest.permissions] : undefined,
      invalidatedBy: capability.manifest.invalidatedBy
        ? capability.manifest.invalidatedBy.map((rule) => ({ ...rule }))
        : undefined,
      compatibility: {
        ...capability.manifest.compatibility,
        artifactSchemas: capability.manifest.compatibility.artifactSchemas
          ? { ...capability.manifest.compatibility.artifactSchemas }
          : undefined,
      },
    },
    artifactTypes: capability.artifactTypes.map((artifactType) => ({ ...artifactType })),
    evidenceProviders: [...capability.evidenceProviders],
    projectors: [...capability.projectors],
    evaluators: [...capability.evaluators],
    resolvers: [...capability.resolvers],
    publishers: [...capability.publishers],
    actuators: [...capability.actuators],
    learners: [...capability.learners],
  };
}
