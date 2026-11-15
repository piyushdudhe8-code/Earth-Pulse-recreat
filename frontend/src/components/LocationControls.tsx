"use client";

import { FormEvent, useState } from "react";
import {
  GeocodingResult,
  PlaceLocation,
  searchPlaces,
} from "@/lib/api";
import { useLanguage } from "@/lib/language";

type LocationControlsProps = {
  onChoose: (location: PlaceLocation) => void;
};

export default function LocationControls({ onChoose }: LocationControlsProps) {
  const { language } = useLanguage();
  const hindi = language === "hi";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(hindi
        ? "यह ब्राउज़र आपकी जगह साझा नहीं कर सकता। जगह खोजें या नक्शे पर क्लिक करें।"
        : "This browser cannot share a location. Search for a place or click the map instead.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        onChoose({
          latitude: coords.latitude,
          longitude: coords.longitude,
          label: "Your current location",
        });
      },
      (positionError) => {
        setLocating(false);
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setError(hindi
            ? "जगह की अनुमति नहीं मिली। आगे बढ़ने के लिए जगह खोजें या नक्शे पर क्लिक करें।"
            : "Location access was denied. Search for a place or click the map to continue.");
        } else if (positionError.code === positionError.TIMEOUT) {
          setError(hindi
            ? "जगह ढूँढ़ने में बहुत समय लगा। जगह खोजें या नक्शे पर क्लिक करें।"
            : "Finding your location took too long. Search for a place or click the map instead.");
        } else {
          setError(hindi
            ? "आपकी जगह नहीं मिल सकी। जगह खोजें या नक्शे पर क्लिक करें।"
            : "We could not find your location. Search for a place or click the map instead.");
        }
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    setError(null);
    setResults([]);
    if (trimmedQuery.length < 3) {
      setError(hindi ? "जगह खोजने के लिए कम से कम 3 अक्षर लिखें।" : "Enter at least 3 letters to search for a place.");
      return;
    }

    setSearching(true);
    try {
      const places = await searchPlaces(trimmedQuery);
      setResults(places);
      if (places.length === 0) {
        setError(
          hindi
            ? "इस नाम की जगह नहीं मिली। दूसरा नाम आज़माएँ या नक्शे पर क्लिक करें।"
            : "No matching places were found. Try another name or click the map.",
        );
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : hindi
            ? "जगह की खोज अभी उपलब्ध नहीं है। आप नक्शे पर क्लिक कर सकते हैं।"
            : "Place search is unavailable. You can still click the map.",
      );
    } finally {
      setSearching(false);
    }
  };

  const chooseResult = (place: GeocodingResult) => {
    onChoose({
      latitude: place.latitude,
      longitude: place.longitude,
      label: place.display_name,
    });
    setResults([]);
    setQuery(place.display_name);
  };

  return (
    <div className="location-controls">
      <button
        className="location-button"
        type="button"
        onClick={useMyLocation}
        disabled={locating}
      >
        <span aria-hidden="true">⌖</span>
        {locating
          ? hindi ? "आपकी जगह ढूँढ़ रहे हैं…" : "Finding your location…"
          : hindi ? "मेरी जगह इस्तेमाल करें" : "Use my location"}
      </button>
      <form className="place-search" onSubmit={search}>
        <label htmlFor="place-search">{hindi ? "या जगह खोजें" : "Or search for a place"}</label>
        <div className="place-search__row">
          <input
            id="place-search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={hindi ? "शहर, कस्बा या प्रसिद्ध जगह" : "City, town, or landmark"}
          />
          <button type="submit" disabled={searching}>
            {searching ? hindi ? "खोज रहे हैं…" : "Searching…" : hindi ? "खोजें" : "Search"}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="place-search__results" aria-label="Place search results">
            {results.map((place) => (
              <li key={`${place.latitude}-${place.longitude}-${place.display_name}`}>
                <button type="button" onClick={() => chooseResult(place)}>
                  <span>{place.display_name}</span>
                  <small>
                    {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      {error && (
        <p className="location-error" role="alert">
          {error}
        </p>
      )}
      <p className="location-attribution">
        {hindi
          ? "जगह की खोज OpenStreetMap के योगदानकर्ताओं की मदद से।"
          : "Place search by OpenStreetMap contributors."}
      </p>
    </div>
  );
}
