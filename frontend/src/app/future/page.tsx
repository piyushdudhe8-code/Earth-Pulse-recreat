"use client";

import { useState } from "react";
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
  ProbabilityResponse,
  ProbabilityWindow,
  estimateLocationProbability,
} from "@/lib/api";
import { useLanguage } from "@/lib/language";

function mapLocation(coordinates: Coordinates, hindi: boolean): PlaceLocation {
  return {
    ...coordinates,
    label: `${hindi ? "नक्शे का बिंदु" : "Map point"} (${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)})`,
  };
}

function ProbabilityGauge({ result, hindi }: { result: ProbabilityResponse; hindi: boolean }) {
  return (
    <div
      className="probability-gauge"
      role="img"
      aria-label={
        hindi
          ? `अनुमानित संभावना ${Math.round(result.probability_percent)} प्रतिशत है। 95 प्रतिशत सीमा ${Math.round(result.confidence_range_percent[0])} से ${Math.round(result.confidence_range_percent[1])} प्रतिशत तक।`
          : `Estimated probability ${Math.round(result.probability_percent)} percent, with a 95 percent bootstrap range from ${Math.round(result.confidence_range_percent[0])} to ${Math.round(result.confidence_range_percent[1])} percent`
      }
      style={{
        background: `conic-gradient(#2f7d58 ${result.probability_percent}%, #e4ece7 0)`,
      }}
    >
      <div className="probability-gauge__center">
        <strong>{Math.round(result.probability_percent)}%</strong>
        <span>{hindi ? "अनुमानित संभावना" : "estimated chance"}</span>
      </div>
    </div>
  );
}

