import type { ClientConfig } from "../types";

export const waterlooClient: ClientConfig = {
  slug: "waterloo",
  companyName: "Waterloo Turf",
  brandName: "WATERLOO TURF",
  legalName: "Waterloo Turf Franchising Co, LLC.",
  serviceLabel: "Artificial Turf",
  positioning: "Artificial turf specialists for residential and commercial spaces.",
  website: "https://waterlooturf.com/",
  logoPath: "/images/logo.png",
  footerImagePath: "/images/footer-turf-premium.png",
  phone: "(512) 607-9335",
  email: "info@waterlooturf.com",
  navLinks: ["About Us", "Services", "Gallery", "Blog", "Merch", "Own a Franchise"],
  quickLinks: [
    "Home",
    "Locations",
    "About Us",
    "Gallery",
    "Blog",
    "Franchise",
    "Merch",
    "Terms & Conditions",
  ],
  services: [
    "Front & Back Yards",
    "Pet Turf",
    "Putting Greens",
    "Playground Turf",
    "Commercial",
    "Sports Turf",
  ],
  projectOptions: [
    "Front Yard",
    "Back Yard",
    "Sports Turf",
    "Commercial",
    "Putting Green",
    "Other",
  ],
  estimateRanges: {
    "Front Yard": [4500, 9500],
    "Back Yard": [5500, 12500],
    "Sports Turf": [8000, 20000],
    Commercial: [10000, 35000],
    "Putting Green": [3500, 9000],
    Other: "review",
  },
  estimatePrefix: "WT",
  colors: {
    primary: "#2e8050",
    primaryDark: "#183820",
    primarySoft: "#e4f0df",
    accent: "#e4b83d",
    accentDark: "#b88c16",
  },
  studio: {
    enabled: true,
    incentive: { label: "$500", amount: 500 },
    packages: [
      {
        id: "essentials",
        name: "Green Essentials",
        description: "Turf install — clean, low-maintenance, done right.",
        items: ["Premium turf install"],
        promptDirectives:
          "Install premium artificial turf across the traced lawn area with crisp professional edges and a uniform, freshly groomed surface. No hardscape additions — turf only.",
        hasPuttingGreen: false,
      },
      {
        id: "defined",
        name: "Defined Green",
        description: "Turf framed with a paver border and decorative rock.",
        items: ["Premium turf", "Paver border", "Decorative rock"],
        promptDirectives:
          "Install premium artificial turf framed by a clean paver border, with decorative rock beds along the edges for a defined, low-maintenance look.",
        hasPuttingGreen: false,
      },
      {
        id: "balance",
        name: "Backyard Balance",
        description: "Turf, paver border, and a custom paver patio.",
        items: ["Premium turf", "Paver border", "Custom paver patio"],
        promptDirectives:
          "Install premium artificial turf with a paver border and a custom paver patio sized for outdoor seating, balancing soft turf areas with usable hardscape.",
        hasPuttingGreen: false,
      },
      {
        id: "golfer",
        name: "Golfer's Delight",
        description: "A real putting green with turf, pavers, and rock accents.",
        items: ["Putting green", "Premium turf", "Pavers", "Rock accents"],
        promptDirectives:
          "Feature a realistic backyard putting green with a flag pin, surrounded by premium artificial turf, paver accents, and decorative rock borders.",
        hasPuttingGreen: true,
      },
      {
        id: "retreat",
        name: "Total Backyard Retreat",
        description: "The full build: turf, border, patio, patio cover, and rock.",
        items: [
          "Premium turf",
          "Paver border",
          "Paver patio",
          "Patio cover",
          "Decorative rock",
        ],
        promptDirectives:
          "Create a complete backyard retreat: premium artificial turf, paver border, a generous paver patio with a covered patio structure for shade, and decorative rock accents.",
        hasPuttingGreen: false,
      },
      {
        id: "dealer",
        name: "Dealer's Choice",
        description: "Bespoke premium — lighting, smart irrigation, and extras.",
        items: [
          "Premium turf",
          "Paver border",
          "Patio",
          "Landscape lighting",
          "Smart irrigation",
          "Premium extras",
        ],
        promptDirectives:
          "Design a bespoke premium backyard: artificial turf, paver border and patio, travertine accents, warm landscape lighting, discreet smart irrigation for planting beds, and an optional putting green — tasteful and high-end.",
        hasPuttingGreen: true,
      },
    ],
    designStyles: ["freeform", "modern", "surprise"],
    puttingGreenSizes: [
      { id: "practice", label: "Practice", holes: "1–2 holes", sqftHint: "~100–200 sqft" },
      { id: "club", label: "Club", holes: "2–3 holes", sqftHint: "~200–400 sqft" },
      { id: "tour", label: "Tour", holes: "3–5 holes", sqftHint: "~400–800 sqft" },
    ],
    paverStyles: [
      { id: "slate", label: "Slate", swatchPath: "/images/studio-pavers/slate.svg" },
      { id: "townscape", label: "Townscape Native", swatchPath: "/images/studio-pavers/townscape.svg" },
      { id: "tierranorte", label: "Tierranorte", swatchPath: "/images/studio-pavers/tierranorte.svg" },
      { id: "territorial", label: "Territorial", swatchPath: "/images/studio-pavers/territorial.svg" },
      { id: "victorian", label: "Victorian", swatchPath: "/images/studio-pavers/victorian.svg" },
      { id: "rio", label: "Rio", swatchPath: "/images/studio-pavers/rio.svg" },
    ],
    // PLACEHOLDER — Bob to confirm real per-sqft rates before launch.
    ratesPerSqft: {
      essentials: [6, 9],
      defined: [9, 14],
      balance: [12, 18],
      golfer: [14, 22],
      retreat: [16, 26],
      dealer: [18, 30],
    },
    minInvestment: 4500, // PLACEHOLDER — Bob to confirm
    disclaimer: "Final quote after your free on-site measure.",
    // Demo phase: leads go to Abe (also required by Resend test mode, which only
    // delivers to the account owner). Switch to the tenant's real inbox once
    // they're a client AND a domain is verified at resend.com/domains.
    leadEmail: "odphineguy@yahoo.com",
    heroImagePath: "/images/studio-after.png",
    // bookingUrl intentionally unset — the consultation button only renders
    // once the tenant's real Cal.com link is added here.
    locationBias: { lat: 33.4484, lng: -112.074, radiusMeters: 50_000 }, // Phoenix metro
    imagerySource: "google",
    flyoverEnabled: true,
  },
  copy: {
    pageTitle: "Fill Out The Form Below To Schedule Your Free Onsite Estimate",
    contactPrompt: "Where should Waterloo Turf prepare this preview?",
    notesPlaceholder:
      "Tell us anything helpful about access, timing, slope, drainage, or the look you want.",
    generateButton: "Generate AI Yard Preview",
    pdfTitle: "AI VISUAL ESTIMATE",
    pdfThanks: "Thank you for choosing Waterloo Turf.",
    specialistLabel: "Artificial Turf Specialists",
    reviewRequired:
      "This selection needs a Waterloo Turf review before a range is shown.",
    nextSteps: [
      "We review your photos and project details",
      "Your AI concept preview is prepared",
      "Waterloo Turf follows up with next steps and pricing",
    ],
  },
};
