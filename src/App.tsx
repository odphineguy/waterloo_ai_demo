import {
  Download,
  Loader2,
  X,
} from "lucide-react";
import type { jsPDF as JsPDF } from "jspdf";
import { useMemo, useState } from "react";
import { generateYardPreview } from "./services/imageGeneration";
import {
  ContactInfo,
  LeadPacket,
  PreviewStatus,
  PROJECT_OPTIONS,
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

function addImageContain(
  doc: JsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const properties = doc.getImageProperties(dataUrl);
  const ratio = Math.min(width / properties.width, height / properties.height);
  const renderedWidth = properties.width * ratio;
  const renderedHeight = properties.height * ratio;

  doc.addImage(
    dataUrl,
    "JPEG",
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
}

function safeFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function App() {
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
    () => calculateBudgetRange(projectOptions),
    [projectOptions],
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
    const result = await generateYardPreview({
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
  }

  async function handleDownloadEstimate() {
    if (!preview) return;

    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 42;
      const clientName = `${contact.firstName} ${contact.lastName}`.trim();
      const propertyAddress = `${contact.streetAddress}, ${contact.city}, ${contact.state} ${contact.zipCode}`;
      const logo = await imageUrlToJpegDataUrl("/images/logo.png", 500);
      const beforeImages = await Promise.all(
        images.map((image) => imageUrlToJpegDataUrl(image.previewUrl)),
      );
      const afterImages = await Promise.all(
        preview.imageUrls.map((imageUrl) => imageUrlToJpegDataUrl(imageUrl)),
      );

      addImageContain(doc, logo, margin, 28, 122, 62);
      doc.setTextColor("#183820");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("Waterloo Turf AI Visual Estimate", margin, 122);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor("#38453b");
      doc.text(`Prepared for: ${clientName || "Client"}`, margin, 150);
      doc.text(`Property: ${propertyAddress}`, margin, 170, {
        maxWidth: pageWidth - margin * 2,
      });

      doc.setDrawColor("#d5ddd1");
      doc.line(margin, 194, pageWidth - margin, 194);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor("#183820");
      doc.text("Before", margin, 224);
      doc.text("After", pageWidth / 2 + 10, 224);

      const imageWidth = (pageWidth - margin * 2 - 20) / 2;
      const imageHeight = 132;
      let y = 238;
      const pairCount = Math.max(beforeImages.length, afterImages.length);

      for (let index = 0; index < pairCount; index += 1) {
        if (y + imageHeight > pageHeight - 150) {
          doc.addPage();
          y = margin;
        }

        doc.setFillColor("#f7f9f4");
        doc.roundedRect(margin, y, imageWidth, imageHeight, 4, 4, "F");
        doc.roundedRect(pageWidth / 2 + 10, y, imageWidth, imageHeight, 4, 4, "F");

        if (beforeImages[index]) {
          addImageContain(doc, beforeImages[index], margin, y, imageWidth, imageHeight);
        }
        if (afterImages[index]) {
          addImageContain(doc, afterImages[index], pageWidth / 2 + 10, y, imageWidth, imageHeight);
        }

        y += imageHeight + 18;
      }

      if (y + 110 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setFillColor("#183820");
      doc.roundedRect(margin, y + 8, pageWidth - margin * 2, 96, 6, 6, "F");
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Estimated Project Range", margin + 18, y + 36);
      doc.setFontSize(28);
      doc.text(`${budgetRange.label}*`, margin + 18, y + 70);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        "*Preliminary visual estimate only. Final design, measurements, and pricing are subject to onsite verification.",
        margin + 18,
        y + 91,
        { maxWidth: pageWidth - margin * 2 - 36 },
      );

      doc.save(
        `waterloo-turf-estimate-${safeFilename(clientName) || "client"}.pdf`,
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <main className="app-shell">
      <SiteHeader />

      <section className="estimate-layout" id="estimate">
        <div className="form-panel">
          <h1 className="page-title">
            Fill Out The Form Below To Schedule Your Free Onsite Estimate
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
            <ContactForm contact={contact} onChange={updateContact} />
            <ProjectOptions
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
                placeholder="Tell us anything helpful about access, timing, slope, drainage, or the look you want."
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
              Generate AI Yard Preview
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
          {leadPacket && <NextStepsCard requestReceived />}
        </aside>
      </section>
      {expandedImage && (
        <ImageLightbox
          image={expandedImage}
          onClose={() => setExpandedImage(null)}
        />
      )}
      <SiteFooter />
    </main>
  );
}

function SiteHeader() {
  const links = [
    "About Us",
    "Services",
    "Gallery",
    "Blog",
    "Merch",
    "Own a Franchise",
  ];

  return (
    <header className="site-header">
      <a className="site-logo-link" href="https://waterlooturf.com/">
        <img src="/images/logo.png" alt="Waterloo Turf" className="site-logo" />
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        {links.map((link) => (
          <a key={link} href="#">
            {link}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <a className="call-cta" href="tel:+15126079335">
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
  contact,
  onChange,
}: {
  contact: ContactInfo;
  onChange: (key: keyof ContactInfo, value: string) => void;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>Contact and property</h2>
          <p>Where should Waterloo Turf prepare this preview?</p>
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
  selectedOptions,
  onToggle,
}: {
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
        {PROJECT_OPTIONS.map((option) => (
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
  label,
  requiresReview,
}: {
  label: string;
  requiresReview: boolean;
}) {
  return (
    <section className="result-card budget-card">
      <span>Preliminary budget range</span>
      <strong>{label}</strong>
      <p>
        {requiresReview
          ? "This selection needs a Waterloo Turf review before a range is shown."
          : "This is a preliminary visual estimate only. Final design, measurements, and pricing are subject to onsite verification."}
      </p>
    </section>
  );
}

function NextStepsCard({ requestReceived }: { requestReceived: boolean }) {
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
          Your yard preview request has been submitted. A Waterloo Turf specialist
          will review your photos, selected project options, and property details.
        </div>
      ) : (
        <ol className="next-list">
          <li>We review your photos and project details</li>
          <li>Your AI concept preview is prepared</li>
          <li>Waterloo Turf follows up with next steps and pricing</li>
        </ol>
      )}
    </section>
  );
}

function SiteFooter() {
  const quickLinks = [
    ["Home", "Locations"],
    ["About Us", "Gallery"],
    ["Blog", "Franchise"],
    ["Merch", "Terms & Conditions"],
  ];
  const services = [
    ["Front & Back Yards", "Pet Turf"],
    ["Putting Greens", "Playground Turf"],
    ["Commercial", "Sports Turf"],
  ];

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/images/logo.png" alt="Waterloo Turf" />
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
            {quickLinks.flat().map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-column">
          <h2>Services</h2>
          <div className="footer-link-grid services-grid">
            {services.flat().map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>Waterloo Turf Franchising Co, LLC.</p>
        <p>
          Copyright © 2026 Waterloo Turf. <a href="#">Privacy Policy</a> |{" "}
          <a href="#">Terms & Conditions</a> | Powered by <a href="#">ClickTecs</a>
        </p>
      </div>
    </footer>
  );
}

export default App;
