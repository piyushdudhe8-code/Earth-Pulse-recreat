"use client";

import { FormEvent, useState } from "react";
import CMRCollectionList from "@/components/CMRCollectionList";
import ErrorState from "@/components/ErrorState";
import { CMRSearchResponse, searchCMRCollections } from "@/lib/api";
import { useLanguage } from "@/lib/language";

export default function CMRSearchPanel() {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [variable, setVariable] = useState("");
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bounds, setBounds] = useState({ west: "", south: "", east: "", north: "" });
  const [result, setResult] = useState<CMRSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enteredBounds = Object.values(bounds).filter((value) => value !== "").length;
    if (enteredBounds !== 0 && enteredBounds !== 4) {
      setError(hindi
        ? "भौगोलिक खोज के लिए चारों सीमाएँ भरें।"
        : "Enter all four geographic bounds, or leave all four blank.");
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setError(hindi ? "शुरुआत की तारीख अंत से पहले होनी चाहिए।" : "The start date must be before the end date.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await searchCMRCollections({
        variable: variable.trim() || undefined,
        topic: topic.trim() || undefined,
        name: name.trim() || undefined,
        start_time: startDate ? `${startDate}T00:00:00Z` : undefined,
        end_time: endDate ? `${endDate}T23:59:59Z` : undefined,
        ...(enteredBounds === 4 ? {
          west: Number(bounds.west),
          south: Number(bounds.south),
          east: Number(bounds.east),
          north: Number(bounds.north),
        } : {}),
        page_size: 10,
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "NASA CMR search failed.");
    } finally {
      setLoading(false);
    }
  };

  const boundField = (key: keyof typeof bounds, label: string) => (
    <label key={key}>
      {label}
      <input
        type="number"
        step="any"
        min={key === "west" || key === "east" ? -180 : -90}
        max={key === "west" || key === "east" ? 180 : 90}
        value={bounds[key]}
        onChange={(event) => setBounds((current) => ({ ...current, [key]: event.target.value }))}
      />
    </label>
  );

  return (
    <section className="cmr-search-panel" aria-labelledby="cmr-search-title">
      <div className="tool-section-heading">
        <span className="step-badge" aria-hidden="true">⌕</span>
        <div>
          <h2 id="cmr-search-title">{hindi ? "NASA डेटासेट कैटलॉग खोजें" : "Search NASA dataset catalogue"}</h2>
          <p>{hindi ? "परिवर्तनशील, विषय, नाम, समय और नक्शे के क्षेत्र से मेटाडेटा खोजें।" : "Find collection metadata by variable, topic, name, time range, and map area."}</p>
        </div>
      </div>
      <form className="cmr-search-form" onSubmit={submit}>
        <label>
          {hindi ? "चर (जैसे precipitation)" : "Variable (e.g. precipitation)"}
          <input value={variable} onChange={(event) => setVariable(event.target.value)} />
        </label>
        <label>
          {hindi ? "वैज्ञानिक विषय" : "Science topic"}
          <input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </label>
        <label>
          {hindi ? "डेटासेट का नाम" : "Dataset name"}
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          {hindi ? "शुरुआत" : "Start date"}
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label>
          {hindi ? "अंत" : "End date"}
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <fieldset>
          <legend>{hindi ? "भौगोलिक सीमा (दशमलव डिग्री)" : "Geographic bounds (decimal degrees)"}</legend>
          <div className="cmr-bounds-grid">
            {boundField("west", hindi ? "पश्चिम" : "West")}
            {boundField("south", hindi ? "दक्षिण" : "South")}
            {boundField("east", hindi ? "पूर्व" : "East")}
            {boundField("north", hindi ? "उत्तर" : "North")}
          </div>
        </fieldset>
        <button type="submit" className="tool-primary-button" disabled={loading}>
          {loading ? (hindi ? "NASA CMR खोज रहा है…" : "Searching NASA CMR…") : (hindi ? "कैटलॉग खोजें" : "Search catalogue")}
        </button>
      </form>
      <p className="cmr-metadata-notice">
        {hindi
          ? "यह केवल कैटलॉग मेटाडेटा है। Earth Pulse ने इन परिणामों का डेटा डाउनलोड या विश्लेषण नहीं किया। लिंक किए गए डेटा के लिए NASA Earthdata Login की ज़रूरत हो सकती है।"
          : "CMR is a metadata catalogue only. Earth Pulse has not downloaded or analyzed the described data. Linked data may require NASA Earthdata Login."}
      </p>
      {error && <ErrorState title={hindi ? "कैटलॉग खोज विफल" : "Catalogue search failed"} message={error} />}
      {result && (
        <div aria-live="polite">
          <p>{hindi ? `CMR ने ${result.result_count} संग्रह बताए; यहाँ ${result.collections.length} दिखाए गए हैं।` : `CMR reports ${result.result_count} collections; showing ${result.collections.length}.`}</p>
          <CMRCollectionList collections={result.collections} hindi={hindi} />
          <a href={result.search_url} target="_blank" rel="noreferrer">
            {hindi ? "इस वास्तविक NASA CMR खोज को खोलें" : "Open this live NASA CMR search"}
          </a>
        </div>
      )}
    </section>
  );
}
