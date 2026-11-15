"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ErrorState from "@/components/ErrorState";
import Footer from "@/components/Footer";
import ToolHeader from "@/components/ToolHeader";
import TrendMiniChart from "@/components/TrendMiniChart";
import { ResearchReportSnapshot } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { loadResearchReport, saveResearchReport } from "@/lib/reports";

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function displayTrend(direction: string, hindi: boolean): string {
  if (!hindi) {
    return direction;
  }
  return {
    increasing: "बढ़ रहा है",
    decreasing: "घट रहा है",
    "no clear trend": "कोई साफ़ रुझान नहीं",
  }[direction] ?? direction;
}

function downloadCsv(report: ResearchReportSnapshot): void {
  const rows: (string | number | null)[][] = [
    [
      "place",
      "latitude",
      "longitude",
      "variable",
      "year",
      "value",
      "units",
      "fitted_trend",
      "confidence_lower",
      "confidence_upper",
      "trend_direction",
      "rate_of_change",
      "rate_units",
      "significant",
      "dataset",
      "dataset_version",
      "parameter",
      "source_url",
      "retrieved_at_utc",
      "cache_status",
      "data_type",
    ],
  ];
  for (const { place, result } of report.analyses) {
    for (const point of result.annual_time_series.records) {
      rows.push([
        place.label,
        place.latitude,
        place.longitude,
        result.variable,
        point.period,
        point.value,
        result.annual_time_series.units,
        point.trend_value,
        point.confidence_lower,
        point.confidence_upper,
        result.trend.direction,
        result.trend.rate_of_change,
        result.trend.rate_units,
        String(result.trend.significant),
        result.dataset.name,
        result.dataset.version,
        result.dataset.parameter_name,
        result.dataset.source_url,
        result.dataset.retrieved_at_utc,
        result.dataset.cache_status,
        result.dataset.data_type,
      ]);
    }
  }
  const contents = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "earth-pulse-research-data.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(
  report: ResearchReportSnapshot,
  question: string,
): Promise<void> {
  return import("jspdf").then(({ jsPDF }) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 17;
    let y = 19;

    const ensureSpace = (height: number) => {
      if (y + height > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };
    const addParagraph = (text: string, size = 10, gap = 2) => {
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      const blockHeight = lines.length * (size * 0.45) + gap;
      ensureSpace(blockHeight);
      pdf.text(lines, margin, y);
      y += blockHeight;
    };

    pdf.setFont("helvetica", "bold");
    addParagraph("Earth Pulse — Research report", 18, 5);
    pdf.setFont("helvetica", "normal");
    addParagraph(`Research question: ${question}`, 12, 3);
    addParagraph(
      `Location: ${report.location.label} (${report.location.latitude.toFixed(3)}, ${report.location.longitude.toFixed(3)})`,
      10,
    );
    addParagraph(`Requested period: ${report.start_year}–${report.end_year}`, 10, 5);

    for (const { place, result } of report.analyses) {
      ensureSpace(45);
      pdf.setFont("helvetica", "bold");
      addParagraph(`${result.variable} — ${place.label}`, 13, 2);
      pdf.setFont("helvetica", "normal");
      addParagraph(`Trend direction: ${result.trend.direction}`, 10);
      addParagraph(
        `Rate of change: ${result.trend.rate_of_change.toFixed(3)} ${result.trend.rate_units}`,
        10,
      );
      addParagraph(
        `Mann–Kendall p-value: ${result.trend.mann_kendall_p_value.toPrecision(3)}; statistically significant: ${result.trend.significant ? "yes" : "no"}`,
        10,
      );
      addParagraph(`Statistical tests: ${result.trend.test_names.join("; ")}`, 9);
      addParagraph(
        `Linear-regression 95% confidence interval: ${result.trend.linear_regression.confidence_interval_95[0].toPrecision(4)} to ${result.trend.linear_regression.confidence_interval_95[1].toPrecision(4)} ${result.annual_time_series.units} per year.`,
        9,
      );
      addParagraph(
        `Source: NASA POWER (MERRA-2); ${result.dataset.data_type}; parameter ${result.dataset.parameter_name}; original unit ${result.dataset.source_units}.`,
        9,
      );
      addParagraph(
        `Observed date range: ${result.dataset.first_observation ?? "not available"} to ${result.dataset.last_observation ?? "not available"}.`,
        9,
      );
      addParagraph(
        `${result.dataset.cache_status === "cached" ? "Cached data" : "Live NASA response"}; retrieved at ${result.dataset.retrieved_at_utc} UTC.`,
        9,
      );
      addParagraph(
        `Nearest NASA grid cell: ${result.dataset.grid_cell_latitude.toFixed(4)}, ${result.dataset.grid_cell_longitude.toFixed(4)}.`,
        9,
      );
      addParagraph(`NASA POWER response: ${result.dataset.source_url}`, 8);

      const records = result.annual_time_series.records.filter(
        (point) => point.value !== null,
      );
      if (records.length > 1) {
        ensureSpace(61);
        const chartX = margin;
        const chartY = y + 2;
        const chartW = pageWidth - 2 * margin;
        const chartH = 43;
        const values = records.flatMap((point) =>
          [point.value, point.trend_value].filter(
            (value): value is number => typeof value === "number",
          ),
        );
        const min = Math.min(...values);
        const max = Math.max(...values);
        const valueY = (value: number) =>
          chartY + chartH - 3 - ((value - min) / Math.max(max - min, 1e-9)) * (chartH - 6);
        pdf.setDrawColor(212, 224, 218);
        pdf.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
        const drawSeries = (key: "value" | "trend_value", color: [number, number, number]) => {
          pdf.setDrawColor(...color);
          pdf.setLineWidth(key === "value" ? 0.65 : 0.85);
          let previous: { x: number; y: number } | null = null;
          result.annual_time_series.records.forEach((point, index) => {
            const value = point[key];
            if (value === null || value === undefined) {
              previous = null;
              return;
            }
            const current = {
              x: chartX + (index / Math.max(result.annual_time_series.records.length - 1, 1)) * chartW,
              y: valueY(value),
            };
            if (previous) {
              pdf.line(previous.x, previous.y, current.x, current.y);
            }
            previous = current;
          });
        };
        drawSeries("value", [22, 126, 141]);
        drawSeries("trend_value", [173, 79, 28]);
        y = chartY + chartH + 8;
        pdf.setFontSize(8);
        pdf.text(
          `${result.annual_time_series.records[0]?.period ?? ""} — ${result.annual_time_series.records[result.annual_time_series.records.length - 1]?.period ?? ""} | teal: observed annual values; orange dashed: fitted trend`,
          chartX,
          y,
        );
        y += 6;
      }

      pdf.setFont("helvetica", "bold");
      addParagraph("Limitations", 10, 1);
      pdf.setFont("helvetica", "normal");
      result.limitations.forEach((limitation) => addParagraph(`• ${limitation}`, 8, 1));
      addParagraph("Source links", 10, 1);
      ensureSpace(12);
      pdf.setFontSize(8);
      pdf.textWithLink(
        "NASA POWER: https://power.larc.nasa.gov/",
        margin,
        y,
        { url: "https://power.larc.nasa.gov/" },
      );
      y += 5;
      pdf.textWithLink(
        "NASA MERRA-2: https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/",
        margin,
        y,
        { url: "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/" },
      );
      y += 7;
    }

    pdf.save("earth-pulse-research-report.pdf");
  });
}

