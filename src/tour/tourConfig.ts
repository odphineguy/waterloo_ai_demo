import type {
  BudgetRange,
  ClientConfig,
  TourConfig,
  TourCrmRow,
  TourSampleCustomer,
} from "../types";
import { calculateBudgetRange, formatCurrency } from "../utils/estimate";

// The five "other" CRM rows shown beneath the freshly-created lead. These are
// intentionally generic AZ examples lifted from the design spec; a brand can
// override them via client.tour.crmRows.
const DEFAULT_CRM_ROWS: TourCrmRow[] = [
  {
    name: "Priya Shah",
    location: "Phoenix, AZ",
    projectType: "Commercial Turf",
    stage: "Contacted",
    estValue: "$52,000",
    lastContact: "2h ago",
    ownerInitials: "DR",
    ownerName: "Devon R.",
  },
  {
    name: "The Alfero Group",
    location: "Scottsdale, AZ",
    projectType: "Sports Field",
    stage: "Quoted",
    estValue: "$128,000",
    lastContact: "Yesterday",
    ownerInitials: "ML",
    ownerName: "Maria L.",
  },
  {
    name: "Marcus Webb",
    location: "Chandler, AZ",
    projectType: "Front Yard Turf",
    stage: "Won",
    estValue: "$9,800",
    lastContact: "3d ago",
    ownerInitials: "DR",
    ownerName: "Devon R.",
  },
  {
    name: "Lindgren Residence",
    location: "Gilbert, AZ",
    projectType: "Dog Turf",
    stage: "Contacted",
    estValue: "$18,400",
    lastContact: "4d ago",
    ownerInitials: "ML",
    ownerName: "Maria L.",
  },
];

const DEFAULT_CUSTOMER: TourSampleCustomer = {
  firstName: "James",
  lastName: "Connor",
  email: "james.connor@email.com",
  phone: "(480) 229-7149",
  street: "10016 S 36th Ave",
  city: "Laveen",
  state: "AZ",
  zip: "85339",
};

const DEFAULTS = {
  beforeImage: "/images/myhome-before.webp",
  afterImage: "/images/myhome-after.webp",
  sampleArea: "1,250 sq ft",
};

// An option yields a real (non-"review") range only when its entry is a tuple.
function hasRealRange(client: ClientConfig, option: string): boolean {
  return Array.isArray(client.estimateRanges[option]);
}

// Choose the sample option(s) the demo pre-selects. Defaults to a SINGLE option
// (prefer "Back Yard") so the selection, estimate, PDF and CRM all tell one clean,
// consistent story. A client can pre-select more via client.tour.sampleOptions.
// Whatever we return must exist in projectOptions AND have a real (non-"review")
// range, or the estimate flips to "Requires review".
function pickSampleOptions(client: ClientConfig, requested?: string[]): string[] {
  if (requested && requested.length > 0) {
    const valid = requested.filter(
      (o) => client.projectOptions.includes(o) && hasRealRange(client, o),
    );
    if (valid.length > 0) return valid;
  }

  const reals = client.projectOptions.filter((o) => hasRealRange(client, o));
  const back = reals.find((o) => /back/i.test(o));
  const chosen = back ?? reals[0];
  return chosen ? [chosen] : [];
}

// Short CRM-cell form of a range, e.g. "$11k–$29.5k".
function shortRange(range: BudgetRange): string {
  if (range.kind === "review") return "Review";
  const k = (n: number) => {
    const v = n / 1000;
    return Number.isInteger(v) ? `${v}k` : `${v.toFixed(1)}k`;
  };
  return `$${k(range.min)}–$${k(range.max)}`;
}

export type ResolvedTour = {
  urlBar: string;
  beforeImage: string;
  afterImage: string;
  customer: TourSampleCustomer;
  sampleOptions: string[];
  sampleArea: string;
  crmRows: TourCrmRow[];
  welcomeHeadline: string;
  range: BudgetRange;
  estimateFigure: string;
  estimateShort: string;
  lineItems: { label: string; value: string }[];
  estimateNumber: string;
};

function defaultUrlBar(client: ClientConfig): string {
  let host = client.website;
  try {
    host = new URL(client.website).host.replace(/^www\./, "");
  } catch {
    host = client.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
  return `${host} / yard-preview`;
}

// Build per-option estimate line items from the real ranges (no fixed
// turf/prep/paver three-liner — works for any client's option set).
function buildLineItems(
  client: ClientConfig,
  options: string[],
): { label: string; value: string }[] {
  return options.map((option) => {
    const range = client.estimateRanges[option];
    const value = Array.isArray(range)
      ? `${formatCurrency(range[0])} – ${formatCurrency(range[1])}`
      : "Requires review";
    return { label: option, value };
  });
}

export function resolveTourConfig(client: ClientConfig): ResolvedTour {
  const t: TourConfig = client.tour ?? {};
  const customer = t.sampleCustomer ?? DEFAULT_CUSTOMER;
  const sampleOptions = pickSampleOptions(client, t.sampleOptions);
  const range = calculateBudgetRange(sampleOptions, client.estimateRanges);
  const estimateFigure =
    range.kind === "range"
      ? `${formatCurrency(range.min)} – ${formatCurrency(range.max)}`
      : client.copy.reviewRequired;

  return {
    urlBar: t.urlBar ?? defaultUrlBar(client),
    beforeImage: t.beforeImage ?? DEFAULTS.beforeImage,
    afterImage: t.afterImage ?? DEFAULTS.afterImage,
    customer,
    sampleOptions,
    sampleArea: t.sampleArea ?? DEFAULTS.sampleArea,
    crmRows: t.crmRows ?? DEFAULT_CRM_ROWS,
    welcomeHeadline:
      t.welcomeHeadline ?? `Welcome, ${client.companyName} —\nsee any yard transformed by AI`,
    range,
    estimateFigure,
    estimateShort: shortRange(range),
    lineItems: buildLineItems(client, sampleOptions),
    estimateNumber: `${client.estimatePrefix}-20260625`,
  };
}
