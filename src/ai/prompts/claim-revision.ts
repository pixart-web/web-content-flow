// L6 B5, hypothesis 1 (doc 54): when the deterministic unsupported-claim
// detector finds attribute words that neither the context nor the client's
// excerpts state, one revision request asks the model to remove them. Shared
// by the evaluation suite (and the generation executor, if adopted) so both
// send the exact same request: prompts are versioned behaviour.
export const CLAIM_REVISION_INSTRUCTIONS =
  "Revise the prior generation so it states only facts present in the supplied context and clientKnowledge excerpts. Remove or rewrite every sentence that uses an unsupportedTerms word or a synonym of it; do not replace it with another quality the excerpts do not state. Keep the schema, the language, the tone and every supported fact unchanged. Return no HTML.";

// B5, revision grounded in the client's facts (doc 54): runs on every output
// that used client knowledge, not only when the word list flags something,
// so inferences phrased as whole sentences ("reduces fatigue") are checked.
export const GROUNDED_CLAIM_REVISION_INSTRUCTIONS =
  'Check the prior generation against the supplied context and clientKnowledge excerpts. What the brief, the brand profile or the request state (positioning, value proposition, offer, audience, tone, for example comfort or versatility when the brief promises them) is supported: keep it. For every other sentence that states a quality, benefit, outcome or comparison about the product (for example that it is light, durable, sustainable, long-lasting, reduces fatigue or environmental impact, or is safe or easy to maintain), keep it only if the context or an excerpt states it. When it is only inferred from a fact, rewrite it to state the fact itself, for example "280 grams in size 42" instead of "lightweight", rather than deleting the sentence. Remove every unsupportedTerms word. Never remove or change a stated fact, keep every list as long as before and every required field filled. Keep the schema, the language, the tone and the structure. Return no HTML.';

export type ClaimRevisionMode = "list" | "grounded";

export function claimRevisionInstructions(mode: ClaimRevisionMode) {
  return mode === "grounded"
    ? GROUNDED_CLAIM_REVISION_INSTRUCTIONS
    : CLAIM_REVISION_INSTRUCTIONS;
}

export function buildClaimRevisionMessage(input: {
  priorOutput: unknown;
  unsupportedTerms: readonly string[];
  clientKnowledge: unknown;
  mode?: ClaimRevisionMode;
}) {
  return JSON.stringify({
    task:
      input.mode === "grounded"
        ? "Keep only qualities and benefits the context or clientKnowledge state; state facts instead of inferences."
        : "Remove claims the context and clientKnowledge do not state.",
    unsupportedTerms: input.unsupportedTerms,
    clientKnowledge: input.clientKnowledge ?? [],
    priorOutput: input.priorOutput,
  });
}
