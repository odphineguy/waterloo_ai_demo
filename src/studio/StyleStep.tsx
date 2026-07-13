import type { ChangeEvent } from "react";
import type { StudioConfig, UploadedImage } from "../types";

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

const MAX_PHOTOS = 4;

type StyleStepProps = {
  studio: StudioConfig;
  packageId: string | null;
  designStyle: string;
  puttingSize: string;
  paverStyle: string;
  photos: UploadedImage[];
  onDesignStyle: (id: string) => void;
  onPuttingSize: (id: string) => void;
  onPaverStyle: (id: string) => void;
  onPhotos: (photos: UploadedImage[]) => void;
  onGenerate: () => void;
};

export function StyleStep({
  studio,
  packageId,
  designStyle,
  puttingSize,
  paverStyle,
  photos,
  onDesignStyle,
  onPuttingSize,
  onPaverStyle,
  onPhotos,
  onGenerate,
}: StyleStepProps) {
  const selectedPackage = studio.packages.find((pkg) => pkg.id === packageId);
  const showPutting = !!selectedPackage?.hasPuttingGreen;

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const next = [...photos];
    for (const file of files) {
      if (next.length >= MAX_PHOTOS) break;
      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    onPhotos(next);
    event.target.value = "";
  }

  return (
    <div className="studio-screen studio-style-screen">
      <div className="studio-style-inner">
        <h2 className="studio-style-h2">Dial in your look</h2>
        <p className="studio-style-helper">
          Fine-tune the render. Everything here is optional.
        </p>

        <div className="studio-style-section">
          <div className="studio-section-label">Design style</div>
          <div className="studio-tile-grid">
            {studio.designStyles.map((id) => {
              const meta = STYLE_META[id];
              const selected = id === designStyle;
              return (
                <button
                  key={id}
                  type="button"
                  className={`studio-style-tile${selected ? " studio-style-tile--selected" : ""}`}
                  onClick={() => onDesignStyle(id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={selected ? "var(--st-primary)" : "#8a938a"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={meta.icon} />
                  </svg>
                  <span className="studio-style-tile-name">{meta.name}</span>
                  <span className="studio-style-tile-desc">{meta.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showPutting && (
          <div className="studio-style-section studio-style-section--reveal">
            <div className="studio-section-label">Putting green size</div>
            <div className="studio-tile-grid">
              {studio.puttingGreenSizes.map((size) => {
                const selected = size.id === puttingSize;
                return (
                  <button
                    key={size.id}
                    type="button"
                    className={`studio-putting-tile${selected ? " studio-putting-tile--selected" : ""}`}
                    onClick={() => onPuttingSize(size.id)}
                  >
                    <span className="studio-style-tile-name">{size.label}</span>
                    <span className="studio-style-tile-desc">{size.holes}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="studio-style-section">
          <div className="studio-section-label">Paver style</div>
          <div className="studio-paver-grid">
            {studio.paverStyles.map((paver) => {
              const selected = paver.id === paverStyle;
              return (
                <button
                  key={paver.id}
                  type="button"
                  className={`studio-paver-tile${selected ? " studio-paver-tile--selected" : ""}`}
                  onClick={() => onPaverStyle(paver.id)}
                >
                  <div
                    className="studio-paver-swatch"
                    style={{ backgroundImage: `url("${paver.swatchPath}")` }}
                  />
                  <span className="studio-paver-name">{paver.label}</span>
                  {selected && <div className="studio-paver-check">✓</div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="studio-style-section" style={{ marginBottom: 34 }}>
          <div className="studio-section-label">
            Add a photo of your yard{" "}
            <span className="studio-section-label-note">
              — optional, improves the render
            </span>
          </div>
          <label className="studio-photo-drop">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--st-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 30, height: 30 }}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="studio-photo-drop-label">
              {photos.length === 0
                ? "Drop a photo or tap to browse"
                : photos.length === 1
                  ? `✓ ${photos[0].file.name}`
                  : `✓ ${photos.length} photos added`}
            </span>
            <span className="studio-photo-drop-note">
              JPG or PNG · up to {MAX_PHOTOS} · skippable
            </span>
            <input type="file" accept="image/*" multiple onChange={handleFiles} />
          </label>
        </div>

        <div className="studio-style-cta-row">
          <button type="button" className="studio-cta-gold" onClick={onGenerate}>
            Generate My Design →
          </button>
        </div>
      </div>
    </div>
  );
}
