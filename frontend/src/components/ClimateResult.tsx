"use client";

import { useId } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import { AnalyzeResponse, SeriesPoint } from "@/lib/api";
import { useLanguage } from "@/lib/language";

type ClimateResultProps = {
  result: AnalyzeResponse;
  placeName: string;
};

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
              fill="#45aa82"
              fillOpacity={0.17}
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

function formatTooltipValue(value: unknown, name: string | number | undefined) {
  if (typeof value !== "number") {
    return [String(value ?? "No data"), String(name ?? "")];
  }
  return [value.toFixed(2), String(name ?? "")];
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
  const chartRecords = result.annual_time_series.records;

  return (
    <article className="climate-result" aria-labelledby={titleId}>
      <div className="climate-result__heading">
        <p className="section-kicker">{hindi ? "NASA डेटा की कहानी" : "NASA DATA STORY"}</p>
        <h2 id={titleId}>{headline}</h2>
        <p className="climate-result__summary">{simpleSummary}</p>
      </div>

      <div className="chart-card">
        <div className="chart-card__heading">
          <h3>{hindi ? "हर साल का रिकॉर्ड" : "Year-by-year record"}</h3>
          <p>
          {hindi
            ? "साल के आँकड़े मौसम के चक्र का असर कम करते हैं। छायांकित हिस्सा रुझान की 95% विश्वास सीमा दिखाता है।"
            : "Annual values remove the seasonal cycle. Shading shows the 95% confidence band around the fitted trend."}
          </p>
        </div>
        <div className="climate-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartRecords}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid stroke="#dfe8e4" strokeDasharray="3 5" />
              <XAxis dataKey="period" minTickGap={24} tick={{ fontSize: 13 }} />
              <YAxis
                width={64}
                includeHidden
                tick={{ fontSize: 13 }}
                tickFormatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Legend
                formatter={(value) =>
                  hindi
                    ? value === "Fitted trend" ? "अनुमानित रुझान" : "देखा गया सालाना मान"
                    : value
                }
              />
              <ConfidenceBand records={chartRecords} />
              <Line
                dataKey="confidence_lower"
                name="Confidence band lower edge"
                stroke="none"
                dot={false}
                activeDot={false}
                hide
                legendType="none"
                isAnimationActive={false}
              />
              <Line
                dataKey="confidence_upper"
                name="Confidence band upper edge"
                stroke="none"
                dot={false}
                activeDot={false}
                hide
                legendType="none"
                isAnimationActive={false}
              />
              <Line
                dataKey="value"
                name={hindi ? "देखा गया सालाना मान" : `Observed annual ${result.variable}`}
                stroke="#167d8d"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive="auto"
              />
              <Line
                dataKey="trend_value"
                name={hindi ? "अनुमानित रुझान" : "Fitted trend"}
                stroke="#ad4f1c"
                strokeWidth={2.5}
                strokeDasharray="7 5"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-card__units">
          {hindi
            ? `इकाइयाँ: ${result.annual_time_series.units}। खाली या अधूरे साल में अंतर दिखेगा।`
            : `Values: ${result.annual_time_series.units}. Missing or incomplete years are shown as gaps.`}
        </p>
      </div>

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
