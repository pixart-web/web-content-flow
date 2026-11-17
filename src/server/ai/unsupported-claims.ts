// L6 B5: deterministic detector for claims the context does not state. Used
// by the evaluation suite (C-04) and, when client knowledge is given to the
// model, by the generation executor to request one revision (doc 54).

// Scored text excludes application-owned provenance, the brand's own word
// lists (a Brand Profile legitimately lists its words to avoid), editorial
// `notes` and internal production notes / visual `avoid` lists (Video), where
// models restate the rules ("avoid terms like 'magic'") rather than use the
// words in deliverable copy. Applies at any depth.
const unscoredKeys = new Set([
  "provenance",
  "wordsToAvoid",
  "wordsToUse",
  "notes",
  "productionNotes",
  "editingNotes",
  "avoid",
]);

export function generatedText(output: unknown) {
  return (
    JSON.stringify(output, (key, value: unknown) =>
      unscoredKeys.has(key) ? undefined : value,
    ) ?? ""
  );
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Heuristic for invented facts (the Brand Authority instructions forbid made-up
// statistics, awards, rankings, URLs and product attributes). A match only
// counts when the same phrase is absent from the supplied context.
// URLs and bare domains: the instructions forbid inventing destinations.
const urlPattern =
  /\bhttps?:\/\/[^\s"'<>)]+|\bwww\.[^\s"'<>)]+|\b[a-z0-9-]+\.(?:com|net|org|io|co|pt|eu|shop|store)(?:\/[^\s"'<>)]*)?/giu;

// Product attributes a model tends to invent (materials, technologies, comfort
// tech, sustainability, commercial promises). Tuned to the footwear fixtures;
// extend it with each new evaluation domain.
const productAttributeTerms = [
  "breathable",
  "waterproof",
  "water-resistant",
  "durable",
  "ergonomic",
  "memory foam",
  "cushioned",
  "cushioning",
  "anti-slip",
  "non-slip",
  "slip-resistant",
  "orthopedic",
  "orthopaedic",
  "arch support",
  "shock absorption",
  "shock-absorbing",
  "flexible sole",
  "flexible soles",
  "lightweight",
  "recycled",
  "sustainable",
  "eco-friendly",
  "vegan",
  "organic",
  "handmade",
  "hand-crafted",
  "leather",
  "suede",
  "rubber sole",
  "patented",
  "warranty",
  "free shipping",
  "free returns",
  "money-back",
];

const claimPatterns = [
  urlPattern,
  /\b\d{1,3}(?:[.,]\d+)?\s?%/giu,
  /\b(?:award[- ]winning|award|certified|certification|accredited)\b/giu,
  /(?:#\s?1\b|\bnumber one\b|\bbest[- ]selling\b|\bmarket[- ]leading\b)/giu,
  /\b\d[\d,.]*\s?(?:customers|users|reviews|stars|countries)\b/giu,
];

export function unsupportedClaimHits(output: unknown, context: unknown) {
  const text = generatedText(output);
  const contextText = JSON.stringify(context).toLocaleLowerCase();
  const hits = new Set<string>();
  for (const pattern of claimPatterns)
    for (const match of text.matchAll(pattern)) {
      const phrase = match[0].trim();
      if (!contextText.includes(phrase.toLocaleLowerCase())) hits.add(phrase);
    }
  const lowered = text.toLocaleLowerCase();
  for (const term of productAttributeTerms)
    if (
      new RegExp(`(^|[^\\p{L}])${escapeRegExp(term)}($|[^\\p{L}])`, "u").test(
        lowered,
      ) &&
      !contextText.includes(term)
    )
      hits.add(term);
  return [...hits];
}
