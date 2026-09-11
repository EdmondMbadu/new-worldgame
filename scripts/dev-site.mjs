import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const vite = path.join(
  root,
  "games/lost-in-orbit/node_modules/vite/bin/vite.js",
);
if (!existsSync(vite)) {
  console.error(
    "Run npm run setup:games before npm start. Use npm run start:app for Angular alone.",
  );
  process.exit(1);
}
const children = [
  spawn(process.execPath, [vite, "--host", "127.0.0.1"], {
    cwd: path.join(root, "games/lost-in-orbit"),
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [
      "node_modules/@angular/cli/bin/ng.js",
      "serve",
      "--proxy-config",
      "proxy.games.json",
      ...process.argv.slice(2),
    ],
    { cwd: root, stdio: "inherit" },
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
