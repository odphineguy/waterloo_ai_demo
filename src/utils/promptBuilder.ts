import type { ProjectOption } from "../types";

const baseInstruction =
  "Create a photorealistic concept rendering of the provided yard photo for an artificial turf sales preview. Preserve the original camera angle, perspective, house structure, walls, fencing, gates, hardscape layout, and major fixed elements unless a better turf concept requires minor landscape layout cleanup. Redesign the landscape area into a realistic artificial turf concept based on the selected project options. The result should look like a believable after-image of the customer's actual property, suitable for a visual estimate preview.";

const constraints = [
  "Preserve the home, walls, fences, windows, doors, gates, and major fixed structures.",
  "Keep the camera angle and perspective consistent with the original photo.",
  "Do not create impossible construction changes.",
  "Do not add unrelated luxury features.",
  "Make the design realistic, clean, professional, and buildable.",
  "Treat the output as a sales concept preview, not a final construction design.",
];

const optionInstructions: Record<ProjectOption, string> = {
  "Front Yard":
    "This is a front yard turf concept. Emphasize curb appeal, clean edges, and a neat professional appearance.",
  "Back Yard":
    "This is a backyard turf concept. Emphasize usable outdoor space, comfort, and a clean functional layout.",
  "Sports Turf":
    "Include a realistic sports turf concept suitable for recreation, keeping the design proportional and practical.",
  Commercial:
    "This is a commercial turf concept. Emphasize durability, clean presentation, and professional appearance.",
  "Putting Green":
    "Include a realistic residential putting green integrated naturally into the available yard space. Keep it proportional and buildable.",
  Other:
    "Use the customer notes to guide the design while keeping the concept realistic and turf-focused.",
};

type BuildPromptInput = {
  projectOptions: ProjectOption[];
  notes: string;
};

export function buildYardPreviewPrompt({
  projectOptions,
  notes,
}: BuildPromptInput) {
  const selectedLogic = projectOptions
    .map((option) => optionInstructions[option])
    .join("\n");

  return [
    baseInstruction,
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
