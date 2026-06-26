import type { ChangeEvent } from "react";
import type { ClientConfig } from "../types";
import type { ResolvedTour } from "./tourConfig";

const STAGE_PILL_CLASS: Record<string, string> = {
  New: "tour-pill-new",
  Contacted: "tour-pill-contacted",
  Quoted: "tour-pill-quoted",
  Won: "tour-pill-won",
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ----- s0 Welcome -----------------------------------------------------------
export function Welcome({
  client,
  tour,
  onStart,
}: {
  client: ClientConfig;
  tour: ResolvedTour;
  onStart: () => void;
}) {
  return (
    <div className="tour-overlay">
      <div className="tour-welcome-card">
        <img className="tour-welcome-logo" src={client.logoPath} alt={client.companyName} />
        <h1 className="tour-welcome-h1">
          {tour.welcomeHeadline.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </h1>
        <p className="tour-welcome-sub">
          Take the guided tour your customers will take. Upload, transform, estimate — and watch
          the lead land in your CRM.
        </p>
        <button type="button" className="tour-btn-primary tour-btn-lg" onClick={onStart}>
          Start the tour →
        </button>
        <div className="tour-welcome-caption">Guided · about 60 seconds · 8 steps</div>
        <a className="tour-welcome-trylive" href={`/${client.slug}`}>
          Prefer to dive in? Try it live with your own photo →
        </a>
      </div>
    </div>
  );
}

// ----- s1 Your details ------------------------------------------------------
export function YourDetails({ tour }: { tour: ResolvedTour }) {
  const c = tour.customer;
  return (
    <div className="tour-step">
      <div className="tour-step-inner tour-w-narrow">
        <div className="tour-eyebrow">Step 1 — Your details</div>
        <h2 className="tour-h2">Where should we send the preview?</h2>
        <p className="tour-sub">One short step — no long forms. We've pre-filled it for this demo.</p>
        <div className="tour-form-card">
          <div className="tour-form-grid">
            <Field label="First name" value={c.firstName} />
            <Field label="Last name" value={c.lastName} />
            <Field label="Email" value={c.email} />
            <Field label="Phone" value={c.phone} />
            <Field
              label="Property address"
              full
              value={`${c.street}, ${c.city}, ${c.state} ${c.zip}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <label className={full ? "tour-field tour-field-full" : "tour-field"}>
      <span className="tour-field-label">{label}</span>
      <input className="tour-field-input" value={value} readOnly tabIndex={-1} />
    </label>
  );
}

// ----- s2 The project -------------------------------------------------------
export function TheProject({
  client,
  options,
  onToggle,
}: {
  client: ClientConfig;
  options: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="tour-step">
      <div className="tour-step-inner tour-w-mid">
        <div className="tour-eyebrow">Step 2 — The project</div>
        <h2 className="tour-h2">What are we transforming?</h2>
        <p className="tour-sub">Tap everything that applies. Each choice shapes the render and the estimate.</p>
        <div className="tour-options-card">
          <div className="tour-options-grid">
            {client.projectOptions.map((option) => {
              const on = options.includes(option);
              return (
                <button
                  type="button"
                  key={option}
                  className="tour-option-row"
                  onClick={() => onToggle(option)}
                >
                  <span className={on ? "tour-check tour-check-on" : "tour-check"}>
                    {on && <span className="tour-check-mark">✓</span>}
                  </span>
                  <span className="tour-option-label">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- s3 The photo ---------------------------------------------------------
export function ThePhoto({ tour }: { tour: ResolvedTour }) {
  return (
    <div className="tour-step">
      <div className="tour-step-inner tour-w-wide">
        <div className="tour-eyebrow">Step 3 — The photo</div>
        <h2 className="tour-h2">Add a photo of the space</h2>
        <p className="tour-sub">One photo is all the AI needs. We're using a sample yard for this demo.</p>
        <div className="tour-dropzone">
          <img className="tour-dropzone-img" src={tour.beforeImage} alt="Sample yard before" />
          <div className="tour-dropzone-side">
            <span className="tour-upload-pill">
              <span className="tour-upload-dot" />
              back-yard.jpg · uploaded
            </span>
            <div className="tour-upload-title">Sample photo loaded</div>
            <p className="tour-upload-help">
              In the live tool your customer drags in their own photo, or snaps one from their phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- s4 Generating --------------------------------------------------------
export function Generating({ tour, gen }: { tour: ResolvedTour; gen: number }) {
  const pct = Math.round(gen);
  const checklist = [
    { label: "Analyzing the yard", done: gen > 14 },
    { label: "Placing premium turf", done: gen > 55 },
    { label: "Rendering final image", done: gen >= 100 },
  ];
  return (
    <div className="tour-step tour-step-center">
      <div className="tour-gen-panel">
        <img className="tour-gen-img" src={tour.beforeImage} alt="Generating" />
        <div className="tour-gen-scrim" />
        <div className="tour-scanline" />
        <div className="tour-gen-caption">
          <span>Designing your space…</span>
          <span className="tour-gen-pct">{pct}%</span>
        </div>
      </div>
      <div className="tour-gen-bar">
        <div className="tour-gen-bar-fill" style={{ width: `${gen}%` }} />
      </div>
      <div className="tour-gen-checklist">
        {checklist.map((item) => (
          <div key={item.label} className="tour-gen-item">
            <span className={item.done ? "tour-gen-dot tour-gen-dot-on" : "tour-gen-dot"} />
            <span className={item.done ? "tour-gen-label tour-gen-label-on" : "tour-gen-label"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- s5 Reveal ------------------------------------------------------------
export function Reveal({
  tour,
  slider,
  onSlider,
}: {
  tour: ResolvedTour;
  slider: number;
  onSlider: (value: number) => void;
}) {
  const projectLabel = tour.sampleOptions.join(" · ");
  return (
    <div className="tour-step tour-step-center">
      <div className="tour-reveal-panel">
        <img className="tour-reveal-after" src={tour.afterImage} alt="After" />
        <div className="tour-reveal-clip" style={{ width: `${slider}%` }}>
          <img className="tour-reveal-before" src={tour.beforeImage} alt="Before" />
        </div>
        <span className="tour-badge tour-badge-before">BEFORE</span>
        <span className="tour-badge tour-badge-after">AFTER</span>
        <div className="tour-reveal-handle" style={{ left: `${slider}%` }}>
          <span className="tour-reveal-knob">‹ ›</span>
        </div>
        <input
          className="tour-range"
          type="range"
          min={0}
          max={100}
          value={slider}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSlider(Number(e.target.value))}
          aria-label="Reveal slider"
        />
      </div>
      <div className="tour-reveal-caption">
        {projectLabel} · <span className="tour-reveal-cta">Drag the handle to compare</span>
      </div>
    </div>
  );
}

// ----- s6 Estimate ----------------------------------------------------------
export function Estimate({ tour }: { tour: ResolvedTour }) {
  const c = tour.customer;
  return (
    <div className="tour-step tour-step-estimate">
      <div className="tour-estimate-grid">
        <div className="tour-estimate-left">
          <img className="tour-estimate-img" src={tour.afterImage} alt="Rendered yard" />
          <div className="tour-chips">
            {tour.sampleOptions.map((option) => (
              <span key={option} className="tour-chip">
                {option}
              </span>
            ))}
          </div>
          <div className="tour-estimate-meta">
            Approx. area <strong>{tour.sampleArea}</strong>
          </div>
          <div className="tour-estimate-meta">
            {c.street}, {c.city}, {c.state} {c.zip}
          </div>
        </div>
        <div className="tour-estimate-card">
          <div className="tour-estimate-label">Preliminary AI range</div>
          <div className="tour-estimate-figure">{tour.estimateFigure}</div>
          <div className="tour-estimate-lines">
            {tour.lineItems.map((item) => (
              <div key={item.label} className="tour-estimate-line">
                <span>{item.label}</span>
                <span className="tour-estimate-line-value">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="tour-estimate-disclaimer">
            Ballpark range only. Final design, measurements and pricing require an onsite visit.
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- s7 Branded PDF -------------------------------------------------------
export function BrandedPdf({ client, tour }: { client: ClientConfig; tour: ResolvedTour }) {
  const c = tour.customer;
  return (
    <div className="tour-step tour-step-pdf">
      <div className="tour-pdf-grid">
        <div className="tour-pdf-doc">
          <div className="tour-pdf-header">
            <img className="tour-pdf-logo" src={client.logoPath} alt={client.companyName} />
            <div className="tour-pdf-headmeta">
              <div className="tour-pdf-title">{client.copy.pdfTitle}</div>
              <div className="tour-pdf-no">No. {tour.estimateNumber} · June 25, 2026</div>
            </div>
          </div>
          <div className="tour-pdf-cols">
            <div>
              <div className="tour-pdf-microlabel">Customer</div>
              <div className="tour-pdf-strong">
                {c.firstName} {c.lastName}
              </div>
              <div className="tour-pdf-line">
                {c.street}, {c.city}, {c.state} {c.zip}
              </div>
              <div className="tour-pdf-line">{c.phone}</div>
            </div>
            <div>
              <div className="tour-pdf-microlabel">Project type</div>
              <div className="tour-pdf-strong">{tour.sampleOptions.join(" & ")}</div>
            </div>
          </div>
          <div className="tour-pdf-thumbs">
            <img src={tour.beforeImage} alt="Before" />
            <img src={tour.afterImage} alt="After" />
          </div>
          <div className="tour-pdf-strip">
            <span className="tour-pdf-microlabel">Estimated range</span>
            <span className="tour-pdf-figure">{tour.estimateFigure}</span>
          </div>
        </div>
        <div className="tour-pdf-pitch">
          <h2 className="tour-h2">A branded PDF — instantly</h2>
          <p className="tour-sub">
            Auto-generated with your logo and details, then emailed to the customer the moment they
            finish.
          </p>
          <button type="button" className="tour-btn-primary tour-btn-block">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- s8 CRM ---------------------------------------------------------------
export function Crm({ client, tour }: { client: ClientConfig; tour: ResolvedTour }) {
  const c = tour.customer;
  const recordCount = tour.crmRows.length + 1;
  return (
    <div className="tour-crm">
      <div className="tour-crm-side">
        <div className="tour-crm-brand">
          <span className="tour-crm-mark">W</span>
          <span className="tour-crm-brandname">{client.brandName.split(" ")[0]} CRM</span>
        </div>
        <nav className="tour-crm-nav">
          <span className="tour-crm-navitem tour-crm-navitem-active">
            <span className="tour-crm-marker tour-crm-marker-on" />
            Leads
          </span>
          {["Deals", "Companies", "Reports"].map((item) => (
            <span key={item} className="tour-crm-navitem">
              <span className="tour-crm-marker" />
              {item}
            </span>
          ))}
        </nav>
      </div>
      <div className="tour-crm-main">
        <div className="tour-crm-toolbar">
          <div>
            <span className="tour-crm-title">Leads</span>
            <span className="tour-crm-records">{recordCount} records</span>
          </div>
          <div className="tour-crm-toolbar-right">
            <span className="tour-crm-search">Search…</span>
            <span className="tour-btn-primary tour-crm-newbtn">+ New lead</span>
          </div>
        </div>
        <div className="tour-crm-head">
          <span>Name</span>
          <span>Project type</span>
          <span>Stage</span>
          <span>Est. value</span>
          <span>Last contact</span>
          <span>Owner</span>
        </div>
        <div className="tour-crm-row tour-crm-row-new">
          <div className="tour-crm-name">
            <span className="tour-crm-avatar tour-crm-avatar-new">
              {initials(c.firstName, c.lastName)}
            </span>
            <div>
              <div className="tour-crm-personname">
                {c.firstName} {c.lastName} <span className="tour-crm-newbadge">NEW</span>
              </div>
              <div className="tour-crm-location">
                {c.city}, {c.state}
              </div>
            </div>
          </div>
          <span className="tour-crm-cell">{tour.sampleOptions.join(" · ")}</span>
          <span>
            <span className="tour-pill tour-pill-new">New</span>
          </span>
          <span className="tour-crm-value">{tour.estimateShort}</span>
          <span className="tour-crm-muted">Just now</span>
          <Owner initials="ML" name="Maria L." />
        </div>
        {tour.crmRows.map((row) => (
          <div className="tour-crm-row" key={row.name}>
            <div className="tour-crm-name">
              <span className="tour-crm-avatar">
                {row.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w.charAt(0))
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <div className="tour-crm-personname">{row.name}</div>
                <div className="tour-crm-location">{row.location}</div>
              </div>
            </div>
            <span className="tour-crm-cell">{row.projectType}</span>
            <span>
              <span className={`tour-pill ${STAGE_PILL_CLASS[row.stage]}`}>{row.stage}</span>
            </span>
            <span className="tour-crm-value">{row.estValue}</span>
            <span className="tour-crm-muted">{row.lastContact}</span>
            <Owner initials={row.ownerInitials} name={row.ownerName} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Owner({ initials: ini, name }: { initials: string; name: string }) {
  const variant = ini === "ML" ? "tour-crm-owner-green" : "tour-crm-owner-purple";
  return (
    <div className="tour-crm-owner">
      <span className={`tour-crm-owneravatar ${variant}`}>{ini}</span>
      <span className="tour-crm-cell">{name}</span>
    </div>
  );
}

// ----- s9 Recap -------------------------------------------------------------
export function Recap({ onRestart, liveUrl }: { onRestart: () => void; liveUrl: string }) {
  const cards = [
    { title: "Instant wow", body: "A real before/after render hooks visitors in seconds." },
    { title: "Real leads", body: "Qualified prospects with project detail — not tire-kickers." },
    { title: "Auto follow-up", body: "Branded PDF emailed, lead assigned to a rep instantly." },
  ];
  return (
    <div className="tour-overlay">
      <div className="tour-recap-card">
        <h1 className="tour-recap-h1">That's the entire experience</h1>
        <p className="tour-recap-sub">From a single photo to a CRM-ready lead — automatically.</p>
        <div className="tour-recap-grid">
          {cards.map((card) => (
            <div key={card.title} className="tour-recap-benefit">
              <div className="tour-recap-benefit-title">{card.title}</div>
              <div className="tour-recap-benefit-body">{card.body}</div>
            </div>
          ))}
        </div>
        <div className="tour-recap-actions">
          <button type="button" className="tour-btn-outline" onClick={onRestart}>
            Restart demo
          </button>
          <a className="tour-btn-primary tour-btn-link" href={liveUrl}>
            Try it with your own photos →
          </a>
          <button type="button" className="tour-btn-dark">
            Book a walkthrough
          </button>
        </div>
      </div>
    </div>
  );
}
