import type { Report } from "./report-contract.ts";

export function renderReport(report: Report): string {
  return report.title;
}
