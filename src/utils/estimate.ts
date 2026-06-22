import type { BudgetRange, ClientConfig, EstimateRange, ProjectOption } from "../types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return currency.format(value);
}

function isReviewRange(range: EstimateRange | undefined): range is "review" | undefined {
  return !range || range === "review";
}

export function calculateBudgetRange(
  options: ProjectOption[],
  estimateRanges: ClientConfig["estimateRanges"],
): BudgetRange {
  if (options.length === 0) {
    return { kind: "review", label: "Requires review" };
  }

  let min = 0;
  let max = 0;
  let needsReview = false;

  options.forEach((option) => {
    const range = estimateRanges[option];
    if (isReviewRange(range)) {
      needsReview = true;
      return;
    }

    min += range[0];
    max += range[1];
  });

  if (needsReview || min === 0 || max === 0) {
    return { kind: "review", label: "Requires review" };
  }

  return {
    kind: "range",
    min,
    max,
    label: `${formatCurrency(min)}-${formatCurrency(max)}`,
  };
}
