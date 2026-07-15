# Decisions

Newest on top. Settled questions — don't relitigate without new information.

## 2026-07-14 — Studio editor consolidation (dark header / glass sqft / merged step)

- **One dark header across the whole studio flow** — deleted the white app-bar override
  for working steps; stepper restyled for dark (active = bright green glow, upcoming =
  muted gray-green). No white-to-dark snap anywhere.
- **Package + Style merged into one editor step** over the LIVE traced map: TraceMap now
  stays mounted through the merged step with `readOnly` + `railContent` props; the map
  keeps its instance/polygons and is dimmed by a click-swallowing `.studio-map-dim` veil.
  `EditorRail.tsx` holds the packages/style/paver pickers + sticky estimate footer and
  dispatches the SAME reducer actions the two deleted pages (PackageStep, StyleStep)
  dispatched — `StudioState` shape and the lead packet are unchanged (verified: live
  e2e produced a correct `studio_leads` row with 2 trace areas; test row deleted after).
  `StudioStepId` dropped `"style"`; indicator is now 5 steps.
- **`.studio-shell--canvas` (height: 100dvh, overflow hidden) on trace + package steps.**
  Root-cause fix found during browser verification: rail content taller than the viewport
  stretched the flex layout, growing the live map to ~1200px so the visible viewport
  showed only its top slice (looked like a remounted/panned map). Viewport-bounding the
  shell makes rails scroll internally. Latent on the old trace step too.
- **Retired with the merge (per the spec's exact rail contents):** the putting-green
  size picker (prompt now always uses the config default size for putting packages) and
  the yard-photo upload on the style step (`state.photos` stays `[]`; studio renders use
  the traced snapshot as "before"). State fields remain so downstream code is untouched;
  easy to re-add to EditorRail if wanted.
- **Rejected:** using the html2canvas snapshot as a static editor background (spec
  explicitly required the same live map instance); remount-per-step (loses map state);
  per-card "Requires on-site measure" labels when sqft is unknown (noise — the sqft
  chip and footer already say it once).
- **Mobile merged step** = full-screen dimmed canvas + draggable bottom sheet
  (peek 45%, drag range 30–88%, pointer-capture on the grip), Continue pinned in the
  sheet's sticky footer. Verified at 390×844.

## 2026-07-13 — Studio fix round 1 (alignment, location bias, Cal link)

- **Before/after alignment:** `.studio-compare` is now a fixed 3:2 container and both
  images use `object-fit: cover` (was `contain`), so pairs align 1:1 through the wipe in
  Slider/Curtain (Cinematic tour already used cover). The client sends each compressed
  photo's width/height and `api/generate-yard-preview.ts` picks the OpenAI output size
  (1536×1024 / 1024×1024 / 1024×1536) with the closest aspect ratio per image — verified
  in-browser: a 1212×1024 upload produced a 1024×1024 render, both boxes identical.
  Clients that send no dimensions keep the old 1536×1024 default (funnel unaffected).
- **`studio.locationBias`** (lat/lng/radiusMeters) biases Places autocomplete; Waterloo
  set to Phoenix metro (33.4484, −112.074, 50 km) — Phoenix results now rank first.
- **Consultation button** renders only when a tenant's real Cal.com link is explicitly
  set in `studio.bookingUrl`; Waterloo's placeholder (Abe's personal link) removed.
- **Resend key (user-added) is test-mode:** it can only deliver to the account owner's
  own address until a domain is verified at resend.com/domains and `STUDIO_FROM_EMAIL`
  uses that domain; sends to `studio.leadEmail` fail until then.

## 2026-07-13 — Design Studio Phase 1 (DESIGN_STUDIO_SPEC.md)

**Decision:** Built the full studio funnel per spec + design handoff; all screens recreated
from `design_handoff_design_studio/` as React components with classes in `src/studio.css`.

Implementation choices and divergences, with reasons:

