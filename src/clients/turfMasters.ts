import type { ClientConfig } from "../types";

export const turfMastersClient: ClientConfig = {
  slug: "turf-masters",
  companyName: "Turf Masters",
  brandName: "TURF MASTERS",
  legalName: "Turf Masters",
  serviceLabel: "Artificial Grass",
  positioning:
    "Artificial grass and synthetic turf installer serving the Phoenix metro area.",
  website: "https://azturfmasters.com/",
  logoPath: "/images/turf-masters-logo.png",
  footerImagePath: "/images/footer-turf-premium.png",
  phone: "(480) 751-4343",
  email: "quotes@azturfmasters.com",
  navLinks: ["Artificial Turf", "Putting Greens", "Synthetic Grass", "Gallery", "Contact"],
  quickLinks: ["Home", "Services", "Gallery", "Reviews", "Free Estimate", "Contact"],
  services: [
    "Artificial Turf",
    "Synthetic Grass",
    "Putting Greens",
    "Front Yard Turf",
    "Backyard Turf",
    "Pet Turf",
  ],
  projectOptions: [
    "Artificial Turf",
    "Synthetic Grass",
    "Putting Green",
    "Pet Turf",
    "Front Yard",
    "Back Yard",
    "Other",
  ],
  estimateRanges: {
    "Artificial Turf": [5000, 14500],
    "Synthetic Grass": [5000, 14500],
    "Putting Green": [4000, 11000],
    "Pet Turf": [5500, 15500],
    "Front Yard": [4500, 13000],
    "Back Yard": [5500, 15000],
    Other: "review",
  },
  estimatePrefix: "TM",
  colors: {
    primary: "#2f7d43",
    primaryDark: "#183820",
    primarySoft: "#e7f1e8",
    accent: "#d7ad3b",
    accentDark: "#92711c",
  },
  pdfLogo: {
    background: "dark",
    width: 154,
    height: 62,
  },
  copy: {
    pageTitle: "Get Your Instant Artificial Turf Project Preview",
    contactPrompt: "Where should Turf Masters prepare this preview?",
    notesPlaceholder:
      "Tell us anything helpful about pets, putting greens, front yard, back yard, drainage, access, timing, or the look you want.",
    generateButton: "Generate Turf Project Preview",
    pdfTitle: "AI VISUAL ESTIMATE",
    pdfThanks: "Thank you for choosing Turf Masters.",
    specialistLabel: "Artificial Turf Specialists",
    reviewRequired:
      "This selection needs a Turf Masters review before a range is shown.",
    nextSteps: [
      "We review your photos and selected turf options",
      "Your artificial turf concept preview is prepared",
      "Turf Masters follows up with measurements, options, and final pricing",
    ],
  },
};
