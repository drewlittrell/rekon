import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type ContractArtifactSource,
  type ContractClause,
  type EffectiveContractRegistry,
  type EffectiveContractRegistryEntry,
  type FlowContract,
  type FlowContractSource,
  type RepositoryContractSourceDocument,
  type SystemContract,
  type SystemContractSource,
  createEffectiveContractRegistry,
  createFlowContract,
  createSystemContract,
} from "@rekon/kernel-repo-model";

export type RepositoryContractProjectionSource = {
  path: string;
  digest: string;
  document: RepositoryContractSourceDocument;
};

export type BuildRepositoryContractProjectionInput = {
  repoId: string;
  generatedAt?: string;
  sources: RepositoryContractProjectionSource[];
  evidenceRefs?: ArtifactRef[];
  additionalRegistryEntries?: EffectiveContractRegistryEntry[];
};

export type RepositoryContractProjection = {
  systemContracts: SystemContract[];
  flowContracts: FlowContract[];
  registry: EffectiveContractRegistry;
};

const PRODUCER_ID = "@rekon/capability-model";
const PRODUCER_VERSION = "1.0.0";
const SCHEMA_VERSION = "1.0.0";

/** Compile committed contract sources into effective, provenance-bearing artifacts. */
export function buildRepositoryContractProjection(
  input: BuildRepositoryContractProjectionInput,
): RepositoryContractProjection {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const evidenceRefs = uniqueRefs(input.evidenceRefs ?? []);
  const seen = new Set<string>();
  const systemContracts: SystemContract[] = [];
  const flowContracts: FlowContract[] = [];

  for (const loaded of [...input.sources].sort((left, right) => left.path.localeCompare(right.path))) {
    const source: ContractArtifactSource = {
      path: loaded.path,
      digest: loaded.digest,
      sourceId: loaded.document.sourceId,
    };
    for (const definition of loaded.document.systems ?? []) {
      assertUniqueContract(seen, "SystemContract", definition.id);
      systemContracts.push(projectSystemContract({
        definition,
        source,
        repoId: input.repoId,
        generatedAt,
        evidenceRefs,
      }));
    }
    for (const definition of loaded.document.flows ?? []) {
      assertUniqueContract(seen, "FlowContract", definition.id);
      flowContracts.push(projectFlowContract({
        definition,
        source,
        repoId: input.repoId,
        generatedAt,
        evidenceRefs,
      }));
    }
  }

  const entries: EffectiveContractRegistryEntry[] = [
    ...systemContracts.map(systemRegistryEntry),
    ...flowContracts.map(flowRegistryEntry),
    ...(input.additionalRegistryEntries ?? []),
  ];
  const registryRefs = entries.map((entry) => entry.ref);
  const registry = createEffectiveContractRegistry({
    header: header({
      artifactType: "EffectiveContractRegistry",
      artifactId: `effective-contract-registry-${stamp(generatedAt)}`,
      repoId: input.repoId,
      generatedAt,
      inputRefs: registryRefs,
      supersessionKey: "effective-contract-registry",
      invalidationInputs: input.sources.map((loaded) => ({ path: loaded.path, digest: loaded.digest })),
    }),
    entries,
  });

  return { systemContracts, flowContracts, registry };
}

function projectSystemContract(input: {
  definition: SystemContractSource;
  source: ContractArtifactSource;
  repoId: string;
  generatedAt: string;
  evidenceRefs: ArtifactRef[];
}): SystemContract {
  const { definition, source } = input;
  const clauses = definition.invariants.map((clause) => adoptedClause(clause, source, input.evidenceRefs));
  const prohibited = (definition.prohibitedChanges ?? []).map((clause) => adoptedClause(clause, source, input.evidenceRefs));
  return createSystemContract({
    header: header({
      artifactType: "SystemContract",
      artifactId: `system-contract-${slug(definition.id)}-${source.digest?.slice(0, 12) ?? stamp(input.generatedAt)}`,
      repoId: input.repoId,
      generatedAt: input.generatedAt,
      inputRefs: input.evidenceRefs,
      supersessionKey: `system-contract:${definition.id}`,
      invalidationInputs: source.path && source.digest ? [{ path: source.path, digest: source.digest }] : [],
      systems: [definition.systemId],
      paths: definition.scope.paths,
    }),
    contractId: definition.id,
    authority: "adopted",
    confidence: 1,
    source,
    system: { id: definition.systemId, name: definition.name, paths: definition.scope.paths },
    purpose: definition.purpose,
    userOutcomes: definition.userOutcomes ?? [],
    invariants: clauses,
    prohibitedChanges: prohibited,
    requiredContextPaths: definition.requiredContextPaths ?? [],
    requiredChecks: definition.requiredChecks ?? [],
  });
}

