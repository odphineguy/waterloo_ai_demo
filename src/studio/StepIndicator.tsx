// Slim 01–05 step indicator (recreated from StepIndicator.dc.html).
// Past steps = filled green with ✓; current = bright green glow; future = muted.
// Package + Style merged into one editor step, so the flow is 5 steps.

const STEPS: [string, string][] = [
  ["01", "Address"],
  ["02", "Measure"],
  ["03", "Package"],
  ["04", "Details"],
  ["05", "Design"],
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="studio-stepper">
      {STEPS.map(([badge, name], index) => {
        const n = index + 1;
        const status =
          n < current ? "done" : n === current ? "current" : "future";
        return (
          <div key={badge} className={`studio-step studio-step--${status}`}>
            <div className="studio-step-dot">{status === "done" ? "✓" : badge}</div>
            <div className="studio-step-label">{name}</div>
          </div>
        );
      })}
    </div>
  );
}
