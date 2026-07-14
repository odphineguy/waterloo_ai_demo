/// <reference types="node" />
// ^ Same convention as api/generate-yard-preview.ts: pins Node's global types
// for Vercel's standalone serverless-function type-check.
//
// Design Studio lead persistence + delivery. Two actions run independently —
// a Supabase insert (service-role, server-side) and a Resend email to the
// tenant's studio.leadEmail. Failure of one never blocks the other, and the
// client never blocks the customer's reveal on this endpoint.

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type LatLngPoint = { lat: number; lng: number };

// Structurally mirrors StudioLeadPacket in src/studio/studioState.ts. Kept
// standalone so the api/ directory stays self-contained (repo convention).
type StudioLeadBody = {
  tenantSlug?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  sqft?: number | null;
  packageId?: string | null;
  packageName?: string | null;
  selections?: {
    designStyle?: string;
    puttingSize?: string | null;
    paverStyle?: string | null;
    photoCount?: number;
    tracePath?: LatLngPoint[];
    deductPaths?: LatLngPoint[][];
    mapCenter?: LatLngPoint | null;
    mapZoom?: number | null;
  };
  investmentMin?: number | null;
  investmentMax?: number | null;
  investmentLabel?: string;
  snapshotDataUrl?: string | null;
  renderImageCount?: number;
  renderImagesOmitted?: boolean;
  emailRenderRequested?: boolean;
  leadEmail?: string;
  incentiveLabel?: string;
  disclaimer?: string;
  createdAt?: string;
};

type VercelRequest = {
  body?: unknown;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  on: (event: "data" | "end" | "error", listener: (...args: unknown[]) => void) => void;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};

export const config = {
  maxDuration: 30,
};

// Same convention as api/generate-yard-preview.ts: the Vite dev middleware's
// `process.env.X ||= env.X` coerces missing vars to the string "undefined",
// so treat that as unset.
function getEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value !== "undefined" ? value : null;
}

function parseJsonBody(req: VercelRequest): Promise<StudioLeadBody> {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body as StudioLeadBody);
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as StudioLeadBody) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Naive in-memory per-IP rate limit (10/min) — fine for Phase 1. Serverless
// instances each keep their own window, which is acceptable at this scale.
// ---------------------------------------------------------------------------

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const hitsByIp = new Map<string, number[]>();

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (hitsByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    hitsByIp.set(ip, hits);
    return true;
  }
  hits.push(now);
  hitsByIp.set(ip, hits);
  return false;
}

// ---------------------------------------------------------------------------
// Action 1: persist to Supabase (studio_leads — see supabase/migrations/).
// ---------------------------------------------------------------------------

