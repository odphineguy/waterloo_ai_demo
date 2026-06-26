import type { CSSProperties } from "react";

type CoachEntry = {
  title: string;
  body: string;
  pos: CSSProperties;
};

// Per-step tooltip copy + anchor position. Anchors are hand-tuned to never
// cover the active figure/badges/amounts on each screen.
const center: CSSProperties = { left: "50%", transform: "translateX(-50%)" };

export const COACH: Record<number, CoachEntry> = {
  1: {
    title: "Start with a few details",
    body: "Your customer enters their info once — name and property address. No long forms, no friction.",
    pos: { top: "78px", right: "40px" },
  },
  2: {
    title: "Pick the project",
    body: "They tap what they want — turf, pavers and more. Each tap shapes the render and the price.",
    pos: { bottom: "24px", ...center },
  },
  3: {
    title: "Just one photo",
    body: "They drop in a photo of their yard — or try a sample. That's everything the AI needs.",
    pos: { bottom: "24px", ...center },
  },
  4: {
    title: "AI goes to work",
    body: "In seconds, the AI redesigns the space with exactly the products they picked.",
    pos: { top: "40px", right: "40px" },
  },
  5: {
    title: "The wow moment",
    body: "Drag to reveal the transformation. This is what turns a curious visitor into a booked lead.",
    pos: { top: "20px", ...center },
  },
  6: {
    title: "Instant ballpark estimate",
    body: "A realistic range appears immediately — enough to build confidence, framed as a preliminary AI estimate.",
    pos: { bottom: "24px", ...center },
  },
  7: {
    title: "A branded PDF, automatically",
    body: "A polished estimate PDF is generated and emailed — with your logo and details, not ours.",
    pos: { bottom: "24px", right: "40px" },
  },
  8: {
    title: "It lands in your CRM",
    body: "Every preview becomes a real lead — project type, deal stage and estimated value — dropped into your pipeline for a rep to work.",
    pos: { bottom: "22px", right: "40px" },
  },
};

type CoachmarkProps = {
  step: number;
  onNext: () => void;
  onBack: () => void;
};

export function Coachmark({ step, onNext, onBack }: CoachmarkProps) {
  const entry = COACH[step];
  if (!entry) return null;

  const nextLabel = step === 8 ? "Finish" : step === 4 ? "Skip" : "Next";

  return (
    <div className="tour-coach" style={{ position: "absolute", zIndex: 40, ...entry.pos }}>
      <div className="tour-coach-card">
        <div className="tour-coach-title">{entry.title}</div>
        <div className="tour-coach-body">{entry.body}</div>
        <div className="tour-coach-footer">
          <span className="tour-coach-count">{step} / 8</span>
          <div className="tour-coach-actions">
            {step > 1 && (
              <button type="button" className="tour-coach-back" onClick={onBack}>
                Back
              </button>
            )}
            <button type="button" className="tour-coach-next" onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
