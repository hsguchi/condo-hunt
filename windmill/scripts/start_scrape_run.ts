import type { ScrapeRunSummary } from "../shared/etl-types";

function buildRunId(startedAt: string) {
  return `pg-${startedAt.replace(/[\-:TZ.]/g, "").slice(0, 14)}`;
}

export async function main({
  jobType = "daily_propertyguru_intake",
  sourceCount = 0,
  notes
}: {
  jobType?: string;
  sourceCount?: number;
  notes?: string;
} = {}): Promise<ScrapeRunSummary> {
  const startedAt = new Date().toISOString();

  return {
    runId: buildRunId(startedAt),
    jobType,
    status: "running",
    startedAt,
    sourceCount,
    candidateCount: 0,
    queueCount: 0,
    successCount: 0,
    errorCount: 0,
    notes
  };
}
