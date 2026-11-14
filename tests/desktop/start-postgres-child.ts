// Helper for the orphan test: starts PostgreSQL and waits to be killed.
import { startPostgres } from "../../src/desktop/postgres-supervisor";

async function main() {
  const [dataDir, password] = process.argv.slice(2);
  const running = await startPostgres({
    dataDir: dataDir!,
    database: "wcf_desktop_test",
    user: "wcf",
    password: password!,
  });
  console.warn(`READY ${running.port}`);
  setInterval(() => {}, 1 << 30);
}

void main();
