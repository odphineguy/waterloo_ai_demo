import type {
  BudgetRange,
  ContactInfo,
  LeadPacket,
  ProjectOption,
  YardPreviewResult,
} from "../types";

type CreateLeadPacketInput = {
  contact: ContactInfo;
  projectOptions: ProjectOption[];
  notes: string;
  photoCount: number;
  preview: YardPreviewResult | null;
  budgetRange: BudgetRange;
};

export function createLeadPacket({
  contact,
  projectOptions,
  notes,
  photoCount,
  preview,
  budgetRange,
}: CreateLeadPacketInput): LeadPacket {
  const timestamp = new Date().toLocaleString();

  const packet: LeadPacket = {
    customerName: `${contact.firstName} ${contact.lastName}`,
    contactInfo: `${contact.email} | ${contact.phone}`,
    address: `${contact.streetAddress}, ${contact.city}, ${contact.state} ${contact.zipCode}`,
    selectedProjectOptions: projectOptions,
    notes: notes.trim() || "No notes provided.",
    uploadedPhotoCount: photoCount,
    aiPreviewStatus: preview
      ? `${preview.status === "mock" ? "Mock preview ready" : "Generated preview ready"}`
      : "Not generated",
    aiPrompt: preview?.prompt ?? "",
    generatedPreview: preview,
    preliminaryBudgetRange: budgetRange.label,
    timestamp,
  };

  // TODO: Send this packet to email notification, CRM webhook, Supabase,
  // or Google Sheets once those integrations are selected and configured.
  return packet;
}
