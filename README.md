# Configurable AI Visual Estimate MVP

React + TypeScript MVP for an AI-powered visual estimate funnel. The app now supports multiple branded demo configurations from one codebase.

## What It Does

- Captures customer contact and property info
- Lets customers select only the approved project options
- Uploads 1-4 yard photos with previews
- Builds a reusable AI image prompt from project options and notes
- Generates real AI yard previews through the server-side Vercel API route
- Shows a preliminary budget range
- Creates a hidden request object ready for future email, webhook, Supabase, or Google Sheets integration

## Branded Demo Routes

The active demo is selected from the first URL path segment:

- `/` loads the Waterloo Turf demo
- `/waterloo` loads the Waterloo Turf demo
- `/template` loads the generic reusable template

Client configs live in:

```txt
src/clients/
src/config/activeClient.ts
```

To add a new company demo:

1. Copy `src/clients/template.ts` to a new file, such as `src/clients/acme-turf.ts`.
2. Update the company name, logo, colors, contact info, project options, estimate ranges, and copy.
3. Import the config in `src/config/activeClient.ts`.
4. Add it to the `clients` map using its `slug`.
5. Visit `/<slug>` locally or on Vercel.

## Local Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment Variables

The app requires a server-side Vercel function with:

```bash
OPENAI_API_KEY=
VITE_AI_PREVIEW_ENDPOINT=/api/generate-yard-preview
OPENAI_IMAGE_MODEL=gpt-image-1.5

# Design Studio (/<slug>/studio)
VITE_GOOGLE_MAPS_KEY=      # referrer-locked browser key: Maps JS, Places, Places New, Aerial View
SUPABASE_URL=              # server-side only — studio lead persistence
SUPABASE_SERVICE_KEY=      # server-side only
RESEND_API_KEY=            # server-side only — studio lead email delivery
STUDIO_FROM_EMAIL=         # optional From address for lead emails
```

For production, keep image generation behind a server-side Vercel function so API keys are never exposed to the browser. The current `generateYardPreview` service is intentionally structured so a real OpenAI Images API endpoint can be plugged in later.

For local testing of image generation, use the normal Vite dev server. The repo includes a dev-only adapter for `/api/generate-yard-preview`:

```bash
npm run dev
```

## Project Options

Project options and preliminary estimate ranges are configured per client in `src/clients/`.

## Vercel

This is a standard Vite app.

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

The repository is ready to initialize and push to `github.com/odphineguy/waterloo_ai_demo`.