function projectFlowContract(input: {
  definition: FlowContractSource;
  source: ContractArtifactSource;
  repoId: string;
  generatedAt: string;
  evidenceRefs: ArtifactRef[];
}): FlowContract {
  const { definition, source } = input;
  return createFlowContract({
    header: header({
      artifactType: "FlowContract",
      artifactId: `flow-contract-${slug(definition.id)}-${source.digest?.slice(0, 12) ?? stamp(input.generatedAt)}`,
      repoId: input.repoId,
      generatedAt: input.generatedAt,
      inputRefs: input.evidenceRefs,
      supersessionKey: `flow-contract:${definition.id}`,
      invalidationInputs: source.path && source.digest ? [{ path: source.path, digest: source.digest }] : [],
      systems: definition.systems,
      paths: definition.paths,
    }),
    contractId: definition.id,
    authority: "adopted",
    confidence: 1,
    source,
    name: definition.name,
    criticality: definition.criticality,
    purpose: definition.purpose,
    userOutcomes: definition.userOutcomes,
    entryConditions: definition.entryConditions ?? [],
    completionConditions: definition.completionConditions,
    systems: definition.systems ?? [],
    paths: definition.paths ?? [],
    invariants: definition.invariants.map((clause) => adoptedClause(clause, source, input.evidenceRefs)),
    stages: definition.stages.map((stage) => ({ ...stage, evidenceRefs: input.evidenceRefs })),
    handoffs: definition.handoffs.map((handoff) => ({ ...handoff, evidenceRefs: input.evidenceRefs })),
    requiredChecks: definition.requiredChecks ?? [],
  });
}

function adoptedClause(
  clause: { id: string; statement: string; rationale?: string },
  source: ContractArtifactSource,
  evidenceRefs: ArtifactRef[],
): ContractClause {
  return {
    ...clause,
    authority: "adopted",
    confidence: 1,
    sourceRefs: [source],
    evidenceRefs,
  };
}

function systemRegistryEntry(contract: SystemContract): EffectiveContractRegistryEntry {
  return {
    contractType: "SystemContract",
    contractId: contract.contractId,
    authority: contract.authority,
    confidence: contract.confidence,
    ref: artifactRef(contract.header),
    systems: [contract.system.id],
    paths: contract.system.paths,
    flowIds: [],
    clauseIds: [...contract.invariants, ...contract.prohibitedChanges].map((clause) => clause.id),
  };
}

function flowRegistryEntry(contract: FlowContract): EffectiveContractRegistryEntry {
  return {
    contractType: "FlowContract",
    contractId: contract.contractId,
    authority: contract.authority,
    confidence: contract.confidence,
    ref: artifactRef(contract.header),
    systems: contract.systems,
    paths: contract.paths,
    flowIds: [contract.contractId],
    clauseIds: contract.invariants.map((clause) => clause.id),
  };
}

function header(input: {
  artifactType: string;
  artifactId: string;
  repoId: string;
  generatedAt: string;
  inputRefs: ArtifactRef[];
  supersessionKey: string;
  invalidationInputs: Array<{ path: string; digest: string }>;
  systems?: string[];
  paths?: string[];
}): ArtifactHeader {
  return {
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    subject: {
      repoId: input.repoId,
      ...(input.systems && input.systems.length > 0 ? { systems: input.systems } : {}),
      ...(input.paths && input.paths.length > 0 ? { paths: input.paths } : {}),
    },
    producer: { id: PRODUCER_ID, version: PRODUCER_VERSION },
    inputRefs: uniqueRefs(input.inputRefs),
    invalidation: {
      inputs: input.invalidationInputs.map((entry) => ({ kind: "config", ...entry })),
      producers: [{ id: PRODUCER_ID, version: PRODUCER_VERSION }],
    },
    supersession: { key: input.supersessionKey },
    freshness: { status: "fresh" },
    provenance: { confidence: 1, notes: ["compiled from committed repository contract source"] },
  };
}

function artifactRef(header: ArtifactHeader): ArtifactRef {
  return { type: header.artifactType, id: header.artifactId, schemaVersion: header.schemaVersion };
}

function assertUniqueContract(seen: Set<string>, type: string, id: string): void {
  const key = `${type}:${id}`;
  if (seen.has(key)) throw new TypeError(`Duplicate repository contract ${key}.`);
  seen.add(key);
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "contract";
}

function stamp(value: string): string {
  return value.replace(/[^0-9A-Za-z]/gu, "");
}
