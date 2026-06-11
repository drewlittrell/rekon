// WO-14 sub-order A: the tech_debt deterministic core.
//
// Emits one finding per production file carrying debt markers (TODO /
// FIXME / HACK / @deprecated / disabled tests), built from the
// `debt_marker` evidence facts the js-ts provider extracts. Scope rides
// the shared non-production path (WO-12); the one deliberate exception is
// disabled-test markers, which fire INSIDE test trees - a skipped test is
// debt precisely where it lives. Citation on every finding:
// detection-design-decisions.md §B.

import type { Finding } from "@rekon/kernel-findings";

import { isNonProductionPath } from "./grammar-divergence.js";

export const DEBT_MARKERS_RULE_ID = "debt.markers";

const DEBT_CITATION = "docs/strategy/detection-design-decisions.md §B (WO-14 sub-order A)";

type FactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

export function evaluateDebtMarkers(facts: ReadonlyArray<FactLike>): Finding[] {
  const byFile = new Map<string, Array<{ marker: string; detail: string }>>();

  for (const fact of facts) {
    if (fact.kind !== "debt_marker") {
      continue;
    }

    const file = fact.subject;
    const marker = typeof fact.value.marker === "string" ? fact.value.marker : "unknown";

    // Non-production scope (shared path), except disabled tests: those
    // belong to test trees by nature and stay visible there.
    if (isNonProductionPath(file) && marker !== "disabled-test") {
      continue;
    }

    const detail = typeof fact.value.detail === "string" ? fact.value.detail : "";
    const list = byFile.get(file) ?? [];

    list.push({ marker, detail });
    byFile.set(file, list);
  }

  const findings: Finding[] = [];

  for (const [file, markers] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const counts = new Map<string, number>();

    for (const m of markers) {
      counts.set(m.marker, (counts.get(m.marker) ?? 0) + 1);
    }

    const summary = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([marker, count]) => `${marker}×${count}`)
      .join(", ");

    findings.push({
      id: `${DEBT_MARKERS_RULE_ID}:${file}`,
      type: "tech_debt",
      severity: "low",
      title: `Debt markers in ${file}`,
      description: `${file} carries ${markers.length} debt marker(s): ${summary}.`,
      subjects: [file],
      files: [file],
      ruleId: DEBT_MARKERS_RULE_ID,
      suggestedAction: "Resolve or schedule the marked debt; markers are declarations of known shortcuts.",
      evidence: [],
      payload: {
        markers: markers.sort((a, b) => a.marker.localeCompare(b.marker) || a.detail.localeCompare(b.detail)),
        citation: DEBT_CITATION,
      },
    } as Finding);
  }

  return findings;
}
