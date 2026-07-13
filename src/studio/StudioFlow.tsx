import {
  CSSProperties,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ClientConfig, StudioConfig, YardPreviewResult } from "../types";
import { buildStudioPrompt } from "../utils/promptBuilder";
import { calculateStudioInvestment } from "../utils/studioEstimate";
import { generateStudioRender } from "../services/imageGeneration";
import { getMapsApiKey } from "../services/googleMaps";
import { startFlyoverLookup, type FlyoverVideo } from "../services/aerialFlyover";
import {
  createInitialStudioState,
  studioReducer,
  STUDIO_STEP_NUMBER,
  type StudioLeadPacket,
} from "./studioState";
import { StepIndicator } from "./StepIndicator";
import { AddressStep } from "./AddressStep";
import { TraceMap } from "./TraceMap";
import { PackageStep } from "./PackageStep";
import { StyleStep } from "./StyleStep";
import { LeadGate } from "./LeadGate";
import { Visualizer } from "./Visualizer";
import "../studio.css";

const LEAD_ENDPOINT = "/api/studio-lead";

// Default export so App.tsx can React.lazy() this chunk — the studio (and its
// Inter font, Maps loader, and html2canvas) never loads on the funnel or tour.
export default function StudioFlow({ client }: { client: ClientConfig }) {
  const studio = client.studio;
  if (!studio) {
    throw new Error("StudioFlow rendered for a tenant without a studio config.");
  }
  return <StudioFlowInner client={client} studio={studio} />;
}

