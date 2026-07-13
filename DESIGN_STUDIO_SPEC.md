# Waterloo Design Studio — Phase 1 Compound Spec

## Overview

Build the **Design Studio** funnel into the existing `waterloo_ai_demo` codebase as a new route: address entry → satellite yard tracing with live sqft → package selection → style pickers → lead-capture gate → AI before/after visualization with investment range → consultation booking. Lead data persists server-side and is emailed to the tenant.

This extends the existing multi-tenant funnel; it does not replace it. The existing `/<slug>` funnel and `/<slug>/demo` tour keep working unchanged.

## Context

Repo: `/Volumes/Media 2TB/waterloo_ai_demo` — read `CLAUDE.md` first; it is accurate and its Read Discipline section applies.

Key facts:
- React + TypeScript + Vite SPA, **npm** (not pnpm). `npm run build` is the gate — strict TS, unused vars fail the build. No test suite exists.
- Multi-tenant via `ClientConfig` (`src/types.ts`), one file per brand in `src/clients/`, resolved from first URL path segment in `src/config/activeClient.ts`. Everything brand-specific flows from config — maintain this religiously. The Studio must work for any tenant with zero code changes.
- Image generation: `api/generate-yard-preview.ts` (Vercel serverless, also mounted as Vite dev middleware) → OpenAI Images API (`gpt-image-1.5` default; it supports `input_fidelity`, which the handler branches on — do not switch models). Prompt assembly in `src/utils/promptBuilder.ts`.
- Estimates: `src/utils/estimate.ts` sums per-option `[min,max]` tuples. The Studio needs a new sqft-based mode (section 5) — add alongside, don't break the existing one.
- Leads: `src/utils/leadPacket.ts` builds a structured object held **only in component state**. No persistence exists. Section 6 fixes this.
- Deploy: Vercel. `vercel.json` rewrites `/api/*` to functions, everything else to `index.html`.
- The design handoff is at `design_handoff_design_studio/` (`Waterloo Design Studio.dc.html` + `StepIndicator.dc.html` + `README.md` + assets). **Match the design files pixel-close; do not improvise from prose.** The design's dollar figures (e.g. $9,500–$17,500) are static mock values — the real range must recompute from sqft (section 5).

## Routing

- `/<slug>/studio` → Design Studio flow (new)
- `/<slug>` → existing funnel (unchanged)
- `/<slug>/demo` → existing tour (unchanged)
- Follow the existing second-segment pattern used by `isTourPath` in `App.tsx`.

## 1. Tenant Config Extensions (`src/types.ts` + `src/clients/waterloo.ts`)

Add an optional `studio` block to `ClientConfig`. Studio route 404s (or redirects to `/<slug>`) for tenants without it.

```ts
studio?: {
  enabled: boolean;
  incentive: { label: string; amount: number };   // "$500 off"
  packages: StudioPackage[];
  paverStyles: { id: string; label: string; swatchPath: string }[];
  designStyles: ("freeform" | "modern" | "surprise")[];
  puttingGreenSizes: { id: string; label: string; holes: string; sqftHint: string }[];
  ratesPerSqft: Record<string, [number, number]>;  // packageId → [$min, $max] per sqft
  minInvestment: number;                            // floor for tiny traces
  disclaimer: string;                               // "Final quote after free on-site measure"
  leadEmail: string;                                // where lead packets are sent
}

interface StudioPackage {
  id: string;
  name: string;              // "Golfer's Delight"
  description: string;
  items: string[];           // included-item chips
  promptDirectives: string;  // appended to render prompt — constrains to tenant products
  hasPuttingGreen: boolean;  // gates the putting-green size picker
}
```

Populate Waterloo's config with the six packages from the design (Green Essentials, Defined Green, Backyard Balance, Golfer's Delight, Total Backyard Retreat, Dealer's Choice). Rate values: use placeholder ranges clearly marked `// PLACEHOLDER — Bob to confirm` (e.g. essentials $6–$9/sqft up through dealer's choice $18–$30/sqft). Do not invent authoritative pricing.

## 2. Address Entry + Satellite Trace

