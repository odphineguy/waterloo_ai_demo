// Instant lead alert — fired by the studio_leads INSERT trigger (see
// supabase/migrations/20260715120000_lead_alert_webhook.sql), sends a branded
// email to Abe via Resend. Fully downstream of the insert: pg_net queues the
// call after commit, so nothing here can ever block or fail lead capture.
//
// Auth: deployed with --no-verify-jwt; the trigger sends x-lead-alert-secret
// (stored in Vault DB-side, LEAD_ALERT_SECRET function-secret side) and any
// request without it is rejected 401.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type LeadRecord = {
  id?: string;
  tenant_slug?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  sqft?: number | null;
  package_name?: string | null;
  selections?: {
    designStyle?: string | null;
    puttingSize?: string | null;
    paverStyle?: string | null;
    investmentLabel?: string | null;
  } | null;
  investment_min?: number | null;
  investment_max?: number | null;
  created_at?: string | null;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: LeadRecord;
};

const BRAND = {
  green: "#183820",
  greenMid: "#2e8050",
  gold: "#e4b83d",
  ink: "#16241a",
  muted: "#6a746a",
  border: "#e4ebdd",
  bg: "#f6f8f3",
};

const LOGO_URL = "https://preview.abemedia.online/images/logo.png";
const DEFAULT_ALERT_EMAIL = "odphineguy@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Null/empty-safe display value — the spec's "no 'undefined' anywhere". */
function show(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : "—";
}

function formatSqft(sqft: number | null | undefined): string | null {
  return typeof sqft === "number" && sqft > 0
    ? `${sqft.toLocaleString("en-US")} sqft`
    : null;
}

function formatInvestment(record: LeadRecord): string {
  const { investment_min: min, investment_max: max } = record;
  if (typeof min === "number" && typeof max === "number" && max > 0) {
    return `$${min.toLocaleString("en-US")} – $${max.toLocaleString("en-US")}`;
  }
  return record.selections?.investmentLabel?.trim() || "—";
}

function phoenixTime(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function buildSubject(record: LeadRecord): string {
  const segments = [
    record.name?.trim() || null,
    formatSqft(record.sqft),
    record.package_name?.trim() || null,
  ].filter(Boolean);
  return segments.length
    ? `🌱 New Studio Lead — ${segments.join(", ")}`
    : "🌱 New Studio Lead";
}

function buildHtml(record: LeadRecord): string {
  const s = record.selections ?? {};
  const phone = record.phone?.trim();
  const email = record.email?.trim();
  const address = record.address?.trim();

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:7px 16px 7px 0;color:${BRAND.muted};font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:7px 0;color:${BRAND.ink};font-size:14px;font-weight:600">${value}</td>
    </tr>`;

  const section = (title: string) =>
    `<tr><td colspan="2" style="padding:16px 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.greenMid}">${title}</td></tr>`;

  const phoneCell = phone
    ? `<a href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ""))}" style="color:${BRAND.greenMid};text-decoration:none">${escapeHtml(phone)}</a>`
    : "—";
  const emailCell = email
    ? `<a href="mailto:${escapeHtml(email)}" style="color:${BRAND.greenMid};text-decoration:none">${escapeHtml(email)}</a>`
    : "—";
  const addressCell = address
    ? `<a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(address)}" style="color:${BRAND.ink};text-decoration:underline">${escapeHtml(address)}</a>`
    : "—";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px 12px;background:${BRAND.bg};font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr>
        <td style="background:${BRAND.green};border-radius:16px 16px 0 0;padding:22px 28px">
          <img src="${LOGO_URL}" alt="Waterloo Turf" height="34" style="display:block;height:34px;margin-bottom:12px" />
          <div style="font-size:20px;font-weight:800;color:#ffffff;line-height:1.2">New Design Studio Lead</div>
          <div style="font-size:13px;color:${BRAND.gold};margin-top:4px;font-weight:600">A customer just finished the AI Design Studio</div>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border:1px solid ${BRAND.border};border-top:0;border-radius:0 0 16px 16px;padding:20px 28px 24px">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
            ${section("Lead")}
            ${row("Name", show(record.name))}
            ${row("Phone", phoneCell)}
            ${row("Email", emailCell)}
            ${section("Property")}
            ${row("Address", addressCell)}
            ${row("Traced area", show(formatSqft(record.sqft)))}
            ${section("Selection")}
            ${row("Package", show(record.package_name))}
            ${row("Turf style", show(s.designStyle))}
            ${row("Putting green", show(s.puttingSize))}
            ${row("Pavers", show(s.paverStyle))}
            ${row("Est. investment", escapeHtml(formatInvestment(record)))}
          </table>
          <div style="margin-top:20px;padding-top:14px;border-top:1px solid ${BRAND.border};color:#8a938a;font-size:12px;line-height:1.6">
            ${escapeHtml(phoenixTime(record.created_at))} (Phoenix)<br />
            Tenant: ${show(record.tenant_slug)} · Lead ID: ${show(record.id)}
          </div>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("LEAD_ALERT_SECRET");
  if (!secret || req.headers.get("x-lead-alert-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    // Webhooks retry on failure — never error on unexpected payloads.
    return new Response(JSON.stringify({ ok: true, skipped: "invalid json" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.type !== "INSERT" || payload.table !== "studio_leads" || !payload.record) {
    return new Response(JSON.stringify({ ok: true, skipped: "not a studio_leads insert" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[lead-alert] RESEND_API_KEY not configured — alert skipped.");
    return new Response(JSON.stringify({ ok: false, skipped: "no resend key" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const record = payload.record;
  const to = Deno.env.get("ALERT_EMAIL")?.trim() || DEFAULT_ALERT_EMAIL;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Waterloo Design Studio <studio@abemedia.online>",
      to,
      subject: buildSubject(record),
      html: buildHtml(record),
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => "");
    console.error(`[lead-alert] Resend send failed (${resendResponse.status}): ${detail}`);
    return new Response(JSON.stringify({ ok: false, error: "resend failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[lead-alert] Alert sent to ${to} for lead ${record.id ?? "unknown"}.`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
