// local stand-in for Netlify: static files from public/, /api/* to the real function
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const APP = process.argv[2], PORT = +process.argv[3] || 8888;
const api = (await import(APP + "/netlify/functions/api.mts")).default;
const PUB = APP + "/public"; const CSP = ((fs.readFileSync(APP + "/netlify.toml", "utf8").match(/Content-Security-Policy = "([^"]*)"/) || [])[1]) || "", TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (u.pathname.startsWith("/api/")) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const h = { ...req.headers }; h["x-nf-client-connection-ip"] = req.headers["x-test-ip"] || "10.0.0.1";
    const r = await api(new Request("http://localhost" + req.url, { method: req.method, headers: h, body: req.method === "POST" ? Buffer.concat(chunks) : undefined }));
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let f = path.join(PUB, decodeURIComponent(u.pathname)); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) f = path.join(PUB, "index.html");
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", ...(CSP ? { "content-security-policy": CSP } : {}) }); fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log("up on " + PORT));
