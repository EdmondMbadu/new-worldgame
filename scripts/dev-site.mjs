import { games } from "./games.mjs";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const game of games) {
  if (
    !existsSync(
      path.join(root, "games", game.slug, "node_modules/vite/bin/vite.js"),
    )
  ) {
    console.error("Run npm run setup:games before npm start.");
    process.exit(1);
  }
}
const children = [
  ...games.map((game) =>
    spawn(
      process.execPath,
      [
        path.join(root, "games", game.slug, "node_modules/vite/bin/vite.js"),
        "--host",
        "127.0.0.1",
      ],
      {
        cwd: path.join(root, "games", game.slug),
        stdio: "inherit",
      },
    ),
  ),
  spawn(
    process.execPath,
    [
      "node_modules/@angular/cli/bin/ng.js",
      "serve",
      "--configuration",
      "games",
      "--proxy-config",
      "proxy.games.json",
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        NG_BUILD_MAX_WORKERS: process.env.NG_BUILD_MAX_WORKERS || "2",
      },
    },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
