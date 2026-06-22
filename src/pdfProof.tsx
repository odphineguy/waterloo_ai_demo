// Dev-only QA tool — NOT part of the app funnel. Renders the real jsPDF estimate
// header for every client so PDF logo sizing/contrast can be eyeballed at a glance.
// Open at http://localhost:5173/pdf-proof.html (dev server only).
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { jsPDF as JsPDF } from "jspdf";
import { clients } from "./config/activeClient";
import type { ClientConfig } from "./types";

// --- helpers copied verbatim from App.tsx so the proof matches real PDF output ---
function loadImageForCanvas(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load estimate image."));
    image.src = src;
  });
}

async function imageUrlToPngDataUrl(src: string, maxDimension = 1000) {
  const image = await loadImageForCanvas(src);
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare estimate logo.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function addImageContain(
  doc: JsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
  format: "JPEG" | "PNG" = "JPEG",
) {
  const properties = doc.getImageProperties(dataUrl);
  const ratio = Math.min(width / properties.width, height / properties.height);
  const renderedWidth = properties.width * ratio;
  const renderedHeight = properties.height * ratio;
  doc.addImage(
    dataUrl,
    format,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
}

// --- header drawing mirrors App.tsx handleDownloadEstimate (lines ~291-329) ---
async function buildHeaderPdfUrl(client: ClientConfig): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const fullWidth = 612; // letter width in pt
  const headerHeight = 150; // just the header band
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [fullWidth, headerHeight],
  });
  const pageWidth = fullWidth;
  const margin = 46;
  const ink = "#171f1a";
  const darkGreen = client.colors.primaryDark;

  const logo = await imageUrlToPngDataUrl(client.logoPath, 900);

  doc.setFillColor("#ffffff");
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setTextColor(ink);
  doc.setFont("helvetica", "normal");
  const brandMaxWidth = 320;
  let brandFontSize = 28;
  doc.setFontSize(brandFontSize);
  while (brandFontSize > 17 && doc.getTextWidth(client.brandName) > brandMaxWidth) {
    brandFontSize -= 1;
    doc.setFontSize(brandFontSize);
  }
  doc.text(client.brandName, margin, 64, { maxWidth: brandMaxWidth });
  doc.setFontSize(18);
  doc.text(client.copy.pdfTitle, margin, 92, { maxWidth: brandMaxWidth });

  const pdfLogo = client.pdfLogo ?? {
    background: "none" as const,
    width: 145,
    height: 72,
  };
  const logoX = pageWidth - margin - pdfLogo.width;
  const logoY = 42;

  if (pdfLogo.background === "dark") {
    doc.setFillColor(darkGreen);
    doc.roundedRect(
      logoX - 12,
      logoY - 8,
      pdfLogo.width + 24,
      pdfLogo.height + 16,
      5,
      5,
      "F",
    );
  }

  addImageContain(doc, logo, logoX, logoY, pdfLogo.width, pdfLogo.height, "PNG");

  return doc.output("bloburl").toString();
}

// De-duplicate (the clients map points several keys at the same config object).
const entries = Object.values(clients).filter(
  (c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i,
);

function App() {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const client of entries) {
        try {
          const url = await buildHeaderPdfUrl(client);
          if (!cancelled) setUrls((prev) => ({ ...prev, [client.slug]: url }));
        } catch (err) {
          if (!cancelled)
            setErrors((prev) => ({
              ...prev,
              [client.slug]: (err as Error).message,
            }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 20 }}>PDF Logo Proof — estimate header for every client</h1>
      <p style={{ color: "#555", fontSize: 13 }}>
        Real jsPDF output (same code as the downloaded estimate). Check each logo's
        size, centering, and dark-plate contrast. Dev tool — not part of the app.
      </p>
      {entries.map((client) => {
        const dims = client.pdfLogo ?? { width: 145, height: 72, background: "none" };
        return (
          <section
            key={client.slug}
            style={{ margin: "22px 0", borderTop: "1px solid #e2e2e2", paddingTop: 14 }}
          >
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>{client.companyName}</strong>{" "}
              <span style={{ color: "#777" }}>
                /{client.slug} — pdfLogo {dims.width}×{dims.height}, background:{" "}
                {dims.background}
              </span>
            </div>
            {errors[client.slug] ? (
              <div style={{ color: "#b00", fontSize: 13 }}>
                ⚠️ {errors[client.slug]} (check logoPath: {client.logoPath})
              </div>
            ) : urls[client.slug] ? (
              <iframe
                title={client.slug}
                src={`${urls[client.slug]}#toolbar=0&navpanes=0&view=Fit`}
                style={{ width: 612, height: 150, border: "1px solid #ccc" }}
              />
            ) : (
              <div style={{ color: "#999", fontSize: 13 }}>rendering…</div>
            )}
          </section>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
