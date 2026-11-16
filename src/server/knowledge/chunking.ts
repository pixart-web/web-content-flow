// L6 (doc 53, B2/B3): splits a client document into overlapping chunks along
// paragraph and sentence boundaries. Sizes are in characters; ~4 characters
// per token is the same estimate the executor uses.

export type Chunk = Readonly<{
  ordinal: number;
  text: string;
  tokenEstimate: number;
}>;

export const CHUNK_TARGET_CHARS = 900;
export const CHUNK_OVERLAP_CHARS = 150;

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

function pieces(text: string): string[] {
  // Paragraphs first; split long paragraphs into sentences; hard-cut the rest.
  const out: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    const clean = paragraph.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    if (clean.length <= CHUNK_TARGET_CHARS) {
      out.push(clean);
      continue;
    }
    for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
      for (let start = 0; start < sentence.length; start += CHUNK_TARGET_CHARS)
        out.push(sentence.slice(start, start + CHUNK_TARGET_CHARS));
    }
  }
  return out;
}

export function chunkText(text: string): Chunk[] {
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces(text)) {
    if (current && current.length + piece.length + 1 > CHUNK_TARGET_CHARS) {
      chunks.push(current);
      // Carry the end of the previous chunk so facts that straddle a boundary
      // are still found.
      current = current.slice(-CHUNK_OVERLAP_CHARS).replace(/^\S*\s/, "");
    }
    current = current ? `${current} ${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks.map((chunk, ordinal) => ({
    ordinal,
    text: chunk,
    tokenEstimate: estimateTokens(chunk),
  }));
}