### Google Maps integration
- New env var: `VITE_GOOGLE_MAPS_KEY`. This is a **new key** — do not reuse keys from other projects. Enabled on the key: Maps JavaScript API, Places API (New), Places API, Aerial View API; referrer-locked to localhost:5173, preview.abemedia.online, *.vercel.app. Load via `@googlemaps/js-api-loader` with `libraries: ["places", "geometry", "drawing", "marker"]`.
- If the key is missing at runtime, the trace step must degrade gracefully: show a static fallback message and let the user proceed to packages with sqft unknown (estimate shows "Requires on-site measure" instead of a range). The flow must never dead-end on a Maps failure.

### Address step
- Places Autocomplete on a single input, biased to US. On selection, geocode via the Places result (place geometry — do NOT call the separate Geocoding API), then transition to the trace step centered on the lat/lng, satellite map type, zoom ~20, tilt 0.

### Trace step (`src/studio/TraceMap.tsx`)
- Two modes: **TRACE** (main polygon) and **DEDUCT** (subtraction polygons for pools/patios/structures). Click/tap to place vertices; polygon closes on tapping first vertex or "Apply".
- Live sqft: `google.maps.geometry.spherical.computeArea(path)` → m² → sqft (×10.7639). Displayed sqft = trace area − sum(deduct areas), floored at 0, rounded to nearest whole.
- Undo (remove last vertex), clear-all, and the first-visit overlay tutorial per the design.
- Minimum 3 points before "Select Package" enables. Under 300 sqft or over 25,000 sqft → soft warning ("That looks small/large — you can adjust or continue").
- Persist to studio state: polygon paths (lat/lng arrays), net sqft, map center/zoom, and a **static snapshot** of the traced map (use `html2canvas` on the map container OR Maps Static API — prefer html2canvas since Static API is not enabled on the key) for the lead packet and PDF.

## 3. Package + Style Selection

- Package cards from `studio.packages` config. Single select. Selected card expands to show item chips (design handoff dictates visuals).
- Style pickers: design style (3 tiles), putting-green size (only when `hasPuttingGreen`), paver swatches from config.
- Optional photo upload tile — reuse the existing photo compression path in `src/services/imageGeneration.ts` (client-side ~1024px JPEG). 0–4 photos, all optional in the Studio flow.
- All selections into a single `StudioState` object (one reducer/context, serializable — it becomes the lead packet payload).

## 4. Lead Gate

- Fires on "Generate My Design". Blurred/teasing render-in-progress backdrop per design.
- Fields: name, email, phone. Validate email format and 10-digit phone. Consent microcopy line from config or default.
- **Start the render request in parallel with the gate being displayed** — kick off the API call when the gate mounts, so by the time the user submits contact info the render is finished or nearly finished. The reveal should feel instant.
- On submit: POST the full lead packet (section 6), then reveal the visualizer. If the lead POST fails, still show the render (never punish the user), retry the POST once in background, and log to console.

## 5. Render + Investment Range

### Render
- Reuse `api/generate-yard-preview.ts` and `promptBuilder.ts`. Extend the prompt builder with a studio path: base preservation instructions + `package.promptDirectives` + design style + putting-green size + paver style label + sqft context ("the yard area is approximately N square feet") + user notes if any.
- With uploaded photo(s): existing edits flow (per-photo before/after). Without photos: generation flow, and the "before" side of the slider shows the traced satellite snapshot.
- Product constraint is enforced by `promptDirectives` — every package's directives must mention only tenant products (turf, putting green, pavers, travertine, rock, patio cover, lighting, irrigation).

### Investment range (`src/utils/studioEstimate.ts` — new file)
- `sqft × ratesPerSqft[packageId]` → `[min, max]`, rounded to nearest $250, floored at `minInvestment`. Must recompute whenever sqft or package changes — the design's dollar figures are static mocks.
- If sqft unknown (Maps failed / trace skipped) → "Requires on-site measure".
- Reuse `formatCurrency` from `estimate.ts`. Do NOT modify `calculateBudgetRange` — the old funnel depends on it.

