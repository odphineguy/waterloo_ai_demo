type RequestImage = {
  dataUrl: string;
  filename: string;
};

type PreviewRequestBody = {
  prompt?: string;
  projectOptions?: string[];
  notes?: string;
  images?: RequestImage[];
};

type VercelRequest = {
  body?: unknown;
  method?: string;
  on: (event: "data" | "end" | "error", listener: (...args: unknown[]) => void) => void;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};

export const config = {
  maxDuration: 60,
};

function getEnvValue(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value && value !== "undefined" ? value : fallback;
}

const OPENAI_IMAGE_MODEL = getEnvValue("OPENAI_IMAGE_MODEL", "gpt-image-1.5");
const supportsInputFidelity = OPENAI_IMAGE_MODEL !== "gpt-image-2";

function parseJsonBody(req: VercelRequest): Promise<PreviewRequestBody> {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body as PreviewRequestBody);
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as PreviewRequestBody) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function getImageOutput(data: unknown): string | undefined {
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray(data.data) &&
    data.data[0] &&
    typeof data.data[0] === "object" &&
    "b64_json" in data.data[0] &&
    typeof data.data[0].b64_json === "string"
  ) {
    return data.data[0].b64_json;
  }

  return undefined;
}

async function callOpenAiImageApi(body: PreviewRequestBody) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    throw new Error("Missing image prompt.");
  }

  const images = (body.images || []).slice(0, 4);
  const hasImages = images.length > 0;

  if (!hasImages) {
    const response = await createGeneratedImage(apiKey, prompt);
    return [await readImageResponse(response)];
  }

  return Promise.all(
    images.map(async (image, index) => {
      const response = await createEditedImage(
        apiKey,
        `${prompt}\n\nRender this submitted yard photo as preview ${index + 1} of ${images.length}. Use only this photo's camera angle and fixed property details as the visual reference.`,
        [image],
      );
      return readImageResponse(response);
    }),
  );
}

async function readImageResponse(response: Response) {
  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "message" in data.error
        ? String(data.error.message)
        : "OpenAI image generation failed.";

    throw new Error(message);
  }

  const b64Json = getImageOutput(data);
  if (!b64Json) {
    throw new Error("OpenAI image response did not include image data.");
  }

  return `data:image/png;base64,${b64Json}`;
}

async function createGeneratedImage(apiKey: string, prompt: string) {
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1536x1024",
      quality: "low",
    }),
  });
}

async function createEditedImage(
  apiKey: string,
  prompt: string,
  images: RequestImage[],
) {
  const requestBody = {
    model: OPENAI_IMAGE_MODEL,
    prompt,
    images: images.map((image) => ({ image_url: image.dataUrl })),
    size: "1536x1024",
    quality: "low",
    ...(supportsInputFidelity ? { input_fidelity: "high" } : {}),
  };

  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const imageUrls = await callOpenAiImageApi(body);

    res.status(200).json({
      imageUrl: imageUrls[0],
      imageUrls,
      model: OPENAI_IMAGE_MODEL,
      status: "generated",
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate yard preview.",
    });
  }
}
