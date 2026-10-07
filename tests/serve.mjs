// Tiny static server for the tests: serves a built site with gzip, like GitHub Pages does.
// Usage: node tests/serve.mjs <folder> [port=8766]
import http from "http"; import fs from "fs"; import path from "path"; import zlib from "zlib";
const root = path.resolve(process.argv[2] || "_site"), port = Number(process.argv[3] || 8766);
const TYPES = { ".js": "application/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".mp3": "audio/mpeg", ".txt": "text/plain" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    const ext = path.extname(file), head = { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": "no-store" };
    if (/\.(js|css|html|json|webmanifest)$/.test(ext) && /gzip/.test(req.headers["accept-encoding"] || "")) { head["content-encoding"] = "gzip"; buf = zlib.gzipSync(buf); }
    res.writeHead(200, head); res.end(buf);
  });
}).listen(port, () => console.log("serving " + root + " on " + port));
