// Prompt 1.3.0 (LF-19): restate, right after the context, the only product
// facts the Brief supplies, and say plainly that every other product
// attribute is unknown. Small local models ignore the general rule in the
// system instructions; a concrete list next to the task holds them better.

type BriefLike = {
  productOrService?: unknown;
  primaryOffer?: unknown;
  valueProposition?: unknown;
};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const PRODUCT_ATTRIBUTE_RULE =
  "These are the only product facts supplied (with clientKnowledge excerpts, when present). Physical, material, comfort, fit, weight, durability, care, sustainability, safety and performance attributes that they do not state are unknown: leave them out, or describe a benefit that suppliedProductFacts states. Do not add a website or domain.";

export function productGrounding(context: unknown) {
  const brief =
    context && typeof context === "object" && "brief" in context
      ? ((context as { brief?: unknown }).brief as BriefLike | undefined)
      : undefined;
  const facts = {
    productOrService: text(brief?.productOrService),
    primaryOffer: text(brief?.primaryOffer),
    valueProposition: text(brief?.valueProposition),
  };
  if (!facts.productOrService && !facts.primaryOffer && !facts.valueProposition)
    return null;
  return {
    suppliedProductFacts: facts,
    productAttributeRule: PRODUCT_ATTRIBUTE_RULE,
  };
}