export default function FuturePage() {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [location, setLocation] = useState<PlaceLocation | null>(null);
  const [variable, setVariable] = useState<ClimateVariable>("temperature");
  const [condition, setCondition] = useState<ProbabilityCondition>("above");
  const [threshold, setThreshold] = useState(25);
  const [timeWindow, setTimeWindow] = useState<ProbabilityWindow>("next_summer");
  const [targetYear, setTargetYear] = useState(2030);
  const [result, setResult] = useState<ProbabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseLocation = (place: PlaceLocation) => {
    setLocation(place);
    setResult(null);
    setError(null);
  };

  const chooseVariable = (nextVariable: ClimateVariable) => {
    setVariable(nextVariable);
    setThreshold(nextVariable === "temperature" ? 25 : 500);
    setResult(null);
    setError(null);
  };

  const selectThreshold = (nextThreshold: number) => {
    setThreshold(nextThreshold);
    setResult(null);
  };

  const estimate = async () => {
    if (!location) {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const request = {
        lat: location.latitude,
        lon: location.longitude,
        variable,
        condition,
        threshold,
        time_window: timeWindow,
        ...(timeWindow === "year" ? { target_year: targetYear } : {}),
      };
      setResult(await estimateLocationProbability(request));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : hindi
            ? "इस सवाल का अनुमान नहीं लगा सके। फिर कोशिश करें।"
            : "We could not estimate this question. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const unit =
    result?.units ?? (variable === "temperature" ? "°C" : "NASA source units");
  const periodName = hindi
    ? timeWindow === "next_summer" ? "गर्मियाँ" : "कैलेंडर वर्ष"
    : timeWindow === "next_summer" ? "summer seasons" : "calendar years";

  return (
    <div className="tool-page">
      <ToolHeader currentPage="Imagine the Future" />
      <main className="tool-main">
        <section className="tool-intro" aria-labelledby="future-title">
          <p className="section-kicker">{hindi ? "संभावना, पक्का वादा नहीं" : "A POSSIBILITY, NOT A PROMISE"}</p>
          <h1 id="future-title">{hindi ? "भविष्य की कल्पना करें" : "Imagine the Future"}</h1>
          <p>
            {hindi
              ? "किसी जगह के बारे में साफ़ सवाल पूछें। हम NASA के असली पुराने डेटा से संभावना का अनुमान लगाते हैं — यह पक्का जवाब या आधिकारिक पूर्वानुमान नहीं है।"
              : "Ask a clear question about a place. We use its real NASA history to estimate a probability — never a certainty or an official forecast."}
          </p>
          <p className="range-note">
            {hindi
              ? "NASA का जवाब पिछले 20 पूरे उपलब्ध वर्षों को तय करता है।"
              : "NASA's response determines the latest 20 complete years available."}
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
              <h2 id="question-title">{hindi ? "हाँ-या-ना वाला सवाल बनाएँ" : "Build your yes-or-no question"}</h2>
              <p>{hindi ? "हम चुनी हुई अवधि का औसत बताते हैं, किसी खास दिन का नहीं।" : "We estimate the average over the selected period, not a particular day."}</p>
            </div>
          </div>

          <fieldset className="question-fieldset">
            <legend>{hindi ? "क्या देखें?" : "What should we look at?"}</legend>
            <div className="variable-choice-grid">
              <button
                className={`variable-choice${variable === "temperature" ? " is-selected" : ""}`}
                type="button"
                aria-pressed={variable === "temperature"}
                onClick={() => chooseVariable("temperature")}
              >
                <span className="variable-choice__icon" aria-hidden="true">🌡️</span>
                <span>
                  <strong>{hindi ? "तापमान" : "Temperature"}</strong>
                  <small>{hindi ? "इस अवधि का औसत तापमान" : "Average temperature for the period"}</small>
                </span>
              </button>
              <button
                className={`variable-choice${variable === "rainfall" ? " is-selected" : ""}`}
                type="button"
                aria-pressed={variable === "rainfall"}
                onClick={() => chooseVariable("rainfall")}
              >
                <span className="variable-choice__icon" aria-hidden="true">🌧️</span>
                <span>
                  <strong>{hindi ? "बारिश" : "Rainfall"}</strong>
                  <small>
                    {hindi
                      ? "NASA की मूल इकाई में औसत सुधारित वर्षा दर"
                      : "Average corrected precipitation in NASA's original units"}
                  </small>
                </span>
              </button>
            </div>
          </fieldset>

          <fieldset className="question-fieldset">
            <legend>{hindi ? "आपकी शर्त क्या है?" : "What is your condition?"}</legend>
            <div className="condition-choice" role="group" aria-label={hindi ? "ज़्यादा या कम चुनें" : "Choose above or below"}>
              <button
                className={condition === "above" ? "is-selected" : ""}
                type="button"
                aria-pressed={condition === "above"}
                onClick={() => {
                  setCondition("above");
                  setResult(null);
                }}
              >
                {hindi ? "से ज़्यादा" : "Above"}
              </button>
              <button
                className={condition === "below" ? "is-selected" : ""}
                type="button"
                aria-pressed={condition === "below"}
                onClick={() => {
                  setCondition("below");
                  setResult(null);
                }}
              >
                {hindi ? "से कम" : "Below"}
              </button>
            </div>
            <label className="threshold-control" htmlFor="threshold">
              <span>
                {hindi ? "आपकी सीमा" : "Your threshold"} <strong>{threshold} {unit}</strong>
              </span>
              <input
                id="threshold"
                type="range"
                min={variable === "temperature" ? -20 : 0}
                max={variable === "temperature" ? 50 : 5000}
                step={variable === "temperature" ? 1 : 25}
                value={threshold}
                onChange={(event) => selectThreshold(Number(event.target.value))}
              />
              <span className="threshold-control__bounds" aria-hidden="true">
                <span>{variable === "temperature" ? "−20°C" : "0 mm"}</span>
                <span>{variable === "temperature" ? "50°C" : "5,000 mm"}</span>
              </span>
            </label>
            <p className="question-preview">
              {hindi
                ? `क्या ${variable === "temperature" ? "औसत तापमान" : "औसत सुधारित वर्षा दर"} ${threshold} ${unit} ${condition === "above" ? "से ज़्यादा" : "से कम"} होगी?`
                : `Will the ${variable === "temperature" ? "average temperature" : "average corrected precipitation rate"} be ${condition} ${threshold} ${unit}?`}
            </p>
          </fieldset>

          <fieldset className="question-fieldset">
            <legend>{hindi ? "कब?" : "When?"}</legend>
            <div className="window-choice-grid" role="group" aria-label={hindi ? "भविष्य की अवधि चुनें" : "Choose a future time window"}>
              <button
                className={timeWindow === "next_summer" ? "is-selected" : ""}
                type="button"
                aria-pressed={timeWindow === "next_summer"}
                onClick={() => {
                  setTimeWindow("next_summer");
                  setResult(null);
                }}
              >
                <strong>{hindi ? "अगली गर्मी" : "Next summer"}</strong>
                <span>{hindi ? "आपके गोलार्ध के अनुसार" : "Based on your hemisphere"}</span>
              </button>
              {[2030, 2035].map((year) => (
                <button
                  className={timeWindow === "year" && targetYear === year ? "is-selected" : ""}
                  type="button"
                  aria-pressed={timeWindow === "year" && targetYear === year}
                  key={year}
                  onClick={() => {
                    setTimeWindow("year");
                    setTargetYear(year);
                    setResult(null);
                  }}
                >
                  <strong>{year}</strong>
                  <span>{hindi ? "कैलेंडर वर्ष का औसत या कुल" : "Calendar-year average or total"}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <button
            className="tool-primary-button"
            type="button"
            onClick={estimate}
            disabled={!location || loading}
          >
            {loading
              ? hindi ? "NASA का पुराना डेटा जाँच रहे हैं…" : "Checking NASA history…"
              : hindi ? "संभावना का अनुमान लगाएँ" : "Estimate the chance"}
          </button>
          <p className="forecast-disclaimer">
            {hindi
              ? "यह पुराने NASA डेटा पर आधारित सांख्यिकीय अनुमान है, आधिकारिक जलवायु पूर्वानुमान नहीं।"
              : "This is a statistical estimate based on past NASA data, not an official climate forecast."}
          </p>
          {loading && (
            <LoadingState label={hindi ? "NASA का असली डेटा इस्तेमाल करके अनुमान जाँचा जा रहा है। थोड़ा समय लग सकता है।" : "Using real NASA data and testing the estimate. This can take a moment."} />
          )}
          {error && <ErrorState title={hindi ? "इस सवाल का अनुमान नहीं लगा सके" : "We could not estimate this question"} message={error} />}
          {!location && (
            <p className="help-note">{hindi ? "सवाल पूछने से पहले जगह चुनें।" : "Choose a place before asking a question."}</p>
          )}
        </section>

        {result && !loading && (
          <section className="probability-result" aria-labelledby="probability-result-title" aria-live="polite">
            <div className="probability-result__top">
              <div>
                <p className="section-kicker">{hindi ? "सांख्यिकीय अनुमान" : "A STATISTICAL ESTIMATE"}</p>
                <h2 id="probability-result-title">
                  {hindi
                    ? `अनुमान है कि ${result.time_window === "next_summer" ? "गर्मियों में" : `${result.target_year} में`} ${variable === "temperature" ? "औसत तापमान" : "औसत सुधारित वर्षा दर"} के ${condition === "above" ? "से ज़्यादा" : "से कम"} होने की संभावना ${Math.round(result.probability_percent)}% है। अनुमान की सीमा ${Math.round(result.confidence_range_percent[0])}% से ${Math.round(result.confidence_range_percent[1])}% है। अतीत की ${result.historical_periods} अवधियों में यह ${result.historical_events} बार हुआ।`
                    : result.plain_language}
                </h2>
              </div>
              <ProbabilityGauge result={result} hindi={hindi} />
            </div>
            <p className="probability-range">
              {hindi ? "95% बूटस्ट्रैप सीमा:" : "95% bootstrap range:"}{" "}
              <strong>
                {Math.round(result.confidence_range_percent[0])}%–{Math.round(result.confidence_range_percent[1])}%
              </strong>
            </p>
            <div className="historical-chance">
              <span className="historical-chance__icon" aria-hidden="true">↺</span>
              <p>
                {hindi
                  ? `पिछली ${result.historical_periods} उपलब्ध ${periodName} में यह `
                  : `In the past ${result.historical_periods} available ${periodName}, this happened `}
                <strong>{result.historical_events} {hindi ? "में से" : "out of"} {result.historical_periods}</strong>{" "}
                {hindi
                  ? `बार हुआ (${Math.round(result.historical_probability_percent)}%)।`
                  : `times (${Math.round(result.historical_probability_percent)}%).`}
              </p>
            </div>
            <p className="forecast-disclaimer">
              {hindi
                ? "यह पुराने NASA डेटा पर आधारित सांख्यिकीय अनुमान है, आधिकारिक जलवायु पूर्वानुमान नहीं।"
                : "This is a statistical estimate based on past NASA data, not an official climate forecast."}
            </p>
            <p className="source-note">
              Source: {result.data_used.source} | Data type: {result.data_used.data_type}.{" "}
              {result.data_used.cache_status === "cached"
                ? `Cached data · retrieved ${result.data_used.retrieved_at_utc} UTC.`
                : `Live NASA response · retrieved ${result.data_used.retrieved_at_utc} UTC.`}{" "}
              <a href={result.data_used.source_url} target="_blank" rel="noreferrer">
                {hindi ? "NASA POWER के इस अनुरोध को देखें" : "View this NASA POWER request"}
              </a>
            </p>
            <details className="science-panel">
              <summary>{hindi ? "यह अनुमान कैसे लगाया?" : "How was this estimated?"}</summary>
              <div className="science-panel__content">
                <p>{result.method}</p>
                <dl className="science-details">
                  <div>
                    <dt>{hindi ? "जगह" : "Location"}</dt>
                    <dd>{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt>{hindi ? "निकटतम NASA ग्रिड सेल" : "Nearest NASA grid cell"}</dt>
                    <dd>
                      {result.data_used.grid_cell_latitude.toFixed(3)},{" "}
                      {result.data_used.grid_cell_longitude.toFixed(3)}
                    </dd>
                  </div>
                  <div>
                    <dt>{hindi ? "भविष्य की अवधि" : "Future period"}</dt>
                    <dd>{result.time_window} ({result.target_months.join(", ")})</dd>
                  </div>
                  <div>
                    <dt>{hindi ? "पुराना डेटा" : "Historical data"}</dt>
                    <dd>
                      {result.data_used.requested_start_year}–{result.data_used.requested_end_year};{" "}
                      {result.data_used.complete_periods} complete periods;{" "}
                      {result.data_used.missing_periods} missing periods
                    </dd>
                  </div>
                  <div>
                    <dt>{hindi ? "पुराने डेटा में रुझान" : "Trend found in the historical record"}</dt>
                    <dd>
                      {result.data_used.trend_direction};{" "}
                      {result.data_used.trend_rate_per_decade.toPrecision(4)} {unit} per decade;{" "}
                      {result.data_used.trend_significant ? "statistically significant" : "not statistically significant"}
                    </dd>
                  </div>
                  <div>
                    <dt>{hindi ? "स्रोत की इकाइयाँ" : "Source units"}</dt>
                    <dd>{result.data_used.source_units}; analysis values in {result.data_used.analysis_units}</dd>
                  </div>
                  <div>
                    <dt>{hindi ? "NASA पैरामीटर" : "NASA parameter"}</dt>
                    <dd>{result.data_used.parameter_name}</dd>
                  </div>
                </dl>
                <h3>{hindi ? "मान्यताएँ" : "Assumptions"}</h3>
                <ul>
                  {result.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
                <h3>{hindi ? "सीमाएँ" : "Limitations"}</h3>
                <ul>
                  {result.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            </details>
          </section>
        )}
      </main>
      <Footer>
        {hindi
          ? "यह संभावना NASA डेटा पर एक सांख्यिकीय तरीके से निकला अनुमान है। भविष्य के बारे में पक्की बात नहीं।"
          : "The probability describes one statistical method applied to NASA data. It is not certainty about the future."}
      </Footer>
    </div>
  );
}
