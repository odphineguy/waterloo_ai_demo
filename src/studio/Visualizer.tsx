import { useEffect, useRef, useState } from "react";
import { getCalApi } from "@calcom/embed-react";
import type { ClientConfig, StudioConfig, YardPreviewResult } from "../types";
import type { StudioInvestment } from "../utils/studioEstimate";
import type { StudioState } from "./studioState";
import type { FlyoverVideo } from "../services/aerialFlyover";
import { CinematicTour } from "./CinematicTour";

const CAL_NAMESPACE = "studio";

function getCalLink(bookingUrl: string): string | null {
  try {
    const url = new URL(bookingUrl);
    if (!url.hostname.endsWith("cal.com")) return null;
    return url.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

type ViewMode = "slider" | "curtain" | "flyover";

type VisualizerProps = {
  client: ClientConfig;
  studio: StudioConfig;
  state: StudioState;
  render: YardPreviewResult | null;
  flyover: FlyoverVideo | null;
  investment: StudioInvestment;
  onEmail: () => void;
  onRestart: () => void;
};

export function Visualizer({
  client,
  studio,
  state,
  render,
  flyover,
  investment,
  onEmail,
  onRestart,
}: VisualizerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("slider");
  const [sliderPos, setSliderPos] = useState(50);
  const [showHandle, setShowHandle] = useState(true);
  const [tourActive, setTourActive] = useState(false);
  const [pairIndex, setPairIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(false);
  const rafRef = useRef(0);

  const selectedPackage = studio.packages.find((pkg) => pkg.id === state.packageId);
  const designStyleName =
    state.designStyle === "freeform"
      ? "Freeform"
      : state.designStyle === "modern"
        ? "Modern"
        : "Surprise Me";
  const paverName =
    studio.paverStyles.find((paver) => paver.id === state.paverStyle)?.label ?? "—";
  const sqftLabel =
    state.netSqft != null && state.netSqft > 0
      ? state.netSqft.toLocaleString("en-US")
      : "—";

  // With photos: per-photo before/after pairs (edits flow). Without photos:
  // one pair whose "before" is the traced satellite snapshot, if we have one.
  const afterImages = render?.imageUrls ?? [];
  const pairs =
    state.photos.length > 0
      ? state.photos.map((photo, index) => ({
          before: photo.previewUrl as string | null,
          after: afterImages[index] ?? afterImages[0] ?? null,
          label: `Photo ${index + 1}`,
        }))
      : [
          {
            before: state.snapshotDataUrl,
            after: afterImages[0] ?? null,
            label: "Your yard",
          },
        ];
  const activePair = pairs[Math.min(pairIndex, pairs.length - 1)];
  const hasCompare = !!(activePair.before && activePair.after);
  const hasRender = !!activePair.after;

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      setSliderPos(pos);
    };
    const up = () => {
      dragRef.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const calLink = studio.bookingUrl ? getCalLink(studio.bookingUrl) : null;
  useEffect(() => {
    if (!calLink) return;
    void (async () => {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      cal("ui", {
        theme: "light",
        hideEventTypeDetails: false,
        layout: "month_view",
        cssVarsPerTheme: {
          light: { "cal-brand": client.colors.primary },
          dark: { "cal-brand": client.colors.primary },
        },
      });
    })();
  }, [calLink, client.colors.primary]);

  function pointerDown(event: React.PointerEvent) {
    if (viewMode !== "slider" || !hasCompare || !showHandle) return;
    dragRef.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }

  function selectSlider() {
    cancelAnimationFrame(rafRef.current);
    setViewMode("slider");
    setSliderPos(50);
    setShowHandle(true);
  }

  function selectCurtain() {
    cancelAnimationFrame(rafRef.current);
    setViewMode("curtain");
    setShowHandle(false);
    setSliderPos(100);
    const t0 = performance.now();
    const duration = 1600;
    const step = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      setSliderPos(100 - 100 * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function saveAfter() {
    if (!activePair.after) return;
    const link = document.createElement("a");
    link.href = activePair.after;
    link.download = `${client.slug}-yard-design.png`;
    link.click();
  }

  const firstName = state.lead.name.trim().split(/\s+/)[0] || "friend";
  const captionSub = `${sqftLabel} sqft · ${designStyleName} · ${investment.label}`;

  return (
    <div className="studio-screen studio-reveal-screen">
      <div className="studio-reveal-inner">
        {state.discountClaimed && (
          <div className="studio-claimed-banner">
            <span className="studio-claimed-check">✓</span>
            <div className="studio-claimed-text">
              You&rsquo;re in, {firstName} — {studio.incentive.label} off is
              locked to this design.
            </div>
          </div>
        )}

        <div className="studio-reveal-layout">
          <div className="studio-visual-col">
            <div
              ref={trackRef}
              className={`studio-compare${viewMode === "slider" && hasCompare ? "" : " studio-compare--static"}`}
              onPointerDown={pointerDown}
            >
              {viewMode === "flyover" && flyover ? (
                <video src={flyover.videoUri} controls autoPlay muted playsInline loop />
              ) : hasRender ? (
                <>
                  <img src={activePair.after ?? undefined} alt="After" />
                  {hasCompare && (
                    <img
                      src={activePair.before ?? undefined}
                      alt="Before"
                      style={{
                        clipPath: `inset(0 ${(100 - sliderPos).toFixed(2)}% 0 0)`,
                      }}
                    />
                  )}
                  {hasCompare && (
                    <>
                      <div className="studio-compare-label studio-compare-label--before">
                        BEFORE
                      </div>
                      <div className="studio-compare-label studio-compare-label--after">
                        AFTER
                      </div>
                    </>
                  )}
                  {hasCompare && showHandle && viewMode === "slider" && (
                    <div
                      className="studio-compare-handle"
                      style={{ left: `${sliderPos.toFixed(2)}%` }}
                    >
                      <div className="studio-compare-grabber">↔</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="studio-render-fallback">
                  <div className="studio-render-fallback-inner">
                    <div className="studio-render-fallback-title">
                      Your render hit a snag
                    </div>
                    <div className="studio-render-fallback-sub">
                      Your design details and {studio.incentive.label} off are
                      saved — {client.companyName} will send your preview and
                      confirm everything at your free consultation.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="studio-view-modes">
              {hasCompare && (
                <>
                  <button
                    type="button"
                    className={`studio-seg-btn${viewMode === "slider" ? " studio-seg-btn--on" : ""}`}
                    onClick={selectSlider}
                  >
                    Slider
                  </button>
                  <button
                    type="button"
                    className={`studio-seg-btn${viewMode === "curtain" ? " studio-seg-btn--on" : ""}`}
                    onClick={selectCurtain}
                  >
                    Curtain reveal
                  </button>
                </>
              )}
              {hasRender && (
                <button
                  type="button"
                  className="studio-seg-btn"
                  onClick={() => setTourActive(true)}
                >
                  Cinematic tour
                </button>
              )}
              {flyover && (
                <button
                  type="button"
                  className={`studio-seg-btn${viewMode === "flyover" ? " studio-seg-btn--on" : ""}`}
                  onClick={() => setViewMode("flyover")}
                >
                  Property Flyover
                </button>
              )}
            </div>

            {pairs.length > 1 && (
              <div className="studio-pair-tabs">
                {pairs.map((pair, index) => (
                  <button
                    key={pair.label}
                    type="button"
                    className={`studio-pair-tab${index === pairIndex ? " studio-pair-tab--on" : ""}`}
                    onClick={() => {
                      setPairIndex(index);
                      selectSlider();
                    }}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="studio-summary-col">
            <div className="studio-summary-card">
              <div className="studio-summary-label">Your package</div>
              <div className="studio-summary-package">
                {selectedPackage?.name ?? "Your design"}
              </div>
              <div className="studio-summary-chips">
                {(selectedPackage?.items ?? []).map((item) => (
                  <span key={item} className="studio-chip">
                    {item}
                  </span>
                ))}
              </div>
              <div className="studio-summary-meta">
                <span>
                  <b>{sqftLabel}</b> sqft
                </span>
                <span>
                  <b>{designStyleName}</b> style
                </span>
                <span>
                  <b>{paverName}</b> pavers
                </span>
              </div>
            </div>

            <div className="studio-invest-card">
              <div className="studio-invest-label">Estimated investment</div>
              <div
                className={`studio-invest-value${investment.kind === "measure" ? " studio-invest-value--measure" : ""}`}
              >
                {investment.label}
              </div>
              <div className="studio-invest-disclaimer">
                {studio.disclaimer} {studio.incentive.label} off applied at
                booking.
              </div>
            </div>

            <div className="studio-action-grid">
              {hasRender && (
                <button type="button" className="studio-action-btn" onClick={saveAfter}>
                  Save
                </button>
              )}
              {hasRender && (
                <button type="button" className="studio-action-btn" onClick={onEmail}>
                  Email
                </button>
              )}
              {hasRender && (
                <button
                  type="button"
                  className="studio-action-btn"
                  onClick={() => setTourActive(true)}
                >
                  ▶ Tour
                </button>
              )}
              <button type="button" className="studio-action-btn" onClick={onRestart}>
                Start over
              </button>
            </div>

            {studio.bookingUrl &&
              (calLink ? (
                <button
                  type="button"
                  className="studio-book-cta"
                  data-cal-namespace={CAL_NAMESPACE}
                  data-cal-link={calLink}
                  data-cal-config='{"layout":"month_view"}'
                >
                  Book My Free Consultation
                </button>
              ) : (
                <a
                  className="studio-book-cta"
                  style={{ textAlign: "center" }}
                  href={studio.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book My Free Consultation
                </a>
              ))}
          </div>
        </div>
      </div>

      {tourActive && activePair.after && (
        <CinematicTour
          afterImage={activePair.after}
          packageName={selectedPackage?.name ?? "Your design"}
          captionSub={captionSub}
          onClose={() => setTourActive(false)}
        />
      )}
    </div>
  );
}
