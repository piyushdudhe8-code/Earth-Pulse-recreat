"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ErrorState from "@/components/ErrorState";
import Footer from "@/components/Footer";
import LocationControls from "@/components/LocationControls";
import LocationMap from "@/components/LocationMap";
import LoadingState from "@/components/LoadingState";
import ToolHeader from "@/components/ToolHeader";
import {
  ClimateVariable,
  Coordinates,
  PlaceLocation,
  ProbabilityCondition,
  ProjectionModelResult,
  ProjectionResponse,
  analyzeProjection,
} from "@/lib/api";
import { useLanguage } from "@/lib/language";

const SCENARIOS = [
  { id: "ssp126", en: "SSP1-2.6 · lower emissions pathway", hi: "SSP1-2.6 · कम उत्सर्जन परिदृश्य" },
  { id: "ssp245", en: "SSP2-4.5 · intermediate pathway", hi: "SSP2-4.5 · मध्यम परिदृश्य" },
  { id: "ssp370", en: "SSP3-7.0 · higher emissions pathway", hi: "SSP3-7.0 · अधिक उत्सर्जन परिदृश्य" },
] as const;

function mapLocation(coordinates: Coordinates, hindi: boolean): PlaceLocation {
  return {
    ...coordinates,
    label: `${hindi ? "नक्शे का बिंदु" : "Map point"} (${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)})`,
  };
}

function annualChartData(models: ProjectionModelResult[]) {
  const rows = new Map<number, Record<string, number | null>>(
    Array.from({ length: 86 }, (_, index) => [2015 + index, { year: 2015 + index }]),
  );
  for (const model of models) {
    const key = model.model;
    for (const item of model.annual_values) {
      const row = rows.get(item.year);
      if (row) row[key] = item.value;
    }
  }
  return [...rows.values()];
}

function projectionLimitationText(text: string, hindi: boolean): string {
  if (!hindi) return text;
  const translations: Record<string, string> = {
    "This is a scenario-based climate projection, not a weather prediction or official forecast.": "यह चुने गए परिदृश्य पर आधारित जलवायु प्रक्षेपण है, मौसम की भविष्यवाणी या आधिकारिक पूर्वानुमान नहीं।",
    "NASA selects the nearest 0.25° grid cell without interpolation; the point can differ from the requested coordinates and is not a city or country average.": "NASA बिना बीच के मान निकालने के निकटतम 0.25° ग्रिड सेल का उपयोग करता है; यह चुने निर्देशांक से अलग हो सकता है और शहर या देश का औसत नहीं है।",
    "NASA may have missing values for a particular model, scenario, variable, place, or year; missing values are excluded, never filled with estimates.": "किसी मॉडल, परिदृश्य, चर, जगह या साल का डेटा गायब हो सकता है; उसे अनुमान से नहीं भरा जाता।",
    "Model agreement is not a probability and does not guarantee what will happen.": "मॉडलों की सहमति संभावना नहीं है और भविष्य की गारंटी नहीं देती।",
    "The API response does not provide an uncertainty interval for this point query; Earth Pulse does not invent one.": "इस बिंदु के लिए API ने अनिश्चितता की सीमा नहीं दी; Earth Pulse इसे बनाकर नहीं दिखाता।",
  };
  return translations[text] ?? text;
}

