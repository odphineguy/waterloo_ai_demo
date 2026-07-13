import { useEffect, useState } from "react";
import type { ClientConfig, StudioConfig } from "../types";
import type { StudioLead } from "./studioState";

const SLOW_RENDER_MS = 3800;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isValidPhone(value: string) {
  return value.replace(/\D/g, "").replace(/^1/, "").length === 10;
}

type LeadGateProps = {
  client: ClientConfig;
  studio: StudioConfig;
  lead: StudioLead;
  /** True once the user submitted but the render is still finishing. */
  finishing: boolean;
  onField: (field: keyof StudioLead, value: string) => void;
  onSubmit: () => void;
};

// The render request is started by StudioFlow the moment this gate mounts, so
// the reveal feels instant on submit. Tone = unlock, not toll-booth.
export function LeadGate({
  client,
  studio,
  lead,
  finishing,
  onField,
  onSubmit,
}: LeadGateProps) {
  const [slowRender, setSlowRender] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const heroImage = studio.heroImagePath;

  useEffect(() => {
    const timer = setTimeout(() => setSlowRender(true), SLOW_RENDER_MS);
    return () => clearTimeout(timer);
  }, []);

  const filled = !!(lead.name.trim() && lead.email.trim() && lead.phone.trim());

  function submit() {
    if (!filled) return;
    if (!isValidEmail(lead.email)) {
      setValidationError("That email doesn't look right — mind double-checking it?");
      return;
    }
    if (!isValidPhone(lead.phone)) {
      setValidationError("Please enter a 10-digit phone number.");
      return;
    }
    setValidationError(null);
    onSubmit();
  }

  return (
    <div className="studio-gate-screen">
      {heroImage ? (
        <img className="studio-gate-backdrop" src={heroImage} alt="" />
      ) : (
        <div className="studio-gate-backdrop-fallback" />
      )}
      <div className="studio-gate-scrim" />
      <div className="studio-gate-shimmer" />

      <div className="studio-gate-card">
        <div className="studio-gate-head">
          <div className="studio-spinner" />
          <div>
            <div className="studio-gate-title">
              {finishing ? "Finishing your render…" : "Your design is rendering…"}
            </div>
            <div className="studio-gate-sub">
              {finishing
                ? "Just a few more seconds."
                : "Unlock it below to see the reveal."}
            </div>
          </div>
        </div>
        {(slowRender || finishing) && (
          <div className="studio-gate-slow">
            Still working — a high-res render can take a moment longer than
            usual. Hang tight.
          </div>
        )}
        <div className="studio-gate-divider" />
        <div className="studio-incentive-pill">
          ✦ {studio.incentive.label} off locks to this design
        </div>
        <div className="studio-gate-fields">
          <input
            className="studio-gate-input"
            value={lead.name}
            onChange={(event) => onField("name", event.target.value)}
            placeholder="Full name"
            autoComplete="name"
          />
          <input
            className="studio-gate-input"
            value={lead.email}
            onChange={(event) => onField("email", event.target.value)}
            type="email"
            placeholder="Email address"
            autoComplete="email"
          />
          <input
            className="studio-gate-input"
            value={lead.phone}
            onChange={(event) => onField("phone", event.target.value)}
            type="tel"
            placeholder="Phone number"
            autoComplete="tel"
          />
        </div>
        {validationError && (
          <div className="studio-gate-slow" style={{ marginTop: 10 }}>
            {validationError}
          </div>
        )}
        <button
          type="button"
          className="studio-gate-submit"
          disabled={!filled || finishing}
          onClick={submit}
        >
          Show My Design + Claim {studio.incentive.label} Off
        </button>
        <p className="studio-gate-consent">
          By continuing you agree to be contacted by {client.companyName} about
          your project. No spam · unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