function StudioFlowInner({
  client,
  studio,
}: {
  client: ClientConfig;
  studio: StudioConfig;
}) {
  const initialState = useMemo(
    () =>
      createInitialStudioState({
        designStyle: studio.designStyles.includes("modern")
          ? "modern"
          : (studio.designStyles[0] ?? "modern"),
        puttingSize:
          studio.puttingGreenSizes[1]?.id ?? studio.puttingGreenSizes[0]?.id ?? "",
        paverStyle: studio.paverStyles[0]?.id ?? "",
      }),
    [studio],
  );

  const [state, dispatch] = useReducer(studioReducer, initialState);
  const [render, setRender] = useState<YardPreviewResult | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [flyover, setFlyover] = useState<FlyoverVideo | null>(null);
  const [toast, setToast] = useState("");
  const renderPromiseRef = useRef<Promise<YardPreviewResult> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const investment = useMemo(
    () => calculateStudioInvestment(state.netSqft, state.packageId, studio),
    [state.netSqft, state.packageId, studio],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);

  // Property Flyover: kick off the Aerial View lookup as soon as the address
  // is confirmed. Config flag off or no key → zero Aerial View API calls.
  const addressFormatted = state.address?.formatted ?? null;
  useEffect(() => {
    const key = getMapsApiKey();
    if (studio.flyoverEnabled === false || !key || !addressFormatted) return;
    return startFlyoverLookup(addressFormatted, key, setFlyover);
  }, [addressFormatted, studio.flyoverEnabled]);

  // Start the render the moment the lead gate mounts, so the reveal feels
  // instant when the visitor submits their contact info.
  useEffect(() => {
    if (state.step !== "gate" || renderPromiseRef.current) return;
    const pkg = studio.packages.find((p) => p.id === state.packageId);
    if (!pkg) return;

    const puttingSize = studio.puttingGreenSizes.find(
      (size) => size.id === state.puttingSize,
    );
    const prompt = buildStudioPrompt({
      client,
      pkg,
      designStyleId: state.designStyle,
      puttingSizeLabel:
        pkg.hasPuttingGreen && puttingSize
          ? `${puttingSize.label} (${puttingSize.holes})`
          : null,
      paverLabel:
        studio.paverStyles.find((paver) => paver.id === state.paverStyle)?.label ??
        null,
      sqft: state.netSqft,
      notes: "",
      hasPhotos: state.photos.length > 0,
    });

    const attempt = () =>
      generateStudioRender({ prompt, uploadedImages: state.photos });
    const promise = attempt().catch((error: unknown) => {
      console.error("Studio render failed, retrying once:", error);
      return attempt();
    });
    renderPromiseRef.current = promise;
    promise.then(setRender).catch((error: unknown) => {
      console.error("Studio render failed after retry:", error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  function showToast(message: string) {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(""), 2600);
  }

  function buildPacket(emailRenderRequested: boolean): StudioLeadPacket {
    const pkg = studio.packages.find((p) => p.id === state.packageId);
    return {
      tenantSlug: client.slug,
      name: state.lead.name.trim(),
      email: state.lead.email.trim(),
      phone: state.lead.phone.trim(),
      address: state.address?.formatted ?? null,
      lat: state.address?.lat ?? null,
      lng: state.address?.lng ?? null,
      sqft: state.netSqft,
      packageId: state.packageId,
      packageName: pkg?.name ?? null,
      selections: {
        designStyle: state.designStyle,
        puttingSize: pkg?.hasPuttingGreen ? state.puttingSize : null,
        paverStyle: state.paverStyle,
        photoCount: state.photos.length,
        tracePath: state.trace,
        deductPaths: state.deducts,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
      },
      investmentMin: investment.kind === "range" ? investment.min : null,
      investmentMax: investment.kind === "range" ? investment.max : null,
      investmentLabel: investment.label,
      snapshotDataUrl: state.snapshotDataUrl,
      renderImageCount: render?.imageUrls.length ?? 0,
      renderImagesOmitted: true,
      emailRenderRequested,
      leadEmail: studio.leadEmail,
      incentiveLabel: studio.incentive.label,
      disclaimer: studio.disclaimer,
      createdAt: new Date().toISOString(),
    };
  }

  // POST the lead packet; retry once in the background on failure. A failed
  // POST never blocks the customer's reveal.
  function postLead(emailRenderRequested: boolean): Promise<boolean> {
    const body = JSON.stringify(buildPacket(emailRenderRequested));
    const send = async () => {
      const response = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) throw new Error(`Lead POST returned ${response.status}`);
      return true;
    };
    return send().catch((error: unknown) => {
      console.error("Studio lead POST failed, retrying once:", error);
      return send().catch((retryError: unknown) => {
        console.error("Studio lead POST retry failed:", retryError);
        return false;
      });
    });
  }

  async function handleGateSubmit() {
    dispatch({ type: "CLAIM_DISCOUNT" });
    void postLead(false);
    const promise = renderPromiseRef.current;
    if (promise) {
      setFinishing(true);
      try {
        await promise;
      } catch {
        // Render failure is handled by the visualizer's fallback state.
      }
      setFinishing(false);
    }
    dispatch({ type: "GO", step: "reveal" });
  }

  function handleEmail() {
    void postLead(true).then((ok) => {
      showToast(
        ok
          ? `Design sent to ${state.lead.email.trim() || "your inbox"} ✓`
          : "We couldn't send that just now — we'll follow up shortly.",
      );
    });
  }

  function handleRestart() {
    state.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    renderPromiseRef.current = null;
    setRender(null);
    setFlyover(null);
    setFinishing(false);
    dispatch({ type: "RESTART", initial: initialState });
  }

  const stepNumber = STUDIO_STEP_NUMBER[state.step];
  const phoneDigits = client.phone.replace(/\D/g, "");
  const websiteHost = client.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      className="studio-shell"
      style={
        {
          "--st-primary": client.colors.primary,
          "--st-deep": client.colors.primaryDark,
          "--st-soft": client.colors.primarySoft,
          "--st-accent": client.colors.accent,
          "--st-accent-dark": client.colors.accentDark,
          "--st-header-image": `url("${client.footerImagePath}")`,
        } as CSSProperties
      }
    >
      <header className="studio-header">
        <div className="studio-header-inner">
          <button
            type="button"
            className="studio-header-logo"
            onClick={() => dispatch({ type: "GO", step: "landing" })}
          >
            <img src={client.logoPath} alt={client.companyName} />
          </button>
          <a className="studio-header-phone" href={`tel:${phoneDigits}`}>
            <span className="studio-header-phone-dot" />
            {client.phone}
          </a>
        </div>
        {state.step !== "landing" && (
          <div className="studio-stepper-strip">
            <StepIndicator current={stepNumber} />
          </div>
        )}
      </header>

      {state.step === "landing" && (
        <div className="studio-screen">
          <div className="studio-landing-hero">
            <div className="studio-landing-copy">
              <div className="studio-incentive-pill">
                <span className="studio-incentive-star">✦</span>
                {studio.incentive.label} off unlocked at the end
              </div>
              <h1 className="studio-landing-h1">
                See your yard transformed{" "}
                <span>— before we ever visit.</span>
              </h1>
              <p className="studio-landing-sub">
                Trace your yard, pick your style, and get an instant AI preview
                with a real budget range.
              </p>
              <button
                type="button"
                className="studio-cta"
                onClick={() => dispatch({ type: "GO", step: "address" })}
              >
                Design My Yard →
              </button>
              <div className="studio-trust-line">
                <span className="studio-check">✓</span> Free · about 2 minutes ·
                no obligation
              </div>
            </div>
            {studio.heroImagePath && (
              <div className="studio-hero-card-wrap">
                <div className="studio-hero-card">
                  <img src={studio.heroImagePath} alt="Turf transformation" />
                  <span className="studio-hero-chip">AI Preview</span>
                  <div className="studio-hero-caption">
                    <div className="studio-hero-caption-title">
                      Modern desert retreat
                    </div>
                    <div className="studio-hero-caption-sub">
                      Rendered in seconds from a satellite trace
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="studio-landing-footer">
            <div className="studio-landing-footer-inner">
              <span>{client.legalName}</span>
              <span className="studio-footer-sep">|</span>
              <span>{client.copy.specialistLabel}</span>
              <span className="studio-footer-sep">|</span>
              <a href={client.website} target="_blank" rel="noopener noreferrer">
                {websiteHost}
              </a>
            </div>
          </div>
        </div>
      )}

      {state.step === "address" && (
        <AddressStep
          onSelect={(address) => {
            dispatch({ type: "SELECT_ADDRESS", address });
            dispatch({ type: "GO", step: "trace" });
          }}
          onMapsFailed={() => dispatch({ type: "MAPS_FAILED" })}
        />
      )}

      {state.step === "trace" && (
        <TraceMap
          studio={studio}
          address={state.address}
          mapsFailed={state.mapsFailed}
          onMapsFailed={() => dispatch({ type: "MAPS_FAILED" })}
          onApply={(result) => {
            dispatch({ type: "APPLY_TRACE", result });
            dispatch({ type: "GO", step: "package" });
          }}
        />
      )}

      {state.step === "package" && (
        <PackageStep
          studio={studio}
          netSqft={state.netSqft}
          selectedId={state.packageId}
          onSelect={(packageId) => dispatch({ type: "SELECT_PACKAGE", packageId })}
          onContinue={() => dispatch({ type: "GO", step: "style" })}
        />
      )}

      {state.step === "style" && (
        <StyleStep
          studio={studio}
          packageId={state.packageId}
          designStyle={state.designStyle}
          puttingSize={state.puttingSize}
          paverStyle={state.paverStyle}
          photos={state.photos}
          onDesignStyle={(id) => dispatch({ type: "SET_DESIGN_STYLE", id })}
          onPuttingSize={(id) => dispatch({ type: "SET_PUTTING_SIZE", id })}
          onPaverStyle={(id) => dispatch({ type: "SET_PAVER_STYLE", id })}
          onPhotos={(photos) => dispatch({ type: "SET_PHOTOS", photos })}
          onGenerate={() => dispatch({ type: "GO", step: "gate" })}
        />
      )}

      {state.step === "gate" && (
        <LeadGate
          client={client}
          studio={studio}
          lead={state.lead}
          finishing={finishing}
          onField={(field, value) => dispatch({ type: "SET_LEAD_FIELD", field, value })}
          onSubmit={() => void handleGateSubmit()}
        />
      )}

      {state.step === "reveal" && (
        <Visualizer
          client={client}
          studio={studio}
          state={state}
          render={render}
          flyover={flyover}
          investment={investment}
          onEmail={handleEmail}
          onRestart={handleRestart}
        />
      )}

      {toast && <div className="studio-toast">{toast}</div>}
    </div>
  );
}
