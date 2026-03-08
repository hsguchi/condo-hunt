import path from "node:path";
import { spawnSync } from "node:child_process";

const command = process.execPath;
const cliPath = path.resolve("node_modules", "playwright", "cli.js");
const args = [cliPath, "test", ...process.argv.slice(2)];
const env = {
  ...process.env,
  PLAYWRIGHT_WEB_SERVER_COMMAND:
    "npm run build && npm run start -- --hostname 127.0.0.1 --port 3000",
  PLAYWRIGHT_REUSE_SERVER: "0"
};

const result = spawnSync(command, args, {
  stdio: "inherit",
  env
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
