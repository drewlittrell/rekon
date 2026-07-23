import { artifactRefKey, digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  assertContextUsageEvent,
  assertOutcomeEvent,
  createContextOutcomeEvaluationReport,
  type ContextOutcomeAssociationStatus,
  type ContextOutcomeEvaluationItem,
  type ContextOutcomeEvaluationReport,
  type ContextOutcomeEvaluationSubject,
  type ContextUsageEvent,
  type OutcomeEvent,
} from "@rekon/kernel-repo-model";
import { resolveArtifactLineage, type ArtifactReader } from "@rekon/sdk";

export const GROUNDED_CONTEXT_OUTCOME_POLICY_VERSION = "grounded-context-outcomes.v2";

type ArtifactRecord<T> = {
  ref: ArtifactRef;
  value: T;
};

type OutcomeGrounding = {
  supportRootSets: string[][];
  refuteRootSets: string[][];
  complete: boolean;
  sharedRootKeys: string[];
  issueCodes: string[];
};

type WorkingEvaluationItem = ContextOutcomeEvaluationItem & {
  supportRootSets: string[][];
  refuteRootSets: string[][];
  deliveries: number;
  appliedDeliveries: number;
  readDeliveries: number;
  ignoredDeliveries: number;
  unclaimedDeliveries: number;
  negativeAppliedOutcomes: number;
};

