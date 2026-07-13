import type { StudioConfig } from "../types";

type PackageStepProps = {
  studio: StudioConfig;
  netSqft: number | null;
  selectedId: string | null;
  onSelect: (packageId: string) => void;
  onContinue: () => void;
};

export function PackageStep({
  studio,
  netSqft,
  selectedId,
  onSelect,
  onContinue,
}: PackageStepProps) {
  return (
    <div className="studio-screen studio-package-screen">
      <div className="studio-package-inner">
        <div className="studio-package-header">
          <div className="studio-sqft-badge">
            {netSqft != null && netSqft > 0 ? (
              <>
                <b>{netSqft.toLocaleString("en-US")}</b> SQFT measured
              </>
            ) : (
              <>Yard size confirmed at your free on-site measure</>
            )}
          </div>
          <h2 className="studio-package-h2">Choose your design package</h2>
        </div>

        <div className="studio-package-grid">
          {studio.packages.map((pkg) => {
            const selected = pkg.id === selectedId;
            return (
              <button
                key={pkg.id}
                type="button"
                className={`studio-package-card${selected ? " studio-package-card--selected" : ""}`}
                onClick={() => onSelect(pkg.id)}
              >
                <div className="studio-package-card-head">
                  <span className="studio-package-name">{pkg.name}</span>
                  <span className="studio-package-count">
                    {pkg.items.length} {pkg.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <p className="studio-package-desc">{pkg.description}</p>
                {selected && (
                  <>
                    <div className="studio-package-chips">
                      {pkg.items.map((item) => (
                        <span key={item} className="studio-chip">
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="studio-package-selected-line">✓ Selected</div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="studio-package-cta-row">
          <button
            type="button"
            className="studio-big-cta"
            disabled={!selectedId}
            onClick={onContinue}
          >
            Choose Your Style →
          </button>
        </div>
      </div>
    </div>
  );
}
