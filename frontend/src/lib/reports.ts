import type { ResearchReportSnapshot } from "@/lib/api";

const STORAGE_KEY = "earth-pulse.research-report.v1";

function isReportSnapshot(value: unknown): value is ResearchReportSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const report = value as Partial<ResearchReportSnapshot>;
  return (
    typeof report.question === "string" &&
    typeof report.start_year === "number" &&
    typeof report.end_year === "number" &&
    typeof report.location === "object" &&
    report.location !== null &&
    Array.isArray(report.analyses) &&
    report.analyses.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.place?.label === "string" &&
        typeof item.result?.trend?.direction === "string" &&
        Array.isArray(item.result?.annual_time_series?.records) &&
        typeof item.result?.dataset?.parameter_name === "string" &&
        typeof item.result?.dataset?.source_url === "string" &&
        typeof item.result?.dataset?.retrieved_at_utc === "string" &&
        (item.result?.dataset?.cache_status === "live" ||
          item.result?.dataset?.cache_status === "cached") &&
        typeof item.result?.dataset?.grid_cell_latitude === "number" &&
        typeof item.result?.dataset?.grid_cell_longitude === "number",
    )
  );
}

export function saveResearchReport(report: ResearchReportSnapshot): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "browser storage is unavailable";
    throw new Error(`Could not save this report in this browser: ${reason}`);
  }
}

export function loadResearchReport(): ResearchReportSnapshot | null {
  let serialized: string | null;
  try {
    serialized = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "browser storage is unavailable";
    throw new Error(`Could not read the saved report from this browser: ${reason}`);
  }
  if (serialized === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("The saved report is damaged. Run an investigation to create a new report.");
  }
  if (!isReportSnapshot(parsed)) {
    throw new Error("The saved report is incomplete. Run an investigation to create a new report.");
  }
  return parsed;
}
