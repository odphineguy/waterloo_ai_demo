// Central Google Maps JS loader for the Design Studio. The key is a
// referrer-locked VITE_ var (standard for Maps JS — not a secret in the OpenAI
// sense, but still locked to our domains). If the key is missing the studio
// degrades gracefully: address entry falls back to free-typing and the trace
// step is skipped with sqft unknown ("Requires on-site measure").
//
// Enabled on the key: Maps JavaScript API, Places API (New), Places API,
// Aerial View API. Geocoding / Static Maps / Distance Matrix are NOT enabled —
// use Places result geometry and the html2canvas snapshot instead.

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;

export function getMapsApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  return key && key.trim() ? key.trim() : null;
}

export type MapsLibraries = {
  maps: google.maps.MapsLibrary;
  places: google.maps.PlacesLibrary;
  geometry: google.maps.GeometryLibrary;
  marker: google.maps.MarkerLibrary;
};

export async function loadMapsLibraries(): Promise<MapsLibraries> {
  const key = getMapsApiKey();
  if (!key) {
    throw new Error("VITE_GOOGLE_MAPS_KEY is not configured.");
  }

  if (!configured) {
    setOptions({
      key,
      v: "weekly",
      libraries: ["places", "geometry", "drawing", "marker"],
    });
    configured = true;
  }

  const [maps, places, geometry, marker] = await Promise.all([
    importLibrary("maps"),
    importLibrary("places"),
    importLibrary("geometry"),
    importLibrary("marker"),
  ]);

  return { maps, places, geometry, marker };
}