async function persistLead(lead: StudioLeadBody): Promise<{ ok: boolean; detail: string }> {
  const url = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_KEY");

  if (!url || !serviceKey) {
    return { ok: false, detail: "Supabase env vars not configured — persist skipped." };
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("studio_leads").insert({
    tenant_slug: lead.tenantSlug ?? "unknown",
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    address: lead.address ?? null,
    lat: lead.lat ?? null,
    lng: lead.lng ?? null,
    sqft: lead.sqft ?? null,
    package_id: lead.packageId ?? null,
    package_name: lead.packageName ?? null,
    selections: {
      source: "design-studio",
      ...(lead.selections ?? {}),
      investmentLabel: lead.investmentLabel ?? null,
      renderImageCount: lead.renderImageCount ?? 0,
      renderImagesOmitted: lead.renderImagesOmitted ?? true,
      emailRenderRequested: lead.emailRenderRequested ?? false,
    },
    investment_min: lead.investmentMin ?? null,
    investment_max: lead.investmentMax ?? null,
    snapshot_url: lead.snapshotDataUrl ?? null,
  });

  if (error) {
    return { ok: false, detail: `Supabase insert failed: ${error.message}` };
  }
  return { ok: true, detail: "Persisted to studio_leads." };
}

// ---------------------------------------------------------------------------
// Action 2: email the lead packet to the tenant via Resend.
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLeadEmailHtml(lead: StudioLeadBody): string {
  const esc = escapeHtml;
  const s = lead.selections ?? {};
  const sqft =
    typeof lead.sqft === "number" && lead.sqft > 0
      ? `${lead.sqft.toLocaleString("en-US")} sqft`
      : "Not measured — requires on-site measure";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#6a746a;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0;color:#16241a;font-size:14px;font-weight:600">${value}</td></tr>`;

  const snapshotBlock = lead.snapshotDataUrl
    ? `<div style="margin:18px 0"><div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8a938a;margin-bottom:8px">Traced yard</div><img src="${lead.snapshotDataUrl}" alt="Traced satellite map" width="420" style="max-width:100%;border-radius:12px;border:1px solid #e4ebdd"/></div>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f6f8f3;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e4ebdd;padding:28px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#16241a">New Design Studio Lead</h1>
    <p style="margin:0 0 18px;color:#6a746a;font-size:13px">${esc(lead.createdAt ?? new Date().toISOString())} · tenant: ${esc(lead.tenantSlug ?? "unknown")}</p>
    <table style="border-collapse:collapse;width:100%">
      ${row("Name", esc(lead.name ?? ""))}
      ${row("Email", esc(lead.email ?? ""))}
      ${row("Phone", esc(lead.phone ?? ""))}
      ${row("Address", esc(lead.address ?? "Not provided"))}
      ${row("Yard area", esc(sqft))}
      ${row("Package", esc(lead.packageName ?? "Not selected"))}
      ${row("Design style", esc(s.designStyle ?? "—"))}
      ${row("Putting green", esc(s.puttingSize ?? "—"))}
      ${row("Pavers", esc(s.paverStyle ?? "—"))}
      ${row("Photos uploaded", String(s.photoCount ?? 0))}
      ${row("Investment range", esc(lead.investmentLabel ?? "Requires on-site measure"))}
      ${row("Incentive", esc(lead.incentiveLabel ? `${lead.incentiveLabel} off locked` : "—"))}
      ${row("Render emailed to customer?", lead.emailRenderRequested ? "Requested" : "No")}
    </table>
    ${snapshotBlock}
    <p style="margin:18px 0 0;color:#8a938a;font-size:12px">${esc(lead.disclaimer ?? "")}</p>
  </div>
</body></html>`;
}

async function emailLead(lead: StudioLeadBody): Promise<{ ok: boolean; detail: string }> {
  const apiKey = getEnv("RESEND_API_KEY");
  const to = lead.leadEmail?.trim();

  if (!apiKey) {
    return { ok: false, detail: "RESEND_API_KEY not configured — email skipped." };
  }
  if (!to) {
    return { ok: false, detail: "No studio.leadEmail on this tenant — email skipped." };
  }

  const resend = new Resend(apiKey);
  const from = getEnv("STUDIO_FROM_EMAIL") || "Design Studio <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `New Design Studio Lead — ${lead.name ?? "Unknown"} — ${lead.packageName ?? "No package"}`,
    html: buildLeadEmailHtml(lead),
  });

  if (error) {
    return { ok: false, detail: `Resend send failed: ${error.message}` };
  }
  return { ok: true, detail: `Emailed lead packet to ${to}.` };
}

// ---------------------------------------------------------------------------
// Phase 2 adapter seam — Bob's CRM is unconfirmed; email + Supabase row is the
// Phase 1 delivery mechanism.
// ---------------------------------------------------------------------------

async function deliverToCrm(lead: StudioLeadBody): Promise<void> {
  // TODO(phase-2): push the lead into the tenant's CRM once confirmed.
  void lead;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (isRateLimited(getClientIp(req))) {
    res.status(429).json({ error: "Too many requests — try again in a minute." });
    return;
  }

  let lead: StudioLeadBody;
  try {
    lead = await parseJsonBody(req);
  } catch {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  if (!lead.name || !lead.email || !lead.phone) {
    res.status(400).json({ error: "Missing required contact fields." });
    return;
  }

  // Both actions run independently; one failing must not block the other.
  const [persisted, emailed] = await Promise.all([
    persistLead(lead).catch((error: unknown) => ({
      ok: false,
      detail: `Supabase insert threw: ${error instanceof Error ? error.message : String(error)}`,
    })),
    emailLead(lead).catch((error: unknown) => ({
      ok: false,
      detail: `Resend send threw: ${error instanceof Error ? error.message : String(error)}`,
    })),
  ]);

  await deliverToCrm(lead).catch(() => undefined);

  if (!persisted.ok) console.error("[studio-lead]", persisted.detail);
  if (!emailed.ok) console.error("[studio-lead]", emailed.detail);

  res.status(200).json({
    ok: persisted.ok || emailed.ok,
    persisted,
    emailed,
  });
}
