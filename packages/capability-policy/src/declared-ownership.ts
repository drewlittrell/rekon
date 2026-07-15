import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Finding } from "@rekon/kernel-findings";
import type { CapabilityMap, OwnershipMap } from "@rekon/kernel-repo-model";
import type { Rule, Rulebook } from "@rekon/kernel-rulebook";

export const OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID = "ownership.doesNotOwn";

export type DeclaredOwnershipRuleOptions = {
  system: string;
  capability: string;
};

export type DeclaredOwnershipRulebook = {
  ref: ArtifactRef;
  rulebook: Rulebook;
};

export type DeclaredOwnershipEvaluationInput = {
  rulebooks: DeclaredOwnershipRulebook[];
  capabilityMap: CapabilityMap;
  capabilityMapRef: ArtifactRef;
  ownershipMap?: OwnershipMap;
  ownershipMapRef?: ArtifactRef;
  disabledRules?: ReadonlySet<string>;
};

export type DeclaredOwnershipEvaluationResult = {
  findings: Finding[];
  inputRefs: ArtifactRef[];
};

/**
 * Evaluate repository-declared ownership law against projected capabilities.
 * No rulebook means no law, so this evaluator remains silent by default.
 */
export function evaluateDeclaredOwnershipRules(
  input: DeclaredOwnershipEvaluationInput,
): DeclaredOwnershipEvaluationResult {
  const activeRules = collectActiveRules(input.rulebooks, input.disabledRules);
  const findings: Finding[] = [];
  const usedRefs: ArtifactRef[] = activeRules.length > 0
    ? [
        ...activeRules.map(({ ref }) => ref),
        input.capabilityMapRef,
        ...(input.ownershipMapRef ? [input.ownershipMapRef] : []),
      ]
    : [];

  for (const { ref: rulebookRef, rule } of activeRules) {
    const options = parseOptions(rule);
    const capabilityMatcher = globMatcher(options.capability);
    const matchedEntries = input.capabilityMap.entries.filter((entry) => {
      if (!capabilityMatcher.test(entry.capability)) return false;
      return entry.systems.includes(options.system)
        || entry.subjects.some((subject) => ownersForSubject(subject, input.ownershipMap).includes(options.system));
    });

    if (matchedEntries.length === 0) continue;

    const subjects = uniqueSorted(matchedEntries.flatMap((entry) => entry.subjects));
    const entryEvidence = matchedEntries.flatMap((entry) => entry.evidence);
    const ownershipEvidence = input.ownershipMap?.entries
      .filter((entry) => entry.ownerSystem === options.system && subjects.some((subject) => pathContains(entry.path, subject)))
      .flatMap((entry) => entry.evidence) ?? [];
    const evidence = uniqueRefs([
      rulebookRef,
      input.capabilityMapRef,
      ...(input.ownershipMapRef && ownershipEvidence.length > 0 ? [input.ownershipMapRef] : []),
      ...entryEvidence,
      ...ownershipEvidence,
    ]);

    findings.push({
      id: `declared-ownership:${stableId(rule.id)}:${stableId(options.system)}:${stableId(options.capability)}`,
      rootCauseKey: `declared-ownership:${rule.id}`,
      type: "architecture.ownershipViolation",
      severity: rule.severity,
      title: `Declared ownership rule violated: ${rule.id}`,
      description: rule.message,
      subjects,
      files: subjects,
      ruleId: rule.id,
      suggestedAction: `Move ${options.capability} out of ${options.system}, revise the capability projection, or update the declared rule.`,
      evidence,
      details: {
        law: {
          evaluator: OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID,
          source: rule.source,
          system: options.system,
          capability: options.capability,
          rulebook: rulebookRef,
        },
        matchedCapabilities: uniqueSorted(matchedEntries.map((entry) => entry.capability)),
      },
    });
  }

  return {
    findings: findings.sort((left, right) => left.id.localeCompare(right.id)),
    inputRefs: uniqueRefs(usedRefs),
  };
}

function collectActiveRules(
  rulebooks: DeclaredOwnershipRulebook[],
  disabledRules: ReadonlySet<string> | undefined,
): Array<{ ref: ArtifactRef; rule: Rule }> {
  const active: Array<{ ref: ArtifactRef; rule: Rule }> = [];
  const seenIds = new Map<string, ArtifactRef>();

  for (const { ref, rulebook } of rulebooks) {
    for (const rule of rulebook.rules) {
      if (rule.enabled === false || disabledRules?.has(rule.id)) continue;
      if (rule.evaluator !== OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID) continue;

      const previous = seenIds.get(rule.id);
      if (previous) {
        throw new TypeError(
          `Duplicate active ownership rule id ${rule.id} in Rulebooks ${previous.id} and ${ref.id}.`,
        );
      }
      seenIds.set(rule.id, ref);
      active.push({ ref, rule });
    }
  }

  return active.sort((left, right) => left.rule.id.localeCompare(right.rule.id));
}

function parseOptions(rule: Rule): DeclaredOwnershipRuleOptions {
  if (!rule.appliesTo.includes("CapabilityMap")) {
    throw new TypeError(`Rule ${rule.id} must apply to CapabilityMap.`);
  }

  const system = typeof rule.options?.system === "string" ? rule.options.system.trim() : "";
  const capability = typeof rule.options?.capability === "string" ? rule.options.capability.trim() : "";
  if (!system || !capability) {
    throw new TypeError(`Rule ${rule.id} requires non-empty options.system and options.capability.`);
  }

  return { system, capability };
}

function ownersForSubject(subject: string, ownershipMap: OwnershipMap | undefined): string[] {
  if (!ownershipMap) return [];
  return uniqueSorted(
    ownershipMap.entries
      .filter((entry) => pathContains(entry.path, subject))
      .map((entry) => entry.ownerSystem),
  );
}

function pathContains(ownerPath: string, subject: string): boolean {
  const normalizedOwner = normalizePath(ownerPath);
  const normalizedSubject = normalizePath(subject);
  return normalizedSubject === normalizedOwner || normalizedSubject.startsWith(`${normalizedOwner}/`);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function globMatcher(pattern: string): RegExp {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`, "i");
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rule";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) byKey.set(`${ref.type}:${ref.id}:${ref.schemaVersion}`, ref);
  return [...byKey.values()].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}