### Visualizer screen
- Before/after slider (pattern exists in the tour's reveal step — reuse/extract it).
- **View modes** (the design handoff implements these as a toggle row — follow its placement): Slider (default), Curtain reveal, **Cinematic tour** (slow Ken Burns zoom toward image center, CSS transforms, ~20s loop — this IS the "Tour"; do not build a separate fullscreen tour), and Property Flyover (section 7b, only when available).
- Save (download after image), Email (POSTs lead packet flag `emailRenderRequested: true` — the server emails it), Book My Free Consultation (Cal.com embed — `@calcom/embed-react` is already a dependency; Cal link comes from config, hide button if absent).
- Investment range block + disclaimer + discount-locked confirmation state per design.

## 6. Lead Persistence + Delivery (closes the leadPacket TODO)

### New serverless function: `api/studio-lead.ts`
- POST body: full `StudioState` lead packet — contact, address, lat/lng, net sqft, polygon paths, package id + name, style selections, investment range, render image URLs (or omit if too large — include a flag), traced-map snapshot (data URL, compressed), timestamps, tenant slug.
- Two actions, both must succeed independently (failure of one must not block the other):
  1. **Persist**: insert into Supabase table `studio_leads` (service-role key, server-side env vars `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`). Write the migration SQL to `supabase/migrations/` in this repo (create the dir): id uuid pk, tenant_slug text, name text, email text, phone text, address text, lat float8, lng float8, sqft int, package_id text, package_name text, selections jsonb, investment_min int, investment_max int, snapshot_url text nullable, created_at timestamptz default now(). RLS: service role only.
  2. **Email**: send the lead packet to `studio.leadEmail` via Resend (`RESEND_API_KEY`, from address configurable via `STUDIO_FROM_EMAIL`). Inline HTML: contact block, address + sqft, package + selections, investment range, embedded snapshot image, timestamp. Subject: "New Design Studio Lead — {name} — {package}".
- Rate limit: naive in-memory per-IP guard (10/min) is fine for Phase 1.
- **CRM integration is explicitly out of scope for Phase 1** — Bob's CRM is unconfirmed. The email + Supabase row is the delivery mechanism. Leave a clearly marked adapter seam (`deliverToCrm(lead)` no-op with TODO) for Phase 2.

## 7. Feature Flag: EagleView (stub only)

- Add `studio.imagerySource?: "google" | "eagleview"` to config, default `"google"`.
- Create `src/services/imagerySource.ts` exporting a single `getAerialView(lat, lng)` interface with only the Google implementation. Add an `eagleview` case that throws `"not configured"`.
- Do NOT port `eagleviewService.ts` from insta-lawn-quote yet — pricing/licensing unresolved until the EagleView call (Wed Jul 15). The seam is the deliverable, not the integration.

## 7b. Property Flyover: Google Aerial View API (feature-flagged)

Cinematic 3D drone-style flyover of the customer's actual property, shown alongside the AI render. Differentiator vs the competitor's fake pan-zoom "tour". Flag: `studio.flyoverEnabled?: boolean` (default true for Waterloo).

### Service: `src/services/aerialFlyover.ts`
- Uses the same `VITE_GOOGLE_MAPS_KEY` (Aerial View API is enabled on the key).
- Flow (client-side, REST):
  1. `GET https://aerialview.googleapis.com/v1/videos:lookupVideoMetadata?address={address}&key=...` — check if a video exists.
  2. If state ACTIVE → `GET /v1/videos:lookupVideo?address=...` → returns video URIs (MP4/HLS). Embed and play.
  3. If not found → `POST /v1/videos:renderVideo` with the address, then poll `lookupVideoMetadata` every ~15s. Rendering can take minutes — do NOT block anything on it.
- Kick off the lookup as soon as the address is confirmed (step 02), in the background. By the visualizer screen, the video is usually ready or confirmed unavailable.
- Videos are **display-only per Google TOS** — embed/stream only, never download, store, or put in the lead PDF/email.

### UI
- Visualizer adds "Property Flyover" to the existing view-mode toggle row (Slider / Curtain reveal / Cinematic tour) — video player replaces the slider area when selected.
- Flyover tab renders ONLY if metadata came back ACTIVE. No video / still rendering / API error → tab simply absent. Never show a spinner-that-might-never-resolve to the customer; if a render was requested and completes later in the session, the tab can appear.
- The Cinematic tour remains as the fallback "Tour" experience and still ships regardless.

### Acceptance additions
- [ ] Address with existing Aerial View coverage → flyover tab appears and plays
- [ ] Address without coverage → tab absent, zero user-facing errors, rest of flow unaffected
- [ ] Flyover disabled via config flag → no Aerial View API calls at all

## 8. Constraints

- **npm, not pnpm** in this repo.
- **No secrets in client code.** Maps key is a referrer-locked `VITE_` var (acceptable, standard for Maps JS); OpenAI/Supabase/Resend keys are server-side only. Update `.env.example` with all new vars.
- **Do not break** the existing funnel, tour, PDF generation, or any other tenant's route. `activeClient.ts` fallback behavior unchanged.
- **Do not call** Geocoding API, Distance Matrix, or Static Maps API — not enabled on the key. Use Places result geometry and html2canvas snapshot instead.
- Config-driven everywhere: no Waterloo-specific strings, colors, packages, or rates outside `src/clients/waterloo.ts`.
- Match the design handoff visually; keep studio styles in a separate `src/studio.css` (pattern: `tour.css`).
- TS strict: no unused vars (build fails otherwise).

## 9. Files

**New:**
- `src/studio/` — `StudioFlow.tsx` (step machine), `AddressStep.tsx`, `TraceMap.tsx`, `PackageStep.tsx`, `StyleStep.tsx`, `LeadGate.tsx`, `Visualizer.tsx`, `CinematicTour.tsx`, `studioState.ts`
- `src/services/aerialFlyover.ts`
- `src/utils/studioEstimate.ts`
- `src/services/imagerySource.ts`
- `api/studio-lead.ts`
- `supabase/migrations/<timestamp>_studio_leads.sql`
- `src/studio.css`

**Modify:**
- `src/types.ts` — `studio` block on ClientConfig
- `src/clients/waterloo.ts` — populate studio config (rates as marked placeholders)
- `src/App.tsx` — `/studio` second-segment routing (alongside `isTourPath`)
- `src/utils/promptBuilder.ts` — studio prompt path
- `.env.example`, `package.json` (add `@googlemaps/js-api-loader`, `resend`, `@supabase/supabase-js`, `html2canvas` if not present transitively)
- `vite.config.ts` — mount `api/studio-lead.ts` in the dev middleware alongside the existing handler

**Do not modify:** `src/utils/estimate.ts` logic (additive only), `src/tour/*`, other client configs, `api/generate-yard-preview.ts` behavior for the existing funnel.

## 10. Acceptance Criteria

- [ ] `/waterloo/studio` runs the full flow; `/waterloo` and `/waterloo/demo` unchanged
- [ ] Address autocomplete → satellite map centered on the property
- [ ] Trace + deduct polygons produce a live, correct sqft (spot-check against a known property)
- [ ] Package/style selections gate correctly (putting-green size only for putting-green packages)
- [ ] Lead gate blocks the reveal; render kicks off in parallel; reveal is fast post-submit
- [ ] Lead POST persists a `studio_leads` row AND sends the email; either failing doesn't block the user's reveal
- [ ] Investment range = sqft × package rates, rounded, floored, with disclaimer; recomputes on sqft/package change; "Requires on-site measure" when sqft unknown
- [ ] Slider, Curtain reveal, and Cinematic tour work with and without uploaded photos
- [ ] Maps key missing → flow degrades, never dead-ends
- [ ] No financial rates, API keys, or tenant lead emails exposed beyond what's necessary client-side (rates in the JS bundle are acceptable Phase 1; keys are not)
- [ ] A second tenant with a `studio` block works at `/<slug>/studio` with zero code changes (prove with a throwaway config, then remove it)
- [ ] `npm run lint` and `npm run build` pass
