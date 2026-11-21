// A tiny static file server for the browser tests and measurements, so the service worker can run.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };

export function serve(root) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(path.resolve(root))) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({
    url: "http://127.0.0.1:" + server.address().port + "/",
    close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); })
  })));
}
