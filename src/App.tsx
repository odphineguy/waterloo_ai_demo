import {
  Download,
  Loader2,
  X,
} from "lucide-react";
import type { jsPDF as JsPDF } from "jspdf";
import { CSSProperties, useMemo, useState } from "react";
import { getActiveClient } from "./config/activeClient";
import { GuidedTour } from "./tour/GuidedTour";
import { generateYardPreview } from "./services/imageGeneration";
import {
  ClientConfig,
  ContactInfo,
  LeadPacket,
  PreviewStatus,
  ProjectOption,
  UploadedImage,
  YardPreviewResult,
} from "./types";
import { calculateBudgetRange } from "./utils/estimate";
import { createLeadPacket } from "./utils/leadPacket";

const emptyContact: ContactInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
};

const fieldLabels: Record<keyof ContactInfo, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  streetAddress: "Street address",
  city: "City",
  state: "State",
  zipCode: "Zip code",
};

type ExpandedImage = {
  src: string;
  alt: string;
};

function loadImageForCanvas(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load estimate image."));
    image.src = src;
  });
}

async function imageUrlToJpegDataUrl(src: string, maxDimension = 1000) {
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
    throw new Error("Unable to prepare estimate image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.88);
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

// Draws a rounded green badge with a simple white vector glyph (phone /
// envelope / globe) for the PDF footer contact rows, matching the reference.
function drawContactBadge(
  doc: JsPDF,
  kind: "phone" | "email" | "web",
  x: number,
  y: number,
  size: number,
  bg: string,
) {
  doc.setFillColor(bg);
  doc.roundedRect(x, y, size, size, 3, 3, "F");
  doc.setDrawColor("#ffffff");
  doc.setFillColor("#ffffff");
  doc.setLineWidth(0.9);
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (kind === "phone") {
    // Mobile handset: rounded body with a speaker dot near the bottom.
    doc.roundedRect(cx - 2.4, cy - 4, 4.8, 8, 1, 1, "S");
    doc.circle(cx, cy + 2.4, 0.5, "F");
  } else if (kind === "email") {
    // Envelope: body rectangle plus the V-shaped flap.
    doc.rect(cx - 4, cy - 2.6, 8, 5.2, "S");
    doc.lines([[4, 3], [4, -3]], cx - 4, cy - 2.6, [1, 1], "S");
  } else {
    // Globe: outer circle, meridian ellipse, equator line.
    doc.circle(cx, cy, 4, "S");
    doc.ellipse(cx, cy, 1.7, 4, "S");
    doc.line(cx - 4, cy, cx + 4, cy);
  }
}

// Like addImageContain, but scales the image to *fill* the box (cropping the
// overflow) so the frame is edge-to-edge with no letterbox bars, matching the
// large before/after look of the reference estimate.
function addImageCover(
  doc: JsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
  format: "JPEG" | "PNG" = "JPEG",
) {
  const properties = doc.getImageProperties(dataUrl);
  const ratio = Math.max(width / properties.width, height / properties.height);
  const renderedWidth = properties.width * ratio;
  const renderedHeight = properties.height * ratio;

  doc.saveGraphicsState();
  // rect with a null style is added to the path but not painted, then used as
  // the clip region so the oversized image is cropped to the box.
  doc.rect(x, y, width, height, null).clip().discardPath();
  doc.addImage(
    dataUrl,
    format,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
  doc.restoreGraphicsState();
}

function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function getEstimateNumber(prefix: string, value = new Date()) {
  const datePart = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("");
  return `${prefix}-${datePart}`;
}

function safeFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// The guided product tour lives at /<slug>/demo (additive — the real funnel
// stays at /<slug>). getActiveClient already reads only the first path segment,
// so we just detect "demo" as the second segment here.
function isTourPath(pathname = window.location.pathname) {
  return pathname.split("/").filter(Boolean)[1] === "demo";
}

function App() {
  if (isTourPath()) {
    return <GuidedTour client={getActiveClient()} />;
  }
  return <Funnel />;
}

function Funnel() {
  const client = useMemo(() => getActiveClient(), []);
  const [contact, setContact] = useState<ContactInfo>(emptyContact);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [notes, setNotes] = useState("");
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [preview, setPreview] = useState<YardPreviewResult | null>(null);
  const [leadPacket, setLeadPacket] = useState<LeadPacket | null>(null);
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const missingContactFields = useMemo(
    () =>
      (Object.keys(contact) as Array<keyof ContactInfo>).filter(
        (key) => !contact[key].trim(),
      ),
    [contact],
  );

  const budgetRange = useMemo(
    () => calculateBudgetRange(projectOptions, client.estimateRanges),
    [client.estimateRanges, projectOptions],
  );

  const canGeneratePreview =
    missingContactFields.length === 0 &&
    projectOptions.length > 0 &&
    previewStatus !== "generating";

  function updateContact(key: keyof ContactInfo, value: string) {
    setContact((current) => ({ ...current, [key]: value }));
  }

  function toggleProjectOption(option: ProjectOption) {
    setProjectOptions((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  function handleImageUpload(files: FileList | null) {
    if (!files) return;

    const remainingSlots = 4 - images.length;
    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots);

    const nextImages = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...nextImages]);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function getValidationMessages() {
    const messages: string[] = [];
    if (missingContactFields.length > 0) {
      messages.push(
        `Please add ${missingContactFields
          .map((field) => fieldLabels[field].toLowerCase())
          .join(", ")}.`,
      );
    }
    if (projectOptions.length === 0) {
      messages.push("Choose at least one turf project option.");
    }
    return messages;
  }

  async function handleGeneratePreview() {
    const messages = getValidationMessages();
    setValidationMessages(messages);
    if (messages.length > 0) return;

    setPreviewStatus("generating");
    setPreview(null);
    setLeadPacket(null);

    try {
      const result = await generateYardPreview({
        client,
        projectOptions,
        notes,
        uploadedImages: images,
      });
      setPreview(result);
      setPreviewStatus("ready");
      setLeadPacket(
        createLeadPacket({
          contact,
          projectOptions,
          notes,
          photoCount: images.length,
          preview: result,
          budgetRange,
        }),
      );
    } catch (error) {
      setPreviewStatus("idle");
      setValidationMessages([
        error instanceof Error
          ? error.message
          : "Unable to generate the AI yard preview. Please try again.",
      ]);
    }
  }

  async function handleDownloadEstimate() {
    if (!preview) return;

    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 46;
      const green = client.colors.primary;
      const darkGreen = client.colors.primaryDark;
      const ink = "#171f1a";
      const muted = "#4f5b53";
      const line = "#d7e0d8";
      const clientName = `${contact.firstName} ${contact.lastName}`.trim();
      const propertyAddress = `${contact.streetAddress}, ${contact.city}, ${contact.state} ${contact.zipCode}`;
      const logo = await imageUrlToPngDataUrl(client.logoPath, 900);
      const beforeImages = await Promise.all(
        images.map((image) => imageUrlToJpegDataUrl(image.previewUrl)),
      );
      const afterImages = await Promise.all(
        preview.imageUrls.map((imageUrl) => imageUrlToJpegDataUrl(imageUrl)),
      );

      doc.setFillColor("#ffffff");
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setTextColor(ink);
      doc.setFont("helvetica", "normal");
      // Shrink the brand name to fit one line so long names (e.g. "ARIZONA
      // ARTIFICIAL LAWNS") don't wrap and collide with the title below it.
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

      addImageContain(
        doc,
        logo,
        logoX,
        logoY,
        pdfLogo.width,
        pdfLogo.height,
        "PNG",
      );

      doc.setFontSize(9);
      doc.setTextColor(muted);
      doc.text("Estimate Number", margin, 142);
      doc.text("Estimate Date", margin, 178);
      doc.setTextColor(ink);
      doc.setFontSize(10);
      doc.text(getEstimateNumber(client.estimatePrefix), margin, 158);
      doc.text(formatDate(), margin, 194);

      const infoX = pageWidth - margin - 210;
      doc.setFontSize(9);
      doc.setTextColor(muted);
      doc.text("Customer Information", infoX, 142);
      doc.setTextColor(ink);
      doc.setFontSize(10);
      doc.text(clientName || "Client", infoX, 160);
      doc.text(propertyAddress, infoX, 178, { maxWidth: 210 });
      doc.text(contact.phone || contact.email || "Contact pending", infoX, 210, {
        maxWidth: 210,
      });

      let y = 242;
      doc.setFillColor(green);
      doc.rect(margin, y, pageWidth - margin * 2, 34, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#ffffff");
      doc.text("Visual Preview", margin + 10, y + 21);
      doc.text("Project Type", pageWidth - margin - 230, y + 21);
      doc.text(projectOptions.join(", ") || client.serviceLabel, pageWidth - margin - 150, y + 21, {
        maxWidth: 140,
      });

      y += 54;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkGreen);
      doc.text("Before Image(s)", margin, y);
      doc.text("After Image(s)", pageWidth / 2 + 10, y);

      const imageWidth = (pageWidth - margin * 2 - 20) / 2;
      const imageHeight = 172;
      y += 12;
      const pairCount = Math.max(beforeImages.length, afterImages.length);

      for (let index = 0; index < pairCount; index += 1) {
        if (y + imageHeight > pageHeight - 220) {
          doc.addPage();
          y = 56;
        }

        doc.setFillColor("#f7f9f5");
        doc.setDrawColor(line);
        doc.roundedRect(margin, y, imageWidth, imageHeight, 3, 3, "FD");
        doc.roundedRect(pageWidth / 2 + 10, y, imageWidth, imageHeight, 3, 3, "FD");

        if (beforeImages[index]) {
          addImageCover(
            doc,
            beforeImages[index],
            margin + 5,
            y + 5,
            imageWidth - 10,
            imageHeight - 10,
          );
        }
        if (afterImages[index]) {
          addImageCover(
            doc,
            afterImages[index],
            pageWidth / 2 + 15,
            y + 5,
            imageWidth - 10,
            imageHeight - 10,
          );
        }

        y += imageHeight + 14;
      }

      if (y + 178 > pageHeight - margin) {
        doc.addPage();
        y = 56;
      }

      y += 18;
      const termsX = margin;
      const totalX = pageWidth - margin - 205;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(ink);
      doc.text("Project Notes & Terms", termsX, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(ink);
      [
        "This estimate is a preliminary AI visual range.",
        "Final design, measurements, and pricing require onsite verification.",
        "Project scope may change based on drainage, access, and material needs.",
      ].forEach((term, index) => {
        doc.text(`- ${term}`, termsX + 8, y + 32 + index * 15, {
          maxWidth: totalX - termsX - 24,
        });
      });

      doc.setFillColor(green);
      doc.rect(totalX, y, 205, 58, "F");
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Estimated Project Range", totalX + 16, y + 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(budgetRange.label, totalX + 102.5, y + 44, {
        align: "center",
        maxWidth: 174,
      });

      y += 102;
      doc.setDrawColor(green);
      doc.setLineWidth(1.2);
      doc.line(margin, y, pageWidth - margin, y);

      y += 34;
      doc.setTextColor(ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(client.copy.pdfThanks, margin, y);
      doc.text(client.companyName, margin, y + 34);
      doc.text(client.copy.specialistLabel, margin, y + 49);

      const footerX = pageWidth - margin - 210;
      const badgeSize = 14;
      const contactRows: Array<["phone" | "email" | "web", string]> = [
        ["phone", client.phone],
        ["email", client.email],
        ["web", client.website.replace(/^https?:\/\//, "").replace(/\/$/, "")],
      ];
      contactRows.forEach(([kind, value], index) => {
        const rowY = y + index * 20;
        drawContactBadge(doc, kind, footerX, rowY - 10, badgeSize, green);
        doc.setTextColor(ink);
        doc.setFontSize(9);
        doc.text(value, footerX + badgeSize + 8, rowY);
      });

      doc.save(
        `${safeFilename(client.companyName) || "visual"}-estimate-${
          safeFilename(clientName) || "client"
        }.pdf`,
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <main
      className={`app-shell client-${client.slug}`}
      style={
        {
          "--green-900": client.colors.primaryDark,
          "--green-800": client.colors.primaryDark,
          "--green-700": client.colors.primary,
          "--green-100": client.colors.primarySoft,
          "--gold": client.colors.accent,
          "--gold-dark": client.colors.accentDark,
          "--footer-image": `url("${client.footerImagePath}")`,
        } as CSSProperties
      }
    >
      <SiteHeader client={client} />

      <section className="estimate-layout" id="estimate">
        <div className="form-panel">
          <h1 className="page-title">
            {client.copy.pageTitle}
          </h1>

          {validationMessages.length > 0 && (
            <div className="validation-card" role="alert">
              {validationMessages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <form
            id="estimate-request-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <ContactForm client={client} contact={contact} onChange={updateContact} />
            <ProjectOptions
              client={client}
              selectedOptions={projectOptions}
              onToggle={toggleProjectOption}
            />
            <PhotoUpload
              images={images}
              onUpload={handleImageUpload}
              onRemove={removeImage}
            />
            <section className="card">
              <label htmlFor="notes" className="section-title">
                Optional notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={client.copy.notesPlaceholder}
              />
            </section>
            <button
              type="button"
              className="generate-button single-action"
              disabled={!canGeneratePreview}
              onClick={handleGeneratePreview}
            >
              {previewStatus === "generating" ? (
                <Loader2 className="spin" size={19} />
              ) : null}
              {client.copy.generateButton}
            </button>
          </form>
        </div>

        <aside className="results-panel">
          {(preview || previewStatus === "generating") && (
            <AiPreviewSection
              preview={preview}
              status={previewStatus}
              onExpand={setExpandedImage}
            />
          )}
          {preview && (
            <BudgetCard
              client={client}
              label={budgetRange.label}
              requiresReview={budgetRange.kind === "review"}
            />
          )}
          {preview && (
            <EstimateDownloadCard
              isDownloading={isDownloadingPdf}
              onDownload={handleDownloadEstimate}
            />
          )}
          {leadPacket && <NextStepsCard client={client} requestReceived />}
        </aside>
      </section>
      {expandedImage && (
        <ImageLightbox
          image={expandedImage}
          onClose={() => setExpandedImage(null)}
        />
      )}
      <SiteFooter client={client} />
    </main>
  );
}

function SiteHeader({ client }: { client: ClientConfig }) {
  const phoneHref = `tel:${client.phone.replace(/[^\d+]/g, "")}`;
  return (
    <header className="site-header">
      <a className="site-logo-link" href={client.website}>
        <img src={client.logoPath} alt={client.companyName} className="site-logo" />
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        {client.navLinks.map((link) => (
          <a key={link} href="#">
            {link}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <a className="call-cta" href={phoneHref}>
          Call Now
        </a>
        <a className="header-cta" href="#estimate">
          Get a Free Estimate
        </a>
      </div>
    </header>
  );
}

function ContactForm({
  client,
  contact,
  onChange,
}: {
  client: ClientConfig;
  contact: ContactInfo;
  onChange: (key: keyof ContactInfo, value: string) => void;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>Contact and property</h2>
          <p>{client.copy.contactPrompt}</p>
        </div>
      </div>
      <div className="field-grid">
        {(Object.keys(contact) as Array<keyof ContactInfo>).map((key) => (
          <label key={key} className={key === "streetAddress" ? "wide" : ""}>
            <span>{fieldLabels[key]}</span>
            <input
              value={contact[key]}
              onChange={(event) => onChange(key, event.target.value)}
              type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
              autoComplete={key}
              placeholder={fieldLabels[key]}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function ProjectOptions({
  client,
  selectedOptions,
  onToggle,
}: {
  client: ClientConfig;
  selectedOptions: ProjectOption[];
  onToggle: (option: ProjectOption) => void;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>Project options</h2>
          <p>
            Select at least one option. <span className="required-text">(Required)</span>
          </p>
        </div>
      </div>
      <div className="option-grid">
        {client.projectOptions.map((option) => (
          <label
            key={option}
            className={
              selectedOptions.includes(option) ? "option selected" : "option"
            }
          >
            <input
              type="checkbox"
              checked={selectedOptions.includes(option)}
              onChange={() => onToggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function PhotoUpload({
  images,
  onUpload,
  onRemove,
}: {
  images: UploadedImage[];
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>Yard photos</h2>
          <p>Optional: upload 1-4 photos to help prepare the concept preview.</p>
        </div>
      </div>
      <label className={images.length >= 4 ? "upload-zone disabled" : "upload-zone"}>
        <span>{images.length >= 4 ? "Photo limit reached" : "Choose yard photos"}</span>
        <small>{images.length}/4 uploaded</small>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={images.length >= 4}
          onChange={(event) => onUpload(event.target.files)}
        />
      </label>
      {images.length > 0 && (
        <div className="thumbnail-grid">
          {images.map((image) => (
            <div className="thumbnail" key={image.id}>
              <img src={image.previewUrl} alt={image.file.name} />
              <button type="button" onClick={() => onRemove(image.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AiPreviewSection({
  preview,
  status,
  onExpand,
}: {
  preview: YardPreviewResult | null;
  status: PreviewStatus;
  onExpand: (image: ExpandedImage) => void;
}) {
  return (
    <section className="result-card preview-card">
      <div className="result-heading">
        <div>
          <h2>Your Yard Preview</h2>
          <p>
            {preview
              ? `${preview.imageUrls.length} preview${
                  preview.imageUrls.length === 1 ? "" : "s"
                } ready`
              : "Waiting for yard photos"}
          </p>
        </div>
      </div>
      <div
        className={
          preview && preview.imageUrls.length > 1
            ? "preview-list preview-grid"
            : "preview-list"
        }
      >
        {status === "generating" && (
          <div className="preview-empty">
            <Loader2 className="spin" size={30} />
            <span>Creating preview...</span>
          </div>
        )}
        {status !== "generating" && preview && (
          preview.imageUrls.map((imageUrl, index) => (
            <button
              className="preview-frame preview-image-button"
              key={`${preview.id}-${index}`}
              type="button"
              onClick={() =>
                onExpand({
                  src: imageUrl,
                  alt: `AI yard concept preview ${index + 1}`,
                })
              }
            >
              <img
                src={imageUrl}
                alt={`AI yard concept preview ${index + 1}`}
              />
            </button>
          ))
        )}
        {status === "idle" && !preview && (
          <div className="preview-empty">
            <span>Your concept preview will appear here.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function EstimateDownloadCard({
  isDownloading,
  onDownload,
}: {
  isDownloading: boolean;
  onDownload: () => void;
}) {
  return (
    <section className="result-card download-card">
      <div>
        <h2>Client Estimate PDF</h2>
        <p>Download a branded before-and-after visual estimate.</p>
      </div>
      <button
        className="download-button"
        type="button"
        disabled={isDownloading}
        onClick={onDownload}
      >
        {isDownloading ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
        {isDownloading ? "Preparing PDF" : "Download PDF"}
      </button>
    </section>
  );
}

function ImageLightbox({
  image,
  onClose,
}: {
  image: ExpandedImage;
  onClose: () => void;
}) {
  return (
    <div className="lightbox" role="dialog" aria-modal="true">
      <button
        className="lightbox-backdrop"
        type="button"
        aria-label="Close expanded preview"
        onClick={onClose}
      />
      <div className="lightbox-content">
        <button
          className="lightbox-close"
          type="button"
          aria-label="Close expanded preview"
          onClick={onClose}
        >
          <X size={22} />
        </button>
        <img src={image.src} alt={image.alt} />
      </div>
    </div>
  );
}

function BudgetCard({
  client,
  label,
  requiresReview,
}: {
  client: ClientConfig;
  label: string;
  requiresReview: boolean;
}) {
  return (
    <section className="result-card budget-card">
      <span>Preliminary budget range</span>
      <strong>{label}</strong>
      <p>
        {requiresReview
          ? client.copy.reviewRequired
          : "This is a preliminary visual estimate only. Final design, measurements, and pricing are subject to onsite verification."}
      </p>
    </section>
  );
}

function NextStepsCard({
  client,
  requestReceived,
}: {
  client: ClientConfig;
  requestReceived: boolean;
}) {
  return (
    <section className="result-card next-card">
      <div className="result-heading">
        <div>
          <h2>{requestReceived ? "Request received" : "What happens next"}</h2>
          <p>
            {requestReceived
              ? "Your yard preview request has been submitted."
              : "A simple review process after you send your request."}
          </p>
        </div>
      </div>
      {requestReceived ? (
        <div className="received-message">
          Your yard preview request has been submitted. A {client.companyName} specialist
          will review your photos, selected project options, and property details.
        </div>
      ) : (
        <ol className="next-list">
          {client.copy.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SiteFooter({ client }: { client: ClientConfig }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={client.logoPath} alt={client.companyName} />
          <div className="social-row" aria-label="Social links">
            {["f", "▶", "◎", "✣", "G"].map((item) => (
              <a href="#" key={item}>
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-column">
          <h2>Quick Links</h2>
          <div className="footer-link-grid">
            {client.quickLinks.map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-column">
          <h2>Services</h2>
          <div className="footer-link-grid services-grid">
            {client.services.map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>{client.legalName}</p>
        <p>
          Copyright © 2026 {client.companyName}. <a href="#">Privacy Policy</a> |{" "}
          <a href="#">Terms & Conditions</a> | Powered by <a href="#">ClickTecs</a>
        </p>
      </div>
    </footer>
  );
}

export default App;
