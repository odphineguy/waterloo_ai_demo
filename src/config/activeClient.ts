import { templateClient } from "../clients/template";
import { waterlooClient } from "../clients/waterloo";
import { paradiseGreensClient } from "../clients/paradiseGreens";
import { whiteRhinoTurfClient } from "../clients/whiteRhinoTurf";
import { betterLifeLandscapeClient } from "../clients/betterLifeLandscape";
import { pristineGreenClient } from "../clients/pristineGreen";
import { apexTurfClient } from "../clients/apexTurf";
import { turfMastersClient } from "../clients/turfMasters";
import { turfMonstersClient } from "../clients/turfMonsters";
import { platinumOutdoorsClient } from "../clients/platinumOutdoors";
import { arizonaArtificialLawnsClient } from "../clients/arizonaArtificialLawns";
import { alwaysGreenTurfClient } from "../clients/alwaysGreenTurf";
import { arizonaLuxuryLawnsClient } from "../clients/arizonaLuxuryLawns";
import { syntheticGrassMastersClient } from "../clients/syntheticGrassMasters";
import { scottsdaleTurfClient } from "../clients/scottsdaleTurf";
import { allValleyTurfClient } from "../clients/allValleyTurf";
import { turfliClient } from "../clients/turfli";
import { bigBullyTurfClient } from "../clients/bigBullyTurf";
import { turfMesaClient } from "../clients/turfMesa";
import { eastValleyTurfClient } from "../clients/eastValleyTurf";
import { southernTurfCoClient } from "../clients/southernTurfCo";
import { agapeTurfClient } from "../clients/agapeTurf";
import type { ClientConfig } from "../types";

export const clients: Record<string, ClientConfig> = {
  [alwaysGreenTurfClient.slug]: alwaysGreenTurfClient,
  [arizonaLuxuryLawnsClient.slug]: arizonaLuxuryLawnsClient,
  [syntheticGrassMastersClient.slug]: syntheticGrassMastersClient,
  [scottsdaleTurfClient.slug]: scottsdaleTurfClient,
  [allValleyTurfClient.slug]: allValleyTurfClient,
  [turfliClient.slug]: turfliClient,
  [bigBullyTurfClient.slug]: bigBullyTurfClient,
  [turfMesaClient.slug]: turfMesaClient,
  [eastValleyTurfClient.slug]: eastValleyTurfClient,
  [southernTurfCoClient.slug]: southernTurfCoClient,
  [agapeTurfClient.slug]: agapeTurfClient,
  [apexTurfClient.slug]: apexTurfClient,
  [arizonaArtificialLawnsClient.slug]: arizonaArtificialLawnsClient,
  [betterLifeLandscapeClient.slug]: betterLifeLandscapeClient,
  [paradiseGreensClient.slug]: paradiseGreensClient,
  [platinumOutdoorsClient.slug]: platinumOutdoorsClient,
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
