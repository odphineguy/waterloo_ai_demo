import type { ClientConfig, ProjectOption, StudioPackage } from "../types";

function getBaseInstruction(client: ClientConfig) {
  return `Create a photorealistic concept rendering of the provided yard photo for a ${client.serviceLabel.toLowerCase()} sales preview. Preserve the original camera angle, perspective, house structure, walls, fencing, gates, hardscape layout, and major fixed elements unless a better concept requires minor landscape layout cleanup. Redesign the landscape area into a realistic project concept based on the selected project options. The result should look like a believable after-image of the customer's actual property, suitable for a visual estimate preview for ${client.companyName}.`;
}

const constraints = [
  "Preserve the home, walls, fences, windows, doors, gates, and major fixed structures.",
  "Keep the camera angle and perspective consistent with the original photo.",
  "Do not create impossible construction changes.",
  "Do not add unrelated luxury features.",
  "Make the design realistic, clean, professional, and buildable.",
  "Treat the output as a sales concept preview, not a final construction design.",
];

function getOptionInstruction(option: ProjectOption, client: ClientConfig) {
  const normalized = option.toLowerCase();

  if (normalized.includes("front")) {
    return `This is a front yard ${client.serviceLabel.toLowerCase()} concept. Emphasize curb appeal, clean edges, and a neat professional appearance.`;
  }
  if (normalized.includes("back")) {
    return `This is a backyard ${client.serviceLabel.toLowerCase()} concept. Emphasize usable outdoor space, comfort, and a clean functional layout.`;
  }
  if (normalized.includes("sport") || normalized.includes("pickleball")) {
    return "Include a realistic recreational surface concept, keeping the design proportional and practical.";
  }
  if (normalized.includes("commercial")) {
    return "This is a commercial concept. Emphasize durability, clean presentation, and professional appearance.";
  }
  if (normalized.includes("putting")) {
    return "Include a realistic residential putting green integrated naturally into the available yard space. Keep it proportional and buildable.";
  }
  if (normalized.includes("pet")) {
    return "Include a clean, pet-friendly turf concept with practical drainage-aware layout choices.";
  }
  if (normalized.includes("paver") || normalized.includes("patio")) {
    return "Include realistic paver or patio hardscape elements that fit the existing yard and stay buildable.";
  }
  if (normalized.includes("rock")) {
    return "Include decorative rock areas with clean borders and realistic low-maintenance landscape detailing.";
  }
  if (normalized.includes("other")) {
    return `Use the customer notes to guide the design while keeping the concept realistic and aligned with ${client.companyName}'s services.`;
  }

  return `Include a realistic ${option.toLowerCase()} concept that feels buildable and aligned with ${client.companyName}'s services.`;
}

type BuildPromptInput = {
  client: ClientConfig;
  projectOptions: ProjectOption[];
  notes: string;
};

// ---------------------------------------------------------------------------
// Design Studio prompt path (additive — the funnel's buildYardPreviewPrompt
// below is untouched). Product constraint is enforced by the package's
// promptDirectives from tenant config, so nothing brand-specific lives here.
// ---------------------------------------------------------------------------

const studioDesignStyleDirection: Record<string, string> = {
  freeform:
    "Design style: freeform — organic, natural flowing curves for turf edges, borders, and bed lines.",
  modern:
    "Design style: modern — clean geometric lines, rectilinear turf shapes, and minimal crisp borders.",
  surprise:
    "Design style: designer's choice — a tasteful, creative composition that balances curves and clean lines.",
};

type BuildStudioPromptInput = {
  client: ClientConfig;
  pkg: StudioPackage;
  designStyleId: string;
  puttingSizeLabel: string | null;
  paverLabel: string | null;
  sqft: number | null;
  notes: string;
  hasPhotos: boolean;
};

export function buildStudioPrompt({
  client,
  pkg,
  designStyleId,
  puttingSizeLabel,
  paverLabel,
  sqft,
  notes,
  hasPhotos,
}: BuildStudioPromptInput) {
  const base = hasPhotos
    ? getBaseInstruction(client)
    : `Create a photorealistic landscape design concept image of a residential yard for a ${client.serviceLabel.toLowerCase()} sales preview for ${client.companyName}. Show a believable ground-level view of a well-kept suburban home's yard in warm natural light. The result should look like a realistic after-photo of a completed project, suitable for a visual estimate preview.`;

  const lines = [
    base,
    "",
    `Design package: ${pkg.name} — ${pkg.description}`,
    pkg.promptDirectives,
    "",
    studioDesignStyleDirection[designStyleId] ?? studioDesignStyleDirection.surprise,
  ];

  if (puttingSizeLabel) {
    lines.push(
      `Include a putting green sized as "${puttingSizeLabel}" — keep it proportional to the yard and buildable.`,
    );
  }
  if (paverLabel) {
    lines.push(
      `Use ${paverLabel}-style pavers for all paver elements (borders, patios, walkways).`,
    );
  }
  if (sqft && sqft > 0) {
    lines.push(
      `The yard area being transformed is approximately ${Math.round(sqft).toLocaleString("en-US")} square feet.`,
    );
  }

  lines.push(
    "",
    "Customer notes:",
    notes.trim() || "No additional customer notes provided.",
    "",
    "Constraints:",
    ...constraints.map((constraint) => `- ${constraint}`),
    `- Feature only products and elements described in the design package above, consistent with ${client.companyName}'s services.`,
  );

  return lines.join("\n");
}

export function buildYardPreviewPrompt({
  client,
  projectOptions,
  notes,
}: BuildPromptInput) {
  const selectedLogic = projectOptions
    .map((option) => getOptionInstruction(option, client))
    .join("\n");

  return [
    getBaseInstruction(client),
    "",
    "Selected project options:",
    projectOptions.join(", "),
    "",
    "Option-specific direction:",
    selectedLogic,
    "",
    "Customer notes:",
    notes.trim() || "No additional customer notes provided.",
    "",
    "Constraints:",
    ...constraints.map((constraint) => `- ${constraint}`),
  ].join("\n");
}
