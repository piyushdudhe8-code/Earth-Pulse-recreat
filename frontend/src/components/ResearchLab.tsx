"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import ErrorState from "@/components/ErrorState";
import Footer from "@/components/Footer";
import CMRCollectionList from "@/components/CMRCollectionList";
import CMRSearchPanel from "@/components/CMRSearchPanel";
import LocationControls from "@/components/LocationControls";
import LocationMap from "@/components/LocationMap";
import ToolHeader from "@/components/ToolHeader";
import TrendMiniChart from "@/components/TrendMiniChart";
import {
  AnalyzeResponse,
  ClimateVariable,
  Coordinates,
  PlaceLocation,
  ResearchAssistantResponse,
  analyzeLocation,
  getResearchSuggestions,
} from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { saveResearchReport } from "@/lib/reports";

const DEFAULT_QUESTION_EN = "Why should I study rainfall changes in Maharashtra?";
const DEFAULT_QUESTION_HI = "मुझे महाराष्ट्र में बारिश के बदलाव का अध्ययन क्यों करना चाहिए?";

type LabTab = "assistant" | "multi" | "report";
type VariableResult = {
  variable: ClimateVariable;
  result: AnalyzeResponse;
};

const hindiResearchCopy = {
  temperature: "हवा का तापमान",
  rainfall: "बारिश",
  direction: {
    compare_variables:
      "एक ही वर्षों में तापमान और बारिश की तुलना करें। संबंध दिखने का मतलब यह नहीं कि एक चीज़ दूसरी का कारण है।",
    check_seasonal_patterns:
      "यह तय करें कि आपका सवाल किसी मौसम के बारे में है या पूरे साल का; अभी की ट्रेंड जाँच पूरे साल के डेटा का उपयोग करती है।",
    compare_nearby_places:
      "समान चीज़ों और वर्षों के साथ पास के शहर या क्षेत्र की तुलना करें।",
    check_data_gaps:
      "निष्कर्ष से पहले देखें कि कितने पूरे वर्षों का डेटा उपलब्ध है।",
  },
};

function mapLocation(coordinates: Coordinates): PlaceLocation {
  return {
    ...coordinates,
    label: `Map point (${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)})`,
  };
}

function displayVariable(variable: ClimateVariable, hindi: boolean): string {
  if (!hindi) {
    return variable === "temperature" ? "Temperature" : "Rainfall";
  }
  return hindiResearchCopy[variable];
}

function displayTrend(direction: AnalyzeResponse["trend"]["direction"], hindi: boolean): string {
  if (!hindi) {
    return direction;
  }
  return {
    increasing: "बढ़ रहा है",
    decreasing: "घट रहा है",
    "no clear trend": "कोई साफ़ रुझान नहीं",
  }[direction];
}

function pairedCorrelation(results: VariableResult[]): {
  coefficient: number | null;
  periods: number;
} {
  if (results.length < 2) {
    return { coefficient: null, periods: 0 };
  }
  const [first, second] = results;
  const secondByYear = new Map(
    second.result.annual_time_series.records
      .filter(
        (point): point is typeof point & { value: number } =>
          typeof point.value === "number" && Number.isFinite(point.value),
      )
      .map((point) => [point.period, point.value]),
  );
  const pairs = first.result.annual_time_series.records.flatMap((point) => {
    const other = secondByYear.get(point.period);
    return typeof point.value === "number" &&
      Number.isFinite(point.value) &&
      typeof other === "number"
      ? [[point.value, other] as const]
      : [];
  });
  if (pairs.length < 3) {
    return { coefficient: null, periods: pairs.length };
  }

  const meanX = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  const numerator = pairs.reduce(
    (sum, [x, y]) => sum + (x - meanX) * (y - meanY),
    0,
  );
  const sumXSquared = pairs.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
  const sumYSquared = pairs.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0);
  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  return {
    coefficient: denominator === 0 ? null : numerator / denominator,
    periods: pairs.length,
  };
}

