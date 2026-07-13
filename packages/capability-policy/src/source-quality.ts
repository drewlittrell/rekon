import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment, AssessmentImpact } from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";

export const TYPE_ESCAPE_RULE_ID = "typescript.typeEscape";
export const ERROR_SUPPRESSION_RULE_ID = "typescript.errorSuppression";
export const PLACEHOLDER_IMPLEMENTATION_RULE_ID = "typescript.placeholderImplementation";
export const ASYNC_PROMISE_EXECUTOR_RULE_ID = "typescript.asyncPromiseExecutor";
export const ASYNC_ARRAY_CALLBACK_RULE_ID = "typescript.asyncArrayCallback";
export const FLOATING_PROMISE_RULE_ID = "typescript.floatingPromise";
export const FOCUSED_TEST_RULE_ID = "tests.focused";
export const TEST_ISOLATION_RULE_ID = "tests.isolation";
export const UNUSED_IMPORT_RULE_ID = "typescript.unusedImport";

type EvidenceFactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

export type SourceQualitySignalPolicy = {
  ruleId: string;
  type: string;
  impact: AssessmentImpact;
  title: string;
  description: string;
  suggestedAction: string;
  scope?: "production" | "test";
  kind?: "risk" | "opportunity";
  verification?: "corroborated" | "verified";
  rationale?: string;
};

const SIGNAL_POLICIES: Record<string, SourceQualitySignalPolicy> = {
  as_any_assertion: {
    ruleId: TYPE_ESCAPE_RULE_ID,
    type: "type_safety",
    impact: "medium",
    title: "Type safety bypassed with an any assertion",
    description: "An any assertion disables type checking at this boundary.",
    suggestedAction: "Replace the assertion with a validated type, type guard, or narrower adapter boundary.",
  },
  non_null_assertion: {
    ruleId: TYPE_ESCAPE_RULE_ID,
    type: "type_safety",
    impact: "low",
    title: "Nullability bypassed with a non-null assertion",
    description: "A non-null assertion suppresses a possible null or undefined state.",
    suggestedAction: "Prove the invariant locally or handle the nullable state explicitly.",
  },
  empty_catch: {
    ruleId: ERROR_SUPPRESSION_RULE_ID,
    type: "error_handling",
    impact: "medium",
    title: "Error discarded by an empty catch block",
    description: "An empty catch block removes failure information and may hide broken behavior.",
    suggestedAction: "Handle, translate, or explicitly document and instrument the ignored failure.",
  },
  catch_only_logs: {
    ruleId: ERROR_SUPPRESSION_RULE_ID,
    type: "error_handling",
    impact: "medium",
    title: "Caught error is logged but not propagated",
    description: "A catch block only logs the error, so callers cannot observe the failure through control flow.",
    suggestedAction: "Confirm the failure is intentionally terminal here; otherwise rethrow, return a typed failure, or recover explicitly.",
  },
  placeholder_throw: {
    ruleId: PLACEHOLDER_IMPLEMENTATION_RULE_ID,
    type: "stub",
    impact: "medium",
    title: "Explicit placeholder implementation",
    description: "The implementation throws a placeholder error instead of providing behavior.",
    suggestedAction: "Implement the behavior or prove the path is intentionally unsupported and encode that contract.",
  },
  async_promise_executor: {
    ruleId: ASYNC_PROMISE_EXECUTOR_RULE_ID,
    type: "async_control_flow",
    impact: "high",
    title: "Async Promise executor can lose rejection semantics",
    description: "The Promise constructor ignores the promise returned by an async executor, so thrown errors can escape the constructed promise.",
    suggestedAction: "Move awaited work outside the Promise constructor or use a non-async executor that resolves and rejects explicitly.",
  },
  async_for_each_callback: {
    ruleId: ASYNC_ARRAY_CALLBACK_RULE_ID,
    type: "async_control_flow",
    impact: "medium",
    title: "Array forEach does not await its async callback",
    description: "Array.forEach ignores callback promises, so the surrounding flow can continue before the async work settles.",
    suggestedAction: "Use a for-of loop for sequential work or await Promise.all over an explicit map for parallel work.",
  },
  async_sync_array_callback: {
    ruleId: ASYNC_ARRAY_CALLBACK_RULE_ID,
    type: "async_control_flow",
    impact: "high",
    title: "Synchronous array method received an async callback",
    description: "This array method consumes a synchronous callback result; a returned Promise does not provide the intended predicate or comparator value.",
    suggestedAction: "Resolve the async values first, then call the synchronous array method with concrete values.",
  },
  floating_local_async_call: {
    ruleId: FLOATING_PROMISE_RULE_ID,
    type: "async_control_flow",
    impact: "medium",
    title: "Local async call is not observed",
    description: "A locally declared async function is called as a standalone statement without await, return, void, or rejection handling.",
    suggestedAction: "Await or return the call, attach explicit rejection handling, or mark intentional fire-and-forget work with void and an error boundary.",
  },
  focused_test: {
    ruleId: FOCUSED_TEST_RULE_ID,
    type: "test_hygiene",
    impact: "high",
    title: "Focused test can exclude the rest of the suite",
    description: "A test file uses an explicit focused-test form such as test.only, it.only, fit, or fdescribe.",
    suggestedAction: "Remove the focused-test modifier before relying on the suite result.",
    scope: "test",
  },
  test_global_state_mutation: {
    ruleId: TEST_ISOLATION_RULE_ID,
    type: "test_isolation",
    impact: "medium",
    title: "Test mutates process environment state",
    description: "A test callback directly mutates process.env, which can leak state into other tests when cleanup is missing or incomplete.",
    suggestedAction: "Restore the original environment value in guaranteed cleanup or isolate the test process.",
    scope: "test",
  },
  unused_import: {
    ruleId: UNUSED_IMPORT_RULE_ID,
    type: "dead_code",
    impact: "low",
    title: "Imported binding is unused",
    description: "The TypeScript compiler found an imported binding with no source reference.",
    suggestedAction: "Remove the unused import or connect it to the behavior it was intended to provide.",
    kind: "opportunity",
    verification: "verified",
    rationale: "TypeScript name resolution verifies that the import binding has no source reference.",
  },
};

