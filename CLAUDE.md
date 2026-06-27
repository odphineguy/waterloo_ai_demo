# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React + TypeScript + Vite single-page app that runs an "AI visual estimate" funnel for landscaping/turf companies. A customer enters contact info, picks approved project options, optionally uploads 1–4 yard photos, and the app calls OpenAI's Images API (through a server-side route) to render before/after concept previews, shows a preliminary budget range, and produces a branded PDF estimate.

It is **multi-tenant from one codebase**: several branded "client" demos are served from the same build, selected by URL path.

## Commands

```bash
npm run dev      # Vite dev server; also serves /api/generate-yard-preview (see below)
npm run build    # tsc -b (typecheck, project refs) then vite build -> dist/
npm run lint     # eslint . (flat config in eslint.config.js)
npm run preview  # serve the built dist/
```

There is no test suite. `npm run build` is the real gate — TypeScript is `strict` with `noUnusedLocals`/`noUnusedParameters`, so unused vars fail the build, not just lint.

## Environment

Server-side only (never exposed to the browser):
- `OPENAI_API_KEY` — required for image generation.
- `OPENAI_IMAGE_MODEL` — defaults to `gpt-image-1.5` (code default in `api/generate-yard-preview.ts`; `.env.example` and the README match). Note: `gpt-image-2` does **not** support `input_fidelity`, and the handler branches on this (`supportsInputFidelity`).
- `VITE_AI_PREVIEW_ENDPOINT` — client-side override for the API path; defaults to `/api/generate-yard-preview`.

`.env` is gitignored; `.env.example` is the template.

## Architecture

### Multi-tenant client config (the core abstraction)

The active brand is chosen at runtime from the **first URL path segment**:
- `src/config/activeClient.ts` — `getActiveClient(pathname)` reads the first segment, looks it up in the `clients` map by `slug`, and falls back to `waterlooClient`. `/` and any unknown slug → Waterloo.
- `src/clients/*.ts` — one file per brand, each exporting a `ClientConfig`. `template.ts` is the starting point / generic demo.
- `src/types.ts` — `ClientConfig` is the single source of truth for everything brand-specific: company name, colors, logo paths, nav/footer links, project options, per-option estimate ranges, PDF copy, etc.

To add a brand: copy `src/clients/template.ts`, edit the config (give it a unique `slug`), import it in `activeClient.ts`, and add it to the `clients` map. It is then live at `/<slug>` locally and on Vercel. No other code changes are needed — App, theming, prompt, estimate, and PDF all read from `ClientConfig`.

Theming is driven by config, not per-brand CSS: `App.tsx` sets CSS custom properties (`--green-700`, `--gold`, `--footer-image`, etc.) inline on the root `.app-shell` from `client.colors`, and also adds a `client-<slug>` class for any brand-specific overrides in `styles.css`.

### Image generation flow

1. `src/App.tsx` (`handleGeneratePreview`) validates contact fields + ≥1 project option, then calls `generateYardPreview`.
2. `src/services/imageGeneration.ts` builds the prompt (`utils/promptBuilder.ts`), **compresses uploaded photos client-side** to ~1024px JPEG data URLs, and POSTs `{ prompt, projectOptions, notes, images }` to the preview endpoint.
3. `api/generate-yard-preview.ts` (Vercel serverless function, `maxDuration: 60`) calls OpenAI:
   - **No photos** → `/v1/images/generations`.
   - **With photos** → one `/v1/images/edits` call **per uploaded image** (in parallel), so N input photos produce N before/after pairs. Each edit prompt pins the original camera angle.
   Returns base64 → `data:image/png;base64,...` URLs.

The same handler runs in dev and prod. `vite.config.ts` registers an `apiDevServer()` plugin that mounts the exact `api/generate-yard-preview.ts` default export as Vite middleware, shimming `res.status()/res.json()`. So `npm run dev` exercises real OpenAI calls — there is no mock.

