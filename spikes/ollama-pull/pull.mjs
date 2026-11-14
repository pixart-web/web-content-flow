// LF-04: stream /api/pull with progress; optional abort after N ms to test
// cancel + resume. Usage: node pull.mjs <model> [abortAfterMs]
const [model, abortAfter] = process.argv.slice(2);
const controller = new AbortController();
if (abortAfter) setTimeout(() => controller.abort(), Number(abortAfter));
const started = performance.now();
let last = "",
  lastPct = -1,
  bytes = 0;
try {
  const response = await fetch("http://127.0.0.1:11434/api/pull", {
    method: "POST",
    body: JSON.stringify({ model, stream: true }),
    signal: controller.signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.error) throw new Error(event.error);
      if (event.total && event.completed !== undefined) {
        const pct = Math.floor((event.completed / event.total) * 100);
        bytes = event.completed;
        if (pct >= lastPct + 25 || pct === 100) {
          console.log(
            `${event.status} ${pct}% (${(event.completed / 1e6).toFixed(1)}/${(event.total / 1e6).toFixed(1)} MB)`,
          );
          lastPct = pct;
        }
      } else if (event.status !== last) {
        console.log(event.status);
        last = event.status;
      }
    }
  }
  console.log(
    JSON.stringify({
      result: "done",
      seconds: ((performance.now() - started) / 1000).toFixed(1),
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      result: error.name === "AbortError" ? "cancelled" : "error",
      message: String(error.message ?? error),
      bytesSoFar: bytes,
      seconds: ((performance.now() - started) / 1000).toFixed(1),
    }),
  );
}
