import type { ClientConfig } from "../types";

export const betterLifeLandscapeClient: ClientConfig = {
  slug: "better-life-landscape",
  companyName: "Better Life Landscape",
  brandName: "BETTER LIFE LANDSCAPE",
  legalName: "Better Life Landscape",
  serviceLabel: "Landscape Design",
  positioning:
    "Phoenix Valley landscaping for residential and commercial properties.",
  website: "https://www.betterlifelandscape.com/",
  logoPath: "/images/better-life-landscape-logo.png",
  footerImagePath: "/images/footer-turf-premium.png",
  phone: "602-587-9939",
  email: "sales@betterlifelandscape.com",
  navLinks: ["Turf", "Pavers", "Rock", "Fire Pits", "Commercial"],
  quickLinks: ["Home", "Services", "Gallery", "Reviews", "Commercial", "Contact"],
  services: [
    "Artificial Turf",
    "Pavers",
    "Decorative Rock",
    "Fire Pits",
    "Residential Landscaping",
    "Commercial Landscaping",
  ],
  projectOptions: [
    "Artificial Turf",
    "Pavers",
    "Decorative Rock",
    "Fire Pit",
    "Residential Landscaping",
    "Commercial Landscaping",
    "Other",
  ],
  estimateRanges: {
    "Artificial Turf": [5000, 14500],
    Pavers: [6500, 19000],
    "Decorative Rock": [2500, 8500],
    "Fire Pit": [4500, 14000],
    "Residential Landscaping": "review",
    "Commercial Landscaping": "review",
    Other: "review",
  },
  estimatePrefix: "BLL",
  colors: {
    primary: "#2f7d43",
    primaryDark: "#1d3f29",
    primarySoft: "#e8f2ea",
    accent: "#d7ad3b",
    accentDark: "#92711c",
  },
  pdfLogo: {
    background: "none",
    width: 150,
    height: 72,
  },
  copy: {
    pageTitle: "Get Your Instant Landscape Project Preview",
    contactPrompt: "Where should Better Life Landscape prepare this preview?",
    notesPlaceholder:
      "Tell us anything helpful about turf, pavers, rock, fire features, drainage, access, timing, or the look you want.",
    generateButton: "Generate Landscape Preview",
    pdfTitle: "AI VISUAL ESTIMATE",
    pdfThanks: "Thank you for choosing Better Life Landscape.",
    specialistLabel: "Landscape Design Specialists",
    reviewRequired:
      "This selection needs a Better Life Landscape review before a range is shown.",
    nextSteps: [
      "We review your photos and project details",
      "Your landscape concept preview is prepared",
      "Better Life Landscape follows up with measurements, options, and final pricing",
    ],
  },
};
