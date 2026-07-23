import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  createContextTaskIdentity,
  createContextUsageEvent,
  type ContextDeliveryChannel,
  type ContextUsageClaimDisposition,
  type ContextUsageEvent,
  type TaskContextReport,
} from "@rekon/kernel-repo-model";
import type {
  CompiledContextPacket,
  ModelContextDelivery,
  ModelContextProjection,
} from "./context-compiler.js";

export type BuildContextUsageEventInput = {
  repoId: string;
  report: TaskContextReport;
  reportRef: ArtifactRef;
  packet: CompiledContextPacket;
  projection: ModelContextProjection;
  delivery: ModelContextDelivery;
  channel: ContextDeliveryChannel;
  taskPactRef?: ArtifactRef;
  deliveredAt?: string;
};

export type ContextUsageClaimInput = {
  itemId: string;
  disposition: ContextUsageClaimDisposition;
  evidenceRefs?: ArtifactRef[];
};

export type BuildClaimedContextUsageEventInput = {
  usage: ContextUsageEvent;
  usageRef: ArtifactRef;
  claims: ContextUsageClaimInput[];
  assertedBy: string;
  assertedAt?: string;
};

export function buildContextUsageEvent(input: BuildContextUsageEventInput): ContextUsageEvent {
  const deliveredAt = input.deliveredAt ?? new Date().toISOString();
  const itemIds = [
    ...input.delivery.readFirst,
    ...(input.delivery.boundaryPaths ?? []),
    ...(input.delivery.supportingContext ?? []).map((item) => item.ref),
  ];
  const sourceSpanKeys = (input.delivery.sourceSpans ?? []).map((span) =>
    `${span.path}:${span.sourceSha256}:${span.lineStart}-${span.lineEnd}`);
  const constraintDigests = input.delivery.constraints.map((statement) => digestJson(statement));
  const checkDigests = input.delivery.checks.map((check) => digestJson(check));
  const projectionDigest = digestJson(input.delivery);
  const task = createContextTaskIdentity(input.report.task.text, input.report.task.paths);
  const identity = digestJson({
    reportRef: input.reportRef,
    channel: input.channel,
    deliveredAt,
    projectionDigest,
  });
  const inputRefs = [input.reportRef, ...(input.taskPactRef ? [input.taskPactRef] : [])];

  return createContextUsageEvent({
    header: {
      artifactType: "ContextUsageEvent",
      artifactId: `context-usage-${identity.slice(0, 24)}`,
      schemaVersion: "0.1.0",
      generatedAt: deliveredAt,
      subject: {
        repoId: input.repoId,
        paths: task.paths,
      },
      producer: {
        id: "@rekon/capability-model.context-usage",
        version: "1.0.0",
      },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: ["Records delivered context; model use remains an explicit claim."],
      },
    },
    task,
    contextReportRef: input.reportRef,
    ...(input.taskPactRef ? { taskPactRef: input.taskPactRef } : {}),
    delivery: {
      channel: input.channel,
      deliveredAt,
      profile: input.packet.profile,
      projectionDigest,
      itemIds,
      sourceSpanKeys,
      constraintDigests,
      checkDigests,
      truncated: input.packet.truncated,
    },
    claims: [],
  });
}

/**
 * Preserve the immutable delivery event and derive a receipt for caller-reported
 * use. Claims route later proof to an item; they are not proof themselves.
 */
export function buildClaimedContextUsageEvent(
  input: BuildClaimedContextUsageEventInput,
): ContextUsageEvent {
  const assertedAt = input.assertedAt ?? new Date().toISOString();
  const assertedBy = input.assertedBy.trim();
  if (assertedBy.length === 0) {
    throw new Error("Context usage claims require a non-empty assertedBy identity.");
  }
  if (
    input.usageRef.type !== input.usage.header.artifactType
    || input.usageRef.id !== input.usage.header.artifactId
    || input.usageRef.schemaVersion !== input.usage.header.schemaVersion
  ) {
    throw new Error("Context usage claims require the exact ref for the supplied delivery event.");
  }
  if (input.claims.length === 0) {
    throw new Error("Context usage claims require at least one delivered item disposition.");
  }
  const deliveredItems = new Set(input.usage.delivery.itemIds);
  const normalizedClaims = input.claims.map((claim, index) => {
    const itemId = claim.itemId.trim();
    if (itemId.length === 0) {
      throw new Error(`Context usage claim ${index + 1} requires a non-empty itemId.`);
    }
    if (!deliveredItems.has(itemId)) {
      throw new Error(`Context usage claim ${index + 1} references undelivered item ${itemId}.`);
    }
    return {
      itemId,
      disposition: claim.disposition,
      assertedAt,
      assertedBy,
      evidenceRefs: claim.evidenceRefs ?? [],
    };
  });
  const dispositionByItem = new Map<string, ContextUsageClaimDisposition>();
  for (const claim of normalizedClaims) {
    const prior = dispositionByItem.get(claim.itemId);
    if (prior && prior !== claim.disposition) {
      throw new Error(`Context usage item ${claim.itemId} cannot have conflicting dispositions.`);
    }
    dispositionByItem.set(claim.itemId, claim.disposition);
  }
  const claims = [
    ...input.usage.claims,
    ...normalizedClaims,
  ];
  const claimEvidenceRefs = normalizedClaims.flatMap((claim) => claim.evidenceRefs);
  const identity = digestJson({
    usageRef: input.usageRef,
    claims: normalizedClaims,
    assertedAt,
    assertedBy,
  });

  return createContextUsageEvent({
    ...input.usage,
    header: {
      ...input.usage.header,
      artifactId: `context-usage-claim-${identity.slice(0, 24)}`,
      generatedAt: assertedAt,
      producer: {
        id: "@rekon/capability-model.context-usage-claim",
        version: "1.0.0",
      },
      inputRefs: [input.usageRef, ...claimEvidenceRefs],
      provenance: {
        confidence: 0.5,
        notes: [
          "Caller-reported use receipt derived from an immutable delivery event.",
          "A use claim routes independent outcome proof but is not proof of effectiveness or causation.",
        ],
      },
    },
    claims,
  });
}
