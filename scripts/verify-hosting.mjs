import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { games } from "./games.mjs";
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
function fail(message) {
  console.error(message);
  process.exit(1);
}
for (const entry of [
  "index.html",
  "games/index.html",
  ...games.map((g) => `games/${g.slug}/index.html`),
]) {
  if (!existsSync(path.join(dist, entry)))
    fail(`Missing ${entry}. Run npm run build before deploying Hosting.`);
}
const statsPath = path.join(dist, "stats.json");
if (!existsSync(statsPath))
  fail("Missing Angular bundle metadata. Run the combined npm run build.");
const inputs = Object.keys(JSON.parse(readFileSync(statsPath, "utf8")).inputs);
if (
  inputs.some((input) =>
    /(?:^|\/)games\/(?:lost-in-orbit|last-light)\/|node_modules\/(?:three|@react-three|@dimforge|react|react-dom)\//.test(
      input,
    ),
  )
)
  fail(
    "Game dependencies leaked into Angular. Games must remain standalone documents.",
  );
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
for (const game of games) {
  const root = path.join(dist, "games", game.slug),
    html = readFileSync(path.join(root, "index.html"), "utf8");
  if (html.includes("ng-version") || html.includes("/src/main.tsx"))
    fail(`${game.name} is not a standalone production build.`);
  const urls = [
    ...html.matchAll(/(?:src|href)="(\/games\/[^"?#]+\/assets\/[^"?#]+)"/g),
  ].map((m) => m[1]);
  if (urls.length < 2 || urls.some((url) => !existsSync(path.join(dist, url))))
    fail(`${game.name} is missing entry assets.`);
  const builtFiles = files(root);
  let code = 0,
    total = 0;
  for (const file of builtFiles) {
    const bytes = readFileSync(file);
    const compressed = /\.(js|css|html|json|svg)$/.test(file)
      ? gzipSync(bytes).byteLength
      : bytes.byteLength;
    total += compressed;
    if (/\.(js|css)$/.test(file)) code += compressed;
  }
  if (code > game.codeBudget)
    fail(
      `${game.name} code exceeds its ${(game.codeBudget / 1024).toFixed(0)} KiB compressed budget: ${(code / 1024).toFixed(1)} KiB.`,
    );
  if (total > game.totalBudget)
    fail(`${game.name} exceeds its total asset budget.`);
  if (game.slug === "last-light") {
    if (!existsSync(path.join(root, "key-art.png")))
      fail("Last Light is missing its menu art.");
    for (const track of ["morning-on-the-ridge.mp3", "light-at-the-clearing.mp3"])
      if (!existsSync(path.join(root, "audio", track)))
        fail(`Last Light is missing soundtrack audio/${track}.`);
    for (const file of builtFiles.filter((f) => f.endsWith(".js"))) {
      const source = readFileSync(file, "utf8");
      if (
        source.includes("Run driving QA") ||
        source.includes("Stop driving QA") ||
        source.includes("qa-panel")
      )
        fail("Development QA controls leaked into Last Light production.");
    }
  }
  console.log(
    `${game.name}: standalone entry verified; ${(code / 1024).toFixed(1)} KiB code gzip; ${(total / 1024 / 1024).toFixed(2)} MiB total assets.`,
  );
}
console.log("Hosting and isolation verified: Angular + both games.");
