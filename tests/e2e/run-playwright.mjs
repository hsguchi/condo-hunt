import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_WEB_SERVER_COMMAND:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3000",
    PLAYWRIGHT_REUSE_SERVER: "0"
  }
});

process.exit(result.status ?? 1);
