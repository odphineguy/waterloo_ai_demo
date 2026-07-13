// Feature-flag seam for the trace-map aerial imagery provider.
// Phase 1 ships only the Google implementation (the live satellite map in
// TraceMap.tsx consumes this descriptor). EagleView is intentionally a stub —
// pricing/licensing unresolved until the EagleView call; do not port
// eagleviewService.ts here yet. The seam is the deliverable.

export type ImagerySourceId = "google" | "eagleview";

export type AerialView = {
  provider: "google";
  center: { lat: number; lng: number };
  /** Satellite map defaults per the studio spec: zoom ~20, tilt 0. */
  zoom: number;
  tilt: number;
};

export function getAerialView(
  lat: number,
  lng: number,
  source: ImagerySourceId = "google",
): AerialView {
  switch (source) {
    case "google":
      return { provider: "google", center: { lat, lng }, zoom: 20, tilt: 0 };
    case "eagleview":
      // TODO(phase-2): wire EagleView once pricing/licensing is confirmed.
      throw new Error("EagleView imagery source is not configured.");
  }
}
