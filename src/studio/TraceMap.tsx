import { useEffect, useRef, useState } from "react";
import { getMapsApiKey, loadMapsLibraries } from "../services/googleMaps";
import { getAerialView } from "../services/imagerySource";
import type { StudioConfig } from "../types";
import type { LatLngPoint, StudioAddress, TraceResult } from "./studioState";

const SQFT_PER_SQ_METER = 10.7639;
const MIN_WARN_SQFT = 300;
const MAX_WARN_SQFT = 25_000;

const TRACE_STYLE = {
  fillColor: "#2f7339",
  fillOpacity: 0.22,
  strokeColor: "#3fae63",
  strokeWeight: 2.5,
  clickable: false,
};
const DEDUCT_STYLE = {
  fillColor: "#cc3c28",
  fillOpacity: 0.24,
  strokeColor: "#ff6a4d",
  strokeWeight: 2.5,
  clickable: false,
};

type Mode = "trace" | "deduct";

type TraceMapProps = {
  studio: StudioConfig;
  address: StudioAddress | null;
  mapsFailed: boolean;
  onMapsFailed: () => void;
  onApply: (result: TraceResult) => void;
};

function toPoints(path: google.maps.LatLng[]): LatLngPoint[] {
  return path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
}

export function TraceMap({
  studio,
  address,
  mapsFailed,
  onMapsFailed,
  onApply,
}: TraceMapProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geometryRef = useRef<google.maps.GeometryLibrary | null>(null);
  const mapsLibRef = useRef<google.maps.MapsLibrary | null>(null);

  const traceRef = useRef<google.maps.LatLng[]>([]);
  const closedTracesRef = useRef<google.maps.LatLng[][]>([]);
  const activeDeductRef = useRef<google.maps.LatLng[]>([]);
  const closedDeductsRef = useRef<google.maps.LatLng[][]>([]);
  const tracePolysRef = useRef<google.maps.Polygon[]>([]);
  const deductPolysRef = useRef<google.maps.Polygon[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const modeRef = useRef<Mode>("trace");
  const tutorialRef = useRef(true);
  const rafRef = useRef(0);

  const hasGeometry = !mapsFailed && address?.lat != null && address?.lng != null;

  const [mode, setMode] = useState<Mode>("trace");
  const [mapReady, setMapReady] = useState(false);
  const [mapDown, setMapDown] = useState(() => !hasGeometry);
  const [showTutorial, setShowTutorial] = useState(true);
  const [displaySqft, setDisplaySqft] = useState(0);
  const [measuredSqft, setMeasuredSqft] = useState(0);
  const [tracePointCount, setTracePointCount] = useState(0);
  const [traceRegionCount, setTraceRegionCount] = useState(0);
  const [scaleLabel, setScaleLabel] = useState("20 ft");
  const [applying, setApplying] = useState(false);

  const displayRef = useRef(0);

  function netSqft() {
    const geometry = geometryRef.current;
    if (!geometry) return 0;
    const area = (path: google.maps.LatLng[]) =>
      path.length >= 3 ? geometry.spherical.computeArea(path) : 0;
    const traced =
      closedTracesRef.current.reduce((sum, path) => sum + area(path), 0) +
      area(traceRef.current);
    const deductions =
      closedDeductsRef.current.reduce((sum, path) => sum + area(path), 0) +
      area(activeDeductRef.current);
    const net = (traced - deductions) * SQFT_PER_SQ_METER;
    return Math.max(0, Math.round(net));
  }

  function tweenSqft(target: number) {
    cancelAnimationFrame(rafRef.current);
    const start = displayRef.current;
    const t0 = performance.now();
    const duration = 480;
    const step = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(start + (target - start) * eased);
      displayRef.current = value;
      setDisplaySqft(value);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function syncOverlays() {
    const map = mapRef.current;
    const mapsLib = mapsLibRef.current;
    if (!map || !mapsLib) return;

    const tracePaths = [...closedTracesRef.current];
    if (traceRef.current.length > 0) tracePaths.push(traceRef.current);
    tracePolysRef.current.forEach((poly) => poly.setMap(null));
    tracePolysRef.current = tracePaths.map(
      (path) => new mapsLib.Polygon({ ...TRACE_STYLE, map, paths: path }),
    );

    const deductPaths = [...closedDeductsRef.current];
    if (activeDeductRef.current.length > 0) deductPaths.push(activeDeductRef.current);
    deductPolysRef.current.forEach((poly) => poly.setMap(null));
    deductPolysRef.current = deductPaths.map(
      (path) => new mapsLib.Polygon({ ...DEDUCT_STYLE, map, paths: path }),
    );

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    const dot = (color: string) => ({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    });
    [...closedTracesRef.current, traceRef.current].flat().forEach((position) => {
      markersRef.current.push(
        new google.maps.Marker({ map, position, icon: dot("#3CC870"), clickable: false }),
      );
    });
    closedDeductsRef.current.flat().forEach((position) => {
      markersRef.current.push(
        new google.maps.Marker({ map, position, icon: dot("#ff6a4d"), clickable: false }),
      );
    });
    activeDeductRef.current.forEach((position, index) => {
      const marker = new google.maps.Marker({
        map,
        position,
        icon: dot("#ff6a4d"),
        clickable: index === 0 && activeDeductRef.current.length >= 3,
      });
      // Tapping the first vertex closes the deduct polygon and starts a new one.
      if (index === 0) {
        marker.addListener("click", () => {
          if (activeDeductRef.current.length >= 3) {
            closedDeductsRef.current.push(activeDeductRef.current);
            activeDeductRef.current = [];
            syncOverlays();
          }
        });
      }
      markersRef.current.push(marker);
    });

    setTracePointCount(traceRef.current.length);
    setTraceRegionCount(closedTracesRef.current.length);
    const sqft = netSqft();
    setMeasuredSqft(sqft);
    tweenSqft(sqft);
  }

  useEffect(() => {
    let cancelled = false;
    if (!hasGeometry || !address?.lat || !address?.lng) {
      if (!getMapsApiKey()) onMapsFailed();
      return;
    }

    const view = getAerialView(address.lat, address.lng, studio.imagerySource ?? "google");

    loadMapsLibraries()
      .then((libs) => {
        if (cancelled || !mapElRef.current) return;
        geometryRef.current = libs.geometry;
        mapsLibRef.current = libs.maps;
        const map = new libs.maps.Map(mapElRef.current, {
          center: view.center,
          zoom: view.zoom,
          tilt: view.tilt,
          mapTypeId: "satellite",
          disableDefaultUI: true,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: "greedy",
          draggableCursor: "crosshair",
        });
        mapRef.current = map;

        // Drop a locating pin on the geocoded house so the customer instantly
        // sees which property we found (matches the competitor's marker).
        new google.maps.Marker({
          map,
          position: view.center,
          clickable: false,
          zIndex: 1,
          title: address.formatted,
        });

        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          if (tutorialRef.current) {
            tutorialRef.current = false;
            setShowTutorial(false);
            return;
          }
          if (modeRef.current === "trace") {
            traceRef.current = [...traceRef.current, event.latLng];
          } else {
            activeDeductRef.current = [...activeDeductRef.current, event.latLng];
          }
          syncOverlays();
        });

        const updateScale = () => {
          const zoom = map.getZoom();
          const lat = map.getCenter()?.lat();
          if (zoom == null || lat == null) return;
          const metersPerPixel =
            (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
          const feet = 52 * metersPerPixel * 3.28084;
          setScaleLabel(`${Math.max(5, Math.round(feet / 5) * 5)} ft`);
        };
        map.addListener("idle", updateScale);
        setMapReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMapDown(true);
        onMapsFailed();
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(next: Mode) {
    modeRef.current = next;
    setMode(next);
  }

  // Finalize the current traced area so a second one (e.g. back yard) can be
  // started. Only meaningful with a closed shape (≥3 points).
  function applyRegion() {
    if (traceRef.current.length < 3) return;
    closedTracesRef.current = [...closedTracesRef.current, traceRef.current];
    traceRef.current = [];
    switchMode("trace");
    syncOverlays();
  }

  function undo() {
    if (modeRef.current === "trace") {
      if (traceRef.current.length > 0) {
        traceRef.current = traceRef.current.slice(0, -1);
      } else if (closedTracesRef.current.length > 0) {
        // Reopen the most recently applied area so undo keeps walking back.
        traceRef.current = (closedTracesRef.current.pop() ?? []).slice(0, -1);
      }
    } else if (activeDeductRef.current.length > 0) {
      activeDeductRef.current = activeDeductRef.current.slice(0, -1);
    } else if (closedDeductsRef.current.length > 0) {
      // Reopen the most recently closed deduct so undo keeps walking back.
      activeDeductRef.current = closedDeductsRef.current.pop() ?? [];
      activeDeductRef.current = activeDeductRef.current.slice(0, -1);
    }
    syncOverlays();
  }

  function clearAll() {
    traceRef.current = [];
    closedTracesRef.current = [];
    activeDeductRef.current = [];
    closedDeductsRef.current = [];
    syncOverlays();
  }

  function dismissTutorial() {
    tutorialRef.current = false;
    setShowTutorial(false);
  }

  async function captureSnapshot(): Promise<string | null> {
    const surface = surfaceRef.current;
    if (!surface || !mapReady) return null;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(surface, {
        useCORS: true,
        backgroundColor: null,
        logging: false,
        scale: Math.min(1, 640 / surface.offsetWidth),
      });
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      // Map tiles can taint the canvas; the snapshot is a nice-to-have.
      return null;
    }
  }

  async function apply() {
    setApplying(true);
    try {
      if (mapDown || !mapReady) {
        onApply({
          trace: [],
          deducts: [],
          netSqft: null,
          mapCenter: null,
          mapZoom: null,
          snapshotDataUrl: null,
        });
        return;
      }
      const map = mapRef.current;
      const center = map?.getCenter();
      const traces = [...closedTracesRef.current];
      if (traceRef.current.length >= 3) traces.push(traceRef.current);
      const deducts = [...closedDeductsRef.current];
      if (activeDeductRef.current.length >= 3) deducts.push(activeDeductRef.current);
      const snapshot = await captureSnapshot();
      onApply({
        trace: traces.map(toPoints),
        deducts: deducts.map(toPoints),
        netSqft: netSqft(),
        mapCenter: center ? { lat: center.lat(), lng: center.lng() } : null,
        mapZoom: map?.getZoom() ?? null,
        snapshotDataUrl: snapshot,
      });
    } finally {
      setApplying(false);
    }
  }

  // A yard is measurable once at least one area is complete — either an
  // applied region or the active shape reaching 3 points.
  const hasCompletedArea = traceRegionCount > 0 || tracePointCount >= 3;
  const needMorePoints = !hasCompletedArea;
  const canApplyRegion = mode === "trace" && tracePointCount >= 3;
  const areaCount = traceRegionCount + (tracePointCount >= 3 ? 1 : 0);
  const sizeWarning =
    !needMorePoints && measuredSqft > 0 && measuredSqft < MIN_WARN_SQFT
      ? "That looks small — you can adjust your outline or continue."
      : !needMorePoints && measuredSqft > MAX_WARN_SQFT
        ? "That looks large — you can adjust your outline or continue."
        : null;

  return (
    <div className="studio-screen studio-trace-screen">
      <div className="studio-trace-layout">
        <div className="studio-trace-map-col">
          <div className="studio-trace-surface" ref={surfaceRef}>
            <div className="studio-trace-map" ref={mapElRef} />
            {mapDown && (
              <div className="studio-trace-fallback">
                <div className="studio-trace-fallback-card">
                  <div className="studio-trace-fallback-title">
                    Satellite imagery unavailable
                  </div>
                  <div className="studio-trace-fallback-sub">
                    No problem — continue to packages and we&rsquo;ll measure
                    your yard at the free on-site visit.
                  </div>
                </div>
              </div>
            )}
            <div className="studio-map-compass">N</div>
            <div className="studio-map-scale">
              <div className="studio-map-scale-bar" />
              <span className="studio-map-scale-label">{scaleLabel}</span>
            </div>
            <div className="studio-map-caption">Satellite imagery</div>
            {showTutorial && !mapDown && (
              <div className="studio-tutorial-overlay">
                <div className="studio-tutorial-card">
                  <svg viewBox="0 0 120 90">
                    <polygon
                      points="20,68 30,22 92,18 100,66"
                      fill="rgba(63,174,99,.2)"
                      stroke="#3fae63"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    {[
                      [20, 68],
                      [30, 22],
                      [92, 18],
                      [100, 66],
                    ].map(([cx, cy]) => (
                      <circle
                        key={`${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r="5"
                        fill="#3CC870"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                  <div className="studio-tutorial-title">
                    Tap the corners of your yard
                  </div>
                  <div className="studio-tutorial-sub">
                    Outline the area you want transformed. Add 3 or more points
                    to close the shape.
                  </div>
                  <button
                    type="button"
                    className="studio-tutorial-btn"
                    onClick={dismissTutorial}
                  >
                    Got it — start tracing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="studio-trace-panel">
          <div className="studio-seg">
            <button
              type="button"
              className={`studio-seg-btn${mode === "trace" ? " studio-seg-btn--on" : ""}`}
              onClick={() => switchMode("trace")}
            >
              ✎ Trace
            </button>
            <button
              type="button"
              className={`studio-seg-btn${mode === "deduct" ? " studio-seg-btn--on" : ""}`}
              onClick={() => switchMode("deduct")}
            >
              ⊖ Deduct
            </button>
          </div>

          <div className="studio-area-card">
            <div className="studio-area-label">
              Area measured
              {areaCount > 1 && (
                <span className="studio-area-count"> · {areaCount} areas</span>
              )}
            </div>
            <div className="studio-area-readout">
              <span className="studio-area-value">
                {mapDown ? "—" : displaySqft.toLocaleString("en-US")}
              </span>
              <span className="studio-area-unit">sq ft</span>
            </div>
          </div>

          {canApplyRegion && !mapDown && (
            <button
              type="button"
              className="studio-apply-area"
              onClick={applyRegion}
            >
              ✓ Apply area — trace another
            </button>
          )}

          <div className="studio-trace-tools">
            <button type="button" className="studio-tool-btn" onClick={undo}>
              ↶ Undo
            </button>
            <button type="button" className="studio-tool-btn" onClick={clearAll}>
              Clear
            </button>
          </div>

          {needMorePoints && !mapDown && (
            <div className="studio-amber-hint">
              Add at least 3 points to close your yard outline.
            </div>
          )}
          {!needMorePoints && !canApplyRegion && !mapDown && traceRegionCount > 0 && (
            <div className="studio-amber-hint">
              Tap corners to add another area (e.g. back yard), or continue.
            </div>
          )}
          {sizeWarning && <div className="studio-amber-hint">{sizeWarning}</div>}

          <button
            type="button"
            className="studio-big-cta"
            disabled={(needMorePoints && !mapDown) || applying}
            onClick={() => void apply()}
          >
            {applying ? "Saving your trace…" : "Select Package →"}
          </button>
          <div className="studio-trace-note">
            Deduct mode removes pools, patios &amp; structures from your total.
          </div>
        </div>
      </div>
    </div>
  );
}