export default function FuturePage() {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [location, setLocation] = useState<PlaceLocation | null>(null);
  const [variable, setVariable] = useState<ClimateVariable>("temperature");
  const [condition, setCondition] = useState<ProbabilityCondition>("above");
  const [threshold, setThreshold] = useState(30);
  const [scenario, setScenario] = useState<ProjectionResponse["scenario"]>("ssp245");
  const [targetYear, setTargetYear] = useState(2050);
  const [result, setResult] = useState<ProjectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const models = useMemo(
    () => result?.model_results.length
      ? result.model_results
      : result?.ensemble
        ? [result.ensemble]
        : [],
    [result],
  );
  const chartData = useMemo(() => annualChartData(models), [models]);

  const chooseLocation = (place: PlaceLocation) => {
    setLocation(place);
    setResult(null);
    setError(null);
  };

  const chooseVariable = (nextVariable: ClimateVariable) => {
    setVariable(nextVariable);
    setThreshold(nextVariable === "temperature" ? 30 : 3);
    setResult(null);
  };

  const estimate = async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const projection = await analyzeProjection({
        lat: location.latitude,
        lon: location.longitude,
        variable,
        condition,
        threshold,
        scenario,
        target_year: targetYear,
      });
      setResult(projection);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : hindi
            ? "NASA का जलवायु प्रक्षेपण नहीं मिल सका। फिर कोशिश करें।"
            : "NASA climate projection data could not be retrieved. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const units = result?.units ?? (variable === "temperature" ? "C" : "mm/day");
  const limit = variable === "temperature" ? { min: -20, max: 50, step: 1 } : { min: 0, max: 20, step: 0.1 };
  const resultInterpretation = result
    ? result.models_with_target_data > 0
      ? hindi
        ? `${result.models_with_target_data} उपलब्ध व्यक्तिगत मॉडलों में से ${result.models_meeting_condition} ने ${result.target_year} के लिए यह शर्त पूरी की। यह मॉडल सहमति है, संभावना नहीं।`
        : result.interpretation
      : hindi
        ? `NASA एन्सेम्बल का ${result.target_year} का मान ${result.ensemble?.value ?? "—"} ${result.units} है। यह प्रक्षेपण है, संभावना नहीं।`
        : result.interpretation
    : "";

  return (
    <div className="tool-page">
      <ToolHeader currentPage="Imagine the Future" />
      <main className="tool-main">
        <section className="tool-intro" aria-labelledby="future-title">
          <p className="section-kicker">{hindi ? "जलवायु परिदृश्य, पक्का वादा नहीं" : "CLIMATE SCENARIOS, NOT PROMISES"}</p>
          <h1 id="future-title">{hindi ? "भविष्य की कल्पना करें" : "Imagine the Future"}</h1>
          <p>
            {hindi
              ? "NASA के वास्तविक जलवायु मॉडल प्रक्षेपणों से पूछें कि किसी साल का औसत तापमान या वर्षा दर आपकी सीमा से ऊपर या नीचे होगी।"
              : "Ask whether a year's average temperature or precipitation rate is above or below a limit, using real NASA climate-model projections."}
          </p>
          <p className="range-note">
            {hindi
              ? "ये उत्सर्जन परिदृश्य पर आधारित जलवायु प्रक्षेपण हैं, मौसम का पूर्वानुमान नहीं।"
              : "These are scenario-based climate projections, not weather forecasts."}
          </p>
        </section>

        <section className="tool-panel" aria-labelledby="future-place-title">
          <div className="tool-section-heading">
            <span className="step-badge">1</span>
            <div>
              <h2 id="future-place-title">{hindi ? "पृथ्वी पर जगह चुनें" : "Choose a place on Earth"}</h2>
              <p>{hindi ? "अपनी जगह इस्तेमाल करें, खोजें या नक्शे पर क्लिक करें।" : "Use your location, search for a place, or click the map."}</p>
            </div>
          </div>
          <LocationControls onChoose={chooseLocation} />
          <p className="map-instruction" aria-live="polite">
            {location
              ? hindi ? "आपकी जगह नक्शे पर है। दूसरी जगह चुनने के लिए क्लिक करें।" : "Your place is marked. Click the map to choose another."
              : hindi ? "अभी कोई जगह नहीं चुनी। जगह चुनने के लिए नक्शे पर क्लिक करें।" : "No location is selected. Click the map to place a marker."}
          </p>
          <LocationMap
            primary={location}
            selectionMode="primary"
            onMapSelect={(coordinates) => chooseLocation(mapLocation(coordinates, hindi))}
          />
          {location && (
            <p className="selected-place-summary" aria-live="polite">
              {hindi ? "चुनी हुई जगह:" : "Selected place:"} <strong>{location.label}</strong>{" "}
              ({location.latitude.toFixed(3)}, {location.longitude.toFixed(3)})
            </p>
          )}
        </section>

        <section className="tool-panel question-builder" aria-labelledby="question-title">
          <div className="tool-section-heading">
            <span className="step-badge">2</span>
            <div>
              <h2 id="question-title">{hindi ? "अपना सवाल बनाएँ" : "Build your yes-or-no question"}</h2>
              <p>{hindi ? "हम पूरे साल के औसत की तुलना करते हैं।" : "We compare annual averages from NASA's monthly projections."}</p>
            </div>
          </div>

          <fieldset className="question-fieldset">
            <legend>{hindi ? "कौन सा चर?" : "Which variable?"}</legend>
            <div className="variable-choice-grid">
              {(["temperature", "rainfall"] as const).map((item) => (
                <button
                  className={`variable-choice${variable === item ? " is-selected" : ""}`}
                  type="button"
                  aria-pressed={variable === item}
                  key={item}
                  onClick={() => chooseVariable(item)}
                >
                  <span className="variable-choice__icon" aria-hidden="true">{item === "temperature" ? "🌡️" : "🌧️"}</span>
                  <span><strong>{item === "temperature" ? (hindi ? "तापमान" : "Temperature") : (hindi ? "वर्षा दर" : "Precipitation rate")}</strong></span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="question-fieldset">
            <legend>{hindi ? "किस परिदृश्य में?" : "Which emissions scenario?"}</legend>
            <div className="window-choice-grid">
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={scenario === item.id ? "is-selected" : ""}
                  aria-pressed={scenario === item.id}
                  onClick={() => {
                    setScenario(item.id);
                    setResult(null);
                  }}
                >
                  <strong>{item.id.toUpperCase()}</strong>
                  <span>{hindi ? item.hi : item.en}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="question-fieldset">
            <legend>{hindi ? "किस साल और किस सीमा पर?" : "What year and threshold?"}</legend>
            <label className="target-year-control" htmlFor="projection-year">
              <span>{hindi ? "लक्ष्य वर्ष" : "Target year"} <strong>{targetYear}</strong></span>
              <input
                id="projection-year"
                type="range"
                min={2015}
                max={2100}
                step={1}
                value={targetYear}
                onChange={(event) => {
                  setTargetYear(Number(event.target.value));
                  setResult(null);
                }}
              />
            </label>
            <div className="condition-choice" role="group" aria-label={hindi ? "शर्त चुनें" : "Choose above or below"}>
              {(["above", "below"] as const).map((item) => (
                <button
                  key={item}
                  className={condition === item ? "is-selected" : ""}
                  type="button"
                  aria-pressed={condition === item}
                  onClick={() => {
                    setCondition(item);
                    setResult(null);
                  }}
                >
                  {hindi ? item === "above" ? "से ज़्यादा" : "से कम" : item === "above" ? "Above" : "Below"}
                </button>
              ))}
            </div>
            <label className="threshold-control" htmlFor="projection-threshold">
              <span>{hindi ? "सीमा" : "Threshold"} <strong>{threshold} {units}</strong></span>
              <input
                id="projection-threshold"
                type="range"
                min={limit.min}
                max={limit.max}
                step={limit.step}
                value={threshold}
                onChange={(event) => {
                  setThreshold(Number(event.target.value));
                  setResult(null);
                }}
              />
            </label>
            <p className="question-preview">
              {hindi
                ? `${targetYear} में ${variable === "temperature" ? "साल का औसत तापमान" : "साल की औसत वर्षा दर"} ${threshold} ${units} ${condition === "above" ? "से ज़्यादा" : "से कम"} होगी?`
                : `Will the annual average ${variable === "temperature" ? "temperature" : "precipitation rate"} be ${condition} ${threshold} ${units} in ${targetYear}?`}
            </p>
          </fieldset>

          <button className="tool-primary-button" type="button" onClick={estimate} disabled={!location || loading}>
            {loading ? (hindi ? "NASA प्रक्षेपण जाँच रहे हैं…" : "Checking NASA projections…") : (hindi ? "मॉडल प्रक्षेपण देखें" : "Check model projections")}
          </button>
          <p className="projection-disclaimer">
            {hindi
              ? "यह जलवायु प्रक्षेपण चुने गए परिदृश्य पर आधारित है, मौसम का पूर्वानुमान या पक्की संभावना नहीं।"
              : "Climate projection (scenario-based), not a forecast. Model agreement is not a probability."}
          </p>
          {loading && <LoadingState label={hindi ? "NASA मॉडल डेटा प्राप्त कर रहे हैं।" : "Retrieving real NASA model projection data."} />}
          {error && <ErrorState title={hindi ? "प्रक्षेपण नहीं मिल सका" : "Projection data unavailable"} message={error} />}
          {!location && <p className="help-note">{hindi ? "सवाल पूछने से पहले जगह चुनें।" : "Choose a place before asking a question."}</p>}
        </section>

        {result && (
          <section className="probability-result projection-result" aria-labelledby="projection-result-title" aria-live="polite">
            <p className="section-kicker">{hindi ? "मॉडल प्रक्षेपण" : "MODEL PROJECTION"}</p>
            <h2 id="projection-result-title">{resultInterpretation}</h2>
            {result.ensemble && (
              <p className="ensemble-value">
                {hindi ? "मल्टी-मॉडल एन्सेम्बल का सालाना औसत:" : "Multi-model ensemble annual average:"}{" "}
                <strong>{result.ensemble.value} {result.units}</strong>
              </p>
            )}
            <div className="projection-chart-heading">
              <h3>{hindi ? "NASA जलवायु मॉडल प्रक्षेपण" : "NASA climate model projections"}</h3>
              <strong>{hindi ? "परिदृश्य-आधारित जलवायु प्रक्षेपण, पूर्वानुमान नहीं" : "Climate projection (scenario-based), not a forecast"}</strong>
            </div>
            <div className="trend-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 16, right: 18, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="#dfe8e4" strokeDasharray="3 5" />
                  <XAxis dataKey="year" type="number" domain={[2015, 2100]} tickCount={8} />
                  <YAxis unit={` ${result.units}`} />
                  <Tooltip />
                  <Legend />
                  {models.map((model, index) => (
                    <Line
                      key={model.model}
                      type="monotone"
                      dataKey={model.model}
                      name={model.model === "ensemble" ? "Multi-model ensemble" : model.model}
                      stroke={["#26734f", "#167d8d", "#e9824c", "#7458a6", "#bb5c3b", "#2870a0", "#6a853a"][index % 7]}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="map-instruction">
              {hindi
                ? `${result.scenario.toUpperCase()} परिदृश्य · ${result.parameter_name} · ${result.units} · सालाना मान महीने के डेटा से दिन-भारित औसत हैं।`
                : `${result.scenario.toUpperCase()} scenario · ${result.parameter_name} · ${result.units} · Annual values are day-weighted averages of monthly data.`}
            </p>
            <div className="projection-model-count">
              <p>
                {result.models_with_target_data > 0
                    ? hindi
                      ? `${result.models_with_target_data} उपलब्ध व्यक्तिगत मॉडलों में से ${result.models_meeting_condition} इस शर्त को पूरा करते हैं। मॉडलों की सहमति संभावना नहीं है।`
                      : `${result.models_meeting_condition} of ${result.models_with_target_data} available individual models meet this condition. Model agreement is not a guaranteed probability.`
                    : hindi
                      ? "व्यक्तिगत मॉडलों में इस साल का पूरा मान नहीं था; इसके बजाय एन्सेम्बल दिखाया गया है। कोई संभावना नहीं निकाली गई।"
                      : "The individual models did not provide a complete value for this year; the ensemble is shown instead. No probability is calculated."}
              </p>
            </div>
            <p className="projection-disclaimer">
              {hindi
                ? "यह जलवायु प्रक्षेपण चुने गए परिदृश्य पर आधारित है, मौसम का पूर्वानुमान नहीं।"
                : "Climate projection (scenario-based), not a forecast."}
            </p>
            <section className="provenance-panel" aria-label="NASA climate projection provenance">
              <div className="provenance-panel__heading">
                <div><p className="section-kicker">{hindi ? "डेटा की जाँच" : "DATA PROVENANCE"}</p><h3>{hindi ? "NASA प्रक्षेपण डेटा का स्रोत" : "NASA projection data source"}</h3></div>
                <span className={result.cache_status === "live" ? "verified-data-badge" : "cached-data-badge"}>
                  {result.cache_status === "live"
                    ? "NASA DATA VERIFIED"
                    : result.cache_status === "mixed"
                      ? (hindi ? "लाइव + कैश डेटा" : "MIXED LIVE + CACHED DATA")
                      : (hindi ? "कैश किया गया डेटा" : "CACHED DATA")}
                </span>
              </div>
              <dl className="provenance-grid">
                <div><dt>{hindi ? "स्रोत / डेटासेट" : "Source / dataset"}</dt><dd>{result.source} · {result.dataset_name}</dd></div>
                <div><dt>{hindi ? "संस्करण" : "Version"}</dt><dd>{result.dataset_version}</dd></div>
                <div><dt>{hindi ? "पैरामीटर / इकाई" : "Parameter / unit"}</dt><dd>{result.parameter_name} · {result.units}</dd></div>
                <div><dt>{hindi ? "परिदृश्य / लक्ष्य वर्ष" : "Scenario / target year"}</dt><dd>{result.scenario} · {result.target_year}</dd></div>
                <div><dt>{hindi ? "अनुरोधित बिंदु (अक्षांश, देशांतर)" : "Requested point (lat, lon)"}</dt><dd>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</dd></div>
                <div><dt>{hindi ? "NASA द्वारा लौटाया बिंदु (अक्षांश, देशांतर)" : "NASA returned point (lat, lon)"}</dt><dd>{result.grid_cell_latitude.toFixed(4)}, {result.grid_cell_longitude.toFixed(4)}</dd></div>
                <div><dt>{hindi ? "डेटा प्रकार" : "Data type"}</dt><dd>{result.data_type}</dd></div>
                <div><dt>{hindi ? "समय सीमा" : "Temporal coverage"}</dt><dd>{result.temporal_coverage}</dd></div>
                <div><dt>{hindi ? "NASA से खोजे गए मॉडल" : "Models discovered from NASA"}</dt><dd>{result.discovered_models.join(", ")}</dd></div>
                <div><dt>{hindi ? "प्राप्ति समय (UTC)" : "Retrieved at (UTC)"}</dt><dd>{result.retrieved_at_utc}{result.cache_status === "cached" ? (hindi ? " (कैश)" : " (cached)") : ""}</dd></div>
              </dl>
              <h4>{hindi ? "सीमाएँ" : "Limitations"}</h4>
              <ul>{result.limitations.map((limitation) => <li key={limitation}>{projectionLimitationText(limitation, hindi)}</li>)}</ul>
              <h4>{hindi ? "मॉडल द्वारा लौटाए गए मान" : "Values returned by model"}</h4>
              <div className="projection-model-table-wrap">
                <table className="projection-model-table">
                  <thead>
                    <tr>
                      <th>{hindi ? "मॉडल" : "Model"}</th>
                      <th>{result.target_year}</th>
                      <th>{hindi ? "शर्त पूरी?" : "Meets condition?"}</th>
                      <th>{hindi ? "प्राप्ति / कैश स्थिति" : "Retrieved / cache state"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr key={model.model}>
                        <th scope="row">{model.model}</th>
                        <td>{model.value === null ? (hindi ? "डेटा उपलब्ध नहीं" : "No data") : `${model.value} ${model.units}`}</td>
                        <td>{model.meets_condition === null ? "—" : model.meets_condition ? (hindi ? "हाँ" : "Yes") : (hindi ? "नहीं" : "No")}</td>
                        <td>{model.retrieved_at_utc} · {model.cache_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="provenance-links">
                {result.source_urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">
                  {url.includes("/models?") ? (hindi ? "NASA मॉडल कैटलॉग" : "NASA model catalog") : (hindi ? "NASA प्रक्षेपण डेटा अनुरोध" : "NASA projection data request")}
                </a>)}
                <a href="https://power.larc.nasa.gov/docs/services/api/projection/" target="_blank" rel="noreferrer">{hindi ? "NASA Projection API के आधिकारिक दस्तावेज़" : "Official NASA Projection API documentation"}</a>
              </div>
            </section>
          </section>
        )}
      </main>
      <Footer>
        {hindi
          ? "यह NASA जलवायु मॉडल डेटा पर आधारित परिदृश्य है, निश्चित भविष्यवाणी नहीं।"
          : "These are scenario-based NASA climate model projections, not a weather forecast or guaranteed probability."}
      </Footer>
    </div>
  );
}
