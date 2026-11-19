// L6 B5: deterministic detector for claims the context does not state. Used
// by the evaluation suite (C-04) and, when client knowledge is given to the
// model, by the generation executor to request one revision (doc 54).

// Scored text excludes application-owned provenance, the brand's own word
// lists (a Brand Profile legitimately lists its words to avoid), editorial
// `notes` and internal production notes / visual `avoid` lists (Video), where
// models restate the rules ("avoid terms like 'magic'") rather than use the
// words in deliverable copy, and `id` fields (identifiers, not copy).
// Applies at any depth.
const unscoredKeys = new Set([
  "provenance",
  "wordsToAvoid",
  "wordsToUse",
  "notes",
  "productionNotes",
  "editingNotes",
  "avoid",
  // Stable identifiers ("urbanstride-materials-eco") are not copy.
  "id",
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
  // Synonyms that survived the revision in the 2026-11-17 measurement (the
  // former held-out list, doc 54): the same qualities in other words.
  "featherweight",
  "featherlight",
  "lightness",
  "light on your feet",
  "eco",
  "environmentally friendly",
  "planet-friendly",
  "earth-friendly",
  "planet",
  "long-lasting",
  "hard-wearing",
  "built to last",
  "airy",
  "ventilated",
  "plush",
];

// Portuguese (pt-PT, with Brazilian spellings) equivalents, as regular
// expression sources so gender and number variants match ("reciclado",
// "recicladas"). "leve" alone stays out: it is also a common verb form.
const portugueseAttributePatterns = [
  "respir[aá]ve(?:l|is)",
  "imperme[aá]ve(?:l|is)",
  "resistentes? à água",
  "dur[aá]ve(?:l|is)",
  "durabilidade",
  "ergon[oóô]mic[oa]s?",
  "espuma viscoel[aá]stica",
  "almofadad[oa]s?",
  "amortecimento",
  "amortecid[oa]s?",
  "antiderrapantes?",
  "ortop[eé]dic[oa]s?",
  "suporte (?:do|para o) arco",
  "absor(?:ção|ve|vem) (?:d?[oa]s? )?impactos?",
  "solas? flex[ií]ve(?:l|is)",
  "ultra-?leves?",
  "lev[ií]ssim[oa]s?",
  "reciclad[oa]s?",
  "sustent[aá]ve(?:l|is)",
  "sustentabilidade",
  "ecol[oó]gic[oa]s?",
  "vegan[oa]s?",
  "org[aâ]nic[oa]s?",
  "biol[oó]gic[oa]s?",
  "feit[oa]s? à mão",
  "artesana(?:l|is)",
  "(?:em|de) pele",
  "couro",
  "camurça",
  "solas? de borracha",
  "patentead[oa]s?",
  "garantia",
  "(?:portes|envios?|entregas?) (?:gr[aá]tis|gratuit[oa]s?)",
  "devoluç(?:ão|ões) (?:gr[aá]tis|gratuitas?)",
  "reembolso",
  // Synonyms that survived the revision (former held-out list, doc 54).
  // "leves" is the plural adjective; the singular stays out (verb form).
  "leveza",
  "leves",
  "leve como",
  "amig[oa]s? do ambiente",
  "planeta",
  "pegada ecológica",
  "duradour[oa]s?",
  "resistentes?",
  "feit[oa]s? para durar",
  "arejad[oa]s?",
  "ventilad[oa]s?",
  "fof[oa]s?",
  "maci[oa]s?",
  "baixo impacto",
  "impacto reduzido",
  "materia(?:l|is) responsáve(?:l|is)",
];

const wordBounded = (source: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, "giu");

// Phrases that only name a material: a context stating the material in any
// wording supports them ("A sola exterior é de borracha natural" supports
// "sola de borracha"; "The outsole is natural rubber" supports "rubber sole").
const supportingMaterial: Readonly<Record<string, string>> = {
  "rubber sole": "rubber",
  "solas? de borracha": "borracha",
  "(?:em|de) pele": "pele|leather",
};

const attributePatterns = [
  ...productAttributeTerms.map(escapeRegExp),
  ...portugueseAttributePatterns,
].map((source) => ({
  claim: new RegExp(wordBounded(source).source, "iu"),
  support: new RegExp(
    wordBounded(supportingMaterial[source] ?? source).source,
    "iu",
  ),
}));

const claimPatterns = [
  urlPattern,
  /\b\d{1,3}(?:[.,]\d+)?\s?%/giu,
  /\b(?:award[- ]winning|award|certified|certification|accredited)\b/giu,
  /(?:#\s?1\b|\bnumber one\b|\bbest[- ]selling\b|\bmarket[- ]leading\b)/giu,
  /\b\d[\d,.]*\s?(?:customers|users|reviews|stars|countries)\b/giu,
  wordBounded(
    "premiad[oa]s?|pr[eé]mios?|certificad[oa]s?|certificaç(?:ão|ões)|acreditad[oa]s?",
  ),
  wordBounded(
    "n\\.?º\\s?1|número um|mais vendid[oa]s?|líder(?:es)? (?:de|do) mercado",
  ),
  /\b\d[\d,.]*\s?(?:clientes|utilizadores|usuários|avaliações|estrelas|países)(?![\p{L}])/giu,
];

// A match counts only when the same pattern finds nothing in the supplied
// context, so "recicladas" is supported by a sheet that says "reciclado".
export function unsupportedClaimHits(output: unknown, context: unknown) {
  const text = generatedText(output);
  const contextText = JSON.stringify(context);
  const lowerContext = contextText.toLocaleLowerCase();
  const hits = new Set<string>();
  for (const pattern of claimPatterns)
    for (const match of text.matchAll(pattern)) {
      const phrase = match[0].trim();
      if (!lowerContext.includes(phrase.toLocaleLowerCase())) hits.add(phrase);
    }
  for (const { claim, support } of attributePatterns) {
    const match = text.match(claim);
    if (match && !support.test(contextText))
      hits.add(match[0].toLocaleLowerCase());
  }
  return [...hits];
}

// After a person edits generated content, a remaining mark stays only while
// its words are still in the text: removing "impermeável" clears that mark.
export function claimRevisionAfterEdit(
  claimRevision: { flagged: readonly string[]; remaining: readonly string[] },
  snapshot: unknown,
) {
  const text = generatedText(snapshot);
  return {
    flagged: [...claimRevision.flagged],
    remaining: claimRevision.remaining.filter((term) =>
      new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`,
        "iu",
      ).test(text),
    ),
  };
}
