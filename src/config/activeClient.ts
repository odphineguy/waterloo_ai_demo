import { templateClient } from "../clients/template";
import { waterlooClient } from "../clients/waterloo";
import { paradiseGreensClient } from "../clients/paradiseGreens";
import { whiteRhinoTurfClient } from "../clients/whiteRhinoTurf";
import type { ClientConfig } from "../types";

export const clients: Record<string, ClientConfig> = {
  [paradiseGreensClient.slug]: paradiseGreensClient,
  [whiteRhinoTurfClient.slug]: whiteRhinoTurfClient,
  [waterlooClient.slug]: waterlooClient,
  [templateClient.slug]: templateClient,
};

export function getActiveClient(pathname = window.location.pathname) {
  const slug = pathname.split("/").filter(Boolean)[0] || waterlooClient.slug;
  return clients[slug] ?? waterlooClient;
}
