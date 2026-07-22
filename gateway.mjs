import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";

const PORT_H = Number.parseInt(process.env.PORT ?? "3000", 10);
const PORT_A = PORT_H + 1;
const LOG_FILE = "/tmp/app.log";
const MAX_LOG_BYTES = 1024 * 1024;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function readLogTail() {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(LOG_FILE, flags);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error("Debug log path is not a regular file");
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      throw new Error("Debug log file is not owned by this process user");
    }
    const length = Math.min(stat.size, MAX_LOG_BYTES);
    const offset = Math.max(0, stat.size - length);
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, offset);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

console.log(`[gateway] Starting — proxy port:${PORT_H} -> app port:${PORT_A}`);

const gw = http.createServer((cReq, cRes) => {
  const requestUrl = new URL(cReq.url || "/", "http://localhost");

  if (requestUrl.pathname === "/debug-app-log") {
    const enabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEBUG_LOG_ENDPOINT === "true";
    if (!enabled) {
      cRes.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      cRes.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const secret = process.env.DEBUG_LOG_SECRET || "";
    const rawHeader = cReq.headers["x-debug-log-token"];
    const provided = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (secret.length < 32 || !safeEqual(provided, secret)) {
      cRes.writeHead(403, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      cRes.end(JSON.stringify({ error: "Forbidden" }));
      return;
    }

    try {
      cRes.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      cRes.end(readLogTail() || "(empty log)");
    } catch {
      cRes.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      cRes.end("(log file not found)");
    }
    return;
  }

  const opts = {
    host: "127.0.0.1",
    port: PORT_A,
    path: cReq.url,
    method: cReq.method,
    headers: cReq.headers,
  };
  const pr = http.request(opts, aRes => {
    cRes.writeHead(aRes.statusCode || 502, aRes.headers);
    aRes.pipe(cRes);
  });
  pr.on("error", () => {
    if (!cRes.headersSent) {
      cRes.writeHead(503, {
        "Content-Type": "application/json",
        "Retry-After": "3",
        "Cache-Control": "no-store",
      });
      cRes.end(JSON.stringify({ ok: false, warming: true }));
    }
  });
  cReq.pipe(pr);
});

gw.listen(PORT_H, "0.0.0.0", () => console.log(`[gateway] Listening on 0.0.0.0:${PORT_H}`));
process.on("SIGTERM", () => gw.close(() => process.exit(0)));
process.on("SIGINT", () => gw.close(() => process.exit(0)));
