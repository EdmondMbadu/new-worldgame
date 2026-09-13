import { spawnSync } from "node:child_process";
import { games } from "./games.mjs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const game of games) {
  const result = spawnSync("npm", ["ci"], {
    cwd: `${root}games/${game.slug}`,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
