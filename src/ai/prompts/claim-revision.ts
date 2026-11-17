// L6 B5, hypothesis 1 (doc 54): when the deterministic unsupported-claim
// detector finds attribute words that neither the context nor the client's
// excerpts state, one revision request asks the model to remove them. Shared
// by the evaluation suite (and the generation executor, if adopted) so both
// send the exact same request: prompts are versioned behaviour.
export const CLAIM_REVISION_INSTRUCTIONS =
  "Revise the prior generation so it states only facts present in the supplied context and clientKnowledge excerpts. Remove or rewrite every sentence that uses an unsupportedTerms word or a synonym of it; do not replace it with another quality the excerpts do not state. Keep the schema, the language, the tone and every supported fact unchanged. Return no HTML.";

export function buildClaimRevisionMessage(input: {
  priorOutput: unknown;
  unsupportedTerms: readonly string[];
  clientKnowledge: unknown;
}) {
  return JSON.stringify({
    task: "Remove claims the context and clientKnowledge do not state.",
    unsupportedTerms: input.unsupportedTerms,
    clientKnowledge: input.clientKnowledge ?? [],
    priorOutput: input.priorOutput,
  });
}
