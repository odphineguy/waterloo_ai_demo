import type {
  ClientConfig,
  UploadedImage,
  YardPreviewRequest,
  YardPreviewResult,
} from "../types";
import { buildYardPreviewPrompt } from "../utils/promptBuilder";

type ApiPreviewResponse = {
  imageUrl?: string;
  imageUrls?: string[];
  status?: "generated";
  error?: string;
};

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

// Design Studio render — same endpoint and photo-compression path as the
// funnel, but with a prebuilt studio prompt (utils/promptBuilder.ts). With
// photos the server runs the edits flow (per-photo before/after); without
// photos it runs the generations flow and the studio uses the traced
// satellite snapshot as the "before" side.
export async function generateStudioRender({
  prompt,
  uploadedImages,
}: {
  prompt: string;
  uploadedImages: UploadedImage[];
}): Promise<YardPreviewResult> {
  const previewEndpoint =
    import.meta.env.VITE_AI_PREVIEW_ENDPOINT || "/api/generate-yard-preview";
  const request: YardPreviewRequest = {
    projectOptions: [],
    notes: "",
    uploadedImages,
  };

  const imageUrls = await callPreviewEndpoint(previewEndpoint, request, prompt);

  return {
    id: crypto.randomUUID(),
    imageUrls,
    prompt,
    status: "generated",
    createdAt: new Date().toISOString(),
  };
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

  const imageUrls = await callPreviewEndpoint(previewEndpoint, request, prompt);

  return {
    id: crypto.randomUUID(),
    imageUrls,
    prompt,
    status: "generated",
    createdAt: new Date().toISOString(),
  };
}