### Prompt construction

`src/utils/promptBuilder.ts` assembles the image prompt from a base instruction (preserve house/structure/camera angle, redesign only the landscape), keyword-matched per-option direction (front/back/sport/putting/pet/paver/rock/etc.), customer notes, and a fixed constraints list. Option matching is by substring on the option label, so option wording in client configs affects the generated guidance.

### Estimate ranges

`src/utils/estimate.ts` (`calculateBudgetRange`) sums the per-option `[min, max]` tuples from `client.estimateRanges`. Any option whose range is `"review"` (or missing, or summing to 0) flips the whole estimate to `"Requires review"`.

### PDF generation

Entirely client-side in `App.tsx` (`handleDownloadEstimate`) using `jspdf` (dynamically imported). It renders before/after image pairs, customer/estimate metadata, terms, and the budget range onto a Letter-size doc, drawing logo/images via canvas conversion helpers. Brand colors and copy come from `ClientConfig`; `client.pdfLogo` controls logo sizing and an optional dark backing plate for low-contrast logos.

### Lead packet

`src/utils/leadPacket.ts` (`createLeadPacket`) assembles a structured lead object after a successful preview. It is currently **only held in component state** — there is a `TODO` to wire it to email / CRM webhook / Supabase / Google Sheets. No backend persistence exists yet.

### Guided tour (`/<slug>/demo`)

An additive, no-friction product walkthrough that runs **alongside** the real funnel — it does not call OpenAI. `App.tsx` (`isTourPath`) checks whether the **second** URL segment is `demo` (`/<slug>/demo`); if so it renders `<GuidedTour>` instead of the funnel. The brand still comes from the first segment via `getActiveClient()`.

- `src/tour/GuidedTour.tsx` — 10-step (`s0`–`s9`) state machine (welcome → details → project → photo → generating → reveal → estimate → branded PDF → CRM → recap), with a before/after slider and option toggles.
- `src/tour/steps.tsx` — one component per step. `src/tour/Coachmark.tsx` — the positioned callout bubble.
- `src/tour/tourConfig.ts` (`resolveTourConfig`) — the key abstraction: derives everything shown (sample customer, pre-selected options, estimate figure/line items, CRM rows, URL bar) from the existing `ClientConfig` so **every brand works in the tour with zero per-client authoring**. It reuses `calculateBudgetRange`/`formatCurrency`, and only pre-selects options that have a real (non-`"review"`) range, picking a single "Back Yard"-like option by default so selection/estimate/PDF/CRM tell one consistent story.
- Per-brand overrides are optional via `client.tour` (`TourConfig` in `types.ts`): `sampleCustomer`, `sampleOptions`, `crmRows`, `welcomeHeadline`, `urlBar`, before/after images, etc. Tour styling lives in `src/tour.css` (separate from `styles.css`).

### PDF logo proof (dev QA tool)

`src/pdfProof.tsx` + `pdf-proof.html` render the real jsPDF estimate header for **every** client side-by-side, so logo sizing/contrast can be eyeballed at once. It copies the canvas/image helpers from `App.tsx` verbatim to match real PDF output. Dev-only — open `http://localhost:5173/pdf-proof.html`; it is not part of the funnel.

## Deploy

Vercel, Vite preset. `vercel.json` rewrites `/api/*` to the serverless functions and everything else to `index.html` (SPA + path-based client routing). Build command `npm run build`, output `dist/`.


## Read Discipline

- Before reading a file, search for the target first (grep/Glob/search) to locate the relevant lines. Don't open a file blind to find one thing.
- Read only the relevant range using `offset` and `limit`. Do not read whole files when a section will do.
- Exception: read the full file when you genuinely need whole-file context — small files (<~100 lines), or when restructuring/reviewing the entire file.
- Never re-read a file already in context unless it has changed since you last read it. Reuse what you already have.
- Prefer targeted reads over broad repo exploration. Locate, then read the slice.
