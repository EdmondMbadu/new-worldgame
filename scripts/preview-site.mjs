import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Local production preview. Firebase's actual routing is also checked in the Hosting emulator.
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};
createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname === "/games/lost-in-orbit") {
    response.writeHead(302, { Location: "/games/lost-in-orbit/" }).end();
    return;
  }
  let file = path.resolve(dist, "." + pathname);
  if (!file.startsWith(dist + path.sep) && file !== dist) {
    response.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory())
    file = path.join(file, "index.html");
  if (!existsSync(file)) {
    if (
      path.extname(pathname) ||
      pathname.startsWith("/games/lost-in-orbit/")
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    file = path.join(dist, "index.html");
  }
  if (!existsSync(file)) {
    response.writeHead(503).end("Run npm run build first.");
    return;
  }
  response.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(file).pipe(response);
}).listen(4175, "127.0.0.1", () =>
  console.log("Production preview: http://127.0.0.1:4175/games"),
);
