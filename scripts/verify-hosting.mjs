import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const entries = [
  "index.html",
  "games/lost-in-orbit/index.html",
  "games/index.html",
];
for (const entry of entries) {
  const file = path.join(dist, entry);
  if (!existsSync(file)) {
    console.error(
      `Missing ${entry}. Run npm run build before deploying Hosting.`,
    );
    process.exit(1);
  }
}
const html = readFileSync(path.join(dist, entries[1]), "utf8");
const assetUrls = [
  ...html.matchAll(/(?:src|href)="(\/games\/lost-in-orbit\/assets\/[^"?#]+)"/g),
].map((match) => match[1]);
if (
  assetUrls.length < 2 ||
  assetUrls.some((url) => !existsSync(path.join(dist, url)))
) {
  console.error(
    "The standalone game is missing built assets. Run npm run build.",
  );
  process.exit(1);
}
if (html.includes("ng-version") || html.includes("/src/main.tsx")) {
  console.error("The game entry is not a standalone production build.");
  process.exit(1);
}
console.log(
  "Hosting verified: Angular + Lost in Orbit, including all game entry assets.",
);

const statsFile = path.join(dist, 'stats.json');
if (!existsSync(statsFile)) {
  console.error('Missing Angular bundle metadata. Run the combined npm run build.');
  process.exit(1);
}
const stats = JSON.parse(readFileSync(statsFile, 'utf8'));
const angularInputs = Object.keys(stats.inputs);
if (angularInputs.some((input) => /(?:^|\/)games\/lost-in-orbit\/|node_modules\/(?:three|@react-three|react|react-dom)\//.test(input))) {
  console.error('Game dependencies leaked into the Angular build. Keep the game in its standalone document.');
  process.exit(1);
}
const assetDir = path.join(dist, 'games/lost-in-orbit/assets');
const compressedBytes = readdirSync(assetDir).filter((name) => /\.(js|css)$/.test(name)).reduce((bytes, name) => bytes + gzipSync(readFileSync(path.join(assetDir, name))).byteLength, 0);
if (compressedBytes > 450 * 1024) {
  console.error(`Game assets exceed the 450 KiB compressed budget: ${(compressedBytes / 1024).toFixed(1)} KiB.`);
  process.exit(1);
}
console.log(`Isolation verified: no game dependencies in Angular; game JS/CSS ${(compressedBytes / 1024).toFixed(1)} KiB gzip.`);
