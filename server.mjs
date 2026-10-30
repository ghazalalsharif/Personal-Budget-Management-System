import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
// Serve only the public docs directory; bind to loopback so this is a local development server.
const root = path.resolve("docs"),
  types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json",
  };
http
  .createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        ),
        file = path.resolve(
          root,
          "." + (name.endsWith("/") ? name + "index.html" : name),
        );
      if (!file.startsWith(root + path.sep)) throw Error();
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));