export async function buildGroundedContextOutcomeEvaluation(input: {
  artifacts: ArtifactReader;
  repoId: string;
  generatedAt?: string;
  maxEvents?: number;
}): Promise<ContextOutcomeEvaluationReport> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const maxEvents = positiveInteger(input.maxEvents, 512);
  const usageRead = await readRecords(
    input.artifacts,
    "ContextUsageEvent",
    assertContextUsageEvent,
    maxEvents,
  );
  const outcomeRead = await readRecords(
    input.artifacts,
    "OutcomeEvent",
    assertOutcomeEvent,
    maxEvents,
  );
  const usageRecords = usageRead.records;
  const outcomeRecords = outcomeRead.records;
  const usageGroups = groupUsageRecords(usageRecords);
  const outcomeByUsage = new Map<string, ArtifactRecord<OutcomeEvent>[]>();
  for (const outcome of outcomeRecords) {
    for (const usageRef of outcome.value.contextUsageRefs) {
      const key = artifactRefKey(usageRef);
      const records = outcomeByUsage.get(key) ?? [];
      records.push(outcome);
      outcomeByUsage.set(key, records);
    }
  }

  const groundingByOutcome = new Map<string, OutcomeGrounding>();
  const sharedRootKeys = new Set<string>();
  const lineageRootUseCounts = new Map<string, number>();
  const issueCodes = new Set<string>();
  let lineageComplete = !usageRead.truncated && !outcomeRead.truncated;
  if (usageRead.truncated || outcomeRead.truncated) issueCodes.add("event-window-truncated");
  const items = new Map<string, WorkingEvaluationItem>();

  for (const usageGroup of usageGroups) {
    const outcomes = dedupeRecords(
      usageGroup.flatMap((usage) => outcomeByUsage.get(artifactRefKey(usage.ref)) ?? []),
    );
    const deliveredItemIds = unique(
      usageGroup.flatMap((usage) => usage.value.delivery.itemIds),
    );
    for (const itemId of deliveredItemIds) {
      const subject = evaluationSubject(itemId);
      const key = subjectKey(subject);
      const existing = items.get(key) ?? {
        subject,
        status: "unobserved" as const,
        contextUsageRefs: [],
        outcomeRefs: [],
        supportingRootKeys: [],
        refutingRootKeys: [],
        reasons: [],
        supportRootSets: [],
        refuteRootSets: [],
        deliveries: 0,
        appliedDeliveries: 0,
        readDeliveries: 0,
        ignoredDeliveries: 0,
        unclaimedDeliveries: 0,
        negativeAppliedOutcomes: 0,
      };
      existing.contextUsageRefs.push(...usageGroup.map((usage) => usage.ref));
      existing.deliveries += 1;
      const disposition = claimDisposition(usageGroup, itemId);
      if (disposition === "applied") existing.appliedDeliveries += 1;
      else if (disposition === "read") existing.readDeliveries += 1;
      else if (disposition === "ignored") existing.ignoredDeliveries += 1;
      else existing.unclaimedDeliveries += 1;

      for (const outcome of outcomes) {
        existing.outcomeRefs.push(outcome.ref);
        const linkedUsageRecords = usageGroup.filter((usage) =>
          outcome.value.contextUsageRefs.some((usageRef) =>
            artifactRefKey(usageRef) === artifactRefKey(usage.ref)));
        if (claimDisposition(linkedUsageRecords, itemId) !== "applied") continue;
        if (outcome.value.status === "blocked" || outcome.value.status === "regressed") {
          existing.negativeAppliedOutcomes += 1;
          continue;
        }
        let grounding = groundingByOutcome.get(artifactRefKey(outcome.ref));
        if (!grounding) {
          grounding = await evaluateOutcomeGrounding(input.artifacts, outcome.value);
          groundingByOutcome.set(artifactRefKey(outcome.ref), grounding);
          for (const rootSet of [...grounding.supportRootSets, ...grounding.refuteRootSets]) {
            for (const rootKey of rootSet) {
              lineageRootUseCounts.set(rootKey, (lineageRootUseCounts.get(rootKey) ?? 0) + 1);
            }
          }
        }
        grounding.sharedRootKeys.forEach((rootKey) => sharedRootKeys.add(rootKey));
        grounding.issueCodes.forEach((code) => issueCodes.add(code));
        lineageComplete = lineageComplete && grounding.complete;
        existing.supportRootSets.push(...grounding.supportRootSets);
        existing.refuteRootSets.push(...grounding.refuteRootSets);
      }

      existing.contextUsageRefs = dedupeRefs(existing.contextUsageRefs);
      existing.outcomeRefs = dedupeRefs(existing.outcomeRefs);
      items.set(key, existing);
    }
  }
  for (const [rootKey, count] of lineageRootUseCounts) {
    if (count > 1) sharedRootKeys.add(rootKey);
  }

  const evaluatedItems = [...items.values()].map((workingItem) => {
    const {
      supportRootSets,
      refuteRootSets,
      deliveries,
      appliedDeliveries,
      readDeliveries,
      ignoredDeliveries,
      unclaimedDeliveries,
      negativeAppliedOutcomes,
      ...item
    } = workingItem;
    const groupedItem: ContextOutcomeEvaluationItem = {
      ...item,
      supportingRootKeys: connectedLineageGroupKeys(supportRootSets),
      refutingRootKeys: connectedLineageGroupKeys(refuteRootSets),
    };
    return {
      ...groupedItem,
      status: associationStatus(groupedItem, lineageComplete),
      reasons: associationReasons(groupedItem, lineageComplete, {
        deliveries,
        appliedDeliveries,
        readDeliveries,
        ignoredDeliveries,
        unclaimedDeliveries,
        negativeAppliedOutcomes,
      }),
    };
  });
  const inputRefs = dedupeRefs([
    ...usageRecords.map((record) => record.ref),
    ...outcomeRecords.map((record) => record.ref),
  ]);
  return createContextOutcomeEvaluationReport({
    header: {
      artifactType: "ContextOutcomeEvaluationReport",
      artifactId: `context-outcomes-${digestJson({
        policyVersion: GROUNDED_CONTEXT_OUTCOME_POLICY_VERSION,
        inputRefs,
        items: evaluatedItems,
      }).slice(0, 24)}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: input.repoId },
      producer: { id: "@rekon/capability-memory.grounded-outcomes", version: "1.0.0" },
      inputRefs,
      supersession: { key: "context-outcome-evaluation" },
      freshness: {
        status: lineageComplete ? "fresh" : "partial",
        ...(lineageComplete ? {} : { invalidatedBy: ["incomplete-artifact-lineage"] }),
      },
      provenance: {
        confidence: lineageComplete ? 1 : 0.5,
        notes: [
          "Associations are not causal claims.",
          "Shared proof roots count once; self-reported outcomes cannot reinforce context.",
          "Only explicitly applied context can receive a grounded association from successful proof.",
          "A blocked or regressed task is not item-specific counterevidence and cannot refute context by itself.",
        ],
      },
    },
    policyVersion: GROUNDED_CONTEXT_OUTCOME_POLICY_VERSION,
    items: evaluatedItems,
    lineage: {
      complete: lineageComplete,
      sharedRootKeys: [...sharedRootKeys],
      issueCodes: [...issueCodes],
    },
  });
}

async function evaluateOutcomeGrounding(
  artifacts: ArtifactReader,
  outcome: OutcomeEvent,
): Promise<OutcomeGrounding> {
  if (outcome.grounding === "self-report") {
    return {
      supportRootSets: [],
      refuteRootSets: [],
      complete: true,
      sharedRootKeys: [],
      issueCodes: [],
    };
  }
  const directRefs = dedupeRefs([
    ...outcome.verificationRefs,
    ...outcome.runtimeObservationRefs,
    ...outcome.externalEvidenceRefs,
  ]);
  const groundingRefs = directRefs.length > 0
    ? directRefs
    : outcome.proofGateRef
      ? [outcome.proofGateRef]
      : [];
  if (groundingRefs.length === 0) {
    return {
      supportRootSets: [],
      refuteRootSets: [],
      complete: true,
      sharedRootKeys: [],
      issueCodes: [],
    };
  }

  const lineage = await resolveArtifactLineage(artifacts, groundingRefs, {
    maxDepth: 24,
    maxArtifacts: 512,
  });
  const rootSets = groundingRefs.flatMap((seedRef) => {
    const rootKeys = lineage.roots
      .filter((root) => root.seedRefs.some((candidate) => artifactRefKey(candidate) === artifactRefKey(seedRef)))
      .map((root) => root.key)
      .sort();
    return rootKeys.length > 0 ? [rootKeys] : [];
  });
  const supports = outcome.status === "accepted" || outcome.status === "verified";
  return {
    supportRootSets: supports ? rootSets : [],
    refuteRootSets: [],
    complete: lineage.complete,
    sharedRootKeys: lineage.sharedRootKeys,
    issueCodes: unique(lineage.issues.map((issue) => issue.code)),
  };
}

function connectedLineageGroupKeys(rootSets: string[][]): string[] {
  const groups: Array<Set<string>> = [];
  for (const rootSet of rootSets) {
    const roots = new Set(rootSet);
    if (roots.size === 0) continue;
    const overlapping = groups.filter((group) => [...roots].some((root) => group.has(root)));
    if (overlapping.length === 0) {
      groups.push(roots);
      continue;
    }
    const merged = new Set(roots);
    for (const group of overlapping) {
      group.forEach((root) => merged.add(root));
      groups.splice(groups.indexOf(group), 1);
    }
    groups.push(merged);
  }
  return groups
    .map((group) => [...group].sort())
    .map((roots) => roots.length === 1 ? roots[0]! : `lineage-group:${digestJson(roots)}`)
    .sort();
}

function associationStatus(
  item: ContextOutcomeEvaluationItem,
  lineageComplete: boolean,
): ContextOutcomeAssociationStatus {
  if (item.refutingRootKeys.length > 0) return "refuted";
  if (item.supportingRootKeys.length >= 2 && lineageComplete) return "corroborated";
  if (item.supportingRootKeys.length >= 1 && lineageComplete) return "suggestive";
  if (item.outcomeRefs.length > 0) return "associated";
  return "unobserved";
}

function associationReasons(
  item: ContextOutcomeEvaluationItem,
  lineageComplete: boolean,
  dispositions: {
    deliveries: number;
    appliedDeliveries: number;
    readDeliveries: number;
    ignoredDeliveries: number;
    unclaimedDeliveries: number;
    negativeAppliedOutcomes: number;
  },
): string[] {
  const reasons = [
    `deliveries: ${dispositions.deliveries}`,
    `usage-artifact-refs: ${item.contextUsageRefs.length}`,
    `associated-outcomes: ${item.outcomeRefs.length}`,
    `applied-deliveries: ${dispositions.appliedDeliveries}`,
    `read-deliveries: ${dispositions.readDeliveries}`,
    `ignored-deliveries: ${dispositions.ignoredDeliveries}`,
    `unclaimed-deliveries: ${dispositions.unclaimedDeliveries}`,
    `negative-applied-outcomes: ${dispositions.negativeAppliedOutcomes}`,
    `independent-support-groups: ${item.supportingRootKeys.length}`,
    `independent-refuting-groups: ${item.refutingRootKeys.length}`,
  ];
  if (!lineageComplete) reasons.push("artifact-lineage-incomplete");
  if (dispositions.appliedDeliveries === 0) reasons.push("no-applied-context-claim");
  if (dispositions.negativeAppliedOutcomes > 0) reasons.push("negative-outcome-not-item-specific");
  if (item.refutingRootKeys.length > 0) reasons.push("counterevidence-dominates");
  if (item.outcomeRefs.length > 0 && item.supportingRootKeys.length === 0 && item.refutingRootKeys.length === 0) {
    reasons.push("associated-without-grounded-verdict");
  }
  return reasons;
}

function claimDisposition(
  usages: Array<ArtifactRecord<ContextUsageEvent>>,
  itemId: string,
): "read" | "applied" | "ignored" | undefined {
  const claims = usages.flatMap((usage) => usage.value.claims
    .filter((claim) => claim.itemId === itemId)
    .map((claim) => ({
      claim,
      usageGeneratedAt: usage.value.header.generatedAt,
      usageKey: artifactRefKey(usage.ref),
    })));
  claims.sort((left, right) =>
    right.claim.assertedAt.localeCompare(left.claim.assertedAt)
    || right.usageGeneratedAt.localeCompare(left.usageGeneratedAt)
    || right.usageKey.localeCompare(left.usageKey)
    || right.claim.disposition.localeCompare(left.claim.disposition));
  return claims[0]?.claim.disposition;
}

function groupUsageRecords(
  records: Array<ArtifactRecord<ContextUsageEvent>>,
): Array<Array<ArtifactRecord<ContextUsageEvent>>> {
  const groups = new Map<string, Array<ArtifactRecord<ContextUsageEvent>>>();
  for (const record of records) {
    const key = digestJson({
      task: record.value.task.fingerprint,
      contextReportRef: artifactRefKey(record.value.contextReportRef),
      channel: record.value.delivery.channel,
      deliveredAt: record.value.delivery.deliveredAt,
      projectionDigest: record.value.delivery.projectionDigest,
    });
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => group.sort((left, right) =>
      artifactRefKey(left.ref).localeCompare(artifactRefKey(right.ref))));
}

function dedupeRecords<T>(records: Array<ArtifactRecord<T>>): Array<ArtifactRecord<T>> {
  return [...new Map(records.map((record) => [artifactRefKey(record.ref), record])).values()]
    .sort((left, right) => artifactRefKey(left.ref).localeCompare(artifactRefKey(right.ref)));
}

function evaluationSubject(itemId: string): ContextOutcomeEvaluationSubject {
  if (itemId.startsWith("memory:")) {
    return { kind: "memory-entry", id: itemId.slice("memory:".length) };
  }
  return { kind: "context-item", id: itemId };
}

function subjectKey(subject: ContextOutcomeEvaluationSubject): string {
  return `${subject.kind}:${subject.id}`;
}

async function readRecords<T>(
  artifacts: ArtifactReader,
  type: string,
  assertValue: (value: unknown) => T,
  maxEvents: number,
): Promise<{ records: Array<ArtifactRecord<T>>; truncated: boolean }> {
  const refs = await artifacts.list(type, { order: "newest", limit: maxEvents + 1 });
  const selected = refs.slice(0, maxEvents);
  const records: Array<ArtifactRecord<T>> = [];
  for (const ref of selected) {
    records.push({ ref, value: assertValue(await artifacts.read(ref)) });
  }
  return { records, truncated: refs.length > maxEvents };
}

function dedupeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...new Map(refs.map((ref) => [artifactRefKey(ref), ref])).values()]
    .sort((left, right) => artifactRefKey(left).localeCompare(artifactRefKey(right)));
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