export function evaluateSourceQualitySignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  const groups = new Map<string, {
    file: string;
    signal: string;
    policy: SourceQualitySignalPolicy;
    locations: Array<{ line?: number; column?: number; detail?: string }>;
  }>();

  for (const fact of facts) {
    const isSourceSignal = fact.kind === "typescript:source-quality";
    const isUnusedImport = fact.kind === "typescript:diagnostic" && fact.value.purpose === "unused-import";
    if (!isSourceSignal && !isUnusedImport) continue;
    const file = typeof fact.value.path === "string" ? fact.value.path : fact.subject.split(":")[0] ?? fact.subject;
    const signal = isUnusedImport ? "unused_import" : typeof fact.value.signal === "string" ? fact.value.signal : "";
    const policy = SIGNAL_POLICIES[signal];
    if (!policy) continue;
    if (policy.scope === "test" ? !isNonProductionPath(file) : isNonProductionPath(file)) continue;
    const key = sourceQualityRootCauseKey(policy.ruleId, file, signal);
    const group = groups.get(key) ?? { file, signal, policy, locations: [] };
    group.locations.push({
      ...(typeof fact.value.line === "number" ? { line: fact.value.line } : {}),
      ...(typeof fact.value.column === "number" ? { column: fact.value.column } : {}),
      ...(typeof fact.value.detail === "string"
        ? { detail: fact.value.detail }
        : typeof fact.value.message === "string"
          ? { detail: fact.value.message }
          : {}),
    });
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([rootCauseKey, group]) => ({
      id: `assessment:${rootCauseKey}`,
      kind: group.policy.kind ?? "risk",
      type: group.policy.type,
      impact: group.policy.impact,
      title: group.policy.title,
      description: group.policy.description,
      subjects: [group.file],
      files: [group.file],
      ruleId: group.policy.ruleId,
      suggestedAction: group.policy.suggestedAction,
      evidence: [evidenceRef],
      rootCauseKey,
      confidence: {
        score: 0.85,
        basis: "deterministic" as const,
        verification: group.policy.verification ?? "corroborated",
        rationale: group.policy.rationale ?? "AST evidence verifies the source construct; runtime impact and reachability remain unproven.",
      },
      details: {
        signal: group.signal,
        occurrenceCount: group.locations.length,
        locations: group.locations.sort((left, right) =>
          (left.line ?? 0) - (right.line ?? 0)
          || (left.column ?? 0) - (right.column ?? 0)
          || (left.detail ?? "").localeCompare(right.detail ?? "")),
      },
    }));
}

export function sourceQualitySignalPolicy(signal: string): SourceQualitySignalPolicy | undefined {
  return SIGNAL_POLICIES[signal];
}

export function sourceQualityRootCauseKey(ruleId: string, file: string, signal: string): string {
  return `${ruleId}:${file}:${signal}`;
}
