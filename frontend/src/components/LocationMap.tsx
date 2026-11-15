"use client";

import dynamic from "next/dynamic";
import {
  Coordinates,
  PlaceLocation,
} from "@/lib/api";
import { MapSelectionMode } from "@/components/MapPicker";

type LocationMapProps = {
  primary: PlaceLocation | null;
  comparison?: PlaceLocation | null;
  selectionMode: MapSelectionMode;
  onMapSelect: (coordinates: Coordinates) => void;
};

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading the interactive map…
    </div>
  ),
});

export default function LocationMap(props: LocationMapProps) {
  return (
    <div className="map-shell">
      <MapPicker {...props} />
    </div>
  );
}
