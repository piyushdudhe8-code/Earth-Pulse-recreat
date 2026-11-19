"use client";

import { useId, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import { AnalyzeResponse, SeriesPoint, analyzeLocation } from "@/lib/api";
import { useLanguage } from "@/lib/language";

type ClimateResultProps = {
  result: AnalyzeResponse;
  placeName: string;
};

type ClimateChartPoint = SeriesPoint & {
  displayValue: number | null;
  displayTrend: number | null;
  absoluteValue: number | null;
  anomalyValue: number | null;
  complete: boolean;
};

type TemperatureMode = "absolute" | "anomaly";

const DISPLAY_YEARS = 20;
const BASELINE_START_YEAR = 1991;
const BASELINE_END_YEAR = 2020;
const DAY_MS = 24 * 60 * 60 * 1000;

function isClimateChartPoint(value: unknown): value is ClimateChartPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "period" in value &&
    typeof value.period === "string" &&
    "absoluteValue" in value &&
    (typeof value.absoluteValue === "number" || value.absoluteValue === null) &&
    "complete" in value &&
    typeof value.complete === "boolean"
  );
}

function calculateBaseline(response: AnalyzeResponse): number | null {
  const yearlyValues = new Map(
    response.annual_time_series.records.map((record) => [
      Number(record.period),
      record.value,
    ]),
  );
  const baselineYears = Array.from(
    { length: BASELINE_END_YEAR - BASELINE_START_YEAR + 1 },
    (_, index) => BASELINE_START_YEAR + index,
  );
  if (
    baselineYears.some((year) => {
      const value = yearlyValues.get(year);
      return typeof value !== "number" || !Number.isFinite(value);
    })
  ) {
    return null;
  }

  const weightedTotal = baselineYears.reduce((total, year) => {
    const value = yearlyValues.get(year);
    const days =
      (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS;
    return total + (value as number) * days;
  }, 0);
  const totalDays = baselineYears.reduce(
    (total, year) =>
      total + (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS,
    0,
  );
  return weightedTotal / totalDays;
}

function temperatureDomain(
  records: ClimateChartPoint[],
  anomalyMode: boolean,
): [number, number] {
  const values = records.flatMap((record) =>
    [
      record.displayValue,
      record.displayTrend,
      record.confidence_lower,
      record.confidence_upper,
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );
  if (anomalyMode) {
    values.push(0);
  }
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const center = (dataMin + dataMax) / 2;
  const minimumRange = anomalyMode ? 1 : 2;
  const range = Math.max(dataMax - dataMin, minimumRange);
  const padding = Math.max((dataMax - dataMin) * 0.12, anomalyMode ? 0.08 : 0.15);
  return [center - range / 2 - padding, center + range / 2 + padding];
}

function ClimateTooltip({
  active,
  payload,
  label,
  units,
  hindi,
  anomalyMode,
  variable,
}: TooltipContentProps & {
  units: string;
  hindi: boolean;
  anomalyMode: boolean;
  variable: AnalyzeResponse["variable"];
}) {
  const point = payload.map((entry) => entry.payload).find(isClimateChartPoint);
  if (!active || !point) {
    return null;
  }

  return (
    <div className="climate-tooltip">
      <strong>{label ?? point.period}</strong>
      {point.absoluteValue !== null && (
        <p>
          {variable === "temperature"
            ? hindi ? "साल का औसत तापमान" : "Annual average temperature"
            : hindi ? "साल की औसत सुधारित वर्षा दर" : "Annual average corrected precipitation rate"}:{" "}
          {point.absoluteValue.toFixed(2)} {anomalyMode ? "°C" : units === "C" ? "°C" : units}
        </p>
      )}
      {point.anomalyValue !== null && (
        <p>
          {hindi ? "1991–2020 के औसत से अंतर" : "Anomaly vs 1991–2020"}:{" "}
          {point.anomalyValue > 0 ? "+" : ""}
          {point.anomalyValue.toFixed(2)} °C
        </p>
      )}
      {point.absoluteValue === null && anomalyMode && (
        <p>{hindi ? "तापमान डेटा उपलब्ध नहीं" : "Temperature data unavailable"}</p>
      )}
      {point.absoluteValue === null && !anomalyMode && (
        <p>{hindi ? "साल का मान उपलब्ध नहीं" : "Annual value unavailable"}</p>
      )}
      <p className="climate-tooltip__availability">
        {point.complete
          ? hindi
            ? "डेटा उपलब्ध: सभी 12 महीने"
            : "Data available: all 12 months"
          : hindi
            ? "अधूरा साल: ग्राफ़ में मान नहीं दिखाया गया"
            : "Incomplete year: no annual value is plotted"}
      </p>
    </div>
  );
}

function ConfidenceBand({ records }: { records: SeriesPoint[] }) {
  const plotArea = usePlotArea();
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const clipId = `confidence-clip-${useId().replace(/:/g, "")}`;

  if (!plotArea || !xScale || !yScale) {
    return null;
  }

  const segments: SeriesPoint[][] = [];
  let segment: SeriesPoint[] = [];
  for (const point of records) {
    if (point.confidence_lower === null || point.confidence_upper === null) {
      if (segment.length > 1) {
        segments.push(segment);
      }
      segment = [];
      continue;
    }
    segment.push(point);
  }
  if (segment.length > 1) {
    segments.push(segment);
  }

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={plotArea.x}
            y={plotArea.y}
            width={plotArea.width}
            height={plotArea.height}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        {segments.map((points, index) => {
          const upper = points.map((point) => ({
            x: xScale(point.period, { position: "middle" }),
            y: yScale(point.confidence_upper),
          }));
          const lower = [...points].reverse().map((point) => ({
            x: xScale(point.period, { position: "middle" }),
            y: yScale(point.confidence_lower),
          }));
          const coordinates = [...upper, ...lower];
          if (coordinates.some((point) => point.x === undefined || point.y === undefined)) {
            return null;
          }
          const path = coordinates
            .map((point, pointIndex) => {
              const command = pointIndex === 0 ? "M" : "L";
              return `${command}${point.x},${point.y}`;
            })
            .join(" ");
          return (
            <path
              key={index}
              d={`${path} Z`}
              fill="#22d3ee"
              fillOpacity={0.12}
              stroke="none"
            >
              <title>
                95% confidence band around the fitted trend
              </title>
            </path>
          );
        })}
      </g>
    </>
  );
}

function translateLimitation(limitation: string): string {
  const translations: Record<string, string> = {
    "The point query represents the nearest NASA grid cell, not a measurement at the exact location.":
      "यह बिंदु अनुरोध NASA के सबसे पास वाले ग्रिड सेल को दिखाता है, ठीक चुनी हुई जगह का माप नहीं।",
    "This analysis uses complete calendar-year means, so within-year seasonal changes are not shown in the trend test.":
      "यह विश्लेषण पूरे कैलेंडर साल का औसत उपयोग करता है, इसलिए साल के भीतर मौसम का बदलाव रुझान जाँच में नहीं दिखता।",
    "The Mann–Kendall test does not adjust for serial correlation between years.":
      "Mann–Kendall जाँच सालों के बीच आपसी संबंध का समायोजन नहीं करती।",
    "A trend describes a pattern in this record; it does not identify a cause.":
      "रुझान इस रिकॉर्ड का पैटर्न बताता है; यह कारण नहीं बताता।",
    "NASA may revise historical data, and missing monthly values reduce the usable record.":
      "NASA पुराने डेटा में सुधार कर सकता है और गायब मासिक मान उपयोगी रिकॉर्ड को छोटा करते हैं।",
  };
  return translations[limitation] ?? limitation;
}

export default function ClimateResult({
  result,
  placeName,
}: ClimateResultProps) {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const titleId = useId();
  const [temperatureMode, setTemperatureMode] =
    useState<TemperatureMode>("absolute");
  const [baseline, setBaseline] = useState<number | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineUnavailable, setBaselineUnavailable] = useState(false);
  const [baselineMessage, setBaselineMessage] = useState<string | null>(null);
  const variableLabel =
    hindi
      ? result.variable === "temperature"
        ? "साल का औसत तापमान"
        : "साल की औसत सुधारित वर्षा दर"
      : result.variable === "temperature"
        ? "annual average temperature"
        : "annual average corrected precipitation rate";
  const trendWord =
    result.trend.direction === "increasing"
      ? hindi ? "बढ़ा" : "risen"
      : result.trend.direction === "decreasing"
        ? hindi ? "घटा" : "fallen"
        : hindi ? "लंबे समय में साफ़ बढ़त या गिरावट नहीं दिखाता" : "does not show a clear long-term rise or fall";
  const headline =
    result.trend.direction === "no clear trend"
      ? hindi
        ? `${placeName} के निकटतम NASA ग्रिड सेल का ${variableLabel} रिकॉर्ड ${trendWord}।`
        : `The ${variableLabel} record at the nearest NASA grid cell to ${placeName} ${trendWord}.`
      : hindi
        ? `${result.dataset.first_observation} से ${result.dataset.last_observation} तक, ${placeName} के निकटतम NASA ग्रिड सेल का ${variableLabel} लगभग ${Math.abs(result.trend.rate_of_change).toFixed(1)} ${result.trend.rate_units} ${trendWord}।`
        : `From ${result.dataset.first_observation} to ${result.dataset.last_observation}, the ${variableLabel} at the nearest NASA grid cell to ${placeName} ${trendWord} by about ${Math.abs(result.trend.rate_of_change).toFixed(1)} ${result.trend.rate_units}.`;
  const directionLabel =
    result.trend.direction === "increasing"
      ? hindi ? "बढ़ रहा है" : "Rising"
      : result.trend.direction === "decreasing"
        ? hindi ? "घट रहा है" : "Falling"
        : hindi ? "कोई साफ़ रुझान नहीं" : "No clear trend";
  const significanceText = result.trend.significant
    ? hindi
      ? "इस रिकॉर्ड में यह पैटर्न केवल संयोग से होने की संभावना कम है।"
      : "The pattern is unlikely to be random in this record."
    : hindi
      ? "इस रिकॉर्ड में साल-दर-साल बदलाव से अलग कोई साफ़ पैटर्न नहीं दिखता।"
      : "This record does not show a clear pattern beyond year-to-year variation.";
  const simpleSummary = hindi
    ? `इस रिकॉर्ड में ${variableLabel} ${result.trend.direction === "increasing" ? "बढ़ा" : result.trend.direction === "decreasing" ? "घटा" : "में साफ़ ऊपर या नीचे का रुझान नहीं"}। अनुमानित बदलाव ${Math.abs(result.trend.rate_of_change).toFixed(2)} ${result.trend.rate_units} है। Mann–Kendall जाँच का p-value ${result.trend.mann_kendall_p_value.toPrecision(3)} है। यह डेटा का वर्णन करता है, बदलाव का कारण नहीं बताता।`
    : result.plain_language;
  const regressionInterval =
    result.trend.linear_regression.confidence_interval_95;
  const annualRecords = [...result.annual_time_series.records].sort(
    (left, right) => left.period.localeCompare(right.period),
  );
  const latestCompleteRecords = annualRecords
    .filter(
      (record) =>
        typeof record.value === "number" && Number.isFinite(record.value),
    )
    .slice(-DISPLAY_YEARS);
  const firstChartYear = Number(latestCompleteRecords[0]?.period);
  const lastChartYear = Number(
    latestCompleteRecords[latestCompleteRecords.length - 1]?.period,
  );
  const chartRecords =
    latestCompleteRecords.length > 0
      ? annualRecords.filter((record) => {
          const year = Number(record.period);
          return year >= firstChartYear && year <= lastChartYear;
        })
      : [];
  const isTemperature = result.variable === "temperature";
  const anomalyMode = isTemperature && temperatureMode === "anomaly" && baseline !== null;
  const displayRecords: ClimateChartPoint[] = chartRecords.map((record) => {
    const anomalyValue =
      isTemperature && baseline !== null && record.value !== null
        ? record.value - baseline
        : null;
    return {
      ...record,
      absoluteValue: record.value,
      anomalyValue,
      complete:
        typeof record.value === "number" && Number.isFinite(record.value),
      displayValue: anomalyMode ? anomalyValue : record.value,
      displayTrend:
        anomalyMode && record.trend_value !== null
          ? record.trend_value - baseline
          : record.trend_value,
      confidence_lower:
        anomalyMode && record.confidence_lower !== null
          ? record.confidence_lower - baseline
          : record.confidence_lower,
      confidence_upper:
        anomalyMode && record.confidence_upper !== null
          ? record.confidence_upper - baseline
          : record.confidence_upper,
    };
  });
  const completeTemperatureYears = displayRecords.filter(
    (record) => record.complete && record.absoluteValue !== null,
  );
  const warmestYear = completeTemperatureYears.reduce<ClimateChartPoint | null>(
    (warmest, record) =>
      warmest === null || (record.absoluteValue ?? -Infinity) > (warmest.absoluteValue ?? -Infinity)
        ? record
        : warmest,
    null,
  );
  const coolestYear = completeTemperatureYears.reduce<ClimateChartPoint | null>(
    (coolest, record) =>
      coolest === null || (record.absoluteValue ?? Infinity) < (coolest.absoluteValue ?? Infinity)
        ? record
        : coolest,
    null,
  );
  const firstCompleteYear = completeTemperatureYears[0] ?? null;
  const lastCompleteYear =
    completeTemperatureYears[completeTemperatureYears.length - 1] ?? null;
  const overallChange =
    firstCompleteYear?.absoluteValue !== null &&
    firstCompleteYear?.absoluteValue !== undefined &&
    lastCompleteYear?.absoluteValue !== null &&
    lastCompleteYear?.absoluteValue !== undefined
      ? lastCompleteYear.absoluteValue - firstCompleteYear.absoluteValue
      : null;
  const yDomain = isTemperature
    ? temperatureDomain(displayRecords, anomalyMode)
    : undefined;
  const hasConfidenceBand = displayRecords.some(
    (record) =>
      record.confidence_lower !== null && record.confidence_upper !== null,
  );
  const completeYearCount = displayRecords.filter((record) => record.complete).length;
  const missingOrIncompleteYearCount = Math.max(
    DISPLAY_YEARS - completeYearCount,
    0,
  );
  const incompleteYearCount = Math.max(
    displayRecords.length - completeYearCount,
    0,
  );

  const selectAnomalyMode = async () => {
    if (baseline !== null) {
      setTemperatureMode("anomaly");
      return;
    }
    if (baselineLoading || baselineUnavailable) {
      return;
    }

    setBaselineLoading(true);
    setBaselineMessage(null);
    try {
      const baselineResponse = await analyzeLocation({
        lat: result.latitude,
        lon: result.longitude,
        variable: "temperature",
        start_year: BASELINE_START_YEAR,
        end_year: BASELINE_END_YEAR,
        frequency: "monthly",
      });
      const baselineValue = calculateBaseline(baselineResponse);
      if (baselineValue === null) {
        setBaselineUnavailable(true);
        setBaselineMessage(
          hindi
            ? "1991–2020 के सभी 30 पूरे साल उपलब्ध नहीं हैं; इसलिए तापमान विसंगति नहीं निकाली गई।"
            : "All 30 complete years from 1991–2020 are not available, so no temperature anomaly was calculated.",
        );
        return;
      }
      setBaseline(baselineValue);
      setTemperatureMode("anomaly");
    } catch (error) {
      setBaselineMessage(
        error instanceof Error
          ? `${hindi ? "1991–2020 का आधार डेटा नहीं मिल सका:" : "Could not load 1991–2020 baseline data:"} ${error.message}`
          : hindi
            ? "1991–2020 का आधार डेटा नहीं मिल सका।"
            : "Could not load 1991–2020 baseline data.",
      );
    } finally {
      setBaselineLoading(false);
    }
  };

  return (
    <article className="climate-result" aria-labelledby={titleId}>
      <div className="climate-result__heading">
        <p className="section-kicker">{hindi ? "NASA डेटा की कहानी" : "NASA DATA STORY"}</p>
        <h2 id={titleId}>{headline}</h2>
        <p className="climate-result__summary">{simpleSummary}</p>
      </div>

      <div className={`chart-card${isTemperature ? " chart-card--temperature" : ""}`}>
        <div className="chart-card__heading">
          <div className="chart-card__title-row">
            <div>
              <h3>{hindi ? "हर साल का रिकॉर्ड" : "Year-by-Year Record"}</h3>
              <p>
                {isTemperature
                  ? hindi
                    ? anomalyMode
                      ? "साल के औसत तापमान से 1991–2020 के औसत तापमान का अंतर दिखाया गया है।"
                      : "NASA POWER के MERRA-2 री-एनालिसिस पर आधारित सालाना तापमान; यह सीधे स्थानीय माप नहीं है।"
                    : anomalyMode
                      ? "Annual average temperature minus the 1991–2020 average baseline."
                      : "Annual temperature from NASA POWER's MERRA-2 reanalysis; these are not direct local measurements."
                  : hindi
                    ? "साल के आँकड़े मौसम के चक्र का असर कम करते हैं।"
                    : "Annual values reduce the effect of the seasonal cycle."}
              </p>
            </div>
            {isTemperature && (
              <div
                className="temperature-mode-switch"
                role="group"
                aria-label={hindi ? "तापमान दिखाने का तरीका" : "Temperature display mode"}
              >
                <button
                  type="button"
                  aria-pressed={!anomalyMode}
                  onClick={() => setTemperatureMode("absolute")}
                >
                  {hindi ? "तापमान" : "Temperature"}
                </button>
                <button
                  type="button"
                  aria-pressed={anomalyMode}
                  disabled={baselineLoading || baselineUnavailable}
                  onClick={() => void selectAnomalyMode()}
                >
                  {baselineLoading
                    ? hindi
                      ? "आधार डेटा ला रहे हैं…"
                      : "Loading baseline…"
                    : hindi
                      ? "विसंगति"
                      : "Anomaly"}
                </button>
              </div>
            )}
          </div>
        </div>
        {baselineMessage && (
          <p className="temperature-baseline-message" role="status">
            {baselineMessage}
          </p>
        )}
        {anomalyMode && (
          <p className="temperature-baseline-note">
            {hindi
              ? "आधार अवधि: 1991–2020 (30 पूरे साल); NASA POWER के मासिक मानों से निकला दिन-भारित औसत।"
              : "Baseline: 1991–2020 (30 complete years), calculated as a day-weighted average of NASA POWER monthly values."}
          </p>
        )}
        <div className={`climate-chart${isTemperature ? " climate-chart--temperature" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayRecords}
              margin={{ top: 14, right: 22, left: 12, bottom: 8 }}
            >
              <CartesianGrid
                stroke={isTemperature ? "#254154" : "#dfe8e4"}
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                minTickGap={20}
                tick={{ fontSize: 12, fill: isTemperature ? "#c7d8e6" : "#526277" }}
                tickLine={{ stroke: isTemperature ? "#7890a3" : "#84928c" }}
                axisLine={{ stroke: isTemperature ? "#7890a3" : "#84928c" }}
                interval="preserveStartEnd"
              />
              <YAxis
                width={isTemperature ? 76 : 64}
                domain={yDomain}
                tick={{ fontSize: 12, fill: isTemperature ? "#c7d8e6" : "#526277" }}
                tickLine={{ stroke: isTemperature ? "#7890a3" : "#84928c" }}
                axisLine={{ stroke: isTemperature ? "#7890a3" : "#84928c" }}
                tickFormatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                label={
                  isTemperature
                    ? {
                        value: anomalyMode
                          ? hindi
                            ? "तापमान विसंगति (°C)"
                            : "Temperature anomaly (°C)"
                          : hindi
                            ? "तापमान (°C)"
                            : "Temperature (°C)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#c7d8e6",
                        fontSize: 12,
                      }
                    : undefined
                }
              />
              <Tooltip
                content={(props) => (
                  <ClimateTooltip
                    {...props}
                    units={result.annual_time_series.units}
                    hindi={hindi}
                    anomalyMode={anomalyMode}
                    variable={result.variable}
                  />
                )}
                cursor={{ stroke: isTemperature ? "#91aabc" : "#a8b8b0", strokeDasharray: "4 4" }}
              />
              {!isTemperature && (
                <Legend
                  wrapperStyle={{ color: "#526277", fontSize: 13 }}
                  formatter={(value) =>
                    value === "Fitted trend"
                      ? hindi ? "अनुमानित रुझान" : "Fitted trend"
                      : hindi ? "सालाना मान" : "Annual value"
                  }
                />
              )}
              {hasConfidenceBand && <ConfidenceBand records={displayRecords} />}
              <Line
                dataKey="displayValue"
                name={hindi ? "सालाना मान" : "Annual value"}
                stroke={isTemperature ? "#22d3ee" : "#167d8d"}
                strokeWidth={isTemperature ? 3 : 2.5}
                dot={{
                  r: isTemperature ? 4 : 3,
                  fill: isTemperature ? "#071726" : "#167d8d",
                  stroke: isTemperature ? "#22d3ee" : "#167d8d",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 6, fill: "#ffffff", stroke: isTemperature ? "#22d3ee" : "#167d8d", strokeWidth: 3 }}
                type="monotone"
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="displayTrend"
                name={hindi ? "अनुमानित रुझान" : "Fitted trend"}
                stroke={isTemperature ? "#f5b942" : "#ad4f1c"}
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {anomalyMode && (
                <ReferenceLine
                  y={0}
                  stroke="#e9f1f7"
                  strokeDasharray="5 5"
                  label={{
                    value: hindi ? "सामान्य (0°C)" : "Baseline (0°C)",
                    position: "insideTopRight",
                    fill: "#e9f1f7",
                    fontSize: 12,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {isTemperature && (
          <ul
            className="climate-chart-legend"
            aria-label={hindi ? "ग्राफ़ संकेत" : "Chart legend"}
          >
            <li>
              <span className="climate-chart-legend__key" aria-hidden="true" />
              {anomalyMode
                ? hindi ? "तापमान विसंगति" : "Temperature anomaly"
                : hindi ? "सालाना औसत तापमान" : "Annual average temperature"}
            </li>
            <li>
              <span className="climate-chart-legend__key climate-chart-legend__key--trend" aria-hidden="true" />
              {hindi ? "दीर्घकालीन रुझान" : "Fitted trend"}
            </li>
            {hasConfidenceBand && (
              <li>
                <span className="climate-chart-legend__key climate-chart-legend__key--band" aria-hidden="true" />
                {hindi ? "रुझान रेखा की 95% विश्वास सीमा" : "95% confidence band around fitted trend"}
              </li>
            )}
          </ul>
        )}
        {isTemperature && (
          <p className="temperature-axis-note">
            {hindi
              ? "Y-अक्ष वास्तविक मानों के आसपास रखा गया है (शून्य से शुरू नहीं होता), ताकि बदलाव पढ़ने योग्य हों।"
              : "The Y-axis is focused on the observed values (it does not start at zero) to make changes readable."}
          </p>
        )}
        <p className="chart-card__units">
          {isTemperature
            ? hindi
              ? `20 के लक्ष्य में ${completeYearCount} पूरे साल के मान उपलब्ध हैं; ${missingOrIncompleteYearCount} पूरे साल उपलब्ध नहीं हैं। इस अवधि के ${incompleteYearCount} अधूरे साल ग्राफ़ में खाली अंतराल के रूप में दिखते हैं।`
              : `${completeYearCount} of ${DISPLAY_YEARS} target complete years are available; ${missingOrIncompleteYearCount} are unavailable. ${incompleteYearCount} incomplete years within the displayed period appear as gaps.`
            : hindi
              ? `इकाइयाँ: ${result.annual_time_series.units}। खाली या अधूरे साल में अंतर दिखेगा।`
              : `Values: ${result.annual_time_series.units}. Missing or incomplete years are shown as gaps.`}
        </p>
        {isTemperature && (
          <p className="temperature-chart-explanation">
            {hindi
              ? "हर बिंदु साल के औसत तापमान को दिखाता है। साल-दर-साल उतार-चढ़ाव अल्पकालिक बदलाव दिखाते हैं, जबकि रुझान रेखा लंबे समय की दिशा समझने में मदद करती है। छोटे उतार-चढ़ाव का मतलब यह नहीं कि लंबी अवधि का जलवायु रुझान पलट गया है।"
              : "Each point represents the annual average temperature. Year-to-year fluctuations show short-term variation, while the trend line helps identify the longer-term direction. Short-term fluctuations do not necessarily indicate a reversal of the long-term climate trend."}
          </p>
        )}
      </div>

      {isTemperature && (
        <div
          className="climate-summary-grid"
          aria-label={hindi ? "तापमान का सारांश" : "Temperature summary"}
        >
          <section className="climate-summary-card">
            <span>{hindi ? "सबसे गर्म साल" : "Warmest Year"}</span>
            <strong>
              {warmestYear
                ? `${warmestYear.period} · ${warmestYear.absoluteValue?.toFixed(2)} °C`
                : "—"}
            </strong>
          </section>
          <section className="climate-summary-card">
            <span>{hindi ? "सबसे ठंडा साल" : "Coolest Year"}</span>
            <strong>
              {coolestYear
                ? `${coolestYear.period} · ${coolestYear.absoluteValue?.toFixed(2)} °C`
                : "—"}
            </strong>
          </section>
          <section className="climate-summary-card">
            <span>{hindi ? "कुल बदलाव" : "Overall Change"}</span>
            <strong>
              {overallChange === null
                ? "—"
                : `${overallChange > 0 ? "+" : ""}${overallChange.toFixed(2)} °C`}
            </strong>
            <small>
              {firstCompleteYear && lastCompleteYear
                ? `${firstCompleteYear.period} → ${lastCompleteYear.period}`
                : hindi
                  ? "पूरा डेटा उपलब्ध नहीं"
                  : "Complete data unavailable"}
            </small>
          </section>
          <section className="climate-summary-card">
            <span>{hindi ? "दीर्घकालीन रुझान" : "Long-Term Trend"}</span>
            <strong>
              {`${result.trend.rate_of_change > 0 ? "+" : ""}${result.trend.rate_of_change.toFixed(2)} °C / decade`}
            </strong>
            <small>
              {hindi ? "Sen की ढलान" : "Sen's slope"}
            </small>
          </section>
        </div>
      )}

      <div className="stat-grid" aria-label={hindi ? "रुझान का सारांश" : "Trend summary"}>
        <section className="stat-card">
          <span className="stat-card__label">{hindi ? "दिशा" : "Direction"}</span>
          <strong>{directionLabel}</strong>
          <p>{result.trend.direction === "no clear trend" ? (hindi ? "लंबे समय का साफ़ बदलाव नहीं मिला।" : "No clear long-term change was detected.") : (hindi ? "यह दिशा सालाना रिकॉर्ड पर आधारित है।" : "This direction is based on the annual record.")}</p>
        </section>
        <section className="stat-card">
          <span className="stat-card__label">{hindi ? "बदलाव की दर" : "Rate of change"}</span>
          <strong>
            {result.trend.direction === "no clear trend"
              ? result.trend.rate_of_change.toFixed(1)
              : `${result.trend.rate_of_change > 0 ? "+" : "−"}${Math.abs(result.trend.rate_of_change).toFixed(1)}`}{" "}
            {result.trend.rate_units}
          </strong>
          <p>{hindi ? "सालाना आँकड़ों की ढलान से अनुमान लगाया गया।" : "Estimated from the slope through the annual values."}</p>
        </section>
        <section className="stat-card">
          <span className="stat-card__label">{hindi ? "क्या यह साफ़ पैटर्न है या संयोग?" : "Is this real or just random?"}</span>
          <strong>{result.trend.significant ? (hindi ? "साफ़ पैटर्न" : "A clear pattern") : (hindi ? "अभी साफ़ नहीं" : "Not clear yet")}</strong>
          <p>{significanceText}</p>
        </section>
      </div>

      <p className="source-note">
        {hindi ? "स्रोत:" : "Source:"} NASA POWER (MERRA-2) |{" "}
        {hindi ? "डेटा का प्रकार:" : "Data type:"} reanalysis / model-derived.
      </p>

      <details className="science-panel">
        <summary>{hindi ? "विज्ञान समझाएँ" : "Show me the science"}</summary>
        <div className="science-panel__content">
          <dl className="science-details">
            <div>
              <dt>{hindi ? "जगह" : "Location"}</dt>
              <dd>{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</dd>
            </div>
            <div>
              <dt>{hindi ? "डेटा की अवधि" : "Data period"}</dt>
              <dd>{result.dataset.first_observation ?? "No data"} to {result.dataset.last_observation ?? "No data"}</dd>
            </div>
            <div>
              <dt>{hindi ? "गायब मासिक मान" : "Missing monthly values"}</dt>
              <dd>{result.data_availability.missing_months} of {result.data_availability.expected_months}</dd>
            </div>
            <div>
              <dt>{hindi ? "डेटासेट की इकाइयाँ" : "Dataset units"}</dt>
              <dd>{result.dataset.source_units}; reported as {result.annual_time_series.units} per year</dd>
            </div>
            <div>
              <dt>Mann-Kendall p-value</dt>
              <dd>{result.trend.mann_kendall_p_value.toPrecision(3)}</dd>
            </div>
            <div>
              <dt>Sen&apos;s slope</dt>
              <dd>{result.trend.sen_slope_per_year.toPrecision(4)} {result.annual_time_series.units} per year</dd>
            </div>
            <div>
              <dt>Linear regression slope (95% confidence interval)</dt>
              <dd>
                {result.trend.linear_regression.slope_per_year.toPrecision(4)}{" "}
                [{regressionInterval[0].toPrecision(4)}, {regressionInterval[1].toPrecision(4)}]{" "}
                {result.annual_time_series.units} per year
              </dd>
            </div>
            <div>
              <dt>{hindi ? "जाँचें" : "Tests"}</dt>
              <dd>{result.trend.test_names.join("; ")}</dd>
            </div>
            <div>
              <dt>{hindi ? "डेटा का प्रकार" : "Data type"}</dt>
              <dd>{result.dataset.data_type}</dd>
            </div>
            <div>
              <dt>{hindi ? "सालाना गणना" : "Annual calculation"}</dt>
              <dd>
                {hindi
                  ? result.variable === "temperature"
                    ? "साल का तापमान NASA के 12 मासिक औसत का, दिनों की संख्या के अनुसार भारित औसत है। इकाई NASA की मूल इकाई ही रहती है।"
                    : "साल का मान NASA की 12 मासिक सुधारित वर्षा दर का दिनों के अनुसार भारित औसत है। इकाई NASA की मूल इकाई ही रहती है।"
                  : result.dataset.aggregation}
              </dd>
            </div>
          </dl>
          <h4>{hindi ? "सीमाएँ" : "Limitations"}</h4>
          <ul>
            {result.limitations.map((limitation) => (
              <li key={limitation}>{hindi ? translateLimitation(limitation) : limitation}</li>
            ))}
          </ul>
        </div>
      </details>

      <section
        className="provenance-panel"
        aria-label={hindi ? "NASA डेटा का स्रोत और तरीका" : "NASA data provenance"}
      >
        <div className="provenance-panel__heading">
          <div>
            <p className="section-kicker">{hindi ? "डेटा की जाँच" : "DATA PROVENANCE"}</p>
            <h3>{hindi ? "NASA डेटा का स्रोत" : "NASA data source"}</h3>
          </div>
          {result.dataset.cache_status === "live" ? (
            <span className="verified-data-badge">NASA DATA VERIFIED</span>
          ) : (
            <span className="cached-data-badge">
              {hindi ? "कैश किया गया डेटा" : "CACHED DATA"}
            </span>
          )}
        </div>
        <dl className="provenance-grid">
          <div>
            <dt>{hindi ? "स्रोत" : "Source"}</dt>
            <dd>NASA POWER (MERRA-2)</dd>
          </div>
          <div>
            <dt>{hindi ? "पैरामीटर" : "Parameter"}</dt>
            <dd>{result.dataset.parameter_name}</dd>
          </div>
          <div>
            <dt>{hindi ? "मूल NASA इकाई" : "Original NASA unit"}</dt>
            <dd>{result.dataset.source_units}</dd>
          </div>
          <div>
            <dt>{hindi ? "डेटा सीमा" : "Date range"}</dt>
            <dd>
              {result.dataset.first_observation ?? "—"} –{" "}
              {result.dataset.last_observation ?? "—"}
            </dd>
          </div>
          <div>
            <dt>{hindi ? "चुना हुआ बिंदु (अक्षांश, देशांतर)" : "Requested point (lat, lon)"}</dt>
            <dd>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</dd>
          </div>
          <div>
            <dt>{hindi ? "निकटतम NASA ग्रिड सेल (अक्षांश, देशांतर)" : "Nearest NASA grid cell (lat, lon)"}</dt>
            <dd>
              {result.dataset.grid_cell_latitude.toFixed(4)},{" "}
              {result.dataset.grid_cell_longitude.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt>{hindi ? "डेटा का प्रकार" : "Data type"}</dt>
            <dd>reanalysis / model-derived</dd>
          </div>
          <div>
            <dt>{hindi ? "UTC में प्राप्त समय" : "Retrieved at (UTC)"}</dt>
            <dd>
              {result.dataset.retrieved_at_utc}
              {result.dataset.cache_status === "cached" &&
                (hindi ? " (कैश से)" : " (cached)")}
            </dd>
          </div>
          <div>
            <dt>{hindi ? "तरीका" : "Method"}</dt>
            <dd>
              {result.dataset.aggregation} Mann–Kendall, Sen&apos;s slope, and linear
              regression use complete annual values.
            </dd>
          </div>
        </dl>
        <h4>{hindi ? "सीमाएँ" : "Limitations"}</h4>
        <ul>
          {result.limitations.map((limitation) => (
            <li key={limitation}>{hindi ? translateLimitation(limitation) : limitation}</li>
          ))}
        </ul>
        <div className="provenance-links">
          <a href={result.dataset.source_url} target="_blank" rel="noreferrer">
            {hindi ? "NASA POWER के इस अनुरोध को देखें" : "Open this NASA POWER response"}
          </a>
          <a
            href="https://power.larc.nasa.gov/docs/services/api/temporal/monthly/"
            target="_blank"
            rel="noreferrer"
          >
            {hindi ? "NASA POWER का आधिकारिक API दस्तावेज़" : "Official NASA POWER API documentation"}
          </a>
        </div>
      </section>
    </article>
  );
}
