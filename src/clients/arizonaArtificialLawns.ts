import type { ClientConfig } from "../types";

export const arizonaArtificialLawnsClient: ClientConfig = {
  slug: "arizona-artificial-lawns",
  companyName: "Arizona Artificial Lawns",
  brandName: "ARIZONA ARTIFICIAL LAWNS",
  legalName: "Arizona Artificial Lawns",
  serviceLabel: "Artificial Grass",
  positioning:
    "Maintenance-free synthetic turf serving Phoenix, with long-tenure trust and low-maintenance value.",
  website: "https://www.arizonaartificiallawns.com/",
  logoPath: "/images/arizona-artificial-lawns-logo.png",
  footerImagePath: "/images/footer-turf-premium.png",
  phone: "(623) 584-1456",
  email: "info@arizonaartificiallawns.com",
  navLinks: ["Artificial Grass", "Synthetic Turf", "Pet Turf", "Gallery", "Contact"],
  quickLinks: ["Home", "Services", "Gallery", "Reviews", "Free Estimate", "Contact"],
  services: [
    "Artificial Grass",
    "Synthetic Turf",
    "Pet Turf",
    "Putting Greens",
    "Front Yard Turf",
    "Back Yard Turf",
  ],
  projectOptions: [
    "Artificial Grass",
    "Pet Turf",
    "Putting Green",
    "Front Yard",
    "Back Yard",
    "Other",
  ],
  estimateRanges: {
    "Artificial Grass": [5000, 14500],
    "Pet Turf": [5500, 15500],
    "Putting Green": [4000, 11000],
    "Front Yard": [4500, 13000],
    "Back Yard": [5500, 15000],
    Other: "review",
  },
  estimatePrefix: "AAL",
  colors: {
    primary: "#2f7d43",
    primaryDark: "#173820",
    primarySoft: "#e7f1e8",
    accent: "#d7ad3b",
    accentDark: "#92711c",
  },
  pdfLogo: {
    background: "dark",
    width: 178,
    height: 54,
  },
  copy: {
    pageTitle: "Get Your Instant Artificial Grass Project Preview",
    contactPrompt: "Where should Arizona Artificial Lawns prepare this preview?",
    notesPlaceholder:
      "Tell us anything helpful about pets, putting greens, front yard, back yard, drainage, access, timing, or the look you want.",
    generateButton: "Generate Artificial Grass Preview",
    pdfTitle: "AI VISUAL ESTIMATE",
    pdfThanks: "Thank you for choosing Arizona Artificial Lawns.",
    specialistLabel: "Artificial Grass Specialists",
    reviewRequired:
      "This selection needs an Arizona Artificial Lawns review before a range is shown.",
    nextSteps: [
      "We review your photos and selected turf options",
      "Your artificial grass concept preview is prepared",
      "Arizona Artificial Lawns follows up with measurements, options, and final pricing",
    ],
  },
};
