import "server-only";

// AI_PROMPT_DEBUG_ENABLED prints the exact resolved prompt for local and test
// troubleshooting. The env schema rejects it in production; this guard also
// refuses to print when NODE_ENV is production, so prompts containing
// customer brand data never reach production logs.
export function debugResolvedPrompt(
  env: { AI_PROMPT_DEBUG_ENABLED: boolean; NODE_ENV: string },
  prompt: {
    jobId: string;
    promptKey: string;
    promptVersion: string;
    model: string;
    purpose: string;
    systemInstructions: string;
    userMessage: string;
  },
) {
  if (!env.AI_PROMPT_DEBUG_ENABLED || env.NODE_ENV === "production") return;
  // Explicit local/test troubleshooting output.
  // eslint-disable-next-line no-console
  console.debug(JSON.stringify({ event: "ai.prompt.debug", ...prompt }));
}
