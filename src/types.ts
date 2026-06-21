export const PROJECT_OPTIONS = [
  "Front Yard",
  "Back Yard",
  "Sports Turf",
  "Commercial",
  "Putting Green",
  "Other",
] as const;

export type ProjectOption = (typeof PROJECT_OPTIONS)[number];

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
