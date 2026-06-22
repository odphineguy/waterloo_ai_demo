import type { ClientConfig } from "../types";

export const platinumOutdoorsClient: ClientConfig = {
  slug: "platinum-outdoors",
  companyName: "Platinum Outdoors",
  brandName: "PLATINUM OUTDOORS",
  legalName: "Platinum Outdoors",
  serviceLabel: "Outdoor Living",
  positioning:
    "Outdoor living and backyard remodel contractor serving Phoenix and the Valley, with financing.",
  website: "https://platinumoutdoorsaz.com/",
  logoPath: "/images/platinum-outdoors-logo.webp",
  footerImagePath: "/images/footer-turf-premium.png",
  phone: "(480) 856-5252",
  email: "austin@platinumoutdoorsaz.com",
  navLinks: ["Backyard Remodels", "Outdoor Living", "Turf", "Pavers", "Contact"],
  quickLinks: ["Home", "Services", "Gallery", "Reviews", "Financing", "Contact"],
  services: [
    "Backyard Remodels",
    "Outdoor Living Spaces",
    "Artificial Turf",
    "Pavers",
    "Fire Features",
    "Landscaping",
  ],
  projectOptions: [
    "Full Backyard Remodel",
    "Outdoor Living Space",
    "Artificial Turf",
    "Pavers",
    "Fire Pit",
    "Other",
  ],
  estimateRanges: {
    "Full Backyard Remodel": "review",
    "Outdoor Living Space": "review",
    "Artificial Turf": [5000, 14500],
    Pavers: [6500, 19000],
    "Fire Pit": [4500, 14000],
    Other: "review",
  },
  estimatePrefix: "PO",
  colors: {
    primary: "#2f7d43",
    primaryDark: "#173820",
    primarySoft: "#e7f1e8",
    accent: "#d7ad3b",
    accentDark: "#92711c",
  },
  pdfLogo: {
    background: "dark",
    width: 118,
    height: 72,
  },
  copy: {
    pageTitle: "Get Your Instant Backyard Project Preview",
    contactPrompt: "Where should Platinum Outdoors prepare this preview?",
    notesPlaceholder:
      "Tell us anything helpful about the backyard scope, turf, pavers, fire features, outdoor living, drainage, access, timing, financing, or the look you want.",
    generateButton: "Generate Backyard Project Preview",
    pdfTitle: "AI VISUAL ESTIMATE",
    pdfThanks: "Thank you for choosing Platinum Outdoors.",
    specialistLabel: "Outdoor Living Specialists",
    reviewRequired:
      "This selection needs a Platinum Outdoors review before a range is shown.",
    nextSteps: [
      "We review your photos and selected project options",
      "Your backyard concept preview is prepared",
      "Platinum Outdoors follows up with measurements, options, and final pricing",
    ],
  },
};
