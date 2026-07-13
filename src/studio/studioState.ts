import type { UploadedImage } from "../types";

// ---------------------------------------------------------------------------
// Design Studio state machine. One serializable reducer state — it becomes the
// lead packet payload (photos hold File objects and are summarized on POST).
// ---------------------------------------------------------------------------

export type StudioStepId =
  | "landing"
  | "address"
  | "trace"
  | "package"
  | "style"
  | "gate"
  | "reveal";

export const STUDIO_STEP_NUMBER: Record<StudioStepId, number> = {
  landing: 0,
  address: 1,
  trace: 2,
  package: 3,
  style: 4,
  gate: 5,
  reveal: 6,
};

export type LatLngPoint = { lat: number; lng: number };

export type StudioAddress = {
  formatted: string;
  lat: number | null;
  lng: number | null;
};

/** Summary the trace step hands back when the user continues to packages. */
export type TraceResult = {
  trace: LatLngPoint[];
  deducts: LatLngPoint[][];
  netSqft: number | null;
  mapCenter: LatLngPoint | null;
  mapZoom: number | null;
  snapshotDataUrl: string | null;
};

export type StudioLead = { name: string; email: string; phone: string };

export type StudioState = {
  step: StudioStepId;
  address: StudioAddress | null;
  /** Maps key missing or loader failed — trace degrades, sqft stays unknown. */
  mapsFailed: boolean;
  trace: LatLngPoint[];
  deducts: LatLngPoint[][];
  netSqft: number | null;
  mapCenter: LatLngPoint | null;
  mapZoom: number | null;
  snapshotDataUrl: string | null;
  packageId: string | null;
  designStyle: string;
  puttingSize: string;
  paverStyle: string;
  photos: UploadedImage[];
  lead: StudioLead;
  discountClaimed: boolean;
};

export function createInitialStudioState(defaults: {
  designStyle: string;
  puttingSize: string;
  paverStyle: string;
}): StudioState {
  return {
    step: "landing",
    address: null,
    mapsFailed: false,
    trace: [],
    deducts: [],
    netSqft: null,
    mapCenter: null,
    mapZoom: null,
    snapshotDataUrl: null,
    packageId: null,
    designStyle: defaults.designStyle,
    puttingSize: defaults.puttingSize,
    paverStyle: defaults.paverStyle,
    photos: [],
    lead: { name: "", email: "", phone: "" },
    discountClaimed: false,
  };
}

export type StudioAction =
  | { type: "GO"; step: StudioStepId }
  | { type: "SELECT_ADDRESS"; address: StudioAddress }
  | { type: "MAPS_FAILED" }
  | { type: "APPLY_TRACE"; result: TraceResult }
  | { type: "SELECT_PACKAGE"; packageId: string }
  | { type: "SET_DESIGN_STYLE"; id: string }
  | { type: "SET_PUTTING_SIZE"; id: string }
  | { type: "SET_PAVER_STYLE"; id: string }
  | { type: "SET_PHOTOS"; photos: UploadedImage[] }
  | { type: "SET_LEAD_FIELD"; field: keyof StudioLead; value: string }
  | { type: "CLAIM_DISCOUNT" }
  | { type: "RESTART"; initial: StudioState };

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "GO":
      return { ...state, step: action.step };
    case "SELECT_ADDRESS":
      return { ...state, address: action.address };
    case "MAPS_FAILED":
      return { ...state, mapsFailed: true };
    case "APPLY_TRACE":
      return { ...state, ...action.result };
    case "SELECT_PACKAGE":
      return { ...state, packageId: action.packageId };
    case "SET_DESIGN_STYLE":
      return { ...state, designStyle: action.id };
    case "SET_PUTTING_SIZE":
      return { ...state, puttingSize: action.id };
    case "SET_PAVER_STYLE":
      return { ...state, paverStyle: action.id };
    case "SET_PHOTOS":
      return { ...state, photos: action.photos };
    case "SET_LEAD_FIELD":
      return { ...state, lead: { ...state.lead, [action.field]: action.value } };
    case "CLAIM_DISCOUNT":
      return { ...state, discountClaimed: true };
    case "RESTART":
      return action.initial;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Lead packet — the POST body for /api/studio-lead. Mirrored (structurally) by
// the standalone type in api/studio-lead.ts, which stays self-contained like
// api/generate-yard-preview.ts.
// ---------------------------------------------------------------------------

export type StudioLeadPacket = {
  tenantSlug: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  sqft: number | null;
  packageId: string | null;
  packageName: string | null;
  selections: {
    designStyle: string;
    puttingSize: string | null;
    paverStyle: string | null;
    photoCount: number;
    tracePath: LatLngPoint[];
    deductPaths: LatLngPoint[][];
    mapCenter: LatLngPoint | null;
    mapZoom: number | null;
  };
  investmentMin: number | null;
  investmentMax: number | null;
  investmentLabel: string;
  /** Compressed data URL of the traced satellite map, when capture succeeded. */
  snapshotDataUrl: string | null;
  /** Render data URLs are too large to POST — we send a flag instead. */
  renderImageCount: number;
  renderImagesOmitted: boolean;
  emailRenderRequested: boolean;
  leadEmail: string;
  incentiveLabel: string;
  disclaimer: string;
  createdAt: string;
};
