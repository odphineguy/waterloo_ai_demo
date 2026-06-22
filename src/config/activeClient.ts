import { templateClient } from "../clients/template";
import { waterlooClient } from "../clients/waterloo";
import { paradiseGreensClient } from "../clients/paradiseGreens";
import { whiteRhinoTurfClient } from "../clients/whiteRhinoTurf";
import { betterLifeLandscapeClient } from "../clients/betterLifeLandscape";
import { pristineGreenClient } from "../clients/pristineGreen";
import { apexTurfClient } from "../clients/apexTurf";
import { turfMastersClient } from "../clients/turfMasters";
import { turfMonstersClient } from "../clients/turfMonsters";
import type { ClientConfig } from "../types";

export const clients: Record<string, ClientConfig> = {
  [apexTurfClient.slug]: apexTurfClient,
  [betterLifeLandscapeClient.slug]: betterLifeLandscapeClient,
  [paradiseGreensClient.slug]: paradiseGreensClient,
  [pristineGreenClient.slug]: pristineGreenClient,
  [turfMastersClient.slug]: turfMastersClient,
  [turfMonstersClient.slug]: turfMonstersClient,
  [whiteRhinoTurfClient.slug]: whiteRhinoTurfClient,
  [waterlooClient.slug]: waterlooClient,
  [templateClient.slug]: templateClient,
};

export function getActiveClient(pathname = window.location.pathname) {
  const slug = pathname.split("/").filter(Boolean)[0] || waterlooClient.slug;
  return clients[slug] ?? waterlooClient;
}
