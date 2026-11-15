"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { Coordinates, PlaceLocation } from "@/lib/api";
import { useLanguage } from "@/lib/language";

export type MapSelectionMode = "primary" | "comparison" | null;

type MapPickerProps = {
  primary: PlaceLocation | null;
  comparison?: PlaceLocation | null;
  selectionMode: MapSelectionMode;
  onMapSelect: (coordinates: Coordinates) => void;
};

const placeMarker = L.divIcon({
  className: "",
  html: '<span class="earth-pulse-marker"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function MapPicker({
  primary,
  comparison = null,
  selectionMode,
  onMapSelect,
}: MapPickerProps) {
  const { language } = useLanguage();
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const primaryMarker = useRef<L.Marker | null>(null);
  const comparisonMarker = useRef<L.Marker | null>(null);
  const selectionModeRef = useRef(selectionMode);
  const onMapSelectRef = useRef(onMapSelect);

  useEffect(() => {
    selectionModeRef.current = selectionMode;
    onMapSelectRef.current = onMapSelect;
  }, [selectionMode, onMapSelect]);

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    const leafletMap = L.map(mapElement.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 13,
      scrollWheelZoom: true,
      keyboard: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(leafletMap);
    leafletMap.on("click", (event: L.LeafletMouseEvent) => {
      if (selectionModeRef.current) {
        onMapSelectRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }
    });
    map.current = leafletMap;

    return () => {
      leafletMap.remove();
      map.current = null;
      primaryMarker.current = null;
      comparisonMarker.current = null;
    };
  }, []);

  useEffect(() => {
    const leafletMap = map.current;
    if (!leafletMap) {
      return;
    }

    if (primary) {
      if (primaryMarker.current) {
        primaryMarker.current.setLatLng([primary.latitude, primary.longitude]);
        primaryMarker.current.setTooltipContent(primary.label);
      } else {
        primaryMarker.current = L.marker(
          [primary.latitude, primary.longitude],
          {
            icon: placeMarker,
            title: primary.label,
            alt: language === "hi" ? "चुनी हुई जगह" : "Selected place",
          },
        ).addTo(leafletMap);
        primaryMarker.current.bindTooltip(primary.label);
      }
    } else if (primaryMarker.current) {
      primaryMarker.current.remove();
      primaryMarker.current = null;
    }

    if (comparison) {
      if (comparisonMarker.current) {
        comparisonMarker.current.setLatLng([
          comparison.latitude,
          comparison.longitude,
        ]);
        comparisonMarker.current.setTooltipContent(comparison.label);
      } else {
        comparisonMarker.current = L.marker(
          [comparison.latitude, comparison.longitude],
          {
            icon: placeMarker,
            title: comparison.label,
            alt: language === "hi" ? "तुलना की जगह" : "Comparison place",
          },
        ).addTo(leafletMap);
        comparisonMarker.current.bindTooltip(comparison.label);
      }
    } else if (comparisonMarker.current) {
      comparisonMarker.current.remove();
      comparisonMarker.current = null;
    }

    const focus = comparison ?? primary;
    if (focus) {
      leafletMap.flyTo(
        [focus.latitude, focus.longitude],
        Math.max(leafletMap.getZoom(), 5),
        { duration: 0.6 },
      );
    }
  }, [primary, comparison, language]);

  return (
    <div
      ref={mapElement}
      className={`leaflet-map${selectionMode ? " leaflet-map--selecting" : ""}`}
      role="application"
      aria-label={
        language === "hi"
          ? "चलता-फिरता नक्शा। तीर वाली कुंजियों से जाएँ या जगह चुनने के लिए क्लिक करें।"
          : "Interactive map. Use the arrow keys to move around, or click to choose a place."
      }
    />
  );
}
