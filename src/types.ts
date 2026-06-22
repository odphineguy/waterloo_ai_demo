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
  status: "mock" | "generated";
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
