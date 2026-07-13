// Google Aerial View API — cinematic drone-style flyover of the customer's
// property. Client-side REST against aerialview.googleapis.com using the same
// referrer-locked VITE_GOOGLE_MAPS_KEY (Aerial View API is enabled on it).
//
// Per Google TOS these videos are display-only: embed/stream only — never
// download, store, or place them in the lead PDF/email.
//
// Behavior contract (spec 7b): every failure mode is silent. The visualizer's
// flyover tab renders only when a video is confirmed ACTIVE; no user-facing
// spinners or errors, and the rest of the flow is never blocked.

export type FlyoverVideo = {
  /** Signed short-lived MP4 URI, landscape orientation preferred. */
  videoUri: string;
};

const BASE = "https://aerialview.googleapis.com/v1";
const POLL_INTERVAL_MS = 15_000;
const MAX_POLLS = 24; // ~6 minutes — renders can take minutes; give up quietly.

type UriEntry = { landscapeUri?: string; portraitUri?: string };

function pickVideoUri(uris: Record<string, UriEntry> | undefined): string | null {
  if (!uris) return null;
  for (const format of ["MP4_HIGH", "MP4_MEDIUM", "MP4_LOW"]) {
    const entry = uris[format];
    if (entry?.landscapeUri) return entry.landscapeUri;
    if (entry?.portraitUri) return entry.portraitUri;
  }
  for (const entry of Object.values(uris)) {
    if (entry?.landscapeUri) return entry.landscapeUri;
  }
  return null;
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function lookupVideo(address: string, apiKey: string): Promise<FlyoverVideo | null> {
  const data = await fetchJson(
    `${BASE}/videos:lookupVideo?address=${encodeURIComponent(address)}&key=${apiKey}`,
  );
  if (!data || data.state !== "ACTIVE") return null;
  const uri = pickVideoUri(data.uris as Record<string, UriEntry> | undefined);
  return uri ? { videoUri: uri } : null;
}

async function lookupMetadataState(address: string, apiKey: string): Promise<string | null> {
  const data = await fetchJson(
    `${BASE}/videos:lookupVideoMetadata?address=${encodeURIComponent(address)}&key=${apiKey}`,
  );
  return data && typeof data.state === "string" ? data.state : null;
}

/**
 * Kick off a flyover lookup for an address (call as soon as the address is
 * confirmed). If no video exists yet, requests a render and polls quietly in
 * the background. Calls onReady exactly once if and when a video is ACTIVE.
 * Returns a cancel function — call it on unmount/restart.
 */
export function startFlyoverLookup(
  address: string,
  apiKey: string,
  onReady: (video: FlyoverVideo) => void,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = (video: FlyoverVideo | null) => {
    if (!cancelled && video) onReady(video);
  };

  const poll = async (attempt: number) => {
    if (cancelled || attempt > MAX_POLLS) return;
    const state = await lookupMetadataState(address, apiKey);
    if (cancelled) return;
    if (state === "ACTIVE") {
      finish(await lookupVideo(address, apiKey));
      return;
    }
    timer = setTimeout(() => void poll(attempt + 1), POLL_INTERVAL_MS);
  };

  void (async () => {
    const state = await lookupMetadataState(address, apiKey);
    if (cancelled) return;

    if (state === "ACTIVE") {
      finish(await lookupVideo(address, apiKey));
      return;
    }
    if (state === "PROCESSING") {
      timer = setTimeout(() => void poll(1), POLL_INTERVAL_MS);
      return;
    }

    // Not found — request a render, then poll. Do NOT block anything on it.
    const render = await fetchJson(`${BASE}/videos:renderVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
      body: JSON.stringify({ address }),
    });
    if (cancelled || !render) return;
    timer = setTimeout(() => void poll(1), POLL_INTERVAL_MS);
  })();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
