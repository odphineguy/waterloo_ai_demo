import type { StudioConfig } from "../types";
import { formatCurrency } from "./estimate";

export type StudioInvestment =
  | { kind: "range"; min: number; max: number; label: string }
  | { kind: "measure"; label: string };

export const MEASURE_LABEL = "Requires on-site measure";

function roundToNearest250(value: number) {
  return Math.round(value / 250) * 250;
}

/**
 * sqft × ratesPerSqft[packageId] → [min, max], rounded to the nearest $250 and
 * floored at studio.minInvestment. Unknown sqft (Maps failed / trace skipped)
 * or an unpriced package → "Requires on-site measure".
 *
 * Additive to calculateBudgetRange in estimate.ts, which the old funnel owns.
 */
export function calculateStudioInvestment(
  sqft: number | null,
  packageId: string | null,
  studio: StudioConfig,
): StudioInvestment {
  const rate = packageId ? studio.ratesPerSqft[packageId] : undefined;

  if (sqft == null || sqft <= 0 || !rate) {
    return { kind: "measure", label: MEASURE_LABEL };
  }

  const min = Math.max(studio.minInvestment, roundToNearest250(sqft * rate[0]));
  const max = Math.max(min, roundToNearest250(sqft * rate[1]));

  return {
    kind: "range",
    min,
    max,
    label: `${formatCurrency(min)} – ${formatCurrency(max)}`,
  };
}
