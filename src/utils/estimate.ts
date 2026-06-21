import type { BudgetRange, ProjectOption } from "../types";

const baseRanges: Partial<Record<ProjectOption, [number, number]>> = {
  "Front Yard": [4500, 9500],
  "Back Yard": [5500, 12500],
  "Sports Turf": [8000, 20000],
  Commercial: [10000, 35000],
};

const puttingGreenRange: [number, number] = [3500, 9000];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return currency.format(value);
}

export function calculateBudgetRange(options: ProjectOption[]): BudgetRange {
  if (options.length === 0 || options.includes("Other")) {
    return { kind: "review", label: "Requires review" };
  }

  let min = 0;
  let max = 0;

  options.forEach((option) => {
    if (option === "Putting Green") {
      min += puttingGreenRange[0];
      max += puttingGreenRange[1];
      return;
    }

    const range = baseRanges[option];
    if (range) {
      min += range[0];
      max += range[1];
    }
  });

  if (min === 0 || max === 0) {
    return { kind: "review", label: "Requires review" };
  }

  return {
    kind: "range",
    min,
    max,
    label: `${formatCurrency(min)}-${formatCurrency(max)}`,
  };
}
