// L6: embeddings are stored as little-endian Float32 bytes, L2-normalised, so
// cosine similarity is a dot product. Brute force per project is fast enough
// (measured: 10 000 chunks x 768 dims ≈ 5 ms; doc 53).

export function normalize(vector: readonly number[]): Float32Array {
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm);
  if (!Number.isFinite(norm) || norm === 0)
    throw new Error("Cannot normalise an empty or zero vector.");
  return Float32Array.from(vector, (value) => value / norm);
}

export function encodeVector(vector: Float32Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(vector.length * 4);
  const view = new DataView(bytes.buffer);
  vector.forEach((value, index) => view.setFloat32(index * 4, value, true));
  return bytes;
}

export function decodeVector(bytes: Uint8Array): Float32Array {
  if (bytes.byteLength % 4 !== 0) throw new Error("Corrupt embedding.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength / 4);
  for (let index = 0; index < out.length; index += 1)
    out[index] = view.getFloat32(index * 4, true);
  return out;
}

export function dot(a: Float32Array, b: Float32Array) {
  if (a.length !== b.length) throw new Error("Embedding dimensions differ.");
  let sum = 0;
  for (let index = 0; index < a.length; index += 1)
    sum += a[index]! * b[index]!;
  return sum;
}
