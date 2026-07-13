// WO-14 sub-order D: capability_overlap on the capability graph.
//
// Two systems implementing the same declared capability is drift UNLESS a
// CapabilityContract declares the sharing (the declaration is cited in the
// exemption). Systems come only from non-inferred OwnershipMap entries; with
// no declared ownership the axis is inert (the WO-9 ownership precedent: no
// declared layer, no law). Step 0 found
// no existing overlap logic in the suggestion/phrase machinery - built,
// not composed. Citation: detection-design-decisions.md §C
// capability_overlap row (priority redesign).

import type { Finding } from "@rekon/kernel-findings";

export const CAPABILITY_OVERLAP_RULE_ID = "capability.overlap";

const OVERLAP_CITATION = "docs/strategy/detection-design-decisions.md §C capability_overlap row (WO-14 sub-order D)";

type CapabilityLike = {
  id?: string;
  name?: string;
  subjects?: string[];
  files?: string[];
};

type ContractLike = {
  id?: string;
  status?: string;
  allowedSystems?: string[];
  capabilityRef?: {
    id?: string;
    name?: string;
    subjects?: string[];
    phraseCapabilityId?: string;
  };
  match?: { verb?: string; noun?: string };
};

export function evaluateCapabilityOverlap(input: {
  capabilities: ReadonlyArray<CapabilityLike>;
  /** OwnershipMap entries. Explicitly inferred entries cannot establish overlap law. */
  ownershipEntries?: ReadonlyArray<{ path: string; ownerSystem: string; basis?: "declared" | "inferred" }>;
  contractEntries?: ReadonlyArray<ContractLike>;
}): Finding[] {
  const ownership = (input.ownershipEntries ?? []).filter((entry) => entry.basis !== "inferred");

  if (ownership.length === 0) {
    // No declared system layer -> no overlap law. Inert, honestly.
    return [];
  }

  const ownerOf = (file: string): string | undefined => {
    let best: { system: string; length: number } | undefined;

    for (const entry of ownership) {
      const prefix = entry.path.endsWith("/") ? entry.path : `${entry.path}`;

      if (file === entry.path || file.startsWith(`${prefix}/`) || file.startsWith(prefix)) {
        if (!best || prefix.length > best.length) {
          best = { system: entry.ownerSystem, length: prefix.length };
        }
      }
    }

    return best?.system;
  };

  const findings: Finding[] = [];

  for (const capability of input.capabilities) {
    const name = (capability.name ?? capability.id ?? "").toLowerCase().trim();

    if (!name) {
      continue;
    }

    const files = [...new Set([...(capability.subjects ?? []), ...(capability.files ?? [])])];
    const bySystem = new Map<string, string[]>();

    for (const file of files) {
      const system = ownerOf(file);

      if (!system) {
        continue;
      }

      bySystem.set(system, [...(bySystem.get(system) ?? []), file]);
    }

    if (bySystem.size < 2) {
      continue;
    }

    const systems = [...bySystem.keys()].sort();

    // Declared sharing disambiguates intentional overlap from drift.
    const sharing = (input.contractEntries ?? []).find((contract) => {
      const ref = contract.capabilityRef;
      const matches = ref?.id === capability.id
        || ref?.phraseCapabilityId === capability.id
        || (typeof ref?.name === "string" && ref.name.toLowerCase().trim() === name)
        || [contract.match?.verb, contract.match?.noun]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .join(" ")
          .toLowerCase()
          .trim() === name
        || (ref?.subjects ?? []).some((subject) => files.includes(subject));
      const allowed = contract.allowedSystems ?? [];

      return matches && allowed.length >= 2 && systems.every((system) => allowed.includes(system));
    });

    if (sharing) {
      // Intentional overlap, declared; the declaration is the exemption's
      // citation. No finding.
      continue;
    }

    findings.push({
      id: `${CAPABILITY_OVERLAP_RULE_ID}:${name}`,
      type: "capability_overlap",
      severity: "medium",
      title: `Capability "${capability.name ?? capability.id}" implemented in ${systems.length} systems`,
      description: `Declared ownership places its files in ${systems.join(", ")}; no CapabilityContract declares the sharing.`,
      subjects: [name],
      files: files.sort(),
      ruleId: CAPABILITY_OVERLAP_RULE_ID,
      suggestedAction: "Consolidate the implementation into one system, or declare intentional sharing in a CapabilityContract (allowedSystems).",
      evidence: [],
      payload: {
        systems,
        filesBySystem: Object.fromEntries([...bySystem.entries()].map(([k, v]) => [k, v.sort()])),
        citation: OVERLAP_CITATION,
      },
    } as Finding);
  }

  return findings.sort((a, b) => a.id.localeCompare(b.id));
}
