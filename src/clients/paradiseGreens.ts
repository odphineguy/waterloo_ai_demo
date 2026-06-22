import type { ClientConfig } from "../types";

export const paradiseGreensClient: ClientConfig = {
  slug: "paradise-greens",
  companyName: "Paradise Greens",
  brandName: "PARADISE GREENS",
  legalName: "Paradise Greens",
  serviceLabel: "Artificial Grass",
  positioning:
    "Arizona's top-rated artificial grass experts with strong credibility and partner branding.",
  website: "https://www.paradisegreens.com/",
  logoPath: "/images/paradise-greens-logo.png",
  footerImagePath: "/images/footer-turf-premium.png",
  phone: "(480) 586-0655",
  email: "info@paradisegreens.com",
  navLinks: ["Artificial Grass", "Putting Greens", "Pet Turf", "Gallery", "Contact"],
  quickLinks: ["Home", "Services", "Gallery", "Reviews", "Financing", "Contact"],
  services: [
    "Artificial Grass",
    "Pet and Dog Grass",
    "Putting Greens",
    "Playground Turf",
    "Commercial Turf",
    "Artificial Lawns",
  ],
  projectOptions: [
    "Artificial Grass",
    "Pet and Dog Grass",
    "Putting Green",
    "Playground Turf",
    "Commercial Turf",
    "Artificial Lawn",
    "Other",
  ],
  estimateRanges: {
    "Artificial Grass": [5000, 14500],
    "Pet and Dog Grass": [5500, 15500],
    "Putting Green": [4000, 11000],
    "Playground Turf": [7000, 19000],
    "Commercial Turf": "review",
    "Artificial Lawn": [4500, 13000],
    Other: "review",
  },
  estimatePrefix: "PG",
  colors: {
    primary: "#2f8d46",
    primaryDark: "#173d26",
    primarySoft: "#e7f3e9",
    accent: "#d6b24d",
    accentDark: "#9b7721",
  },
  pdfLogo: {
    background: "dark",
    width: 185,
    height: 62,
  },
  copy: {
    pageTitle: "Get Your Instant Artificial Grass Project Preview",
    contactPrompt: "Where should Paradise Greens prepare this preview?",
    notesPlaceholder:
      "Tell us anything helpful about pets, kids, access, timing, drainage, turf use, or the look you want.",
    generateButton: "Generate Artificial Grass Preview",
    pdfTitle: "AI VISUAL ESTIMATE",
    pdfThanks: "Thank you for choosing Paradise Greens.",
    specialistLabel: "Artificial Grass Specialists",
    reviewRequired:
      "This selection needs a Paradise Greens review before a range is shown.",
    nextSteps: [
      "We review your photos and project details",
      "Your artificial grass concept preview is prepared",
      "Paradise Greens follows up with measurements, options, and final pricing",
    ],
  },
};
