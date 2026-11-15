"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import ErrorState from "@/components/ErrorState";
import Footer from "@/components/Footer";
import LocationControls from "@/components/LocationControls";
import LocationMap from "@/components/LocationMap";
import LoadingState from "@/components/LoadingState";
import ToolHeader from "@/components/ToolHeader";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  ClimateVariable,
  Coordinates,
  PlaceLocation,
  analyzeLocation,
} from "@/lib/api";
import type { MapSelectionMode } from "@/components/MapPicker";
import { useLanguage } from "@/lib/language";
import { saveResearchReport } from "@/lib/reports";

const ClimateResult = dynamic(() => import("@/components/ClimateResult"), {
  loading: () => (
    <div className="loading-skeleton-group climate-result-loading" role="status">
      <span className="sr-only">Loading chart and trend details</span>
      <div className="loading-skeleton loading-skeleton--heading" />
      <div className="loading-skeleton loading-skeleton--chart" />
    </div>
  ),
});

function requestForLocation(
  location: PlaceLocation,
  variable: ClimateVariable,
): AnalyzeRequest {
  return {
    lat: location.latitude,
    lon: location.longitude,
    variable,
    frequency: "monthly",
  };
}

function mapLocation(coordinates: Coordinates, hindi: boolean): PlaceLocation {
  return {
    ...coordinates,
    label: `${hindi ? "नक्शे का बिंदु" : "Map point"} (${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)})`,
  };
}

