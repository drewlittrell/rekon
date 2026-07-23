import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  createContextTaskIdentity,
  createContextUsageEvent,
  type ContextDeliveryChannel,
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
