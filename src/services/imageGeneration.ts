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

// Aspect ratios of the OpenAI output sizes the server can request. Must stay
// identical to pickOutputSize() in api/generate-yard-preview.ts (1536x1024 /
// 1024x1024 / 1024x1536, closest by log-ratio) so client crop and server size
// selection always agree.
const OUTPUT_RATIOS = [1536 / 1024, 1, 1024 / 1536];

function pickTargetRatio(width: number, height: number) {
  const sourceRatio = width / height;
  let best = OUTPUT_RATIOS[0];
  for (const ratio of OUTPUT_RATIOS) {
    if (
      Math.abs(Math.log(sourceRatio / ratio)) <
      Math.abs(Math.log(sourceRatio / best))
    ) {
      best = ratio;
    }
  }
  return best;
}

// Center-crop the photo to the exact aspect ratio the API will render at,
// then downscale. The model edit can't reframe what it never received extra
// of, and the same cropped image doubles as the "before" side of comparisons,
// so both sides share identical framing by construction. When the source
// already matches the target ratio the crop is a no-op.
export async function fileToCroppedDataUrl(file: File) {
  const image = await loadImage(file);
  const targetRatio = pickTargetRatio(image.naturalWidth, image.naturalHeight);
  const sourceRatio = image.naturalWidth / image.naturalHeight;

  let cropWidth = image.naturalWidth;
  let cropHeight = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    cropWidth = image.naturalHeight * targetRatio;
  } else if (sourceRatio < targetRatio) {
    cropHeight = image.naturalWidth / targetRatio;
  }
  const cropX = (image.naturalWidth - cropWidth) / 2;
  const cropY = (image.naturalHeight - cropHeight) / 2;

  const maxDimension = 1024;
  const scale = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image for upload.");
  }

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    width: canvas.width,
    height: canvas.height,
  };
}

async function buildApiImages(uploadedImages: YardPreviewRequest["uploadedImages"]) {
  return Promise.all(
    uploadedImages.slice(0, 4).map(async (image, index) => {
      const cropped = await fileToCroppedDataUrl(image.file);
      return {
        dataUrl: cropped.dataUrl,
        filename: image.file.name || `yard-photo-${index + 1}.jpg`,
        // Dimensions already match one of the API output ratios exactly, so
        // the server's pickOutputSize lands on the same size the crop targeted.
        width: cropped.width,
        height: cropped.height,
      };
    }),
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
