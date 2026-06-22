import type { ClientConfig, YardPreviewRequest, YardPreviewResult } from "../types";
import { buildYardPreviewPrompt } from "../utils/promptBuilder";

type ApiPreviewResponse = {
  imageUrl?: string;
  imageUrls?: string[];
  status?: "generated";
  error?: string;
};

function createMockPreviewImage(
  client: ClientConfig,
  projectOptions: string[],
  photoCount: number,
) {
  const optionLabel = projectOptions.join(" + ") || client.serviceLabel;
  const photoLabel = `${photoCount} photo${photoCount === 1 ? "" : "s"} received`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#dff2f8"/>
          <stop offset="1" stop-color="#f7faf2"/>
        </linearGradient>
        <linearGradient id="turf" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${client.colors.primaryDark}"/>
          <stop offset="0.48" stop-color="${client.colors.primary}"/>
          <stop offset="1" stop-color="${client.colors.primaryDark}"/>
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
      <text x="130" y="158" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="#183820">${client.companyName} preview concept</text>
      <text x="130" y="198" font-family="Arial, sans-serif" font-size="28" fill="#4e5f50">${optionLabel}</text>
      <text x="130" y="230" font-family="Arial, sans-serif" font-size="22" fill="#667066">${photoLabel}</text>
      <circle cx="998" cy="166" r="54" fill="${client.colors.accent}"/>
      <path d="M970 167 l22 22 l40 -48" fill="none" stroke="#183820" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to read ${file.name}.`));
    };
    image.src = url;
  });
}

async function fileToCompressedDataUrl(file: File) {
  const image = await loadImage(file);
  const maxDimension = 1024;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image for upload.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

async function buildApiImages(uploadedImages: YardPreviewRequest["uploadedImages"]) {
  return Promise.all(
    uploadedImages.slice(0, 4).map(async (image, index) => ({
      dataUrl: await fileToCompressedDataUrl(image.file),
      filename: image.file.name || `yard-photo-${index + 1}.jpg`,
    })),
  );
}

async function callPreviewEndpoint(
  endpoint: string,
  request: YardPreviewRequest,
  prompt: string,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      projectOptions: request.projectOptions,
      notes: request.notes,
      images: await buildApiImages(request.uploadedImages),
    }),
  });
  const data = (await response.json()) as ApiPreviewResponse;

  const imageUrls = data.imageUrls ?? (data.imageUrl ? [data.imageUrl] : []);

  if (!response.ok || imageUrls.length === 0) {
    throw new Error(data.error || "Unable to generate preview.");
  }

  return imageUrls;
}

export async function generateYardPreview({
  client,
  projectOptions,
  notes,
  uploadedImages,
}: YardPreviewRequest & { client: ClientConfig }): Promise<YardPreviewResult> {
  const prompt = buildYardPreviewPrompt({ client, projectOptions, notes });
  const request = { projectOptions, notes, uploadedImages };
  const previewEndpoint =
    import.meta.env.VITE_AI_PREVIEW_ENDPOINT || "/api/generate-yard-preview";

  try {
    const imageUrls = await callPreviewEndpoint(previewEndpoint, request, prompt);
    return {
      id: crypto.randomUUID(),
      imageUrls,
      prompt,
      status: "generated",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Falling back to mock yard preview.", error);
  }

  await new Promise((resolve) => window.setTimeout(resolve, 600));

  return {
    id: crypto.randomUUID(),
    imageUrls: Array.from(
      { length: Math.max(1, Math.min(uploadedImages.length, 4)) },
      (_, index) => createMockPreviewImage(client, projectOptions, index + 1),
    ),
    prompt,
    status: "mock",
    createdAt: new Date().toISOString(),
  };
}
