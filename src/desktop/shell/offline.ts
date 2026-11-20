// LF-21: what counts as "this computer" for the offline check. Everything the
// desktop edition needs (web server, PostgreSQL, Ollama) listens on loopback.
const LOOPBACK_HOSTS = new Set(["localhost", "::1", "[::1]"]);

export function isLoopbackHost(host: string): boolean {
  const name = host.toLowerCase();
  return LOOPBACK_HOSTS.has(name) || /^127(\.\d{1,3}){3}$/.test(name);
}

export function isLoopbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" ||
        parsed.protocol === "https:" ||
        parsed.protocol === "ws:" ||
        parsed.protocol === "wss:") &&
      isLoopbackHost(parsed.hostname)
    );
  } catch {
    return false;
  }
}