export default function ResearchLab() {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [activeTab, setActiveTab] = useState<LabTab>("assistant");
  const [question, setQuestion] = useState(DEFAULT_QUESTION_EN);
  const [assistantResponse, setAssistantResponse] =
    useState<ResearchAssistantResponse | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [location, setLocation] = useState<PlaceLocation | null>(null);
  const [variables, setVariables] = useState<ClimateVariable[]>([
    "temperature",
    "rainfall",
  ]);
  const [results, setResults] = useState<VariableResult[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    setQuestion((current) =>
      current === DEFAULT_QUESTION_EN || current === DEFAULT_QUESTION_HI
        ? hindi ? DEFAULT_QUESTION_HI : DEFAULT_QUESTION_EN
        : current,
    );
  }, [hindi]);

  const submitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssistantLoading(true);
    setAssistantError(null);
    setAssistantResponse(null);
    setSubmittedQuestion(question.trim());
    try {
      setAssistantResponse(await getResearchSuggestions(question.trim()));
    } catch (error) {
      setAssistantError(
        error instanceof Error
          ? error.message
          : hindi
            ? "सुझाव नहीं मिल सके। फिर कोशिश करें।"
            : "We could not get suggestions. Please try again.",
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  const toggleVariable = (variable: ClimateVariable) => {
    setVariables((selected) =>
      selected.includes(variable)
        ? selected.filter((item) => item !== variable)
        : [...selected, variable],
    );
    setResults([]);
    setAnalysisError(null);
  };

  const runMultiVariableAnalysis = async () => {
    if (!location || variables.length < 2) {
      return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    setReportError(null);
    setResults([]);
    try {
      const requestResults = await Promise.all(
        variables.map(async (variable) => ({
          variable,
          result: await analyzeLocation({
            lat: location.latitude,
            lon: location.longitude,
            variable,
            frequency: "monthly",
          }),
        })),
      );
      setResults(requestResults);
      try {
        saveResearchReport({
          question: hindi
            ? `${location.label} के पास ${variables.map((item) => hindiResearchCopy[item]).join(" और ")} में क्या बदलाव हुआ?`
            : `How have ${variables.join(" and ")} changed near ${location.label}?`,
          location,
          start_year: requestResults[0].result.dataset.requested_start_year,
          end_year: requestResults[0].result.dataset.requested_end_year,
          analyses: requestResults.map(({ result }) => ({ place: location, result })),
        });
      } catch (error) {
        setReportError(
          error instanceof Error
            ? error.message
            : "The analysis succeeded, but this browser could not save the report.",
        );
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : hindi
            ? "विश्लेषण पूरा नहीं हो सका। फिर कोशिश करें।"
            : "We could not complete the analysis. Please try again.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const correlation = pairedCorrelation(results);

  const navigateTabs = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabOrder: LabTab[] = ["assistant", "multi", "report"];
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % tabOrder.length
        : event.key === "ArrowLeft"
          ? (currentIndex - 1 + tabOrder.length) % tabOrder.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabOrder.length - 1
              : -1;
    if (nextIndex < 0) {
      return;
    }
    event.preventDefault();
    const nextTab = tabOrder[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`lab-tab-${nextTab}`)?.focus();
  };

  return (
    <div className="tool-page">
      <ToolHeader currentPage="Research Lab" />
      <main className="tool-main">
        <section className="tool-intro" aria-labelledby="lab-title">
          <p className="section-kicker">{hindi ? "जाँच और खोज" : "INVESTIGATE AND EXPLORE"}</p>
          <h1 id="lab-title">{hindi ? "रिसर्च लैब" : "Research Lab"}</h1>
          <p>
            {hindi
              ? "शोध का सवाल सोचें, NASA के डेटा की जाँच करें और अपने निष्कर्षों की रिपोर्ट बनाएँ।"
              : "Shape a research question, investigate NASA data, and turn your findings into a report."}
          </p>
        </section>

        <div
          className="lab-tabs"
          role="tablist"
          aria-label={hindi ? "रिसर्च टूल चुनें" : "Choose a research tool"}
          onKeyDown={navigateTabs}
        >
          {([
            ["assistant", hindi ? "रिसर्च असिस्टेंट" : "Research Assistant"],
            ["multi", hindi ? "कई चीज़ों की जाँच" : "Multi-variable investigation"],
            ["report", hindi ? "रिसर्च रिपोर्ट" : "Research report"],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              id={`lab-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "assistant" && (
          <section
            id="lab-panel-assistant"
            className="tool-panel lab-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="lab-tab-assistant"
          >
            <div className="tool-section-heading">
              <span className="step-badge" aria-hidden="true">1</span>
              <div>
                <h2>{hindi ? "अपना शोध सवाल पूछें" : "Ask a research question"}</h2>
                <p>
                  {hindi
                    ? "सुझाव आपको आगे बढ़ने में मदद करते हैं; यहाँ जलवायु के आँकड़े नहीं बनाए जाते।"
                    : "Get ideas to help you get started. This tool does not create climate measurements."}
                </p>
              </div>
            </div>
            <form className="assistant-form" onSubmit={submitQuestion}>
              <label htmlFor="research-question">
                {hindi ? "आप क्या जानना चाहते हैं?" : "What would you like to explore?"}
              </label>
              <textarea
                id="research-question"
                rows={3}
                maxLength={500}
                minLength={8}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                required
              />
              <button
                className="tool-primary-button"
                type="submit"
                disabled={assistantLoading || question.trim().length < 8}
              >
                {assistantLoading
                  ? hindi ? "सुझाव सोच रहे हैं…" : "Thinking of research ideas…"
                  : hindi ? "शोध के सुझाव पाएँ" : "Get research suggestions"}
              </button>
            </form>
            <p className="assistant-safety-note" role="note">
              {hindi
                ? "गणनाएँ NASA के डेटा और हमारे विश्लेषण इंजन से आती हैं। AI केवल समझाने में मदद करता है।"
                : "Calculations come from NASA data and our analysis engine. AI only helps explain."}
            </p>
            <CMRSearchPanel />
            {assistantLoading && (
              <div className="loading-skeleton-group" role="status" aria-live="polite">
                <span className="sr-only">{hindi ? "सुझाव लोड हो रहे हैं" : "Loading research suggestions"}</span>
                <div className="loading-skeleton loading-skeleton--heading" />
                <div className="loading-skeleton" />
                <div className="loading-skeleton" />
              </div>
            )}
            {assistantError && (
              <ErrorState
                title={hindi ? "सुझाव नहीं मिल सके" : "We could not get suggestions"}
                message={assistantError}
              />
            )}
            {assistantResponse && (
              <div className="assistant-answer" aria-live="polite">
                <p className="assistant-question-bubble">
                  <strong>{hindi ? "आपने पूछा:" : "You asked:"}</strong> {submittedQuestion}
                </p>
                <p className="assistant-answer__mode">
                  {assistantResponse.assistant_mode === "llm"
                    ? hindi ? "AI से शोध के सुझाव" : "AI-guided research ideas"
                    : hindi ? "शोध के लिए शुरुआती सुझाव" : "Guided research starters"}
                </p>
                <section aria-labelledby="assistant-variables">
                  <h3 id="assistant-variables">{hindi ? "काम के चर" : "Relevant variables"}</h3>
                  <ul className="suggestion-list">
                    {assistantResponse.suggested_variables.map((variable) => (
                      <li key={variable.id}>
                        <strong>
                          {hindi
                            ? hindiResearchCopy[variable.id]
                            : variable.title}
                        </strong>
                        <span>
                          {variable.available_in_analysis
                            ? hindi
                              ? "इस ऐप में NASA POWER के डेटा से जाँच सकते हैं।"
                              : "Available to analyze with NASA POWER in this app."
                            : hindi
                              ? "अभी इस ऐप में उपलब्ध नहीं है।"
                              : "Not available in this app yet."}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-labelledby="assistant-datasets">
                  <h3 id="assistant-datasets">{hindi ? "NASA CMR से लौटे कैटलॉग रिकॉर्ड" : "Catalogue records returned by NASA CMR"}</h3>
                  <p>{assistantResponse.metadata_only_notice}</p>
                  <CMRCollectionList collections={assistantResponse.suggested_datasets} hindi={hindi} />
                </section>
                <section aria-labelledby="assistant-directions">
                  <h3 id="assistant-directions">{hindi ? "शोध की दिशाएँ" : "Possible research directions"}</h3>
                  <ul>
                    {assistantResponse.research_directions.map((direction) => (
                      <li key={direction.id}>
                        {hindi
                          ? hindiResearchCopy.direction[direction.id]
                          : direction.description}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </section>
        )}

        {activeTab === "multi" && (
          <section
            id="lab-panel-multi"
            className="tool-panel lab-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="lab-tab-multi"
          >
            <div className="tool-section-heading">
              <span className="step-badge" aria-hidden="true">2</span>
              <div>
                <h2>{hindi ? "एक जगह और कई चीज़ें चुनें" : "Choose a place and variables"}</h2>
                <p>
                  {hindi
                    ? "NASA POWER में उपलब्ध नवीनतम 20 पूरे सालों की तुलना करें।"
                    : "Compare the latest 20 complete years available from NASA POWER."}
                </p>
              </div>
            </div>
            <LocationControls
              onChoose={(place) => {
                setLocation(place);
                setResults([]);
                setAnalysisError(null);
              }}
            />
            <p className="map-instruction" aria-live="polite">
              {location
                ? hindi ? "आपकी जगह नक्शे पर दिखाई गई है।" : "Your place is marked on the map."
                : hindi ? "जगह चुनने के लिए नक्शे पर क्लिक करें।" : "Click the map to choose a place."}
            </p>
            <LocationMap
              primary={location}
              selectionMode="primary"
              onMapSelect={(coordinates) => {
                setLocation(mapLocation(coordinates));
                setResults([]);
                setAnalysisError(null);
              }}
            />
            {location && (
              <p className="selected-place-summary" aria-live="polite">
                {hindi ? "चुनी हुई जगह:" : "Selected place:"}{" "}
                <strong>{location.label}</strong> ({location.latitude.toFixed(3)},{" "}
                {location.longitude.toFixed(3)})
              </p>
            )}
            <fieldset className="lab-variable-set">
              <legend>{hindi ? "विश्लेषण के लिए कम से कम दो चर चुनें" : "Select at least two variables"}</legend>
              <div className="variable-choice-grid">
                {(["temperature", "rainfall"] as const).map((variable) => (
                  <button
                    key={variable}
                    className={`variable-choice${variables.includes(variable) ? " is-selected" : ""}`}
                    type="button"
                    aria-pressed={variables.includes(variable)}
                    onClick={() => toggleVariable(variable)}
                  >
                    <span className="variable-choice__icon" aria-hidden="true">
                      {variable === "temperature" ? "🌡️" : "🌧️"}
                    </span>
                    <span>
                      <strong>
                        {hindi
                          ? hindiResearchCopy[variable]
                          : variable === "temperature" ? "Temperature" : "Rainfall"}
                      </strong>
                      <small>
                        {hindi
                          ? variable === "temperature"
                            ? "साल का औसत हवा का तापमान (NASA की मूल इकाई)"
                            : "साल की औसत सुधारित वर्षा दर (NASA की मूल इकाई)"
                          : variable === "temperature"
                            ? "Annual average air temperature (NASA source unit)"
                            : "Annual average corrected precipitation rate (NASA source unit)"}
                      </small>
                    </span>
                  </button>
                ))}
                <div className="variable-choice variable-choice--unavailable" aria-disabled="true">
                  <span className="variable-choice__icon" aria-hidden="true">🌱</span>
                  <span>
                    <strong>{hindi ? "मिट्टी की नमी" : "Soil moisture"}</strong>
                    <small>
                      {hindi
                        ? "अभी जुड़े हुए डेटा स्रोत में उपलब्ध नहीं है।"
                        : "Not available from the connected data source yet."}
                    </small>
                  </span>
                </div>
              </div>
            </fieldset>
            <button
              className="tool-primary-button"
              type="button"
              onClick={runMultiVariableAnalysis}
              disabled={!location || variables.length < 2 || analysisLoading}
            >
              {analysisLoading
                ? hindi ? "NASA डेटा ला रहे हैं…" : "Getting NASA data…"
                : hindi ? "चर की तुलना करें" : "Compare variables"}
            </button>
            {variables.length < 2 && (
              <p className="help-note" role="status">
                {hindi ? "तुलना के लिए कम से कम दो उपलब्ध चर चुनें।" : "Choose at least two available variables to compare."}
              </p>
            )}
            {analysisLoading && (
              <div className="loading-skeleton-group" role="status" aria-live="polite">
                <span className="sr-only">{hindi ? "NASA डेटा का विश्लेषण हो रहा है" : "Analyzing NASA data"}</span>
                <div className="loading-skeleton loading-skeleton--chart" />
                <div className="loading-skeleton loading-skeleton--chart" />
              </div>
            )}
            {analysisError && (
              <ErrorState
                title={hindi ? "विश्लेषण पूरा नहीं हो सका" : "We could not complete the analysis"}
                message={analysisError}
              />
            )}
            {reportError && (
              <ErrorState
                title={hindi ? "रिपोर्ट सेव नहीं हुई" : "The report could not be saved"}
                message={reportError}
              />
            )}
            {results.length > 0 && (
              <div className="multi-results" aria-live="polite">
                <h3>{hindi ? "NASA डेटा के नतीजे" : "Results from NASA data"}</h3>
                <div className="multi-result-charts">
                  {results.map(({ variable, result }) => (
                    <div className="multi-result-chart-item" key={variable}>
                      <TrendMiniChart
                        result={result}
                        title={`${displayVariable(variable, hindi)} — ${displayTrend(result.trend.direction, hindi)}`}
                      />
                      <p className="source-note">
                        Source: NASA POWER (MERRA-2) | Data type: reanalysis / model-derived.
                        {" "}{result.dataset.cache_status === "cached"
                          ? `${hindi ? "कैश किया गया डेटा" : "Cached data"} · ${result.dataset.retrieved_at_utc} UTC.`
                          : `${hindi ? "लाइव NASA जवाब" : "Live NASA response"} · ${result.dataset.retrieved_at_utc} UTC.`}
                        {" "}<a href={result.dataset.source_url} target="_blank" rel="noreferrer">
                          {hindi ? "NASA जवाब" : "NASA response"}
                        </a>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="responsive-table-wrap">
                  <table className="trend-table">
                    <caption>{hindi ? "रुझान का सारांश" : "Trend summary"}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{hindi ? "चर" : "Variable"}</th>
                        <th scope="col">{hindi ? "दिशा" : "Direction"}</th>
                        <th scope="col">{hindi ? "बदलाव की दर" : "Rate of change"}</th>
                        <th scope="col">{hindi ? "स्पष्ट सांख्यिकीय संकेत" : "Statistically clear?"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(({ variable, result }) => (
                        <tr key={variable}>
                          <th scope="row">{displayVariable(variable, hindi)}</th>
                          <td>{displayTrend(result.trend.direction, hindi)}</td>
                          <td>
                            {result.trend.rate_of_change.toFixed(2)} {result.trend.rate_units}
                          </td>
                          <td>{result.trend.significant ? (hindi ? "हाँ" : "Yes") : (hindi ? "स्पष्ट नहीं" : "Not clear")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.length >= 2 && (
                  <div className="correlation-card">
                    <h3>{hindi ? "साथ-साथ बदलाव" : "How the records move together"}</h3>
                    {correlation.coefficient === null ? (
                      <p>
                        {correlation.periods < 3
                          ? hindi
                            ? `तुलना के लिए पर्याप्त मिलते-जुलते पूरे वर्ष नहीं हैं (${correlation.periods} वर्ष)।`
                            : `There are not enough matching complete years to compare (${correlation.periods} years).`
                          : hindi
                            ? "एक रिकॉर्ड में बदलाव न होने के कारण सहसंबंध की गणना नहीं हो सकी।"
                            : "Correlation is undefined because one of the records has no year-to-year variation."}
                      </p>
                    ) : (
                      <p>
                        {hindi ? "पियर्सन सहसंबंध" : "Pearson correlation"}:{" "}
                        <strong>{correlation.coefficient.toFixed(2)}</strong>{" "}
                        ({correlation.periods} {hindi ? "साझा पूरे वर्ष" : "shared complete years"})
                      </p>
                    )}
                    <p className="correlation-warning">
                      {hindi
                        ? "यह साझा पूरे सालों के कच्चे मानों का पियर्सन सहसंबंध है; लंबी अवधि के रुझान या दूसरे कारण इसमें अलग नहीं किए गए। सहसंबंध का अर्थ यह नहीं कि एक चीज़ दूसरी का कारण है।"
                        : "This Pearson correlation uses paired annual values and does not adjust for long-term trends or other factors. Correlation does not mean one thing causes another."}
                    </p>
                  </div>
                )}
                <Link className="tool-secondary-button lab-report-link" href="/report">
                  {hindi ? "इस जाँच की रिपोर्ट खोलें" : "Open a report for this investigation"}
                </Link>
              </div>
            )}
          </section>
        )}

        {activeTab === "report" && (
          <section
            id="lab-panel-report"
            className="tool-panel lab-panel report-tool-card"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="lab-tab-report"
          >
            <div className="tool-section-heading">
              <span className="step-badge" aria-hidden="true">3</span>
              <div>
                <h2>{hindi ? "अपनी जाँच की रिपोर्ट बनाएँ" : "Generate a research report"}</h2>
                <p>
                  {hindi
                    ? "रिपोर्ट में असली विश्लेषण के नतीजे, चार्ट, डेटा स्रोत और सीमाएँ शामिल होंगे।"
                    : "Create a report from real analysis results, with charts, dataset versions, and limitations."}
                </p>
              </div>
            </div>
            <p>
              {hindi
                ? "पहले आसपास की जाँच या कई चर वाले टूल में NASA डेटा का विश्लेषण करें। रिपोर्ट पेज यही परिणाम इस ब्राउज़र में रखी प्रति से पढ़ता है।"
                : "First analyze NASA data in Investigate or Multi-variable. The report page reads that saved result from this browser."}
            </p>
            <div className="report-tool-actions">
              <Link className="tool-secondary-button" href="/investigate">
                {hindi ? "एक जगह की जाँच करें" : "Investigate one place"}
              </Link>
              <Link className="tool-primary-button" href="/report">
                {hindi ? "रिपोर्ट जनरेटर खोलें" : "Open report generator"}
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer>
        {hindi
          ? "यह विश्लेषण डेटा में पैटर्न दिखाता है; यह कारण नहीं बताता।"
          : "These analyses show patterns in the data; they do not identify causes."}
      </Footer>
    </div>
  );
}
