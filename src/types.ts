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
