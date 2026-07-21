import type { Report } from "./report-contract.ts";

export type ReportExportInput = {
  id: string;
  title: string;
};

export function exportReport(input: ReportExportInput): Report {
  return {
    id: input.id,
    title: input.title,
  };
}
