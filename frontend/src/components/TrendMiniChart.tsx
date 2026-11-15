import { useId } from "react";
import { AnalyzeResponse, SeriesPoint } from "@/lib/api";

type TrendMiniChartProps = {
  result: AnalyzeResponse;
  title: string;
};

function linePath(
  records: SeriesPoint[],
  key: "value" | "trend_value",
  min: number,
  max: number,
): string {
  const width = 560;
  const height = 150;
  const padX = 12;
  const padY = 12;
  let hasCurrentSegment = false;

  return records
    .map((record, index) => {
      const value = record[key];
      if (value === null || value === undefined) {
        hasCurrentSegment = false;
        return "";
      }
      const x = padX + (index / Math.max(records.length - 1, 1)) * (width - 2 * padX);
      const y =
        height -
        padY -
        ((value - min) / Math.max(max - min, 1e-9)) * (height - 2 * padY);
      const command = hasCurrentSegment ? "L" : "M";
      hasCurrentSegment = true;
      return `${command}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
}

export default function TrendMiniChart({ result, title }: TrendMiniChartProps) {
  const titleId = useId();
  const records = result.annual_time_series.records;
  const availableValues = records.flatMap((record) =>
    [record.value, record.trend_value].filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    ),
  );
  if (availableValues.length === 0) {
    return (
      <p className="mini-chart-empty" role="status">
        No complete annual values are available to draw this chart.
      </p>
    );
  }
  const min = Math.min(...availableValues);
  const max = Math.max(...availableValues);

  return (
    <figure className="mini-chart">
      <figcaption id={titleId}>{title}</figcaption>
      <svg
        viewBox="0 0 560 184"
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="none"
      >
        <line x1="12" y1="162" x2="548" y2="162" className="mini-chart__axis" />
        <path
          d={linePath(records, "trend_value", min, max)}
          className="mini-chart__trend"
        />
        <path
          d={linePath(records, "value", min, max)}
          className="mini-chart__observed"
        />
      </svg>
      <div className="mini-chart__years" aria-hidden="true">
        <span>{records[0]?.period}</span>
        <span>{records[records.length - 1]?.period}</span>
      </div>
      <p>
        {result.annual_time_series.units}; missing years are gaps. Orange line is
        the fitted trend.
      </p>
    </figure>
  );
}
