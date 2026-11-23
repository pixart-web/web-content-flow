// Decorative monogram gradients, picked by name so a project keeps its colour
// (doc 55). Every stop is a design token; never a stand-in for a real image.
const MONOGRAMS = [
  ["--color-studio-violet", "--color-studio-lavender"],
  ["--color-brand-purple-500", "--color-studio-coral"],
  ["--color-brand-indigo-500", "--color-brand-purple-400"],
  ["--color-brand-purple-700", "--color-studio-coral"],
  ["--color-brand-purple-700", "--color-studio-violet"],
  ["--color-brand-purple-600", "--color-studio-lavender"],
] as const;

export function monogram(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [from, to] = MONOGRAMS[hash % MONOGRAMS.length]!;
  return `linear-gradient(140deg, var(${from}), var(${to}))`;
}
