import type { ScrapeRunSummary } from "../shared/etl-types";

export async function main({
  run,
  candidateCount = run.candidateCount,
  queueCount = run.queueCount,
  successCount = run.successCount,
  errorCount = run.errorCount,
  notes,
  status
}: {
  run: ScrapeRunSummary;
  candidateCount?: number;
  queueCount?: number;
  successCount?: number;
  errorCount?: number;
  notes?: string;
  status?: ScrapeRunSummary["status"];
}): Promise<ScrapeRunSummary> {
  return {
    ...run,
    status: status ?? (errorCount > 0 ? "failed" : "completed"),
    finishedAt: new Date().toISOString(),
    candidateCount,
    queueCount,
    successCount,
    errorCount,
    notes: notes ?? run.notes
  };
}
