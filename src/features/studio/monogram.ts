// Decorative monogram colours, picked from the Studio palette by name so a
// project keeps its colour. Never a stand-in for a real image.
const MONOGRAMS = [
  ["#6d4aff", "#c4b5fd"],
  ["#7c3aed", "#ff9474"],
  ["#4f46e5", "#a78bfa"],
  ["#b4469b", "#ff9474"],
  ["#5b21b6", "#6d4aff"],
  ["#8b5cf6", "#f0abfc"],
] as const;

export function monogram(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [from, to] = MONOGRAMS[hash % MONOGRAMS.length]!;
  return `linear-gradient(140deg, ${from}, ${to})`;
}
