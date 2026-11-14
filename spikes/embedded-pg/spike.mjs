// LF-01: start an embedded PostgreSQL 16 in a private data dir, create the
// app and test databases, report timings. Usage: node spike.mjs <dataDir> <port> [keep]
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
const [dataDir, port = "5544", keep] = process.argv.slice(2);
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "wcf",
  password: "wcf-local-spike",
  port: Number(port),
  persistent: true,
  onLog: () => {},
  onError: (e) => console.error(String(e)),
});
const t0 = performance.now();
const fresh = !existsSync(`${dataDir}/PG_VERSION`);
if (fresh) await pg.initialise();
const t1 = performance.now();
await pg.start();
const t2 = performance.now();
if (fresh) {
  await pg.createDatabase("web_content_flow_local");
  await pg.createDatabase("web_content_flow_test");
}
console.log(
  JSON.stringify({
    fresh,
    initdbMs: Math.round(t1 - t0),
    startMs: Math.round(t2 - t1),
  }),
);
if (keep !== "keep") await pg.stop();
else {
  console.log("READY");
  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });
  setInterval(() => {}, 1 << 30);
}
