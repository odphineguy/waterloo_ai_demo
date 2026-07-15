export type ProjectOption = string;

export type EstimateRange = [number, number] | "review";

export type ClientConfig = {
  slug: string;
  companyName: string;
  brandName: string;
  legalName: string;
  serviceLabel: string;
  positioning: string;
  website: string;
  logoPath: string;
  footerImagePath: string;
  phone: string;
  email: string;
  navLinks: string[];
  quickLinks: string[];
  services: string[];
  projectOptions: ProjectOption[];
  estimateRanges: Record<ProjectOption, EstimateRange>;
  estimatePrefix: string;
  colors: {
    primary: string;
    primaryDark: string;
    primarySoft: string;
    accent: string;
    accentDark: string;
  };
  pdfLogo?: {
    background: "dark" | "none";
    width: number;
    height: number;
  };
  copy: {
    pageTitle: string;
    contactPrompt: string;
    notesPlaceholder: string;
    generateButton: string;
    pdfTitle: string;
    pdfThanks: string;
    specialistLabel: string;
    reviewRequired: string;
    nextSteps: string[];
  };
  tour?: TourConfig;
  studio?: StudioConfig;
};

// ---------------------------------------------------------------------------
// Design Studio (route: /<slug>/studio) — everything brand/product specific
// for the studio funnel lives here so any tenant works with zero code changes.
// ---------------------------------------------------------------------------

export type StudioPackage = {
  id: string;
  name: string;
  description: string;
  items: string[];
  /** Appended to the render prompt — must mention only this tenant's products. */
  promptDirectives: string;
  /** Putting-green packages fold the default green size into the render prompt. */
  hasPuttingGreen: boolean;
};

export type StudioDesignStyleId = "freeform" | "modern" | "surprise";

export type StudioConfig = {
  enabled: boolean;
  /** e.g. { label: "$500", amount: 500 } — "$500 off unlocked at the end" */
  incentive: { label: string; amount: number };
  packages: StudioPackage[];
  paverStyles: { id: string; label: string; swatchPath: string }[];
  designStyles: StudioDesignStyleId[];
  puttingGreenSizes: { id: string; label: string; holes: string; sqftHint: string }[];
  /** packageId → [$min, $max] per sqft. */
  ratesPerSqft: Record<string, [number, number]>;
  /** Floor for tiny traces. */
  minInvestment: number;
  /** e.g. "Final quote after your free on-site measure." */
  disclaimer: string;
  /** Where studio lead packets are emailed. */
  leadEmail: string;
  /** After-image used on the landing hero and blurred lead-gate backdrop. */
  heroImagePath?: string;
  /** Optional Places-autocomplete bias circle — the tenant's service metro. */
  locationBias?: { lat: number; lng: number; radiusMeters: number };
  /** Cal.com booking link for "Book My Free Consultation"; button hidden if absent. */
  bookingUrl?: string;
  /** Aerial imagery provider seam (EagleView is a Phase 2 stub). */
  imagerySource?: "google" | "eagleview";
  /** Google Aerial View property flyover tab (default true). */
  flyoverEnabled?: boolean;
};

export type TourCrmStage = "New" | "Contacted" | "Quoted" | "Won";

export type TourCrmRow = {
  name: string;
  location: string;
  projectType: string;
  stage: TourCrmStage;
  estValue: string;
  lastContact: string;
  ownerInitials: string;
  ownerName: string;
};

export type TourSampleCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

// All fields optional; resolveTourConfig() fills in shared defaults so every
// existing ClientConfig works in the guided tour with zero per-client authoring.
export type TourConfig = {
  urlBar?: string;
  beforeImage?: string;
  afterImage?: string;
  sampleCustomer?: TourSampleCustomer;
  sampleOptions?: string[];
  sampleArea?: string;
  crmRows?: TourCrmRow[];
  welcomeHeadline?: string;
  bookingUrl?: string;
};

export type ContactInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
};

export type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export type PreviewStatus = "idle" | "generating" | "ready";

export type YardPreviewRequest = {
  projectOptions: ProjectOption[];
  notes: string;
  uploadedImages: UploadedImage[];
};

export type YardPreviewResult = {
  id: string;
  imageUrls: string[];
  prompt: string;
  status: "generated";
  createdAt: string;
};

export type BudgetRange =
  | {
      kind: "range";
      min: number;
      max: number;
      label: string;
    }
  | {
      kind: "review";
      label: "Requires review";
    };

export type LeadPacket = {
  customerName: string;
  contactInfo: string;
  address: string;
  selectedProjectOptions: ProjectOption[];
  notes: string;
  uploadedPhotoCount: number;
  aiPreviewStatus: string;
  aiPrompt: string;
  generatedPreview: YardPreviewResult | null;
  preliminaryBudgetRange: string;
  timestamp: string;
};