export default function ResearchReport() {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [report, setReport] = useState<ResearchReportSnapshot | null>(null);
  const [question, setQuestion] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    try {
      const savedReport = loadResearchReport();
      setReport(savedReport);
      setQuestion(savedReport?.question ?? "");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "The saved report could not be opened.",
      );
    } finally {
      setReportLoading(false);
    }
  }, []);

  const limitations = useMemo(
    () => [...new Set(report?.analyses.flatMap(({ result }) => result.limitations) ?? [])],
    [report],
  );

  const updateQuestion = (nextQuestion: string) => {
    setQuestion(nextQuestion);
    if (report) {
      try {
        const updated = { ...report, question: nextQuestion };
        saveResearchReport(updated);
        setReport(updated);
      } catch (error) {
        setDownloadError(
          error instanceof Error ? error.message : "The report could not be saved.",
        );
      }
    }
  };

  const exportPdf = async () => {
    if (!report) {
      return;
    }
    setPdfLoading(true);
    setDownloadError(null);
    try {
      await downloadPdf(report, question);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "The PDF could not be generated. Try the CSV download instead.",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) {
      return;
    }
    try {
      downloadCsv(report);
      setDownloadError(null);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "The data file could not be created.",
      );
    }
  };

  return (
    <div className="tool-page">
      <ToolHeader currentPage="Research Report" />
      <main className="tool-main">
        <section className="tool-intro" aria-labelledby="report-title">
          <p className="section-kicker">{hindi ? "आपकी जाँच का रिकॉर्ड" : "YOUR INVESTIGATION, DOCUMENTED"}</p>
          <h1 id="report-title">{hindi ? "रिसर्च रिपोर्ट" : "Research Report"}</h1>
          <p>
            {hindi
              ? "यह रिपोर्ट इसी ब्राउज़र में सेव किए गए असली NASA विश्लेषण से बनती है।"
              : "This report is built from real NASA analysis saved in this browser."}
          </p>
        </section>

        {loadError && (
          <ErrorState
            title={hindi ? "रिपोर्ट नहीं खुल सकी" : "We could not open the report"}
            message={loadError}
          />
        )}

        {!report && !loadError && !reportLoading && (
          <section className="tool-panel report-empty-state" aria-labelledby="report-empty-title">
            <span className="report-empty-state__icon" aria-hidden="true">▤</span>
            <h2 id="report-empty-title">
              {hindi ? "अभी रिपोर्ट के लिए कोई विश्लेषण नहीं है" : "No analysis is ready for a report yet"}
            </h2>
            <p>
              {hindi
                ? "पहले किसी जगह का NASA डेटा देखें। हम केवल असली विश्लेषण के नतीजे रिपोर्ट में रखते हैं।"
                : "First analyze NASA data for a place. Only completed analysis results can be added here."}
            </p>
            <div className="report-tool-actions">
              <Link className="tool-primary-button" href="/investigate">
                {hindi ? "एक जगह की जाँच करें" : "Investigate a place"}
              </Link>
              <Link className="tool-secondary-button" href="/lab">
                {hindi ? "रिसर्च लैब खोलें" : "Open the research lab"}
              </Link>
            </div>
          </section>
        )}

        {reportLoading && (
          <div className="loading-skeleton-group" role="status" aria-live="polite">
            <span className="sr-only">{hindi ? "रिपोर्ट लोड हो रही है" : "Loading saved report"}</span>
            <div className="loading-skeleton loading-skeleton--heading" />
            <div className="loading-skeleton loading-skeleton--chart" />
          </div>
        )}

        {report && !reportLoading && (
          <article className="report-document" aria-labelledby="report-document-title">
            <div className="report-document__heading">
              <div>
                <p className="section-kicker">{hindi ? "NASA डेटा पर आधारित" : "BASED ON NASA DATA"}</p>
                <h2 id="report-document-title">
                  {hindi ? "Earth Pulse जाँच रिपोर्ट" : "Earth Pulse investigation report"}
                </h2>
              </div>
              <div className="report-download-actions">
                <button
                  type="button"
                  className="tool-primary-button"
                  onClick={exportPdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading
                    ? hindi ? "PDF बन रहा है…" : "Preparing PDF…"
                    : hindi ? "PDF डाउनलोड करें" : "Download as PDF"}
                </button>
                <button
                  type="button"
                  className="tool-secondary-button"
                  onClick={exportCsv}
                >
                  {hindi ? "CSV डेटा डाउनलोड करें" : "Download data as CSV"}
                </button>
              </div>
            </div>
            <p className="report-font-note">
              {hindi
                ? "PDF का फ़ॉन्ट लैटिन अक्षरों के लिए है; हिंदी में लिखा सवाल PDF में ठीक न दिखे। रिपोर्ट पेज में मूल पाठ और CSV में UTF-8 पाठ सुरक्षित रहता है।"
                : "The PDF uses a built-in Latin font; Hindi text in a custom question may not display correctly. The on-page report and UTF-8 CSV preserve the original text."}
            </p>
            {downloadError && (
              <ErrorState
                title={hindi ? "डाउनलोड पूरा नहीं हुआ" : "Download did not finish"}
                message={downloadError}
              />
            )}
            <div className="report-editable-question">
              <label htmlFor="report-question">
                {hindi ? "शोध सवाल" : "Research question"}
              </label>
              <textarea
                id="report-question"
                rows={2}
                maxLength={500}
                value={question}
                onChange={(event) => updateQuestion(event.target.value)}
              />
            </div>
            <dl className="report-metadata">
              <div>
                <dt>{hindi ? "जगह" : "Location"}</dt>
                <dd>
                  {report.location.label} ({report.location.latitude.toFixed(3)},{" "}
                  {report.location.longitude.toFixed(3)})
                </dd>
              </div>
              <div>
                <dt>{hindi ? "समय सीमा" : "Time range"}</dt>
                <dd>{report.start_year}–{report.end_year}</dd>
              </div>
              <div>
                <dt>{hindi ? "शामिल विश्लेषण" : "Included analyses"}</dt>
                <dd>{report.analyses.length}</dd>
              </div>
            </dl>
            <div className="report-analysis-list">
              {report.analyses.map(({ place, result }, index) => (
                <section
                  className="report-analysis"
                  key={`${place.latitude}-${place.longitude}-${result.variable}-${index}`}
                  aria-labelledby={`report-analysis-${index}`}
                >
                  <h3 id={`report-analysis-${index}`}>
                    {result.variable === "temperature"
                      ? hindi ? "तापमान" : "Temperature"
                      : hindi ? "बारिश" : "Rainfall"}{" "}
                    — {place.label}
                  </h3>
                  <dl className="report-facts">
                    <div>
                      <dt>{hindi ? "रुझान की दिशा" : "Trend direction"}</dt>
                      <dd>{displayTrend(result.trend.direction, hindi)}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "बदलाव की दर" : "Rate of change"}</dt>
                      <dd>{result.trend.rate_of_change.toFixed(2)} {result.trend.rate_units}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "सांख्यिकीय जाँच" : "Statistical test"}</dt>
                      <dd>{result.trend.test_names.join("; ")}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "रैखिक रुझान की 95% विश्वास सीमा" : "Linear trend 95% confidence interval"}</dt>
                      <dd>
                        {result.trend.linear_regression.confidence_interval_95[0].toPrecision(4)} to{" "}
                        {result.trend.linear_regression.confidence_interval_95[1].toPrecision(4)}{" "}
                        {result.annual_time_series.units} per year
                      </dd>
                    </div>
                    <div>
                      <dt>{hindi ? "स्पष्ट सांख्यिकीय संकेत" : "Statistically significant"}</dt>
                      <dd>{result.trend.significant ? (hindi ? "हाँ" : "Yes") : (hindi ? "नहीं" : "No")}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "Mann–Kendall p-value" : "Mann–Kendall p-value"}</dt>
                      <dd>{result.trend.mann_kendall_p_value.toPrecision(3)}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "डेटा स्रोत और संस्करण" : "Dataset and version"}</dt>
                      <dd>NASA POWER (MERRA-2), {result.dataset.name} ({result.dataset.version})</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "इकाइयाँ" : "Units"}</dt>
                      <dd>{result.dataset.source_units}; annual values in {result.annual_time_series.units}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "डेटा प्रकार" : "Data type"}</dt>
                      <dd>reanalysis / model-derived</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "NASA पैरामीटर" : "NASA parameter"}</dt>
                      <dd>{result.dataset.parameter_name}</dd>
                    </div>
                    <div>
                      <dt>{hindi ? "निकटतम NASA ग्रिड सेल" : "Nearest NASA grid cell"}</dt>
                      <dd>
                        {result.dataset.grid_cell_latitude.toFixed(4)},{" "}
                        {result.dataset.grid_cell_longitude.toFixed(4)}
                      </dd>
                    </div>
                    <div>
                      <dt>{hindi ? "डेटा प्राप्ति" : "Data retrieval"}</dt>
                      <dd>
                        {result.dataset.cache_status === "cached"
                          ? (hindi ? "कैश किया गया डेटा" : "Cached data")
                          : (hindi ? "लाइव NASA जवाब" : "Live NASA response")}
                        {" · "}{result.dataset.retrieved_at_utc} UTC
                      </dd>
                    </div>
                    <div>
                      <dt>{hindi ? "NASA स्रोत URL" : "NASA source URL"}</dt>
                      <dd>
                        <a href={result.dataset.source_url} target="_blank" rel="noreferrer">
                          {hindi ? "आधिकारिक NASA POWER जवाब खोलें" : "Open official NASA POWER response"}
                        </a>
                      </dd>
                    </div>
                  </dl>
                  <TrendMiniChart
                    result={result}
                    title={
                      hindi
                        ? `${result.variable === "temperature" ? "तापमान" : "बारिश"} के सालाना मान और अनुमानित रुझान`
                        : `${result.variable} annual values and fitted trend`
                    }
                  />
                </section>
              ))}
            </div>
            <section className="report-limitations" aria-labelledby="report-limitations-title">
              <h3 id="report-limitations-title">{hindi ? "सीमाएँ" : "Limitations"}</h3>
              <ul>
                {limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
              </ul>
            </section>
            <section className="report-sources" aria-labelledby="report-sources-title">
              <h3 id="report-sources-title">{hindi ? "स्रोत लिंक" : "Source links"}</h3>
              <ul>
                <li><a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a></li>
                <li><a href="https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/" target="_blank" rel="noreferrer">NASA MERRA-2</a></li>
                <li><a href="https://disc.gsfc.nasa.gov/" target="_blank" rel="noreferrer">NASA Earthdata / GES DISC</a></li>
              </ul>
            </section>
            <p className="report-disclaimer">
              {hindi
                ? "यह रिपोर्ट रिकॉर्ड किए गए डेटा और विश्लेषण को दिखाती है। सहसंबंध कारण सिद्ध नहीं करता और कोई ट्रेंड उसका कारण नहीं बताता।"
                : "This report describes the recorded data and analysis. Correlation does not prove causation, and a trend does not identify its cause."}
            </p>
          </article>
        )}
      </main>
      <Footer>
        {hindi
          ? "रिपोर्ट इस ब्राउज़र में सेव की गई है; इसे डाउनलोड करने से पहले डेटा जाँचें।"
          : "The report is stored in this browser; review the data before sharing it."}
      </Footer>
    </div>
  );
}
