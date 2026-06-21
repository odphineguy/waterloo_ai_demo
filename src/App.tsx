import {
  Loader2,
} from "lucide-react";
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

function App() {
  const [contact, setContact] = useState<ContactInfo>(emptyContact);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [notes, setNotes] = useState("");
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [preview, setPreview] = useState<YardPreviewResult | null>(null);
  const [leadPacket, setLeadPacket] = useState<LeadPacket | null>(null);

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
            <AiPreviewSection preview={preview} status={previewStatus} />
          )}
          {preview && (
            <BudgetCard
              label={budgetRange.label}
              requiresReview={budgetRange.kind === "review"}
            />
          )}
          {leadPacket && <NextStepsCard requestReceived />}
        </aside>
      </section>
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
}: {
  preview: YardPreviewResult | null;
  status: PreviewStatus;
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
            <div className="preview-frame" key={`${preview.id}-${index}`}>
              <img
                src={imageUrl}
                alt={`AI yard concept preview ${index + 1}`}
              />
              <span className="mock-label">Preview {index + 1} ready</span>
            </div>
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
