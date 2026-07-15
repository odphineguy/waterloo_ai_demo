import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { StudioConfig } from "../types";
import { calculateStudioInvestment } from "../utils/studioEstimate";

// Inline SVG icon paths per design style (from the design handoff's cfg).
const STYLE_META: Record<string, { name: string; desc: string; icon: string }> = {
  freeform: { name: "Freeform", desc: "Organic, natural curves", icon: "M3 15c3-6 6-6 9 0s6 5 9-2" },
  modern: { name: "Modern", desc: "Clean geometric lines", icon: "M4 5h6v6H4zM14 13h6v6h-6z" },
  surprise: {
    name: "Surprise Me",
    desc: "Let's get creative",
    icon: "M12 3l2.1 5.6L20 11l-5.9 2.4L12 19l-2.1-5.6L4 11l5.9-2.4z",
  },
};

const SHEET_MIN_PCT = 30;
const SHEET_MAX_PCT = 88;
const SHEET_PEEK_PCT = 45;

type EditorRailProps = {
  studio: StudioConfig;
  netSqft: number | null;
  /** Number of traced areas — drives the "· 2 areas" chip on the sqft card. */
  areaCount: number;
  packageId: string | null;
  designStyle: string;
  paverStyle: string;
  onSelectPackage: (packageId: string) => void;
  onDesignStyle: (id: string) => void;
  onPaverStyle: (id: string) => void;
  onContinue: () => void;
};

// Rail for the merged "Design your package" step. Renders beside (desktop) or
// over (mobile bottom sheet) the live traced map that TraceMap keeps mounted.
// Every selection dispatches the same actions the old Package/Style pages did.
export function EditorRail({
  studio,
  netSqft,
  areaCount,
  packageId,
  designStyle,
  paverStyle,
  onSelectPackage,
  onDesignStyle,
  onPaverStyle,
  onContinue,
}: EditorRailProps) {
  // Mobile bottom sheet height (% of the canvas), dragged via the grip. The
  // inline var only takes effect inside the ≤768px media query.
  const [sheetPct, setSheetPct] = useState(SHEET_PEEK_PCT);
  const dragRef = useRef<{ startY: number; startPct: number } | null>(null);

  function onGripDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startPct: sheetPct };
  }
  function onGripMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaPct = ((drag.startY - event.clientY) / window.innerHeight) * 100;
    setSheetPct(
      Math.min(SHEET_MAX_PCT, Math.max(SHEET_MIN_PCT, drag.startPct + deltaPct)),
    );
  }
  function onGripUp() {
    dragRef.current = null;
  }

  const hasSqft = netSqft != null && netSqft > 0;
  const investment = calculateStudioInvestment(netSqft, packageId, studio);

  return (
    <div
      className="studio-editor-rail"
      style={{ "--sheet-h": `${sheetPct}%` } as CSSProperties}
    >
      <div
        className="studio-editor-grip"
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripUp}
      >
        <span />
      </div>

      <div className="studio-editor-scroll">
        <div className="studio-area-card">
          <div className="studio-area-label">
            Area measured
            {areaCount > 1 && (
              <span className="studio-area-count"> · {areaCount} areas</span>
            )}
          </div>
          {hasSqft ? (
            <div className="studio-area-readout">
              <span className="studio-area-value">
                {netSqft.toLocaleString("en-US")}
              </span>
              <span className="studio-area-unit">sq ft</span>
            </div>
          ) : (
            <div className="studio-editor-nosqft">
              Confirmed at your free on-site measure
            </div>
          )}
        </div>

        <div>
          <div className="studio-section-label">Choose your package</div>
          <div className="studio-editor-packages">
            {studio.packages.map((pkg) => {
              const selected = pkg.id === packageId;
              const range = calculateStudioInvestment(netSqft, pkg.id, studio);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  className={`studio-ed-pkg${selected ? " studio-ed-pkg--selected" : ""}`}
                  onClick={() => onSelectPackage(pkg.id)}
                >
                  <div className="studio-ed-pkg-head">
                    <span className="studio-ed-pkg-name">{pkg.name}</span>
                    <span className="studio-ed-pkg-count">
                      {pkg.items.length} {pkg.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <p className="studio-ed-pkg-desc">{pkg.description}</p>
                  {range.kind === "range" && (
                    <div className="studio-ed-pkg-range">{range.label}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="studio-section-label">Turf design style</div>
          <div className="studio-editor-styles">
            {studio.designStyles.map((id) => {
              const meta = STYLE_META[id];
              const selected = id === designStyle;
              return (
                <button
                  key={id}
                  type="button"
                  className={`studio-ed-style${selected ? " studio-ed-style--selected" : ""}`}
                  onClick={() => onDesignStyle(id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={selected ? "var(--st-bright)" : "#8a938a"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={meta.icon} />
                  </svg>
                  <span>{meta.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="studio-section-label">Paver style</div>
          <div className="studio-editor-pavers">
            {studio.paverStyles.map((paver) => {
              const selected = paver.id === paverStyle;
              return (
                <button
                  key={paver.id}
                  type="button"
                  className={`studio-ed-paver${selected ? " studio-ed-paver--selected" : ""}`}
                  onClick={() => onPaverStyle(paver.id)}
                >
                  <span
                    className="studio-ed-paver-swatch"
                    style={{ backgroundImage: `url("${paver.swatchPath}")` }}
                  />
                  <span className="studio-ed-paver-name">{paver.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="studio-editor-foot">
        <div className="studio-editor-estimate">
          <span className="studio-editor-estimate-label">
            Estimated investment
          </span>
          <span
            className={`studio-editor-estimate-value${
              investment.kind === "measure" ? " studio-editor-estimate-value--measure" : ""
            }`}
          >
            {packageId ? investment.label : "Select a package"}
          </span>
        </div>
        <button
          type="button"
          className="studio-big-cta"
          disabled={!packageId}
          onClick={onContinue}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
