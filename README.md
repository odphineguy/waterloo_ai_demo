# Waterloo Turf AI Visual Estimate MVP

React + TypeScript MVP for an AI-powered artificial turf visual estimate funnel.

## What It Does

- Captures customer contact and property info
- Lets customers select only the approved project options
- Uploads 1-4 yard photos with previews
- Builds a reusable AI image prompt from project options and notes
- Generates a mock yard preview with an API-ready service structure
- Shows a preliminary budget range
- Creates a hidden request object ready for future email, webhook, Supabase, or Google Sheets integration

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

The app runs without API keys. For future AI image generation work, use a server-side Vercel function with:

```bash
OPENAI_API_KEY=
VITE_AI_PREVIEW_ENDPOINT=/api/generate-yard-preview
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

For production, keep image generation behind a server-side Vercel function so API keys are never exposed to the browser. The current `generateYardPreview` service is intentionally structured so a real OpenAI Images API endpoint can be plugged in later.

## Project Options

The MVP intentionally supports only:

- Front Yard
- Back Yard
- Sports Turf
- Commercial
- Putting Green
- Other

## Vercel

This is a standard Vite app.

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

The repository is ready to initialize and push to `github.com/odphineguy/waterloo_ai_demo`.
