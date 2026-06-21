import type { YardPreviewRequest, YardPreviewResult } from "../types";
import { buildYardPreviewPrompt } from "../utils/promptBuilder";

function createMockPreviewImage(projectOptions: string[], photoCount: number) {
  const optionLabel = projectOptions.join(" + ") || "Artificial Turf";
  const photoLabel = `${photoCount} photo${photoCount === 1 ? "" : "s"} received`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#dff2f8"/>
          <stop offset="1" stop-color="#f7faf2"/>
        </linearGradient>
        <linearGradient id="turf" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#2e7d42"/>
          <stop offset="0.48" stop-color="#48a257"/>
          <stop offset="1" stop-color="#23703b"/>
        </linearGradient>
        <pattern id="stripes" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="transparent"/>
          <rect width="40" height="80" fill="rgba(255,255,255,0.08)"/>
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#sky)"/>
      <path d="M0 275 L1200 215 L1200 800 L0 800 Z" fill="url(#turf)"/>
      <path d="M0 275 L1200 215 L1200 800 L0 800 Z" fill="url(#stripes)" opacity="0.75"/>
      <path d="M0 470 C210 420 332 498 506 452 C716 396 870 420 1200 336 L1200 800 L0 800 Z" fill="#1f5b32" opacity="0.28"/>
      <path d="M105 620 C306 524 515 525 724 582 C874 622 1016 620 1115 568" fill="none" stroke="#f5f0d6" stroke-width="32" stroke-linecap="round" opacity="0.78"/>
      <rect x="90" y="86" width="1020" height="160" rx="18" fill="rgba(255,255,255,0.88)"/>
      <text x="130" y="158" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="#183820">Waterloo Turf preview concept</text>
      <text x="130" y="198" font-family="Arial, sans-serif" font-size="28" fill="#4e5f50">${optionLabel}</text>
      <text x="130" y="230" font-family="Arial, sans-serif" font-size="22" fill="#667066">${photoLabel}</text>
      <circle cx="998" cy="166" r="54" fill="#e4b83d"/>
      <path d="M970 167 l22 22 l40 -48" fill="none" stroke="#183820" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function generateYardPreview({
  projectOptions,
  notes,
  uploadedImages,
}: YardPreviewRequest): Promise<YardPreviewResult> {
  const prompt = buildYardPreviewPrompt({ projectOptions, notes });
  const previewEndpoint = import.meta.env.VITE_AI_PREVIEW_ENDPOINT;

  await new Promise((resolve) => window.setTimeout(resolve, 1200));

  if (previewEndpoint) {
    // TODO: Plug in the future server-side image generation endpoint here.
    // Keep API keys off the client in production; call a Vercel serverless
    // function that uses the OpenAI Images API and returns a hosted preview URL.
  }

  return {
    id: crypto.randomUUID(),
    imageUrl: createMockPreviewImage(projectOptions, uploadedImages.length),
    prompt,
    status: "mock",
    createdAt: new Date().toISOString(),
  };
}
