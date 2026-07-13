# Handoff: Waterloo Turf — Design Studio (Phase 1)

## Overview
The **Design Studio** is a consumer-facing, mobile-first lead-generation flow for Waterloo Turf. A homeowner enters their address, traces their yard on satellite imagery, picks a design package and style, and — after a lead-capture gate — unlocks an AI before/after visualization with an investment range. The goal is to beat the competitor "GFA Visualizer" on rendering quality, on a lead-gate that unlocks something visibly premium, and on warm, on-brand execution (Waterloo greens/gold/cream, not a dark neon theme).

This is one continuous guided flow of **7 screens** with a slim step indicator (01–06).

## About the Design Files
The files in this bundle are **design references created in HTML** — working prototypes that show the intended look, layout, copy, and interaction behavior. They are **not production code to copy directly.**

The `.dc.html` files are "Design Components": a single-file format with three parts — an HTML template, a `class Component` logic class (React-class-like: `state`, `setState`, `renderVals()` returns the template's data/handlers), and a `data-props` JSON block. All styling is **inline** in the template. Read them for exact structure, values, copy, and state logic — then **recreate the designs in the target codebase's environment** (React, Vue, SwiftUI, native, etc.) using its established components, routing, and patterns. If no environment exists yet, pick the most appropriate framework and implement there.

All integrations are **mocked visually** and must be wired for real by the developer: Google Maps (satellite + polygon), the AI render, address autocomplete, and CRM/email lead delivery.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, and interactions are all specified. Recreate the UI faithfully using the codebase's existing libraries and patterns. Exact hex values, fonts, and measurements are listed under **Design Tokens**.

## Tenant configuration (important)
This is multi-tenant by design. All package / style / pricing / address / copy content lives in a single commented block — the `cfg = { … }` object at the top of the logic class in `Waterloo Design Studio.dc.html` (marked **"TENANT CONFIG — dev will externalize"**). Externalize this to a per-tenant config source (JSON/API). Nothing tenant-specific should be hardcoded in components. Brand tokens (colors, logo, footer image, phone) also come from tenant config in the source app — see `src/clients/waterloo.ts` in the original `odphineguy/waterloo_ai_demo` repo.

---

## Screens / Views

### 01 — Landing / Start
- **Purpose:** Sell the value, start the flow.
- **Layout:** Two-column on desktop (flex-wrap, `gap: clamp(28px,4vw,56px)`), stacks on mobile. Left = copy; right = hero image card. Max width 1120px, centered.
- **Components:**
  - Incentive badge: pill, bg `#fff6df`, border `#f0d789`, text `#8a6a10`, 13px/800. Copy: "✦ $500 off unlocked at the end" (amount is a token).
  - H1: `clamp(34px,5.2vw,56px)`, weight 900, line-height 1.04, letter-spacing -.02em, color `#16241a`; second clause colored `#2f7339`. Copy: "See your yard transformed — before we ever visit."
  - Subhead: `clamp(16px,2vw,20px)`, color `#48524a`. "Trace your yard, pick your style, and get an instant AI preview with a real budget range."
  - Primary CTA: green pill, bg `#2e8050`, white, 17px/800, radius 999px, padding 16px 34px, shadow `0 14px 30px rgba(46,128,80,.28)`; hover `translateY(-2px)`. Copy: "Design My Yard →".
  - Trust line: `#6a746a`, 14px. "✓ Free · about 2 minutes · no obligation".
  - Hero card: rounded 20px, shadow `0 30px 60px rgba(21,45,25,.22)`, the after image (`studio-after.png`) `object-fit:cover`, "AI Preview" chip top-left, caption gradient overlay bottom.

### 02 — Address entry
- **Purpose:** Capture address; look up satellite view.
- **Layout:** Centered single column, max width 560px.
- **Components:**
  - H2 "Where's your yard?" `clamp(26px,3.6vw,34px)`/900. Helper "We'll pull up a satellite view of your property."
  - Text input: border `1.5px #c3ccbd`, radius 14px, padding `18px 18px 18px 46px`, 17px, leading ◉ glyph; focus border `#2f7339` + ring `0 0 0 4px rgba(47,115,57,.14)`.
  - Autocomplete dropdown: appears on focus when matches exist. Card radius 14px, shadow `0 16px 34px rgba(21,45,25,.12)`; each row has a `#e4f0df`/`#2f7339` icon tile, line1 (15px/800 `#16241a`) + line2 (13px `#6a746a`); hover bg `#f4f8f0`.
  - **Empty state (address not found):** shows when query length > 3 and no suggestion matches. Amber card (bg `#fff7e0`, border `#f1d481`) with "Continue anyway →" button (proceeds using typed text).
- **Mock:** Suggestions come from `cfg.addressSuggestions` (3 Phoenix addresses). Replace with a real Places autocomplete.

### 03 — Site measurement (trace)
- **Purpose:** Measure the yard area by tracing a polygon on satellite imagery.
- **Layout:** Two columns (flex-wrap): map surface `flex: 2 1 380px`; control panel `flex: 1 1 250px`. Panel wraps below map on mobile.
- **Map surface:** **Square** container (`aspect-ratio: 1/1`, `max-width: min(100%,620px)`, centered), radius 16px, `cursor: crosshair`. The satellite image (`aerial-phoenix.png`, a square Google aerial) fills it via `object-fit: cover` — the square container matches the square image so nothing is cropped. Behind the image is a CSS "aerial mock" fallback (used only if no image). Map chrome: "N" compass (top-right), scale bar "20 ft" (bottom-left), caption "Satellite imagery" (bottom-right).
  - **Polygon rendering:** an SVG (`viewBox 0 0 100 100`, `preserveAspectRatio none`) draws the trace polygon (fill `rgba(47,115,57,.22)`, stroke `#3fae63`, dashed, `stroke-width:2.5px`) and the deduct polygon (fill `rgba(204,60,40,.24)`, stroke `#ff6a4d`). Vertices are absolutely-positioned 14px HTML dots (trace = gold `#e4b83d`, deduct = red `#ff6a4d`, 2px white border) so they stay circular independent of the SVG's non-uniform scale.
  - **First-visit tutorial overlay:** dark scrim + animated dashed-polygon SVG illustration + "Tap the corners of your yard" + "Got it — start tracing" button. Dismissed on first tap or button click; blocks point-adds while showing.
- **Control panel:**
  - Mode segmented toggle: **✎ Trace** (active) / **⊖ Deduct** (pools, patios, structures). Active = bg `#2e8050` white; inactive = transparent `#5a645a`.
  - Area counter card: bg `#183820`, white. Label "AREA MEASURED" (uppercase, `rgba(255,255,255,.6)`), value `clamp(42px,8vw,58px)`/900 (e.g. "2,053"), unit "square feet" `#9fd3ac`. **The number tweens/ticks up** on every point change (cubic ease-out, ~480ms).
  - Undo (removes last point of active mode) and Clear (resets both polygons) — white buttons, border `#cdd6c6`.
  - **Edge state (under 3 points):** amber hint "Add at least 3 points to close your yard outline." Primary CTA "Select Package →" is disabled until `points.length >= 3`.
- **Mock:** Map interaction is mocked. The panel, counter, mode logic, undo/clear, and area math are real and should be preserved. Swap the surface for live Google Maps + a real polygon-draw; feed real polygon vertices into the same area logic.
- **Area math:** normalized shoelace area of the trace polygon minus the deduct polygon, multiplied by `cfg.realArea` (currently `8200` ft² — the real-world footprint the aerial view represents). With live Maps, replace this with true geodesic area from the map's projection.

### 04 — Design package
- **Purpose:** Choose one of six packages.
- **Layout:** Header (measured sqft badge + "Choose your design package"), then a responsive grid: `repeat(auto-fill, minmax(min(100%,320px), 1fr))`, gap 16px.
- **Cards:** bg white, radius 16px, padding 20px. Unselected border `2px #e4ebdd`; **selected** border `2px #2e8050` + shadow `0 16px 34px rgba(46,128,80,.16)`. Header row = name (19px/900) + item-count chip. **On select the card expands** (animated) to show included-item chips (`#eef3ea`/`#20502c` pills) and a "✓ Selected" line.
- **Packages (from `cfg.packages`):** Green Essentials (1 item), Defined Green (3), Backyard Balance (3), Golfer's Delight (4, has putting green), Total Backyard Retreat (5), Dealer's Choice (6, has putting green). Names, descriptions, chips, `hasPutting`, and estimate ranges are all config-driven.
- CTA "Choose Your Style →" disabled until a package is selected.

### 05 — Style pickers
- **Purpose:** Refine the render. All optional.
- **Components:**
  - **Design style** tiles (3, `auto-fit minmax(150px)`): Freeform / Modern / Surprise Me, each with an inline SVG icon (icon path in config). Selected tile border `2px #2e8050`, icon stroke `#2e8050`.
  - **Putting green size** (conditional — only renders when the selected package has `hasPutting: true`): Practice (1–2 holes) / Club (2–3) / Tour (3–5).
  - **Paver style** swatches (6, `auto-fit minmax(130px)`): Slate, Townscape Native, Tierranorte, Territorial, Victorian, Rio. Each swatch is a 64px tile with a CSS brick texture over a per-style gradient (`cfg.paverStyles[].tone`); selected shows a green ✓ badge. Replace tones with real paver texture photos in production.
  - **Photo upload** tile (optional): dashed dropzone (border `#99ad90`, tinted bg), real `<input type=file>`; on select shows "✓ {filename}". Skippable — improves the render.
  - CTA "Generate My Design →" — gold button (bg `#e4b83d`, ink text, radius 999px, shadow `0 14px 30px rgba(228,184,61,.3)`).

### 06 — Lead gate ("Almost there")
- **Purpose:** Capture the lead before revealing the design. Tone = unlock, not toll-booth.
- **Layout:** Full-bleed section (`min-height:70vh`). Background = the after image **blurred** (`blur(22px) brightness(.82) scale(1.15)`) + dark gradient + an animated diagonal **shimmer** sweep (`wtShimmer`, 2.1s). Centered white card, max width 460px, radius 20px, shadow `0 40px 80px rgba(0,0,0,.4)`, entrance `wtRise`.
- **Card:** spinner (`wtSpin`) + "Your design is rendering…" / "Unlock it below to see the reveal." Discount pill "✦ $500 off locks to this design." Three inputs: Full name, Email, Phone. Consent microcopy. Submit "Show My Design + Claim $500 Off" — gold when all three fields filled, disabled/gray otherwise.
- **Edge state ("taking longer than usual"):** after ~3.8s a `setTimeout` sets `slowRender`, showing an amber line "Still working — a high-res render can take a moment longer than usual. Hang tight."
- **Mock:** Submitting just advances to the reveal and sets `discountClaimed`. Wire the three fields to the CRM/email; gate the reveal on a real submit; drive the "rendering" state from the actual render job.

### 07 — Visualizer (the payoff)
- **Purpose:** Reveal the before/after, show the investment range, drive the consultation booking.
- **Layout:** Optional green "You're in, {firstName} — $500 off is locked to this design." confirmation banner (shown when `discountClaimed`). Then two columns (flex-wrap): visual `flex: 2 1 400px`; summary panel `flex: 1 1 280px`.
- **Before/after visual:** container radius 18px, `cursor: ew-resize`, `touch-action: none`. After image is the base; before image overlays it, clipped via `clip-path: inset(0 {100-pos}% 0 0)`. **Both images use `object-fit: contain`** (identical fit) so the baked-in Waterloo watermark on the after image is never cropped and the two stay 1:1 through the wipe. BEFORE/AFTER labels top corners. Draggable handle: 3px white line + 44px round grabber (↔) at `left: {pos}%`. Drag via pointer events on the container.
  - **Reveal variations** (segmented control below the image):
    - **Slider** — manual drag, handle at 50%.
    - **Curtain reveal** — auto-animates the wipe from 100→0 (~1.6s cubic ease-out), then hides the handle.
    - **Cinematic tour** — opens a fullscreen takeover: after image with a slow **Ken Burns** pan/zoom (`wtKen`, 14s ease-in-out alternate), gradient caption (package · sqft · investment), close ✕.
- **Summary panel:**
  - Package card: name + included-item chips + a row of "{sqft} sqft · {style} · {paver} pavers".
  - **Investment card:** bg `#183820`, white. "ESTIMATED INVESTMENT" + range `clamp(28px,5vw,38px)`/900 (e.g. "$11,500 – $22,500", from `cfg.packages[].est`) + disclaimer "Final quote after your free on-site measure. $500 off applied at booking." **This is the only place any price is shown.**
  - Action row (2×2): **Save**, **Email**, **▶ Tour**, **Start over** — white buttons. Save/Email/Book fire a transient toast (mocked).
  - Primary CTA **Book My Free Consultation** — green, full width.

---

## Interactions & Behavior
- **Navigation:** single-page state machine on `state.step` (`landing → address → trace → package → style → gate → reveal`). Each transition scrolls to top. Recreate as routes or a wizard/stepper in the target app.
- **Step indicator:** `StepIndicator.dc.html` — a reusable component taking a `current` prop (1–6). Steps: 01 Address, 02 Measure, 03 Package, 04 Style, 05 Details, 06 Design. Past steps = filled green with ✓; current = gold with ring; future = muted. Shown on every screen except the landing.
- **Trace:** tap adds a normalized `{x,y}` point to the active mode's array; area recomputes and the counter tweens; Undo pops, Clear resets.
- **Animations (keyframes in the template `<helmet>`):** `wtFade`/`wtRise` (screen/card entrances), `wtShimmer` (gate), `wtSpin` (spinner), `wtKen` (tour), `wtPulse`, `wtToast`, `wtTut` (tutorial dashes). Durations/easings noted per component above.
- **Responsive:** no media queries — layout uses flex-wrap, CSS grid `auto-fit/auto-fill minmax(min(100%, …))`, and `clamp()`. Works from 380px up. Preserve this behavior (or map to the codebase's responsive system).

## State Management
Key state (see the logic class): `step`; `addressQuery`, `selectedAddress`, `addrFocused`; `mode` ('trace'|'deduct'), `points[]`, `deducts[]`, `displaySqft`, `showTutorial`; `selectedPackage`; `designStyle`, `puttingSize`, `paverStyle`, `photoName`; `lead {name,email,phone}`, `slowRender`; `revealVariant` ('slider'|'curtain'|'tour'), `sliderPos`, `showHandle`, `tourActive`, `discountClaimed`; `toast`.
Data fetching to add: address autocomplete, satellite tiles + polygon area, AI render job (with progress), lead submission to CRM/email.

## Design Tokens
**Colors:** green-900 `#183820`, green-800 `#20502c`, green-700 `#2f7339`, primary green `#2e8050`, green-100 `#e4f0df`, gold `#e4b83d`, gold-dark `#b88c16`, ink `#172118` / `#16241a`, muted `#667066` / `#6a746a` / `#8a938a`, line `#dbe3d5` / `#e4ebdd` / `#c3ccbd`, page bg `#f6f8f3`, surface `#ffffff`. Amber (warnings/incentive): bg `#fff7e0`/`#fff6df`, border `#f1d481`/`#f0d789`, text `#8a6a10`/`#6e5105`. Trace polygon: `#3fae63` / fill `rgba(47,115,57,.22)`; deduct: `#ff6a4d` / fill `rgba(204,60,40,.24)`.
**Typography:** Inter (400–900), loaded from Google Fonts. H1 `clamp(34px,5.2vw,56px)`/900; H2 `clamp(26px,3.6vw,36px)`/900; body 14–17px; big numerics 900.
**Radius:** inputs 11–14px; cards 16px; visual 18px; hero 20px; pills 999px.
**Shadows:** card `0 6px 16px rgba(21,45,25,.05)`; raised `0 14px 30px rgba(21,45,25,.18)`; hero `0 30px 60px rgba(21,45,25,.22)`; modal `0 40px 80px rgba(0,0,0,.4)`.
**CTAs:** green pill `#2e8050`/white; gold `#e4b83d`/ink; hover lift `translateY(-1px/-2px)`.

## Assets (in `assets/`)
- `logo.png` — Waterloo Turf armadillo logo (rendered with a drop-shadow on the turf-image header). Header uses `filter: drop-shadow(...)`; footer variant in the source uses `brightness(0) invert(1)`.
- `footer-turf-premium.png` — turf photo used as the header/footer background under a dark green overlay.
- `studio-before.png` / `studio-after.png` — the before (dry/patchy lawn) and after (installed turf) renders. **The after has the Waterloo watermark baked into the bottom-right** — keep both images at the same fit (`contain`) so it's never cropped and the slider stays 1:1.
- `aerial-phoenix.png` — square Google satellite aerial used as the trace underlay (mock; replace with live Maps). Exposed in the design as the tweakable `aerialSrc` prop.
Provenance: brand assets + before/after/aerial come from the client demo (`odphineguy/waterloo_ai_demo`) and user-provided renders. Use the tenant's real brand assets in production.

## Files
- `Waterloo Design Studio.dc.html` — the entire 7-screen flow (template + logic + `TENANT CONFIG` block + `aerialSrc` prop).
- `StepIndicator.dc.html` — reusable 01–06 step indicator (`current` prop).
- `assets/` — images listed above.

To preview a `.dc.html` file, open it directly in a browser (it self-loads its runtime). Treat it as a reference for values and behavior, not as code to ship.
