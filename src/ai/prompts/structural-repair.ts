// Shared by the generation executor and the evaluation suite so both send the
// exact same repair request (prompts are versioned behaviour).
export const STRUCTURAL_REPAIR_INSTRUCTIONS =
  "Repair structure only so it matches the supplied schema. Preserve business meaning, do not add claims or facts, and return no HTML.";

export function buildStructuralRepairMessage(input: {
  rejectedOutput: unknown;
  validationIssues: readonly string[];
  trustedConstraints: readonly string[];
}) {
  return JSON.stringify({
    task: "Repair the prior generation structure without adding facts.",
    rejectedOutput: input.rejectedOutput ?? null,
    validationIssues: input.validationIssues,
    trustedConstraints: input.trustedConstraints,
  });
}