- **StudioFlow is lazy-loaded** (`React.lazy` in App.tsx). `styles.css` lists Inter first in
  its font stack but the app never loaded it — importing Inter globally (design requires
  Inter 400–900) would have silently changed the existing funnel's typography. The studio
  chunk (Inter via `@import` in studio.css, Maps loader, html2canvas) now only loads on
  `/<slug>/studio`. Rejected: adding Inter to index.html (would restyle every tenant's funnel).
- **Design token `green-700` (#2f7339) maps to `--st-primary`** (client.colors.primary,
  #2e8050 for Waterloo). ClientConfig has no separate green-700 slot and config-purity
  outranks a near-invisible shade difference on links/icons. Brand-tinted shadows use
  `color-mix(...)` so they follow tenant colors.
- **Live-map polygons use solid strokes.** google.maps.Polygon doesn't support dashed
  strokes (the design shows dashes). The dashed look is preserved where it matters most —
  the tutorial overlay SVG. Rejected: Polyline icon-dash hack (complexity, perf).
- **Classic `google.maps.Marker` for vertex dots** (deprecation *warning* in console).
  AdvancedMarkerElement requires a `mapId`, which the key/config doesn't have; classic
  Marker is supported indefinitely for existing behavior. Revisit if Google schedules removal.
- **Paver swatches are generated SVGs** (`public/images/studio-pavers/*.svg`) matching the
  design's gradient tones + brick pattern, so `paverStyles[].swatchPath` stays a plain
  config-driven image path any tenant can override with real product photos.
- **Deducts are multiple polygons** (spec) though the design mocked one: tapping the first
  vertex of the active deduct closes it and starts a new one; Undo reopens the last closed.
- **Env vars read via a `getEnv` guard** in api/studio-lead.ts: the Vite dev middleware's
  `process.env.X ||= env.X` coerces missing vars to the string `"undefined"` (same trap
  api/generate-yard-preview.ts guards against). Found via runtime test — Resend was being
  called with the literal key "undefined".
- **Email action semantics (Phase 1):** the "Email" button re-POSTs the lead packet with
  `emailRenderRequested: true`; the server emails the *tenant* (render images are omitted
  from the packet per spec — too large). Emailing the render directly to the customer
  (compress one after-image client-side into the packet) is a good Phase 2 upgrade.
- **Render failure UX:** one automatic retry; if both attempts fail the visualizer still
  reveals (estimate, booking CTA, saved-details message) — the customer is never dead-ended
  and the lead is already captured.
- **Cinematic tour uses the design's 14s alternate Ken Burns** (design file wins over the
  spec prose's "~20s loop").
- **`studio.bookingUrl`** points at the existing Cal.com link (`cal.com/abe-p-698781/walkthrough`)
  reusing the tour's embed pattern (namespace `studio`).
- **Rates are placeholders** (`// PLACEHOLDER — Bob to confirm`): essentials $6–9/sqft up to
  dealer's choice $18–30/sqft, `minInvestment` $4,500.

**Constraints / open items:**

- **Supabase migration not applied.** `.env`'s project (`sypqfpfkymproolyebon`) is not
  reachable from the MCP- or CLI-authenticated Supabase accounts in this environment, and
  applying it required a permission the session didn't have. Run
  `supabase/migrations/20260713000000_studio_leads.sql` in that project's SQL editor (or
  grant access and ask Claude to apply it). Until then the endpoint logs
  "Could not find the table 'public.studio_leads'" and skips persistence gracefully.
- **RESEND_API_KEY not set** — email delivery skips gracefully until configured
  (`STUDIO_FROM_EMAIL` optional; defaults to `onboarding@resend.dev`).
- **`npm run lint` has 2 pre-existing errors** in `src/tour/GuidedTour.tsx` and
  `src/tour/tourConfig.ts` (new react-hooks rules from "latest" plugins) — verified present
  on clean main before this work, and `src/tour/*` is spec-protected ("do not modify").
  The studio code itself lints clean; `npm run build` (the real gate) passes.
- **html2canvas snapshot of Maps tiles** can fail (tainted canvas) on some browsers; the
  snapshot is nullable everywhere (lead packet, email, before-slide falls back gracefully).
  Worked in Chromium during verification.
- **EagleView** is a seam only (`imagerySource.ts` throws "not configured") — pricing call
  Wed Jul 15. **CRM delivery** is a no-op seam (`deliverToCrm`) — Bob's CRM unconfirmed.