export default function InvestigatePage() {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [location, setLocation] = useState<PlaceLocation | null>(null);
  const [comparisonLocation, setComparisonLocation] = useState<PlaceLocation | null>(null);
  const [selectionMode, setSelectionMode] = useState<MapSelectionMode>("primary");
  const [variable, setVariable] = useState<ClimateVariable>("temperature");
  const [primaryResult, setPrimaryResult] = useState<AnalyzeResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const choosePrimary = (place: PlaceLocation) => {
    setLocation(place);
    setComparisonLocation(null);
    setPrimaryResult(null);
    setComparisonResult(null);
    setSelectionMode("primary");
    setError(null);
    setReportError(null);
  };

  const handleMapSelect = (coordinates: Coordinates) => {
    if (selectionMode === "comparison") {
      setComparisonLocation(mapLocation(coordinates, hindi));
      setComparisonResult(null);
    } else {
      choosePrimary(mapLocation(coordinates, hindi));
    }
  };

  const selectVariable = (nextVariable: ClimateVariable) => {
    setVariable(nextVariable);
    setPrimaryResult(null);
    setComparisonResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!location) {
      return;
    }
    setLoading(true);
    setError(null);
    setReportError(null);
    setComparisonLocation(null);
    setComparisonResult(null);
    try {
      const result = await analyzeLocation(requestForLocation(location, variable));
      setPrimaryResult(result);
      try {
        saveResearchReport({
          question: hindi
            ? `${location.label} के निकटतम NASA ग्रिड सेल में ${variable === "temperature" ? "तापमान" : "वर्षा दर"} में क्या बदलाव हुआ?`
            : `How has ${variable} changed at the nearest NASA grid cell to ${location.label}?`,
          location,
          start_year: result.dataset.requested_start_year,
          end_year: result.dataset.requested_end_year,
          analyses: [{ place: location, result }],
        });
      } catch (saveError) {
        setReportError(
          saveError instanceof Error
            ? saveError.message
            : "The analysis succeeded, but the report could not be saved in this browser.",
        );
      }
    } catch (requestError) {
      setPrimaryResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not analyze this place. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const comparePlaces = async () => {
    if (!location || !comparisonLocation) {
      return;
    }
    setLoading(true);
    setError(null);
    setReportError(null);
    setPrimaryResult(null);
    setComparisonResult(null);
    try {
      const [primary, comparison] = await Promise.all([
        analyzeLocation(requestForLocation(location, variable)),
        analyzeLocation(requestForLocation(comparisonLocation, variable)),
      ]);
      setPrimaryResult(primary);
      setComparisonResult(comparison);
      try {
        saveResearchReport({
          question: hindi
            ? `${location.label} और ${comparisonLocation.label} के निकटतम NASA ग्रिड सेल के ${variable === "temperature" ? "तापमान" : "वर्षा दर"} की तुलना कैसे है?`
            : `How did ${variable} change at the nearest NASA grid cells to ${location.label} and ${comparisonLocation.label}?`,
          location,
          start_year: primary.dataset.requested_start_year,
          end_year: primary.dataset.requested_end_year,
          analyses: [
            { place: location, result: primary },
            { place: comparisonLocation, result: comparison },
          ],
        });
      } catch (saveError) {
        setReportError(
          saveError instanceof Error
            ? saveError.message
            : "The comparison succeeded, but the report could not be saved in this browser.",
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not compare these places. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const directionsDiffer =
    primaryResult !== null &&
    comparisonResult !== null &&
    primaryResult.trend.direction !== comparisonResult.trend.direction;

  return (
    <div className="tool-page">
      <ToolHeader currentPage="Investigate My Surroundings" />
      <main className="tool-main">
        <section className="tool-intro" aria-labelledby="investigate-title">
          <p className="section-kicker">{hindi ? "NASA पृथ्वी डेटा" : "NASA EARTH DATA"}</p>
          <h1 id="investigate-title">{hindi ? "अपने आसपास की जाँच करें" : "Investigate My Surroundings"}</h1>
          <p>
            {hindi
              ? "जगह चुनें और NASA POWER में उपलब्ध नवीनतम 20 पूरे वर्षों में तापमान या वर्षा की जाँच करें। हम बताते हैं कि डेटा से क्या समझा जा सकता है — और क्या नहीं।"
              : "Choose a place to investigate temperature or precipitation across the latest 20 complete years available from NASA POWER. We explain what the data can — and cannot — tell us."}
          </p>
          <p className="range-note">
            {hindi
              ? "उपलब्ध पूरे वर्षों की सीमा NASA के जवाब से तय होती है।"
              : "NASA's response determines the available complete-year range."}
          </p>
        </section>

        <section className="tool-panel" aria-labelledby="place-title">
          <div className="tool-section-heading">
            <span className="step-badge">1</span>
            <div>
              <h2 id="place-title">{hindi ? "जगह चुनें" : "Choose a place"}</h2>
              <p>{hindi ? "अपनी जगह इस्तेमाल करें, खोजें या नक्शे पर क्लिक करें।" : "Use your location, search for a place, or click the map."}</p>
            </div>
          </div>
          <LocationControls onChoose={choosePrimary} />
          <p className="map-instruction" aria-live="polite">
            {selectionMode === "comparison"
              ? hindi ? "तुलना के लिए दूसरी जगह चुनने हेतु नक्शे पर क्लिक करें।" : "Click the map to choose the second place to compare."
              : comparisonLocation
              ? hindi ? "दूसरी जगह चुन ली गई है। रिकॉर्ड की तुलना के लिए रुझान तुलना चुनें।" : "The second place is marked. Choose Compare trends to compare the records."
              : location
              ? hindi ? "आपकी जगह नक्शे पर है। दूसरी जगह चुनने के लिए क्लिक करें।" : "Your place is marked. Click the map to choose a different place."
              : hindi ? "अभी कोई जगह नहीं चुनी। जगह चुनने के लिए नक्शे पर क्लिक करें।" : "No location is selected. Click the map to place a marker."}
          </p>
          <LocationMap
            primary={location}
            comparison={comparisonLocation}
            selectionMode={selectionMode}
            onMapSelect={handleMapSelect}
          />
          {(location || comparisonLocation) && (
            <div className="selected-place-list" aria-live="polite">
              {location && (
                <p>
                  <strong>{hindi ? "जगह 1:" : "Place 1:"}</strong> {location.label}{" "}
                  <span>
                    ({location.latitude.toFixed(3)}, {location.longitude.toFixed(3)})
                  </span>
                </p>
              )}
              {comparisonLocation && (
                <p>
                  <strong>{hindi ? "जगह 2:" : "Place 2:"}</strong> {comparisonLocation.label}{" "}
                  <span>
                    ({comparisonLocation.latitude.toFixed(3)}, {comparisonLocation.longitude.toFixed(3)})
                  </span>
                </p>
              )}
            </div>
          )}
        </section>

        <section className="tool-panel" aria-labelledby="variable-title">
          <div className="tool-section-heading">
            <span className="step-badge">2</span>
            <div>
              <h2 id="variable-title">{hindi ? "आप क्या जानना चाहते हैं?" : "What would you like to explore?"}</h2>
              <p>{hindi ? "मौसम के उतार-चढ़ाव से बचने के लिए पूरे कैलेंडर वर्षों की तुलना करते हैं।" : "We compare complete calendar years to avoid seasonal ups and downs."}</p>
            </div>
          </div>
          <div className="variable-choice-grid" role="group" aria-label={hindi ? "जलवायु का चर चुनें" : "Choose a climate variable"}>
            <button
              className={`variable-choice${variable === "temperature" ? " is-selected" : ""}`}
              type="button"
              aria-pressed={variable === "temperature"}
              onClick={() => selectVariable("temperature")}
            >
              <span className="variable-choice__icon" aria-hidden="true">🌡️</span>
              <span>
                <strong>{hindi ? "तापमान" : "Temperature"}</strong>
                <small>{hindi ? "हवा का औसत तापमान, °C में" : "Average air temperature, in °C"}</small>
              </span>
            </button>
            <button
              className={`variable-choice${variable === "rainfall" ? " is-selected" : ""}`}
              type="button"
              aria-pressed={variable === "rainfall"}
              onClick={() => selectVariable("rainfall")}
            >
              <span className="variable-choice__icon" aria-hidden="true">🌧️</span>
              <span>
                <strong>{hindi ? "बारिश" : "Rainfall"}</strong>
                <small>                {hindi
                  ? "NASA की मूल इकाई में औसत सुधारित वर्षा दर"
                  : "Average corrected precipitation in NASA's original units"}</small>
              </span>
            </button>
          </div>
          <button
            className="tool-primary-button"
            type="button"
            onClick={analyze}
            disabled={!location || loading}
          >
            {loading
              ? hindi ? "NASA डेटा ला रहे हैं…" : "Getting NASA data…"
              : hindi ? "बदलाव की कहानी दिखाएँ" : "Show me the story"}
          </button>
          {primaryResult && !loading && (
            <button
              className="tool-secondary-button"
              type="button"
              onClick={() => {
                setComparisonLocation(null);
                setComparisonResult(null);
                setSelectionMode("comparison");
                setError(null);
              }}
            >
              {hindi ? "दूसरी जगह से तुलना करें" : "Compare with another place"}
            </button>
          )}
          {(selectionMode === "comparison" || comparisonLocation) && (
            <button
              className="tool-secondary-button"
              type="button"
              disabled={!comparisonLocation || loading}
              onClick={comparePlaces}
            >
              {loading
                ? hindi ? "असली NASA डेटा की तुलना…" : "Comparing real NASA data…"
                : hindi ? "रुझानों की तुलना करें" : "Compare trends"}
            </button>
          )}
          {loading && (
            <LoadingState label={hindi ? "असली NASA डेटा ला रहे हैं और जाँच रहे हैं। थोड़ा समय लग सकता है।" : "Fetching and checking real NASA data. This can take a moment."} />
          )}
          {error && <ErrorState title={hindi ? "यह जाँच पूरी नहीं हो सकी" : "We could not finish this investigation"} message={error} />}
          {reportError && (
            <ErrorState
              title={hindi ? "विश्लेषण तैयार है, लेकिन रिपोर्ट सेव नहीं हो सकी" : "Your analysis is ready, but the report could not be saved"}
              message={reportError}
            />
          )}
          {!location && (
            <p className="help-note">{hindi ? "विश्लेषण शुरू करने से पहले जगह चुनें।" : "Choose a place before asking for an analysis."}</p>
          )}
        </section>

        {primaryResult && !comparisonResult && !loading && (
          <>
            <ClimateResult result={primaryResult} placeName={location?.label ?? "this place"} />
            <Link className="tool-secondary-button" href="/report">
              {hindi ? "रिसर्च रिपोर्ट बनाएँ" : "Create a research report"}
            </Link>
          </>
        )}

        {primaryResult && comparisonResult && !loading && (
          <section className="comparison-section" aria-labelledby="comparison-title">
            <div className="comparison-heading">
              <p className="section-kicker">{hindi ? "साथ-साथ NASA डेटा" : "SIDE-BY-SIDE NASA DATA"}</p>
              <h2 id="comparison-title">{hindi ? "इन जगहों की तुलना करें" : "Compare these places"}</h2>
              {directionsDiffer && (
                <p className="divergence-label">
                  {hindi ? "क्षेत्रीय रुझान में अंतर" : "Regional Trend Divergence"}
                  <span>{hindi ? "दोनों रिकॉर्ड में बदलाव की दिशा अलग है।" : "The two records show different trend directions."}</span>
                </p>
              )}
            </div>
            <div className="comparison-grid">
              <ClimateResult result={primaryResult} placeName={location?.label ?? "Place 1"} />
              <ClimateResult result={comparisonResult} placeName={comparisonLocation?.label ?? "Place 2"} />
            </div>
            <Link className="tool-secondary-button" href="/report">
              {hindi ? "रिसर्च रिपोर्ट बनाएँ" : "Create a research report"}
            </Link>
          </section>
        )}
      </main>
      <Footer>
        {hindi
          ? "NASA POWER का तापमान और बारिश का डेटा MERRA-2 मॉडल-आधारित री-एनालिसिस है, आपकी ठीक जगह का सीधा माप नहीं।"
          : "NASA POWER temperature and rainfall data are model-derived MERRA-2 reanalysis, not direct measurements at your exact location."}
      </Footer>
    </div>
  );
}
