import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const game = path.join(root, "games/lost-in-orbit");
if (!existsSync(path.join(game, "node_modules/vite"))) {
  console.error(
    "Install the isolated game dependencies first: npm run setup:games",
  );
  process.exit(1);
}
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    console.error(
      result.error ?? `Build failed (${result.signal ?? result.status}).`,
    );
    process.exit(result.status || 1);
  }
}
// Build the standalone document first. Angular copies it as static files, never imports it.
run("npm", ["run", "build"], game);
run(process.execPath, [
  "node_modules/@angular/cli/bin/ng.js",
  "build",
  "--stats-json",
  ...process.argv.slice(2),
]);
mkdirSync(path.join(root, "dist/games"), { recursive: true });
// /games is also a real directory. Firebase prioritizes it over the SPA rewrite,
// so give the catalog its own copy of Angular's entry (whose base href is '/').
cpSync(
  path.join(root, "dist/index.html"),
  path.join(root, "dist/games/index.html"),
);
cpSync(path.join(game, "dist"), path.join(root, "dist/games/lost-in-orbit"), {
  recursive: true,
});
run(process.execPath, ["scripts/verify-hosting.mjs"]);
console.log("Build succeeded. The complete site and game are ready in dist/.");
